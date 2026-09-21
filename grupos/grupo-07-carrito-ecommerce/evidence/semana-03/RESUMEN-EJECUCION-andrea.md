# Evidencia de Ejecucion - Grupo 07 (Semana 03) - Andrea Escurra

- **Coleccion:** grupo 07 - carrito / e-commerce (Andrea Escurra)
- **Fecha de ejecucion:** 6/9/2026, 19:30:00
- **Entorno:** aiquaa-sandbox-api (https://aiquaa-sandbox-api.vercel.app)
- **Carpeta ejecutada:** Eliminar producto de carrito - Andrea (flujo completo 1→2→3→4)
- **Requests ejecutados (API):** 8 (4 requests de negocio + 4 consultas al endpoint SQL REST)
- **Assertions:** 8 (✅ 8 / ❌ 0)
- **Resultado global:** ✅ PASS

## Alcance (Tarea 3 - Verificacion de BD con SQL REST)

Andrea valida con base de datos **solo su escenario BDD**: **Eliminar producto del carrito** (el
DELETE). El `1-Crear Orden` es **setup** (genera la orden descartable que se elimina) y NO valida
el POST en BD: el escenario de creacion/checkout lo cubre el integrante de checkout con la
coleccion oficial del grupo.

## Cobertura por escenario

| # | Escenario | Status esperado | Validacion realizada |
| :--- | :--- | :---: | :--- |
| 1 | 1-Crear Orden (setup) | 201 | POST /api/v1/ordenes + guarda `eliminarId` en collection variables |
| 2 | 2-Dar de Baja (caso feliz) | 204 | Pre-request: SELECT orden `activo=true` (precondicion BD) → DELETE → Tests: relectura BD `activo=false` (soft-delete persistido) |
| 3 | 3-Verificar Baja | 404 | GET /api/v1/ordenes/{{eliminarId}} → NOT_FOUND (orden inactiva ya no se lista) |
| 4 | 4-Orden inexistente (404, BD sin cambios) | 404 | DELETE /api/v1/ordenes/999999 → Pre-request: `COUNT(*)` antes → Tests: status 404 + relectura `COUNT(*)` despues igual (la BD no cambio) |

## Validaciones en BD aplicadas (patron SQL REST)

- **Endpoint:** `POST {{baseUrl}}/api/v1/sql/select` (solo lectura) con header `x-api-key`.
- **Pre-request de coleccion:** declara el helper `utils.bodySqlRest(sql, params)` y el valor
  por defecto `usuarioId=3`. Corre una sola vez por coleccion.
- **`2-Dar de Baja` (feliz):**
  - ANTES: `SELECT id, activo FROM ordenes WHERE id = $1` → assert `activo = true`.
  - DESPUES: misma consulta → assert `activo = false` (el 204 por si solo no bastaba: la BD
    confirma que el soft-delete quedó persistido).
- **`4-Orden inexistente` (negativo):**
  - ANTES: `SELECT COUNT(*) AS total FROM ordenes` → se guarda `totalAntes`.
  - DESPUES: misma consulta → `Number(totalDespues) === Number(totalAntes)` (la BD NO cambio).

## Manejo de variables

- **Collection variables:** `baseUrl`, `apiKey` (valores del sandbox pre-cargados),
  `eliminarId` (id dinamico de la orden creada) y `usuarioId` (`3`, valor por defecto).
- **Variables dinamicas:** `eliminarId` se captura en `1-Crear Orden` con
  `pm.collectionVariables.set('eliminarId', String(d.id))`; `totalAntes` se gestiona en el
  request negativo con `pm.variables.set(...)`.
- **Parametrizacion del body:** `1-Crear Orden` usa `"usuarioId": {{usuarioId}}` en lugar de
  valor hardcodeado; la variable del DELETE va en la URL (`{{eliminarId}}`), porque un DELETE no
  tiene body.
- **Pitfall respetado:** todos los valores que vuelven de `/api/v1/sql/select` llegan como
  string (ids/counts); se convierten con `Number(...)` / `String(...)` antes de comparar.

## Nota sobre IDs

Los ids usados son **generados en vivo por el flujo** (la orden se crea y se elimina en la misma
corrida). El `999999` del caso negativo es solo un id **inexistente** a proposito, para probar
que la BD no sufre cambios. No se inventan ids de datos existentes.

## Archivos de evidencia

- `newman-report.json` - salida JSON completa de Newman (8 requests, 8 assertions, 0 fallos).
- `newman-junit.xml` - reporte JUnit (integrable en CI).
- `RESUMEN-EJECUCION.md` - este resumen.