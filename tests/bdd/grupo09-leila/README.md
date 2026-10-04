# BDD — Grupo 09 · Leila Ruiz (Cucumber + Playwright + POM)

Arquitectura de `skills/playwright-ai-agents-skill` (variante Cucumber + BDD + POM):

```
features/F_*.feature  → negocio, en español (# language: es)
steps/S_*.steps.ts    → glue de una línea por step
pages/*Page.ts        → Page Objects (data-testid del sandbox)
support/              → world, hooks (trace + captura), cliente API con reintento ante 429
```

| Escenario | Tipo | Qué valida |
| --- | --- | --- |
| GRUPO09-LEILA-01 | happy path | Un usuario con rol auditor (obtenido por API) aparece con "auditor = Asignado" en /roles |
| GRUPO09-LEILA-02 | happy path | /reportes filtrado por ese usuario muestra la misma cantidad de movimientos que `GET /reportes/resumen` |
| GRUPO09-LEILA-03 | negativo | usuarioId inexistente → "Sin resultados." y 0 movimientos |
| GRUPO09-LEILA-04 | edge case | Usuario activo sin roles → todos los roles "Sin asignar" |

Ejecutar local (desde la raíz):

```bash
SANDBOX_API_KEY=sbx_demo_f581ca21e68a347288c94d71 npx cucumber-js --config tests/bdd/grupo09-leila/cucumber.js
python reporter/grupo09-leila/bdd_report.py --results results/grupo09-leila/cucumber-report.json --output results/grupo09-leila/INFORME.pdf
```

CI: `.github/workflows/cucumber-playwright-grupo09-leila.yml` (dry-run → escenarios → clasificador de fallos → PDF → artefactos).
