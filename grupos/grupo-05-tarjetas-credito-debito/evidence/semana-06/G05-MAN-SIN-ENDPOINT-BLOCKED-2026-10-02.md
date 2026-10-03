# Evidencia de bloqueo — escenarios `@manual @sin-endpoint` (Grupo 05)

**Fecha de verificación:** 2026-10-02
**Entorno:** sandbox AIQUAA — `https://aiquaa-sandbox-api.vercel.app`
**Método:** inspección del contrato publicado en `GET /api/v1/docs` + sondeo directo de los
endpoints que cada escenario necesitaría.
**Ejecutado por:** Matias Murto / Rafael Estigarribia, con verificación asistida sobre la API.

Este archivo es la evidencia compartida de los 9 escenarios `@manual @sin-endpoint` de
[`EJECUCION-MANUAL.md`](../../docs/EJECUCION-MANUAL.md). Todos quedan en **BLOQUEADO**: el
entorno no expone la funcionalidad bajo prueba, por lo que no hay forma de ejecutar el
`When` de ninguno de ellos, ni a mano ni automatizado.

## 1. Endpoints de tarjetas publicados en el contrato

Extraídos de `GET /api/v1/docs` (HTTP 200, 114 477 bytes). La superficie completa del módulo
tarjetas es:

```
GET    /api/v1/tarjetas
POST   /api/v1/tarjetas
GET    /api/v1/tarjetas/{id}
PUT    /api/v1/tarjetas/{id}
PATCH  /api/v1/tarjetas/{id}/activar
PATCH  /api/v1/tarjetas/{id}/bloquear
```

No existe ningún endpoint de PIN, OTP, límites diarios, pago de tarjeta ni autorizaciones de
compra.

## 2. Sondeo de los endpoints requeridos

Resultado real de las peticiones (la última es el control: una ruta que sí existe).

```
PATCH  /api/v1/tarjetas/4/pin              -> HTTP 404
PUT    /api/v1/tarjetas/4/limites          -> HTTP 404
POST   /api/v1/tarjetas/4/pagos            -> HTTP 404
POST   /api/v1/tarjetas/4/autorizaciones   -> HTTP 404
POST   /api/v1/tarjetas/4/otp              -> HTTP 404
GET    /api/v1/tarjetas/4/canales          -> HTTP 404
GET    /api/v1/tarjetas/4                  -> HTTP 200   (control)
```

El control en 200 descarta que los 404 vengan de un problema de autenticación, de la api key o
de la disponibilidad del servicio: las rutas simplemente no están implementadas.

## 3. Modelo de datos de la tarjeta

Respuesta real de `GET /api/v1/tarjetas`:

```json
{
  "id": "4",
  "usuario_id": "4",
  "tipo": "credito",
  "marca": "visa",
  "numero_enmascarado": "**** **** **** 1148",
  "limite_credito": "2627158.00",
  "saldo_actual": "395061.60",
  "estado": "activa",
  "created_at": "2026-08-15T23:36:00.914Z",
  "activo": true
}
```

La entidad no tiene `pin`, ni `limite_diario_compras`, ni `canales`, ni `motivo_bloqueo`. El
estado es un enum plano (`activa` / `bloqueada`), sin distinción entre bloqueo temporal y
definitivo ni registro de la causa.

## 4. Por qué cada escenario queda bloqueado

| ID | Escenario | Falta en el entorno |
| :--- | :--- | :--- |
| `G05-MAN-001` | Cambio exitoso de PIN | no hay endpoint de PIN ni campo `pin` |
| `G05-MAN-002` | Propagación del bloqueo a todos los canales | el modelo no tiene `canales`; `estado` no distingue bloqueo temporal |
| `G05-MAN-003` | Aumento exitoso de límite diario | no hay endpoint de límites ni campo `limite_diario_compras` |
| `G05-MAN-004` | Pago exitoso desde cuenta propia | no hay endpoint de pago de tarjeta |
| `G05-MAN-005` | Aumento de límite rechazado por OTP inválido | no hay endpoint de límites ni de OTP |
| `G05-MAN-006` | Cambio de PIN rechazado por PIN actual incorrecto | no hay endpoint de PIN |
| `G05-MAN-007` | Pago rechazado por saldo insuficiente | no hay endpoint de pago de tarjeta |
| `G05-MAN-008` | Compra por monto igual al límite diario | no hay endpoint de autorizaciones ni límite diario |
| `G05-MAN-009` | Desbloqueo denegado por motivo "ROBO" | la API no registra motivo de bloqueo |

## 5. Conclusión

Los 9 escenarios están **correctamente especificados** en el `.feature` y quedan como deuda de
cobertura atribuible al entorno, no al equipo. El núcleo del módulo que el sandbox **sí** expone
está cubierto y en verde por los 8 escenarios automatizados (`G05-TARJ-001..006`,
`G05-LOGIN-001..002`).

El décimo escenario manual, `G05-MAN-010`, es distinto: la funcionalidad **existe** y falla.
Está registrado como [`DEF-G05-01`](../../docs/DEFECTOS.md).
