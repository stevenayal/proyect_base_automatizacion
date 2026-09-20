# Pruebas de performance — Grupo 03 · Pago de Servicios

Plan JMeter generado con el MCP `aiquaa-performance-mcp-server`
(`perf_requisitos` → `perf_escenario` → `perf_generar` → `perf_validar`)
a partir de la colección Postman `Grupo 03 - Pago de Servicios`.

API bajo prueba: `https://aiquaa-sandbox-api.vercel.app` (sandbox de clase).

## Contenido

| Archivo | Qué es |
| --- | --- |
| `plans/Grupo03_Plan_de_Pruebas_JMeter_CSV_Grupal.jmx` | Plan grupal: GET facturas pendientes + POST crear factura, con el **proveedor elegido al azar** entre ANDE, ESSAP, COPACO y Tigo. Dentro de JMeter se ve como "Grupo03 - Plan de Pruebas de JMeter + CSV - Grupal". |
| `data/Grupo03_Plan_de_Pruebas_JMeter_CSV_Grupal.csv` | Dataset semilla: `usuarioId,monto,fechaVencimiento`. |
| `thresholds/thresholds.json` | Umbrales por operación y globales. |
| `properties/local.properties` | Host, carga, think time y API key del ambiente local. |
| `monitoring/capture_dashboard.py` | Captura con Selenium el dashboard de Grafana como evidencia del informe. Copiado de `src/monitoring/python/` del MCP. |
| `monitoring/requirements.txt` | Dependencia de la captura (`selenium>=4.16,<5`). |

## Requisito y modelo de carga

- **NFR-G3-01** — 20 usuarios concurrentes consultando facturas pendientes y creando
  facturas durante 3 minutos; P95 < 2000 ms en la consulta, P95 < 3000 ms en la creación,
  tasa de error < 1%.
- **Modelo**: cerrado (`closed`), tipo `load`. El requisito habla de usuarios concurrentes
  que esperan cada respuesta, así que `perf_escenario` eligió modelo cerrado con scheduler
  por duración.
- **Carga configurada**: 10 hilos, ramp-up 30 s, duración 180 s, think time 500 ms, loops infinitos.

### Supuestos declarados

1. Se bajó de los 20 usuarios del NFR a **10 hilos** y se agregó **think time de 500 ms**
   porque el sandbox aplica rate limiting (la colección tiene el caso `Rate limit 429 manual`).
   Con 20 hilos y think time 0 el plan mide el rate limiter, no la API.
2. Los `usuarioId` **no se hardcodean**: se extraen en runtime de la respuesta del GET.
   El CSV solo aporta la semilla de fallback y los datos de negocio (`monto`, `fechaVencimiento`).
3. La API key es la pública del sandbox de clase. Vive en `properties/local.properties`,
   nunca dentro del `.jmx`.

## Flujo de datos dinámicos

Este es el punto de la consigna: el POST no inventa datos, los toma del GET.

```
GET /api/v1/facturas?estado=pendiente          ← endpoint de consulta (bajo medición)
  ├─ Response Assertion: 200
  ├─ JSON Assertion: $.data[0].estado == "pendiente"
  ├─ JSON Extractor → usuarioIdRuntime   (Match No. 0 = aleatorio)
  │     path    : $.data[*].usuario_id
  │     default : ${usuarioId} (viene del CSV, por si el GET vuelve vacío)
  └─ JSON Extractor → facturaIdRuntime   ($.data[*].id, aleatorio)

POST /api/v1/facturas                          ← endpoint de creación (bajo medición)
  body: {
    "usuarioId": ${usuarioIdRuntime},          ← usuario que EXISTE, sacado del GET
    "proveedor": "${__RandomFromMultipleVars(prov_1|prov_2|prov_3|prov_4,proveedorRnd)}",
    "numeroFactura": "<proveedor>-PERF-${__threadNum}-${__counter(FALSE,)}-${__time(,)}",
    "monto": ${monto},                         ← del CSV
    "fechaVencimiento": "${fechaVencimiento}"  ← del CSV
  }
  └─ Response Assertion: 201
```

`numeroFactura` combina hilo + contador global + timestamp, así que nunca choca con el
409 de factura duplicada aunque se corra el plan varias veces seguidas.

`__RandomFromMultipleVars` elige una de las 4 variables
`prov_1..prov_4` (User Defined Variables) y guarda el valor en `proveedorRnd`, de modo que
el proveedor del body y el prefijo de `numeroFactura` son siempre el mismo.

`facturaIdRuntime` queda disponible para encadenar después un `GET /facturas/{id}` o un
`POST /facturas/{id}/pagar` sin tocar la estructura del plan.

## Cómo ejecutar

Desde la raíz del repositorio:

```bash
jmeter -n \
  -t tests/performance/plans/Grupo03_Plan_de_Pruebas_JMeter_CSV_Grupal.jmx \
  -q tests/performance/properties/local.properties \
  -l test-results/performance/R_Grupo03_Plan_de_Pruebas_JMeter_CSV_Grupal.jtl \
  -e -o test-results/performance/dashboard
```

Smoke de 1 hilo antes de la corrida real:

```bash
jmeter -n -t tests/performance/plans/Grupo03_Plan_de_Pruebas_JMeter_CSV_Grupal.jmx \
  -q tests/performance/properties/local.properties \
  -Jthreads=1 -Jduration=30 -Jloops=1 \
  -l test-results/performance/R_SMOKE.jtl
```

Evaluar contra los umbrales e informe PDF (sin pasar por MCP):

```bash
npx -y aiquaa-performance-mcp-server --evaluate \
  test-results/performance/R_Grupo03_Plan_de_Pruebas_JMeter_CSV_Grupal.jtl \
  tests/performance/thresholds/thresholds.json
```

## Propiedades configurables

Todas se pueden pisar con `-J<nombre>=<valor>` sin editar el `.jmx`:

`protocol`, `host`, `port`, `apiKey`, `threads`, `rampUp`, `duration`, `loops`,
`thinkTime`, `csvFile`, `jtlFile`.

### Rutas de archivos

JMeter resuelve la ruta del **CSV Data Set relativa a la carpeta del `.jmx`**, no al
directorio desde el que se lanza. Por eso `csvFile` apunta a `../data/<archivo>.csv`:
así funciona igual desde la GUI, desde `bin/` o desde la raíz del repo.

El `jtlFile` del Simple Data Writer usa el prefijo `~/`, que en JMeter significa
"relativo a la carpeta del plan" (`jmeter.save.saveservice.base_prefix`), de modo que el
`.jtl` cae siempre en `test-results/performance/` del repo aunque se corra desde la GUI.

Si se abre el `.jmx` desde otra ubicación, alcanza con pasar rutas absolutas:

```bash
-JcsvFile=C:\ruta\al\repo\tests\performance\data\Grupo03_Plan_de_Pruebas_JMeter_CSV_Grupal.csv
-JjtlFile=C:\ruta\al\repo\test-results\performance\R_Grupo03_Plan_de_Pruebas_JMeter_CSV_Grupal.jtl
```

## Ejecucion por pipeline

El workflow `.github/workflows/Y_GRUPO03_jmeter.yml` corre la prueba en GitHub Actions
siguiendo el modelo de `Y_NASAAPOD_jmeter.yml` del repo del MCP.

Se dispara **a mano** desde la pestaña Actions (`Run workflow`), con tres inputs:

| Input | Default | Para qué |
| --- | --- | --- |
| `monitoring_dashboard_url` | dashboard público de Grafana del curso | Se captura como evidencia del PDF. Vacío = sin captura. |
| `threads` | `10` | Hilos concurrentes. |
| `duration` | `180` | Duración en segundos. |

Se dispara a mano y no en cada push porque el POST crea facturas reales en el sandbox
compartido del curso.

**Disparo temporal por `push`.** GitHub solo muestra `Run workflow` en la pestaña Actions
cuando el archivo del workflow ya está en la rama por defecto. Mientras este trabajo viva en
`grupo-03-pagos-servicios` sin mergear, el disparo manual no está disponible, así que el
workflow lleva además un `push` acotado a esa rama y a `tests/performance/**`. Es lo que
permite ejecutar el pipeline y adjuntar el PDF a la entrega. Una vez en `main`, ese bloque
se puede borrar y queda solo el disparo manual, igual que el ejemplo de clase.

En un evento `push` los `inputs` vienen vacíos, así que el paso *Resolver parametros de la
corrida* aplica los mismos valores por defecto del formulario (10 hilos, 180 s, el dashboard
del curso).

Secuencia de pasos:

```
checkout del repo
checkout de stevenayal/aiquaa-performance-mcp-server en ./mcp
JMeter 5.6.3 (cacheado)
resolucion de parametros (inputs del formulario o defaults si vino por push)
corrida headless del plan        -> test-results/performance/R_<PLAN>.jtl
dashboard HTML de JMeter (-g)    -> test-results/performance/dashboard/
npm ci + npm run build del MCP
captura del Grafana (Selenium)   -> test-results/performance/evidence/EVIDENCIA_MONITOREO.png
informe PDF con la evidencia     -> test-results/performance/INFORME_PERF_<PLAN>.pdf
upload-artifact
evaluacion de thresholds         -> falla el job si se pasan los umbrales
```

La evaluación de umbrales va **al final a propósito**: si el P95 o el error rate se pasan,
el job queda en rojo pero el PDF y el dashboard ya se subieron como artifact. Al revés
se perdería justamente la evidencia de la corrida que falló.

La captura de Grafana tiene `continue-on-error: true`: si el stack de Grafana está dormido
o la URL cambia, el PDF igual se genera, sin esa sección.

### Entregables de cada corrida

El artifact `jmeter-GRUPO03-<run>` contiene:

- `INFORME_PERF_<PLAN>.pdf` — informe con portada, percentiles, veredicto, detalle por
  sampler y la captura del Grafana.
- `R_<PLAN>.jtl` — resultados crudos.
- `dashboard/index.html` — dashboard HTML de JMeter.
- `evidence/EVIDENCIA_MONITOREO.png` — la captura del dashboard de monitoreo.

## Umbrales

| Scope | Error rate máx. | P95 |
| --- | --- | --- |
| global | 1% | 3000 ms |
| `GET /api/v1/facturas` | 1% | 2000 ms |
| `POST /api/v1/facturas` | 1% | 3000 ms |

## Notas

- El plan usa solo elementos nativos de JMeter 5.6.3 (HttpClient4, CSV Data Set,
  JSON Extractor, JSON Assertion, Constant Timer, Simple Data Writer). No requieren plugins.
- Sin BeanShell, sin listeners gráficos, sin credenciales embebidas en el `.jmx`.
- El CSV Data Set tiene `ignoreFirstLine=true`: con *Variable Names* cargado JMeter no
  saltea el encabezado y lo leería como primer registro de datos.
- El POST **crea datos reales** en el sandbox. Correr con criterio y avisar al grupo.
