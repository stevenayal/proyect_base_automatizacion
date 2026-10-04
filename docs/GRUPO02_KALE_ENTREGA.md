# Guía de entrega — una sección por tarea del Classroom

> Todas las tareas se entregan en el repo del curso `stevenayal/proyect_base_automatizacion`
> mediante PR (salvo que el profe indique otra cosa). En Classroom: **Agregar o crear → Vínculo**
> con el link del PR y/o de la ejecución, y recién ahí **Entregar**.

## Cómo subirlo al repo del curso SIN pisar a tus compañeros

Todos los archivos tienen nombres/carpetas propios del Grupo 02 (`*GRUPO_02*`, `grupo02/`,
`Y_GRUPO02_KALE_*`). No se modifica **ningún** archivo existente (ni `package.json`, ni el
`.feature` ni la colección que ya subió tu grupo). Trabajás en **tu fork** y en **tu rama**;
a `main` solo llega cuando el profe acepte el PR.

1. En GitHub, abrir `https://github.com/stevenayal/proyect_base_automatizacion` → **Fork**.
2. Clonar tu fork y crear tu rama:
   ```bash
   cd ~/Documents
   git clone https://github.com/TU_USUARIO/proyect_base_automatizacion.git
   cd proyect_base_automatizacion
   git checkout -b grupo-02/tareas-kale
   ```
3. Copiar tus archivos (el script se niega a pisar archivos existentes):
   ```bash
   bash ~/Documents/aiquaa-grupo02-transferencias/tools/grupo02-kale/copiar-al-repo-del-curso.sh .
   git status        # deben aparecer solo archivos NUEVOS (??), ninguno "modified"
   ```
4. Commit y push a tu rama:
   ```bash
   git add .
   git commit -m "Grupo 02 - Transferencias: Postman+SQL, Newman CI, JMeter+CSV, Grafana, Cucumber+Playwright"
   git push -u origin grupo-02/tareas-kale
   ```
5. En tu fork → pestaña **Actions** → *"I understand my workflows, go ahead and enable them"*.
   Los 3 workflows `Grupo 02 - ...` corren en cada push a tu rama (o con **Run workflow**).
6. **Pull request**: en tu fork → *Compare & pull request* → base `stevenayal/proyect_base_automatizacion:main`
   ← `TU_USUARIO:grupo-02/tareas-kale`. Usar la plantilla de PR del repo.

---|---|
| `postman/C_GRUPO_02_*.json`, `postman/E_GRUPO_02_*.json` | `postman/` |
| `grupos/grupo-02-transferencias-cuentas/features/F_GRUPO_02_KALE_TRANSFERENCIAS_API.feature` | `grupos/grupo-02-transferencias-cuentas/features/` |
| `grupos/grupo-02-transferencias-cuentas/docs/TRAZABILIDAD_BDD_API_KALE.md` | `grupos/grupo-02-transferencias-cuentas/docs/` |
| `tests/performance/plans|data|thresholds/*GRUPO_02*` | `tests/performance/…` (mismas carpetas) |
| `tests/bdd/grupo02-kale/` | `tests/bdd/grupo02-kale/` |
| `reporter/grupo02-kale/postman/`, `reporter/grupo02-kale/bdd/` | ya existen en `skills/…/reporter/` → ajustar rutas en los YAML o copiar tal cual |
| `.github/workflows/Y_GRUPO02_KALE_*.yml` | `.github/workflows/` |

Rama sugerida: `grupo-02/tareas-automatizacion`. Un PR por tarea (o uno solo con todo, si el
profe lo acepta), usando la plantilla de PR del repo.

---

## 1. Tarea 2.0 — Colección Postman + Variables + Validaciones

Checklist del enunciado:
- [x] Colección con variables y validaciones alineadas a escenarios BDD
- [x] ≥ 3 escenarios mapeados a endpoints de AIQUAA con datos esperados (hay 11: TR-00…TR-10)
- [x] Trazabilidad BDD → API en `docs/`
- [x] Colección `.json` en `postman/`

Entregar: link del PR (o del archivo en el repo).

Texto de PR:
```
Grupo 02 – Tarea 2.0: Colección Postman + variables + validaciones
- postman/C_GRUPO_02_KALE_TRANSFERENCIAS.postman_collection.json (13 requests, 78 assertions)
- postman/E_GRUPO_02_KALE_TRANSFERENCIAS.postman_environment.json
- grupos/grupo-02-transferencias-cuentas/features/F_GRUPO_02_KALE_TRANSFERENCIAS_API.feature + grupos/grupo-02-transferencias-cuentas/docs/TRAZABILIDAD_BDD_API_KALE.md
Validaciones: status, schema, eco de datos, tiempo de respuesta, errores 400/401/404.
```

## 2. Tarea 3.0 — Pre Request y Post Request con validación en BD

Checklist (docs/TAREA-SQL-REST-DINAMICO.md del curso):
- [x] `utils.bodySqlRest` declarado una sola vez en el pre-request de la colección
- [x] Body legible con `{{variable}}` solo en los campos que cambian
- [x] Caso feliz: precondición en BD (pre) + relectura de la fila (post) — TR-03
- [x] Casos negativos: pisan una sola variable + `COUNT(*)` antes = después — TR-06/07/08
- [x] **Caso propio del Grupo 02**: `cuentaOrigenId === cuentaDestinoId` (TR-06)
- [x] Datos reales de la BD (nada inventado)
- [ ] Evidencia: captura del Runner o salida de `newman run` en `evidence/`

Entregar: link del PR. Cada integrante marca su entrega en Classroom.

## 3. Pipeline Postman + Reportería con Python

- Workflow `Y_GRUPO02_KALE_POSTMAN_NEWMAN.yml` (basado en `postman-grupo07-regression.yml`)
- Genera `INFORME_REGRESION_GRUPO02.pdf` (Python/reportlab) + `report.html`

Entregar: **link del PR** + **link de la ejecución del workflow**
(`https://github.com/<usuario>/<repo>/actions/runs/<id>`).

## 4. PR de Plan de Pruebas JMeter + CSV

- `P_GRUPO_02_KALE_TRANSFERENCIAS_CSV.jmx`: GET de consulta (cuenta) + POST de creación
  (transferencia) con datos del CSV, cuentas dinámicas de la BD, correlación y limpieza
- `D_GRUPO_02_KALE_TRANSFERENCIAS.csv`, `T_GRUPO_02_KALE_TRANSFERENCIAS.json`, `README.md`

Entregar: link del PR.

## 5. CI/CD JMeter + Reportería Grafana con MCP

- Workflow `Y_GRUPO02_KALE_JMETER_GRAFANA.yml`: JMeter headless → captura del dashboard de
  Grafana → PDF con `aiquaa-performance-mcp-server` → gate de SLA

Entregar: link del PR y/o de la ejecución + el PDF `INFORME_PERF_GRUPO02.pdf`
(descargarlo de los artefactos y adjuntarlo en Classroom).

## 6. Cucumber + Playwright con Agentes + Reportería + CI/CD

- Features en español sobre `aiquaa-sandbox-web` (login + transferencias), POM, World, hooks
- Datos dinámicos desde la BD, evidencias (capturas/traces), limpieza automática
- Skill del repo aplicada: `PLAN_TRANSFERENCIAS_WEB.md` (Planner), clasificador de fallos
  determinístico, reglas del Healer
- Workflow `Y_GRUPO02_KALE_CUCUMBER_PLAYWRIGHT.yml` + informe PDF + HTML

Entregar: link del PR + link de la ejecución del workflow.

---

## Links para completar

| Tarea | PR | Ejecución |
|---|---|---|
| 2.0 Postman | | — |
| 3.0 SQL pre/post | | — |
| Pipeline Postman | | |
| JMeter + CSV | | |
| CI/CD JMeter + Grafana | | |
| Cucumber + Playwright | | |
