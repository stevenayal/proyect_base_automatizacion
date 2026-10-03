"""Read Actions metadata only. This is not a lock on external API consumers."""
import argparse
import base64
import json
import os
import time
import urllib.parse
import urllib.request

ACTIVE = {'queued', 'in_progress', 'requested', 'waiting', 'pending'}
COORDINATORS = {'postman-grupo07-regression.yml', 'postman-grupo07-regression-sin-reporte.yml'}
CONSUMERS = COORDINATORS | {
    'postman-grupo07-andrea-regression.yml', 'postman-grupo07-armin-regression.yml',
    'jmeter-grupo07-andrea-performance.yml', 'postman-grupo07-juan-regression.yml',
    'jmeter-grupo07-juan-performance.yml', 'jmeter-performance.yml',
}


def api(path):
    request = urllib.request.Request('https://api.github.com/' + path, headers={
        'Authorization': 'Bearer ' + os.environ['GH_TOKEN'],
        'Accept': 'application/vnd.github+json', 'User-Agent': 'grupo07-ci',
    })
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.load(response)


def blockers(runs, current):
    result = []
    for run in runs:
        filename = run.get('path', '').split('@')[0].rsplit('/', 1)[-1]
        if str(run['id']) == str(current) or filename not in CONSUMERS:
            continue
        if run['status'] not in ACTIVE:
            continue
        # Runs behind our workflow-level lock cannot consume the sandbox.
        # Never wait for them while holding that lock (deadlock).
        if filename in COORDINATORS and run.get('coordinated') is True:
            continue
        result.append(run)
    return result


def active_runs(repo, fetch=api):
    found = {}
    for status in sorted(ACTIVE):
        page = 1
        while True:
            data = fetch(f'repos/{repo}/actions/runs?status={status}&per_page=100&page={page}')
            if data['total_count'] > 1000:
                raise RuntimeError('Actions pagination limit: cannot prove quiet window')
            rows = data['workflow_runs']
            for run in rows:
                found[run['id']] = run
            if len(rows) < 100:
                break
            page += 1
    versions = {}
    for run in found.values():
        filename = run.get('path', '').split('@')[0].rsplit('/', 1)[-1]
        if filename in COORDINATORS:
            sha = run['head_sha']
            if sha not in versions:
                data = fetch(f'repos/{repo}/contents/.github/workflows/postman-grupo07-regression.yml?ref={sha}')
                source = base64.b64decode(data['content']).decode('utf-8')
                versions[sha] = 'group: grupo07-ci-coordinado' in source
            # Includes the no-PDF caller: GitHub can mark a caller in_progress
            # while its reusable coordinator waits for our same lock.
            # Legacy versions without the lock remain real blockers.
            run['coordinated'] = versions[sha]
    return list(found.values())


def wait_quiet(snapshot, current, quiet=70, timeout=2400, clock=time.monotonic, sleep=time.sleep):
    start, clean_since = clock(), None
    while True:
        if clock() - start >= timeout:
            raise TimeoutError('PENDIENTE_POR_VENTANA_DE_RATE_LIMIT')
        busy = blockers(snapshot(), current)
        now = clock()
        if now - start >= timeout:
            raise TimeoutError('PENDIENTE_POR_VENTANA_DE_RATE_LIMIT')
        if busy:
            clean_since = None
            print('Waiting for Actions:', ','.join(str(r['id']) for r in busy), flush=True)
        else:
            if clean_since is None:
                clean_since = now
            if now - clean_since >= quiet:
                print(f'QUIET_WINDOW: {quiet}s; no sandbox probes', flush=True)
                return
        sleep(min(10, max(0.1, timeout - (clock() - start))))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true', help='Start immediately if clear; otherwise obtain a new quiet window')
    args = parser.parse_args()
    deadline = float(os.environ['CI_DEADLINE'])
    remaining = min(2400, deadline - time.time())
    if remaining <= 0:
        raise TimeoutError('COORDINATOR_DEADLINE_EXCEEDED')
    snapshot = lambda: active_runs(os.environ['GITHUB_REPOSITORY'])
    current = os.environ['GITHUB_RUN_ID']
    if args.check and not blockers(snapshot(), current):
        print('EXTERNAL_CONSUMERS_CLEAR')
        return
    wait_quiet(snapshot, current, timeout=remaining)


if __name__ == '__main__':
    main()
