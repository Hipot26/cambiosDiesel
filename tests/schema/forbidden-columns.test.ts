import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { CANDIDATE_EDITABLE_FIELDS } from '../../src/db/schema/screens.js';
import { testAppUrl, testMigrateUrl, withClient, withRollback } from '../helpers/db.js';
import {
  CHECK_VIOLATION,
  insertCandidate,
  insertStaffUser,
  UNIQUE_VIOLATION,
} from '../helpers/schema.js';

// Lo que 03 §1.2 deja fuera a propósito, por patrón: así screen_score o current_pay_rate también
// fallan. Las únicas excepciones son las columnas legítimas que 03 define. El comentario de
// src/db/schema/candidates.ts dice exactamente esto.
const FORBIDDEN_COLUMNS_SQL = `
  select table_name, column_name from information_schema.columns
  where table_schema = 'public' and table_name <> 'spatial_ref_sys' and (
    -- Sin score en ninguna parte (Spec §11; 01 §1).
    column_name like '%score%'
    -- Sin pago actual (Spec §3 cambio 17); payload no es pago.
    or (column_name like '%pay%' and column_name not like '%payload%'
        and not (table_name = 'candidates'
                 and column_name in ('pay_wanted_min', 'pay_wanted_max', 'pay_wanted_unit')))
    -- Sin contraseñas fuera del staff (no hay cuentas de candidato en el Sprint 1).
    or (column_name like 'password%'
        and not (table_name = 'staff_users'
                 and column_name in ('password_hash', 'password_changed_at')))
    -- Sin endosos de CDL (eliminados en el Spec §3).
    or column_name like '%endorsement%'
    -- Los consentimientos van a consent_events, nunca como columnas del candidato.
    or (table_name = 'candidates' and column_name like '%consent%')
  )
  order by table_name, column_name`;

describe('esquema', () => {
  it('esquema sin columnas prohibidas (por patrón, no por nombre exacto)', async () => {
    await withClient(testMigrateUrl(), async (client) => {
      const { rows } = await client.query(FORBIDDEN_COLUMNS_SQL);
      expect(rows).toEqual([]);
    });
  });

  it('los patrones de columnas prohibidas atrapan variantes de los nombres', async () => {
    // Una tabla de prueba dentro de una transacción que se deshace: nadie más la ve.
    await withRollback(testMigrateUrl(), async (client) => {
      await client.query(`create table t04_prohibidas (
        screen_score int, current_pay_rate numeric, payload jsonb, password text,
        cdl_endorsement_list text, pay_wanted_min numeric)`);
      const { rows } = await client.query<{ table_name: string; column_name: string }>(
        FORBIDDEN_COLUMNS_SQL,
      );
      expect(rows.map((r) => r.column_name)).toEqual([
        'cdl_endorsement_list',
        'current_pay_rate',
        'password',
        // pay_wanted_min solo es legítima en candidates.
        'pay_wanted_min',
        'screen_score',
      ]);
    });
  });

  it('lower(email) único en candidates y staff_users', async () => {
    await withClient(testAppUrl(), async (app) => {
      const tag = randomUUID().slice(0, 8);
      const candidateId = await insertCandidate(app, { email: `T04.Unico.${tag}@Example.com` });
      try {
        await expect(
          insertCandidate(app, { email: `t04.unico.${tag}@example.com` }),
        ).rejects.toMatchObject(UNIQUE_VIOLATION);
      } finally {
        await app.query('delete from candidates where id = $1', [candidateId]);
      }

      const staffId = await insertStaffUser(app, `T04.Staff.${tag}@Example.com`);
      try {
        await expect(insertStaffUser(app, `t04.staff.${tag}@example.com`)).rejects.toMatchObject(
          UNIQUE_VIOLATION,
        );
      } finally {
        await app.query('delete from staff_users where id = $1', [staffId]);
      }
    });
  });

  it('índices únicos parciales: una versión activa, un archivo actual, una eliminación en curso', async () => {
    await withClient(testAppUrl(), async (app) => {
      const tag = randomUUID();
      const insertVersion = (active: boolean, suffix: string) =>
        app.query(
          `insert into vocabulary_versions (version_label, file_sha256, document, activated_at)
           values ('t04', $1, '{}'::jsonb, $2)`,
          [`sha-${tag}-${suffix}`, active ? new Date() : null],
        );
      try {
        await insertVersion(true, 'a');
        await expect(insertVersion(true, 'b')).rejects.toMatchObject(UNIQUE_VIOLATION);
        await insertVersion(false, 'c');
      } finally {
        await app.query('delete from vocabulary_versions where file_sha256 like $1', [
          `sha-${tag}-%`,
        ]);
      }

      const candidateId = await insertCandidate(app);
      const insertFile = (current: boolean, sha: string) =>
        app.query(
          `insert into files (candidate_id, kind, sha256, size_bytes, is_current)
           values ($1, 'resume_uploaded', $2, 10, $3)`,
          [candidateId, sha, current],
        );
      try {
        await insertFile(true, 'a');
        await expect(insertFile(true, 'b')).rejects.toMatchObject(UNIQUE_VIOLATION);
        await insertFile(false, 'c');
        // Mismo sha para el mismo candidato: se guarda una vez (SEC-19).
        await expect(insertFile(false, 'a')).rejects.toMatchObject(UNIQUE_VIOLATION);
      } finally {
        await app.query('delete from candidates where id = $1', [candidateId]);
      }

      const deletedId = randomUUID();
      const insertDeletion = (finished: boolean) =>
        app.query(
          `insert into candidate_deletions (candidate_id, requested_by, finished_at)
           values ($1, 'candidate', $2)`,
          [deletedId, finished ? new Date() : null],
        );
      try {
        await insertDeletion(true);
        await insertDeletion(false);
        await expect(insertDeletion(false)).rejects.toMatchObject(UNIQUE_VIOLATION);
      } finally {
        await app.query('delete from candidate_deletions where candidate_id = $1', [deletedId]);
      }
    });
  });

  it('GIN sobre jsonb_path_query_array (IMMUTABLE) y GIST sobre las tres geometrías con SRID 4326', async () => {
    await withClient(testMigrateUrl(), async (client) => {
      const volatility = await client.query<{ provolatile: string }>(
        `select provolatile from pg_proc where proname = 'jsonb_path_query_array'`,
      );
      expect(volatility.rows.map((r) => r.provolatile)).toEqual(['i']);

      const gin = await client.query<{ indexname: string }>(`
        select indexname from pg_indexes
        where schemaname = 'public' and tablename = 'candidates'
          and indexdef like '%USING gin (jsonb_path_query_array(%' order by indexname`);
      expect(gin.rows.map((r) => r.indexname)).toEqual([
        'candidates_brands_values_idx',
        'candidates_certs_values_idx',
        'candidates_diag_software_values_idx',
        'candidates_equipment_values_idx',
        'candidates_shifts_values_idx',
        'candidates_systems_values_idx',
      ]);

      const geometries = await client.query<{
        f_table_name: string;
        f_geometry_column: string;
        srid: number;
        type: string;
      }>(`
        select f_table_name, f_geometry_column, srid, type from geometry_columns
        where f_table_schema = 'public' order by f_table_name`);
      expect(geometries.rows).toEqual([
        {
          f_table_name: 'candidates',
          f_geometry_column: 'zip_location',
          srid: 4326,
          type: 'POINT',
        },
        { f_table_name: 'jobs', f_geometry_column: 'location', srid: 4326, type: 'POINT' },
        { f_table_name: 'zip_centroids', f_geometry_column: 'location', srid: 4326, type: 'POINT' },
      ]);
      const gist = await client.query<{ tablename: string }>(`
        select tablename from pg_indexes
        where schemaname = 'public' and indexdef like '%USING gist%' order by tablename`);
      expect(gist.rows.map((r) => r.tablename)).toEqual(['candidates', 'jobs', 'zip_centroids']);
    });
  });

  it('candidate_field_edits solo admite los ocho campos S/E', async () => {
    await withClient(testAppUrl(), async (app) => {
      const candidateId = await insertCandidate(app);
      try {
        expect(CANDIDATE_EDITABLE_FIELDS).toHaveLength(8);
        for (const field of CANDIDATE_EDITABLE_FIELDS) {
          await app.query(
            'insert into candidate_field_edits (candidate_id, field) values ($1, $2)',
            [candidateId, field],
          );
        }
        await expect(
          app.query('insert into candidate_field_edits (candidate_id, field) values ($1, $2)', [
            candidateId,
            'level',
          ]),
        ).rejects.toMatchObject(CHECK_VIOLATION);
        // Los CHECK de candidates.
        await expect(
          app.query('update candidates set travel_pct = 101 where id = $1', [candidateId]),
        ).rejects.toMatchObject(CHECK_VIOLATION);
        await expect(
          app.query('update candidates set zip = $2 where id = $1', [candidateId, '1234A']),
        ).rejects.toMatchObject(CHECK_VIOLATION);
        await expect(
          app.query(
            'update candidates set pay_wanted_min = 50, pay_wanted_max = 40 where id = $1',
            [candidateId],
          ),
        ).rejects.toMatchObject(CHECK_VIOLATION);
      } finally {
        await app.query('delete from candidates where id = $1', [candidateId]);
      }
    });
  });
});
