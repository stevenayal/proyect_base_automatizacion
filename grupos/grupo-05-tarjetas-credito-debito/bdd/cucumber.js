// cucumber.js — perfiles del BDD del grupo 05 (arquitectura Cucumber + POM de
// skills/playwright-ai-agents-skill). Las rutas son relativas a la raíz del repo:
//   npx cucumber-js --config grupos/grupo-05-tarjetas-credito-debito/bdd/cucumber.js --profile grupo05
//
// El JSON de resultados alimenta al Failure Classifier (bdd/scripts/classify-failures.mjs)
// y al PDF de bdd-skill.

const { mkdirSync } = require('node:fs');

const BDD = 'grupos/grupo-05-tarjetas-credito-debito/bdd';
const RESULTS = 'results/grupo05';

mkdirSync(RESULTS, { recursive: true });

const common = {
  paths: [`${BDD}/features/**/*.feature`],
  require: [`${BDD}/support/**/*.ts`, `${BDD}/steps/**/*.steps.ts`],
  requireModule: ['ts-node/register'],
  formatOptions: { snippetInterface: 'async-await' },
  // Sin retry: el JSON de cucumber no distingue flaky; un retry escondería el fallo al classifier.
  retry: 0,
};

module.exports = {
  // Suite automatizable completa. Los @manual están especificados pero el
  // sandbox no expone endpoints para ellos (ver features/tarjetas/F_TARJETAS.feature).
  grupo05: {
    ...common,
    tags: 'not @manual',
    format: ['progress', `json:${RESULTS}/cucumber-report.json`, `html:${RESULTS}/cucumber-report.html`],
  },
  smoke: {
    ...common,
    tags: '@smoke and not @manual',
    format: ['progress', `json:${RESULTS}/cucumber-report.json`],
  },
  // Valida que cada step del .feature tenga definición, sin abrir browser ni llamar a la API.
  dryrun: {
    ...common,
    tags: 'not @manual',
    dryRun: true,
    format: ['progress', `usage:${RESULTS}/cucumber-usage.txt`],
  },
};
