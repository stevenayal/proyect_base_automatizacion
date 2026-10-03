// End-to-end offline Newman -> JSON -> Python -> PDF; never calls the sandbox.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawnSync } = require('node:child_process');
const newman = require('newman');
const root = path.resolve(__dirname, '../../../..');

test('Juan: actual offline Newman runs 3 requests / 14 assertions and produces a PDF', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'grupo07-offline-'));
  let requests = 0;
  const server = http.createServer((req, res) => {
    requests++;
    assert.equal(req.method, 'POST');
    assert.equal(req.url, '/api/v1/ordenes');
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const data = JSON.parse(body);
      const valid = data.items.length === 2 && data.items.every(item => item.cantidad > 0);
      res.writeHead(valid ? 201 : 400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(valid
        ? { data: { id: 123, estado: 'pendiente', items: data.items, monto: 26.25 } }
        : { error: { code: 'VALIDATION_ERROR' } }));
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const results = path.join(directory, 'results.json');
    const summary = await new Promise((resolve, reject) => newman.run({
      collection: path.join(root, 'postman/grupo-07-juan-barreto-carrito-e-commerce.postman_collection.json'),
      environment: { values: [
        { key: 'baseUrl', value: `http://127.0.0.1:${server.address().port}`, enabled: true },
        { key: 'apiKey', value: 'offline-test-only', enabled: true }
      ] },
      reporters: ['json'], reporter: { json: { export: results } },
      timeout: 15000, timeoutRequest: 2000, timeoutScript: 5000
    }, (error, result) => error ? reject(error) : resolve(result)));
    assert.equal(requests, 3);
    assert.equal(summary.run.stats.requests.total, 3);
    assert.equal(summary.run.stats.assertions.total, 14);
    assert.equal(summary.run.failures.length, 0);
    const pdf = path.join(directory, 'report.pdf');
    const report = spawnSync(process.env.PYTHON_BIN || 'python', ['-B',
      path.join(root, 'scripts/grupo07/newman_report.py'), '--results', results,
      '--output', pdf, '--expected-requests', '3', '--expected-assertions', '14'], { encoding: 'utf8' });
    assert.equal(report.status, 0, report.stderr || report.stdout);
    assert.ok(fs.readFileSync(pdf).subarray(0, 4).equals(Buffer.from('%PDF')));
  } finally {
    await new Promise(resolve => server.close(resolve));
    // Only this test-created, OS-temporary directory is removed.
    fs.rmSync(directory, { recursive: true });
  }
});
