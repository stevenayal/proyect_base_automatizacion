# Primera ejecución — S6-G04-02

Resultado original: 3 escenarios pasados, 1 fallado; 12 pasos pasados, 1 fallado.
Usuario de prueba: 147. Fecha enviada: 1995-06-15.

La ficha visible muestra 15/06/1995. DOM observado:
`<dt>Fecha de nacimiento</dt><dd><span data-value="1995-06-15T00:00:00.000Z">15/06/1995</span></dd>`.
Sin embargo, el campo de fecha bajo Editar datos aparece vacío.

La prueba de alta leía ese campo de edición. Se corrigió el Page Object para leer la
fecha de la ficha, verificar consistencia entre texto visible y atributo ISO, y devolver
YYYY-MM-DD. Se conserva exactamente el expected original 1995-06-15 en el Then.
No se eliminó ni debilitó la comprobación. Nueva ejecución Cucumber pendiente.

Hallazgo separado del producto: la fecha que muestra la ficha no se precarga en el editor.
No se ha probado qué sucede al guardar cambios desde ese editor; no se afirma pérdida de datos.
La ejecución original y su captura se conservan en primera-ejecucion/.

Este fallo observado no reemplaza la demostración de fallo controlado solicitada por la clase.
