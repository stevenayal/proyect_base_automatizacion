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
  // Perfil del lab BDD del grupo 05 — acotado a los features del grupo para no
  // arrastrar errores de parseo de features de otros equipos.
  // Uso: npx cucumber-js --profile grupo05 --tags "@G05-LOGIN-001"
  grupo05: {
    paths: ['grupos/grupo-05-tarjetas-credito-debito/features/*.feature'],
    // Los escenarios @manual están especificados pero no tienen endpoint en el
    // sandbox: se documentan en el .feature y se ejecutan a mano.
    tags: 'not @manual',
    require: ['tests/bdd/steps/**/*.ts', 'tests/bdd/support/**/*.ts'],
    requireModule: ['ts-node/register'],
    format: ['progress', 'json:results/cucumber-grupo05.json'],
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
};
