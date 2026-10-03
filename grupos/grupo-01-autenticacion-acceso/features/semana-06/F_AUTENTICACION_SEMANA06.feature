@autenticacion @semana06
Feature: Autenticacion y Acceso - Semana 06
  Como estudiante del curso de Automatizacion QA
  Quiero validar el formulario de login del sandbox AIQUAA
  Para asegurar que la autenticacion permite el acceso valido y maneja errores y validaciones

  Background:
    Given el navegador esta abierto en el sandbox AIQUAA

  # ── Email valido de usuario activo ─────────────────────────────────────────

  @AUT-01 @positivo @smoke
  Scenario: Login exitoso con email de usuario activo
    Given el usuario navega a la pagina de seleccion de curso
    When selecciona el curso "Automatizacion"
    And presiona el boton Continuar
    And ingresa el email "ana.torres@example.com"
    And presiona el boton Ingresar
    Then el sistema debe autenticar al usuario activo
    And el usuario accede a la pagina de inicio con su sesion

  # ── Email no registrado ────────────────────────────────────────────────────

  @AUT-02 @negativo
  Scenario: Login fallido con email no registrado
    Given el usuario navega a la pagina de seleccion de curso
    When selecciona el curso "Automatizacion"
    And presiona el boton Continuar
    And ingresa el email "no_registrado@ejemplo.com"
    And presiona el boton Ingresar
    Then el sistema debe mostrar un mensaje de error
    And el usuario permanece en la pagina de login

  # ── Campo obligatorio vacio ────────────────────────────────────────────────

  @AUT-03 @edge-case
  Scenario: Login con campo email vacio
    Given el usuario navega a la pagina de seleccion de curso
    When selecciona el curso "Automatizacion"
    And presiona el boton Continuar
    And presiona el boton Ingresar sin completar el email
    Then el usuario permanece en la pagina de login
