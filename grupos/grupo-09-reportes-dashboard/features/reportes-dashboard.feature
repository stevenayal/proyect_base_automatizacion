
# Grupo 09 - Reportes y Dashboard
# Modulo: Panel de control / reportes financieros
#
# Cubre tanto la vista UI del reporte (sandbox web) como las dos operaciones
# de movimientos usadas tambien en la coleccion de Postman y en el plan de
# JMeter del grupo: GET /api/v1/movimientos/{id} y POST /api/v1/movimientos.

Feature: Reportes y Dashboard
  Como administrador del sandbox AIQUAA
  Quiero consultar el reporte de movimientos y validar las operaciones de movimientos
  Para asegurar que el modulo de Reportes y Dashboard funciona correctamente

  @happy-path @ui
  Scenario: Ver el reporte de movimientos en el dashboard
    Given el administrador inicio sesion en el sandbox de AIQUAA
    When el administrador navega al modulo de Reportes
    Then el sistema muestra la tabla de movimientos con al menos un resultado

  @happy-path @api
  Scenario: Obtener siempre un movimiento activo por API
    When el administrador solicita por API un movimiento activo existente
    Then la API responde con estado 200 y los datos del movimiento

  @negativo @api
  Scenario: Intentar obtener un movimiento con un ID inexistente
    When el administrador solicita por API el movimiento con ID "999999999"
    Then la API responde con un error indicando que el movimiento no existe

  @edge-case @api
  Scenario: Crear un movimiento aleatorio por API
    When el administrador crea un movimiento aleatorio por API
    Then la API responde confirmando la creacion del movimiento