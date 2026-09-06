# Grupo 05 — Tarjetas de Crédito/Débito

**Módulo:** Gestión de tarjetas
**Rama:** `grupo-05-tarjetas-credito-debito`

## Integrantes

- Marcos Trinidad ---> (completar email)
- Rafael Estigarribia ---> (rafaer93@gmail.com)
- Emilio Oheler ---> (ohelerhernan@gmail.com)
- Matias Murto ---> (matiasmurto1@gmail.com)
- Ivan Bolaños ---> (ivanbolanos92@gmail.com)

## Alcance

- **Objetivo:** validar las gestiones que el cliente realiza sobre sus tarjetas de
  crédito/débito: consulta de datos, cambio de PIN, bloqueo y desbloqueo, modificación
  de límites y pago de la tarjeta desde cuenta propia.
- **Supuestos:**
  - El cliente está autenticado en la app con biometría válida y posee al menos una
    tarjeta de crédito/débito vigente.
  - Las operaciones sensibles (cambio de límite) requieren confirmación por OTP.
  - Los datos de tarjeta usados en las pruebas son de prueba, nunca reales.
- **Riesgos:**
  - Los cambios de estado de tarjeta (bloqueo/desbloqueo) deben propagarse a todos los
    canales; una propagación asíncrona puede generar resultados intermitentes.
  - La dependencia de OTP y biometría exige datos de prueba controlados.
- **Cobertura incluida:** consulta de datos de la tarjeta, cambio de PIN, bloqueo
  temporal por pérdida, desbloqueo, aumento de límite diario (con OTP válido e inválido)
  y pago desde cuenta propia.
- **Cobertura excluida:** alta y emisión de tarjetas, tarjetas adicionales, 3-D Secure,
  reversos y reclamos, y conciliación con la marca (Visa/Mastercard).

## Escenarios entregados

7 escenarios en [`features/tarjetas-credito-debito.feature`](features/tarjetas-credito-debito.feature):
6 happy paths y 1 caso negativo (aumento de límite rechazado por OTP inválido).

## Entregables

Checklist según [ENTREGABLES.md](../../ENTREGABLES.md):

- [x] Análisis y alcance
- [x] BDD — `features/` (happy path caso negativo, y edge case cubiertos)
- [x] API — colección Postman/Newman
- [ ] UI — `tests/e2e/` con Playwright
- [ ] Evidencias en `evidence/`
- [ ] CI/CD verde
- [ ] PR a `main` usando la plantilla del repo

## Trazabilidad BDD -> API (AIQUAA)

| Escenario BDD | Tipo | Endpoint AIQUAA / Postman | Método | Datos Entrada | Validaciones / Assertions |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **Ver datos tarjeta** | Happy Path | `https://aiquaa-sandbox-api.vercel.app/api/v1/tarjetas/:id` | `GET` | `id` de la tarjeta | Status 200, `data` presente, contiene `id`, `numero_enmascarado`, `tipo`, `marca`, `estado`. |
| **Bloqueo temporal por tarjeta perdida** | Happy Path | `https://aiquaa-sandbox-api.vercel.app/api/v1/tarjetas/:id/bloquear` | `PATCH` | `id` de la tarjeta | Status 200, `estado` = `"bloqueada"`, contiene `id`, `usuario_id`, `tipo`, `marca`, `numero_enmascarado`, `estado`, `activo`. |
| **Desbloqueo exitoso de tarjeta bloqueada** | Happy Path | `https://aiquaa-sandbox-api.vercel.app/api/v1/tarjetas/:id/activar` | `PATCH` | `id` de la tarjeta | Status 200, `data` presente, `estado` = `"activa"`. |

## Variables de Entorno Utilizadas

* **`Api-Key`**: clave de autenticación (`x-api-key`) para las peticiones a la sandbox de AIQUAA.

## Validación SQL dinámica (pre-request + post-response)

Carpeta `E2E - Flujos con validacion SQL` en la colección Postman, sobre `PATCH /api/v1/tarjetas/:id/bloquear` y `/activar` (columna `estado` de la tabla `tarjetas`). Sigue el patrón de [`docs/TAREA-SQL-REST-DINAMICO.md`](../../docs/TAREA-SQL-REST-DINAMICO.md) y de la skill `postman-newman` (`skills/postman-newman-skill/skills/postman-newman/references/sql-prerequest-pattern.md`).

- Pre-request Script de la colección: helper `utils.bodySqlRest(sql, params)` (consulta `/api/v1/sql/select`) declarado una sola vez, y default `tarjetaId = 1`.
- **Bloquear tarjeta (UPDATE + validación SQL)**: pre-request confirma en la BD que la tarjeta id=1 está `activa`; post-response relee la BD y confirma `estado = 'bloqueada'`.
- **Activar tarjeta (UPDATE + validación SQL)**: cierra el ciclo — confirma `bloqueada` antes, `activa` después. La corrida completa deja la BD en el mismo estado en que empezó (repetible).
- **Bloquear tarjeta - id inexistente (validación negativa)**: sobreescribe `tarjetaId` a `999999`; la API responde 404 y un `COUNT(*)` antes/después confirma que no se modificó ninguna fila.

Evidencia de la corrida (Newman): [`evidence/grupo05-newman-sql-e2e.txt`](../../evidence/grupo05-newman-sql-e2e.txt) — 9 requests, 8/8 assertions OK.
