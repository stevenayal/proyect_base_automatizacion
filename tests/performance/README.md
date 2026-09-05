# Pruebas de rendimiento (JMeter)

Plan base del curso **Automatización CIT**, ejecutado en CI por el workflow
[`jmeter-performance.yml`](../../.github/workflows/jmeter-performance.yml).

La API bajo prueba es `https://aiquaa-sandbox-api.vercel.app` (endpoints
`api/v1/ordenes` y `api/v1/facturas`).

## Contenido

| Ruta | Qué es |
|------|--------|
| `plans/Curso_Automatizacion_CIT_v1.jmx` | Plan original del curso, **tal cual** se usó en local (Windows). Referencia, no lo usa el CI. |
| `plans/Curso_Automatizacion_CIT_v1.ci.jmx` | Misma prueba con rutas relativas. Es el que ejecuta el CI. |
| `data/datos_dinamicos.csv` | Datos de facturas que consume el CSV Data Set del plan. |
| `thresholds/thresholds.json` | SLA evaluado tras la corrida (error rate y percentil 95). |

> El plan original apunta a `Z:\Jmeter\...`, rutas que solo existen en la
> máquina donde se dictó el curso. Por eso el CI usa la variante `.ci.jmx`, que
> lee el CSV desde la propiedad `csvPath` (por defecto,
> `tests/performance/data/datos_dinamicos.csv`).

## Correr en local

```bash
jmeter -n -t tests/performance/plans/Curso_Automatizacion_CIT_v1.ci.jmx \
  -l test-results/performance/R_CURSO_CIT.jtl \
  -e -o test-results/performance/dashboard \
  -JcsvPath=tests/performance/data/datos_dinamicos.csv
```

Informe PDF a partir del `.jtl`:

```bash
npx -y aiquaa-performance-mcp-server --report \
  test-results/performance/R_CURSO_CIT.jtl \
  tests/performance/thresholds/thresholds.json \
  test-results/performance/INFORME.pdf \
  --api-name "AIQUAA Sandbox API" --test-type carga \
  --plan tests/performance/plans/Curso_Automatizacion_CIT_v1.ci.jmx
```

El informe incluye los tiempos de respuesta con sus percentiles, las
transacciones por segundo separadas entre correctas y con error, y la tabla de
endpoints con su verbo HTTP. El `--plan` es lo que aporta el verbo: el `.jtl`
guarda la URL pero no el método.

## Evidencia de monitoreo (opcional)

Si se dispara el workflow a mano con `monitoring_dashboard_url`, se captura una
pantalla del dashboard (Grafana u otro) y se adjunta al PDF. La captura espera a
que el dashboard termine de arrancar: un stack de Grafana Cloud gratuito se
duerme cuando está inactivo y puede tardar más de un minuto en responder.

## SLA

`thresholds.json` declara error rate máximo de 5 % y percentil 95 bajo 2000 ms.
La API sandbox aplica rate limiting y devuelve `429 Too Many Requests` bajo
carga sostenida, así que una corrida agresiva puede fallar el SLA por error rate
y no por lentitud. El PDF se publica igual como artefacto.
