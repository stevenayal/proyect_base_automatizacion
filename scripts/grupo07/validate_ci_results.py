"""Fail-closed evidence and selected-profile certification. Never print secrets."""
import argparse
import json
import os
import time
import urllib.parse
from pathlib import Path
from collections import Counter
from newman_report import summarize
from wait_sandbox_consumers import api

POS = 'G7-S3 01 Checkout exitoso con SQL'
NEG = 'G7-S3 02 Cantidad cero sin inserciones'
COMMON = ['RF-G7-02 comprador dinamico - SQL 200 y contrato valido',
          'RF-G7-02 conteo ordenes - SQL 200 y contrato valido',
          'RF-G7-02 conteo items - SQL 200 y contrato valido']
EXPECTED = {
    POS: COMMON + ['RF-G7-02 checkout HTTP 201', 'RF-G7-02 comprador, producto, total y estado',
        'RF-G7-02 respuesta contiene dos items calculados', 'RF-G7-02 cabecera persistida - SQL 200 y contrato valido',
        'RF-G7-02 SQL confirma cabecera completa', 'RF-G7-02 detalle persistido - SQL 200 y contrato valido',
        'RF-G7-02 SQL confirma ambos items y total'],
    NEG: COMMON + ['RF-G7-02 cantidad cero HTTP 400', 'RF-G7-02 rechazo VALIDATION_ERROR',
        'RF-G7-02 conteo ordenes - SQL 200 y contrato valido', 'RF-G7-02 conteo items - SQL 200 y contrato valido',
        'RF-G7-02 rechazo no inserta cabecera ni items'],
}


def sql(document):
    assert document.get('passed') is True and document.get('failures') == [], 'SQL failed/missing failures'
    requests = document['requests']
    assert len(requests) == 12, 'Expected all 12 HTTP requests'
    for case, code in [(POS, 201), (NEG, 400)]:
        rows = [r for r in requests if r.get('case') == case]
        assert len(rows) == 6, 'Expected 6 HTTP per SQL case'
        business = [r for r in rows if urllib.parse.urlsplit(r['url']).path == '/api/v1/ordenes']
        aux = [r for r in rows if urllib.parse.urlsplit(r['url']).path == '/api/v1/sql/select']
        assert len(business) == 1 and business[0]['status'] == code
        assert len(aux) == 5 and all(r['status'] == 200 for r in aux)
        assert all(r['method'] == 'POST' and not r.get('error') for r in rows)
        checks = [a for a in document['assertions'] if a.get('case') == case]
        assert Counter(a['name'] for a in checks) == Counter(EXPECTED[case]), 'Missing/extra SQL assertions'
        assert all(a.get('passed') is True and not a.get('error') for a in checks)
    stats = document['stats']
    assert stats['requests']['total'] == 12 and stats['assertions']['total'] == 18
    assert all(v.get('failed', 0) == 0 and v.get('pending', 0) == 0 for v in stats.values())
    assert len(document['assertions']) == 18
    diagnostics = document['diagnostics']
    rejection = [json.loads(d.removeprefix('G7-S3 rechazo ')) for d in diagnostics if d.startswith('G7-S3 rechazo ')]
    assert len(rejection) == 1 and rejection[0] == {'antes': {'ordenes': 0, 'items': 0}, 'despues': {'ordenes': 0, 'items': 0}}
    return {'result': 'PASS', 'http': 12, 'assertions': 18, 'absence_of_insertions': True}


def base(document, collection):
    summary = summarize(document, expected_requests=20, expected_assertions=48)
    assert summary['Result'] == 'PASS', 'Base incomplete or failed'
    executions = document['run']['executions']
    assert [e['item']['name'] for e in executions] == [i['name'] for i in collection['item'][:20]]
    assert all(e['response']['code'] != 429 for e in executions)
    return summary


def certify(profile, results):
    assert profile in {'postman', 'sin-reporte', 'jmeter', 'all'}
    selected = ['plan', 'initial_window']
    if profile in {'postman', 'all'}:
        selected += ['juan']
    if profile in {'postman', 'sin-reporte', 'all'}:
        selected += ['general']
    if profile in {'jmeter', 'all'}:
        selected += ['jmeter_window', 'jmeter']
    for name in selected:
        assert results.get(name) == 'success', f'SELECTED_SUITE_NOT_SUCCESS: {name}={results.get(name, "missing")}'
    return selected


def artifact(value):
    assert str(value).isdigit() and int(value) > 0, 'Missing artifact ID'


def head_verdict(tested, current):
    assert tested and current, 'Missing SHA'
    return 'GREEN_REAL' if current == tested else 'SUPERSEDED_BY_NEWER_COMMIT'


def nonempty(path):
    assert Path(path).is_file() and Path(path).stat().st_size > 0, f'Missing/empty {path}'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('mode', choices=['base', 'sql', 'general', 'final'])
    args = parser.parse_args()
    if args.mode in {'base', 'general'}:
        print(json.dumps(base(json.loads(Path('newman/results.json').read_text()),
            json.loads(Path('postman/grupo-07-carrito-ecommerce.postman_collection.json').read_text()))))
        raw = json.dumps(json.loads(Path('newman/results.json').read_text()), ensure_ascii=True)
        key = os.environ.get('API_KEY', '')
        assert key, 'Missing API key for artifact redaction'
        raw = raw.replace(json.dumps(key, ensure_ascii=True)[1:-1], '[REDACTED]')
        json.loads(raw)
        Path('newman/results.redacted.json').write_text(raw, encoding='utf-8')
    if args.mode in {'sql', 'general'}:
        print(json.dumps(sql(json.loads(Path('test-results/grupo07-sql/semana-3-newman.json').read_text()))))
    if args.mode == 'general':
        for key in ['BASE', 'BASE_VALIDATION', 'SQL', 'SQL_VALIDATION', 'REPORT', 'UPLOAD']:
            assert os.environ.get(key) == 'success', f'{key} did not succeed'
        artifact(os.environ.get('ARTIFACT_ID', ''))
        nonempty('newman/results.xml' if os.environ['PROFILE'] == 'sin-reporte' else 'newman/report.pdf')
    if args.mode == 'final':
        profile = os.environ['PROFILE']
        selected = certify(profile, json.loads(os.environ['JOB_RESULTS']))
        assert time.time() < float(os.environ['CI_DEADLINE']), 'COORDINATOR_DEADLINE_EXCEEDED'
        branch = urllib.parse.quote(os.environ['TESTED_BRANCH'], safe='')
        current = api(f'repos/{os.environ["GITHUB_REPOSITORY"]}/git/ref/heads/{branch}')['object']['sha']
        tested = os.environ['TESTED_SHA']
        verdict = head_verdict(tested, current)
        message = f'{verdict}: profile={profile}; tested_sha={tested}; current_head={current}; selected={selected}'
        if profile not in {'all', 'jmeter'}:
            message += '; JMETER=FUERA_DEL_ALCANCE_AUTOMATICO'
        if profile == 'jmeter':
            message += '; POSTMAN_SQL=FUERA_DEL_ALCANCE'
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8') as stream:
            stream.write(message + '\n')
        print(message)
        # Superseded is not a functional regression, but must never certify current HEAD.
        if verdict != 'GREEN_REAL':
            raise SystemExit(1)


if __name__ == '__main__':
    main()
