# Rendimiento — Grupo 09 · Reportes y Dashboard (JMeter + CSV)

Plan de pruebas JMeter con datos dinámicos desde CSV contra la API del laboratorio
`https://aiquaa-sandbox-api.vercel.app`, sobre los endpoints del módulo del grupo.

## Endpoints bajo prueba

| # | Muestra | Verbo y ruta | Rol en el plan |
|---|---------|--------------|----------------|
| 01 | Crear movimiento | `POST /api/v1/movimientos` | Creación. Body armado con la fila del CSV. Espera `201`. Extrae `data.id` con JSONPath. |
| 02 | Consultar movimiento creado | `GET /api/v1/movimientos/{movimientoId}` | Consulta correlacionada: usa el id que devolvió el POST. Espera `200` y `data.id` igual al extraído. |
| 03 | Reporte por tipo | `GET /api/v1/reportes/movimientos?usuarioId={CSV}` | Consulta del reporte del grupo. Verifica que el `tipo_movimiento` recién creado aparece con `cantidad >= 1`. |

`POST /api/v1/movimientos` es el endpoint de creación del Grupo 9 (tabla `movimientos`).
Los reportes `GET /api/v1/reportes/*` son de solo lectura, por eso el POST va sobre `movimientos`.

> La colección `postman/Grupo 9 - Reportes y Dashboard.postman_collection.json` usa un host de
> ejemplo (`aiquaa-api.dev.example.com`) y rutas `/api/reportes/financiero` que no existen en el
> sandbox. Este plan usa las rutas reales de `postman/aiquaa Sandbox API.json`.

## Archivos

| Ruta | Qué es |
|------|--------|
| `plans/P_GRUPO_09_REPORTES_CSV.jmx` | Plan JMeter 5.6.3 (solo componentes core). |
| `data/D_GRUPO_09_REPORTES_CSV.csv` | 8 filas: `usuarioId,tipoMovimiento,monto,descripcion`. Cubre los 4 tipos del enum. |
| `properties/GRUPO_09_REPORTES_CSV.properties` | Reintentos apagados, JTL sin bodies ni headers, percentiles 50/95/99. |
| `thresholds/GRUPO_09_REPORTES.json` | SLA: error rate máx. 5 %, p95 < 2000 ms. |

## Datos dinámicos

- **CSV Data Set**: una fila por iteración, sin reciclar (`stopThread=true`). 8 filas, 8 iteraciones.
- **Correlación**: `$.data.id` de la respuesta del POST se guarda en `${movimientoId}` y se usa en el GET 02.
- **`RUN_ID`**: se agrega a la `descripcion` (`PERF-G9 <tipo> run <RUN_ID>`) para identificar
  las filas creadas por cada corrida. Se pasa con `-JrunId=...`; si no, usa un timestamp.
- **Validación previa**: antes de cada fila se valida que `usuarioId` sea entero positivo, que
  `tipoMovimiento` pertenezca al enum, que `monto > 0` y que la `descripcion` no rompa el JSON.
  Si algo falla, se detiene con `INPUT_CONFIGURATION_ERROR`, sin llamar a la API.

## Reglas de la API que condicionan el diseño

1. **Rate limit de 30 req/min por API key** (`429` al pasarse). El plan hace una pausa de
   `delayMs` (2500 ms) antes de cada request: 3 requests por fila, aprox. 24 req/min con 1 hilo.
   Subir `threads` sin subir `delayMs` reintroduce los `429`.
2. **`tipoMovimiento` es un enum**: `transferencia`, `pago_factura`, `compra_ecommerce`,
   `cargo_tarjeta`. Otro valor devuelve `400 VALIDATION_ERROR`.
3. **`usuarioId` debe existir** (FK a `usuarios`); el CSV usa los usuarios 1 a 4.
4. **`monto` debe ser positivo.**

## Ejecución local

La API key va por variable de entorno y nunca se guarda en el repo.

PowerShell:

```powershell
$env:API_KEY = "<tu-api-key>"
jmeter -n `
  -t tests/performance/plans/P_GRUPO_09_REPORTES_CSV.jmx `
  -q tests/performance/properties/GRUPO_09_REPORTES_CSV.properties `
  -l test-results/performance/R_GRUPO_09_REPORTES_CSV.jtl `
  -e -o test-results/performance/dashboard-g9 `
  -JrunId="local-$(Get-Date -Format yyyyMMddHHmmss)"
```

Bash:

```bash
export API_KEY="<tu-api-key>"
jmeter -n -t tests/performance/plans/P_GRUPO_09_REPORTES_CSV.jmx \
  -q tests/performance/properties/GRUPO_09_REPORTES_CSV.properties \
  -l test-results/performance/R_GRUPO_09_REPORTES_CSV.jtl \
  -e -o test-results/performance/dashboard-g9 \
  -JrunId="local-$(date +%s)"
```

El `-q` con el archivo de properties es obligatorio: el plan se detiene si los reintentos
automáticos no están desactivados (un reintento del POST duplicaría movimientos).

Properties opcionales: `-Jthreads`, `-Jloops`, `-JdelayMs`, `-JcsvPath`, `-Jhost`, `-Jport`, `-Jprotocol`.

Informe PDF con el MCP de la cátedra:

```bash
npx -y aiquaa-performance-mcp-server --report \
  test-results/performance/R_GRUPO_09_REPORTES_CSV.jtl \
  tests/performance/thresholds/GRUPO_09_REPORTES.json \
  test-results/performance/INFORME_G9.pdf \
  --api-name "AIQUAA Sandbox API" --test-type carga \
  --plan tests/performance/plans/P_GRUPO_09_REPORTES_CSV.jmx
```

## Efecto sobre la base de datos

Cada corrida inserta 8 filas en `movimientos`. Se identifican por `descripcion` (`PERF-G9 ... run <RUN_ID>`).
Se pueden dar de baja con `DELETE /api/v1/movimientos/{id}` (soft-delete: `activo = false`).

## Estado de validación

- El `.jmx` es XML bien formado y se armó con los contratos reales de `aiquaa-sandbox-api`
  (`app/api/v1/movimientos` y `app/api/v1/reportes/movimientos`).
- **Pendiente:** adjuntar la evidencia de una corrida real (`.jtl`, dashboard o PDF) en `evidence/`.
