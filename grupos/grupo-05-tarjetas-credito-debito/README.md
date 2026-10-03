# Grupo 05 — Tarjetas de Crédito/Débito

**Módulo:** Gestión de tarjetas
**Rama:** `grupo-05-tarjetas-credito-debito`

## Integrantes

- Marcos Trinidad ---> (trinidad.py@gmail.com)
- Rafael Estigarribia ---> (rafaer93@gmail.com)
- Emilio Oheler ---> (ohelerhernan@gmail.com)
- Matias Murto ---> (matiasmurto1@gmail.com)
- Ivan Bolaños ---> (ivanbolanos92@gmail.com)

## Alcance

- **Objetivo:** validar las gestiones que el cliente realiza sobre sus tarjetas de
  crédito/débito: consulta de datos, cambio de PIN, bloqueo y desbloqueo, modificación
  de límites y pago de la tarjeta desde cuenta propia.
- **Supuestos:**
  - El cliente está autenticado en la app con biometría válida y posee al menos una
    tarjeta de crédito/débito vigente.
  - Las operaciones sensibles (cambio de límite) requieren confirmación por OTP.
  - Los datos de tarjeta usados en las pruebas son de prueba, nunca reales.
- **Riesgos:**
  - Los cambios de estado de tarjeta (bloqueo/desbloqueo) deben propagarse a todos los
    canales; una propagación asíncrona puede generar resultados intermitentes.
  - La dependencia de OTP y biometría exige datos de prueba controlados.
- **Cobertura incluida:** consulta de datos de la tarjeta, cambio de PIN, bloqueo
  temporal por pérdida, desbloqueo, aumento de límite diario (con OTP válido e inválido)
  y pago desde cuenta propia.
- **Cobertura excluida:** alta y emisión de tarjetas, tarjetas adicionales, 3-D Secure,
  reversos y reclamos, y conciliación con la marca (Visa/Mastercard).

## Escenarios entregados

18 escenarios en total, repartidos en dos archivos:

- [`bdd/features/tarjetas/F_TARJETAS.feature`](bdd/features/tarjetas/F_TARJETAS.feature) — 16
  escenarios: **6 automatizados** (`@G05-TARJ-001..006`, API + BD + web), **9 `@manual
  @sin-endpoint`** y **1 `@manual @defecto`** (el bloqueo desde el listado web, que falla:
  [`DEF-G05-01`](docs/DEFECTOS.md)).
- [`bdd/features/autenticacion/F_LOGIN.feature`](bdd/features/autenticacion/F_LOGIN.feature) — 2 escenarios
  automatizados de acceso (`@G05-LOGIN-001..002`).

Por tipo: 6 happy paths, 3 casos negativos (OTP inválido, PIN actual incorrecto, saldo
insuficiente) y 2 edge cases (compra igual al límite diario, desbloqueo denegado por motivo
"ROBO"), más los de login y el del defecto.

Los 10 escenarios `@manual` se ejecutaron a mano y están asentados en
[`docs/EJECUCION-MANUAL.md`](docs/EJECUCION-MANUAL.md): 9 en `BLOQUEADO` por falta de endpoints
en el sandbox (evidencia verificada el 2026-10-02) y 1 en `FALLA` por `DEF-G05-01`.

## Entregables

Checklist según [ENTREGABLES.md](../../ENTREGABLES.md):

- [x] Análisis y alcance
- [x] BDD — `bdd/features/` (happy path, caso negativo y edge case cubiertos), ejecutable con Cucumber + POM
- [x] API — colección Postman/Newman
- [x] UI — Playwright + BDD web con Page Objects (`LoginPage`, `TarjetasPage`)
- [x] Evidencias en `evidence/semana-03/` (Newman) y `evidence/semana-06/` (capturas, respuestas API, clasificación de fallos e informes PDF)
- [x] Rendimiento — plan JMeter + CSV (`tests/performance/`, ver más abajo)
- [x] CI/CD — workflow propio de BDD + Playwright
- [x] PR a `main` usando la plantilla del repo

## Trazabilidad BDD -> API (AIQUAA)

| Escenario BDD | Tipo | Endpoint AIQUAA / Postman | Método | Datos Entrada | Validaciones / Assertions |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **Ver datos tarjeta** | Happy Path | `https://aiquaa-sandbox-api.vercel.app/api/v1/tarjetas/:id` | `GET` | `id` de la tarjeta | Status 200, `data` presente, contiene `id`, `numero_enmascarado`, `tipo`, `marca`, `estado`. |
| **Bloqueo temporal por tarjeta perdida** | Happy Path | `https://aiquaa-sandbox-api.vercel.app/api/v1/tarjetas/:id/bloquear` | `PATCH` | `id` de la tarjeta | Status 200, `estado` = `"bloqueada"`, contiene `id`, `usuario_id`, `tipo`, `marca`, `numero_enmascarado`, `estado`, `activo`. |
| **Desbloqueo exitoso de tarjeta bloqueada** | Happy Path | `https://aiquaa-sandbox-api.vercel.app/api/v1/tarjetas/:id/activar` | `PATCH` | `id` de la tarjeta | Status 200, `data` presente, `estado` = `"activa"`. |

## Variables de Entorno Utilizadas

* **`Api-Key`**: clave de autenticación (`x-api-key`) para las peticiones a la sandbox de AIQUAA.

## Validación SQL dinámica (pre-request + post-response)

Carpeta `E2E - Flujos con validacion SQL` en la colección Postman, sobre `PATCH /api/v1/tarjetas/:id/bloquear` y `/activar` (columna `estado` de la tabla `tarjetas`). Sigue el patrón de [`docs/TAREA-SQL-REST-DINAMICO.md`](../../docs/TAREA-SQL-REST-DINAMICO.md) y de la skill `postman-newman` (`skills/postman-newman-skill/skills/postman-newman/references/sql-prerequest-pattern.md`).

- Pre-request Script de la colección: helper `utils.bodySqlRest(sql, params)` (consulta `/api/v1/sql/select`) declarado una sola vez, y default `tarjetaId = 1`.
- **Bloquear tarjeta (UPDATE + validación SQL)**: pre-request confirma en la BD que la tarjeta id=1 está `activa`; post-response relee la BD y confirma `estado = 'bloqueada'`.
- **Activar tarjeta (UPDATE + validación SQL)**: cierra el ciclo — confirma `bloqueada` antes, `activa` después. La corrida completa deja la BD en el mismo estado en que empezó (repetible).
- **Bloquear tarjeta - id inexistente (validación negativa)**: sobreescribe `tarjetaId` a `999999`; la API responde 404 y un `COUNT(*)` antes/después confirma que no se modificó ninguna fila.

Evidencia de la corrida (Newman): [`evidence/semana-03/newman-sql-e2e.txt`](evidence/semana-03/newman-sql-e2e.txt) — 9 requests, 8/8 assertions OK.

## Pruebas de rendimiento (JMeter)

Plan del grupo: [`tests/performance/plans/Grupo05_Tarjetas_v1.jmx`](tests/performance/plans/Grupo05_Tarjetas_v1.jmx),
ejecutado en CI por [`jmeter-grupo05-performance.yml`](../../.github/workflows/jmeter-grupo05-performance.yml).

| Ruta | Qué es |
|------|--------|
| `tests/performance/plans/Grupo05_Tarjetas_v1.jmx` | Plan de carga: consulta y emisión de tarjetas. |
| `tests/performance/data/grupo05_consulta_tarjetas.csv` | `tarjetaId,codigoEsperado` para el GET. |
| `tests/performance/data/grupo05_emision_tarjetas.csv` | `usuarioId,tipo,marca,codigoEsperado` para el POST. |
| `tests/performance/properties/local.properties` | Host, carga y rutas para correr en local con `jmeter -p`. |
| `tests/performance/thresholds/thresholds.json` | SLA propio del grupo: global y por operación. |
| `scripts/capturar-dashboard.js` | Captura el dashboard de monitoreo como evidencia del informe. |

### Pipeline, monitoreo y reportería (semana 5)

El workflow [`jmeter-grupo05-performance.yml`](../../.github/workflows/jmeter-grupo05-performance.yml)
encadena la corrida de carga, el monitoreo y el informe en un solo pipeline:

1. espera cupo en el rate limit del sandbox (la API key es compartida por toda la clase);
2. ejecuta el plan JMeter headless (`-n -t … -l … -e -o dashboard`);
3. **captura el dashboard de Grafana** del sandbox
   ([`aiquaa Sandbox API - qa_training`](https://purplespinach239.grafana.net/public-dashboards/ce95c3fa413048d3a79d3c6fc60de958))
   justo después de la corrida, cuando ya refleja la carga generada;
4. genera el informe PDF con
   [`aiquaa-performance-mcp-server`](https://github.com/stevenayal/aiquaa-performance-mcp-server)
   (`--report`), incrustando esa captura con `--evidence-image`, `--evidence-label` y
   `--evidence-url`;
5. evalúa los umbrales del SLA (`--evaluate`), que es el gate que hace fallar el job;
6. publica el PDF como artefacto propio y la carpeta completa de resultados (JTL, dashboard HTML
   y evidencia) como un segundo artefacto.

La captura usa Playwright, que ya es dependencia del repositorio, en vez del script Selenium que
trae el MCP server: evita sumar Python y chromedriver al runner. El paso es `continue-on-error`,
así que si Grafana no responde el informe igual se genera, sin el anexo, y el job avisa con un
`::warning::`.

```bash
# correr la captura a mano (por ejemplo para revisar el encuadre)
node grupos/grupo-05-tarjetas-credito-debito/scripts/capturar-dashboard.js \
  --url "https://purplespinach239.grafana.net/public-dashboards/ce95c3fa413048d3a79d3c6fc60de958" \
  --output test-results/performance/grupo05/evidence/EVIDENCIA_MONITOREO.png

# generar el informe desde un .jtl existente, con la evidencia adjunta
npx -y aiquaa-performance-mcp-server --report \
  test-results/performance/grupo05/R_GRUPO05_TARJETAS.jtl \
  grupos/grupo-05-tarjetas-credito-debito/tests/performance/thresholds/thresholds.json \
  test-results/performance/grupo05/INFORME_PERF_GRUPO05.pdf \
  --api-name "AIQUAA Sandbox API (tarjetas credito/debito)" --test-type carga \
  --evidence-image test-results/performance/grupo05/evidence/EVIDENCIA_MONITOREO.png \
  --evidence-label "Dashboard de monitoreo - aiquaa Sandbox API"
```

El pipeline corre en cada PR a `main` que toque el plan, los CSV, el script de captura o el
propio workflow, y a demanda por `workflow_dispatch`, donde se pueden ajustar `threads`, `loops`
y la URL del dashboard a capturar.

### Qué cubre

1. **Consulta — `GET /api/v1/tarjetas/{id}`**, con ids del CSV: ids del seed (200), un id
   inválido (`0` → 400) y uno inexistente (`9999` → 404).
2. **Creación — `POST /api/v1/tarjetas`**, con filas válidas (201) y de borde
   (`usuarioId` 0 e inexistente, `tipo` y `marca` fuera del enum → 400).
3. **Dato dinámico**: un JSON Extractor toma `$.data.id` de la respuesta del POST y un
   If Controller encadena `GET /api/v1/tarjetas/${tarjetaCreadaId}`, que valida 200 y que
   el `id` devuelto sea el mismo que emitió la creación. Así la prueba no depende de ids
   fijos del seed, que otros grupos borran (el id 1 del seed ya no existe).

Cada fila del CSV lleva el código HTTP que espera, y la Response Assertion compara contra
esa columna con *ignorar estado* activado: un 400 esperado cuenta como éxito y un 429 del
rate limit cuenta como fallo, que es justamente lo que interesa medir.

### Restricciones de la API

El sandbox limita a **30 req/min por api-key** y responde `429` al pasarse. Esa ventana es de
la key, no de la corrida, y la key pública la comparte toda la clase: dos ejecuciones
simultáneas se roban el cupo entre sí y las dos terminan en 429. Tres defensas:

1. El plan lleva un Constant Throughput Timer a **18 muestras/min** sobre todo el grupo de
   hilos, con margen para el tráfico ajeno.
2. El workflow declara `concurrency: aiquaa-sandbox-grupo05`, que serializa sus propias
   corridas en vez de cancelarlas.
3. Antes de arrancar, el workflow espera hasta 6 minutos a que **haya cupo** en la ventana.
   Mide holgura, no disponibilidad: manda una ráfaga de 5 requests y solo arranca si
   ninguna dio 429. Sondear una sola no alcanza, porque mientras otra corrida se mantenga
   bajo las 30/min la API responde 200 y el límite se pasa recién al sumarnos nosotros.

Las dos defensas de arriba viven en
[`scripts/esperar-cupo-api.sh`](scripts/esperar-cupo-api.sh) y en el grupo de concurrencia
`aiquaa-sandbox-grupo05`, que comparten **los dos workflows del grupo** — el de JMeter y el
de Newman —, porque el límite es por api-key y no por corrida. La colección Postman corre
además con `--delay-request 2500`: sus 16 requests a 500 ms eran un pico de más de 100
req/min.

Los archivos de performance viven **dentro de la carpeta del grupo**, no en
`tests/performance/` de la raíz, igual que los del grupo 07. No es cosmético: el plan del
curso ([`jmeter-performance.yml`](../../.github/workflows/jmeter-performance.yml)) se
dispara con el filtro `tests/performance/**` y corre a 27 muestras/min sobre la misma key,
así que teniéndolos en la raíz arrancaba en paralelo con el nuestro en cada sincronización
del PR y los dos se pisaban. Desde su propia carpeta, ese workflow ya no los alcanza.

En local, conviene esperar un minuto entre corridas por el mismo motivo.

`threads` (2), `loops` (5) y `rampUp` (0) son propiedades: se cambian con `-J` sin tocar el plan.

### Correr en local

```bash
jmeter -n -p grupos/grupo-05-tarjetas-credito-debito/tests/performance/properties/local.properties \
  -t grupos/grupo-05-tarjetas-credito-debito/tests/performance/plans/Grupo05_Tarjetas_v1.jmx \
  -l test-results/performance/grupo05/R_GRUPO05_TARJETAS.jtl \
  -e -o test-results/performance/grupo05/dashboard \
  -JapiKey=<api-key> \
```

La api key **no está en el plan**: entra por `-JapiKey`. En CI la aporta el secret
`GRUPO05_API_KEY`; si no está cargado, el workflow cae a la key pública de la sandbox que
se repartió en clase.

Informe PDF a partir del `.jtl`, con el MCP del curso:

```bash
npx -y aiquaa-performance-mcp-server --report \
  test-results/performance/grupo05/R_GRUPO05_TARJETAS.jtl \
  grupos/grupo-05-tarjetas-credito-debito/tests/performance/thresholds/thresholds.json \
  test-results/performance/grupo05/INFORME_PERF_GRUPO05.pdf \
  --api-name "AIQUAA Sandbox API (tarjetas credito/debito)" \
  --plan grupos/grupo-05-tarjetas-credito-debito/tests/performance/plans/Grupo05_Tarjetas_v1.jmx \
  --test-type carga
```

### SLA y el cold start de la sandbox

[`thresholds/thresholds.json`](tests/performance/thresholds/thresholds.json) declara 5 % de
error máximo y p95 bajo 2000 ms, tanto global como **por operación**, así un endpoint lento
no se esconde detrás del promedio de los otros dos.

La carga por defecto es de 2 hilos × 10 iteraciones, o sea **20 muestras por operación**, y
esa cifra no es arbitraria. La API corre en Vercel: la primera request despierta la función
y tarda entre 2 y 8 segundos, contra los ~200 ms de las siguientes. Con 10 muestras por
operación ese pico aislado cae justo en el percentil 95 y tumba el SLA aunque el 100 % de
las respuestas haya sido correcta — pasó en la corrida de CI del 14/09. Con 20 muestras, el
mismo pico cae en el p99 y el p95 refleja el comportamiento real.

Bajar `loops` para que la corrida termine antes reintroduce el problema.

### Mantenimiento del CSV de consulta

Los ids del seed se borran con el uso. Si una fila `200` empieza a dar 404, se refresca la
columna con los ids vigentes; el tramo dinámico (punto 3) no necesita mantenimiento.

## Semana 06 — BDD con Cucumber + POM (web + API + base de datos)

Los escenarios del módulo se ejecutan con Cucumber contra el sandbox real
(`https://aiquaa-sandbox-web.vercel.app/`) y dejan evidencia trazable por ID. La suite sigue la
arquitectura **Cucumber + BDD + POM** de
[`skills/playwright-ai-agents-skill`](https://github.com/stevenayal/proyect_base_automatizacion/tree/main/skills/playwright-ai-agents-skill)
(la skill de la clase de la semana 6):

- `.feature` en lenguaje de negocio (`F_*.feature`), sin endpoints, selectores ni URLs;
- steps de negocio (`S_*.steps.ts`): un step = una llamada a un Page Object o a la API;
- `world.ts` con Page Objects lazy (`this.login`, `this.tarjetas`) y la API del módulo
  (`this.api`), que concentra endpoints, reintentos y la verificación SQL;
- plan con riesgos y contrato de `data-testid` en
  [`bdd/specs/PLAN_TARJETAS.md`](bdd/specs/PLAN_TARJETAS.md);
- perfil `dryrun` como gate de CI (0 steps sin definir) y Failure Classifier determinístico
  sobre el JSON de Cucumber, sin IA en la ejecución.

Todo vive en la carpeta del grupo: la skill está en `main`, así que el classifier se copió en
[`bdd/scripts/classify-failures.mjs`](bdd/scripts/classify-failures.mjs) para no depender de un
merge.

```bash
CFG=grupos/grupo-05-tarjetas-credito-debito/bdd/cucumber.js
npx cucumber-js --config $CFG --profile dryrun     # catálogo: 0 undefined
npx cucumber-js --config $CFG --profile grupo05    # 8 escenarios automatizados
node grupos/grupo-05-tarjetas-credito-debito/bdd/scripts/classify-failures.mjs \
  --input results/grupo05/cucumber-report.json --out results/grupo05/CLASIF_BDD_GRUPO05.json
```

### Artefactos

| Artefacto | Ruta |
| :--- | :--- |
| Plan | [`bdd/specs/PLAN_TARJETAS.md`](bdd/specs/PLAN_TARJETAS.md) |
| Feature — acceso | [`bdd/features/autenticacion/F_LOGIN.feature`](bdd/features/autenticacion/F_LOGIN.feature) |
| Feature — tarjetas | [`bdd/features/tarjetas/F_TARJETAS.feature`](bdd/features/tarjetas/F_TARJETAS.feature) |
| Steps | [`bdd/steps/S_autenticacion.steps.ts`](bdd/steps/S_autenticacion.steps.ts) · [`S_tarjetas.steps.ts`](bdd/steps/S_tarjetas.steps.ts) |
| World / hooks / API | [`bdd/support/world.ts`](bdd/support/world.ts) · [`hooks.ts`](bdd/support/hooks.ts) · [`tarjetas-api.ts`](bdd/support/tarjetas-api.ts) |
| Perfiles Cucumber | [`bdd/cucumber.js`](bdd/cucumber.js) (`grupo05`, `smoke`, `dryrun`) |
| Failure Classifier | [`bdd/scripts/classify-failures.mjs`](bdd/scripts/classify-failures.mjs) |
| Page Objects | [`playwright/pages/LoginPage.ts`](playwright/pages/LoginPage.ts) · [`TarjetasPage.ts`](playwright/pages/TarjetasPage.ts) |
| Smoke Playwright | [`tests/e2e/T_TARJETAS_SMOKE.spec.ts`](tests/e2e/T_TARJETAS_SMOKE.spec.ts) |
| Ejecución manual | [`docs/EJECUCION-MANUAL.md`](docs/EJECUCION-MANUAL.md) |
| Defectos | [`docs/DEFECTOS.md`](docs/DEFECTOS.md) |
| CI | [`.github/workflows/Y_GRUPO05_bdd.yml`](../../.github/workflows/Y_GRUPO05_bdd.yml) |
| Evidencia | [`evidence/semana-06/`](evidence/semana-06/) |
| Informe PDF BDD | [`evidence/semana-06/INFORME_BDD_GRUPO_05.pdf`](evidence/semana-06/INFORME_BDD_GRUPO_05.pdf) — incluye el anexo con las evidencias incrustadas |
| Informe PDF E2E | [`evidence/semana-06/INFORME_E2E_GRUPO_05.pdf`](evidence/semana-06/INFORME_E2E_GRUPO_05.pdf) |
| Clasificación de fallos | [`evidence/semana-06/CLASIF_BDD_GRUPO05.json`](evidence/semana-06/CLASIF_BDD_GRUPO05.json) |

### Trazabilidad escenario ↔ evidencia

Cada escenario automatizado lleva su ID como tag. El hook `After` guarda la evidencia con ese
mismo ID: captura `.png` para los escenarios web, `.json` con la última respuesta para los de
API. Patrón de archivo: `<ID>-<PASSED|FAILED>-<timestamp>`.

| ID | Escenario | Capa | Criterio de aceptación | Resultado |
| :--- | :--- | :--- | :--- | :---: |
| `G05-LOGIN-002` | El botón de ingresar arranca deshabilitado | web | el formulario no permite enviar sin email cargado | ✅ |
| `G05-LOGIN-001` | Acceso rechazado para un email no registrado | web | mensaje de error controlado, sin revelar si el usuario existe | ✅ |
| `G05-TARJ-001` | Ver datos tarjeta | api | la consulta devuelve identificación y estado vigente | ✅ |
| `G05-TARJ-002` | Bloqueo de tarjeta por reporte de pérdida | api + bd | el bloqueo se persiste en la base, no solo en la respuesta | ✅ |
| `G05-TARJ-003` | Desbloqueo exitoso de tarjeta bloqueada | api + bd | la tarjeta vuelve a estado activo y la base lo refleja | ✅ |
| `G05-TARJ-004` | Consulta de una tarjeta inexistente | api | 404 con código de error tipificado | ✅ |
| `G05-TARJ-005` | Consulta de la tarjeta desde la interfaz web | web + api | el cliente encuentra su tarjeta filtrando y abre su detalle | ✅ |
| `G05-TARJ-006` | Edición de la tarjeta desde la interfaz web | web + api + bd | la edición hecha en pantalla queda persistida en la base | ✅ |

### Alcance real de la automatización

De los 11 escenarios acordados por el equipo, **4 tienen endpoint en el sandbox** y se
automatizaron; los otros **7 quedan como `@manual @sin-endpoint`** dentro del mismo `.feature`,
porque la API solo expone:

```
GET   /api/v1/tarjetas
POST  /api/v1/tarjetas
GET   /api/v1/tarjetas/{id}
PATCH /api/v1/tarjetas/{id}/bloquear
PATCH /api/v1/tarjetas/{id}/activar
```

No existen endpoints de PIN, OTP, límites de compra ni pago de tarjeta (verificado en
`/api/v1/docs`), así que esos casos se ejecutan de forma manual y quedan documentados en el
feature en vez de simularse con mocks que no probarían nada del sistema real.

A los 4 automatizados por API se sumaron 2 escenarios de interfaz (`G05-TARJ-005/006`), que
cierran el ciclo **acción en pantalla → efecto en la API → efecto persistido en la base**.

### Defecto detectado

**DEF-G05-01 — los botones "Bloquear" y "Activar" del listado de tarjetas no hacen nada.**

Al hacer click sobre ellos no se dispara ninguna petición: el estado no cambia en pantalla ni en
la API. La misma operación por API (`PATCH /api/v1/tarjetas/{id}/bloquear`) funciona, y el
formulario de edición del detalle sí envía su `PUT /api/proxy/tarjetas/{id}`, lo que acota el
problema al handler de esos dos botones del listado. El escenario correspondiente quedó
documentado en el feature con tags `@manual @defecto`, sin automatizar en verde, para no
normalizar el defecto como comportamiento esperado. Ficha completa, con evidencia técnica y
pasos de reproducción, en [`docs/DEFECTOS.md`](docs/DEFECTOS.md).

### Ejecución

```bash
npm install
npx playwright install chromium
cp .env.example .env          # completar SANDBOX_API_KEY

# La config de Cucumber del grupo vive en bdd/cucumber.js, no en la raiz del repo
BDD=grupos/grupo-05-tarjetas-credito-debito/bdd

npx cucumber-js --config $BDD/cucumber.js --profile grupo05                       # los 8 escenarios
npx cucumber-js --config $BDD/cucumber.js --profile dryrun                        # valida que no falte ningun step
npx cucumber-js --config $BDD/cucumber.js --profile grupo05 --tags "@api"         # solo capa API
npx cucumber-js --config $BDD/cucumber.js --profile grupo05 --tags "@G05-TARJ-002" # un escenario puntual
HEADED=true npx cucumber-js --config $BDD/cucumber.js --profile grupo05           # con navegador visible

npx playwright test grupos/grupo-05-tarjetas-credito-debito # smoke UI con Playwright puro

# informe PDF del BDD (requiere: pip install reportlab pillow)
python skills/bdd-skill/reporter/bdd_report.py \
  --results results/grupo05/cucumber-report.json \
  --output grupos/grupo-05-tarjetas-credito-debito/evidence/semana-06/INFORME_BDD_GRUPO_05.pdf \
  --grupo "Grupo 05 - Tarjetas de Credito/Debito"
```

Variables de entorno relevantes (`.env`):

| Variable | Default | Uso |
| :--- | :--- | :--- |
| `BASE_URL` | `https://aiquaa-sandbox-web.vercel.app/` | sitio bajo prueba |
| `API_URL` | `https://aiquaa-sandbox-api.vercel.app` | API del sandbox |
| `SANDBOX_API_KEY` | — | cabecera `x-api-key` de los steps `@api` y `@db` |
| `SANDBOX_CURSO` | `1` | curso elegido en la pantalla previa al login |
| `SANDBOX_USUARIO_ID` | `1` | usuario dueño de las tarjetas sembradas |
| `SANDBOX_EMAIL_CLIENTE` | `bruno.ramirez@example.com` | cliente usado en los escenarios web |
| `EVIDENCE_DIR` | — | carpeta donde se guarda la evidencia con ID |
| `STEP_TIMEOUT_MS` | `75000` | timeout por step de Cucumber |
| `RATE_LIMIT_WAIT_MS` | `20000` | espera antes de reintentar tras un 429 |
| `HEADED` | `false` | `true` abre el navegador |

> El perfil `grupo05` de [`cucumber.js`](../../cucumber.js) apunta solo a los features de este
> grupo y filtra `not @manual`. Los features de otros equipos (07, 08, 09) tienen errores de
> sintaxis Gherkin que abortan el parseo de una corrida global.

### Incidencias encontradas

1. **El sandbox incorporó una pantalla previa de selección de curso** (`/` → `/curso` →
   `/auth/login`). `LoginPage.open()` resuelve ese paso antes de llegar al formulario.
2. **El mensaje de error del login cambió** a `"No hay un cliente con ese email."`; la guía
   [`playwright/README.md`](../../playwright/README.md) todavía documenta el texto anterior.
3. **Los ids de tarjeta sembrados ya no son estables** (`GET /api/v1/tarjetas/1` responde 404).
   Cada escenario crea su propia tarjeta con `POST /api/v1/tarjetas` y guarda el id como
   `{tarjetaId}`.
4. **Rate limit de 30 req/min en el sandbox**, que afecta tanto a la API como a la interfaz
   (la pantalla renderiza *"Rate limit exceeded"* en lugar de los datos). Se trata con
   reintento y espera en `AiquaaWorld.conReintento()` y `BasePage.esperarSinRateLimit()`.
5. **Timeout por step insuficiente**: los 5 s por defecto de Cucumber no alcanzan para el
   arranque en frío en Vercel más los reintentos; se elevó a 75 s configurables.
6. **El informe PDF no mostraba las evidencias**: ahora el reporter incrusta, en un anexo final,
   la captura de cada escenario web y la última respuesta HTTP de cada escenario de API, buscadas
   por ID en `--evidence-dir` (por defecto, la carpeta del propio PDF).
7. **El informe PDF perdía la matriz de trazabilidad**: cucumber-js 11 ya no exporta los
   comentarios del `.feature` en el JSON. Se parcheó
   [`skills/bdd-skill/reporter/bdd_report.py`](../../skills/bdd-skill/reporter/bdd_report.py)
   para leer los `# criterio:` del `.feature` (con soporte multilínea) y agregar la columna
   **ID** a la matriz.

### Mejoras futuras

- Automatizar los 7 escenarios `@sin-endpoint` cuando el sandbox exponga PIN, OTP, límites y
  pagos de tarjeta.
- Reactivar el escenario `@defecto` en cuanto se corrija DEF-G05-01.

### Integración continua

[`.github/workflows/Y_GRUPO05_bdd.yml`](../../.github/workflows/Y_GRUPO05_bdd.yml)
corre en cada push a `main` o a la rama del grupo, y en cada PR a `main`, que toque `bdd/`, los
Page Objects o el smoke del grupo; también a demanda (`workflow_dispatch`). Sigue el esqueleto
del ejemplo del curso (`Y_AIQUAA_E2E_playwright.yml`):

1. valida el catálogo de steps con el perfil `dryrun` (0 undefined, 0 ambiguous);
2. espera a que haya cupo en el rate limit del sandbox (mismo script que usan Newman y JMeter,
   y el mismo grupo de concurrencia, porque las tres corridas comparten API key);
3. ejecuta Cucumber con el perfil `grupo05` (los 8 escenarios automatizados; los `@manual`
   quedan fuera por configuración del perfil);
4. clasifica los fallos con el Failure Classifier de la skill (`CLASIF_BDD_GRUPO05.json`);
5. genera el informe PDF BDD con la matriz de trazabilidad y las evidencias incrustadas;
6. ejecuta el smoke de Playwright del grupo y genera su informe PDF E2E;
7. publica como artefactos la evidencia, los informes, la clasificación y el reporte HTML de
   Playwright, incluso si la corrida falló.

La API key se toma de `secrets.GRUPO05_API_KEY` y, si no está definida, cae en la key demo
pública del curso — el mismo patrón que los workflows de Newman y JMeter del grupo.

### Entregable no disponible en el entorno

`GET /api/v1/labs/evidence/:sessionId`, que [`ENTREGABLES.md`](../../ENTREGABLES.md) pide como
evidencia, **ya no existe en el sandbox**: responde 404 y no aparece en `/api/v1/docs`. La
evidencia equivalente se entrega como capturas, respuestas HTTP e informes PDF en
`evidence/semana-06/`.
