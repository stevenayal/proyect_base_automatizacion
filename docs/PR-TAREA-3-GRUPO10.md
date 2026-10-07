# PR — Tarea 3.0 Grupo 10

## Objetivo

Extender la colección existente de Roles y Permisos con el patrón Pre-request/Post-request y validaciones reales contra la base de datos mediante SQL REST.

## Archivos principales

- `postman/Grupo10_Roles_Permisos_Tarea3.postman_collection.json`
- `postman/grupo-10-roles-permisos.postman_environment.json`
- `docs/TAREA-3-GRUPO10-ENTREGA.md`
- `.github/workflows/postman-grupo10-roles-permisos.yml`

## Cobertura

- ESC-01: creación de usuario y asignación de un rol vigente.
- ESC-05: rechazo de un rol inexistente y confirmación de que la BD no cambia.
- ESC-06: revocación y confirmación SQL de la baja lógica; se documenta el hallazgo de que la API permite dejar al usuario sin roles.

## Ejecución

```bash
npm run test:api:grupo10
```

En CI se debe configurar el secreto `AIQUAA_API_KEY`. No se incluye ninguna clave en el PR.

## Evidencia pendiente

Adjuntar la salida del Postman Runner/Newman en `grupos/grupo-10-roles-permisos/evidence/semana-03/`.
