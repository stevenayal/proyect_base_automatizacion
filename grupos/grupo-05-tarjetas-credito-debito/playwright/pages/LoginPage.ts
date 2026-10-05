import { Locator, Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object del acceso al sandbox AIQUAA
 * (https://aiquaa-sandbox-web.vercel.app/).
 *
 * Flujo real del sitio:
 *   `/` → `/curso` (selección de curso) → `/auth/login` (formulario de email).
 *
 * El login es sin contraseña: se envía únicamente el email de un cliente
 * seedeado del curso elegido. Todos los locators se resuelven por
 * `data-testid`, el único selector estable del front.
 */
export class LoginPage extends BasePage {
  /** Pantalla previa de selección de curso. */
  private readonly cursoForm: Locator;
  private readonly cursoSubmit: Locator;

  /** Formulario de login propiamente dicho. */
  private readonly form: Locator;
  private readonly emailInput: Locator;
  private readonly submitButton: Locator;
  private readonly emailError: Locator;

  constructor(page: Page) {
    super(page);
    this.cursoForm = page.getByTestId('curso-form');
    this.cursoSubmit = page.getByTestId('curso-submit');
    this.form = page.getByTestId('auth-login-form');
    this.emailInput = page.getByTestId('auth-login-field-email');
    this.submitButton = page.getByTestId('auth-login-submit');
    this.emailError = page.getByTestId('auth-login-field-email-error');
  }

  /**
   * Abre el login. Si el sandbox presenta la pantalla de selección de curso,
   * la resuelve con el curso indicado antes de continuar.
   *
   * @param curso número de curso del sandbox ("1" automatización, "2" productos bancarios)
   */
  async open(curso: string = process.env.SANDBOX_CURSO ?? '2'): Promise<void> {
    await this.navigate('/');
    // La app es Next.js: `/` redirige del lado del cliente, así que hay que
    // esperar a que aparezca alguna de las dos pantallas antes de decidir.
    await this.cursoForm.or(this.form).first().waitFor({ state: 'visible' });
    if (await this.cursoForm.isVisible()) {
      await this.selectCurso(curso);
    }
    await expect(this.form).toBeVisible();
  }

  /** Elige un curso en la pantalla previa y confirma. */
  async selectCurso(curso: string): Promise<void> {
    await this.page.getByTestId(`curso-option-${curso}`).check();
    await this.cursoSubmit.click();
    await this.page.waitForURL('**/auth/login');
  }

  /** Escribe el email en el campo correspondiente. */
  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  /** Envía el formulario. */
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /** Flujo completo: escribir email y enviar. */
  async loginWith(email: string): Promise<void> {
    await this.fillEmail(email);
    await this.submit();
  }

  /** Aserción de que la sesión quedó iniciada: la navegación muestra al usuario. */
  async expectSesionIniciada(): Promise<void> {
    await expect(this.page.getByTestId('nav-usuario')).toBeVisible();
  }

  /** Indica si el botón "Ingresar" está habilitado. */
  async isSubmitEnabled(): Promise<boolean> {
    return this.submitButton.isEnabled();
  }

  /** Texto del mensaje de error de email; espera a que aparezca. */
  async getEmailErrorText(): Promise<string> {
    await expect(this.emailError).toBeVisible();
    return (await this.emailError.textContent())?.trim() ?? '';
  }

  /** Aserción de que el botón de envío está deshabilitado. */
  async expectSubmitDisabled(): Promise<void> {
    await expect(this.submitButton).toBeDisabled();
  }

  /** Aserción de que el mensaje de error contiene el texto esperado. */
  async expectEmailError(texto: string): Promise<void> {
    await expect(this.emailError).toBeVisible();
    await expect(this.emailError).toContainText(texto);
  }
}
