@sandbox @autenticacion @web @sin-sesion
Feature: Inicio de sesión del sandbox
  Como visitante del sandbox
  Quiero conocer el resultado de mi intento de acceso
  Para usar una cuenta activa cuando corresponde

  # criterio: una cuenta inexistente se rechaza sin iniciar sesión
  @SANDBOX-LOGIN-01 @negativo
  Scenario: Rechazar un email inexistente
    Given que estoy en el inicio de sesión del sandbox
    When ingreso con el email inexistente "no-existe-bdd@example.com"
    Then veo el mensaje de acceso "Usuario no encontrado o inactivo."

  # criterio: una cuenta activa consultada por API puede iniciar sesión
  @SANDBOX-LOGIN-02 @api
  Scenario: Iniciar sesión con un usuario activo consultado
    Given que estoy en el inicio de sesión del sandbox
    And que obtengo un usuario activo desde la API del sandbox
    When ingreso con el usuario activo consultado
    Then veo la bienvenida del usuario activo
