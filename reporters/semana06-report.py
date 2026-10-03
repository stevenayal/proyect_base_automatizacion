#!/usr/bin/env python3
"""Informe fiel a los steps, hooks y evidencias del JSON Cucumber de Semana 06."""
import argparse
import base64
from collections import Counter
from datetime import datetime, timezone
import json
from pathlib import Path
import re
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

SANDBOX = 'https://aiquaa-sandbox-web.vercel.app'
FAILURES = {'failed', 'undefined', 'ambiguous', 'pending', 'unknown'}
ANSI = re.compile(r'\x1b\[[0-9;]*m')


def parse_cucumber_json(path):
    data = json.loads(Path(path).read_text(encoding='utf-8'))
    if not isinstance(data, list):
        raise ValueError('Se requiere el array del formatter JSON de Cucumber')
    scenarios = []
    step_counts = Counter()
    for feature in data:
        uri = feature.get('uri', '').replace('\\', '/')
        if '/features/semana-06/' not in uri or 'LAB-LOGIN-001' in uri:
            raise ValueError(f'Feature ajeno a Semana 06: {uri}')
        for element in feature.get('elements', []):
            if element.get('type') != 'scenario':
                continue
            all_steps = element.get('steps', [])
            steps = [step for step in all_steps if not step.get('hidden')]
            entries = element.get('before', []) + all_steps + element.get('after', [])
            states = [entry.get('result', {}).get('status', 'unknown') for entry in entries]
            step_counts.update(step.get('result', {}).get('status', 'unknown') for step in steps)
            if any(state in FAILURES or state not in {'passed', 'skipped'} for state in states):
                status = 'FAIL'
            elif not steps or not states or any(state != 'passed' for state in states):
                status = 'SKIP'
            else:
                status = 'PASS'
            errors = [ANSI.sub('', entry.get('result', {}).get('error_message', ''))
                      for entry in entries if entry.get('result', {}).get('error_message')]
            evidence = []
            for entry in entries:
                for attachment in entry.get('embeddings', []):
                    if attachment.get('mime_type') == 'application/json':
                        record = json.loads(base64.b64decode(attachment['data']))
                        if 'loginRequests' in record:
                            evidence.append(record)
            scenarios.append({'name': element.get('name', 'Sin nombre'), 'status': status,
                              'errors': errors, 'evidence': evidence})
    counts = Counter(s['status'] for s in scenarios)
    total = len(scenarios)
    return {'total': total, 'passed': counts['PASS'], 'failed': counts['FAIL'],
            'skipped': counts['SKIP'], 'pass_rate': round(counts['PASS'] / total * 100, 1) if total else 0,
            'steps': dict(step_counts), 'scenarios': scenarios}


def get_verdict(stats):
    if not stats['total']:
        return 'SIN RESULTADOS - no se ejecutaron escenarios', 'warn'
    if stats['failed']:
        return 'VALIDACION FALLIDA - revisar expectativas y evidencias', 'fail'
    if stats['skipped']:
        return 'VALIDACION INCOMPLETA - hay escenarios omitidos', 'warn'
    return 'Todos los escenarios pasaron', 'pass'


def generate_report(results_path, output_path, app_name='AIQUAA Sandbox', environment=None):
    stats = parse_cucumber_json(results_path)
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle('SmallBody', parent=styles['BodyText'], fontSize=8, leading=11))
    styles['Title'].textColor = colors.HexColor('#183153')
    styles['Heading2'].textColor = colors.HexColor('#183153')
    def p(text, style='BodyText'):
        return Paragraph(escape(str(text)).replace('\n', '<br/>'), styles[style])
    source_time = datetime.fromtimestamp(Path(results_path).stat().st_mtime, timezone.utc).isoformat(timespec='seconds')
    story = [p('Informe BDD - Semana 06', 'Title'),
             p(f'{app_name} | Grupo 01 - Autenticacion y Acceso'),
             p(f'Fuente JSON actualizada: {source_time}', 'SmallBody'),
             p(f'Ambiente: {environment or "Local"} | {SANDBOX}', 'SmallBody'),
             Spacer(1, 6*mm)]
    verdict, kind = get_verdict(stats)
    color = {'fail': '#b42318', 'warn': '#965b00', 'pass': '#16703a'}[kind]
    styles.add(ParagraphStyle('Verdict', parent=styles['Heading2'], textColor=colors.HexColor(color)))
    story += [p(verdict, 'Verdict'), p(f"Escenarios: {stats['total']} | Aprobados: {stats['passed']} | Fallidos: {stats['failed']} | Omitidos: {stats['skipped']}"),
              p(f"Pasos: {json.dumps(stats['steps'], ensure_ascii=False)}", 'SmallBody'), Spacer(1, 4*mm)]
    rows = [[p('Escenario', 'SmallBody'), p('Estado', 'SmallBody')]]
    rows += [[p(s['name'], 'SmallBody'), p(s['status'], 'SmallBody')] for s in stats['scenarios']]
    table = Table(rows, colWidths=[145*mm, 25*mm], repeatRows=1, hAlign='LEFT')
    table.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,0), colors.HexColor('#e5edf6')),
                              ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f5f7fa')]),
                              ('VALIGN', (0,0), (-1,-1), 'TOP'), ('BOX',(0,0),(-1,-1),.5,colors.lightgrey),
                              ('TOPPADDING',(0,0),(-1,-1),7), ('BOTTOMPADDING',(0,0),(-1,-1),7)]))
    story += [table, Spacer(1, 5*mm), p('Evidencia observada', 'Heading2')]
    for scenario in stats['scenarios']:
        story.append(p(scenario['name'], 'Heading3'))
        for evidence in scenario['evidence']:
            story.append(p(f"Ejecucion: {evidence.get('runId')} | Estado: {evidence.get('status')}", 'SmallBody'))
            story.append(p(f"URL final: {evidence.get('url', 'No disponible')}", 'SmallBody'))
            requests = evidence.get('loginRequests', [])
            if not requests:
                story.append(p('No se observaron solicitudes POST de login.', 'SmallBody'))
            for request in requests:
                story.append(p(f"POST /api/proxy/auth/login | HTTP {request.get('status', 'sin respuesta')} | {request.get('email', '')}", 'SmallBody'))
                if request.get('error'):
                    story.append(p(request['error'], 'SmallBody'))
            if any(200 <= r.get('status', 0) < 300 for r in requests) and scenario['status'] == 'FAIL':
                story.append(p('La respuesta fue exitosa pero el escenario exige un error. Esto no demuestra una caida del backend; revisar la precondicion del feature.', 'SmallBody'))
        for error in scenario['errors']:
            # Conservar el mensaje útil sin volcar rutas locales y stacks completos al PDF.
            summary = error.split('\n    at ')[0][:1000]
            story.append(p(summary, 'SmallBody'))
    story += [Spacer(1, 4*mm), p('Alcance y limites', 'Heading2'),
              p('Este informe describe la ejecucion incluida en el JSON. Un escenario negativo aprobado no demuestra un login exitoso. Los pasos omitidos y fallos de hooks nunca se cuentan como aprobados. No se ejecutan otras semanas ni LAB-LOGIN-001.', 'SmallBody')]
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    def footer(canvas, doc):
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(colors.HexColor('#607080'))
        canvas.drawString(20*mm, 12*mm, 'Semana 06 | Cucumber + Playwright')
        canvas.drawRightString(190*mm, 12*mm, f'Pagina {doc.page}')
    SimpleDocTemplate(str(output), pagesize=A4, leftMargin=20*mm, rightMargin=20*mm,
                      topMargin=15*mm, bottomMargin=20*mm).build(story, onFirstPage=footer, onLaterPages=footer)
    print(json.dumps({k:v for k,v in stats.items() if k != 'scenarios'}, ensure_ascii=False))
    print(f'Reporte: {output}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--results', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--app-name', default='AIQUAA Sandbox')
    parser.add_argument('--environment', default='Local')
    args = parser.parse_args()
    generate_report(args.results, args.output, args.app_name, args.environment)
