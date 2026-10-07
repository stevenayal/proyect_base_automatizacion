# Grupo 03 — Pagos de Servicios
# Módulo: Pago de facturas (ANDE, ESSAP, telefonía)
#
# Completar los escenarios BDD de este módulo.
# Ver ENTREGABLES.md: mínimo 3 escenarios (1 happy path, 1 negativo, 1 edge case).

Feature: Pagos de Servicios
  Como usuario
  Quiero realizar el pago de mis facturas (ANDE, ESSAP, telefonía)
  Para mantener mis cuentas al día

  # TODO: Scenario: happy path
  
    Scenario: Pago exitoso de factura de ANDE
      Given el usuario ingresa al modulo de pago de ANDE
      When el usuario ingresa un numero de NIS valido y confirma el pago
      Then el sistema muestra el comprobante de pago exitoso

    Scenario: Pago exitoso de una factura ESSAP
      Given el usuario tiene una factura de ESSAP pendiente de pago
      When el usuario realiza el pago de la factura
      Then el sistema debe confirmar el pago correctamente

    Scenario: Pago exitoso de factura de telefonia
      Given el usuario tiene una factura de telefonia pendiente de pago
      When el usuario selecciona el numero de linea y confirma el pago
      Then el sistema muestra el comprobante de pago exitoso
    

  # TODO: Scenario: caso negativo
  
    Scenario: Pago de ANDE rechazado por saldo insuficiente
      Given el usuario no tiene saldo suficiente en su cuenta
      When el usuario intenta pagar la factura de ANDE
      Then el sistema muestra un mensaje de error por saldo insuficiente

    Scenario: Pago de una factura de ESSAP con numero de issan invalido
      Given el usuario ingresa un numero de cuenta de ESSAP inexistente
      When el usuario intenta realizar el pago
      Then el sistema debe mostrar un mensaje de error

    Scenario: Intento de pago de telefonia sin deuda pendiente
      Given el usuario no tiene facturas de telefonia pendientes de pago
      When el usuario intenta realizar un pago
      Then el sistema muestra un mensaje indicando que no existe deuda pendiente
    
    Scenario: Pago de telefonía rechazado por número de línea inválido
      Given el usuario ingresa un número de línea de telefonía inexistente
      When el usuario intenta realizar un pago
      Then el el sistema rechaza la operación

    Scenario: Pago de factura de telefonia con numero de linea invalido
      Given el usuario ingresa un numero de linea de telefonia invalido
      When el usuario intenta consultar la factura
      Then el sistema muestra un mensaje indicando que no se encontro la linea
      And no permite continuar con el pago

  # TODO: Scenario: edge case
  
    Scenario: Factura de ANDE ya pagada anteriormente
      Given la factura del NIS de ANDE ya fue pagada con anterioridad
      When el usuario intenta pagar nuevamente la misma factura
      Then el sistema indica que la factura no tiene saldo pendiente

    Scenario: Intento de pago de ESSAP durante mantenimiento del sistema
      Given el sistema de pagos de ESSAP esta en mantenimiento
      When el usuario intenta confirmar el pago de su factura de agua
      Then el sistema muestra un mensaje indicando que el servicio esta temporalmente en mantenimiento

    Scenario: Pago de factura de telefonia el mismo dia del vencimiento
      Given el usuario tiene una factura de telefonia pendiente con vencimiento en el dia de hoy
      When el usuario realiza el pago antes de la hora limite
      Then el sistema procesa el pago correctamente
      And el sistema muestra el comprobante de pago
