// ApiClient.ts — cliente HTTP del sandbox sobre el APIRequestContext de Playwright.
//
// Dos responsabilidades técnicas, iguales a las de la colección Postman Final:
//   1. Ritmo: la API key se comparte entre grupos (30 req/min nominal, ~10-15 reales).
//      Cada petición reserva un turno separado por 60000 / G3_RPM ms, compartido por toda
//      la corrida (escenarios, preparación, verificación en la base y limpieza).
//   2. 429 provocados por otros: se reintenta respetando Retry-After (tope G3_ESPERA_MAX_429)
//      hasta G3_REINTENTOS_429 veces. Los 429 se cuentan aparte para el resumen.
//
// Cada llamada queda registrada en el escenario (método, ruta, status, ms y cuerpo resumido):
// es la evidencia "respuesta de la API" que va al informe, también en los exitosos.

import type { APIRequestContext } from '@playwright/test';
import { config } from '../config';

export interface Respuesta {
  status: number;
  /** Cuerpo parseado como JSON ({} si no es JSON o está vacío). */
  body: any;
  /** Cuerpo crudo (para validar "sin cuerpo" en un 204). */
  texto: string;
  headers: Record<string, string>;
}

export interface LlamadaRegistrada {
  metodo: string;
  ruta: string;
  status: number;
  ms: number;
  reintentos429: number;
  enviado?: unknown;
  recibido: unknown;
  etiqueta?: string;
}

export interface Opciones {
  /** Cuerpo JSON (se serializa). */
  data?: unknown;
  /** Cuerpo crudo tal cual (para probar JSON mal formado). */
  raw?: string;
  /** API key a usar; por defecto la válida. */
  apiKey?: string;
  /** Texto corto que aparece en la evidencia (ej. "preparación", "verificación"). */
  etiqueta?: string;
}

// ── Estado compartido por toda la corrida ──────────────────────────────────────
let proximoTurno = 0;
export const estadisticas = { peticiones: 0, rechazos429: 0, esperas429Ms: 0 };

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Reserva el próximo turno libre y espera hasta que llegue. */
export async function turno(cantidad = 1): Promise<void> {
  const separacion = Math.ceil(60_000 / config.rpm);
  const ahora = Date.now();
  const inicio = Math.max(ahora, proximoTurno);
  proximoTurno = inicio + separacion * cantidad;
  if (inicio > ahora) await dormir(inicio - ahora);
}

/** Resume un cuerpo para la evidencia: los listados largos se recortan. */
export function resumir(body: unknown): unknown {
  if (body && typeof body === 'object' && Array.isArray((body as any).data)) {
    const data = (body as any).data as unknown[];
    return data.length <= 5
      ? body
      : { cantidad: data.length, primeros5: data.slice(0, 5), nota: `listado recortado: ${data.length} facturas` };
  }
  const s = JSON.stringify(body ?? null);
  return s.length > 4000 ? { recortado: s.slice(0, 4000) + '…' } : body;
}

export class ApiClient {
  readonly llamadas: LlamadaRegistrada[] = [];

  constructor(private readonly request: APIRequestContext) {}

  async send(metodo: string, ruta: string, opciones: Opciones = {}): Promise<Respuesta> {
    const headers: Record<string, string> = {
      'x-api-key': opciones.apiKey ?? config.apiKey,
      'Content-Type': 'application/json',
    };
    const cuerpo = opciones.raw !== undefined ? opciones.raw : opciones.data !== undefined ? JSON.stringify(opciones.data) : undefined;

    let reintentos = 0;
    for (;;) {
      await turno();
      const inicio = Date.now();
      estadisticas.peticiones++;
      const res = await this.request.fetch(config.apiUrl + ruta, {
        method: metodo,
        headers,
        // Buffer: Playwright envía los bytes tal cual. Con un string y Content-Type JSON,
        // si el texto no es JSON válido lo re-serializa como string JSON (y el caso
        // "datos mal formados" dejaría de estar mal formado).
        data: cuerpo !== undefined ? Buffer.from(cuerpo, 'utf8') : undefined,
        failOnStatusCode: false,
        timeout: 30_000,
      });
      const ms = Date.now() - inicio;
      const texto = await res.text().catch(() => '');
      const respuesta: Respuesta = { status: res.status(), body: parsear(texto), texto, headers: res.headers() };

      if (respuesta.status === 429 && reintentos < config.reintentos429) {
        reintentos++;
        estadisticas.rechazos429++;
        const retryAfter = Number(respuesta.headers['retry-after']) || 10;
        const espera = Math.min(Math.max(retryAfter, 1), config.esperaMax429Seg) * 1000;
        estadisticas.esperas429Ms += espera;
        console.warn(`[G3] 429 en ${metodo} ${ruta}: reintento ${reintentos} de ${config.reintentos429} en ${espera / 1000} s`);
        await dormir(espera);
        continue;
      }

      this.llamadas.push({
        metodo,
        ruta,
        status: respuesta.status,
        ms,
        reintentos429: reintentos,
        enviado: opciones.raw !== undefined ? opciones.raw : opciones.data,
        recibido: resumir(respuesta.texto === '' ? null : respuesta.body),
        etiqueta: opciones.etiqueta,
      });
      return respuesta;
    }
  }
}

function parsear(texto: string): any {
  if (!texto) return {};
  try {
    return JSON.parse(texto);
  } catch {
    return {};
  }
}

/** Texto legible de por qué falló una petición (para mensajes de precondición). */
export function motivo(r: Respuesta): string {
  const e = r.body && r.body.error;
  return `${r.status}${e && e.code ? ' ' + e.code : ''}${e && e.message ? ' - ' + e.message : ''}`;
}
