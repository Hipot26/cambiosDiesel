import { describe, expect, it } from 'vitest';
import { testMigrateUrl, withClient } from '../helpers/db.js';

// Los tres grupos de 03 §1.11, tal como están escritos en el documento. La base es la realidad;
// si el documento y el esquema divergen, estas pruebas fallan.
const GROUP_CASCADE = [
  'screens',
  'screen_starts',
  'candidate_field_edits',
  'consent_events',
  'visibility_events',
  'candidate_hidden_companies',
  'vocabulary_unmapped',
  'return_tokens',
  'sessions',
  'sms_sends',
  'files',
  'level_overrides',
  'recruiterflow_sync',
  'emails_sent',
  'staff_tasks',
].sort();

const GROUP_REFERENCE_WITHOUT_FK = [
  ['screener_events', 'dju_candidate_id'],
  ['candidate_deletions', 'candidate_id'],
].sort();

const GROUP_NO_REFERENCE = [
  'phone_suppression',
  'tombstones',
  'email_suppression',
  'traffic_sources',
  'resend_events',
  'duplicate_signup_attempts',
  'rate_windows',
  'companies',
  'company_aliases',
  'jobs',
  'vocabulary_versions',
  'staff_users',
  'login_attempts',
  'staff_audit_log',
  'settings',
  'zip_centroids',
].sort();

// spatial_ref_sys la crea PostGIS; t02_/t04_ son tablas temporales de otras pruebas.
const ALL_TABLES_SQL = `
  select table_name from information_schema.tables
  where table_schema = 'public' and table_type = 'BASE TABLE'
    and table_name <> 'spatial_ref_sys' and table_name !~ '^t0[0-9]_'`;

describe('SEC-75 cascadas y referencias al candidato', () => {
  it('SEC-75 toda columna candidate_id tiene FK CASCADE salvo candidate_deletions', async () => {
    await withClient(testMigrateUrl(), async (client) => {
      // Toda FK hacia candidates, con su regla de borrado, desde information_schema.
      const fks = await client.query<{
        table_name: string;
        column_name: string;
        delete_rule: string;
      }>(`
        select tc.table_name, kcu.column_name, rc.delete_rule
        from information_schema.table_constraints tc
        join information_schema.key_column_usage kcu
          on kcu.constraint_name = tc.constraint_name and kcu.constraint_schema = tc.constraint_schema
        join information_schema.referential_constraints rc
          on rc.constraint_name = tc.constraint_name and rc.constraint_schema = tc.constraint_schema
        join information_schema.constraint_column_usage ccu
          on ccu.constraint_name = rc.unique_constraint_name
         and ccu.constraint_schema = rc.unique_constraint_schema
        where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public'
          and ccu.table_name = 'candidates'`);
      expect(fks.rows.length).toBeGreaterThan(0);
      for (const fk of fks.rows) {
        expect(fk.delete_rule, `${fk.table_name}.${fk.column_name}`).toBe('CASCADE');
        expect(fk.column_name, fk.table_name).toBe('candidate_id');
      }
      expect([...new Set(fks.rows.map((fk) => fk.table_name))].sort()).toEqual(GROUP_CASCADE);

      // Columnas que nombran al candidato sin FK: solo las dos excepciones documentadas.
      const sinFk = await client.query<{ table_name: string; column_name: string }>(`
        select c.table_name, c.column_name
        from information_schema.columns c
        where c.table_schema = 'public' and c.column_name in ('candidate_id', 'dju_candidate_id')
          and not exists (
            select 1 from information_schema.key_column_usage kcu
            join information_schema.table_constraints tc
              on tc.constraint_name = kcu.constraint_name and tc.constraint_schema = kcu.constraint_schema
            where tc.constraint_type = 'FOREIGN KEY' and kcu.table_schema = c.table_schema
              and kcu.table_name = c.table_name and kcu.column_name = c.column_name)`);
      expect(sinFk.rows.map((r) => [r.table_name, r.column_name]).sort()).toEqual(
        GROUP_REFERENCE_WITHOUT_FK,
      );
    });
  });

  it('SEC-75 toda FK hacia candidates tiene un índice que empieza por esa columna', async () => {
    // Sin índice, cada DELETE de un candidato (la cadena de borrado y la fusión) recorre entera
    // cada tabla hija. Sale de pg_constraint, no de una lista: una FK nueva sin índice falla.
    await withClient(testMigrateUrl(), async (client) => {
      const { rows } = await client.query<{
        table_name: string;
        column_name: string;
        columns: number;
      }>(`
        select c.conrelid::regclass::text as table_name, a.attname as column_name,
               array_length(c.conkey, 1) as columns
        from pg_constraint c
        join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
        where c.contype = 'f' and c.confrelid = 'public.candidates'::regclass`);
      expect(rows.map((r) => r.table_name).sort()).toEqual(GROUP_CASCADE);
      for (const fk of rows) expect(fk.columns, fk.table_name).toBe(1);

      // dju_candidate_id no tiene FK, pero el paso 4 de la cadena y la fusión buscan por ella.
      const targets = [
        ...rows.map((r) => [r.table_name, r.column_name] as const),
        ['screener_events', 'dju_candidate_id'] as const,
      ];
      const missing: string[] = [];
      for (const [table, column] of targets) {
        // Índice completo (sin WHERE) cuya primera columna es la de la FK; la PK también cuenta.
        const { rows: found } = await client.query(
          `select 1 from pg_index i
           join pg_attribute a on a.attrelid = i.indrelid and a.attnum = i.indkey[0]
           where i.indrelid = to_regclass('public.' || quote_ident($1))
             and a.attname = $2 and i.indpred is null`,
          [table, column],
        );
        if (found.length === 0) missing.push(`${table}.${column}`);
      }
      expect(missing).toEqual([]);
    });
  });

  it('SEC-75 lista de tablas sin referencia coincide con 03 §1.11', async () => {
    await withClient(testMigrateUrl(), async (client) => {
      const { rows } = await client.query<{ table_name: string }>(ALL_TABLES_SQL);
      const all = rows.map((r) => r.table_name);
      const referenced = new Set([
        ...GROUP_CASCADE,
        ...GROUP_REFERENCE_WITHOUT_FK.map((g) => g[0]),
      ]);
      const noReference = all.filter((t) => t !== 'candidates' && !referenced.has(t)).sort();
      expect(noReference).toEqual(GROUP_NO_REFERENCE);
    });
  });

  it('03 §1 tiene 34 tablas y todas están en alguno de los tres grupos', async () => {
    await withClient(testMigrateUrl(), async (client) => {
      const { rows } = await client.query<{ table_name: string }>(ALL_TABLES_SQL);
      const all = rows.map((r) => r.table_name).sort();
      expect(all).toHaveLength(34);
      const documented = [
        'candidates',
        ...GROUP_CASCADE,
        ...GROUP_REFERENCE_WITHOUT_FK.map((g) => g[0]),
        ...GROUP_NO_REFERENCE,
      ].sort();
      expect(all).toEqual(documented);
    });
  });
});
