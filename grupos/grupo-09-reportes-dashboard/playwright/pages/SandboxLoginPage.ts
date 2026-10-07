import { BasePage } from '../../../../playwright/pages/BasePage';

/**
 * Pantalla de login del sandbox: solo pide email (no contraseña).
 */
export class SandboxLoginPage extends BasePage {
  async loginWithEmail(email: string): Promise<void> {
    const emailInput = this.page
      .locator(
        [
          "input[type='email']",
          "input[name='email']",
          "input[placeholder*='correo' i]",
          "input[placeholder*='email' i]",
        ].join(', '),
      )
      .first();

    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill(email);

    const submitButton = this.page.getByRole('button', { name: /ingresar/i }).first();
    await submitButton.click();
  }
}
