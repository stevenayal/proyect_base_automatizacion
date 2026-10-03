# PLAN_TARJETAS — Grupo 05

Plan de la suite BDD del módulo Tarjetas, en el formato del Planner de
`skills/playwright-ai-agents-skill` (arquitectura Cucumber + BDD + POM). Los escenarios no se
repiten acá: viven en `../features/`.

## Metadatos

| Campo | Valor |
|---|---|
| App | AIQUAA Sandbox — web `https://aiquaa-sandbox-web.vercel.app/`, API `https://aiquaa-sandbox-api.vercel.app` |
| Features | `features/autenticacion/F_LOGIN.feature`, `features/tarjetas/F_TARJETAS.feature` |
| Arquitectura | Cucumber + BDD + POM |
| Nivel de generación | **B** — IA + revisión: el código se generó con la skill y lo revisó el equipo |
| Criticidad | Medios de pago: el Healer nunca toca `.feature` ni los `Then` con `expect` de negocio |
| Datos | Cada escenario registra su tarjeta por API (`Given ... registrada`); usuario `SANDBOX_USUARIO_ID` (1), cliente `bruno.ramirez@example.com` del curso 1 |
| Auth | Web: login sin contraseña por email. API: header `x-api-key` (`SANDBOX_API_KEY`) |

## Capas

| Capa | Archivo | Responsabilidad |
|---|---|---|
| QUÉ | `features/**/F_*.feature` | Negocio en Gherkin, sin endpoints ni selectores |
| GLUE | `steps/S_autenticacion.steps.ts`, `steps/S_tarjetas.steps.ts` | 1 step = 1 llamada a PO o API; `expect` de negocio en `Then` |
| CONTEXTO | `support/world.ts`, `support/hooks.ts` | POs lazy (`this.login`, `this.tarjetas`), `this.api`, evidencia por ID |
| API | `support/tarjetas-api.ts` | Endpoints, reintento ante 429, verificación SQL con whitelist |
| CÓMO | `../playwright/pages/*Page.ts` | Locators por `data-testid` y esperas de UI; compartidos con `tests/e2e/T_TARJETAS_SMOKE.spec.ts` |
| DIAGNÓSTICO | `scripts/classify-failures.mjs` | Failure Classifier determinístico de la skill (copia vendorizada) |

## Contrato de `data-testid`

| Pantalla | testids |
|---|---|
| Curso | `curso-form`, `curso-option-{n}`, `curso-submit` |
| Login | `auth-login-form`, `auth-login-field-email`, `auth-login-submit`, `auth-login-field-email-error`, `nav-usuario` |
| Tarjetas | `nav-item-tarjetas`, `tarjetas-field-usuarioId`, `tarjetas-count`, `tarjetas-list`, `tarjetas-row-{id}`, `tarjetas-row-{id}-bloquear`, `tarjetas-row-{id}-activar` |
| Detalle | `tarjetas-detail`, `tarjetas-field-marca`, `tarjetas-row-{id}-edit-submit` |

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Rate limit de 30 req/min por api-key | Reintento ante 429 en `TarjetasApi` y en los POs; el workflow espera cupo antes de correr y comparte grupo de concurrencia con Newman/JMeter |
| Arranque en frío de Vercel | Timeout de step de 75 s (`STEP_TIMEOUT_MS`) |
| Escrituras compartidas entre grupos | Cada escenario crea su propia tarjeta y verifica por id |
| Botones Bloquear/Activar del listado sin efecto (DEF-G05-01) | Escenario `@manual @defecto`; el bloqueo se cubre por API (G05-TARJ-002/003) |

## Fuera de alcance

PIN, OTP, límites diarios y pago de tarjeta: el sandbox no expone endpoints. Quedan como
escenarios `@manual @sin-endpoint` en `F_TARJETAS.feature`, con su ejecución manual asentada en
`../docs/EJECUCION-MANUAL.md`.

## Validación

```bash
CFG=grupos/grupo-05-tarjetas-credito-debito/bdd/cucumber.js
npx cucumber-js --config $CFG --profile dryrun     # 0 undefined, 0 ambiguous
npx cucumber-js --config $CFG --profile grupo05    # suite automatizable
node grupos/grupo-05-tarjetas-credito-debito/bdd/scripts/classify-failures.mjs \
  --input results/grupo05/cucumber-report.json --out results/grupo05/CLASIF_BDD_GRUPO05.json
```
