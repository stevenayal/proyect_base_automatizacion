// FacturasPage.ts — listado /facturas de aiquaa-sandbox-web.
// Selectores reales (relevados del HTML con y sin resultados):
//   facturas-field-usuarioId   filtro por titular (input; se aplica al escribir, con demora)
//   facturas-field-estado      filtro por estado (select: "", pendiente, pagada, vencida)
//   facturas-count             "N resultados" (desaparece cuando no hay resultados)
//   facturas-list              tabla; filas facturas-row-<id>
//   facturas-empty             "Sin resultados." (reemplaza a contador y tabla)
//   facturas-loading           indicador mientras busca
// Celdas (sin data-testid, orden fijo): # · Usuario · Proveedor · Número · Monto · Vencimiento · Estado.
// Monto y vencimiento traen el valor crudo de la API en span[data-value]; el estado es el texto del badge.
//
// Rate limit: el proxy de la web usa la misma API key compartida; si responde 429 el Page
// Object lanza WebConRateLimit y VerificacionWeb espera Retry-After y vuelve a abrir.
//
// Espera: la web filtra llamando a GET /api/proxy/facturas (su proxy hacia la API, con los
// mismos parámetros que GET /api/v1/facturas). El Page
// Object espera ESA respuesta (no "red inactiva") y recién después lee la tabla: con la
// demora del filtro, leer antes da datos del filtro anterior.

import type { Locator, Page, Response } from '@playwright/test';

export interface FiltrosWeb {
  usuarioId?: string | number;
  estado?: string;
}

export interface FilaWeb {
  id: number;
  usuarioId: string;
  proveedor: string;
  numero: string;
  monto: string;
  montoTexto: string;
  vencimiento: string;
  vencimientoTexto: string;
  estado: string;
}

export interface ResultadoWeb {
  /** JSON que la web recibió de la API para los filtros aplicados. */
  respuestaApi: { url: string; status: number; body: any };
  vacio: boolean;
  contador: string | null;
  filas: FilaWeb[];
}

/**
 * La web respondió 429: su proxy usa la misma API key compartida (30 req/min) y el límite
 * se agotó. No es un fallo de la web ni de la prueba; quien llama espera y reintenta.
 */
export class WebConRateLimit extends Error {
  constructor(readonly retryAfterSeg: number, readonly url: string) {
    super(`La web recibió 429 (rate limit de la API key compartida) en ${url}; Retry-After ${retryAfterSeg} s`);
    this.name = 'WebConRateLimit';
  }
}

export class FacturasPage {
  readonly filtroUsuario: Locator;
  readonly filtroEstado: Locator;
  readonly contador: Locator;
  readonly tabla: Locator;
  readonly filas: Locator;
  readonly vacio: Locator;
  readonly cargando: Locator;

  constructor(private readonly page: Page, private readonly webUrl: string) {
    this.filtroUsuario = page.getByTestId('facturas-field-usuarioId');
    this.filtroEstado = page.getByTestId('facturas-field-estado');
    this.contador = page.getByTestId('facturas-count');
    this.tabla = page.getByTestId('facturas-list');
    this.filas = this.tabla.locator('tbody tr[data-testid^="facturas-row-"]');
    this.vacio = page.getByTestId('facturas-empty');
    this.cargando = page.getByTestId('facturas-loading');
  }

  fila(id: number | string): Locator {
    return this.page.getByTestId(`facturas-row-${id}`);
  }

  /** Respuesta de GET /api/v1/facturas con exactamente estos filtros. */
  private esperarListado(filtros: FiltrosWeb): Promise<Response> {
    const esperado = normalizar(filtros);
    return this.page.waitForResponse(
      (r) => {
        if (r.request().method() !== 'GET') return false;
        const u = new URL(r.url());
        // La web no llama directo a la API: usa su propio proxy /api/proxy/facturas
        // (mismo cuerpo { data: [...] }). Se acepta también /api/v1/facturas.
        if (!/\/api\/(?:proxy|v1)\/facturas\/?$/.test(u.pathname)) return false;
        return JSON.stringify(normalizar(Object.fromEntries(u.searchParams))) === JSON.stringify(esperado);
      },
      { timeout: 45_000 },
    );
  }

  /** Si la página recibió 429, corta con WebConRateLimit (no tiene sentido esperar la tabla). */
  private controlarLimite(r: Response): Response {
    if (r.status() === 429) {
      throw new WebConRateLimit(Number(r.headers()['retry-after']) || 10, new URL(r.url()).pathname);
    }
    return r;
  }

  /** Abre /facturas y espera la primera carga (sin filtros). */
  async abrir(): Promise<void> {
    const carga = this.esperarListado({});
    await this.page.goto(this.webUrl + '/facturas');
    this.controlarLimite(await carga);
    await this.esperarTabla();
  }

  /**
   * Aplica los filtros como lo haría una persona (primero estado, después titular) y
   * devuelve lo que la web recibió de la API y lo que muestra.
   */
  async filtrar(filtros: FiltrosWeb): Promise<ResultadoWeb> {
    let ultima: Response | null = null;
    const aplicados: FiltrosWeb = {};

    if (filtros.estado) {
      aplicados.estado = filtros.estado;
      const r = this.esperarListado(aplicados);
      await this.filtroEstado.selectOption(filtros.estado);
      ultima = this.controlarLimite(await r);
    }
    if (filtros.usuarioId !== undefined && String(filtros.usuarioId) !== '') {
      aplicados.usuarioId = filtros.usuarioId;
      const r = this.esperarListado(aplicados);
      await this.filtroUsuario.fill(String(filtros.usuarioId));
      ultima = this.controlarLimite(await r);
    }
    await this.esperarTabla();

    const body = ultima ? await ultima.json().catch(() => null) : null;
    const vacio = await this.vacio.isVisible();
    return {
      respuestaApi: { url: ultima ? ultima.url() : '', status: ultima ? ultima.status() : 0, body },
      vacio,
      contador: vacio ? null : (await this.contador.textContent())?.trim() ?? null,
      filas: vacio ? [] : await this.leerFilas(),
    };
  }

  /** Espera a que termine de cargar: tabla con resultados o "Sin resultados.". */
  async esperarTabla(): Promise<void> {
    await this.cargando.waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => undefined);
    await this.tabla.or(this.vacio).first().waitFor({ state: 'visible', timeout: 30_000 });
  }

  async leerFilas(): Promise<FilaWeb[]> {
    const filas: FilaWeb[] = [];
    for (const fila of await this.filas.all()) {
      const testid = (await fila.getAttribute('data-testid')) ?? '';
      const celda = (n: number) => fila.locator(`td:nth-child(${n})`);
      const texto = async (n: number) => ((await celda(n).textContent()) ?? '').trim();
      const crudo = async (n: number) => (await celda(n).locator('span[data-value]').getAttribute('data-value')) ?? '';
      filas.push({
        id: Number(testid.replace('facturas-row-', '')),
        usuarioId: await texto(2),
        proveedor: await texto(3),
        numero: await texto(4),
        monto: await crudo(5),
        montoTexto: await texto(5),
        vencimiento: await crudo(6),
        vencimientoTexto: await texto(6),
        estado: await texto(7),
      });
    }
    return filas;
  }

  /** Marca visualmente una fila para la captura de evidencia (no cambia datos). */
  async resaltar(id: number | string): Promise<void> {
    const fila = this.fila(id);
    if ((await fila.count()) === 0) return;
    await fila.scrollIntoViewIfNeeded();
    await fila.evaluate((el) => {
      (el as HTMLElement).style.outline = '3px solid #f59e0b';
      (el as HTMLElement).style.outlineOffset = '-2px';
    });
  }

  async captura(): Promise<Buffer> {
    return this.page.screenshot({ fullPage: true });
  }
}

/** Filtros sin vacíos y en orden fijo, para comparar los de la URL con los esperados. */
function normalizar(f: { [k: string]: unknown } | FiltrosWeb): Record<string, string> {
  const g = f as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const k of ['estado', 'usuarioId']) {
    const v = g[k];
    if (v !== undefined && v !== null && String(v) !== '') out[k] = String(v);
  }
  return out;
}
