# Grupo 03 — Pagos de Servicios

**Módulo:** Pago de facturas (ANDE, ESSAP, telefonía)
**Rama:** `grupo-03-pagos-servicios`

## Integrantes

- (completar: nombre y email — ver `inscripcion-grupos-bdd2.xlsx`)
- Juan Morel - jospz077@gmail.com
- Ana Segovia - annyse.28@gmail.com
- Lennys Cantero - lennyscantero@gmail.com
- Enzo Ruiz Diaz - enzoruizdiaz96@gmail.com
- Stefanía Cubas - stefi.cubas08@gmail.comm

## Alcance

Automatización del ciclo de vida de una factura de servicio del sandbox (`app/api/v1/facturas`,
RF-G3-01..06): listar/filtrar, registrar (estado siempre "pendiente"), consultar, reemplazar
cabecera, pagar (transaccional, evita doble pago) y baja lógica. Cubierto en dos capas:

- **BDD (feature):** `features/pagos-servicios.feature` — 20 escenarios `@grupo-3 @api`
  usando el catálogo de steps de la skill `bdd` (RF-G3-01..06, happy/negativo/edge).
- **API (Postman/Newman):** `postman/grupo-03-pagos-servicios.postman_collection.json`
  — 25 requests con `pm.test`, encadenando `facturaId`/`facturaId2`, más la carpeta
  `E2E - SQL (validación BD)` con el patrón obligatorio de
  [`docs/TAREA-SQL-REST-DINAMICO.md`](../../docs/TAREA-SQL-REST-DINAMICO.md) sobre
  `POST /api/v1/facturas/{id}/pagar` (pre/post-request contra `/api/v1/sql/select`).

**Objetivo:** garantizar que una factura solo puede pagarse una vez y que el resto de las
operaciones CRUD respetan el contrato documentado en `/docs`.

**Supuestos / brechas del diseño (documentadas como comportamiento esperado):**
- Al crear (POST), `estado` siempre queda en `"pendiente"`; la única vía a `"pagada"` es
  `POST /api/v1/facturas/{id}/pagar`.
- `PUT /api/v1/facturas/{id}` reemplaza `proveedor`/`numeroFactura`/`monto`/`fechaVencimiento`;
  su schema no acepta `estado`, por lo que ese campo no se puede tocar por ese medio.
- `POST .../pagar` es transaccional (`SELECT...FOR UPDATE` + `INSERT pagos` +
  `UPDATE facturas.estado`) y responde 404 tanto si la factura no existe como si ya está
  `"pagada"` — evita el doble pago.
- `DELETE /api/v1/facturas/{id}` es soft-delete: la factura queda fuera de listados/consultas
  posteriores (404).
- `(proveedor, numeroFactura)` es una constraint unique: repetirla devuelve 409 `CONFLICT`.

**Riesgos:** el schema `qa_training` es compartido entre todos los grupos/sesiones; correr la
colección repetidas veces contra el mismo `facturaId` de otro grupo puede pisar estado. Por eso
todos los casos de escritura crean su propia factura fresca en vez de reutilizar ids fijos del
seed.

**Cobertura excluida:** UI (el sandbox no expone un frontend de facturas, solo `/docs`), y
proveedores fuera del enum soportado (`ANDE`, `ESSAP`, `COPACO`, `Tigo`, `Personal`).

## Cómo ejecutar la regresión
```bash
# Postman/Newman
npm i -g newman
newman run postman/grupo-03-pagos-servicios.postman_collection.json \
  --env-var "baseUrl=http://localhost:3001" \
  --env-var "apiKey=TU_API_KEY"

# BDD (skill bdd) — requiere steps S_api.steps.ts y cucumber-js
npx cucumber-js --tags "@grupo-3"
```

## Entregables (checklist ENTREGABLES.md)
- [x] Análisis y alcance (este README + feature)
- [x] BDD — `features/` (20 escenarios: happy path, negativo, edge case)
- [x] API — colección Postman/Newman (`postman/grupo-03-pagos-servicios.postman_collection.json`)
      + patrón SQL REST dinámico sobre `POST /api/v1/facturas/{id}/pagar`
- [ ] UI — `tests/e2e/` con Playwright (pendiente: el front del sandbox no expone facturas)
- [ ] Evidencias en `evidence/`
- [ ] CI/CD verde
- [ ] PR a `main` usando la plantilla del repo
