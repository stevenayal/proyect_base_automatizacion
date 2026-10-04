# Semana 6 - BDD con Cucumber + Playwright (Grupo 10: Roles y Permisos)

- Autora: Nicole Fernández
- Fecha: 2026-10-04
- Rama: `semana-6/fernandez`
- Aplicación bajo prueba: https://aiquaa-sandbox-web.vercel.app/ (Curso 1 · Automatización, pantalla `/roles`)
- Skills del repositorio usadas: `bdd-skill` y `playwright-ai-agents-skill`

## 1. Plan: requisitos e IDs

| ID | Escenario | Requisito | Tipo |
|---|---|---|---|
| S6-ROLES-01 | Asignar un rol a un usuario sin roles | RF-G10-03 | Camino feliz (`@smoke`) |
| S6-ROLES-02 | Revocar un rol asignado, con confirmación | RF-G10-04 | Camino feliz, con defecto conocido (`@defecto-conocido`) |
| S6-ROLES-03 | Cancelar la revocación mantiene el rol asignado | Sin requisito propio: se deriva del cuadro de confirmación de la pantalla | Negativo (`@negativo`) |

Cada escenario lleva su ID en tres lugares: el nombre del escenario, la etiqueta `@S6-ROLES-0N` y el comentario `# criterio:`. Ese comentario alimenta la matriz de trazabilidad del informe PDF.

## 2. Arquitectura

`.feature` (negocio) → `S_roles.steps.ts` (pasos) → Page Objects (`CursoPage`, `LoginPage`, `RolesPage`).

- Se reutilizan el World, los hooks y los pasos genéricos del proyecto base (`tests/bdd/`). No se modificó ningún archivo compartido.
- Todo el trabajo está en `grupos/grupo-10-roles-permisos/`. El perfil de Cucumber propio es `cucumber.js`.
- Los datos se preparan por el proxy de la web (`/api/proxy/...`): cada escenario crea su propio usuario, con email y documento únicos. No se usa ninguna clave en el proyecto.
- Las comprobaciones (`expect`) viven en los pasos `Entonces`. Los Page Objects no las contienen.

## 3. Ejecución y resultados

| Corrida | Resultado | Duración |
|---|---|---|
| Oficial (3 escenarios) | 1 falló, 2 pasaron; 22 pasos: 20 pasaron, 1 falló, 1 omitido | 43,9 s |
| Fallo controlado (copia temporal) | 1 falló; 6 pasos: 4 pasaron, 1 falló, 1 omitido | 23,5 s |

- Informe PDF con matriz de trazabilidad: `evidence/INFORME_BDD_GRUPO_10.pdf` (veredicto: criterios no cumplidos, por el defecto S6-H01).
- Datos crudos: `evidence/cucumber-report-corrida-completa.json`.
- Clasificación de fallos por reglas, sin IA: `evidence/CLASIF_corrida-completa.json`.

## 4. Fallo controlado

Se hizo una copia temporal del S6-ROLES-01 con una expectativa incorrecta a propósito: el paso decía `veo el mensaje "Rol revocado."` después de asignar un rol.

- Falló solo ese paso. Los cuatro anteriores pasaron. El paso siguiente quedó omitido (omitido no equivale a aprobado).
- Mensaje: `Expected substring: "Rol revocado."` / `Received string: "Rol asignado."`.
- Evidencia: `evidence/S6-ROLES-01-fallo-controlado.png` y `evidence/CLASIF_S6-ROLES-01-fallo-controlado.json`.
- Clasificación automática: `TEST_BUG`, confianza media, revisión humana. Coincide con el diagnóstico humano: el producto se comportó bien y el error estaba en el caso.
- Corrección: no se adaptó la expectativa para que pasara. El caso real se mantuvo como estaba (la expectativa sale del requisito RF-G10-03) y la copia temporal se eliminó.

## 5. Hallazgo S6-H01 (defecto de producto)

**Resumen:** al revocar un rol desde la pantalla Roles, la web muestra "Error inesperado." y no se actualiza, aunque el backend sí revoca el rol.

- **Esperado:** mensaje "Rol revocado." y el rol queda "Sin asignar".
- **Obtenido:** "Error inesperado." y el rol sigue "Asignado" hasta recargar la página.
- **Evidencia:** `DELETE /api/proxy/usuarios/{id}/roles/2` responde 500 con cuerpo vacío; la consulta posterior de roles del usuario no devuelve `soporte` activo. La API directa responde 204.
- **Hipótesis de causa (no verificada):** el proxy de la web arma una respuesta con cuerpo para un 204, algo que Node no admite.
- **Tratamiento:** el escenario S6-ROLES-02 queda sin modificar y con la etiqueta `@defecto-conocido`. El pipeline lo trata como falla esperada.

Reproducción sin navegador (PowerShell):

```powershell
$base = "https://aiquaa-sandbox-web.vercel.app/api/proxy"
$marca = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
$cuerpo = @{ nombre = "Repro DELETE"; email = "qa.repro.$marca@example.com"; documentoTipo = "CI"; documentoNumero = ("$marca").Substring(5) } | ConvertTo-Json
$u = Invoke-RestMethod -Method Post -Uri "$base/usuarios" -ContentType "application/json" -Body $cuerpo
$id = $u.data.id
Invoke-RestMethod -Method Post -Uri "$base/usuarios/$id/roles" -ContentType "application/json" -Body '{"roleId":2}' | Out-Null
try {
  $r = Invoke-WebRequest -Method Delete -Uri "$base/usuarios/$id/roles/2" -UseBasicParsing
  "DELETE por el proxy -> status $($r.StatusCode)"
} catch {
  "DELETE por el proxy -> status $($_.Exception.Response.StatusCode.value__)"
}
"Roles del usuario $id despues del DELETE:"
(Invoke-RestMethod -Uri "$base/usuarios/$id/roles").data | Select-Object role_id, nombre, activo
```

## 6. Registro de revisión de la IA

La IA (Claude) propuso el plan, los escenarios, los pasos, los Page Objects, el perfil de Cucumber y el workflow. La persona revisó cada resultado contra la ejecución real.

Alcance de las skills: se aplicó la metodología del `README` y el `CLAUDE.md` de `playwright-ai-agents-skill` (planificar, generar, clasificar). No se ejecutaron los comandos `/pw-ia:*` como comandos del agente. Sí se ejecutó el clasificador `classify-failures.mjs` y el generador de informe de `bdd-skill`. El Healer no se usó.

| # | Propuesta de la IA | Problema detectado | Corrección del equipo |
|---|---|---|---|
| 1 | `LoginPage` esperaba el formulario de email al abrir `/` | La web pide primero el curso (`/curso`); el informe HTML con captura lo mostró | Se agregó `CursoPage` y `LoginPage` elige el curso 1 si aparece la pantalla |
| 2 | Tiempo por defecto de Cucumber (5 s) | Los pasos contra el sitio real tardan más | `setDefaultTimeout(60 s)` y esperas de 15 s en las comprobaciones |
| 3 | La IA atribuyó el primer fallo del S6-ROLES-02 al tiempo de espera | Falló igual en corridas siguientes: el fallo era determinista | Se reprodujo sin navegador y se encontró el defecto S6-H01 |
| 4 | El clasificador marcó el S6-ROLES-02 como `TEST_BUG`, confianza alta, Healer permitido | El localizador `roles-success` funciona en el S6-ROLES-01; el origen es el proxy | Reclasificado por la persona como `PRODUCT_BUG`. No se ejecutó el Healer ni se debilitó ninguna comprobación |
| 5 | Instrucciones de creación de archivos con rutas completas | Quedaron carpetas duplicadas y archivos mal ubicados | Se movieron los archivos y se pasó a crearlos desde la terminal |
| 6 | Indicaciones con `...` para editar el `.feature` | Se copiaron como contenido: etiquetas en el escenario equivocado y escenarios duplicados | Se reemplazó el archivo completo y se verificó con `--dry-run` y filtros por etiqueta y nombre |
| 7 | `--dry-run` después de la corrida oficial | Reescribe `cucumber-report.json` y deja el informe sin resultados reales | Se repitió la corrida oficial y se copió el JSON a `evidencia-corrida-completa.json` |
| 8 | ID de escenario solo en el nombre | El generador de informes toma el ID de una etiqueta | Se agregaron las etiquetas `@S6-ROLES-01`, `-02` y `-03` |
| 9 | Plantilla de CI con `continue-on-error` en todos los pasos | El pipeline nunca quedaría en rojo | Puerta de control propia: rojo solo ante fallos inesperados; el defecto conocido es solo aviso |

Aceptado sin cambios: la reutilización de los pasos genéricos del proyecto base, el uso del proxy de la web para preparar datos y el escenario S6-ROLES-03 (decisión de la persona, porque no sale de un requisito).

## 7. Cómo repetirlo

Requisitos: Node.js, Python y Git. Desde la raíz del proyecto:

```powershell
git checkout semana-6/fernandez
npm ci
npx playwright install chromium
npx cucumber-js --config grupos/grupo-10-roles-permisos/cucumber.js --dry-run
npx cucumber-js --config grupos/grupo-10-roles-permisos/cucumber.js
node skills/playwright-ai-agents-skill/scripts/classify-failures.mjs --input results/grupo10/cucumber-report.json --out results/grupo10/CLASIF_GRUPO10.json
python -m pip install reportlab
python skills/bdd-skill/reporter/bdd_report.py --results results/grupo10/cucumber-report.json --output results/grupo10/INFORME_BDD_GRUPO_10.pdf --grupo "Grupo 10 - Administración de Roles y Permisos" --author "Nicole Fernández"
```

Notas:

- Navegador visible: `$env:HEADED='true'` antes de ejecutar.
- Un `--dry-run` reescribe el JSON de resultados: ejecútalo antes de la corrida real, nunca después.
- Solo los escenarios sin defecto: agregar `--tags "not @defecto-conocido"`.
- El sandbox limita a 30 peticiones por minuto con una clave compartida. Si aparecen errores 429, espera unos minutos y repite.
- Fallo controlado: copiar el S6-ROLES-01 a un `.feature` temporal, cambiar el mensaje esperado a "Rol revocado." y ejecutarlo con un perfil de Cucumber aparte. Borrar los archivos temporales al terminar.

## 8. Integración continua

Workflow: `.github/workflows/Y_GRUPO_10_bdd.yml`. Ejecuta los escenarios, clasifica los fallos, genera el informe PDF, sube los resultados como artifact y aplica la puerta de control.

- Ejecución de referencia: ver el enlace en la descripción del pull request y en la pestaña Actions del repositorio.
- Pull request: el que contiene este archivo.

