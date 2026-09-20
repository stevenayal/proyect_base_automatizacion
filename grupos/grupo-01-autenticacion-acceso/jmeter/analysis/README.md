# Analisis JMeter y thresholds - Oscar Benitez

Este aporte analiza el JTL generado por el pipeline de Semana 05 y deja trazabilidad de
las cuatro metricas asignadas: p95, errores, throughput y cumplimiento de thresholds.
No modifica el JMX ni el workflow mantenidos por los otros integrantes.

## Thresholds de la baseline

| Metrica | Limite | Criterio |
|---|---:|---|
| Error rate | <= 1 % | Evita aprobar ejecuciones con fallas funcionales relevantes |
| p95 | <= 3000 ms | El 95 % de las respuestas debe finalizar dentro de 3 segundos |
| p99 | <= 5000 ms | Detecta respuestas excepcionalmente lentas |
| Throughput | >= 0,20 req/s | Verifica actividad durante la prueba con pausas anti-429 |
| Muestras | >= 10 global / 5 por operacion | Un volumen menor se informa como `INCONCLUSIVE` |

Estos valores son criterios iniciales para una prueba corta de CI/CD, no un SLA de
produccion. Deben revisarse cuando exista una linea base con carga sostenida.

## Ejecucion

1. Descargar el artifact `grupo01-semana05-jmeter-<numero>` desde la ejecucion de
   GitHub Actions y extraerlo. El JTL esperado es `jmeter/results-ci/sesiones-resultados.jtl`.
2. Desde la raiz del repositorio ejecutar:

```powershell
python grupos/grupo-01-autenticacion-acceso/jmeter/analysis/analizar_resultados.py `
  --jtl grupos/grupo-01-autenticacion-acceso/jmeter/results-ci/sesiones-resultados.jtl `
  --thresholds grupos/grupo-01-autenticacion-acceso/jmeter/analysis/thresholds.json `
  --json grupos/grupo-01-autenticacion-acceso/jmeter/results-ci/resumen-rendimiento.json `
  --markdown grupos/grupo-01-autenticacion-acceso/jmeter/results-ci/RESUMEN-RENDIMIENTO.md
```

El proceso devuelve `0` para `PASS`, `1` para `FAIL` y `2` para resultado
`INCONCLUSIVE` o entrada invalida. Los dos archivos generados pueden incorporarse a
las evidencias y al PDF final.

## Validacion adicional con el MCP recomendado

El archivo `thresholds.json` mantiene las claves del evaluador de AIQUAA
(`maxErrorRate`, `p95Ms` y `p99Ms`). Si Node.js esta disponible, se puede contrastar
el resultado con:

```powershell
npx -y aiquaa-performance-mcp-server --evaluate `
  grupos/grupo-01-autenticacion-acceso/jmeter/results-ci/sesiones-resultados.jtl `
  grupos/grupo-01-autenticacion-acceso/jmeter/analysis/thresholds.json
```

La evidencia debe registrar el numero y URL de la ejecucion, fecha, commit, cantidad
de muestras, error rate, throughput, p95, p99 y veredicto.
