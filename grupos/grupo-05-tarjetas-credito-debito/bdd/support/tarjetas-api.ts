// tarjetas-api.ts — acceso HTTP al módulo Tarjetas del sandbox AIQUAA.
// Los steps hablan de negocio ("el cliente bloquea su tarjeta"); los endpoints,
// el reintento ante 429 y la consulta SQL de verificación viven acá.

import { APIRequestContext, APIResponse } from '@playwright/test';

/** Respuesta observada: status y cuerpo ya parseado. */
export interface RespuestaApi {
  status: number;
  body: any;
}

/** Columnas de `tarjetas` que los escenarios pueden verificar en la base. */
const COLUMNAS_VERIFICABLES = new Set(['estado', 'marca', 'tipo']);

export class TarjetasApi {
  constructor(private readonly request: APIRequestContext) {}

  async crear(usuarioId: number, tipo: string, marca: string): Promise<RespuestaApi> {
    return this.enviar(() => this.request.post('/api/v1/tarjetas', { data: { usuarioId, tipo, marca } }));
  }

  async consultar(tarjetaId: number | string): Promise<RespuestaApi> {
    return this.enviar(() => this.request.get(`/api/v1/tarjetas/${tarjetaId}`));
  }

  async bloquear(tarjetaId: number | string): Promise<RespuestaApi> {
    return this.enviar(() => this.request.patch(`/api/v1/tarjetas/${tarjetaId}/bloquear`));
  }

  async activar(tarjetaId: number | string): Promise<RespuestaApi> {
    return this.enviar(() => this.request.patch(`/api/v1/tarjetas/${tarjetaId}/activar`));
  }

  /**
   * Lee una columna de la tarjeta directo de la base, vía POST /api/v1/sql/select.
   * La columna se valida contra una whitelist antes de interpolarla; el id viaja
   * como parámetro ($1), nunca concatenado.
   */
  async valorEnBaseDeDatos(tarjetaId: number | string, columna: string): Promise<string> {
    if (!COLUMNAS_VERIFICABLES.has(columna)) {
      throw new Error(`Columna "${columna}" fuera de la whitelist (${[...COLUMNAS_VERIFICABLES].join(', ')})`);
    }
    const { status, body } = await this.enviar(() => this.request.post('/api/v1/sql/select', {
      data: { sql: `SELECT ${columna} FROM tarjetas WHERE id = $1`, params: [tarjetaId] },
    }));
    if (status !== 200) throw new Error(`SQL falló (${status}): ${JSON.stringify(body)}`);
    const filas: any[] = body?.data ?? [];
    if (filas.length !== 1) throw new Error(`Se esperaba 1 tarjeta con id ${tarjetaId} y hay ${filas.length}`);
    return String(filas[0][columna]);
  }

  /**
   * Ejecuta la petición reintentando ante 429: el sandbox limita a 30
   * peticiones por minuto por api-key y una suite completa roza ese techo.
   */
  private async enviar(peticion: () => Promise<APIResponse>): Promise<RespuestaApi> {
    const esperaMs = Number(process.env.RATE_LIMIT_WAIT_MS ?? 20000);
    let respuesta = await peticion();
    for (let intento = 0; respuesta.status() === 429 && intento < 2; intento++) {
      await new Promise((r) => setTimeout(r, esperaMs));
      respuesta = await peticion();
    }
    const texto = await respuesta.text();
    let body: any = texto;
    try {
      body = texto ? JSON.parse(texto) : null;
    } catch {
      // Respuesta no JSON: se conserva el texto tal cual para el diagnóstico.
    }
    return { status: respuesta.status(), body };
  }
}
