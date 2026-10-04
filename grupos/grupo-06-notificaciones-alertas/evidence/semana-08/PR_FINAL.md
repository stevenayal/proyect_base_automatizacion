# Descripción del PR final — Grupo 06

> Texto para actualizar la descripción del PR [#93](https://github.com/stevenayal/proyect_base_automatizacion/pull/93)
> (rama `grupo-06-notificaciones-alertas` → `main`). Copiar desde la línea siguiente.

---

## Grupo 06 — Notificaciones y Alertas: entrega final

Entrega final del módulo de notificaciones (push, email y SMS) sobre AIQUAA Sandbox. El alcance queda congelado
al 04/10/2026 (ver `evidence/semana-08/ALCANCE_FINAL.md`).

### Qué incluye

| Semana | Entregable | Ubicación |
|---|---|---|
| Base | 9 escenarios BDD, alcance y auditoría de la propuesta IA | `features/notificaciones-alertas.feature` · `README.md` |
| 1 | Colección Postman con trazabilidad BDD → API (9/9 escenarios) | `postman/grupo-06-*.json` · `docs/trazabilidad-bdd-api.md` |
| 2 | Validación en base de datos vía API SQL REST (6/6 requerimientos) | `docs/trazabilidad-rf-sql.md` · `evidence/semana-03/` |
| 3 | Workflow de Newman con informe PDF | `.github/workflows/postman-grupo06-regression.yml` |
| 4 | Plan JMeter + CSV (crear y consultar) con SLA | `tests/performance/` |
| 5 | Pipeline de rendimiento con informe PDF (MCP) y gate de SLA | `.github/workflows/jmeter-grupo06-performance.yml` |
| 6 | BDD con Cucumber + Playwright sobre el sitio web | `features/notificaciones-acceso-ui.feature` · workflow `Y_BDD_GRUPO06_*` |
| 7 | Integración: éxito, fallo controlado, evidencia API/JMeter y síntesis PDF | `evidence/semana-07/` |
| 8 | Alcance final, contribuciones y presentación | `evidence/semana-08/` |

### Resultados

- **API + base de datos:** 79 requests · 482 validaciones · 0 fallos.
- **Rendimiento:** 0 % errores · p95 POST 607 ms (≤ 1500) · p95 GET 269 ms (≤ 800) · SLA PASS.
- **BDD UI:** 2/2 escenarios en verde (local y GitHub Actions); fallo controlado documentado.

**Decisión:** apto con observaciones. HG06-03 (media) queda abierto y el monitoreo con Grafana no está integrado.

### Cambios de esta actualización

- BDD UI: evidencia por paso (captura y trace de Playwright), reporte HTML y PDF de evidencias.
- Escenario de fallo controlado aislado con el tag `@grupo06_fallo_controlado` (no corre en CI).
- Timeout de pasos de Cucumber a 15 s en el perfil `grupo06`, para que un fallo muestre el mensaje real.
- Workflow de BDD: genera el PDF de evidencias y se dispara también con cambios en `support/` y en el script.
- Evidencia y documentación de las semanas 07 y 08.

### Cómo verificar

```powershell
npx cucumber-js --profile grupo06 --tags "@grupo06"                    # 2/2 escenarios
npx cucumber-js --profile grupo06 --tags "@grupo06_fallo_controlado"   # falla a propósito
node grupos/grupo-06-notificaciones-alertas/scripts/run-newman.cjs     # requiere GRUPO06_API_KEY en .env
```

Detalle completo en `evidence/semana-07/README.md`.

### Checklist

- [x] Rama `grupo-06-notificaciones-alertas`; cambios solo en archivos del grupo y en su perfil/workflows.
- [x] Sin credenciales versionadas (el JSON de Newman no se sube; la evidencia fue escaneada).
- [x] Evidencia de éxito y de fallo controlado.
- [x] Síntesis PDF con decisión, límites y riesgos.
- [ ] Revisión de cada integrante completada en `evidence/semana-07/README.md` y `CONTRIBUCIONES.md`.
- [ ] Workflows en verde tras el push final.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
