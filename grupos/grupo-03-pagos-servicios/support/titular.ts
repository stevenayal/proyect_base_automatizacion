// titular.ts — titular de las facturas de prueba, elegido una vez por corrida.
// Mismo criterio que la colección Postman Final y el plan JMeter: el usuario activo con
// menos facturas pendientes, porque el listado devuelve como máximo 100 registros
// ordenados por id (con un titular que ya tiene 100 pendientes, las nuevas no se verían
// ni en la API ni en la web). G3_TITULAR permite fijarlo.

import { motivo } from './api/ApiClient';
import { FacturasApi, SQL_TITULAR } from './api/FacturasApi';
import { config } from './config';

interface Titular {
  id: number;
  pendientes: string;
  origen: 'fijo' | 'elegido';
}

let titular: Titular | null = null;
let error = '';

export async function elegirTitular(api: FacturasApi): Promise<void> {
  if (config.titularFijo) {
    const id = Number(config.titularFijo);
    if (!Number.isInteger(id) || id <= 0) {
      error = `G3_TITULAR debe ser un id de usuario (recibido "${config.titularFijo}")`;
      return;
    }
    titular = { id, pendientes: '?', origen: 'fijo' };
    console.log(`[G3] titular de la corrida: usuario ${id} (fijo por G3_TITULAR)`);
    return;
  }
  const r = await api.sql(SQL_TITULAR, [], { etiqueta: 'elección del titular' });
  const fila = r.status === 200 && Array.isArray(r.body?.data) ? r.body.data[0] : undefined;
  if (!fila || !fila.id) {
    error = `no se pudo elegir el titular con menos facturas pendientes (${motivo(r)})`;
    console.error('[G3] ' + error);
    return;
  }
  titular = { id: Number(fila.id), pendientes: String(fila.pendientes), origen: 'elegido' };
  console.log(`[G3] titular de la corrida: usuario ${titular.id} (${titular.pendientes} facturas pendientes)`);
}

/** Titular elegido; falla con la causa si la elección no se pudo hacer. */
export function titularDeLaCorrida(): Titular {
  if (!titular) throw new Error('Precondición no cumplida: ' + (error || 'el titular todavía no fue elegido'));
  return titular;
}

export function infoTitular(): { titular: Titular | null; error: string } {
  return { titular, error };
}
