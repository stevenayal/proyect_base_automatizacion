import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { SandboxCoursePage } from '../../../grupos/grupo-09-reportes-dashboard/playwright/pages/SandboxCoursePage';
import { SandboxLoginPage } from '../../../grupos/grupo-09-reportes-dashboard/playwright/pages/SandboxLoginPage';
import { ReportesPage } from '../../../grupos/grupo-09-reportes-dashboard/playwright/pages/ReportesPage';

// Variables de entorno (ver .env.example en la raiz del repo).
// TEST_USER: email del usuario de prueba del sandbox (login sin contraseña).
// API_URL: base de la API de movimientos.
// SANDBOX_API_KEY: x-api-key que exige la API.
const TEST_USER = process.env.TEST_USER || '';
const API_URL = process.env.API_URL || 'https://aiquaa-sandbox-api.vercel.app';
const SANDBOX_API_KEY = process.env.SANDBOX_API_KEY || '';

const TIPOS_MOVIMIENTO_VALIDOS = [
  'cargo_tarjeta',
  'compra_ecommerce',
  'pago_factura',
  'transferencia',
];

function apiHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-api-key': SANDBOX_API_KEY,
  };
}

// ---------------------------------------------------------------------
// Escenario UI: login + ver el reporte
// ---------------------------------------------------------------------

Given('el administrador inicio sesion en el sandbox de AIQUAA', async function () {
  const coursePage = new SandboxCoursePage(this.page);
  await coursePage.navigate('/auth/login');
  await coursePage.selectFirstCourseIfPresent();

  const loginPage = new SandboxLoginPage(this.page);
  await loginPage.loginWithEmail(TEST_USER);
});

When('el administrador navega al modulo de Reportes', async function () {
  this.reportesPage = new ReportesPage(this.page);
  await this.reportesPage.open();
});

Then('el sistema muestra la tabla de movimientos con al menos un resultado', async function () {
  const count = await this.reportesPage.getResultsCount();
  expect(count).toBeGreaterThan(0);
});

// ---------------------------------------------------------------------
// Escenarios API: GET movimiento activo / GET inexistente / POST crear
// Mismas dos operaciones usadas en la coleccion de Postman y en el plan
// de JMeter del grupo (Caso de Obtener siempre un movimiento Activo /
// Caso Crear Movimiento Aleatorio), reimplementadas aqui via Playwright
// APIRequestContext en vez de invocar Newman o JMeter directamente.
// ---------------------------------------------------------------------

When('el administrador solicita por API un movimiento activo existente', async function () {
  // 1. Obtener un ID de movimiento activo real (misma consulta SQL que usa
  //    la coleccion de Postman: "Obtener tipo de movimiento su ID").
  const sqlResponse = await this.page.request.post(`${API_URL}/api/v1/sql/select`, {
    headers: apiHeaders(),
    data: {
      sql: 'SELECT id FROM movimientos WHERE activo = true ORDER BY RANDOM() LIMIT 1;',
    },
  });
  expect(sqlResponse.status()).toBe(200);
  const sqlBody = await sqlResponse.json();
  const movimientoId = sqlBody.data[0].id;

  // 2. Caso de Obtener siempre un movimiento Activo: GET /movimientos/{id}
  this.lastApiResponse = await this.page.request.get(
    `${API_URL}/api/v1/movimientos/${movimientoId}`,
    { headers: apiHeaders() },
  );
});

Then('la API responde con estado {int} y los datos del movimiento', async function (expectedStatus: number) {
  expect(this.lastApiResponse.status()).toBe(expectedStatus);
  const body = await this.lastApiResponse.json();
  expect(body).toHaveProperty('data');
});

When('el administrador solicita por API el movimiento con ID {string}', async function (id: string) {
  this.lastApiResponse = await this.page.request.get(`${API_URL}/api/v1/movimientos/${id}`, {
    headers: apiHeaders(),
  });
});

Then('la API responde con un error indicando que el movimiento no existe', async function () {
  expect(this.lastApiResponse.status()).toBeGreaterThanOrEqual(400);
});

When('el administrador crea un movimiento aleatorio por API', async function () {
  const tipoMovimiento =
    TIPOS_MOVIMIENTO_VALIDOS[Math.floor(Math.random() * TIPOS_MOVIMIENTO_VALIDOS.length)];
  const monto = Math.round((Math.random() * 1000 + 1) * 100) / 100;

  // Caso Crear Movimiento Aleatorio: POST /movimientos
  // Mismo body que la coleccion de Postman (usuarioId, tipoMovimiento,
  // monto, referenciaId, descripcion).
  this.lastApiResponse = await this.page.request.post(`${API_URL}/api/v1/movimientos`, {
    headers: apiHeaders(),
    data: {
      usuarioId: 1,
      tipoMovimiento,
      monto,
      referenciaId: 1,
      descripcion: '',
    },
  });
});

Then('la API responde confirmando la creacion del movimiento', async function () {
  expect(this.lastApiResponse.status()).toBe(201);
  const body = await this.lastApiResponse.json();
  expect(body).toHaveProperty('data');
  expect(body.data).toHaveProperty('id');
});
