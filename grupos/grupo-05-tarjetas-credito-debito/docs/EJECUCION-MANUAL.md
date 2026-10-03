# Ejecución manual — Grupo 05, Tarjetas de Crédito/Débito

Planilla de los escenarios que **no se pueden automatizar** contra el sandbox AIQUAA porque la
API no expone los endpoints correspondientes. Están especificados en
[`bdd/features/tarjetas/F_TARJETAS.feature`](../bdd/features/tarjetas/F_TARJETAS.feature) con los
tags `@manual @sin-endpoint`, y se ejecutan a mano sobre el entorno que el docente indique.

## Cómo completar esta planilla

1. Ejecutar el escenario paso a paso siguiendo el `Given/When/Then` del `.feature`.
2. Registrar el resultado (`PASA` / `FALLA` / `BLOQUEADO`), la fecha y quién lo ejecutó.
3. Adjuntar la evidencia en `evidence/semana-06/` con el nombre
   `<ID>-<PASSED|FAILED>-<fecha>.<png|pdf>`, el mismo patrón que usa la automatización.
4. Si el escenario falla, registrar el defecto en
   [`DEFECTOS.md`](DEFECTOS.md) y referenciarlo en la columna de observaciones.

## Resultado de la ejecución — 2026-10-02

Los 9 escenarios `@manual @sin-endpoint` se ejecutaron y quedaron en **BLOQUEADO**: el sandbox
no expone la funcionalidad bajo prueba, así que el `When` de cada caso no se puede llegar a
ejecutar. Se verificó contra el entorno vivo, endpoint por endpoint, y la evidencia está en
[`G05-MAN-SIN-ENDPOINT-BLOCKED-2026-10-02.md`](../evidence/semana-06/G05-MAN-SIN-ENDPOINT-BLOCKED-2026-10-02.md):
contrato publicado en `/api/v1/docs`, 6 sondeos en 404, un control en 200 que descarta problemas
de api key o disponibilidad, y el modelo de datos de la tarjeta sin los campos necesarios.

Dejarlo asentado es parte del entregable: documenta por qué la cobertura automatizada se detiene
donde se detiene. El décimo escenario, `G05-MAN-010`, es el único cuya funcionalidad existe y
falla: está registrado como [`DEF-G05-01`](DEFECTOS.md).

## Escenarios

| ID | Escenario | Tipo | Responsable | Resultado | Fecha | Evidencia | Observaciones |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `G05-MAN-001` | Cambio exitoso de PIN | happy path | Emilio Oheler | BLOQUEADO | 2026-10-02 | `G05-MAN-SIN-ENDPOINT-BLOCKED-2026-10-02.md` | sin endpoint de PIN — `PATCH /tarjetas/{id}/pin` responde 404 |
| `G05-MAN-002` | Propagación del bloqueo temporal a todos los canales | happy path | Rafael Estigarribia | BLOQUEADO | 2026-10-02 | `G05-MAN-SIN-ENDPOINT-BLOCKED-2026-10-02.md` | la API solo expone `estado`, sin canales ni motivo — `GET /tarjetas/{id}/canales` responde 404 |
| `G05-MAN-003` | Aumento exitoso de límite diario de compras | happy path | Ivan Bolaños | BLOQUEADO | 2026-10-02 | `G05-MAN-SIN-ENDPOINT-BLOCKED-2026-10-02.md` | sin endpoint de límites ni OTP — `PUT /tarjetas/{id}/limites` responde 404 |
| `G05-MAN-004` | Pago exitoso desde cuenta propia | happy path | Ivan Bolaños | BLOQUEADO | 2026-10-02 | `G05-MAN-SIN-ENDPOINT-BLOCKED-2026-10-02.md` | sin endpoint de pago de tarjeta — `POST /tarjetas/{id}/pagos` responde 404 |
| `G05-MAN-005` | Aumento de límite diario rechazado por OTP inválido | negativo | Marcos Trinidad | BLOQUEADO | 2026-10-02 | `G05-MAN-SIN-ENDPOINT-BLOCKED-2026-10-02.md` | sin endpoint de límites ni OTP — `POST /tarjetas/{id}/otp` responde 404 |
| `G05-MAN-006` | Cambio de PIN rechazado por PIN actual incorrecto | negativo | Matias Murto | BLOQUEADO | 2026-10-02 | `G05-MAN-SIN-ENDPOINT-BLOCKED-2026-10-02.md` | sin endpoint de PIN — `PATCH /tarjetas/{id}/pin` responde 404 |
| `G05-MAN-007` | Pago rechazado por saldo insuficiente en cuenta vista | negativo | Matias Murto | BLOQUEADO | 2026-10-02 | `G05-MAN-SIN-ENDPOINT-BLOCKED-2026-10-02.md` | sin endpoint de pago de tarjeta — `POST /tarjetas/{id}/pagos` responde 404 |
| `G05-MAN-008` | Compra autorizada por un monto exactamente igual al límite diario | edge case | Matias Murto | BLOQUEADO | 2026-10-02 | `G05-MAN-SIN-ENDPOINT-BLOCKED-2026-10-02.md` | sin endpoint de autorizaciones — `POST /tarjetas/{id}/autorizaciones` responde 404 |
| `G05-MAN-009` | Desbloqueo denegado cuando el bloqueo fue por motivo "ROBO" | edge case | Matias Murto | BLOQUEADO | 2026-10-02 | `G05-MAN-SIN-ENDPOINT-BLOCKED-2026-10-02.md` | la API no registra motivo de bloqueo: `estado` es un enum plano `activa`/`bloqueada` |
| `G05-MAN-010` | Bloqueo de tarjeta desde el listado web | defecto | Matias Murto | FALLA | 2026-09-19 | `DEF-G05-01` | reproducido: el botón no dispara petición |

## Cobertura automatizada equivalente

Estos casos sí se ejecutan en cada corrida y cubren el núcleo del módulo:

| ID | Escenario | Capa |
| :--- | :--- | :--- |
| `G05-TARJ-001` | Ver datos tarjeta | api |
| `G05-TARJ-002` | Bloqueo de tarjeta por reporte de pérdida | api + bd |
| `G05-TARJ-003` | Desbloqueo exitoso de tarjeta bloqueada | api + bd |
| `G05-TARJ-004` | Consulta de una tarjeta inexistente | api |
| `G05-TARJ-005` | Consulta de la tarjeta desde la interfaz web | web + api |
| `G05-TARJ-006` | Edición de la tarjeta desde la interfaz web | web + api + bd |
| `G05-LOGIN-001` | Acceso rechazado para un email no registrado | web |
| `G05-LOGIN-002` | El botón de ingresar arranca deshabilitado | web |
