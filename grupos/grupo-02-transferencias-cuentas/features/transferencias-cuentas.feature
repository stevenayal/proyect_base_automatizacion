# Grupo 02 — Transferencias entre Cuentas
# Módulo: Transferencias internas (mismo banco)

# Completar los escenarios BDD de este módulo.
# Ver ENTREGABLES.md: mínimo 3 escenarios (1 happy path, 1 negativo, 1 edge case).

Feature: Transferencias entre Cuentas
  Como usuario del banco
  Quiero transferir dinero entre mis cuentas
  Para mover dinero de forma segura dentro del mismo banco

  # TODO: Scenario: happy path

  # TODO: Scenario: caso negativo
  Scenario: Transferencia rechazada por saldo insuficiente
    Given el usuario posee una cuenta origen con saldo insuficiente
    And posee una cuenta destino habilitada
    When intenta realizar una transferencia por un monto mayor al saldo disponible
    Then la transferencia debe ser rechazada
    And debe visualizar un mensaje indicando saldo insuficiente

# TODO: Scenario: caso negativo
Scenario: Rechazar una transferencia hacia una cuenta bloqueada
Given la cuenta destino pertenece al mismo banco
And la cuenta destino se encuentra bloqueada
And la cuenta origen dispone de un saldo de 10000000 Gs
When el cliente realiza una transferencia de 5000000 Gs desde la cuenta origen hacia la cuenta destino
Then la transferencia debe ser rechazada
And se debe informar que la cuenta destino se encuentra bloqueada
And el saldo de la cuenta origen no debe ser modificado
And el saldo de la cuenta destino no debe ser modificado
And no se debe generar un comprobante de transferencia

  
   # TODO: Scenario: edge case
  # TODO: Scenario: edge case
  @happy_path
  Scenario: Realizar una transferencia interna exitosa
  Given la cuenta destino pertenece al mismo banco
  And la cuenta destino se encuentra activa
  When el cliente realiza una transferencia de 5000000 Gs desde la cuenta origen hacia la cuenta destino
  Then la transferencia se realiza exitosamente
  And el saldo de la cuenta origen se reduce en 5000000 Gs
  And el saldo de la cuenta destino aumenta en 5000000 Gs
  And se genera un comprobante de la transferencias
