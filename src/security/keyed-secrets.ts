// Secretos con identificador leídos del .env: "id:secreto,id:secreto" (SEC-06, SEC-15, SEC-72).
// Cada entrada se separa por la PRIMERA ":" (el secreto puede llevar ":"), y las entradas por ",".
// El secreto es texto opaco: no se exige hex, solo un mínimo de bytes.
// Los errores nombran la posición y la regla, nunca el valor (SEC-71).

export type KeyedSecrets = ReadonlyMap<string, Buffer>;

export class KeyedSecretsError extends Error {
  override name = 'KeyedSecretsError';
}

export interface KeyedSecretsOptions {
  // Forma que tiene que cumplir el identificador (kid o key_id).
  idPattern: RegExp;
  // Largo mínimo del secreto en bytes (UTF-8).
  minBytes: number;
  // Cantidad de entradas admitidas (por defecto, al menos una).
  minEntries?: number;
  maxEntries?: number;
}

export function parseKeyedSecrets(raw: string, options: KeyedSecretsOptions): KeyedSecrets {
  const minEntries = options.minEntries ?? 1;
  const entries = raw.split(',');
  if (raw.trim() === '' || entries.length < minEntries) {
    throw new KeyedSecretsError(`se esperaban al menos ${minEntries} entrada(s) "id:secreto"`);
  }
  if (options.maxEntries !== undefined && entries.length > options.maxEntries) {
    throw new KeyedSecretsError(`se admiten como máximo ${options.maxEntries} entrada(s)`);
  }

  const secrets = new Map<string, Buffer>();
  entries.forEach((entry, index) => {
    const position = index + 1;
    const colon = entry.indexOf(':');
    if (colon === -1) {
      throw new KeyedSecretsError(`entrada ${position}: falta ":" entre el id y el secreto`);
    }
    const id = entry.slice(0, colon);
    const secret = entry.slice(colon + 1);
    if (!options.idPattern.test(id)) {
      throw new KeyedSecretsError(`entrada ${position}: el id no cumple ${options.idPattern}`);
    }
    if (Buffer.byteLength(secret, 'utf8') < options.minBytes) {
      throw new KeyedSecretsError(
        `entrada ${position}: el secreto tiene menos de ${options.minBytes} bytes`,
      );
    }
    if (secrets.has(id)) {
      throw new KeyedSecretsError(`entrada ${position}: id repetido`);
    }
    secrets.set(id, Buffer.from(secret, 'utf8'));
  });
  return secrets;
}
