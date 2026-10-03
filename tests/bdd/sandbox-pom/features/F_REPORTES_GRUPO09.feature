@sandbox @reportes @web @con-sesion
Feature: Reporte de movimientos del sandbox (Grupo 09)
  Como usuario autenticado del sandbox
  Quiero ver el resumen y el desglose de mis movimientos
  Para controlar la actividad de mi cuenta, incluso la de movimientos dados de baja

  Background:
    Given que inicio sesión en el sandbox con un usuario activo

  # criterio: el resumen y el desglose muestran datos reales del usuario autenticado
  @SANDBOX-REPORTES-01 @smoke
  Scenario: Ver el resumen y el desglose de movimientos de un usuario
    When abro el reporte de ese usuario
    Then veo el resumen de movimientos del usuario
    And veo el desglose de movimientos por tipo

  # criterio: los reportes de movimientos no filtran por "activo" (RF-G9-01 / RF-G9-02):
  # un movimiento dado de baja (soft-delete) sigue contando en el resumen y en el desglose por tipo
  @SANDBOX-REPORTES-02 @regla-de-negocio
  Scenario: Un movimiento dado de baja sigue contando en el reporte
    Given que obtengo el resumen y el desglose actuales de ese usuario
    And que registro un movimiento de tipo "transferencia" por "150000" para ese usuario
    And doy de baja ese movimiento
    When abro el reporte de ese usuario
    Then el resumen cuenta un movimiento más que antes
    And el desglose por tipo "transferencia" cuenta un movimiento más que antes
