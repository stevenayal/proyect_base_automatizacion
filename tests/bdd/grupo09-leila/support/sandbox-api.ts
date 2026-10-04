import { expect, type APIRequestContext, type APIResponse } from '@playwright/test';

export type UsuarioSandbox = { id: string; nombre: string; email: string };
export type ResumenReporte = { cantidad_movimientos: number; total: string };

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * Cliente minimo de la API del sandbox. La api-key de demo es compartida por
 * todo el curso (30 req/min), asi que ante un 429 se reintenta con backoff.
 */
export class SandboxApi {
  constructor(private readonly request: APIRequestContext) {}

  private async withRetry(call: () => Promise<APIResponse>, attempts = 5): Promise<APIResponse> {
    let response = await call();
    for (let i = 1; i < attempts && response.status() === 429; i++) {
      await sleep(i * 4_000);
      response = await call();
    }
    return response;
  }

  private async select<T>(sql: string, params: unknown[]): Promise<T[]> {
    const response = await this.withRetry(() =>
      this.request.post('/api/v1/sql/select', { data: { sql, params } }));
    expect(response.status(), 'La consulta SQL del sandbox debe responder 200').toBe(200);
    return ((await response.json()) as { data?: T[] }).data ?? [];
  }

  async rolId(nombre: string): Promise<string> {
    const [row] = await this.select<{ id: string }>('SELECT id FROM roles WHERE nombre = $1', [nombre]);
    expect(row, `El rol "${nombre}" debe existir en el catalogo`).toBeTruthy();
    return String(row.id);
  }

  async usuarioConRol(rol: string): Promise<UsuarioSandbox> {
    const rows = await this.select<UsuarioSandbox>(
      `SELECT u.id, u.nombre, u.email FROM usuarios u
         JOIN usuario_roles ur ON ur.usuario_id = u.id AND ur.activo = true
         JOIN roles r ON r.id = ur.role_id
        WHERE u.activo = true AND r.nombre = $1
        ORDER BY u.id LIMIT 5`, [rol]);
    expect(rows.length, `Debe existir al menos un usuario activo con rol "${rol}"`).toBeGreaterThan(0);
    return rows[Math.floor(Math.random() * rows.length)];
  }

  async usuarioSinRoles(): Promise<UsuarioSandbox> {
    const rows = await this.select<UsuarioSandbox>(
      `SELECT u.id, u.nombre, u.email FROM usuarios u
        WHERE u.activo = true AND NOT EXISTS (
          SELECT 1 FROM usuario_roles ur WHERE ur.usuario_id = u.id AND ur.activo = true)
        ORDER BY u.id LIMIT 5`, []);
    expect(rows.length, 'Debe existir al menos un usuario activo sin roles').toBeGreaterThan(0);
    return rows[0];
  }

  async resumen(usuarioId: string): Promise<ResumenReporte> {
    const response = await this.withRetry(() =>
      this.request.get(`/api/v1/reportes/resumen?usuarioId=${usuarioId}`));
    expect(response.status(), 'GET /reportes/resumen debe responder 200').toBe(200);
    const body = (await response.json()) as { data: ResumenReporte };
    return { ...body.data, cantidad_movimientos: Number(body.data.cantidad_movimientos) };
  }
}
