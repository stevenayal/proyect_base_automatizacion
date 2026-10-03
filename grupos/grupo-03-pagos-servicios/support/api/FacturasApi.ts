// FacturasApi.ts — operaciones de negocio del módulo de facturas del sandbox.
// Los steps llaman a estos métodos; acá vive el detalle técnico (verbo, ruta, cuerpo).
//
//   GET    /api/v1/facturas?usuarioId=&estado=     listar (máx. 100, orden por id)
//   GET    /api/v1/facturas/{id}                    consultar (solo activas)
//   POST   /api/v1/facturas                         registrar (201, siempre pendiente)
//   PUT    /api/v1/facturas/{id}                    reemplazar (no cambia el estado)
//   DELETE /api/v1/facturas/{id}                    baja lógica (204)
//   POST   /api/v1/facturas/{id}/pagar              pagar (no filtra por activo)
//   POST   /api/v1/sql/select                       consultas de solo lectura a la base

import { ApiClient, Opciones, Respuesta } from './ApiClient';

export interface DatosFactura {
  usuarioId?: unknown;
  proveedor?: unknown;
  numeroFactura?: unknown;
  monto?: unknown;
  fechaVencimiento?: unknown;
  estado?: unknown;
}

let secuencia = 0;

/** Número de factura único: las escrituras del sandbox no están aisladas entre grupos. */
export function numeroUnico(proveedor: string): string {
  secuencia++;
  return `G3-${proveedor.toUpperCase()}-${Date.now()}-${secuencia}${Math.floor(Math.random() * 1000)}`;
}

export class FacturasApi {
  constructor(readonly http: ApiClient) {}

  listar(filtros: Record<string, string | number> = {}, opciones: Opciones = {}): Promise<Respuesta> {
    const q = new URLSearchParams(Object.entries(filtros).map(([k, v]) => [k, String(v)])).toString();
    return this.http.send('GET', '/api/v1/facturas' + (q ? '?' + q : ''), opciones);
  }

  consultar(id: number | string, opciones: Opciones = {}): Promise<Respuesta> {
    return this.http.send('GET', `/api/v1/facturas/${id}`, opciones);
  }

  registrar(datos: DatosFactura, opciones: Opciones = {}): Promise<Respuesta> {
    return this.http.send('POST', '/api/v1/facturas', { ...opciones, data: datos });
  }

  registrarCrudo(cuerpo: string, opciones: Opciones = {}): Promise<Respuesta> {
    return this.http.send('POST', '/api/v1/facturas', { ...opciones, raw: cuerpo });
  }

  modificar(id: number | string, datos: DatosFactura, opciones: Opciones = {}): Promise<Respuesta> {
    return this.http.send('PUT', `/api/v1/facturas/${id}`, { ...opciones, data: datos });
  }

  darDeBaja(id: number | string, opciones: Opciones = {}): Promise<Respuesta> {
    return this.http.send('DELETE', `/api/v1/facturas/${id}`, opciones);
  }

  pagar(id: number | string, cuerpo: Record<string, unknown>, opciones: Opciones = {}): Promise<Respuesta> {
    return this.http.send('POST', `/api/v1/facturas/${id}/pagar`, { ...opciones, data: cuerpo });
  }

  /** Otro verbo sobre la operación de pago (para la regla del 405). */
  pagarConMetodo(metodo: string, id: number | string, opciones: Opciones = {}): Promise<Respuesta> {
    return this.http.send(metodo, `/api/v1/facturas/${id}/pagar`, opciones);
  }

  /** Consulta de solo lectura a la base del sandbox. Respuesta: { data: filas[], rowCount }. */
  sql(sentencia: string, params: unknown[] = [], opciones: Opciones = {}): Promise<Respuesta> {
    return this.http.send('POST', '/api/v1/sql/select', { ...opciones, data: { sql: sentencia, params } });
  }

  /** Cantidad de pagos registrados para una factura (COUNT llega como texto: bigint). */
  async contarPagos(facturaId: number): Promise<{ respuesta: Respuesta; cantidad: number }> {
    const respuesta = await this.sql('SELECT COUNT(*) AS n FROM pagos WHERE factura_id = $1', [Number(facturaId)], {
      etiqueta: 'verificación en la base',
    });
    const fila = Array.isArray(respuesta.body?.data) ? respuesta.body.data[0] : undefined;
    return { respuesta, cantidad: fila ? Number(fila.n) : NaN };
  }
}

/** Usuario activo con menos facturas pendientes vigentes: su listado (máx. 100) muestra las nuevas. */
export const SQL_TITULAR =
  'SELECT u.id, COUNT(f.id) AS pendientes FROM usuarios u ' +
  "LEFT JOIN facturas f ON f.usuario_id = u.id AND f.activo = true AND f.estado = 'pendiente' " +
  'WHERE u.activo = true GROUP BY u.id ORDER BY COUNT(f.id) ASC, u.id ASC LIMIT 1';
