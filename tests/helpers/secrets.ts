// Secretos inventados para las pruebas que construyen un env completo. Nunca valores reales.
const relleno = (etiqueta: string) => `${etiqueta}-de-prueba-`.padEnd(43, '0');

export const fakeSecretEnv = {
  SCREENER_IN_SECRETS: `k1:${relleno('entrada-k1')},k2:${relleno('entrada-k2')}`,
  SCREENER_OUT_SECRET: `s1:${relleno('salida-s1')}`,
  PHONE_HASH_KEYS: `v1:${relleno('huellas-v1')},v2:${relleno('huellas-v2')}`,
  PHONE_HASH_ACTIVE: 'v2',
} as const;
