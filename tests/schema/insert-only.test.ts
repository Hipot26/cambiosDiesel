import { describe, expect, it } from 'vitest';
import { testAppUrl, withClient, withRollback } from '../helpers/db.js';
import {
  DENIED,
  expectRejectedInTx,
  insertCandidate,
  insertScreenerEvent,
  insertStaffUser,
} from '../helpers/schema.js';

// Tablas de solo inserción para el rol de app (03 §1; migración 0002_permisos; SEC-67).
const INSERT_ONLY = ['consent_events', 'visibility_events', 'screens', 'staff_audit_log'];

describe('SEC-67 permisos por tabla y por columna', () => {
  it('SEC-67 consent_events, visibility_events, screens y staff_audit_log sin UPDATE ni DELETE para el rol de app', async () => {
    await withClient(testAppUrl(), async (app) => {
      for (const table of INSERT_ONLY) {
        // El permiso se comprueba antes de buscar filas: con WHERE false también se niega.
        await expect(
          app.query(`update ${table} set id = id where false`),
          table,
        ).rejects.toMatchObject(DENIED);
        await expect(app.query(`delete from ${table} where false`), table).rejects.toMatchObject(
          DENIED,
        );
        const { rows } = await app.query<{ can_insert: boolean; can_select: boolean }>(
          `select has_table_privilege(current_user, $1, 'INSERT') as can_insert,
                  has_table_privilege(current_user, $1, 'SELECT') as can_select`,
          [table],
        );
        expect(rows[0], table).toEqual({ can_insert: true, can_select: true });
      }
    });
  });

  it('SEC-67 level_overrides solo admite UPDATE de superseded_by_screen_id (SEC-39)', async () => {
    await withClient(testAppUrl(), async (app) => {
      await expect(
        app.query('update level_overrides set reason = reason where false'),
      ).rejects.toMatchObject(DENIED);
      await expect(
        app.query('update level_overrides set level = null where false'),
      ).rejects.toMatchObject(DENIED);
      await expect(app.query('delete from level_overrides where false')).rejects.toMatchObject(
        DENIED,
      );
      await expect(
        app.query('update level_overrides set superseded_by_screen_id = null where false'),
      ).resolves.toBeTruthy();
    });
  });

  it('SEC-75 ON DELETE CASCADE corre aunque el rol de app no tenga DELETE en la tabla hija', async () => {
    await withClient(testAppUrl(), async (app) => {
      const candidateId = await insertCandidate(app);
      const staffId = await insertStaffUser(app);
      const eventId = await insertScreenerEvent(app);
      try {
        await app.query(
          `insert into consent_events (candidate_id, kind, action, wording_text, wording_version, source)
           values ($1, 'email', 'granted', 'texto de prueba', 'v0', 'signup')`,
          [candidateId],
        );
        await app.query(
          `insert into visibility_events (candidate_id, from_state, to_state, source)
           values ($1, 'hidden', 'findable', 'signup_default')`,
          [candidateId],
        );
        await app.query(
          `insert into screens (candidate_id, screener_event_id, screened_at, payload, applied)
           values ($1, $2, now(), '{}'::jsonb, true)`,
          [candidateId, eventId],
        );
        await app.query(
          `insert into level_overrides (candidate_id, staff_user_id, level, reason)
           values ($1, $2, 'B', 'motivo de prueba largo')`,
          [candidateId, staffId],
        );
        const count = async (table: string) => {
          const { rows } = await app.query<{ n: number }>(
            `select count(*)::int as n from ${table} where candidate_id = $1`,
            [candidateId],
          );
          return rows[0]?.n;
        };
        expect([
          await count('consent_events'),
          await count('visibility_events'),
          await count('screens'),
          await count('level_overrides'),
        ]).toEqual([1, 1, 1, 1]);

        // El rol de app no puede borrar las hijas a mano, pero sí al candidato: la cascada corre
        // como dueño de la tabla (el rol de migración).
        await expect(
          app.query('delete from consent_events where candidate_id = $1', [candidateId]),
        ).rejects.toMatchObject(DENIED);
        await app.query('delete from candidates where id = $1', [candidateId]);
        expect([
          await count('consent_events'),
          await count('visibility_events'),
          await count('screens'),
          await count('level_overrides'),
        ]).toEqual([0, 0, 0, 0]);
      } finally {
        await app.query('delete from candidates where id = $1', [candidateId]);
        await app.query('delete from screener_events where id = $1', [eventId]);
        await app.query('delete from staff_users where id = $1', [staffId]);
      }
    });
  });

  // Lo que sobrevive al borrado del candidato (0004_permisos_supresion). Cambiar la huella con
  // un UPDATE saca la fila de la lista igual que un DELETE, así que se prueban los dos. Cada
  // prueba inserta su fila real con el rol de app dentro de una transacción que se deshace.
  it('SEC-10 tombstones: el rol de app escribe lápidas pero no las borra ni las cambia', async () => {
    await withRollback(testAppUrl(), async (app) => {
      const row = ['v1', 'lapida-t04b'];
      await app.query(`insert into tombstones (key_id, id_hash) values ($1, $2)`, row);
      // El paso 5 de la cadena es idempotente (03 §5.7): repetir la lápida no falla.
      await app.query(
        `insert into tombstones (key_id, id_hash) values ($1, $2) on conflict do nothing`,
        row,
      );
      const where = 'where key_id = $1 and id_hash = $2';
      await expectRejectedInTx(app, DENIED, `delete from tombstones ${where}`, row);
      await expectRejectedInTx(app, DENIED, `update tombstones set id_hash = 'otra' ${where}`, row);
      await expectRejectedInTx(app, DENIED, `update tombstones set key_id = 'v2' ${where}`, row);
      await expectRejectedInTx(
        app,
        DENIED,
        `update tombstones set deleted_at = now() ${where}`,
        row,
      );
    });
  });

  it('SEC-12 phone_suppression: sin DELETE y con UPDATE solo de last_seen_at (03 §3.4)', async () => {
    await withRollback(testAppUrl(), async (app) => {
      const row = ['v1', 'telefono-t04b'];
      await app.query(
        `insert into phone_suppression (key_id, phone_hash, reason) values ($1, $2, 'sms_stop')`,
        row,
      );
      // El STOP repetido de 03 §3.4 funciona con el permiso por columna.
      await app.query(
        `insert into phone_suppression (key_id, phone_hash, reason) values ($1, $2, 'sms_stop')
         on conflict (key_id, phone_hash) do update set last_seen_at = now()`,
        row,
      );
      const where = 'where key_id = $1 and phone_hash = $2';
      await expectRejectedInTx(app, DENIED, `delete from phone_suppression ${where}`, row);
      for (const set of [
        `phone_hash = 'otra'`,
        `key_id = 'v2'`,
        `reason = 'deleted'`,
        'first_seen_at = now()',
      ]) {
        await expectRejectedInTx(app, DENIED, `update phone_suppression set ${set} ${where}`, row);
      }
      // ON CONFLICT DO UPDATE de otra columna tampoco pasa.
      await expectRejectedInTx(
        app,
        DENIED,
        `insert into phone_suppression (key_id, phone_hash, reason) values ($1, $2, 'deleted')
         on conflict (key_id, phone_hash) do update set reason = excluded.reason`,
        row,
      );
    });
  });

  it('SEC-67 email_suppression: el rol de app inserta pero no borra ni edita', async () => {
    await withRollback(testAppUrl(), async (app) => {
      const row = ['v1', 'correo-t04b'];
      await app.query(
        `insert into email_suppression (key_id, email_hash, reason) values ($1, $2, 'bounced')`,
        row,
      );
      const where = 'where key_id = $1 and email_hash = $2';
      await expectRejectedInTx(app, DENIED, `delete from email_suppression ${where}`, row);
      for (const set of [`email_hash = 'otra'`, `key_id = 'v2'`, `reason = 'complained'`]) {
        await expectRejectedInTx(app, DENIED, `update email_suppression set ${set} ${where}`, row);
      }
    });
  });

  it('SEC-75 borrar un screener_event borra el screen que salió de él (paso 4 de la cadena)', async () => {
    await withClient(testAppUrl(), async (app) => {
      const candidateId = await insertCandidate(app);
      const eventId = await insertScreenerEvent(app);
      try {
        await app.query(
          `insert into screens (candidate_id, screener_event_id, screened_at, payload, applied)
           values ($1, $2, now(), '{}'::jsonb, true)`,
          [candidateId, eventId],
        );
        await app.query('delete from screener_events where id = $1', [eventId]);
        const { rows } = await app.query<{ n: number }>(
          'select count(*)::int as n from screens where candidate_id = $1',
          [candidateId],
        );
        expect(rows[0]?.n).toBe(0);
      } finally {
        await app.query('delete from candidates where id = $1', [candidateId]);
        await app.query('delete from screener_events where id = $1', [eventId]);
      }
    });
  });
});
