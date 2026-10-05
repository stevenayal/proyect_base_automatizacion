// Configuraciones aisladas para ejecución real y verificación de steps.
const { mkdirSync } = require('node:fs');
mkdirSync('grupos/grupo-01-autenticacion-acceso/reports/semana-06', { recursive: true });
const shared = {
  paths: ['grupos/grupo-01-autenticacion-acceso/features/semana-06/**/*.feature'],
  require: [
    'grupos/grupo-01-autenticacion-acceso/tests/bdd/steps/semana-06/**/*.ts',
    'grupos/grupo-01-autenticacion-acceso/tests/bdd/support/semana-06/**/*.ts',
  ],
  requireModule: ['ts-node/register'],
  formatOptions: { snippetInterface: 'async-await' },
};
module.exports = {
  default: {
    ...shared,
    format: [
      'progress',
      'json:grupos/grupo-01-autenticacion-acceso/reports/semana-06/cucumber-report.json',
      'html:grupos/grupo-01-autenticacion-acceso/reports/semana-06/cucumber-report.html',
    ],
  },
  // Cucumber agrega los --format a la configuración: un perfil independiente evita
  // que un dry-run sobrescriba los resultados de la última ejecución real.
  dry: { ...shared, dryRun: true, format: ['summary'] },
};
