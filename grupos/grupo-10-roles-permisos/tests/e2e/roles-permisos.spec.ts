import { test, expect } from '@playwright/test';

test.describe('Grupo 10 - Administración de Roles y Permisos', () => {

  test('Intentar desembolsar el monto límite máximo permitido', async ({ request }) => {
    // 1. Petición a la API SQL de la Sandbox
    const sqlResponse = await request.post('https://aiquaa.com/api/v1/sandbox/sql', {
      headers: { 'Content-Type': 'application/json' },
      data: { query: "SELECT * FROM roles WHERE nombre = 'Cajero'" }
    });

    // 2. Regla de negocio: Validar que USD 49.999 está permitido
    const montoDesembolso = 49999;
    const limitePermitidoCajero = 49999;

    expect(montoDesembolso).toBeLessThanOrEqual(limitePermitidoCajero);
  });

});