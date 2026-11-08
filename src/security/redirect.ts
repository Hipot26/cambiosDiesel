// Redirecciones solo a rutas internas de una lista permitida (SEC-53). Todo valor que venga del
// usuario (next, redirect, return_url) pasa por aquí antes de ir a un Location.
export const DEFAULT_REDIRECT = '/account';

// Rutas exactas (pathname) a las que se puede volver. Ampliarla es una línea; la query se
// conserva y el fragmento se descarta.
export const ALLOWED_REDIRECT_PATHS: ReadonlySet<string> = new Set(['/account', '/jobs']);

const MAX_LENGTH = 2048;
// Solo ASCII visible: sin espacios, tabuladores, saltos de línea ni caracteres de control, que
// el parser de URL quita en silencio.
const VISIBLE_ASCII = /^[\x21-\x7E]+$/;
// Una sola barra seguida de letra o dígito: descarta "//host", "/\host" y "/%2F…" de entrada.
const INTERNAL_PATH_START = /^\/[A-Za-z0-9]/;
// Origen ficticio solo para resolver; nunca sale en la respuesta.
const BASE = 'http://internal.invalid';

export function safeRedirect(
  value: unknown,
  fallback: string = DEFAULT_REDIRECT,
  allowed: ReadonlySet<string> = ALLOWED_REDIRECT_PATHS,
): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_LENGTH) {
    return fallback;
  }
  if (!VISIBLE_ASCII.test(value) || !INTERNAL_PATH_START.test(value)) return fallback;

  let url: URL;
  try {
    url = new URL(value, BASE);
  } catch {
    return fallback;
  }
  // El origen no cambió y la ruta normalizada (sin "..", sin "\") está en la lista.
  if (url.origin !== BASE || !allowed.has(url.pathname)) return fallback;
  // Se devuelve la forma normalizada, nunca el valor crudo.
  return `${url.pathname}${url.search}`;
}
