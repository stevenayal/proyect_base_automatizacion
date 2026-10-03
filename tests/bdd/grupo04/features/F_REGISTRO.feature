@grupo-4 @registro @web
Feature: Alta de usuarios del grupo 04
  Como operador autorizado quiero registrar usuarios con datos válidos
  y evitar altas con datos incompletos o correo inválido.

  Background:
    Given que el operador está en el formulario de nuevo usuario

  # criterio: Registrar un usuario con los campos obligatorios válidos.
  @S6-G04-01 @smoke @positivo
  Scenario: Alta exitosa con datos obligatorios
    When registra un usuario nuevo con datos obligatorios válidos
    Then la ficha muestra los datos del usuario registrado

  # criterio: Registrar un usuario incluyendo fecha de nacimiento y dirección opcionales.
  @S6-G04-02 @positivo
  Scenario: Alta exitosa con todos los datos
    When registra un usuario nuevo incluyendo los datos opcionales
    Then la ficha muestra los datos del usuario registrado
    And la ficha conserva la fecha de nacimiento y la dirección

  # criterio: Impedir el alta si el formato del correo es inválido.
  @S6-G04-03 @negativo
  Scenario: Alta rechazada por correo inválido
    When intenta registrar un usuario con correo inválido
    Then el correo es inválido y el formulario impide el alta

  # criterio: Impedir el alta si faltan los campos obligatorios.
  @S6-G04-04 @negativo
  Scenario: Alta rechazada por campos obligatorios vacíos
    When intenta registrar un usuario sin completar los campos obligatorios
    Then los campos obligatorios están pendientes y el formulario impide el alta
