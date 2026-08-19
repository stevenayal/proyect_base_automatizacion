# Grupo 04 — Registro de Usuario / Onboarding
# Módulo: Alta de nuevo cliente (KYC básico)
#
# Completar los escenarios BDD de este módulo.
# Ver ENTREGABLES.md: mínimo 3 escenarios (1 happy path, 1 negativo, 1 edge case).

Feature: Registro de Usuario / Onboarding

  # TODO: Scenario: happy path
  # TODO: Scenario: caso negativo
  # TODO: Scenario: edge case
  Scenario: Alta rechazada para un cliente con documento ya registrado
  Given existe un cliente registrado con el mismo número de documento
  And el usuario se encuentra en el formulario de alta de clientes
  When intenta registrar un nuevo cliente utilizando ese número de documento
  Then el sistema debe rechazar el alta
  And debe informar que el documento ya se encuentra registrado
