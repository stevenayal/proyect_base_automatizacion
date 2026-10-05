"""resumen_newman.py - resumen versionable (sin credenciales) de una corrida de Newman del Grupo 06.

El JSON que exporta Newman incluye la API key en los headers de cada request, por eso no se versiona.
Este script genera un Markdown con los totales, el detalle por carpeta y los fallos, y verifica que
la key no aparezca en la salida.

Uso:
  node grupos/grupo-06-notificaciones-alertas/scripts/run-newman.cjs
  python grupos/grupo-06-notificaciones-alertas/scripts/resumen_newman.py \
      --results newman/results.json --output grupos/grupo-06-notificaciones-alertas/evidence/semana-07/api/RESUMEN_NEWMAN.md
"""
import argparse
import json
import os
import re
from collections import OrderedDict
from datetime import datetime, timezone


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--results', default='newman/results.json')
    ap.add_argument('--output', required=True)
    args = ap.parse_args()

    data = json.load(open(args.results, encoding='utf-8'))
    run = data['run']
    st = run['stats']
    tm = run.get('timings', {})

    # Carpeta de cada request: Newman guarda el item; el nombre de la carpeta sale de la coleccion.
    carpeta_de = {}

    def walk(items, carpeta=None):
        for it in items:
            if 'item' in it:
                walk(it['item'], it['name'])
            else:
                carpeta_de[it.get('id') or it['name']] = carpeta or '(raiz)'

    walk(data['collection']['item'])

    por_carpeta = OrderedDict()
    for ex in run['executions']:
        item = ex.get('item', {})
        carpeta = carpeta_de.get(item.get('id') or item.get('name'), '(raiz)')
        c = por_carpeta.setdefault(carpeta, {'req': 0, 'ok': 0, 'fail': 0})
        c['req'] += 1
        for a in ex.get('assertions', []) or []:
            if a.get('error'):
                c['fail'] += 1
            else:
                c['ok'] += 1

    dur_ms = (tm.get('completed', 0) - tm.get('started', 0)) or 0
    inicio = datetime.fromtimestamp(tm['started'] / 1000, tz=timezone.utc).astimezone() if tm.get('started') else None
    lineas = [
        '# Resumen de la corrida de Newman — Grupo 06',
        '',
        'Generado por `scripts/resumen_newman.py` a partir del JSON de Newman (que no se versiona porque incluye la API key).',
        '',
        '| Dato | Valor |',
        '|---|---|',
        '| Colección | %s |' % data['collection']['info']['name'],
        '| Inicio | %s |' % (inicio.strftime('%d/%m/%Y %H:%M') if inicio else '-'),
        '| Duración | %d min %d s |' % (dur_ms // 60000, (dur_ms % 60000) // 1000),
        '| Requests ejecutados | %d (fallidos: %d) |' % (st['requests']['total'], st['requests']['failed']),
        '| Assertions | %d (fallidas: %d) |' % (st['assertions']['total'], st['assertions']['failed']),
        '| Scripts de test | %d (fallidos: %d) |' % (st['testScripts']['total'], st['testScripts']['failed']),
        '| Tiempo de respuesta promedio | %d ms |' % round(tm.get('responseAverage', 0)),
        '',
        '## Detalle por carpeta',
        '',
        '| Carpeta | Requests | Assertions OK | Assertions fallidas |',
        '|---|---|---|---|',
    ]
    for carpeta, c in por_carpeta.items():
        lineas.append('| %s | %d | %d | %d |' % (carpeta, c['req'], c['ok'], c['fail']))
    lineas += ['', '## Fallos', '']
    fallos = run.get('failures', [])
    if not fallos:
        lineas.append('Ninguno.')
    for f in fallos:
        err = f.get('error', {})
        lineas.append('- **%s** — %s: %s' % (f.get('source', {}).get('name', '?'), err.get('test', err.get('name', '')),
                                          err.get('message', '')[:300]))

    texto = '\n'.join(lineas) + '\n'
    # Defensa: redactar cualquier API key demo que se haya colado en los mensajes.
    texto = re.sub(r'sbx_[A-Za-z0-9_]+', '<API_KEY_REDACTADA>', texto)
    key = os.environ.get('GRUPO06_API_KEY', '')
    assert not key or key not in texto, 'La API key aparece en el resumen'
    os.makedirs(os.path.dirname(args.output) or '.', exist_ok=True)
    open(args.output, 'w', encoding='utf-8', newline='\n').write(texto)
    print('Resumen generado: %s (%d requests, %d assertions, %d fallidas)'
          % (args.output, st['requests']['total'], st['assertions']['total'], st['assertions']['failed']))


if __name__ == '__main__':
    main()
