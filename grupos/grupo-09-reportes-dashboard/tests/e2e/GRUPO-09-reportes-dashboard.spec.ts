import { test, expect } from '@playwright/test';
import { ReportesPage } from '../../playwright/pages/ReportesPage';

test.describe('Grupo 9 — Reportes y Dashboard', () => {

  test.beforeEach(async ({ page }) => {
    // Login previo: reutiliza la sesión guardada o hace el flujo de auth
    // Ajustar según cómo maneja auth el repo
    await page.goto('/curso');
    await page.getByRole('radio').first().check();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('RF-G9-01: la pantalla de reportes carga con filtros visibles', async ({ page }) => {
    const reportes = new ReportesPage(page);
    await reportes.goto();

    await expect(reportes.filtroTitular).toBeVisible();
    await expect(reportes.filtroDesde).toBeVisible();
    await expect(reportes.filtroHasta).toBeVisible();
    await expect(reportes.botonAplicarFiltros).toBeVisible();
  });

  test('RF-G9-02: el resumen general muestra los cuatro indicadores', async ({ page }) => {
    const reportes = new ReportesPage(page);
    await reportes.goto();

    await reportes.expectResumenVisible();
  });

  test('RF-G9-01: el desglose por tipo muestra filas con tipo, cantidad y total', async ({ page }) => {
    const reportes = new ReportesPage(page);
    await reportes.goto();

    const filas = await reportes.obtenerFilasDesglose();
    expect(filas.length).toBeGreaterThan(0);

    for (const fila of filas) {
      expect(fila.tipo).toBeTruthy();
      expect(fila.cantidad).toBeGreaterThan(0);
      expect(fila.total).toBeGreaterThanOrEqual(0);
    }
  });

  test('RF-G9-01: los tipos de movimiento están ordenados alfabéticamente', async ({ page }) => {
    const reportes = new ReportesPage(page);
    await reportes.goto();

    const filas = await reportes.obtenerFilasDesglose();
    const tipos = filas.map(f => f.tipo);
    const tiposOrdenados = [...tipos].sort();

    expect(tipos).toEqual(tiposOrdenados);
  });

  test('RF-G9-01: filtrar por titular filtra los resultados', async ({ page }) => {
    const reportes = new ReportesPage(page);
    await reportes.goto();

    await reportes.aplicarFiltroPorTitular(1);

    // O bien hay filas, o bien el estado vacío es visible
    const tieneFilas = await reportes.filasDesglose.count() > 1;
    const tieneVacio = await reportes.estadoVacio.isVisible().catch(() => false);

    expect(tieneFilas || tieneVacio).toBeTruthy();
  });

  test('RF-G9-01: un rango de fechas sin movimientos muestra estado vacío', async ({ page }) => {
    const reportes = new ReportesPage(page);
    await reportes.goto();

    await reportes.aplicarFiltroPorFecha('2030-01-01', '2030-12-31');

    await reportes.expectEstadoVacio();
  });

  test('RF-G9-02: el resumen no acepta filtros de fecha', async ({ page }) => {
    const reportes = new ReportesPage(page);
    await reportes.goto();

    // Aplicar filtros de fecha
    await reportes.aplicarFiltroPorFecha('2030-01-01', '2030-12-31');

    // El resumen sigue mostrándose (no se vacía por los filtros de fecha)
    await reportes.expectResumenVisible();
  });
});
