# PLAN_NOTIFICACIONES_ACCESO — Grupo 06

| Campo | Valor |
|---|---|
| Historia | Acceso del usuario al módulo de notificaciones (precondición para los 9 escenarios de negocio ya documentados en `features/notificaciones-alertas.feature`) |
| Nivel | B — IA con revisión humana |
| Arquitectura | Cucumber + BDD, steps genéricos por `data-testid` (`tests/bdd/steps/web.steps.ts`) — este repo NO usa Page Object Model en los steps; no mezclar con la variante POM |
| Seed / auth | No requerida (escenario público, sin sesión) |
| PO / DSL | Ninguno — este repo usa steps genéricos (`que estoy en la página`, `completo el campo`, `hago click en`, `veo el elemento`) |
| Tags | `@grupo06`, `@G6-NOTIF-UI-01` |
| Tier sugerido | económico |

## Contrato `data-testid`

Verificados contra el sandbox real (`https://aiquaa-sandbox-web.vercel.app/`) y ya usados
en `features/demo-login.feature`:

- `auth-login-submit`
- `auth-login-field-email`
- `auth-login-field-email-error`

## Escenario generado — G6-NOTIF-UI-01

Cubre la precondición de acceso: sin login válido, el usuario no puede llegar a la
pantalla de notificaciones. Reutiliza el único flujo de UI verificado en vivo hasta el
momento (login) — ver nota de alcance abajo.

## Riesgos

- El botón de ingresar deshabilitado y el mensaje de error de usuario no encontrado son
  reglas de negocio → `expected` no healeable (blacklist del Healer).
- No hay `storageState`/seed de usuario autenticado en este repo todavía para este grupo;
  por eso el escenario cubre acceso, no el contenido de la bandeja de notificaciones.

## Fuera de alcance (pendiente de validación humana antes de ampliar)

Los 9 escenarios de `features/notificaciones-alertas.feature` (push/SMS/email) describen
comportamiento de **negocio**, no de **UI**: no se pudo confirmar contra el sandbox real si
existe una pantalla de bandeja de notificaciones con `data-testid` propios (bell icon,
lista, badge de no leídas), porque el sitio es una SPA sin contenido accesible sin
JavaScript y esta sesión no tiene un navegador autorizado para navegar
`aiquaa-sandbox-web.vercel.app` fuera del entorno de la cátedra. **Antes de generar
`S_notificaciones.steps.ts` para esos escenarios, Fabián debe abrir el sandbox,
inspeccionar los `data-testid` reales de la bandeja de notificaciones (F12 → Elements) y
confirmarlos acá** — así se respeta la regla de la skill "NO inventa selectores".

## Salida esperada

- `features/notificaciones-acceso-ui.feature` (este plan)
- Sin archivos `.ts` nuevos — reutiliza `tests/bdd/steps/web.steps.ts` y
  `tests/bdd/support/{world,hooks}.ts` tal cual
