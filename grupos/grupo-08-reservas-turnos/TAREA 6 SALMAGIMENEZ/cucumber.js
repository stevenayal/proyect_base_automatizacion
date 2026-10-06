const { mkdirSync } = require('node:fs');

const base = 'grupos/grupo-08-reservas-turnos/TAREA 6 SALMAGIMENEZ';

mkdirSync(`${base}/reports`, { recursive: true });

const shared = {
  paths: [
    `${base}/features/**/*.feature`
  ],
  require: [
    `${base}/tests/bdd/steps/**/*.ts`,
    `${base}/tests/bdd/support/**/*.ts`
  ],
  requireModule: ['ts-node/register'],
  formatOptions: {
    snippetInterface: 'async-await'
  }
};

module.exports = {
  default: {
    ...shared,
    format: [
      'progress',
      `json:${base}/reports/cucumber-report.json`,
      `html:${base}/reports/cucumber-report.html`
    ]
  },

  dryrun: {
    ...shared,
    dryRun: true,
    format: ['summary']
  },

  pr: {
    ...shared,
    format: [
      'progress',
      `json:${base}/reports/cucumber-report.json`,
      `html:${base}/reports/cucumber-report.html`
    ]
  }
};
