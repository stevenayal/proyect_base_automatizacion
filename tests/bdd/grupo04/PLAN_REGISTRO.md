# Semana 6 — Grupo 04: registro de usuarios

Estado: ejecución local aprobada (4 escenarios, 13 pasos). Fallo controlado y caso original posterior verificados el 2 de octubre de 2026. Pipeline pendiente.

## Alcance acordado

Cucumber + Playwright + POM, Chromium, nivel B (generación asistida con revisión humana).
Origen: escenarios existentes del grupo 04 y formulario /usuarios/new indicado por Fabiola.
La skill utilizada es playwright-ai-agents-skill, acompañada por playwright-skill.
La suite vive separada de los escenarios históricos: no reemplaza sus criterios.

## Casos y trazabilidad

| ID | Caso | Evidencia esperada |
|---|---|---|
| S6-G04-01 | Alta con datos obligatorios | Ficha con nombre, email y documento coincidentes |
| S6-G04-02 | Alta con datos opcionales | Lo anterior más fecha de nacimiento y dirección |
| S6-G04-03 | Email inválido | typeMismatch, formulario inválido y cero POST de alta |
| S6-G04-04 | Campos vacíos | valueMissing en nombre, email y documento; cero POST de alta |

El feature contiene los criterios. S_registro.steps.ts enlaza sus frases con UsuariosPage.
world.ts conserva página y datos por escenario; hooks.ts inicia sesión una vez y reutiliza
storageState en contextos independientes. Las comprobaciones de negocio están en los Then.

## Evidencia de reconocimiento

Se inspeccionó el DOM real el 2 de octubre de 2026. Los campos tienen nombres accesibles
Nombre, Email, Tipo de documento, Número de documento, Fecha de nacimiento (opcional)
y Dirección (opcional). El envío se llama Crear usuario.
El alta de reconocimiento creó el usuario ficticio #145 y mostró su ficha.
No apareció un mensaje de Bienvenida: ese mensaje pertenece al ingreso de sesión.
En la ficha, los campos opcionales pierden el sufijo (opcional).
Los negativos usan validación HTML nativa; no se fija el texto del navegador por idioma.

La ejecución Cucumber completa está guardada en evidence/ejecucion-aprobada/.
El pipeline todavía requiere ejecución y evidencia.

## Datos y riesgos

- Email y documento se generan por ejecución; nombre y dirección son ficticios.
- Cada corrida completa crea dos usuarios de prueba en el sandbox compartido.
- No se borran usuarios automáticamente.
- Login desde SANDBOX_LOGIN_EMAIL; no se guarda el email personal en código versionado.
- Ejecución secuencial. La skill documenta 30 solicitudes/minuto; la ficha dispara
  varias consultas adicionales. Si ocurre 429, se registra como limitación del entorno.
- No se aumenta el límite ni se agregan reintentos para ocultar un fallo.
- Sin Google, OTP, contraseña, reglas de edad ni cambio KYC en este alcance.

## Revisión humana y fallo controlado

El usuario revisó los casos y ejecutó la suite desde VS Code. La IA preparó código y
corrigió la lectura de la fecha tras revisar el fallo real (ver evidence/HALLAZGO_FECHA.md).
La demostración ejecutó S6-G04-03 con formatoInvalido: false en una copia temporal:
1 escenario fallado, 2 pasos aprobados y 1 fallado. Luego ejecutó el archivo original:
1 escenario y sus 3 pasos aprobados. Los originales no cambiaron.
Reportes y verificación: evidence/fallo-controlado/.
Repetición desde VS Code: tarea BDD: demostrar fallo y restauración.

## Pendiente para entrega

Publicar la rama grupo-04-registro-onboarding del fork, ejecutar el pipeline y crear el PR
hacia el repositorio del profesor. El HTML/JSON se generan automáticamente al correr.
