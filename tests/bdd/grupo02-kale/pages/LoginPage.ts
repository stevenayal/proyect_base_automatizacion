import type { Locator, Page } from '@playwright/test';

/** Pantalla /auth/login: acceso con el email de un usuario de negocio. */
export class LoginPage {
  constructor(private readonly page: Page) {}

  get email(): Locator { return this.page.getByRole('textbox', { name: 'Email', exact: true }).first(); }
  get ingresar(): Locator { return this.page.getByRole('button', { name: 'Ingresar', exact: true }); }
  get error(): Locator { return this.page.getByRole('alert').first(); }

  async ingresarCon(email: string): Promise<void> {
    await this.email.fill(email);
    await this.ingresar.click();
  }
}
