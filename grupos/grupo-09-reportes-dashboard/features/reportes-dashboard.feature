# language: es
# Grupo 09 — Reportes y Dashboard
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
# Grupo 09 — Reportes y Dashboard
# Módulo: Panel de control / reportes financieros
#
# Completar los escenarios BDD de este módulo.
# Ver ENTREGABLES.md: mínimo 3 escenarios (1 happy path, 1 negativo, 1 edge case).

Feature: Reportes y Dashboard

  # TODO: Scenario: happy path
  # TODO: Scenario: caso negativo
  # TODO: Scenario: edge case
  # Todo: Scenario: Comparativa

# Scenario 1: happy path
Scenario: Generar reporte financiero correctamente
  Given el usuario se encuentra en el módulo de reportes
  When solicita generar un reporte financiero
  Then el sistema debe generar y mostrar el reporte correctamente

# Scenario 2: caso negativo
  Scenario: Intentar generar reporte sin datos disponibles en el rango de fechas
    Given el usuario se encuentra en el modulo de reportes
    When aplica un filtro de fechas donde no existen transacciones registradas
    Then el sistema debe mostrar el mensaje "No se encontraron datos para el periodo seleccionado"

# Scenario 3: Roles
Scenario: Visualizar indicadores según el rol del usuario
  Given que el usuario tiene el rol "<rol>"
  When accede al panel de reportes financieros
  Then debe visualizar únicamente los indicadores "<indicadores_visibles>"
  
#Scenario 4: Comparativa
Scenario: Comparacion de reportes entre dos periodos distintos
  Given el usuario se encuentra en el modulo de reportes
  When selecciona dos periodos y solicita compararlos
  Then el sistema debe mostrar un reporte comparativo con las diferencias porcentuales

Caso Positivo -Claudio Cabrera
Escenario: Visualizar reporte financiero del mes 
Dado que el usuario ha iniciado sesión
Cuando consulta el reporte financiero del mes actual
Entonces se cargan las métricas y gráficos del panel de control.

Caso Negativo -Claudio Cabrera
Escenario: Consultar reporte en un período sin datos 
Dado que el usuario ha iniciado sesión
Cuando filtra el reporte para un año sin transacciones
Entonces se muestra un mensaje de "Sin datos disponibles".

Caso Limite - Claudio Cabrera
Escenario: Filtrar el rango máximo de años permitido 
Dado que el usuario ha iniciado sesión
Cuando selecciona un rango de fechas de 10 años
Entonces el reporte se genera agrupando los datos sin dar error de tiempo de espera. 
