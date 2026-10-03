import { World, setWorldConstructor } from '@cucumber/cucumber';
import type { BrowserContext, Page } from '@playwright/test';
import { UsuariosPage, DatosUsuario } from '../pages/UsuariosPage';

export class Grupo04World extends World {
  context!: BrowserContext;
  page!: Page;
  datos!: DatosUsuario;
  ficha?: DatosUsuario;
  postAltas = 0;
  private usuariosPage?: UsuariosPage;
  get usuarios() { return this.usuariosPage ??= new UsuariosPage(this.page); }
}
setWorldConstructor(Grupo04World);
