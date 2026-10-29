"""Run from the repository root: python3 backend/tests/test_lambdas.py (standard library only)."""
import importlib.util
import json
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]


def load(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / "backend" / "lambdas" / name / "handler.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


assess_case = load("assess_case")
suggest_exclusions = load("suggest_exclusions")
FX = json.loads((ROOT / "backend" / "tests" / "fixtures" / "cases.json").read_text())


class AssessCaseTest(unittest.TestCase):
    def test_shared_fixtures_match_prototype_engine(self):
        for c in FX["cases"]:
            with self.subTest(c["name"]):
                terms = {**FX["terms"][c["terms"]], **c.get("termsPatch", {})}
                out = assess_case.assess({**FX["base"], **c["patch"]}, terms, c["today"])
                self.assertEqual(out["status"], c["status"])
                self.assertEqual(out["potential"], c["potential"])
                for id_, result in c["results"].items():
                    got = next((x["result"] for x in out["checks"] if x["id"] == id_), None)
                    self.assertEqual(got, result, id_)

    def test_suggestion_rule_fixtures(self):
        for s in FX["suggestions"]:
            self.assertEqual(assess_case.suggest({"technicianNotes": s["notes"]}, FX["terms"][s["terms"]]), s["phrases"])

    def test_month_overflow(self):
        self.assertEqual(assess_case.add_months("2026-01-31", 1), "2026-03-03")
        self.assertEqual(assess_case.add_months("2024-02-29", 12), "2025-03-01")

    def test_handler(self):
        out = assess_case.lambda_handler({"body": json.dumps({"case": {**FX["base"], "id": "RF-1"}, "terms": FX["terms"]["parts_only"], "today": "2026-09-10"})}, None)
        self.assertEqual((out["case_id"], out["status"], out["potential"]), ("RF-1", "Ready for review", 240))


class SuggestExclusionsTest(unittest.TestCase):
    payload = {"notes": "Valve stuck closed after a power surge on site last week.", "clause": "Failures caused by power surge or refrigerant contamination are not covered."}

    def test_rejects_identifying_input(self):
        with self.assertRaises(ValueError):
            suggest_exclusions.check_input({**self.payload, "serial": "X"})

    def test_keeps_only_quoted_suggestions(self):
        draft = {"suggestions": [
            {"notes_quote": "after a power surge", "clause_quote": "Failures caused by power surge", "explanation": "Notes mention a surge."},
            {"notes_quote": "lightning strike", "clause_quote": "power surge", "explanation": "Invented notes quote."},
            {"notes_quote": "power surge", "clause_quote": "misuse is excluded", "explanation": "Invented clause quote."},
        ]}
        kept, rejected = suggest_exclusions.validate(draft, suggest_exclusions.check_input(self.payload))
        self.assertEqual([k["notes_quote"] for k in kept], ["after a power surge"])
        self.assertEqual(kept[0]["decision"], "pending")
        self.assertEqual(len(rejected), 2)

    def test_fails_closed(self):
        self.assertEqual(suggest_exclusions.validate(None, self.payload)[0], [])
        self.assertEqual(suggest_exclusions.validate({"suggestions": "x"}, self.payload)[0], [])


if __name__ == "__main__":
    unittest.main()
