// Pruebas del mockup. Construyen el mockup en una carpeta temporal y revisan
// el HTML generado, las fuentes y el servidor. Nombradas "mockup: …" sin
// identificador SEC: el mockup no implementa esos controles (los prepara).

import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { request as httpRequest, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join, posix } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildMockup } from '../../mockup/build/build.js';
import { routes } from '../../mockup/build/routes.js';
import { createMockupServer } from '../../mockup/build/serve.js';
import { allJobs, sprint1Jobs } from '../../mockup/data/jobs.js';
import { equipmentValues, tradeValues } from '../../mockup/data/vocabulary.js';

const MOCKUP_SRC = join(import.meta.dirname, '..', '..', 'mockup');

let outDir: string;
// Rutas relativas (con '/') de todos los archivos construidos
let builtFiles: Set<string>;
// [carpeta de la página, html] por cada index.html construido
let pages: Array<{ dir: string; file: string; html: string }>;

async function walk(dir: string, prefix = ''): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...(await walk(join(dir, entry.name), rel)));
    } else {
      files.push(rel);
    }
  }
  return files;
}

beforeAll(async () => {
  outDir = await mkdtemp(join(tmpdir(), 'dju-mockup-'));
  await buildMockup(outDir);
  const files = await walk(outDir);
  builtFiles = new Set(files);
  pages = await Promise.all(
    files
      .filter((file) => file.endsWith('index.html'))
      .map(async (file) => ({
        dir: posix.dirname(file) === '.' ? '' : posix.dirname(file),
        file,
        html: await readFile(join(outDir, file), 'utf8'),
      })),
  );
}, 120_000);

afterAll(async () => {
  await rm(outDir, { recursive: true, force: true });
});

describe('mockup: páginas construidas', () => {
  it('mockup: construye una página por ruta', () => {
    expect(pages.length).toBe(routes.length);
  });

  it('mockup: toda página con meta noindex, nofollow', () => {
    for (const page of pages) {
      expect(page.html, page.file).toContain('<meta name="robots" content="noindex, nofollow"/>');
    }
  });

  it('mockup: cero script, style= y on…= y cero recursos externos (prepara SEC-65)', () => {
    const tagPattern = /<(a|link|img|script|iframe|embed|object|source|video|audio|form)\b[^>]*>/gi;
    for (const page of pages) {
      expect(page.html, page.file).not.toMatch(/<script\b/i);
      expect(page.html, page.file).not.toMatch(/\sstyle="/i);
      expect(page.html, page.file).not.toMatch(/\son[a-z]+=/i);
      for (const match of page.html.matchAll(tagPattern)) {
        const [tag, name] = match;
        const url = /(?:href|src|action)="([^"]*)"/i.exec(tag)?.[1];
        if (!url) continue;
        const external = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(url);
        if (external) {
          // Único destino externo permitido: enlaces <a> hacia example.com
          expect(name?.toLowerCase(), `${page.file}: ${tag}`).toBe('a');
          expect(url, page.file).toMatch(/^https:\/\/example\.com\//);
        }
      }
    }
  });

  it('mockup: todo enlace interno lleva a una página que existe', () => {
    const urlPattern = /(?:href|src)="([^"]*)"/g;
    for (const page of pages) {
      for (const match of page.html.matchAll(urlPattern)) {
        const raw = match[1] ?? '';
        const url = raw.split('?')[0]?.split('#')[0] ?? '';
        if (url === '' || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(raw)) continue;
        const resolved = posix.normalize(posix.join('/', page.dir, url)).replace(/^\//, '');
        const target =
          url.endsWith('/') || resolved === '' ? posix.join(resolved, 'index.html') : resolved;
        expect(builtFiles.has(target), `${page.file}: enlace roto "${raw}" (${target})`).toBe(true);
      }
    }
  });

  it('mockup: sin nivel visible ni textos prohibidos (prepara SEC-55)', () => {
    for (const page of pages) {
      expect(page.html, page.file).not.toMatch(/confidential employer/i);
      expect(page.html, page.file).not.toMatch(/pay now/i);
      expect(page.html, page.file).not.toMatch(/current pay/i);
      expect(page.html, page.file).not.toMatch(/Level [ABC]\b/);
    }
  });

  it('mockup: ninguna casilla sale marcada', () => {
    for (const page of pages) {
      expect(page.html, page.file).not.toMatch(/<input[^>]*\bchecked\b/i);
    }
  });

  it('mockup: todo input y select tiene su label', () => {
    const controlPattern = /<(?:input|select|textarea)\b[^>]*>/gi;
    for (const page of pages) {
      for (const [tag] of page.html.matchAll(controlPattern)) {
        if (/type="hidden"/i.test(tag)) continue;
        const id = /\bid="([^"]+)"/.exec(tag)?.[1];
        expect(id, `${page.file}: control sin id: ${tag}`).toBeTruthy();
        const labelPattern = new RegExp(`<label\\b[^>]*\\bfor="${id}"`);
        expect(labelPattern.test(page.html), `${page.file}: sin label para #${id}`).toBe(true);
      }
    }
  });

  it('mockup: robots.txt con Disallow: /', async () => {
    const robots = await readFile(join(outDir, 'robots.txt'), 'utf8');
    expect(robots).toContain('User-agent: *');
    expect(robots).toContain('Disallow: /');
  });
});

describe('mockup: fuentes', () => {
  it('mockup: ningún color hex fuera de tokens.css', async () => {
    const hexPattern = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/;
    const sources = (await walk(MOCKUP_SRC)).filter(
      (file) =>
        !file.startsWith('dist/') && file !== 'styles/tokens.css' && /\.(?:tsx?|css)$/.test(file),
    );
    expect(sources.length).toBeGreaterThan(10);
    for (const file of sources) {
      const content = await readFile(join(MOCKUP_SRC, file), 'utf8');
      expect(content, `mockup/${file}`).not.toMatch(hexPattern);
    }
  });

  it('mockup: todo oficio y equipo de los datos existe en el vocabulario', () => {
    const jobs = [...allJobs.map(({ job }) => job), ...sprint1Jobs];
    expect(jobs.length).toBeGreaterThan(0);
    for (const job of jobs) {
      expect(tradeValues.has(job.trade), `${job.slug}: trade "${job.trade}"`).toBe(true);
      for (const item of job.equipment) {
        expect(equipmentValues.has(item), `${job.slug}: equipment "${item}"`).toBe(true);
      }
    }
  });
});

describe('mockup: servidor', () => {
  let server: Server;
  let port: number;

  function req(
    method: string,
    path: string,
  ): Promise<{ status: number; type: string; location: string }> {
    return new Promise((resolve, reject) => {
      const request = httpRequest({ host: '127.0.0.1', port, method, path }, (res) => {
        res.resume();
        res.on('end', () =>
          resolve({
            status: res.statusCode ?? 0,
            type: String(res.headers['content-type'] ?? ''),
            location: String(res.headers.location ?? ''),
          }),
        );
      });
      request.on('error', reject);
      request.end();
    });
  }

  beforeAll(async () => {
    server = createMockupServer(outDir);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('sin puerto');
    port = address.port;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });

  it('mockup: el servidor no sale de dist', async () => {
    expect((await req('GET', '/../../.env')).status).toBe(404);
    expect((await req('GET', '/%2e%2e/%2e%2e/.env')).status).toBe(404);
    expect((await req('GET', '/..%5c..%5c.env')).status).toBe(404);
  });

  it('mockup: la redirección de carpeta nunca sale del propio origen', async () => {
    // "//evil.example/x" como Location sería una redirección abierta relativa
    // a protocolo; la Location se arma desde la ruta contenida en dist.
    const open = await req('GET', '//evil.example/x');
    if (open.status === 301) {
      expect(open.location).toBe('/evil.example/x/');
    } else {
      expect(open.status).toBe(404);
    }
    const normal = await req('GET', '/home');
    expect(normal.status).toBe(301);
    expect(normal.location).toBe('/home/');
  });

  it('mockup: 400 ante una ruta mal formada y 405 ante otros métodos', async () => {
    expect((await req('GET', '/%E0%A4%A')).status).toBe(400);
    expect((await req('POST', '/')).status).toBe(405);
    expect((await req('DELETE', '/home/')).status).toBe(405);
  });

  it('mockup: sirve el índice y los estáticos de la lista fija', async () => {
    const index = await req('GET', '/');
    expect(index.status).toBe(200);
    expect(index.type).toContain('text/html');
    const css = await req('GET', '/static/app.css');
    expect(css.status).toBe(200);
    expect(css.type).toContain('text/css');
    // Una extensión fuera de la lista fija no se sirve
    expect((await req('GET', '/robots.json')).status).toBe(404);
  });
});
