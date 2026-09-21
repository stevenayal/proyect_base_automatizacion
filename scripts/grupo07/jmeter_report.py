#!/usr/bin/env python3
"""Validate Juan's complete JTL scope and write a safe JSON/PDF summary.

JMeter's process exit code is not an assertion/coverage gate. This command is.
No response bodies, credentials or arbitrary diagnostic strings enter the PDF.
"""

import argparse
import csv
import json
import math
from collections import Counter
from pathlib import Path
from urllib.parse import urlsplit


BASELINE = "G7-01 Listar todas las ordenes (sin filtro)"
POST = "01 - Checkout exitoso (CSV)"
GET = "02 - Consultar orden creada (correlacionada)"
REQUIRED_COLUMNS = {"timeStamp", "elapsed", "label", "responseCode", "success",
                    "failureMessage", "URL", "threadName"}


def evaluate(rows, profile, thresholds=None):
    errors = []
    expected = {BASELINE: (18, "200")} if profile == "baseline" else {
        POST: (3, "201"), GET: (3, "200")}
    counts = Counter(row.get("label") for row in rows)
    if not rows:
        errors.append("Empty JTL: no tests executed.")
    if len(rows) != sum(n for n, _ in expected.values()):
        errors.append("Incomplete or excessive sample count.")
    for label, (number, _) in expected.items():
        if counts[label] != number:
            errors.append(f"Expected {number} samples for {label}; found {counts[label]}.")
    failures = 0
    for row in rows:
        label = row.get("label")
        bad = label not in expected or row.get("success", "").lower() != "true"
        bad = bad or bool(row.get("failureMessage", "").strip())
        if label in expected:
            bad = bad or row.get("responseCode") != expected[label][1]
        try:
            stamp, elapsed = int(row["timeStamp"]), int(row["elapsed"])
            bad = bad or stamp < 0 or elapsed < 0
            url = urlsplit(row["URL"])
            bad = bad or url.scheme != "https" or url.hostname != "aiquaa-sandbox-api.vercel.app"
            bad = bad or url.port not in (None, 443) or url.username is not None or url.password is not None
            bad = bad or bool(url.query or url.fragment)
            if label == GET:
                order_id = url.path.removeprefix("/api/v1/ordenes/")
                bad = bad or not url.path.startswith("/api/v1/ordenes/") or not order_id
                bad = bad or order_id in ("NOT_FOUND", "null", "undefined") or "{" in order_id
            else:
                bad = bad or url.path != "/api/v1/ordenes"
        except (KeyError, TypeError, ValueError):
            bad = True
        failures += int(bad)
    if failures:
        errors.append(f"{failures} failed HTTP/assertion/control/format samples.")
    if profile == "csv" and rows:
        # The unchanged JMX performs POST then a correlated GET in one worker.
        if [row.get("label") for row in rows] != [POST, GET] * 3:
            errors.append("Missing or out-of-order POST/GET correlation.")
        threads = {row.get("threadName") for row in rows}
        if len(threads) != 1 or not all(threads):
            errors.append("CSV execution must use one identified worker.")
    if profile == "baseline":
        try:
            # This dedicated plan has error-rate thresholds only. Reject schema
            # changes rather than silently ignore a newly introduced criterion.
            if set(thresholds) != {"global", "operations"}:
                raise ValueError()
            if set(thresholds["operations"]) != {BASELINE}:
                raise ValueError()
            for rule, scope in ((thresholds["global"], "global"),
                                (thresholds["operations"][BASELINE], BASELINE)):
                limit = rule["maxErrorRate"]
                if set(rule) != {"scope", "maxErrorRate"} or rule["scope"] != scope:
                    raise ValueError()
                if type(limit) not in (int, float) or not math.isfinite(limit) or not 0 <= limit <= 1:
                    raise ValueError()
                selected = rows if scope == "global" else [r for r in rows if r.get("label") == scope]
                failed = sum(r.get("success", "").lower() != "true" or
                             bool(r.get("failureMessage", "").strip()) or
                             r.get("responseCode") != "200" for r in selected)
                if not selected or failed / len(selected) > limit:
                    errors.append(f"Error-rate threshold failed: {scope}.")
        except (KeyError, TypeError, ValueError):
            errors.append("Missing or unsupported baseline threshold configuration.")
    return {
        "profile": profile, "result": "FAIL" if errors else "PASS",
        "expected_samples": sum(n for n, _ in expected.values()),
        "actual_samples": len(rows), "failed_samples": failures,
        "counts": {label: counts[label] for label in expected}, "errors": errors,
    }


def write_reports(summary, directory):
    from html import escape
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

    directory.mkdir(parents=True, exist_ok=True)
    (directory / "summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    styles = getSampleStyleSheet()
    story = [Paragraph("Grupo 07 - Juan Barreto - JMeter", styles["Title"]),
             Paragraph(f"{summary['profile']}: {summary['result']}", styles["Heading1"])]
    for key in ("expected_samples", "actual_samples", "failed_samples"):
        story.append(Paragraph(f"{key}: {summary[key]}", styles["BodyText"]))
    story.append(Spacer(1, 12))
    for label, value in summary["counts"].items():
        story.append(Paragraph(f"{escape(label)}: {value}", styles["BodyText"]))
    for error in summary["errors"]:
        story.append(Paragraph(escape(error), styles["BodyText"]))
    story.append(Paragraph("Scope and assertions gate; no latency SLA. A FAIL report is diagnostic evidence, not approval.", styles["BodyText"]))
    target = directory / "report.pdf"
    SimpleDocTemplate(str(target), author="Juan Barreto").build(story)
    if not target.is_file() or not target.stat().st_size:
        raise OSError("Missing or empty PDF")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--profile", choices=("baseline", "csv"), required=True)
    parser.add_argument("--jtl", type=Path, required=True)
    parser.add_argument("--thresholds", type=Path)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    rows, thresholds, input_errors = [], None, []
    try:
        with args.jtl.open(encoding="utf-8-sig", newline="") as source:
            reader = csv.DictReader(source, strict=True)
            if not REQUIRED_COLUMNS.issubset(reader.fieldnames or []):
                raise ValueError()
            rows = list(reader)
            if any(None in row or any(v is None for v in row.values()) for row in rows):
                raise ValueError()
    except (OSError, UnicodeError, ValueError, csv.Error):
        rows = []
        input_errors.append("Missing, empty or malformed JTL.")
    if args.profile == "baseline":
        try:
            thresholds = json.loads(args.thresholds.read_text(encoding="utf-8-sig"))
        except (AttributeError, OSError, UnicodeError, ValueError):
            input_errors.append("Missing or invalid threshold JSON.")
    summary = evaluate(rows, args.profile, thresholds)
    summary["errors"].extend(input_errors)
    if summary["errors"]:
        summary["result"] = "FAIL"
    write_reports(summary, args.output_dir)
    print(json.dumps(summary))
    return 0 if summary["result"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
