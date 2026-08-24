# Grupo 09 — Reportes y Dashboard
# Módulo: Panel de control / reportes financieros
#
# Completar los escenarios BDD de este módulo.
# Ver ENTREGABLES.md: mínimo 3 escenarios (1 happy path, 1 negativo, 1 edge case).

Feature: Reportes y Dashboard

  # TODO: Scenario: happy path
  # TODO: Scenario: caso negativo
  # TODO: Scenario: edge case
<<<<<<< grupo-09-reportes-dashboard
<<<<<<< grupo-09-reportes-dashboard
  # Todo: Scenario: Comparativa

# Scenario 1: happy path
=======

# Scenario 1: Happy path
>>>>>>> main
=======
  # Todo: Scenario: Comparativa

# Scenario 1: happy path
>>>>>>> grupo-09-reportes-dashboard
Scenario: Generar reporte financiero correctamente
  Given el usuario se encuentra en el módulo de reportes
  When solicita generar un reporte financiero
  Then el sistema debe generar y mostrar el reporte correctamente
<<<<<<< grupo-09-reportes-dashboard
<<<<<<< grupo-09-reportes-dashboard
=======
>>>>>>> grupo-09-reportes-dashboard

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
<<<<<<< grupo-09-reportes-dashboard
=======
>>>>>>> main
=======
>>>>>>> grupo-09-reportes-dashboard
