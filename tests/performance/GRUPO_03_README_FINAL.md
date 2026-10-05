# Plan final de rendimiento — Grupo 03 · Pago de Servicios

Mide los **6 endpoints de facturas por separado**, cada uno con su propio umbral, sin
pasarse del rate limit de la API key compartida entre grupos. Es la evolución del plan
grupal (`Grupo03_Plan_de_Pruebas_JMeter_CSV_Grupal.jmx`), que no se modifica.

Generado y validado con el MCP `aiquaa-performance-mcp-server` (mismo flujo que el plan
grupal: requisitos → escenario → generar → validar → evaluar/informe).

> Objetivo: **cómo responde cada endpoint**, no repetir las validaciones funcionales de la
> colección Postman Final. Las aserciones del plan solo controlan el código HTTP esperado.

## Archivos

| Archivo | Qué es |
| --- | --- |
| `plans/Grupo03_Plan_de_Pruebas_JMeter_CSV_Final.jmx` | El plan. Dentro de JMeter se ve como "Grupo03 - Plan de Pruebas de JMeter + CSV - Final por endpoint". |
| `data/Grupo03_Plan_de_Pruebas_JMeter_CSV_Final.csv` | 15 combinaciones proveedor × medio de pago × monto. |
| `thresholds/GRUPO_03_thresholds_final.json` | Umbral global y uno por endpoint (por nombre de sampler). |
| `properties/GRUPO_03_final_completa.properties` | Corrida completa: 30 muestras por endpoint + saturación de lecturas. |
| `properties/GRUPO_03_final_demo.properties` | Demo en vivo: 5 muestras por endpoint, sin saturación. |
| `scripts/GRUPO_03_resultados_final.py` | Separa el JTL (endpoints / saturación), arma el resumen y aplica el veredicto por endpoint. |
| `GRUPO_03_demo_final.bat` | Corre el plan desde la PC (Windows) y abre el dashboard. |
| `.github/workflows/Y_GRUPO03_jmeter_final.yml` | Pipeline del plan final (convive con `Y_GRUPO03_jmeter.yml`). |

## Diseño: una fase por endpoint

Los grupos de hilos corren **en serie** (`serialize_threadgroups`), 1 hilo cada uno, al
ritmo fijo de `rpm` requests por minuto. F1 crea un lote de facturas y las fases
siguientes trabajan sobre ese mismo lote, así cada endpoint se mide aislado y con datos
reales.

| Fase | Endpoint | Espera | Datos |
| --- | --- | --- | --- |
| 00 | `POST /api/v1/sql/select` + `GET /facturas?estado=pagada` | 200 | Elige al titular y una factura pagada para la saturación. **No se mide.** |
| F1 | `POST /api/v1/facturas` | 201 | Proveedor, medio de pago y monto del CSV; número de factura único. Cada factura creada entra al lote. |
| F2 | `GET /api/v1/facturas/{id}` | 200 | Factura *i* del lote. |
| F3 | `GET /api/v1/facturas?usuarioId=…&estado=pendiente` | 200 | Listado del titular. |
| F4 | `PUT /api/v1/facturas/{id}` | 200 | Misma factura, monto + 5000 y vencimiento a 60 días. |
| F5 | `POST /api/v1/facturas/{id}/pagar` | 200 | Con el medio de pago con que se creó. |
| F6 | `DELETE /api/v1/facturas/{id}` | 204 | Mide la baja y a la vez limpia el lote. |
| P | pausa | — | `pausaSaturacion` s para vaciar la ventana del rate limit. Solo si hay saturación. |
| S | `GET /facturas/{id}` y `GET /facturas?estado=pendiente` | 200 | Saturación **solo de lecturas**, informativa. |
| 99 | `DELETE /api/v1/facturas/{id}` | 204 | Limpieza: da de baja las facturas del lote que quedaron activas. Corre también si se corta la prueba. |

### Datos dinámicos

- **Titular automático.** Con `titular=` vacío, la preparación consulta la base:

  ```sql
  SELECT u.id, COUNT(f.id) AS pendientes FROM usuarios u
  LEFT JOIN facturas f ON f.usuario_id = u.id AND f.activo = true AND f.estado = 'pendiente'
  WHERE u.activo = true GROUP BY u.id ORDER BY COUNT(f.id) ASC, u.id ASC LIMIT 1
  ```

  Es el mismo criterio que la colección Postman Final: el usuario activo con menos
  facturas pendientes (el listado devuelve como máximo 100 filas). Si no se puede elegir,
  la prueba se detiene: sin titular no hay nada que medir.
- **Lote compartido.** F1 guarda `{id, número, proveedor, medio de pago, monto}` de cada
  factura creada; F2…F6 toman la factura de su iteración. Si F1 no pudo crear la factura
  *i*, esa iteración se saltea en las demás fases (aparece en el log, no como error).
- **CSV** aporta proveedor, medio de pago y monto (recicla las 15 filas).

## Rate limit

La API key del sandbox es **compartida entre todos los grupos**: el límite nominal es
30 req/min, pero el techo real medido fue ~10-15 req/min (ver el plan grupal).

- Cada fase corre a `rpm=10` (Constant Throughput Timer, 1 hilo).
- Si llega un `429` (por otro grupo), se **reintenta** respetando `Retry-After` (tope
  `esperaMax429` s, hasta `maxReintentos429` veces). La muestra rechazada se renombra
  `429 - <endpoint>` y se **cuenta aparte**: no ensucia los percentiles del endpoint.
- Si se agotan los reintentos, el último `429` queda con el nombre del endpoint y **cuenta
  como error suyo**: no se esconde.
- La saturación no reintenta: su objetivo es encontrar el techo.

## Dos modos

| | Completa (se presenta) | Demo (en vivo) |
| --- | --- | --- |
| Archivo | `GRUPO_03_final_completa.properties` | `GRUPO_03_final_demo.properties` |
| Muestras por endpoint | 30 | 5 |
| Saturación de lecturas | 10 hilos, 90 s, tras 90 s de pausa | no |
| Duración aprox. | ~22-25 min | ~4 min |

La corrida completa se ejecuta antes (pipeline) y se presentan sus PDF; la demo muestra en
clase que el plan funciona.

## Cómo ejecutar

Demo desde la PC (Windows, doble clic o consola):

```bat
tests\performance\GRUPO_03_demo_final.bat            :: demo
tests\performance\GRUPO_03_demo_final.bat completa   :: completa
```

Requiere JMeter 5.6.3 (en el `PATH` o `JMETER_HOME`) y Python 3. Si el MCP está compilado
en `C:\proyectos\aiquaa-performance-mcp-server` (o `MCP_HOME`), además muestra el veredicto
por endpoint. Los resultados quedan en `test-results\performance-final\` (ignorado por git).

A mano, desde la raíz del repo:

```bash
jmeter -n -t tests/performance/plans/Grupo03_Plan_de_Pruebas_JMeter_CSV_Final.jmx \
  -q tests/performance/properties/GRUPO_03_final_demo.properties \
  -JjtlFile=test-results/performance-final/R_FINAL.jtl

python tests/performance/scripts/GRUPO_03_resultados_final.py separar \
  --jtl test-results/performance-final/R_FINAL.jtl --salida test-results/performance-final

node <mcp>/dist/server.js --evaluate test-results/performance-final/R_FINAL_ENDPOINTS.jtl \
  tests/performance/thresholds/GRUPO_03_thresholds_final.json > test-results/performance-final/EVALUACION_FINAL.json

python tests/performance/scripts/GRUPO_03_resultados_final.py veredicto \
  --evaluacion test-results/performance-final/EVALUACION_FINAL.json \
  --umbrales tests/performance/thresholds/GRUPO_03_thresholds_final.json
```

### Propiedades

Todas se pisan con `-J<nombre>=<valor>`:

`protocol`, `host`, `port`, `apiKey`, `muestras`, `rpm`, `titular`, `maxReintentos429`,
`esperaMax429`, `satHilos`, `satRampa`, `satDuracion`, `pausaSaturacion`, `csvFile`, `jtlFile`.

## Pipeline

`.github/workflows/Y_GRUPO03_jmeter_final.yml`:

- Disparo manual con `modo` (completa / demo) y overrides opcionales (`muestras`, `rpm`,
  `sat_hilos`, `usuario_titular_id`, dashboard de Grafana). Mientras no esté en `main`,
  corre con un `push` acotado a la rama `grupo-03-pagos-servicios` y a los archivos del
  plan final (modo completa).
- API key: secret `GRUPO03_API_KEY` (si no está, la clave demo). Host: variable
  `GRUPO03_BASE_URL`.
- Mismo grupo de concurrencia que `Y_GRUPO03_jmeter.yml` (`perf-grupo03`): nunca corren a
  la vez contra el sandbox.

```
JMeter (una corrida)            -> R_FINAL.jtl
separar                         -> R_FINAL_ENDPOINTS.jtl, R_FINAL_SATURACION.jtl, RESUMEN_FINAL.md/json
jmeter -g                       -> dashboard_ENDPOINTS/, dashboard_SATURACION/
MCP --evaluate (endpoints)      -> EVALUACION_FINAL.json
captura de Grafana              -> evidence/EVIDENCIA_MONITOREO.png
MCP --report                    -> INFORME_PERF_FINAL_ENDPOINTS.pdf, INFORME_PERF_FINAL_SATURACION.pdf
resumen en la página del run, upload-artifact jmeter-GRUPO03-final-<n>
veredicto por endpoint          (último: define el resultado del job)
```

**Por qué un veredicto propio.** El veredicto global del MCP aplica el umbral global a
todas las muestras juntas; un endpoint lento puede quedar tapado por los rápidos. El
script exige que **cada endpoint** dé `PASS` contra su propio umbral y falla si alguno no
tuvo muestras.

## Umbrales

| Endpoint | Error máx. | p95 |
| --- | --- | --- |
| global | 1 % | 3000 ms |
| F1 crear | 1 % | 3000 ms |
| F2 consultar | 1 % | 2000 ms |
| F3 listar | 1 % | 2000 ms |
| F4 modificar | 1 % | 3000 ms |
| F5 pagar | 1 % | 3000 ms |
| F6 dar de baja | 1 % | 3000 ms |

Las claves de `operations` son los **nombres exactos de los samplers**: el MCP los compara
por igualdad. Si se renombra un sampler hay que renombrar su umbral.

Con 30 muestras, **un solo error** ya supera el 1 % (3,3 %): el umbral es estricto a
propósito, porque a 10 req/min no debería haber ninguno.

## Limitaciones

- La medición sale de un sandbox compartido (Vercel): los percentiles absolutos no son
  comparables con otra infraestructura, y dependen de qué más esté corriendo.
- El plan **crea, modifica, paga y da de baja facturas reales**. F6 y la limpieza dejan
  dadas de baja las que se crearon, pero los pagos quedan registrados.
- `POST /pagar` no valida `activo` (inconsistencia documentada en el BDD): no afecta a la
  medición porque F5 corre antes que F6.
- Elementos nativos de JMeter 5.6.3, sin plugins. Sin BeanShell, sin listeners gráficos,
  sin API key dentro del `.jmx` (va por propiedades / `-JapiKey`).
