# PLAN_TRANSFERENCIAS_WEB — Grupo 02 (Planner, skill playwright-ai-agents)

Arquitectura: **Cucumber (BDD) + Playwright + POM** — `F_*.feature` → `S_*.steps.ts` → `support/world.ts` → `pages/`.
Regla de la skill: la IA planifica, genera y diagnostica; **la ejecución en CI no usa IA**.

## Alcance

App: `https://aiquaa-sandbox-web.vercel.app` (curso 1). Datos: BD del sandbox vía `POST /api/v1/sql/select`.

| ID | Objetivo | Datos | Oráculo |
|---|---|---|---|
| WEB-LOGIN-01 | Email inexistente rechazado | literal | alerta "Usuario no encontrado o inactivo." |
| WEB-LOGIN-02 | Login con usuario activo | BD: usuario activo con cuentas | `h1` "Bienvenido, {nombre}" |
| WEB-TR-01 | Transferencia exitosa por UI | BD: 2 cuentas activas PYG | comprobante + estado `pendiente` + fila en BD |
| WEB-TR-02 | Misma cuenta rechazada | BD | alerta con "check constraint" + `COUNT(*)=0` |
| WEB-TR-03 | Monto 0 / negativo bloqueado | Ejemplos | `checkValidity() == false` + `COUNT(*)=0` |
| WEB-TR-04 | Historial filtrado incluye la nueva | BD | fila `transferencias-row-{id}` visible |

## Locators (contrato `data-testid` del sandbox)

`transferencias-form`, `transferencias-field-{cuentaOrigenId|cuentaDestinoId|monto|descripcion}`,
`transferencias-submit`, `transferencias-field-cuentaOrigenId-error`, `transferencias-success`,
`transferencias-detail`, `transferencias-row-{id}`, `transferencias-field-filtroCuentaOrigenId`,
`curso-option-1`. Login por rol accesible (`textbox Email`, `button Ingresar`).

## Gobierno de agentes

- **Generator**: produjo `pages/*.ts` y `steps/*.steps.ts` a partir de este plan (revisión humana).
- **Failure Classifier** (determinístico, 0 IA): `scripts/classify-failures.mjs` sobre
  `results/cucumber-grupo02.json` → `results/CLASIF_BDD_GRUPO02.json`
  (PRODUCT_BUG / TEST_BUG / ENVIRONMENT / DATA / NETWORK / UNKNOWN).
- **Healer**: solo si `TEST_BUG` con confianza `high`; puede tocar `pages/` (locators), nunca
  los `.feature` ni los oráculos de negocio. Cambios siempre por PR con revisión humana.

## Evidencias

Captura por escenario (adjunta al reporte), trace de Playwright en fallos
(`results/traces/*.zip`), reporte HTML de Cucumber e informe PDF (`reporter/grupo02-kale/bdd/bdd_report.py`).
Limpieza: los escenarios `@crea-datos` anulan (soft-delete) la transferencia creada.
