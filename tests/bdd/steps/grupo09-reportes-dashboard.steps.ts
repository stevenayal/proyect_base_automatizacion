import { Given, When, Then, setDefaultTimeout } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

// El login (navegar + detectar pantalla de curso + completar email) puede
// tardar mas que el timeout por defecto de Cucumber (5s), especialmente en
// la primera carga de la SPA. Lo subimos a 20s para este set de steps.
setDefaultTimeout(90 * 1000);
import { SandboxCoursePage } from '../../../grupos/grupo-09-reportes-dashboard/playwright/pages/SandboxCoursePage';
import { SandboxLoginPage } from '../../../grupos/grupo-09-reportes-dashboard/playwright/pages/SandboxLoginPage';
import { ReportesPage } from '../../../grupos/grupo-09-reportes-dashboard/playwright/pages/ReportesPage';

// Variables de entorno (ver .env.example en la raiz del repo).
// TEST_USER: email del usuario de prueba del sandbox (login sin contraseña).
// API_URL: base de la API de movimientos.
// SANDBOX_API_KEY: x-api-key que exige la API.
//
// IMPORTANTE: se leen con funciones (no como const al tope del archivo),
// porque la inyeccion de .env puede ocurrir despues de que Cucumber haga
// require() de este archivo. Leerlas en el momento de cada step asegura
// que ya esten disponibles.
function getTestUser(): string {
  return process.env.TEST_USER || '';
}

function getApiUrl(): string {
  return process.env.API_URL || 'https://aiquaa-sandbox-api.vercel.app';
}

function getApiKey(): string {
  return process.env.SANDBOX_API_KEY || '';
}

const TIPOS_MOVIMIENTO_VALIDOS = [
  'cargo_tarjeta',
  'compra_ecommerce',
  'pago_factura',
  'transferencia',
];

function apiHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-api-key': getApiKey(),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * La API de sandbox usa una api-key de demo compartida por todo el curso,
 * asi que es comun recibir 429 (Too Many Requests) cuando varios pipelines
 * corren en paralelo. Reintenta con backoff antes de dar el fallo por bueno.
 */
async function requestWithRetry(
  doRequest: () => Promise<any>,
  maxAttempts: number = 6,
): Promise<any> {
  let lastResponse: any;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    lastResponse = await doRequest();
    if (lastResponse.status() !== 429) {
      return lastResponse;
    }
    const waitMs = Math.min(attempt * 3000, 15000); // 3s, 6s, 9s, 12s, 15s, 15s
    await sleep(waitMs);
  }
  return lastResponse;
}

// ---------------------------------------------------------------------
// Escenario UI: login + ver el reporte
// ---------------------------------------------------------------------

Given('el administrador inicio sesion en el sandbox de AIQUAA', async function () {
  const coursePage = new SandboxCoursePage(this.page);
  await coursePage.navigate('/auth/login');
  await coursePage.selectFirstCourseIfPresent();

  const loginPage = new SandboxLoginPage(this.page);
  await loginPage.loginWithEmail(getTestUser());
});

When('el administrador navega al modulo de Reportes', async function () {
  this.reportesPage = new ReportesPage(this.page);
  await this.reportesPage.open();
});

Then('el sistema muestra la tabla de movimientos con al menos un resultado', async function () {
  // El backend puede estar momentaneamente rate-limitado (misma api-key
  // compartida por todo el curso); reintentamos unas veces antes de fallar.
  let count = 0;
  for (let attempt = 1; attempt <= 4; attempt++) {
    count = await this.reportesPage.getResultsCount();
    if (count > 0) break;
    await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
    await this.reportesPage.open();
  }
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
  // Usamos un ID fijo conocido (el mismo rango 1-70 que usa el CSV de datos
  // del plan de JMeter del grupo) en vez de hacer una consulta SQL previa
  // para buscar uno al azar. Esto evita una segunda llamada a la API
  // compartida por todo el curso, reduciendo la chance de rate limit (429).
  const movimientoId = 1;

  // Caso de Obtener siempre un movimiento Activo: GET /movimientos/{id}
  this.lastApiResponse = await requestWithRetry(() =>
    this.page.request.get(`${getApiUrl()}/api/v1/movimientos/${movimientoId}`, {
      headers: apiHeaders(),
    }),
  );
});

Then('la API responde con estado {int} y los datos del movimiento', async function (expectedStatus: number) {
  expect(this.lastApiResponse.status()).toBe(expectedStatus);
  const body = await this.lastApiResponse.json();
  expect(body).toHaveProperty('data');
});

When('el administrador solicita por API el movimiento con ID {string}', async function (id: string) {
  this.lastApiResponse = await requestWithRetry(() =>
    this.page.request.get(`${getApiUrl()}/api/v1/movimientos/${id}`, {
      headers: apiHeaders(),
    }),
  );
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
  this.lastApiResponse = await requestWithRetry(() =>
    this.page.request.post(`${getApiUrl()}/api/v1/movimientos`, {
      headers: apiHeaders(),
      data: {
        usuarioId: 1,
        tipoMovimiento,
        monto,
        referenciaId: 1,
        descripcion: '',
      },
    }),
  );
});

Then('la API responde confirmando la creacion del movimiento', async function () {
  expect(this.lastApiResponse.status()).toBe(201);
  const body = await this.lastApiResponse.json();
  expect(body).toHaveProperty('data');
  expect(body.data).toHaveProperty('id');
});
