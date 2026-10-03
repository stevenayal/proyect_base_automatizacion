# Grupo 03 — Pagos de Servicios · Trazabilidad BDD → API (colección Final)

Este documento une cada escenario del BDD con la request de Postman que lo automatiza y con las aserciones que verifican cada paso. Todo el contenido de la colección se generó desde el feature, por eso los nombres de los `pm.test` son el texto exacto de los pasos `Then` / `And` / `But`.

## Archivos

| Qué | Ruta |
|---|---|
| BDD | [`grupos/grupo-03-pagos-servicios/features/pagos-servicios-FINAL.feature`](../grupos/grupo-03-pagos-servicios/features/pagos-servicios-FINAL.feature) |
| Colección | [`postman/Grupo03-Pago-Servicios-Final_collection.json`](./Grupo03-Pago-Servicios-Final_collection.json) |
| Environment | [`postman/Grupo03-Pago-Servicios-Final_environment.json`](./Grupo03-Pago-Servicios-Final_environment.json) |
| Este documento | `postman/Grupo03-Pago-Servicios-Final_README.md` |

## Resumen de cobertura

| Carpeta | Endpoint | Escenarios BDD | Requests |
|---|---|---:|---:|
| RF-G3-03 · Pagar una factura | `POST /api/v1/facturas/{id}/pagar` | 11 | 16 |
| RF-G3-01 · Listar facturas | `GET /api/v1/facturas` | 6 | 6 |
| RF-G3-02 · Consultar una factura | `GET /api/v1/facturas/{id}` | 4 | 4 |
| RF-G3-04 · Crear una factura | `POST /api/v1/facturas` | 10 | 16 |
| RF-G3-05 · Reemplazar una factura | `PUT /api/v1/facturas/{id}` | 6 | 8 |
| RF-G3-06 · Dar de baja una factura | `DELETE /api/v1/facturas/{id}` | 6 | 6 |
| Reglas transversales de la API | `Autenticación y verbo no soportado` | 3 | 5 |
| **Total** | | **46** | **61** |

Cada `Scenario Outline` se expande en una request por fila de `Examples` (sufijo `a`, `b`, `c`… en el ID).

## Cómo correrla

```bash
npm install -g newman newman-reporter-htmlextra

newman run "postman/Grupo03-Pago-Servicios-Final_collection.json" \
  -e "postman/Grupo03-Pago-Servicios-Final_environment.json" \
  -r cli,json,htmlextra \
  --reporter-json-export results/G3_newman_final.json \
  --reporter-htmlextra-export results/G3_newman_final.html
```

En CI conviene no depender de la clave demo compartida: `--env-var "G3_apiKey=$G3_API_KEY"` (secret del repositorio).

Correr siempre la colección completa o una carpeta completa. Los helpers se definen en el pre-request de la colección; una request suelta en Postman también funciona, pero el reintento ante 429 solo actúa en el runner/Newman.

## Variables (environment)

| Variable | Valor por defecto | Uso |
|---|---|---|
| `G3_baseUrl` | `https://aiquaa-sandbox-api.vercel.app` | URL base del sandbox (sin barra final). |
| `G3_apiKey` | clave demo del curso | API key válida. En CI se reemplaza con --env-var desde un secret. |
| `G3_apiKeyInvalida` | `sbx_invalida_grupo03` | Clave inexistente para los escenarios de 401. |
| `G3_usuarioTitularId` | `` | Vacío: la corrida elige como titular al usuario activo con menos facturas pendientes. Con un id, se usa ese usuario fijo. |
| `G3_usuarioSinFacturasId` | `999999999` | Usuario sin facturas (listado vacío). |
| `G3_usuarioInexistenteId` | `999999999` | Usuario que no existe (alta de factura rechazada). |
| `G3_facturaInexistenteId` | `999999999` | Factura que no existe (404). |
| `G3_reqPorMinuto` | `20` | Requests por minuto que se permite la corrida (límite del sandbox: 30 por API key). |

La colección trae los mismos valores como variables de colección, así funciona también sin environment. El environment tiene prioridad sobre ellas.

## Convivencia con otros grupos en `main`

- Nombres de archivo con prefijo `Grupo03-`: no pisan colecciones ni environments de otros grupos en `postman/`.
- Todas las variables usan prefijo `G3_` (incluidas las internas `G3_proximoTurno`, `G3_reintentos` y `G3_titularElegido`), así no chocan con `baseUrl` / `apiKey` de otras colecciones ni con un environment global compartido.
- Las facturas que crea la colección llevan número `G3-<PROVEEDOR>-<timestamp>-<aleatorio>`: se distinguen de los datos de otros grupos.
- No se modificó ningún archivo existente de `postman/`.

## Estrategia de datos

- **Titular de la corrida.** Al empezar, la colección elige como titular al usuario activo con **menos facturas pendientes** (consulta de solo lectura, ver *Verificación en base de datos*) y lo usa en toda la corrida. El listado está limitado a 100 registros ordenados por id: con un titular que ya tiene 100 pendientes, las facturas nuevas nunca aparecerían en su listado. La elección se renueva cada 30 minutos. Para fijar un usuario, completar `G3_usuarioTitularId` en el environment. Si la consulta falla, los pasos `Given` lo informan.
- **Datos propios por escenario.** El pre-request crea las facturas que el escenario necesita para ese titular y las deja pagadas o dadas de baja si el `Given` lo pide. El BDD no depende de ids fijos.
- **Limpieza.** Al terminar, cada request da de baja las facturas que creó. El listado está limitado a 100 registros ordenados por id: sin limpieza, tras varias corridas las facturas nuevas del titular quedarían fuera y los escenarios de listado darían falsos resultados.
- **Factura vencida (PAG-05).** La API no permite dejar una factura en estado `vencida`, así que se usa la primera vencida de los datos sembrados. Pagarla la consume: el escenario solo puede repetirse mientras queden vencidas (si no quedan, falla la precondición con ese mensaje).
- **Ids inexistentes.** `G3_facturaInexistenteId` y los usuarios inexistentes valen `999999999`.
- **Escenarios de 401.** Usan el id inexistente: si la autenticación fallara, el `DELETE` no daría de baja ninguna factura real.

## Control de caudal (30 req/min por API key)

- Cada request, principal o auxiliar, reserva un turno separado por `60000 / G3_reqPorMinuto` ms (20 req/min por defecto).
- Si igual llega un `429` (la clave demo es compartida con otros grupos), las auxiliares se reintentan respetando `Retry-After` y la principal se repite hasta 2 veces con `setNextRequest`.
- Con los valores por defecto la corrida hace unas 130 requests y tarda alrededor de 7 minutos.

## Precondiciones visibles en el reporte

Cada paso `Given` que prepara datos tiene su propio `pm.test`. Si el pre-request no pudo elegir el titular o crear, pagar o dar de baja la factura, ese test falla con el motivo concreto (por ejemplo `ENOTFOUND` si se cortó la conexión, o el código y mensaje de error de la API), y así se distingue un problema de datos o de red de un defecto de la API.

## Trazabilidad por escenario

### RF-G3-03 · Pagar una factura

#### PAG-01 · Pago exitoso de una factura pendiente

`@smoke @RF-G3-03 @ande`

**Criterio:** RF-G3-03 — una factura pendiente se paga con un medio válido (200 · data.factura.estado=pagada · data.pago.estado=procesado)

```gherkin
Given el usuario tiene una factura de "ANDE" pendiente de pago
When el usuario paga la factura con el medio de pago "tarjeta"
Then la factura se paga correctamente
And la factura queda en estado "pagada"
And el pago queda en estado "procesado"
And el pago se registra con el medio de pago "tarjeta"
```

**Postman:** `POST /api/v1/facturas/{{G3_factura_id}}/pagar`

```json
{
  "metodoPago": "tarjeta"
}
```

**Preparación (pre-request):** crea una factura pendiente de ANDE del titular.

| Paso BDD | Aserción en Postman |
|---|---|
| Given el usuario tiene una factura de "ANDE" pendiente de pago | la preparación del pre-request terminó sin errores |
| Then la factura se paga correctamente | HTTP 200; `data.factura` presente; `data.pago` presente; la factura pagada es la del escenario |
| And la factura queda en estado "pagada" | `data.factura.estado` = `pagada` |
| And el pago queda en estado "procesado" | `data.pago.estado` = `procesado` |
| And el pago se registra con el medio de pago "tarjeta" | `data.pago.metodo_pago` = `tarjeta` |

#### PAG-02 · El importe del pago se copia de la factura

`@RF-G3-03 @essap`

**Criterio:** RF-G3-03 — el importe del pago lo toma el sistema de la factura, no el cliente (200 · data.pago.monto = data.factura.monto)

```gherkin
Given el usuario tiene una factura de "ESSAP" pendiente de pago
When el usuario paga la factura con el medio de pago "cuenta" e intenta indicar un monto de 1
Then la factura se paga correctamente
And el monto pagado es igual al monto de la factura y no al indicado por el usuario
```

**Postman:** `POST /api/v1/facturas/{{G3_factura_id}}/pagar`

```json
{
  "metodoPago": "cuenta",
  "monto": 1
}
```

**Preparación (pre-request):** crea una factura pendiente de ESSAP del titular.

| Paso BDD | Aserción en Postman |
|---|---|
| Given el usuario tiene una factura de "ESSAP" pendiente de pago | la preparación del pre-request terminó sin errores |
| Then la factura se paga correctamente | HTTP 200; `data.factura` presente; `data.pago` presente; la factura pagada es la del escenario |
| And el monto pagado es igual al monto de la factura y no al indicado por el usuario | data.pago.monto = monto de la factura; data.pago.monto = data.factura.monto; no toma el monto enviado |

#### PAG-03 · El titular del pago se copia de la factura

`@RF-G3-03 @copaco`

**Criterio:** RF-G3-03 — el titular del pago es el titular de la factura (200 · data.pago.usuario_id = titular de la factura)

```gherkin
Given el usuario tiene una factura de "COPACO" pendiente de pago
When el usuario paga la factura con el medio de pago "efectivo"
Then la factura se paga correctamente
And el pago queda a nombre del titular de la factura
```

**Postman:** `POST /api/v1/facturas/{{G3_factura_id}}/pagar`

```json
{
  "metodoPago": "efectivo"
}
```

**Preparación (pre-request):** crea una factura pendiente de COPACO del titular.

| Paso BDD | Aserción en Postman |
|---|---|
| Given el usuario tiene una factura de "COPACO" pendiente de pago | la preparación del pre-request terminó sin errores |
| Then la factura se paga correctamente | HTTP 200; `data.factura` presente; `data.pago` presente; la factura pagada es la del escenario |
| And el pago queda a nombre del titular de la factura | data.pago.usuario_id = data.factura.usuario_id; data.pago.usuario_id = titular |

#### PAG-04a, PAG-04b, PAG-04c, PAG-04d · Se puede pagar con cada medio de pago permitido

`@smoke @RF-G3-03 @ande @essap @tigo @personal`

**Criterio:** RF-G3-03 — cada medio de pago aceptado (tarjeta, cuenta, efectivo) permite pagar (200 · data.pago.metodo_pago = medio elegido)

```gherkin
Given el usuario tiene una factura de "<proveedor>" pendiente de pago
When el usuario paga la factura con el medio de pago "<medio>"
Then la factura se paga correctamente
And el pago se registra con el medio de pago "<medio>"
And la factura queda en estado "pagada"

Examples:
  | proveedor | medio |
  | ANDE | tarjeta |
  | ESSAP | cuenta |
  | Tigo | efectivo |
  | Personal | tarjeta |
```

| Request | Ejemplo | Endpoint |
|---|---|---|
| PAG-04a | proveedor = ANDE, medio = tarjeta | `POST /api/v1/facturas/{{G3_factura_id}}/pagar` |
| PAG-04b | proveedor = ESSAP, medio = cuenta | `POST /api/v1/facturas/{{G3_factura_id}}/pagar` |
| PAG-04c | proveedor = Tigo, medio = efectivo | `POST /api/v1/facturas/{{G3_factura_id}}/pagar` |
| PAG-04d | proveedor = Personal, medio = tarjeta | `POST /api/v1/facturas/{{G3_factura_id}}/pagar` |

**Preparación (pre-request):** crea una factura pendiente de ANDE del titular.

| Paso BDD | Aserción en Postman |
|---|---|
| Given el usuario tiene una factura de "<proveedor>" pendiente de pago | la preparación del pre-request terminó sin errores |
| Then la factura se paga correctamente | HTTP 200; `data.factura` presente; `data.pago` presente; la factura pagada es la del escenario |
| And el pago se registra con el medio de pago "<medio>" | `data.pago.metodo_pago` = `tarjeta` |
| And la factura queda en estado "pagada" | `data.factura.estado` = `pagada` |

#### PAG-05 · Pago de una factura vencida es aceptado

`@RF-G3-03 @datos-sembrados`

**Criterio:** RF-G3-03 — una factura vencida sí puede pagarse, por el importe original y sin recargos (200 · data.factura.estado=pagada · data.pago.monto = monto original) La API no permite dejar una factura en estado vencida, por eso se usa una vencida que ya venga en los datos sembrados. Como una factura se paga una sola vez, este escenario consume esa factura y solo puede repetirse mientras queden vencidas.

```gherkin
Given existe una factura vencida sin pagar
When el usuario paga la factura con el medio de pago "tarjeta"
Then la factura se paga correctamente
And la factura queda en estado "pagada"
And el monto pagado es igual al monto original de la factura, sin recargos
```

**Postman:** `POST /api/v1/facturas/{{G3_factura_id}}/pagar`

```json
{
  "metodoPago": "tarjeta"
}
```

**Preparación (pre-request):** toma la primera factura vencida de los datos sembrados.

| Paso BDD | Aserción en Postman |
|---|---|
| Given existe una factura vencida sin pagar | la preparación del pre-request terminó sin errores |
| Then la factura se paga correctamente | HTTP 200; `data.factura` presente; `data.pago` presente; la factura pagada es la del escenario |
| And la factura queda en estado "pagada" | `data.factura.estado` = `pagada` |
| And el monto pagado es igual al monto original de la factura, sin recargos | data.pago.monto = monto original |

#### PAG-06 · Una factura dada de baja todavía puede pagarse (inconsistencia conocida del sandbox)

`@edge-case @inconsistencia-documentada @RF-G3-03 @RF-G3-06 @copaco`

**Criterio:** RF-G3-03 + sección 5 (reglas transversales) — el pago NO filtra por activo=true. Es una inconsistencia real y documentada del sandbox: una factura dada de baja sigue pudiendo pagarse, pero después ya no se puede consultar por id. (pago: 200 · data.factura.estado=pagada · consulta posterior: 404 NOT_FOUND) Si la API cambia y empieza a rechazar este pago, este escenario debe fallar para que el cambio quede visible.

```gherkin
Given el usuario tiene una factura de "COPACO" pendiente de pago
And la factura fue dada de baja
When el usuario paga la factura con el medio de pago "tarjeta"
Then la factura se paga correctamente
And la factura queda en estado "pagada"
But al consultar el detalle de la factura el sistema informa que no fue encontrada
```

**Postman:** `POST /api/v1/facturas/{{G3_factura_id}}/pagar`

```json
{
  "metodoPago": "tarjeta"
}
```

**Preparación (pre-request):** crea una factura pendiente de COPACO del titular, la da de baja.

| Paso BDD | Aserción en Postman |
|---|---|
| Given el usuario tiene una factura de "COPACO" pendiente de pago | la preparación del pre-request terminó sin errores |
| And la factura fue dada de baja | la preparación del pre-request terminó sin errores |
| Then la factura se paga correctamente | HTTP 200; `data.factura` presente; `data.pago` presente; la factura pagada es la del escenario |
| And la factura queda en estado "pagada" | `data.factura.estado` = `pagada` |
| But al consultar el detalle de la factura el sistema informa que no fue encontrada | la consulta tuvo respuesta; `GET /facturas/{id}` → 404; `error.code` = `NOT_FOUND` (consulta `GET /facturas/{id}` posterior) |

#### PAG-07 · Pagar dos veces la misma factura falla la segunda vez

`@negativo @db @RF-G3-03 @ande`

**Criterio:** RF-G3-03 — una factura no se puede pagar dos veces y no se registra un segundo pago (404 NOT_FOUND · "Factura no encontrada o ya pagada." · SELECT COUNT(*) FROM pagos WHERE factura_id = factura → 1)

```gherkin
Given el usuario tiene una factura de "ANDE" pendiente de pago
And la factura ya fue pagada con el medio de pago "tarjeta"
When el usuario intenta pagar nuevamente la factura con el medio de pago "tarjeta"
Then el sistema rechaza el pago porque la factura no fue encontrada o ya fue pagada
And se muestra el mensaje "Factura no encontrada o ya pagada."
And al consultar el detalle de la factura, sigue en estado "pagada"
And en la base de datos queda registrado un solo pago para la factura
```

**Postman:** `POST /api/v1/facturas/{{G3_factura_id}}/pagar`

```json
{
  "metodoPago": "tarjeta"
}
```

**Preparación (pre-request):** crea una factura pendiente de ANDE del titular, la paga con tarjeta.

| Paso BDD | Aserción en Postman |
|---|---|
| Given el usuario tiene una factura de "ANDE" pendiente de pago | la preparación del pre-request terminó sin errores |
| And la factura ya fue pagada con el medio de pago "tarjeta" | la preparación del pre-request terminó sin errores |
| Then el sistema rechaza el pago porque la factura no fue encontrada o ya fue pagada | HTTP 404; `error.code` = `NOT_FOUND` |
| And se muestra el mensaje "Factura no encontrada o ya pagada." | `error.message` = `Factura no encontrada o ya pagada.` |
| And al consultar el detalle de la factura, sigue en estado "pagada" | la consulta tuvo respuesta; `GET /facturas/{id}` → 200; `data.estado` = `pagada` (consulta `GET /facturas/{id}` posterior) |
| And en la base de datos queda registrado un solo pago para la factura | POST /api/v1/sql/select tuvo respuesta; `POST /api/v1/sql/select` → 200; `data` no vacío; `pagos registrados para la factura` → 1 |

#### PAG-08 · Pago con un medio de pago no permitido

`@negativo @RF-G3-03 @essap`

**Criterio:** RF-G3-03 — un medio de pago fuera de la lista es rechazado y la factura conserva su estado (400 VALIDATION_ERROR · la consulta posterior sigue mostrando estado pendiente)

```gherkin
Given el usuario tiene una factura de "ESSAP" pendiente de pago
When el usuario paga la factura con el medio de pago "cripto"
Then el sistema rechaza el pago por datos inválidos
And al consultar el detalle de la factura, sigue en estado "pendiente"
```

**Postman:** `POST /api/v1/facturas/{{G3_factura_id}}/pagar`

```json
{
  "metodoPago": "cripto"
}
```

**Preparación (pre-request):** crea una factura pendiente de ESSAP del titular.

| Paso BDD | Aserción en Postman |
|---|---|
| Given el usuario tiene una factura de "ESSAP" pendiente de pago | la preparación del pre-request terminó sin errores |
| Then el sistema rechaza el pago por datos inválidos | HTTP 400; `error.code` = `VALIDATION_ERROR` |
| And al consultar el detalle de la factura, sigue en estado "pendiente" | la consulta tuvo respuesta; `GET /facturas/{id}` → 200; `data.estado` = `pendiente` (consulta `GET /facturas/{id}` posterior) |

#### PAG-09 · Pago sin indicar el medio de pago

`@negativo @RF-G3-03 @ande`

**Criterio:** RF-G3-03 — el medio de pago es obligatorio (400 VALIDATION_ERROR)

```gherkin
Given el usuario tiene una factura de "ANDE" pendiente de pago
When el usuario intenta pagar la factura sin indicar el medio de pago
Then el sistema rechaza el pago por datos inválidos
```

**Postman:** `POST /api/v1/facturas/{{G3_factura_id}}/pagar`

```json
{}
```

**Preparación (pre-request):** crea una factura pendiente de ANDE del titular.

| Paso BDD | Aserción en Postman |
|---|---|
| Given el usuario tiene una factura de "ANDE" pendiente de pago | la preparación del pre-request terminó sin errores |
| Then el sistema rechaza el pago por datos inválidos | HTTP 400; `error.code` = `VALIDATION_ERROR` |

#### PAG-10 · Pago de una factura que no existe

`@negativo @db @RF-G3-03`

**Criterio:** RF-G3-03 — pagar una factura inexistente es rechazado y no crea ningún pago (404 NOT_FOUND · SELECT COUNT(*) FROM pagos WHERE factura_id = id inexistente → 0)

```gherkin
When el usuario intenta pagar una factura que no existe
Then el sistema rechaza el pago porque la factura no fue encontrada o ya fue pagada
And en la base de datos no queda registrado ningún pago para esa factura
```

**Postman:** `POST /api/v1/facturas/{{G3_facturaInexistenteId}}/pagar`

```json
{
  "metodoPago": "tarjeta"
}
```

**Preparación (pre-request):** —.

| Paso BDD | Aserción en Postman |
|---|---|
| Then el sistema rechaza el pago porque la factura no fue encontrada o ya fue pagada | HTTP 404; `error.code` = `NOT_FOUND` |
| And en la base de datos no queda registrado ningún pago para esa factura | POST /api/v1/sql/select tuvo respuesta; `POST /api/v1/sql/select` → 200; `data` no vacío; `pagos registrados para la factura` → 0 |

#### PAG-11a, PAG-11b, PAG-11c · Pago con un identificador de factura inválido

`@negativo @RF-G3-03`

**Criterio:** RF-G3-03 — el identificador de la factura debe ser un entero positivo (400 VALIDATION_ERROR)

```gherkin
When el usuario intenta pagar una factura con el identificador inválido "<id>"
Then el sistema rechaza el pago por datos inválidos

Examples:
  | id |
  | abc |
  | -5 |
  | 0 |
```

| Request | Ejemplo | Endpoint |
|---|---|---|
| PAG-11a | id = abc | `POST /api/v1/facturas/abc/pagar` |
| PAG-11b | id = -5 | `POST /api/v1/facturas/-5/pagar` |
| PAG-11c | id = 0 | `POST /api/v1/facturas/0/pagar` |

**Preparación (pre-request):** —.

| Paso BDD | Aserción en Postman |
|---|---|
| Then el sistema rechaza el pago por datos inválidos | HTTP 400; `error.code` = `VALIDATION_ERROR` |

### RF-G3-01 · Listar facturas

#### LIS-01 · Listar facturas filtrando por estado pendiente

`@smoke @RF-G3-01 @ande`

**Criterio:** RF-G3-01 — al filtrar por estado pendiente, todas las facturas devueltas tienen ese estado (200 · data[].estado=pendiente)

```gherkin
Given el usuario tiene una factura de "ANDE" pendiente de pago
When el usuario consulta las facturas en estado "pendiente"
Then el sistema devuelve el listado de facturas
And todas las facturas del listado están en estado "pendiente"
```

**Postman:** `GET /api/v1/facturas?estado=pendiente`

**Preparación (pre-request):** crea una factura pendiente de ANDE del titular.

| Paso BDD | Aserción en Postman |
|---|---|
| Given el usuario tiene una factura de "ANDE" pendiente de pago | la preparación del pre-request terminó sin errores |
| Then el sistema devuelve el listado de facturas | HTTP 200 |
| And todas las facturas del listado están en estado "pendiente" | `data` no vacío; cada `data[].estado` = pendiente |

#### LIS-02 · Listar facturas combinando titular y estado

`@RF-G3-01 @copaco`

**Criterio:** RF-G3-01 — al combinar titular y estado se cumplen ambas condiciones (200 · data[].usuario_id = titular · data[].estado=pendiente)

```gherkin
Given el usuario tiene una factura de "COPACO" pendiente de pago
When el usuario consulta las facturas del titular en estado "pendiente"
Then el sistema devuelve el listado de facturas
And todas las facturas del listado pertenecen al titular
And todas las facturas del listado están en estado "pendiente"
```

**Postman:** `GET /api/v1/facturas?usuarioId={{G3_titular}}&estado=pendiente`

**Preparación (pre-request):** crea una factura pendiente de COPACO del titular.

| Paso BDD | Aserción en Postman |
|---|---|
| Given el usuario tiene una factura de "COPACO" pendiente de pago | la preparación del pre-request terminó sin errores |
| Then el sistema devuelve el listado de facturas | HTTP 200 |
| And todas las facturas del listado pertenecen al titular | `data` no vacío; cada `data[].usuario_id` = titular |
| And todas las facturas del listado están en estado "pendiente" | `data` no vacío; cada `data[].estado` = pendiente |

#### LIS-03 · Listar facturas con un estado que no existe

`@negativo @RF-G3-01`

**Criterio:** RF-G3-01 — un estado fuera de la lista permitida es rechazado (400 VALIDATION_ERROR)

```gherkin
When el usuario consulta las facturas en estado "anulada"
Then el sistema rechaza la consulta por datos inválidos
```

**Postman:** `GET /api/v1/facturas?estado=anulada`

**Preparación (pre-request):** —.

| Paso BDD | Aserción en Postman |
|---|---|
| Then el sistema rechaza la consulta por datos inválidos | HTTP 400; `error.code` = `VALIDATION_ERROR` |

#### LIS-04 · Listar facturas con un identificador de usuario no numérico

`@negativo @RF-G3-01`

**Criterio:** RF-G3-01 — un identificador de titular no numérico es rechazado (400 VALIDATION_ERROR)

```gherkin
When el usuario consulta las facturas de un usuario con el identificador no numérico "abc"
Then el sistema rechaza la consulta por datos inválidos
```

**Postman:** `GET /api/v1/facturas?usuarioId=abc`

**Preparación (pre-request):** —.

| Paso BDD | Aserción en Postman |
|---|---|
| Then el sistema rechaza la consulta por datos inválidos | HTTP 400; `error.code` = `VALIDATION_ERROR` |

#### LIS-05 · Listar facturas de un titular sin facturas

`@RF-G3-01`

**Criterio:** RF-G3-01 — un titular sin facturas devuelve una lista vacía, no un error (200 · data=[])

```gherkin
When el usuario consulta las facturas de un usuario que no tiene facturas
Then el sistema devuelve el listado de facturas
And el listado está vacío
```

**Postman:** `GET /api/v1/facturas?usuarioId={{G3_usuarioSinFacturasId}}`

**Preparación (pre-request):** —.

| Paso BDD | Aserción en Postman |
|---|---|
| Then el sistema devuelve el listado de facturas | HTTP 200 |
| And el listado está vacío | `data` vacío |

#### LIS-06 · El listado no supera las 100 facturas

`@RF-G3-01`

**Criterio:** RF-G3-01 — el listado está limitado a 100 registros (200 · data.length <= 100)

```gherkin
When el usuario consulta todas las facturas sin filtros
Then el sistema devuelve el listado de facturas
And el listado tiene como máximo 100 facturas
```

**Postman:** `GET /api/v1/facturas`

**Preparación (pre-request):** —.

| Paso BDD | Aserción en Postman |
|---|---|
| Then el sistema devuelve el listado de facturas | HTTP 200 |
| And el listado tiene como máximo 100 facturas | cantidad de facturas ≤ 100 |

### RF-G3-02 · Consultar una factura

#### CON-01 · Consultar el detalle de una factura existente

`@smoke @RF-G3-02 @personal`

**Criterio:** RF-G3-02 — consultar una factura existente devuelve su detalle (200 · data.numero_factura · data.proveedor · data.estado)

```gherkin
Given el usuario tiene una factura de "Personal" pendiente de pago
When el usuario consulta el detalle de la factura
Then el sistema devuelve el detalle de la factura
And la factura tiene número de factura
And la factura es del proveedor "Personal"
And la factura está en estado "pendiente"
```

**Postman:** `GET /api/v1/facturas/{{G3_factura_id}}`

**Preparación (pre-request):** crea una factura pendiente de Personal del titular.

| Paso BDD | Aserción en Postman |
|---|---|
| Given el usuario tiene una factura de "Personal" pendiente de pago | la preparación del pre-request terminó sin errores |
| Then el sistema devuelve el detalle de la factura | HTTP 200; data.id |
| And la factura tiene número de factura | `data.numero_factura` informado; coincide con el registrado |
| And la factura es del proveedor "Personal" | `data.proveedor` = `Personal` |
| And la factura está en estado "pendiente" | `data.estado` = `pendiente` |

#### CON-02 · Consultar una factura que no existe

`@negativo @RF-G3-02`

**Criterio:** RF-G3-02 — una factura inexistente es informada como no encontrada (404 NOT_FOUND · "Factura no encontrada.")

```gherkin
When el usuario consulta el detalle de una factura que no existe
Then el sistema informa que la factura no fue encontrada
And se muestra el mensaje "Factura no encontrada."
```

**Postman:** `GET /api/v1/facturas/{{G3_facturaInexistenteId}}`

**Preparación (pre-request):** —.

| Paso BDD | Aserción en Postman |
|---|---|
| Then el sistema informa que la factura no fue encontrada | HTTP 404; `error.code` = `NOT_FOUND` |
| And se muestra el mensaje "Factura no encontrada." | `error.message` = `Factura no encontrada.` |

#### CON-03 · Consultar una factura con un identificador inválido

`@negativo @RF-G3-02`

**Criterio:** RF-G3-02 — el identificador debe ser un entero positivo (400 VALIDATION_ERROR)

```gherkin
When el usuario consulta el detalle de una factura con el identificador inválido "abc"
Then el sistema rechaza la consulta por datos inválidos
```

**Postman:** `GET /api/v1/facturas/abc`

**Preparación (pre-request):** —.

| Paso BDD | Aserción en Postman |
|---|---|
| Then el sistema rechaza la consulta por datos inválidos | HTTP 400; `error.code` = `VALIDATION_ERROR` |

#### CON-04 · La factura consultada refleja el pago realizado

`@RF-G3-02 @RF-G3-03 @ande`

**Criterio:** RF-G3-02 — después de pagar, la consulta muestra la factura como pagada (200 · data.estado=pagada)

```gherkin
Given el usuario tiene una factura de "ANDE" pendiente de pago
And la factura ya fue pagada con el medio de pago "cuenta"
When el usuario consulta el detalle de la factura
Then el sistema devuelve el detalle de la factura
And la factura está en estado "pagada"
```

**Postman:** `GET /api/v1/facturas/{{G3_factura_id}}`

**Preparación (pre-request):** crea una factura pendiente de ANDE del titular, la paga con cuenta.

| Paso BDD | Aserción en Postman |
|---|---|
| Given el usuario tiene una factura de "ANDE" pendiente de pago | la preparación del pre-request terminó sin errores |
| And la factura ya fue pagada con el medio de pago "cuenta" | la preparación del pre-request terminó sin errores |
| Then el sistema devuelve el detalle de la factura | HTTP 200; data.id |
| And la factura está en estado "pagada" | `data.estado` = `pagada` |

### RF-G3-04 · Crear una factura

#### CRE-01 · Registrar una factura con datos válidos

`@smoke @RF-G3-04 @ande`

**Criterio:** RF-G3-04 — registrar una factura con datos válidos la crea en estado pendiente (201 Created · data.estado=pendiente · la consulta posterior la muestra pendiente)

```gherkin
When el usuario registra una factura de "ANDE" por 150000.50 con vencimiento "2026-12-31"
Then la factura se registra correctamente
And la factura queda en estado "pendiente"
And al consultar el detalle de la factura, figura en estado "pendiente"
```

**Postman:** `POST /api/v1/facturas`

```json
{
  "usuarioId": {{G3_titular}},
  "proveedor": "ANDE",
  "numeroFactura": "{{G3_numeroNuevo}}",
  "monto": 150000.50,
  "fechaVencimiento": "2026-12-31"
}
```

**Preparación (pre-request):** genera un número de factura único.

| Paso BDD | Aserción en Postman |
|---|---|
| Then la factura se registra correctamente | HTTP 201 |
| And la factura queda en estado "pendiente" | `data.estado` = `pendiente` |
| And al consultar el detalle de la factura, figura en estado "pendiente" | la consulta tuvo respuesta; `GET /facturas/{id}` → 200; `data.estado` = `pendiente` (consulta `GET /facturas/{id}` posterior) |

#### CRE-02 · El estado inicial siempre es pendiente aunque se indique otro

`@RF-G3-04 @essap`

**Criterio:** RF-G3-04 — el cliente no puede elegir el estado inicial (201 Created · data.estado=pendiente aunque se envíe estado=pagada)

```gherkin
When el usuario registra una factura de "ESSAP" por 80000 con vencimiento "2026-12-31" indicando que ya está "pagada"
Then la factura se registra correctamente
And la factura queda en estado "pendiente"
```

**Postman:** `POST /api/v1/facturas`

```json
{
  "usuarioId": {{G3_titular}},
  "proveedor": "ESSAP",
  "numeroFactura": "{{G3_numeroNuevo}}",
  "monto": 80000,
  "fechaVencimiento": "2026-12-31",
  "estado": "pagada"
}
```

**Preparación (pre-request):** genera un número de factura único.

| Paso BDD | Aserción en Postman |
|---|---|
| Then la factura se registra correctamente | HTTP 201 |
| And la factura queda en estado "pendiente" | `data.estado` = `pendiente` |

#### CRE-03 · La factura registrada aparece en el listado del titular

`@RF-G3-04 @RF-G3-01 @tigo`

**Criterio:** RF-G3-04 — la factura registrada aparece en el listado del titular (200 · data[] contiene la factura creada)

```gherkin
Given el usuario tiene una factura de "Tigo" pendiente de pago
When el usuario consulta las facturas del titular en estado "pendiente"
Then el sistema devuelve el listado de facturas
And la factura aparece en el listado
```

**Postman:** `GET /api/v1/facturas?usuarioId={{G3_titular}}&estado=pendiente`

**Preparación (pre-request):** crea una factura pendiente de Tigo del titular.

| Paso BDD | Aserción en Postman |
|---|---|
| Given el usuario tiene una factura de "Tigo" pendiente de pago | la preparación del pre-request terminó sin errores |
| Then el sistema devuelve el listado de facturas | HTTP 200 |
| And la factura aparece en el listado | el listado está limitado a 100 registros; si el titular tiene más pendientes, la factura puede quedar fuera |

#### CRE-04 · Registrar una factura con un número que ya existe

`@negativo @RF-G3-04 @ande`

**Criterio:** RF-G3-04 — un número de factura repetido es rechazado (409 CONFLICT)

```gherkin
Given el usuario tiene una factura de "ANDE" pendiente de pago
When el usuario intenta registrar otra factura con el mismo número de factura
Then el sistema rechaza la factura porque el número de factura ya existe
```

**Postman:** `POST /api/v1/facturas`

```json
{
  "usuarioId": {{G3_titular}},
  "proveedor": "ANDE",
  "numeroFactura": "{{G3_factura_numero}}",
  "monto": 1000,
  "fechaVencimiento": "2026-12-31"
}
```

**Preparación (pre-request):** crea una factura pendiente de ANDE del titular.

| Paso BDD | Aserción en Postman |
|---|---|
| Given el usuario tiene una factura de "ANDE" pendiente de pago | la preparación del pre-request terminó sin errores |
| Then el sistema rechaza la factura porque el número de factura ya existe | HTTP 409; `error.code` = `CONFLICT` |

#### CRE-05 · Registrar una factura de un proveedor no permitido

`@negativo @RF-G3-04`

**Criterio:** RF-G3-04 — un proveedor fuera de la lista es rechazado (400 VALIDATION_ERROR)

```gherkin
When el usuario intenta registrar una factura del proveedor "Claro"
Then el sistema rechaza la factura por datos inválidos
```

**Postman:** `POST /api/v1/facturas`

```json
{
  "usuarioId": {{G3_titular}},
  "proveedor": "Claro",
  "numeroFactura": "{{G3_numeroNuevo}}",
  "monto": 1000,
  "fechaVencimiento": "2026-12-31"
}
```

**Preparación (pre-request):** genera un número de factura único.

| Paso BDD | Aserción en Postman |
|---|---|
| Then el sistema rechaza la factura por datos inválidos | HTTP 400; `error.code` = `VALIDATION_ERROR` |

#### CRE-06 · Registrar una factura para un usuario que no existe

`@negativo @RF-G3-04`

**Criterio:** RF-G3-04 — un titular inexistente es rechazado (400 VALIDATION_ERROR)

```gherkin
When el usuario intenta registrar una factura para un usuario que no existe
Then el sistema rechaza la factura por datos inválidos
```

**Postman:** `POST /api/v1/facturas`

```json
{
  "usuarioId": {{G3_usuarioInexistenteId}},
  "proveedor": "ANDE",
  "numeroFactura": "{{G3_numeroNuevo}}",
  "monto": 1000,
  "fechaVencimiento": "2026-12-31"
}
```

**Preparación (pre-request):** genera un número de factura único.

| Paso BDD | Aserción en Postman |
|---|---|
| Then el sistema rechaza la factura por datos inválidos | HTTP 400; `error.code` = `VALIDATION_ERROR` |

#### CRE-07a, CRE-07b, CRE-07c, CRE-07d, CRE-07e, CRE-07f, CRE-07g · Registrar una factura con datos incompletos o inválidos

`@negativo @RF-G3-04`

**Criterio:** RF-G3-04 — los campos obligatorios y el monto mayor que cero se validan (400 VALIDATION_ERROR en cada caso)

```gherkin
When el usuario intenta registrar una factura <caso>
Then el sistema rechaza la factura por datos inválidos

Examples:
  | caso |
  | sin indicar el usuario |
  | sin indicar el proveedor |
  | sin indicar el número de factura |
  | sin indicar el monto |
  | con monto cero |
  | con monto negativo |
  | sin indicar la fecha de vencimiento |
```

| Request | Ejemplo | Endpoint |
|---|---|---|
| CRE-07a | caso = sin indicar el usuario | `POST /api/v1/facturas` |
| CRE-07b | caso = sin indicar el proveedor | `POST /api/v1/facturas` |
| CRE-07c | caso = sin indicar el número de factura | `POST /api/v1/facturas` |
| CRE-07d | caso = sin indicar el monto | `POST /api/v1/facturas` |
| CRE-07e | caso = con monto cero | `POST /api/v1/facturas` |
| CRE-07f | caso = con monto negativo | `POST /api/v1/facturas` |
| CRE-07g | caso = sin indicar la fecha de vencimiento | `POST /api/v1/facturas` |

**Preparación (pre-request):** genera un número de factura único.

| Paso BDD | Aserción en Postman |
|---|---|
| Then el sistema rechaza la factura por datos inválidos | HTTP 400; `error.code` = `VALIDATION_ERROR` |

#### CRE-08 · Registrar una factura con una fecha de vencimiento no válida

`@negativo @RF-G3-04`

**Criterio:** RF-G3-04 — una fecha de vencimiento no interpretable es un error de ejecución (400 EXECUTION_ERROR)

```gherkin
When el usuario intenta registrar una factura con vencimiento "no-es-una-fecha"
Then el sistema rechaza la factura porque no puede interpretar la fecha de vencimiento
```

**Postman:** `POST /api/v1/facturas`

```json
{
  "usuarioId": {{G3_titular}},
  "proveedor": "ANDE",
  "numeroFactura": "{{G3_numeroNuevo}}",
  "monto": 1000,
  "fechaVencimiento": "no-es-una-fecha"
}
```

**Preparación (pre-request):** genera un número de factura único.

| Paso BDD | Aserción en Postman |
|---|---|
| Then el sistema rechaza la factura porque no puede interpretar la fecha de vencimiento | HTTP 400; `error.code` = `EXECUTION_ERROR` |

#### CRE-09 · Registrar una factura con fecha de vencimiento ya pasada es aceptado

`@RF-G3-04 @copaco`

**Criterio:** RF-G3-04 — el sandbox no valida que el vencimiento sea una fecha futura (201 Created · data.estado=pendiente)

```gherkin
When el usuario registra una factura de "COPACO" con vencimiento ya pasado "2020-01-01"
Then la factura se registra correctamente
And la factura queda en estado "pendiente"
```

**Postman:** `POST /api/v1/facturas`

```json
{
  "usuarioId": {{G3_titular}},
  "proveedor": "COPACO",
  "numeroFactura": "{{G3_numeroNuevo}}",
  "monto": 1000,
  "fechaVencimiento": "2020-01-01"
}
```

**Preparación (pre-request):** genera un número de factura único.

| Paso BDD | Aserción en Postman |
|---|---|
| Then la factura se registra correctamente | HTTP 201 |
| And la factura queda en estado "pendiente" | `data.estado` = `pendiente` |

#### CRE-10 · Registrar una factura con datos mal formados

`@negativo @RF-G3-04 @RF-transversal`

**Criterio:** transversal — un cuerpo mal formado es rechazado con el mensaje "Invalid JSON body." (400 VALIDATION_ERROR)

```gherkin
When el usuario intenta registrar una factura con datos mal formados
Then el sistema rechaza la factura por datos inválidos
And se muestra el mensaje "Invalid JSON body."
```

**Postman:** `POST /api/v1/facturas`

```json
{ "usuarioId": {{G3_titular}}, "proveedor":
```

**Preparación (pre-request):** —.

| Paso BDD | Aserción en Postman |
|---|---|
| Then el sistema rechaza la factura por datos inválidos | HTTP 400; `error.code` = `VALIDATION_ERROR` |
| And se muestra el mensaje "Invalid JSON body." | `error.message` = `Invalid JSON body.` |

### RF-G3-05 · Reemplazar una factura

#### MOD-01 · Modificar el monto de una factura pendiente

`@smoke @RF-G3-05 @ande`

**Criterio:** RF-G3-05 — modificar el monto de una factura pendiente la actualiza y el estado sigue pendiente (200 · data.monto=275000.00 · data.estado=pendiente)

```gherkin
Given el usuario tiene una factura de "ANDE" pendiente de pago
When el usuario modifica el monto de la factura a 275000
Then la factura se actualiza correctamente
And la factura queda con monto 275000.00
And la factura queda en estado "pendiente"
```

**Postman:** `PUT /api/v1/facturas/{{G3_factura_id}}`

```json
{
  "proveedor": "ANDE",
  "numeroFactura": "{{G3_factura_numero}}",
  "monto": 275000,
  "fechaVencimiento": "2026-12-31"
}
```

**Preparación (pre-request):** crea una factura pendiente de ANDE del titular.

| Paso BDD | Aserción en Postman |
|---|---|
| Given el usuario tiene una factura de "ANDE" pendiente de pago | la preparación del pre-request terminó sin errores |
| Then la factura se actualiza correctamente | HTTP 200; data.id |
| And la factura queda con monto 275000.00 | `data.monto` → 275000 |
| And la factura queda en estado "pendiente" | `data.estado` = `pendiente` |

#### MOD-02 · La modificación ignora un cambio de estado

`@RF-G3-05 @essap`

**Criterio:** RF-G3-05 — la modificación nunca cambia el estado (200 · data.estado=pendiente aunque se envíe estado=pagada)

```gherkin
Given el usuario tiene una factura de "ESSAP" pendiente de pago
When el usuario modifica la factura indicando que ya está "pagada"
Then la factura se actualiza correctamente
And la factura queda en estado "pendiente"
```

**Postman:** `PUT /api/v1/facturas/{{G3_factura_id}}`

```json
{
  "proveedor": "ESSAP",
  "numeroFactura": "{{G3_factura_numero}}",
  "monto": 90000,
  "fechaVencimiento": "2026-12-31",
  "estado": "pagada"
}
```

**Preparación (pre-request):** crea una factura pendiente de ESSAP del titular.

| Paso BDD | Aserción en Postman |
|---|---|
| Given el usuario tiene una factura de "ESSAP" pendiente de pago | la preparación del pre-request terminó sin errores |
| Then la factura se actualiza correctamente | HTTP 200; data.id |
| And la factura queda en estado "pendiente" | `data.estado` = `pendiente` |

#### MOD-03 · Modificar una factura con el número de otra factura existente

`@negativo @RF-G3-05 @ande @essap`

**Criterio:** RF-G3-05 — usar el número de otra factura existente es rechazado (409 CONFLICT)

```gherkin
Given el usuario tiene una factura de "ANDE" pendiente de pago
And el usuario tiene otra factura de "ESSAP" pendiente de pago
When el usuario modifica la factura de "ESSAP" asignándole el número de la factura de "ANDE"
Then el sistema rechaza la modificación porque el número de factura ya pertenece a otra factura
```

**Postman:** `PUT /api/v1/facturas/{{G3_facturaEssap_id}}`

```json
{
  "proveedor": "ESSAP",
  "numeroFactura": "{{G3_facturaAnde_numero}}",
  "monto": 5000,
  "fechaVencimiento": "2026-12-31"
}
```

**Preparación (pre-request):** crea una factura pendiente de ANDE del titular, crea una factura pendiente de ESSAP del titular.

| Paso BDD | Aserción en Postman |
|---|---|
| Given el usuario tiene una factura de "ANDE" pendiente de pago | la preparación del pre-request terminó sin errores |
| And el usuario tiene otra factura de "ESSAP" pendiente de pago | la preparación del pre-request terminó sin errores |
| Then el sistema rechaza la modificación porque el número de factura ya pertenece a otra factura | HTTP 409; `error.code` = `CONFLICT` |

#### MOD-04 · Modificar una factura que no existe

`@negativo @RF-G3-05`

**Criterio:** RF-G3-05 — modificar una factura inexistente es informado como no encontrada (404 NOT_FOUND)

```gherkin
When el usuario intenta modificar una factura que no existe
Then el sistema informa que la factura no fue encontrada
```

**Postman:** `PUT /api/v1/facturas/{{G3_facturaInexistenteId}}`

```json
{
  "proveedor": "ANDE",
  "numeroFactura": "{{G3_numeroNuevo}}",
  "monto": 5000,
  "fechaVencimiento": "2026-12-31"
}
```

**Preparación (pre-request):** genera un número de factura único.

| Paso BDD | Aserción en Postman |
|---|---|
| Then el sistema informa que la factura no fue encontrada | HTTP 404; `error.code` = `NOT_FOUND` |

#### MOD-05 · Modificar una factura dada de baja

`@negativo @RF-G3-05 @tigo`

**Criterio:** RF-G3-05 — modificar una factura dada de baja es informado como no encontrada (404 NOT_FOUND)

```gherkin
Given el usuario tiene una factura de "Tigo" pendiente de pago
And la factura fue dada de baja
When el usuario intenta modificar la factura
Then el sistema informa que la factura no fue encontrada
```

**Postman:** `PUT /api/v1/facturas/{{G3_factura_id}}`

```json
{
  "proveedor": "Tigo",
  "numeroFactura": "{{G3_factura_numero}}",
  "monto": 5000,
  "fechaVencimiento": "2026-12-31"
}
```

**Preparación (pre-request):** crea una factura pendiente de Tigo del titular, la da de baja.

| Paso BDD | Aserción en Postman |
|---|---|
| Given el usuario tiene una factura de "Tigo" pendiente de pago | la preparación del pre-request terminó sin errores |
| And la factura fue dada de baja | la preparación del pre-request terminó sin errores |
| Then el sistema informa que la factura no fue encontrada | HTTP 404; `error.code` = `NOT_FOUND` |

#### MOD-06a, MOD-06b, MOD-06c · Modificar una factura con datos incompletos o inválidos

`@negativo @RF-G3-05 @ande`

**Criterio:** RF-G3-05 — faltan campos obligatorios, proveedor no permitido o monto inválido (400 VALIDATION_ERROR en cada caso)

```gherkin
Given el usuario tiene una factura de "ANDE" pendiente de pago
When el usuario intenta modificar la factura <caso>
Then el sistema rechaza la modificación por datos inválidos

Examples:
  | caso |
  | con un proveedor no permitido |
  | sin indicar el proveedor |
  | con monto cero |
```

| Request | Ejemplo | Endpoint |
|---|---|---|
| MOD-06a | caso = con un proveedor no permitido | `PUT /api/v1/facturas/{{G3_factura_id}}` |
| MOD-06b | caso = sin indicar el proveedor | `PUT /api/v1/facturas/{{G3_factura_id}}` |
| MOD-06c | caso = con monto cero | `PUT /api/v1/facturas/{{G3_factura_id}}` |

**Preparación (pre-request):** crea una factura pendiente de ANDE del titular.

| Paso BDD | Aserción en Postman |
|---|---|
| Given el usuario tiene una factura de "ANDE" pendiente de pago | la preparación del pre-request terminó sin errores |
| Then el sistema rechaza la modificación por datos inválidos | HTTP 400; `error.code` = `VALIDATION_ERROR` |

### RF-G3-06 · Dar de baja una factura

#### BAJ-01 · Dar de baja una factura vigente

`@smoke @RF-G3-06 @ande`

**Criterio:** RF-G3-06 — dar de baja una factura vigente es una baja lógica, sin borrado (204 No Content · la consulta posterior por id responde 404)

```gherkin
Given el usuario tiene una factura de "ANDE" pendiente de pago
When el usuario da de baja la factura
Then la factura se da de baja correctamente
And al consultar el detalle de la factura, el sistema informa que no fue encontrada
```

**Postman:** `DELETE /api/v1/facturas/{{G3_factura_id}}`

**Preparación (pre-request):** crea una factura pendiente de ANDE del titular.

| Paso BDD | Aserción en Postman |
|---|---|
| Given el usuario tiene una factura de "ANDE" pendiente de pago | la preparación del pre-request terminó sin errores |
| Then la factura se da de baja correctamente | HTTP 204; `sin cuerpo` = `` |
| And al consultar el detalle de la factura, el sistema informa que no fue encontrada | la consulta tuvo respuesta; `GET /facturas/{id}` → 404; `error.code` = `NOT_FOUND` (consulta `GET /facturas/{id}` posterior) |

#### BAJ-02 · Una factura dada de baja deja de poder consultarse

`@RF-G3-06 @RF-G3-02 @essap`

**Criterio:** RF-G3-06 — tras la baja, la factura ya no se puede consultar por id (404 NOT_FOUND)

```gherkin
Given el usuario tiene una factura de "ESSAP" pendiente de pago
And la factura fue dada de baja
When el usuario consulta el detalle de la factura
Then el sistema informa que la factura no fue encontrada
```

**Postman:** `GET /api/v1/facturas/{{G3_factura_id}}`

**Preparación (pre-request):** crea una factura pendiente de ESSAP del titular, la da de baja.

| Paso BDD | Aserción en Postman |
|---|---|
| Given el usuario tiene una factura de "ESSAP" pendiente de pago | la preparación del pre-request terminó sin errores |
| And la factura fue dada de baja | la preparación del pre-request terminó sin errores |
| Then el sistema informa que la factura no fue encontrada | HTTP 404; `error.code` = `NOT_FOUND` |

#### BAJ-03 · Una factura dada de baja deja de aparecer en el listado

`@RF-G3-06 @RF-G3-01 @copaco`

**Criterio:** RF-G3-06 — tras la baja, la factura deja de aparecer en el listado (200 · data[] no contiene la factura)

```gherkin
Given el usuario tiene una factura de "COPACO" pendiente de pago
And la factura fue dada de baja
When el usuario consulta las facturas del titular en estado "pendiente"
Then el sistema devuelve el listado de facturas
And la factura no aparece en el listado
```

**Postman:** `GET /api/v1/facturas?usuarioId={{G3_titular}}&estado=pendiente`

**Preparación (pre-request):** crea una factura pendiente de COPACO del titular, la da de baja.

| Paso BDD | Aserción en Postman |
|---|---|
| Given el usuario tiene una factura de "COPACO" pendiente de pago | la preparación del pre-request terminó sin errores |
| And la factura fue dada de baja | la preparación del pre-request terminó sin errores |
| Then el sistema devuelve el listado de facturas | HTTP 200 |
| And la factura no aparece en el listado | el id no figura en `data[]` |

#### BAJ-04 · Dar de baja una factura ya pagada no afecta el pago registrado

`@db @RF-G3-06 @tigo`

**Criterio:** RF-G3-06 — una factura ya pagada también puede darse de baja, sin afectar el pago registrado (204 No Content · SELECT COUNT(*) FROM pagos WHERE factura_id = factura → 1)

```gherkin
Given el usuario tiene una factura de "Tigo" pendiente de pago
And la factura ya fue pagada con el medio de pago "efectivo"
When el usuario da de baja la factura
Then la factura se da de baja correctamente
And en la base de datos el pago de la factura se conserva
```

**Postman:** `DELETE /api/v1/facturas/{{G3_factura_id}}`

**Preparación (pre-request):** crea una factura pendiente de Tigo del titular, la paga con efectivo.

| Paso BDD | Aserción en Postman |
|---|---|
| Given el usuario tiene una factura de "Tigo" pendiente de pago | la preparación del pre-request terminó sin errores |
| And la factura ya fue pagada con el medio de pago "efectivo" | la preparación del pre-request terminó sin errores |
| Then la factura se da de baja correctamente | HTTP 204; `sin cuerpo` = `` |
| And en la base de datos el pago de la factura se conserva | POST /api/v1/sql/select tuvo respuesta; `POST /api/v1/sql/select` → 200; `data` no vacío; `pagos registrados para la factura` → 1 |

#### BAJ-05 · Dar de baja una factura que no existe

`@negativo @RF-G3-06`

**Criterio:** RF-G3-06 — dar de baja una factura inexistente es informado como no encontrada (404 NOT_FOUND)

```gherkin
When el usuario intenta dar de baja una factura que no existe
Then el sistema informa que la factura no fue encontrada
```

**Postman:** `DELETE /api/v1/facturas/{{G3_facturaInexistenteId}}`

**Preparación (pre-request):** —.

| Paso BDD | Aserción en Postman |
|---|---|
| Then el sistema informa que la factura no fue encontrada | HTTP 404; `error.code` = `NOT_FOUND` |

#### BAJ-06 · Dar de baja una factura con un identificador inválido

`@negativo @RF-G3-06`

**Criterio:** RF-G3-06 — el identificador debe ser un entero positivo (400 VALIDATION_ERROR)

```gherkin
When el usuario intenta dar de baja una factura con el identificador inválido "abc"
Then el sistema rechaza la baja por datos inválidos
```

**Postman:** `DELETE /api/v1/facturas/abc`

**Preparación (pre-request):** —.

| Paso BDD | Aserción en Postman |
|---|---|
| Then el sistema rechaza la baja por datos inválidos | HTTP 400; `error.code` = `VALIDATION_ERROR` |

### Reglas transversales de la API

#### TRV-01a, TRV-01b, TRV-01c · Sin API key válida no se puede operar sobre las facturas

`@negativo @RF-transversal`

**Criterio:** transversal — sin una API key válida no se puede operar sobre las facturas (401 UNAUTHORIZED en cada caso)

```gherkin
Given el usuario tiene una API key inválida
When el usuario intenta <accion>
Then el sistema rechaza el acceso por API key inválida

Examples:
  | accion |
  | consultar el listado de facturas |
  | consultar el detalle de una factura |
  | dar de baja una factura |
```

| Request | Ejemplo | Endpoint |
|---|---|---|
| TRV-01a | accion = consultar el listado de facturas | `GET /api/v1/facturas` |
| TRV-01b | accion = consultar el detalle de una factura | `GET /api/v1/facturas/{{G3_facturaInexistenteId}}` |
| TRV-01c | accion = dar de baja una factura | `DELETE /api/v1/facturas/{{G3_facturaInexistenteId}}` |

**Preparación (pre-request):** —.

| Paso BDD | Aserción en Postman |
|---|---|
| Given el usuario tiene una API key inválida | `G3_apiKeyInvalida` informada y distinta de `G3_apiKey` |
| Then el sistema rechaza el acceso por API key inválida | HTTP 401; `error.code` = `UNAUTHORIZED` |

#### TRV-02 · Sin API key válida no se puede pagar una factura

`@negativo @RF-transversal @RF-G3-03`

**Criterio:** transversal — sin una API key válida no se puede pagar una factura (401 UNAUTHORIZED)

```gherkin
Given el usuario tiene una API key inválida
When el usuario intenta pagar una factura con el medio de pago "tarjeta"
Then el sistema rechaza el acceso por API key inválida
```

**Postman:** `POST /api/v1/facturas/{{G3_facturaInexistenteId}}/pagar`

```json
{
  "metodoPago": "tarjeta"
}
```

**Preparación (pre-request):** —.

| Paso BDD | Aserción en Postman |
|---|---|
| Given el usuario tiene una API key inválida | `G3_apiKeyInvalida` informada y distinta de `G3_apiKey` |
| Then el sistema rechaza el acceso por API key inválida | HTTP 401; `error.code` = `UNAUTHORIZED` |

#### TRV-03 · La operación de pago no admite otro tipo de solicitud

`@negativo @RF-transversal @RF-G3-03`

**Criterio:** transversal — la operación de pago solo admite el método previsto; otro método es rechazado (405 Method Not Allowed · GET sobre /facturas/{id}/pagar)

```gherkin
When el usuario intenta usar la operación de pago de una factura con un tipo de solicitud no permitido
Then el sistema indica que la operación no está permitida
```

**Postman:** `GET /api/v1/facturas/{{G3_facturaInexistenteId}}/pagar`

**Preparación (pre-request):** —.

| Paso BDD | Aserción en Postman |
|---|---|
| Then el sistema indica que la operación no está permitida | HTTP 405 |

## Verificación en base de datos

El módulo no expone un endpoint que liste pagos. Los pasos del BDD que empiezan con "en la base de datos…" (escenarios con tag `@db`) se verifican con el endpoint de consultas de solo lectura del sandbox, `POST /api/v1/sql/select`, siguiendo el patrón de la skill postman-newman:

```sql
SELECT COUNT(*) AS n FROM pagos WHERE factura_id = $1
```

El mismo endpoint se usa una vez por corrida para elegir el titular:

```sql
SELECT u.id, COUNT(f.id) AS pendientes
FROM usuarios u
LEFT JOIN facturas f ON f.usuario_id = u.id AND f.activo = true AND f.estado = 'pendiente'
WHERE u.activo = true
GROUP BY u.id
ORDER BY COUNT(f.id) ASC, u.id ASC
LIMIT 1
```

| Request | Paso BDD | Cantidad esperada |
|---|---|---:|
| PAG-07 | en la base de datos queda registrado un solo pago para la factura | 1 |
| PAG-10 | en la base de datos no queda registrado ningún pago para esa factura | 0 |
| BAJ-04 | en la base de datos el pago de la factura se conserva | 1 |

Cada verificación es una request más contra el mismo límite de 30 req/min, y pasa por el mismo control de caudal.

