// cucumber.js — perfiles de Cucumber + Playwright del Grupo 03 (Pagos de Servicios).
//
// Se usa SOLO con --config, así no interfiere con `npm run test:bdd` ni con otros grupos:
//
//   npx cucumber-js --config grupos/grupo-03-pagos-servicios/cucumber.js --profile g3-completa
//   npx cucumber-js --config grupos/grupo-03-pagos-servicios/cucumber.js --profile g3-web
//   npx cucumber-js --config grupos/grupo-03-pagos-servicios/cucumber.js --profile dryrun
//
// Arquitectura (playwright-ai-agents-skill · variante Cucumber + BDD + POM):
//   features/  QUÉ   — pagos-servicios-FINAL.feature (negocio, sin UI)
//   steps/     GLUE  — 1 step = 1 llamada a la API del World o a un Page Object
//   support/   CONTEXTO — world, hooks, cliente de la API (ritmo + 429), consultas a la base
//   playwright/pages/ CÓMO — locators y esperas de la web
//
// Sin retry: el JSON de cucumber no distingue flaky y un reintento escondería el fallo
// al clasificador de fallos de la skill (scripts/classify-failures.mjs).
// Generado con skill playwright-ai-agents · aiquaa.com

const path = require('path');

// Rutas relativas al directorio desde el que se ejecuta (raíz del repo o esta carpeta)
// y con "/" también en Windows: los globs y los formatters de cucumber las necesitan así.
const rel = (...p) => {
  const r = path.relative(process.cwd(), path.join(__dirname, ...p)).split(path.sep).join('/');
  return r === '' ? '.' : r;
};

// Resultados fuera del repo versionado: test-results/ ya está en el .gitignore de la raíz.
const RESULTS = process.env.G3_RESULTS || rel('..', '..', 'test-results', 'grupo-03-bdd');
process.env.G3_RESULTS = RESULTS;

// ts-node toma la configuración de esta carpeta (la raíz del repo no tiene tsconfig).
process.env.TS_NODE_PROJECT = process.env.TS_NODE_PROJECT || path.join(__dirname, 'tsconfig.json');

const common = {
  paths: [rel('features', 'pagos-servicios-FINAL.feature')],
  require: [rel('support', '**', '*.ts'), rel('steps', '**', '*.ts')],
  requireModule: ['ts-node/register'],
  formatOptions: { snippetInterface: 'async-await' },
  retry: 0,
  // Un solo proceso: el ritmo de peticiones (G3_RPM) y la elección del titular son
  // compartidos; dos procesos en paralelo duplicarían el caudal contra la API key.
  parallel: 0,
};

const reportes = (sufijo) => [
  'progress',
  `json:${RESULTS}/cucumber-report${sufijo}.json`,
  `html:${RESULTS}/cucumber-report${sufijo}.html`,
];

module.exports = {
  // Suite completa: los 46 escenarios. Los @web además verifican la página /facturas.
  'g3-completa': {
    ...common,
    format: reportes(''),
    tags: process.env.G3_TAGS || '',
  },
  // Suite corta para la demo: solo los escenarios cuyo resultado se ve en la web.
  'g3-web': {
    ...common,
    format: reportes(''),
    tags: '@web',
  },
  // Generator de la skill: valida que cada paso del .feature tenga step definition,
  // sin abrir el navegador ni llamar a la API. Debe dar 0 undefined y 0 ambiguous.
  dryrun: {
    ...common,
    dryRun: true,
    format: ['progress', `usage:${RESULTS}/cucumber-usage.txt`],
  },
  // `npx cucumber-js --config ...` sin --profile usa este.
  default: {
    ...common,
    format: reportes(''),
    tags: '@web',
  },
};
