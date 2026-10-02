# language: es
# Grupo 06 — Notificaciones y Alertas — UI (Cucumber + Playwright)
# Generado con la skill playwright-ai-agents (Nivel B: IA con revision humana).
# Ver grupos/grupo-06-notificaciones-alertas/specs/PLAN_NOTIFICACIONES_ACCESO.md
# para el contrato de testid, riesgos y alcance.
# Reutiliza los steps genericos de tests/bdd/steps/web.steps.ts (por data-testid),
# igual que features/demo-login.feature — este repo no usa POM en los steps.

Característica: Acceso al módulo de notificaciones
  Como usuario del sistema
  Quiero que el ingreso sin credenciales válidas quede bloqueado
  Para que nadie acceda a la bandeja de notificaciones de otro usuario

  @grupo06 @G6-NOTIF-UI-01 @happy_path
  Escenario: El botón de ingresar arranca deshabilitado antes de completar el login
    Dado que estoy en la página "/"
    Entonces el elemento "auth-login-submit" esta deshabilitado

  @grupo06 @G6-NOTIF-UI-02 @negative
  Escenario: Un usuario no registrado no puede llegar a sus notificaciones
    Dado que estoy en la página "/"
    Cuando completo el campo "auth-login-field-email" con "estudiante-demo@aiquaa.com"
    Y hago click en "auth-login-submit"
    Entonces veo el elemento "auth-login-field-email-error"
    Y el elemento "auth-login-field-email-error" contiene el texto "Usuario no encontrado"
