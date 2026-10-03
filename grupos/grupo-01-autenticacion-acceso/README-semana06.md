# Semana 06 - Cucumber, Playwright, reportes y CI

## Estado verificado el 3 de octubre de 2026

Rama: `semana-06/grupo-01-cucumber-playwright`.

La suite local está **verde**: `npm run test:semana06` terminó con código 0,
con 3 escenarios y 22 pasos aprobados, **0 undefined y 0 ambiguous**.

| Caso | Resultado real | Evaluación |
|---|---|---|
| AUT-01 | HTTP 200, email esperado, usuario activo, abre `/`, saludo y botón Cerrar sesión visibles | PASA |
| AUT-02 | HTTP 400, mensaje `Usuario no encontrado o inactivo.`, permanece en `/auth/login` | PASA |
| AUT-03 | Email vacío, botón Ingresar deshabilitado, ningún POST de login | PASA |

AUT-01 se actualizó con autorización de la usuaria para validar el login exitoso de un usuario activo.
Se cambió su título, tags y dos pasos de verificación; AUT-02 y AUT-03 conservan su contenido.
La descripción general del feature ahora incluye acceso válido. No se simulan respuestas del backend.

## Flujo probado

Único sitio bajo prueba: https://aiquaa-sandbox-web.vercel.app.

1. Abrir `/auth/login` en un contexto nuevo y sin sesión.
2. Seleccionar `Curso 1 · Automatización` y pulsar Continuar.
3. Completar el formulario de email, sin campo de contraseña.
4. Pulsar Ingresar y esperar el `POST /api/proxy/auth/login` real.
5. Comprobar el body `{ "email": "..." }`, el estado HTTP y la interfaz resultante.

El Page Object usa los `data-testid` del sandbox. Los steps delegan acciones y verificaciones;
no contienen locators, pausas arbitrarias ni errores silenciados. El argumento del curso se valida.
El timeout de Cucumber se establece con `setDefaultTimeout(30000)` en support.
Cada escenario tiene su propio navegador y contexto; el cierre ocurre incluso si falla la captura.
`BASE_URL` se rechaza si apunta a un sitio distinto del sandbox.

Para email vacío, no se fuerza un clic sobre un control deshabilitado. Se verifica su estado,
el valor vacío, la ausencia de solicitudes de login y la permanencia del formulario.

## Instalación y ejecución

Ejecutar los comandos desde la raíz del repositorio. CI utiliza Node.js 22 y Python 3.11.
Las versiones Node se resuelven mediante `package-lock.json`, sin cambiar sus dependencias.

```bash
npm ci
npx playwright install chromium
python3 -m pip install -r reporters/requirements-semana06.txt

# Revisar correspondencia de steps, sin navegador y sin sobrescribir reportes reales.
npm run test:semana06:dry

# Ejecución real: la última validación devolvió 0.
npm run test:semana06

# Ejecutar también cuando la suite falla; no encadenar mediante &&.
npm run report:semana06

# Verificaciones locales.
npx tsc --noEmit
python3 -m unittest discover -s reporters -p 'test_semana06_report.py'
```

La ejecución local se realizó con Node 24.20.0: Cucumber emitió una advertencia de versión no
verificada. La suite se ejecutó; CI fija Node 22. No se ejecutó el workflow remoto.

## Reportes y evidencias

Rutas relativas al directorio de este README:

- `reports/semana-06/cucumber-report.json`: resultados del formatter Cucumber.
- `reports/semana-06/cucumber-report.html`: reporte interactivo con capturas adjuntas.
- `reports/semana-06/INFORME_SEMANA06.pdf`: resumen fiel al JSON, incluyendo fallo y respuestas observadas.
- `reports/semana-06/VALIDACION_SEMANA06.md`: comprobaciones, alcance y limitaciones.
- `evidence/semana-06/<fecha-UTC>/AUT-01.json` y `.png`, y equivalentes AUT-02/AUT-03.

Cada escenario adjunta metadatos y una captura al reporte. Los JSON de evidencia incluyen fecha,
URL final y solicitudes de login con email, estado HTTP y mensaje de error; no guardan cookies
ni tokens. Cada ejecución usa una carpeta propia; el `runId` del JSON identifica la correspondiente.

El reporter cuenta los fallos de hooks, undefined, ambiguous, pending y estados desconocidos como
fallos. Los escenarios con pasos omitidos no cuentan como aprobados. Los hooks ocultos no aumentan
el contador de pasos Gherkin. Cero escenarios nunca produce un veredicto exitoso.
Siete pruebas de regresión cubren estos criterios. El reporter rechaza features ajenos a Semana 06.

## GitHub Actions

Archivo: `.github/workflows/semana06-grupo01-cucumber-playwright.yml`.

Se activa manualmente, con push a `main` o `semana-06/**`, y con pull requests que modifican archivos
relevantes. Incluye cambios a package.json, lockfile, TypeScript, reporter y configuración.

El workflow instala dependencias y Chromium; verifica TypeScript, reporter y steps; elimina los
reportes previos de su checkout; ejecuta la suite; genera PDF aun si fallan escenarios y publica
reportes y evidencias durante 14 días. No usa `continue-on-error`: un fallo real mantiene rojo el job.
No despliega aplicaciones: su entrega consiste en artifacts de pruebas.

Se verificaron sintaxis YAML y estructura localmente. El comportamiento remoto requiere push y
una ejecución en GitHub Actions. La suite local está verde; el resultado remoto sólo se confirma ejecutando GitHub Actions.

## Archivos por bloque técnico

| Bloque | Archivos |
|---|---|
| Cucumber + Playwright | `cucumber.semana06.js`, scripts de `package.json`, `playwright/pages/semana-06/LoginPage.ts`, `tests/bdd/steps/semana-06/login.steps.ts`, `tests/bdd/support/semana-06/world.ts` y `hooks.ts` |
| Reportería | `reporters/semana06-report.py`, `reporters/test_semana06_report.py`, `reporters/requirements-semana06.txt` (rutas desde la raíz), reportes y evidencias |
| CI | `.github/workflows/semana06-grupo01-cucumber-playwright.yml` (desde la raíz) |
| Documentación | Este README y `reports/semana-06/VALIDACION_SEMANA06.md` |

No se atribuye autoría a integrantes. No se afirma uso de skills o agentes que no se haya realizado.

## Separación y límites de regresión

La configuración Semana 06 carga únicamente su feature y sus steps/support. No importa el World
global ni `LAB-LOGIN-001`. Se preservaron los scripts anteriores de package.json, el lockfile,
los archivos fuente de semanas previas y los cambios locales preexistentes ajenos a Semana 06.

TypeScript compila y Playwright descubre 14 pruebas existentes sin ejecutarlas. No se declara
regresión E2E completa de semanas anteriores: esos tests no se ejecutaron contra sus destinos.
El listado de Playwright regeneró su reporte HTML global ignorado por Git; esto no modificó sus
fuentes ni los resultados JSON de Semana 06.

No se hicieron commits, push, merge ni PR. Revisar y seleccionar sólo este bloque al preparar
commits técnicos; no agregar de forma masiva los cambios preexistentes de LAB-LOGIN-001.
