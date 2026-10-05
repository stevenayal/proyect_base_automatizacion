import json
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.enums import TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak
)

# ==========================================================
# RUTAS
# ==========================================================

# Raíz del proyecto:
# project_base_automatizacion
PROJECT_ROOT = Path(__file__).resolve().parents[4]

# Resultado generado por Newman
RESULTS_JSON = PROJECT_ROOT / "newman" / "results.json"

# PDF que vamos a generar dentro de mi TAREA 4
PDF_OUTPUT = Path(__file__).resolve().parent / "Informe_Postman_Newman_Salma_Gimenez.pdf"


# ==========================================================
# VALIDAR ARCHIVO DE NEWMAN
# ==========================================================

if not RESULTS_JSON.exists():
    raise FileNotFoundError(
        f"No se encontró el archivo de resultados de Newman:\n{RESULTS_JSON}"
    )

with open(RESULTS_JSON, "r", encoding="utf-8") as archivo:
    data = json.load(archivo)


# ==========================================================
# OBTENER INFORMACIÓN GENERAL
# ==========================================================

run = data.get("run", {})
stats = run.get("stats", {})
executions = run.get("executions", [])


def obtener_estadistica(nombre):
    valor = stats.get(nombre, {})
    return valor.get("total", 0), valor.get("failed", 0)


requests_total, requests_failed = obtener_estadistica("requests")
tests_total, tests_failed = obtener_estadistica("assertions")
scripts_total, scripts_failed = obtener_estadistica("testScripts")
prerequest_total, prerequest_failed = obtener_estadistica("prerequestScripts")

requests_ok = requests_total - requests_failed
tests_ok = tests_total - tests_failed

porcentaje_exito = (
    (tests_ok / tests_total) * 100
    if tests_total > 0
    else 0
)


# ==========================================================
# ESTILOS
# ==========================================================

styles = getSampleStyleSheet()

styles["Title"].alignment = TA_CENTER

titulo = styles["Title"]
subtitulo = styles["Heading2"]
texto = styles["BodyText"]


# ==========================================================
# CREAR PDF
# ==========================================================

doc = SimpleDocTemplate(
    str(PDF_OUTPUT),
    pagesize=A4,
    rightMargin=40,
    leftMargin=40,
    topMargin=40,
    bottomMargin=40
)

contenido = []


# ==========================================================
# PORTADA
# ==========================================================

contenido.append(
    Paragraph(
        "Informe de Ejecución de Pruebas Automatizadas",
        titulo
    )
)

contenido.append(Spacer(1, 15))

contenido.append(
    Paragraph(
        "Postman + Newman",
        subtitulo
    )
)

contenido.append(Spacer(1, 20))

contenido.append(
    Paragraph(
        "<b>Grupo:</b> Grupo 08 - Reservas / Turnos",
        texto
    )
)

contenido.append(
    Paragraph(
        "<b>Alumno:</b> Salma Gimenez",
        texto
    )
)

contenido.append(
    Paragraph(
        "<b>Herramienta:</b> Postman / Newman",
        texto
    )
)

contenido.append(Spacer(1, 25))

contenido.append(
    Paragraph(
        "El presente informe contiene los resultados obtenidos durante "
        "la ejecución automatizada de la colección de pruebas de Reservas / Turnos "
        "mediante Newman.",
        texto
    )
)

contenido.append(PageBreak())


# ==========================================================
# RESUMEN DE EJECUCIÓN
# ==========================================================

contenido.append(
    Paragraph(
        "Resumen de ejecución",
        subtitulo
    )
)

contenido.append(Spacer(1, 10))

datos_resumen = [
    ["Métrica", "Ejecutadas", "Fallidas"],
    ["Requests", str(requests_total), str(requests_failed)],
    ["Test Scripts", str(scripts_total), str(scripts_failed)],
    ["Pre-request Scripts", str(prerequest_total), str(prerequest_failed)],
    ["Assertions", str(tests_total), str(tests_failed)],
]

tabla_resumen = Table(
    datos_resumen,
    colWidths=[220, 100, 100]
)

tabla_resumen.setStyle(
    TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#333333")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ALIGN", (1, 1), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
    ])
)

contenido.append(tabla_resumen)

contenido.append(Spacer(1, 20))

contenido.append(
    Paragraph(
        f"<b>Assertions exitosas:</b> {tests_ok}",
        texto
    )
)

contenido.append(
    Paragraph(
        f"<b>Assertions fallidas:</b> {tests_failed}",
        texto
    )
)

contenido.append(
    Paragraph(
        f"<b>Porcentaje de éxito:</b> {porcentaje_exito:.2f}%",
        texto
    )
)

contenido.append(Spacer(1, 25))


# ==========================================================
# DETALLE DE REQUESTS
# ==========================================================

contenido.append(
    Paragraph(
        "Detalle de las pruebas ejecutadas",
        subtitulo
    )
)

contenido.append(Spacer(1, 10))

for execution in executions:

    item = execution.get("item", {})
    request = execution.get("request", {})
    response = execution.get("response", {})

    nombre = item.get("name", "Sin nombre")

    metodo = request.get("method", "N/A")

    codigo = response.get("code", "N/A")
    tiempo = response.get("responseTime", "N/A")

    contenido.append(
        Paragraph(
            f"<b>{nombre}</b>",
            texto
        )
    )

    detalle_request = [
        ["Método", metodo],
        ["Status Code", str(codigo)],
        ["Tiempo de respuesta", f"{tiempo} ms"],
    ]

    tabla_request = Table(
        detalle_request,
        colWidths=[180, 250]
    )

    tabla_request.setStyle(
        TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("BACKGROUND", (0, 0), (0, -1), colors.lightgrey),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
        ])
    )

    contenido.append(tabla_request)

    contenido.append(Spacer(1, 8))

    assertions = execution.get("assertions", [])

    if assertions:

        datos_assertions = [
            ["Assertion", "Resultado"]
        ]

        for assertion in assertions:

            nombre_assertion = assertion.get(
                "assertion",
                "Sin nombre"
            )

            error = assertion.get("error")

            resultado = (
                "FALLÓ"
                if error
                else "OK"
            )

            datos_assertions.append([
                nombre_assertion,
                resultado
            ])

        tabla_assertions = Table(
            datos_assertions,
            colWidths=[330, 100]
        )

        tabla_assertions.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#555555")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("ALIGN", (1, 1), (1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
            ])
        )

        contenido.append(tabla_assertions)

    contenido.append(Spacer(1, 20))


# ==========================================================
# CONCLUSIÓN
# ==========================================================

contenido.append(
    Paragraph(
        "Conclusión",
        subtitulo
    )
)

contenido.append(Spacer(1, 10))

if tests_failed == 0:

    conclusion = (
        f"La ejecución automatizada finalizó correctamente. "
        f"Se ejecutaron {requests_total} requests y "
        f"{tests_total} assertions, sin registrarse fallos. "
        f"El porcentaje de éxito obtenido fue del {porcentaje_exito:.2f}%."
    )

else:

    conclusion = (
        f"La ejecución automatizada finalizó con {tests_failed} "
        f"assertions fallidas de un total de {tests_total}. "
        f"El porcentaje de éxito obtenido fue del {porcentaje_exito:.2f}%."
    )

contenido.append(
    Paragraph(
        conclusion,
        texto
    )
)


# ==========================================================
# GENERAR PDF
# ==========================================================

doc.build(contenido)

print("")
print("==============================================")
print("INFORME GENERADO CORRECTAMENTE")
print("==============================================")
print(PDF_OUTPUT)