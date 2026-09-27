# Trazabilidad BDD → API — Grupo 02 Transferencias entre Cuentas

Fuente BDD: [`grupos/grupo-02-transferencias-cuentas/features/F_GRUPO_02_KALE_TRANSFERENCIAS_API.feature`](../features/F_GRUPO_02_KALE_TRANSFERENCIAS_API.feature)
Colección: [`postman/C_GRUPO_02_KALE_TRANSFERENCIAS.postman_collection.json`](../../../postman/C_GRUPO_02_KALE_TRANSFERENCIAS.postman_collection.json)
Environment: [`postman/E_GRUPO_02_KALE_TRANSFERENCIAS.postman_environment.json`](../../../postman/E_GRUPO_02_KALE_TRANSFERENCIAS.postman_environment.json)
API: AIQUAA Sandbox API — `https://aiquaa-sandbox-api.vercel.app` (header `x-api-key`)

## Matriz de trazabilidad

| ID | Escenario BDD | Request Postman | Endpoint | Datos (origen) | Resultado esperado | Validación en BD (`/api/v1/sql/select`) |
|---|---|---|---|---|---|---|
| TR-00 | Antecedente: existen 2 cuentas activas PYG | `00 - Setup` | `POST /api/v1/sql/select` | BD: `cuentas` activas PYG | 200, `rowCount ≥ 2` | Guarda `cuentaOrigenBase`, `cuentaDestinoBase`, `cuentaInactivaId`, `cuentaInexistenteId` |
| TR-01 | Consultar una cuenta activa | `TR-01` | `GET /api/v1/cuentas/{id}` | `cuentaOrigenBase` (BD) | 200, schema, `activa = true` | `numero_cuenta` y `saldo` API = BD |
| TR-01b | Listar cuentas activas de un usuario | `TR-01b` | `GET /api/v1/cuentas?usuarioId=` | `usuario_id` leído de BD | 200, todas del usuario y activas | Pre-request lee el dueño de la cuenta |
| TR-02 | Cuenta inactiva no se consulta | `TR-02` | `GET /api/v1/cuentas/{id}` | `cuentaInactivaId` (BD) | 404 `NOT_FOUND` | Pre-request: `COUNT(*) activas = 0` |
| TR-03 | Transferencia interna exitosa | `TR-03` | `POST /api/v1/transferencias` | cuentas BD + monto 15000 | 201, `estado = pendiente`, eco de datos | Pre: cuentas activas y 0 filas con la descripción · Post: relee la fila (INSERT confirmado) |
| TR-04 | Consultar comprobante | `TR-04` | `GET /api/v1/transferencias/{id}` | `transferenciaId` (encadenado) | 200, mismos datos | — |
| TR-05 | Historial incluye la nueva | `TR-05` | `GET /api/v1/transferencias?cuentaOrigenId=` | `cuentaOrigenBase` | 200, contiene `transferenciaId` | — |
| TR-06 | **Caso propio:** misma cuenta origen = destino | `TR-06` | `POST /api/v1/transferencias` | pisa solo `cuentaDestinoId` | 400 `VALIDATION_ERROR` (CHECK `transferencias_check`) | `COUNT(*)` por descripción antes = después = 0 |
| TR-07 | Monto cero | `TR-07` | `POST /api/v1/transferencias` | pisa solo `monto = 0` | 400 `VALIDATION_ERROR` (zod `monto > 0`) | `COUNT(*)` antes = después = 0 |
| TR-08 | Cuenta destino inexistente | `TR-08` | `POST /api/v1/transferencias` | `MAX(id)+100000` (BD) | 400 `VALIDATION_ERROR` (FK) | `COUNT(*)` antes = después = 0 |
| TR-09 | Sin credenciales | `TR-09` | `GET /api/v1/transferencias/{id}` | sin `x-api-key` | 401 `UNAUTHORIZED` | — |
| TR-10 | Anular transferencia (limpieza) | `TR-10` / `TR-10b` | `DELETE` + `GET /api/v1/transferencias/{id}` | `transferenciaId` | 204 y luego 404 | `activo = false` en BD |

Validaciones comunes a **todos** los requests (Tests de la colección): tiempo de respuesta < `maxResponseMs` (3000 ms), no 429 (rate limit), `Content-Type` JSON.

## Variables

| Variable | Ámbito | Origen | Uso |
|---|---|---|---|
| `baseUrl`, `apiKey`, `maxResponseMs` | Environment | Configuración | URL, credencial y SLA de respuesta |
| `cuentaOrigenBase`, `cuentaDestinoBase` | Colección | BD (Setup) | Defaults del body, **no hardcodeados** |
| `cuentaInactivaId`, `cuentaInexistenteId` | Colección | BD (Setup) | Casos negativos TR-02 / TR-08 |
| `cuentaOrigenId`, `cuentaDestinoId`, `monto`, `descripcion` | Colección | Reset en el pre-request de la colección | Campos `{{variable}}` del body |
| `runId` | Colección | `Date.now()` en el Setup | Descripción única por corrida (BD compartida) |
| `transferenciaId` | Colección | Respuesta de TR-03 | Encadenamiento TR-04, TR-05, TR-09, TR-10 |

## Patrón SQL REST dinámico (Tarea 3.0)

1. **Pre-request de la COLECCIÓN**: declara `utils.bodySqlRest(sql, params)` una sola vez y
   resetea las variables del body a su default (cuentas dinámicas de la BD).
2. **Body legible**: JSON normal con `{{variable}}` solo en los campos que cambian.
3. **Pre-request del request**: valida la precondición en BD y, en los negativos, pisa **una
   sola** variable (`cuentaDestinoId`, `monto`).
4. **Tests (post-response)**: valida status/respuesta y relee la BD con `pm.sendRequest` para
   confirmar el INSERT, el soft-delete o que el `COUNT(*)` no cambió.

## Escenarios web (Cucumber + Playwright)

| ID | Feature | Pantalla | Validación en BD |
|---|---|---|---|
| WEB-LOGIN-01 | `F_GRUPO_02_LOGIN.feature` | `/curso` → `/auth/login` | — |
| WEB-LOGIN-02 | `F_GRUPO_02_LOGIN.feature` | `/auth/login` → `/` | Usuario activo con cuentas leído de BD |
| WEB-TR-01 | `F_GRUPO_02_KALE_TRANSFERENCIAS_WEB.feature` | `/transferencias` → `/transferencias/{id}` | Fila creada con monto/estado/descripción |
| WEB-TR-02 | ídem | `/transferencias` | `COUNT(*)` = 0 (misma cuenta) |
| WEB-TR-03 | ídem (Esquema, 2 ejemplos) | `/transferencias` | `COUNT(*)` = 0 (validación HTML5) |
| WEB-TR-04 | ídem | `/transferencias` (filtro) | — |
