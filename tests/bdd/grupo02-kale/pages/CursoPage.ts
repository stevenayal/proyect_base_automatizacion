import type { Page } from '@playwright/test';

/** Pantalla /curso: elegir el curso antes de iniciar sesion. */
export class CursoPage {
  constructor(private readonly page: Page) {}

  async elegirCursoAutomatizacion(): Promise<void> {
    await this.page.goto('/curso');
    await this.page.getByTestId('curso-option-1').check();
    await Promise.all([
      this.page.waitForURL(/\/auth\/login/),
      this.page.getByRole('button', { name: 'Continuar', exact: true }).click(),
    ]);
  }
}
