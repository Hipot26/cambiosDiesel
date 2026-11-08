// Construye el mockup: renderiza cada ruta a HTML estático con
// preact-render-to-string, escribe robots.txt y compila el CSS con
// @tailwindcss/cli como proceso hijo (node + ruta del paquete, sin shell).

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { render } from 'preact-render-to-string';
import { rootPrefix } from './rel.js';
import { routes } from './routes.js';

export const MOCKUP_DIR = resolve(import.meta.dirname, '..');
export const DIST_DIR = join(MOCKUP_DIR, 'dist');
const REPO_ROOT = resolve(MOCKUP_DIR, '..');

export function buildCss(outDir: string): void {
  const cliDir = join(REPO_ROOT, 'node_modules', '@tailwindcss', 'cli');
  const pkg = JSON.parse(readFileSync(join(cliDir, 'package.json'), 'utf8')) as {
    bin: string | Record<string, string>;
  };
  const binRel = typeof pkg.bin === 'string' ? pkg.bin : Object.values(pkg.bin)[0];
  if (!binRel) throw new Error('No se encontró el binario de @tailwindcss/cli');
  const result = spawnSync(
    process.execPath,
    [
      join(cliDir, binRel),
      '-i',
      join(MOCKUP_DIR, 'styles', 'app.css'),
      '-o',
      join(outDir, 'static', 'app.css'),
      '--minify',
    ],
    { cwd: MOCKUP_DIR, encoding: 'utf8' },
  );
  if (result.status !== 0) {
    throw new Error(`@tailwindcss/cli terminó con código ${result.status}:\n${result.stderr}`);
  }
}

export async function buildMockup(outDir: string = DIST_DIR): Promise<void> {
  await rm(outDir, { recursive: true, force: true });

  for (const route of routes) {
    const root = rootPrefix(route.path);
    const html = `<!doctype html>\n${render(route.render(root))}\n`;
    const dir = join(outDir, ...route.path.split('/').filter(Boolean));
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'index.html'), html, 'utf8');
  }

  await writeFile(join(outDir, 'robots.txt'), 'User-agent: *\nDisallow: /\n', 'utf8');
  buildCss(outDir);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === import.meta.filename;
if (isMain) {
  await buildMockup();
  console.log(`Mockup construido: ${routes.length} páginas en ${DIST_DIR}`);
}
