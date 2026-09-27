import { expect, type APIRequestContext } from '@playwright/test';

export type UsuarioRow = { id: string; nombre: string; email: string };
export type CuentaRow = { id: string; usuario_id: string; moneda: string; saldo: string; activa: boolean };
export type TransferenciaRow = {
  id: string;
  cuenta_origen_id: string;
  cuenta_destino_id: string;
  monto: string;
  descripcion: string | null;
  estado: string;
  activo: boolean;
};

/**
 * Acceso de SOLO LECTURA a la BD del sandbox via POST /api/v1/sql/select
 * (consultas parametrizadas $1, $2...). Es la misma tecnica de datos
 * dinamicos usada en la coleccion Postman (Tarea 3.0).
 */
export class SandboxDb {
  constructor(private readonly api: APIRequestContext) {}

  async select<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const res = await this.api.post('/api/v1/sql/select', { data: { sql, params } });
    expect(res.status(), `SQL fallo: ${sql}\n${await res.text()}`).toBe(200);
    const body = (await res.json()) as { data: T[] };
    return body.data;
  }

  async usuarioActivoConCuentas(): Promise<UsuarioRow> {
    const rows = await this.select<UsuarioRow>(
      `SELECT u.id, u.nombre, u.email FROM usuarios u
        WHERE u.activo = $1
          AND (SELECT COUNT(*) FROM cuentas c WHERE c.usuario_id = u.id AND c.activa = $1) > 0
        ORDER BY u.id LIMIT 1`,
      [true],
    );
    expect(rows.length, 'Debe existir un usuario activo con cuentas activas').toBeGreaterThan(0);
    return rows[0];
  }

  async dosCuentasActivas(moneda = 'PYG'): Promise<[CuentaRow, CuentaRow]> {
    const rows = await this.select<CuentaRow>(
      'SELECT id, usuario_id, moneda, saldo, activa FROM cuentas WHERE activa = $1 AND moneda = $2 ORDER BY id LIMIT 2',
      [true, moneda],
    );
    expect(rows.length, `Deben existir 2 cuentas activas en ${moneda}`).toBe(2);
    return [rows[0], rows[1]];
  }

  async transferencia(id: number): Promise<TransferenciaRow | undefined> {
    const rows = await this.select<TransferenciaRow>(
      'SELECT id, cuenta_origen_id, cuenta_destino_id, monto, descripcion, estado, activo FROM transferencias WHERE id = $1',
      [id],
    );
    return rows[0];
  }

  async contarPorDescripcion(descripcion: string): Promise<number> {
    const rows = await this.select<{ total: string }>(
      'SELECT COUNT(*) AS total FROM transferencias WHERE descripcion = $1',
      [descripcion],
    );
    return Number(rows[0].total);
  }
}
