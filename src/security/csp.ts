// Cabeceras de seguridad por app (SEC-65, 02 §4.6). El sitio público necesita Turnstile
// (challenges.cloudflare.com en script-src y frame-src); el panel no tiene ningún origen externo.
// buildApp (src/app.ts) registra @fastify/helmet con helmetOptions('public'); la app del panel
// registrará helmetOptions('panel'). helmet agrega el nonce por petición a script-src
// (reply.cspNonce.script).
import type { FastifyHelmetOptions } from '@fastify/helmet';

export type AppName = 'public' | 'panel';

export const TURNSTILE_ORIGIN = 'https://challenges.cloudflare.com';

export type CspDirectives = Readonly<Record<string, readonly string[]>>;

export function cspDirectives(app: AppName): CspDirectives {
  const external = app === 'public' ? [TURNSTILE_ORIGIN] : [];
  return {
    'default-src': ["'self'"],
    'script-src': ["'self'", ...external],
    // Declarada aunque default-src la cubra: helmet agrega el nonce de estilo a style-src aunque
    // no exista, y una style-src solo con nonce bloquearía la hoja de Tailwind servida de 'self'.
    'style-src': ["'self'"],
    'connect-src': ["'self'"],
    'img-src': ["'self'", 'data:'],
    'frame-src': external.length > 0 ? external : ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  };
}

export function helmetOptions(app: AppName): FastifyHelmetOptions {
  return {
    enableCSPNonces: true,
    contentSecurityPolicy: {
      useDefaults: false,
      directives: { ...cspDirectives(app) },
    },
    hsts: { maxAge: 365 * 24 * 3600, includeSubDomains: true },
    // SEC-51: las páginas del candidato y /r/:token bajan a no-referrer en su propia ruta.
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  };
}
