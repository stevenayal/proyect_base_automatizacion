// SandboxCursoPage — selección del curso en /curso.
//
// Locators verificados contra el DOM real del sandbox el 2026-10-02
// (smoke test tests/bdd/_smoke-locators.mjs). El front es Next.js client-side:
// estos locators no se pueden confirmar por HTTP, hacen falta navegador.

import type { Page } from '@playwright/test';

export class SandboxCursoPage {
  constructor(private readonly page: Page) {}

  /**
   /curso → elige el curso de automatización → Continuar → /auth/login.
   * El sandbox no pide contraseña: el login es solo con email.
   */
  async elegirCursoAutomatizacion(): Promise<void> {
    await this.page.goto('/curso');
    await this.page.getByRole('radio', { name: /Curso 1 · Automatización/i }).check();
    await Promise.all([
      this.page.waitForURL(/\/auth\/login/, { timeout: 20_000 }),
      this.page.getByRole('button', { name: 'Continuar', exact: true }).click(),
    ]);
  }
}