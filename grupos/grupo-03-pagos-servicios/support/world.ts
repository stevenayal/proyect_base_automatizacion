// world.ts — contexto de cada escenario.
// Los steps nunca arman peticiones ni tocan `page`: usan this.facturas (API de negocio),
// los datos que el escenario va recordando (factura, respuesta, listado) y, en los @web,
// los Page Objects que crea hooks.ts.

import { setWorldConstructor, World, type IWorldOptions } from '@cucumber/cucumber';
import type { APIRequestContext, BrowserContext, Page } from '@playwright/test';
import { ApiClient, motivo, type Respuesta } from './api/ApiClient';
import { FacturasApi, numeroUnico } from './api/FacturasApi';
import { config } from './config';
import { titularDeLaCorrida } from './titular';

/** Lo que el escenario sabe de una factura que creó o usó. */
export interface FacturaEscenario {
  id: number;
  numero: string;
  proveedor: string;
  monto: number;
  usuarioId: number;
  fechaVencimiento: string;
  /** Estado que la factura debería tener ahora (lo actualizan los pasos de pago). */
  estado: string;
  dadaDeBaja: boolean;
  /** Factura de los datos sembrados: no se crea ni se limpia. */
  sembrada?: boolean;
}

export class G3World extends World {
  request!: APIRequestContext;
  http!: ApiClient;
  facturas!: FacturasApi;

  /** Solo en escenarios @web. */
  context?: BrowserContext;
  page?: Page;

  apiKey = config.apiKey;
  /** Factura principal del escenario. */
  factura?: FacturaEscenario;
  /** Facturas por proveedor, para los escenarios con dos facturas. */
  porProveedor: Record<string, FacturaEscenario> = {};
  /** Ids creados en el escenario: se dan de baja al final (el listado está limitado a 100). */
  creadas = new Set<number>();
  /** Última respuesta de la operación bajo prueba (la del When). */
  respuesta?: Respuesta;
  /** Filtros del último listado consultado por API (la verificación web repite la misma consulta). */
  filtrosListado?: Record<string, string | number>;
  /** Id usado en las operaciones sobre una factura inexistente (para la verificación en la base). */
  idInexistenteUsado?: number;

  constructor(options: IWorldOptions) {
    super(options);
  }

  get titular(): number {
    return titularDeLaCorrida().id;
  }

  /** Respuesta del When; falla con un mensaje claro si el escenario todavía no la tiene. */
  get r(): Respuesta {
    if (!this.respuesta) throw new Error('El escenario no ejecutó la operación bajo prueba.');
    return this.respuesta;
  }

  get f(): FacturaEscenario {
    if (!this.factura) throw new Error('El escenario no tiene una factura preparada.');
    return this.factura;
  }

  /** Crea una factura pendiente del titular (precondición: si falla, el escenario no sigue). */
  async crearFacturaPendiente(proveedor: string): Promise<FacturaEscenario> {
    const datos = {
      usuarioId: this.titular,
      proveedor,
      numeroFactura: numeroUnico(proveedor),
      monto: 50000,
      fechaVencimiento: '2026-12-31',
    };
    const r = await this.facturas.registrar(datos, { etiqueta: 'preparación' });
    if (r.status !== 201 || !r.body?.data?.id) {
      throw new Error(`Precondición no cumplida: no se pudo crear la factura de ${proveedor} (${motivo(r)})`);
    }
    const f = this.recordar(r.body.data);
    this.porProveedor[proveedor] = f;
    if (!this.factura) this.factura = f;
    return f;
  }

  /** Guarda una factura devuelta por la API como la factura del escenario. */
  recordar(data: any, opciones: { sembrada?: boolean } = {}): FacturaEscenario {
    const f: FacturaEscenario = {
      id: Number(data.id),
      numero: String(data.numero_factura ?? ''),
      proveedor: String(data.proveedor ?? ''),
      monto: Number(data.monto),
      usuarioId: Number(data.usuario_id),
      fechaVencimiento: String(data.fecha_vencimiento ?? ''),
      estado: String(data.estado ?? ''),
      dadaDeBaja: false,
      sembrada: opciones.sembrada,
    };
    if (!opciones.sembrada) this.creadas.add(f.id);
    return f;
  }
}

setWorldConstructor(G3World);
