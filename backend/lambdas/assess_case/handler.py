"""Deterministic warranty assessment (AWS Lambda).

Same rules as the prototype engine (src/app/engine.js). Both are tested against
backend/tests/fixtures/cases.json so they cannot drift apart silently.

Input:  {"case": {...}, "terms": {...}, "today": "YYYY-MM-DD"}
Output: {"case_id", "status", "potential", "coverage_end", "deadline", "days_left", "checks": [...]}

No AI is involved: dates, amounts, evidence, serial and invoice checks must stay exact.
"""
import calendar
import json
import math
import re
from datetime import date, timedelta


def round2(n):
    return math.floor(n * 100 + 0.5) / 100


def parse(iso):
    return date.fromisoformat(iso)


def add_months(iso, months):
    """Calendar months with JavaScript-style overflow: 31 Jan + 1 month = 3 Mar."""
    d = parse(iso)
    total = d.month - 1 + months
    y, m = d.year + total // 12, total % 12 + 1
    return (date(y, m, 1) + timedelta(days=d.day - 1)).isoformat()


def normalise(text):
    return " ".join(re.sub(r"[^a-z0-9]+", " ", str(text or "").lower()).split())


def serial_key(s):
    return re.sub(r"[^A-Z0-9]", "", str(s or "").upper())


def _evidence(c, name):
    return next((e for e in c["evidence"] if e["name"] == name), None)


def _has(c, name):
    e = _evidence(c, name)
    return bool(e and e.get("present"))


def assess(c, terms, today):
    checks = []

    def add(id_, label, result, detail):
        checks.append({"id": id_, "label": label, "result": result, "detail": detail})

    installed, repaired = parse(c["installed"]), parse(c["repaired"])
    coverage_end = add_months(c["installed"], terms["coverageMonths"])
    deadline = (repaired + timedelta(days=terms["filingDays"])).isoformat()
    days_left = (parse(deadline) - parse(today)).days

    add("dates", "Repair after installation", "pass" if repaired >= installed else "fail", "")
    add("coverage", "Within coverage period", "pass" if repaired <= parse(coverage_end) else "fail", f"Coverage ends {coverage_end}.")
    excluded = normalise(c["component"]) in [normalise(x) for x in terms["excludedComponents"]]
    add("component", "Component covered", "fail" if excluded else "pass", "")
    add("filing", "Filing window open", "fail" if days_left < 0 else "warn" if days_left <= 7 else "pass", f"File by {deadline}.")
    missing = [n for n in terms["requiredEvidence"] if not _has(c, n)]
    add("evidence", "Required evidence present", "fail" if missing else "pass", ", ".join(missing))

    photo = _evidence(c, "Serial-number photograph")
    if not (photo and photo.get("present") and photo.get("value")):
        if "Serial-number photograph" in terms["requiredEvidence"]:
            add("serial", "Serial matches across records", "unknown", "")
    else:
        add("serial", "Serial matches across records", "pass" if serial_key(photo["value"]) == serial_key(c["serial"]) else "fail", "")

    parts = round2(sum(float(line["amount"]) for line in c["partsLines"]))
    invoice = _evidence(c, "Parts invoice")
    if not (invoice and invoice.get("present") and invoice.get("value") not in (None, "")):
        add("invoice", "Invoice matches repair report", "unknown", "")
    else:
        add("invoice", "Invoice matches repair report", "pass" if abs(float(invoice["value"]) - parts) < 0.005 else "fail", "")

    cap = terms.get("labourCap")
    labour_covered = round2(min(c["labour"] * terms["labourPct"] / 100, cap if cap is not None else math.inf))

    def result(id_):
        return next(x["result"] for x in checks if x["id"] == id_)

    if result("dates") == "fail":
        status = "Check dates"
    elif result("coverage") == "fail":
        status = "Outside coverage"
    elif result("component") == "fail":
        status = "Excluded component"
    elif result("filing") == "fail":
        status = "Filing window closed"
    elif result("invoice") == "unknown":
        status = "Eligibility unknown"
    elif any(x["result"] in ("fail", "unknown") for x in checks):
        status = "Needs evidence"
    else:
        status = "Ready for review"
    establish = status not in ("Check dates", "Outside coverage", "Excluded component", "Filing window closed", "Eligibility unknown")
    return {
        "status": status, "checks": checks, "coverage_end": coverage_end, "deadline": deadline, "days_left": days_left,
        "parts": parts, "labour_covered": labour_covered,
        "potential": round2(parts + labour_covered) if establish else None,
    }


def suggest(c, terms):
    """Deterministic stand-in used by the prototype; production uses suggest_exclusions (Bedrock)."""
    notes = normalise(c.get("technicianNotes"))
    return [x for x in terms["exclusions"] if normalise(x) in notes]


def lambda_handler(event, _context):
    body = json.loads(event["body"]) if isinstance(event.get("body"), str) else event
    out = assess(body["case"], body["terms"], body["today"])
    return {"case_id": body["case"].get("id"), **out}
