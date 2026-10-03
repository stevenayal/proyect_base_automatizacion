#!/usr/bin/env python3
"""Fail-closed evaluator and evidence writer for Juan's Semana 5 JMeter run."""

from __future__ import annotations

import argparse
import csv
import json
import math
import os
import statistics
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


POST = "G7-JUAN-S5-01 POST crear orden dinamica"
GET = "G7-JUAN-S5-02 GET consultar orden correlacionada"
HTTP_LABELS = {POST: ("POST", "201"), GET: ("GET", "200")}
REQUIRED_COLUMNS = {"timeStamp", "elapsed", "label", "responseCode", "success"}


def percentile(values: list[float], percentile_value: float) -> float | None:
    """Nearest-rank percentile; deterministic for the small, fixed sample set."""
    if not values:
        return None
    ordered = sorted(values)
    rank = max(1, math.ceil(percentile_value / 100 * len(ordered)))
    return ordered[rank - 1]


def _valid_int(value: str) -> int | None:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None
    return parsed if parsed >= 0 else None


def evaluate_rows(
    rows: list[dict[str, str]],
    thresholds: dict,
    *,
    input_errors: list[str] | None = None,
    preflight_status: str = "success",
    jmeter_status: str = "success",
) -> dict:
    """Evaluate only the two known HTTP sampler labels; controls never enter metrics."""
    reasons = list(input_errors or [])
    http_rows: list[dict[str, str]] = []
    correlation_errors: list[dict[str, str]] = []
    unexpected_samples: list[dict[str, str]] = []

    for row in rows:
        label = (row.get("label") or "").strip()
        code = (row.get("responseCode") or "").strip()
        if "CORRELATION_ERROR" in label.upper() or "CORRELATION_ERROR" in code.upper():
            correlation_errors.append({"label": label, "responseCode": code})
        elif label in HTTP_LABELS:
            http_rows.append(row)
        else:
            unexpected_samples.append({"label": label, "responseCode": code})

    post_rows = [row for row in http_rows if HTTP_LABELS[row["label"]][0] == "POST"]
    get_rows = [row for row in http_rows if HTTP_LABELS[row["label"]][0] == "GET"]
    latency_values: list[float] = []
    successful = 0
    failed = 0
    stamps: list[int] = []
    ends: list[int] = []
    statuses = Counter()

    for row in http_rows:
        label = row.get("label", "")
        _, expected_status = HTTP_LABELS[label]
        code = (row.get("responseCode") or "").strip()
        statuses[code or "<missing>"] += 1
        stamp = _valid_int(row.get("timeStamp", ""))
        elapsed = _valid_int(row.get("elapsed", ""))
        if stamp is not None:
            stamps.append(stamp)
            if elapsed is not None:
                ends.append(stamp + elapsed)
        if elapsed is not None:
            latency_values.append(float(elapsed))

        passed = (
            (row.get("success") or "").strip().lower() == "true"
            and code == expected_status
            and not (row.get("failureMessage") or "").strip()
            and stamp is not None
            and elapsed is not None
        )
        if passed:
            successful += 1
        else:
            failed += 1

    total_http = len(http_rows)
    error_rate_pct = (failed / total_http * 100) if total_http else None
    durations = [float(_valid_int(row.get("elapsed", ""))) for row in http_rows
                 if _valid_int(row.get("elapsed", "")) is not None]
    min_ms = min(durations) if durations else None
    max_ms = max(durations) if durations else None
    average_ms = statistics.fmean(durations) if durations else None
    median_ms = statistics.median(durations) if durations else None
    p90_ms = percentile(durations, 90)
    p95_ms = percentile(durations, 95)

    time_range = None
    throughput = None
    if stamps and ends:
        start_ms, end_ms = min(stamps), max(ends)
        time_range = {"fromEpochMs": start_ms, "toEpochMs": end_ms}
        span_seconds = (end_ms - start_ms) / 1000
        if span_seconds > 0:
            throughput = total_http / span_seconds

    limit_samples = thresholds.get("minimumHttpSamples")
    expected_posts = thresholds.get("expectedPostCount")
    expected_gets = thresholds.get("expectedGetCount")
    max_error_rate = thresholds.get("maxErrorRatePct")
    max_p95 = thresholds.get("maxP95Ms")
    threshold_error = (
        type(limit_samples) is not int or limit_samples <= 0
        or type(expected_posts) is not int or expected_posts < 0
        or type(expected_gets) is not int or expected_gets < 0
        or type(max_error_rate) not in (int, float) or not math.isfinite(max_error_rate)
        or not 0 <= max_error_rate <= 100
        or type(max_p95) not in (int, float) or not math.isfinite(max_p95) or max_p95 <= 0
    )
    if threshold_error:
        reasons.append("Threshold JSON is missing fields or contains invalid values.")
        limit_samples, expected_posts, expected_gets, max_error_rate, max_p95 = 20, 10, 10, 1, 1500

    if preflight_status != "success":
        reasons.append(f"Preflight did not authorize the run (status: {preflight_status}).")
    if jmeter_status != "success":
        reasons.append(f"JMeter did not complete successfully (status: {jmeter_status}).")
    if unexpected_samples:
        reasons.append(f"Found {len(unexpected_samples)} non-HTTP or unrecognized JTL samples.")
    if correlation_errors:
        reasons.append(f"Found {len(correlation_errors)} CORRELATION_ERROR control sample(s).")
    if total_http < limit_samples:
        reasons.append(f"Minimum HTTP samples not met: {total_http} < {limit_samples}.")
    if len(post_rows) != expected_posts:
        reasons.append(f"POST count mismatch: {len(post_rows)} != {expected_posts}.")
    if len(get_rows) != expected_gets:
        reasons.append(f"GET count mismatch: {len(get_rows)} != {expected_gets}.")
    if error_rate_pct is None or error_rate_pct > max_error_rate:
        rendered = "undefined" if error_rate_pct is None else f"{error_rate_pct:.2f}%"
        reasons.append(f"HTTP error rate exceeds the limit: {rendered} > {max_error_rate}%.")
    if p95_ms is None or p95_ms > max_p95:
        rendered = "unavailable" if p95_ms is None else f"{p95_ms:.0f} ms"
        reasons.append(f"HTTP p95 exceeds the limit or is unavailable: {rendered}; limit {max_p95} ms.")

    rate_limited = statuses.get("429", 0)
    unexpected_http_errors = sum(
        count for status, count in statuses.items()
        if status.isdigit() and 400 <= int(status) <= 599 and status not in {"201", "200"}
    )
    if rate_limited:
        reasons.append(f"Sandbox rate limit observed: {rate_limited} HTTP 429 response(s).")
    if unexpected_http_errors:
        reasons.append(f"Found {unexpected_http_errors} unexpected HTTP 4xx/5xx response(s).")
    if any(row.get("responseCode") != "201" for row in post_rows):
        reasons.append("Not all POST requests returned HTTP 201.")
    if any(row.get("responseCode") != "200" for row in get_rows):
        reasons.append("Not all correlated GET requests returned HTTP 200.")

    # Preserve order while removing duplicate messages caused by overlapping checks.
    reasons = list(dict.fromkeys(reasons))
    approved = not reasons
    if approved:
        primary_cause = "No gate violations were observed in this controlled run."
    elif rate_limited:
        primary_cause = (
            "Shared sandbox rate limit (HTTP 429). This is evidence of quota contention, "
            "not by itself evidence of a functional application defect."
        )
    elif any(not (row.get("responseCode") or "").isdigit() for row in http_rows):
        primary_cause = (
            "At least one HTTP sampler ended without a numeric HTTP status; this points to "
            "transport/infrastructure or runner failure, not a proven functional defect."
        )
    elif total_http < limit_samples or len(post_rows) != expected_posts or len(get_rows) != expected_gets:
        primary_cause = "The required HTTP sample scope is incomplete; no performance acceptance can be made."
    else:
        primary_cause = (
            "One or more acceptance criteria failed. Review the status and latency metrics; "
            "the evidence does not establish a functional defect unless the response/assertion does."
        )

    def utc_from_ms(value):
        if value is None:
            return None
        return datetime.fromtimestamp(value / 1000, tz=timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")

    return {
        "result": "APROBADO" if approved else "RECHAZADO",
        "continuidadVersion": "SÍ" if approved else "NO",
        "thresholds": {
            "minimumHttpSamples": limit_samples,
            "expectedPostCount": expected_posts,
            "expectedGetCount": expected_gets,
            "maxErrorRatePct": max_error_rate,
            "maxP95Ms": max_p95,
        },
        "metrics": {
            "totalHttpSamples": total_http,
            "postCount": len(post_rows),
            "getCount": len(get_rows),
            "successful": successful,
            "failed": failed,
            "errorRatePct": error_rate_pct,
            "minMs": min_ms,
            "averageMs": average_ms,
            "medianMs": median_ms,
            "p90Ms": p90_ms,
            "p95Ms": p95_ms,
            "maxMs": max_ms,
            "throughputSamplesPerSecond": throughput,
            "statusCodes": dict(sorted(statuses.items())),
            "correlationErrorCount": len(correlation_errors),
            "otherNonHttpSampleCount": len(unexpected_samples),
            "http429Count": rate_limited,
            "unexpected4xx5xxCount": unexpected_http_errors,
        },
        "timeRange": time_range,
        "startedAtUtc": utc_from_ms(time_range["fromEpochMs"] if time_range else None),
        "finishedAtUtc": utc_from_ms(time_range["toEpochMs"] if time_range else None),
        "preflightStatus": preflight_status,
        "jmeterStatus": jmeter_status,
        "reasons": reasons,
        "primaryCause": primary_cause,
    }


def read_jtl(path: Path) -> tuple[list[dict[str, str]], list[str]]:
    try:
        with path.open(encoding="utf-8-sig", newline="") as source:
            reader = csv.DictReader(source, strict=True)
            if not REQUIRED_COLUMNS.issubset(reader.fieldnames or []):
                return [], ["JTL is missing required columns or its CSV header is invalid."]
            rows = list(reader)
            if any(None in row or any(value is None for value in row.values()) for row in rows):
                return [], ["JTL contains malformed CSV rows."]
            if not rows:
                return [], ["JTL contains no samples."]
            return rows, []
    except (OSError, UnicodeError, csv.Error):
        return [], ["JTL is missing, empty, unreadable, or malformed."]


def read_thresholds(path: Path) -> tuple[dict, list[str]]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8-sig"))
        if not isinstance(payload, dict):
            raise ValueError
        return payload, []
    except (OSError, UnicodeError, json.JSONDecodeError, ValueError):
        return {}, ["Threshold JSON is missing or invalid."]


def render_markdown(summary: dict) -> str:
    metrics = summary["metrics"]
    thresholds = summary["thresholds"]
    def show(value, suffix=""):
        return "No disponible" if value is None else f"{value}{suffix}"

    lines = [
        "# Semana 5 — Grupo 07 — Evaluación de performance",
        "",
        f"**Resultado: {summary['result']}**",
        "",
        "## Alcance y métricas HTTP",
        "",
        f"- HTTP samples: {metrics['totalHttpSamples']} (mínimo {thresholds['minimumHttpSamples']})",
        f"- POST: {metrics['postCount']} (esperados {thresholds['expectedPostCount']}); GET: {metrics['getCount']} (esperados {thresholds['expectedGetCount']})",
        f"- Exitosos / fallidos: {metrics['successful']} / {metrics['failed']}",
        f"- Error rate: {show(metrics['errorRatePct'], '%')} (máximo {thresholds['maxErrorRatePct']}%)",
        f"- Latencias en ms: min {show(metrics['minMs'])}; promedio {show(metrics['averageMs'])}; mediana {show(metrics['medianMs'])}; p90 {show(metrics['p90Ms'])}; p95 {show(metrics['p95Ms'])}; max {show(metrics['maxMs'])}",
        f"- Throughput: {show(metrics['throughputSamplesPerSecond'], ' samples/s')}",
        f"- Status codes: `{json.dumps(metrics['statusCodes'], ensure_ascii=False, sort_keys=True)}`",
        f"- Muestras de control CORRELATION_ERROR: {metrics['correlationErrorCount']}; otros no HTTP: {metrics['otherNonHttpSampleCount']}",
        f"- Ventana UTC JTL: {summary['startedAtUtc'] or 'no disponible'} → {summary['finishedAtUtc'] or 'no disponible'}",
        "",
        "## Gate y causa",
        "",
        f"- Causa probable: {summary['primaryCause']}",
    ]
    if summary["reasons"]:
        lines.extend(["", "Criterios incumplidos:", ""])
        lines.extend(f"- {reason}" for reason in summary["reasons"])
    else:
        lines.extend(["", "Se cumplieron todos los criterios definidos para esta corrida controlada."])
    lines.extend([
        "",
        "Los límites son criterios de aceptación de esta práctica del curso, no un SLA productivo. El p95 usa nearest-rank sobre las muestras HTTP válidas; las muestras internas no entran en las métricas HTTP.",
        "",
        "Un HTTP 429 representa rate limit compartido y se rechaza explícitamente; no se interpreta como éxito ni demuestra por sí solo un defecto funcional.",
        "",
        ("La corrida cumple el gate y puede continuar a revisión." if summary["continuidadVersion"] == "SÍ"
         else "No continuar la versión con este resultado. Determinar primero si el rechazo es por infraestructura/rate limit, alcance incompleto o respuesta funcional observada."),
        "",
        f"CONTINUIDAD DE VERSIÓN: {summary['continuidadVersion']}",
        "",
    ])
    return "\n".join(lines)


def write_pdf(summary: dict, path: Path) -> None:
    from html import escape
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    styles = getSampleStyleSheet()
    metrics = summary["metrics"]
    values = [
        ["HTTP samples", str(metrics["totalHttpSamples"])],
        ["POST / GET", f"{metrics['postCount']} / {metrics['getCount']}"],
        ["Éxitos / fallos", f"{metrics['successful']} / {metrics['failed']}"],
        ["Error rate", "N/D" if metrics["errorRatePct"] is None else f"{metrics['errorRatePct']:.2f}%"],
        ["p95", "N/D" if metrics["p95Ms"] is None else f"{metrics['p95Ms']:.0f} ms"],
        ["Status codes", json.dumps(metrics["statusCodes"], ensure_ascii=False, sort_keys=True)],
        ["CORRELATION_ERROR", str(metrics["correlationErrorCount"])],
    ]
    story = [
        Paragraph("Semana 5 — Grupo 07 — Informe JMeter", styles["Title"]),
        Spacer(1, 10),
        Paragraph(f"Veredicto: <b>{escape(summary['result'])}</b>", styles["Heading2"]),
        Paragraph(escape(summary["primaryCause"]), styles["BodyText"]),
        Spacer(1, 10),
        Table(values, colWidths=[135, 345], repeatRows=0, style=TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#EAF0F6")),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#B8C4D0")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("PADDING", (0, 0), (-1, -1), 6),
        ])),
        Spacer(1, 12),
        Paragraph("Criterios incumplidos", styles["Heading3"]),
    ]
    if summary["reasons"]:
        story.extend(Paragraph("• " + escape(reason), styles["BodyText"]) for reason in summary["reasons"])
    else:
        story.append(Paragraph("Todos los criterios de aceptación se cumplieron.", styles["BodyText"]))
    story.extend([
        Spacer(1, 10),
        Paragraph("Los límites son de esta práctica controlada del curso, no un SLA productivo. Un 429 es rate limit compartido y no prueba por sí solo un defecto funcional.", styles["BodyText"]),
        Spacer(1, 8),
        Paragraph(f"CONTINUIDAD DE VERSIÓN: <b>{escape(summary['continuidadVersion'])}</b>", styles["Heading2"]),
    ])
    SimpleDocTemplate(str(path), pagesize=A4, title="Grupo 07 Semana 5 performance").build(story)


def write_reports(summary: dict, output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (output_dir / "summary.md").write_text(render_markdown(summary), encoding="utf-8")
    write_pdf(summary, output_dir / "report.pdf")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--jtl", type=Path, required=True)
    parser.add_argument("--thresholds", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--preflight-status", default="success")
    parser.add_argument("--jmeter-status", default="success")
    args = parser.parse_args()

    rows, jtl_errors = read_jtl(args.jtl)
    thresholds, threshold_errors = read_thresholds(args.thresholds)
    summary = evaluate_rows(
        rows,
        thresholds,
        input_errors=jtl_errors + threshold_errors,
        preflight_status=args.preflight_status,
        jmeter_status=args.jmeter_status,
    )
    write_reports(summary, args.output_dir)
    github_output = os.environ.get("GITHUB_OUTPUT")
    if github_output:
        with open(github_output, "a", encoding="utf-8") as output:
            output.write(f"gate={summary['result']}\n")
    print(f"{summary['result']}: {len(summary['reasons'])} causa(s); resumen en {args.output_dir}")
    return 0 if summary["result"] == "APROBADO" else 1


if __name__ == "__main__":
    raise SystemExit(main())
