// afirmaciones.ts — comprobaciones de contrato reutilizadas por los Then.
// Son expected de negocio (status funcional, código de error): BLACKLIST del Healer de
// playwright-ai-agents-skill. Si la API cambia, el escenario tiene que fallar.

import { expect } from '@playwright/test';
import type { Respuesta } from './api/ApiClient';

/** Status esperado, con el cuerpo en el mensaje para diagnosticar sin abrir la traza. */
export function status(r: Respuesta, esperado: number): void {
  expect(r.status, `status HTTP (respuesta: ${r.texto.slice(0, 300) || 'sin cuerpo'})`).toBe(esperado);
}

/** Rechazo con status y error.code. */
export function rechazo(r: Respuesta, esperado: number, codigo: string): void {
  status(r, esperado);
  expect(r.body?.error?.code, 'error.code').toBe(codigo);
}
