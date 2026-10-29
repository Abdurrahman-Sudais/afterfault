# Review safeguards

| Safeguard | Where in the prototype (`src/app/`) |
|---|---|
| Rules, not guesses, for dates and money | `engine.js` `assess()`: inclusive coverage end, filing deadline, excluded components, required evidence, serial and invoice cross-checks, labour share and cap. Every result says which clause or record it came from. |
| Missing is not the same as failing | Missing records produce `unknown` results and “Needs evidence” or “Eligibility unknown”, never “not covered”. |
| AI is labelled, quoted and gated | `suggest()` output is badged “AI-suggested”, shows the notes and clause quotes, and blocks claim preparation until an analyst confirms it (the claim stops) or dismisses it with a reason of at least 10 characters. |
| Records come from the field, not the analyst | Only technicians can add evidence (`addEvidence`). Analysts request specific records. Added records are labelled “simulated” in the prototype. |
| Approval is tied to the current facts | New evidence, an AI decision or a supplier-terms change revokes a pending approval and returns the claim to draft. |
| Two-person approval for larger claims | Above the policy threshold (default $250), a second, different analyst must approve. |
| Afterfault never submits | The analyst submits through the supplier's own process and records the reference. Records are locked after submission. |
| Need-to-know | Technicians see requests and repair facts, not amounts or assessments. Admins see totals, terms, roles and the audit log. Every action checks the role. |
| Audit | Every change is logged and exportable as CSV. |

## Language guidelines

- Say “potential recovery under the supplied terms”, never “you will recover”.
- Say “outside the coverage period” or “filing window closed”, and explain with dates.
- AI text says “might apply” and “an analyst should decide”.

## Tests

- `src/app/engine.test.js` and `backend/tests/test_lambdas.py` both run `backend/tests/fixtures/cases.json`, including the inclusive end date, month-end overflow, the filing window, the labour cap and the mismatches.
- `src/app/workflow.test.js` covers role permissions, request → record → re-assessment, the AI gate, two-person approval, locking after submission, outcome validation, and the effect of term and policy changes.
- `scripts/prototype-check.mjs` drives all three roles through the UI in jsdom, including persistence and reset.
- Still to do with real users: keyboard and screen-reader passes, plus a pilot measuring missed filing windows and time from repair to claim.
