# Proyecto Base — Automatización AIQUAA

Repositorio de inicio para el curso de **QA Automation** (8 semanas). Cada equipo clona este repo, trabaja en su propia rama y entrega un PR por semana.

El sitio bajo prueba es [AIQUAA](https://aiquaa.com).

---

## Requisitos previos

| Herramienta | Versión mínima |
|-------------|----------------|
| Node.js     | 18 LTS o superior |
| npm         | incluido con Node.js |
| Git         | cualquier versión reciente |
| VS Code     | recomendado (con extensión Playwright) |

---

## Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/<tu-usuario>/proyect_base_automatizacion.git
cd proyect_base_automatizacion

# 2. Instalar dependencias
npm install

# 3. Instalar los navegadores de Playwright
npx playwright install chromium

# 4. Copiar el archivo de variables de entorno
cp .env.example .env
# Editar .env con tus datos reales (nunca subir .env al repo)
```

---

## Cómo correr los tests

```bash
# Tests UI con Playwright (modo headless)
npm run test:e2e

# Tests UI con el navegador visible
npm run test:e2e:headed

# Solo el smoke test
npm run smoke

# Ver el reporte HTML tras la ejecución
npm run test:e2e:report

# Tests de API con Newman
npm run test:api

# Tests BDD con Cucumber
npm run test:bdd

# Correr todo (API + UI)
npm run verify
```

---

## Estructura del repositorio

```
proyect_base_automatizacion/
├── .github/
│   ├── pull_request_template.md   # Plantilla para PRs de los equipos
│   └── workflows/
│       └── blank.yml              # Pipeline CI/CD (GitHub Actions)
├── ci/
│   └── github-actions-template.yml  # Referencia para equipos que extiendan el CI
├── docs/
│   └── FLUJO_SEMANAL.md           # Guía de actividades por semana
├── evidence/
│   └── README.md                  # Instrucciones para guardar evidencias
├── features/
│   ├── auth.feature               # Escenarios BDD de autenticación
│   └── checkout.feature           # Escenarios BDD de checkout
├── grupos/                        # Vertical slice por grupo (tarea BDD)
│   └── grupo-XX-modulo/
│       ├── README.md              # Alcance, integrantes, checklist de entrega
│       ├── features/              # .feature del módulo asignado al grupo
│       ├── tests/e2e/             # Specs Playwright del módulo
│       ├── playwright/pages/      # Page Objects del módulo
│       └── evidence/              # Evidencias del grupo
├── playwright/
│   ├── pages/
│   │   └── BasePage.ts            # Clase base para Page Objects
│   └── README.md                  # Guía de uso de Playwright en este proyecto
├── postman/
│   ├── AIQUAA-Lab-Template.postman_collection.json
│   ├── local.postman_environment.json
│   └── README.md
├── templates/
│   ├── bug-report-template.md     # Plantilla de reporte de bugs
│   └── test-plan-template.md      # Plantilla de plan de pruebas
├── tests/
│   ├── bdd/                       # Steps y hooks de Cucumber
│   └── e2e/
│       └── smoke.spec.ts          # Smoke test inicial
├── .env.example                   # Variables de entorno de ejemplo
├── .gitignore
├── BACKLOG.md                     # Backlog de pruebas sugeridas
├── ENTREGABLES.md                 # Criterios de entrega por semana
├── package.json
├── playwright.config.ts
└── README.md
```

---

## Variables de entorno

Copiar `.env.example` a `.env` y completar los valores:

| Variable         | Descripción                              |
|-----------------|------------------------------------------|
| `BASE_URL`      | URL del sitio bajo prueba                |
| `API_URL`       | URL base de la API                       |
| `TEST_USER`     | Email del usuario de prueba              |
| `TEST_PASSWORD` | Contraseña del usuario de prueba         |
| `GROUP_NAME`    | Identificador del equipo (ej: `grupo-a`) |
| `SESSION_PROFILE` | Perfil del laboratorio (`team-a`, etc.) |

> **Importante:** nunca subas el archivo `.env` al repositorio. Está en `.gitignore`.

---

## Convenciones del proyecto

### Archivos de test
- Nombrar como `nombre-modulo.spec.ts` en `tests/e2e/`
- Un archivo por módulo funcional (ej: `auth.spec.ts`, `checkout.spec.ts`)

### Page Objects
- Ubicar en `playwright/pages/`
- Nombrar como `NombrePage.ts` (ej: `LoginPage.ts`, `CartPage.ts`)
- Extender siempre de `BasePage`

### Features Gherkin
- Un archivo `.feature` por módulo funcional en `features/`
- Escribir en español, formato BDD estándar

### Ramas
- Entrega semanal individual: `semana-N/nombre-integrante`
  - Ejemplos: `semana-1/garcia`, `semana-3/lopez-martinez`
- Tarea BDD por grupo (10 grupos, ver `inscripcion-grupos-bdd2.xlsx`): `grupo-XX-modulo`
  - Ejemplos: `grupo-01-autenticacion-acceso`, `grupo-07-carrito-ecommerce`
  - Cada grupo trabaja únicamente dentro de su carpeta `grupos/grupo-XX-modulo/` y abre 1 PR a `main` con esa carpeta completa

### Commits
- Formato simple en español, tiempo presente
- Ejemplos: `agrega test de login`, `corrige selector del boton pagar`, `actualiza coleccion postman`

---

## Guía de onboarding para estudiantes

Pasos exactos desde cero (asumiendo Node.js, Git y VS Code ya instalados):

```bash
# Paso 1: Clonar el repo
git clone https://github.com/<tu-usuario>/proyect_base_automatizacion.git
cd proyect_base_automatizacion

# Paso 2: Instalar todo
npm install
npx playwright install chromium

# Paso 3: Configurar el entorno
cp .env.example .env
# Abrir .env en VS Code y completar con tus datos

# Paso 4: Verificar que los tests corren
npm run smoke

# Paso 5: Crear tu rama de trabajo
git checkout -b semana-1/tu-apellido

# Paso 6: Trabajar, commitear y abrir un PR
git add .
git commit -m "agrega primer escenario de autenticacion"
git push origin semana-1/tu-apellido
# Abrir Pull Request en GitHub desde la interfaz web
```

Si `npm run smoke` pasa sin errores, el entorno está configurado correctamente.

---

## Contribución (equipos)

1. Nunca trabajar directamente en `main`
2. Una rama por semana y por integrante
3. Abrir un PR al finalizar cada semana
4. Incluir capturas o videos como evidencia en `evidence/`
5. Describir los escenarios cubiertos en el PR usando la plantilla

---

## Scripts de referencia

| Comando               | Descripción                         |
|----------------------|-------------------------------------|
| `npm run test:e2e`   | Tests UI headless (todos)           |
| `npm run smoke`      | Solo smoke test                     |
| `npm run test:api`   | Colección Postman via Newman        |
| `npm run test:bdd`   | Escenarios Gherkin via Cucumber     |
| `npm run verify`     | API + UI juntos                     |
| `npm run test:e2e:report` | Abre el reporte HTML          |
