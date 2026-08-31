# Grupo 07 — Carrito de Compras / E-commerce

**Módulo:** Checkout de un e-commerce
**Rama:** `grupo-07-carrito-ecommerce`

## Integrantes

- Juan Barreto	    juan.m.barretog@gmail.com
- Andrea Escurra    escurracaceres.andy@gmail.com
- Emilio Rojas	    emrojazg@gmail.com
- Armin Avezada     arminavq@fpuna.edu.py
- Felipe Rivas      danirivas64@fpuna.edu.py 

## Alcance

- TODO: objetivo del flujo automatizado
- TODO: supuestos
- TODO: riesgos
- TODO: cobertura incluida / excluida

## Entregables

Checklist según [ENTREGABLES.md](../../ENTREGABLES.md):

- [ ] Análisis y alcance
- [ ] BDD — `features/` (mínimo 3 escenarios: happy path, negativo, edge case)
- [ ] API — colección Postman/Newman (si aplica al módulo)
- [ ] UI — `tests/e2e/` con Playwright
- [ ] Evidencias en `evidence/`
- [ ] CI/CD verde
- [ ] PR a `main` usando la plantilla del repo

## Trazabilidad BDD -> API - Juan Barreto

Colección Postman: `postman/grupo-07-juan-barreto-carrito-e-commerce.postman_collection.json`.

| Escenario BDD | Tipo | Endpoint | Método | Datos de entrada | Validaciones / Assertions |
|---|---|---|---|---|---|
| Completar una compra con productos disponibles | Happy Path | `{{baseUrl}}/api/v1/ordenes` | POST | `usuarioId: 1`; dos ítems: Teclado (`cantidad: 2`, `precioUnitario: 10.50`) y Mouse (`cantidad: 1`, `precioUnitario: 5.25`) | Status **201**; `data.id` existe; `data.estado` es `pendiente`; `data.items` contiene dos elementos; `data.monto` es **26.25**; tiempo de respuesta menor a 3000 ms; guarda `data.id` en `ordenId` |
| No permitir finalizar una compra con el carrito vacío | Negativo | `{{baseUrl}}/api/v1/ordenes` | POST | `usuarioId: 1`; `items: []` | Status **400**; existe la estructura `error`; `error.code` es `VALIDATION_ERROR`; tiempo de respuesta menor a 3000 ms |
| No permitir confirmar una compra con cantidad cero de un producto | Edge Case | `{{baseUrl}}/api/v1/ordenes` | POST | `usuarioId: 1`; Teclado con `cantidad: 0` y `precioUnitario: 10.50` | Status **400**; existe la estructura `error`; `error.code` es `VALIDATION_ERROR`; tiempo de respuesta menor a 3000 ms |

### Variables de colección utilizadas

- `baseUrl`: URL base del sandbox AIQUAA (`https://aiquaa-sandbox-api.vercel.app`).
- `apiKey`: API key enviada mediante el header `x-api-key`; su valor se mantiene vacío en el archivo exportado para no publicar credenciales.
- `ordenId`: identificador guardado automáticamente desde `data.id` después del checkout exitoso.
