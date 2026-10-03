# Grupo 09 — Reportes y Dashboard

**Módulo:** Panel de control / reportes financieros
**Rama:** `grupo-09-reportes-dashboard-corregido`
**Rama:** `grupo-09-reportes-dashboard`

## Integrantes

- (completar: nombre y email — ver `inscripcion-grupos-bdd2.xlsx`)

## Alcance

- **Objetivo del flujo automatizado:** validar el módulo de Reportes y Dashboard
  de la sandbox AIQUAA, tanto a nivel UI (visualización del reporte de
  movimientos en `/reportes`) como a nivel API (las dos operaciones de
  movimientos: `GET /api/v1/movimientos/{id}` y `POST /api/v1/movimientos`),
  reutilizando las mismas operaciones de negocio que la colección de Postman
  y el plan de JMeter del grupo.
- **Supuestos:** el login del sandbox solo requiere email (sin contraseña);
  puede aparecer una pantalla previa de selección de curso que se maneja de
  forma opcional en `SandboxCoursePage`.
- **Riesgos:** la suite depende de la disponibilidad del sandbox web y de la
  API; los selectores de login se basan en atributos genéricos (`type=email`,
  texto del botón) porque la UI es una SPA sin IDs estables conocidos.
- **Cobertura incluida:** ver reporte en UI, obtener movimiento activo por
  API, intentar obtener un movimiento inexistente (negativo), crear un
  movimiento aleatorio por API (edge case).
- **Cobertura excluida:** edición/eliminación de movimientos, filtros de
  fecha del reporte, módulos distintos a Reportes/Movimientos.
- TODO: objetivo del flujo automatizado
- TODO: supuestos
- TODO: riesgos
- TODO: cobertura incluida / excluida

## Entregables

Checklist según [ENTREGABLES.md](../../ENTREGABLES.md):

- [x] Análisis y alcance
- [x] BDD — `features/` (4 escenarios: 2 happy path, 1 negativo, 1 edge case)
- [x] API — colección Postman/Newman (`postman/Coleccion_GRUPO_9...json` +
      workflow `postman-grupo09-regression.yml`)
- [x] UI — `tests/bdd/steps/grupo09-reportes-dashboard.steps.ts` +
      Page Objects en `playwright/pages/` (ejecutado vía Cucumber, no como
      `.spec.ts` suelto de Playwright Test)
- [ ] Evidencias en `evidence/` (se agregan tras la primera corrida en CI)
- [ ] CI/CD verde
- [ ] PR a `main` usando la plantilla del repo

## Cómo correr esta suite

```bash
npm install
npx playwright install chromium
cp .env.example .env
# completar TEST_USER, API_URL y SANDBOX_API_KEY en .env
npm run test:bdd
```

Esto corre **todos** los `.feature` del repo (incluye los de otros grupos).
Para correr solo el de este grupo:

```bash
npx cucumber-js "grupos/grupo-09-reportes-dashboard/features/**/*.feature" \
  --require "tests/bdd/steps/**/*.ts" --require "tests/bdd/support/**/*.ts" \
  --require-module ts-node/register
```
- [ ] Análisis y alcance
- [ ] BDD — `features/` (mínimo 3 escenarios: happy path, negativo, edge case)
- [ ] API — colección Postman/Newman (si aplica al módulo)
- [ ] UI — `tests/e2e/` con Playwright
- [ ] Evidencias en `evidence/`
- [ ] CI/CD verde
- [ ] PR a `main` usando la plantilla del repo
