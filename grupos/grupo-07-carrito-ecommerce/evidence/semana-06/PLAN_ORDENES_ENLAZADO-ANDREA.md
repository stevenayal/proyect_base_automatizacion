# PLAN_ORDENES_ENLAZADO — OE-G07-01

**Grupo:** 07 — Carrito de Compras / E-commerce · **Autora:** Andrea Escurra
**Semana:** 6 — BDD (Cucumber + Playwright + POM) · **Fecha:** 2026-10-02
**Escenario:** `OE-G07-01` — Listado → crear orden → detalle

---

## 1. Requisito y trazabilidad

El escenario cubre **de punta a punta** tres requisitos del módulo de órdenes, en
un solo recorrido enlazado (como pide la consigna: "un escenario enlazado de
principio a fin").

| Requisito | Pantalla | Qué verifica el escenario |
|---|---|---|
| **RF-G7-01** | `/ordenes` | El listado de órdenes se muestra con sus columnas. |
| **RF-G7-02** | `/ordenes/new` | Se crea una orden desde el formulario con un ítem válido y se redirige al detalle. |
| **RF-G7-03** | `/ordenes/{id}` | El detalle muestra la orden con cabecera e ítems, el monto coincide con el del servidor, el estado es el esperado y la orden existe en la base. |

**Criterio de aceptación documentado** (en el `.feature`, arriba del `Scenario`,
que es de donde la matriz de trazabilidad del PDF lo extrae):

> RF-G7-01 listado de órdenes, RF-G7-02 alta de orden y RF-G7-03 detalle de la
> orden — recorrido completo de principio a fin.

Los pasos van en **español** (convención de `sandbox-pom` del profesor).

## 2. Precondiciones y datos de prueba

| Dato | Valor | Por qué |
|---|---|---|
| Usuario | El **primer usuario activo** por SQL (`SELECT ... WHERE activo = $1 ORDER BY id LIMIT 1`) | Sin constantes hardcodeadas: si el sandbox cambia, el escenario sigue. |
| Front | `https://aiquaa-sandbox-web.vercel.app` | App Next.js client-side. |
| API | `https://aiquaa-sandbox-api.vercel.app` | Verificación y limpieza. |
| Producto del ítem | `G7-T6-<uuid8>-Teclado` | El **uuid es obligatorio**: el sandbox es compartido y tiene ~1000 órdenes; un nombre fijo chocaría con datos de otros grupos. |
| Cantidad / precio | `2` / `119.99` | Ítem válido; `usuarioId` viene precargado con `1` en el front. |

**Login:** el sandbox autentica **solo con email** (verificado: 0 campos
`password`). El recorrido es `/curso` → "Curso 1 · Automatización" → Continuar →
`/auth/login` → email.

## 3. Contrato `data-testid` (verificado contra el DOM real)

Copiado del DOM, **no deducido** — un selector inventado pasa el `dryrun` (no
abre navegador) y revienta con timeout en la primera corrida real. Verificado el
2026-10-02 con el smoke test `tests/bdd/_smoke-locators.mjs` (22/22 OK).

| Pantalla | Elemento | Locator |
|---|---|---|
| `/ordenes` | Tabla | `getByTestId('ordenes-list')` |
| `/ordenes` | Fila | `getByTestId('ordenes-row-{id}')` |
| `/ordenes` | Monto | `fila.locator('[data-value]')` → leer el **atributo** |
| `/ordenes/new` | Formulario | `getByTestId('ordenes-form')` |
| `/ordenes/new` | Producto / cantidad / precio | `getByTestId('ordenes-field-items-0-producto')` · `-cantidad` · `-precioUnitario` |
| `/ordenes/new` | Confirmar | `getByTestId('ordenes-submit')` |
| `/ordenes/{id}` | Cabecera (`<dl>`) | `getByTestId('ordenes-detail')` |
| `/ordenes/{id}` | Tabla de ítems | `getByTestId('ordenes-row-{id}-items')` |

**Lo que NO tiene `data-testid`:** los `<dd>` (Monto, Estado, Producto principal) —
se scoplean por el `<dt>` que los precede (etiquetas reales: `Usuario`, `Producto
principal`, `Monto`, `Estado`).

## 4. Riesgos y trampas (documentados para no perder puntos en la corrida)

| Trampa | Qué se hace |
|---|---|
| **El monto se muestra como `320,98`** (formato local) | Se lee el **atributo** `data-value` (`320.98`), nunca el texto. Un `toHaveText` fallaría siempre. |
| **`subtotal` guardado no es `cantidad × precio`** | La API guarda el **precio unitario** como `subtotal`. "total = Σ subtotales" es un assert falso: el monto se compara **contra la API**. |
| **El listado no muestra la orden nueva** | El listado está paginado; la verificación se hace en el **detalle** y **contra la base**, no buscando la fila nueva. |
| **Frontend client-side** | El HTML estático no expone los testids; hacen falta navegador (smoke test previo) y `waitForURL` tras el submit. |

## 5. Resultado esperado

- `@OE-G07-01`: **PASS** (11 pasos) — verificado en local y en el workflow.
- **Gate:** el veredicto sale del informe PDF (`CRITERIOS CUMPLIDOS`) y el
  Classifier (`TEST_BUG = 0` en verde).
- **Evidencia:** `evidence/semana-06/` (informe PDF con matriz de trazabilidad,
  JSON de Cucumber, clasificación del fallo controlado y propuesta del healer).

## 6. Fuera de alcance

- RF-G7-04 / RF-G7-05 (edición y borrado por UI): no son requisito de este
  escenario. La limpieza se hace **por API** en el `After`.
- Otros módulos del grupo (carrito, pagos): este workspace cubre solo órdenes.
- La comparación Playwright vs. Selenium vs. Cypress, que es un documento de la
  Tarea 5, no de esta.