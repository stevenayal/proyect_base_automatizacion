# Tarea 3.0 — Grupo 10: Pre-request y Post-request con validación en base de datos

Esta entrega sigue la consigna de la Semana 3: trabajar en el repositorio base, obtener datos dinámicamente mediante la API SQL REST, aplicar el patrón Pre-request/Post-request y dejar la colección lista para ejecutarse en Postman/Newman.

# Grupo 10 — API de Roles y Permisos

## Adaptación de los escenarios

Los escenarios entregados mencionan `Editor`, `Cajero`, `Gerente de Sucursal`, desembolsos y límites monetarios. El contrato real del sandbox no expone esos roles ni una API de desembolsos. El catálogo permitido por la API es `admin`, `soporte`, `auditor` y `operador`; las rutas disponibles son las de `roles` y `usuario_roles`.

Por eso, la automatización API usa equivalentes verificables del mismo módulo:

| Tipo | Escenario ejecutable | Endpoint | Resultado esperado |
|---|---|---|---|
| Happy path | Asignar un rol vigente a un usuario activo, usando IDs obtenidos por SQL | `POST /api/v1/usuarios/{id}/roles` | `201` si es alta o `200` si reactiva; `activo=true` |
| Negativo | Asignar `roleId=999999` | `POST /api/v1/usuarios/{id}/roles` | `400 VALIDATION_ERROR`; la tabla no cambia |
| Edge case | Asignar dos veces el mismo par usuario/rol | `POST /api/v1/usuarios/{id}/roles` | `200`; no se duplica la fila |

La colección ejecutable es `postman/grupo-10-roles-permisos-sql-rest.postman_collection.json`.

## Validación SQL REST

Todas las consultas son de solo lectura contra `POST /api/v1/sql/select` y usan `params`:

- Selección dinámica de usuario y rol desde `usuarios` y `roles`.
- Confirmación posterior de `usuario_roles.activo` para el caso válido.
- Conteo antes/después para demostrar que el caso inválido no insertó una fila.
- Conteo antes/después para demostrar que el caso duplicado no creó otra asignación.

## Ejecución en Postman

1. Importar la colección y el environment `postman/grupo-10-roles-permisos.local.postman_environment.json` para uso local, o el environment sin secreto para cargar la clave manualmente.
2. Abrir el environment **AIQUAA Sandbox - Grupo 10 Roles y Permisos**.
3. Completar `apiKey` localmente con la clave entregada por el equipo. No guardar ese valor en Git.
4. Ejecutar la colección completa, en orden.
5. Guardar el resultado del Runner como evidencia.

## Ejecución con Newman

```bash
npx newman run postman/grupo-10-roles-permisos-sql-rest.postman_collection.json \
  -e postman/grupo-10-roles-permisos.postman_environment.json \
  --env-var "apiKey=$AIQUAA_API_KEY" \
  --reporters cli,json \
  --reporter-json-export newman/grupo-10-roles-permisos.json
```

## Checklist de entrega grupal

- [x] Colección Postman dentro de `postman/`.
- [x] Datos de usuario y rol obtenidos dinámicamente desde SQL REST.
- [x] Pre-request para preparar datos y validar precondiciones.
- [x] Post-request para verificar API y persistencia en la base.
- [x] Caso feliz, caso negativo y caso límite.
- [x] API key fuera de los archivos compartidos y configurable como secreto.
- [x] Workflow Newman para CI/CD.
- [ ] Ejecutar la colección con la API key del equipo y guardar la evidencia.
- [ ] Crear el PR grupal hacia `main` y que cada integrante marque su entrega.

## Límite funcional detectado

La API no verifica que el actor sea `admin` u `operador`: cualquier API key válida puede asignar o revocar roles. Los escenarios de autorización por rol y límites de desembolso deben quedar como escenarios BDD/UI pendientes, o requieren que el profesor entregue endpoints adicionales.
