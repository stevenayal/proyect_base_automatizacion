import { Locator, Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object del módulo Tarjetas del sandbox AIQUAA (curso 1).
 *
 * La pantalla lista las tarjetas del sistema, permite filtrarlas por usuario y
 * ofrece las acciones Bloquear/Activar por fila. Convención de `data-testid`:
 *
 *   tarjetas-field-usuarioId        filtro por usuario
 *   tarjetas-count                  contador de resultados
 *   tarjetas-list                   tabla de resultados
 *   tarjetas-row-{id}               fila de la tarjeta {id}
 *   tarjetas-row-{id}-bloquear      acción bloquear de esa fila
 *   tarjetas-row-{id}-activar       acción activar de esa fila
 */
export class TarjetasPage extends BasePage {
  private readonly navItem: Locator;
  private readonly filtroUsuario: Locator;
  private readonly contador: Locator;
  private readonly lista: Locator;

  constructor(page: Page) {
    super(page);
    this.navItem = page.getByTestId('nav-item-tarjetas');
    this.filtroUsuario = page.getByTestId('tarjetas-field-usuarioId');
    this.contador = page.getByTestId('tarjetas-count');
    this.lista = page.getByTestId('tarjetas-list');
  }

  /** Entra al módulo desde la navegación principal. */
  async abrirDesdeNavegacion(): Promise<void> {
    await this.navItem.click();
    await this.page.waitForURL('**/tarjetas');
    await this.esperarSinRateLimit();
    await expect(this.lista).toBeVisible();
  }

  /** Filtra el listado por usuario. */
  async filtrarPorUsuario(usuarioId: string): Promise<void> {
    await this.filtroUsuario.fill(usuarioId);
    await this.esperarSinRateLimit(async () => { await this.filtroUsuario.fill(usuarioId); });
    await expect(this.contador).toBeVisible();
  }

  private fila(tarjetaId: string): Locator {
    return this.page.getByTestId(`tarjetas-row-${tarjetaId}`);
  }

  /** Aserción de que la tarjeta aparece en el listado. */
  async expectTarjetaVisible(tarjetaId: string): Promise<void> {
    await expect(this.fila(tarjetaId)).toBeVisible();
  }

  /** Aserción del estado mostrado en la fila de la tarjeta. */
  async expectEstado(tarjetaId: string, estado: string): Promise<void> {
    await expect(this.fila(tarjetaId)).toContainText(estado);
  }

  /** Bloquea la tarjeta desde su fila y espera a que el listado refleje el cambio. */
  async bloquear(tarjetaId: string): Promise<void> {
    await this.page.getByTestId(`tarjetas-row-${tarjetaId}-bloquear`).click();
    await this.expectEstado(tarjetaId, 'bloqueada');
  }

  /** Activa la tarjeta desde su fila y espera a que el listado refleje el cambio. */
  async activar(tarjetaId: string): Promise<void> {
    await this.page.getByTestId(`tarjetas-row-${tarjetaId}-activar`).click();
    await this.expectEstado(tarjetaId, 'activa');
  }

  /** Abre el detalle de la tarjeta desde su fila en el listado. */
  async abrirDetalle(tarjetaId: string): Promise<void> {
    await this.fila(tarjetaId).getByRole('link').first().click();
    await this.page.waitForURL(`**/tarjetas/${tarjetaId}`);
    await this.esperarSinRateLimit();
    await expect(this.page.getByTestId('tarjetas-detail')).toBeVisible();
  }

  /** Aserción sobre el bloque de detalle de la tarjeta. */
  async expectDetalleContiene(texto: string): Promise<void> {
    await expect(this.page.getByTestId('tarjetas-detail')).toContainText(texto);
  }

  /** Cambia la marca desde el formulario de edición del detalle y guarda. */
  async editarMarca(tarjetaId: string, marca: string): Promise<void> {
    await this.page.getByTestId('tarjetas-field-marca').selectOption(marca);
    await this.page.getByTestId(`tarjetas-row-${tarjetaId}-edit-submit`).click();
    await this.expectDetalleContiene(marca);
  }
}
