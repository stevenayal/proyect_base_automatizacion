# Grupo 05 — Tarjetas de Crédito/Débito
# Módulo: Gestión de tarjetas
#
# Documento vivo del módulo. Dos tipos de escenario conviven en este archivo:
#
#   @api  — automatizados contra el sandbox AIQUAA. Llevan un ID (@G05-TARJ-00N)
#           que da nombre a la evidencia generada en `evidence/semana-05/`.
#
#   @manual @sin-endpoint
#         — especificados y acordados por el equipo, pero NO automatizables hoy:
#           el sandbox solo expone GET/POST `/api/v1/tarjetas` y
#           PATCH `/api/v1/tarjetas/{id}/bloquear|activar` (verificado en
#           `/api/v1/docs`). No hay endpoints de PIN, OTP, límites ni pago de
#           tarjeta, así que estos casos se ejecutan de forma manual y quedan
#           documentados aquí.
#
# Ejecutar solo lo automatizable: `npm run test:bdd:grupo05`

@grupo-05
Feature: Gestión de tarjetas de crédito/débito
  Como cliente del banco
  Quiero realizar gestiones de mis tarjetas de crédito/débito
  Para mantenerme al día con los últimos ajustes de mi tarjeta

  # Cada escenario automatizado crea su propia tarjeta: las escrituras del
  # sandbox no están aisladas y los ids sembrados cambian entre corridas.
  # El id creado queda disponible como "{tarjetaId}".
  Background:
    Given que tengo una API key válida

  # ─────────────────────────── Automatizados ────────────────────────────────

  # Scenario: happy path - Emilio Oheler
  # criterio: la consulta de una tarjeta devuelve sus datos de identificación
  #           (número enmascarado, tipo, marca) y su estado vigente
  @G05-TARJ-001 @api @smoke
  Scenario: Ver datos tarjeta
    Given el cliente posee una tarjeta "credito" marca "visa" registrada
    When hago GET a "/api/v1/tarjetas/{tarjetaId}"
    Then la respuesta tiene status 200
    And el campo "data.numero_enmascarado" de la respuesta existe
    And el campo "data.tipo" de la respuesta es "credito"
    And el campo "data.marca" de la respuesta es "visa"
    And el campo "data.estado" de la respuesta es "activa"

  # Scenario: happy path - Rafael Estigarribia
  # criterio: al reportar la tarjeta como perdida queda bloqueada, y el bloqueo
  #           se persiste en la base de datos, no solo en la respuesta de la API
  @G05-TARJ-002 @api @db
  Scenario: Bloqueo de tarjeta por reporte de pérdida
    Given el cliente posee una tarjeta "credito" marca "visa" registrada
    When hago PATCH a "/api/v1/tarjetas/{tarjetaId}/bloquear"
    Then la respuesta tiene status 200
    And el campo "data.estado" de la respuesta es "bloqueada"
    And en la base de datos, "tarjetas" con id "tarjetaId" tiene "estado" igual a "bloqueada"

  # Scenario: happy path - Rafael Estigarribia
  # criterio: una tarjeta bloqueada por el propio cliente puede volver a estado
  #           activo, y el cambio se refleja en la base de datos
  @G05-TARJ-003 @api @db
  Scenario: Desbloqueo exitoso de tarjeta bloqueada
    Given el cliente posee una tarjeta "credito" marca "visa" registrada
    When hago PATCH a "/api/v1/tarjetas/{tarjetaId}/bloquear"
    And hago PATCH a "/api/v1/tarjetas/{tarjetaId}/activar"
    Then la respuesta tiene status 200
    And el campo "data.estado" de la respuesta es "activa"
    And en la base de datos, "tarjetas" con id "tarjetaId" tiene "estado" igual a "activa"

  # Scenario: caso negativo - Matias Murto
  # criterio: operar sobre una tarjeta inexistente devuelve 404 con un código de
  #           error tipificado, sin alterar ninguna otra tarjeta
  @G05-TARJ-004 @api @negativo
  Scenario: Consulta de una tarjeta inexistente
    When hago GET a "/api/v1/tarjetas/999999"
    Then la respuesta tiene status 404
    And el código de error es "NOT_FOUND"

  # Scenario: happy path (UI) - Matias Murto
  # criterio: el cliente encuentra su tarjeta en el listado filtrando por usuario
  #           y accede a su detalle con los datos que devuelve la API
  @G05-TARJ-005 @web @api @smoke
  Scenario: Consulta de la tarjeta desde la interfaz web
    Given el cliente posee una tarjeta "credito" marca "visa" registrada
    And que el cliente abre la pantalla de login del curso "1"
    When el cliente inicia sesión con el email "bruno.ramirez@example.com"
    And el cliente entra al módulo de tarjetas
    And el cliente filtra las tarjetas del usuario "1"
    Then el listado muestra la tarjeta "{tarjetaId}" con estado "activa"
    When el cliente abre el detalle de la tarjeta "{tarjetaId}"
    Then el detalle de la tarjeta muestra "credito"
    And el detalle de la tarjeta muestra "visa"

  # Scenario: happy path (UI) - Matias Murto
  # criterio: una edición hecha desde la interfaz web queda persistida en la base
  #           de datos, no solo reflejada en pantalla
  @G05-TARJ-006 @web @api @db
  Scenario: Edición de la tarjeta desde la interfaz web
    Given el cliente posee una tarjeta "credito" marca "visa" registrada
    And que el cliente abre la pantalla de login del curso "1"
    When el cliente inicia sesión con el email "bruno.ramirez@example.com"
    And el cliente entra al módulo de tarjetas
    And el cliente filtra las tarjetas del usuario "1"
    And el cliente abre el detalle de la tarjeta "{tarjetaId}"
    And el cliente cambia la marca de la tarjeta "{tarjetaId}" a "mastercard"
    Then el detalle de la tarjeta muestra "mastercard"
    And en la base de datos, "tarjetas" con id "tarjetaId" tiene "marca" igual a "mastercard"

  # Scenario: defecto detectado - Matias Murto
  # DEF-G05-01: en el listado de tarjetas, los botones "Bloquear" y "Activar" no
  # disparan ninguna petición: el estado no cambia ni en pantalla ni en la API.
  # La misma operación por API (PATCH /tarjetas/{id}/bloquear) sí funciona, y el
  # formulario de edición del detalle sí envía su PUT. Escenario documentado, no
  # automatizado en verde, hasta que el sandbox corrija el handler.
  @manual @defecto
  Scenario: Bloqueo de tarjeta desde el listado web
    Given el cliente entra al módulo de tarjetas
    When el cliente bloquea la tarjeta "{tarjetaId}" desde el listado
    Then el listado muestra la tarjeta "{tarjetaId}" con estado "bloqueada"

  # ────────────── Especificados, sin endpoint (ejecución manual) ─────────────

  # Scenario: happy path - Emilio Oheler
  @manual @sin-endpoint
  Scenario: Cambio exitoso de PIN
    When el cliente cambia el PIN actual por un nuevo PIN
    Then el sistema confirma el cambio con el mensaje "PIN actualizado"
    And el nuevo PIN es requerido en la siguiente transacción

  # Scenario: happy path - Rafael Estigarribia
  @manual @sin-endpoint
  Scenario: Propagación del bloqueo temporal a todos los canales
    When el cliente reporta la tarjeta como "PERDIDA"
    Then la tarjeta queda con estado "BLOQUEO_TEMPORAL"
    And el bloqueo se aplica en todos los canales
    And las autorizaciones posteriores son rechazadas
    And se genera una notificación correspondiente al cliente

  # Scenario: happy path - Ivan Bolaños
  @manual @sin-endpoint
  Scenario: Aumento exitoso de límite diario de compras
    When el cliente modifica el límite "compras_comercio" a un monto diario superior
    And confirma con OTP válido
    Then el nuevo límite diario queda confirmado
    And el cambio es efectivo inmediatamente para nuevas autorizaciones

  # Scenario: happy path - Ivan Bolaños
  @manual @sin-endpoint
  Scenario: Pago exitoso desde cuenta propia
    When el cliente paga un monto generado a la tarjeta desde su cuenta vista
    Then el pago se registra con estado "APROBADA"
    And se genera el comprobante con número único

  # Scenario: caso negativo - Marcos Trinidad
  @manual @sin-endpoint
  Scenario: Aumento de límite diario rechazado por OTP inválido
    Given la tarjeta tiene estado "ACTIVA"
    When el cliente modifica el límite "compras_comercio" a un monto diario superior
    And confirma con un OTP inválido
    Then el sistema rechaza el cambio con el mensaje "Código OTP inválido"
    And el límite diario se mantiene sin cambios
    And se registra el intento fallido en la bitácora de la tarjeta

  # Scenario: caso negativo - Matias Murto
  @manual @sin-endpoint
  Scenario: Cambio de PIN rechazado por PIN actual incorrecto
    Given la tarjeta tiene estado "ACTIVA"
    When el cliente intenta cambiar el PIN ingresando un PIN actual incorrecto
    Then el sistema rechaza el cambio con el mensaje "PIN actual incorrecto"
    And el PIN vigente se mantiene sin cambios
    And se incrementa el contador de intentos fallidos de la tarjeta

  # Scenario: caso negativo - Matias Murto
  @manual @sin-endpoint
  Scenario: Pago rechazado por saldo insuficiente en cuenta vista
    Given la tarjeta tiene estado "ACTIVA"
    And el saldo disponible de la cuenta vista es 100000 PYG
    When el cliente intenta pagar 500000 PYG a la tarjeta
    Then el pago se registra con estado "RECHAZADA"
    And el motivo de rechazo es "Fondos insuficientes"
    And el saldo adeudado de la tarjeta se mantiene sin cambios

  # Scenario: edge case - Matias Murto
  @manual @sin-endpoint
  Scenario: Compra autorizada por un monto exactamente igual al límite diario
    Given la tarjeta tiene estado "ACTIVA"
    And el límite "compras_comercio" es 5000000 PYG
    And el consumo acumulado del día es 0 PYG
    When se solicita la autorización de una compra por 5000000 PYG
    Then la autorización se registra con estado "APROBADA"
    And el disponible diario de "compras_comercio" queda en 0 PYG
    And una compra adicional por 1 PYG es rechazada por "Límite diario excedido"

  # Scenario: edge case - Matias Murto
  @manual @sin-endpoint
  Scenario: Desbloqueo denegado cuando el bloqueo fue por motivo "ROBO"
    Given la tarjeta tiene estado "BLOQUEADA" por motivo "ROBO"
    When el cliente solicita el desbloqueo
    And autentica con biometría válida
    Then el sistema rechaza la solicitud con el mensaje "Tarjeta no habilitada para desbloqueo"
    And la tarjeta mantiene el estado "BLOQUEADA"
    And el sistema ofrece iniciar el proceso de reposición de tarjeta
