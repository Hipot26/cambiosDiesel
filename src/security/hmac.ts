// Firma y verificación de mensajes entre el sitio y el screener (Spec de integración §7;
// SEC-01 a SEC-06, SEC-15). Funciones puras: el plugin de webhooks (T-07) y el cliente del
// screener las usan con los bytes crudos del cuerpo.
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { KeyedSecrets } from './keyed-secrets.js';

// Ventana de reloj admitida para X-ScreenProof-Timestamp, hacia atrás y hacia adelante (SEC-05).
export const SIGNATURE_WINDOW_SECONDS = 300;
// Secretos de firma: texto opaco de al menos 32 bytes (el spec pide "30+"; se exige 32).
export const SIGNING_SECRET_MIN_BYTES = 32;
// Identificador de clave (kid). Lo elige cada lado; el spec muestra "k1".
export const KID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

// Cabecera exacta: kid=<id>,sha256=<hex de 64>, sin espacios (SEC-03). El hex se valida aquí,
// ANTES de Buffer.from(hex, 'hex'), porque Node trunca en silencio ante un carácter inválido.
const SIGNATURE_HEADER = /^kid=([A-Za-z0-9_-]{1,32}),sha256=([0-9a-fA-F]{64})$/;
// Segundos Unix como entero, sin signo ni decimales, con largo máximo para no admitir números
// gigantes. Se usa tal como llegó: nunca se reformatea.
const TIMESTAMP = /^[0-9]{1,12}$/;

export type SignatureRejection =
  | 'missing_header'
  | 'malformed_header'
  | 'unknown_kid'
  | 'bad_timestamp'
  | 'stale_timestamp'
  | 'bad_signature';

// Resultado seguro de registrar: nunca lleva texto crudo de las cabeceras ni el cuerpo (SEC-04,
// SEC-13). El kid solo aparece cuando pasó su regex.
export type VerifyResult =
  | { ok: true; kid: string }
  | { ok: false; reason: SignatureRejection; kid?: string };

export interface VerifySignedRequestInput {
  signatureHeader: unknown;
  timestampHeader: unknown;
  rawBody: Buffer;
  secrets: KeyedSecrets;
  // Milisegundos desde la época; por defecto Date.now().
  now?: number;
}

// HMAC-SHA256(secreto, timestamp + "." + raw_body) en hex minúsculo. El mensaje se arma en
// bytes: el cuerpo nunca se convierte a texto (SEC-01).
export function signMessage(secret: Buffer, timestamp: string, rawBody: Buffer): string {
  const message = Buffer.concat([Buffer.from(`${timestamp}.`, 'utf8'), rawBody]);
  return createHmac('sha256', secret).update(message).digest('hex');
}

// Valor de X-ScreenProof-Signature para una petición saliente (SEC-15).
export function buildSignatureHeader(
  kid: string,
  secret: Buffer,
  timestamp: string,
  rawBody: Buffer,
): string {
  if (!KID_PATTERN.test(kid)) throw new Error('kid con formato inválido');
  if (!TIMESTAMP.test(timestamp)) throw new Error('timestamp con formato inválido');
  return `kid=${kid},sha256=${signMessage(secret, timestamp, rawBody)}`;
}

// Timestamp en segundos para firmar ahora.
export function currentTimestamp(now = Date.now()): string {
  return String(Math.floor(now / 1000));
}

export function parseSignatureHeader(value: unknown): { kid: string; hex: string } | null {
  if (typeof value !== 'string') return null;
  const match = SIGNATURE_HEADER.exec(value);
  if (!match?.[1] || !match[2]) return null;
  return { kid: match[1], hex: match[2].toLowerCase() };
}

function isFresh(timestamp: string, now: number): boolean {
  const seconds = Number(timestamp);
  const nowSeconds = Math.floor(now / 1000);
  return Math.abs(nowSeconds - seconds) <= SIGNATURE_WINDOW_SECONDS;
}

// Orden: timestamp (forma y ventana) → cabecera de firma → el kid elige UN secreto → HMAC →
// comparación en tiempo constante de 32 bytes (SEC-02). Nunca lanza por longitud: el regex de
// la cabecera garantiza 64 hex, es decir 32 bytes.
export function verifySignedRequest(input: VerifySignedRequestInput): VerifyResult {
  const now = input.now ?? Date.now();
  const timestamp = input.timestampHeader;
  if (typeof timestamp !== 'string' || !TIMESTAMP.test(timestamp)) {
    return { ok: false, reason: 'bad_timestamp' };
  }
  if (!isFresh(timestamp, now)) return { ok: false, reason: 'stale_timestamp' };

  if (input.signatureHeader === undefined) return { ok: false, reason: 'missing_header' };
  const parsed = parseSignatureHeader(input.signatureHeader);
  if (parsed === null) return { ok: false, reason: 'malformed_header' };

  const secret = input.secrets.get(parsed.kid);
  if (secret === undefined) return { ok: false, reason: 'unknown_kid', kid: parsed.kid };

  const expected = Buffer.from(signMessage(secret, timestamp, input.rawBody), 'hex');
  const received = Buffer.from(parsed.hex, 'hex');
  if (!timingSafeEqual(expected, received)) {
    return { ok: false, reason: 'bad_signature', kid: parsed.kid };
  }
  return { ok: true, kid: parsed.kid };
}
