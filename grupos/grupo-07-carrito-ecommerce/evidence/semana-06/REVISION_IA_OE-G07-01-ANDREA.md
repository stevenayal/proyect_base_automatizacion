# REVISION_IA_OE-G07-01 — registro de revisión de IA

**Escenario:** `OE-G07-01` — Listado → crear orden → detalle
**Herramienta:** OpenCode · **Fecha:** 2026-10-02 · **Autora del trabajo:** Andrea Escurra
**Fases cubiertas:** Plan / Generate / Classify / Heal

Este documento es el registro que pide el punto 5 de la consigna: qué se le pidió
a la IA, qué aceptó, qué rechazó y con qué evidencia se verificó.

---

## 1. Qué es IA y qué no en este trabajo

Conviene separarlo, porque la consigna pide "utilizar la skill" y no todo lo que
parece IA lo es:

| Pieza | ¿IA? | Qué es |
|---|---|---|
| `classify-failures.mjs` | **No** | Script determinista de la skill. Clasifica el fallo por patrones (`locator-not-found`). Sin modelo. |
| Análisis del plan (`tarea-6-analisis.md`) | **Sí** | Exploración del repo y contrastación de afirmaciones contra el código real. |
| Generación del feature, POM y steps | **Sí** | Redacción a partir del contrato de locators verificado. |
| Healer | **Sí**, ejecutado a mano | Se aplicaron los guardrails de la skill de forma manual (ver §4). |

**Los comandos `/pw-ia:*` son de `CLAUDE.md` (Claude Code).** Este trabajo se hizo
con OpenCode, así que el Classifier se ejecutó con **su script real** y el Healer
se aplicó **siguiendo los guardrails de `references/healing-guardrails.md`**, con
los gates verificados uno por uno y documentados en `evidence/semana-06/HEAL_OE-G07-01-ANDREA.md`.

## 2. Decisiones aceptadas

| # | Decisión | Por qué |
|---|---|---|
| 1 | Workspace en `tests/bdd/grupo07-ordenes-andrea/`, no en `grupos/` | El `cucumber.js:6` raíz globa `grupos/**/*.feature` pero solo carga steps de `tests/bdd/steps/**`. Un feature ahí daría colisión de definiciones. |
| 2 | **No** mergear `main` | El plan original pedía `git merge origin/main` (además con el remoto mal nombrado). Todo lo necesario ya estaba en la rama; mergear `main` solo suma riesgo sobre la rama compartida. |
| 3 | Identificador de Andrea en todos los nombres | Convención ya usada por Andrea en el repo (`jmeter-grupo07-andrea-...`, `informe-perf-ordenes-andrea.pdf`). Los POM conservan nombres de clase limpios. |
| 4 | API key tomada del repo, no inventada | `P_ORDENES.jmx:5` la tiene versionada (es la key pública del sandbox). Se verificó que responde `200` antes de construir nada. |
| 5 | Monto leído del **atributo** `data-value` | Verificado en vivo: el atributo trae `320.98` y el texto en pantalla `320,98`. Un `toHaveText` fallaría siempre. |
| 6 | El monto se compara **contra la API**, no contra `Σ subtotales` | La API guarda el **precio unitario** en `subtotal` (confirmado en la orden 1: cantidad 2, unitario 119.99, subtotal 119.99). "total = Σ subtotales" es un assert falso. |
| 7 | No assertar que la orden nueva aparezca en el listado | El listado está paginado (947 filas de miles). Se verifica en el detalle y contra la base. |
| 8 | Usuario por SQL, sin constantes | `SELECT ... WHERE activo = $1 ORDER BY id LIMIT 1`. Si el sandbox cambia sus usuarios, el escenario sigue funcionando. |
| 9 | Producto con `uuid` | El sandbox es compartido por los 10 grupos; un nombre fijo chocaría con datos ajenos. |
| 10 | POM propios para login, en vez de importar los de `sandbox-pom` | Importar ataría este workspace a archivos de otro workspace. El CI corre solo con nuestra config. |
| 11 | Fallo controlado **rompiendo un testid** | Un mock que devuelve 500 probaría el manejo de errores del front, no el oráculo del test. Romper el locator sí prueba que el test detecta la regresión. |
| 12 | Limpieza de la orden **por API** en el `After` | El borrado por UI no es requisito del escenario; no depender de una pantalla fuera de alcance. |
| 13 | `retry: 0` en los perfiles de Cucumber | El JSON de Cucumber no distingue un fallo flaky de uno real. Un retry taparía justo el fallo que el clasificador debe ver. |
| 14 | `env` a **nivel de job** en el workflow | Lección de la Tarea 5: `inputs.*` no existe en `pull_request`. Como el `cucumber.js` falla si no ve `SANDBOX_API_KEY`, el `dryrun` también lo necesita. |
| 15 | Workflow **sin trigger de `push`** | Con el PR abierto, cada push dispararía la corrida dos veces contra la cuota compartida. Misma trampa corregida en la Tarea 5. |
| 16 | Secret con fallback a la key pública | `secrets.SANDBOX_API_KEY \|\| 'sbx_demo_...'` — el workflow sigue siendo ejecutable por cualquiera del grupo sin cargar el secret. |
| 17 | Un **único** `# criterio:` arriba del `Scenario` | El plan pedía tres dentro del scenario. Leyendo `bdd_report.py:120-136`, el reporter toma `elements[].comments` y **gana la última coincidencia**, con una fila por escenario: tres comentarios habrían mostrado solo RF-G7-03. Los comentarios por paso quedaron sin el prefijo `criterio:`. |
| 18 | `agregar-criterios.mjs` (script propio) | El formatter `json:` de Cucumber 11 **no emite `comments`** (0 referencias en `json_formatter.js`). Sin inyectarlos, la matriz del PDF salía `(sin criterio documentado)`. |
| 19 | Evidencia en `evidence/semana-06/` | Convención real del repo (Tarea 3 y 5). `results/` es gitignored, así que si no se copia, la evidencia no entra al repo. |

## 3. Decisiones rechazadas

| # | Propuesta | Por qué se rechazó |
|---|---|---|
| 1 | `# language: es` en el feature (venía del plan) | **Rompe el parseo.** Con el dialecto español, Gherkin exige `Característica:`, `Escenario`, `Dado/Cuando/Entonces`. El ejemplo del profesor no declara idioma justamente por eso. Falló el dryrun y se resolvió quitando la directiva. |
| 2 | Bajar la versión de Cucumber para recuperar los `comments` | Habría roto el `package-lock.json` compartido con el resto del curso y los workflows de otros grupos. |
| 3 | Modificar `bdd_report.py` | Es del profe y lo usan otros grupos. El problema se resolvió del lado del JSON, no del reporter. |
| 4 | Mergear `main` | Ver decisión 2. |
| 5 | Traer otra skill de Playwright | `sandbox-pom` ya cubre el patrón; sumarla sería redundante. |

## 4. Errores propios que hubo que corregir

Registro honesto, porque son los que se repiten al estudiar:

| Error | Síntoma | Causa |
|---|---|---|
| `constollego` (faltaba el espacio) | `ReferenceError` en el script de smoke test | Tipo al escribir el `.mjs` |
| `letsteps` (faltaba el espacio) | `ReferenceError` en `agregar-criterios.mjs` | Idem |
| Falta `dotenv/config` en el workspace | El primer run real falló en el primer step (`SANDBOX_API_KEY` vacío) | El `.env` lo cargaba solo el script de smoke test, no los archivos del workspace |
| `# language: es` | 13 errores de parseo Gherkin | Dialecto español exige keywords en español |
| Atribución de `sandbox-pom` a G08 | — | Verificado con git: lo escribió el profesor (`cd139c3 — Steven Ayala`) |
| `YF:classify:bdd` "no acepta argumentos" | — | Ese script ni siquiera está en nuestra rama; el clasificador real sí acepta `--input`/`--out` |

## 5. Verificación

| Comprobación | Resultado |
|---|---|
| `npx tsc --noEmit` | 0 errores |
| `--profile dryrun` | 0 `undefined`, 0 `ambiguous` |
| Smoke test de locators (`_smoke-locators.mjs`) | 22/22 OK |
| `@OE-G07-01` corrida real | **11/11 steps PASS** |
| Fallo controlado (testid roto) | **ROJO** — `element(s) not found`, timeout 5000 ms |
| Clasificación del fallo | **`TEST_BUG` / `high` / `healerAllowed: true`** |
| Healer | Fix de 1 línea en `pages/` (whitelist), sin tocar `.feature` ni steps |
| Restaurado | `git diff` limpio → **11/11 PASS** |
| Informe PDF | `VEREDICTO: CRITERIOS CUMPLIDOS`, matriz con RF-G7-01/02/03 |
| Workflow simulado localmente | 6 pasos OK con el env del job |

## 6. Cobertura de los 5 puntos de la consigna

| Punto | Evidencia |
|---|---|
| 1. Plan revisado e ID del requisito | `PLAN_ORDENES_ENLAZADO-ANDREA.md` + tags `@OE-G07-01` |
| 2. `.feature`, mapa de pasos, POM y comprobación | `F_ORDENES_ENLAZADO_ANDREA.feature`, 5 POM, steps sin `page.*` |
| 3. Ejecución Cucumber + evidencia del resultado | PDF con matriz de trazabilidad + JSON de Cucumber |
| 4. Fallo controlado explicado y caso restaurado | `CLASIF_OE-G07-01-ANDREA.json` + `HEAL_OE-G07-01-ANDREA.md` |
| 5. Instrucciones de repetición y registro de IA | Este documento + `package.json` (3 scripts npm) |

## 7. Conclusión

Los 5 puntos quedan cubiertos. La revisión fue humana en cada decisión: ninguna
afirmación del plan original se aceptó sin verificarla contra el repo, y cinco
resultaron ser falsas (el remoto, la atribución de la plantilla, las capacidades
del clasificador, el estado de los otros grupos y el dialecto del feature).

Lo que más conviene recordar para estudiar: **el sandbox es client-side**. Los
`data-testid` no se pueden verificar con un `curl`, y `dryrun` no abre navegador.
Por eso el contrato de locators se verificó con un smoke test real antes de
escribir un solo Page Object.