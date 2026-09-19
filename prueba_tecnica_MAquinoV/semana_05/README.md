# Semana 5 - Prueba de Rendimiento con JMeter y CI/CD

**Responsable:** MAquinoV  
**Rama de trabajo:** `feature/semana5-MAquinoV`

## Objetivo

Automatizar una prueba de rendimiento utilizando Apache JMeter dentro de un flujo CI/CD, ejecutándola sin interfaz gráfica, conservando sus resultados y aplicando criterios automáticos para determinar si la ejecución es APROBADA o RECHAZADA.

También se busca controlar el impacto de la prueba sobre la infraestructura mediante una tasa de solicitudes limitada.

---

## Herramientas utilizadas

- Apache JMeter 5.6.3
- GitHub Actions
- Python 3.12
- Grafana
- Git / GitHub

---

## Plan de prueba

Archivo JMeter:

`jmeter/rendimiento.jmx`

La prueba consulta sesiones por usuario mediante datos parametrizados desde:

`data/usuarios.csv`

Parámetros utilizados en la ejecución controlada:

- Usuarios virtuales: 5
- Ramp-up: 10 segundos
- Iteraciones: 10
- Total mínimo esperado: 50 muestras
- Throughput objetivo: 20 solicitudes por minuto

La API Key se suministra mediante variables y GitHub Secrets y no se almacena directamente en el plan JMX.

---

## Criterios de aprobación

La ejecución se considera APROBADA solamente cuando cumple simultáneamente:

- Cantidad de muestras >= 50
- Porcentaje de errores <= 2 %
- Tiempo de respuesta p95 <= 1500 ms

La validación automática se realiza mediante:

`scripts/validar_limites.py`

El script devuelve:

- Código `0` cuando el resultado es APROBADO.
- Código `1` cuando el resultado es RECHAZADO.

Esto permite que el pipeline CI/CD continúe o falle automáticamente.

---

## Escenario sin control adecuado de carga

Se realizó inicialmente una ejecución de 50 solicitudes sin limitar suficientemente el ritmo de peticiones.

Resultados:

- Muestras: 50
- Respuestas HTTP 200: 30
- Respuestas HTTP 429: 20
- Porcentaje de errores: 40 %
- p95 JMeter: 553,00 ms
- Resultado: RECHAZADO

El error identificado fue:

`HTTP 429 - Too Many Requests`

Esta ejecución evidenció que una generación de tráfico excesiva podía alcanzar el límite de solicitudes de la API.

---

## Medida de mitigación

Se incorporó un **Constant Throughput Timer** en JMeter con un objetivo aproximado de:

`20 solicitudes por minuto`

La finalidad es distribuir las peticiones durante la ejecución y reducir el riesgo de saturación de la API y de la infraestructura asociada.

---

## Escenario controlado

Luego de aplicar el control de throughput se realizó nuevamente la prueba.

Resultados obtenidos:

- Muestras: 50
- Errores: 0
- Error rate: 0,00 %
- Promedio: 372,80 ms
- Mínimo: 257 ms
- Máximo: 1296 ms
- p90: 633,80 ms
- p95: 860,15 ms
- p99: 1296 ms
- Throughput observado: aproximadamente 0,34 solicitudes/segundo
- Resultado: APROBADO

Los tres límites definidos fueron cumplidos correctamente.

---

## Automatización CI/CD

Se creó el workflow:

`.github/workflows/semana5-performance-MAquinoV.yml`

El pipeline realiza automáticamente las siguientes actividades:

1. Descarga el repositorio.
2. Configura Java.
3. Configura Python.
4. Instala Apache JMeter 5.6.3.
5. Ejecuta el plan JMX en modo no gráfico.
6. Genera el archivo JTL.
7. Genera el reporte HTML de JMeter.
8. Obtiene `statistics.json`.
9. Ejecuta `validar_limites.py`.
10. Determina APROBADO o RECHAZADO.
11. Publica el JTL, logs y reporte HTML como artifacts de GitHub Actions.

La ejecución realizada desde la rama `feature/semana5-MAquinoV` finalizó con estado **Success**.

---

## Evidencias y resultados conservados

La solución conserva:

- Plan JMX parametrizado.
- Archivo JTL.
- Log de JMeter.
- Reporte HTML.
- Copia PDF del reporte.
- Evidencias del pipeline CI/CD.
- Evidencia de resultados en Grafana.
- Script automático para validación de límites.

---

## Grafana

Se utilizó Grafana para visualizar los resultados obtenidos por Apache JMeter.

La visualización compara:

| Escenario | Muestras | Error % | p95 | Resultado |
|---|---:|---:|---:|---|
| Controlado | 50 | 0,00 % | 860,15 ms | APROBADO |
| Sin control de carga | 50 | 40,00 % | 553,00 ms | RECHAZADO |

Para esta evidencia se utilizó la fuente **Grafana TestData / CSV Content**, cargando los valores obtenidos de los reportes de JMeter.

Por lo tanto, esta visualización corresponde a evidencia de resultados y no a monitoreo de JMeter en tiempo real.

---

## Medidas para reducir riesgos

Se establecieron las siguientes medidas:

- Limitar el throughput para evitar saturación de la API.
- Mantener el porcentaje de errores <= 2 %.
- Mantener p95 <= 1500 ms.
- Exigir un mínimo de 50 muestras.
- Ejecutar la prueba automáticamente desde CI/CD.
- Rechazar automáticamente la ejecución cuando algún límite no se cumple.
- Conservar JTL, logs y reporte HTML como artifacts.
- Monitorear especialmente respuestas HTTP 429.
- No almacenar la API Key directamente en los archivos del repositorio.

---

## Conclusión y continuidad de la versión

La ejecución controlada finalizó satisfactoriamente con 50 muestras, 0,00 % de errores y un tiempo de respuesta p95 de 860,15 ms, dentro del límite establecido de 1500 ms.

La ejecución previa sin control de carga produjo un 40 % de errores HTTP 429, demostrando el riesgo de generar solicitudes a una tasa superior a la tolerada por el servicio.

Luego de incorporar el control de throughput, la prueba obtuvo resultado **APROBADO**.

Por lo tanto, según los criterios de rendimiento definidos para esta evaluación, se considera viable la continuidad de la versión.

Se recomienda mantener el control de throughput, monitorear los errores HTTP 429 y el p95, y repetir las pruebas ante cambios significativos de aplicación o infraestructura.