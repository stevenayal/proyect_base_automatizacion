// run-newman.cjs — corre la coleccion Postman del Grupo 06 en local, igual que el CI
// (.github/workflows/postman-grupo06-regression.yml), leyendo la API key desde .env.
//
// Uso: npm run test:api:grupo06
// Requiere en .env: GRUPO06_API_KEY (opcionales: GRUPO06_BASE_URL, GRUPO06_DELAY_MS).
// Delay por defecto 5000 ms: la API limita a 30 req/min por API key (compartida entre
// grupos) y cada consulta SQL de los scripts cuenta contra esa misma cuota.

const path = require('path');
const newman = require('newman');
require('dotenv').config({ quiet: true });

const root = path.resolve(__dirname, '../../..');
const apiKey = process.env.GRUPO06_API_KEY;

if (!apiKey) {
  console.error('Falta GRUPO06_API_KEY en .env (ver .env.example).');
  process.exit(1);
}

const envVar = [{ key: 'apiKey', value: apiKey }];
if (process.env.GRUPO06_BASE_URL) {
  envVar.push({ key: 'baseUrl', value: process.env.GRUPO06_BASE_URL });
}

newman.run(
  {
    collection: path.join(root, 'postman/grupo-06-notificaciones-alertas.postman_collection.json'),
    environment: path.join(root, 'postman/grupo-06-aiquaa.postman_environment.json'),
    envVar,
    delayRequest: Number(process.env.GRUPO06_DELAY_MS) || 5000,
    reporters: ['cli', 'json'],
    reporter: { json: { export: path.join(root, 'newman/results.json') } },
  },
  (err, summary) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    process.exit(summary.run.failures.length ? 1 : 0);
  },
);
