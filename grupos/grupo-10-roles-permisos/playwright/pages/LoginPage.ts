import { BasePage } from '../../../../playwright/pages/BasePage';
import { CursoPage } from './CursoPage';

/** Pantalla de ingreso del sandbox (solo email, sin contraseña). */
export class LoginPage extends BasePage {
  get campoEmail() {
    return this.page.getByTestId('auth-login-field-email');
  }
  get botonIngresar() {
    return this.page.getByTestId('auth-login-submit');
  }
  get errorEmail() {
    return this.page.getByTestId('auth-login-field-email-error');
  }

  async abrir() {
    await this.navigate('/');
  }

  /**
   * En un navegador nuevo la app pide primero el curso (/curso); si ya hubiera un
   * curso guardado, muestra directo el formulario de email. Se contemplan ambos casos.
   */
  async ingresar(email: string, curso: 1 | 2 = 1) {
    const cursoPage = new CursoPage(this.page);
    await Promise.race([
      cursoPage.botonContinuar.waitFor({ state: 'visible' }),
      this.campoEmail.waitFor({ state: 'visible' }),
    ]);
    if (await cursoPage.botonContinuar.isVisible()) {
      await cursoPage.elegir(curso);
    }
    await this.campoEmail.fill(email);
    await this.botonIngresar.click();
    // Con el ingreso correcto el formulario desaparece y aparece el menú de módulos.
    await this.botonIngresar.waitFor({ state: 'hidden', timeout: 15_000 });
  }
}