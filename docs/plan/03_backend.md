# DieselJobsUSA — Diseño del backend (milestones 1A y 1B)

Versión 1.0 · 28 de octubre de 2026 · Documento de trabajo de Sergio Duran

Este documento dice cómo se construye el backend del Sprint 1: el modelo de datos, las rutas, los flujos de los webhooks y del registro, los trabajos en segundo plano, las integraciones, el vocabulario, las migraciones y los tres esquemas que Toya pidió para la revisión. Cumple `01_arquitectura.md` (Arquitectura) y `02_seguridad.md` (Seguridad). Cuando una decisión implementa un control de seguridad, cita su identificador (`SEC-nn`). Los nombres de tablas, columnas y funciones que ya aparecen en Seguridad se usan sin cambios.

Fuentes: las mismas de Arquitectura (Contrato, Spec de integración, Rev 8, Walkthrough, Vocabulario, Correspondencia, Decisiones de planificación), más Arquitectura y Seguridad.

## 0. Dónde el backend cedió ante el plan de seguridad

| Qué pedía el diseño "natural" | Qué manda Seguridad | Qué se hace |
|---|---|---|
| Guardar las direcciones que rebotan en Resend tal cual, para no volver a enviarles | Datos personales solo donde hacen falta; hashes con clave y `key_id` (SEC-72) | `email_suppression` guarda `email_hash` + `key_id` con el mismo anillo de claves de los teléfonos; para decidir si se envía, se calcula el hash del destinatario y se busca |
| Un token de la API de DigitalOcean o de RecruiterFlow en el servidor para "comodidad" | Un secreto por consumidor y nada que no haga falta (SEC-70, SEC-76) | Solo la API key propia de RecruiterFlow de DieselJobsUSA; nada de DigitalOcean en el servidor |
| Que el webhook del screener cree el candidato si no existe (más simple para pruebas) | Nunca crear desde un webhook; lápidas (SEC-10) | El webhook solo encuentra; si no encuentra, descarta y, si tampoco hay lápida, alerta |
| Guardar `hide_from_employers` como texto en el candidato | La tabla de empresas con alias es la referencia (Arquitectura §1; Contrato 1B) | `candidate_hidden_companies` apunta a `companies`; el texto del screener se resuelve por alias y lo que no coincide crea una empresa `unreviewed` para el staff |
| Un `.env` compartido entre staging y producción para ahorrar configuración | Entornos separados (SEC-79) | Dos `.env`, dos usuarios de Linux, dos roles de base |

---

## 1. Modelo de datos

PostgreSQL 18 con PostGIS. Esquema en TypeScript con Drizzle (`pgTable`); migraciones SQL generadas con drizzle-kit y revisadas en el pull request. Convenciones: ids `uuid` generados por PostgreSQL con `uuidv7()` (Arquitectura decisión 10); fechas `timestamptz` en UTC; nombres de tablas y columnas en inglés en `snake_case`; toda fila lleva al menos una fecha `timestamptz` que dice cuándo nació: `created_at` en las tablas de registro (candidatos, empresas y alias, empleos, archivos, tokens, sesiones, staff, tareas, auditoría, screens, overrides, consentimientos, no mapeados, correos enviados) y, en las de historial, eventos y contadores, la fecha propia del hecho (`occurred_at`, `received_at`, `started_at`, `attempted_at`, `sent_at`, `added_at`, `edited_at`, `uploaded_at`, `first_seen_at`, `deleted_at`, `window_start`); `settings` y `recruiterflow_sync` solo guardan su última actualización y `zip_centroids` no lleva fecha (su versión va en `source_version`); **toda clave foránea hacia `candidates` lleva `ON DELETE CASCADE`** y una prueba de esquema lo verifica (SEC-75); los `jsonb` que vienen del screener se guardan tal cual y además se extraen las columnas que se filtran.

Tres reglas más, desde la migración 0003 (T-04b):

- Toda FK hacia `candidates`, y `screener_events.dju_candidate_id`, tiene un índice completo (sin `WHERE`) cuya primera columna es esa. Prueba: `SEC-75 toda FK hacia candidates tiene un índice que empieza por esa columna`.
- Toda columna `text` con un conjunto cerrado de valores lleva `CHECK (col IN (…))`, y la lista sale de una constante de TypeScript exportada por el archivo del esquema (`inList` en `src/db/schema/types.ts`; `return_tokens.purpose` usa `TOKEN_PURPOSES` de `src/security/tokens.ts`). Prueba: `esquema: cada CHECK de conjunto cerrado tiene exactamente los valores de su constante`. Las columnas cuyo conjunto este documento no cierra quedan sin `CHECK` y se anotan abajo, tabla por tabla.
- Toda huella con clave y su `key_id` son las dos `NOT NULL` o van atadas por `CHECK ((hash IS NULL) = (key_id IS NULL))` (SEC-72). Prueba: `SEC-72 una huella sin key_id se rechaza`.

**Dueño de cada columna de `candidates`** (Spec de integración §3 "Who owns each field"): **C** = candidato (formulario; nunca la toca un webhook), **S** = screener (sobrescribe en cada `screen.completed`), **S/E** = screener salvo que el candidato la haya editado en el sitio (si hay fila en `candidate_field_edits`, el webhook no la toca), **T** = staff (nunca viene en un webhook), **Sys** = sistema.

### 1.1 Tipos enumerados

| Enum | Valores | Fuente |
|---|---|---|
| `screen_status` | `not_started`, `started`, `completed`, `abandoned` | Rev 8 §1 |
| `level` | `A`, `B`, `C` (y la columna admite `NULL` = "no ubicable como técnico") | Spec §3 |
| `pay_unit` | `hour`, `year` | Spec §3 |
| `visibility` | `findable`, `hidden` | Rev 8 §3 |
| `scan_status` | `pending`, `clean`, `infected`, `error` | SEC-22, SEC-23 |
| `consent_kind` | `email`, `sms`, `share` | Rev 8 §7 |
| `consent_action` | `granted`, `withdrawn`, `sms_opted_out` | SEC-12 |
| `file_kind` | `resume_uploaded`, `resume_generated` | Contrato 1B |
| `company_review` | `unreviewed`, `direct`, `agency` | Contrato 3B (se crea ya porque las empresas ocultas la necesitan) |
| `job_source` | `recruiterflow`, `feed`, `employer` | Contrato 1B, 3B, Sprint 2 |
| `job_status` | `open`, `closed`, `held` | Contrato 3B |
| `staff_role` | `owner`, `staff` | SEC-38 |
| `task_kind` | `recruiterflow_delete`, `review_company`, `review_unmapped`, `review_candidate` | Contrato 1B |
| `event_status` | `received`, `processed`, `ignored_duplicate`, `ignored_stale`, `discarded_deleted`, `discarded_unknown`, `failed` | SEC-07 a SEC-10 |

### 1.2 `candidates` (el registro del candidato)

| Columna | Tipo | Dueño | Notas |
|---|---|---|---|
| `id` | `uuid` PK, `uuidv7()` | Sys | Es el `dju_candidate_id` que viaja al screener |
| `first_name`, `last_name` | `text` NOT NULL | C | Máximo 80 caracteres cada uno (SEC-61) |
| `email` | `text` NOT NULL | C | Guardado tal como lo escribió; índice único sobre `lower(email)` (dedupe por email) |
| `phone_e164` | `text` NULL | C | Formato `+1` + 10 dígitos (SEC-47); `NULL` hasta que pase la validación |
| `phone_verified_at` | `timestamptz` NULL | Sys | `NULL` = sin verificar: sin textos y sin unir registros (SEC-47) |
| `phone_hash`, `phone_hash_key_id` | `text`, `text` | Sys | HMAC del teléfono con la clave activa (SEC-72); índice `(phone_hash_key_id, phone_hash)`; sirve para la dedupe por teléfono verificado y para cruzar con `phone_suppression` sin recorrer teléfonos en claro |
| `zip` | `char(5)` NOT NULL | C | Solo dígitos |
| `zip_location` | `geometry(Point, 4326)` NULL | Sys | Copiada de `zip_centroids` al guardar; `NULL` si el ZIP no tiene centroide (Arquitectura §1) |
| `trade_claimed` | `text` NOT NULL | C | Valor de la lista Trade del vocabulario elegido en el formulario (Rev 8 §1 "treated as a guess") |
| `trade_confirmed` | `text` NULL | S | `trade.value` del screen; lo que usan búsqueda, filtro y matching |
| `trade_confirmed_said`, `trade_secondary` | `text`, `jsonb` | S | `said` del trade y lista `[{value, said}]` secundaria |
| `level` | `level` NULL | S | `NULL` = no ubicable, no una C (Spec §3). **No hay columna de score** (Spec §11) |
| `rubric_version`, `level_notes`, `screen_summary` | `text` | S | |
| `years_trade` | `smallint` | S | |
| `equipment`, `brands`, `diag_software`, `systems`, `certs`, `shifts` | `jsonb` (`[{value, said}]`) | S (`shifts` es S/E) | Además, índices GIN sobre expresiones `jsonb_path_query_array(col, '$[*].value')` para filtrar por valor canónico |
| `unmapped` | `jsonb` (`[{category, said}]`) | S | Copia del último screen; además se insertan filas en `vocabulary_unmapped` para revisión |
| `cdl_class`, `own_tools` | `text` | S | Valores de las listas del vocabulario |
| `pay_wanted_min`, `pay_wanted_max`, `pay_wanted_unit` | `numeric(8,2)`, `numeric(8,2)`, `pay_unit` | S/E | **No existe columna de pago actual** (Spec §3 cambio 17) |
| `travel_pct`, `will_relocate`, `commute_radius_mi`, `available_from` | `smallint` (0–100, `CHECK`), `boolean`, `smallint`, `date` | S/E | |
| `current_employer_text` | `text` | S/E | Como lo dijo; privado, nunca a empleadores (Rev 8 §1) |
| `current_employer_company_id` | `uuid` FK `companies` NULL | Sys | Resolución por alias de `current_employer_text` |
| `language` | `char(2)` | S | `en` o `es` |
| `screen_status` | `screen_status` NOT NULL default `not_started` | Sys | |
| `screen_session_id`, `screen_url`, `screen_started_at` | `text`, `text`, `timestamptz` | Sys | La sesión vigente en el screener; para el barrido nocturno |
| `screen_progress`, `screen_resume_url` | `jsonb` NULL, `text` NULL | S | De `screen.abandoned`: `{questions_answered, questions_remaining, last_activity_at}` y el enlace para retomar; se vacían al completar |
| `screened_at` | `timestamptz` NULL | S | Del último `screen.completed` aplicado; es el guard de orden (SEC-09) |
| `verified_at` | `timestamptz` NULL | Sys | Se iguala a `screened_at` en cada screen completado; nada vence (Rev 8 §3) |
| `visibility` | `visibility` NOT NULL | C (Sys al crear) | `findable` si dio el consentimiento `share`, si no `hidden` (Rev 8 §3) |
| `findable_since` | `timestamptz` NULL | Sys | Última vez que pasó a `findable` (Rev 8 §3 "a signal worth keeping") |
| `interested_job_id` | `uuid` FK `jobs` NULL `ON DELETE SET NULL` | Sys | El empleo desde cuyo botón "Apply" llegó al registro (propuesta pendiente de Toya, Arquitectura §9) |
| `recruiterflow_id` | `text` NULL | T/Sys | Id de la copia en RecruiterFlow |
| `traffic_source_id` | `uuid` FK `traffic_sources` NULL | Sys | Primera visita |
| `needs_review`, `needs_review_reason` | `boolean` default false, `text` | Sys | Un screen posterior que discrepe del override lo pone en true (SEC-39) |
| `staff_notes` | `text` | T | Nunca sale al candidato (SEC-54) |
| `created_at`, `updated_at` | `timestamptz` | Sys | |

Índices: `lower(email)` único; `(phone_hash_key_id, phone_hash)`; GIST sobre `zip_location`; `trade_confirmed`; `level`; `screen_status`; `verified_at`; `visibility`; GIN sobre los valores canónicos de las seis listas. Restricciones: `CHECK (travel_pct BETWEEN 0 AND 100)`, `CHECK (pay_wanted_min <= pay_wanted_max)`, `CHECK (zip ~ '^[0-9]{5}$')`, y desde 0003 `CHECK (phone_e164 ~ '^\+1[0-9]{10}$')`, `CHECK ((phone_hash IS NULL) = (phone_hash_key_id IS NULL))` y `CHECK (language IN ('en', 'es'))` (prueba: `esquema: phone_e164 con formato +1 y diez dígitos, language en o es`).

Lo que **no** está en `candidates` a propósito: score (Spec §11), pago actual (Spec §3), bandera de empleado de cliente (Rev 8 cambio 9), el texto de `hide_from_employers` (va a `candidate_hidden_companies`), los consentimientos como columnas (van a `consent_events`), la contraseña (no hay cuentas en el Sprint 1). `tests/schema/forbidden-columns.test.ts` lo vigila **por patrón** en todo el esquema: `%score%`, `%endorsement%`, `%pay%` (salvo `pay_wanted_min`, `pay_wanted_max` y `pay_wanted_unit` en `candidates`; `payload` no cuenta), `password%` (salvo `password_hash` y `password_changed_at` en `staff_users`) y, en `candidates`, `%consent%`. La bandera de empleado de cliente y el texto de `hide_from_employers` no los busca ninguna prueba.

### 1.3 Historial del screen

**`screens`** (cada `screen.completed` tal como llegó; Contrato 1B "every completed screen kept as received")

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `candidate_id` | `uuid` FK `candidates` **CASCADE** NOT NULL | |
| `screener_event_id` | `uuid` FK `screener_events` NOT NULL **`ON DELETE CASCADE`** | De qué evento salió. La cadena de borrado borra `screener_events` (paso 4 de la sección 5.7) antes que el candidato (paso 6); con la cascada el screen cae con su evento en vez de bloquear el paso 4. Por eso la fusión (sección 4.7) reasigna al superviviente los eventos de los screens copiados. Las otras FK a `screener_events` (`consent_events`, `vocabulary_unmapped`) son NULL y van con `ON DELETE SET NULL` |
| `screened_at` | `timestamptz` NOT NULL | |
| `level`, `rubric_version` | `level` NULL, `text` | Copiados para ordenar sin abrir el JSON |
| `payload` | `jsonb` NOT NULL | El payload completo |
| `applied` | `boolean` NOT NULL | `true` si actualizó el registro; `false` si llegó viejo (SEC-09) y solo se conserva como historial |
| `created_at` | `timestamptz` | |

Índice `(candidate_id, screened_at DESC)`.

**`screen_starts`** (para el límite de 30 días, Spec §6 "Re-screening")

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `candidate_id` | FK **CASCADE** | |
| `started_by` | `text` (`candidate` / `staff`) | Solo los `candidate` cuentan para el límite |
| `staff_user_id` | FK `staff_users` NULL | |
| `session_id`, `screen_url` | `text` | Respuesta del `POST /v1/intake/sessions` |
| `started_at` | `timestamptz` | |

Índice `(candidate_id, started_at DESC)` (la FK y el límite de 30 días de la sección 4.5). `CHECK (started_by IN ('candidate', 'staff'))`.

**`candidate_field_edits`** (qué campos S/E tocó el candidato; Spec §3)

| Columna | Tipo | Notas |
|---|---|---|
| `candidate_id` | FK **CASCADE** | |
| `field` | `text` | Uno de los ocho nombres S/E; `CHECK` contra la lista |
| `edited_at` | `timestamptz` | |

PK `(candidate_id, field)`. En el Sprint 1 solo escribe aquí el formulario del candidato del Sprint 2; se crea ya porque la función de aplicación del webhook (SEC-11) la consulta.

### 1.4 Consentimientos, visibilidad y supresiones

**`consent_events`** (solo inserción; Contrato 1B "permanent history rather than overwritten columns")

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `candidate_id` | FK **CASCADE** NULL | `NULL` solo en `sms_opted_out` cuando no hay registro con ese teléfono (SEC-12) |
| `kind` | `consent_kind` | |
| `action` | `consent_action` | |
| `wording_text` | `text` NOT NULL | El texto **exacto** mostrado (o `"STOP via screener"` para `sms_opted_out`) |
| `wording_version` | `text` NOT NULL | Id de la versión del texto del abogado |
| `source` | `text` | `signup`, `late_capture`, `profile`, `staff`, `screener_webhook`, `unsubscribe_link` (baja de email de un clic, sección 5.5) |
| `screener_event_id` | FK `screener_events` NULL | Para `sms_opted_out` |
| `occurred_at`, `created_at` | `timestamptz` | |

La "vista actual" de consentimientos es una consulta: último evento por `(candidate_id, kind)`, servida por el índice `(candidate_id, kind, occurred_at DESC)`. Nunca se hace `UPDATE` sobre esta tabla (permiso `UPDATE` revocado para el rol de la app en esta tabla; SEC-67). `CHECK` de `source` con los seis valores de la tabla.

**`visibility_events`** (Rev 8 §3 "every switch logged in both directions")

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `candidate_id` | FK **CASCADE** | |
| `from_state`, `to_state` | `visibility` | |
| `source` | `text` | `signup_default`, `candidate` (Sprint 2), `staff`, `application` (Sprint 2) |
| `staff_user_id` | FK `staff_users` NULL | |
| `occurred_at` | `timestamptz` | |

Índice `(candidate_id)`. `CHECK` de `source` con los cuatro valores.

**`phone_suppression`** (SEC-12, SEC-72, SEC-75)

| Columna | Tipo | Notas |
|---|---|---|
| `phone_hash`, `key_id` | `text`, `text` | PK compuesta `(key_id, phone_hash)` |
| `reason` | `text` | `sms_stop` o `deleted` |
| `first_seen_at`, `last_seen_at` | `timestamptz` | |

Sin FK a `candidates`: sobrevive al borrado por diseño. Nunca guarda el teléfono. `CHECK (reason IN ('sms_stop', 'deleted'))`. Permisos (migración 0004, SEC-67): el rol de app inserta, no borra, y solo puede actualizar `last_seen_at`; por eso toda escritura es `INSERT … ON CONFLICT DO UPDATE SET last_seen_at`. Prueba: `SEC-12 phone_suppression: sin DELETE y con UPDATE solo de last_seen_at (03 §3.4)`.

**`tombstones`** (SEC-10)

| Columna | Tipo | Notas |
|---|---|---|
| `id_hash`, `key_id` | `text`, `text` | PK compuesta; `HMAC(clave_lapidas, dju_candidate_id)` |
| `deleted_at` | `timestamptz` | |

Sin datos personales. Sin FK. Permisos (0004): el rol de app inserta pero no actualiza ni borra; la lápida se escribe con `ON CONFLICT DO NOTHING`. Prueba: `SEC-10 tombstones: el rol de app escribe lápidas pero no las borra ni las cambia`.

**`email_suppression`** (rebotes y quejas de Resend; SEC-57 y sección 0)

| Columna | Tipo | Notas |
|---|---|---|
| `email_hash`, `key_id` | `text`, `text` | PK compuesta; HMAC de `lower(email)` |
| `reason` | `text` | `bounced`, `complained` (`CHECK`) |
| `occurred_at` | `timestamptz` | |

Permisos (0004): el rol de app inserta pero no actualiza ni borra, así que un segundo rebote del mismo correo se escribe con `ON CONFLICT DO NOTHING` (gana el primer motivo; cualquiera de los dos suprime). Prueba: `SEC-67 email_suppression: el rol de app inserta pero no borra ni edita`.

### 1.5 Empresas y empresas ocultas

**`companies`** (Contrato 1B "one companies table")

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `name` | `text` NOT NULL | Como se muestra |
| `name_normalized` | `text` NOT NULL UNIQUE | `normalizeAlias(name)` (sección 7) |
| `review_status` | `company_review` NOT NULL default `unreviewed` | El staff marca `direct` o `agency` (Contrato 3B); en 1B solo importa para el panel |
| `excluded` | `boolean` default false | Lista de exclusión (Contrato 3B); se crea la columna ya |
| `created_from` | `text` | `screener`, `recruiterflow`, `feed`, `staff` (`CHECK`) |
| `created_at`, `updated_at` | `timestamptz` | |

**`company_aliases`**: `company_id` FK `companies` CASCADE, `alias_normalized` `text` UNIQUE, `created_by` FK `staff_users` NULL, `created_at`. PK `(company_id, alias_normalized)`.

**`candidate_hidden_companies`** (`hide_from_employers`; Rev 8 §7 "current employer added by default")

| Columna | Tipo | Notas |
|---|---|---|
| `candidate_id` | FK **CASCADE** | |
| `company_id` | FK `companies` RESTRICT | |
| `source` | `text` | `screener`, `default_current_employer`, `candidate` (Sprint 2), `staff` (`CHECK`) |
| `said` | `text` | El texto que llegó, para auditoría |
| `added_at` | `timestamptz` | |

PK `(candidate_id, company_id)`.

**Cómo se resuelve un nombre que llega como texto** (`current_employer` y cada elemento de `hide_from_employers`), función `resolveCompany(texto, origen)`:

1. `normalizeAlias(texto)` (sección 7). Vacío → se ignora.
2. Buscar en `company_aliases.alias_normalized` y en `companies.name_normalized`. Si coincide → esa empresa.
3. Si no coincide → se crea `companies` con `review_status = unreviewed`, `created_from = 'screener'`, un alias igual a su nombre normalizado, y una `staff_tasks` de tipo `review_company` para que el staff la confirme, la fusione con otra (mover alias y filas de `candidate_hidden_companies`) o la marque agencia. **Nunca se descarta**: el candidato queda oculto para esa empresa desde el primer momento aunque el nombre esté mal escrito.
4. La fusión de empresas desde el panel reasigna **todas** las filas que apuntan a la empresa sobrante y luego la borra, en una transacción, con auditoría (SEC-40): `candidate_hidden_companies` (si el candidato ya oculta a la empresa que queda, se conserva la fila más antigua), `jobs.company_id`, `company_aliases` (caen por cascada, pero se mueven antes para no perderlos), `candidates.current_employer_company_id` y `staff_tasks.company_id`. Sin las dos últimas el `DELETE` falla por la FK. La prueba de T-19 crea una empresa referida desde las cinco tablas, la fusiona y comprueba que el borrado termina y que ninguna fila conserva el id de la sobrante.

### 1.6 Empleos

**`jobs`** (Rev 8 §5 "Trade becomes a column… cheap now"; Contrato 1B Job Board)

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `source` | `job_source` NOT NULL | En 1B solo `recruiterflow` |
| `source_id` | `text` NOT NULL | Id en el origen; UNIQUE `(source, source_id)` |
| `title` | `text` NOT NULL | |
| `trade` | `text` NULL | Valor de la lista Trade; `NULL` = fue a la cola de revisión (Contrato 3B) |
| `trade_rule` | `text` NULL | Qué regla o alias lo decidió (Contrato 3B "records which rule decided each listing") |
| `company_id` | `uuid` FK `companies` NOT NULL | Para los empleos de LaTrae: la empresa `LaTrae Consulting Group` (Correspondencia 26 oct: "hiringOrganization… LaTrae Consulting Group"); el cliente real no se guarda |
| `city`, `state`, `zip` | `text`, `char(2)`, `char(5)` NULL | |
| `location` | `geometry(Point, 4326)` NULL | Del ZIP, para "a X millas" |
| `employment_type` | `text` NULL | |
| `description_html` | `text` | **Saneado al guardar** con `sanitize-html` (SEC-64) |
| `apply_url` | `text` NULL | Para listados externos (3B); los de RecruiterFlow usan el botón del sitio |
| `status` | `job_status` NOT NULL | |
| `featured` | `boolean` default false | |
| `posted_at`, `expires_at`, `closed_at` | `timestamptz` | |
| `raw` | `jsonb` | Respuesta original del origen |
| `created_at`, `updated_at`, `last_seen_at` | `timestamptz` | `last_seen_at` alimenta la expiración automática (3B) |

Índices: `(source, source_id)` único; `trade`; `status`; GIST `location`.

### 1.7 Vocabulario

**`vocabulary_versions`**

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `version_label` | `text` NOT NULL | El campo `version` del JSON (`2026-10-26`) |
| `file_sha256` | `text` NOT NULL UNIQUE | Evita cargar dos veces el mismo archivo |
| `document` | `jsonb` NOT NULL | El JSON completo |
| `summary` | `jsonb` | Conteos por lista y diferencias con la versión activa anterior (para la vista previa) |
| `uploaded_by` | FK `staff_users` NULL | `NULL` si vino del repositorio |
| `uploaded_at`, `activated_at`, `deactivated_at` | `timestamptz` | Solo una fila con `activated_at NOT NULL AND deactivated_at IS NULL` (índice único parcial) |

**`vocabulary_unmapped`** (Spec §2 "No match means no guess"; Contrato 1B "held for review, never dropped")

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `list_name` | `text` | `trade`, `equipment`, … |
| `said_raw`, `said_normalized` | `text` | |
| `source` | `text` | `screen`, `job_feed` (3B), `company` |
| `candidate_id` | FK **CASCADE** NULL | |
| `screener_event_id` | FK `screener_events` NULL | |
| `resolved_at`, `resolved_as` | `timestamptz`, `text` | Cuando el staff agrega el alias y recarga el vocabulario |
| `created_at` | `timestamptz` | |

Índices `(list_name, said_normalized) WHERE resolved_at IS NULL` y `(candidate_id)`. `CHECK (source IN ('screen', 'job_feed', 'company'))`. `list_name` queda **sin** `CHECK` a propósito: falta decidir si sus valores son exactamente las nueve listas de la sección 7.2 y qué `list_name` lleva una fila con `source = 'company'`. Se decide en T-09, que es la primera tarea que escribe aquí.

### 1.8 Eventos de webhooks

**`screener_events`** (SEC-07 a SEC-13)

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `idempotency_key` | `text` NOT NULL UNIQUE | SEC-08 |
| `event_type` | `text` NOT NULL | Los cuatro eventos |
| `spec_version` | `text` NOT NULL | |
| `kid` | `text` NOT NULL | Qué secreto firmó |
| `dju_candidate_id` | `uuid` NULL | **Sin FK**: puede ser un borrado o un desconocido; la relación al candidato vivo la lleva `screens.candidate_id` |
| `payload` | `jsonb` NULL | El cuerpo ya validado con zod. **`NULL` en los eventos descartados** (`discarded_deleted`, `discarded_unknown`: de ellos solo quedan `idempotency_key`, `event_type`, `spec_version`, `kid`, `status` y fechas) y **se vacía** en `sms.opted_out` al terminar de procesarlo (el teléfono ya quedó como hash en `phone_suppression`) |
| `raw_body` | `bytea` NULL | Los bytes exactos, para reprocesar sin perder nada; mismas reglas de `NULL` que `payload` |
| `received_at` | `timestamptz` NOT NULL | |
| `status` | `event_status` NOT NULL | |
| `processed_at`, `error` | `timestamptz`, `text` | `error` sin datos personales |

Cuando se borra un candidato, la cadena de borrado (SEC-75) borra sus `screener_events` por `dju_candidate_id`, con el índice `(dju_candidate_id)`. `CHECK (event_type IN ('screen.completed', 'screen.abandoned', 'resume.generated', 'sms.opted_out'))`: un evento nuevo del Spec exige una migración que amplíe el `CHECK`.

**`resend_events`** (SEC-57): `webhook_id` `text` PK, `type`, `received_at`, `processed_at`. **Sin cuerpo**: la migración 0003 borró la columna `payload` (no había datos en ningún entorno y nada la leía), porque el cuerpo del webhook trae el email y sobreviviría al borrado del candidato. El SQL de 0003 lleva la justificación.

### 1.9 Tokens, sesiones, intentos, envíos

**`return_tokens`** (SEC-49)

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `token_hash` | `text` NOT NULL UNIQUE | SHA-256 del token; el token nunca se guarda |
| `candidate_id` | FK **CASCADE** | |
| `purpose` | `text` | `return` (72 h; se canjea en el `GET`), `delete_confirm` (1 h; un solo uso), `unsubscribe` (1 año, uno por candidato, se renueva al generar un recordatorio; da de baja el consentimiento de email). El de un solo uso **no se gasta en el `GET`**: se gasta en un `POST` con CSRF (sección 4.3). **Decisión del 30 oct: `email_verify` se retira.** Ningún flujo lo enviaba, `candidates` no tiene `email_verified_at` y el enlace de regreso, que solo llega a ese buzón, ya prueba que el email es del candidato; T-13 lo quita de `TOKEN_PURPOSES` y angosta el `CHECK` de esta columna |
| `expires_at`, `used_at`, `revoked_at`, `created_at` | `timestamptz` | |

Índice `(candidate_id)`. `CHECK (purpose IN (…))` con los valores de `TOKEN_PURPOSES` (`src/security/tokens.ts`; el esquema importa la constante). Prueba: `esquema: un purpose fuera de TOKEN_PURPOSES se rechaza`.

**`sessions`** (SEC-34; store propio de cuatro métodos)

| Columna | Tipo | Notas |
|---|---|---|
| `sid` | `text` PK | El `sessionStoreId` estable del plugin |
| `kind` | `text` | `staff` o `candidate` |
| `staff_user_id` | FK `staff_users` CASCADE NULL | Borrar todas las sesiones de un usuario = `DELETE … WHERE staff_user_id = …` |
| `candidate_id` | FK **CASCADE** NULL | |
| `data` | `jsonb` NOT NULL | Lo que el plugin guarda, incluida `__fastifySessionMetadata.generation` para `compareAndSet` |
| `created_at` | `timestamptz` | Vencimiento absoluto 12 h se evalúa contra esta columna |
| `expires_at` | `timestamptz` | Inactividad 60 min; índice para la limpieza |

Índice `(candidate_id)`. `CHECK (kind IN ('staff', 'candidate'))` y un `CHECK` de dueño: `(kind = 'staff' AND candidate_id IS NULL) OR (kind = 'candidate' AND staff_user_id IS NULL)`, que rechaza dos dueños y el dueño del otro tipo. **Admite una sesión sin dueño, a propósito**: SEC-36 guarda el token CSRF en la sesión, así que el formulario de registro y el login del panel crean una sesión antes de que exista el candidato o entre el staff, y la sesión `verifying` sin teléfono del camino duplicado (sección 4.1) tampoco tiene dueño. *A confirmar con Sergio.* Prueba: `esquema: una sesión con dos dueños o con el dueño del otro tipo se rechaza; sin dueño se admite (CSRF, SEC-36)`.

**`login_attempts`** (SEC-37): `id`, `email_normalized` `text`, `ip` `inet`, `succeeded` `boolean`, `attempted_at`. Índice `(email_normalized, attempted_at DESC)`.

**`sms_sends`** (SEC-44): `id`, `phone_hash`, `key_id`, `candidate_id` FK **CASCADE** NULL, `purpose` (`verify`), `provider_sid` `text` NULL, `outcome` `text` (`sent`, `blocked_limit`, `blocked_fraud_guard`, `error`), `sent_at`. Índices `(key_id, phone_hash, sent_at DESC)` y `(candidate_id)`. `CHECK (purpose IN ('verify'))` y `CHECK` de `outcome` con los cuatro valores.

**`duplicate_signup_attempts`** (SEC-48): `email_hash`, `key_id` PK compuesta, `attempts_count` `integer`, `last_attempt_at`, `last_notified_at` `timestamptz` NULL.

### 1.10 Archivos, origen de tráfico, override, staff, tareas, ajustes, auditoría, ZIP

**`files`** (hojas de vida; SEC-19 a SEC-26)

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | Es el `<uuid_archivo>` de la clave en R2 (SEC-24) |
| `candidate_id` | FK **CASCADE** | |
| `kind` | `file_kind` | |
| `scan_status` | `scan_status` NOT NULL default `pending` | SEC-22 |
| `sha256` | `text` NOT NULL | UNIQUE `(candidate_id, sha256)`: la misma hoja generada llegada dos veces se guarda una vez (SEC-19) |
| `detected_mime`, `detected_ext` | `text` | De `file-type` + `@file-type/cfbf` (SEC-20) |
| `size_bytes` | `integer` | ≤ 5 242 880 (`CHECK`) |
| `display_name` | `text` | Saneado, ≤ 120 (SEC-24) |
| `storage_key` | `text` NULL | `candidates/<candidate_id>/<id>.<ext>`; `NULL` hasta que la subida a R2 termine. **Una hoja de vida está disponible solo si `scan_status = clean` y `storage_key IS NOT NULL`**; esa condición vive en una sola función, `isResumeAvailable(file)`, que usan `/account`, el inicio del screen, la descarga del panel, la copia a RecruiterFlow y la ficha del candidato |
| `quarantine_path` | `text` NULL | Ruta en disco mientras `pending`; se vacía al subir o al pasar a `infected`/`error` |
| `scan_signature` | `text` NULL | Nombre de la firma de ClamAV si `infected` |
| `is_current` | `boolean` | La hoja que se manda al screener y se muestra; índice único parcial `(candidate_id) WHERE is_current` |
| `origin_url_host` | `text` NULL | Host del que se descargó la generada (SEC-17) |
| `created_at`, `scanned_at` | `timestamptz` | |

**`traffic_sources`** (Contrato 1B "referrer and UTM on first visit"; Arquitectura decisión 31)

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `visitor_id` | `uuid` NOT NULL UNIQUE | El valor de la cookie de primera visita (aleatorio, sin datos personales) |
| `first_seen_at`, `last_seen_at` | `timestamptz` | `last_seen_at` y `visits_count` alimentan "visitantes que vuelven" |
| `visits_count` | `integer` | Una visita nueva = primera petición tras 30 min sin actividad |
| `referrer_host`, `landing_path` | `text` | Solo el host del referrer, sin query |
| `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` | `text` | ≤ 200 cada uno |

Sin FK a `candidates`; al borrar un candidato la fila queda sin relación con nadie.

**`level_overrides`** (SEC-39): `id`, `candidate_id` FK **CASCADE**, `staff_user_id` FK `staff_users`, `level` (`level` NULL: el staff también puede poner "no ubicable"), `reason` `text` `CHECK (length(reason) >= 10)`, `created_at`, `superseded_by_screen_id` FK `screens` NULL (se llena cuando llega un screen posterior que discrepa; el registro pasa a `needs_review`). La búsqueda del panel usa `COALESCE(último override, level)` (Contrato 1B "Search uses the override"). Índice `(candidate_id)`.

**`staff_users`** (SEC-32, SEC-33, SEC-38): `id`, `email` `text` UNIQUE sobre `lower(email)` (el mismo email que en la política de Access, SEC-31), `display_name`, `password_hash` `text` (argon2id), `role` `staff_role`, `created_at`, `password_changed_at`, `disabled_at` NULL, `created_by` FK NULL.

**`staff_tasks`** (Contrato 1B "queues a staff task for the RecruiterFlow copy")

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `kind` | `task_kind` | |
| `payload` | `jsonb` | Solo ids y referencias: para `recruiterflow_delete`, `{ recruiterflow_id }` y la fecha; nunca nombre, email ni teléfono (el candidato ya no existe cuando se crea) |
| `candidate_id` | FK **CASCADE** NULL | `NULL` en la tarea de borrado (el candidato ya se borró) |
| `company_id` | FK `companies` NULL | |
| `status` | `text` | `open`, `done`, `dismissed` |
| `created_at`, `done_at`, `done_by` | | `done_by` FK `staff_users` |

Índice `(candidate_id)`. `CHECK (status IN ('open', 'done', 'dismissed'))`.

**`settings`**: `key` `text` PK, `value` `jsonb`, `updated_at`, `updated_by` FK `staff_users`. Claves del Sprint 1: `recruiterflow.sync_mode` (`all` | `consented_only`, default `all`), `recruiterflow.enabled`, `nudge.enabled`, `nudge.audience` (`email_consented` | `all`, default `email_consented`), `nudge.days_after_signup` (default 3), `resume_fetch.enabled` (pausa la descarga de hojas generadas; sección 5.4 de Seguridad), `sms.global_daily_cap`.

**`staff_audit_log`** (SEC-40): `id`, `staff_user_id` FK `staff_users` (sin cascade: los usuarios se desactivan, no se borran), `action` `text`, `target_type` `text`, `target_id` `uuid` NULL, `details` `jsonb` (filtros de una exportación, `rows_count`, valores anterior y nuevo de un ajuste; **sin datos personales**), `ip` `inet`, `created_at`. Solo inserción (sin `UPDATE`/`DELETE` para el rol de la app).

**`recruiterflow_sync`** (estado de la copia): `candidate_id` PK FK **CASCADE**, `recruiterflow_id` `text`, `last_synced_at`, `last_payload_hash` `text` (para no reenviar lo mismo), `consent_state_sent` `jsonb`, `attempts` `integer`, `last_error` `text`, `synced_without_consent` `boolean` (la lista de limpieza que pide el Contrato si el abogado dice "solo con consentimiento").

**`rate_windows`** (contadores que deben sobrevivir a un despliegue; Arquitectura decisión 13): `bucket` `text`, `window_start` `timestamptz`, `count` `integer`, PK `(bucket, window_start)`. Usado por el conector de RecruiterFlow (`rf.calls`, ventanas de una hora) y por el corte global de SMS (`sms.daily`).

**`emails_sent`**: `id`, `candidate_id` FK **CASCADE**, `template` `text` (`return_link`, `nudge`, `duplicate_signup_notice`, `delete_confirm`, `screen_ready`, `screen_result`), `resend_id` `text`, `sent_at`. Para no repetir el recordatorio y para la auditoría de envíos. Índice `(candidate_id, template, sent_at DESC)` (la FK y "sin recordatorio en 14 días" de la sección 5.5). La lista de plantillas quedó cerrada el 30 de octubre con las seis de arriba; el `CHECK` de `template` todavía no existe y lo agrega T-20 (expansión).

**`candidate_deletions`** (avance de la cadena de borrado, sección 5.7): `id` `uuid` PK, `candidate_id` `uuid` NULL **sin FK** (sobrevive al candidato), `tombstone_hash` `text` NULL y `tombstone_hash_key_id` `text` NULL (desde 0003; las dos son NULL mientras la cadena corre y van atadas por `CHECK ((tombstone_hash IS NULL) = (tombstone_hash_key_id IS NULL))`, y `keyring-check` vigila ese `key_id` como el de cualquier huella), `started_at`, `steps` `jsonb` (qué pasos ya se cumplieron), `finished_at` NULL, `requested_by` `text` (`candidate` / `staff` / `merge`, con `CHECK`), `staff_user_id` FK NULL. Mientras la cadena corre, `candidate_id` tiene el id (los trabajos lo consultan para no tocar a un candidato en borrado); **al cerrar la cadena, `candidate_id` pasa a `NULL` y queda solo `tombstone_hash`**. Índice único parcial sobre `candidate_id WHERE finished_at IS NULL`. Sin datos personales.

**`zip_centroids`** (Arquitectura decisión 28): `zip` `char(5)` PK, `location` `geometry(Point, 4326)` NOT NULL, `state` `char(2)`, `source_version` `text` (año del Gazetteer). Índice GIST. Sin datos personales; se carga una vez por entorno (sección 8).

### 1.11 Qué se borra con el candidato

Tres grupos de tablas, y la prueba de esquema (SEC-75) comprueba que la lista es completa y real:

1. **Con FK a `candidates` y `ON DELETE CASCADE`** (caen solas): `screens`, `screen_starts`, `candidate_field_edits`, `consent_events`, `visibility_events`, `candidate_hidden_companies`, `vocabulary_unmapped`, `return_tokens`, `sessions`, `sms_sends`, `files`, `level_overrides`, `recruiterflow_sync`, `emails_sent`, `staff_tasks`. La prueba recorre `information_schema` y falla si aparece una columna `candidate_id` con FK que no sea `CASCADE`, o una columna `candidate_id` sin FK que no esté en el grupo 2.
2. **Guardan una referencia al candidato sin FK** (la cadena de borrado las limpia a mano y la prueba de integración del borrado verifica que no quede ninguna fila con el id): `screener_events.dju_candidate_id` (se borran las filas) y `candidate_deletions.candidate_id` (pasa a `NULL` al cerrar, queda `tombstone_hash`).
3. **No guardan ninguna referencia al candidato, por diseño**: `phone_suppression` y `tombstones` (solo hashes con clave; son lo único que debe sobrevivir), `email_suppression` (hash), `traffic_sources` (la fila queda anónima: el candidato apuntaba a ella, no al revés), `resend_events`, `duplicate_signup_attempts` (hash del email), `rate_windows`, `companies`, `company_aliases`, `jobs`, `vocabulary_versions`, `staff_users`, `login_attempts`, `staff_audit_log` (solo ids en `target_id`, sin datos personales), `settings`, `zip_centroids`.

Después de la cadena, la prueba de integración de SEC-75 busca el id del candidato en **todas** las columnas `uuid`, `text` y `jsonb` de todas las tablas de los esquemas `public` y `pgboss`, y debe encontrarlo solo en `staff_audit_log.target_id` y, mientras dure su retención corta, en el `data` de los trabajos terminados de `candidate-delete` (pg-boss guarda el `data` en `jsonb`; reglas en la sección 5.7).

---

## 2. Rutas y módulos

Tres aplicaciones Fastify dentro de un mismo proceso por entorno, registradas como plugins encapsulados con sus propios hooks, cookies, CSP y límites: **sitio público** (`dieseljobsusa.com`), **panel** (`panel.dieseljobsusa.com`; en staging `staging-panel.dieseljobsusa.com`, Seguridad 4.6) e **integración** (rutas máquina a máquina bajo `dieseljobsusa.com/integration/…`). Nginx reparte por `server_name` y Fastify vuelve a comprobar el `Host` (una ruta del panel servida en el host público responde 404). Toda ruta declara esquema zod de entrada `.strict()` y de salida (SEC-54, SEC-61). "Quién" dice quién puede llamarla; "Valida" lo específico de la ruta además de lo general.

### 2.1 Sitio público

| Ruta | Quién | Qué hace | Valida | SEC |
|---|---|---|---|---|
| `GET /`, `/jobs`, `/job-seekers`, `/for-employers`, `/about`, `/privacy`, `/terms` | Anónimo | Las seis páginas (Privacy y Terms son dos rutas de una página del Contrato). `/jobs` lista `jobs` con `status = open` desde la base, nunca llama a RecruiterFlow en la petición | Query de `/jobs`: `trade`, `state`, `page` con zod | SEC-54, SEC-65 |
| `GET /jobs/:slug` | Anónimo | Detalle del empleo; botón "Apply" que lleva a `/signup?job=<id>` (propuesta pendiente de Toya) | `slug` = `<id>-<texto>`; se busca por id | SEC-64 (HTML saneado al guardar y al renderizar) |
| `GET /signup` | Anónimo | Paso 1: seis campos, tres casillas desmarcadas (Arquitectura §1), Turnstile, CSRF; el desplegable de oficio viene del vocabulario activo (39 valores en 12 grupos) | `job` opcional en query (uuid) | SEC-36, SEC-42 |
| `POST /signup` | Anónimo | Crea el candidato o entra al camino de duplicado (sección 4.1) y pasa al código SMS | Nombre, email, teléfono E.164 de EE. UU., ZIP, `trade_claimed` en la lista Trade, archivo opcional (multipart, 5 MB, 1 archivo), tres booleanos, token de Turnstile, `visitor_id` de la cookie | SEC-21, SEC-36, SEC-42, SEC-43, SEC-47, SEC-48, SEC-61 |
| `GET /signup/verify` | Sesión de registro (cookie `dju_cand` en estado `verifying`) | Pantalla del código SMS; texto para todos: "¿No llega el código? Si ya te habías registrado, te mandamos un enlace a tu correo" | | SEC-48 |
| `POST /signup/verify` | Sesión de registro | Comprueba el código con Twilio (o lo rechaza sin llamar si la sesión es de duplicado sin teléfono coincidente) | Código de 6 dígitos; máximo 5 intentos por sesión | SEC-43, SEC-47 |
| `POST /signup/verify/resend` | Sesión de registro | Reenvía el código | Límites por IP y por teléfono/día | SEC-43, SEC-44 |
| `GET /r/:token` | Portador del token | **Ningún `GET` hace una acción** (los filtros de seguridad del correo, por ejemplo Outlook, abren los enlaces antes que la persona). `purpose = return`: canjea el token por sesión de candidato y redirige `303` a `/account` (o a `?next=` seguro); el token sigue vivo hasta vencer, así que una apertura automática no quita nada. `purpose = delete_confirm`: muestra una página con un botón ("Sí, borrar mi registro") y **no gasta el token** | Token base64url de 43 caracteres; `purpose`; no vencido ni usado ni revocado | SEC-49 a SEC-53 |
| `POST /r/:token/confirm` | Portador del token, desde la página anterior | Gasta el token de un solo uso (`used_at`) y ejecuta la acción: `delete_confirm` → encola la cadena de borrado y destruye la sesión | CSRF (el formulario de la página lleva el token CSRF); mismo token válido | SEC-36, SEC-49, SEC-75 |
| `GET /unsubscribe/:token` | Portador del token | Página con el botón "Dejar de recibir correos"; no hace nada por sí sola | Token `unsubscribe` vivo | SEC-49 |
| `POST /unsubscribe/:token` | Portador del token, o el cliente de correo con `List-Unsubscribe=One-Click` en el cuerpo (RFC 8058) | Inserta `consent_events (kind = 'email', action = 'withdrawn', source = 'unsubscribe_link', wording_text = <texto del botón o 'List-Unsubscribe-Post'>)`; responde una página sencilla "listo". Idempotente: una segunda baja no agrega otro evento el mismo día | Sin CSRF (la petición de un clic la manda el servidor de correo sin cookie ni sesión): el token aleatorio es la autorización; límite por IP | SEC-43, SEC-49, SEC-59 |
| `GET /account` | Candidato con sesión | Página de siguientes pasos: subir hoja de vida (principal), "build one for me" debajo, estado del screen, enlace de retomar si `abandoned`, borrar mi registro | Modelo `CandidateView` sin `level` | SEC-54, SEC-55, SEC-56 |
| `POST /account/resume` | Candidato con sesión | Sube la hoja de vida a cuarentena y encola el escaneo | Multipart 5 MB, 1 archivo, tipo por contenido | SEC-20 a SEC-24 |
| `GET /account/resume/status` | Candidato con sesión | JSON `{ status: 'pending' | 'clean' | 'rejected' }` para el script de progreso; `infected` y `error` se muestran como `rejected` | Esquema de salida de tres valores | SEC-54 |
| `POST /account/screen/start` | Candidato con sesión | Inicia el screen (sección 4.5); redirige al `screen_url` | Hoja de vida `clean` o ninguna; límite de 30 días; screener disponible | SEC-15 |
| `GET /account/screen/return` | Candidato (cookie) | Destino de `return_url`; muestra "gracias, estamos guardando tu resultado" y refresca `/account` | Sin parámetros confiables del screener; solo lo que diga la sesión | SEC-53 |
| `POST /account/delete` | Candidato con sesión | Manda un email con token `delete_confirm`; el enlace abre la página con el botón, y solo el `POST /r/:token/confirm` encola la cadena de borrado | CSRF | SEC-36, SEC-49, SEC-75 |
| `POST /account/logout` | Candidato con sesión | Destruye la sesión | CSRF | SEC-34 |
| `GET /healthz` | Nginx local (`127.0.0.1`) | `200` si la base responde | Nginx no lo expone por el túnel | SEC-77 |
| `GET /robots.txt`, `/sitemap.xml`, `/static/*` | Anónimo | Estáticos con `@fastify/static`; staging responde `Disallow: /` | | |

### 2.2 Panel (`panel.dieseljobsusa.com`)

Todo el panel está detrás de Cloudflare Access (SEC-30). El hook `onRequest` del plugin del panel valida el JWT de Access en cada petición (SEC-31); para las rutas con sesión, además exige la sesión y compara el email (SEC-31, SEC-32) y comprueba `config.role` (SEC-38). Toda ruta `POST` lleva CSRF (SEC-36) y llama a `audit()` (SEC-40).

| Ruta | Rol | Qué hace | Valida | SEC |
|---|---|---|---|---|
| `GET /login`, `POST /login` | Cualquiera que pasó Access | Login con email y contraseña; `session.regenerate()` al entrar; el email de la sesión tiene que ser el del JWT | Límite por IP y por usuario; mensaje único | SEC-31, SEC-33, SEC-34, SEC-37 |
| `POST /logout` | staff | Destruye la sesión | | SEC-34 |
| `GET /`, `GET /candidates` | staff | Lista con filtros: nivel (usa el override), oficio confirmado, distancia a un ZIP ("a X millas", PostGIS `ST_DWithin` sobre `geography`), certs, CDL, software, verificado desde, estado del screen, visibilidad, `needs_review`. Ocultos marcados con etiqueta | Filtros con zod; paginación | SEC-54, SEC-56 |
| `GET /candidates/:id` | staff | Ficha completa: registro, historial de screens, consentimientos, visibilidad, empresas ocultas, archivos, overrides, tareas | `id` uuid | SEC-54 |
| `POST /candidates/:id/override` | staff | Override de nivel con motivo | `level` o `null`, `reason` ≥ 10 | SEC-39 |
| `POST /candidates/:id/visibility` | staff | Cambio de visibilidad por el staff, con evento | `to_state`; si pasa a `findable` sin consentimiento `share`, se exige confirmar la captura tardía con el texto vigente | Rev 8 §3 |
| `POST /candidates/:id/screen/start` | staff | Inicia un screen sin límite de 30 días | Screener disponible | SEC-15 |
| `POST /candidates/:id/delete` | staff | Encola la cadena de borrado tras confirmación en dos pasos | | SEC-75 |
| `GET /candidates/export.csv` | staff | Exportación CSV con los filtros vigentes; registra filtros y conteo | Celdas neutralizadas | SEC-40, SEC-63 |
| `GET /files/:fileId/download` | staff | Responde `302` a un enlace firmado de R2 de 1 hora como adjunto; solo si `isResumeAvailable(file)` (`clean` y `storage_key` presente) | | SEC-26 |
| `GET /companies`, `POST /companies/:id` | staff | Lista y revisión (`direct`/`agency`), alias, fusión | | SEC-40 |
| `GET /vocabulary`, `POST /vocabulary/upload`, `POST /vocabulary/:versionId/activate` | staff | Carga del JSON, validación, vista previa de cambios, activación (sección 7) | Archivo JSON ≤ 2 MB validado con zod | SEC-61 |
| `GET /unmapped`, `POST /unmapped/:id/resolve` | staff | Cola de no mapeados | | |
| `GET /tasks`, `POST /tasks/:id/done` | staff | Tareas del staff (RecruiterFlow tras borrado, empresas por revisar, candidatos duplicados) | | SEC-40 |
| `GET /tasks/:id/merge`, `POST /candidates/:id/merge` | staff | Resolver una tarea `review_candidate` de teléfono duplicado: la página compara los dos registros campo por campo y ofrece **"Fusionar"** (con la elección de valores) o **"Mantener separados"** (`POST /tasks/:id/keep-separate`: cierra la tarea, quita `needs_review` de ambos y anota en auditoría que son personas distintas, para que un nuevo aviso del mismo par no se repita). Reglas de la fusión en la sección 4.7 | Ids de los dos registros; por cada campo en conflicto, cuál se queda | SEC-40, SEC-75 |
| `GET /settings`, `POST /settings` | owner | Los ajustes de la sección 1.10; cada cambio queda en auditoría con valor anterior y nuevo | Cada clave con su zod | SEC-40 |
| `GET /audit` | owner | Registro de auditoría | | |
| `GET /users`, `POST /users`, `POST /users/:id/disable`, `POST /users/:id/reset-password` | owner | Alta, baja (borra sesiones) y reinicio de contraseña del staff | Email, rol | SEC-32, SEC-33 |
| `POST /me/password` | staff | Cambio de la propia contraseña; borra todas sus sesiones | Mínimo 12 caracteres | SEC-33, SEC-34 |

### 2.3 Integración

| Ruta | Quién | Qué hace | Valida | SEC |
|---|---|---|---|---|
| `POST /integration/screener/webhooks` | ScreenProof | Un solo endpoint para los cuatro eventos; `event` del payload elige el esquema | Sección 3 completa | SEC-01 a SEC-14 |
| `GET /integration/vocabulary` | ScreenProof con service token de Access | El JSON de la versión activa, con cabeceras `X-Vocabulary-Version` y `ETag`; `Cache-Control: private, no-store` | JWT de Access con `common_name` esperado | SEC-60 |
| `POST /integration/resend/webhooks` | Resend | Rebotes y quejas (sección 3.5) | Firma Svix; idempotencia por `webhook-id` | SEC-57 |

### 2.4 Estructura del repositorio

```
dieseljobsusa/
├── package.json · package-lock.json · .npmrc (ignore-scripts, min-release-age, engine-strict) · .node-version
├── biome.json · tsconfig.json · vitest.config.ts · playwright.config.ts · drizzle.config.ts
├── .githooks/pre-commit                    gitleaks (SEC-87)
├── .gitleaks.toml · .env.example · .gitignore
├── .github/workflows/ci.yml · deploy-staging.yml · deploy-production.yml
├── src/
│   ├── server.ts                           arranque: carga env, crea app, listen 127.0.0.1 (SEC-77)
│   ├── app.ts                              registra plugins base y las tres apps
│   ├── config/env.ts                       zod sobre process.env; la app no arranca si falta algo (SEC-61, SEC-70)
│   ├── config/startup.ts                   clasifica el fallo de arranque (anillo, conexión, otro) y apaga con tope de 10 s
│   ├── db/
│   │   ├── client.ts                       pool pg + drizzle (rol de la app; statement_timeout de 10 s y application_name)
│   │   ├── schema/                         un archivo por grupo de tablas (index.ts los reúne): candidates.ts, screens.ts, consents.ts, companies.ts, jobs.ts, vocabulary.ts, events.ts, files.ts, sessions.ts, staff.ts, settings.ts, traffic.ts, zip.ts, deletions.ts, enums.ts, types.ts
│   │   └── migrations/                     SQL generado por drizzle-kit + manuales (roles, extensiones, pg-boss)
│   ├── security/
│   │   ├── access-jwt.ts                   jose + comparación de email / common_name (SEC-31, SEC-60)
│   │   ├── hmac.ts                         firma y verificación kid/timestamp/raw body (SEC-01 a SEC-06, SEC-15)
│   │   ├── keyed-secrets.ts                parser "id:secreto,id:secreto" del .env (SEC-06, SEC-15, SEC-72)
│   │   ├── keyring.ts                      phoneHash, emailHash, tombstoneHash con key_id (SEC-72)
│   │   ├── redirect.ts                     safeRedirect (SEC-53)
│   │   ├── tokens.ts                       return tokens: generar, hashear, canjear (SEC-49, SEC-50)
│   │   ├── csp.ts                          directivas por app (SEC-65)
│   │   ├── error-handler.ts                respuestas de error sin eco ni stack (SEC-71)
│   │   └── session-store.ts                store de PostgreSQL de cuatro métodos (SEC-34)
│   ├── views/                              layouts, componentes TSX, view models (CandidateView sin level; SEC-55)
│   ├── public-site/                        plugin: routes/, pages/, signup/, account/, jobs/
│   ├── panel/                              plugin: routes/, candidates/, companies/, vocabulary/, settings/, users/, audit.ts, roles.ts (SEC-38, SEC-40)
│   ├── integration/                        plugin: screener-webhooks/, vocabulary-endpoint.ts, resend-webhooks.ts
│   ├── domain/
│   │   ├── candidates/                     signup.ts, dedupe.ts (SEC-48), apply-screen-completed.ts (SEC-11), deletion.ts (SEC-75), merge.ts (4.7), assert-not-deleting.ts, visibility.ts, consents.ts, unsubscribe.ts
│   │   ├── companies/resolve-company.ts
│   │   ├── vocabulary/                     normalize-alias.ts (+ prueba), load.ts, diff.ts, publish.ts
│   │   ├── files/ingest-resume.ts          cuarentena → file-type → ClamAV → R2 (SEC-19 a SEC-26); is-resume-available.ts (clean + storage_key)
│   │   └── geo/zip.ts                      centroides, distancia
│   ├── integrations/
│   │   ├── screener/client.ts · types.ts · schemas.ts (zod por evento y versión)
│   │   ├── recruiterflow/client.ts · sync.ts · jobs-import.ts
│   │   ├── twilio/verify.ts
│   │   ├── resend/mailer.ts · templates/
│   │   ├── r2/storage.ts (interfaz Storage: R2 y disco local)
│   │   ├── clamav/instream.ts (SEC-23)
│   │   └── turnstile/verify.ts (SEC-42)
│   ├── jobs/                               pg-boss: boss.ts (arranque, migrate: false), queues.ts (nombres y políticas), un archivo por trabajo (sección 5)
│   └── logging/                            pino con redact (SEC-73), sentry.ts (SEC-74)
├── fake-screener/                          Arquitectura decisión 24; excluido del paquete de producción
├── infra/
│   ├── nginx/ · cloudflared/ · systemd/ (backup.timer, freshclam) · db/roles.sql · scripts/deploy.sh · scripts/restore-test.md
│   └── checks/                             comprobaciones del despliegue (SEC-69, SEC-70, SEC-77, SEC-78, SEC-82)
├── scripts/                                seed.ts, load-zip-centroids.ts, pgboss-migrate.ts, check-dependency-age.ts (SEC-85)
├── tests/
│   ├── e2e/                                Playwright (humo, con escucha de violaciones de CSP; SEC-65)
│   └── schema/                             prueba de cascadas (SEC-75), prueba de rutas sin rol (SEC-38)
└── docs/plan/ · docs/ops/
```

Las pruebas unitarias y de ruta viven junto al código (`*.test.ts`), nombradas con el `SEC` que cubren cuando aplica.

---

## 3. Flujo de cada webhook

Un solo endpoint, `POST /integration/screener/webhooks`, dentro de un plugin encapsulado que registra el parser `parseAs: 'buffer'` (Seguridad 4.1) con `bodyLimit` 256 KB (SEC-14). El orden de 02 es fijo; nada de lo que sigue cambia de orden.

### 3.0 Pasos comunes (los seis primeros valen para los cuatro eventos)

1. **Firma** (`preHandler`): parsear `X-ScreenProof-Signature` como `kid=…,sha256=…` (SEC-03); elegir el secreto por `kid` entre los dos del `.env` (SEC-06); leer `X-ScreenProof-Timestamp`, rechazar si no es entero o está a más de 300 s (SEC-05); calcular `HMAC-SHA256(secreto, timestamp + "." + raw_body)` sobre el `Buffer` (SEC-01); comparar con `timingSafeEqual` tras igualar longitudes (SEC-02). Cualquier fallo → `401` con cuerpo vacío; al log va solo `kid` y motivo (SEC-04, SEC-13).
2. **Versión**: `JSON.parse` del `Buffer`; leer `spec_version`; si la parte mayor no es `1` → `400`, log y alerta a Sentry sin el payload (SEC-07).
3. **Estructura**: elegir el esquema zod por `event` (`screen.completed`, `screen.abandoned`, `resume.generated`, `sms.opted_out`); campos conocidos de la versión menor se validan, los desconocidos se ignoran; falla → `400` (SEC-07).
4. **Transacción** (todo lo que sigue hasta el paso 6 es una sola transacción):
   - `INSERT INTO screener_events … ON CONFLICT (idempotency_key) DO NOTHING`. Si no insertó nada → `COMMIT`, `200`, fin (SEC-08).
   - Buscar el candidato por `dju_candidate_id` (`SELECT … FOR UPDATE`). Si no existe: buscar la lápida `tombstoneHash(id)` en `tombstones`; si está → `status = discarded_deleted`; si no → `status = discarded_unknown` y alerta `warning` a Sentry con solo `kid` e `idempotency_key`. En ambos casos la fila de `screener_events` se guarda **sin `payload` ni `raw_body`** (solo clave de idempotencia, tipo, versión, `kid`, estado y fechas: el cuerpo de un candidato borrado no se conserva), `COMMIT`, `200`, fin, **sin crear nada** (SEC-10). Excepción: `sms.opted_out` no necesita candidato (paso 3.4).
   - Guard de orden, solo `screen.completed`: si `payload.screened_at <= candidates.screened_at` → `status = ignored_stale`, `COMMIT`, `200`, fin (SEC-09).
5. **Encolar**: `boss.send('screener-event', { eventId }, { singletonKey: eventId, retryLimit: 5, retryDelay: 30, retryBackoff: true })` dentro de la misma transacción (pg-boss acepta la conexión de la transacción vía `db` option) y `status = received`.
6. **`COMMIT` y `200`**. Todo lo demás pasa en el trabajo `screener-event` (sección 5.2). Si el trabajo falla cinco veces, `status = failed`, alerta, y el evento queda con su `raw_body` para reprocesar desde el panel.

### 3.1 `screen.completed`

Dentro del trabajo, en una transacción con el candidato bloqueado (`FOR UPDATE`):

1. Insertar en `screens` el payload completo con `applied = true` (si entre el paso 4 y este llegó uno más nuevo, se repite el guard y se guarda con `applied = false`).
2. Aplicar `applyScreenCompleted(registro, payload, camposTocados)` (SEC-11): sobrescribir las columnas **S** (`trade_confirmed`, `trade_confirmed_said`, `trade_secondary`, `level`, `rubric_version`, `level_notes`, `screen_summary`, `years_trade`, `equipment`, `brands`, `diag_software`, `systems`, `certs`, `cdl_class`, `own_tools`, `unmapped`, `language`, `screened_at`); para cada columna **S/E** (`pay_wanted_*`, `shifts`, `travel_pct`, `will_relocate`, `commute_radius_mi`, `available_from`, `current_employer_text`, `hide_from_employers`), escribir solo si no hay fila en `candidate_field_edits`; **ignorar** cualquier campo C o T que venga en el payload. `verified_at = screened_at`, `screen_status = completed`, `screen_session_id = NULL`.
3. `current_employer_text` → `resolveCompany` → `current_employer_company_id`. `hide_from_employers` es un campo **S/E** y `screen.completed` trae el estado completo (Spec §6 "One rule that covers all of them"), así que: si **no** hay fila en `candidate_field_edits` para `hide_from_employers`, el re-screen **reemplaza** las filas de `candidate_hidden_companies` con `source IN ('screener', 'default_current_employer')` por las nuevas (cada nombre → `resolveCompany` → fila `source = 'screener'`; el empleador actual se agrega con `source = 'default_current_employer'` aunque no venga en la lista, Rev 8 §7); las filas con `source IN ('candidate', 'staff')` **no se tocan**. Si sí hay edición del candidato, el webhook no toca ninguna fila de esta tabla (SEC-11).
4. `unmapped[]` → filas en `vocabulary_unmapped` (`source = 'screen'`), sin duplicar `(list_name, said_normalized)` abiertos.
5. Override: si hay `level_overrides` vigente y su `level` difiere del nuevo → `needs_review = true`, `needs_review_reason = 'screen_disagrees_with_override'`, `superseded_by_screen_id` (SEC-39). El override sigue mandando en la búsqueda hasta que el staff decida.
6. Si `payload.resume.generated && payload.resume.url` y el ajuste `resume_fetch.enabled` está activo → encolar `resume-fetch` con `{ candidateId, url, expiresAt, eventId }` (sección 5.3). Si la misma URL ya se descargó por un `resume.generated` anterior (por `sha256` tras bajarla), se descarta en el ingest (SEC-19).
7. Encolar `recruiterflow-sync` para el candidato si el ajuste lo permite.
8. Encolar `email-send` con la plantilla `screen_result` ("tu entrevista quedó guardada", con un token `return` nuevo de 72 h), una vez por screen aplicado y salvo `email_suppression`. Es el correo que promete la página de regreso cuando el resultado tarda (sección 4.6); es de servicio, así que no depende del consentimiento de email, y como toda plantilla del candidato **no lleva el nivel** (SEC-55).
9. `screener_events.status = processed`, `processed_at = now()`.

### 3.2 `screen.abandoned`

1. Si `screen_status` es `completed` con `screened_at` posterior a `last_activity_at` → se registra el evento como `processed` sin tocar nada (un abandono viejo no degrada un screen completo).
2. Si no: `screen_status = abandoned`; guardar `questions_answered`, `questions_remaining`, `resume_screen_url` y `last_activity_at` en `candidates` (columnas `screen_progress` `jsonb` y `screen_resume_url`); el enlace de retomar se muestra en `/account`.
3. No se envía nada desde el sitio: el texto y el email de "vuelve y termina" los manda el screener (Rev 8 §4; pregunta abierta para Trabian en Arquitectura §9). El recordatorio del sitio (sección 5.5) sí puede considerar `abandoned` según el ajuste.

### 3.3 `resume.generated`

1. Ajuste `resume_fetch.enabled` apagado → `processed` con nota, sin descargar (pausa de incidente, Seguridad 5.4).
2. Encolar `resume-fetch` con `{ candidateId, url, expiresAt, eventId, format }` (SEC-17 a SEC-19). El trabajo descarga, pasa por `ingestResume` y, si el `sha256` ya existe para el candidato, no crea archivo nuevo.
3. `processed`.

### 3.4 `sms.opted_out`

No necesita candidato (SEC-12). En la transacción del paso 4:

1. `phone` → validar E.164; calcular `phoneHash` con **cada** clave del anillo (SEC-72).
2. `INSERT INTO phone_suppression (key_id activo, hash, reason = 'sms_stop') ON CONFLICT DO UPDATE last_seen_at`.
3. Buscar **todos** los `candidates` cuyo `(phone_hash_key_id, phone_hash)` coincida con alguno de los hashes (y además `dju_candidate_id` si vino y existe). Para cada uno: `INSERT INTO consent_events (kind = 'sms', action = 'sms_opted_out', wording_text = 'STOP via screener', source = 'screener_webhook', occurred_at = payload.occurred_at)`. Nada se sobrescribe.
4. Si no hubo ningún candidato, el evento igual queda `processed` (la supresión ya está escrita).
5. Desde ese momento, toda decisión de enviar un texto consulta `phone_suppression` (en 1B solo aplica a lo que el sitio manda al screener en `consents.sms`).
6. Al cerrar el procesamiento (`status = processed`), la fila de `screener_events` queda **sin `payload` ni `raw_body`**: el teléfono ya está como hash en la supresión y no hace falta conservarlo en claro.

### 3.5 Webhook de Resend

`POST /integration/resend/webhooks`, parser `parseAs: 'buffer'`:

1. `resend.webhooks.verify({ payload: raw.toString(), headers: { id, timestamp, signature }, webhookSecret })` (SEC-57). Lanza → `400`.
2. `INSERT INTO resend_events (webhook_id) ON CONFLICT DO NOTHING`; repetido → `200`.
3. Según `type`: `email.bounced` y `email.complained` → `INSERT INTO email_suppression (emailHash(to), key_id, reason) ON CONFLICT DO NOTHING` (el rol de app no puede actualizar esa tabla, sección 1.4; gana el primer motivo); `email.delivered` y otros → solo se registran.
4. `200`. Si la base falla → `500` para que Resend reintente.

---

## 4. Flujo del registro y del regreso del candidato

### 4.1 Paso 1: captura (`POST /signup`)

1. **Antes de tocar la base:** CSRF (SEC-36); límite por IP (SEC-43); zod `.strict()` sobre los seis campos, las tres casillas, `cf-turnstile-response` y `job` (SEC-61); `siteverify` de Turnstile con `remoteip = request.ip`, `action = 'signup'` y `hostname` del sitio; `success: false` o timeout → la misma página con "no pudimos verificar que eres una persona" (SEC-42). Teléfono → `parsePhoneNumber(valor, 'US')`; no es un número posible de EE. UU. → error de campo (SEC-47). `trade_claimed` tiene que estar en la lista Trade del vocabulario activo. ZIP cinco dígitos.
2. **Archivo opcional:** si viene, pasa a cuarentena ya (`ingestResume`, sección 5.1) atado al candidato que se cree; si no hay candidato (camino duplicado), el archivo se descarta sin escanear ni guardar.
3. **Dedupe por email** (`lower(email)`): el camino se bifurca pero **la respuesta es la misma** (SEC-48):
   - **Email nuevo:** se crea `candidates` (`screen_status = not_started`, `visibility = findable` si marcó `share`, si no `hidden`; `traffic_source_id` desde la cookie `visitor_id`; `interested_job_id` si vino `job`), tres o menos filas en `consent_events` (`granted` solo por las casillas marcadas, cada una con `wording_text` y `wording_version` vigentes; las desmarcadas no generan evento), una fila en `visibility_events` (`source = 'signup_default'`), `phone_e164` guardado sin verificar, `phone_hash` calculado. Se envía el código SMS (sección 4.2) si los límites lo permiten. Sesión de candidato en estado `verifying` (`session.regenerate()`).
   - **Email ya existe:** no se crea nada en `candidates`. Se inserta o actualiza `duplicate_signup_attempts` por `emailHash`. Si el teléfono enviado coincide con el `phone_hash` del registro existente y ese registro tiene `phone_verified_at` → se envía el código a ese teléfono (dentro de los límites) y la sesión queda en `verifying` apuntando al registro existente con la marca `claimed_by_duplicate = true`; al acertar el código, la persona demostró ser el dueño y entra a `/account` del registro existente (sin cambiar ningún dato). Si el teléfono no coincide → **no se envía SMS**, la sesión queda en `verifying` sin teléfono (cualquier código fallará con el mismo mensaje), y si `last_notified_at` es `NULL` o tiene más de 24 h se encola el email `duplicate_signup_notice` con un token `return` al email existente y se actualiza `last_notified_at` (SEC-48).
   - En ambos caminos la respuesta es `303 /signup/verify`, y el tiempo de respuesta se iguala ejecutando el mismo número de escrituras.
4. Los datos nuevos nunca sobrescriben los existentes (Arquitectura §1).

### 4.2 Verificación del teléfono

**Envío** (`sendVerification(candidateId)`):

1. `phone_suppression` con ese hash → no se envía (la verificación es un SMS; un STOP previo lo bloquea) y la pantalla muestra "no podemos enviar textos a este número; continúa por email" con el enlace de regreso al email.
2. Límites en PostgreSQL (SEC-44): más de 3 `sms_sends` del mismo hash en la última hora o 5 en el día, o `rate_windows('sms.daily')` ≥ `sms.global_daily_cap` → `outcome = blocked_limit`, no se llama a Twilio, misma pantalla.
3. País del número ≠ `US` → no se llama (SEC-46).
4. `client.verify.v2.services(SID).verifications.create({ to: phone_e164, channel: 'sms' })` con timeout de 10 s. Errores conocidos: `60203` (max send attempts) y `60212` → `blocked_limit`; `60410`/`60412` (Fraud Guard) → `blocked_fraud_guard` y log; otro error → `error`, alerta si se repite. En todos los casos se escribe `sms_sends` y la pantalla no distingue.

**Comprobación** (`POST /signup/verify`):

1. Sesión en `verifying` con teléfono; si no hay teléfono (camino duplicado sin coincidencia) → mismo mensaje de "código incorrecto".
2. Máximo 5 intentos por sesión (contador en la sesión) y límite por IP (SEC-43).
3. `verificationChecks.create({ to, code })`; `status === 'approved'` → `phone_verified_at = now()`, la sesión pasa a `active`, `303 /account`. `60202` (max check attempts) → "pide un código nuevo".
4. **Dedupe por teléfono verificado** (Contrato 1B "then on verified phone"): al aprobar, si otro candidato tiene el mismo `(phone_hash_key_id, phone_hash)` **verificado**, se marca `needs_review = true` con `needs_review_reason = 'duplicate_verified_phone'` en ambos y se crea una `staff_tasks` `review_candidate`. No se fusiona automáticamente: el staff decide desde el panel entre **fusionar** y **mantener separados** (sección 4.7), porque una fusión automática podría unir a dos personas que comparten número.
5. Hasta que el teléfono esté verificado: `consents.sms: false` en la llamada de inicio al screener y ningún uso del teléfono para unir registros (SEC-47).

### 4.3 Enlace de regreso y página de siguientes pasos

- Tras el paso 1 (email nuevo) se encola el email `return_link` con un token `return` de 72 h (SEC-49). Es el camino de vuelta "antes de que existan cuentas" (Contrato 1B).
- `GET /r/:token`: hash → fila viva. Con `purpose = return` (reutilizable hasta vencer) → `session.regenerate()` con `candidate_id` → `303 /account` o `safeRedirect(next)` (SEC-50, SEC-53). Con `purpose = delete_confirm` (un solo uso) → página con un botón y **nada más**: los filtros de seguridad del correo abren los enlaces antes que la persona, así que un `GET` que gastara el token o confirmara el borrado se dispararía solo. El canje es `POST /r/:token/confirm` con CSRF (SEC-36), que marca `used_at` y ejecuta la acción. Token vencido o inexistente → página neutra "pide un enlace nuevo" con un formulario de email que lleva **Turnstile y límite por IP como todo formulario público** (SEC-42, SEC-43), **siempre** responde "si existe un registro con ese correo, te enviamos un enlace" y encola el email solo si existe (y respetando el mismo límite de 24 h de SEC-48 para no inundar).
- `/account` recibe `CandidateView` (sin `level`, SEC-55): nombre, estado del screen (`not_started` → botón "Verify my skills"; `started` → "retoma tu screen" con `screen_url`; `abandoned` → "te faltan N preguntas" con `screen_resume_url`; `completed` → "verificado el <fecha>", sin nivel), hoja de vida actual y su estado (`pending` = "revisando tu archivo"), botón principal "Upload your resume", debajo "No resume? Answer a few questions and we'll build one", y "Delete my record".

### 4.4 Subida de la hoja de vida (`POST /account/resume`)

1. `@fastify/multipart` con `limits: { fileSize: 5 * 1024 * 1024, files: 1 }`; Nginx ya cortó en 5 MB (SEC-21).
2. El stream va a `quarantine/<uuid>` (modo 600) contando bytes; `sha256` al vuelo; si ya existe `(candidate_id, sha256)` → se borra el temporal y se responde "ya tenemos ese archivo".
3. `fileTypeFromFile` + detector CFBF → `pdf`, `docx` o `doc`; otro → se borra y error de campo (SEC-20).
4. Fila en `files` (`scan_status = pending`, `is_current = false`), `boss.send('scan-file', { fileId })` con `singletonKey = fileId`.
5. Respuesta `303 /account`; el script de progreso consulta `/account/resume/status`. Cuando pasa a `clean`, el trabajo marca `is_current = true` (y quita la marca a la anterior) y ofrece el botón de iniciar el screen. Subir una hoja de vida **nunca** cambia `visibility` (Rev 8 §3).

### 4.5 Inicio del screen (`POST /account/screen/start` y `POST /candidates/:id/screen/start` del panel)

1. Si hay un archivo `pending` → "estamos revisando tu archivo, intenta en un momento" (Arquitectura §4: la llamada solo se hace tras el escaneo). `infected`/`error` → se trata como "sin hoja de vida" y se avisa.
2. **Límite de 30 días** (Spec §6): si `started_by = 'candidate'` y existe `screen_starts` del candidato con `started_by = 'candidate'` y `started_at > now() - 30 días` → "ya hiciste un screen hace poco; podrás repetirlo el <fecha>". El staff no tiene límite. Un screen `started` o `abandoned` vigente no cuenta como nuevo: se devuelve el `screen_url`/`screen_resume_url` existente.
3. `resume_url`: si el archivo `is_current` cumple `isResumeAvailable` (`clean` y `storage_key` presente), enlace GET firmado de 1 hora al objeto en R2 (SEC-26); si no, `null`.
4. `return_url`: `https://dieseljobsusa.com/account/screen/return` fijo desde la configuración, nunca construido con datos del usuario (SEC-53).
5. `POST /v1/intake/sessions` firmado con el secreto sitio→screener (SEC-15), cuerpo: `spec_version`, `dju_candidate_id`, `first_name`, `trade_claimed`, `zip`, `phone` (E.164 o `null` si no está verificado: pregunta abierta a Trabian), `email`, `resume_url`, `consents: { sms: <consentimiento sms vigente && phone_verified_at && !suprimido>, email: <consentimiento email vigente> }`, `return_url`. Timeout 10 s, sin reintento automático en la petición del usuario.
6. Éxito → `screen_starts` nueva, `candidates.screen_status = started`, `screen_session_id`, `screen_url`, `screen_started_at = now()`; `303` al `screen_url`.
7. Screener caído o error → el candidato ve "el screen no está disponible ahora; te avisaremos por email cuando vuelva", `screen_status` sigue `not_started`, se encola `screen-start-retry` (sección 5.8) si el candidato dio consentimiento de email. **El registro ya está guardado**: el sitio sigue capturando candidatos sin el screener (Contrato 1B).

### 4.6 Regreso del candidato

`return_url` trae al candidato a `GET /account/screen/return`. La página no lee nada del screener por la URL (Trabian puede agregar parámetros; se ignoran salvo lo que se acuerde, Arquitectura §9). Si el webhook `screen.completed` ya llegó, `/account` muestra "verificado"; si no, muestra "estamos guardando tu resultado" y se refresca cada 5 s hasta 2 minutos; si pasa ese tiempo sin webhook, muestra "te avisaremos por email" y el barrido nocturno (sección 5.4) se encarga. El aviso es el correo `screen_result` que se encola al aplicar el `screen.completed` (sección 3.1, paso 8; plantilla de T-20), llegue por webhook o por el barrido. Nunca se muestra el nivel (SEC-55).

---

### 4.7 Fusión de duplicados (tarea `review_candidate`)

La fusión la decide una persona desde el panel (sección 2.2); nunca corre sola. Reglas:

1. **Sobrevive el registro más antiguo** (`created_at` menor); el otro es el **absorbido**. La página muestra los dos lado a lado.
2. **Los historiales pasan al superviviente conservando sus fechas**, de dos formas según los permisos del rol de app (migración `0002_permisos`, SEC-67). Las tablas de **solo inserción** no admiten `UPDATE`, así que sus filas se **copian** con `INSERT` manteniendo `occurred_at`, `screened_at` y `created_at`, y las originales caen por la cascada cuando se borra el absorbido: `screens`, `consent_events`, `visibility_events` y `level_overrides` (el override copiado apunta al screen copiado en `superseded_by_screen_id`). Además, en la **misma transacción**, los `screener_events` de los screens copiados se **reasignan** al superviviente (`UPDATE … SET dju_candidate_id = superviviente`; esa tabla no es de solo inserción): si quedaran con el id del absorbido, el paso 4 de su cadena de borrado los borraría y la cascada de `screens.screener_event_id` (sección 1.3) se llevaría las copias del superviviente. Las demás se **mueven** con `UPDATE` de `candidate_id`: `screen_starts`, `files`, `candidate_hidden_companies` (si la misma empresa ya está, se conserva la fila más antigua), `vocabulary_unmapped`, `emails_sent`. Las dos historias quedan intercaladas por fecha; nada se reescribe.
3. **Campos del candidato**: para cada columna en la que los dos registros difieren (nombre, email, teléfono, ZIP, oficio, visibilidad, y los campos del screen si ambos tienen screen), el staff elige qué valor queda; por defecto se propone el del screen más reciente para las columnas S y S/E, y el del registro más antiguo para las columnas C. Si el staff elige el email o el teléfono del absorbido, el superviviente lo toma (el índice único de `lower(email)` obliga a que el absorbido se borre en la misma transacción). `screened_at` y `verified_at` quedan con el screen más reciente. Las filas de `candidate_field_edits` del absorbido se copian si el superviviente no las tiene.
4. **Sesiones y tokens** del absorbido se revocan; los del superviviente siguen.
5. **El absorbido pasa por la cadena de borrado completa** (sección 5.7) con `requested_by = 'merge'`: `DELETE` al screener, objetos de R2 que **no** se movieron (los `files` movidos cambian su `candidate_id`, su clave en R2 se copia a `candidates/<superviviente>/` y la vieja se borra), lápida, `phone_suppression` **no** se escribe (el teléfono sigue vivo en el superviviente), y tarea `recruiterflow_delete` si el absorbido tenía copia en RecruiterFlow con un `recruiterflow_id` distinto del superviviente. Luego se encola `recruiterflow-sync` del superviviente.
6. **Auditoría** (SEC-40): `candidate.merged` con `target_id` = superviviente y `details = { absorbed_id, chosen_fields: {...} }` (solo nombres de columnas y de qué registro se tomó cada una, no los valores), más la entrada `candidate.deleted` de la cadena. `needs_review` se limpia en el superviviente y la tarea pasa a `done`.
7. Todo lo anterior salvo la cadena de borrado ocurre en **una transacción**; la cadena se encola dentro de esa misma transacción.

**Mantener separados**: cierra la tarea, limpia `needs_review` en ambos, y guarda en `staff_tasks.payload` el par `(id_a, id_b)` como `kept_separate`; la dedupe por teléfono no vuelve a abrir una tarea para ese mismo par.

---

## 5. Trabajos en segundo plano

pg-boss 12 sobre la misma base, esquema `pgboss` creado por el rol de migración (SEC-68); la app arranca con `migrate: false`. Cada entorno corre sus propios workers dentro del proceso de Node. Las colas se crean al arrancar con `createQueue` y su política. Todo trabajo es idempotente (puede correr dos veces sin daño) y registra su resultado en el log sin datos personales (SEC-73). **Todo trabajo que recibe un `candidateId` comprueba al empezar que no exista una fila de `candidate_deletions` con ese id y `finished_at IS NULL`; si existe, termina sin hacer nada** (un `recruiterflow-sync` que corriera a mitad de la cadena volvería a crear la copia en RecruiterFlow). Esa comprobación es una función compartida, `assertNotDeleting(candidateId)`, con prueba. Reintentos agotados → el trabajo queda en `failed` en pg-boss, se envía una alerta a Sentry con el nombre de la cola y el id del trabajo, y healthchecks recibe el ping solo si el trabajo programado terminó bien.

| Cola | Cuándo corre | Política | Reintentos | Qué pasa si falla del todo |
|---|---|---|---|---|
| `scan-file` | Al subir una hoja de vida o al descargar una generada | `singleton` por `fileId` | 3, cada 60 s | `scan_status = error` (falla cerrado, SEC-23), alerta; el archivo sigue en cuarentena |
| `screener-event` | Al recibir un webhook válido | `singleton` por `eventId` | 5, backoff desde 30 s | `screener_events.status = failed`, alerta; el panel permite "reprocesar" (reencola) |
| `resume-fetch` | Desde `screen.completed` o `resume.generated` | `singleton` por `candidateId + url` | 3, backoff desde 60 s; **no reintenta** si la URL ya venció (`expires_at`) ni si el fallo fue de host no permitido o redirección (SEC-17) | Alerta; el candidato queda sin hoja generada y el staff lo ve en la ficha |
| `screen-sweep` | Diario 03:30 hora del servidor (cron de pg-boss) | `singleton` | El trabajo entero no reintenta; cada candidato dentro se maneja aparte | Alerta "barrido no terminó"; healthchecks sin ping |
| `nudge-email` | Diario 10:00 | `singleton` | Igual que el barrido | Alerta |
| `recruiterflow-sync` | Al crear el candidato, al verificar teléfono, tras `screen.completed`, al cambiar consentimiento o visibilidad (según lo que responda Toya) | `stately` por `candidateId` (una sola copia en cola o activa por candidato) | 6, backoff desde 60 s, máximo 1 h | `recruiterflow_sync.last_error`, alerta; reintento manual desde el panel |
| `recruiterflow-jobs-import` | Cada 30 min | `singleton` | 2 | El Job Board sigue mostrando lo último guardado; alerta tras dos ciclos fallidos |
| `candidate-delete` | Al confirmar un borrado (`POST /r/:token/confirm`, panel o fusión) | `stately` por `candidateId` | 10, backoff desde 60 s, máximo 1 h | Alerta; **nunca se da por terminado** hasta cumplir todos los pasos (SEC-75). Al encolarse, cancela los trabajos pendientes del candidato (paso 0 de la sección 5.7) |
| `vocabulary-publish` | Al activar una versión | `singleton` | 3 | La versión anterior sigue publicada; alerta |
| `cleanup` | Cada hora | `singleton` | 1 | Alerta si falla dos veces seguidas |
| `screen-start-retry` | Cuando un inicio de screen falló por screener caído | `singleton` por `candidateId` | 12, backoff desde 5 min, máximo 1 h | Alerta; el barrido también lo recoge |
| `email-send` | Cada email del sitio | `short` por `(candidateId, template, día)` para el recordatorio; sin clave para los demás | 5, backoff desde 30 s | Alerta; `emails_sent` no se escribe, así que un reintento manual no duplica |

### 5.1 `scan-file`

1. Leer `files` por id; si no está `pending` → terminar (idempotencia).
2. Abrir el archivo de cuarentena y mandarlo por `INSTREAM` al socket de clamd (cliente propio, Arquitectura decisión 25) con timeout de 60 s.
3. `OK` → subir a R2 con clave `candidates/<candidate_id>/<file_id>.<ext>` y `ContentType` detectado; `scan_status = clean`, `storage_key`, `scanned_at`; marcar `is_current = true` y quitar la marca al anterior; borrar el archivo de cuarentena; si hay sesión del candidato esperando, el script de estado lo verá.
4. `FOUND` → `scan_status = infected`, `scan_signature`; mover el archivo a `quarantine/infected/`; alerta; `staff_tasks` `review_candidate`; nada se sube (Seguridad 5.4).
5. Socket cerrado, error, timeout o respuesta desconocida → lanzar error (reintento); al agotar → `scan_status = error`, alerta (SEC-23).

### 5.2 `screener-event`

Carga `screener_events` por id, bloquea el candidato y ejecuta la sección 3.1 a 3.4 según `event_type`. Un evento ya `processed` se ignora. Si falla, el estado queda `received` hasta agotar reintentos.

### 5.3 `resume-fetch`

1. `new URL(url)`: `https`, host en `SCREENER_RESUME_HOSTS` (SEC-17); si no → registrar y terminar sin reintento.
2. `expires_at` pasado → terminar sin reintento (la URL ya murió; el staff puede pedir un screen nuevo).
3. `fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30_000) })`; respuesta no `2xx` → error (reintento); `3xx` → `redirect: 'error'` lanza → terminar sin reintento y alertar (SEC-17).
4. Stream a cuarentena contando bytes; > 5 MB → abortar y terminar sin reintento (SEC-18).
5. `ingestResume(ruta, { kind: 'resume_generated', originUrlHost })`: tipo por contenido (SEC-20), `sha256`; duplicado → borrar temporal y terminar (SEC-19); si no → fila `files` `pending` y encolar `scan-file`.

### 5.4 `screen-sweep` (barrido nocturno)

1. Seleccionar candidatos con `screen_status = started` y `screen_started_at < now() - 6 h`, y los `abandoned` con `last_activity_at < now() - 7 días` (solo para informe).
2. Para cada `started`: `GET /v1/intake/sessions/{screen_session_id}` firmado (SEC-15). Si la respuesta trae un resultado completo, se construye un payload equivalente a `screen.completed` y se pasa **por el mismo camino de validación** que el webhook: esquema zod del evento, `screener_events` con `idempotency_key = 'sweep:' + session_id + ':' + screened_at`, guard de orden, y el trabajo `screener-event` (Contrato 1B "through the same path as the webhook"). Si la sesión sigue abierta, no se toca. Si el screener responde `404` para la sesión → `screen_status = not_started` y nota en la ficha.
3. Informe: cuántos recuperados, cuántos siguen atascados, cuántos abandonados viejos, cuántos fallos de llamada. Email a `alerts@` (Toya y Sergio) **solo si** hubo recuperados, atascados de más de 24 h o fallos; si todo está limpio, solo el ping a healthchecks.
4. También reencola `screen-start-retry` para los `not_started` que tienen un intento fallido pendiente.

### 5.5 `nudge-email` (recordatorio)

1. Si `nudge.enabled` es falso → ping y fin.
2. Candidatos con `screen_status IN ('not_started', 'abandoned')`, `created_at < now() - nudge.days_after_signup`, sin `emails_sent` de `template = 'nudge'` en los últimos 14 días, máximo 2 recordatorios en total, y según `nudge.audience`: `email_consented` → último `consent_events` de `kind = 'email'` es `granted` (por defecto hasta que responda el abogado, Arquitectura §1); `all` → todos. Se excluyen los `email_suppression`.
3. Por cada uno: encolar `email-send` con plantilla `nudge`, un token `return` nuevo de 72 h y el token `unsubscribe` del candidato (se crea si no existe o se renueva si le queda menos de un mes). `emails_sent` se escribe cuando Resend acepta el envío.
4. **Baja en un clic (adelantada a 1B):** el recordatorio es correo masivo, así que cada uno lleva las cabeceras `List-Unsubscribe: <https://dieseljobsusa.com/unsubscribe/<token>>` y `List-Unsubscribe-Post: List-Unsubscribe=One-Click` (RFC 8058; Contrato 1A "List-Unsubscribe"), más un enlace visible al pie que abre `GET /unsubscribe/:token` con su botón. Las dos vías terminan en `POST /unsubscribe/:token`, que inserta el `consent_events` `withdrawn` de `email` (sección 2.1). Desde ese evento, el candidato queda fuera del recordatorio y de cualquier correo que no sea estrictamente de servicio (el enlace de regreso que él mismo pide sí se envía). El mismo mecanismo lo heredan las alertas de empleo del Sprint 3A.

### 5.6 `recruiterflow-sync`

Según el ajuste `recruiterflow.sync_mode`: `all` → todos; `consented_only` → solo con `share` vigente (y los ya sincronizados sin consentimiento quedan listados por `synced_without_consent`).

1. Respetar los límites indicados: `localConcurrency` del worker ≤ 10 (nunca más de 10 llamadas simultáneas en todo el proceso: el worker es el único que llama) y `rate_windows('rf.calls', hora)` < 10 000 antes de cada llamada; al llegar al tope, el trabajo se reprograma para la hora siguiente (`startAfter`). La documentación pública de RecruiterFlow no publica límites; además cualquier `429` se trata con backoff.
2. Buscar en RecruiterFlow por email y luego por teléfono verificado (Rev 8 §6); si existe, actualizar; si no, crear. Antes de crear, releer `recruiterflow_sync` por si otro intento ya creó (idempotencia: la fila `recruiterflow_sync` se escribe con el id devuelto en la misma transacción que marca el intento; un reintento con `recruiterflow_id` ya presente solo actualiza). Etiqueta `DieselJobsUSA`.
3. Enviar: nombre, email, teléfono (solo si verificado), ZIP, oficio confirmado o reclamado, nivel vigente (override o screen), verificado el, estado de consentimientos y visibilidad como etiquetas o campos (forma pendiente de Toya, Arquitectura §9), y la hoja de vida actual (descarga desde R2 y subida al candidato de RecruiterFlow) si `clean`.
4. `last_payload_hash` evita reenviar lo mismo. `last_synced_at`, `consent_state_sent`.
5. Fallo → `attempts++`, `last_error` sin datos personales; alerta al agotar.

### 5.7 `candidate-delete` (cadena completa, SEC-75)

Pasos en orden, cada uno idempotente y marcado en `candidate_deletions.steps` (fila **sin** FK, sección 1.10; sobrevive al candidato y no tiene datos personales):

0. **Abrir la fila de `candidate_deletions`** (`candidate_id`, `started_at`, `requested_by`) y **cancelar los trabajos pendientes del candidato**: se buscan en la tabla de pg-boss los trabajos en estado `created` o `retry` de las colas `recruiterflow-sync`, `scan-file`, `resume-fetch`, `screen-start-retry` y `email-send` cuyo `data->>'candidateId'` sea el id, y se cancelan con `boss.cancel(cola, ids)`. Un trabajo que ya estaba `active` termina por sí solo porque `assertNotDeleting` lo detiene en su siguiente paso (sección 5, introducción). Mientras esta fila exista con `finished_at IS NULL`, ningún trabajo nuevo del candidato hace nada.
1. Revocar `return_tokens` y borrar `sessions` del candidato.
2. `DELETE /v1/intake/candidates/{id}` firmado; `200` o `404` → hecho; otro → error (reintento del trabajo entero; los pasos ya hechos se saltan).
3. Listar y borrar los objetos de R2 bajo `candidates/<id>/`; confirmar lista vacía. Borrar archivos de cuarentena del candidato.
4. Borrar `screener_events` por `dju_candidate_id` (sin FK) y `vocabulary_unmapped` que lo referencien (ya caen por cascade).
5. Escribir `tombstones` (`tombstoneHash(id)`) con `ON CONFLICT DO NOTHING` y `phone_suppression` (`reason = 'deleted'`) si tenía teléfono, con `ON CONFLICT DO UPDATE SET last_seen_at`: ninguna otra forma pasa los permisos de la migración 0004 (sección 1.4).
6. `DELETE FROM candidates WHERE id = …`: las cascadas borran `screens`, `screen_starts`, `candidate_field_edits`, `consent_events`, `visibility_events`, `candidate_hidden_companies`, `return_tokens`, `sessions`, `sms_sends`, `files`, `level_overrides`, `recruiterflow_sync`, `emails_sent`, `staff_tasks` con `candidate_id`.
7. Si había `recruiterflow_id` → `staff_tasks` `recruiterflow_delete` con `{ recruiterflow_id, deleted_at }` (Rev 8 §7: una persona decide, porque puede haber una colocación o una factura).
8. `audit('candidate.deleted', { target_id })` (SEC-40). Borrar los trabajos terminados del candidato en pg-boss (ver abajo). Cerrar `candidate_deletions`: `finished_at = now()`, `tombstone_hash` y `tombstone_hash_key_id` = la huella y el `key_id` de `tombstoneHash(id)`, y **`candidate_id = NULL`**, para que el id en claro no quede en ninguna tabla salvo la auditoría y, por un día, el `data` del propio trabajo `candidate-delete`.

Lo que se conserva más allá de la lápida y el hash depende del abogado (Arquitectura §9); hasta entonces, nada más.

**El id en los trabajos de pg-boss.** pg-boss guarda el `data` de cada trabajo en `jsonb` dentro del esquema `pgboss`, así que el `candidateId` en claro también vive ahí: en los trabajos ya terminados de las colas de la tabla de la sección 5 y en el propio trabajo `candidate-delete`. Por eso la promesa del paso 8 tiene dos excepciones acotadas y escritas: la auditoría y, durante una retención corta, el `data` de trabajos de pg-boss en estado terminal. Reglas:

1. Toda cola que recibe un `candidateId` se crea con `deleteAfterSeconds: 86400` (un día, en lugar de los 7 días por defecto de pg-boss): **propuesta, confirmar con Sergio**; ni 02 ni este documento fijaban un valor.
2. Al cerrar la cadena (paso 8), los trabajos del candidato que ya terminaron (`completed`, `failed`, `cancelled`) en las colas del paso 0 se borran con `boss.deleteJob`. Solo queda el propio `candidate-delete`, que cae por la retención del punto 1.
3. La prueba de integración de SEC-75 (T-17) busca el id en las columnas `uuid`, `text` y `jsonb` de todas las tablas de los esquemas `public` **y `pgboss`**. Tras la cadena solo puede aparecer en `staff_audit_log.target_id` y en el `data` de trabajos terminales de `candidate-delete`; tras forzar la retención, solo en la auditoría.

### 5.8 `screen-start-retry`

Reintenta `POST /v1/intake/sessions` para un candidato cuyo inicio falló por screener caído; al lograrlo, envía el email "tu screen está listo" con el `screen_url` (si dio consentimiento de email). Si el candidato ya tiene `screen_status != not_started`, termina.

### 5.9 `vocabulary-publish`

Marca `activated_at` de la versión nueva y `deactivated_at` de la anterior en una transacción; recalcula las vistas en memoria (`alias_index` por lista) del proceso; escribe el `ETag`. El endpoint de integración lee siempre la versión activa de la base, así que el screener ve el cambio en su siguiente lectura (sección 7).

### 5.10 `cleanup`

Borra `sessions` con `expires_at < now()` o `created_at < now() - 12 h` (SEC-34), `return_tokens` vencidos hace más de 7 días, `login_attempts` de más de 30 días, `sms_sends` de más de 90 días, `duplicate_signup_attempts` de más de 30 días, `rate_windows` viejas, archivos de cuarentena `infected` de más de 30 días, y temporales de cuarentena sin fila (huérfanos de más de 24 h).

---

## 6. Integraciones externas y qué pasa cuando cada una está caída

Toda llamada saliente tiene timeout (10 s las que esperan un usuario; 30 s las de trabajos), no reintenta dentro de una petición HTTP del usuario, y envuelve el error sin exponer la respuesta del tercero ni copiar su `statusCode` (SEC-71: el manejador de errores de la app respeta los 4xx, así que un 404 remoto copiado llegaría como 404 al visitante). Todas se reemplazan por dobles de prueba en local y en CI (Arquitectura decisión 22).

| Integración | Cómo se usa | Si está caída |
|---|---|---|
| **ScreenProof** (screener) | `POST`/`GET`/`DELETE` firmados (SEC-15); cuatro webhooks (sección 3); lee el vocabulario (SEC-60) | **El registro no se bloquea nunca.** El paso 1, la verificación, la hoja de vida y el enlace de regreso funcionan igual. El inicio del screen muestra "no disponible ahora" y encola `screen-start-retry`; el barrido nocturno recupera resultados perdidos; el `DELETE` de la cadena de borrado reintenta hasta lograrlo. Un screener caído no bloquea un signup (Rev 8 §4) |
| **RecruiterFlow** | Importar empleos abiertos cada 30 min (`jobs`, `source = recruiterflow`, empresa `LaTrae Consulting Group`); copiar candidatos (`recruiterflow-sync`); límites: ≤ 10 llamadas simultáneas y ≤ 10 000 por hora según lo indicado, más backoff ante `429` | El Job Board sigue mostrando los empleos guardados (nunca se consulta en la petición). La copia de candidatos se reintenta hasta 1 h entre intentos; nada del candidato depende de ella. Tras dos importaciones fallidas seguidas, alerta |
| **Twilio Verify** | `verifications.create` y `verificationChecks.create` (sección 4.2); Geo Permissions EE. UU. y Fraud Guard (SEC-46) | El candidato queda guardado con el teléfono **sin verificar**; ve "no pudimos enviar el código, inténtalo más tarde; mientras tanto te mandamos un enlace a tu correo"; recibe el `return_link`; puede subir hoja de vida; el screen puede iniciarse con `consents.sms: false`. Al volver Twilio, `/account` ofrece "verifica tu teléfono" |
| **Resend** | Emails transaccionales (`return_link`, `nudge`, `duplicate_signup_notice`, `delete_confirm`, `screen_ready` "tu screen está listo", `screen_result` "tu entrevista quedó guardada") con `List-Unsubscribe`; webhook de rebotes (SEC-57, SEC-59) | `email-send` reintenta con backoff; el candidato que acaba de registrarse sigue con su sesión activa y puede continuar sin el email. Si Resend falla más de 1 h, alerta |
| **R2** | Subir tras el escaneo; enlaces firmados de 1 h; backups (SEC-25, SEC-26, SEC-80) | La hoja de vida se queda en cuarentena como `clean_pending_upload` (estado interno del trabajo: `scan_status = clean` pero `storage_key NULL`) y `scan-file` reintenta la subida; el inicio del screen manda `resume_url: null` hasta que suba, con aviso al candidato. Descargas del panel: error visible "almacenamiento no disponible" |
| **ClamAV (clamd local)** | `INSTREAM` por socket Unix (SEC-23) | **Falla cerrado:** nada se marca limpio; los archivos quedan `pending` y luego `error`; healthchecks alerta por `freshclam` y Better Stack por el proceso. El registro sigue funcionando sin hoja de vida |
| **Turnstile** | `siteverify` en cada envío (SEC-42) | **Falla cerrado:** el formulario responde "no pudimos verificar que eres una persona, inténtalo de nuevo". Es la única integración cuyo fallo bloquea el paso 1, a propósito: sin ella los bots entrarían. Alerta si la tasa de fallos de `siteverify` supera un umbral en 5 minutos |
| **Cloudflare Access** | JWT en el panel y en el vocabulario (SEC-31, SEC-60) | Si Access no emite JWT, nadie entra al panel (correcto). Emergencia: consola de DigitalOcean (SEC-78); nunca se "apaga la validación" |
| **PostgreSQL** | Todo | El sitio no funciona; Nginx responde la página estática de error; Better Stack alerta. No hay modo degradado sin base |

---

## 7. Carga, versiones y publicación del vocabulario

### 7.1 Función compartida de normalización

`normalizeAlias(texto)` en `src/domain/vocabulary/normalize-alias.ts`, usada por el cargador, por `resolveCompany`, por la búsqueda de alias en el sitio y, en el Sprint 3B, por el robot de empleos (Arquitectura §1): reemplazar por un espacio todo lo que **no sea letra ni número** (Unicode, `/[^\p{L}\p{N}]+/u`), pasar a minúsculas, colapsar espacios repetidos, recortar extremos. La regla es "no letra ni número" y no "puntuación" porque `+` no es puntuación para `\p{P}` y el archivo sí lo convierte (`"S+R"` → `"s r"`). Exactamente como el archivo lo hace, por eso existen claves como `"6 7 cummins"` y `"ec 60"`. La prueba unitaria (T-03) toma **todas** las claves de `alias_index` del JSON del repositorio y comprueba que `normalizeAlias(clave) === clave` (si la función y el archivo divergen, la prueba falla), que cada `value` y cada alias de cada lista normalizado existe como clave de su índice, y además casos propios: `"Cummins ISX"` → `"cummins isx"`, `"6.7 Cummins"` → `"6 7 cummins"`, `"EC-60"` → `"ec 60"`, `"  Thermo   King "` → `"thermo king"`, `"S+R"` → `"s r"`, `"Mercedes-Benz"` → `"mercedes benz"`, `"don't have one"` → `"don t have one"`, `"1910.178"` → `"1910 178"`, `"A/C"` → `"a c"`, `"Hitachi Dr. ZX"` → `"hitachi dr zx"`, `"Certified Data Centre Professional (CDCP)"` → `"certified data centre professional cdcp"`.

### 7.2 Validación del JSON (zod, SEC-61)

Esquema `.strict()` sobre: `name`, `version` (fecha `YYYY-MM-DD`), `source`, `owner`, `how_to_use` (lista de textos), `lists` (las nueve listas: `trade`, `shifts`, `equipment`, `brands`, `diag_software`, `systems`, `certs`, `cdl_class`, `own_tools`; cada una con `label`, `count`, `groups`, `values[]` con `value`, `group`, `aliases[]` y `notes` opcional), `alias_index` (por lista, objeto texto → texto, con las mismas nueve listas) y `appears_in_more_than_one_list`. Reglas además del esquema: `count` igual a `values.length`; cada `group` de un valor existe en `groups`; cada `value` del `alias_index` existe en `values`; cada alias de `values[].aliases` normalizado aparece en `alias_index` y apunta a su valor; cada clave del `alias_index` ya está normalizada; ningún `value` repetido dentro de una lista. No hay regla sobre el número de grupos: Toya puede agregar grupos sin tocar código. Cualquier regla rota → la carga se rechaza con la lista de errores, sin guardar.

**Comprobado contra el archivo real** (`dieseljobsusa_vocabulary.json`, versión 2026-10-26, el 28 de octubre de 2026): las nueve listas suman 403 valores; el campo opcional se llama `notes` y aparece en 11 valores; `alias_index` tiene las mismas nueve listas; Trade tiene 12 grupos y 39 valores; **todas las reglas de arriba pasan** (conteos, grupos, destinos del índice, alias normalizados presentes y apuntando a su valor, claves ya normalizadas, sin valores repetidos). Regla de trabajo: si en el futuro una de estas reglas falla con un archivo que Toya entrega, se convierte en **advertencia** en la vista previa (se muestra y se puede activar igual), no en bloqueo; el bloqueo queda solo para lo que rompería la app: JSON inválido, estructura fuera del esquema, o un `value` del `alias_index` que no existe en `values`.

### 7.3 Carga desde el panel y desde el repositorio

- **Panel** (`POST /vocabulary/upload`, solo staff): sube el JSON (≤ 2 MB), se valida, se calcula `sha256` (ya cargado → aviso), se guarda en `vocabulary_versions` **sin activar** y se calcula `summary`: por lista, valores agregados, quitados y renombrados; alias agregados y quitados; valores que hoy usan candidatos (`trade_confirmed`, `trade_claimed`, elementos de las seis listas) o empleos (`jobs.trade`) y que la versión nueva ya no tiene (eso bloquea la activación hasta que el staff lo resuelva o acepte conservarlos como "valor retirado"); `vocabulary_unmapped` abiertos que la versión nueva ahora sí mapea (se mostrarán como "se resuelven al activar").
- **Vista previa** (`GET /vocabulary/:versionId`): ese `summary` en lenguaje claro. **Activar** (`POST /vocabulary/:versionId/activate`): encola `vocabulary-publish`; marca `resolved_at` y `resolved_as` en los `vocabulary_unmapped` que ahora mapean; auditoría (SEC-40).
- **Repositorio**: el archivo `vocabulary/dieseljobsusa_vocabulary.json` vive en el repo; un paso del despliegue lo carga con el mismo cargador (misma validación) y lo activa solo si su `version` es más nueva que la activa y no hay bloqueos; si hay bloqueos, el despliegue sigue y deja una `staff_tasks` `review_unmapped`. Así Toya puede actualizar por el panel o por el repositorio sin que las dos vías se pisen: gana la `version` más nueva, y el `sha256` evita duplicados.
- **Formulario de registro**: el desplegable de oficio se construye desde `lists.trade` de la versión activa, agrupado por `group` (Arquitectura §1).

### 7.4 Publicación en el enlace privado

`GET /integration/vocabulary` devuelve el `document` de la versión activa tal cual (sin transformar), con `X-Vocabulary-Version: <version>`, `ETag: "<sha256>"`, `Cache-Control: private, no-store`, detrás de Access con service token y JWT validado en la app (SEC-60). Responde `304` si `If-None-Match` coincide. Nunca sirve una versión no activada. Es la **única copia** que lee el screener (Contrato 1B).

---

## 8. Migraciones, datos de semilla y tabla de ZIP

### 8.1 Migraciones en dos pasos

- Drizzle: esquema en TypeScript → `drizzle-kit generate` produce SQL numerado en `src/db/migrations/`; se revisa en el pull request; `drizzle-kit migrate` lo aplica en el paso de despliegue con el rol de migración (SEC-68), antes del cambio de symlink (Arquitectura decisión 20). pg-boss: `scripts/pgboss-migrate.ts` ejecuta `getConstructionPlans('pgboss')` la primera vez y `getMigrationPlans('pgboss', versiónActual)` después, con el mismo rol (en pg-boss 12.38 son funciones exportadas, no métodos estáticos de `PgBoss`; ver 02 §4.14).
- **Regla de dos pasos**: toda migración que cambie algo que la release anterior usa se divide en **expandir** (agregar columna, tabla o índice; columnas nuevas con `NULL` o `DEFAULT`; `CREATE INDEX CONCURRENTLY` fuera de transacción) y **contraer** (quitar lo viejo, poner `NOT NULL`, borrar columnas) en una release **posterior**, cuando ya nada lo lee. Renombrar = agregar nueva + copiar + leer la nueva + quitar la vieja, en tres releases como mínimo. Así la release anterior sigue funcionando mientras cambia el symlink y el rollback es volver el symlink atrás (las columnas extra no estorban).
- Migraciones manuales (no generadas): extensiones (`CREATE EXTENSION postgis`; PostGIS no es "trusted", así que la instala `infra/db/roles.sql` como superusuario y la migración `0000_extensions.sql` solo la verifica con `IF NOT EXISTS`), roles (`infra/db/roles.sql`, aplicado por Sergio), permisos por tabla y por columna (`0002_permisos.sql`, creada con `drizzle-kit generate --custom`: `REVOKE UPDATE, DELETE` sobre `consent_events`, `visibility_events`, `screens`, `staff_audit_log` y `level_overrides`, más `GRANT UPDATE (superseded_by_screen_id) ON level_overrides`; el rol de app se deriva del rol de migración que ejecuta la migración, `dju_<env>_migrate` → `dju_<env>_app`, y la migración falla sin aplicar nada si no la ejecuta un rol `_migrate`; SEC-67, SEC-39), funciones SQL si hacen falta.
- La migración `0001_modelo_de_datos.sql` (T-04) es la primera con tablas y va completa; **desde la siguiente**, toda migración que toque algo que la release anterior usa sigue la regla de dos pasos de arriba.
- **Migraciones de T-04b**, las dos de expansión salvo un `DROP COLUMN` justificado:
  - `0003_endurecimiento.sql` (generada): los índices en las FK hacia `candidates` y en `screener_events.dju_candidate_id`, los `CHECK` de conjunto cerrado y de par huella–`key_id` de la sección 1, la columna `candidate_deletions.tombstone_hash_key_id` y el `DROP COLUMN resend_events.payload` (no había datos en ningún entorno; la justificación va en el SQL).
  - `0004_permisos_supresion.sql` (manual, `drizzle-kit generate --custom`, mismo bloque `DO` que 0002): `REVOKE UPDATE, DELETE ON phone_suppression, email_suppression, tombstones` y `GRANT UPDATE (last_seen_at) ON phone_suppression` (SEC-10, SEC-12, SEC-67).
- **`CREATE INDEX CONCURRENTLY` y Drizzle.** El migrador de Drizzle (el de `drizzle-kit migrate` y el de `migrateDrizzle` de `scripts/lib/migrations.ts`) corre todas las migraciones pendientes **dentro de una transacción**, así que `CONCURRENTLY` no puede ir en una migración de Drizzle. 0003 crea los índices sin `CONCURRENTLY` porque las tablas están vacías. Cuando haya datos en producción hace falta otro camino (por ejemplo, una migración `--custom` que se corra aparte, fuera del migrador); se decide en T-33.
- La prueba de esquema (`tests/schema/`) corre contra la base migrada en CI: cascadas hacia `candidates` y los tres grupos de la sección 1.11 desde `information_schema` (SEC-75), un índice en toda FK hacia `candidates` (SEC-75), 34 tablas, columnas prohibidas **por patrón** (sección 1.2), cada `CHECK` de conjunto cerrado contra su constante, el par huella–`key_id` (SEC-72), unicidad de `lower(email)`, índices únicos parciales, GIN sobre `jsonb_path_query_array` (es `IMMUTABLE`) y GIST con SRID 4326, permisos de solo inserción y por columna, de las supresiones y de las lápidas (SEC-10, SEC-12, SEC-67), la cascada con el rol de app sin `DELETE` en la hija, que el rol de app no tiene `CREATE` (SEC-67), y que el diario de Drizzle tiene exactamente las migraciones de `_journal.json`, en orden.

### 8.2 Datos de semilla (solo inventados; Arquitectura decisión 33)

`scripts/seed.ts` para local y staging (se niega a correr si `NODE_ENV=production` o si la base tiene nombre de producción): un `owner` y un `staff` con contraseñas de prueba; la empresa `LaTrae Consulting Group`; 10 empleos de ejemplo; 60 candidatos inventados (nombres de un generador, emails `@example.com`, teléfonos del rango reservado `+1 555 01xx`, ZIP reales para probar distancia) en todos los estados del screen, con screens completos tomados de los **cuatro webhooks de muestra** del repositorio (anonimizados por el screener falso), consentimientos variados, dos con override, tres ocultos, uno con teléfono repetido verificado; archivos PDF generados (sin texto real); el vocabulario del repositorio activado; `vocabulary_unmapped` con cinco ejemplos. El screener falso usa estos datos para disparar webhooks a demanda.

### 8.3 Tabla de ZIP del Census en PostGIS

`scripts/load-zip-centroids.ts`: descarga (o lee de `data/`) el archivo Gazetteer de ZCTA del Census Bureau (texto separado por tabuladores, columnas `GEOID`, `INTPTLAT`, `INTPTLONG`, entre otras; unas 33 000 filas), valida cada fila (cinco dígitos, latitud y longitud dentro de EE. UU.), y hace un `COPY` a una tabla temporal y luego `INSERT … ON CONFLICT (zip) DO UPDATE` en `zip_centroids` con `ST_SetSRID(ST_MakePoint(lon, lat), 4326)` y `source_version` = año del archivo. Corre una vez por entorno en 1A y cuando salga un Gazetteer nuevo. Un ZIP que no está (solo de apartado postal) deja `zip_location NULL` en el candidato y la ficha lo marca "sin coordenadas" (Arquitectura decisión 28). La distancia del panel usa `ST_DWithin(zip_location::geography, punto::geography, millas * 1609.344)`.

---

## 9. Los tres esquemas para la revisión del Sprint 1

Borradores en lenguaje sencillo; al cierre del sprint se traducen al inglés para Toya.

### 9.1 Diseño de la base de datos

Un dibujo con las tablas en cinco grupos y una frase por tabla:

- **El candidato y su historia.** `candidates` es el registro vivo: contacto, oficio que eligió y oficio confirmado por el screen, nivel (A, B, C o "no ubicable"), versión de la rúbrica, estado y fecha del screen, visibilidad. No tiene columna de puntaje ni de salario actual. Debajo, `screens` guarda cada screen completado tal como llegó, para siempre; `consent_events` guarda cada permiso con el texto exacto que la persona vio y la fecha, y nunca se corrige: se agrega; `visibility_events` guarda cada vez que alguien pasó a "los empleadores pueden encontrarme" o a "no pueden"; `candidate_hidden_companies` dice de qué empresas se esconde, apuntando a `companies` y no a un texto; `files` son sus hojas de vida con el estado del antivirus; `level_overrides` son los cambios de nivel que hizo el staff con quién, cuándo y por qué.
- **Empresas y empleos.** `companies` es una sola lista de empresas con `company_aliases` (otras formas de escribir el nombre), que usan las empresas ocultas de los candidatos, la lista de exclusión y la cola de revisión de agencias; más adelante, las cuentas de empleadores. `jobs` tiene los empleos del Job Board; desde el día uno trae la columna `trade` con el mismo oficio de la lista del vocabulario que usan los candidatos.
- **El vocabulario.** `vocabulary_versions` guarda cada archivo cargado con su fecha, quién lo cargó y cuál está activo; `vocabulary_unmapped` guarda cada palabra que el screener no pudo ubicar, para que Toya agregue el alias.
- **Seguridad y privacidad.** `phone_suppression` y `tombstones` son los únicos rastros que quedan tras un borrado: un código (hash con clave) del teléfono y del id, sin ningún dato legible. `screener_events` y `resend_events` guardan cada mensaje recibido de los sistemas externos con su clave de "no repetir". `return_tokens` son los enlaces de regreso, guardados como huella y no como enlace. `sessions`, `login_attempts`, `sms_sends`, `duplicate_signup_attempts` y `rate_windows` son los contadores y sesiones que frenan el abuso.
- **El panel.** `staff_users`, `staff_audit_log` (todo lo que hace el staff, incluidas las exportaciones), `staff_tasks` (por ejemplo, borrar la copia en RecruiterFlow cuando un candidato pide ser borrado), `settings` (los ajustes que se cambian sin tocar código: copiar a RecruiterFlow a todos o solo con permiso; a quién va el recordatorio), `recruiterflow_sync` (qué se copió y cuándo), `traffic_sources` (de dónde vino cada visitante la primera vez), `zip_centroids` (el centro de cada código postal, para "a X millas").

Regla general que se le explica a Toya: **cuando un candidato se borra, se borra todo lo suyo en cadena**, y lo único que queda es la huella del teléfono (para que un STOP o un nuevo registro sigan coincidiendo) y la huella del id (para que un resultado tardío del screener se descarte en silencio). Qué más se conserva, si algo, lo decide el abogado.

### 9.2 Cómo funcionará el robot de empleos (Sprint 3B)

1. **Fuentes, no scraping de bolsas.** Cada empleador tiene una fila de configuración: plataforma (Workday, UKG, ADP, Paylocity, BambooHR, Greenhouse) y su identificador, o la URL de su página de empleos. Indeed, LinkedIn y las demás bolsas quedan fuera; los sitios que bloquean robots no se tocan.
2. **Cada seis horas**, un trabajo por fuente: el conector de la plataforma pide los empleos en JSON; para una página de empleos propia, primero se busca el marcado `JobPosting` (schema.org) antes de pensar en un lector a medida. Cada corrida queda registrada con hora, cuántos empleos devolvió y si falló (pantalla de fuentes y monitor de salud).
3. **Dos filtros, en orden.** Primero la **taxonomía** (9.3) decide si el empleo pertenece al Job Board, mirando título y cuerpo juntos; luego el **alias de oficio** (la lista Trade del vocabulario) le pone su `trade`. Un título que no mapea va a la cola de revisión, no se publica ni se descarta. Cada empleo guarda qué regla lo decidió.
4. **Empresas.** Cada empleador del feed pasa por la misma tabla `companies`. Si es nuevo, queda `unreviewed` y sus empleos **se retienen** hasta que el staff lo marque directo o agencia (Correspondencia 27 oct: "Hold them"). Las agencias y la lista de exclusión (con variantes de nombre) no publican nunca. Los empleos temporales y de staffing no pasan.
5. **Deduplicación y vencimiento.** Un empleo se identifica por `(source, source_id)`; si deja de aparecer en su fuente, baja en el mismo ciclo de seis horas (`last_seen_at`). Dos fuentes con el mismo empleo (misma empresa, mismo título, misma ciudad) se funden en uno.
6. **Dos niveles de Google for Jobs** (Sprint 3A): los empleos de LaTrae y los pagados por empleadores llevan `JobPosting` completo y van al Indexing API; los agregados se indexan como páginas normales, sin `JobPosting`, y enlazan al empleador. El interruptor es por fuente.
7. **Panel.** Una tabla con todos los empleos de todas las fuentes, para destacar, editar o quitar; la cola de títulos sin mapear; la cola de empresas por revisar; la pantalla de fuentes.

### 9.3 Formato del archivo de taxonomía (con la regla de HVAC)

Un archivo en el repositorio que LaTrae edita (propuesta: JSON, el mismo formato del vocabulario, para que una sola herramienta valide los dos). Las **familias de roles** del archivo son la lista Trade del vocabulario: se mantiene una lista, no dos (Contrato 3B).

```
{
  "version": "2027-01-15",
  "trades_from_vocabulary": true,
  "include_rules": [
    { "id": "diesel-core", "trade": "Diesel technician",
      "title_any": ["diesel", "fleet technician", "truck mechanic"],
      "body_any": [], "min_score": 2 },
    …
  ],
  "exclude_rules": [
    { "id": "no-staffing", "title_any": ["staffing", "temp", "contract to hire"], "body_any": ["staffing agency"] },
    { "id": "no-driver", "title_any": ["driver", "cdl driver"], "unless_title_any": ["technician", "mechanic"] }
  ],
  "hvac_rule": {
    "applies_when_title_any": ["hvac", "chiller"],
    "qualify_body_any": ["data center", "mission critical", "chiller", "crac", "crah", "centrifugal",
                         "screw chiller", "ups", "switchgear", "generator", "n+1", "uptime"],
    "reject_body_any": ["residential", "homeowner", "furnace", "mini split", "window unit"],
    "trade": "HVAC and refrigeration technician"
  },
  "review_when_no_trade": true
}
```

Cómo se lee: un empleo **entra** si alguna regla de inclusión suma al menos `min_score` puntos entre título y cuerpo (una coincidencia de título vale 2, una de cuerpo vale 1), y **ninguna** regla de exclusión coincide. La **regla de HVAC** se evalúa aparte: si el título habla de HVAC o chillers, el empleo entra **solo** si el cuerpo trae señales de instalación crítica (centro de datos, misión crítica, chiller, CRAC, CRAH, centrífugo, screw chiller, UPS, switchgear, generador, N+1, uptime) y **no** trae señales residenciales o de confort (residencial, propietario, caldera, mini split, unidad de ventana); si trae las dos, gana el rechazo y va a la cola de revisión. El empleo guarda `trade_rule` con el `id` de la regla que decidió (`hvac_rule:qualify`, `no-staffing`, `diesel-core`…). Antes de aplicar un cambio del archivo, el panel muestra la **vista previa**: cuántos empleos hoy publicados saldrían y cuántos retenidos entrarían con la versión nueva, con ejemplos, igual que la vista previa del vocabulario. Todas las comparaciones usan `normalizeAlias` para que "N+1" y "n 1" sean lo mismo, y **comparan palabras o frases completas**, nunca trozos de palabra: "temp" coincide con "temp" o "temp to hire" pero no con "temperature", y "chiller" no coincide con "chillers" salvo que la regla lo liste. La regla de HVAC aplica solo a títulos de HVAC o chiller, como la escribió Toya: "refrigeration tech" a secas **no** la activa, porque en el vocabulario ese título es Transport refrigeration technician (reefers) y esos empleos sí se quieren.
