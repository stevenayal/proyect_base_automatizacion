// SandboxLoginPage — acceso al sandbox con email (sin contraseña).

import { expect, type Page } from '@playwright/test';

export class SandboxLoginPage {
  constructor(private readonly page: Page) {}

  get campoEmail() {
    return this.page.getByRole('textbox', { name: 'Email', exact: true });
  }

  get botonIngresar() {
    return this.page.getByRole('button', { name: 'Ingresar', exact: true });
  }

  async ingresarCon(email: string): Promise<void> {
    await this.campoEmail.fill(email);
    await this.botonIngresar.click();
  }

  /**
   * El front confirma el acceso con un encabezado de bienvenida. Vive acá, y no
   * en el step, para que este POM sea el unico dueño del locator de la pantalla.
   */
  async expectBienvenida(nombre: string): Promise<void> {
    await expect(this.page.getByRole('heading', { name: `Bienvenido, ${nombre}` })).toBeVisible();
  }
}