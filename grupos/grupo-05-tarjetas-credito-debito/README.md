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
- [x] BDD — `features/` (happy path caso negativo, y ed case cubiertos)
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
