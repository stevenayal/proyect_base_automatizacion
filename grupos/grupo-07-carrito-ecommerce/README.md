# Grupo 07 — Carrito de Compras / E-commerce

**Módulo:** Checkout de un e-commerce (tablas `ordenes` + `items_orden`)
**Rama sugerida:** `grupo-07-carrito-ecommerce`

## Integrantes
- Juan Barreto	    juan.m.barretog@gmail.com
- Andrea Escurra    escurracaceres.andy@gmail.com
- Emilio Rojas	    emrojazg@gmail.com
- Armin Avezada     arminavq@fpuna.edu.py
- Felipe Rivas      danirivas64@fpuna.edu.py

## Alcance
Automatización del cierre de compra y ciclo de vida de la orden del sandbox (RF-G7-01..05):
listar, checkout transaccional (cálculo server-side del total), consulta con detalle,
recálculo de cabecera y baja lógica. Cubierto en tres capas:

- **BDD (feature):** `features/carrito-ecommerce.feature` — 18 escenarios `@grupo-7 @api`
  usando el catálogo de steps de la skill `bdd` (RF-G7-01..05, happy/negativo/edge).
  El stub original de alumnos quedó en `features/carrito-ecommerce.stub.feature.bak`.
- **API (Postman/Newman):** `postman/grupo-07-carrito-ecommerce.postman_collection.json`
  — 20 requests con `pm.test`, encadenando `ordenId`.
- **Agente de IA (ejemplo):** `agente-ia/` — agente function-calling que opera los 5 endpoints.

## Supuestos / brechas del diseño (documentadas como comportamiento esperado)
- `monto` y `subtotal` los calcula siempre el servidor; un total del cliente se ignora.
- `PUT /ordenes/{id}` recalcula `producto`/`monto` pero **no** toca `items_orden`: tras un
  recálculo, `GET /ordenes/{id}` muestra el detalle original desincronizado del nuevo monto.
- `DELETE /ordenes/{id}` es soft-delete (`activo=false`); deja `items_orden` huérfanos.

## Cómo ejecutar la regresión
```bash
# Postman/Newman
npm i -g newman
newman run postman/grupo-07-carrito-ecommerce.postman_collection.json \
  --env-var "baseUrl=http://localhost:3001" \
  --env-var "apiKey=TU_API_KEY"

# BDD (skill bdd) — requiere steps S_api.steps.ts y cucumber-js
npx cucumber-js --tags "@grupo-7"

# Agente de IA (demo)
cd agente-ia
BASE_URL=http://localhost:3001 API_KEY=TU_API_KEY node agent.mjs
```

## Entregables (checklist ENTREGABLES.md)
- [x] Análisis y alcance (este README + feature)
- [x] BDD — `features/` (18 escenarios: happy path, negativo, edge case)
- [x] API — colección Postman/Newman (`postman/grupo-07-carrito-ecommerce.postman_collection.json`)
- [ ] UI — `tests/e2e/` con Playwright (pendiente: el front del sandbox no expone carrito)
- [ ] Evidencias en `evidence/`
- [ ] CI/CD verde
- [ ] PR a `main` usando la plantilla del repo
