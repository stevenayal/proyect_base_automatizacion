import { BasePage } from '../../../../playwright/pages/BasePage';

/** Primera pantalla de acceso del sandbox: elegir la cohorte (/curso). */
export class CursoPage extends BasePage {
  opcion(curso: 1 | 2) {
    return this.page.getByTestId(`curso-row-${curso}`);
  }
  get botonContinuar() {
    return this.page.getByTestId('curso-submit');
  }

  async elegir(curso: 1 | 2 = 1) {
    await this.opcion(curso).click();
    await this.botonContinuar.click();
  }
}