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

  /**
   * El sandbox limita a 30 peticiones por minuto y, al excederlas, renderiza
   * "Rate limit exceeded" en lugar de los datos. Espera y recarga hasta que la
   * pantalla vuelva a traer contenido.
   *
   * @param reaplicarFiltros callback opcional para rehacer lo que la recarga borra
   */
  async esperarSinRateLimit(reaplicarFiltros?: () => Promise<void>): Promise<void> {
    const espera = Number(process.env.RATE_LIMIT_WAIT_MS ?? 20000);
    for (let intento = 0; intento < 3; intento++) {
      const contenido = await this.page.locator('body').innerText();
      if (!contenido.includes('Rate limit exceeded')) return;
      await this.page.waitForTimeout(espera);
      await this.page.reload();
      await reaplicarFiltros?.();
    }
    throw new Error('El sandbox sigue respondiendo "Rate limit exceeded" tras 3 intentos');
  }

  /** Espera a que la red esté inactiva (útil tras navegación). */
  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }
}
