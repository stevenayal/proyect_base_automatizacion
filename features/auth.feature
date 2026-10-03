Feature: Acceso al laboratorio AIQUAA
  Como equipo de automatizacion
  Quiero validar el acceso al laboratorio
  Para asegurar que el flujo de autenticacion funciona

  Scenario: Login exitoso con credenciales demo
    Given existe una sesion seeded para la cohorte "demo"
    When el usuario inicia sesion con credenciales validas
    Then debe acceder al catalogo del laboratorio

  Scenario: Login invalido
    Given existe una sesion seeded para la cohorte "demo"
    When el usuario intenta iniciar sesion con credenciales invalidas
    Then debe ver un mensaje de error de autenticacion

  Scenario: Recuperacion de acceso
    Given la API de auth esta disponible
    When el usuario solicita recuperacion con un email valido
    Then el sistema debe responder con un mensaje controlado
