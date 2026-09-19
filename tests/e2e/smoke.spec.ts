import { test, expect } from '@playwright/test';

async function elegirCursoDeAutomatizacion(page: import('@playwright/test').Page) {
  await page.goto('/curso');
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page).toHaveURL(/\/auth\/login/);
}

test.describe('Smoke — AIQUAA', () => {
  test('la selección de curso se muestra correctamente', async ({ page }) => {
    await page.goto('/curso');

    await expect(page.getByRole('heading')).toBeVisible();
    await expect(page.getByRole('button').first()).toBeVisible();
  });

  test('un curso lleva al inicio de sesión', async ({ page }) => {
    await elegirCursoDeAutomatizacion(page);
    await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
  });

  test('el inicio de sesión del laboratorio muestra el formulario', async ({ page }) => {
    await elegirCursoDeAutomatizacion(page);
    await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible();
  });
});
