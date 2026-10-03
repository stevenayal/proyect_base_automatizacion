// La copia temporal tiene el expected incorrecto. Los archivos originales nunca se modifican.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const cucumberRoot = path.resolve(path.dirname(require.resolve('@cucumber/cucumber')), '..');
const cucumberPackage = JSON.parse(fs.readFileSync(path.join(cucumberRoot, 'package.json'), 'utf8'));
const cucumber = path.resolve(cucumberRoot, cucumberPackage.bin['cucumber-js']);
const verifyOnly = process.argv.includes('--verify');
const temporary = fs.mkdtempSync(path.join(root, '.controlado-'));
const output = path.join(root, 'evidence', 'fallo-controlado');
fs.mkdirSync(output, { recursive: true });
const original = fs.readFileSync(path.join(root, 'steps/S_registro.steps.ts'), 'utf8');
const marker = 'formatoInvalido: true, formularioValido: false';
function run(config, name) {
  const relative = file => path.relative(root, file).replaceAll('\\', '/');
  const result = spawnSync(process.execPath, [cucumber, '--config', relative(config), '--tags', '@S6-G04-03',
    '--format', `json:${relative(path.join(output, name + '.json'))}`,
    '--format', `html:${relative(path.join(output, name + '.html'))}`, ...(verifyOnly ? ['--dry-run'] : [])], {
    cwd: root, env: { ...process.env, HEADED: 'true' }, encoding: 'utf8'
  });
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  if (result.error) throw result.error;
  const report = JSON.parse(fs.readFileSync(path.join(output, name + '.json'), 'utf8'));
  const steps = report.flatMap(f => f.elements || []).flatMap(s => s.steps || []);
  return { status: result.status, steps };
}
try {
  if (!original.includes(marker)) throw new Error('No se encontró el expected exacto. No se modifica nada.');
  for (const dir of ['pages', 'support', 'steps']) fs.cpSync(path.join(root, dir), path.join(temporary, dir), { recursive: true });
  fs.writeFileSync(path.join(temporary, 'steps/S_registro.steps.ts'), original.replace(marker, 'formatoInvalido: false, formularioValido: false'));
  const config = path.join(temporary, 'cucumber.cjs');
  fs.writeFileSync(config, 'module.exports = ' + JSON.stringify({ default: {
    paths: [path.join(root, 'features/*.feature').replaceAll('\\', '/')],
    requireModule: ['ts-node/register'],
    require: ['support/**/*.ts', 'steps/**/*.ts'].map(p => path.join(temporary, p).replaceAll('\\', '/')),
    format: ['progress'], parallel: 0, retry: 0
  } }));
  if (verifyOnly) {
    for (const [conf, name] of [[config, 'preflight-copia'], [path.join(root, 'cucumber.js'), 'preflight-original']]) {
      const checked = run(conf, name);
      if (checked.status !== 0 || !checked.steps.length || checked.steps.some(s => s.result?.status !== 'skipped')) {
        throw new Error('Error de enlace en ' + name);
      }
    }
    console.log('Arranque y enlace de ambas versiones comprobados sin abrir el navegador.');
  } else {
  const failed = run(config, '01-fallo-esperado');
  const failures = failed.steps.filter(s => s.result?.status === 'failed');
  if (failed.status !== 1 || failures.length !== 1 || !failures[0].name.includes('el correo es inválido') ||
      !failures[0].result.error_message.includes('formatoInvalido')) {
    throw new Error('El fallo no fue el esperado; revisar evidencia antes de continuar.');
  }
  const restored = run(path.join(root, 'cucumber.js'), '02-caso-restaurado');
  if (restored.status !== 0 || !restored.steps.length || restored.steps.some(s => s.result?.status !== 'passed')) {
    throw new Error('La ejecución restaurada no pasó.');
  }
  fs.writeFileSync(path.join(output, 'RESUMEN.json'), JSON.stringify({
    comprobadoEn: new Date().toISOString(), escenario: 'S6-G04-03',
    falloControlado: 'El expected false contradice el correo inválido real.',
    restaurado: 'Todos los pasos del caso original pasaron.',
    originalSinCambios: fs.readFileSync(path.join(root, 'steps/S_registro.steps.ts'), 'utf8') === original
  }, null, 2));
  console.log('Demostración completada: fallo esperado y caso original aprobado.');
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  // Sólo se borra el directorio temporal exacto, creado dentro de esta suite.
  if (path.dirname(temporary) !== root || !path.basename(temporary).startsWith('.controlado-')) throw new Error('Ruta temporal inesperada');
  fs.rmSync(temporary, { recursive: true, force: true });
}
