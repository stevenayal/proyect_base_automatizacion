import { Before, After } from '@cucumber/cucumber';
import fs from 'node:fs';
import path from 'node:path';
import { Semana06World } from './world';

Before(async function (this: Semana06World) {
  await this.initWeb();
});

After(async function (this: Semana06World, { result, pickle }) {
  if (this.page) {
    const evidenceDir = path.resolve(
      'grupos/grupo-01-autenticacion-acceso/evidence/semana-06'
    );

    fs.mkdirSync(evidenceDir, { recursive: true });

    const autTag =
      pickle.tags
        .find(tag => /^@AUT-\d+/i.test(tag.name))
        ?.name.replace('@', '') || 'ESCENARIO';

    const safeName = pickle.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/^-|-$/g, '');

    const status = String(result?.status || 'UNKNOWN').toLowerCase();

    const screenshotPath = path.join(
      evidenceDir,
      `${autTag}-${status}-${safeName}.png`
    );

    const buffer = await this.page.screenshot({
      path: screenshotPath,
      fullPage: true,
    });

    await this.attach(buffer, 'image/png');

    console.log(`[EVIDENCIA] ${screenshotPath}`);
  }

  await this.teardown();
});