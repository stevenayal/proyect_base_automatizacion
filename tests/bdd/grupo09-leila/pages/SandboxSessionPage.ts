import { expect, type Page } from '@playwright/test';

/**
 * Curso + login del sandbox. El login solo pide el email de un usuario activo.
 * Es idempotente: si ya hay sesion, no hace nada.
 */
export class SandboxSessionPage {
  constructor(private readonly page: Page) {}

  private needsLogin(): boolean {
    return /\/(curso|auth\/login)/.test(this.page.url());
  }

  async ensureLoggedIn(email: string): Promise<void> {
    await this.page.goto('/');
    // La redireccion a /curso o /auth/login puede ocurrir del lado del cliente:
    // esperamos a que aparezca la sesion (boton "Cerrar sesion") o el login.
    await Promise.race([
      this.page.waitForURL(/\/(curso|auth\/login)/, { timeout: 10_000 }),
      this.page.getByRole('button', { name: 'Cerrar sesión' }).waitFor({ timeout: 10_000 }),
    ]).catch(() => undefined);
    if (!this.needsLogin()) return;

    if (this.page.url().includes('/curso')) {
      await this.page.getByRole('radio').first().check();
      await Promise.all([
        this.page.waitForURL(/\/auth\/login/),
        this.page.getByRole('button', { name: 'Continuar', exact: true }).click(),
      ]);
    }

    await this.page.getByRole('textbox', { name: 'Email', exact: true }).fill(email);
    await this.page.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await expect(this.page).not.toHaveURL(/\/auth\/login/, { timeout: 15_000 });
  }
}
