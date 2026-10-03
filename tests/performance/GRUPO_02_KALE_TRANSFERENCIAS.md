# Rendimiento — Grupo 02 Transferencias (JMeter + CSV)

Plan: [`plans/P_GRUPO_02_KALE_TRANSFERENCIAS_CSV.jmx`](plans/P_GRUPO_02_KALE_TRANSFERENCIAS_CSV.jmx) (JMeter 5.6.3, se abre en la GUI).
Se regenera con `python3 tools/grupo02-kale/build_jmx.py`.

## Flujo

1. **setUp Thread Group** — `POST /api/v1/sql/select`: obtiene 2 cuentas activas en PYG de la
   BD y las guarda como propiedades (`g02.cuentaOrigenId`, `g02.cuentaDestinoId`). Datos dinámicos, sin ids fijos.
2. **Thread Group de carga** (threads/loops por propiedad), por iteración:
   - `GET /api/v1/cuentas/{origen}` — **endpoint de consulta**. Asserts: 200, `$.data.activa == true`, < 2000 ms.
   - `POST /api/v1/transferencias` — **endpoint de creación** con `monto` y `descripcion` del
     **CSV** (`data/D_GRUPO_02_KALE_TRANSFERENCIAS.csv`). Un JSR223 arma una descripción única
     (`G02-PERF-{runId}-{hilo}-{iteración}`). Extrae `$.data.id`. Asserts: 201, `estado == pendiente`, < 2000 ms.
   - `GET /api/v1/transferencias/{id}` — correlación del id creado. Asserts: 200 y mismo id.
   - `DELETE /api/v1/transferencias/{id}` — limpieza (soft-delete). Assert: 204.
3. **Constant Throughput Timer** a 24 muestras/min: el sandbox limita a **30 req/min por API key**
   (pasarse da 429 y falsea el error rate).

## Propiedades (`-J`)

| Propiedad | Default | Uso |
|---|---|---|
| `apiKey` | — | `x-api-key` (nunca se guarda en el repo) |
| `csvPath` | `tests/performance/data/D_GRUPO_02_KALE_TRANSFERENCIAS.csv` | Datos de entrada |
| `threads` / `loops` / `rampUp` | 2 / 3 / 4 | Carga |
| `throughputPerMin` | 20.0 | Paceo por el rate limit |
| `host` / `protocol` / `port` | sandbox / https / — | Destino (se puede apuntar al mock local) |
| `runId` | timestamp | Trazabilidad de los datos creados |

## SLA (`thresholds/T_GRUPO_02_KALE_TRANSFERENCIAS.json`)

Error rate ≤ 5 % y p95 < 2000 ms. Lo evalúa `aiquaa-performance-mcp-server --evaluate` en CI.

## Ejecutar en tu Mac

```bash
brew install jmeter            # una sola vez (trae Java)
export SANDBOX_API_KEY=sbx_...
npm run test:perf              # deja test-results/performance/dashboard/index.html
```

## CI/CD + Grafana

Workflow [`Y_GRUPO02_KALE_JMETER_GRAFANA.yml`](../../.github/workflows/Y_GRUPO02_KALE_JMETER_GRAFANA.yml):
JMeter headless → captura del dashboard público de Grafana del sandbox (Selenium) →
informe PDF con `aiquaa-performance-mcp-server` (MCP del curso) con la captura embebida →
gate de SLA → artefactos (PDF, JTL, dashboard HTML, PNG de Grafana).

## Uso del MCP con un agente de IA (opcional)

El MCP `aiquaa-performance-mcp-server` también se puede registrar en Claude Code / Copilot:

```bash
claude mcp add aiquaa-performance -- npx -y aiquaa-performance-mcp-server
```

y pedirle, por ejemplo: *"Analizá test-results/performance/R_GRUPO_02_KALE_TRANSFERENCIAS.jtl contra
tests/performance/thresholds/T_GRUPO_02_KALE_TRANSFERENCIAS.json y generá el informe PDF"*.
