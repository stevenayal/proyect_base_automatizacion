# Semana 6 - Grupo 07 - Juan

Alumno: **Juan Barreto (jmbarret)**. Grupo 07 - Carrito e-commerce.

ID: **OE-G07-01 - Listado → crear orden → detalle**. Reutiliza el trabajo de Andrea para RF-G7-01/02/03, sin duplicar pruebas.

Ambiente: https://aiquaa-sandbox-web.vercel.app/.

| Requisito / escenario | Feature | Steps / contexto | Page Objects / motor | Validacion | Evidencia |
|---|---|---|---|---|---|
| RF-G7-01/02/03, OE-G07-01 | `tests/bdd/grupo07-ordenes-andrea/features/F_ORDENES_ENLAZADO_ANDREA.feature` | `steps/S_ORDENES_ENLAZADO_ANDREA.steps.ts` → `support/world.ts` | `pages/OrdenesListadoPage.ts`, `OrdenesNuevaPage.ts`, `OrdenesDetallePage.ts`; Playwright desde `support/hooks.ts` | Listado visible, creacion y detalle, producto, monto contra API, estado y persistencia | `cucumber-grupo07-andrea.json` y artifact de Actions |

Las rutas abreviadas de steps, support y pages pertenecen a `tests/bdd/grupo07-ordenes-andrea/`. Los localizadores permanecen en los Page Objects y los Then comprueban resultados observables. Los usuarios se obtienen mediante la API SQL existente y los productos llevan UUID.

## Ejecucion y parametros

Workflow: `.github/workflows/playwright-grupo07-juan-semana6.yml`, en el repositorio oficial `stevenayal/proyect_base_automatizacion`, rama `grupo-07-carrito-ecommerce-entrega`. Usa Node 22, `npm ci` y `npx playwright install --with-deps chromium`.

```sh
npm run test:bdd:ordenes-andrea:dryrun
npm run test:bdd:ordenes-andrea
```

`BASE_URL` toma `vars.AIQUAA_SANDBOX_BASE_URL` o el ambiente indicado. `GRUPO07_API_KEY` se mapea exclusivamente a `SANDBOX_API_KEY`. `BDD_TAGS` usa `@OE-G07-01`, configurable mediante `cucumber_tags` en la ejecucion manual. `ts-node` ya esta declarado en package.json; CI restaura la instalacion mediante `npm ci`.

Para repetir: abrir Actions en el repositorio oficial, seleccionar **Playwright BDD - Grupo 07 - Juan - Semana 6**, ejecutar sobre la rama canonica y descargar `playwright-grupo07-juan-semana6-<run_number>`. Tambien se ejecuta con push de los paths relevantes. El artifact publica `results/grupo07-andrea/**` siempre; incluye JSON/HTML y, cuando corresponde, trazas y captura del fallo.

## Evidencia y revision

La evidencia **versionada previa** `cucumber-grupo07-andrea.json` contiene 13/13 resultados PASSED: 11 pasos Gherkin y hooks Before/After. Esto no representa una nueva ejecucion local. El resultado de la nueva corrida se consulta en Actions.

El fallo controlado previo uso `ordenes-lista`, produjo `element(s) not found` y fue restaurado a `ordenes-list`. Ver `CLASIF_OE-G07-01-ANDREA.json`, `HEAL_OE-G07-01-ANDREA.md` y `REVISION_IA_OE-G07-01-ANDREA.md`. Se conserva el caso correcto; no se repite el fallo.

Revision humana previa: registrada por Andrea en `REVISION_IA_OE-G07-01-ANDREA.md`. La IA preparo el workflow y esta nota siguiendo el encargo de Juan; revision humana de estos dos archivos pendiente en PR #84. La skill `skills/playwright-ai-agents-skill/` se aplica manteniendo el BDD/POM existente y ejecucion determinista, sin IA en CI.

Archivos nuevos: un workflow de Semana 6 y este documento. Semana 5 y sus pruebas, datos, secretos y workflow quedan preservados.
