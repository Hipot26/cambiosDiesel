import { randomBytes } from 'node:crypto';
import type pg from 'pg';
import { expect } from 'vitest';

// Filas mínimas e inventadas para las pruebas de esquema. Nunca datos reales.
const unique = () => randomBytes(4).toString('hex');

export async function insertCandidate(
  client: pg.ClientBase,
  overrides: { email?: string } = {},
): Promise<string> {
  const email = overrides.email ?? `t04-${unique()}@example.com`;
  const { rows } = await client.query<{ id: string }>(
    `insert into candidates (first_name, last_name, email, zip, trade_claimed, visibility)
     values ('Prueba', 'Esquema', $1, '75201', 'Diesel technician', 'hidden') returning id`,
    [email],
  );
  return rows[0]?.id ?? '';
}

export async function insertStaffUser(client: pg.ClientBase, email?: string): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `insert into staff_users (email, display_name, password_hash, role)
     values ($1, 'Prueba', '$argon2id$falso', 'staff') returning id`,
    [email ?? `t04-staff-${unique()}@example.com`],
  );
  return rows[0]?.id ?? '';
}

export async function insertScreenerEvent(client: pg.ClientBase): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `insert into screener_events (idempotency_key, event_type, spec_version, kid, status)
     values ($1, 'screen.completed', '1.0', 'k1', 'received') returning id`,
    [`t04-${unique()}`],
  );
  return rows[0]?.id ?? '';
}

// insufficient_privilege, unique_violation, check_violation.
export const DENIED = { code: '42501' };
export const UNIQUE_VIOLATION = { code: '23505' };
export const CHECK_VIOLATION = { code: '23514' };

// Dentro de una transacción, un error la deja abortada. Cada intento que debe fallar va en su
// propio savepoint, así la transacción sigue viva para el siguiente intento.
export async function expectRejectedInTx(
  client: pg.ClientBase,
  error: { code: string },
  text: string,
  values: unknown[] = [],
): Promise<void> {
  await client.query('savepoint intento');
  try {
    await expect(client.query(text, values), text).rejects.toMatchObject(error);
  } finally {
    await client.query('rollback to savepoint intento');
  }
}
