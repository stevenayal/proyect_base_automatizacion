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

## Entregables por semana

El PR grupal [#58](https://github.com/stevenayal/proyect_base_automatizacion/pull/58) acumula el trabajo de varias semanas sobre la misma rama, porque GitHub admite un unico PR abierto por par rama-origen → rama-destino. Esta tabla separa que se entrego en cada una.

| Semana | Entregable | Artefactos | Resultado verificado |
| --- | --- | --- | --- |
| **Semana 1** | Analisis, alcance y BDD | `features/notificaciones-alertas.feature`, este README, `evidence/setup-grupo-06.png` | 9 escenarios en Gherkin (happy path, alternativos, negativos y edge cases) |
| **Semana 2** | API testing base y trazabilidad BDD → API | `postman/grupo-06-notificaciones-alertas.postman_collection.json`, `postman/grupo-06-aiquaa.postman_environment.json`, [`docs/trazabilidad-bdd-api.md`](docs/trazabilidad-bdd-api.md), [`evidence/newman-grupo-06-run.txt`](evidence/newman-grupo-06-run.txt) | 11 carpetas, 38 requests (44 ejecutados), **341 assertions, 0 fallidas** |
| **Semana 3** | Consultas SQL, assertions reales y evidencia | Coleccion extendida, [`docs/trazabilidad-rf-sql.md`](docs/trazabilidad-rf-sql.md), [`evidence/semana-03/`](evidence/semana-03/) | 15 carpetas, 52 requests, **455 assertions, 0 fallidas**, 11 de ellas contra la base de datos |

### Que agrego cada semana

**Semana 2 — cobertura de la API.** Se construyo la coleccion desde cero sobre el sandbox de AIQUAA: una carpeta por escenario BDD, variables para todos los datos de prueba, encadenamiento de los `id` creados entre requests y una carpeta `00 Setup` que descarta datos residuales para que la suite sea re-ejecutable. Se detectaron dos hallazgos (HG06-01 y HG06-02).

**Semana 3 — verificacion en base de datos.** Se extendio la coleccion (no se reescribio) con 11 assertions que consultan Postgres via `POST /api/v1/sql/select`, se incorporaron los criterios de aceptacion del documento de requerimientos funcionales v1.0 que faltaban, y se cerro el ultimo escenario BDD sin request asociado. Ademas:

* **HG06-01 se cerro como no-defecto**: el documento declara la ausencia de control de duplicados como comportamiento esperado, asi que el desvio estaba en nuestro escenario BDD S3, no en la API.
* **HG06-03, nuevo**: `PATCH /{id}/leer` no filtra por `activo` y marca como leida una notificacion dada de baja. Solo el SQL lo evidencia.

## API testing — Colección Postman y trazabilidad BDD → API

**Sitio bajo prueba:** AIQUAA Sandbox API — `https://aiquaa-sandbox-api.vercel.app`

| Artefacto | Ruta |
| --------- | ---- |
| Colección Postman | [`postman/grupo-06-notificaciones-alertas.postman_collection.json`](../../postman/grupo-06-notificaciones-alertas.postman_collection.json) |
| Environment | [`postman/grupo-06-aiquaa.postman_environment.json`](../../postman/grupo-06-aiquaa.postman_environment.json) |
| Trazabilidad BDD → API | [`docs/trazabilidad-bdd-api.md`](docs/trazabilidad-bdd-api.md) |
| Trazabilidad RF → API → SQL (semana 03) | [`docs/trazabilidad-rf-sql.md`](docs/trazabilidad-rf-sql.md) |
| Evidencia semana 02 | [`evidence/newman-grupo-06-run.txt`](evidence/newman-grupo-06-run.txt) |
| Evidencia semana 03 | [`evidence/semana-03/`](evidence/semana-03/) |

### Cobertura

* **9 de 9** escenarios BDD mapeados a endpoints. La semana 03 cerró el último pendiente (`S9` — email como canal principal, TRX-010).
* **6 de 6** requerimientos funcionales cubiertos: RF-G6-01 a RF-G6-06.
* **15 carpetas**: 1 de setup, 9 de escenarios BDD, 2 de criterios de aceptación del requerimiento, 1 de hallazgo y 2 transversales.
* **52 requests** en la colección; la última corrida ejecutó **69** (58 REST + 11 consultas SQL).
* Última ejecución verificada: **455 assertions, 0 fallidas**, exit code 0, 5m 15s.
* **11 assertions verifican directamente la base de datos** vía `POST /api/v1/sql/select`.
* Scripts defensivos: correr la suite **sin** API key produce assertions fallidas legibles y **0 `TypeError`**.
* Códigos ejercitados: `200`, `201`, `204`, `400`, `401`, `404`, `405`; `409` y `429` contemplados.
Cada carpeta lleva el identificador del escenario y su tag (`S1 @happy_path`, `S3 @edge_case`, …), y su descripción cita el `Given/When/Then` que valida.

### Variables
La colección se ejecuta íntegramente con variables: `baseUrl`, `usuarioId`, `maxResponseTime`, `idInexistente`, `prefijoDatosPrueba`, un identificador y un monto por transferencia (`trxHappyPush`, `montoHappyPush`, …) y variables de encadenamiento que guardan los `id` creados (`notifIdPush`, `notifIdRespaldo`, `notifIdDuplicado1/2`, `notifIdDiferida`) para reutilizarlos en los `GET`, `PUT`, `PATCH` y `DELETE` posteriores.

### Suite re-ejecutable
El sandbox de AIQUAA es compartido y persistente. La carpeta `00 Setup` descarta las notificaciones residuales de corridas previas antes de empezar, de modo que los conteos exactos de S2, S3, S4 y S8 sean deterministas. No toca los datos semilla del laboratorio.

### Semana 03 — Validación en base de datos (SQL)

La colección consulta la base a través de **`POST /api/v1/sql/select`** (`{sql, params}` → `{data, rowCount}`), un endpoint de solo lectura con whitelist de tablas y parámetros posicionales `$1`. El helper `utils.sqlSelect` se declara **una sola vez** en el Pre-request Script de la colección, siguiendo el patrón de la skill `postman-newman` del repo.

Se agregó SQL solo donde la respuesta HTTP **no alcanza para probar la regla**:

| Regla del requerimiento | Qué agrega el SELECT |
| --- | --- |
| RF-G6-06: *"la fila permanece en la base, nunca se borra físicamente"* | Confirma que la fila existe con `activo=false`. Un borrado físico pasaría el test REST igual |
| RF-G6-02: *"no se registra ninguna notificación"* | `COUNT(*)=0` tras el alta rechazada. El `400` no prueba que no se escribió |
| RF-G6-03 y RF-G6-05: invariantes de `leido`/`estado` | Verifica la **fila persistida**, no el JSON que devolvió la API |
| RF-G6-01: límite de 100 registros | Compara contra el total real: distingue "el límite se aplica" de "hay pocos datos" |

> **Importante:** `utils` vive en memoria durante la corrida, no es una variable de Postman. La colección debe ejecutarse **completa o por carpetas** (Runner o Newman). Un request suelto no pasa por el pre-request y da `ReferenceError`.

Detalle completo en [`docs/trazabilidad-rf-sql.md`](docs/trazabilidad-rf-sql.md).

### Ejecución
La API exige `x-api-key` en los seis endpoints; sin ella toda petición responde `401 UNAUTHORIZED`. El laboratorio usa una API key demo compartida (prefijo `sbx_demo_`), la misma de las ramas de los grupos 01, 02, 03, 05 y 07. **El environment la deja vacía a propósito** y se inyecta al ejecutar, para no versionar credenciales.
La API limita a **30 requests por minuto**; al excederlo responde `429 RATE_LIMITED`. Cada consulta SQL disparada desde un script cuenta contra esa misma cuota, por lo que desde la semana 03 la suite debe ejecutarse con **`--delay-request 5000`** (antes 2500). Con un delay menor la corrida choca contra el límite.

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
* [x] Colección Postman con trazabilidad BDD → API (semana 02).
* [x] Consultas SQL, assertions reales y evidencia (semana 03).
* [ ] Revisión final del grupo.
* [ ] Pull Request grupal hacia `main`.

## Entregables generales del proyecto

Checklist según [ENTREGABLES.md](../../ENTREGABLES.md):

* [x] Análisis y alcance.
* [x] BDD en `features/`.
* [x] API — colección Postman/Newman con validación SQL.
* [ ] UI — pruebas en `tests/e2e/` con Playwright.
* [x] Evidencias en `evidence/` y `evidence/semana-03/`.
* [ ] CI/CD verde.
* [ ] Pull Request hacia `main`.
