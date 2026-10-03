import { Page } from '@playwright/test';

export interface DatosUsuario {
  nombre: string; email: string; documento: string;
  nacimiento?: string; direccion?: string;
}

export class UsuariosPage {
  constructor(private readonly page: Page) {}
  private campo(nombre: string) {
    return this.page.getByRole('textbox', { name: nombre, exact: true });
  }
  async abrir() {
    await this.page.goto('/usuarios/new');
    await this.page.getByRole('heading', { name: 'Nuevo usuario', exact: true }).waitFor();
  }
  async completar(datos: DatosUsuario) {
    await this.campo('Nombre').fill(datos.nombre);
    await this.campo('Email').fill(datos.email);
    await this.page.getByRole('combobox', { name: 'Tipo de documento', exact: true }).selectOption({ label: 'CI' });
    await this.campo('Número de documento').fill(datos.documento);
    if (datos.nacimiento) await this.campo('Fecha de nacimiento (opcional)').fill(datos.nacimiento);
    if (datos.direccion) await this.campo('Dirección (opcional)').fill(datos.direccion);
  }
  async enviar() {
    await this.page.getByRole('button', { name: 'Crear usuario', exact: true }).click();
  }
  async registrar(datos: DatosUsuario) {
    await this.completar(datos);
    await this.enviar();
  }
  async leerFicha() {
    await this.page.waitForURL(/\/usuarios\/\d+$/);
    await this.page.getByRole('heading', { name: /^Usuario #\d+$/ }).waitFor();
    return {
      nombre: await this.campo('Nombre').inputValue(),
      email: await this.campo('Email').inputValue(),
      documento: await this.campo('Número de documento').inputValue(),
      nacimiento: await this.fechaDeLaFicha(),
      direccion: await this.campo('Dirección').inputValue()
    };
  }
  private async fechaDeLaFicha() {
    // DOM observado: dt / dd > span[data-value]. La ficha y el editor son vistas distintas.
    const fecha = await this.page.getByRole('term').filter({ hasText: /^Fecha de nacimiento$/ })
      .evaluate(element => {
        const detalle = element.nextElementSibling;
        return {
          texto: detalle?.textContent?.trim() ?? '',
          iso: detalle?.querySelector('[data-value]')?.getAttribute('data-value') ?? ''
        };
      });
    if (fecha.texto === '—' && !fecha.iso) return '';
    const match = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(fecha.iso);
    if (!match) throw new Error(`Fecha de ficha sin formato ISO reconocido: ${fecha.iso}`);
    if (fecha.texto !== `${match[3]}/${match[2]}/${match[1]}`) {
      throw new Error(`Fecha visible inconsistente con su valor: ${fecha.texto}`);
    }
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  async validacionCorreo() {
    return this.campo('Email').evaluate((element: HTMLInputElement) => ({
      formatoInvalido: element.validity.typeMismatch,
      formularioValido: element.form?.checkValidity() ?? true
    }));
  }
  async camposPendientes() {
    return Promise.all(['Nombre', 'Email', 'Número de documento'].map(nombre =>
      this.campo(nombre).evaluate((element: HTMLInputElement) => element.validity.valueMissing)
    ));
  }
  async formularioVisible() {
    return this.page.url().endsWith('/usuarios/new') &&
      await this.page.getByRole('heading', { name: 'Nuevo usuario', exact: true }).isVisible();
  }
}
