# Alcance final congelado — Grupo 06 (Notificaciones y Alertas)

**Rama:** `grupo-06-notificaciones-alertas` · **PR final:** [#93](https://github.com/stevenayal/proyect_base_automatizacion/pull/93)
**Fecha de congelamiento:** 04/10/2026

A partir de esta fecha el alcance queda **cerrado**: no se agregan escenarios, endpoints ni pruebas nuevas.
Solo se admiten correcciones de evidencia, de documentación o de fallos que impidan ejecutar lo ya entregado.

## Dentro del alcance

| Capa | Qué cubre | Artefactos |
|---|---|---|
| BDD (negocio) | 9 escenarios de notificaciones push, email y SMS | `features/notificaciones-alertas.feature` |
| API (Postman/Newman) | 9 de 9 escenarios y 6 de 6 requerimientos (RF-G6-01 a 06) sobre `/api/v1/notificaciones` | `postman/grupo-06-notificaciones-alertas.postman_collection.json` · `docs/trazabilidad-bdd-api.md` |
| Base de datos (SQL) | Verificación de persistencia vía `POST /api/v1/sql/select` | Misma colección · `docs/trazabilidad-rf-sql.md` |
| CI Newman | Regresión de la API con informe PDF | `.github/workflows/postman-grupo06-regression.yml` |
| Rendimiento | Crear y consultar notificaciones con datos desde CSV, SLA definido | `tests/performance/plans/Grupo06_Notificaciones.jmx` · `data/grupo06-notificaciones.csv` · `thresholds/grupo06-thresholds.json` |
| Rendimiento en CI | JMeter headless, informe PDF (MCP) y gate de SLA | `.github/workflows/jmeter-grupo06-performance.yml` · `docs/rendimiento-jmeter.md` |
| BDD UI (Cucumber + Playwright) | Acceso al módulo: 2 escenarios + 1 fallo controlado, con evidencia por paso | `features/notificaciones-acceso-ui.feature` · `features/notificaciones-fallo-controlado.feature` · `support/evidencia.hooks.ts` |
| BDD en CI | Escenarios `@grupo06` con informe y PDF de evidencias | `.github/workflows/Y_BDD_GRUPO06_cucumber_playwright.yml` |

## Fuera del alcance (decisión del equipo)

| Tema | Motivo |
|---|---|
| Escenarios de negocio por UI | El sitio web no expone una bandeja de notificaciones con `data-testid` verificados; se prueban por API. |
| Preferencias de canal, teléfono, programación y token (D-01 a D-04) | La API del sandbox no los modela; los escenarios tienen cobertura parcial documentada. |
| Pruebas de carga y estrés | El límite de 30 requests/minuto por API key (compartida) no lo permite; se entrega una línea base. |
| Monitoreo con Grafana | La captura está preparada en el pipeline; no se ejecutó con el dashboard del sandbox. |
| Proveedores reales de email, SMS o push | Fuera del entorno de laboratorio. |

## Estado al congelar

| Componente | Resultado | Evidencia |
|---|---|---|
| API + base de datos | 79 requests · 482 validaciones · 0 fallos | [`../semana-07/api/`](../semana-07/api/) |
| Rendimiento | 10 requests · 0 % errores · SLA PASS | [`../semana-07/jmeter/`](../semana-07/jmeter/) |
| BDD UI | 2/2 escenarios; fallo controlado documentado | [`../semana-07/bdd-exito/`](../semana-07/bdd-exito/) · [`../semana-07/bdd-fallo-controlado/`](../semana-07/bdd-fallo-controlado/) |
| BDD en CI | 2 ejecuciones en verde (03/10/2026) | Runs 37137521056 y 37137525201 |

## Hallazgos abiertos al cierre

| ID | Severidad | Descripción |
|---|---|---|
| HG06-03 | Media | `PATCH /{id}/leer` marca como leída una notificación dada de baja (`activo=false` y `leido=true`). |
| HG06-02 | Baja | `id` y `usuario_id` se devuelven como texto aunque el contrato declara número; campo `activo` no documentado. |
