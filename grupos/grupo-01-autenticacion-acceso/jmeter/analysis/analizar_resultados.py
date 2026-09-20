#!/usr/bin/env python3
"""Analiza un JTL CSV de JMeter y genera evidencia JSON y Markdown."""

import argparse
import csv
import json
import math
import sys
from collections import Counter, defaultdict
from pathlib import Path


def percentile(values, percentile_value):
    ordered = sorted(values)
    return ordered[max(0, math.ceil((percentile_value / 100) * len(ordered)) - 1)]


def summarize(samples):
    elapsed = [sample["elapsed"] for sample in samples]
    failures = [sample for sample in samples if not sample["success"]]
    timestamps = [sample["timestamp"] for sample in samples]
    duration_seconds = (max(timestamps) - min(timestamps)) / 1000 if len(samples) > 1 else 0
    throughput = len(samples) / duration_seconds if duration_seconds > 0 else 0
    errors = Counter(
        f'{sample["response_code"]} - {sample["response_message"]}' for sample in failures
    )
    return {
        "samples": len(samples),
        "successes": len(samples) - len(failures),
        "failures": len(failures),
        "errorRatePercent": round(len(failures) * 100 / len(samples), 3),
        "throughputPerSecond": round(throughput, 3),
        "averageMs": round(sum(elapsed) / len(elapsed), 3),
        "minMs": min(elapsed),
        "maxMs": max(elapsed),
        "p50Ms": percentile(elapsed, 50),
        "p90Ms": percentile(elapsed, 90),
        "p95Ms": percentile(elapsed, 95),
        "p99Ms": percentile(elapsed, 99),
        "errors": dict(errors),
    }


def parse_success(value):
    return str(value).strip().lower() == "true"


def load_jtl(path):
    samples = []
    with path.open(encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source)
        required = {"timeStamp", "elapsed", "label", "responseCode", "responseMessage", "success"}
        missing = required.difference(reader.fieldnames or [])
        if missing:
            raise ValueError(f"El JTL no contiene columnas requeridas: {', '.join(sorted(missing))}")
        for line_number, row in enumerate(reader, start=2):
            try:
                samples.append({
                    "timestamp": int(row["timeStamp"]),
                    "elapsed": int(row["elapsed"]),
                    "label": row["label"].strip() or "Sin etiqueta",
                    "response_code": row["responseCode"].strip(),
                    "response_message": row["responseMessage"].strip(),
                    "success": parse_success(row["success"]),
                })
            except (TypeError, ValueError) as error:
                raise ValueError(f"Valores invalidos en la linea {line_number}: {error}") from error
    return samples


def evaluate(metrics, threshold, minimum_samples, minimum_throughput):
    failures = []
    if metrics["errorRatePercent"] > threshold.get("maxErrorRate", float("inf")):
        failures.append("errorRatePercent")
    for metric, key in (("averageMs", "averageMs"), ("p90Ms", "p90Ms"),
                        ("p95Ms", "p95Ms"), ("p99Ms", "p99Ms"), ("maxMs", "maxMs")):
        if key in threshold and metrics[metric] > threshold[key]:
            failures.append(metric)
    if metrics["throughputPerSecond"] < minimum_throughput:
        failures.append("throughputPerSecond")
    if metrics["samples"] < minimum_samples:
        return "INCONCLUSIVE", failures, [f"samples < {minimum_samples}"]
    return ("FAIL" if failures else "PASS"), failures, []


def render_markdown(report, jtl_path, threshold_path):
    lines = [
        "# Analisis de rendimiento JMeter - Grupo 01",
        "",
        "**Responsable:** Oscar Benitez  ",
        f"**JTL analizado:** `{jtl_path.as_posix()}`  ",
        f"**Thresholds:** `{threshold_path.as_posix()}`  ",
        f"**Veredicto global:** **{report['verdict']}**",
        "",
        "## Resultados",
        "",
        "| Alcance | Muestras | Errores | Error % | Throughput req/s | Promedio ms | p95 ms | p99 ms | Veredicto |",
        "|---|---:|---:|---:|---:|---:|---:|---:|---|",
    ]
    rows = [("Global", report["global"])] + list(report["operations"].items())
    for name, result in rows:
        metrics = result["metrics"]
        lines.append(
            f"| {name.replace('|', '/')} | {metrics['samples']} | {metrics['failures']} | "
            f"{metrics['errorRatePercent']:.3f} | {metrics['throughputPerSecond']:.3f} | "
            f"{metrics['averageMs']:.3f} | {metrics['p95Ms']} | {metrics['p99Ms']} | {result['verdict']} |"
        )
    lines.extend(["", "## Evaluacion de thresholds", ""])
    for name, result in rows:
        reasons = result["failedThresholds"] + result["notes"]
        detail = ", ".join(reasons) if reasons else "Sin incumplimientos"
        lines.append(f"- **{name}:** {result['verdict']} - {detail}.")
    lines.extend([
        "",
        "## Interpretacion",
        "",
        "El p95 representa el tiempo que no supera el 95 % de las muestras. El porcentaje de errores "
        "mide respuestas fallidas sobre el total y el throughput expresa solicitudes procesadas por segundo. "
        "Este escenario corto sirve como baseline de CI/CD; no reemplaza una prueba de carga sostenida.",
        "",
    ])
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--jtl", required=True, type=Path)
    parser.add_argument("--thresholds", required=True, type=Path)
    parser.add_argument("--json", required=True, type=Path, dest="json_output")
    parser.add_argument("--markdown", required=True, type=Path)
    args = parser.parse_args()

    try:
        samples = load_jtl(args.jtl)
        if not samples:
            raise ValueError("El JTL no contiene muestras")
        thresholds = json.loads(args.thresholds.read_text(encoding="utf-8"))
        analysis = thresholds.get("analysis", {})
        grouped = defaultdict(list)
        for sample in samples:
            grouped[sample["label"]].append(sample)

        def result_for(name, selected, threshold, minimum):
            metrics = summarize(selected)
            verdict, failed, notes = evaluate(
                metrics, threshold, minimum, analysis.get("minimumThroughputPerSecond", 0)
            )
            return {"metrics": metrics, "threshold": threshold, "verdict": verdict,
                    "failedThresholds": failed, "notes": notes}

        global_result = result_for(
            "Global", samples, thresholds.get("global", {}), analysis.get("minimumSamplesGlobal", 1)
        )
        operations = {}
        for name, selected in sorted(grouped.items()):
            operation_threshold = thresholds.get("operations", {}).get(name, thresholds.get("global", {}))
            operations[name] = result_for(
                name, selected, operation_threshold, analysis.get("minimumSamplesPerOperation", 1)
            )
        verdicts = [global_result["verdict"]] + [result["verdict"] for result in operations.values()]
        verdict = "INCONCLUSIVE" if "INCONCLUSIVE" in verdicts else ("FAIL" if "FAIL" in verdicts else "PASS")
        report = {"verdict": verdict, "global": global_result, "operations": operations}
        args.json_output.parent.mkdir(parents=True, exist_ok=True)
        args.markdown.parent.mkdir(parents=True, exist_ok=True)
        args.json_output.write_text(json.dumps(report, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")
        args.markdown.write_text(render_markdown(report, args.jtl, args.thresholds), encoding="utf-8")
        print(f"Veredicto: {verdict}")
        print(f"Resumen JSON: {args.json_output}")
        print(f"Resumen Markdown: {args.markdown}")
        return 0 if verdict == "PASS" else (1 if verdict == "FAIL" else 2)
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
