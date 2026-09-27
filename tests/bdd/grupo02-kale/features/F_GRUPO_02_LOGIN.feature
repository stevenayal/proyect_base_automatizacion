# language: es
@grupo02 @web @autenticacion
Característica: Acceso al sandbox para operar transferencias
  Como cliente del banco
  Quiero iniciar sesión en el sandbox
  Para poder operar mis transferencias entre cuentas

  Antecedentes:
    Dado que estoy en el inicio de sesión del curso de automatización

  @WEB-LOGIN-01 @negativo
  Escenario: Rechazar el acceso con un email que no existe
    Cuando ingreso con el email "no-existe-grupo02@example.com"
    Entonces veo el mensaje de error "Usuario no encontrado o inactivo."

  @WEB-LOGIN-02 @happy_path @datos-dinamicos
  Escenario: Iniciar sesión con un usuario activo obtenido de la base de datos
    Dado que obtengo de la base de datos un usuario activo con cuentas
    Cuando ingreso con el email de ese usuario
    Entonces veo la bienvenida con su nombre
