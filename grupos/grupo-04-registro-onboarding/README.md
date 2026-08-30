# Grupo 04 — Registro de Usuario / Onboarding

**Módulo:** Alta de nuevo cliente (KYC básico)
**Rama:** `grupo-04-registro-onboarding`

## Integrantes

- (completar: nombre y email — ver `inscripcion-grupos-bdd2.xlsx`)
- Fabiola Fretes - fabiolafretes14@gmail.com

## Alcance

- TODO: objetivo del flujo automatizado
- TODO: supuestos
- TODO: riesgos
- TODO: cobertura incluida / excluida

## Entregables

Checklist según [ENTREGABLES.md](../../ENTREGABLES.md):

- [ ] Análisis y alcance
- [ ] BDD — `features/` (mínimo 3 escenarios: happy path, negativo, edge case)
- [ ] API — colección Postman/Newman (si aplica al módulo)
- [ ] UI — `tests/e2e/` con Playwright
- [ ] Evidencias en `evidence/`
- [ ] CI/CD verde
- [ ] PR a `main` usando la plantilla del repo

## Trazabilidad BDD → API

| Tipo | Escenario BDD | Endpoint AIQUAA | Resultado esperado |
|---|---|---|---|
| Happy Path | Registro exitoso de nuevo cliente con datos válidos | POST /api/v1/usuarios | 201 Created y se genera el ID del usuario |
| Negativo | Registro rechazado por número de cédula inválido | POST /api/v1/usuarios | 400 Bad Request y error VALIDATION_ERROR |
| Edge Case | Intento de registro con cédula ya existente en el sistema | POST /api/v1/usuarios | 409 Conflict y error CONFLICT |

### Validaciones adicionales

- GET /api/v1/usuarios/{{usuarioId}} para consultar y validar el usuario creado.
- PATCH /api/v1/usuarios/{{usuarioId}}/kyc para actualizar el estado KYC.
- Consulta de usuarios con estado KYC pendiente.
- Las validaciones de las respuestas se realizan mediante `pm.test()` y `pm.expect()` en Postman.
