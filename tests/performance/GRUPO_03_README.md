# Pruebas de performance — Grupo 03 · Pago de Servicios

Plan JMeter generado con el MCP `aiquaa-performance-mcp-server`
(`perf_requisitos` → `perf_escenario` → `perf_generar` → `perf_validar`)
a partir de la colección Postman `Grupo 03 - Pago de Servicios`.

API bajo prueba: `https://aiquaa-sandbox-api.vercel.app` (sandbox de clase).

> **Nombres con prefijo `GRUPO_03_`.** `tests/performance/` es compartido por todos los
> grupos del curso y `README.md`, `thresholds.json` y `local.properties` ya existen en
> `main` con contenido de otros grupos. Los archivos propios de este grupo llevan prefijo
> para no pisarlos al mergear, siguiendo la convención que ya usan `GRUPO_07_*` y
> `grupo04-thresholds.json`.

## Contenido

| Archivo | Qué es |
| --- | --- |
| `plans/Grupo03_Plan_de_Pruebas_JMeter_CSV_Grupal.jmx` | Plan grupal: GET facturas pendientes + POST crear factura, con el **proveedor elegido al azar** entre ANDE, ESSAP, COPACO y Tigo. Dentro de JMeter se ve como "Grupo03 - Plan de Pruebas de JMeter + CSV - Grupal". |
| `data/Grupo03_Plan_de_Pruebas_JMeter_CSV_Grupal.csv` | Dataset semilla: `usuarioId,monto,fechaVencimiento`. |
| `thresholds/GRUPO_03_thresholds.json` | Umbrales por operación y globales. |
| `properties/GRUPO_03_local.properties` | Host, carga, think time y API key del ambiente local. |
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
3. La API key es la pública del sandbox de clase. Vive en `properties/GRUPO_03_local.properties`,
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
  -q tests/performance/properties/GRUPO_03_local.properties \
  -l test-results/performance/R_Grupo03_Plan_de_Pruebas_JMeter_CSV_Grupal.jtl \
  -e -o test-results/performance/dashboard
```

Smoke de 1 hilo antes de la corrida real:

```bash
jmeter -n -t tests/performance/plans/Grupo03_Plan_de_Pruebas_JMeter_CSV_Grupal.jmx \
  -q tests/performance/properties/GRUPO_03_local.properties \
  -Jthreads=1 -Jduration=30 -Jloops=1 \
  -l test-results/performance/R_SMOKE.jtl
```

Evaluar contra los umbrales e informe PDF (sin pasar por MCP):

```bash
npx -y aiquaa-performance-mcp-server --evaluate \
  test-results/performance/R_Grupo03_Plan_de_Pruebas_JMeter_CSV_Grupal.jtl \
  tests/performance/thresholds/GRUPO_03_thresholds.json
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
siguiendo el modelo de `Y_NASAAPOD_jmeter.yml` del repo del MCP, con una diferencia:
ejecuta **dos corridas encadenadas**.

| Corrida | Carga | Para qué |
| --- | --- | --- |
| **BASELINE** | 1 hilo, think time 3000 ms, 300 s | Queda por debajo del rate limit del sandbox. Es la que mide la API de verdad y la que **define el veredicto del SLA**. |
| **SATURACION** | 10 hilos, think time 500 ms, 180 s | La carga del NFR. Busca el techo de capacidad, no cumplir el SLA. Su veredicto es informativo. |

Entre las dos hay un enfriamiento de 90 s para que la ventana del rate limit se reinicie
y la saturación arranque limpia.

### Por qué dos corridas

La primera ejecución del pipeline con 10 hilos devolvió **97,8% de respuestas `429 Too Many
Requests`**: solo 62 de 2837 peticiones llegaron a la API. Los percentiles globales daban
~120 ms, que parecía excelente, pero medían la velocidad con la que el limitador rechaza,
no la de la API.

Filtrando solo las respuestas que sí se atendieron, la API respondía en **p50 165 ms,
p95 221 ms** — muy por debajo de los umbrales de 2000/3000 ms. El techo observado del
sandbox es de **~31 peticiones por minuto**.

De ahí la separación: el baseline mide, la saturación documenta el límite.

### Disparo

Se dispara **a mano** desde la pestaña Actions (`Run workflow`), con cinco inputs:

| Input | Default |
| --- | --- |
| `monitoring_dashboard_url` | dashboard público de Grafana del curso |
| `baseline_think_time` | `3000` |
| `baseline_duration` | `300` |
| `saturacion_threads` | `10` |
| `saturacion_duration` | `180` |

**Disparo temporal por `push`.** GitHub solo muestra `Run workflow` cuando el archivo del
workflow ya está en la rama por defecto. Mientras este trabajo viva en
`grupo-03-pagos-servicios` sin mergear, el disparo manual no está disponible, así que el
workflow lleva además un `push` acotado a esa rama y a `tests/performance/**`. Una vez en
`main`, ese bloque se puede borrar. En un `push` los `inputs` vienen vacíos y el paso
*Resolver parametros* aplica los mismos valores por defecto del formulario.

### Secuencia

```
checkout del repo + checkout del MCP en ./mcp
JMeter 5.6.3 (cacheado)
resolucion de parametros
corrida BASELINE     -> R_BASELINE.jtl
enfriamiento 90 s
corrida SATURACION   -> R_SATURACION.jtl
jmeter -g x2         -> dashboard_BASELINE/ y dashboard_SATURACION/
npm ci + npm run build del MCP
captura del Grafana  -> evidence/EVIDENCIA_MONITOREO.png
informe PDF BASELINE
informe PDF SATURACION (con --baseline, incluye la comparacion)
upload-artifact
veredicto SATURACION (informativo, continue-on-error)
veredicto BASELINE   (define el resultado del job)
```

La evaluación de umbrales va **al final a propósito**: si el baseline no cumple, el job
queda en rojo pero los PDF y los dashboards ya se subieron como artifact. Al revés se
perdería la evidencia justo de la corrida que falló.

La captura de Grafana tiene `continue-on-error: true`: si el stack está dormido o la URL
cambia, los informes igual se generan, sin esa sección.

### Entregables de cada corrida

El artifact `jmeter-GRUPO03-<run>` contiene:

- `INFORME_PERF_BASELINE.pdf` — el informe del SLA.
- `INFORME_PERF_SATURACION.pdf` — incluye la comparación contra el baseline.
- `R_BASELINE.jtl` y `R_SATURACION.jtl` — resultados crudos.
- `dashboard_BASELINE/` y `dashboard_SATURACION/` — dashboards HTML de JMeter.
- `evidence/EVIDENCIA_MONITOREO.png` — la captura del dashboard de Grafana.

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
- El Simple Data Writer guarda las **17 columnas por defecto de JMeter y con encabezado**
  (`<fieldNames>true</fieldNames>`). El generador del MCP escribía 11 columnas sin header,
  y tanto `jmeter -g` como el informe del MCP leen el `.jtl` según las
  `jmeter.save.saveservice.*` globales: sin encabezado no podían mapear las columnas, el
  dashboard abortaba y el PDF salía con 0 muestras.
- El POST **crea datos reales** en el sandbox. Correr con criterio y avisar al grupo.
