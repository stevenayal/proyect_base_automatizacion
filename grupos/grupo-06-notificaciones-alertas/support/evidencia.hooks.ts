// evidencia.hooks.ts — evidencia visual de los escenarios UI del Grupo 06.
// Solo aplica a escenarios @grupo06 y @grupo06_fallo_controlado; no altera los hooks base de
// tests/bdd/support. Este archivo solo se carga en el perfil grupo06 de cucumber.js.
//
// Por escenario deja en results/evidencia-grupo06/<ID del escenario, p. ej. G6-NOTIF-UI-02>/:
//   NN-<paso>.png  captura después de cada paso (también adjunta al reporte JSON/HTML)
//   trace.zip      trace de Playwright (ver con: npx playwright show-trace <ruta>)
//
// Orden: los Before corren en orden de carga (el base abre el navegador primero) y los
// After en orden inverso (este corre antes del teardown base que cierra el navegador).

import { Before, AfterStep, After, setDefaultTimeout } from '@cucumber/cucumber';
import * as fs from 'fs';
import * as path from 'path';
import { AiquaaWorld } from '../../../tests/bdd/support/world';

const RAIZ = path.join('results', 'evidencia-grupo06');
const TAGS = '@grupo06 or @grupo06_fallo_controlado';

// Las aserciones de Playwright esperan hasta 5 s; con el mismo timeout de paso en Cucumber,
// un fallo se reporta como "function timed out" en vez del mensaje real de la asercion.
setDefaultTimeout(15_000);

function slug(texto: string, max = 40): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, max)
    .replace(/-$/, '');
}

type Evidencia = { dir: string; paso: number };
const porEscenario = new WeakMap<AiquaaWorld, Evidencia>();

Before({ tags: TAGS }, async function (this: AiquaaWorld, { pickle }) {
  // Carpeta corta (ID del escenario) para no superar el limite de 260 caracteres de rutas en Windows.
  const id = pickle.tags.map((t) => t.name.slice(1)).find((t) => /^G6-/.test(t));
  const dir = path.join(RAIZ, id ?? slug(pickle.name));
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  porEscenario.set(this, { dir, paso: 0 });
  await this.page?.context().tracing.start({ screenshots: true, snapshots: true, sources: false });
});

AfterStep({ tags: TAGS }, async function (this: AiquaaWorld, { pickleStep }) {
  const ev = porEscenario.get(this);
  if (!ev || !this.page) return;
  ev.paso += 1;
  const archivo = path.join(ev.dir, `${String(ev.paso).padStart(2, '0')}-${slug(pickleStep.text)}.png`);
  const imagen = await this.page.screenshot({ path: archivo, fullPage: true });
  await this.attach(imagen, 'image/png');
});

After({ tags: TAGS }, async function (this: AiquaaWorld) {
  const ev = porEscenario.get(this);
  if (!ev || !this.page) return;
  const trace = path.join(ev.dir, 'trace.zip');
  await this.page.context().tracing.stop({ path: trace });
  this.attach(`Trace de Playwright: ${trace} (npx playwright show-trace "${trace}")`, 'text/plain');
});
