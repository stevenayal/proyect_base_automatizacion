# Rendimiento — Grupo 06 Notificaciones y Alertas

Plan generado siguiendo el flujo del MCP de performance
(`perf_analizar` → `perf_requisitos` → `perf_escenario` → `perf_generar` → `perf_validar`),
cubriendo los dos endpoints pedidos por la tarea: uno de consulta y uno de creación
con datos dinámicos.

## Endpoints bajo prueba

| Verbo | Ruta | Rol en el escenario |
|---|---|---|
| `POST` | `/api/v1/notificaciones` | Creación — `usuarioId`, `canal` y `mensaje` desde CSV, mensaje con sufijo único por iteración |
| `GET` | `/api/v1/notificaciones?usuarioId=&leido=false` | Consulta — valida que la notificación recién creada aparezca como pendiente |

Correlación: `JSON Extractor` sobre `$.data.id` del POST → `notificacionId`, usado para
verificar (vía script Groovy) que ese id está presente en el listado del GET.

## Archivos

```text
tests/performance/
├── plans/Grupo06_Notificaciones.jmx
├── data/grupo06-notificaciones.csv
└── thresholds/grupo06-thresholds.json
```

## Ejecución local

```bash
jmeter -n \
  -t tests/performance/plans/Grupo06_Notificaciones.jmx \
  -l test-results/performance/R_GRUPO06_NOTIFICACIONES.jtl \
  -e -o test-results/performance/dashboard \
  -JcsvPath=tests/performance/data/grupo06-notificaciones.csv \
  -JapiKey=TU_API_KEY \
  -Jthreads=1 -Jloops=5 -JdelayMs=3000
```

Informe PDF + evaluación de umbrales (requiere el paquete del MCP):

```bash
npx -y aiquaa-performance-mcp-server --report \
  test-results/performance/R_GRUPO06_NOTIFICACIONES.jtl \
  tests/performance/thresholds/grupo06-thresholds.json \
  test-results/performance/INFORME_PERF_GRUPO06.pdf \
  --api-name "AIQUAA Sandbox API (notificaciones)" --test-type carga \
  --plan tests/performance/plans/Grupo06_Notificaciones.jmx

npx -y aiquaa-performance-mcp-server --evaluate \
  test-results/performance/R_GRUPO06_NOTIFICACIONES.jtl \
  tests/performance/thresholds/grupo06-thresholds.json
```

## CI/CD

`.github/workflows/jmeter-grupo06-performance.yml` — ejecuta JMeter headless (`-n`),
genera el dashboard HTML (`-e -o`), produce el informe PDF con el MCP de performance,
evalúa el SLA (`thresholds/grupo06-thresholds.json`) como gate, y captura evidencia de
un dashboard de monitoreo (Grafana u otro) cuando se dispara manualmente con
`monitoring_dashboard_url`.

Antes de JMeter, el paso **"Esperar cupo"** (`scripts/esperar-cupo-api.sh`) manda una ráfaga corta a
`GET /api/v1/notificaciones` y solo arranca cuando no hay `429`. Cumple dos funciones:

- **Cupo:** la API key demo y el límite de 30 req/min son compartidos entre grupos.
- **Calentamiento:** el sandbox corre en Vercel y la primera petición después de un rato sin uso tarda más
  (arranque en frío, ~1,5 s). Con 5 muestras por operación el p95 coincide con el máximo, así que esa sola
  petición rompería el SLA aunque no represente el rendimiento real.

Newman y JMeter del grupo comparten el grupo de concurrencia `aiquaa-sandbox-grupo06`: corren uno después
del otro. En la rama del grupo se ejecutan vía el PR hacia `main`.

Secrets/vars a configurar en el repositorio (Settings → Secrets and variables → Actions):

- `GRUPO06_API_KEY` (secret) — misma API key usada en Postman.

## Umbrales (SLA)

`thresholds/grupo06-thresholds.json`: error rate global ≤ 1 %, p95 ≤ 1500 ms global,
con límite más estricto (800 ms) para el GET de consulta por ser una lectura simple.

## Grafana — justificación de N/A

El sandbox AIQUAA (`aiquaa-sandbox-api.vercel.app`) no expone un dashboard de Grafana
propio conectado a esta API; el parámetro `monitoring_dashboard_url` del workflow queda
vacío por defecto. Si el equipo docente provee una URL pública de Grafana para el
ambiente de pruebas, se dispara el workflow manualmente (`workflow_dispatch`) pasando
esa URL y la evidencia se adjunta automáticamente al PDF. Hasta entonces, el punto de
monitoreo se declara **N/A — no hay dashboard de Grafana conectado al sandbox de la
cátedra para este endpoint**, igual que indica el criterio de "JMeter y Costos Oracle
con justificación técnica del N/A" del formato del equipo.
