"""AI suggestions on clause exclusions (AWS Lambda + Amazon Bedrock).

Scope: whether a supplier's exclusion wording (e.g. "power surge") might apply, given the
technician's free-text notes. Dates, amounts, evidence, serial and invoice checks are NOT sent here;
assess_case handles them deterministically.

Safeguards enforced in code:
  * Input minimisation: only the notes and the clause wording are sent. Customer, site, serial,
    technician and money fields are rejected (FORBIDDEN_KEYS).
  * Evidence-bound output: each suggestion must quote text found verbatim in the notes AND in the
    clause. Anything else is discarded; malformed output yields no suggestions.
  * Suggestions are stored as pending. An analyst must confirm or dismiss each one; nothing here
    changes an assessment, approves or submits a claim.

Environment: BEDROCK_MODEL_ID, GUARDRAIL_ID (optional), GUARDRAIL_VERSION (optional).
"""
import json
import os

PROMPT_VERSION = "2026-10-v1"
FORBIDDEN_KEYS = {"customer", "site", "serial", "technician", "technician_id", "email", "parts", "labour", "amount", "tenant_id"}

SYSTEM = (
    "You help a warranty analyst. Given a technician's repair notes and a supplier's exclusion wording, "
    "list exclusions that might apply. Quote the exact words from the notes and from the clause. "
    "Do not decide eligibility. Do not invent text. Output ONLY JSON matching the schema."
)
SCHEMA = {"suggestions": [{"notes_quote": "exact text from notes", "clause_quote": "exact text from clause", "explanation": "one or two plain sentences"}]}


def check_input(req):
    bad = FORBIDDEN_KEYS.intersection(req)
    if bad:
        raise ValueError(f"forbidden keys in model input: {sorted(bad)}")
    if not isinstance(req.get("notes"), str) or not isinstance(req.get("clause"), str):
        raise ValueError("notes and clause must be strings")
    return {"notes": req["notes"], "clause": req["clause"]}


def build_prompt(payload):
    return f"Input: {json.dumps(payload, ensure_ascii=False)}\nSchema: {json.dumps(SCHEMA)}"


def validate(draft, payload, limit=5):
    items = draft.get("suggestions") if isinstance(draft, dict) else None
    if not isinstance(items, list):
        return [], ["output is not {suggestions: [...]}"]
    kept, rejected = [], []
    for s in items[:limit]:
        if not isinstance(s, dict):
            rejected.append("not an object")
            continue
        nq, cq, why = s.get("notes_quote"), s.get("clause_quote"), str(s.get("explanation", "")).strip()
        if not nq or nq not in payload["notes"]:
            rejected.append("notes quote not found")
        elif not cq or cq not in payload["clause"]:
            rejected.append("clause quote not found")
        elif not why or len(why) > 400:
            rejected.append("missing or overlong explanation")
        else:
            kept.append({"notes_quote": nq, "clause_quote": cq, "explanation": why, "source": "ai", "decision": "pending"})
    return kept, rejected


def lambda_handler(event, _context):  # pragma: no cover - needs AWS
    import boto3

    req = json.loads(event["body"]) if isinstance(event.get("body"), str) else event
    payload = check_input(req)
    params = {
        "modelId": os.environ["BEDROCK_MODEL_ID"],
        "system": [{"text": SYSTEM}],
        "messages": [{"role": "user", "content": [{"text": build_prompt(payload)}]}],
        "inferenceConfig": {"maxTokens": 800, "temperature": 0},
    }
    if os.environ.get("GUARDRAIL_ID"):
        params["guardrailConfig"] = {"guardrailIdentifier": os.environ["GUARDRAIL_ID"], "guardrailVersion": os.environ.get("GUARDRAIL_VERSION", "DRAFT")}
    text = boto3.client("bedrock-runtime").converse(**params)["output"]["message"]["content"][0]["text"]
    try:
        draft = json.loads(text)
    except json.JSONDecodeError:
        draft = None
    kept, rejected = validate(draft, payload)
    return {"suggestions": kept, "rejected": len(rejected), "model_id": params["modelId"], "prompt_version": PROMPT_VERSION}
