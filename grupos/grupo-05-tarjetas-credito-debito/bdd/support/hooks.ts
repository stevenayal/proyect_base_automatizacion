// hooks.ts — abre/cierra el navegador alrededor de cada escenario y guarda evidencia.

import * as fs from 'fs';
import * as path from 'path';
import { Before, After, Status, setDefaultTimeout, ITestCaseHookParameter } from '@cucumber/cucumber';
import { Grupo05World } from './world';

// El sandbox es una app Next.js desplegada en Vercel: el arranque en frío y la
// hidratación superan con holgura los 5 s por defecto de Cucumber.
setDefaultTimeout(Number(process.env.STEP_TIMEOUT_MS ?? 75000));

const EVIDENCE_DIR = process.env.EVIDENCE_DIR
  || 'grupos/grupo-05-tarjetas-credito-debito/evidence/semana-06';

/** Tag con formato de ID de escenario: @G05-LOGIN-001. */
const ID_TAG = /^@[A-Z]\d{2}-[A-Z]+-\d{3}$/;

/** Devuelve el ID de escenario declarado como tag, si existe. */
function scenarioId(testCase: ITestCaseHookParameter): string | undefined {
  const tag = testCase.pickle.tags.find((t) => ID_TAG.test(t.name));
  return tag?.name.replace('@', '');
}

// El contexto HTTP es barato: se crea siempre (los escenarios web lo usan para
// sembrar datos). El navegador solo se abre si el escenario toca la interfaz.
Before(async function (this: Grupo05World) {
  await this.initApi();
});

Before({ tags: '@web' }, async function (this: Grupo05World) {
  await this.initWeb();
});

After(async function (this: Grupo05World, scenario: ITestCaseHookParameter) {
  const fallo = scenario.result?.status === Status.FAILED;
  const id = scenarioId(scenario);
  const estado = fallo ? 'FAILED' : 'PASSED';
  const sello = new Date().toISOString().replace(/[:.]/g, '-');

  if (id) fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

  if (this.page) {
    const buffer = await this.page.screenshot({ fullPage: true });
    // El fallo se adjunta al JSON de Cucumber: lo leen el classifier y el PDF.
    if (fallo) await this.attach(buffer, 'image/png');
    // Con ID declarado, la captura se persiste con ese mismo ID (evidencia ↔ escenario).
    if (id) fs.writeFileSync(path.join(EVIDENCE_DIR, `${id}-${estado}-${sello}.png`), buffer);
  } else if (id) {
    // Los escenarios de API no tienen pantalla: su evidencia es la última
    // respuesta observada, guardada con el mismo patrón de nombre.
    fs.writeFileSync(path.join(EVIDENCE_DIR, `${id}-${estado}-${sello}.json`), JSON.stringify({
      escenario: scenario.pickle.name,
      id,
      estado,
      ejecutado: new Date().toISOString(),
      tarjetaId: this.tarjetaId ?? null,
      ultimaRespuesta: this.ultimaRespuesta ?? null,
    }, null, 2));
  }

  await this.teardown();
});
