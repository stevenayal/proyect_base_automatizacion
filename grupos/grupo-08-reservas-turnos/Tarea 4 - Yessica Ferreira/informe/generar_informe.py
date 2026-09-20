import pandas as pd
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

JTL = BASE_DIR / "resultados" / "prueba_rate_limit.jtl"
PDF = Path("newman") / "Informe_Prueba_Rendimiento.pdf"


df = pd.read_csv(JTL)

total = len(df)
exitosas = int(df["success"].sum())
fallidas = total - exitosas

promedio = df["elapsed"].mean()
minimo = df["elapsed"].min()
maximo = df["elapsed"].max()

porcentaje_exito = (exitosas / total * 100) if total else 0
porcentaje_fallo = (fallidas / total * 100) if total else 0

doc = SimpleDocTemplate(PDF, pagesize=A4)
styles = getSampleStyleSheet()

contenido = []

contenido.append(Paragraph(
    "Informe de Prueba de Rendimiento - JMeter",
    styles["Title"]
))

contenido.append(Spacer(1, 15))

contenido.append(Paragraph(
    "Prueba ejecutada sobre los endpoints de creación y consulta de reservas.",
    styles["BodyText"]
))

contenido.append(Spacer(1, 15))

datos = [
    ["Métrica", "Resultado"],
    ["Total de solicitudes", str(total)],
    ["Solicitudes exitosas", str(exitosas)],
    ["Solicitudes fallidas", str(fallidas)],
    ["Porcentaje de éxito", f"{porcentaje_exito:.2f}%"],
    ["Porcentaje de error", f"{porcentaje_fallo:.2f}%"],
    ["Tiempo promedio", f"{promedio:.2f} ms"],
    ["Tiempo mínimo", f"{minimo:.2f} ms"],
    ["Tiempo máximo", f"{maximo:.2f} ms"],
]

tabla = Table(datos, colWidths=[250, 200])

tabla.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("GRID", (0, 0), (-1, -1), 1, colors.black),
    ("ALIGN", (1, 1), (-1, -1), "CENTER"),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
]))

contenido.append(tabla)

contenido.append(Spacer(1, 20))

contenido.append(Paragraph(
    "Observación:",
    styles["Heading2"]
))

contenido.append(Paragraph(
    "Durante la ejecución se registraron respuestas exitosas y errores "
    "asociados al límite de solicitudes del servicio (RATE_LIMITED). "
    "El resultado debe interpretarse considerando la restricción de "
    "máximo 30 solicitudes por minuto indicada por el servicio.",
    styles["BodyText"]
))

doc.build(contenido)

print("Informe generado correctamente:")
print(PDF)