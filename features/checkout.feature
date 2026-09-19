Feature: Checkout del laboratorio AIQUAA
  Como equipo de automatizacion
  Quiero validar una operacion completa
  Para asegurar la trazabilidad del flujo principal

  Scenario: Compra exitosa
    Given existe una sesion seeded para la cohorte "team-a"
    And el carrito contiene al menos un producto
    When el usuario confirma el checkout con datos validos
    Then el sistema debe crear una orden

  Scenario: Checkout con error controlado
    Given existe una sesion seeded para la cohorte "team-a"
    When el usuario confirma el checkout con un apartmentSuite demasiado largo
    Then el laboratorio debe responder con el error controlado esperado

  Scenario: Consulta de evidencia posterior
    Given existe una orden creada en la sesion actual
    When el equipo consulta la evidencia de la sesion
    Then la respuesta debe incluir auditoria del flujo ejecutado
