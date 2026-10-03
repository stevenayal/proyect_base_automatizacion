# Cucumber + Playwright + POM — Grupo 04

Suite preparada con cuatro escenarios: dos exitosos y dos negativos.
No requiere el MCP de JMeter. Cucumber ejecuta los pasos sin llamadas a una IA.

## Abrir y configurar desde VS Code

1. Abrir esta carpeta como proyecto en VS Code.
2. Copiar `.env.example` a `.env`.
3. Completar `SANDBOX_LOGIN_EMAIL` con el correo del operador del sandbox.
4. Instalar dependencias y Chromium (si no están instalados).
5. En el panel **NPM Scripts**, ejecutar `test:dry` para revisar el enlace y luego
   `test:visible` para ejecutar los cuatro casos con navegador visible.
6. Abrir `results/cucumber-report.html` y conservar también el JSON.

Si el panel NPM Scripts no aparece, buscar **NPM Scripts** en la paleta de comandos.
La instalación inicial puede realizarla el asistente; no exige que escribas comandos.

## Referencia técnica para CI o repetición

```text
npm ci
npm run browser:install
npm run check
npm run test:dry
npm run test:visible
```

`test:bdd` ejecuta sin ventana salvo HEADED=true. Para un caso: `npm run test:bdd -- --tags @S6-G04-03`.
Los reportes se sobrescriben en cada corrida: copiar resultados antes del fallo controlado.
Nunca subir `.env`, node_modules o estados de sesión al repositorio.

## Mapa de conexión

`features/F_REGISTRO.feature` → `steps/S_registro.steps.ts` → `pages/UsuariosPage.ts`.
`support/world.ts` comparte los datos dentro de cada escenario.
`support/hooks.ts` gestiona sesión, contextos y capturas cuando falla.
`cucumber.js` carga todas las piezas y activa los reportes.

## Pipeline

El archivo `Y_GRUPO04_bdd.yml` se coloca en `.github/workflows/` del repositorio.
La suite se coloca en `tests/bdd/grupo04/`. Configurar el secreto `SANDBOX_LOGIN_EMAIL`
en GitHub y ejecutar manualmente el workflow. No publica cambios automáticamente.
El artefacto guarda HTML, JSON y capturas aun cuando fallen las pruebas.

Estado real de preparación y pendientes: `PLAN_REGISTRO.md`.
