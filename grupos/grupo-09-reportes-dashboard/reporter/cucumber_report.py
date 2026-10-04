#!/usr/bin/env python3
"""
cucumber_report.py

Genera un informe PDF a partir del reporte JSON de Cucumber.js
(--format json:ruta/cucumber-report.json).

Uso:
    python cucumber_report.py \
        --results grupos/grupo-09-reportes-dashboard/evidence/cucumber-report.json \
        --output grupos/grupo-09-reportes-dashboard/evidence/INFORME_BDD_GRUPO09.pdf \
        --title "Grupo 09 - Reportes y Dashboard" \
        --banner skills/postman-newman-skill/reporter/assets/banner_portada.png \
        --logo-aiquaa skills/postman-newman-skill/reporter/assets/logo_aiquaa_circle.png \
        --logo-postman skills/postman-newman-skill/reporter/assets/logo_postman_clean.png \
        --repo-url "https://github.com/org/repo" \
        --api-version "abc1234" \
        --author "usuario" \
        --run-url "https://github.com/org/repo/actions/runs/123"
"""

import argparse
import base64
import io
import json
import os
import sys
from datetime import datetime, timezone
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable,
    Image,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

GREEN = colors.HexColor("#15803d")
RED = colors.HexColor("#b91c1c")
AMBER = colors.HexColor("#b45309")
GREY = colors.HexColor("#6b7280")


def parse_args():
    p = argparse.ArgumentParser(description="Genera un PDF a partir del JSON de Cucumber.js")
    p.add_argument("--results", required=True, help="Ruta al cucumber-report.json")
    p.add_argument("--output", required=True, help="Ruta del PDF de salida")
    p.add_argument("--title", default="Informe BDD", help="Título del informe")
    p.add_argument("--banner", default=None)
    p.add_argument("--logo-aiquaa", default=None)
    p.add_argument("--logo-postman", default=None)
    p.add_argument("--repo-url", default="")
    p.add_argument("--api-version", default="")
    p.add_argument("--author", default="")
    p.add_argument("--run-url", default="")
    return p.parse_args()


def load_results(path):
    if not os.path.exists(path):
        print(f"ERROR: no se encontró el reporte de Cucumber: {path}", file=sys.stderr)
        sys.exit(1)
    with open(path, "r", encoding="utf-8") as f:
        content = f.read().strip()
    if not content:
        print(f"ERROR: el reporte está vacío: {path}", file=sys.stderr)
        sys.exit(1)
    return json.loads(content)


def safe_image(path, width, max_height=None):
    """Imagen escalada respetando aspect ratio; None si no existe o falla."""
    if not path or not os.path.exists(path):
        return None
    try:
        from PIL import Image as PILImage

        with PILImage.open(path) as im:
            iw, ih = im.size
        height = width * ih / iw
        if max_height and height > max_height:
            height = max_height
            width = height * iw / ih
        return Image(path, width=width, height=height)
    except Exception:
        return None


def image_from_base64(data, width, max_height):
    """Imagen a partir de un attachment base64 de Cucumber."""
    try:
        raw = base64.b64decode(data)
        from PIL import Image as PILImage

        with PILImage.open(io.BytesIO(raw)) as im:
            iw, ih = im.size
        height = width * ih / iw
        if height > max_height:
            height = max_height
            width = height * iw / ih
        return Image(io.BytesIO(raw), width=width, height=height)
    except Exception:
        return None


def fmt_seconds(ns):
    # cucumber-js informa duration en nanosegundos
    try:
        return f"{ns / 1e9:.2f} s"
    except Exception:
        return "N/D"


def collect(data):
    """Aplana features -> escenarios con su estado calculado."""
    scenarios = []
    for feature in data:
        for el in feature.get("elements", []):
            if el.get("type") == "background":
                continue
            raw_steps = el.get("steps", []) or []
            # En versiones nuevas de cucumber-js los hooks (Before/After) vienen
            # dentro de "steps" con hidden=true; en las viejas, en before/after.
            steps = [x for x in raw_steps if not x.get("hidden")]
            hooks = (
                (el.get("before", []) or [])
                + (el.get("after", []) or [])
                + [x for x in raw_steps if x.get("hidden")]
            )

            statuses = [s.get("result", {}).get("status", "undefined") for s in steps]
            statuses += [h.get("result", {}).get("status", "undefined") for h in hooks]

            if any(s == "failed" for s in statuses):
                status = "failed"
            elif any(s in ("undefined", "pending", "ambiguous") for s in statuses):
                status = "pending"
            elif steps and all(s == "skipped" for s in [x.get("result", {}).get("status") for x in steps]):
                status = "skipped"
            else:
                status = "passed"

            duration = sum(
                x.get("result", {}).get("duration", 0) or 0 for x in steps + hooks
            )

            screenshots = []
            for h in hooks:
                for emb in h.get("embeddings", []) or []:
                    if str(emb.get("mime_type", "")).startswith("image/"):
                        screenshots.append(emb.get("data"))

            scenarios.append(
                {
                    "feature": feature.get("name", ""),
                    "name": el.get("name", ""),
                    "tags": [t.get("name", "") for t in el.get("tags", [])],
                    "status": status,
                    "steps": steps,
                    "duration": duration,
                    "screenshots": screenshots,
                }
            )
    return scenarios


def status_label(status):
    return {
        "passed": "OK",
        "failed": "FALLÓ",
        "skipped": "OMITIDO",
        "pending": "PENDIENTE",
        "undefined": "SIN STEP",
        "ambiguous": "AMBIGUO",
    }.get(status, status.upper())


def status_color(status):
    return {"passed": GREEN, "failed": RED}.get(status, AMBER)


def main():
    args = parse_args()
    data = load_results(args.results)
    scenarios = collect(data)

    os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)

    total = len(scenarios)
    passed = sum(1 for s in scenarios if s["status"] == "passed")
    failed = sum(1 for s in scenarios if s["status"] == "failed")
    other = total - passed - failed
    total_steps = sum(len(s["steps"]) for s in scenarios)
    passed_steps = sum(
        1
        for s in scenarios
        for st in s["steps"]
        if st.get("result", {}).get("status") == "passed"
    )
    total_duration = sum(s["duration"] for s in scenarios)
    overall_ok = total > 0 and failed == 0 and other == 0

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("T", parent=styles["Title"], alignment=TA_CENTER, fontSize=22, spaceAfter=8)
    subtitle_style = ParagraphStyle("S", parent=styles["Normal"], alignment=TA_CENTER, fontSize=12, textColor=GREY)
    h2 = ParagraphStyle("H2", parent=styles["Heading2"], spaceBefore=12, spaceAfter=8)
    body = ParagraphStyle("B", parent=styles["Normal"], alignment=TA_LEFT, fontSize=10, leading=14)
    small = ParagraphStyle("Sm", parent=styles["Normal"], fontSize=9, leading=12, textColor=GREY)
    mono = ParagraphStyle("M", parent=styles["Normal"], fontName="Courier", fontSize=8, leading=10, textColor=RED)

    doc = SimpleDocTemplate(
        args.output,
        pagesize=A4,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
        leftMargin=1.8 * cm,
        rightMargin=1.8 * cm,
        title=args.title,
    )
    story = []

    # ---- Portada ----
    banner = safe_image(args.banner, width=16.5 * cm, max_height=7 * cm)
    if banner:
        story.append(banner)
        story.append(Spacer(1, 0.6 * cm))
    story.append(Paragraph("Informe de pruebas BDD (Cucumber + Playwright)", title_style))
    story.append(Paragraph(escape(args.title), subtitle_style))
    story.append(Spacer(1, 0.4 * cm))

    logo_a = safe_image(args.logo_aiquaa, width=2.5 * cm, max_height=2.5 * cm)
    logo_p = safe_image(args.logo_postman, width=2.5 * cm, max_height=2.5 * cm)
    if logo_a or logo_p:
        t = Table([[logo_a or "", logo_p or ""]], colWidths=[8.5 * cm, 8.5 * cm])
        t.setStyle(TableStyle([("ALIGN", (0, 0), (-1, -1), "CENTER"), ("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
        story.append(t)
        story.append(Spacer(1, 0.6 * cm))

    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    for line in [
        f"Generado: {generated_at}",
        f"Autor / disparado por: {args.author or 'N/D'}",
        f"Versión / commit: {args.api_version or 'N/D'}",
        f"Repositorio: {args.repo_url or 'N/D'}",
        f"Run: {args.run_url or 'N/D'}",
    ]:
        story.append(Paragraph(escape(line), small))
    story.append(Spacer(1, 0.6 * cm))
    story.append(HRFlowable(width="100%", color=colors.lightgrey))
    story.append(PageBreak())

    # ---- Resumen ----
    story.append(Paragraph("Resumen de la ejecución", h2))
    verdict_color = GREEN if overall_ok else RED
    verdict = "SUITE VERDE — TODOS LOS ESCENARIOS PASARON" if overall_ok else "SUITE CON FALLAS"
    story.append(
        Paragraph(
            verdict,
            ParagraphStyle("V", parent=styles["Heading2"], textColor=verdict_color, alignment=TA_CENTER),
        )
    )
    story.append(Spacer(1, 0.3 * cm))

    summary = Table(
        [
            ["Métrica", "Valor"],
            ["Escenarios totales", str(total)],
            ["Escenarios OK", str(passed)],
            ["Escenarios fallidos", str(failed)],
            ["Escenarios omitidos / pendientes", str(other)],
            ["Steps OK / totales", f"{passed_steps} / {total_steps}"],
            ["Duración total", fmt_seconds(total_duration)],
        ],
        colWidths=[8 * cm, 8 * cm],
    )
    summary.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f0f0f0")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(summary)
    story.append(Spacer(1, 0.7 * cm))

    # ---- Tabla de escenarios ----
    story.append(Paragraph("Escenarios", h2))
    rows = [["#", "Escenario", "Tags", "Estado", "Tiempo"]]
    for i, s in enumerate(scenarios, start=1):
        rows.append(
            [
                str(i),
                Paragraph(escape(s["name"]), body),
                Paragraph(escape(" ".join(s["tags"])), small),
                Paragraph(
                    f'<font color="{status_color(s["status"]).hexval()}"><b>{status_label(s["status"])}</b></font>'.replace("0x", "#"),
                    body,
                ),
                fmt_seconds(s["duration"]),
            ]
        )
    sc_table = Table(rows, colWidths=[0.9 * cm, 7.2 * cm, 4 * cm, 2.4 * cm, 2.5 * cm], repeatRows=1)
    sc_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#121826")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(sc_table)

    # ---- Detalle por escenario ----
    story.append(PageBreak())
    story.append(Paragraph("Detalle de steps", h2))
    for i, s in enumerate(scenarios, start=1):
        block = []
        block.append(
            Paragraph(
                f'<b>{i}. {escape(s["name"])}</b> — '
                f'<font color="{status_color(s["status"]).hexval().replace("0x", "#")}">{status_label(s["status"])}</font>',
                body,
            )
        )
        step_rows = []
        for st in s["steps"]:
            res = st.get("result", {})
            stt = res.get("status", "undefined")
            step_rows.append(
                [
                    Paragraph(
                        f'<font color="{status_color(stt).hexval().replace("0x", "#")}"><b>{status_label(stt)}</b></font>',
                        small,
                    ),
                    Paragraph(escape(f'{st.get("keyword", "").strip()} {st.get("name", "")}'), body),
                    fmt_seconds(res.get("duration", 0) or 0),
                ]
            )
        if step_rows:
            t = Table(step_rows, colWidths=[2.2 * cm, 12 * cm, 2.6 * cm])
            t.setStyle(
                TableStyle(
                    [
                        ("FONTSIZE", (0, 0), (-1, -1), 9),
                        ("LINEBELOW", (0, 0), (-1, -1), 0.25, colors.lightgrey),
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("TOPPADDING", (0, 0), (-1, -1), 3),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                    ]
                )
            )
            block.append(t)

        # mensajes de error
        for st in s["steps"]:
            err = st.get("result", {}).get("error_message")
            if err:
                first_lines = "\n".join(str(err).splitlines()[:8])
                block.append(Spacer(1, 0.15 * cm))
                block.append(Paragraph(escape(first_lines).replace("\n", "<br/>"), mono))

        # captura (solo si falló, para no inflar el PDF)
        if s["status"] == "failed" and s["screenshots"]:
            img = image_from_base64(s["screenshots"][-1], width=12 * cm, max_height=7 * cm)
            if img:
                block.append(Spacer(1, 0.2 * cm))
                block.append(Paragraph("Captura al momento del fallo:", small))
                block.append(img)

        block.append(Spacer(1, 0.5 * cm))
        story.append(KeepTogether(block))

    doc.build(story)
    print(f"PDF generado en: {args.output}")
    print(f"Escenarios: {passed}/{total} OK, {failed} fallidos, {other} otros")


if __name__ == "__main__":
    main()
