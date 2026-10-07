# Performance — Grupo 09 · Leila Ruiz (Control de acceso por rol + Reportes)

API bajo prueba: `https://aiquaa-sandbox-api.vercel.app` (sandbox de clase).

| Archivo | Qué es |
| --- | --- |
| `plans/P_GRUPO_09_LEILA_ROLES_REPORTES.jmx` | Plan JMeter: setUp con catálogo de roles + GET resumen de reportes + GET roles del usuario + POST asignar rol |
| `data/D_GRUPO_09_LEILA_ROLES.csv` | Dataset: `usuarioId,rolNombre,perfilNegocio` |
| `thresholds/T_GRUPO_09_LEILA_ROLES_REPORTES.json` | Umbrales globales y por operación (MCP `aiquaa-performance-mcp-server`) |
| `../../.github/workflows/jmeter-grupo09-leila-performance.yml` | Pipeline: JMeter headless → captura Grafana → PDF → gate de SLA |

## Flujo de datos dinámicos

```
setUp: GET /api/v1/roles                  → guarda g09.rol.<nombre> = id (JSR223)
loop (CSV usuarioId, rolNombre):
  GET  /api/v1/reportes/resumen?usuarioId  (consulta)  → 200 + $.data.cantidad_movimientos
  GET  /api/v1/usuarios/{id}/roles         (consulta)  → 200 + el rol del CSV está activo
  POST /api/v1/usuarios/{id}/roles         (creación)  → body {"roleId": <id dinámico>}
                                                         201 si es nueva, 200 si ya existía
```

El POST es un *upsert*: como el CSV solo usa pares usuario/rol que ya existen, la prueba
no ensucia la base compartida del curso (responde 200 y deja todo igual).

## Modelo de carga y supuestos

- 2 hilos × 3 iteraciones (configurable con `-Jthreads` / `-Jloops`), ramp-up 4 s.
- `ConstantThroughputTimer` a 15 req/min: el sandbox limita a **30 req/min por api-key**
  y esa key la comparten todos los grupos.
- SLA: error ≤ 5 %, p95 ≤ 2500 ms en consultas y ≤ 3000 ms en la asignación.

## Ejecutar local

```bash
jmeter -n -t tests/performance/plans/P_GRUPO_09_LEILA_ROLES_REPORTES.jmx \
  -JapiKey=sbx_demo_f581ca21e68a347288c94d71 \
  -l test-results/performance/R_GRUPO_09_LEILA.jtl -e -o test-results/performance/dashboard

npx -y aiquaa-performance-mcp-server --report test-results/performance/R_GRUPO_09_LEILA.jtl \
  tests/performance/thresholds/T_GRUPO_09_LEILA_ROLES_REPORTES.json test-results/performance/INFORME.pdf
```
