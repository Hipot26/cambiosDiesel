// Tokens de los enlaces de regreso (SEC-49, 03 §1.9): 32 bytes aleatorios en base64url; en la
// base solo se guarda su SHA-256. Canjearlos (rutas, tabla, un solo uso) llega con T-04 y las
// rutas del candidato.
import { createHash, randomBytes } from 'node:crypto';

export const TOKEN_BYTES = 32;
// 32 bytes en base64url son exactamente 43 caracteres sin relleno.
const TOKEN_FORMAT = /^[A-Za-z0-9_-]{43}$/;

export const TOKEN_PURPOSES = ['return', 'email_verify', 'delete_confirm', 'unsubscribe'] as const;
export type TokenPurpose = (typeof TOKEN_PURPOSES)[number];

const HOUR = 3600;
const DAY = 24 * HOUR;

// Vigencia por propósito (03 §1.9).
export const TOKEN_TTL_SECONDS: Readonly<Record<TokenPurpose, number>> = {
  return: 72 * HOUR,
  email_verify: HOUR,
  delete_confirm: HOUR,
  unsubscribe: 365 * DAY,
};

export interface ReturnToken {
  // Va en el enlace; nunca se guarda ni se registra.
  token: string;
  // Va en la columna token_hash.
  tokenHash: string;
}

export function createReturnToken(): ReturnToken {
  const token = randomBytes(TOKEN_BYTES).toString('base64url');
  return { token, tokenHash: sha256Hex(token) };
}

// Hash de un token recibido para buscarlo por token_hash. Devuelve null si la forma no es la de
// un token nuestro, así una entrada cualquiera no llega a la base.
export function hashReturnToken(token: unknown): string | null {
  if (typeof token !== 'string' || !TOKEN_FORMAT.test(token)) return null;
  return sha256Hex(token);
}

export function tokenExpiresAt(purpose: TokenPurpose, now: Date = new Date()): Date {
  return new Date(now.getTime() + TOKEN_TTL_SECONDS[purpose] * 1000);
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
