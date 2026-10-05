# Operabilidad de Juan Barreto desde entrega

Rama oficial: `grupo-07-carrito-ecommerce-entrega`.
Base de esta reparación: `e8388a994e7831516044e401e475c81044f874ef`.
La rama grupal anterior y la rama personal son fuentes históricas, no rutas de ejecución.
`PR-SEMANA-3.md` se recuperó como documento histórico: sus runs, resultados y ramas
no describen una ejecución nueva de esta reparación.

## Postman individual

El workflow `postman-grupo07-juan-regression.yml` conserva la colección individual,
`scripts/grupo07/newman_report.py`, `newman/report.pdf` y el artifact
`informe-regresion-grupo07-juan`. Ejecuta push relevante en entrega y PR desde
entrega hacia main (sin filtro de paths en PR); permite dispatch manual.
Otros PR quedan fuera del job de pruebas de Juan.

Requiere la variable de repositorio `GRUPO07_BASE_URL` y el secret
`GRUPO07_API_KEY`. Si faltan, falla explícitamente con `REGRESION_NO_EJECUTADA`.
Un PR de fork sin acceso a secretos no obtiene una regresión aprobada.
No se utiliza `pull_request_target` para ejecutar código del PR con secretos.

Para `GREEN_REAL` se exige Newman exitoso, JSON válido y coherente con sus
ejecuciones, exactamente 3 requests y 14 assertions, cero fallos/omisiones,
reporter exitoso, PDF no vacío y upload exitoso con ID de artifact.
Un PDF con FAIL puede publicarse como diagnóstico; no convierte el job en aprobado.
El JSON crudo de Newman no se publica porque puede contener datos de requests.

## JMeter propio

`jmeter-grupo07-juan-performance.yml` selecciona explícitamente:

- `P_GRUPO_07_ORDENES_BASELINE.jmx` con sus properties y threshold propios.
- `P_GRUPO_07_ORDENES_CSV.jmx` con sus properties y CSV relativo al JMX.

No selecciona el plan del curso ni el de Andrea. Usa JMeter 5.6.3 y Java 17.
La distribución descargada se verifica con SHA512. `GRUPO07_API_KEY` se inyecta
como `API_KEY` únicamente en el proceso; nunca se pasa en argumentos de JMeter.
Los JMX conservan el host sandbox original; no consumen `GRUPO07_BASE_URL`.

`scripts/grupo07/jmeter_report.py` exige JTL válido, 18 GET baseline y 3 POST +
3 GET CSV, estados HTTP esperados, muestras exitosas sin errores de assertions,
orden POST/GET y un único worker CSV. Los JMX realizan las assertions del ID
correlacionado; el validador exige que todas esas muestras existan y pasen.
Evalúa el threshold de error rate del baseline, sin agregar un SLA de latencia.
Muestras de control fallidas, CSV incompleto, plan equivocado, JTL vacío o
malformado y correlación incompleta hacen fallar el job.

Genera `summary.json` y `report.pdf` por perfil y publica los JTL y reportes en
`informe-jmeter-grupo07-juan`. Solo certifica GREEN_REAL si ambos perfiles,
reportes y publicación terminan correctamente. Si falla baseline, CSV puede
quedar omitido: el conjunto sigue FALLIDO, nunca aprobado.

Los jobs vivos de Juan comparten exclusión mutua `grupo07-juan-sandbox` y JMeter
espera 65 segundos antes de cada perfil. Esto no bloquea a Andrea, Armin ni los
workflows generales: reservar una ventana sin tráfico externo antes del run real.
GitHub puede cancelar runs pendientes reemplazados por nuevos runs; un run
cancelado u omitido no es prueba de aprobación.

## SQL recuperado

Fuentes: `355de72dbc54034157c008cb91b33fa637970da7` (implementación) y
`43ccb21268f40076564bff33f9fbaa3c97845f21` (documentación).
Se conservan íntegros los 20 objetos request actuales y se agrega únicamente
`g7Cantidad`, el evento prerequest y la carpeta histórica de dos casos SQL.

El runner requiere Node/Newman instalado, `API_KEY` y, opcionalmente, `BASE_URL`.
Su salida nueva es `test-results/grupo07-sql/semana-3-newman.json`, ignorada por
Git. Nunca escribe en la evidencia histórica versionada. Su JSON personalizado
no es entrada compatible con el reporter individual.

La ruta CI existente con PDF es `postman-grupo07-regression.yml`: ejecuta la
colección general completa y exporta JSON estándar para su reporter compartido.
Tras esta recuperación ejecutará 22 requests de colección, con aproximadamente
32 llamadas HTTP incluyendo SQL; el workflow individual permanece en 3/14.
No se modificó el workflow general. Su pacing de 800 ms no garantiza el límite
compartido; no lanzar la colección ampliada simultáneamente con otros jobs.
`postman-grupo07-regression-sin-reporte.yml` también ejecutará los 22, pero solo
mediante dispatch y con JUnit, no PDF.

## Validaciones offline

Desde la raíz, con Newman y ReportLab instalados:

```text
node --test grupos/grupo-07-carrito-ecommerce/tests/api/sql-prerequest.test.cjs
node --test grupos/grupo-07-carrito-ecommerce/tests/api/postman-operability.test.cjs
python -B -m unittest discover -s scripts/grupo07/tests -v
python -B scripts/grupo07/verify_repair.py
```

Las primeras cuatro pruebas SQL usan un servidor local. La prueba de operabilidad
ejecuta la colección individual real contra otro servidor local, genera JSON
Newman y PDF temporal. Los tests Python usan resultados sintéticos etiquetados.
Nada de ello certifica disponibilidad del sandbox ni publicación de artifacts.
El verificador de preservación está ligado a la base de esta reparación: antes
de cambiar esa base debe reevaluarse, no actualizarse para ocultar diferencias.

## Ejecuciones posteriores a la revisión y publicación autorizada

No ejecutar estos comandos hasta que los cambios revisados estén en entrega,
la configuración oficial esté disponible y se haya reservado presupuesto API.

```text
gh workflow run postman-grupo07-juan-regression.yml --repo stevenayal/proyect_base_automatizacion --ref grupo-07-carrito-ecommerce-entrega -f suite=postman
gh workflow run postman-grupo07-juan-regression.yml --repo stevenayal/proyect_base_automatizacion --ref grupo-07-carrito-ecommerce-entrega -f suite=jmeter
gh run list --repo stevenayal/proyect_base_automatizacion --branch grupo-07-carrito-ecommerce-entrega
gh run view RUN_ID --repo stevenayal/proyect_base_automatizacion --log
gh run download RUN_ID --repo stevenayal/proyect_base_automatizacion
```

También existe `suite=all`. Para probar ambos sin omitir intencionalmente una
suite, usar ese valor. `suite=jmeter` no certifica Postman y `suite=postman` no
certifica JMeter. Un success externo que omita la suite requerida se clasifica
`GREEN_CON_TESTS_SKIPPED`, nunca como aprobación de esa entrega.

El nuevo workflow JMeter ofrece dispatch propio, pero GitHub requiere que un
workflow esté presente en la rama predeterminada para su despacho manual.
Mientras todavía no esté allí, utilizar el dispatcher Postman ya existente
en main, con `--ref entrega` (nombre completo arriba) y `suite=jmeter`: llama
al workflow reutilizable local del mismo commit. Este camino requiere validación
en GitHub tras publicar; no se dispararon workflows durante la reparación.

Comprobar en el run real: SHA/ref, comandos/JMX seleccionados, contadores,
ausencia de omisiones, resultado de cada gate, PDF legible y artifact descargable.
Retención de artifacts: 7 días. No inferir éxito por el nombre del artifact o por
`conclusion=success` aislado. El general y Armin pueden usar nombres coincidentes.

## Alcance preservado

No se reparó BDD ni se cambiaron features, backups, JMX existentes, colecciones
individuales, workflows de Andrea/Armin, archivos de otros grupos o evidencia
histórica. No se hizo commit, push ni PR como parte de esta reparación local.
