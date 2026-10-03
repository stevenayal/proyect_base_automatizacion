# Grupo 07 - Semana 5 - Juan - Fase 1

Esta fase crea una base JMeter propia, parametrizada y autocontenida para el
flujo de ordenes. No modifica la implementacion de Andrea ni los planes
anteriores ubicados en `tests/performance`.

## Archivos de esta fase

- `plans/P_GRUPO_07_ORDENES_JUAN_SEMANA5.jmx`
- `properties/GRUPO_07_ORDENES_JUAN_SEMANA5.properties`
- `data/D_GRUPO_07_ORDENES_JUAN_SEMANA5.csv`
- `SEMANA5-JUAN.md`

El CSV propio conserva los tres casos de datos del trabajo anterior de Juan.
Se duplica de forma intencional dentro de la carpeta canonica del grupo para
que esta solucion no dependa del arbol compartido `tests/performance` ni de
archivos pertenecientes a Andrea.

## Escenario

```text
CSV
  -> validacion local de properties y datos
  -> POST /api/v1/ordenes
  -> Response Assertion HTTP 201 y validacion del contrato JSON
  -> JSON Extractor: $.data.id -> ordenId
  -> validacion explicita de la correlacion
  -> If Controller: solamente si ordenId es valido
  -> GET /api/v1/ordenes/${ordenId}
  -> Response Assertion HTTP 200 y comparacion data.id == ordenId
```

Si el POST falla, sus assertions fallan o el extractor devuelve un valor vacio
o `NOT_FOUND`, el GET no se ejecuta. El error de correlacion queda visible como
una muestra de control fallida.

## Modelo de carga elegido

Se eligio ejecucion finita por loops, no por duracion:

- `threads=1`
- `loops=10`
- dos HTTP requests esperados por iteracion
- veinte muestras HTTP esperadas: 10 POST y 10 GET correlacionados
- `targetRpm=10` como limite inicial prudente del trafico HTTP agregado

La cantidad esperada es determinista: `threads * loops * 2`. Esto facilita
alimentar un gate fail-closed de muestras completas. No se incluye
`duration`: agregarla con `scheduler=false` seria decorativo, y combinar tiempo
con un CSV/loops finito haria menos reproducible el alcance.

El pacing se aplica antes de cada request HTTP. Su espera se calcula como
`ceil(60000 * threads / targetRpm)` milisegundos. Con los defaults es 6000 ms
antes del POST y 6000 ms antes del GET, por lo que el agregado no supera
aproximadamente 10 requests HTTP/minuto. Diez iteraciones implican alrededor de
dos minutos de pacing acumulado mas las latencias y el preflight. Las latencias
reducen el ritmo real; no se intenta recuperar solicitudes atrasadas en rafaga.

`targetRpm=10` proviene del objetivo prudente del baseline anterior de Juan y
esta por debajo del techo conocido de 30 solicitudes/minuto del sandbox. No se
tomaron los 27 RPM de otra implementacion. Cualquier aumento debe revisarse
contra el rate limit compartido antes de ejecutar.

## Properties

| Property | Default | Uso |
|---|---:|---|
| `protocol` | `https` | Protocolo de HTTP Request Defaults. |
| `host` | `aiquaa-sandbox-api.vercel.app` | Host del sandbox. |
| `port` | `443` | Puerto HTTPS. |
| `threads` | `1` | Trabajadores del Thread Group. |
| `rampUp` | `0` | Ramp-up en segundos. |
| `loops` | `10` | Iteraciones finitas por trabajador para el perfil Semana 5. |
| `targetRpm` | `10` | Ritmo HTTP agregado usado para calcular el pacing. |
| `csvFile` | CSV propio de esta fase | Datos de las ordenes. |
| `connectTimeoutMs` | `10000` | Timeout de conexion; no es SLA. |
| `responseTimeoutMs` | `30000` | Timeout de respuesta; no es SLA. |

La properties dedicada tambien desactiva retries transparentes y configura un
JTL sin cuerpos ni cabeceras que puedan contener credenciales. La API key no es
una property de JMeter: el JMX la obtiene desde `GRUPO07_API_KEY` en el entorno
del proceso Java y la mantiene como variable de hilo en memoria.

## Flujo de variables

| Variable | Origen | Uso |
|---|---|---|
| `usuarioId` | CSV | Campo numerico del POST. |
| `producto1`, `producto2` | CSV | Nombres de los dos items del POST. |
| `cantidad1`, `cantidad2` | CSV | Cantidades numericas del POST. |
| `precioUnitario1`, `precioUnitario2` | CSV | Precios numericos del POST. |
| `montoEsperado` | CSV | Valida el monto calculado por la API; no se envia. |
| `ordenId` | JSON Extractor `$.data.id` | Construye el path del GET y valida su respuesta. |
| `g7.juan.rowReady` | Validacion local | Habilita el flujo HTTP solo con config y fila validas. |
| `g7.juan.correlationReady` | Guard de correlacion | Impide ejecutar GET sin un ID valido. |
| `g7.juan.requestDelayMs` | Calculo local | Pacing derivado de `threads` y `targetRpm`. |
| `g7.juan.apiKey` | Entorno `GRUPO07_API_KEY` | Header `x-api-key`; solo en memoria, nunca como property o dato de salida. |

## Thresholds y ejecucion actual

Los thresholds propios estan en `thresholds/thresholds-grupo07-juan-semana5.json`:

- minimo 20 HTTP samples, exactamente 10 POST y 10 GET;
- error rate maximo 1%;
- p95 maximo 1500 ms.

Con solo veinte muestras, un fallo equivale a 5% y supera el limite de 1%; por
eso el gate es practicamente fail-closed. El p95 usa nearest-rank: posicion
`ceil(0.95 * n)` de las latencias HTTP ordenadas. Los limites son criterios de
esta practica controlada del curso, no un SLA productivo ni una afirmacion de
capacidad maxima. La corrida funcional manual ya conseguida (1 POST 201, 1 GET
correlacionado 200, 0 errores) valida el escenario, pero no constituye una
baseline estadistica.

La ejecucion oficial se inicia manualmente con GitHub Actions → **JMeter - Grupo
07 - Juan - Semana 5** → `workflow_dispatch`. No hay trigger de PR/push: el
sandbox y su cuota son compartidos, por lo que una carga automatica ante cada
cambio podria interferir con otros alumnos. El workflow usa `-n -t -q -l -j -e
-o`, sobrescribe `threads=1`, `loops=10` y `targetRpm=10`, y lee la credencial
unicamente de `GRUPO07_API_KEY` en el entorno del proceso Java. No usa
`-JapiKey`; el secreto no se escribe a archivos ni se incluye en outputs.

Para ejecucion local autorizada, desde la raiz, comprobar la presencia sin
imprimir el valor y ejecutar el mismo JMX con los paths propios. El workflow de
CI es el camino recomendado y ya aplica el preflight y publica la evidencia.

```powershell
if ([string]::IsNullOrWhiteSpace($env:GRUPO07_API_KEY)) { throw 'Falta GRUPO07_API_KEY en el entorno del proceso' }
python grupos/grupo-07-carrito-ecommerce/tests/performance/scripts/grupo07_juan_semana5_preflight.py
if ($LASTEXITCODE -ne 0) { throw 'Preflight rechazado; JMeter no debe ejecutarse' }
jmeter -n `
  -t grupos/grupo-07-carrito-ecommerce/tests/performance/plans/P_GRUPO_07_ORDENES_JUAN_SEMANA5.jmx `
  -q grupos/grupo-07-carrito-ecommerce/tests/performance/properties/GRUPO_07_ORDENES_JUAN_SEMANA5.properties `
  -l test-results/performance/grupo07-juan-semana5/results.jtl `
  -j test-results/performance/grupo07-juan-semana5/jmeter.log `
  -e -o test-results/performance/grupo07-juan-semana5/dashboard `
  -Jthreads=1 -Jloops=10 -JtargetRpm=10
python grupos/grupo-07-carrito-ecommerce/tests/performance/scripts/grupo07_juan_semana5_report.py `
  --jtl test-results/performance/grupo07-juan-semana5/results.jtl `
  --thresholds grupos/grupo-07-carrito-ecommerce/tests/performance/thresholds/thresholds-grupo07-juan-semana5.json `
  --output-dir test-results/performance/grupo07-juan-semana5
```

## Fase 2A - Smoke local

- Fecha y hora local: 2026-09-26 00:44:56 -03:00 a 00:45:29 -03:00.
- JMeter: Apache JMeter 5.6.3, modo non-GUI; proceso completo: 32 s.
- Comando ejecutado desde la raiz del repositorio (se omite el argumento de
  credencial del comando historico, reemplazado por esta correccion):

```powershell
jmeter.bat -n `
  -t grupos/grupo-07-carrito-ecommerce/tests/performance/plans/P_GRUPO_07_ORDENES_JUAN_SEMANA5.jmx `
  -q grupos/grupo-07-carrito-ecommerce/tests/performance/properties/GRUPO_07_ORDENES_JUAN_SEMANA5.properties `
  -Jthreads=1 -Jloops=3 -JtargetRpm=10 `
  -l test-results/performance/grupo07-juan-semana5/smoke/results.jtl `
  -j test-results/performance/grupo07-juan-semana5/smoke/jmeter.log
```

Resultados de `results.jtl`:

| Medicion | Resultado |
|---|---:|
| Samples HTTP esperadas | 6 (3 POST + 3 GET) |
| Samples HTTP obtenidas | 3 (3 POST; 0 GET) |
| POST exitosos / fallidos | 0 / 3 |
| GET exitosos / fallidos | 0 / 0 ejecutados; 3 omitidos por el guard |
| Samples JTL totales | 6 (incluye 3 controles de correlacion fallidos) |
| Samples exitosas / fallidas en todo el JTL | 0 / 6 |
| Error rate observado en intentos HTTP | 3/3, 100%; fallo de transporte, sin respuesta HTTP |
| Codigos HTTP del servidor | Ninguno recibido |
| Tiempo minimo HTTP | 3 ms |
| Tiempo promedio HTTP | 60.3 ms |
| Mediana HTTP | 4 ms |
| p90 HTTP | 174 ms |
| p95 HTTP | 174 ms |
| Tiempo maximo HTTP | 174 ms |
| Throughput JTL de JMeter | 6 samples/23 s = 0.3 samples/s; incluye controles, no es throughput HTTP |
| Throughput de intentos HTTP en los 23 s activos | 3/23 s = 7.8 intentos/min |
| Intervalo medio entre inicios de POST | 6.44 s (aprox. 9.3 inicios/min entre los intervalos observados) |
| Inicio a fin del proceso JMeter | 32 s |
| Ventana entre primer y ultimo POST | 12.9 s |

Los tiempos HTTP son duraciones de intentos fallidos de conexion (`java.net.SocketException`),
no latencias de respuestas de la API. Por ello, p90/p95 se registran unicamente
como datos tecnicos del fallo y no como mediciones de servicio ni SLA.

### Correlacion, errores y rate limit

El POST no obtuvo respuesta HTTP, el extractor no produjo un ID utilizable y
cada control de correlacion registro `CORRELATION_ERROR`. El guard omitio los
tres GET. El JTL no contiene cuerpos ni cabeceras, por lo que tampoco expone
IDs de orden.

No se recibieron codigos HTTP; por tanto no se observo `201`, `200`, `429`, otro
4xx ni 5xx. No hubo timeout identificado en el JTL: los tres POST registraron
`Non HTTP response code: java.net.SocketException`. El log no contiene un
detalle adicional de la excepcion. La causa exacta (red local, salida de red o
servicio) no queda determinada por esta evidencia.

### Pacing y conclusion tecnica

Con `threads=1`, `loops=3` y `targetRpm=10`, la formula produjo 6000 ms por
request. Los inicios de POST estuvieron separados por 6.836 s y 6.025 s. Esto
es compatible con el pacing; el primero tambien incluye el tiempo del POST y
la muestra de control previa. Como los GET fueron omitidos, no se valido el
pacing de un flujo completo POST/GET. La latencia de servidor normalmente
reduciria el throughput real por encima de este intervalo, no indicaria por si
sola un defecto.

**SMOKE FUNCIONAL CON INCIDENCIAS**: JMeter, CSV, pacing y guard se ejecutaron;
el transporte no obtuvo respuestas HTTP, por lo que no se comprobo POST exitoso,
extraccion efectiva del ID ni GET. Este resultado no es una conclusion de
aceptacion/rechazo de rendimiento.

`jmeter.log` se redacto despues de detectar que JMeter habia escrito el valor
de la credencial en una linea de propiedades. Se verifico que la clave ya no
estaba en el log ni en el JTL. La evidencia conservada esta en
`test-results/performance/grupo07-juan-semana5/smoke/` y es local/no versionada.

### Evidencia funcional manual posterior

La ejecucion diagnóstica manual más reciente consiguió 1 POST con HTTP 201 y
1 GET correlacionado con HTTP 200, sin errores. Esto valida el flujo funcional,
pero con dos requests no establece una baseline estadística ni sustituye el
gate de veinte muestras. La propuesta histórica de 30 loops queda sustituida
por el perfil controlado de diez iteraciones descrito arriba.

## Arquitectura completa de Semana 5

### Archivos propios

- `plans/P_GRUPO_07_ORDENES_JUAN_SEMANA5.jmx`: escenario parametrizado CSV → POST → assertions → JSON Extractor → guard → GET. La lógica del JMX se conserva.
- `properties/GRUPO_07_ORDENES_JUAN_SEMANA5.properties`: defaults y SaveService CSV sin request headers ni cuerpos.
- `data/D_GRUPO_07_ORDENES_JUAN_SEMANA5.csv`: datos propios; son tres filas recicladas en el perfil de diez iteraciones.
- `thresholds/thresholds-grupo07-juan-semana5.json`: umbrales propios del gate.
- `scripts/grupo07_juan_semana5_report.py`: lectura fail-closed de JTL, métricas, decisión y summary/PDF.
- `scripts/grupo07_juan_semana5_preflight.py`: GET autenticado read-only acotado y comprobación de cuota.
- `scripts/test_grupo07_juan_semana5_report.py` y `scripts/test_grupo07_juan_semana5_preflight.py`: pruebas offline.
- `.github/workflows/jmeter-grupo07-juan-semana5.yml`: workflow independiente y manual.

### Thresholds, p95 y gate

El gate calcula minimumHttpSamples, error rate, latencias y status codes solo
con los dos labels HTTP conocidos. `CORRELATION_ERROR` y otros controles no
entran en el denominador, pero un `CORRELATION_ERROR` causa RECHAZADO. También
se rechaza si hay muestras no reconocidas, cualquier 429, cualquier 4xx/5xx
inesperado, POST distinto de 201, GET distinto de 200 o conteos incompletos.
El error rate es `failed HTTP samples / total HTTP samples * 100`. Estadísticas
de latencia usan elapsed en ms de muestras HTTP; percentiles usan nearest-rank.
Throughput usa la ventana entre el inicio HTTP más temprano y el fin más tardío
si los timestamps son válidos.

Con 20 muestras, un solo fallo ya representa 5%, mayor que el máximo de 1%.
Por eso el umbral es deliberadamente prácticamente fail-closed para esta
práctica breve. El p95 de 1500 ms conserva margen respecto de la evidencia
funcional propia referida (POST cercano a 1136 ms, GET cercano a 371 ms y p95
histórico alrededor de 1155 ms), sin presentarse como SLA ni garantía
estadística. APROBADO devuelve exit code 0; cualquier insuficiencia,
inconsistencia o criterio incumplido devuelve 1 y RECHAZADO. `summary.md`
termina literalmente en `CONTINUIDAD DE VERSIÓN: SÍ` o `NO` según el gate.
Un 429 se clasifica como rate limit compartido, no como prueba de defecto
funcional.

### Rate limit y criterio de detención

La concurrencia propia del workflow serializa únicamente sus ejecuciones; no
inspecciona ni intenta coordinar workflows de otros equipos. Antes de JMeter,
el preflight propio hace como máximo un GET autenticado a `/api/v1/ordenes`. Si
recibe 429 y `X-Ratelimit-Reset` da un plazo utilizable de hasta 65 segundos,
espera y reintenta una sola vez. Un segundo 429 detiene el job antes de JMeter.
También se detiene si no puede verificar `X-Ratelimit-Remaining` o quedan menos
de diez requests. No hay retries de HTTP de JMeter.

El sandbox limita 30 requests/min por API key y es compartido. El pacing de
10 RPM y la concurrencia serial del workflow reducen riesgo, pero ninguna
protección del repo puede coordinar scripts de otros equipos. No continuar una
nueva corrida si hay 429 persistente, saturación en Grafana, errores de base de
datos, incremento abrupto de 5xx, pérdida de correlación, error rate superior
al límite o imposibilidad de completar 20 samples. La corrida actual queda
limitada a diez iteraciones (20 requests como máximo); dado que el JMX funcional
no implementa parada dinámica, ante una señal grave durante la corrida se debe
cancelar el workflow y no repetirlo hasta revisar la evidencia.

### CI/CD, outputs, HTML y PDF

El workflow tiene solo `workflow_dispatch`; no se activa automáticamente en
PR/push para evitar consumo inesperado de una cuota compartida. La concurrencia
`grupo07-juan-semana5` serializa las corridas y `cancel-in-progress: false`
evita cancelar una carga ya iniciada. `GRUPO07_API_KEY` se asigna como variable
de entorno solo a los pasos de preflight y JMeter; no se pasa por `-JapiKey`.

La ejecución headless produce en
`test-results/performance/grupo07-juan-semana5/`:

- `results.jtl` y `jmeter.log`;
- `dashboard/index.html`, dashboard HTML estándar de JMeter generado con `-e -o`;
- `summary.json`, `summary.md` y `report.pdf`;
- `evidence/grafana-semana5.png` y su nota temporal cuando la captura está disponible.

Se reutiliza el reporter PDF genérico del curso que ya invoca
`.github/workflows/jmeter-performance.yml`; además el evaluator genera un PDF
de respaldo con la dependencia ReportLab utilizada por herramientas existentes
del repo. El summary propio, no el veredicto auxiliar del reporter genérico, es
la autoridad del gate. El artifact `jmeter-grupo07-juan-semana5` sube siempre
JTL, log, dashboard, PDF, summaries y evidencia con retención de siete días,
incluso si el gate es RECHAZADO o el preflight impide iniciar JMeter.

### Grafana

Se integra el dashboard público ya configurado en el workflow genérico del
curso; no requiere una credencial adicional. La captura es best-effort y no
bloquea ni cambia el gate. El workflow toma el rango temporal del JTL, agrega
30 segundos de margen, lo aplica al URL de Grafana y guarda la hora UTC de
captura en `evidence/grafana-status.txt`. La ventana queda además en
`summary.json`/`summary.md`, permitiendo correlacionar imagen y muestras. Si el
dashboard o el capturador no están disponibles, se registra la limitación y no
se inventa screenshot; el resto del artifact se publica.

### Continuidad y limitaciones conocidas

Un RECHAZADO significa que esta evidencia no permite continuar con gate verde;
no implica automáticamente una regresión funcional. Si hubo 429, la causa
confirmada es la cuota compartida; si no se recibió status HTTP, se informa
fallo de transporte/infraestructura sin atribuirlo al servidor. La validación
manual 1 POST/1 GET solo acredita funcionalidad básica. Veinte muestras no son
una caracterización robusta de cola/percentiles productivos. El CSV recicla sus
tres filas; se conserva para no modificar datos y no se presenta como amplitud
de población. La captura de Grafana depende de disponibilidad externa del
dashboard público.

## Comparación de automatización web

| Aspecto | Playwright | Selenium | Cypress |
|---|---|---|---|
| Navegadores | Chromium, Firefox y WebKit; también canales Chrome/Edge. | Amplio soporte WebDriver para Chrome, Edge, Firefox, Safari y otros. | Familia Chrome/Edge, Firefox y WebKit experimental. |
| Lenguajes | JS/TS, Python, Java y .NET. | Java, Python, C#, Ruby, JavaScript y bindings de ecosistema. | JavaScript/TypeScript. |
| Espera/sincronización | Auto-wait de actionability y assertions reintentables. | Espera de navegación, más implicit/explicit waits definidos por quien prueba. | Retryability de queries/assertions; comandos de acción no se repiten automáticamente. |
| Aislamiento | BrowserContext nuevo por test por defecto. | Depende del test runner/configuración; normalmente sesiones WebDriver explícitas. | Limpia estado entre tests y test isolation configurable. |
| Paralelismo | Workers y sharding integrados en Playwright Test. | Selenium Grid distribuye sesiones y paraleliza entre máquinas/navegadores. | Paralelismo entre máquinas a través de Cypress Cloud y specs. |
| Multi-tab | Múltiples Page en un BrowserContext, API directa. | Varias ventanas/tabs mediante window handles de WebDriver. | Limitado en core; workaround oficial documentado con plugin Puppeteer. |
| CI / ecosistema | Runner, reportes, tracing y guías CI integrados; ecosistema moderno amplio. | Estándar maduro, enorme comunidad, bindings y Grid; más setup de drivers/esperas. | Experiencia integrada y depurable para equipos JS; Cloud aporta orquestación avanzada. |
| Contexto recomendado | Apps modernas y suites cross-browser con aislamiento y paralelismo integrados. | Sistemas empresariales, stacks/lenguajes diversos y granjas remotas o legacy. | Frontend JS/TS donde priman DX, feedback interactivo y pruebas cercanas al desarrollo. |

No hay ganador universal: Playwright simplifica suites modernas multi-browser y
multi-tab; Selenium ofrece máxima amplitud de integración y control distribuido;
Cypress destaca en la experiencia de desarrollo de aplicaciones web JS, con
trade-offs en tabs y dependencia de su runner/ecosistema para paralelismo cloud.
La selección depende de navegadores objetivo, lenguaje, infraestructura de CI,
aislamiento requerido y necesidad real de múltiples contextos.

Fuentes oficiales consultadas: [Playwright: browsers](https://playwright.dev/docs/browsers),
[auto-wait](https://playwright.dev/docs/actionability),
[isolation](https://playwright.dev/docs/browser-contexts), [parallelism](https://playwright.dev/docs/test-parallel),
[pages/tabs](https://playwright.dev/docs/pages), [languages](https://playwright.dev/docs/languages),
[Selenium: browsers](https://www.selenium.dev/documentation/webdriver/browsers/),
[waits](https://www.selenium.dev/documentation/webdriver/waits/), [Grid](https://www.selenium.dev/documentation/grid/),
[Cypress: browsers](https://docs.cypress.io/app/references/launching-browsers),
[retryability](https://docs.cypress.io/app/core-concepts/retry-ability),
[isolation](https://docs.cypress.io/app/core-concepts/test-isolation),
[parallelization](https://docs.cypress.io/cloud/features/smart-orchestration/parallelization),
[trade-offs / tabs](https://docs.cypress.io/app/references/trade-offs).
