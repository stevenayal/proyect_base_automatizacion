import { Page, expect } from '@playwright/test';

export const SANDBOX_ORIGIN = 'https://aiquaa-sandbox-web.vercel.app';
const LOGIN_ENDPOINT = `${SANDBOX_ORIGIN}/api/proxy/auth/login`;

export class SandboxLoginPage {
  readonly loginRequests: { email?: string; status?: number; error?: string }[] = [];
  private email = '';
  private authenticatedUser?: { email: string; nombre: string; activo: boolean };

  constructor(private readonly page: Page) {
    page.on('request', request => {
      if (request.url() === LOGIN_ENDPOINT && request.method() === 'POST') {
        this.loginRequests.push({ email: request.postDataJSON()?.email });
      }
    });
  }

  async navigate(): Promise<void> {
    await this.page.goto(`${SANDBOX_ORIGIN}/auth/login`);
    await expect(this.page.getByTestId('curso-form')).toBeVisible();
  }

  async selectCurso(curso: string): Promise<void> {
    expect(curso.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()).toBe('automatizacion');
    await expect(this.page.getByTestId('curso-row-1')).toContainText('Automatización');
    await this.page.getByTestId('curso-option-1').check();
  }

  async clickContinuar(): Promise<void> {
    await this.page.getByTestId('curso-submit').click();
    await expect(this.page).toHaveURL(`${SANDBOX_ORIGIN}/auth/login`);
    await expect(this.page.getByTestId('auth-login-field-email')).toBeVisible();
    await expect(this.page.locator('input[type="password"]')).toHaveCount(0);
  }

  async fillEmail(email: string): Promise<void> {
    this.email = email;
    await this.page.getByTestId('auth-login-field-email').fill(email);
  }

  async submit(): Promise<void> {
    const [response] = await Promise.all([
      this.page.waitForResponse(r => r.url() === LOGIN_ENDPOINT && r.request().method() === 'POST'),
      this.page.getByTestId('auth-login-submit').click(),
    ]);
    expect(response.request().postDataJSON()).toEqual({ email: this.email });
    const record = this.loginRequests[this.loginRequests.length - 1];
    expect(record, 'Debe observarse el POST real de login').toBeDefined();
    record.status = response.status();
    const body = await response.json();
    if (typeof body?.error?.message === 'string') record.error = body.error.message;
    if (response.ok()) {
      this.authenticatedUser = body?.data;
      // Esperar la interfaz autenticada, además de la respuesta HTTP.
      await expect(this.page.getByRole('button', { name: 'Cerrar sesión', exact: true })).toBeVisible();
    } else {
      await expect(this.page.getByTestId('auth-login-field-email-error')).toBeVisible();
    }
  }

  async assertAuthenticated(): Promise<void> {
    const response = this.loginRequests[this.loginRequests.length - 1];
    expect(response?.status, 'El login debe responder HTTP 200').toBe(200);
    expect(this.authenticatedUser?.email).toBe(this.email);
    expect(this.authenticatedUser?.activo).toBe(true);
    expect(this.authenticatedUser?.nombre).toBeTruthy();
  }

  async assertOnHomeWithSession(): Promise<void> {
    await this.assertAuthenticated();
    await expect(this.page).toHaveURL(`${SANDBOX_ORIGIN}/`);
    await expect(this.page.getByRole('button', { name: 'Cerrar sesión', exact: true })).toBeVisible();
    await expect(this.page.getByText(`Bienvenido, ${this.authenticatedUser!.nombre}`, { exact: true })).toBeVisible();
    await expect(this.page.getByTestId('auth-login-form')).toHaveCount(0);
  }

  async assertError(): Promise<void> {
    const response = this.loginRequests[this.loginRequests.length - 1];
    expect(response?.status, 'El escenario exige error HTTP; un login exitoso no satisface el feature').toBeGreaterThanOrEqual(400);
    expect(response?.status).toBeLessThan(600);
    expect(response?.error, 'La respuesta debe contener un mensaje de error').toBeTruthy();
    await expect(this.page.getByTestId('auth-login-field-email-error')).toHaveText(response.error!);
  }

  async assertOnLogin(): Promise<void> {
    await expect(this.page).toHaveURL(`${SANDBOX_ORIGIN}/auth/login`);
    await expect(this.page.getByTestId('auth-login-form')).toBeVisible();
  }

  async submitEmpty(): Promise<void> {
    await expect(this.page.getByTestId('auth-login-field-email')).toHaveValue('');
    // El control deshabilitado no se fuerza: su estado es la validación real del frontend.
    await expect(this.page.getByTestId('auth-login-submit')).toBeDisabled();
    await this.assertSubmissionPrevented();
  }

  async assertSubmissionPrevented(): Promise<void> {
    await expect(this.page.getByTestId('auth-login-submit')).toBeDisabled();
    expect(this.loginRequests, 'No debe existir POST de login con email vacío').toHaveLength(0);
    await this.assertOnLogin();
  }
}
