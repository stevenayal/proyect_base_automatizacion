import { expect, type APIRequestContext } from '@playwright/test';

export type TipoMovimiento = 'transferencia' | 'pago_factura' | 'compra_ecommerce' | 'cargo_tarjeta';

/** Creación y baja de movimientos vía API, para preparar datos de prueba sin UI (Given → API). */
export class SandboxMovimientosApi {
  constructor(private readonly request: APIRequestContext) {}

  async crear(usuarioId: number, tipoMovimiento: TipoMovimiento, monto: number, descripcion: string): Promise<string> {
    const response = await this.request.post('/api/v1/movimientos', {
      data: { usuarioId, tipoMovimiento, monto, descripcion },
    });
    expect(response.status(), 'La creación del movimiento debe responder 201').toBe(201);
    const body = (await response.json()) as { data?: { id: string } };
    expect(body.data?.id, 'La respuesta debe incluir el id del movimiento creado').toBeTruthy();
    return body.data!.id;
  }

  /** Baja lógica (soft-delete: activo = false). El movimiento sigue existiendo en la tabla. */
  async darDeBaja(id: string): Promise<void> {
    const response = await this.request.delete(`/api/v1/movimientos/${id}`);
    expect(response.ok(), 'La baja del movimiento debe responder correctamente').toBeTruthy();
  }
}
