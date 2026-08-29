# Grupo 03 — Pagos de Servicios (módulo facturas/pagos)
#
# Análisis funcional BDD alineado al contrato real de la API del sandbox
# (app/api/v1/facturas, RF-G3-01..06). Sustituye el stub inicial de alumnos.
#
# Steps reutilizables de la skill `bdd` (S_api.steps.ts):
#   Given que tengo una API key válida
#   When hago GET/POST/PUT/DELETE a "{endpoint}" [con query {...}] [con body: ...]
#   Then la respuesta tiene status {int}
#   Then el campo "{jsonPath}" de la respuesta es {value}
#   Then el campo "{jsonPath}" de la respuesta existe
#   Then la respuesta tiene un array "data" con {int} elementos
#   Then el código de error es "{code}"
#   Then guardo el campo "{jsonPath}" de la respuesta como "{alias}"
#
# Notas de diseño capturadas como comportamiento esperado:
#   - Al crear (POST), estado siempre queda en "pendiente" — el único camino a
#     "pagada" es POST /api/v1/facturas/{id}/pagar.
#   - PUT reemplaza proveedor/numeroFactura/monto/fechaVencimiento pero el
#     schema de PUT no acepta "estado": el campo no se puede tocar por ese medio.
#   - POST .../pagar es transaccional (SELECT...FOR UPDATE + INSERT pagos +
#     UPDATE facturas.estado); responde 404 si la factura no existe O YA
#     ESTÁ PAGADA (evita el doble pago).
#   - DELETE es soft-delete: la factura desaparece de listados/consultas
#     posteriores (404), igual que en el módulo de órdenes (grupo 7).

@grupo-3 @api
Feature: Pagos de Servicios (facturas)

  Background:
    Given que tengo una API key válida

  # ---- RF-G3-01: Listar facturas ----
  @RF-G3-01 @smoke
  Scenario: Listar todas las facturas sin filtro
    When hago GET a "/api/v1/facturas"
    Then la respuesta tiene status 200
    And el campo "data" de la respuesta existe

  @RF-G3-01
  Scenario: Filtrar facturas por estado pendiente
    When hago GET a "/api/v1/facturas" con query {"estado": "pendiente"}
    Then la respuesta tiene status 200
    And el campo "data" de la respuesta existe

  @RF-G3-01
  Scenario: Un usuario sin facturas devuelve lista vacía
    When hago GET a "/api/v1/facturas" con query {"usuarioId": 999999}
    Then la respuesta tiene status 200
    And la respuesta tiene un array "data" con 0 elementos

  @RF-G3-01 @negativo
  Scenario: usuarioId no numérico es rechazado con 400
    When hago GET a "/api/v1/facturas" con query {"usuarioId": "abc"}
    Then la respuesta tiene status 400
    And el código de error es "VALIDATION_ERROR"

  @RF-G3-01 @negativo
  Scenario: estado fuera del enum permitido es rechazado con 400
    When hago GET a "/api/v1/facturas" con query {"estado": "cancelada"}
    Then la respuesta tiene status 400
    And el código de error es "VALIDATION_ERROR"

  # ---- RF-G3-02: Registrar una factura ----
  @RF-G3-02 @smoke
  Scenario: Registrar una factura de ANDE queda en estado pendiente
    # criterio: el estado se fija en "pendiente" sin importar qué envíe el cliente
    When hago POST a "/api/v1/facturas" con body:
      """
      { "usuarioId": 1, "proveedor": "ANDE", "numeroFactura": "NIS-BDD-0001", "monto": 185000, "fechaVencimiento": "2026-09-15" }
      """
    Then la respuesta tiene status 201
    And el campo "data.estado" de la respuesta es "pendiente"
    And el campo "data.proveedor" de la respuesta es "ANDE"
    And guardo el campo "data.id" de la respuesta como "facturaId"

  @RF-G3-02 @negativo
  Scenario: Proveedor fuera del enum permitido es rechazado
    When hago POST a "/api/v1/facturas" con body:
      """
      { "usuarioId": 1, "proveedor": "Claro", "numeroFactura": "X-0001", "monto": 10000, "fechaVencimiento": "2026-09-15" }
      """
    Then la respuesta tiene status 400
    And el código de error es "VALIDATION_ERROR"

  @RF-G3-02 @negativo
  Scenario: Falta un campo requerido (numeroFactura)
    When hago POST a "/api/v1/facturas" con body:
      """
      { "usuarioId": 1, "proveedor": "ESSAP", "monto": 10000, "fechaVencimiento": "2026-09-15" }
      """
    Then la respuesta tiene status 400
    And el código de error es "VALIDATION_ERROR"

  @RF-G3-02 @negativo
  Scenario: Usuario inexistente no crea la factura
    When hago POST a "/api/v1/facturas" con body:
      """
      { "usuarioId": 999999, "proveedor": "Tigo", "numeroFactura": "X-0002", "monto": 10000, "fechaVencimiento": "2026-09-15" }
      """
    Then la respuesta tiene status 400
    And el código de error es "VALIDATION_ERROR"

  @RF-G3-02 @edge
  Scenario: numeroFactura duplicado para el mismo proveedor es rechazado (409)
    # criterio: (proveedor, numeroFactura) es una constraint unique
    When hago POST a "/api/v1/facturas" con body:
      """
      { "usuarioId": 1, "proveedor": "ANDE", "numeroFactura": "NIS-BDD-DUP", "monto": 50000, "fechaVencimiento": "2026-09-20" }
      """
    Then la respuesta tiene status 201
    When hago POST a "/api/v1/facturas" con body:
      """
      { "usuarioId": 1, "proveedor": "ANDE", "numeroFactura": "NIS-BDD-DUP", "monto": 99999, "fechaVencimiento": "2026-10-01" }
      """
    Then la respuesta tiene status 409
    And el código de error es "CONFLICT"

  # ---- RF-G3-03: Consultar una factura por id ----
  @RF-G3-03 @smoke
  Scenario: Consultar una factura recién creada
    When hago POST a "/api/v1/facturas" con body:
      """
      { "usuarioId": 1, "proveedor": "ESSAP", "numeroFactura": "ISSAN-BDD-0001", "monto": 75000, "fechaVencimiento": "2026-09-10" }
      """
    Then la respuesta tiene status 201
    And guardo el campo "data.id" de la respuesta como "facturaId"
    When hago GET a "/api/v1/facturas/{facturaId}"
    Then la respuesta tiene status 200
    And el campo "data.proveedor" de la respuesta es "ESSAP"
    And el campo "data.estado" de la respuesta es "pendiente"

  @RF-G3-03 @negativo
  Scenario: Consultar una factura inexistente devuelve 404
    When hago GET a "/api/v1/facturas/999999"
    Then la respuesta tiene status 404

  @RF-G3-03 @negativo
  Scenario: Id no entero es rechazado con 400
    When hago GET a "/api/v1/facturas/abc"
    Then la respuesta tiene status 400
    And el código de error es "VALIDATION_ERROR"

  # ---- RF-G3-04: Reemplazar una factura ----
  @RF-G3-04 @smoke
  Scenario: Reemplazar una factura actualiza monto y fecha pero no su estado
    # criterio: el body de PUT no admite "estado" — el pendiente original se mantiene
    When hago POST a "/api/v1/facturas" con body:
      """
      { "usuarioId": 1, "proveedor": "Tigo", "numeroFactura": "TIGO-BDD-0001", "monto": 120000, "fechaVencimiento": "2026-09-05" }
      """
    Then la respuesta tiene status 201
    And guardo el campo "data.id" de la respuesta como "facturaId"
    When hago PUT a "/api/v1/facturas/{facturaId}" con body:
      """
      { "proveedor": "Tigo", "numeroFactura": "TIGO-BDD-0001", "monto": 135500, "fechaVencimiento": "2026-09-25" }
      """
    Then la respuesta tiene status 200
    And el campo "data.monto" de la respuesta es 135500
    And el campo "data.estado" de la respuesta es "pendiente"

  @RF-G3-04 @negativo
  Scenario: Reemplazar una factura inexistente devuelve 404
    When hago PUT a "/api/v1/facturas/999999" con body:
      """
      { "proveedor": "ANDE", "numeroFactura": "X-9999", "monto": 1000, "fechaVencimiento": "2026-09-25" }
      """
    Then la respuesta tiene status 404

  @RF-G3-04 @negativo
  Scenario: Reemplazo sin un campo requerido es rechazado
    When hago PUT a "/api/v1/facturas/1" con body:
      """
      { "proveedor": "ANDE", "monto": 1000, "fechaVencimiento": "2026-09-25" }
      """
    Then la respuesta tiene status 400
    And el código de error es "VALIDATION_ERROR"

  # ---- RF-G3-05: Pagar una factura ----
  @RF-G3-05 @smoke
  Scenario: Pagar una factura pendiente la deja pagada y genera el pago
    When hago POST a "/api/v1/facturas" con body:
      """
      { "usuarioId": 1, "proveedor": "Personal", "numeroFactura": "PERSONAL-BDD-0001", "monto": 95000, "fechaVencimiento": "2026-09-12" }
      """
    Then la respuesta tiene status 201
    And guardo el campo "data.id" de la respuesta como "facturaId"
    When hago POST a "/api/v1/facturas/{facturaId}/pagar" con body:
      """
      { "metodoPago": "tarjeta" }
      """
    Then la respuesta tiene status 200
    And el campo "data.factura.estado" de la respuesta es "pagada"
    And el campo "data.pago.id" de la respuesta existe

  @RF-G3-05 @negativo @edge
  Scenario: Pagar una factura ya pagada devuelve 404 y no duplica el pago
    # criterio: evita el doble pago — ver docs/TAREA-SQL-REST-DINAMICO.md (caso propio grupo 3)
    When hago POST a "/api/v1/facturas" con body:
      """
      { "usuarioId": 1, "proveedor": "COPACO", "numeroFactura": "COPACO-BDD-0001", "monto": 60000, "fechaVencimiento": "2026-09-08" }
      """
    Then la respuesta tiene status 201
    And guardo el campo "data.id" de la respuesta como "facturaId"
    When hago POST a "/api/v1/facturas/{facturaId}/pagar" con body:
      """
      { "metodoPago": "efectivo" }
      """
    Then la respuesta tiene status 200
    When hago POST a "/api/v1/facturas/{facturaId}/pagar" con body:
      """
      { "metodoPago": "efectivo" }
      """
    Then la respuesta tiene status 404

  @RF-G3-05 @negativo
  Scenario: metodoPago fuera del enum permitido es rechazado
    When hago POST a "/api/v1/facturas" con body:
      """
      { "usuarioId": 1, "proveedor": "ANDE", "numeroFactura": "NIS-BDD-0002", "monto": 43000, "fechaVencimiento": "2026-09-18" }
      """
    Then la respuesta tiene status 201
    And guardo el campo "data.id" de la respuesta como "facturaId"
    When hago POST a "/api/v1/facturas/{facturaId}/pagar" con body:
      """
      { "metodoPago": "criptomoneda" }
      """
    Then la respuesta tiene status 400
    And el código de error es "VALIDATION_ERROR"

  @RF-G3-05 @negativo
  Scenario: Pagar una factura inexistente devuelve 404
    When hago POST a "/api/v1/facturas/999999/pagar" con body:
      """
      { "metodoPago": "tarjeta" }
      """
    Then la respuesta tiene status 404

  # ---- RF-G3-06: Dar de baja una factura (soft-delete) ----
  @RF-G3-06 @smoke
  Scenario: Dar de baja una factura vigente y dejarla fuera de consultas
    When hago POST a "/api/v1/facturas" con body:
      """
      { "usuarioId": 1, "proveedor": "ESSAP", "numeroFactura": "ISSAN-BDD-0002", "monto": 30000, "fechaVencimiento": "2026-09-22" }
      """
    Then la respuesta tiene status 201
    And guardo el campo "data.id" de la respuesta como "facturaId"
    When hago DELETE a "/api/v1/facturas/{facturaId}"
    Then la respuesta tiene status 204
    When hago GET a "/api/v1/facturas/{facturaId}"
    Then la respuesta tiene status 404

  @RF-G3-06 @negativo
  Scenario: Dar de baja una factura ya dada de baja devuelve 404
    When hago DELETE a "/api/v1/facturas/1"
    Then la respuesta tiene status 404
