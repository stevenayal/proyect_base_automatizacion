// agregar-criterios.mjs — inyecta los `# criterio:` del .feature en el JSON de
// Cucumber, para que bdd_report.py pueda armar la matriz de trazabilidad.
//
// POR QUÉ ESTE SCRIPT
// -------------------
// `skills/bdd-skill/reporter/bdd_report.py` arma la matriz de trazabilidad
// leyendo `elements[].comments` de cada Scenario (linea ~121). Pero el formatter
// `json:` de Cucumber 11 no emite la clave `comments`: se verificó en
// node_modules/@cucumber/cucumber/lib/formatter/json_formatter.js, que no tiene
// ni una referencia a comentarios. El `.feature` sí los tiene; se pierden entre
// Cucumber y el reporter, y la matriz sale como "(sin criterio documentado)".
//
// Este script los recupera leyendo el `.feature` y los agrega al JSON. No
// modifica bdd_report.py (es del profe y lo usan otros grupos) ni baja versiones
// del lockfile compartido del curso.
//
// Uso:
//   node tests/bdd/grupo07-ordenes-andrea/scripts/agregar-criterios.mjs \
//     --feature tests/bdd/grupo07-ordenes-andrea/features/F_ORDENES_ENLAZADO_ANDREA.feature \
//     --json results/cucumber-grupo07-andrea.json

import { readFileSync, writeFileSync } from 'node:fs';

function parseArgs(argv) {
  const args = { feature: null, json: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--feature') args.feature = argv[++i];
    else if (argv[i] === '--json') args.json = argv[++i];
  }
  if (!args.feature || !args.json) {
    throw new Error('Uso: agregar-criterios.mjs --feature <ruta.feature> --json <ruta.json>');
  }
  return args;
}

/**
 * Mapa nombre-de-escenario -> comentarios que lo anteceden.
 *
 * Solo se toman los comentarios que están justo encima del Scenario (saltando
 * líneas en blanco y de tags). Los comentarios que viven DENTRO del scenario,
 * entre pasos, no se agregan a propósito: el reporter lee los del elemento, y
 * meterlos haría que ganara el último `criterio:` de una lista que el propio
 * feature usa para documentar paso a paso.
 */
function comentariosPorEscenario(featurePath) {
  const lineas = readFileSync(featurePath, 'utf8').split(/\r?\n/);
  const mapa = new Map();

  lineas.forEach((linea, i) => {
    const m = /^\s*Scenario(?:\s+Outline)?:\s*(.+?)\s*$/.exec(linea);
    if (!m) return;
    const nombre = m[1];

    // Subir por encima del Scenario: saltear vacíos y tags.
    let j = i - 1;
    while (j >= 0 && (/^\s*$/.test(lineas[j]) || /^\s*@/.test(lineas[j]))) j -= 1;

    // Juntar el bloque de comentarios contiguo.
    const comentarios = [];
    while (j >= 0 && /^\s*#/.test(lineas[j])) {
      const c = /^\s*#\s?(.*)$/.exec(lineas[j]);
      comentarios.unshift({ line: j + 1, text: c[1] });
      j -= 1;
    }
    mapa.set(nombre, comentarios);
  });

  return mapa;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const mapa = comentariosPorEscenario(args.feature);
  const reporte = JSON.parse(readFileSync(args.json, 'utf8'));

  let agregados = 0;
  let sinCriterio = [];
  let pasos = 0;

  for (const feature of reporte) {
    for (const elemento of feature.elements ?? []) {
      if (elemento.type !== 'scenario') continue;
      const comentarios = mapa.get(elemento.name);
      if (comentarios?.length) {
        elemento.comments = comentarios;
        agregados += 1;
      } else {
        sinCriterio.push(elemento.name);
      }
      const conCriterio = (comentarios ?? []).some((c) => /criterio:\s*(.+)/.test(c.text));
      if (!conCriterio) {
        console.warn(`  aviso: el escenario "${elemento.name}" quedó sin un "# criterio:"`);
      }
      pasos += (elemento.steps ?? []).length;
    }
  }

  writeFileSync(args.json, JSON.stringify(reporte, null, 2), 'utf8');

  console.log(`Escenarios con comentarios inyectados: ${agregados}`);
  console.log(`Escenarios sin comentario previo: ${sinCriterio.length}`);
  console.log(`Total de pasos en el reporte: ${pasos}`);
  console.log(`JSON actualizado: ${args.json}`);
}

main();