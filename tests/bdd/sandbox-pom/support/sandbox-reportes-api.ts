import { expect, type APIRequestContext } from '@playwright/test';

export interface ResumenMovimientos {
  cantidad_movimientos: number;
  total: number;
}

/**
 * Lectura de los mismos endpoints que usa la pantalla /reportes
 * (lib/api/reportes.ts de aiquaa-sandbox-web), usada aquí para tomar una
 * "foto" previa (baseline) por API, sin depender de la UI para el setup.
 */
export class SandboxReportesApi {
  constructor(private readonly request: APIRequestContext) {}

  async resumen(usuarioId: number): Promise<ResumenMovimientos> {
    const response = await this.request.get('/api/v1/reportes/resumen', { params: { usuarioId } });
    expect(response.ok(), 'El resumen de movimientos debe responder correctamente').toBeTruthy();
    const body = (await response.json()) as { data: ResumenMovimientos };
    return body.data;
  }

  async cantidadPorTipo(usuarioId: number, tipoMovimiento: string): Promise<number> {
    const response = await this.request.get('/api/v1/reportes/movimientos', { params: { usuarioId } });
    expect(response.ok(), 'El desglose de movimientos debe responder correctamente').toBeTruthy();
    const body = (await response.json()) as { data: Array<{ tipo_movimiento: string; cantidad: number }> };
    return body.data.find((fila) => fila.tipo_movimiento === tipoMovimiento)?.cantidad ?? 0;
  }
}
