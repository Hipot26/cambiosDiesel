// Tipos y ayudas compartidas por el esquema (03 §1, convenciones).
import { type SQL, sql } from 'drizzle-orm';
import { type AnyPgColumn, customType, timestamp, uuid } from 'drizzle-orm/pg-core';

// Drizzle 0.45 trae geometry(), pero su getSQLType() emite "geometry(point)" sin SRID; drizzle-kit
// solo lee el SRID al introspectar. 03 §1 exige geometry(Point, 4326), así que el tipo se declara
// a mano. La app escribe con ST_SetSRID(ST_MakePoint(lon, lat), 4326) y lee con ST_X/ST_Y o
// ST_DWithin en SQL; en TypeScript el valor crudo (EWKB hex) no se interpreta.
export const geometryPoint4326 = customType<{ data: string; driverData: string }>({
  dataType: () => 'geometry(Point,4326)',
});

// pg-core no tiene bytea.
export const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => 'bytea',
});

// Ids generados por PostgreSQL 18 (01 decisión 10).
export const id = () => uuid('id').primaryKey().default(sql`uuidv7()`);

export const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

export const createdAt = () => timestamptz('created_at').notNull().defaultNow();

export const lower = (column: AnyPgColumn): SQL => sql`lower(${column})`;

// Valores canónicos de una lista [{value, said}] para el índice GIN (03 §1.2).
export const jsonValues = (column: AnyPgColumn): SQL =>
  sql`jsonb_path_query_array(${column}, '$[*].value')`;

// CHECK (col IN (...)) desde una constante de TypeScript: el código y la base leen la misma
// lista. inlineParams() escribe los valores como literales escapados en el DDL de la migración
// (un CHECK no admite parámetros); los valores salen de constantes del código, nunca de la
// entrada (SEC-62). Una columna NULL pasa el CHECK, como en todo CHECK de PostgreSQL.
export const inList = (column: AnyPgColumn, values: readonly string[]): SQL =>
  sql`${column} in (${sql.join(
    values.map((value) => sql`${value}`),
    sql`, `,
  )})`.inlineParams();

// Una huella con clave y su key_id van juntas o no van (SEC-72): sin key_id no se puede buscar
// ni saber qué clave hay que conservar en PHONE_HASH_KEYS.
export const bothOrNeither = (a: AnyPgColumn, b: AnyPgColumn): SQL =>
  sql`(${a} is null) = (${b} is null)`;
