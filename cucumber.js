// cucumber.js — configuración de Cucumber para este repositorio.
// `npm run test:bdd` (ver package.json) usa esta config por defecto.

module.exports = {
  default: {
    paths: ['features/**/*.feature', 'grupos/**/*.feature'],
    require: ['tests/bdd/steps/**/*.ts', 'tests/bdd/support/**/*.ts'],
    requireModule: ['ts-node/register'],
    format: ['progress', 'json:results/cucumber-report.json'],
    formatOptions: { snippetInterface: 'async-await' },
    publishQuiet: true,
  },
  // Perfil acotado solo al feature de ejemplo de la guía playwright/README.md.
  // Uso: npx cucumber-js --profile demo
  demo: {
    paths: ['features/demo-login.feature'],
    require: ['tests/bdd/steps/**/*.ts', 'tests/bdd/support/**/*.ts'],
    requireModule: ['ts-node/register'],
    format: ['progress'],
    formatOptions: { snippetInterface: 'async-await' },
    publishQuiet: true,
  },
  // Perfil acotado solo a los features del Grupo 06 (Notificaciones y Alertas).
  // Evita heredar 'grupos/**/*.feature' del perfil default, que arrastra
  // features con errores de sintaxis de otros grupos.
  // Uso: npx cucumber-js --profile grupo06 --tags "@grupo06"
  grupo06: {
    paths: ['grupos/grupo-06-notificaciones-alertas/features/**/*.feature'],
    // El support del grupo va despues del base: agrega capturas por paso y trace de Playwright.
    require: ['tests/bdd/steps/**/*.ts', 'tests/bdd/support/**/*.ts', 'grupos/grupo-06-notificaciones-alertas/support/**/*.ts'],
    requireModule: ['ts-node/register'],
    format: ['progress', 'json:results/cucumber-report.json', 'html:results/cucumber-report-grupo06.html'],
    // El login del sandbox comparte la API key (30 req/min) con otros workflows: se reintenta hasta 2
    // veces y el hook del grupo espera 61 s solo si el fallo fue por rate limit. El fallo controlado
    // (@grupo06_fallo_controlado) queda fuera del reintento.
    retry: 2,
    retryTagFilter: '@grupo06',
    formatOptions: { snippetInterface: 'async-await' },
    publishQuiet: true,
  },
};
