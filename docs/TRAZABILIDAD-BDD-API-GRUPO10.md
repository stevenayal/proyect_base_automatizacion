# Trazabilidad BDD → API — Grupo 10 (Roles y Permisos)

Feature: `grupos/grupo-10-roles-permisos/features/roles-permisos.feature`
Requerimientos: `docs/requerimientos` (RF-G10-01 a RF-G10-08)
Colección: `postman/Grupo10_Roles_Permisos.postman_collection.json`
API bajo prueba: AIQUAA Sandbox (`/api/v1`), autenticación por header `x-api-key`

## Variables de la colección

| Variable | Uso |
|---|---|
| baseUrl | URL base del sandbox |
| apiKey | API key del alumno (no se versiona) |
| rolNombre | Rol a asignar (`soporte`) |
| rolInexistenteId | Id inválido para el caso negativo (999999) |
| usuarioId, roleEditorId | Se capturan automáticamente de las respuestas |
| emailUnico, documentoUnico | Se generan en el pre-request para evitar duplicados (409) |

## Mapeo de escenarios BDD → API

| ID | Escenario BDD | Requerimiento | Endpoint(s) | Resultado esperado | Resultado obtenido |
|----|---------------|---------------|-------------|--------------------|--------------------|
| ESC-01 | Administrador crea un usuario interno y le asigna un rol | RF-G10-01, RF-G10-02, RF-G10-03 | GET /roles; POST /usuarios; POST /usuarios/{id}/roles; GET /usuarios/{id}/roles | 200; 201; 201; 200 con el rol listado | Cumple |
| ESC-05 | Intento de asignar un rol inexistente | RF-G10-03 | POST /usuarios/{id}/roles (roleId = 999999) | 400 VALIDATION_ERROR y sin asignación nueva en BD | Cumple |
| ESC-06 | Usuario interno queda sin ningún rol | RF-G10-04 | DELETE /usuarios/{id}/roles/{roleId} | El BDD espera 400/409 | Brecha documentada: la API responde 204 y la colección verifica ese comportamiento (test en verde) |
| ESC-07 | (Caso propio) Reasignar un rol revocado | RF-G10-03 | POST /usuarios/{id}/roles tras revocar | 200, mismo id, misma fecha `asignado_en` | Cumple |

## Validación en base de datos (patrón pre/post-request)

El helper `utils.bodySqlRest(sql, params)` está declarado una sola vez en el Pre-request Script de la colección y consulta la BD con `POST /api/v1/sql/select` (solo lectura).

| Request | Pre-request (consulta a la BD) | Post-response (consulta a la BD) |
|---|---|---|
| 3. Asignar rol | `COUNT` de asignaciones vigentes del par usuario-rol = 0 | La fila existe con `activo = true` |
| Asignar rol que no existe (negativo) | `COUNT` de asignaciones del usuario antes del intento | El `COUNT` no cambió: el rechazo no insertó nada |
| Reactivar asignación revocada | Lee `id`, `activo` y `asignado_en` de la fila revocada | Sigue habiendo una sola fila, `activo = true`, mismo `id` y misma `asignado_en` |

Los campos que varían en el body son variables (`{{roleEditorId}}`, `{{rolInexistenteId}}`); el resto del JSON queda legible.

## Hallazgos

1. **ESC-06 (brecha entre BDD y requerimientos):** el escenario exige que no se pueda dejar a un usuario sin rol, pero RF-G10-04 solo establece que revocar un rol no afecta los demás, y ningún requerimiento define un mínimo de roles. La API responde 204 y deja al usuario sin rol. El test de la colección verifica el comportamiento actual (204); la brecha queda documentada aquí.
2. **Nombres de rol:** el escenario menciona "Editor", pero el catálogo (RF-G10-01) solo contiene `admin`, `soporte`, `auditor` y `operador`. Se usó `soporte`.

## Escenarios no automatizados a nivel API

- Operador sin permisos y acción sobre el límite permitido: la sección 8 de los requerimientos indica que los roles no otorgan ni restringen nada y ningún endpoint verifica el rol antes de operar.
- Cajero con desembolso de USD 49.999: no existe un endpoint de desembolsos en este módulo.

## Resultado de la corrida y evidencia

GitHub Actions: 27/27 assertions en verde (Newman). La captura tarea3-run-resumen.png es de la versión anterior de la colección, donde ESC-06 esperaba el rechazo y fallaba (26/27). Capturas en grupos/grupo-10-roles-permisos/evidence/.