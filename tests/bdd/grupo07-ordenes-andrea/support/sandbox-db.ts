// sandbox-db.ts — acceso a los datos del sandbox para el workspace de órdenes.
//
// Dos responsabilidades, separadas de la UI a propósito:
//   - UsuariosApi: resuelve el usuario activo por SQL. No hay constantes
//     hardcodeadas: si el sandbox cambia sus usuarios, el escenario sigue.
//   - OrdenesApi: consulta y limpia la orden que crea el escenario. El sandbox
//     es compartido por los 10 grupos del curso, así que dejar órdenes sueltas
//     ensuciaría los datos de todos.
//
// Los steps nunca llaman a la API directamente: van por acá, y la UI va por los
// Page Objects. El escenario es UI-first (la consigna pide automatizar el front);
// la API solo verifica y limpia.

import { expect, type APIRequestContext } from '@playwright/test';

export type SandboxUsuario = { id: string; nombre: string; email: string };

export type SandboxOrden = {
  id: string;
  usuario_id: string;
  producto: string;
  monto: string;
  estado: string;
  activo: boolean;
  items?: Array<{ producto: string; cantidad: number; precio_unitario: string; subtotal: string }>;
};

export class UsuariosApi {
  constructor(private readonly request: APIRequestContext) {}

  /**
   * Primer usuario activo. La consulta es parametrizada ($1) y no trae datos
   * reales de negocio, solo los identificadores que el front necesita.
   */
  async primerActivo(): Promise<SandboxUsuario> {
    const response = await this.request.post('/api/v1/sql/select', {
      data: {
        sql: 'SELECT id, nombre, email FROM usuarios WHERE activo = $1 ORDER BY id LIMIT 1',
        params: [true],
      },
    });
    // El status va en el mensaje a propósito: un 401/403 casi siempre es
    // SANDBOX_API_KEY vacía o mal cargada, y sin el status no se distingue.
    if (!response.ok()) {
      const cuerpo = (await response.text().catch(() => '')).slice(0, 200);
      throw new Error(
        `La consulta de usuarios activos respondió HTTP ${response.status()} ${response.statusText()}. ` +
          (response.status() === 401 || response.status() === 403
            ? 'Revisá SANDBOX_API_KEY.'
            : `Cuerpo: ${cuerpo}`),
      );
    }
    const body = (await response.json()) as { data?: SandboxUsuario[] };
    expect(body.data, 'La consulta debe devolver usuarios activos').toBeTruthy();
    expect(body.data!.length, 'Debe existir al menos un usuario activo en el sandbox').toBeGreaterThan(0);
    return body.data![0];
  }
}

export class OrdenesApi {
  constructor(private readonly request: APIRequestContext) {}

  async obtener(id: string): Promise<SandboxOrden | undefined> {
    const response = await this.request.get(`/api/v1/ordenes/${id}`);
    if (!response.ok()) return undefined;
    const body = (await response.json()) as { data?: SandboxOrden };
    return body?.data;
  }

  /**
   * Limpieza del escenario. La orden se borra por API y no por pantalla: el
   * borrado por UI no es parte de los requisitos (RF-G7-04/05), así que no se
   * depende de que esa pantalla siga estable.
   *
   * Tolera 404 (ya estaba) y no falla el After por una orden que nunca se creó.
   */
  async borrar(id: string): Promise<'borrada' | 'no-existe' | 'sin-api'> {
    if (!this.request) return 'no-existe';
    const response = await this.request.delete(`/api/v1/ordenes/${id}`);
    if (response.status() === 404) return 'no-existe';
    if (!response.ok()) {
      throw new Error(`No se pudo limpiar la orden ${id}: HTTP ${response.status()}`);
    }
    return 'borrada';
  }
}