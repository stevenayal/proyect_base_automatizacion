const { mkdirSync } = require('node:fs');

mkdirSync('results', { recursive: true });

module.exports = {
  sandbox: {
    paths: ['tests/bdd/sandbox-pom/features/**/*.feature'],
    require: [
      'tests/bdd/sandbox-pom/support/world.ts',
      'tests/bdd/sandbox-pom/support/hooks.ts',
      'tests/bdd/sandbox-pom/steps/**/*.steps.ts',
    ],
    requireModule: ['ts-node/register'],
    format: ['progress', 'json:results/cucumber-sandbox-pom.json'],
    formatOptions: { snippetInterface: 'async-await' },
    publishQuiet: true,
    retry: 0,
  },
  dryrun: {
    paths: ['tests/bdd/sandbox-pom/features/**/*.feature'],
    require: [
      'tests/bdd/sandbox-pom/support/world.ts',
      'tests/bdd/sandbox-pom/support/hooks.ts',
      'tests/bdd/sandbox-pom/steps/**/*.steps.ts',
    ],
    requireModule: ['ts-node/register'],
    dryRun: true,
    format: ['progress'],
    publishQuiet: true,
  },
};
