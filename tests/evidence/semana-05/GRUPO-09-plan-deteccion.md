# Plan de detención — Grupo 9 (Semana 5)

## Ambiente
- URL: https://aiquaa-sandbox-api.vercel.app
- Endpoint: GET /api/v1/reportes/movimientos (RF-G9-01)
- Datos: sandbox, no producción

## Límites de aceptación
- Errores <= 1%
- p95 <= 800 ms
- Muestras >= 100

## Criterios de detención anticipada
- Tasa de errores supera el 5% durante más de 30 segundos
- p95 supera los 2000 ms de forma sostenida
- Se detecta HTTP 429 en más del 10% de las respuestas
- Grafana muestra saturación de conexiones a la BD

## Procedimiento
1. Aumentar el timer a 30 req/min (menor carga)
2. Si persiste, detener workflow y notificar al equipo
3. Analizar jmeter.log y métricas de Grafana

## Riesgos
- Rate limit del sandbox (30 req/min por API key)
- Datos determinísticos del sandbox
- Latencia de red hacia Vercel
