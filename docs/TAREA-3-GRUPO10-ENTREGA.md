# Tarea 3.0 — Grupo 10 usando la colección existente

## Entrega

La colección original de Downloads fue conservada y extendida en:

`postman/Grupo10_Roles_Permisos_Tarea3.postman_collection.json`

Se agregaron los scripts SQL REST sin borrar los requests ni las assertions que ya tenía el grupo.

## Qué completar en Postman

1. Importar la colección final.
2. Importar `postman/grupo-10-roles-permisos.local.postman_environment.json`.
3. Seleccionar ese environment arriba a la derecha.
4. Ejecutar la carpeta `ESC-01 Crear usuario y asignar rol (happy path)` completa.
5. Ejecutar `ESC-05 Asignar rol inexistente (negativo)`.
6. Ejecutar `ESC-06 Usuario sin ningun rol (edge case)`.

Los escenarios 05 y 06 también preparan sus propios IDs por SQL, pero se recomienda ejecutar la carpeta en orden para conservar la trazabilidad completa.

No completar manualmente `usuarioId` ni `roleEditorId`: se generan durante la ejecución. El rol configurado es `soporte` porque el sandbox actual no tiene `Editor`.

## Requests y validaciones

| Carpeta | Requests | Validación adicional |
|---|---|---|
| ESC-01 | `GET /roles`, `POST /usuarios`, `POST /usuarios/{id}/roles`, `GET /usuarios/{id}/roles` | SQL confirma rol, usuario y asignación en `roles`, `usuarios` y `usuario_roles`. |
| ESC-05 | `POST /usuarios/{id}/roles` con `roleId=999999` | SQL confirma que `usuario_roles` no aumenta. |
| ESC-06 | `DELETE /usuarios/{id}/roles/{roleId}` | SQL confirma `activo=false` y deja registrado el gap: la API permite quedar sin roles, aunque el BDD esperaba impedirlo. |

Todas las consultas usan el endpoint de solo lectura:

`POST https://aiquaa-sandbox-api.vercel.app/api/v1/sql/select`

## Código de ejecución

```bash
npx newman run postman/Grupo10_Roles_Permisos_Tarea3.postman_collection.json \
  -e postman/grupo-10-roles-permisos.local.postman_environment.json \
  --reporters cli,json \
  --reporter-json-export newman/grupo10-tarea3.json
```

## Evidencia y PR

Guardar la salida del Runner o `newman/grupo10-tarea3.json` en `grupos/grupo-10-roles-permisos/evidence/semana-03/`. El PR debe incluir la colección, el environment sin secretos, la documentación y el resultado de la corrida. La API key debe configurarse como secreto de GitHub (`AIQUAA_API_KEY`) y nunca pegarse en una colección compartida.
