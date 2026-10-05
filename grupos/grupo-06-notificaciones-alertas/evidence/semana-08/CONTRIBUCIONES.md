# Contribuciones — Grupo 06 (Notificaciones y Alertas)

Las contribuciones salen del **historial de git** de los archivos del grupo (`grupos/grupo-06-notificaciones-alertas/`,
la colección y el environment de Postman del grupo, sus workflows y su plan de JMeter), al 04/10/2026.
La columna **Revisión y aporte no registrado en git** la completa cada integrante: reuniones, revisiones, pruebas
manuales o redacción que no quedan como commit.

| Integrante | Commits | Aportes registrados en git | Revisión y aporte no registrado en git |
|---|---|---|---|
| Fabian Machado | 20 | Escenarios BDD push y consolidación de escenarios; README del grupo y evidencia de setup; validaciones de contrato y seguridad (S6, S8, SEG); validación SQL de `PATCH /leer`; workflows de JMeter+MCP, Postman+Python y Cucumber+Playwright; perfil de Cucumber aislado; ajuste de delay y payload del POST. PRs [#38](https://github.com/stevenayal/proyect_base_automatizacion/pull/38) y [#93](https://github.com/stevenayal/proyect_base_automatizacion/pull/93). | _a completar_ |
| Fernando Servián | 11 | Escenarios BDD e integrantes; colección Postman y trazabilidad BDD → API; validación SQL, criterios de aceptación del RF y evidencia de la semana 03; ajuste del BDD UI al paso de curso y runner local de Newman; integración y evidencia de las semanas 07 y 08. | _a completar_ |
| Karina Bogarín | 5 | Escenario 9 (email como canal principal); cobertura de `GET /notificaciones/{id}` (feliz y 404); patrón pre/post-request con validación SQL. | _a completar_ |
| Ana Mendoza | 1 | Escenario de notificaciones por múltiples canales. | _a completar_ |
| Madhy Avalos | 1 | Escenarios BDD de notificaciones SMS. | _a completar_ |

> El conteo de commits no mide la calidad ni el esfuerzo total: hay trabajo de revisión, coordinación y pruebas
> manuales que no queda en git. Por eso cada integrante completa la última columna.

**Cómo regenerar el conteo:**

```bash
git shortlog -sne HEAD -- grupos/grupo-06-notificaciones-alertas \
  postman/grupo-06-notificaciones-alertas.postman_collection.json postman/grupo-06-aiquaa.postman_environment.json \
  .github/workflows/postman-grupo06-regression.yml .github/workflows/jmeter-grupo06-performance.yml \
  .github/workflows/Y_BDD_GRUPO06_cucumber_playwright.yml tests/performance/plans/Grupo06_Notificaciones.jmx
```
