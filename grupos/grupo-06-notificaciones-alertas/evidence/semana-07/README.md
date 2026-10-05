# Semana 07 — Integración y reporte (Grupo 06)

**Rama:** `grupo-06-notificaciones-alertas` · **Fecha de la corrida:** 03–04/10/2026
**Síntesis PDF (decisión, límites y riesgos):** `SINTESIS_SEMANA07_GRUPO06.pdf` _(adjunto)_

> **Los PDF marcados como _(adjunto)_ se entregan por separado y no se versionan.** En el repositorio queda la
> evidencia reproducible: capturas, traces, reportes JSON, métricas de JMeter y los scripts que generan cada PDF.

| Consigna | Dónde está |
|---|---|
| Flujo BDD acotado en la rama del equipo | [Flujo BDD acotado](#1-flujo-bdd-acotado) |
| Evidencia de éxito y de fallo controlado explicado | [`bdd-exito/`](bdd-exito/) · [`bdd-fallo-controlado/`](bdd-fallo-controlado/) |
| Evidencia API y JMeter de semanas previas, vinculada | [`api/`](api/) · [`jmeter/`](jmeter/) · [Vínculos](#3-evidencia-api-y-jmeter-vinculada) |
| Síntesis PDF con decisión, límites y riesgos | `SINTESIS_SEMANA07_GRUPO06.pdf` _(adjunto)_ |
| Cómo repetirlo y qué revisó cada integrante | [Cómo repetirlo](#4-cómo-repetirlo) · [Revisión por integrante](#5-qué-revisó-cada-integrante) |

---

## 1. Flujo BDD acotado

**Alcance:** acceso al módulo de notificaciones en el sitio web del sandbox (`aiquaa-sandbox-web.vercel.app`).
Es la precondición de los 9 escenarios de negocio: sin un usuario válido no se llega a la bandeja.
Se acotó a este flujo porque es el único verificado en vivo con `data-testid` estables
(ver [`specs/PLAN_NOTIFICACIONES_ACCESO.md`](../../specs/PLAN_NOTIFICACIONES_ACCESO.md)).

| ID | Escenario | Tag | Feature |
|---|---|---|---|
| G6-NOTIF-UI-01 | El botón "Ingresar" arranca deshabilitado | `@grupo06 @happy_path` | [`notificaciones-acceso-ui.feature`](../../features/notificaciones-acceso-ui.feature) |
| G6-NOTIF-UI-02 | Un usuario no registrado no llega a sus notificaciones | `@grupo06 @negative` | [`notificaciones-acceso-ui.feature`](../../features/notificaciones-acceso-ui.feature) |
| G6-NOTIF-UI-03 | **Fallo controlado** (falla a propósito) | `@grupo06_fallo_controlado` | [`notificaciones-fallo-controlado.feature`](../../features/notificaciones-fallo-controlado.feature) |

Stack: Cucumber + Playwright (Chromium), steps genéricos por `data-testid`
([`tests/bdd/steps/web.steps.ts`](../../../../tests/bdd/steps/web.steps.ts)) y evidencia por paso
([`support/evidencia.hooks.ts`](../../support/evidencia.hooks.ts)).

## 2. Evidencia de éxito y de fallo controlado

### Éxito — [`bdd-exito/`](bdd-exito/)
- **Resultado:** 2 de 2 escenarios · 11 de 11 pasos en verde.
- `EVIDENCIA_BDD_EXITO.pdf` _(adjunto)_: cada paso con su estado, duración y captura.
- [`capturas/`](bdd-exito/capturas/): una captura PNG por paso y un `trace.zip` por escenario.
- [`cucumber-report.json`](bdd-exito/cucumber-report.json): reporte crudo de Cucumber.

### Fallo controlado — [`bdd-fallo-controlado/`](bdd-fallo-controlado/)
- **Resultado esperado y obtenido:** 1 escenario, **falla en el último paso** (5 pasos OK, 1 fallido).
- **Qué se hizo:** se cambió deliberadamente el resultado esperado. Ante un usuario no registrado se exige
  `"Bienvenido"`, cuando el comportamiento correcto del sitio es `"Usuario no encontrado o inactivo."`
  (validado por G6-NOTIF-UI-02).
- **Mensaje obtenido:**
  ```
  Error: expect(locator).toContainText(expected) failed
  Locator: getByTestId('auth-login-field-email-error')
  Expected substring: "Bienvenido"
  Received string:    "Usuario no encontrado o inactivo."
  ```
- **Qué demuestra:**
  1. La suite **no da falsos positivos**: si el resultado no coincide, falla.
  2. La evidencia de fallo **sirve para diagnosticar**: muestra el valor esperado contra el recibido, la captura del momento exacto ([`06-...png`](bdd-fallo-controlado/capturas/)) y el trace de Playwright.
  3. El fallo está **aislado**: usa un tag propio y la ejecución normal y el CI (`--tags "@grupo06"`) no lo incluyen.
- `EVIDENCIA_BDD_FALLO_CONTROLADO.pdf` _(adjunto)_ incluye esta explicación en la portada.

## 3. Evidencia API y JMeter vinculada

| Capa | Semana | Evidencia previa | Evidencia de esta integración |
|---|---|---|---|
| API (Postman/Newman) | 1 | [`evidence/newman-grupo-06-run.txt`](../newman-grupo-06-run.txt) — 341 assertions, 0 fallos | [`api/RESUMEN_NEWMAN.md`](api/RESUMEN_NEWMAN.md) — **76 requests · 470 assertions · 0 fallos** (detalle por carpeta) · `api/INFORME_API_NEWMAN.pdf` _(adjunto)_ |
| Base de datos (SQL) | 2 | [`evidence/semana-03/`](../semana-03/) — evidencia SQL y HG06-03 | Incluida en la misma corrida de la API (consultas a `POST /api/v1/sql/select`) |
| CI Newman | 3 | [`.github/workflows/postman-grupo06-regression.yml`](../../../../.github/workflows/postman-grupo06-regression.yml) | Mismo runner local: `npm run test:api:grupo06` |
| JMeter | 4 | [`tests/performance/plans/Grupo06_Notificaciones.jmx`](../../../../tests/performance/plans/Grupo06_Notificaciones.jmx) | `jmeter/INFORME_PERF_GRUPO06.pdf` _(adjunto)_ — **SLA: PASS** |
| Rendimiento en CI | 5 | [`.github/workflows/jmeter-grupo06-performance.yml`](../../../../.github/workflows/jmeter-grupo06-performance.yml) · [`docs/rendimiento-jmeter.md`](../../docs/rendimiento-jmeter.md) | [`jmeter/dashboard-jmeter.png`](jmeter/dashboard-jmeter.png) · [`statistics.json`](jmeter/statistics.json) · [`.jtl`](jmeter/R_GRUPO06_NOTIFICACIONES.jtl) |
| BDD UI en CI | 6 | Workflow `Y_BDD_GRUPO06_cucumber_playwright.yml` en verde en GitHub (03/10/2026, runs 37137521056 y 37137525201) | [`bdd-exito/`](bdd-exito/) |

**JMeter (1 usuario × 5 iteraciones):** 10 requests · 0 % errores · APDEX 0,95 ·
POST p95 607 ms (umbral 1500 ms) · GET p95 269 ms (umbral 800 ms).

> El reporte JSON de Newman incluye la API key, por eso **no se versiona**. En su lugar se versiona
> `api/RESUMEN_NEWMAN.md`, generado con `scripts/resumen_newman.py`, que verifica que la key no aparezca.
> Ningún archivo de esta carpeta contiene la key.
>
> El total de requests varía entre corridas (76 a 79) porque la carpeta `00 Setup` borra una notificación por cada
> residuo que encuentra de corridas anteriores. En todas las corridas: 0 fallos.

## 4. Cómo repetirlo

Requisitos: Node 22, Python 3.11+ (`reportlab`), Java 17 para JMeter y `.env` con `GRUPO06_API_KEY`.
Comandos desde la raíz del repositorio (PowerShell):

```powershell
# BDD — éxito (~10 s): capturas en results/evidencia-grupo06/
npx cucumber-js --profile grupo06 --tags "@grupo06"
python grupos/grupo-06-notificaciones-alertas/scripts/evidencia_bdd_pdf.py --results results/cucumber-report.json --output results/EVIDENCIA_BDD_EXITO.pdf --titulo "Evidencia BDD - flujo exitoso"

# BDD — fallo controlado (termina con error a propósito)
npx cucumber-js --profile grupo06 --tags "@grupo06_fallo_controlado"
python grupos/grupo-06-notificaciones-alertas/scripts/evidencia_bdd_pdf.py --results results/cucumber-report.json --output results/EVIDENCIA_BDD_FALLO.pdf --titulo "Evidencia BDD - fallo controlado"

# API + base de datos (~6 min)
node grupos/grupo-06-notificaciones-alertas/scripts/run-newman.cjs
python grupos/grupo-06-notificaciones-alertas/scripts/resumen_newman.py --results newman/results.json --output results/RESUMEN_NEWMAN.md
python skills/postman-newman-skill/reporter/newman_report.py --results newman/results.json --output newman/report.pdf

# JMeter (~35 s) + informe y veredicto del SLA. Antes, calentamiento y espera de cupo (Git Bash):
#   bash grupos/grupo-06-notificaciones-alertas/scripts/esperar-cupo-api.sh "<API_KEY>"
$k = (Select-String -Path .env -Pattern '^GRUPO06_API_KEY=(.+)$').Matches[0].Groups[1].Value
New-Item -ItemType Directory -Force results/perf | Out-Null
jmeter -n -f -t tests/performance/plans/Grupo06_Notificaciones.jmx -l results/perf/R_GRUPO06.jtl -e -o results/perf/dashboard "-JcsvPath=tests/performance/data/grupo06-notificaciones.csv" "-JapiKey=$k" -Jthreads=1 -Jloops=5
npx -y aiquaa-performance-mcp-server --report results/perf/R_GRUPO06.jtl tests/performance/thresholds/grupo06-thresholds.json results/perf/INFORME_PERF_GRUPO06.pdf
```

Notas:
- No correr la API y JMeter al mismo tiempo: la API key y el límite de **30 requests/minuto** son compartidos entre grupos. Ante un `429`, esperar un minuto.
- JMeter 5.6.3 no funciona con Java 21+ por su versión de Groovy: usar Java 17, igual que el CI.
- Correr el calentamiento antes de JMeter: la primera petición tras un rato sin uso tarda ~1,5 s (arranque en frío del
  sandbox) y, con 5 muestras, alcanza para romper el p95.
- Las ejecuciones escriben en `results/`; para versionar una corrida se copia a esta carpeta.

## 5. Qué revisó cada integrante

Las **contribuciones** salen del historial de git de los archivos del grupo. La columna **Revisión de la
semana 07** la completa cada integrante con lo que revisó de esta entrega.

| Integrante | Contribuciones registradas en git | Revisión de la semana 07 |
|---|---|---|
| Fabian Machado | Escenarios BDD push; README; colección (contratos, seguridad S6/S8/SEG); validación SQL de `PATCH /leer`; CI de JMeter+MCP, Postman y Cucumber; perfil de Cucumber aislado | _a completar_ |
| Fernando Servián | Escenarios BDD e integrantes; colección Postman y trazabilidad BDD → API; validación SQL y criterios de aceptación (semana 03); ajuste del BDD UI al paso de curso y runner local de Newman; integración y evidencia de la semana 07 | _a completar_ |
| Karina Bogarín | Escenario 9 (email principal); cobertura de `GET /notificaciones/{id}`; patrón pre/post-request con validación SQL | _a completar_ |
| Ana Mendoza | Escenario de notificaciones por múltiples canales | _a completar_ |
| Madhy Avalos | Escenarios BDD de notificaciones SMS | _a completar_ |
