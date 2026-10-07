#!/usr/bin/env python3
"""
newman_report.py

Genera un informe PDF a partir del resultado JSON de una corrida de Newman
(--reporter-json-export). Pensado para usarse dentro de un workflow de
GitHub Actions, pero funciona igual en local.

Uso:
    python newman_report.py \
        --results newman/results.json \
        --banner assets/banner_portada.png \
        --logo-aiquaa assets/logo_aiquaa_circle.png \
        --logo-postman assets/logo_postman_clean.png \
        --repo-url "https://github.com/org/repo" \
        --api-version "abc1234" \
        --author "Claudio" \
        --run-url "https://github.com/org/repo/actions/runs/123" \
        --output newman/report.pdf
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image,
    PageBreak,
    HRFlowable,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT


def parse_args():
    p = argparse.ArgumentParser(description="Genera un PDF de regresión a partir de un JSON de Newman")
    p.add_argument("--results", required=True, help="Ruta al results.json exportado por Newman")
    p.add_argument("--banner", required=False, help="Imagen de portada")
    p.add_argument("--logo-aiquaa", required=False, help="Logo institucional")
    p.add_argument("--logo-postman", required=False, help="Logo de Postman")
    p.add_argument("--repo-url", required=False, default="", help="URL del repositorio")
    p.add_argument("--api-version", required=False, default="", help="Versión / commit de la API bajo prueba")
    p.add_argument("--author", required=False, default="", help="Quién disparó la corrida")
    p.add_argument("--run-url", required=False, default="", help="URL del run de GitHub Actions")
    p.add_argument("--output", required=True, help="Ruta del PDF de salida")
    return p.parse_args()


def load_results(path):
    if not os.path.exists(path):
        print(f"ERROR: no se encontró el archivo de resultados: {path}", file=sys.stderr)
        sys.exit(1)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def safe_image(path, width, height=None, max_height=None):
    """Devuelve un Flowable Image si el archivo existe y es válido, si no None.
    Si sólo se da width (y max_height opcional), respeta el aspect ratio real
    del archivo para no distorsionarlo ni desbordar la página."""
    if not path or not os.path.exists(path):
        return None
    try:
        if height is None:
            from PIL import Image as PILImage

            with PILImage.open(path) as im:
                iw, ih = im.size
            height = width * (ih / iw)
            if max_height and height > max_height:
                height = max_height
                width = height * (iw / ih)
        img = Image(path, width=width, height=height)
        return img
    except Exception:
        return None


def build_summary(data):
    run = data.get("run", {})
    stats = run.get("stats", {})
    timings = run.get("timings", {})
    collection_name = data.get("collection", {}).get("info", {}).get("name", "Colección Postman")

    total_requests = stats.get("requests", {}).get("total", 0)
    failed_requests = stats.get("requests", {}).get("failed", 0)
    total_assertions = stats.get("assertions", {}).get("total", 0)
    failed_assertions = stats.get("assertions", {}).get("failed", 0)
    passed_assertions = total_assertions - failed_assertions

    started = timings.get("started")
    completed = timings.get("completed")
    duration_ms = None
    if started and completed:
        duration_ms = completed - started

    failures = run.get("failures", []) or []

    return {
        "collection_name": collection_name,
        "total_requests": total_requests,
        "failed_requests": failed_requests,
        "total_assertions": total_assertions,
        "passed_assertions": passed_assertions,
        "failed_assertions": failed_assertions,
        "duration_ms": duration_ms,
        "failures": failures,
    }


def fmt_duration(ms):
    if ms is None:
        return "N/D"
    seconds = ms / 1000.0
    return f"{seconds:.2f} s"


def main():
    args = parse_args()
    data = load_results(args.results)
    summary = build_summary(data)

    os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "TitleCentered", parent=styles["Title"], alignment=TA_CENTER, fontSize=22, spaceAfter=10
    )
    subtitle_style = ParagraphStyle(
        "Subtitle", parent=styles["Normal"], alignment=TA_CENTER, fontSize=12, textColor=colors.grey
    )
    h2_style = ParagraphStyle("H2", parent=styles["Heading2"], spaceBefore=14, spaceAfter=8)
    body_style = ParagraphStyle("Body", parent=styles["Normal"], alignment=TA_LEFT, fontSize=10, leading=14)
    meta_style = ParagraphStyle("Meta", parent=styles["Normal"], fontSize=9, textColor=colors.grey)

    doc = SimpleDocTemplate(
        args.output,
        pagesize=A4,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
        leftMargin=1.8 * cm,
        rightMargin=1.8 * cm,
    )

    story = []

    # --- Portada ---
    banner = safe_image(args.banner, width=16.5 * cm, max_height=7 * cm)
    if banner:
        story.append(banner)
        story.append(Spacer(1, 0.6 * cm))

    story.append(Paragraph("Informe de Regresión Automatizada", title_style))
    story.append(Paragraph(summary["collection_name"], subtitle_style))
    story.append(Spacer(1, 0.4 * cm))

    logo_row = []
    logo_a = safe_image(args.logo_aiquaa, width=2.5 * cm, height=2.5 * cm)
    logo_p = safe_image(args.logo_postman, width=2.5 * cm, height=2.5 * cm)
    if logo_a or logo_p:
        cells = [logo_a or "", logo_p or ""]
        t = Table([cells], colWidths=[8.5 * cm, 8.5 * cm])
        t.setStyle(TableStyle([("ALIGN", (0, 0), (-1, -1), "CENTER"), ("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
        story.append(t)
        story.append(Spacer(1, 0.6 * cm))

    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    meta_lines = [
        f"Generado: {generated_at}",
        f"Autor / disparado por: {args.author or 'N/D'}",
        f"Versión / commit: {args.api_version or 'N/D'}",
        f"Repositorio: {args.repo_url or 'N/D'}",
        f"Run: {args.run_url or 'N/D'}",
    ]
    for line in meta_lines:
        story.append(Paragraph(line, meta_style))

    story.append(Spacer(1, 0.6 * cm))
    story.append(HRFlowable(width="100%", color=colors.lightgrey))
    story.append(PageBreak())

    # --- Resumen ejecutivo ---
    story.append(Paragraph("Resumen de la ejecución", h2_style))

    overall_ok = summary["failed_requests"] == 0 and summary["failed_assertions"] == 0
    status_text = "APROBADO" if overall_ok else "CON FALLAS"
    status_color = colors.HexColor("#1a7f37") if overall_ok else colors.HexColor("#c62828")

    status_style = ParagraphStyle(
        "Status", parent=styles["Heading2"], textColor=status_color, alignment=TA_CENTER
    )
    story.append(Paragraph(f"Estado general: {status_text}", status_style))
    story.append(Spacer(1, 0.4 * cm))

    table_data = [
        ["Métrica", "Valor"],
        ["Requests totales", str(summary["total_requests"])],
        ["Requests fallidos", str(summary["failed_requests"])],
        ["Assertions totales", str(summary["total_assertions"])],
        ["Assertions OK", str(summary["passed_assertions"])],
        ["Assertions fallidas", str(summary["failed_assertions"])],
        ["Duración total", fmt_duration(summary["duration_ms"])],
    ]
    summary_table = Table(table_data, colWidths=[8 * cm, 8 * cm])
    summary_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f0f0f0")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#fafafa")]),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(summary_table)
    story.append(Spacer(1, 0.8 * cm))

    # --- Detalle de fallas ---
    story.append(Paragraph("Detalle de fallas", h2_style))
    if not summary["failures"]:
        story.append(Paragraph("No se registraron fallas en esta corrida.", body_style))
    else:
        fail_rows = [["#", "Request / Test", "Error"]]
        for i, f in enumerate(summary["failures"], start=1):
            source_name = (f.get("source") or {}).get("name", "N/D")
            error = f.get("error") or {}
            error_msg = error.get("message", "Error sin descripción")
            test_name = error.get("test") or f.get("parentTest") or ""
            label = f"{source_name}" + (f" — {test_name}" if test_name else "")
            fail_rows.append([str(i), Paragraph(label, body_style), Paragraph(error_msg, body_style)])

        fail_table = Table(fail_rows, colWidths=[1 * cm, 7 * cm, 8 * cm], repeatRows=1)
        fail_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#fdecea")),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )
        story.append(fail_table)

    doc.build(story)
    print(f"PDF generado en: {args.output}")


if __name__ == "__main__":
    main()
