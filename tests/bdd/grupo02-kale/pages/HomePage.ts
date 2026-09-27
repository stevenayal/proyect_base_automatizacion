import type { Locator, Page } from '@playwright/test';

/** Home del sandbox luego de iniciar sesion. */
export class HomePage {
  constructor(private readonly page: Page) {}

  bienvenida(nombre: string): Locator {
    return this.page.getByRole('heading', { level: 1, name: `Bienvenido, ${nombre}` });
  }
}
