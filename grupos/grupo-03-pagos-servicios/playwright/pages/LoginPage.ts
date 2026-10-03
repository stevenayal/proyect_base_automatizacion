// LoginPage.ts — inicio de sesión de aiquaa-sandbox-web (curso + email, sin contraseña).
// Selectores reales (relevados del HTML de /curso y /auth/login, todos data-testid):
//   curso-row-<n> / curso-option-<n>   opción de curso (radio dentro de un label)
//   curso-submit                        "Continuar" (deshabilitado hasta elegir curso)
//   auth-login-field-email              email
//   auth-login-submit                   "Ingresar" (deshabilitado hasta escribir el email)
//   nav-usuario                         nombre del usuario en la barra = sesión iniciada
// La sesión vive en localStorage (sandbox:usuario, sandbox:curso): se guarda con
// storageState y los escenarios siguientes no vuelven a pasar por el login.

import { expect, type Locator, type Page } from '@playwright/test';

export class LoginPage {
  readonly continuar: Locator;
  readonly email: Locator;
  readonly ingresar: Locator;
  readonly usuarioSesion: Locator;

  constructor(private readonly page: Page, private readonly webUrl: string) {
    this.continuar = page.getByTestId('curso-submit');
    this.email = page.getByTestId('auth-login-field-email');
    this.ingresar = page.getByTestId('auth-login-submit');
    this.usuarioSesion = page.getByTestId('nav-usuario');
  }

  private filaCurso(curso: string): Locator {
    return this.page.getByTestId(`curso-row-${curso}`);
  }

  private opcionCurso(curso: string): Locator {
    return this.page.getByTestId(`curso-option-${curso}`);
  }

  /** Abre una ruta protegida; si la web pide curso/email, completa el login. */
  async iniciarSesion(curso: string, email: string, ruta = '/facturas'): Promise<void> {
    await this.page.goto(this.webUrl + ruta);
    // La redirección a /curso la hace la app en el navegador: esperar lo que aparezca primero.
    await this.opcionCurso(curso).or(this.usuarioSesion).first().waitFor({ state: 'visible', timeout: 30_000 });
    if (await this.usuarioSesion.isVisible()) return;

    await this.filaCurso(curso).click();
    await expect(this.opcionCurso(curso), `curso ${curso} seleccionado`).toBeChecked();
    await expect(this.continuar).toBeEnabled();
    await this.continuar.click();

    await this.email.waitFor({ state: 'visible', timeout: 30_000 });
    await this.email.fill(email);
    await expect(this.ingresar).toBeEnabled();
    await this.ingresar.click();
    await expect(this.usuarioSesion, 'la barra muestra al usuario con sesión iniciada').toBeVisible({ timeout: 30_000 });
  }
}
