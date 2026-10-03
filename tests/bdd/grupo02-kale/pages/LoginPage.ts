import type { Locator, Page } from '@playwright/test';
import { esperar, MAX_REINTENTOS_429 } from '../support/sandbox-db';

/** Pantalla /auth/login: acceso con el email de un usuario de negocio. */
export class LoginPage {
  constructor(private readonly page: Page) {}

  get email(): Locator { return this.page.getByRole('textbox', { name: 'Email', exact: true }).first(); }
  get ingresar(): Locator { return this.page.getByRole('button', { name: 'Ingresar', exact: true }); }
  /** Mensaje de error del formulario (no el anunciador de rutas de Next.js, que tambien es role=alert). */
  get error(): Locator { return this.page.getByTestId('auth-login-field-email-error'); }

  async ingresarCon(email: string): Promise<void> {
    await this.email.fill(email);
    for (let intento = 0; ; intento++) {
      await this.ingresar.click();
      // Si el sandbox responde "Rate limit exceeded" (429), se espera y se reintenta.
      const limitado = await this.error
        .filter({ hasText: /rate limit/i })
        .waitFor({ state: 'visible', timeout: 4_000 })
        .then(() => true, () => false);
      if (!limitado || intento >= MAX_REINTENTOS_429) return;
      await esperar(15);
    }
  }
}
