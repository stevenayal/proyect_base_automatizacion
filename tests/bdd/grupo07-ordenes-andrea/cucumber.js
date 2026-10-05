// cucumber.js — workspace BDD de órdenes, Grupo 07 (Andrea Escurra).
//
// Aislado del `cucumber.js` raíz del repo: el raíz globa `grupos/**/*.feature`
// pero solo carga steps de `tests/bdd/steps/**`, así que un feature propio
// guardado en `grupos/` daría colisión de definiciones de pasos. Este workspace
// se trae sus propios steps.
//
// Uso:
//   npx cucumber-js --config tests/bdd/grupo07-ordenes-andrea/cucumber.js --profile dryrun
//   npx cucumber-js --config tests/bdd/grupo07-ordenes-andrea/cucumber.js --profile default --tags "@OE-G07-01"
//   npm run test:bdd:ordenes-andrea

const { mkdirSync } = require('node:fs');
const { config } = require('dotenv');

// Carga el .env local. En CI las variables vienen del secret del workflow y
// dotenv NO sobreescribe las que ya existen, así que el mismo archivo sirve
// para local y para GitHub Actions.
config();

if (!process.env.SANDBOX_API_KEY) {
  throw new Error(
    'Falta SANDBOX_API_KEY. Crea un .env en la raíz del repo (está en .gitignore) ' +
      'o exportá la variable antes de correr.',
  );
}

// Todo lo que produce este workspace vive en results/grupo07-andrea/.
// `results/` es carpeta compartida del repo: la usan el cucumber.js raíz
// (cucumber-report.json) y el workflow del profesor (playwright-results.json).
// Namespacing para que este workspace no pueda pisar esos artefactos.
const RESULTS_DIR = 'results/grupo07-andrea';

// El formatter `json:` falla si el destino no existe.
mkdirSync(RESULTS_DIR, { recursive: true });

const COMUN = {
  paths: ['tests/bdd/grupo07-ordenes-andrea/features/**/*.feature'],
  require: [
    'tests/bdd/grupo07-ordenes-andrea/support/world.ts',
    'tests/bdd/grupo07-ordenes-andrea/support/hooks.ts',
    'tests/bdd/grupo07-ordenes-andrea/steps/**/*.steps.ts',
  ],
  requireModule: ['ts-node/register'],
  formatOptions: { snippetInterface: 'async-await' },
};

module.exports = {
  default: {
    ...COMUN,
    format: [
      'progress-bar',
      `json:${RESULTS_DIR}/cucumber-grupo07-andrea.json`,
      `html:${RESULTS_DIR}/cucumber-grupo07-andrea.html`,
    ],
    tags: process.env.BDD_TAGS ?? 'not @wip',
    // retry 0 a propósito: el JSON de Cucumber no distingue un fallo "flaky"
    // de uno real, y un reintento taparía justo el fallo que el clasificador de
    // la skill tiene que ver para poder curarlo (skills/playwright-ai-agents-skill).
    retry: Number(process.env.BDD_RETRY ?? 0),
  },

  // Valida el binding de los pasos sin abrir navegador ni tocar el sandbox.
  dryrun: {
    ...COMUN,
    dryRun: true,
    format: ['progress'],
    tags: process.env.BDD_TAGS ?? 'not @wip',
  },
};