# Grupo 10 — Administración de Roles y Permisos
# Módulo: Gestión de usuarios internos (backoffice)
#
# Completar los escenarios BDD de este módulo.
# Ver ENTREGABLES.md: mínimo 3 escenarios (1 happy path, 1 negativo, 1 edge case).

Feature: Administración de Roles y Permisos

  # TODO: Scenario: happy path
  # TODO: Scenario: caso negativo
  # TODO: Scenario: edge case


# Scenario (Caso Negativo - Cajero intenta transferir alto monto):
 # Scenario: Denegar autorización de transferencia extraordinaria a un Cajero
  #  Given que el usuario autenticado en el backoffice tiene el rol "Cajero"
   # When intenta aprobar un desembolso de "USD 50.000"
    # Then el sistema bloquea la transacción
     # And muestra el mensaje "Requiere autorización de un Gerente de Sucursal"