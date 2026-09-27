# Comparacion de herramientas de automatizacion web - Semana 5 (Grupo 07)

> Entregable de la Tarea 5: "preparar una comparacion razonada de herramientas
> de automatizacion web". Autora: **Andrea Escurra** (Grupo 07 - Carrito /
> E-commerce). Ancla: **Playwright**, la herramienta que usa el curso.

---

## 1. Por que Playwright como ancla

El curso ya trabaja con Playwright para BDD y automatizacion end-to-end (skill
vendorizada `skills/playwright-ai-agents-skill`, agregada a `main` el 19/09).
Comparar contra las alternativas de uso mas comun (Selenium, Cypress) permite
justificar la eleccion que ya se viene usando, y de paso evaluar la capa de
agentes de IA que el repo agrega por encima de Playwright.

## 2. Tabla comparativa

| Eje | **Playwright** | **Selenium WebDriver** | **Cypress** |
|---|---|---|---|
| Lenguajes | JavaScript/TS, Python, Java, .NET | JavaScript, Python, Java, C#, Ruby, Kotlin | JavaScript/TS |
| Arquitectura | Protocolo CDP, sin servidor propio; auto-wait nativo | Driver por navegador + broker central | Corre en el mismo bucle de la app (Node) |
| Web elements | Selectores auto-healing, `getByRole/getByText`, esperas automaticas | Selectores por CSS/XPath, esperas manuales (p. ej. `WebDriverWait`) | `cy.get`, retries automaticos dentro del comando |
| Multi-navegador | Chromium, Firefox, WebKit (mismo API) | Chrome, Firefox, Safari, Edge (via driver por vendor) | Chrome, Firefox, Edge; **sin WebKit/Safari** |
| Multi-pagina / pestañas | Nativo | Nativo | Limitado (una sola pagina activa por test) |
| Ejecucion en paralelo | Nativa (workers, sharding) | Via grid / test runner externo | Pagada (paralelismo en Cypress Cloud) |
| Screenshots / video | Nativos (screenshot, video, trace) | Screenshot posible via driver; video con extra | Nativos |
| Integracion CI/CD | CLI, GitHub Actions, Docker (imagen oficial) | CLI + grid; configuracion mas pesada | CLI; binario propio por proyecto |
| Madurez / comunidad | Joven pero en crecimiento muy rapido (2020+), respaldo Microsoft | La mas antigua (2004+), comunidad enorme | Estable (2015+), buena documentacion |
| Curva de aprendizaje | Media | Alta (gestion de drivers, waits, grid) | Media-baja dentro de Node |

## 3. Analisis razonado

- **Arquitectura y DX:** Playwright elimina dos dolores clasicos de Selenium:
  gestionar drivers por navegador/version y escribir esperas manuales. Su
  auto-wait ("la espera es parte del comando") reduce falsos negativos por
  timing y hace los tests mas estables en CI.
- **Cobertura de navegadores:** el soporte de **WebKit** (Safari) con la misma
  API es el diferencial frente a Cypress, que en la practica queda atado a
  Chromium/Firefox. Para el sandbox y la UI de este curso (Chromium en CI) no
  pesa, pero en un producto real con usuarios de Safari es decisivo.
- **Paralelismo gratuito:** Cypress cobra por paralelizar; Playwright lo trae
  incluido con workers y sharding. En GitHub Actions corre directo como paso de
  workflow, igual que JMeter en la Tarea 5.
- **Ecosistema de evidencia:** Playwright graba screenshot/video/**trace** sin
  plugins extra — util para el mismo patron de "evidencia trazable" que se pide
  en esta semana (JTL/HTML/PDF en JMeter, screenshot de Grafana, etc.).
- **Por que no Selenium aqui:** dado un proyecto nuevo, no hay razon para
  aceptar la friccion de drivers/waits cuando la alternativa moderna es estable.
- **Por que no Cypress**: limitado a navegadores y a paralelo pago; ademas el
  curso ya tiene Playwright como estandar, no duplicamos stack.

## 4. Playwright plano vs. Playwright + skill de agentes de IA

El repo agrega `skills/playwright-ai-agents-skill` (Planner / Generator /
Classifier / Healer) sobre Playwright:

| Eje | Playwright plano | Playwright + ai-agents-skill |
|---|---|---|
| Generacion de casos | Manual (codigo a mano) | El agente planifica y genera a partir de consigna |
| Selectores | Fijos en el codigo | El healer los repara cuando la UI cambia |
| Clasificacion de fallos | Manual (leer stack/log) | El classifier categoriza el error |
| Trazabilidad | Manual | La skill genera artefactos con trazabilidad BDD |
| Riesgo | Depende 100% del equipo | Dependencia parcial del agente de IA |

**Veredicto:** la skill no reemplaza a Playwright, lo *envuelve*: la herramienta
de automatizacion sigue siendo Playwright, y la skill agrega una capa de IA
sobre el ciclo (planificar, reparar, clasificar). Se pueden usar ambas en
diferentes etapas del pipeline sin conflicto.

## 5. Conclusion

Playwright es la mejor opcion como ancla: moderna, sin friccion de drivers,
multi-navegador (incluye WebKit), con paralelismo y evidencia (video/trace)
incluidos, e integracion directa con GitHub Actions. Selenium queda como
legado/generico en proyectos que ya lo usan; Cypress es valido pero limitado en
navegadores y en paralelo gratuito. La capa de IA del curso es complementaria,
no sustitutiva.