#!/usr/bin/env python3
"""Informe PDF de la corrida Cucumber + Playwright - Grupo 09 (Leila).

Lee el JSON del formatter de cucumber-js y, opcionalmente, la clasificacion de
fallos de skills/playwright-ai-agents-skill (classify-failures.mjs). Arma un
PDF con portada, resumen, detalle de pasos por escenario y las capturas que
los hooks adjuntan como evidencia.

Uso:
  python reporter/grupo09-leila/bdd_report.py \
    --results results/grupo09-leila/cucumber-report.json \
    --classification results/grupo09-leila/CLASIF_BDD_GRUPO09_LEILA.json \
    --output results/grupo09-leila/INFORME_BDD_GRUPO09_LEILA.pdf
"""

import argparse
import base64
import io
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (Image, KeepTogether, PageBreak, Paragraph,
                                SimpleDocTemplate, Spacer, Table, TableStyle)

PRIMARY = colors.HexColor("#1F3A5F")
STATUS_COLORS = {
    "passed": colors.HexColor("#2E7D32"),
    "failed": colors.HexColor("#C62828"),
    "skipped": colors.HexColor("#757575"),
    "undefined": colors.HexColor("#EF6C00"),
    "pending": colors.HexColor("#EF6C00"),
    "ambiguous": colors.HexColor("#EF6C00"),
}

styles = getSampleStyleSheet()
H1 = ParagraphStyle("H1", parent=styles["Title"], textColor=PRIMARY)
H2 = ParagraphStyle("H2", parent=styles["Heading2"], textColor=PRIMARY)
BODY = ParagraphStyle("Body", parent=styles["BodyText"], fontSize=9, leading=12)
SMALL = ParagraphStyle("Small", parent=BODY, fontSize=8, leading=10)


def scenario_status(steps):
    statuses = [s.get("result", {}).get("status", "unknown") for s in steps]
    for bad in ("failed", "ambiguous", "undefined", "pending"):
        if bad in statuses:
            return bad
    if statuses and all(st == "skipped" for st in statuses):
        return "skipped"
    return "passed"


def load_scenarios(features):
    scenarios = []
    for feature in features:
        background = []
        for el in feature.get("elements", []):
            if el.get("type") == "background":
                # cucumber-js emite el Antecedentes como elemento aparte, justo
                # antes de cada escenario: lo sumamos al escenario siguiente.
                background = el.get("steps", [])
                continue
            steps = background + el.get("steps", [])
            background = []
            visible = [s for s in steps if not s.get("hidden")]
            images = []
            for s in steps:
                for emb in s.get("embeddings", []) or []:
                    if emb.get("mime_type", "").startswith("image/"):
                        images.append(emb["data"])
            duration_ns = sum(s.get("result", {}).get("duration", 0) or 0 for s in steps)
            scenarios.append({
                "feature": feature.get("name", ""),
                "name": el.get("name", ""),
                "tags": [t["name"] for t in el.get("tags", [])],
                "steps": visible,
                "status": scenario_status(visible),
                "images": images,
                "seconds": duration_ns / 1e9,
            })
    return scenarios


def status_cell(status):
    color = STATUS_COLORS.get(status, colors.black)
    return Paragraph(f'<font color="{color.hexval()}"><b>{escape(status.upper())}</b></font>', SMALL)


def table(data, widths, header=True):
    t = Table(data, colWidths=widths, repeatRows=1 if header else 0)
    style = [
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#B0BEC5")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
    ]
    if header:
        style += [("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
                  ("TEXTCOLOR", (0, 0), (-1, 0), colors.white)]
    t.setStyle(TableStyle(style))
    return t


def build(args):
    features = json.loads(Path(args.results).read_text(encoding="utf-8"))
    scenarios = load_scenarios(features)
    counts = Counter(s["status"] for s in scenarios)
    classification = {}
    if args.classification and Path(args.classification).exists():
        data = json.loads(Path(args.classification).read_text(encoding="utf-8"))
        for item in data.get("failures", data.get("results", [])) or []:
            key = item.get("title") or item.get("name") or item.get("scenario")
            if key:
                classification[key.split(" › ")[-1]] = item.get("category", "")

    story = [
        Paragraph(escape(args.title), H1),
        Paragraph(escape(args.grupo), H2),
        Spacer(1, 4 * mm),
        table([
            ["Campo", "Valor"],
            ["Aplicacion", args.app_url],
            ["Autor / ejecutor", args.author],
            ["Repositorio", args.repo_url],
            ["Ejecucion", args.run_url or "-"],
            ["Version (commit)", args.version or "-"],
            ["Fecha (UTC)", datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")],
        ], [45 * mm, 125 * mm]),
        Spacer(1, 6 * mm),
        Paragraph("Resumen", H2),
        table([
            ["Escenarios", "Pasaron", "Fallaron", "Otros"],
            [str(len(scenarios)), str(counts.get("passed", 0)), str(counts.get("failed", 0)),
             str(len(scenarios) - counts.get("passed", 0) - counts.get("failed", 0))],
        ], [42 * mm] * 4),
        Spacer(1, 4 * mm),
    ]

    rows = [["#", "Escenario", "Tags", "Estado", "Seg.", "Clasificacion"]]
    for i, sc in enumerate(scenarios, 1):
        rows.append([str(i), Paragraph(escape(sc["name"]), SMALL),
                     Paragraph(escape(" ".join(sc["tags"])), SMALL),
                     status_cell(sc["status"]), f'{sc["seconds"]:.1f}',
                     Paragraph(escape(classification.get(sc["name"], "-")), SMALL)])
    story.append(table(rows, [8 * mm, 57 * mm, 40 * mm, 25 * mm, 12 * mm, 28 * mm]))

    for i, sc in enumerate(scenarios, 1):
        story.append(PageBreak())
        story.append(Paragraph(f'{i}. {escape(sc["name"])}', H2))
        story.append(Paragraph(f'<b>Feature:</b> {escape(sc["feature"])} &nbsp; '
                               f'<b>Tags:</b> {escape(" ".join(sc["tags"]))}', BODY))
        story.append(Spacer(1, 3 * mm))
        step_rows = [["Paso", "Estado", "ms"]]
        for st in sc["steps"]:
            res = st.get("result", {})
            text = f'<b>{escape(st.get("keyword", "").strip())}</b> {escape(st.get("name", ""))}'
            if res.get("error_message"):
                text += f'<br/><font color="#C62828">{escape(res["error_message"][:600])}</font>'
            step_rows.append([Paragraph(text, SMALL), status_cell(res.get("status", "?")),
                              f'{(res.get("duration", 0) or 0) / 1e6:.0f}'])
        story.append(table(step_rows, [130 * mm, 25 * mm, 17 * mm]))
        for img_b64 in sc["images"][:2]:
            raw = base64.b64decode(img_b64)
            img = Image(io.BytesIO(raw))
            ratio = img.imageHeight / float(img.imageWidth)
            width = 165 * mm
            height = min(width * ratio, 200 * mm)
            img.drawWidth, img.drawHeight = height / ratio, height
            story.append(Spacer(1, 3 * mm))
            story.append(KeepTogether([Paragraph("Evidencia (captura al finalizar el escenario)", SMALL), img]))

    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(args.output, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm,
                            topMargin=16 * mm, bottomMargin=16 * mm, title=args.title)
    doc.build(story)
    print(f"Informe generado: {args.output} ({len(scenarios)} escenarios, {dict(counts)})")


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--results", required=True)
    p.add_argument("--output", required=True)
    p.add_argument("--classification")
    p.add_argument("--title", default="Informe BDD - Cucumber + Playwright")
    p.add_argument("--grupo", default="Grupo 09 - Reportes y Dashboard (Leila Ruiz) - Control de acceso por rol")
    p.add_argument("--app-url", default="https://aiquaa-sandbox-web.vercel.app")
    p.add_argument("--author", default="-")
    p.add_argument("--repo-url", default="-")
    p.add_argument("--run-url", default="")
    p.add_argument("--version", default="")
    build(p.parse_args())


if __name__ == "__main__":
    main()
