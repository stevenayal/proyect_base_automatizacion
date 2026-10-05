"""evidencia_bdd_pdf.py - PDF de evidencias de los escenarios UI del Grupo 06.

Lee el reporte JSON de Cucumber (con las capturas que adjunta support/evidencia.hooks.ts)
y genera, por escenario, cada paso con su resultado y su captura de pantalla.

Uso:
  npx cucumber-js --profile grupo06 --tags "@grupo06"
  python grupos/grupo-06-notificaciones-alertas/scripts/evidencia_bdd_pdf.py \
      --results results/cucumber-report.json --output results/EVIDENCIA_BDD_GRUPO06.pdf
"""
import argparse
import base64
import io
import json
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.platypus import (Image, KeepTogether, PageBreak, Paragraph, SimpleDocTemplate,
                                Spacer, Table, TableStyle)

NAVY = colors.HexColor('#14213D')
INK = colors.HexColor('#1F2937')
MUTED = colors.HexColor('#6B7280')
LINE = colors.HexColor('#D1D5DB')
ESTADO = {
    'passed': ('PASÓ', colors.HexColor('#15803D')),
    'failed': ('FALLÓ', colors.HexColor('#B91C1C')),
    'skipped': ('OMITIDO', colors.HexColor('#6B7280')),
    'undefined': ('SIN DEFINIR', colors.HexColor('#B45309')),
    'pending': ('PENDIENTE', colors.HexColor('#B45309')),
}

H1 = ParagraphStyle('h1', fontName='Helvetica-Bold', fontSize=18, leading=22, textColor=NAVY, spaceAfter=4)
H2 = ParagraphStyle('h2', fontName='Helvetica-Bold', fontSize=13, leading=17, textColor=NAVY, spaceBefore=4, spaceAfter=2)
BODY = ParagraphStyle('body', fontName='Helvetica', fontSize=9.5, leading=13, textColor=INK)
SMALL = ParagraphStyle('small', parent=BODY, fontSize=8.5, leading=11, textColor=MUTED)
STEP = ParagraphStyle('step', parent=BODY, fontName='Helvetica-Bold', fontSize=9.5)


def esc(t):
    return str(t).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def estado_txt(status):
    label, color = ESTADO.get(status, (status.upper(), MUTED))
    return '<font color="%s"><b>%s</b></font>' % (color.hexval().replace('0x', '#'), label)


def captura(emb, ancho):
    raw = base64.b64decode(emb['data'])
    w, h = ImageReader(io.BytesIO(raw)).getSize()
    alto = ancho * h / w
    max_alto = 95 * mm
    if alto > max_alto:
        ancho, alto = ancho * max_alto / alto, max_alto
    img = Image(io.BytesIO(raw), width=ancho, height=alto)
    img.hAlign = 'LEFT'
    return img


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--results', default='results/cucumber-report.json')
    ap.add_argument('--output', default='results/EVIDENCIA_BDD_GRUPO06.pdf')
    ap.add_argument('--grupo', default='Grupo 06 - Notificaciones y Alertas')
    ap.add_argument('--titulo', default='Evidencia de pruebas UI (BDD)')
    ap.add_argument('--nota', default='', help='Texto explicativo que se muestra en la portada (p. ej. un fallo controlado)')
    args = ap.parse_args()

    features = json.load(open(args.results, encoding='utf-8'))
    escenarios = [(f, s) for f in features for s in f.get('elements', []) if s.get('type') == 'scenario']

    def estado_escenario(s):
        st = [x.get('result', {}).get('status') for x in s['steps'] if not x.get('hidden')]
        return 'failed' if 'failed' in st else ('passed' if st and all(v == 'passed' for v in st) else (st[-1] if st else 'skipped'))

    total = len(escenarios)
    ok = sum(1 for _, s in escenarios if estado_escenario(s) == 'passed')

    story = [Paragraph(esc(args.titulo), H1),
             Paragraph(esc(args.grupo), BODY),
             Paragraph('Cucumber + Playwright sobre el sandbox web de AIQUAA  •  Generado: %s'
                       % datetime.now().strftime('%d/%m/%Y %H:%M'), SMALL),
             Spacer(1, 8)]
    resumen = [['Escenario', 'Tags', 'Pasos', 'Resultado']]
    for _, s in escenarios:
        pasos = [x for x in s['steps'] if not x.get('hidden')]
        tags = ' '.join(t['name'] for t in s.get('tags', []))
        resumen.append([Paragraph(esc(s['name']), BODY), Paragraph(esc(tags), SMALL),
                        Paragraph(str(len(pasos)), BODY), Paragraph(estado_txt(estado_escenario(s)), BODY)])
    tb = Table(resumen, colWidths=[78 * mm, 50 * mm, 14 * mm, 28 * mm], repeatRows=1)
    tb.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, 0), NAVY), ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'), ('FONTSIZE', (0, 0), (-1, 0), 9),
                            ('GRID', (0, 0), (-1, -1), 0.4, LINE), ('VALIGN', (0, 0), (-1, -1), 'TOP')]))
    story += [tb, Spacer(1, 6), Paragraph('<b>%d de %d escenarios pasaron.</b> Cada página siguiente muestra los pasos '
                                          'de un escenario con la captura tomada al terminar cada paso.' % (ok, total), BODY)]
    if args.nota:
        nota = Table([[Paragraph('<b>Nota</b><br/>' + esc(args.nota), BODY)]], colWidths=[170 * mm])
        nota.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#FEF3C7')),
                                  ('LINEBEFORE', (0, 0), (0, -1), 3, colors.HexColor('#B45309')),
                                  ('LEFTPADDING', (0, 0), (-1, -1), 8), ('TOPPADDING', (0, 0), (-1, -1), 6),
                                  ('BOTTOMPADDING', (0, 0), (-1, -1), 6)]))
        story += [Spacer(1, 8), nota]

    for f, s in escenarios:
        story.append(PageBreak())
        tags = ' '.join(t['name'] for t in s.get('tags', []))
        story += [Paragraph(esc(s['name']), H2),
                  Paragraph('%s  •  %s  •  %s' % (esc(f.get('name', '')), esc(tags), estado_txt(estado_escenario(s))), SMALL),
                  Spacer(1, 6)]
        n = 0
        for st in s['steps']:
            if st.get('hidden'):
                continue
            n += 1
            res = st.get('result', {})
            ms = res.get('duration', 0) / 1e6
            bloque = [Paragraph('%d. %s %s' % (n, esc(st.get('keyword', '').strip()), esc(st.get('name', ''))), STEP),
                      Paragraph('%s  •  %.0f ms' % (estado_txt(res.get('status', 'skipped')), ms), SMALL)]
            if res.get('error_message'):
                bloque.append(Paragraph('<font color="#B91C1C">%s</font>' % esc(res['error_message'][:600]), SMALL))
            for emb in st.get('embeddings', []):
                if emb.get('mime_type') == 'image/png':
                    bloque += [Spacer(1, 3), captura(emb, 150 * mm)]
            bloque.append(Spacer(1, 8))
            story.append(KeepTogether(bloque))

    def pie(c, doc):
        c.saveState()
        c.setFont('Helvetica', 8)
        c.setFillColor(MUTED)
        c.drawString(20 * mm, 10 * mm, args.grupo)
        c.drawRightString(A4[0] - 20 * mm, 10 * mm, 'Página %d' % doc.page)
        c.restoreState()

    doc = SimpleDocTemplate(args.output, pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm,
                            topMargin=16 * mm, bottomMargin=18 * mm, title='Evidencia BDD - ' + args.grupo)
    doc.build(story, onFirstPage=pie, onLaterPages=pie)
    print('Evidencia generada: %s (%d de %d escenarios pasaron)' % (args.output, ok, total))


if __name__ == '__main__':
    main()
