import { BasePage } from '../../../../playwright/pages/BasePage';

/**
 * Catálogo fijo de roles del sandbox (restricción CHECK de la tabla roles).
 * Verificado en la API: soporte = 2. Los demás ids son los del seed.
 */
export const ROLES = { admin: 1, soporte: 2, auditor: 3, operador: 4 } as const;
export type NombreRol = keyof typeof ROLES;

export function comoRol(nombre: string): NombreRol {
  if (!(nombre in ROLES)) {
    throw new Error(`Rol desconocido: "${nombre}". Válidos: ${Object.keys(ROLES).join(', ')}`);
  }
  return nombre as NombreRol;
}

/** Pantalla Roles: 4 roles fijos con botones asignar/revocar para el usuario en sesión. */
export class RolesPage extends BasePage {
  get tabla() {
    return this.page.getByTestId('roles-list');
  }
  get mensajeExito() {
    return this.page.getByTestId('roles-success');
  }

  fila(rol: NombreRol) {
    return this.page.getByTestId(`roles-row-${ROLES[rol]}`);
  }
  botonAsignar(rol: NombreRol) {
    return this.page.getByTestId(`roles-row-${ROLES[rol]}-asignar`);
  }
  botonRevocar(rol: NombreRol) {
    return this.page.getByTestId(`roles-row-${ROLES[rol]}-revocar`);
  }
  dialogoAceptar(rol: NombreRol) {
    return this.page.getByTestId(`roles-row-${ROLES[rol]}-revocar-confirm-accept`);
  }
  dialogoCancelar(rol: NombreRol) {
    return this.page.getByTestId(`roles-row-${ROLES[rol]}-revocar-confirm-cancel`);
  }

  async abrir() {
    await this.navigate('/roles');
    await this.tabla.waitFor({ state: 'visible' });
  }
  async asignar(rol: NombreRol) {
    await this.botonAsignar(rol).click();
  }
  async revocar(rol: NombreRol) {
    await this.botonRevocar(rol).click();
  }
  async confirmarRevocacion(rol: NombreRol) {
    await this.dialogoAceptar(rol).click();
  }
  async cancelarRevocacion(rol: NombreRol) {
    await this.dialogoCancelar(rol).click();
  }
}