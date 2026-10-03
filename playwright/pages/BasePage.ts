import { Page } from '@playwright/test';

/**
 * Clase base para todos los Page Objects del proyecto.
 * Extender esta clase en cada página específica.
 *
 * Ejemplo:
 *   export class LoginPage extends BasePage {
 *     async fillEmail(email: string) { ... }
 *   }
 */
export class BasePage {
  constructor(protected readonly page: Page) {}

  /** Navega a una ruta relativa a BASE_URL. */
  async navigate(path: string = '/'): Promise<void> {
    await this.page.goto(path);
  }

  /** Devuelve el título de la página actual. */
  async getTitle(): Promise<string> {
    return this.page.title();
  }

  /** Espera a que la red esté inactiva (útil tras navegación). */
  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }
}
