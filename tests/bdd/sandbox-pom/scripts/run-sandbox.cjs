const { spawnSync } = require('node:child_process');
const { join } = require('node:path');

if (!process.env.SANDBOX_API_KEY) {
  throw new Error('Definí SANDBOX_API_KEY antes de ejecutar la suite del sandbox.');
}

const cucumber = join(__dirname, '../../../../node_modules/@cucumber/cucumber/bin/cucumber-js');
const result = spawnSync(process.execPath, ['--use-system-ca', cucumber, '--config', 'tests/bdd/sandbox-pom/cucumber.js', '--profile', 'sandbox'], {
  stdio: 'inherit',
  env: process.env,
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
