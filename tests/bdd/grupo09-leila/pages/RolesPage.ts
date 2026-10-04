import type { Locator, Page } from '@playwright/test';

/** Modulo Roles (/roles): roles de un usuario con estado Asignado / Sin asignar. */
export class RolesPage {
  constructor(private readonly page: Page) {}

  get title(): Locator { return this.page.getByRole('heading', { level: 1 }); }
  get rows(): Locator { return this.page.locator('[data-testid^="roles-row-"]').filter({ has: this.page.locator('td') }); }

  rowForRole(roleId: string | number): Locator {
    return this.page.getByTestId(`roles-row-${roleId}`);
  }

  async open(): Promise<void> {
    await this.page.goto('/roles');
  }

  async searchUser(usuarioId: string | number): Promise<void> {
    await this.page.getByTestId('roles-field-usuarioId').fill(String(usuarioId));
    await this.page.getByTestId('roles-list').waitFor({ state: 'visible' });
  }

  async statusOf(roleId: string | number): Promise<string> {
    return (await this.rowForRole(roleId).locator('td').nth(2).innerText()).trim();
  }
}
