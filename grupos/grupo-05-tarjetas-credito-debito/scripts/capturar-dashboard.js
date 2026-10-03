#!/usr/bin/env node
/**
 * Captura un dashboard de monitoreo (Grafana) como evidencia de la corrida de
 * performance, para incrustarla en el informe PDF vía `--evidence-image`.
 *
 * Usa Playwright, que ya es dependencia del repositorio, en lugar del script
 * Selenium que trae el MCP server: evita sumar Python + chromedriver al runner
 * y reutiliza el Chromium que la suite de UI ya instala.
 *
 * Uso:
 *   node capturar-dashboard.js --url <dashboard> --output <archivo.png>
 *                              [--wait-seconds 8] [--width 1440] [--height 1100]
 *                              [--timeout-seconds 180] [--full-page]
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const actual = argv[i];
    if (!actual.startsWith('--')) continue;
    const clave = actual.slice(2);
    const siguiente = argv[i + 1];
    if (siguiente === undefined || siguiente.startsWith('--')) {
      args[clave] = 'true';
    } else {
      args[clave] = siguiente;
      i += 1;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = args.url;
  const output = args.output;

  if (!url || !output) {
    console.error('Uso: capturar-dashboard.js --url <dashboard> --output <archivo.png>');
    process.exit(2);
  }

  const width = Number(args.width ?? 1440);
  const height = Number(args.height ?? 1100);
  // Por defecto se captura el viewport: un fullPage de Grafana arrastra el
  // fondo vacío bajo los paneles y el panel queda diminuto en el PDF.
  const fullPage = args['full-page'] === 'true';
  const esperaMs = Number(args['wait-seconds'] ?? 8) * 1000;
  const timeoutMs = Number(args['timeout-seconds'] ?? 180) * 1000;

  fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });

  const navegador = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    const pagina = await navegador.newPage({ viewport: { width, height } });
    pagina.setDefaultTimeout(timeoutMs);

    await pagina.goto(url, { waitUntil: 'load', timeout: timeoutMs });

    // Los paneles de Grafana se pintan después del load: se espera a que la red
    // se calme y, si no se calma (streaming, refresh automático), se continúa.
    await pagina.waitForLoadState('networkidle', { timeout: timeoutMs }).catch(() => {
      console.warn('La red no quedó inactiva; se captura igual.');
    });
    await pagina.waitForTimeout(esperaMs);

    await pagina.screenshot({ path: output, fullPage });
    console.log(`Evidencia de monitoreo guardada en ${output}`);
  } finally {
    await navegador.close();
  }
}

main().catch((error) => {
  console.error(`No se pudo capturar el dashboard: ${error.message}`);
  process.exit(1);
});
