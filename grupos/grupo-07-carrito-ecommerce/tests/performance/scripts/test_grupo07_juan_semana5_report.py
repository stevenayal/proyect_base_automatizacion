import json
import tempfile
import unittest
from pathlib import Path

from grupo07_juan_semana5_report import GET, POST, evaluate_rows, write_reports


THRESHOLDS = {
    "minimumHttpSamples": 20,
    "expectedPostCount": 10,
    "expectedGetCount": 10,
    "maxErrorRatePct": 1,
    "maxP95Ms": 1500,
}


def passing_rows():
    rows = []
    for index in range(10):
        stamp = 1_800_000_000_000 + index * 12_000
        rows.extend([
            {"timeStamp": str(stamp), "elapsed": "600", "label": POST,
             "responseCode": "201", "success": "true", "failureMessage": ""},
            {"timeStamp": str(stamp + 6_000), "elapsed": "300", "label": GET,
             "responseCode": "200", "success": "true", "failureMessage": ""},
        ])
    return rows


class Semana5EvaluatorTests(unittest.TestCase):
    def test_a_approved_20_http_samples(self):
        result = evaluate_rows(passing_rows(), THRESHOLDS)
        self.assertEqual(result["result"], "APROBADO")
        self.assertEqual(result["metrics"]["totalHttpSamples"], 20)
        self.assertEqual(result["metrics"]["postCount"], 10)
        self.assertEqual(result["metrics"]["getCount"], 10)
        self.assertEqual(result["metrics"]["failed"], 0)

    def test_b_rejects_minimum_samples(self):
        result = evaluate_rows(passing_rows()[:-2], THRESHOLDS)
        self.assertEqual(result["result"], "RECHAZADO")
        self.assertTrue(any("Minimum HTTP samples" in reason for reason in result["reasons"]))

    def test_c_rejects_p95_over_limit(self):
        rows = passing_rows()
        rows[0]["elapsed"] = "2000"
        rows[2]["elapsed"] = "2000"
        result = evaluate_rows(rows, THRESHOLDS)
        self.assertEqual(result["result"], "RECHAZADO")
        self.assertGreater(result["metrics"]["p95Ms"], 1500)

    def test_d_rejects_error_rate_and_unexpected_status(self):
        rows = passing_rows()
        rows[0]["responseCode"] = "500"
        rows[0]["success"] = "false"
        result = evaluate_rows(rows, THRESHOLDS)
        self.assertEqual(result["result"], "RECHAZADO")
        self.assertEqual(result["metrics"]["errorRatePct"], 5)
        self.assertEqual(result["metrics"]["unexpected4xx5xxCount"], 1)

    def test_e_rejects_429_as_shared_rate_limit(self):
        rows = passing_rows()
        rows[1]["responseCode"] = "429"
        rows[1]["success"] = "false"
        result = evaluate_rows(rows, THRESHOLDS)
        self.assertEqual(result["result"], "RECHAZADO")
        self.assertEqual(result["metrics"]["http429Count"], 1)
        self.assertIn("Shared sandbox rate limit", result["primaryCause"])

    def test_f_excludes_correlation_control_from_http_metrics_but_rejects(self):
        rows = passing_rows() + [{
            "timeStamp": "1800000300000", "elapsed": "0",
            "label": "Validar correlacion antes del GET",
            "responseCode": "CORRELATION_ERROR", "success": "false",
            "failureMessage": "",
        }]
        result = evaluate_rows(rows, THRESHOLDS)
        self.assertEqual(result["result"], "RECHAZADO")
        self.assertEqual(result["metrics"]["totalHttpSamples"], 20)
        self.assertEqual(result["metrics"]["correlationErrorCount"], 1)

    def test_writes_json_markdown_and_pdf(self):
        result = evaluate_rows(passing_rows(), THRESHOLDS)
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary)
            write_reports(result, output)
            self.assertEqual(json.loads((output / "summary.json").read_text(encoding="utf-8"))["result"], "APROBADO")
            markdown = (output / "summary.md").read_text(encoding="utf-8")
            self.assertEqual(markdown.rstrip().splitlines()[-1], "CONTINUIDAD DE VERSIÓN: SÍ")
            self.assertTrue((output / "report.pdf").read_bytes().startswith(b"%PDF-"))


if __name__ == "__main__":
    unittest.main()
