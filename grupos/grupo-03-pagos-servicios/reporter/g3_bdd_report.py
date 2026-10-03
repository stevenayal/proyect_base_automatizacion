"""
g3_bdd_report.py — Informe PDF de Cucumber + Playwright del Grupo 03 (Pagos de Servicios).

Basado en skills/bdd-skill/reporter/bdd_report.py (misma paleta, portada, resumen, veredicto
y matriz de trazabilidad), con lo que necesita este grupo:
  - trazabilidad por requerimiento (@RF-G3-0X) y por comentario "# criterio:" del .feature
    (se leen del propio .feature: el JSON de cucumber-js no trae los comentarios);
  - evidencia de cada escenario, también de los exitosos: las llamadas a la API que hizo
    (método, ruta, status, tiempo y respuesta resumida);
  - en los escenarios @web: la captura de /facturas y la tabla API vs web.

Uso:
    python g3_bdd_report.py --results test-results/grupo-03-bdd/cucumber-report.json
    python g3_bdd_report.py --results .../cucumber-report.json --run-info .../run-info.json \\
        --output INFORME_BDD_GRUPO03_PAGOS_SERVICIOS.pdf --perfil g3-completa \\
        --author "Grupo 03" --repo-url https://github.com/org/repo --run-url https://github.com/...

Requiere: reportlab, Pillow.
"""

import argparse
import base64
import io
import json
import os
import re
from collections import OrderedDict
from datetime import datetime
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    Image, KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)

# ─── Paleta (misma familia que bdd_report.py / playwright_report.py) ──────────
WHITE = colors.HexColor("#FFFFFF")
NAVY = colors.HexColor("#0D1B40")
GRAY_DARK = colors.HexColor("#1A1A1A")
GRAY_MID = colors.HexColor("#4A4A4A")
GRAY_LIGHT = colors.HexColor("#F5F5F5")
GRAY_BORDER = colors.HexColor("#DDDDDD")
GREEN_PASS = colors.HexColor("#16A34A")
RED_FAIL = colors.HexColor("#DC2626")
AMBER_WARN = colors.HexColor("#D97706")
BLUE_INFO = colors.HexColor("#2563EB")
GREEN_BG = colors.HexColor("#F0FDF4")
RED_BG = colors.HexColor("#FEF2F2")
AMBER_BG = colors.HexColor("#FFFBEB")

PAGE_W, PAGE_H = A4
MARGIN = 16 * mm
ANCHO = PAGE_W - 2 * MARGIN

STATUS_COLOR = {"passed": GREEN_PASS, "failed": RED_FAIL, "pending": AMBER_WARN,
                "undefined": AMBER_WARN, "ambiguous": RED_FAIL, "skipped": GRAY_MID}
STATUS_TXT = {"passed": "PASS", "failed": "FAIL", "pending": "PEND", "undefined": "UNDEF",
              "ambiguous": "AMBIG", "skipped": "SKIP"}

RF_NOMBRES = OrderedDict([
    ("@RF-G3-01", "Listar facturas"),
    ("@RF-G3-02", "Consultar una factura"),
    ("@RF-G3-03", "Pagar una factura"),
    ("@RF-G3-04", "Crear una factura"),
    ("@RF-G3-05", "Reemplazar una factura"),
    ("@RF-G3-06", "Dar de baja una factura"),
    ("@RF-transversal", "Reglas transversales"),
])


def styles():
    return {
        "title": ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=21, textColor=WHITE,
                                alignment=TA_CENTER, leading=26),
        "subtitle": ParagraphStyle("subtitle", fontName="Helvetica", fontSize=11.5, textColor=WHITE,
                                   alignment=TA_CENTER, leading=15),
        "h1": ParagraphStyle("h1", fontName="Helvetica-Bold", fontSize=14, textColor=NAVY,
                             spaceBefore=10, spaceAfter=6),
        "h2": ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=10, textColor=GRAY_DARK,
                             spaceBefore=6, spaceAfter=3),
        "body": ParagraphStyle("body", fontName="Helvetica", fontSize=8.8, textColor=GRAY_DARK,
                               leading=11.5, alignment=TA_LEFT),
        "small": ParagraphStyle("small", fontName="Helvetica", fontSize=7.6, textColor=GRAY_MID, leading=10),
        "mono": ParagraphStyle("mono", fontName="Courier", fontSize=7, textColor=GRAY_DARK, leading=8.6),
        "cell": ParagraphStyle("cell", fontName="Helvetica", fontSize=7.6, textColor=GRAY_DARK, leading=9.4),
        "cellb": ParagraphStyle("cellb", fontName="Helvetica-Bold", fontSize=7.6, textColor=GRAY_DARK, leading=9.4),
    }


ST = styles()


def P(texto, estilo="body"):
    return Paragraph(escape(str(texto)).replace("\n", "<br/>"), ST[estilo] if isinstance(estilo, str) else estilo)


def tabla(filas, anchos, cabecera=True, estilos=()):
    t = Table(filas, colWidths=anchos, repeatRows=1 if cabecera else 0)
    base = [
        ("GRID", (0, 0), (-1, -1), 0.4, GRAY_BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]
    if cabecera:
        base += [("BACKGROUND", (0, 0), (-1, 0), GRAY_LIGHT), ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold")]
    t.setStyle(TableStyle(base + list(estilos)))
    return t


# ─── Lectura del .feature (criterios) y del JSON de cucumber ──────────────────

def criterios_del_feature(ruta):
    """{nombre de escenario: criterio} desde los comentarios '# criterio:' previos a cada Scenario."""
    out = {}
    if not ruta or not os.path.isfile(ruta):
        return out
    bloque = []
    with open(ruta, encoding="utf-8") as fh:
        for linea in fh:
            s = linea.strip()
            if s.startswith("#"):
                texto = s.lstrip("#").strip()
                if texto.startswith("criterio:"):
                    bloque = [texto[len("criterio:"):].strip()]
                elif bloque:
                    bloque.append(texto)
                continue
            m = re.match(r"(Scenario Outline|Scenario):\s*(.+)$", s)
            if m:
                if bloque:
                    out[m.group(2).strip()] = " ".join(bloque)
                bloque = []
            elif s and not s.startswith("@"):
                bloque = []
    return out


def decodificar(emb):
    """Devuelve (mime, bytes). cucumber-js guarda los adjuntos en base64."""
    mime = emb.get("mime_type") or emb.get("media", {}).get("type") or "text/plain"
    data = emb.get("data", "")
    if mime.startswith("image/"):
        return mime, base64.b64decode(data)
    try:
        crudo = base64.b64decode(data, validate=True)
        crudo.decode("utf-8")
        if mime == "application/json":
            json.loads(crudo)
        return mime, crudo
    except Exception:
        return mime, data.encode("utf-8")


def estado_escenario(pasos):
    estados = [p.get("result", {}).get("status", "skipped") for p in pasos]
    for e in ("failed", "ambiguous", "undefined", "pending"):
        if e in estados:
            return e
    if estados and all(e == "skipped" for e in estados):
        return "skipped"
    return "passed"


def leer_resultados(ruta, feature_override=None):
    with open(ruta, encoding="utf-8") as fh:
        raw = json.load(fh)
    escenarios = []
    for feat in raw:
        uri = feature_override or feat.get("uri", "")
        criterios = criterios_del_feature(uri)
        for el in feat.get("elements", []):
            if el.get("type", "scenario") != "scenario":
                continue
            pasos = el.get("steps", [])
            tags = [t.get("name") for t in el.get("tags", [])]
            adjuntos = []
            for p in pasos:
                for emb in p.get("embeddings", []) or []:
                    adjuntos.append(decodificar(emb))
            api, web, capturas, logs = None, None, [], []
            for mime, crudo in adjuntos:
                if mime.startswith("image/"):
                    capturas.append(crudo)
                elif mime == "application/json":
                    try:
                        j = json.loads(crudo)
                    except Exception:
                        continue
                    if j.get("tipo") == "llamadas-api":
                        api = j
                    elif j.get("tipo") == "comparacion-api-web":
                        web = j
                else:
                    logs.append(crudo.decode("utf-8", "replace"))
            fallido = next((p for p in pasos if p.get("result", {}).get("status") in ("failed", "ambiguous")), None)
            escenarios.append({
                "nombre": el.get("name", ""),
                "linea": el.get("line"),
                "tags": tags,
                "rf": [t for t in tags if t in RF_NOMBRES],
                "web": "@web" in tags,
                "criterio": criterios.get(el.get("name", "").strip()),
                "estado": estado_escenario(pasos),
                "pasos": [p for p in pasos if not p.get("hidden")],
                "fallido": fallido,
                "api": api,
                "comparacion": web,
                "capturas": capturas,
                "logs": logs,
                "duracion_s": sum((p.get("result", {}).get("duration") or 0) for p in pasos) / 1e9,
            })
    return escenarios


def veredicto(totales):
    if totales["failed"] or totales.get("ambiguous"):
        return "CRITERIOS NO CUMPLIDOS", RED_FAIL, RED_BG
    if totales["undefined"] or totales["pending"]:
        return "PARCIAL — HAY PASOS SIN IMPLEMENTAR", AMBER_WARN, AMBER_BG
    if totales["escenarios"] == 0:
        return "SIN ESCENARIOS EJECUTADOS", AMBER_WARN, AMBER_BG
    return "CRITERIOS CUMPLIDOS", GREEN_PASS, GREEN_BG


# ─── Bloques del PDF ──────────────────────────────────────────────────────────

def imagen(crudo, ancho_max, alto_max):
    """Imagen escalada; si es muy alta (listado de 100 filas) se recorta la parte superior."""
    from PIL import Image as PILImage
    img = PILImage.open(io.BytesIO(crudo))
    w, h = img.size
    proporcion_max = alto_max / ancho_max
    if h / w > proporcion_max:
        img = img.crop((0, 0, w, int(w * proporcion_max)))
        w, h = img.size
    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="JPEG", quality=80)
    buf.seek(0)
    escala = min(ancho_max / w, alto_max / h)
    return Image(buf, width=w * escala, height=h * escala)


def bloque_api(api):
    if not api or not api.get("llamadas"):
        return [P("Sin llamadas a la API registradas.", "small")]
    filas = [[P("Etapa", "cellb"), P("Método y ruta", "cellb"), P("Status", "cellb"), P("ms", "cellb"), P("429", "cellb")]]
    for c in api["llamadas"]:
        filas.append([P(c.get("etiqueta") or "operación bajo prueba", "cell"), P(f'{c["metodo"]} {c["ruta"]}', "cell"),
                      P(c["status"], "cell"), P(c["ms"], "cell"), P(c.get("reintentos429") or "", "cell")])
    out = [tabla(filas, [32 * mm, 98 * mm, 14 * mm, 14 * mm, 10 * mm])]
    principal = [c for c in api["llamadas"] if not c.get("etiqueta")]
    if principal:
        c = principal[-1]
        detalle = {"enviado": c.get("enviado"), "recibido": c.get("recibido")}
        texto = json.dumps(detalle, ensure_ascii=False, indent=1)
        if len(texto) > 1500:
            texto = texto[:1500] + "\n…"
        out += [Spacer(1, 1.5 * mm), P(f'Respuesta de la API — {c["metodo"]} {c["ruta"]} → {c["status"]}', "small"),
                Paragraph(escape(texto).replace("\n", "<br/>").replace(" ", "&nbsp;"), ST["mono"])]
    return out


def bloque_web(comp, capturas):
    out = []
    if comp:
        filtros = ", ".join(f"{k}={v}" for k, v in (comp.get("filtros") or {}).items() if v not in (None, "")) or "sin filtros"
        color = GREEN_PASS if comp.get("coincide") else RED_FAIL
        out.append(Paragraph(
            f'<b>Verificación en la web</b> ({escape(comp.get("pagina", ""))}, filtros: {escape(filtros)}) — '
            f'API: {comp.get("cantidadApi")} facturas · web: {comp.get("cantidadWeb")} filas · contador: '
            f'"{escape(str(comp.get("contadorWeb")))}" · <font color="{color.hexval()}"><b>'
            f'{"COINCIDE" if comp.get("coincide") else "NO COINCIDE"}</b></font>', ST["body"]))
        exp = comp.get("expectativa")
        if exp:
            out.append(P("Esperado del escenario: factura %s %s%s%s" % (
                exp["id"], "visible" if exp.get("presente") else "NO visible (dada de baja)",
                f' en estado "{exp["estado"]}"' if exp.get("estado") else "",
                f' con monto {exp["monto"]}' if exp.get("monto") is not None else ""), "small"))
        filas = [[P("Factura", "cellb"), P("Campo", "cellb"), P("API", "cellb"), P("Web", "cellb"), P("", "cellb")]]
        estilos = []
        mostradas = 0
        for f in comp.get("filas", []):
            if not f.get("campos"):
                filas.append([P(f["id"], "cell"), P("presencia", "cell"), P("sí" if f.get("enApi") else "no", "cell"),
                              P("sí" if f.get("enWeb") else "no", "cell"), P("NO", "cellb")])
                estilos.append(("TEXTCOLOR", (4, len(filas) - 1), (4, len(filas) - 1), RED_FAIL))
                continue
            # Detalle completo para la factura del escenario; las demás, una línea.
            if f.get("delEscenario") or mostradas < 1:
                for nombre, c in f["campos"].items():
                    filas.append([P(f'{f["id"]}{" (escenario)" if f.get("delEscenario") else ""}', "cell"),
                                  P(nombre, "cell"), P(c["api"], "cell"), P(c["web"], "cell"),
                                  P("OK" if c["ok"] else "NO", "cellb")])
                    estilos.append(("TEXTCOLOR", (4, len(filas) - 1), (4, len(filas) - 1), GREEN_PASS if c["ok"] else RED_FAIL))
                mostradas += 1
            else:
                todos = all(c["ok"] for c in f["campos"].values())
                filas.append([P(f["id"], "cell"), P("6 campos", "cell"), P(f'{f["campos"]["proveedor"]["api"]} · {f["campos"]["monto"]["api"]} · {f["campos"]["estado"]["api"]}', "cell"),
                              P(f'{f["campos"]["proveedor"]["web"]} · {f["campos"]["monto"]["web"]} · {f["campos"]["estado"]["web"]}', "cell"),
                              P("OK" if todos else "NO", "cellb")])
                estilos.append(("TEXTCOLOR", (4, len(filas) - 1), (4, len(filas) - 1), GREEN_PASS if todos else RED_FAIL))
        if len(filas) > 1:
            out += [Spacer(1, 1.5 * mm), tabla(filas, [24 * mm, 20 * mm, 52 * mm, 60 * mm, 12 * mm], estilos=estilos)]
        if comp.get("filasOmitidas"):
            out.append(P(f'… y {comp["filasOmitidas"]} facturas más comparadas (no se listan).', "small"))
        for d in comp.get("diferencias", [])[:12]:
            out.append(Paragraph(f'<font color="{RED_FAIL.hexval()}">• {escape(d)}</font>', ST["small"]))
    for crudo in capturas[:2]:
        out += [Spacer(1, 2 * mm), imagen(crudo, ANCHO * 0.92, 95 * mm)]
    return out


def construir(salida, escenarios, info, args):
    totales = {"escenarios": len(escenarios), "passed": 0, "failed": 0, "undefined": 0, "pending": 0,
               "skipped": 0, "ambiguous": 0}
    for e in escenarios:
        totales[e["estado"]] = totales.get(e["estado"], 0) + 1

    doc = SimpleDocTemplate(salida, pagesize=A4, topMargin=MARGIN, bottomMargin=MARGIN,
                            leftMargin=MARGIN, rightMargin=MARGIN,
                            title="Informe BDD Grupo 03 - Pagos de Servicios", author=args.author or "Grupo 03")
    story = []

    # Portada
    portada = Table([[Paragraph("INFORME DE PRUEBAS BDD", ST["title"])],
                     [Paragraph("Cucumber + Playwright · API y web", ST["subtitle"])],
                     [Paragraph(escape(args.grupo), ST["subtitle"])]], colWidths=[ANCHO])
    portada.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), NAVY), ("TOPPADDING", (0, 0), (-1, -1), 12),
                                 ("BOTTOMPADDING", (0, 0), (-1, -1), 12)]))
    story += [portada, Spacer(1, 7 * mm)]

    titular = (info.get("titular") or {})
    meta = [
        ["Fecha", datetime.now().strftime("%Y-%m-%d %H:%M")],
        ["Suite", args.perfil or "no indicada"],
        ["API", info.get("apiUrl", "-")],
        ["Web", info.get("webUrl", "-") + "/facturas"],
        ["Titular de la corrida", f'usuario {titular.get("id")} ({titular.get("pendientes")} pendientes al inicio, {titular.get("origen")})'
            if titular else (info.get("errorTitular") or "-")],
        ["Ritmo y rate limit", f'{info.get("rpm", "-")} req/min · {info.get("peticiones", "-")} peticiones · '
                               f'{info.get("rechazos429", 0)} respuestas 429 reintentadas ({info.get("esperas429Seg", 0)} s de espera)'],
        ["Limpieza", f'{info.get("facturasLimpiadas", "-")} facturas creadas por la corrida dadas de baja al final'],
        ["Autor", args.author or "no proporcionado"],
        ["Repositorio", args.repo_url or "no proporcionado"],
        ["Ejecución", args.run_url or "local"],
    ]
    t = Table([[P(k, "cellb"), P(v, "cell")] for k, v in meta], colWidths=[42 * mm, ANCHO - 42 * mm])
    t.setStyle(TableStyle([("LINEBELOW", (0, 0), (-1, -1), 0.4, GRAY_BORDER), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
    story += [t, Spacer(1, 6 * mm)]

    # Resumen
    story.append(Paragraph("Resumen", ST["h1"]))
    filas = [["Estado", "Escenarios"]] + [[STATUS_TXT[k], str(totales[k])] for k in
                                         ("passed", "failed", "ambiguous", "undefined", "pending", "skipped") if totales.get(k)]
    story.append(tabla(filas, [50 * mm, 30 * mm]))
    story.append(Spacer(1, 4 * mm))

    por_rf = OrderedDict((rf, [0, 0]) for rf in RF_NOMBRES)
    for e in escenarios:
        for rf in e["rf"]:
            por_rf[rf][0] += 1
            por_rf[rf][1] += e["estado"] == "passed"
    filas = [["Requerimiento", "Descripción", "Escenarios", "Pasan"]]
    for rf, (n, ok) in por_rf.items():
        if n:
            filas.append([rf.lstrip("@"), RF_NOMBRES[rf], str(n), str(ok)])
    story.append(tabla(filas, [32 * mm, 70 * mm, 24 * mm, 20 * mm]))

    webs = [e for e in escenarios if e["web"]]
    if webs:
        coinciden = sum(1 for e in webs if e["comparacion"] and e["comparacion"].get("coincide"))
        story += [Spacer(1, 3 * mm), P(f"Verificación en la web: {len(webs)} escenarios @web, {coinciden} con la página "
                                       f"/facturas mostrando lo mismo que la API.")]

    texto, color, fondo = veredicto(totales)
    v = Table([[Paragraph(f"VEREDICTO: {texto}", ParagraphStyle("v", fontName="Helvetica-Bold", fontSize=12,
                                                                textColor=color, alignment=TA_CENTER))]], colWidths=[ANCHO])
    v.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), fondo), ("TOPPADDING", (0, 0), (-1, -1), 9),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 9)]))
    story += [Spacer(1, 5 * mm), v]

    # Matriz de trazabilidad
    story += [PageBreak(), Paragraph("Matriz de trazabilidad", ST["h1"]),
              P('Requerimiento → criterio de aceptación ("# criterio:" del .feature) → escenario → resultado. '
                'Web = el escenario además verifica la página /facturas.', "small"), Spacer(1, 2 * mm)]
    filas = [[P(x, "cellb") for x in ("RF", "Criterio", "Escenario", "Web", "Resultado")]]
    estilos = []
    for e in escenarios:
        filas.append([P(" ".join(r.replace("@RF-", "") for r in e["rf"]) or "-", "cell"), P(e["criterio"] or "-", "cell"),
                      P(e["nombre"], "cell"), P("sí" if e["web"] else "", "cell"), P(STATUS_TXT.get(e["estado"], e["estado"]), "cellb")])
        estilos.append(("TEXTCOLOR", (4, len(filas) - 1), (4, len(filas) - 1), STATUS_COLOR.get(e["estado"], GRAY_MID)))
    story.append(tabla(filas, [20 * mm, 66 * mm, 66 * mm, 10 * mm, 16 * mm], estilos=estilos))

    # Detalle con evidencias
    story += [PageBreak(), Paragraph("Detalle y evidencias por escenario", ST["h1"])]
    for i, e in enumerate(escenarios, 1):
        color = STATUS_COLOR.get(e["estado"], GRAY_MID)
        cab = [Paragraph(f'<font color="{color.hexval()}"><b>[{STATUS_TXT.get(e["estado"], e["estado"])}]</b></font> '
                         f'<b>{i}. {escape(e["nombre"])}</b>', ST["body"]),
               P(" ".join(e["tags"]) + f'  ·  {e["duracion_s"]:.1f} s', "small")]
        if e["criterio"]:
            cab.append(P("Criterio: " + e["criterio"], "small"))
        pasos = []
        for p in e["pasos"]:
            st = p.get("result", {}).get("status", "skipped")
            pasos.append(Paragraph(f'<font color="{STATUS_COLOR.get(st, GRAY_MID).hexval()}">{STATUS_TXT.get(st, st)}</font> '
                                   f'<b>{escape(p.get("keyword", "").strip())}</b> {escape(p.get("name", ""))}', ST["cell"]))
        bloque = cab + [Spacer(1, 1 * mm)] + pasos
        if e["fallido"]:
            msg = (e["fallido"].get("result", {}).get("error_message") or "")
            msg = "\n".join(l for l in msg.splitlines() if not l.strip().startswith("at "))[:900]
            donde = e["fallido"].get("name") or (
                "verificación en la web (hook After @web)" if e["comparacion"] and not e["comparacion"].get("coincide")
                else f'hook {e["fallido"].get("keyword", "")}')
            bloque += [Spacer(1, 1 * mm), P(f"Falló en: {donde}", "h2"),
                       Paragraph(escape(msg).replace("\n", "<br/>"), ST["mono"])]
        story.append(KeepTogether(bloque))
        story.append(Spacer(1, 1.5 * mm))
        story += bloque_api(e["api"])
        if e["web"]:
            story.append(Spacer(1, 1.5 * mm))
            story += bloque_web(e["comparacion"], e["capturas"])
        for log in e["logs"]:
            story.append(P(log, "small"))
        story.append(Spacer(1, 6 * mm))

    def pie(canvas, doc_):
        canvas.saveState()
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(GRAY_MID)
        canvas.drawString(MARGIN, 9 * mm, "Grupo 03 · Pagos de Servicios · Cucumber + Playwright · basado en skill bdd · aiquaa.com")
        canvas.drawRightString(PAGE_W - MARGIN, 9 * mm, f"Página {doc_.page}")
        canvas.restoreState()

    doc.build(story, onFirstPage=pie, onLaterPages=pie)
    return totales


def main():
    p = argparse.ArgumentParser(description="Informe PDF de Cucumber + Playwright del Grupo 03")
    p.add_argument("--results", required=True, help="JSON de cucumber-js (format json:...)")
    p.add_argument("--run-info", default=None, help="run-info.json que escribe hooks.ts (opcional)")
    p.add_argument("--feature", default=None, help="Ruta al .feature si el uri del JSON no es accesible desde acá")
    p.add_argument("--output", default=None)
    p.add_argument("--grupo", default="Grupo 03 — Pagos de Servicios")
    p.add_argument("--perfil", default=None, help="g3-completa / g3-web")
    p.add_argument("--author", default=None)
    p.add_argument("--repo-url", default=None)
    p.add_argument("--run-url", default=None)
    args = p.parse_args()

    run_info = args.run_info or os.path.join(os.path.dirname(args.results), "run-info.json")
    info = {}
    if os.path.isfile(run_info):
        with open(run_info, encoding="utf-8") as fh:
            info = json.load(fh)
    salida = args.output or os.path.join(os.path.dirname(args.results) or ".", "INFORME_BDD_GRUPO03_PAGOS_SERVICIOS.pdf")
    escenarios = leer_resultados(args.results, args.feature)
    totales = construir(salida, escenarios, info, args)
    print(f"PDF: {salida} · {totales['escenarios']} escenarios · {totales['passed']} passed · {totales['failed']} failed")


if __name__ == "__main__":
    main()
