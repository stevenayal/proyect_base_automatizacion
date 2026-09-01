# Grupo 06 — Notificaciones y Alertas

**Módulo:** Sistema de notificaciones push/email/SMS
**Rama:** `grupo-06-notificaciones-alertas`

## Integrantes

* Fabian Machado — [maeze02@gmail.com](mailto:maeze02@gmail.com)
* Fernando Servian — [fernandosa305@fpuna.edu.py](mailto:fernandosa305@fpuna.edu.py)
* Karina Bogarin — [kariarganha@gmail.com](mailto:kariarganha@gmail.com)
* Ana Mendoza — [anajazmendoza@gmail.com](mailto:anajazmendoza@gmail.com)
* Madhy Avalos — [Magavalos15@gmail.com](mailto:Magavalos15@gmail.com)

## Objetivo del flujo

Validar que el sistema genere y gestione correctamente las notificaciones asociadas a transferencias bancarias, respetando las preferencias configuradas por el usuario, utilizando canales alternativos cuando corresponda y evitando entregas duplicadas.

## Alcance

### Supuestos

* El usuario se encuentra registrado en el sistema.
* El usuario posee preferencias de notificación configuradas.
* Cada transferencia cuenta con un identificador único.
* El usuario dispone de un dispositivo, correo electrónico o número telefónico registrado, según el canal utilizado.
* Los servicios de notificaciones se encuentran disponibles, excepto cuando el escenario indique expresamente una falla.
* La zona horaria del usuario se encuentra correctamente configurada.

### Riesgos

* Indisponibilidad temporal de los proveedores de notificaciones.
* Tokens de dispositivos vencidos o inválidos.
* Números telefónicos o correos electrónicos incorrectos.
* Procesamiento repetido de un mismo evento.
* Configuración incorrecta del horario silencioso.
* Diferencias de zona horaria al programar una entrega.
* Envío de información sensible dentro de una notificación.

### Cobertura incluida

* Envío de una notificación push después de una transferencia exitosa.
* Respeto de la preferencia del usuario cuando el canal push está desactivado.
* Prevención de notificaciones duplicadas ante el reprocesamiento de un evento.
* Uso del email como canal de respaldo cuando el push no puede entregarse.
* Programación de la entrega durante el horario silencioso.
* Envío de notificaciones mediante SMS.
* Gestión de un número telefónico inválido.
* Envío por múltiples canales según las preferencias del usuario.
* Envío de email como canal principal cuando está habilitado.

### Cobertura excluida

* Pruebas de carga, rendimiento o concurrencia masiva.
* Validación del proceso interno completo de una transferencia bancaria.
* Personalización visual y traducción de las notificaciones.
* Pruebas con proveedores reales de email, SMS o push.
* Administración y recuperación de las credenciales del usuario.
* Configuración interna de los proveedores externos de mensajería.

## Escenarios BDD

Los escenarios se encuentran definidos en `features/notificaciones-alertas.feature`.

Actualmente se contemplan nueve escenarios:

1. Envío push después de una transferencia exitosa.
2. No envío cuando el usuario tiene desactivado el canal push.
3. Envío diferido por horario no molestar (almacenamiento en cola).
4. Envío de notificación duplicada cuando la transferencia reintenta con mismo ID.
5. Envío de SMS después de una transferencia exitosa.
6. Gestión de un número telefónico inválido.
7. Envío por múltiples canales según las preferencias del usuario.
8. Uso del email como canal de respaldo cuando el push no puede entregarse.
9. Envío de email como canal principal cuando está habilitado.

## API testing — Colección Postman y trazabilidad BDD → API

**Sitio bajo prueba:** AIQUAA Sandbox API — `https://aiquaa-sandbox-api.vercel.app`

| Artefacto | Ruta |
| --------- | ---- |
| Colección Postman | [`postman/grupo-06-notificaciones-alertas.postman_collection.json`](../../postman/grupo-06-notificaciones-alertas.postman_collection.json) |
| Environment | [`postman/grupo-06-aiquaa.postman_environment.json`](../../postman/grupo-06-aiquaa.postman_environment.json) |
| Matriz de trazabilidad | [`docs/trazabilidad-bdd-api.md`](docs/trazabilidad-bdd-api.md) |
| Evidencia de ejecución | [`evidence/newman-grupo-06-run.txt`](evidence/newman-grupo-06-run.txt) |

### Cobertura
* **8 de 9** escenarios BDD mapeados a endpoints (pendiente: "Envío de email como canal principal", agregado al `.feature` sin request asociado aún en Postman).
* **5 de 5** endpoints del Grupo 6 cubiertos: `GET`, `POST`, `PUT /{id}`, `PATCH /{id}/leer`, `DELETE /{id}`.
* **11 carpetas**: 1 de setup, 8 de escenarios y 2 transversales (contrato `404` y seguridad `401`).
* **38 requests** base (45 cuando hay datos residuales que limpiar).
* Última ejecución verificada: **341 assertions, 0 fallidas**, exit code 0.
* Scripts defensivos: verificado que correr la suite **sin** API key produce 90 assertions fallidas legibles y **0 `TypeError`**.
* Códigos ejercitados: `200`, `201`, `204`, `400`, `401`, `404`; `409` y `429` contemplados.
Cada carpeta lleva el identificador del escenario y su tag (`S1 @happy_path`, `S3 @edge_case`, …), y su descripción cita el `Given/When/Then` que valida.

### Variables
La colección se ejecuta íntegramente con variables: `baseUrl`, `usuarioId`, `maxResponseTime`, `idInexistente`, `prefijoDatosPrueba`, un identificador y un monto por transferencia (`trxHappyPush`, `montoHappyPush`, …) y variables de encadenamiento que guardan los `id` creados (`notifIdPush`, `notifIdRespaldo`, `notifIdDuplicado1/2`, `notifIdDiferida`) para reutilizarlos en los `GET`, `PUT`, `PATCH` y `DELETE` posteriores.

### Suite re-ejecutable
El sandbox de AIQUAA es compartido y persistente. La carpeta `00 Setup` descarta las notificaciones residuales de corridas previas antes de empezar, de modo que los conteos exactos de S2, S3, S4 y S8 sean deterministas. No toca los datos semilla del laboratorio.

### Ejecución
La API exige `x-api-key` en los cinco endpoints; sin ella toda petición responde `401 UNAUTHORIZED`. El laboratorio usa una API key demo compartida (prefijo `sbx_demo_`), la misma de las ramas de los grupos 01, 02, 03, 05 y 07. **El environment la deja vacía a propósito** y se inyecta al ejecutar, para no versionar credenciales.
La API limita a **30 requests por minuto**; al excederlo responde `429 RATE_LIMITED`. Como la suite hace 38-45 requests, hay que ejecutarla siempre con `--delay-request 2500`.

## Auditoría de la propuesta generada por IA

La propuesta inicial generada con inteligencia artificial fue utilizada como punto de partida y posteriormente revisada por el equipo. Durante la auditoría se identificaron y aplicaron las siguientes correcciones:

1. **Precondiciones más específicas:** se incorporaron condiciones verificables, como las preferencias del usuario, el estado del token, la validez del número telefónico y la configuración del horario silencioso.

2. **Datos de prueba trazables:** se agregaron montos concretos e identificadores únicos de transferencia para facilitar la ejecución y validación de los escenarios.

3. **Resultados esperados medibles:** se reemplazaron resultados genéricos por validaciones concretas, como la existencia de un único registro de entrega, el estado de cada canal y la hora programada de envío.

4. **Cobertura multicanal:** se amplió la propuesta inicial para contemplar notificaciones push, email y SMS, incluyendo el uso de canales alternativos.

5. **Casos negativos y límites:** se añadieron validaciones para canales desactivados, tokens vencidos, números inválidos, eventos duplicados y horarios silenciosos.

6. **Separación de responsabilidades:** los escenarios se enfocan en el sistema de notificaciones sin intentar validar el funcionamiento interno completo de las transferencias bancarias.

## Evidencia de setup

Se debe adjuntar una captura que demuestre la disponibilidad de las herramientas necesarias para trabajar con el repositorio:

* Git
* Node.js
* npm
* Playwright
* Visual Studio Code

Ruta prevista para la evidencia:

`evidence/setup-grupo-06.png`

## Estado del entregable semanal

* [x] Flujo objetivo definido.
* [x] Escenarios BDD redactados.
* [x] Propuesta generada por IA auditada.
* [x] Integrantes registrados.
* [x] Evidencia de setup cargada.
* [ ] Revisión final del grupo.
* [ ] Pull Request grupal hacia `main`.

## Entregables generales del proyecto

Checklist según [ENTREGABLES.md](../../ENTREGABLES.md):

* [x] Análisis y alcance.
* [x] BDD en `features/`.
* [x] API — colección Postman/Newman.
* [ ] UI — pruebas en `tests/e2e/` con Playwright.
* [x] Evidencias en `evidence/`.
* [ ] CI/CD verde.
* [ ] Pull Request hacia `main`.
