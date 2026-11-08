// Capturas del mockup para revisar el diseño sin abrir el navegador: cada
// página a 375, 768, 1280 y 1920 px en mockup/shots/ (carpeta en .gitignore;
// las capturas nunca se commitean). Usa el Chromium de Playwright
// (npx playwright install chromium) contra el servidor del mockup en
// 127.0.0.1 con puerto efímero.

import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { buildMockup, DIST_DIR, MOCKUP_DIR } from './build.js';
import { routes } from './routes.js';
import { createMockupServer } from './serve.js';

const SHOTS_DIR = join(MOCKUP_DIR, 'shots');
const WIDTHS = [375, 768, 1280, 1920] as const;

function shotName(path: string, width: number): string {
  const page = path === '' ? 'index' : path.replace(/\/$/, '').replaceAll('/', '-');
  return `${page}-${width}.png`;
}

await buildMockup();
await rm(SHOTS_DIR, { recursive: true, force: true });
await mkdir(SHOTS_DIR, { recursive: true });

const server = createMockupServer(DIST_DIR);
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
if (address === null || typeof address === 'string') throw new Error('sin puerto');
const base = `http://127.0.0.1:${address.port}`;

const browser = await chromium.launch();
const page = await browser.newPage();
for (const route of routes) {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${base}/${route.path}`);
    await page.screenshot({ path: join(SHOTS_DIR, shotName(route.path, width)), fullPage: true });
  }
}
await browser.close();
await new Promise<void>((resolve, reject) =>
  server.close((error) => (error ? reject(error) : resolve())),
);
console.log(`${routes.length * WIDTHS.length} capturas en ${SHOTS_DIR}`);
