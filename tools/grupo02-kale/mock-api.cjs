#!/usr/bin/env node
/**
 * Mock LOCAL de la AIQUAA Sandbox API (solo las rutas del Grupo 02).
 *
 * Sirve para practicar y depurar la coleccion Postman, el plan JMeter y los
 * steps de API SIN salir de tu maquina. Imita el comportamiento real:
 *  - ids y montos devueltos como string (asi responde el curso 1)
 *  - 401 sin x-api-key, 404 en cuentas inactivas / transferencias anuladas
 *  - 400 VALIDATION_ERROR por zod (monto <= 0), CHECK (origen = destino) y FK
 *  - /api/v1/sql/select para las consultas que usa la coleccion
 *
 * Uso:  node tools/grupo02-kale/mock-api.cjs            (puerto 4010)
 *       PORT=5000 node tools/grupo02-kale/mock-api.cjs
 */
const http = require('node:http');

const PORT = Number(process.env.PORT || 4010);
// Simulacion opcional del rate limit del sandbox: RATE_LIMIT=N pedidos por
// ventana de RATE_WINDOW segundos (el real es 30 por 60 s). Responde 429 con
// Retry-After, igual que la API real. Sin RATE_LIMIT no limita.
const RATE_LIMIT = Number(process.env.RATE_LIMIT || 0);
const RATE_WINDOW = Number(process.env.RATE_WINDOW || 60);
let hits = [];
const now = () => new Date().toISOString();

const cuentas = [];
for (let i = 1; i <= 24; i++) {
  cuentas.push({
    id: i,
    usuario_id: ((i - 1) % 18) + 1,
    numero_cuenta: `PY1000000${String(i).padStart(2, '0')}`,
    tipo_cuenta: i % 2 ? 'corriente' : 'ahorro',
    moneda: i === 7 ? 'USD' : 'PYG',
    saldo: (500000 + i * 137456.25).toFixed(2),
    activa: i !== 3,
    created_at: '2026-08-15T23:36:00.914Z',
  });
}
const transferencias = [];
for (let i = 1; i <= 25; i++) {
  transferencias.push({
    id: i,
    cuenta_origen_id: ((i - 1) % 20) + 1,
    cuenta_destino_id: ((i + 4) % 20) + 1,
    monto: (50000 + i * 34567.89).toFixed(2),
    descripcion: `Transferencia ${i}`,
    estado: ['completada', 'pendiente', 'rechazada'][i % 3],
    activo: true,
    created_at: '2026-08-01T11:00:00.000Z',
  });
}

const s = (v) => (v === null || v === undefined ? v : String(v));
const outCuenta = (c) => ({ ...c, id: s(c.id), usuario_id: s(c.usuario_id) });
const outTr = (t) => ({ ...t, id: s(t.id), cuenta_origen_id: s(t.cuenta_origen_id), cuenta_destino_id: s(t.cuenta_destino_id) });
const err = (code, message, details) => ({ error: { code, message, ...(details ? { details } : {}) } });

function sqlSelect(sql, params) {
  const q = sql.replace(/\s+/g, ' ').trim();
  const p = params || [];
  let m;
  if (/^SELECT id, usuario_id, moneda, saldo, activa FROM cuentas WHERE activa = \$1 AND moneda = \$2 ORDER BY id LIMIT (\d+)$/i.test(q)) {
    const lim = Number(q.match(/LIMIT (\d+)/i)[1]);
    return cuentas.filter((c) => c.activa === p[0] && c.moneda === p[1]).slice(0, lim)
      .map((c) => ({ id: s(c.id), usuario_id: s(c.usuario_id), moneda: c.moneda, saldo: c.saldo, activa: c.activa }));
  }
  if (/^SELECT id FROM cuentas WHERE activa = \$1 AND moneda = \$2 ORDER BY id LIMIT (\d+)$/i.test(q)) {
    const lim = Number(q.match(/LIMIT (\d+)/i)[1]);
    return cuentas.filter((c) => c.activa === p[0] && c.moneda === p[1]).slice(0, lim).map((c) => ({ id: s(c.id) }));
  }
  if (/FROM cuentas WHERE activa = \$1 ORDER BY id LIMIT 1\) AS inactiva/i.test(q)) {
    const ina = cuentas.find((c) => c.activa === p[0]);
    return [{ inactiva: ina ? s(ina.id) : null, max_id: s(Math.max(...cuentas.map((c) => c.id))) }];
  }
  if ((m = q.match(/^SELECT (.+) FROM cuentas WHERE id IN \(\$1, \$2\)$/i))) {
    return cuentas.filter((c) => c.id === Number(p[0]) || c.id === Number(p[1])).map((c) => ({ id: s(c.id), activa: c.activa }));
  }
  if (/^SELECT COUNT\(\*\) AS activas FROM cuentas WHERE id = \$1 AND activa = \$2$/i.test(q)) {
    return [{ activas: s(cuentas.filter((c) => c.id === Number(p[0]) && c.activa === p[1]).length) }];
  }
  if ((m = q.match(/^SELECT (.+) FROM cuentas WHERE id = \$1$/i))) {
    const c = cuentas.find((x) => x.id === Number(p[0]));
    return c ? [pick(outCuenta(c), m[1])] : [];
  }
  if (/^SELECT COUNT\(\*\) AS total FROM transferencias WHERE descripcion = \$1$/i.test(q)) {
    return [{ total: s(transferencias.filter((t) => t.descripcion === p[0]).length) }];
  }
  if ((m = q.match(/^SELECT (.+) FROM transferencias WHERE id = \$1$/i))) {
    const t = transferencias.find((x) => x.id === Number(p[0]));
    return t ? [pick(outTr(t), m[1])] : [];
  }
  if (/^SELECT id, nombre, email FROM usuarios WHERE activo = \$1/i.test(q)) {
    return [{ id: '1', nombre: 'Ana Torres', email: 'ana.torres@example.com' }];
  }
  throw Object.assign(new Error(`Consulta no soportada por el mock: ${q}`), { status: 400 });
}
function pick(row, cols) {
  const out = {};
  cols.split(',').map((c) => c.trim()).forEach((c) => { out[c] = row[c]; });
  return out;
}

function positiveInt(v) { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : null; }

function handle(method, path, query, body) {
  let m;
  if (method === 'POST' && path === '/api/v1/sql/select') {
    if (!body || typeof body.sql !== 'string') return [400, err('VALIDATION_ERROR', 'Invalid request.')];
    const rows = sqlSelect(body.sql, body.params);
    return [200, { data: rows, rowCount: rows.length }];
  }
  if (method === 'GET' && path === '/api/v1/cuentas') {
    const u = query.get('usuarioId');
    const rows = cuentas.filter((c) => c.activa && (!u || c.usuario_id === Number(u)));
    return [200, { data: rows.map(outCuenta) }];
  }
  if ((m = path.match(/^\/api\/v1\/cuentas\/(\d+)$/)) && method === 'GET') {
    const c = cuentas.find((x) => x.id === Number(m[1]) && x.activa);
    return c ? [200, { data: outCuenta(c) }] : [404, err('NOT_FOUND', 'Cuenta no encontrada.')];
  }
  if (path === '/api/v1/transferencias' && method === 'GET') {
    const o = query.get('cuentaOrigenId'); const d = query.get('cuentaDestinoId');
    const rows = transferencias.filter((t) => t.activo && (!o || t.cuenta_origen_id === Number(o)) && (!d || t.cuenta_destino_id === Number(d)));
    return [200, { data: rows.slice(0, 100).map(outTr) }];
  }
  if (path === '/api/v1/transferencias' && method === 'POST') {
    const o = positiveInt(body?.cuentaOrigenId); const d = positiveInt(body?.cuentaDestinoId);
    const monto = Number(body?.monto);
    if (!o || !d || !(monto > 0)) {
      return [400, err('VALIDATION_ERROR', 'Invalid request.', JSON.stringify([{ code: 'too_small', message: 'Number must be greater than 0', path: ['monto'] }]))];
    }
    if (o === d) return [400, err('VALIDATION_ERROR', 'new row for relation "transferencias" violates check constraint "transferencias_check"')];
    if (!cuentas.find((c) => c.id === o)) return [400, err('VALIDATION_ERROR', 'insert or update on table "transferencias" violates foreign key constraint "transferencias_cuenta_origen_id_fkey"')];
    if (!cuentas.find((c) => c.id === d)) return [400, err('VALIDATION_ERROR', 'insert or update on table "transferencias" violates foreign key constraint "transferencias_cuenta_destino_id_fkey"')];
    const t = { id: transferencias.length + 1, cuenta_origen_id: o, cuenta_destino_id: d, monto: monto.toFixed(2), descripcion: body.descripcion ?? null, estado: 'pendiente', activo: true, created_at: now() };
    transferencias.push(t);
    return [201, { data: outTr(t) }];
  }
  if ((m = path.match(/^\/api\/v1\/transferencias\/(\d+)$/))) {
    const t = transferencias.find((x) => x.id === Number(m[1]) && x.activo);
    if (method === 'GET') return t ? [200, { data: outTr(t) }] : [404, err('NOT_FOUND', 'Transferencia no encontrada.')];
    if (method === 'DELETE') { if (!t) return [404, err('NOT_FOUND', 'Transferencia no encontrada.')]; t.activo = false; return [204, null]; }
  }
  return [404, err('NOT_FOUND', `Ruta no soportada por el mock: ${method} ${path}`)];
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let raw = '';
  req.on('data', (c) => { raw += c; });
  req.on('end', () => {
    const send = (status, payload) => {
      res.writeHead(status, status === 204 ? {} : { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(status === 204 ? undefined : JSON.stringify(payload));
    };
    if (url.pathname === '/health') return send(200, { ok: true });
    if (!req.headers['x-api-key']) {
      return send(401, err('UNAUTHORIZED', 'Invalid or inactive credentials. Send an x-api-key header or an Authorization: Bearer <token>.'));
    }
    if (RATE_LIMIT) {
      const t = Date.now();
      hits = hits.filter((h) => t - h < RATE_WINDOW * 1000);
      if (hits.length >= RATE_LIMIT) {
        const retry = Math.max(1, Math.ceil((RATE_WINDOW * 1000 - (t - hits[0])) / 1000));
        res.writeHead(429, { 'Content-Type': 'application/json; charset=utf-8', 'Retry-After': String(retry) });
        return res.end(JSON.stringify(err('RATE_LIMITED', `Rate limit exceeded. Max ${RATE_LIMIT} requests per ${RATE_WINDOW} seconds.`)));
      }
      hits.push(t);
    }
    let body;
    try { body = raw ? JSON.parse(raw) : undefined; } catch { return send(400, err('VALIDATION_ERROR', 'Invalid JSON body.')); }
    try {
      const [status, payload] = handle(req.method, url.pathname, url.searchParams, body);
      send(status, payload);
    } catch (e) {
      send(e.status || 500, err('EXECUTION_ERROR', e.message));
    }
  });
});

server.listen(PORT, () => console.log(`Mock AIQUAA API (Grupo 02) en http://localhost:${PORT}`));
