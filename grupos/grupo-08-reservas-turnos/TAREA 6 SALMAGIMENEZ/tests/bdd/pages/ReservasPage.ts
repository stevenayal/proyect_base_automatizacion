import { expect, type Page } from '@playwright/test';

export class ReservasPage {
  constructor(private readonly page: Page) {}

  async abrirAgenda(): Promise<void> {
    await this.page.goto('/reservas');
    await expect(this.page).toHaveURL(/\/reservas/);
  }

  async abrirNuevaReserva(): Promise<void> {
    await this.page.goto('/reservas/new');
    await expect(this.page).toHaveURL(/\/reservas\/new/);
  }

  async verificarAgendaVisible(): Promise<void> {
    await expect(
      this.page.getByRole('heading', { name: /agenda|reservas/i })
    ).toBeVisible();
  }

  async verificarDatosReserva(): Promise<void> {
    await expect(this.page.getByText(/pendiente|confirmada|cancelada/i).first())
      .toBeVisible();
  }

  async crearReserva(
    titular: string,
    servicio: string,
    fechaHora: string,
    notas: string
  ): Promise<void> {
    await this.abrirNuevaReserva();

    await this.page.getByLabel(/titular/i).selectOption(titular);
    await this.page.getByLabel(/servicio/i).fill(servicio);
    await this.page.getByLabel(/fecha.*hora/i).fill(fechaHora);
    await this.page.getByLabel(/notas/i).fill(notas);

    await this.page.getByRole('button', {
      name: /crear|reservar|guardar/i
    }).click();
  }

  async verificarReservaRechazada(): Promise<void> {
    await expect(
      this.page.getByText(/error|inválid|no.*permit|rechaz/i)
    ).toBeVisible();
  }
}
