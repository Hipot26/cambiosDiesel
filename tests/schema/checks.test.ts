import { describe, expect, it } from 'vitest';
import { KEY_ID_COLUMNS } from '../../src/db/keyring-check.js';
import { CANDIDATE_LANGUAGES } from '../../src/db/schema/candidates.js';
import { COMPANY_CREATED_FROM, HIDDEN_COMPANY_SOURCES } from '../../src/db/schema/companies.js';
import {
  CONSENT_SOURCES,
  EMAIL_SUPPRESSION_REASONS,
  PHONE_SUPPRESSION_REASONS,
  VISIBILITY_SOURCES,
} from '../../src/db/schema/consents.js';
import { DELETION_REQUESTERS } from '../../src/db/schema/deletions.js';
import { SCREENER_EVENT_TYPES } from '../../src/db/schema/events.js';
import { SCREEN_STARTED_BY } from '../../src/db/schema/screens.js';
import { SESSION_KINDS, SMS_OUTCOMES, SMS_PURPOSES } from '../../src/db/schema/sessions.js';
import { STAFF_TASK_STATUSES } from '../../src/db/schema/staff.js';
import { UNMAPPED_SOURCES } from '../../src/db/schema/vocabulary.js';
import { TOKEN_PURPOSES } from '../../src/security/tokens.js';
import { testAppUrl, testMigrateUrl, withClient, withRollback } from '../helpers/db.js';
import {
  CHECK_VIOLATION,
  expectRejectedInTx,
  insertCandidate,
  insertStaffUser,
} from '../helpers/schema.js';

// Cada conjunto cerrado de 03 §1 y su CHECK (migración 0003). La constante de TypeScript es la
// única fuente: el esquema arma el CHECK con ella y esta prueba compara la base con la constante.
const CLOSED_SETS: readonly (readonly [constraint: string, values: readonly string[]])[] = [
  ['candidates_language_check', CANDIDATE_LANGUAGES],
  ['companies_created_from_check', COMPANY_CREATED_FROM],
  ['candidate_hidden_companies_source_check', HIDDEN_COMPANY_SOURCES],
  ['consent_events_source_check', CONSENT_SOURCES],
  ['visibility_events_source_check', VISIBILITY_SOURCES],
  ['phone_suppression_reason_check', PHONE_SUPPRESSION_REASONS],
  ['email_suppression_reason_check', EMAIL_SUPPRESSION_REASONS],
  ['candidate_deletions_requested_by_check', DELETION_REQUESTERS],
  ['screener_events_event_type_check', SCREENER_EVENT_TYPES],
  ['screen_starts_started_by_check', SCREEN_STARTED_BY],
  ['return_tokens_purpose_check', TOKEN_PURPOSES],
  ['sessions_kind_check', SESSION_KINDS],
  ['sms_sends_purpose_check', SMS_PURPOSES],
  ['sms_sends_outcome_check', SMS_OUTCOMES],
  ['staff_tasks_status_check', STAFF_TASK_STATUSES],
  ['vocabulary_unmapped_source_check', UNMAPPED_SOURCES],
];

describe('esquema: conjuntos cerrados y pares con CHECK', () => {
  it('esquema: cada CHECK de conjunto cerrado tiene exactamente los valores de su constante', async () => {
    await withClient(testMigrateUrl(), async (client) => {
      for (const [constraint, values] of CLOSED_SETS) {
        const { rows } = await client.query<{ def: string }>(
          `select pg_get_constraintdef(oid) as def from pg_constraint
           where contype = 'c' and conname = $1 and connamespace = 'public'::regnamespace`,
          [constraint],
        );
        expect(rows, constraint).toHaveLength(1);
        const literals = [...(rows[0]?.def ?? '').matchAll(/'([^']*)'/g)].map((m) => m[1]);
        expect(literals.sort(), constraint).toEqual([...values].sort());
      }
    });
  });

  it('esquema: un purpose fuera de TOKEN_PURPOSES se rechaza', async () => {
    await withRollback(testAppUrl(), async (app) => {
      const candidateId = await insertCandidate(app);
      const insertToken = `insert into return_tokens (token_hash, candidate_id, purpose, expires_at)
                           values ($1, $2, $3, now() + interval '1 hour')`;
      for (const purpose of TOKEN_PURPOSES) {
        await app.query(insertToken, [`hash-t04b-${purpose}`, candidateId, purpose]);
      }
      // Un error tipográfico ya no se guarda (SEC-49: un solo propósito por token).
      await expectRejectedInTx(app, CHECK_VIOLATION, insertToken, [
        'hash-t04b-typo',
        candidateId,
        'emial_verify',
      ]);
    });
  });

  it('esquema: una sesión con dos dueños o con el dueño del otro tipo se rechaza; sin dueño se admite (CSRF, SEC-36)', async () => {
    await withRollback(testAppUrl(), async (app) => {
      const candidateId = await insertCandidate(app);
      const staffId = await insertStaffUser(app);
      let n = 0;
      const insertSession = `insert into sessions (sid, kind, staff_user_id, candidate_id, data, expires_at)
                             values ($1, $2, $3, $4, '{}'::jsonb, now() + interval '1 hour')`;
      const session = (kind: string, staff: string | null, candidate: string | null) => {
        n += 1;
        return [`sid-t04b-${n}`, kind, staff, candidate];
      };

      // Válidas: cada tipo con su dueño, y sin dueño (el token CSRF del formulario de registro o
      // del login del panel vive en una sesión antes de que exista el candidato o entre el staff).
      await app.query(insertSession, session('staff', staffId, null));
      await app.query(insertSession, session('candidate', null, candidateId));
      await app.query(insertSession, session('candidate', null, null));
      await app.query(insertSession, session('staff', null, null));

      // Dos dueños, dueño del otro tipo o tipo inventado.
      for (const values of [
        session('staff', staffId, candidateId),
        session('candidate', staffId, candidateId),
        session('staff', null, candidateId),
        session('candidate', staffId, null),
        session('admin', null, null),
      ]) {
        await expectRejectedInTx(app, CHECK_VIOLATION, insertSession, values);
      }
    });
  });

  it('SEC-72 una huella sin key_id se rechaza', async () => {
    // Estructura: en toda tabla con huellas, la huella y su key_id son NOT NULL las dos o van
    // atadas por un CHECK (hash IS NULL) = (key_id IS NULL).
    await withClient(testMigrateUrl(), async (client) => {
      for (const [table, keyIdColumn, hashColumn] of KEY_ID_COLUMNS) {
        const { rows } = await client.query<{ column_name: string; is_nullable: string }>(
          `select column_name, is_nullable from information_schema.columns
           where table_schema = 'public' and table_name = $1 and column_name in ($2, $3)`,
          [table, keyIdColumn, hashColumn],
        );
        expect(rows, table).toHaveLength(2);
        if (rows.every((r) => r.is_nullable === 'NO')) continue;
        const checks = await client.query<{ def: string }>(
          `select pg_get_constraintdef(oid) as def from pg_constraint
           where contype = 'c' and conrelid = to_regclass('public.' || quote_ident($1))`,
          [table],
        );
        const paired = checks.rows.some(
          (r) =>
            r.def.includes(`(${hashColumn} IS NULL) = (${keyIdColumn} IS NULL)`) ||
            r.def.includes(`(${keyIdColumn} IS NULL) = (${hashColumn} IS NULL)`),
        );
        expect(paired, `${table}: ${hashColumn} y ${keyIdColumn} sin CHECK de par`).toBe(true);
      }
    });

    // Comportamiento: las dos tablas donde las columnas admiten NULL.
    await withRollback(testAppUrl(), async (app) => {
      const candidateId = await insertCandidate(app);
      const setPhoneHash =
        'update candidates set phone_hash = $2, phone_hash_key_id = $3 where id = $1';
      await expectRejectedInTx(app, CHECK_VIOLATION, setPhoneHash, [candidateId, 'huella', null]);
      await expectRejectedInTx(app, CHECK_VIOLATION, setPhoneHash, [candidateId, null, 'v1']);
      await app.query(setPhoneHash, [candidateId, 'huella-t04b', 'v1']);

      const closeDeletion = `insert into candidate_deletions
        (requested_by, tombstone_hash, tombstone_hash_key_id, finished_at)
        values ('candidate', $1, $2, now())`;
      await expectRejectedInTx(app, CHECK_VIOLATION, closeDeletion, ['lapida', null]);
      await expectRejectedInTx(app, CHECK_VIOLATION, closeDeletion, [null, 'v1']);
      await app.query(closeDeletion, ['lapida-t04b', 'v1']);
    });
  });

  it('esquema: phone_e164 con formato +1 y diez dígitos, language en o es', async () => {
    await withRollback(testAppUrl(), async (app) => {
      const candidateId = await insertCandidate(app);
      const setPhone = 'update candidates set phone_e164 = $2 where id = $1';
      // Números inventados: 555-01xx (EE. UU.) y 020 7946 0xxx (Reino Unido) están reservados
      // para ficción.
      await app.query(setPhone, [candidateId, '+12145550123']);
      for (const phone of ['2145550123', '+442079460123', '+1214555012', '+1 214 555 0123']) {
        await expectRejectedInTx(app, CHECK_VIOLATION, setPhone, [candidateId, phone]);
      }
      const setLanguage = 'update candidates set language = $2 where id = $1';
      for (const language of CANDIDATE_LANGUAGES) {
        await app.query(setLanguage, [candidateId, language]);
      }
      await expectRejectedInTx(app, CHECK_VIOLATION, setLanguage, [candidateId, 'fr']);
    });
  });
});
