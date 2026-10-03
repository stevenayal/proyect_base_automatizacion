import { Before, After } from '@cucumber/cucumber';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Semana06World } from './world';

const runId = new Date().toISOString().replace(/[:.]/g, '-');
const evidenceDir = join('grupos/grupo-01-autenticacion-acceso/evidence/semana-06', runId);
Before(async function (this: Semana06World) {
  await this.initWeb();
});
After(async function (this: Semana06World, { pickle, result, testCaseStartedId }) {
  try {
    await mkdir(evidenceDir, { recursive: true });
    const id = pickle.tags.find(tag => /^@AUT-\d+$/.test(tag.name))?.name.slice(1) || testCaseStartedId;
    const evidence = {
      runId, scenario: pickle.name, status: result?.status || 'UNKNOWN',
      observedAt: new Date().toISOString(), url: this.page?.url(),
      loginRequests: this.loginPage?.loginRequests || [],
    };
    await writeFile(join(evidenceDir, `${id}.json`), JSON.stringify(evidence, null, 2) + '\n');
    await this.attach(JSON.stringify(evidence, null, 2), 'application/json');
    if (this.page && !this.page.isClosed()) {
      const buffer = await this.page.screenshot({ path: join(evidenceDir, `${id}.png`), fullPage: true });
      await this.attach(buffer, 'image/png');
    }
  } finally {
    await this.teardown();
  }
});
