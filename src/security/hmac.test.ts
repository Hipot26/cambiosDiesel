import { describe, expect, it, vi } from 'vitest';

// Espía sobre timingSafeEqual para comprobar que solo se llama con 32 bytes (SEC-02).
const timingSafeEqualSpy = vi.hoisted(() => vi.fn());
vi.mock('node:crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:crypto')>();
  timingSafeEqualSpy.mockImplementation(actual.timingSafeEqual);
  return { ...actual, timingSafeEqual: timingSafeEqualSpy };
});

const {
  buildSignatureHeader,
  currentTimestamp,
  parseSignatureHeader,
  SIGNATURE_WINDOW_SECONDS,
  signMessage,
  verifySignedRequest,
} = await import('./hmac.js');

// Secretos inventados (≥ 32 bytes), nunca reales.
const K1 = Buffer.from('secreto-entrada-k1-de-prueba-0000000000000', 'utf8');
const K2 = Buffer.from('secreto-entrada-k2-de-prueba-1111111111111', 'utf8');
const OUT = Buffer.from('secreto-salida-s1-de-prueba-22222222222222', 'utf8');
const inbound = new Map([
  ['k1', K1],
  ['k2', K2],
]);
const outbound = new Map([['s1', OUT]]);

const NOW_MS = 1_800_000_000_000;
const NOW_S = 1_800_000_000;
const ts = String(NOW_S);
const body = Buffer.from('{"event":"screen.completed","level":"A"}', 'utf8');

function headerFor(kid: string, secret: Buffer, timestamp = ts, raw = body) {
  return buildSignatureHeader(kid, secret, timestamp, raw);
}

function verify(
  signatureHeader: unknown,
  overrides: Partial<{
    timestampHeader: unknown;
    rawBody: Buffer;
    secrets: Map<string, Buffer>;
  }> = {},
) {
  return verifySignedRequest({
    signatureHeader,
    timestampHeader: ts,
    rawBody: body,
    secrets: inbound,
    now: NOW_MS,
    ...overrides,
  });
}

describe('hmac', () => {
  it('SEC-01 firma sobre bytes crudos', () => {
    const compacto = Buffer.from('{"a":1,"b":2}', 'utf8');
    const conEspacios = Buffer.from('{"a": 1, "b": 2}', 'utf8');
    expect(JSON.parse(compacto.toString())).toEqual(JSON.parse(conEspacios.toString()));
    // El mismo JSON con espacios distintos produce firmas distintas.
    expect(signMessage(K1, ts, compacto)).not.toBe(signMessage(K1, ts, conEspacios));
    // Solo los bytes exactos pasan; un cuerpo reserializado falla.
    const header = headerFor('k1', K1, ts, conEspacios);
    expect(verify(header, { rawBody: conEspacios })).toEqual({ ok: true, kid: 'k1' });
    const reserializado = Buffer.from(JSON.stringify(JSON.parse(conEspacios.toString())), 'utf8');
    expect(verify(header, { rawBody: reserializado })).toEqual({
      ok: false,
      reason: 'bad_signature',
      kid: 'k1',
    });
    // El mensaje se arma en bytes: un cuerpo que no es UTF-8 válido se firma y verifica igual,
    // y su firma no coincide con la de rawBody.toString().
    const binario = Buffer.from([0x7b, 0xff, 0xfe, 0x00, 0x7d]);
    const firmaBytes = signMessage(K1, ts, binario);
    expect(verify(headerFor('k1', K1, ts, binario), { rawBody: binario })).toEqual({
      ok: true,
      kid: 'k1',
    });
    expect(firmaBytes).not.toBe(signMessage(K1, ts, Buffer.from(binario.toString('utf8'), 'utf8')));
  });

  it('SEC-02 comparación en tiempo constante', () => {
    timingSafeEqualSpy.mockClear();
    const header = headerFor('k1', K1);
    expect(verify(header)).toEqual({ ok: true, kid: 'k1' });
    // Un byte cambiado falla.
    const hex = header.slice('kid=k1,sha256='.length);
    const alterado = `${hex.slice(0, -2)}${hex.endsWith('00') ? 'ff' : '00'}`;
    expect(verify(`kid=k1,sha256=${alterado}`)).toEqual({
      ok: false,
      reason: 'bad_signature',
      kid: 'k1',
    });
    // Hex en mayúsculas es la misma firma.
    expect(verify(`kid=k1,sha256=${hex.toUpperCase()}`)).toEqual({ ok: true, kid: 'k1' });
    // Hasta aquí, toda comparación fue de 32 bytes contra 32 bytes.
    expect(timingSafeEqualSpy).toHaveBeenCalledTimes(3);
    for (const [a, b] of timingSafeEqualSpy.mock.calls as [Buffer, Buffer][]) {
      expect(a.length).toBe(32);
      expect(b.length).toBe(32);
    }
    // Longitud distinta o hex inválido se rechazan antes, sin comparar y sin lanzar.
    timingSafeEqualSpy.mockClear();
    for (const malo of [hex.slice(0, 63), `${hex}0`, `${hex.slice(0, 63)}g`]) {
      expect(verify(`kid=k1,sha256=${malo}`), malo).toEqual({
        ok: false,
        reason: 'malformed_header',
      });
    }
    expect(timingSafeEqualSpy).not.toHaveBeenCalled();
  });

  it('SEC-03 cabecera mal formada → rechazo', () => {
    const hex = signMessage(K1, ts, body);
    const marcador = 'MARCADOR 7f3e';
    const casos: [unknown, string][] = [
      [undefined, 'missing_header'],
      ['', 'malformed_header'],
      [`sha256=${hex}`, 'malformed_header'],
      [`kid=k1, sha256=${hex}`, 'malformed_header'],
      [` kid=k1,sha256=${hex}`, 'malformed_header'],
      [`kid=k1,sha256=${hex} `, 'malformed_header'],
      [`kid=k,1,sha256=${hex}`, 'malformed_header'],
      [`kid=${marcador},sha256=${hex}`, 'malformed_header'],
      [`kid=k1,sha256=${hex.slice(0, 63)}`, 'malformed_header'],
      [`kid=k1,sha256=${hex.slice(0, 63)}g`, 'malformed_header'],
      [`sha256=${hex},kid=k1`, 'malformed_header'],
      [[`kid=k1,sha256=${hex}`], 'malformed_header'],
      [`kid=k9,sha256=${hex}`, 'unknown_kid'],
    ];
    for (const [header, reason] of casos) {
      const result = verify(header);
      expect(result.ok, String(header)).toBe(false);
      expect(result, String(header)).toMatchObject({ reason });
      // El resultado nunca lleva texto crudo de la cabecera: ni el hex ni un kid que no pasó
      // su regex.
      const texto = JSON.stringify(result);
      expect(texto, String(header)).not.toContain(hex);
      expect(texto, String(header)).not.toContain(marcador);
    }
    // El kid se devuelve solo cuando pasó su regex (sirve para el log de SEC-04).
    expect(verify(`kid=k9,sha256=${hex}`)).toEqual({ ok: false, reason: 'unknown_kid', kid: 'k9' });
    expect(parseSignatureHeader(`kid=k1,sha256=${hex}`)).toEqual({ kid: 'k1', hex });
    expect(parseSignatureHeader(`sha256=${hex}`)).toBeNull();
  });

  it('SEC-05 ventana de 300 s', () => {
    expect(SIGNATURE_WINDOW_SECONDS).toBe(300);
    const en = (delta: number) => {
      const t = String(NOW_S + delta);
      return verify(headerFor('k1', K1, t), { timestampHeader: t });
    };
    expect(en(-299)).toEqual({ ok: true, kid: 'k1' });
    expect(en(-300)).toEqual({ ok: true, kid: 'k1' });
    expect(en(-301)).toEqual({ ok: false, reason: 'stale_timestamp' });
    expect(en(299)).toEqual({ ok: true, kid: 'k1' });
    expect(en(301)).toEqual({ ok: false, reason: 'stale_timestamp' });
    // Forma inválida: no numérico, decimal, negativo, milisegundos de 13 dígitos, vacío, array.
    for (const malo of [
      'abc',
      '1800000000.5',
      '-1800000000',
      `${NOW_S}000`,
      '',
      ' 1800000000',
      undefined,
      [ts],
    ]) {
      expect(verify(headerFor('k1', K1), { timestampHeader: malo }), String(malo)).toEqual({
        ok: false,
        reason: 'bad_timestamp',
      });
    }
    // El timestamp se usa tal como llegó: con un cero adelante firma distinto y verifica igual.
    const conCero = `0${ts}`;
    expect(verify(headerFor('k1', K1, conCero), { timestampHeader: conCero })).toEqual({
      ok: true,
      kid: 'k1',
    });
    expect(verify(headerFor('k1', K1, ts), { timestampHeader: conCero })).toEqual({
      ok: false,
      reason: 'bad_signature',
      kid: 'k1',
    });
    // Sin "now" usa el reloj real.
    const ahora = currentTimestamp();
    expect(ahora).toMatch(/^[0-9]{10}$/);
    expect(
      verifySignedRequest({
        signatureHeader: headerFor('k1', K1, ahora),
        timestampHeader: ahora,
        rawBody: body,
        secrets: inbound,
      }),
    ).toEqual({ ok: true, kid: 'k1' });
  });

  it('SEC-06 dos secretos por kid', () => {
    expect(verify(headerFor('k1', K1))).toEqual({ ok: true, kid: 'k1' });
    expect(verify(headerFor('k2', K2))).toEqual({ ok: true, kid: 'k2' });
    expect(verify(headerFor('k3', K1))).toEqual({ ok: false, reason: 'unknown_kid', kid: 'k3' });
    // El kid elige un solo secreto: la firma de k2 bajo kid=k1 no se prueba contra k2.
    expect(verify(headerFor('k1', K2))).toEqual({ ok: false, reason: 'bad_signature', kid: 'k1' });
    // Al quitar k1 del entorno, k1 deja de valer.
    const soloK2 = new Map([['k2', K2]]);
    expect(verify(headerFor('k1', K1), { secrets: soloK2 })).toEqual({
      ok: false,
      reason: 'unknown_kid',
      kid: 'k1',
    });
    expect(verify(headerFor('k2', K2), { secrets: soloK2 })).toEqual({ ok: true, kid: 'k2' });
  });

  it('SEC-15 secreto de salida distinto del de entrada', () => {
    const header = headerFor('s1', OUT);
    expect(header).toMatch(/^kid=s1,sha256=[0-9a-f]{64}$/);
    // Lo firmado con el secreto de salida lo verifica quien tiene ese secreto (el screener)…
    expect(verify(header, { secrets: outbound })).toEqual({ ok: true, kid: 's1' });
    // …y no el anillo de entrada del sitio, ni aunque comparta el kid.
    expect(verify(header)).toEqual({ ok: false, reason: 'unknown_kid', kid: 's1' });
    expect(verify(header, { secrets: new Map([['s1', K1]]) })).toEqual({
      ok: false,
      reason: 'bad_signature',
      kid: 's1',
    });
    // Firmar con el de entrada no sirve hacia afuera.
    expect(verify(headerFor('s1', K1), { secrets: outbound })).toEqual({
      ok: false,
      reason: 'bad_signature',
      kid: 's1',
    });
    expect(() => buildSignatureHeader('s 1', OUT, ts, body)).toThrow(/kid/);
    expect(() => buildSignatureHeader('s1', OUT, '1.5', body)).toThrow(/timestamp/);
  });
});
