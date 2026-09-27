import type { Locator, Page } from '@playwright/test';
import { esperar, MAX_REINTENTOS_429 } from '../support/sandbox-db';

/**
 * /transferencias: formulario "Nueva transferencia" + lista.
 * Selectores por data-testid (convencion {modulo}-{elemento} del sandbox).
 */
export class TransferenciasPage {
  constructor(private readonly page: Page) {}

  get form(): Locator { return this.page.getByTestId('transferencias-form'); }
  get origen(): Locator { return this.page.getByTestId('transferencias-field-cuentaOrigenId'); }
  get destino(): Locator { return this.page.getByTestId('transferencias-field-cuentaDestinoId'); }
  get monto(): Locator { return this.page.getByTestId('transferencias-field-monto'); }
  get descripcion(): Locator { return this.page.getByTestId('transferencias-field-descripcion'); }
  get transferir(): Locator { return this.page.getByTestId('transferencias-submit'); }
  get error(): Locator { return this.page.getByTestId('transferencias-field-cuentaOrigenId-error'); }
  get filtroOrigen(): Locator { return this.page.getByTestId('transferencias-field-filtroCuentaOrigenId'); }
  get lista(): Locator { return this.page.getByTestId('transferencias-list'); }
  fila(id: number | string): Locator { return this.page.getByTestId(`transferencias-row-${id}`); }

  async abrir(): Promise<void> {
    await this.page.goto('/transferencias');
    await this.form.waitFor({ state: 'visible' });
  }

  async completar(datos: { origen: string | number; destino: string | number; monto: string | number; descripcion?: string }): Promise<void> {
    await this.origen.fill(String(datos.origen));
    await this.destino.fill(String(datos.destino));
    await this.monto.fill(String(datos.monto));
    if (datos.descripcion) await this.descripcion.fill(datos.descripcion);
  }

  async enviar(): Promise<void> {
    for (let intento = 0; ; intento++) {
      await this.transferir.click();
      // Si el sandbox responde "Rate limit exceeded" (429), se espera y se reintenta.
      const limitado = await this.error
        .filter({ hasText: /rate limit/i })
        .waitFor({ state: 'visible', timeout: 4_000 })
        .then(() => true, () => false);
      if (!limitado || intento >= MAX_REINTENTOS_429) return;
      await esperar(15);
    }
  }

  async filtrarPorOrigen(id: string | number): Promise<void> {
    await this.filtroOrigen.fill(String(id));
  }
}
