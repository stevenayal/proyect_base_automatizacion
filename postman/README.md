# Postman y Newman

La colección incluida es solo un punto de partida técnico.

Cada grupo debe:

- duplicarla o extenderla
- agregar assertions reales
- agregar manejo de variables y evidencia
- adaptar sus requests al entorno publicado del laboratorio

`aiquaa Sandbox API.json` está sincronizada con la última versión de
[`aiquaa-sandbox-api`](https://github.com/stevenayal/aiquaa-sandbox-api) — trae una carpeta
`E2E - Flujos con validación SQL` con el patrón de pre-request/post-response validando la base
de datos. Ver la tarea grupal en
[`docs/TAREA-SQL-REST-DINAMICO.md`](../docs/TAREA-SQL-REST-DINAMICO.md) y la guía en
[`docs/patron-postman-pre-post-request.pdf`](../docs/patron-postman-pre-post-request.pdf).

### Colecciones por grupo (Semana 03)

- **Grupo 01 — Autenticación y Acceso:** [`C_GRUPO_01_AUTENTICACION_ACCESO.json`](C_GRUPO_01_AUTENTICACION_ACCESO.json)
  + entorno [`E_GRUPO_01_AUTENTICACION.json`](E_GRUPO_01_AUTENTICACION.json). Aplica el patrón
  SQL REST dinámico (prepara/valida `sesiones` y `usuarios` en `qa_training`), con assertions
  reales sobre status 200/201/400/401/404, esquema JSON, tiempo de respuesta y tokens
  capturados. Evidencia en
  [`grupos/grupo-01-autenticacion-acceso/evidence/semana-03/`](../grupos/grupo-01-autenticacion-acceso/evidence/semana-03/).
