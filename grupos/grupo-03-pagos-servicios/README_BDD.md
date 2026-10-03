# Grupo 03 · Cucumber + Playwright (BDD + POM)

Automatización del BDD del grupo, `features/pagos-servicios-FINAL.feature`, con **Cucumber +
Playwright**. Sigue la arquitectura "Cucumber + BDD + POM" de `skills/playwright-ai-agents-skill`,
y el código de Playwright sigue a `skills/playwright-skill`.

- **Todos los escenarios se prueban por API**, con el mismo contrato que la colección Postman Final.
- **Los 8 escenarios con tag `@web`** además verifican que la página
  `https://aiquaa-sandbox-web.vercel.app/facturas` muestre lo mismo que devuelve la API.

> La IA planifica, genera y diagnostica; Cucumber y Playwright ejecutan. Una prueba aprobada
> nunca necesita IA para pasar, y el pipeline no hace ninguna llamada a modelos.

## Estructura

```
grupos/grupo-03-pagos-servicios/
├── features/pagos-servicios-FINAL.feature   QUÉ: negocio en Gherkin (sin UI)
├── steps/                                   GLUE: 1 step = 1 llamada a la API del World o a un Page Object
│   ├── S_comunes.steps.ts                   preparación de facturas y respuestas comunes
│   ├── S_pagos.steps.ts                     RF-G3-03
│   ├── S_listado.steps.ts                   RF-G3-01 + regla transversal de API key
│   ├── S_consulta.steps.ts                  RF-G3-02
│   ├── S_registro.steps.ts                  RF-G3-04
│   └── S_modificacion_baja.steps.ts         RF-G3-05 y RF-G3-06
├── support/                                 CONTEXTO
│   ├── world.ts                             estado del escenario (factura, respuesta, listado)
│   ├── hooks.ts                             API, titular, navegador, evidencias, limpieza
│   ├── config.ts                            variables de entorno G3_*
│   ├── titular.ts                           elección del titular de la corrida (SQL)
│   ├── afirmaciones.ts                      status y error.code esperados
│   ├── api/ApiClient.ts                     ritmo de peticiones + reintento de 429 + registro de llamadas
│   ├── api/FacturasApi.ts                   operaciones del módulo de facturas y consultas a la base
│   └── web/VerificacionWeb.ts               comparación API vs web de los escenarios @web
├── playwright/pages/                        CÓMO: locators reales y esperas
│   ├── LoginPage.ts                         curso + email (sesión guardada una sola vez)
│   └── FacturasPage.ts                      filtros, tabla, contador, "Sin resultados."
├── reporter/g3_bdd_report.py                informe PDF con evidencias
├── cucumber.js                              perfiles g3-completa, g3-web y dryrun
├── tsconfig.json
└── GRUPO_03_bdd.bat                         ejecución desde la PC
```

**No se toca ningún archivo compartido**: ni `package.json`, ni el lockfile, ni
`playwright.config.ts`, ni nada de otros grupos. Cucumber se usa siempre con
`--config grupos/grupo-03-pagos-servicios/cucumber.js`. ts-node y typescript se instalan con
`--no-save`.

## Cómo correrlo

### Desde la PC (Windows)

```bat
grupos\grupo-03-pagos-servicios\GRUPO_03_bdd.bat            :: 8 escenarios @web (~3 min)
grupos\grupo-03-pagos-servicios\GRUPO_03_bdd.bat completa   :: 46 escenarios / 61 ejecuciones (~10 min)
grupos\grupo-03-pagos-servicios\GRUPO_03_bdd.bat dryrun     :: solo verifica que cada paso tenga código
```

Si hace falta, el `.bat` instala ts-node y typescript (sin guardarlos en `package.json`) y el
Chromium de Playwright. Cada corrida empieza vaciando `test-results\grupo-03-bdd\` (el
`dryrun` no la toca) y al terminar abre el informe PDF.

> **TypeScript 5, no 7.** ts-node 10 usa la API de compilador de TypeScript 5; TypeScript 7
> (el compilador nativo) ya no la trae y Cucumber falla al cargar los steps con
> `Cannot read properties of undefined (reading 'fileExists')`. El `.bat` detecta la versión
> instalada y, si no es la 5, instala `typescript@5` con `--no-save`. El workflow de CI ya
> instala esa versión.

### A mano (desde la raíz del repo)

```bash
npm install --no-save ts-node@10 typescript@5   # una sola vez
npx cucumber-js --config grupos/grupo-03-pagos-servicios/cucumber.js --profile dryrun
npx cucumber-js --config grupos/grupo-03-pagos-servicios/cucumber.js --profile g3-web
python grupos/grupo-03-pagos-servicios/reporter/g3_bdd_report.py --results test-results/grupo-03-bdd/cucumber-report.json
```

### Variables de entorno

| Variable | Default | Para qué |
|---|---|---|
| `G3_API_URL` | `https://aiquaa-sandbox-api.vercel.app` | API del sandbox |
| `G3_WEB_URL` | `https://aiquaa-sandbox-web.vercel.app` | web del listado |
| `G3_API_KEY` | clave demo de clase | API key (en CI: secret `GRUPO03_API_KEY`) |
| `G3_WEB_EMAIL` / `G3_WEB_CURSO` | **obligatorias para @web** | login de la web (en CI: secrets; el `.bat` usa `admin@aiquaa.com` / `1`) |
| `G3_RPM` | `20` | peticiones por minuto de la corrida |
| `G3_TITULAR` | vacío | titular fijo; vacío = el usuario activo con menos pendientes |
| `G3_TAGS` | vacío | filtro extra para `g3-completa` (ej. `@RF-G3-03`) |
| `G3_HEADED` | vacío | `1` = ver el navegador |

`G3_WEB_CURSO` es el número de la opción de curso en la página de login: `curso-option-1`
corresponde a "Curso 1 · Automatización".

## Cómo funciona

### Datos y rate limit

- **Titular de la corrida**: el usuario activo con menos facturas pendientes, elegido una
  sola vez por SQL (`POST /api/v1/sql/select`). Es el mismo criterio que Postman y JMeter, y
  hace falta porque el listado devuelve como máximo 100 facturas.
- **Facturas propias**: cada escenario crea sus facturas, con número único, y al final las da
  de baja (hook de limpieza).
- **Ritmo de peticiones**: cada petición, incluidas las de preparación, verificación y
  limpieza, espera su turno: 60000 / `G3_RPM` ms. La API key es compartida entre grupos.
- **429 de otros grupos**: se reintentan respetando `Retry-After` (hasta 3 veces, tope de
  60 s) y se cuentan en el resumen.

### Verificación en la web (@web)

Al terminar cada escenario `@web`, un hook `After`:

1. Abre `/facturas` con la sesión guardada. El login, que pide curso y email, se hace una
   sola vez por corrida.
2. Filtra como lo haría una persona. Si el escenario consultó un listado, usa los mismos
   filtros; si no, filtra por el titular. Sin filtro, la web solo muestra las primeras 100
   facturas y las nuevas no aparecen.
3. **Espera la respuesta de la API que pidió la propia página para esos filtros.** No espera
   a que la red quede inactiva: el filtro de usuario se aplica con demora y leer antes da
   datos viejos.
4. Compara fila por fila con esa respuesta: usuario, proveedor, número, monto (el valor sin
   formato de `data-value` y lo que se ve en pantalla), vencimiento, estado, cantidad, contador
   y "Sin resultados.".
5. Comprueba lo propio del escenario: la factura aparece con el estado y el monto que dejó
   la operación, o ya no aparece si se dio de baja.
6. Adjunta la captura, con la fila del escenario resaltada, y la tabla API vs web.

### Evidencias

| Escenario | Qué se adjunta |
|---|---|
| Todos | Las llamadas a la API del escenario: etapa, método y ruta, status, ms, 429, y la respuesta resumida de la operación bajo prueba. |
| @web | Además, la captura de `/facturas` filtrada y la tabla API vs web. |
| Fallidos @web | Además, la traza de Playwright en `test-results/grupo-03-bdd/traces/`. Se abre con `npx playwright show-trace`. |

Resultados en `test-results/grupo-03-bdd/`:

- `cucumber-report.json` y `.html`;
- `run-info.json`: titular, peticiones, 429 y limpieza;
- `INFORME_BDD_GRUPO03_PAGOS_SERVICIOS.pdf`;
- en CI, también `CLASIF_BDD_GRUPO03.json` (clasificador de fallos de la skill).

La sesión guardada de la web se borra al terminar y nunca va a los resultados.

## Agentes de IA (playwright-ai-agents-skill)

| Agente | En este grupo |
|---|---|
| Planner | Los escenarios ya estaban en el feature (BDD revisado por el equipo). |
| Generator | Generó los steps de negocio, el World y los Page Objects a partir del feature y de los selectores reales relevados en la web. Nivel **B**: lo genera la IA y el equipo lo revisa antes del merge. Se valida con el perfil `dryrun` (0 undefined, 0 ambiguous). |
| Classifier | En CI, `scripts/classify-failures.mjs` (sin IA) clasifica cada fallo en PRODUCT_BUG / TEST_BUG / ENVIRONMENT / DATA / NETWORK / UNKNOWN. |
| Healer | Bajo demanda y fuera de CI, solo para `TEST_BUG` de confianza alta. Puede tocar `playwright/pages/` y fixtures técnicos de `support/`; **nunca** el `.feature` ni los `Then` con valores de negocio. |

## Limitaciones

- La corrida escribe datos reales en un sandbox compartido. La limpieza da de baja las
  facturas creadas, pero los pagos quedan registrados.
- "Pago de una factura vencida" consume una factura vencida de los datos sembrados: se puede
  repetir mientras queden.
- Los escenarios `@web` dependen de que la web esté disponible. Si la web cambia sus
  `data-testid`, falla la verificación web y no la de la API: el fallo se clasifica y se
  corrige en `playwright/pages/`.
