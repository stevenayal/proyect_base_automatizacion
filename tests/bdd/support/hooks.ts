// hooks.ts — abre/cierra el navegador alrededor de cada escenario y guarda evidencia.

import * as fs from 'fs';
import * as path from 'path';
import { Before, After, Status, setDefaultTimeout, ITestCaseHookParameter } from '@cucumber/cucumber';
import { AiquaaWorld } from './world';

// El sandbox es una app Next.js desplegada en Vercel: el arranque en frío y la
// hidratación superan con holgura los 5 s por defecto de Cucumber.
setDefaultTimeout(Number(process.env.STEP_TIMEOUT_MS ?? 75000));

/** Tag con formato de ID de escenario: @G05-LOGIN-001. */
const ID_TAG = /^@[A-Z]\d{2}-[A-Z]+-\d{3}$/;

/** Devuelve el ID de escenario declarado como tag, si existe. */
function scenarioId(testCase: ITestCaseHookParameter): string | undefined {
  const tag = testCase.pickle.tags.find((t) => ID_TAG.test(t.name));
  return tag?.name.replace('@', '');
}

// El contexto HTTP es barato: se crea siempre (los escenarios web lo usan para
// sembrar datos). El navegador solo se abre si el escenario toca la interfaz.
Before(async function (this: AiquaaWorld) {
  await this.initApi();
});

Before({ tags: 'not @api or @web' }, async function (this: AiquaaWorld) {
  await this.initWeb();
});

After(async function (this: AiquaaWorld, scenario: ITestCaseHookParameter) {
  const { result } = scenario;
  const fallo = result?.status === Status.FAILED;

  const id = scenarioId(scenario);
  const dir = process.env.EVIDENCE_DIR;
  const estado = fallo ? 'FAILED' : 'PASSED';
  const sello = new Date().toISOString().replace(/[:.]/g, '-');

  if (this.page) {
    const buffer = await this.page.screenshot({ fullPage: true });

    // Siempre adjunta al reporte de Cucumber si el escenario falló.
    if (fallo) {
      await this.attach(buffer, 'image/png');
    }

    // Si el escenario declara un ID, además persiste la captura en disco
    // con ese mismo ID, para trazar evidencia ↔ escenario.
    if (id && dir) {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${id}-${estado}-${sello}.png`), buffer);
    }
  }

  // Los escenarios de API no tienen pantalla: su evidencia es la última
  // respuesta observada, guardada con el mismo patrón de nombre.
  if (!this.page && id && dir) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${id}-${estado}-${sello}.json`), JSON.stringify({
      escenario: scenario.pickle.name,
      id,
      estado,
      ejecutado: new Date().toISOString(),
      ultimaRespuesta: { status: this.lastStatus, body: this.lastBody },
      contexto: this.context,
    }, null, 2));
  }

  await this.teardown();
});
