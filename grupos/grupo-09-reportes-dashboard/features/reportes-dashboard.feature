# Grupo 09 — Reportes y Dashboard
# Módulo: Panel de control / reportes financieros
#
# Completar los escenarios BDD de este módulo.
# Ver ENTREGABLES.md: mínimo 3 escenarios (1 happy path, 1 negativo, 1 edge case).

Feature: Reportes y Dashboard

  # TODO: Scenario: happy path
  # TODO: Scenario: caso negativo
  # TODO: Scenario: edge case

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
    