# Tarea 4 - Prueba de Rendimiento con JMeter

## Objetivo

Realizar una prueba de rendimiento sobre los endpoints de creación y consulta de reservas utilizando Apache JMeter, parametrizando los datos mediante un archivo CSV y utilizando datos dinámicos obtenidos durante la ejecución.

## Herramientas utilizadas

- Apache JMeter 5.6.3
- Postman
- CSV Data Set Config
- JSON Extractor
- Response Assertion
- Python
- Pandas
- ReportLab

## Flujo de prueba

1. Se cargan los datos de prueba desde `reservas.csv`.
2. Se ejecuta el endpoint POST para crear una reserva.
3. Se obtiene dinámicamente el `id` de la reserva mediante JSON Extractor.
4. El `reservaId` obtenido se utiliza en el endpoint GET.
5. Se valida la respuesta de las solicitudes mediante assertions.
6. Los resultados se almacenan en formato JTL.
7. Se genera el Dashboard HTML de JMeter.
8. Se genera un informe PDF con el resumen de resultados.

## Endpoints

### POST - Crear Reserva

Endpoint utilizado para crear una nueva reserva.

Los datos enviados son parametrizados mediante CSV:

- usuarioId
- servicio
- fechaHora
- notas

### GET - Consultar Reserva

Consulta la reserva creada utilizando el `reservaId` obtenido dinámicamente de la respuesta del POST.

## Parametrización

El archivo `reservas.csv` contiene los datos utilizados durante la ejecución de las solicitudes.

## Resultados

Durante la ejecución se registraron:

- Total de solicitudes: 46
- Solicitudes exitosas: 36
- Solicitudes fallidas: 10
- Porcentaje de éxito: 78,26%
- Porcentaje de error: 21,74%
- Tiempo promedio: 588,70 ms
- Tiempo mínimo: 63 ms
- Tiempo máximo: 3762 ms

## Incidencia observada

Durante la prueba se identificaron respuestas `RATE_LIMITED`.

El servicio indicó un límite máximo de 30 solicitudes por minuto.

Este comportamiento fue registrado como parte de los resultados de la prueba y se encuentra evidenciado en el Dashboard de JMeter y en el informe PDF.

## Evidencias

- `resultados/prueba_rate_limit.jtl`: resultados de la ejecución.
- `reporte-html/`: Dashboard HTML generado por JMeter.
- `informe/Informe_Prueba_Rendimiento.pdf`: resumen de resultados.
- `reservas_performance.jmx`: plan de pruebas JMeter.
- `reservas.csv`: datos utilizados para la parametrización.