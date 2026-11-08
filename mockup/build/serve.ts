// Servidor mínimo del mockup con node:http, sin dependencias.
//
// Endurecido a propósito: con --host queda expuesto en la red local y el
// repositorio (con el .env) está dos carpetas arriba de mockup/dist. Por eso:
// - solo GET y HEAD;
// - la ruta pedida se decodifica (400 si está mal formada), se resuelve con
//   path.resolve y se descarta con 404 todo lo que no quede dentro de dist
//   (comprobado con path.relative, no con un startsWith simple);
// - sin listado de carpetas; tipos de contenido de una lista fija.

import { watch } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { networkInterfaces } from 'node:os';
import { extname, isAbsolute, join, relative, resolve } from 'node:path';
import { buildCss, buildMockup, DIST_DIR, MOCKUP_DIR } from './build.js';

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon',
};

export function createMockupServer(distDir: string): Server {
  const base = resolve(distDir);

  return createServer(async (req, res) => {
    const send = (status: number, body: string) => {
      res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(body);
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      send(405, 'Method not allowed');
      return;
    }

    const rawPath = (req.url ?? '/').split('?')[0]?.split('#')[0] ?? '/';
    let pathname: string;
    try {
      pathname = decodeURIComponent(rawPath);
    } catch {
      send(400, 'Bad request');
      return;
    }

    if (pathname.includes('\0') || pathname.includes('\\')) {
      send(404, 'Not found');
      return;
    }

    // Contención primero (antes de cualquier redirección): todo lo que no
    // quede dentro de dist es 404, comprobado con path.relative.
    const resolved = resolve(base, `.${pathname}`);
    const inside = relative(base, resolved);
    if (inside.startsWith('..') || isAbsolute(inside)) {
      send(404, 'Not found');
      return;
    }

    let filePath = resolved;
    if (pathname.endsWith('/')) {
      filePath = join(resolved, 'index.html');
    } else if (extname(pathname) === '') {
      // La Location se arma desde la ruta ya contenida en dist, nunca desde lo
      // que mandó el cliente: "//evil.example/x" sería una redirección abierta
      // relativa a protocolo (el espíritu de SEC-53).
      const safePath = inside.replaceAll('\\', '/');
      res.writeHead(301, { Location: `/${encodeURI(safePath)}/` });
      res.end();
      return;
    }

    const contentType = CONTENT_TYPES[extname(filePath).toLowerCase()];
    if (!contentType) {
      send(404, 'Not found');
      return;
    }

    let data: Buffer;
    try {
      data = await readFile(filePath);
    } catch {
      send(404, 'Not found');
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType, 'Content-Length': data.length });
    if (req.method === 'HEAD') {
      res.end();
    } else {
      res.end(data);
    }
  });
}

function lanAddresses(): string[] {
  return Object.values(networkInterfaces())
    .flatMap((addrs) => addrs ?? [])
    .filter((addr) => addr.family === 'IPv4' && !addr.internal)
    .map((addr) => addr.address);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === import.meta.filename;
if (isMain) {
  const args = process.argv.slice(2);
  const dev = args.includes('--dev');
  const exposed = args.includes('--host');
  const portArg = args.find((arg) => arg.startsWith('--port='));
  const port = portArg ? Number(portArg.slice('--port='.length)) : 4173;
  const host = exposed ? '0.0.0.0' : '127.0.0.1';

  if (dev) {
    await buildMockup();
    // tsx watch reinicia el proceso cuando cambia un módulo importado (páginas,
    // componentes, datos). Este vigilante cubre solo los CSS, que no son
    // módulos; mira únicamente mockup/styles, así que dist/ y node_modules/
    // quedan fuera y no hay ciclo de reconstrucciones.
    let timer: NodeJS.Timeout | undefined;
    watch(resolve(MOCKUP_DIR, 'styles'), () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          buildCss(DIST_DIR);
          console.log('CSS reconstruido');
        } catch (error) {
          console.error(error);
        }
      }, 150);
    });
  }

  const server = createMockupServer(DIST_DIR);
  server.listen(port, host, () => {
    console.log(`Mockup en http://127.0.0.1:${port}/`);
    if (exposed) {
      for (const address of lanAddresses()) {
        console.log(`En la red local: http://${address}:${port}/`);
      }
    }
  });
}
