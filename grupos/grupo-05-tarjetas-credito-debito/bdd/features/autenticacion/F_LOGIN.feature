# Grupo 05 — Tarjetas de Crédito/Débito
# Requisito: acceso a la app como precondición de toda gestión de tarjetas.
#
# ID de escenario principal: G05-LOGIN-001
# El ID viaja como tag del escenario y da nombre al archivo de evidencia
# generado en `evidence/semana-06/` (ver bdd/support/hooks.ts).

@grupo-05 @web @login @autenticacion
Feature: Acceso del cliente a la app de tarjetas
  Como cliente del banco
  Quiero autenticarme en la app
  Para poder gestionar mis tarjetas de crédito/débito

  Background:
    Given que el cliente abre la pantalla de login del curso "2"

  # criterio: el formulario no permite enviar si no se cargó un email
  @G05-LOGIN-002 @smoke
  Scenario: El botón de ingresar arranca deshabilitado
    Then el botón de ingresar está deshabilitado

  # criterio: un email no registrado es rechazado con un mensaje controlado,
  #           sin exponer si el usuario existe o está inactivo
  @G05-LOGIN-001 @smoke @negativo
  Scenario: Acceso rechazado para un email no registrado
    When el cliente ingresa el email "estudiante-demo@aiquaa.com"
    And el cliente envía el formulario de login
    Then el sistema muestra el error de login "No hay un cliente con ese email."
