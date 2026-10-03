# Resumen de rendimiento — Grupo 05, semana 05

Tarea: *CI/CD JMeter + reportería Grafana con MCP*.
Pipeline: [`jmeter-grupo05-performance.yml`](../../../../.github/workflows/jmeter-grupo05-performance.yml).
Plan: [`Grupo05_Tarjetas_v1.jmx`](../../tests/performance/plans/Grupo05_Tarjetas_v1.jmx).

## Resultado

| Métrica | Valor |
| :--- | :--- |
| Veredicto global | **PASS** |
| Muestras | 9 |
| Tasa de error | 0 % |
| Carga | 1 hilo × 3 iteraciones |
| Entorno | `https://aiquaa-sandbox-api.vercel.app` |
| SLA aplicado | p95 ≤ 2000 ms, error ≤ 5 % (global y por operación) |

### Por operación

| Operación | Muestras | p95 | Veredicto |
| :--- | ---: | ---: | :--- |
| `GET - Obtener tarjeta por id` | 3 | 965 ms | PASS |
| `POST - Emitir tarjeta` | 3 | 300 ms | PASS |
| `GET - Consultar la tarjeta recien emitida` | 3 | 373 ms | PASS |

El p95 más alto, 965 ms en la consulta por id, corresponde al arranque en frío de la función
serverless: es la primera petición de la corrida. Queda holgadamente bajo el umbral de 2000 ms.

La carga se mantuvo deliberadamente baja porque el sandbox limita a **30 peticiones por minuto
por API key**, y esa key es compartida por todo el curso. Subirla no mediría el sistema: mediría
el rate limiter.

## Archivos de esta carpeta

| Archivo | Qué es |
| :--- | :--- |
| `R_GRUPO05_TARJETAS.jtl` | Resultados crudos de JMeter. |
| `INFORME_PERF_GRUPO05.pdf` | Informe generado con `aiquaa-performance-mcp-server --report`, con la evidencia de Grafana incrustada. |
| `EVIDENCIA_GRAFANA_SANDBOX.png` | Captura del dashboard de monitoreo, tomada por el pipeline después de la corrida. |
| `EJECUCION_PIPELINE_ACTIONS.png` | Corrida del pipeline en GitHub Actions. |
| `resumen-rendimiento.json` | Salida de `--evaluate`: métricas y veredictos por operación. |

## Trazabilidad de la evidencia

- **Corrida de carga, monitoreo e informe**: ejecutados con el mismo plan, script y comandos que
  el workflow, sobre JMeter 5.6.3 y el sandbox real. Se adjuntan el `.jtl`, el PDF y la captura
  del dashboard resultantes.
- **`EJECUCION_PIPELINE_ACTIONS.png`**: corresponde al run #3 de
  [`Y_GRUPO05_bdd.yml`](../../../../.github/workflows/Y_GRUPO05_bdd.yml) en GitHub Actions
  (commit `fd4bb0d`, estado *Success*, 2 m 2 s, 2 artefactos publicados). Es la evidencia de que
  los pipelines del grupo corren en el runner.
- El pipeline de performance se dispara por `pull_request` hacia `main` y por `workflow_dispatch`:
  su run en Actions queda registrado al abrir el PR de la semana.

## Monitoreo

El dashboard capturado es
[`aiquaa Sandbox API - qa_training`](https://purplespinach239.grafana.net/public-dashboards/ce95c3fa413048d3a79d3c6fc60de958):
requests por minuto, tasa de error, top de API keys y actividad por tabla. La captura la toma el
propio pipeline con Playwright, justo después de la corrida, y se incrusta en el PDF mediante
`--evidence-image`, `--evidence-label` y `--evidence-url` del MCP server.

Al ser un dashboard compartido por todo el curso, los picos visibles incluyen tráfico de otros
grupos; sirve como evidencia de monitoreo del entorno, no como medición aislada de esta corrida.
Para eso están el `.jtl` y el informe.
