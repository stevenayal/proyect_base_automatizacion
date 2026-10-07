import { BasePage } from '../../../../playwright/pages/BasePage';

/**
 * Pantalla previa al login: "¿De qué curso sos?".
 * No siempre aparece (depende de la sesión/cookies previas), por eso
 * selectFirstCourse() no falla si no la encuentra dentro del timeout corto.
 */
export class SandboxCoursePage extends BasePage {
  async selectFirstCourseIfPresent(timeoutMs: number = 4000): Promise<void> {
    const firstCourseOption = this.page.getByText('Curso 1', { exact: false }).first();

    const appeared = await firstCourseOption
      .waitFor({ state: 'visible', timeout: timeoutMs })
      .then(() => true)
      .catch(() => false);

    if (!appeared) {
      return; // no aparecio la pantalla de seleccion de curso, seguimos
    }

    await firstCourseOption.click();

    const continueButton = this.page.getByRole('button', { name: /continuar/i }).first();
    await continueButton.click();
  }
}
