"""Offline acceptance gates: synthetic results, never the sandbox."""

import copy
import csv
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[1]
ROOT = SCRIPTS.parents[1]


def load_module(name):
    spec = importlib.util.spec_from_file_location(name, SCRIPTS / (name + ".py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


newman = load_module("newman_report")
jmeter = load_module("jmeter_report")


def newman_result():
    return {"collection": {"info": {"name": "OFFLINE SYNTHETIC FIXTURE"}}, "run": {
        "stats": {"requests": {"total": 3, "failed": 0},
                  "assertions": {"total": 14, "failed": 0, "pending": 0}},
        "failures": [], "executions": [
            {"response": {"code": code}, "assertions": [{"assertion": "fixture"} for _ in range(n)]}
            for n, code in [(6, 201), (4, 400), (4, 400)]]}}


def jtl_rows(profile):
    labels = [jmeter.BASELINE] * 18 if profile == "baseline" else [jmeter.POST, jmeter.GET] * 3
    return [{"timeStamp": str(100000 + i * 6000), "elapsed": "20", "label": label,
             "responseCode": "201" if label == jmeter.POST else "200", "success": "true",
             "failureMessage": "", "threadName": "worker-1",
             "URL": "https://aiquaa-sandbox-api.vercel.app/api/v1/ordenes" +
                    ("/123" if label == jmeter.GET else "")}
            for i, label in enumerate(labels)]


THRESHOLDS = json.loads((ROOT / "tests/performance/thresholds/GRUPO_07_ORDENES_BASELINE.json").read_text())


class NewmanGateTests(unittest.TestCase):
    def test_complete_scope(self):
        self.assertEqual(newman.summarize(newman_result(), 3, 14)["Result"], "PASS")

    def test_reject_empty_partial_skipped_failure_and_inconsistent_counts(self):
        variants = []
        result = newman_result(); result["run"]["executions"] = []; variants.append(result)
        result = newman_result(); result["run"]["executions"].pop(); variants.append(result)
        result = newman_result(); result["run"]["executions"][0]["assertions"][0]["skipped"] = True; variants.append(result)
        result = newman_result(); result["run"]["executions"][0]["assertions"][0]["error"] = {"name": "AssertionError"}; variants.append(result)
        result = newman_result(); result["run"]["failures"] = [{"error": "transport"}]; variants.append(result)
        result = newman_result(); result["run"]["stats"]["assertions"]["total"] = 13; variants.append(result)
        result = newman_result(); del result["run"]["executions"][0]["response"]; variants.append(result)
        for i, result in enumerate(variants):
            with self.subTest(variant=i):
                self.assertEqual(newman.summarize(result, 3, 14)["Result"], "FAIL")

    def test_cli_pdf_and_real_exit_codes(self):
        with tempfile.TemporaryDirectory() as directory:
            source, pdf = Path(directory) / "results.json", Path(directory) / "report.pdf"
            command = [sys.executable, "-B", str(SCRIPTS / "newman_report.py"),
                       "--results", str(source), "--output", str(pdf),
                       "--expected-requests", "3", "--expected-assertions", "14"]
            for document, status in [(newman_result(), 0), ({"run": {}}, 1), ({"stats": {}}, 2)]:
                source.write_text(json.dumps(document), encoding="utf-8")
                result = subprocess.run(command, capture_output=True, text=True)
                self.assertEqual(result.returncode, status, result.stderr)
                if status in (0, 1):
                    self.assertTrue(pdf.read_bytes().startswith(b"%PDF"))
            source.write_text("{broken", encoding="utf-8")
            self.assertEqual(subprocess.run(command, capture_output=True).returncode, 2)
            source.unlink()
            self.assertEqual(subprocess.run(command, capture_output=True).returncode, 2)


class JMeterGateTests(unittest.TestCase):
    def test_complete_profiles(self):
        for profile in ("baseline", "csv"):
            self.assertEqual(jmeter.evaluate(jtl_rows(profile), profile, THRESHOLDS)["result"], "PASS")

    def test_reject_empty_missing_extra_and_wrong_plan(self):
        for profile in ("baseline", "csv"):
            rows = jtl_rows(profile)
            for changed in ([], rows[:-1], rows + [rows[0]], [dict(r, label="course-plan") for r in rows]):
                with self.subTest(profile=profile, count=len(changed)):
                    self.assertEqual(jmeter.evaluate(changed, profile, THRESHOLDS)["result"], "FAIL")

    def test_reject_http_assertion_control_and_malformed_samples(self):
        for patch in ({"responseCode": "429"}, {"success": "false"},
                      {"failureMessage": "assertion failed"}, {"responseCode": "CORRELATION_ERROR"},
                      {"elapsed": "broken"}, {"URL": "https://example.com/other"}):
            rows = jtl_rows("baseline"); rows[0].update(patch)
            with self.subTest(patch=patch):
                self.assertEqual(jmeter.evaluate(rows, "baseline", THRESHOLDS)["result"], "FAIL")

    def test_threshold_is_evaluated(self):
        rows = jtl_rows("baseline"); rows[0]["success"] = "false"
        result = jmeter.evaluate(rows, "baseline", THRESHOLDS)
        self.assertTrue(any("threshold failed" in x for x in result["errors"]))
        unsupported = copy.deepcopy(THRESHOLDS); unsupported["global"]["maxP95"] = 100
        self.assertEqual(jmeter.evaluate(jtl_rows("baseline"), "baseline", unsupported)["result"], "FAIL")

    def test_missing_and_invalid_threshold_fail_closed(self):
        for threshold in (None, {}, {"global": "bad"}, []):
            self.assertEqual(jmeter.evaluate(jtl_rows("baseline"), "baseline", threshold)["result"], "FAIL")

    def test_correlation_scope(self):
        rows = jtl_rows("csv"); rows[1]["URL"] = "https://aiquaa-sandbox-api.vercel.app/api/v1/ordenes/NOT_FOUND"
        self.assertEqual(jmeter.evaluate(rows, "csv")["result"], "FAIL")
        rows = jtl_rows("csv"); rows[0], rows[1] = rows[1], rows[0]
        self.assertEqual(jmeter.evaluate(rows, "csv")["result"], "FAIL")
        rows = jtl_rows("csv"); rows[1]["threadName"] = "other-worker"
        self.assertEqual(jmeter.evaluate(rows, "csv")["result"], "FAIL")

    def test_cli_pdf_json_and_failure_exit(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            jtl = root / "results.jtl"
            command = [sys.executable, "-B", str(SCRIPTS / "jmeter_report.py"), "--profile", "csv",
                       "--jtl", str(jtl), "--output-dir", str(root / "report")]
            for rows, expected in [(jtl_rows("csv"), 0), (jtl_rows("csv")[:-1], 1), ([], 1)]:
                with jtl.open("w", newline="", encoding="utf-8") as target:
                    writer = csv.DictWriter(target, fieldnames=sorted(jmeter.REQUIRED_COLUMNS))
                    writer.writeheader(); writer.writerows(rows)
                result = subprocess.run(command, capture_output=True, text=True)
                self.assertEqual(result.returncode, expected, result.stderr)
                self.assertTrue((root / "report/report.pdf").read_bytes().startswith(b"%PDF"))
                report = json.loads((root / "report/summary.json").read_text())
                self.assertEqual(report["result"], "PASS" if expected == 0 else "FAIL")
            jtl.write_text("bad,columns\n1,2\n", encoding="utf-8")
            self.assertEqual(subprocess.run(command, capture_output=True).returncode, 1)
            jtl.unlink()
            self.assertEqual(subprocess.run(command, capture_output=True).returncode, 1)


if __name__ == "__main__":
    unittest.main()
