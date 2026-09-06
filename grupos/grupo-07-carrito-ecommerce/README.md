# Grupo 07 — Carrito de Compras / E-commerce

**Módulo:** Checkout de un e-commerce (tablas `ordenes` + `items_orden`)
**Rama sugerida:** `grupo-07-carrito-ecommerce`

## Integrantes
- Juan Barreto	    juan.m.barretog@gmail.com
- Andrea Escurra    escurracaceres.andy@gmail.com
- Emilio Rojas	    emrojazg@gmail.com
- Armin Avezada     arminavq@fpuna.edu.py
- Felipe Rivas      danirivas64@fpuna.edu.py

## Alcance
Automatización del cierre de compra y ciclo de vida de la orden del sandbox (RF-G7-01..05):
listar, checkout transaccional (cálculo server-side del total), consulta con detalle,
recálculo de cabecera y baja lógica. Cubierto en tres capas:

- **BDD (feature):** `features/carrito-ecommerce.feature` — 18 escenarios `@grupo-7 @api`
  usando el catálogo de steps de la skill `bdd` (RF-G7-01..05, happy/negativo/edge).
  El stub original de alumnos quedó en `features/carrito-ecommerce.stub.feature.bak`.
- **API (Postman/Newman):** `postman/grupo-07-carrito-ecommerce.postman_collection.json`
  — 20 requests con `pm.test`, encadenando `ordenId`.
- **Agente de IA (ejemplo):** `agente-ia/` — agente function-calling que opera los 5 endpoints.

## Supuestos / brechas del diseño (documentadas como comportamiento esperado)
- `monto` y `subtotal` los calcula siempre el servidor; un total del cliente se ignora.
- `PUT /ordenes/{id}` recalcula `producto`/`monto` pero **no** toca `items_orden`: tras un
  recálculo, `GET /ordenes/{id}` muestra el detalle original desincronizado del nuevo monto.
- `DELETE /ordenes/{id}` es soft-delete (`activo=false`); deja `items_orden` huérfanos.

## Cómo ejecutar la regresión
```bash
# Postman/Newman
npm i -g newman
newman run postman/grupo-07-carrito-ecommerce.postman_collection.json \
  --env-var "baseUrl=http://localhost:3001" \
  --env-var "apiKey=TU_API_KEY"

# BDD (skill bdd) — requiere steps S_api.steps.ts y cucumber-js
npx cucumber-js --tags "@grupo-7"

# Agente de IA (demo)
cd agente-ia
BASE_URL=http://localhost:3001 API_KEY=TU_API_KEY node agent.mjs
```

## CI: regresión Postman automática

El workflow [`postman-grupo07-regression.yml`](../../.github/workflows/postman-grupo07-regression.yml)
corre esta colección con Newman en GitHub Actions (push/PR a `main` que toquen la colección, o
manual vía `workflow_dispatch`). Requiere configurar en el repo
(Settings → Secrets and variables → Actions):

- **Variable** `GRUPO07_BASE_URL` — URL del backend desplegado de `aiquaa-sandbox-api`
  (ej. `https://aiquaa-sandbox-api.vercel.app`).
- **Secret** `GRUPO07_API_KEY` — API key para el header `x-api-key`.

El run sube un único artifact **`informe-regresion-grupo07`** con el PDF de resultados
(`report.pdf`), generado con el reporter de
[`skills/postman-newman-skill/reporter/newman_report.py`](../../skills/postman-newman-skill/reporter/newman_report.py)
(reportlab + Pillow) a partir del `--reporter-json-export` de Newman: portada con banner/logos,
estadísticas (peticiones/pruebas/aprobadas/fallidas) y detalle por request (método, URL, status,
tiempo, cada `pm.test` con su resultado y el cuerpo de respuesta). Sin HTML ni XML intermedios en
el artifact — solo el PDF.

> **Nota:** la key de demo del sandbox tiene rate-limit propio (`429 RATE_LIMITED`); el workflow
> usa `--delay-request 800` para evitarlo. Con una key dedicada del equipo (sin ese límite
> compartido) la corrida debería ser estable y más rápida.

## Entregables (checklist ENTREGABLES.md)
- [x] Análisis y alcance (este README + feature)
- [x] BDD — `features/` (18 escenarios: happy path, negativo, edge case)
- [x] API — colección Postman/Newman (`postman/grupo-07-carrito-ecommerce.postman_collection.json`)
- [ ] UI — `tests/e2e/` con Playwright (pendiente: el front del sandbox no expone carrito)
- [ ] Evidencias en `evidence/`
- [ ] CI/CD verde
- [ ] PR a `main` usando la plantilla del repo

## Trazabilidad BDD -> API (AIQUAA)

> Flujo de **eliminar producto de carrito** (Happy Path) — colección
> `postman/grupo-07-andrea-escurra-carrito-e-commerce.postman_collection.json` (Andrea).
> El mismo flujo aplica como base para el **caso negativo**: tras la baja,
> la verificación devuelve `404` confirmando que el recurso ya no existe.

> **Nota (Andrea):** Mi trazabilidad cubre el caso de **eliminar producto de carrito**. Para poder eliminar, el flujo incluye como primer paso **agregar** una orden (precondición) y como último paso **consultar** para verificar la baja. Si otro/a compañero/a va a cubrir **solo** el escenario de "agregar producto", ese caso estará documentado aparte para no duplicar ni confundir responsabilidades.

> **Nota (Tarea 3):** La validación de BD (SQL REST) aplica solo a los DELETE (caso feliz y negativo). `1-Crear Orden` es setup sin SQL porque el escenario de creación/checkout lo cubre otro integrante del grupo en la colección oficial; el pre-request de colección solo define el helper `utils`, no valida BD.

| Paso | Acción BDD | Tipo | Endpoint | Método | Datos Entrada | Validaciones / Assertions |
|---|---|---|---|---|---|---|
| 1 | Agregar producto al carrito (precondición) | Setup | `{{baseUrl}}/api/v1/ordenes` | POST | `usuarioId: 3`, `items: [{ producto: "Cable HDMI", cantidad: 1, precioUnitario: 50000 }]` | Status **201**, guarda `eliminarId` |
| 2 | Eliminar el producto del carrito | Happy Path | `{{baseUrl}}/api/v1/ordenes/{{eliminarId}}` | DELETE | `eliminarId` de la orden creada | Status **204** (baja exitosa) |
| 3 | Verificar que el producto ya no existe | Verificación | `{{baseUrl}}/api/v1/ordenes/{{eliminarId}}` | GET | `eliminarId` | Status **404** (orden dada de baja) |

## Variables de Entorno Utilizadas

- `baseUrl` → `https://aiquaa-sandbox-api.vercel.app`
- `apiKey` → `sbx_demo_f581ca21e68a347288c94d71`
- `eliminarId` → se setea automáticamente desde la respuesta del paso 1

## Tarea 3 — Verificación de BD (SQL REST)

> Tarea asincrónica grupal (semana 03): no creerle a la API solo por el status code — volver a
> **consultar la base de datos** antes y después de cada operación de escritura para confirmar
> que el cambio realmente quedó (o, en un caso negativo, que la BD no cambió).

### Patrón

Cada operación se valida **dos veces** contra la BD vía el endpoint de solo lectura
`POST {{baseUrl}}/api/v1/sql/select` (header `x-api-key`):

```
ANTES   (Pre-request Script)  → leo la BD antes de tocar
↓
LA ACCIÓN  (POST / DELETE)
↓
DESPUÉS (Tests Script)        → vuelvo a la BD y confirmo
```

- Si la operación **debe cambiar** la BD (caso feliz) → después se confirma el cambio.
- Si la operación **debe rechazarse** (caso negativo) → después se confirma que el `COUNT(*)` no cambió.

### Implementación — flujo de Andrea (Eliminar producto de carrito)

Colección: [`postman/grupo-07-andrea-escurra-carrito-e-commerce.postman_collection.json`](../../postman/grupo-07-andrea-escurra-carrito-e-commerce.postman_collection.json)

| # | Request | Método | Status | Validación BD (SQL REST) |
|---|---|---|---|---|
| 1 | `1-Crear Orden` (setup, sin SQL) | POST `/api/v1/ordenes` | 201 | — (setup: guarda `eliminarId`; el POST lo cubre el integrante de checkout) |
| 2 | `2-Dar de Baja` ⭐ caso feliz | DELETE `/api/v1/ordenes/{{eliminarId}}` | 204 | ANTES: `SELECT id, activo FROM ordenes WHERE id = $1` → `activo=true` · DESPUÉS: misma consulta → `activo=false` |
| 3 | `3-Verificar Baja` | GET `/api/v1/ordenes/{{eliminarId}}` | 404 | Verificación vía API (NOT_FOUND) |
| 4 | `4-Orden inexistente (404, BD sin cambios)` ⭐ caso negativo | DELETE `/api/v1/ordenes/999999` | 404 | ANTES: `SELECT COUNT(*) AS total FROM ordenes` · DESPUÉS: mismo COUNT igual (la BD no cambió) |

### Manejo de variables

- **Pre-request de colección** (una sola vez): define el helper `utils.bodySqlRest(sql, params)`
  que arma la llamada a `/api/v1/sql/select`, y el valor por defecto `usuarioId = 3`.
- `{{usuarioId}}` en el body del POST (`1-Crear Orden`) y `{{eliminarId}}` en la URL del DELETE.
- `totalAntes` se guarda con `pm.variables.set(...)` en el pre-request del caso negativo.
- **Pitfall respetado:** los valores que devuelve `/api/v1/sql/select` vienen como **string**;
  se convierten con `Number(...)` / `String(...)` antes de comparar.

### Evidencia

`evidence/semana-03/` → `newman-report-andrea.json`, `newman-junit-andrea.xml` y
`RESUMEN-EJECUCION-andrea.md` (corrida Newman 6.2.1 de Andrea Escurra: 8 requests, 8 assertions,
0 fallos). Cada integrante agrega sus archivos con su prefijo (`*-juan.json`, `*-aramin.xml`,
etc.) al entregar su escenario.
