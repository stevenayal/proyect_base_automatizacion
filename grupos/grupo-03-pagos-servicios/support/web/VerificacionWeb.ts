// VerificacionWeb.ts — compara lo que muestra /facturas con lo que devuelve la API.
//
// Corre al final de cada escenario @web (hook After de hooks.ts), cuando la operación bajo
// prueba ya se hizo por API. Pasos:
//   1. abre /facturas con la sesión guardada;
//   2. aplica los mismos filtros que el escenario: los del listado que consultó o, si no
//      consultó ninguno, el titular de la corrida (sin filtro la web solo muestra las
//      primeras 100 facturas por id y las nuevas quedarían afuera);
//   3. toma la respuesta de la API que recibió la propia página para esos filtros y la
//      compara fila por fila con la tabla (id, usuario, proveedor, número, monto,
//      vencimiento, estado) y con el contador / "Sin resultados.";
//   4. comprueba lo propio del escenario: la factura aparece (o ya no, si se dio de baja)
//      con el estado y el monto que dejó la operación.
// Adjunta siempre la captura y la tabla API vs web, también cuando todo coincide.

import type { G3World } from '../world';
import { FacturasPage, type FilaWeb, type FiltrosWeb, type ResultadoWeb } from '../../playwright/pages/FacturasPage';
import { config } from '../config';

type Campo = 'usuario' | 'proveedor' | 'numero' | 'monto' | 'vencimiento' | 'estado';

interface ComparacionFila {
  id: number;
  delEscenario: boolean;
  campos: Record<Campo, { api: string; web: string; ok: boolean }> | null;
  enApi: boolean;
  enWeb: boolean;
}

export async function verificarEnWeb(world: G3World): Promise<void> {
  if (!world.page) throw new Error('El escenario @web no tiene navegador abierto.');
  const pagina = new FacturasPage(world.page, config.webUrl);
  const filtros = filtrosDelEscenario(world);

  await pagina.abrir();
  const web = await pagina.filtrar(filtros);

  const comparacion = comparar(world, filtros, web);
  // Solo para la evidencia: resalta en la captura la fila de la factura del escenario.
  if (comparacion.expectativa?.presente) await pagina.resaltar(comparacion.expectativa.id);
  await world.attach(await pagina.captura(), 'image/png');
  await world.attach(JSON.stringify(comparacion, null, 2), 'application/json');

  if (comparacion.diferencias.length) {
    throw new Error(
      'La web no muestra lo mismo que la API:\n- ' + comparacion.diferencias.join('\n- '),
    );
  }
}

function filtrosDelEscenario(world: G3World): FiltrosWeb {
  const f = world.filtrosListado;
  if (f && (f.usuarioId !== undefined || f.estado !== undefined)) {
    // Solo los filtros que la web ofrece y con valores válidos (los listados inválidos no son @web).
    return {
      usuarioId: f.usuarioId !== undefined ? String(f.usuarioId) : undefined,
      estado: f.estado !== undefined ? String(f.estado) : undefined,
    };
  }
  return { usuarioId: world.titular };
}

function comparar(world: G3World, filtros: FiltrosWeb, web: ResultadoWeb) {
  const diferencias: string[] = [];
  const api = web.respuestaApi;
  const datosApi: any[] = Array.isArray(api.body?.data) ? api.body.data : [];
  const filasWeb = new Map<number, FilaWeb>(web.filas.map((f) => [f.id, f]));
  const idEscenario = world.factura?.id;

  if (api.status !== 200) diferencias.push(`la web recibió ${api.status} de la API al filtrar`);

  // Cantidad y estado vacío.
  if (datosApi.length === 0) {
    if (!web.vacio) diferencias.push('la API no devolvió facturas pero la web no muestra "Sin resultados."');
  } else {
    if (web.vacio) diferencias.push(`la API devolvió ${datosApi.length} facturas pero la web muestra "Sin resultados."`);
    if (web.filas.length !== datosApi.length)
      diferencias.push(`la API devolvió ${datosApi.length} facturas y la web muestra ${web.filas.length} filas`);
    const n = web.contador ? Number((web.contador.match(/\d+/) || ['NaN'])[0]) : NaN;
    if (n !== datosApi.length) diferencias.push(`el contador dice "${web.contador}" y la API devolvió ${datosApi.length}`);
  }

  // Fila por fila.
  const filas: ComparacionFila[] = [];
  for (const a of datosApi) {
    const id = Number(a.id);
    const w = filasWeb.get(id);
    if (!w) {
      diferencias.push(`la factura ${id} está en la respuesta de la API pero no en la tabla`);
      filas.push({ id, delEscenario: id === idEscenario, campos: null, enApi: true, enWeb: false });
      continue;
    }
    const campos = {
      usuario: par(String(a.usuario_id), w.usuarioId),
      proveedor: par(String(a.proveedor), w.proveedor),
      numero: par(String(a.numero_factura), w.numero),
      // Se compara el valor crudo (data-value) y también lo que se ve en pantalla.
      monto: {
        api: String(a.monto),
        web: `${w.montoTexto} (${w.monto})`,
        ok: Number(a.monto) === Number(w.monto) && Number(a.monto) === montoVisible(w.montoTexto),
      },
      vencimiento: {
        api: String(a.fecha_vencimiento),
        web: `${w.vencimientoTexto} (${w.vencimiento})`,
        ok: mismaFecha(String(a.fecha_vencimiento), w.vencimiento) && fechaVisible(String(a.fecha_vencimiento), w.vencimientoTexto),
      },
      estado: par(String(a.estado), w.estado),
    };
    for (const [nombre, c] of Object.entries(campos)) {
      if (!c.ok) diferencias.push(`factura ${id}: ${nombre} en la API "${c.api}" y en la web "${c.web}"`);
    }
    filas.push({ id, delEscenario: id === idEscenario, campos, enApi: true, enWeb: true });
  }
  const idsApi = new Set(datosApi.map((a) => Number(a.id)));
  for (const w of web.filas) {
    if (!idsApi.has(w.id)) {
      diferencias.push(`la factura ${w.id} aparece en la tabla pero no en la respuesta de la API`);
      filas.push({ id: w.id, delEscenario: w.id === idEscenario, campos: null, enApi: false, enWeb: true });
    }
  }

  // Lo propio del escenario.
  const expectativa = expectativaDelEscenario(world, filtros);
  if (expectativa) {
    const enApi = idsApi.has(expectativa.id);
    const enWeb = filasWeb.has(expectativa.id);
    if (expectativa.presente) {
      if (!enApi) diferencias.push(`la factura ${expectativa.id} del escenario no está en la respuesta de la API`);
      if (!enWeb) diferencias.push(`la factura ${expectativa.id} del escenario no aparece en la tabla de la web`);
      const w = filasWeb.get(expectativa.id);
      if (w && expectativa.estado && w.estado !== expectativa.estado)
        diferencias.push(`la factura ${expectativa.id} debería verse "${expectativa.estado}" y la web muestra "${w.estado}"`);
      if (w && expectativa.monto !== undefined && Number(w.monto) !== expectativa.monto)
        diferencias.push(`la factura ${expectativa.id} debería verse con monto ${expectativa.monto} y la web muestra ${w.montoTexto}`);
    } else {
      if (enApi) diferencias.push(`la factura ${expectativa.id} dada de baja sigue en la respuesta de la API`);
      if (enWeb) diferencias.push(`la factura ${expectativa.id} dada de baja sigue apareciendo en la web`);
    }
  }

  // Evidencia: la factura del escenario primero y hasta 10 más.
  filas.sort((x, y) => Number(y.delEscenario) - Number(x.delEscenario));
  return {
    tipo: 'comparacion-api-web',
    pagina: config.webUrl + '/facturas',
    filtros,
    apiUrl: api.url,
    apiStatus: api.status,
    cantidadApi: datosApi.length,
    cantidadWeb: web.filas.length,
    contadorWeb: web.vacio ? 'Sin resultados.' : web.contador,
    expectativa,
    coincide: diferencias.length === 0,
    diferencias,
    filas: filas.slice(0, 11),
    filasOmitidas: Math.max(0, filas.length - 11),
  };
}

function expectativaDelEscenario(world: G3World, filtros: FiltrosWeb) {
  const f = world.factura;
  if (!f) return null;
  if (f.dadaDeBaja) return { id: f.id, presente: false, motivo: 'la factura fue dada de baja' };
  if (filtros.estado && filtros.estado !== f.estado) return null; // el filtro la excluye: no hay nada propio que ver
  if (filtros.usuarioId !== undefined && Number(filtros.usuarioId) !== f.usuarioId) return null;
  if (!filtros.usuarioId) return null; // listado general: la factura nueva puede quedar fuera de las primeras 100
  return { id: f.id, presente: true, estado: f.estado, monto: f.monto, motivo: 'la factura del escenario debe verse' };
}

function par(api: string, web: string) {
  return { api, web, ok: api === web };
}

/** "491.103,08" (formato es-AR de la web) → 491103.08 */
function montoVisible(texto: string): number {
  return Number(texto.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
}

/** La web muestra DD/MM/AAAA; se acepta la fecha UTC o la local del navegador. */
function fechaVisible(iso: string, texto: string): boolean {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return false;
  const dos = (n: number) => String(n).padStart(2, '0');
  const utc = `${dos(d.getUTCDate())}/${dos(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
  const local = `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()}`;
  return texto === utc || texto === local;
}

function mismaFecha(api: string, web: string): boolean {
  return api === web || (api.slice(0, 10) !== '' && api.slice(0, 10) === web.slice(0, 10));
}
