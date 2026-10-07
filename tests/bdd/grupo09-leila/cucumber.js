// Configuracion Cucumber - Grupo 09 (Leila): Cucumber + Playwright + POM.
// Se ejecuta desde la raiz del repo:
//   npx cucumber-js --config tests/bdd/grupo09-leila/cucumber.js
const { mkdirSync } = require('node:fs');

mkdirSync('results/grupo09-leila', { recursive: true });

const common = {
  paths: ['tests/bdd/grupo09-leila/features/**/*.feature'],
  require: [
    'tests/bdd/grupo09-leila/support/world.ts',
    'tests/bdd/grupo09-leila/support/hooks.ts',
    'tests/bdd/grupo09-leila/steps/**/*.steps.ts',
  ],
  requireModule: ['ts-node/register'],
  formatOptions: { snippetInterface: 'async-await' },
};

module.exports = {
  default: {
    ...common,
    format: [
      'progress-bar',
      'json:results/grupo09-leila/cucumber-report.json',
      'html:results/grupo09-leila/cucumber-report.html',
    ],
    retry: Number(process.env.BDD_RETRY ?? 0),
    tags: process.env.BDD_TAGS ?? 'not @wip',
  },
  dryrun: {
    ...common,
    dryRun: true,
    format: ['progress'],
  },
};
