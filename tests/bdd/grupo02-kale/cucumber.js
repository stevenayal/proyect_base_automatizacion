// Configuracion Cucumber del Grupo 02 (Cucumber + Playwright + POM).
// Se ejecuta desde la raiz del repo:  npm run test:bdd
const { mkdirSync } = require('node:fs');

mkdirSync('results', { recursive: true });

const common = {
  paths: ['tests/bdd/grupo02-kale/features/**/*.feature'],
  require: [
    'tests/bdd/grupo02-kale/support/world.ts',
    'tests/bdd/grupo02-kale/support/hooks.ts',
    'tests/bdd/grupo02-kale/steps/**/*.steps.ts',
  ],
  requireModule: ['ts-node/register'],
  formatOptions: { snippetInterface: 'async-await' },
};

module.exports = {
  default: {
    ...common,
    format: [
      'progress-bar',
      'json:results/cucumber-grupo02.json',
      'html:results/cucumber-grupo02.html',
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
