# Analisis de rendimiento JMeter - Grupo 01

**Responsable:** Oscar Benitez  
**JTL analizado:** `grupos/grupo-01-autenticacion-acceso/jmeter/results-ci/sesiones-resultados.jtl`  
**Thresholds:** `grupos/grupo-01-autenticacion-acceso/jmeter/analysis/thresholds.json`  
**Veredicto global:** **PASS**

## Resultados

| Alcance | Muestras | Errores | Error % | Throughput req/s | Promedio ms | p95 ms | p99 ms | Veredicto |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Global | 12 | 0 | 0.000 | 0.568 | 317.750 | 1322 | 1322 | PASS |
| GET - Consultar sesiones por usuario (Gloria) | 6 | 0 | 0.000 | 0.317 | 416.667 | 1322 | 1322 | PASS |
| POST - Crear sesion (David) | 6 | 0 | 0.000 | 0.328 | 218.833 | 315 | 315 | PASS |

## Evaluacion de thresholds

- **Global:** PASS - Sin incumplimientos.
- **GET - Consultar sesiones por usuario (Gloria):** PASS - Sin incumplimientos.
- **POST - Crear sesion (David):** PASS - Sin incumplimientos.

## Interpretacion

El p95 representa el tiempo que no supera el 95 % de las muestras. El porcentaje de errores mide respuestas fallidas sobre el total y el throughput expresa solicitudes procesadas por segundo. Este escenario corto sirve como baseline de CI/CD; no reemplaza una prueba de carga sostenida.
