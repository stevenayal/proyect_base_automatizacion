import { test, expect, request } from '@playwright/test';
import { LoginPage } from '../../../../playwright/pages/LoginPage';
import { TarjetasPage } from '../../../../playwright/pages/TarjetasPage';

/**
 * Smoke UI del módulo Tarjetas (Grupo 05).
 *
 * Cubre el flujo mínimo de punta a punta contra el sandbox real:
 * login → módulo Tarjetas → filtrado por usuario → detalle de una tarjeta
 * creada por API para este test (los ids sembrados cambian entre corridas).
 *
 * Los escenarios BDD equivalentes viven en
 * `grupos/grupo-05-tarjetas-credito-debito/features/tarjetas-credito-debito.feature`.
 */

const API_URL = process.env.API_URL || 'https://aiquaa-sandbox-api.vercel.app';
const API_KEY = process.env.SANDBOX_API_KEY || '';
const USUARIO_ID = process.env.SANDBOX_USUARIO_ID || '1';
const EMAIL_CLIENTE = process.env.SANDBOX_EMAIL_CLIENTE || 'bruno.ramirez@example.com';

test.describe('Grupo 05 — Tarjetas de Crédito/Débito', () => {
  test.skip(!API_KEY, 'requiere SANDBOX_API_KEY en .env');

  let tarjetaId: string;

  test.beforeAll(async () => {
    const api = await request.newContext({
      baseURL: API_URL,
      extraHTTPHeaders: { 'x-api-key': API_KEY },
    });
    const respuesta = await api.post('/api/v1/tarjetas', {
      data: { usuarioId: Number(USUARIO_ID), tipo: 'credito', marca: 'visa' },
    });
    expect(respuesta.status(), 'no se pudo sembrar la tarjeta de prueba').toBe(201);
    tarjetaId = (await respuesta.json()).data.id;
    await api.dispose();
  });

  test('el cliente consulta su tarjeta en el listado y abre su detalle', async ({ page }) => {
    const login = new LoginPage(page);
    await login.open('1');
    await login.loginWith(EMAIL_CLIENTE);
    await login.expectSesionIniciada();

    const tarjetas = new TarjetasPage(page);
    await tarjetas.abrirDesdeNavegacion();
    await tarjetas.filtrarPorUsuario(USUARIO_ID);
    await tarjetas.expectTarjetaVisible(tarjetaId);
    await tarjetas.expectEstado(tarjetaId, 'activa');

    await tarjetas.abrirDetalle(tarjetaId);
    await tarjetas.expectDetalleContiene('credito');
    await tarjetas.expectDetalleContiene('visa');
  });
});
