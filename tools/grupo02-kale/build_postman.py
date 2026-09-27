#!/usr/bin/env python3
"""Genera la coleccion y el environment de Postman del Grupo 02.

Los scripts viven aca como texto legible y se vuelcan a JSON v2.1, asi la
coleccion se puede regenerar sin editar JSON a mano:

    python3 tools/grupo02-kale/build_postman.py
"""
import json
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE_URL = "https://aiquaa-sandbox-api.vercel.app"
DEMO_KEY = "sbx_demo_f581ca21e68a347288c94d71"  # key demo publica del curso


def lines(s: str):
    return s.strip("\n").split("\n")


def ev(listen, code):
    return {"listen": listen, "script": {"type": "text/javascript", "exec": lines(code)}}


def url(path, query=None):
    raw = "{{baseUrl}}" + path
    parts = [p for p in path.strip("/").split("/")]
    u = {"raw": raw, "host": ["{{baseUrl}}"], "path": parts}
    if query:
        u["raw"] += "?" + "&".join(f"{k}={v}" for k, v in query)
        u["query"] = [{"key": k, "value": v} for k, v in query]
    return u


def req(name, method, path, *, body=None, query=None, pre=None, test=None, auth=True, desc=""):
    headers = [{"key": "Content-Type", "value": "application/json"}]
    if auth:
        headers.append({"key": "x-api-key", "value": "{{apiKey}}"})
    r = {
        "method": method,
        "header": headers,
        "url": url(path, query),
        "description": desc,
    }
    if body is not None:
        r["body"] = {"mode": "raw", "raw": body, "options": {"raw": {"language": "json"}}}
    events = []
    if pre:
        events.append(ev("prerequest", pre))
    if test:
        events.append(ev("test", wrap_429(test)))
    return {"name": name, "event": events, "request": r, "response": []}


def wrap_429(code):
    """Los tests del request solo corren si la respuesta NO es un 429: en ese
    caso el Tests de la coleccion reintenta el mismo request (setNextRequest)."""
    body = "\n".join("  " + l if l else l for l in code.strip("\n").split("\n"))
    return (
        "// Si la API respondio 429 (rate limit), la coleccion reintenta este request.\n"
        "if (!pm.variables.get(\"reintentando\")) {\n"
        + body + "\n}\n"
    )


def folder(name, desc, items):
    return {"name": name, "description": desc, "item": items}


TRANSFER_BODY = """{
  "cuentaOrigenId": {{cuentaOrigenId}},
  "cuentaDestinoId": {{cuentaDestinoId}},
  "monto": {{monto}},
  "descripcion": "{{descripcion}}"
}"""

# ---------------------------------------------------------------------------
# Pre-request y Tests a nivel COLECCION
# ---------------------------------------------------------------------------
COLLECTION_PRE = r"""
// =====================================================================
// PRE-REQUEST DE LA COLECCION (corre antes de CADA request)
// Patron SQL REST dinamico (docs/TAREA-SQL-REST-DINAMICO.md del curso)
// =====================================================================

// 1) Helper reusable: arma el request a /api/v1/sql/select (solo lectura).
//    Se declara UNA sola vez aca y lo usan todos los requests.
utils = {
  bodySqlRest: function (sql, params) {
    return {
      url: pm.variables.get("baseUrl") + "/api/v1/sql/select",
      method: "POST",
      header: {
        "Content-Type": "application/json",
        "x-api-key": pm.variables.get("apiKey")
      },
      body: { mode: "raw", raw: JSON.stringify({ sql: sql, params: params || [] }) }
    };
  },
  // Igual que bodySqlRest + pm.sendRequest, pero si la API responde 429
  // (rate limit de 30 req/min por API key, compartida en el curso) espera
  // lo que indica Retry-After y reintenta (hasta 5 veces).
  // Recibe el `pm` y el `setTimeout` del script que lo llama: asi Postman/Newman
  // espera la respuesta (y el reintento) dentro de ese script, no en el de la
  // coleccion, que ya termino.
  sql: function (pmCaller, timer, sql, params, cb, intento) {
    intento = intento || 0;
    pmCaller.sendRequest(utils.bodySqlRest(sql, params), function (err, res) {
      if (!err && res.code === 429 && intento < 5) {
        var espera = (Number(res.headers.get("Retry-After")) || 15) * 1000;
        console.log("SQL 429 (rate limit) - reintento " + (intento + 1) + " en " + espera + " ms");
        timer(function () { utils.sql(pmCaller, timer, sql, params, cb, intento + 1); }, espera);
        return;
      }
      cb(err, res);
    });
  },
  // En el curso 1 la API devuelve bigint/numeric como string ("1", "250.00").
  num: function (v) { return Number(v); }
};

// 2) Identificador unico de la corrida (una vez por ejecucion) para que los
//    datos creados se puedan rastrear en la BD compartida del curso.
if (!pm.collectionVariables.get("runId")) {
  pm.collectionVariables.set("runId", String(Date.now()));
}

// 3) Reset de las variables del body de "Crear transferencia" a su default.
//    Los defaults de cuentas vienen de la BD (request "00 - Setup") y NO
//    estan hardcodeados. Cada caso negativo pisa SOLO el campo que necesita.
pm.collectionVariables.set("cuentaOrigenId", pm.collectionVariables.get("cuentaOrigenBase"));
pm.collectionVariables.set("cuentaDestinoId", pm.collectionVariables.get("cuentaDestinoBase"));
pm.collectionVariables.set("monto", pm.collectionVariables.get("montoBase") || 15000);
pm.collectionVariables.set("descripcion", "G02-E2E-" + pm.collectionVariables.get("runId"));
"""

COLLECTION_TEST = r"""
// Reintento ante 429 (rate limit de la API key compartida del curso): espera
// Retry-After y vuelve a ejecutar el MISMO request (hasta 4 veces). Los tests
// del request se saltean en el intento con 429 (ver wrap_429 en build_postman.py).
if (pm.response.code === 429) {
  var n = Number(pm.variables.get("reintentos429") || 0);
  if (n < 4) {
    pm.variables.set("reintentos429", n + 1);
    var espera = (Number(pm.response.headers.get("Retry-After")) || 20) * 1000;
    console.log("429 en '" + pm.info.requestName + "' - reintento " + (n + 1) + " en " + espera + " ms");
    setTimeout(function () {}, espera);
    postman.setNextRequest(pm.info.requestName);
    pm.variables.set("reintentando", true);
  } else {
    pm.variables.set("reintentando", false);
  }
} else {
  pm.variables.set("reintentos429", 0);
  pm.variables.set("reintentando", false);
}
// Validaciones comunes a TODAS las respuestas de la coleccion.
if (!pm.variables.get("reintentando")) {
pm.test("[comun] Tiempo de respuesta menor a " + (pm.variables.get("maxResponseMs") || 3000) + " ms", function () {
  pm.expect(pm.response.responseTime).to.be.below(Number(pm.variables.get("maxResponseMs") || 3000));
});
pm.test("[comun] La respuesta no es un 429 (rate limit del sandbox)", function () {
  pm.expect(pm.response.code, "Se excedio el rate limit de 30 req/min de la API key").to.not.eql(429);
});
if (pm.response.code !== 204) {
  pm.test("[comun] Content-Type es JSON", function () {
    pm.expect(pm.response.headers.get("Content-Type")).to.include("application/json");
  });
}
}
"""

# ---------------------------------------------------------------------------
# 00 - Setup: datos dinamicos desde la BD
# ---------------------------------------------------------------------------
SETUP_PRE = r"""
// Nueva corrida => nuevo runId (asi no se reutiliza el de una corrida vieja
// cuando se ejecuta desde la app de Postman).
pm.collectionVariables.set("runId", String(Date.now()));
pm.collectionVariables.set("descripcion", "G02-E2E-" + pm.collectionVariables.get("runId"));
"""

SETUP_TEST = r"""
// Escenario BDD: "Background - existen cuentas activas en PYG" (TR-00)
pm.test("Status 200 OK", function () {
  pm.response.to.have.status(200);
});

const body = pm.response.json();
pm.test("La consulta SQL devuelve al menos 2 cuentas activas en PYG", function () {
  pm.expect(body).to.have.property("data").that.is.an("array");
  pm.expect(body.rowCount).to.be.at.least(2);
  body.data.forEach(function (c) {
    pm.expect(c.activa).to.eql(true);
    pm.expect(c.moneda).to.eql("PYG");
  });
});

// Datos dinamicos: cuenta origen y destino salen de la BD, no del seed.
pm.collectionVariables.set("cuentaOrigenBase", utils.num(body.data[0].id));
pm.collectionVariables.set("cuentaDestinoBase", utils.num(body.data[1].id));
pm.collectionVariables.set("saldoOrigenBase", body.data[0].saldo);
console.log("Cuentas dinamicas -> origen:", body.data[0].id, "destino:", body.data[1].id);

// Segunda consulta: una cuenta INACTIVA (para el escenario negativo TR-02)
// y el mayor id de cuentas (para armar un id que seguro no existe, TR-07).
utils.sql(pm, setTimeout, 
  "SELECT (SELECT id FROM cuentas WHERE activa = $1 ORDER BY id LIMIT 1) AS inactiva, (SELECT MAX(id) FROM cuentas) AS max_id",
  [false]
, function (err, res) {
  pm.test("La BD devuelve una cuenta inactiva y el max(id) de cuentas", function () {
    pm.expect(err).to.eql(null);
    const row = res.json().data[0];
    pm.expect(row.max_id, "max_id").to.not.eql(null);
    pm.collectionVariables.set("cuentaInexistenteId", utils.num(row.max_id) + 100000);
    if (row.inactiva !== null) {
      pm.collectionVariables.set("cuentaInactivaId", utils.num(row.inactiva));
    } else {
      // Si nadie dejo cuentas inactivas, se usa un id inexistente: el GET
      // igual debe responder 404 (el endpoint filtra activa = true).
      pm.collectionVariables.set("cuentaInactivaId", utils.num(row.max_id) + 100000);
    }
  });
});
"""

# ---------------------------------------------------------------------------
# 01 - Consultas
# ---------------------------------------------------------------------------
GET_CUENTA_TEST = r"""
// Escenario BDD TR-01: consultar una cuenta activa
pm.test("Status 200 OK", function () {
  pm.response.to.have.status(200);
});

const cuenta = pm.response.json().data;
pm.test("Schema: la cuenta trae los campos esperados", function () {
  pm.expect(cuenta).to.include.all.keys("id", "usuario_id", "numero_cuenta", "tipo_cuenta", "moneda", "saldo", "activa", "created_at");
  pm.expect(["ahorro", "corriente"]).to.include(cuenta.tipo_cuenta);
  pm.expect(["PYG", "USD"]).to.include(cuenta.moneda);
});
pm.test("Es la cuenta pedida y esta activa", function () {
  pm.expect(utils.num(cuenta.id)).to.eql(Number(pm.collectionVariables.get("cuentaOrigenBase")));
  pm.expect(cuenta.activa).to.eql(true);
});

// Post-request: la API y la BD deben coincidir en saldo y numero de cuenta.
utils.sql(pm, setTimeout, 
  "SELECT numero_cuenta, saldo FROM cuentas WHERE id = $1",
  [utils.num(cuenta.id)]
, function (err, res) {
  pm.test("La BD confirma numero de cuenta y saldo devueltos por la API", function () {
    pm.expect(err).to.eql(null);
    const row = res.json().data[0];
    pm.expect(row.numero_cuenta).to.eql(cuenta.numero_cuenta);
    pm.expect(Number(row.saldo)).to.eql(Number(cuenta.saldo));
  });
});
"""

GET_CUENTA_INACTIVA_PRE = r"""
// Precondicion en BD: la cuenta a consultar NO debe estar activa.
utils.sql(pm, setTimeout, 
  "SELECT COUNT(*) AS activas FROM cuentas WHERE id = $1 AND activa = $2",
  [Number(pm.collectionVariables.get("cuentaInactivaId")), true]
, function (err, res) {
  if (err) { console.error("Precondicion SQL fallo:", err); return; }
  pm.variables.set("precondActivas", res.json().data[0].activas);
});
"""

GET_CUENTA_INACTIVA_TEST = r"""
// Escenario BDD TR-02: una cuenta inactiva no se expone
pm.test("Precondicion: la cuenta no esta activa en la BD", function () {
  pm.expect(Number(pm.variables.get("precondActivas"))).to.eql(0);
});
pm.test("Status 404 Not Found", function () {
  pm.response.to.have.status(404);
});
pm.test("Error NOT_FOUND con mensaje de cuenta", function () {
  const e = pm.response.json().error;
  pm.expect(e.code).to.eql("NOT_FOUND");
  pm.expect(e.message).to.match(/Cuenta no encontrada/i);
});
"""

LIST_CUENTAS_TEST = r"""
// Escenario BDD TR-01b: listar las cuentas activas de un usuario
pm.test("Status 200 OK", function () {
  pm.response.to.have.status(200);
});
const lista = pm.response.json().data;
pm.test("Devuelve un array con al menos una cuenta", function () {
  pm.expect(lista).to.be.an("array").that.is.not.empty;
});
pm.test("Todas las cuentas son del usuario pedido y estan activas", function () {
  const usuarioId = Number(pm.variables.get("usuarioIdOrigen"));
  lista.forEach(function (c) {
    pm.expect(utils.num(c.usuario_id)).to.eql(usuarioId);
    pm.expect(c.activa).to.eql(true);
  });
});
"""

LIST_CUENTAS_PRE = r"""
// Dato dinamico: el usuario duenho de la cuenta origen se lee de la BD.
utils.sql(pm, setTimeout, 
  "SELECT usuario_id FROM cuentas WHERE id = $1",
  [Number(pm.collectionVariables.get("cuentaOrigenBase"))]
, function (err, res) {
  if (err) { console.error(err); return; }
  pm.variables.set("usuarioIdOrigen", utils.num(res.json().data[0].usuario_id));
});
"""

# ---------------------------------------------------------------------------
# 02 - Transferencias: caso feliz con validacion SQL
# ---------------------------------------------------------------------------
POST_OK_PRE = r"""
// Caso feliz: usa los defaults de la coleccion (cuentas dinamicas de la BD).
// PRE-REQUEST: valida la precondicion en la BD antes de mutar:
//   - ambas cuentas existen y estan activas
//   - todavia no existe una transferencia con esta descripcion
const origen = Number(pm.collectionVariables.get("cuentaOrigenId"));
const destino = Number(pm.collectionVariables.get("cuentaDestinoId"));
const descripcion = pm.collectionVariables.get("descripcion");

utils.sql(pm, setTimeout, 
  "SELECT id, activa FROM cuentas WHERE id IN ($1, $2)",
  [origen, destino]
, function (err, res) {
  if (err) { console.error("Precondicion SQL fallo:", err); return; }
  const rows = res.json().data || [];
  const activas = rows.filter(function (r) { return r.activa === true; }).length;
  pm.variables.set("precondCuentasActivas", activas);
});

utils.sql(pm, setTimeout, 
  "SELECT COUNT(*) AS total FROM transferencias WHERE descripcion = $1",
  [descripcion]
, function (err, res) {
  if (err) { console.error(err); return; }
  pm.variables.set("totalAntes", res.json().data[0].total);
});
"""

POST_OK_TEST = r"""
// Escenario BDD TR-03: transferencia exitosa entre cuentas activas
pm.test("Precondicion BD: ambas cuentas estaban activas", function () {
  pm.expect(Number(pm.variables.get("precondCuentasActivas"))).to.eql(2);
});
pm.test("Precondicion BD: no existia una transferencia con esta descripcion", function () {
  pm.expect(Number(pm.variables.get("totalAntes"))).to.eql(0);
});
pm.test("Status 201 Created", function () {
  pm.response.to.have.status(201);
});

const t = pm.response.json().data;
pm.test("La respuesta refleja exactamente lo enviado", function () {
  pm.expect(utils.num(t.cuenta_origen_id)).to.eql(Number(pm.collectionVariables.get("cuentaOrigenId")));
  pm.expect(utils.num(t.cuenta_destino_id)).to.eql(Number(pm.collectionVariables.get("cuentaDestinoId")));
  pm.expect(Number(t.monto)).to.eql(Number(pm.collectionVariables.get("monto")));
  pm.expect(t.descripcion).to.eql(pm.collectionVariables.get("descripcion"));
});
pm.test("La transferencia nace en estado 'pendiente' y activa", function () {
  pm.expect(t.estado).to.eql("pendiente");
  pm.expect(t.activo).to.eql(true);
});

// Se guarda el id para los requests siguientes (encadenamiento).
pm.collectionVariables.set("transferenciaId", utils.num(t.id));

// POST-REQUEST: relee la fila en la BD para confirmar el INSERT.
utils.sql(pm, setTimeout, 
  "SELECT id, cuenta_origen_id, cuenta_destino_id, monto, descripcion, estado, activo FROM transferencias WHERE id = $1",
  [utils.num(t.id)]
, function (err, res) {
  pm.test("La BD confirma el INSERT con los mismos datos", function () {
    pm.expect(err).to.eql(null);
    const row = res.json().data[0];
    pm.expect(row, "No se encontro la transferencia en la BD").to.not.be.undefined;
    pm.expect(utils.num(row.cuenta_origen_id)).to.eql(utils.num(t.cuenta_origen_id));
    pm.expect(utils.num(row.cuenta_destino_id)).to.eql(utils.num(t.cuenta_destino_id));
    pm.expect(Number(row.monto)).to.eql(Number(t.monto));
    pm.expect(row.estado).to.eql("pendiente");
    pm.expect(row.activo).to.eql(true);
  });
});
"""

GET_TRANSFER_TEST = r"""
// Escenario BDD TR-04: consultar el comprobante de la transferencia creada
pm.test("Status 200 OK", function () {
  pm.response.to.have.status(200);
});
const t = pm.response.json().data;
pm.test("Devuelve la transferencia creada en el paso anterior", function () {
  pm.expect(utils.num(t.id)).to.eql(Number(pm.collectionVariables.get("transferenciaId")));
  pm.expect(t.descripcion).to.eql("G02-E2E-" + pm.collectionVariables.get("runId"));
  pm.expect(t.estado).to.eql("pendiente");
});
pm.test("Schema: comprobante con todos los campos", function () {
  pm.expect(t).to.include.all.keys("id", "cuenta_origen_id", "cuenta_destino_id", "monto", "descripcion", "estado", "created_at");
});
"""

LIST_TRANSFER_TEST = r"""
// Escenario BDD TR-05: historial por cuenta origen incluye la nueva transferencia
pm.test("Status 200 OK", function () {
  pm.response.to.have.status(200);
});
const lista = pm.response.json().data;
const origen = Number(pm.collectionVariables.get("cuentaOrigenBase"));
pm.test("Todas las transferencias listadas salen de la cuenta origen", function () {
  pm.expect(lista).to.be.an("array").that.is.not.empty;
  lista.forEach(function (t) { pm.expect(utils.num(t.cuenta_origen_id)).to.eql(origen); });
});
pm.test("El historial incluye la transferencia recien creada", function () {
  const id = Number(pm.collectionVariables.get("transferenciaId"));
  pm.expect(lista.map(function (t) { return utils.num(t.id); })).to.include(id);
});
"""

# ---------------------------------------------------------------------------
# 03 - Negativos (cada uno pisa UNA sola variable)
# ---------------------------------------------------------------------------
def negative(case_tag, override_js, expect_msg_regex, bdd_id, bdd_name):
    pre = f"""
// Escenario BDD {bdd_id}: {bdd_name}
// Caso negativo: se pisa UNA sola variable del body (el resto queda con el
// default que puso el Pre-request de la coleccion).
{override_js}
// Descripcion propia del caso, para contar filas sin interferencia de otros
// alumnos que usan la misma BD compartida.
pm.collectionVariables.set("descripcion", "G02-{case_tag}-" + pm.collectionVariables.get("runId"));

utils.sql(pm, setTimeout, 
  "SELECT COUNT(*) AS total FROM transferencias WHERE descripcion = $1",
  [pm.collectionVariables.get("descripcion")]
, function (err, res) {{
  if (err) {{ console.error("Precondicion SQL fallo:", err); return; }}
  pm.variables.set("totalAntes", res.json().data[0].total);
}});
"""
    test = f"""
// Escenario BDD {bdd_id}: {bdd_name}
pm.test("Status 400 Bad Request", function () {{
  pm.response.to.have.status(400);
}});
pm.test("Error VALIDATION_ERROR con el motivo esperado", function () {{
  const e = pm.response.json().error;
  pm.expect(e.code).to.eql("VALIDATION_ERROR");
  pm.expect(JSON.stringify(e)).to.match({expect_msg_regex});
}});

// POST-REQUEST: la BD NO debe haber cambiado.
utils.sql(pm, setTimeout, 
  "SELECT COUNT(*) AS total FROM transferencias WHERE descripcion = $1",
  [pm.collectionVariables.get("descripcion")]
, function (err, res) {{
  pm.test("La BD no registro ninguna transferencia nueva (COUNT antes = despues)", function () {{
    pm.expect(err).to.eql(null);
    const totalDespues = Number(res.json().data[0].total);
    pm.expect(totalDespues).to.eql(Number(pm.variables.get("totalAntes")));
    pm.expect(totalDespues).to.eql(0);
  }});
}});
"""
    return pre, test


NEG_MISMA_PRE, NEG_MISMA_TEST = negative(
    "NEG-MISMA-CUENTA",
    '// CASO PROPIO DEL GRUPO: origen === destino (viola el CHECK de la tabla).\n'
    'pm.collectionVariables.set("cuentaDestinoId", pm.collectionVariables.get("cuentaOrigenId"));',
    "/check constraint|transferencias_check/i",
    "TR-06", "rechazar transferencia a la misma cuenta",
)
NEG_MONTO_PRE, NEG_MONTO_TEST = negative(
    "NEG-MONTO-0",
    'pm.collectionVariables.set("monto", 0);',
    "/monto|greater than 0|too_small/i",
    "TR-07", "rechazar monto cero",
)
NEG_DESTINO_PRE, NEG_DESTINO_TEST = negative(
    "NEG-DESTINO-INEXISTENTE",
    '// id calculado en el Setup como MAX(id) + 100000 => seguro no existe.\n'
    'pm.collectionVariables.set("cuentaDestinoId", pm.collectionVariables.get("cuentaInexistenteId"));',
    "/foreign key|cuenta_destino_id_fkey/i",
    "TR-08", "rechazar cuenta destino inexistente",
)

NO_KEY_TEST = r"""
// Escenario BDD TR-09: sin credenciales no se puede operar
pm.test("Status 401 Unauthorized", function () {
  pm.response.to.have.status(401);
});
pm.test("Error UNAUTHORIZED", function () {
  pm.expect(pm.response.json().error.code).to.eql("UNAUTHORIZED");
});
"""

# ---------------------------------------------------------------------------
# 04 - Limpieza
# ---------------------------------------------------------------------------
DELETE_TEST = r"""
// Escenario BDD TR-10: anular (soft-delete) la transferencia de prueba
pm.test("Status 204 No Content", function () {
  pm.response.to.have.status(204);
});
utils.sql(pm, setTimeout, 
  "SELECT activo FROM transferencias WHERE id = $1",
  [Number(pm.collectionVariables.get("transferenciaId"))]
, function (err, res) {
  pm.test("La BD confirma el soft-delete (activo = false)", function () {
    pm.expect(err).to.eql(null);
    pm.expect(res.json().data[0].activo).to.eql(false);
  });
});
"""

GET_DELETED_TEST = r"""
// Escenario BDD TR-10b: una transferencia anulada ya no se expone
pm.test("Status 404 Not Found", function () {
  pm.response.to.have.status(404);
});
pm.test("Error NOT_FOUND", function () {
  pm.expect(pm.response.json().error.code).to.eql("NOT_FOUND");
});
"""

SQL_SETUP_BODY = json.dumps({
    "sql": "SELECT id, usuario_id, moneda, saldo, activa FROM cuentas WHERE activa = $1 AND moneda = $2 ORDER BY id LIMIT 2",
    "params": [True, "PYG"],
}, indent=2)

items = [
    folder("00 - Setup (datos dinamicos desde BD)",
           "Obtiene cuentas activas reales via /api/v1/sql/select. Nada de ids hardcodeados.", [
        req("00 - Setup: obtener cuentas activas PYG desde la BD", "POST", "/api/v1/sql/select",
            body=SQL_SETUP_BODY, pre=SETUP_PRE, test=SETUP_TEST),
    ]),
    folder("01 - Consultas de cuentas", "GET de cuentas: caso feliz, listado y cuenta inactiva.", [
        req("TR-01 - Consultar cuenta origen activa", "GET", "/api/v1/cuentas/{{cuentaOrigenBase}}",
            test=GET_CUENTA_TEST),
        req("TR-01b - Listar cuentas activas del usuario", "GET", "/api/v1/cuentas",
            query=[("usuarioId", "{{usuarioIdOrigen}}")], pre=LIST_CUENTAS_PRE, test=LIST_CUENTAS_TEST),
        req("TR-02 - Consultar cuenta inactiva (404)", "GET", "/api/v1/cuentas/{{cuentaInactivaId}}",
            pre=GET_CUENTA_INACTIVA_PRE, test=GET_CUENTA_INACTIVA_TEST),
    ]),
    folder("02 - Transferencias (E2E con validacion SQL)",
           "POST con precondicion en BD (pre-request) y relectura de la fila (post-request).", [
        req("TR-03 - Crear transferencia exitosa (INSERT + validacion SQL)", "POST", "/api/v1/transferencias",
            body=TRANSFER_BODY, pre=POST_OK_PRE, test=POST_OK_TEST),
        req("TR-04 - Consultar transferencia creada", "GET", "/api/v1/transferencias/{{transferenciaId}}",
            test=GET_TRANSFER_TEST),
        req("TR-05 - Historial por cuenta origen incluye la nueva", "GET", "/api/v1/transferencias",
            query=[("cuentaOrigenId", "{{cuentaOrigenBase}}")], test=LIST_TRANSFER_TEST),
    ]),
    folder("03 - Transferencias - casos negativos",
           "Cada caso pisa UNA sola variable y confirma con COUNT(*) que la BD no cambio.", [
        req("TR-06 - Rechazar transferencia a la misma cuenta (caso propio)", "POST", "/api/v1/transferencias",
            body=TRANSFER_BODY, pre=NEG_MISMA_PRE, test=NEG_MISMA_TEST),
        req("TR-07 - Rechazar monto 0", "POST", "/api/v1/transferencias",
            body=TRANSFER_BODY, pre=NEG_MONTO_PRE, test=NEG_MONTO_TEST),
        req("TR-08 - Rechazar cuenta destino inexistente", "POST", "/api/v1/transferencias",
            body=TRANSFER_BODY, pre=NEG_DESTINO_PRE, test=NEG_DESTINO_TEST),
        req("TR-09 - Rechazar request sin API key (401)", "GET", "/api/v1/transferencias/{{transferenciaId}}",
            auth=False, test=NO_KEY_TEST),
    ]),
    folder("04 - Limpieza", "Soft-delete de la transferencia creada, verificado en BD.", [
        req("TR-10 - Anular transferencia de prueba (soft-delete)", "DELETE",
            "/api/v1/transferencias/{{transferenciaId}}", test=DELETE_TEST),
        req("TR-10b - Transferencia anulada ya no se consulta (404)", "GET",
            "/api/v1/transferencias/{{transferenciaId}}", test=GET_DELETED_TEST),
    ]),
]

collection = {
    "info": {
        "_postman_id": str(uuid.uuid5(uuid.NAMESPACE_URL, "aiquaa-grupo02-transferencias")),
        "name": "C_GRUPO_02_KALE_TRANSFERENCIAS",
        "description": (
            "Grupo 02 - Transferencias entre Cuentas (AIQUAA Sandbox API).\nAutora: Kale\n\n"
            "- Variables de coleccion + environment\n"
            "- Assertions pm.test por request + validaciones comunes a nivel coleccion\n"
            "- Patron SQL REST dinamico: utils.bodySqlRest en el pre-request de la coleccion,\n"
            "  precondicion en BD en el pre-request y relectura de la BD en el post-request\n"
            "- Trazabilidad BDD -> API: grupos/grupo-02-transferencias-cuentas/docs/TRAZABILIDAD_BDD_API_KALE.md\n"
        ),
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    "event": [ev("prerequest", COLLECTION_PRE), ev("test", COLLECTION_TEST)],
    "variable": [
        {"key": "cuentaOrigenBase", "value": ""},
        {"key": "cuentaDestinoBase", "value": ""},
        {"key": "cuentaInactivaId", "value": ""},
        {"key": "cuentaInexistenteId", "value": ""},
        {"key": "saldoOrigenBase", "value": ""},
        {"key": "montoBase", "value": "15000"},
        {"key": "cuentaOrigenId", "value": ""},
        {"key": "cuentaDestinoId", "value": ""},
        {"key": "monto", "value": ""},
        {"key": "descripcion", "value": ""},
        {"key": "transferenciaId", "value": ""},
        {"key": "runId", "value": ""},
    ],
    "item": items,
}

environment = {
    "id": str(uuid.uuid5(uuid.NAMESPACE_URL, "aiquaa-grupo02-env")),
    "name": "E_GRUPO_02_KALE_TRANSFERENCIAS",
    "values": [
        {"key": "baseUrl", "value": BASE_URL, "type": "default", "enabled": True},
        {"key": "apiKey", "value": DEMO_KEY, "type": "secret", "enabled": True},
        {"key": "maxResponseMs", "value": "3000", "type": "default", "enabled": True},
    ],
    "_postman_variable_scope": "environment",
}

(ROOT / "postman").mkdir(exist_ok=True)
(ROOT / "postman/C_GRUPO_02_KALE_TRANSFERENCIAS.postman_collection.json").write_text(
    json.dumps(collection, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
(ROOT / "postman/E_GRUPO_02_KALE_TRANSFERENCIAS.postman_environment.json").write_text(
    json.dumps(environment, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
n = sum(len(f["item"]) for f in items)
print(f"Coleccion generada: {n} requests")
