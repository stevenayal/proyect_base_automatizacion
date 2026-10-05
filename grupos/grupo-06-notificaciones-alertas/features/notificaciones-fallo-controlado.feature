# language: es
# Grupo 06 — Fallo controlado (semana 07).
# Escenario que FALLA A PROPOSITO para demostrar que la suite detecta desviaciones y que
# la evidencia de fallo (captura, mensaje de error y trace) se genera correctamente.
#
# Usa un tag propio (@grupo06_fallo_controlado) y NO @grupo06: la ejecucion normal y el CI
# (--tags "@grupo06") no lo incluyen. Se corre solo de forma explicita:
#   npx cucumber-js --profile grupo06 --tags "@grupo06_fallo_controlado"
#
# Por que falla: el resultado esperado se cambio deliberadamente. Ante un usuario no
# registrado el sitio responde "Usuario no encontrado o inactivo." (comportamiento correcto,
# validado por G6-NOTIF-UI-02); aca se exige "Bienvenido", que nunca debe aparecer.

Característica: Fallo controlado del flujo de acceso
  Como equipo de QA
  Queremos ver fallar una prueba de forma deliberada
  Para comprobar que la suite no da falsos positivos y que la evidencia de fallo es útil

  @grupo06_fallo_controlado @G6-NOTIF-UI-03
  Escenario: Fallo controlado - se exige un mensaje de bienvenida a un usuario no registrado
    Dado que estoy en la página "/"
    Y hago click en "curso-option-1"
    Y hago click en "curso-submit"
    Cuando completo el campo "auth-login-field-email" con "estudiante-demo@aiquaa.com"
    Y hago click en "auth-login-submit"
    Entonces el elemento "auth-login-field-email-error" contiene el texto "Bienvenido"
