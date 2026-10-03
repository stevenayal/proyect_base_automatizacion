import fs from 'node:fs';
import path from 'node:path';

const input = path.resolve('results/cucumber-sandbox-pom.json');
const output = path.resolve('results/YF-CLASIF_BDD.json');

if (!fs.existsSync(input)) {
  console.error(`No existe el resultado Cucumber: ${input}`);
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(input, 'utf8'));

const scenarios = [];

for (const feature of report) {
  for (const element of feature.elements ?? []) {
    if (element.type !== 'scenario') continue;

    const steps = element.steps ?? [];
    const failed = steps.find(
      step => step.result?.status === 'failed'
    );

    let classification = 'PASS';
    let reason = 'Escenario ejecutado correctamente.';

    if (failed) {
      classification = 'TEST_BUG';
      reason = `Fallo en el step: ${failed.name}`;
    }

    scenarios.push({
      feature: feature.name,
      scenario: element.name,
      classification,
      reason,
    });
  }
}

const result = {
  generatedBy: 'YF - Cucumber BDD Failure Classifier',
  input: 'results/cucumber-sandbox-pom.json',
  total: scenarios.length,
  passed: scenarios.filter(x => x.classification === 'PASS').length,
  failed: scenarios.filter(x => x.classification !== 'PASS').length,
  scenarios,
};

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(result, null, 2));

console.log(`Clasificación YF generada: ${output}`);
console.log(`Escenarios analizados: ${result.total}`);
console.log(`PASS: ${result.passed}`);
console.log(`FAIL: ${result.failed}`);