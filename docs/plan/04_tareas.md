# DieselJobsUSA — Plan de construcción por tareas (Sprint 1)

Versión 1.0 · 28 de octubre de 2026 · Documento de trabajo de Sergio Duran

Este es el plan de construcción. Se apoya en `01_arquitectura.md`, `02_seguridad.md` y `03_backend.md`; cuando algo de aquí choque con ellos, mandan ellos. Cada tarea está pensada para hacerse, probarse y revisarse **en una sola sesión** de Claude Code, con el modelo normal o con Fable para las difíciles. Las horas son de trabajo con Claude Code, incluidas las pruebas y la revisión; son estimaciones honestas, no promesas.

**Cómo leer una tarea.** `Fase` dice cuándo puede hacerse; `Depende de` qué tiene que estar terminado antes; `Implementa` apunta a las secciones de `03_backend.md` (03 §…) y a los controles de `02_seguridad.md` (SEC-nn); `Archivos` lo que crea o toca; `Qué hacer` el trabajo; `Aceptación` lo que Sergio comprueba con sus manos al terminar; `Pruebas` las automáticas que la tarea deja escritas, nombradas con su SEC; `Modelo` normal o Fable; `Horas` la estimación.

**Las tres fases.**

- **Fase 0, antes del reloj.** Todo lo que se puede construir en local sin cuentas, sin marca y sin el endpoint de Trabian: el screener falso, las claves de prueba de Turnstile, un Twilio y un Resend falsos, R2 como disco local, Access con un JWKS de prueba, y el dibujo del mockup con colores provisionales. Estas horas **no** gastan los 15 días. Si las cuentas llegan antes de terminar la fase 0, lo que falte sigue en paralelo con 1A: ninguna de estas tareas necesita cuentas ni espera una aprobación de Toya.
- **Fase 1A.** Arranca el reloj: cuentas, droplet, túnel, Access, despliegue, backups, staging vivo, la pasada de marca y las rondas del mockup.
- **Fase 1B.** Las páginas, el registro y el panel vestidos con la marca (después de que Toya apruebe el mockup), el screener real, RecruiterFlow y Twilio reales, los entregables de la revisión y la publicación.

**Regla de las páginas** (una sola regla; `05_mockup.md` §8 dice lo mismo): la fase 0 construye la lógica y las páginas con **estilo neutro** y **no espera** la aprobación del mockup. La aprobación de Toya condiciona solo las tareas que **visten** con la marca: T-41 (las seis páginas), T-42 (registro, siguientes pasos, cuenta y correos) y T-43 (panel). El mockup vive en `mockup/` (estático, mismo stack TSX + Tailwind que las páginas reales; `05_mockup.md`) y se dibuja en paralelo; lo que Toya apruebe se muda a `src/views/` en esas tres tareas, sin reescribir. Ninguna tarea de la fase 0 depende de una ronda de revisión, así que la espera entre rondas no saca horas de la fase 0 hacia el reloj.

---

## Tarea 0 · Puesta en marcha del entorno local en Windows

- **Fase:** 0 · **Depende de:** nada · **Modelo:** normal · **Horas:** 3
- **Implementa:** 02 §4.19 (SEC-84, SEC-85, SEC-87); 01 decisión 23

**Qué hacer**

1. **Sacar la carpeta de OneDrive.** Cerrar VS Code y Claude Code; mover `C:\Users\flocl\OneDrive\Documentos\dieseljobsusa` a `C:\dev\dieseljobsusa` (la carpeta `C:\dev` ya existe). Git no necesita nada más: el repositorio viaja con la carpeta. Abrir Claude Code desde la carpeta nueva; los MCP (`.mcp.json`) y `.claude/settings.json` viajan con ella. Comprobar que OneDrive no sincroniza `C:\dev`.
2. **Node 24.22.x.** El repo fija `.node-version` en `24.22.x` (T-01 lo crea). Hoy la máquina tiene 24.14.1. Instalar `fnm` (`winget install Schniz.fnm`), agregar su inicialización al perfil de PowerShell (`fnm env --use-on-cd`), y `fnm install 24.22` + `fnm use`. fnm es la única vía: `winget upgrade OpenJS.NodeJS.LTS` ya instala Node 26 (la nueva LTS), no 24.22. npm 11.19.x llega con Node 24.22 (trae `min-release-age`).
3. **Docker Desktop** ya está (29.1.3). El `compose.yaml` de T-02 levanta `postgis/postgis:18-3.6` y `clamav/clamav:stable` (etiquetas comprobadas en Docker Hub). Comprobar que Docker Desktop arranca con WSL 2 y que `docker compose version` responde.
4. **gitleaks:** `winget install Gitleaks.Gitleaks` (8.30.1). Abrir una terminal nueva y comprobar `gitleaks version`.
5. **Hooks:** tras T-01, `npm ci` (con `ignore-scripts`, no corre `prepare`) y luego `npm run prepare` una vez: activa `.githooks` y comprueba que gitleaks responde (SEC-87).
6. **Python:** ya está (3.14) y solo se usa para scripts puntuales de la planificación; el proyecto no lo necesita.

**Aceptación (a mano)**

- `pwd` en la terminal de Claude Code muestra `C:\dev\dieseljobsusa`; `git status` funciona; `git log` muestra el commit de la planificación.
- `node --version` → `v24.22.x`; `npm --version` → `11.19.x` o mayor; `npm config get min-release-age` imprime `7` dentro del repo (lo pone el `.npmrc` de T-01).
- `docker compose up -d` (tras T-02) deja dos contenedores sanos; `docker compose exec db psql -U postgres -c "select postgis_full_version();"` responde; `docker compose exec clamav clamdscan --version` responde.
- `gitleaks version` → `8.30.1`; `git config core.hooksPath` → `.githooks`; un commit de prueba con una línea `AWS_SECRET_ACCESS_KEY=AKIA...` falso es **rechazado** por el hook (se deshace con `git reset`).

---

## Fase 0 · Antes del reloj (local, sin cuentas)

### T-01 · Esqueleto del repositorio y app mínima
- **Fase:** 0 · **Depende de:** Tarea 0 · **Modelo:** normal · **Horas:** 4
- **Implementa:** 03 §2.4; SEC-61, SEC-70, SEC-73, SEC-77, SEC-83, SEC-84, SEC-85
- **Archivos:** `package.json`, `package-lock.json`, `.npmrc` (`ignore-scripts=true`, `min-release-age=7`, `engine-strict=true`), `.node-version`, `tsconfig.json` (TS 6.0, strict), `biome.json`, `vitest.config.ts`, `.gitignore`, `.env.example`, `src/server.ts`, `src/app.ts`, `src/config/env.ts`, `src/logging/pino.ts`, `src/public-site/routes/health.ts`, `README.md` (puesta en marcha)
- **Qué hacer:** crear el proyecto con las versiones de `01_arquitectura.md` §3 (fastify, zod, @fastify/type-provider-zod, pino, @fastify/helmet, @fastify/cookie, @fastify/sensible, typescript 6.0.x, tsx, vitest 5, biome); `env.ts` con zod sobre `process.env` (la app no arranca si falta una variable; en producción rechaza `HOST` distinto de `127.0.0.1` y una URL de screener que apunte al falso); logger pino con `redact` de SEC-73 y serializador `req` propio; `fastify.listen({ host: '127.0.0.1' })`; `GET /healthz`; scripts `dev`, `build`, `test`, `typecheck`, `lint`, `prepare`.
- **Aceptación:** `npm run dev` arranca en `127.0.0.1:3000`; `curl 127.0.0.1:3000/healthz` → 200; quitar una variable del `.env` y arrancar → error claro; `npm run typecheck`, `npm run lint`, `npm test` en verde.
- **Pruebas:** `SEC-61 env rechaza variables faltantes`; `SEC-77 config rechaza HOST 0.0.0.0 en producción`; `SEC-73 pino redacta phone, email, cookie, authorization`.

### T-02 · Base de datos local, roles y migración cero
- **Fase:** 0 · **Depende de:** T-01 · **Modelo:** normal · **Horas:** 4
- **Implementa:** 03 §8.1; SEC-67, SEC-68, SEC-69
- **Archivos:** `compose.yaml` (postgis 18-3.6, clamav stable, volúmenes), `infra/db/init-local.sh` (crea `dju_dev` y `dju_test` con sus roles la primera vez), `drizzle.config.ts`, `src/db/client.ts`, `src/db/migrations/0000_extensions.sql` (verifica postgis; uuidv7 es nativa), `infra/db/roles.sql` (roles `dju_<env>_app` y `dju_<env>_migrate`, PostGIS, `REVOKE ALL ON DATABASE … FROM PUBLIC`, `public` del rol de migración, privilegios por defecto para el rol de app), `scripts/pgboss-migrate.ts`, `scripts/lib/migrations.ts`, `scripts/db-reset.ts` y `scripts/lib/db-reset.ts` (solo local), `tests/helpers/db.ts`, `tests/setup/db.ts` (migra `dju_test` antes de las pruebas), `tests/schema/roles.test.ts`, `tests/schema/migrations.test.ts`, `tests/scripts/db-reset.test.ts`
- **Qué hacer:** dos bases locales (`dju_dev`, `dju_test`) con sus dos roles cada una; `drizzle-kit generate/migrate` corriendo con el rol de migración (`DATABASE_URL_MIGRATE`) y la app con el rol de app; `pgboss-migrate.ts` con `getConstructionPlans('pgboss')` la primera vez y `getMigrationPlans('pgboss', versiónActual)` después: en pg-boss 12.38 son **funciones exportadas** (`import { getConstructionPlans } from 'pg-boss'`), no métodos estáticos de `PgBoss` (02 §4.14).
- **Aceptación:** `docker compose up -d`; `npm run db:migrate` crea las extensiones y el esquema `pgboss`; conectarse con el rol de app y ejecutar `CREATE TABLE x()` falla con `permission denied`.
- **Pruebas** (hechas): en `roles.test.ts`, `SEC-67 rol de app sin CREATE`, `SEC-67 una tabla creada por el rol de migración la puede usar el rol de app, sin DDL`, `SEC-67 el rol de app no lee ni escribe el diario de migraciones`, `SEC-69 rol de test sin CONNECT a dev, y al revés` (dos bases locales simulan los dos entornos), `SEC-68 el script de migración se niega con el rol de app`, `SEC-68 la app arranca pg-boss con migrate: false y usa colas sobre el esquema del rol de migración`; en `migrations.test.ts`, `PostGIS instalado y uuidv7() nativa de PostgreSQL 18`, `SEC-68 el esquema pgboss existe, es del rol de migración y está en la versión de la librería`, `SEC-68 pgboss-migrate sube un esquema de la versión anterior a la actual`; en `db-reset.test.ts`, las dos negativas de `db-reset`. En T-04b, `el diario de Drizzle registra la migración 0000` pasó a `el diario de Drizzle tiene exactamente las migraciones de _journal.json, en orden`.

### T-03 · Primitivas de seguridad
- **Fase:** 0 · **Depende de:** T-01 · **Modelo:** **Fable** · **Horas:** 5
- **Implementa:** 02 §4.1 (firma), §4.9, §4.15; SEC-01, SEC-02, SEC-03, SEC-05, SEC-06, SEC-15, SEC-49, SEC-53, SEC-72
- **Archivos:** `src/security/hmac.ts`, `src/security/keyring.ts`, `src/security/tokens.ts`, `src/security/redirect.ts`, `src/security/csp.ts`, `src/domain/vocabulary/normalize-alias.ts`, sus `*.test.ts`
- **Qué hacer:** firma y verificación `kid=…,sha256=…` sobre `timestamp + "." + raw_body` con `createHmac` y `timingSafeEqual`, ventana de 300 s, dos secretos por dirección desde el `.env`; anillo de claves `PHONE_HASH_KEYS` con `phoneHash`, `emailHash`, `tombstoneHash` por `key_id`, y la regla de "nunca retirar una clave con filas vivas"; tokens aleatorios de 32 bytes con hash SHA-256; `safeRedirect`; directivas CSP por app; `normalizeAlias`.
- **Aceptación:** `npm test -- security` en verde; leer los casos de prueba y reconocer en ellos los ejemplos del spec (§7) y de 02.
- **Pruebas:** `SEC-01 firma sobre bytes crudos`, `SEC-02 comparación en tiempo constante`, `SEC-03 cabecera mal formada → rechazo`, `SEC-05 ventana de 300 s`, `SEC-06 dos secretos por kid`, `SEC-15 secreto de salida distinto del de entrada`, `SEC-49 token no se guarda en claro`, `SEC-53 safeRedirect`, `SEC-72 hash con dos claves y arranque falla si falta una clave con filas`, `normalizeAlias contra todas las claves del alias_index real`.

### T-04 · Modelo de datos completo
- **Fase:** 0 · **Depende de:** T-02 · **Modelo:** normal · **Horas:** 6
- **Implementa:** 03 §1 completo; SEC-67 (permisos por tabla), SEC-75 (cascadas)
- **Archivos:** `src/db/schema/*.ts` (un archivo por grupo de tablas: enums, types, candidates, screens, consents, companies, jobs, vocabulary, events, files, sessions, staff, settings, traffic, zip, deletions), `src/db/migrations/0001_modelo_de_datos.sql` (generada), `src/db/migrations/0002_permisos.sql` (manual, `drizzle-kit generate --custom`: `REVOKE UPDATE, DELETE` al rol de app en `consent_events`, `visibility_events`, `screens`, `staff_audit_log` y `level_overrides`, más `GRANT UPDATE (superseded_by_screen_id) ON level_overrides`), `src/db/keyring-check.ts`, `src/server.ts` (comprobación al arrancar), `tests/helpers/schema.ts`, `tests/schema/cascades.test.ts`, `tests/schema/forbidden-columns.test.ts`, `tests/schema/insert-only.test.ts`, `src/db/keyring-check.test.ts`
- **Qué hacer:** todas las tablas de 03 §1 con sus tipos, índices (GIST, GIN sobre valores canónicos, únicos parciales) y `CHECK`; FK hacia `candidates` con `onDelete: 'cascade'`. Cablear al arranque `assertKeyringCoversRows` (T-03, `src/security/keyring.ts`) con un `SELECT DISTINCT key_id` sobre las tablas con huellas (`candidates.phone_hash_key_id`, `phone_suppression`, `tombstones`, `email_suppression`, `sms_sends`, `duplicate_signup_attempts`): la app no arranca si `PHONE_HASH_KEYS` perdió una clave que todavía tiene filas (SEC-72).
- **Aceptación:** `npm run db:migrate` en una base vacía termina; `\dt` muestra las tablas de 03; `\d candidates` no tiene `score` ni `pay_now`.
- **Pruebas** (hechas): en `cascades.test.ts`, `SEC-75 toda columna candidate_id tiene FK CASCADE salvo candidate_deletions` (lee `information_schema`), `SEC-75 lista de tablas sin referencia coincide con 03 §1.11`, `03 §1 tiene 34 tablas y todas están en alguno de los tres grupos`; en `forbidden-columns.test.ts`, `esquema sin columnas prohibidas`, `lower(email) único en candidates y staff_users`, los índices únicos parciales, GIN y GIST, y los ocho campos S/E; en `insert-only.test.ts`, `SEC-67 consent_events, visibility_events, screens y staff_audit_log sin UPDATE ni DELETE para el rol de app`, `SEC-67 level_overrides solo admite UPDATE de superseded_by_screen_id (SEC-39)`, `SEC-75 ON DELETE CASCADE corre aunque el rol de app no tenga DELETE en la tabla hija`, `SEC-75 borrar un screener_event borra el screen que salió de él (paso 4 de la cadena)`; en `keyring-check.test.ts`, `KEY_ID_COLUMNS cubre toda columna key_id o phone_hash_key_id del esquema` y `SEC-72 el arranque falla si una tabla tiene un key_id que no está en PHONE_HASH_KEYS`. Las migraciones siguientes, `0003_endurecimiento.sql` y `0004_permisos_supresion.sql` (3 tablas más sin `UPDATE` ni `DELETE`), y sus pruebas están en T-04b; ahí `esquema sin columnas prohibidas` pasó a buscar por patrón y la primera prueba del anillo a llamarse `KEY_ID_COLUMNS cubre toda columna que termina en key_id y nombra su huella real`.

### T-04b · Revisión interna de cimientos: correcciones antes de T-05
- **Fase:** 0 · **Depende de:** T-04 · **Modelo:** normal · **Horas:** 8 · **Estado:** hecha el 30 oct 2026 (commits `71bc055` esquema, `bba56bc` app, y los de `docs/plan/`)
- **Implementa:** 02 §4.2, §4.5 y §4.13 a §4.18; 03 §1 y §8.1; SEC-15, SEC-27, SEC-65, SEC-67, SEC-71, SEC-72, SEC-73, SEC-75, SEC-77 (además SEC-10, SEC-12, SEC-49 y SEC-52 en lo que se indica)
- **Por qué existe:** antes de escribir la primera ruta que toque datos personales (T-05 en adelante), se releyeron el código de T-01 a T-04 y los cinco documentos del plan, uno contra otro. Aparecieron controles escritos en 02 que la app todavía no usaba o que no tenían tarea, pruebas que afirmaban más de lo que comprobaban y huecos del esquema. Esta tarea los cierra; las correcciones de los documentos van en el mismo cambio.
- **Archivos:**
  - App, logging y configuración: `src/app.ts`, `src/app.test.ts` (nuevo), `src/server.ts`, `src/config/startup.ts` y su prueba (nuevos), `src/config/env.ts` y su prueba, `src/logging/{pino,scrub}.ts` y su prueba, `src/security/error-handler.ts` (nuevo), `src/security/csp.test.ts`, `src/security/keyring.ts` (`KeyringError`), `src/security/tokens.test.ts`.
  - Esquema: `src/db/schema/*.ts` (`inList` en `types.ts`), `src/db/migrations/0003_endurecimiento.sql` (generada) y `0004_permisos_supresion.sql` (manual) con sus snapshots y su entrada en `_journal.json`, `src/db/client.ts` y `client.test.ts` (nuevo), `src/db/keyring-check.ts` y su prueba, `tests/schema/checks.test.ts` (nuevo), `tests/schema/{cascades,forbidden-columns,insert-only,migrations}.test.ts`, `tests/helpers/*`, `tsconfig.json` (incluye `drizzle.config.ts`).
- **Qué hacer** (hecho):
  - SEC-73: limpieza del log en tres capas: por nombre de clave (con claves exactas `to`, `from`, `name`, `code`), **por valor** (email, teléfono, secuencias largas tipo token, contraseña de una URL; también en el `msg`) y serializador `err` con lista permitida (`type`, `message`, `stack`, `code`, `constraint`, `table`, `column`, `schema`, `routine`, `cause`; nunca `detail`, `where`, `hint` ni los parámetros); `body` sensible a cualquier profundidad; un 404 escribe solo `/<primer segmento>/*`.
  - SEC-71: `setErrorHandler` propio, igual en todos los entornos: un 500 responde `{ error: "internal" }` sin mensaje ni stack, un 4xx responde un código fijo y uno de validación dice solo en qué parte vino el error, sin repetir valores.
  - SEC-27: `trustProxy: '127.0.0.1'` al crear Fastify.
  - SEC-65: la app registra helmet con `helmetOptions('public')` de `csp.ts`, con nonce por petición desde ya.
  - SEC-77: `HOST` debe ser `127.0.0.1` también en staging; `isLocalHost` con `net.BlockList` (loopback, privadas, link-local, IPv4 mapeado, `localhost`, `*.local`).
  - SEC-15: el secreto de salida se compara contra **todos** los de entrada.
  - SEC-72, arranque: tres casos con mensajes distintos (anillo, conexión, otro) y apagado con tope de 10 s; `keyring-check` vigila siete tablas y escapa los nombres con `escapeIdentifier`.
  - SEC-67 (y SEC-10, SEC-12): 0004 quita al rol de app `UPDATE` y `DELETE` en `phone_suppression`, `email_suppression` y `tombstones`, salvo `UPDATE (last_seen_at)` en `phone_suppression`.
  - SEC-75: índice completo en las diez FK hacia `candidates` que no lo tenían y en `screener_events.dju_candidate_id`.
  - SEC-72, esquema: `CHECK` de par huella–`key_id` en toda tabla con huella; `candidate_deletions.tombstone_hash_key_id`.
  - Esquema: `CHECK` en los `text` de conjunto cerrado que 03 enumera, con la lista tomada de una constante (`inList`; `return_tokens.purpose` desde `TOKEN_PURPOSES`); `CHECK` de formato en `phone_e164` y de `language`; `CHECK` de dueño en `sessions`; `resend_events.payload` eliminada; columnas prohibidas por patrón; `statement_timeout` de 10 s y `application_name` en el pool; `drizzle.config.ts` dentro del typecheck; pruebas de migraciones y del anillo sin depender del estado compartido.
  - SEC-49: las pruebas de tokens prueban comportamiento, no copian las constantes.
  - Documentos: los controles sin dueño reciben tarea (SEC-74 en T-08b, SEC-60 en T-15, SEC-45 en T-30, SEC-43 y SEC-58 en T-11), la regla única del mockup, la revisión SEC-88 de los paquetes que 02 y 04 ya citan, y las correcciones de coherencia entre 01, 02, 03 y 04.
- **Decisiones tomadas en la tarea** (escritas en 02 y 03):
  - `sessions` **admite una sesión sin dueño**: el token CSRF (SEC-36) vive en la sesión antes del registro y del login. El `CHECK` rechaza dos dueños y el dueño del otro tipo. *A confirmar con Sergio* (03 §1.9).
  - `candidate_deletions.tombstone_hash_key_id` admite `NULL` mientras corre la cadena de borrado, atado a `tombstone_hash` por un `CHECK` de par (03 §1.10).
  - `resend_events.payload` se eliminó con `DROP COLUMN` (sin datos en ningún entorno; justificado en el SQL de 0003): el cuerpo traía el email y sobreviviría al borrado (03 §1.8).
  - El serializador `err` incluye `column` en la lista permitida (02 SEC-73).
  - La CSP se registra con nonce por petición desde ya, aunque hoy solo haya `/healthz` (02 SEC-65).
  - `@fastify/sensible` ya no se registra (ningún uso en `src/`); sigue en `package.json` hasta que Sergio decida desinstalarlo.
- **Quedó abierto:** `vocabulary_unmapped.list_name` y `emails_sent.template` sin `CHECK` hasta que se cierren (T-09 y T-20); `CREATE INDEX CONCURRENTLY` no cabe en el migrador de Drizzle (T-33); la migración compilada para producción (T-33); `normalizeAlias` sin normalización Unicode, porque depende de la regla del archivo de Toya (03 §7.1); la prueba de SEC-71 con un secreto real en el mensaje (T-08b); `Retry-After` en el 429 (T-11).
- **Aceptación:** `npm run typecheck`, `npm run lint`, `npm test` y `npx drizzle-kit check` en verde (al cerrar: 159 pruebas en verde y `npm audit --omit=dev --audit-level=high` limpio); `npm run db:migrate` en una base vacía aplica 0003 y 0004 y una segunda generación no produce cambios; con la base apagada, `npm run dev` dice que no hay conexión (no que falta una clave); `curl -I http://127.0.0.1:3000/healthz` muestra la CSP de `csp.ts`; una ruta de prueba que lanza un error con un email en el mensaje responde `{ "error": "internal" }` y el log no tiene el email.
- **Pruebas** (nombres reales):
  - Logging (`src/logging/pino.test.ts`): `SEC-73 un DatabaseError real de PostgreSQL no vuelca la fila`, `SEC-73 un error de Drizzle no vuelca los params de la consulta`, `SEC-73 el serializador err solo deja la lista permitida`, `SEC-73 body anidado a 3 niveles`, `SEC-73 claves To, name, code y connectionString`, `SEC-73 limpieza por valor en message y stack`, las de `scrubText`, y la ajustada `SEC-73 limpia las propiedades propias de un Error`.
  - App (`src/app.test.ts`): `SEC-27 request.ip toma x-forwarded-for solo cuando llega desde 127.0.0.1`, `SEC-71 un 500 en producción responde { error: "internal" } sin message ni stack`, `SEC-71 un 4xx no repite valores de la entrada`, `SEC-73 un 404 con un token en el path no escribe el token`.
  - CSP (`src/security/csp.test.ts`): `SEC-65 la app real envía la CSP de csp.ts`, `helmetOptions del panel: sin Turnstile (la app del panel todavía no existe)`.
  - Configuración (`src/config/env.test.ts`): `SEC-15 el mismo secreto con kid distinto en los dos sentidos se rechaza`, `SEC-77 staging exige HOST 127.0.0.1`, `SEC-77 el screener en producción rechaza [::ffff:127.0.0.1], 10.0.0.5 y 192.168.1.20`, `SEC-77 fuera de staging y producción se permite HOST 0.0.0.0 (pruebas en el celular por la red local)`.
  - Arranque (`src/config/startup.test.ts`): `SEC-72 arranque: un KeyringError se distingue de un error de conexión`, `arranque: un error de la consulta que no es de conexión no culpa ni al anillo ni a la red`, `apagado: closeWithin corta a los 10 s (aquí, unos milisegundos) si close() no termina`.
  - Tokens (`src/security/tokens.test.ts`): `SEC-49 cada propósito tiene vigencia y ninguna vigencia sobra`, `SEC-49 vence cuando fijan 02 SEC-49 y 03 §1.9`.
  - Permisos (`tests/schema/insert-only.test.ts`): `SEC-10 tombstones: el rol de app escribe lápidas pero no las borra ni las cambia`, `SEC-12 phone_suppression: sin DELETE y con UPDATE solo de last_seen_at (03 §3.4)`, `SEC-67 email_suppression: el rol de app inserta pero no borra ni edita`.
  - Esquema: `SEC-75 toda FK hacia candidates tiene un índice que empieza por esa columna` (`cascades.test.ts`); en `checks.test.ts`, `esquema: cada CHECK de conjunto cerrado tiene exactamente los valores de su constante`, `esquema: un purpose fuera de TOKEN_PURPOSES se rechaza`, `esquema: una sesión con dos dueños o con el dueño del otro tipo se rechaza; sin dueño se admite (CSRF, SEC-36)`, `SEC-72 una huella sin key_id se rechaza`, `esquema: phone_e164 con formato +1 y diez dígitos, language en o es`; en `forbidden-columns.test.ts`, `esquema sin columnas prohibidas (por patrón, no por nombre exacto)` y `los patrones de columnas prohibidas atrapan variantes de los nombres`; en `migrations.test.ts`, `el diario de Drizzle tiene exactamente las migraciones de _journal.json, en orden`.
  - Anillo y pool: `KEY_ID_COLUMNS cubre toda columna que termina en key_id y nombra su huella real`, `SEC-72 el arranque falla si una tabla tiene un key_id que no está en PHONE_HASH_KEYS` (ahora dentro de una transacción que se deshace), `SEC-72 assertKeyringCoversDatabase lee con el pool de la app; KeyringError sale de keyring-check` (`src/db/keyring-check.test.ts`); `cada conexión del pool lleva statement_timeout de 10 s y application_name` (`src/db/client.test.ts`).

### T-05 · Vocabulario: carga, validación y endpoint
- **Fase:** 0 · **Depende de:** T-03, T-04 · **Modelo:** normal · **Horas:** 5
- **Implementa:** 03 §7; SEC-61 (esquema del JSON). La ruta del enlace privado se crea aquí; el control SEC-60 (JWT de Access y `common_name` del service token) lo cierra T-15
- **Archivos:** `vocabulary/dieseljobsusa_vocabulary.json` (copia del archivo de Toya), `src/domain/vocabulary/{load,diff,publish}.ts`, `src/domain/vocabulary/schema.ts`, `src/integration/vocabulary-endpoint.ts`, `scripts/load-vocabulary.ts`, pruebas
- **Qué hacer:** esquema zod de 03 §7.2 con las reglas extra (errores que bloquean, advertencias), `vocabulary_versions`, `summary` de diferencias, activación, índice de alias en memoria por lista, endpoint con `ETag`/`X-Vocabulary-Version`/`304`, carga desde el repositorio en el despliegue.
- **Aceptación:** `npm run vocab:load` carga el archivo real sin errores ni advertencias; `curl -H 'If-None-Match: …' /integration/vocabulary` → 304; cambiar un alias a mano en una copia y cargar → la vista previa (por ahora JSON en consola) lista el cambio.
- **Pruebas:** `vocabulario real pasa todas las reglas`, `count distinto bloquea`, `destino del índice inexistente bloquea`, `grupo nuevo no bloquea`, `vocabulario: el endpoint sirve solo la versión activa` (sin el prefijo SEC-60: no prueba el control de acceso, que prueba T-15).

### T-06 · Screener falso
- **Fase:** 0 · **Depende de:** T-03 · **Modelo:** normal · **Horas:** 6
- **Implementa:** 01 decisión 24; Spec de integración §4–§7
- **Archivos:** `fake-screener/` (app Fastify aparte: `server.ts`, `routes.ts`, `samples/*.json`, `scenarios.ts`), script `npm run fake-screener`
- **Qué hacer:** `POST /v1/intake/sessions` (verifica la firma sitio→screener con `verifySignedRequest` de T-03 y su propia variable `FAKE_SCREENER_ACCEPTED_SECRETS="s1:<secreto>,s2:<secreto>"`, mismo formato que `SCREENER_IN_SECRETS`, para simular los dos secretos válidos a la vez del lado de Trabian; firma sus webhooks con `buildSignatureHeader` y un `kid` de `SCREENER_IN_SECRETS`; devuelve `session_id` y `screen_url`), `GET` de estado, `DELETE` (200/404 idempotente); panel mínimo o CLI para disparar los cuatro webhooks firmados hacia el sitio, con escenarios: reintento con la misma `idempotency_key`, entrega fuera de orden (`screened_at` viejo), firma mala, `kid` desconocido, timestamp viejo, `spec_version` `2.0` y `1.9`, candidato borrado, candidato inexistente. Las muestras parten de los ejemplos del spec hasta que lleguen las reales de Trabian.
- **Aceptación:** con el sitio y el screener falso corriendo, iniciar un screen desde la consola del falso y ver el `screen.completed` aplicado en la base.
- **Pruebas:** las del receptor (T-07) usan este falso; aquí solo `el falso verifica la firma de entrada`.

### T-07 · Receptor de webhooks del screener
- **Fase:** 0 · **Depende de:** T-03, T-04, T-06, T-08b (la alerta de SEC-10 es un evento de Sentry) · **Modelo:** **Fable** · **Horas:** 6
- **Implementa:** 03 §3.0, §1.8; SEC-01 a SEC-10, SEC-13, SEC-14
- **Archivos:** `src/integration/screener-webhooks/{plugin,verify,route}.ts`, `src/integrations/screener/schemas.ts` (zod por evento y versión), pruebas
- **Qué hacer:** plugin encapsulado con `addContentTypeParser('application/json', { parseAs: 'buffer', bodyLimit: 262144 })`; el orden exacto de 03 §3.0: firma → versión → estructura → transacción (idempotencia, candidato o lápida, guard de orden) → encolar → 200; eventos descartados sin `payload` ni `raw_body`.
- **Aceptación:** correr los escenarios del screener falso y ver en `screener_events` un `status` distinto por escenario; el log no muestra ningún payload.
- **Pruebas:** `SEC-01`, `SEC-02`, `SEC-03`, `SEC-04 401 sin cuerpo`, `SEC-05`, `SEC-06`, `SEC-07 versión mayor 400 y menor 200`, `SEC-08 repetido → un trabajo`, `SEC-09 screened_at viejo → ignored_stale`, `SEC-10 borrado → 200 sin fila; desconocido → 200 y alerta; descartado sin payload`, `SEC-13 log sin payload`, `SEC-14 cuerpo de 300 KB → 413`.

### T-08 · pg-boss, colas y trabajo de limpieza
- **Fase:** 0 · **Depende de:** T-04 · **Modelo:** normal · **Horas:** 4
- **Implementa:** 03 §5 (introducción, tabla de colas, §5.10); SEC-68
- **Archivos:** `src/jobs/boss.ts` (`migrate: false`), `src/jobs/queues.ts` (nombres, políticas, reintentos de la tabla de 03 §5), `src/jobs/assert-not-deleting.ts`, `src/jobs/cleanup.ts`, `src/jobs/healthchecks.ts` (ping con URL opcional), pruebas
- **Qué hacer:** arranque de pg-boss sobre el pool de la app, `createQueue` por cola con su política, `schedule` para los cron, un `work` por trabajo, `assertNotDeleting(candidateId)` compartido, `cleanup` horario.
- **Aceptación:** arrancar la app y ver en `pgboss.queue` las colas creadas; forzar `cleanup` y ver sesiones vencidas borradas.
- **Pruebas:** `assertNotDeleting detiene un trabajo con borrado en curso`, `SEC-34 cleanup borra sesiones por inactividad y por 12 h`.

### T-08b · Sentry sin datos personales
- **Fase:** 0 · **Depende de:** T-04b (limpieza por valor exportada desde `src/logging/`) · **Modelo:** normal · **Horas:** 3
- **Implementa:** 01 decisión 16 y §1 (Sentry sin datos personales); SEC-74; la parte de Sentry de SEC-71
- **Archivos:** `src/logging/sentry.ts`, `src/logging/sentry.test.ts`, `src/server.ts` (iniciar Sentry solo si hay DSN), `src/config/env.ts` (`SENTRY_DSN` opcional fuera de producción), `.env.example` (variable sin valor), `package.json` y `package-lock.json`, fila nueva en 01 §3 (revisión SEC-88)
- **Qué hacer:**
  1. **Antes de instalar, la revisión SEC-88 de `@sentry/node`** anotada en 01 §3: versión vigente y fecha (la 11.10.0 que cita 01 se publicó el 28 de octubre y pasa el cooldown de 7 días desde el 4 de noviembre; si se instala antes, la última que lo pase), línea 11 con más de un mes, `npm view @sentry/node scripts` sin scripts de instalación, mantenedores, dependencias transitivas y documentación vigente en Context7 (`dataCollection`, `beforeSend`, `requestDataIntegration`). Con la revisión escrita, **se pregunta a Sergio** y solo con su sí se instala con versión exacta.
  2. `initSentry(env)` con `sendDefaultPii: false`, `dataCollection: { httpBodies: [], httpHeaders: false }`, `requestDataIntegration` sin cookies, datos, cabeceras, IP ni query, y `tracesSampleRate: 0`; sin DSN (local y pruebas) no envía nada.
  3. `beforeSend` que recorre el evento y pasa todo texto por la misma limpieza del logger, ya exportada en `src/logging/scrub.ts` (`scrubText`, `isSensitiveKey`, `SENSITIVE_KEY_FRAGMENTS`, `SENSITIVE_EXACT_KEYS`); además tapa los UUID en `extra` (el log los deja pasar a propósito, 02 SEC-73) y quita cabeceras de firma y cookies.
  4. El manejador de errores de T-04b manda el error a Sentry ya limpio; la alerta `warning` de SEC-10 (T-07) usa esta misma función.
- **Aceptación:** con un DSN de prueba apuntando a un transporte local, lanzar un error con `+12145550147` y `marcus@example.com` en el mensaje produce un evento sin esos valores; sin DSN la app arranca y no intenta conectarse.
- **Pruebas:** `SEC-74 beforeSend quita email, teléfono, cookie y cabecera de firma`, `SEC-74 un error con datos personales en el mensaje produce un evento sin ellos (transporte de prueba)`, `SEC-71 un error cuyo mensaje contiene un secreto con la forma de los reales no lo deja en el log ni en Sentry` (la prueba de 02 SEC-71; el secreto se genera como los reales, 32 bytes aleatorios en base64url, no con los textos de `tests/helpers/secrets.ts`).

### T-09 · Procesamiento de los eventos del screener
- **Fase:** 0 · **Depende de:** T-07, T-08, T-05 · **Modelo:** **Fable** · **Horas:** 8
- **Implementa:** 03 §3.1 a §3.4, §1.3, §1.4, §1.5 (`resolveCompany`); SEC-11, SEC-12, SEC-39 (parte del screen)
- **Archivos:** `src/jobs/screener-event.ts`, `src/domain/candidates/apply-screen-completed.ts`, `src/domain/companies/resolve-company.ts`, `src/domain/candidates/consents.ts`, pruebas
- **Qué hacer:** `applyScreenCompleted` con las tres listas de columnas (S, S/E, ignoradas) como constantes tipadas; `screens`; `resolveCompany` con creación `unreviewed` y tarea; reemplazo de `candidate_hidden_companies` solo de filas `screener`/`default_current_employer` y solo sin edición; `vocabulary_unmapped` (y decidir los valores de `list_name` para cerrarlo con `CHECK`, 03 §1.7); `needs_review` por override; encolar `resume-fetch` y `recruiterflow-sync`; `screen.abandoned` con `screen_progress`; `sms.opted_out` sobre todos los registros del hash y vaciado de `payload`/`raw_body`.
- **Aceptación:** disparar desde el falso un `screen.completed` sobre un candidato de semilla y ver en la ficha (por ahora `psql`) nivel, oficio confirmado, empresas ocultas creadas; disparar `sms.opted_out` y ver el evento en los dos registros del mismo teléfono.
- **Pruebas:** `SEC-11 campos C y T del payload se ignoran`, `SEC-11 S/E editado se conserva`, `SEC-11 hide_from_employers reemplaza solo screener/default`, `SEC-12 opted_out agrega a todos y no sobrescribe`, `SEC-12 payload vaciado tras procesar`, `SEC-39 screen que discrepa marca needs_review`, `resolveCompany crea unreviewed y tarea`, `unmapped sin duplicar`.

### T-10 · Archivos: cuarentena, tipo, ClamAV, almacenamiento, descarga de la generada
- **Fase:** 0 · **Depende de:** T-04, T-08 · **Modelo:** normal · **Horas:** 8
- **Implementa:** 03 §4.4, §5.1, §5.3, §1.10 (`files`); SEC-17 a SEC-26
- **Archivos:** `src/integrations/r2/storage.ts` (interfaz + adaptador disco + adaptador S3), `src/integrations/clamav/instream.ts`, `src/domain/files/{ingest-resume,is-resume-available,safe-display-name}.ts`, `src/jobs/{scan-file,resume-fetch}.ts`, pruebas con el contenedor de ClamAV y el archivo EICAR
- **Qué hacer:** cuarentena con permisos, `sha256` al vuelo, `file-type` + `@file-type/cfbf`, cliente INSTREAM propio que falla cerrado, subida con clave generada, `is_current`, enlaces firmados de 1 h como adjunto, `resume-fetch` con host permitido, `redirect: 'error'`, 5 MB y 30 s.
- **Aceptación:** subir un PDF por `curl` (ruta provisional) → `pending` → `clean` en segundos y objeto en el disco local; subir el archivo EICAR → `infected`; apagar el contenedor de ClamAV y subir → `error`.
- **Pruebas:** `SEC-17 host ajeno y redirección no se descargan`, `SEC-18 6 MB aborta a los 5 MB`, `SEC-19 mismo sha256 una sola vez`, `SEC-20 exe renombrado se rechaza; doc y docx reales se aceptan`, `SEC-21 límites`, `SEC-22 pending no disponible`, `SEC-23 OK/FOUND/socket cerrado/timeout`, `SEC-24 nombre generado y display name saneado`, `SEC-26 URL firmada: 3600 s, attachment, host de R2`, `isResumeAvailable`.

### T-11 · Registro paso 1, verificación de teléfono y duplicados
- **Fase:** 0 · **Depende de:** T-03, T-04, T-08 · **Modelo:** **Fable** · **Horas:** 8
- **Implementa:** 03 §4.1, §4.2, §1.2, §1.9 (`sms_sends`, `duplicate_signup_attempts`); SEC-42 a SEC-48, SEC-58, SEC-61
- **Archivos:** `src/public-site/signup/{routes,views}.tsx`, `src/domain/candidates/{signup,dedupe}.ts`, `src/integrations/twilio/verify.ts` (+ doble de prueba), `src/integrations/turnstile/verify.ts` (claves de prueba de Turnstile en local), `src/domain/sms/limits.ts`, `src/config/rate-limits.ts` (la tabla de abajo), pruebas
- **Qué hacer:** formulario con estilo neutro y Turnstile (claves de prueba documentadas por Cloudflare), CSRF, zod `.strict()`, E.164 solo EE. UU., dedupe por email con respuesta idéntica, aviso por email limitado a uno cada 24 h, límites por IP (memoria) y por teléfono/día (PostgreSQL), corte global, Verify con los códigos de error de 03 §4.2, dedupe por teléfono verificado → `needs_review` + tarea. Ninguna ruta de webhooks de Twilio (SEC-58).
- **Límites por IP de SEC-43** (viven en configuración, `src/config/rate-limits.ts`, y los aplica `@fastify/rate-limit` por ruta; esta tarea fija la tabla entera y T-13 y T-15 usan sus filas):

  | Ruta | Límite por IP | Origen del valor |
  |---|---|---|
  | `POST /signup` | 10 en 10 min | 02 §4.7 |
  | `POST /signup/verify/resend` | 5 en 10 min | 02 §4.7 (envíos de código) |
  | `POST /signup/verify` | 10 en 10 min | 02 §4.7 (verificaciones) |
  | Formulario "pide un enlace nuevo" (T-13) | 5 en 10 min | Propuesta, confirmar con Sergio |
  | `POST /account/resume` (T-13) | 10 en 1 h | Propuesta, confirmar con Sergio |
  | `POST /unsubscribe/:token` (T-13) | 20 en 10 min | Propuesta, confirmar con Sergio |
  | `POST /login` del panel (T-15) | 10 en 15 min, además del bloqueo por usuario de SEC-37 | Propuesta, confirmar con Sergio |

- **Aceptación:** registrarse en local con el Twilio falso (el código sale en el log) y llegar a `/account`; registrarse con el mismo email y ver la misma pantalla sin fila nueva; pedir el código cuatro veces en una hora y ver que la cuarta no llama al falso.
- **Ojo con el 429:** el manejador de errores de T-04b responde solo el código fijo y no copia `error.headers`; esta tarea comprueba que el 429 de `@fastify/rate-limit` siga llevando `Retry-After` (02 SEC-43) y ajusta el manejador si hace falta.
- **Pruebas:** `SEC-42 siteverify falso/timeout → 400`, `SEC-43 429 por IP con los valores de la tabla y Retry-After`, `SEC-44 cuarto código no llama a Twilio`, `SEC-46 número no US no llama`, `SEC-47 E.164 y teléfono sin verificar no une`, `SEC-48 duplicado: misma respuesta, sin fila, email una vez por 24 h, teléfono coincidente envía código`, `SEC-58 ninguna ruta de webhooks de Twilio registrada` (lista las rutas de la app), `SEC-61 campo extra → 400`.

### T-12 · Sesiones en PostgreSQL, cookies y CSRF
- **Fase:** 0 · **Depende de:** T-04 · **Modelo:** **Fable** · **Horas:** 5
- **Implementa:** 03 §1.9 (`sessions`); SEC-34, SEC-35, SEC-36
- **Archivos:** `src/security/session-store.ts` (cuatro métodos, `compareAndSet` con `ENOENT`), `src/app.ts` (registro de `@fastify/session` por app con nombres `dju_cand` y `dju_staff`), `src/security/csrf.ts`, pruebas
- **Qué hacer:** store propio sobre Drizzle; vencimiento absoluto de 12 h comprobado en un hook; `regenerate` al iniciar sesión; cookies host-only `Secure`/`HttpOnly`/`SameSite=Lax`; `@fastify/csrf-protection` con `sessionPlugin: '@fastify/session'`.
- **Aceptación:** iniciar una sesión de prueba, ver la fila en `sessions`, cerrar y ver que desaparece; cambiar la hora del reloj de prueba 12 h adelante y ver que la sesión muere aunque haya actividad.
- **Pruebas:** `SEC-34 regenerate cambia sid`, `SEC-34 inactividad 60 min`, `SEC-34 absoluto 12 h`, `SEC-34 compareAndSet sobre destruida → ENOENT`, `SEC-35 Set-Cookie con atributos y sin Domain`, `SEC-36 POST sin token → 403`.

### T-13 · Enlaces de regreso, `/account`, subida y baja de correos
- **Fase:** 0 · **Depende de:** T-10, T-11, T-12 · **Modelo:** normal · **Horas:** 6
- **Implementa:** 03 §4.3, §4.4, §2.1 (rutas `/r/:token`, `/r/:token/confirm`, `/account*`, `/unsubscribe/:token`); SEC-49 a SEC-56
- **Archivos:** `src/public-site/account/{routes,views}.tsx`, `src/public-site/tokens/routes.ts`, `src/views/view-models/candidate-view.ts` (sin `level`), `src/domain/candidates/unsubscribe.ts`, pruebas
- **Qué hacer:** `GET /r/:token` canjea solo `return`; para `delete_confirm` página con botón y `POST /r/:token/confirm`; **`email_verify` se retira de `TOKEN_PURPOSES`** (decisión de 03 §1.9: ningún flujo lo envía y el enlace de regreso ya prueba que el email es del candidato), con la migración que angosta el `CHECK` de `return_tokens.purpose` (no hay filas con ese valor en ningún entorno); formulario "pide un enlace nuevo" con Turnstile y límite; `/account` desde `CandidateView`; subida con progreso; `/account/resume/status`; `GET`/`POST /unsubscribe/:token` con `consent_events` `withdrawn`; `Referrer-Policy` por ruta; límites por IP de la tabla de T-11.
- **Aceptación:** abrir el enlace del email (del log) en el navegador → `/account` sin token en la barra; abrir un enlace `delete_confirm` → página con botón, y en la base el token sigue sin `used_at`; pulsar el botón → borrado encolado.
- **Pruebas:** `SEC-49 vencido/revocado/propósito ajeno → rechazo`, `SEC-50 return → 303 y Set-Cookie; GET de delete_confirm no cambia nada`, `SEC-51 Referrer-Policy`, `SEC-53 next peligroso → /account`, `SEC-54 CandidateView.parse quita level`, `SEC-55 ninguna página ni email del candidato contiene el nivel`, `SEC-56 IDOR: archivo de otro → 404`, `unsubscribe inserta withdrawn una vez por día`.

### T-14 · Inicio del screen, regreso, reintento y barrido nocturno
- **Fase:** 0 · **Depende de:** T-06, T-09, T-13 · **Modelo:** normal · **Horas:** 6
- **Implementa:** 03 §4.5, §4.6, §5.4, §5.8; SEC-15, SEC-53
- **Archivos:** `src/integrations/screener/client.ts`, `src/public-site/account/screen.ts`, `src/jobs/{screen-sweep,screen-start-retry}.ts`, pruebas
- **Qué hacer:** cliente firmado con timeout y sin reintento en la petición del usuario; límite de 30 días solo para `candidate`; `resume_url` solo si `isResumeAvailable`; `return_url` fijo; `consents.sms` según consentimiento, verificación y supresión; página de regreso; barrido con `GET` de estado y reinyección por el camino del webhook con `idempotency_key = 'sweep:…'`; informe solo si hay algo.
- **Aceptación:** iniciar un screen desde `/account` y ser redirigido al falso; apagar el falso e iniciar → mensaje de "no disponible" y trabajo encolado; dejar un candidato en `started` 6 h (reloj de prueba) y correr el barrido → resultado recuperado.
- **Pruebas:** `SEC-15 llamadas firmadas con el secreto de salida`, `30 días: segundo inicio del candidato bloqueado, del staff no`, `consents.sms false sin verificar o suprimido`, `barrido reinyecta por el camino del webhook e ignora stale`, `screener caído no bloquea el registro`.

### T-15 · Panel: Access, login, roles, auditoría, usuarios
- **Fase:** 0 · **Depende de:** T-12, T-05 (la ruta del vocabulario) · **Modelo:** **Fable** · **Horas:** 9
- **Implementa:** 03 §2.2 (login, logout, users, me/password), §2.3 (`GET /integration/vocabulary`, el control de acceso), §1.10 (`staff_users`, `login_attempts`, `staff_audit_log`); SEC-30 a SEC-33, SEC-37, SEC-38, SEC-40, SEC-41, SEC-60
- **Archivos:** `src/security/access-jwt.ts` (jose, JWKS de prueba servido en local), `src/panel/{plugin,roles,audit}.ts`, `src/panel/auth/*`, `src/panel/users/*`, `src/integration/vocabulary-endpoint.ts` (el hook de acceso), pruebas
- **Qué hacer:** hook `onRequest` que valida `Cf-Access-Jwt-Assertion` (firma, `iss`, `aud`, `email` igual al usuario); `onRoute` que exige `config.role`; argon2id; `login_attempts` con bloqueo de 15 min y mensaje único; límite por IP del login de la tabla de T-11; `audit()`; alta/baja de usuarios (baja borra sesiones); cambio de contraseña borra todas las sesiones; `X-Robots-Tag`. **SEC-60:** el enlace privado del vocabulario valida el JWT del service token con la misma función (`aud` = `ACCESS_AUD_VOCAB`) y comprueba que el claim `common_name` es el Client ID de Trabian (`ACCESS_SERVICE_CLIENT_ID_SCREENER`); en un JWT de service token `sub` viene vacío, así que no se usa. En local, un JWKS falso y un generador de JWT de prueba.
- **Aceptación:** entrar al panel local con un JWT de prueba y contraseña; sin JWT → 403; con JWT de otro email → 403 y la sesión muere; seis intentos fallidos → bloqueado con el mismo mensaje; `curl` al vocabulario con un JWT de service token de prueba → 200, y con otro `common_name` → 403.
- **Pruebas:** `SEC-31 sin cabecera / otra clave / aud ajeno / email distinto → 403`, `SEC-32 usuario desactivado → 403 y sin sesiones`, `SEC-33 argon2id y mínimo 12`, `SEC-37 sexto intento bloqueado sin llamar a verify`, `SEC-38 ruta sin config.role lanza al registrar; staff en ruta owner → 403`, `SEC-40 toda ruta POST del panel llama a audit`, `SEC-41 X-Robots-Tag`, `SEC-60 vocabulario: sin JWT → 403; common_name distinto → 403; correcto → 200`.

### T-16 · Panel: candidatos, filtros con distancia, override, exportación, descarga
- **Fase:** 0 · **Depende de:** T-15, T-09, T-10, T-22 · **Modelo:** normal · **Horas:** 8
- **Implementa:** 03 §2.2 (candidatos), §1.10 (`level_overrides`); SEC-39, SEC-40, SEC-54, SEC-56, SEC-63, SEC-26
- **Archivos:** `src/panel/candidates/{list,detail,override,visibility,export,files}.ts` y vistas TSX neutras, `src/views/view-models/staff-candidate-view.ts`, `src/domain/csv.ts` (`csv-stringify` + `neutralizeFormula`), pruebas
- **Qué hacer:** lista con filtros (nivel con override, oficio, distancia `ST_DWithin`, certs, CDL, software, verificado desde, estado, visibilidad, `needs_review`), ocultos marcados; ficha con historial; override con motivo; cambio de visibilidad con captura tardía del consentimiento; exportación con auditoría de filtros y conteo; descarga por enlace firmado.
- **Aceptación:** filtrar "a 35 millas de 75201" y ver resultados coherentes con la semilla; exportar CSV y abrirlo en Excel sin que una celda `=…` se ejecute; ver la exportación en el registro de auditoría.
- **Pruebas:** `SEC-39 override sin motivo → 400`, `SEC-40 exportación auditada con rows_count`, `SEC-54 StaffCandidateView no filtra level pero sí secretos`, `SEC-56 staff en ruta owner → 403`, `SEC-63 celdas peligrosas neutralizadas`, `distancia PostGIS`.

### T-17 · Cadena de borrado y lápidas
- **Fase:** 0 · **Depende de:** T-09, T-10, T-14, T-15 · **Modelo:** **Fable** · **Horas:** 6
- **Implementa:** 03 §5.7, §1.4 (`tombstones`), §1.10 (`candidate_deletions`), §2.2 (`POST /candidates/:id/delete`); SEC-10, SEC-75
- **Archivos:** `src/domain/candidates/deletion.ts`, `src/jobs/candidate-delete.ts`, `src/panel/candidates/delete.ts`, pruebas
- **Qué hacer:** los pasos 0 a 8 de 03 §5.7, con cancelación de trabajos pendientes, `DELETE` firmado idempotente, limpieza de almacenamiento, lápida, supresión, cascadas, tarea de RecruiterFlow, auditoría y anonimización de `candidate_deletions`.
- **Aceptación:** borrar un candidato de semilla desde el panel; comprobar con `psql` que su id solo aparece en `staff_audit_log.target_id`; disparar desde el falso un `screen.completed` para ese id → `discarded_deleted`; registrarse de nuevo con el mismo teléfono → sigue suprimido para textos.
- **Pruebas:** `SEC-75 tras la cadena el id solo está en la auditoría` (busca también en el esquema `pgboss` y en toda columna `jsonb`, con la excepción acotada de 03 §5.7), `SEC-75 almacenamiento vacío bajo el prefijo`, `SEC-75 DELETE 404 cuenta como hecho; 500 reintenta`, `SEC-75 repetir la cadena no falla`, `SEC-10 lápida reconoce al borrado`, `trabajos pendientes cancelados y assertNotDeleting detiene los activos`.

### T-18 · Fusión de duplicados y "mantener separados"
- **Fase:** 0 · **Depende de:** T-17, T-16 · **Modelo:** **Fable** · **Horas:** 6
- **Implementa:** 03 §4.7, §2.2 (`/tasks/:id/merge`, `/candidates/:id/merge`, `/tasks/:id/keep-separate`); SEC-40, SEC-75
- **Archivos:** `src/domain/candidates/merge.ts`, `src/panel/tasks/{list,merge}.ts` y vistas, pruebas
- **Qué hacer:** comparación lado a lado, elección por campo con los valores propuestos, historiales con fechas (03 §4.7: `screens`, `consent_events`, `visibility_events` y `level_overrides` se **copian** con `INSERT` porque son de solo inserción para el rol de app; los `screener_events` de los screens copiados se **reasignan** al superviviente con `UPDATE dju_candidate_id` en la misma transacción; el resto se mueve con `UPDATE`), copia de objetos de almacenamiento, encolado de la cadena del absorbido con `requested_by = 'merge'` y sin `phone_suppression`, auditoría `candidate.merged`, `kept_separate`.
- **Aceptación:** con los dos candidatos de semilla que comparten teléfono, fusionar y ver un solo registro con los dos historiales intercalados; probar "mantener separados" en otro par y ver que un nuevo aviso no reabre la tarea.
- **Pruebas:** `fusión copia screens/consents/visibility/overrides y mueve files/hidden/starts con fechas`, `tras fusionar y completar la cadena del absorbido, el superviviente conserva todos sus screens` (los eventos reasignados no caen con el paso 4), `email único: absorbido borrado en la misma transacción`, `absorbido pasa por la cadena sin phone_suppression`, `SEC-40 candidate.merged con nombres de columnas y sin valores`, `kept_separate evita reabrir`.

### T-19 · Panel: empresas, vocabulario, no mapeados, ajustes, auditoría, tareas
- **Fase:** 0 · **Depende de:** T-15, T-05, T-09 · **Modelo:** normal · **Horas:** 7
- **Implementa:** 03 §2.2 (resto), §7.3; SEC-40, SEC-61
- **Archivos:** `src/panel/{companies,vocabulary,unmapped,settings,audit,tasks}/*` y vistas neutras, pruebas
- **Qué hacer:** revisión y fusión de empresas con alias (03 §1.5 punto 4: reasignar `candidate_hidden_companies`, `jobs.company_id`, `company_aliases`, `candidates.current_employer_company_id` y `staff_tasks.company_id` antes de borrar la sobrante; sin las dos últimas el `DELETE` falla por la FK); carga del JSON con vista previa (advertencias y bloqueos) y activación; cola de no mapeados; ajustes con zod por clave y auditoría de valor anterior y nuevo; vista de auditoría (owner); tareas.
- **Aceptación:** subir una versión del vocabulario con un alias nuevo, ver la vista previa, activarla y ver el `304`/`ETag` cambiar en el endpoint; cambiar `nudge.audience` y ver el cambio en auditoría.
- **Pruebas:** `vista previa lista agregados/quitados y bloqueos`, `activar marca unmapped resueltos`, `SEC-40 settings auditados con anterior y nuevo`, `SEC-61 ajuste con valor fuera del enum → 400`, `fusión de empresas reasigna las cinco tablas y borra la sobrante` (una empresa referida desde `candidate_hidden_companies`, `jobs`, `company_aliases`, `candidates.current_employer_company_id` y `staff_tasks.company_id`; tras fusionar, el `DELETE` termina y ninguna fila conserva su id).

### T-20 · Emails: Resend en modo log, plantillas, recordatorio, baja, webhook de Resend
- **Fase:** 0 · **Depende de:** T-13, T-08 · **Modelo:** normal · **Horas:** 6
- **Implementa:** 03 §5.5, §3.5, §1.4 (`email_suppression`), §2.3 (`/integration/resend/webhooks`); SEC-57, SEC-59 (cabeceras), SEC-73
- **Archivos:** `src/integrations/resend/mailer.ts` (modo `log` en local), `src/integrations/resend/templates/*.tsx` (HTML y texto), `src/jobs/{email-send,nudge-email}.ts`, `src/integration/resend-webhooks.ts`, pruebas
- **Qué hacer:** plantillas `return_link`, `nudge`, `duplicate_signup_notice`, `delete_confirm`, `screen_ready` y `screen_result` (el correo del resultado tardío que promete la página de regreso, 03 §3.1 paso 8 y §4.6); la migración que agrega el `CHECK` de `emails_sent.template` con las seis plantillas (lista cerrada en 03 §1.10; la constante va en el archivo del esquema, como las demás de `inList`); `List-Unsubscribe` y `List-Unsubscribe-Post` en el recordatorio; `emails_sent`; exclusión por `email_suppression` y por `withdrawn`; webhook con `resend.webhooks.verify` e idempotencia; audiencia del recordatorio según el ajuste.
- **Aceptación:** correr el recordatorio en local y ver en el log los correos con sus cabeceras; simular un webhook de rebote firmado con el secreto de prueba y ver el hash en `email_suppression`.
- **Pruebas:** `SEC-57 firma mala → 400; buena → supresión; webhook-id repetido → una vez`, `recordatorio respeta audiencia, 14 días y máximo 2`, `List-Unsubscribe presente`, `plantillas del candidato sin level (SEC-55)`.

### T-21 · RecruiterFlow contra respuestas grabadas
- **Fase:** 0 · **Depende de:** T-04, T-08 · **Modelo:** normal · **Horas:** 6
- **Implementa:** 03 §5.6, §6 (fila RecruiterFlow), §1.6 (`jobs`), §1.10 (`recruiterflow_sync`, `rate_windows`); SEC-64
- **Archivos:** `src/integrations/recruiterflow/{client,sync,jobs-import}.ts`, `tests/fixtures/recruiterflow/*.json`, `src/jobs/{recruiterflow-sync,recruiterflow-jobs-import}.ts`, pruebas
- **Qué hacer:** cliente con los límites indicados (concurrencia ≤ 10, `rate_windows` por hora, backoff ante 429), importación de empleos abiertos a `jobs` con empresa `LaTrae Consulting Group` y descripción saneada, sincronización de candidatos por email y luego teléfono sin crear dos veces, `sync_mode`, `synced_without_consent`.
- **Aceptación:** correr la importación contra las respuestas grabadas y ver los empleos en `jobs`; correr la sincronización de un candidato dos veces y ver un solo id de RecruiterFlow.
- **Pruebas:** `SEC-64 descripción saneada`, `sync no duplica en reintento`, `rate_windows detiene al llegar al tope`, `consented_only excluye sin share`.

### T-22 · ZIP del Census, geo y datos de semilla
- **Fase:** 0 · **Depende de:** T-04 · **Modelo:** normal · **Horas:** 4
- **Implementa:** 03 §8.2, §8.3, §1.10 (`zip_centroids`, `traffic_sources`)
- **Archivos:** `scripts/load-zip-centroids.ts`, `data/README.md` (de dónde se baja el Gazetteer), `src/domain/geo/zip.ts`, `scripts/seed.ts`, `src/public-site/visitor-cookie.ts`
- **Qué hacer:** carga con `COPY` y `ON CONFLICT`; `zip_location` al guardar; semilla con 60 candidatos inventados, empresas, empleos, vocabulario, dos con teléfono repetido, archivos PDF generados; cookie de primera visita y `traffic_sources`.
- **Aceptación:** `npm run zip:load` termina con ~33 000 filas; `npm run seed` llena la base local; `SELECT count(*) FROM candidates WHERE zip_location IS NULL` pequeño.
- **Pruebas:** `ZIP sin centroide no bloquea el registro`, `seed se niega en producción`, `cookie de primera visita sin datos personales`.

### T-23 · Verifier local y CI, gitleaks, cooldown, velocidad de páginas
- **Fase:** 0 · **Depende de:** T-01, T-24 (para medir páginas neutras; T-24 no espera el mockup, así que esta cadena nunca espera a Toya) · **Modelo:** normal · **Horas:** 6
- **Implementa:** sección "El verifier" de este documento; SEC-28, SEC-54, SEC-62 (greps), SEC-65 (CSP en humo), SEC-83 a SEC-88; 01 decisión 21
- **Archivos:** `.github/workflows/ci.yml`, `.githooks/pre-commit`, `.gitleaks.toml`, `scripts/check-dependency-age.ts`, `scripts/grep-rules.sh`, `scripts/page-speed.ts`, `tests/schema/*`, `docs/ops/verifier.md`
- **Qué hacer:** el pipeline de la sección "El verifier"; `page-speed.ts` con `lighthouse` 13.6 + `chrome-launcher` 1.2 (revisión SEC-88 en 01 §3; la 13.6.0 pasa el cooldown desde el 3 de noviembre) y `CHROME_PATH` del Chromium de Playwright; umbrales; el grep de SEC-62 distingue la concatenación de **constantes del propio código** (permitida, como los nombres de tabla de `src/db/keyring-check.ts`) de la concatenación con datos de entrada (prohibida): busca `sql.raw` y concatenaciones o plantillas que mezclen SQL con variables que no sean constantes declaradas en el mismo módulo, con una lista corta de excepciones revisadas; `npm audit --omit=dev --audit-level=high`; gitleaks binario con checksum; **prueba de que gitleaks detecta un secreto**: en una rama local, commit con un patrón falso (`cfast_` + 48 caracteres) → el hook lo rechaza; en CI (cuando exista el repo de la organización) el mismo commit en un pull request de prueba falla el paso.
- **Aceptación:** `npm run verify` en local corre todo en menos de 10 minutos y termina en verde; introducir a mano un `delete obj.level` en un archivo → `grep-rules` falla; bajar el umbral de velocidad a 100 → falla y vuelve a pasar al restaurarlo.
- **Pruebas:** el verifier es la prueba; `check-dependency-age` tiene su unitaria (`versión de 3 días → falla; excluida → pasa`).

### T-24 · Páginas públicas con estilo neutro, CSP con nonces, Job Board
- **Fase:** 0 · **Depende de:** T-05, T-21 · **Modelo:** normal · **Horas:** 6
- **Implementa:** 03 §2.1 (las seis páginas, `/jobs`, `/jobs/:slug`); SEC-64, SEC-65, SEC-66
- **Archivos:** `src/views/{layout,components}/*.tsx`, `src/public-site/pages/*.tsx`, `src/public-site/jobs/*`, `src/styles/app.css` (Tailwind 4 con tokens neutros), `@fastify/helmet` por app en `src/security/csp.ts`
- **Qué hacer:** las seis páginas y el Job Board servidos por Fastify con datos reales y **estilo neutro** (regla de las páginas): puede partir de los componentes del mockup tal como estén, sin `mockup-ui/` y **sin esperar su aprobación**; T-41 los viste después con lo que Toya apruebe. Job Board desde `jobs` con detalle y botón "Apply" hacia `/signup?job=`, CSP con nonces (público con `challenges.cloudflare.com`; panel sin él; desde T-04b `buildApp` ya registra helmet con `helmetOptions('public')` y genera el nonce por petición, así que aquí falta pasar `reply.cspNonce` a las plantillas), sin CORS, `robots.txt` por entorno, `sitemap.xml`. La velocidad (verifier, T-23) se mide sobre estas páginas neutras y se vuelve a medir con la marca en T-41. Las pruebas del mockup que preparan SEC-55 y SEC-65 se convierten aquí en las pruebas reales de esos controles.
- **Aceptación:** navegar las seis páginas y el Job Board en el celular (red local) sin errores de CSP en la consola; `curl -I` muestra la CSP y `X-Robots-Tag` en staging.
- **Pruebas:** `SEC-65 CSP pública con challenges.cloudflare.com; panel sin él; ningún script inline sin nonce`, `SEC-66 sin Access-Control-Allow-Origin`, `SEC-64 descripción con script no se renderiza`.

### T-25 · Pruebas de humo con Playwright
- **Fase:** 0 · **Depende de:** T-13, T-14, T-16, T-24 · **Modelo:** normal · **Horas:** 5
- **Implementa:** 01 decisión 22; SEC-65 (violaciones de CSP), SEC-55, SEC-56 (recorrido real)
- **Archivos:** `playwright.config.ts` (perfil de celular), `tests/e2e/{signup,return-link,upload,webhook,panel}.spec.ts`, `tests/e2e/helpers/csp-listener.ts`
- **Qué hacer:** cinco flujos en celular contra la app local con el screener falso; escucha de la consola que falla ante cualquier violación de CSP; recorrido del candidato buscando el nivel en el DOM; intento IDOR por la interfaz.
- **Aceptación:** `npm run e2e` en verde en local; forzar una violación de CSP (un `onclick` inline temporal) → la prueba falla.
- **Pruebas:** las cinco de humo + `SEC-65 cero violaciones de CSP`.

### T-26 · Infraestructura como archivos (lista para el día uno de 1A)
- **Fase:** 0 · **Depende de:** T-01 · **Modelo:** normal · **Horas:** 6
- **Implementa:** 01 decisiones 18, 19, 20, 32; SEC-70, SEC-76 a SEC-82; 02 §4.18
- **Archivos:** `infra/nginx/{public,panel,staging}.conf` (solo `127.0.0.1`, `client_max_body_size 5m`, `X-Forwarded-For $http_cf_connecting_ip`, `access_log off` en `/r/`), `infra/cloudflared/config.yml` (hostnames, `ssh://localhost:22`, `access.required` con AUD tags), `infra/systemd/{backup.service,backup.timer,freshclam-ping.conf}`, `infra/sshd/sshd_config.d/dju.conf`, `infra/scripts/{provision.sh,deploy.sh,backup.sh,restore-test.md}`, `infra/checks/*.sh` (SEC-69, SEC-70, SEC-77, SEC-78, SEC-82, screener falso), `infra/db/roles.sql` (producción y staging), `docs/ops/runbook.md`
- **Qué hacer:** escribir y revisar todo lo que el droplet necesita, probado en lo posible en un contenedor Ubuntu 24.04 local (`nginx -t`, `sshd -t`, `bash -n`); `deploy.sh` al estilo Capistrano con health check y symlink; `backup.sh` con `pg_dump | zstd | age -r <pública> | aws s3 cp`.
- **Aceptación:** `nginx -t` y `sshd -t` en el contenedor pasan; leer `restore-test.md` y reconocer los seis pasos de 01 decisión 18.
- **Pruebas:** CI corre `nginx -t`, `sshd -t -f`, `shellcheck` sobre `infra/`.

**Horas de la fase 0:** T-00 3 + T-01 4 + T-02 4 + T-03 5 + T-04 6 + T-04b 8 + T-05 5 + T-06 6 + T-07 6 + T-08 4 + T-08b 3 + T-09 8 + T-10 8 + T-11 8 + T-12 5 + T-13 6 + T-14 6 + T-15 9 + T-16 8 + T-17 6 + T-18 6 + T-19 7 + T-20 6 + T-21 6 + T-22 4 + T-23 6 + T-24 6 + T-25 5 + T-26 6 + T-37a a T-37g (dibujo del mockup) 19 = **189 horas**. Al 30 de octubre están hechas la Tarea 0 a T-04b (30 h estimadas) y las tandas 1 y 2 del mockup (6 h); quedan unas 153. A 5 horas productivas por día son unas 6 semanas; a 6 horas, unas 5. No gastan el reloj, y por la regla de las páginas ninguna espera una aprobación de Toya. **Orden recomendado si las cuentas llegan antes de terminar:** lo que ya está listo se despliega a staging y la fase 0 sigue en paralelo; las tareas de la fase 0 que más días del reloj ahorran son, en orden, T-26, T-23, T-15, T-24 y T-07/T-09.

---

## Fase 1A · Mockup y base (arranca el reloj)

### T-30 · Cuentas, DNS, dominios, correo de alertas, monitoreo
- **Fase:** 1A · **Depende de:** cuentas de Toya · **Modelo:** normal · **Horas:** 4
- **Implementa:** 01 §1 (hosting), decisiones 16 y 30; SEC-45; SEC-59 (preparación)
- **Qué hacer:** mover el repositorio a la organización de GitHub (con `main` protegido y el environment `production` con aprobación); zonas de Cloudflare para los dos dominios; registros DNS (`staging`, `panel`, `staging-panel`, `ssh`, subdominio de correo); Single Redirect `dieseljobusa.com → dieseljobsusa.com`; **regla de rate limiting de Cloudflare (SEC-45)** con la expresión de 02 §4.7 sobre `POST /signup`, `/signup/verify` y `/signup/verify/resend`; Email Routing para `alerts@`; cuentas de Sentry, Better Stack y healthchecks.io con `alerts@`; Turnstile widget real (sitio y staging); secretos de CI en GitHub Environments.
- **Aceptación:** `dig` de cada registro responde; `https://dieseljobusa.com` redirige; un correo a `alerts@` llega a Sergio y a la dirección de Toya; la regla de SEC-45 aparece activa en Security rules con las tres rutas (se anota en la lista de revisión de 02 §7).
- **Pruebas:** ninguna automática; queda en la lista de revisión.

### T-31 · Droplet base
- **Fase:** 1A · **Depende de:** T-26, T-30 · **Modelo:** normal · **Horas:** 6
- **Implementa:** 01 decisiones 11, 18, 32; SEC-67, SEC-69, SEC-77, SEC-79, SEC-81, SEC-82
- **Qué hacer:** droplet Ubuntu 24.04 de 4 GB en el equipo de TL Turner Holdings; `provision.sh`: usuarios `dju-prod`, `dju-staging`, `deploy`; swap 2 GB; PostgreSQL 18 + PostGIS desde PGDG con `listen_addresses = 'localhost'`; `roles.sql`; ClamAV con `ConcurrentDatabaseReload no` y `freshclam` daemon con ping; Nginx solo en `127.0.0.1`; Node 24.22 y PM2 por usuario; `unattended-upgrades`; `.env` de cada entorno en 600. **Antes de tocar SSH:** comprobar que la **consola de emergencia de DigitalOcean** abre y permite iniciar sesión como un usuario con sudo (es el único camino de vuelta si el túnel falla).
- **Aceptación:** entrar por la consola de DigitalOcean y ejecutar `sudo -l`; `ss -ltn` muestra solo `127.0.0.1` y el socket de PostgreSQL; `sigtool --info` muestra firmas de hoy; `psql` como `dju_staging_app` a `dju_production` falla.
- **Pruebas:** `infra/checks` en verde (SEC-67, SEC-69, SEC-77, SEC-82).

### T-32 · Túnel, Access, SSH por túnel y cierre del puerto 22
- **Fase:** 1A · **Depende de:** T-31 · **Modelo:** **Fable** · **Horas:** 5
- **Implementa:** 01 decisión 19; SEC-30, SEC-31 (lado Cloudflare), SEC-60 (lado Cloudflare), SEC-76, SEC-78; 8.3 de 02 (JWT en `cloudflared`)
- **Qué hacer:** túnel con `cloudflared` como servicio; hostnames públicos (`dieseljobsusa.com`, `staging`, `panel`, `staging-panel`, `ssh`); aplicaciones de Access: staging (Allow: Toya, Trabian, Sergio), paneles (Allow: staff), SSH (Allow: Sergio; Service Auth: token de CI), vocabulario por ruta (Service Auth: token de Trabian por entorno), Bypass acotado para `/integration/resend/webhooks` en staging; `access.required` con los AUD tags en la configuración del túnel; `sshd_config` solo llave, sin root, sin contraseña; `ProxyCommand cloudflared access ssh` en el computador de Sergio; **solo cuando el SSH por túnel y la consola de DigitalOcean funcionan**, firewall de DigitalOcean sin ninguna regla de entrada. Guardar los AUD tags en los `.env`.
- **Aceptación:** `ssh dju-staging@ssh.dieseljobsusa.com` entra por el túnel; `nmap -Pn <ip>` desde fuera no muestra puertos; `curl https://staging.dieseljobsusa.com` redirige al login de Access; `curl` con las cabeceras del service token de prueba pasa; intento de login SSH con contraseña rechazado.
- **Pruebas:** lista de revisión manual (02 §7); `infra/checks/sshd.sh` (SEC-78).

### T-33 · Pipeline de despliegue atómico
- **Fase:** 1A · **Depende de:** T-32, T-23 · **Modelo:** normal · **Horas:** 6
- **Implementa:** 01 decisiones 20 y 21; SEC-68, SEC-70, SEC-83 a SEC-87 (en CI real); 03 §8.1
- **Qué hacer:** `deploy-staging.yml` (en `main`: verifier → build → `npm ci --omit=dev` → subir release por SSH con el service token → migraciones con `DATABASE_URL_MIGRATE` → `pgboss-migrate` → vocabulario del repo → health check en puerto interno → symlink → `pm2 reload`); `deploy-production.yml` (tag + aprobación); `infra/checks` como paso del despliegue; rollback documentado. **Migraciones desde una release:** `drizzle-kit` y `tsx` son dependencias de desarrollo y no existen tras `npm ci --omit=dev`, así que hace falta un script de migración **compilado** que use `migrateDrizzle` y `migratePgBoss` de `scripts/lib/migrations.ts` (solo necesitan `drizzle-orm`, `pg` y `pg-boss`) y llame antes a `assertMigrateRole`. **Índices con datos:** el migrador de Drizzle corre todo dentro de una transacción y no admite `CREATE INDEX CONCURRENTLY` (03 §8.1); se decide aquí cómo correr una migración `--custom` aparte cuando haya datos en producción.
- **Aceptación:** un push a `main` deja staging actualizado sin interrumpir peticiones (observar con `curl` en bucle); forzar un health check fallido → el symlink no cambia; `git tag v0.1.0` → el environment pide aprobación.
- **Pruebas:** el pipeline mismo; `checks` en verde.

### T-34 · R2, backups cifrados, bucket lock real y primera restauración
- **Fase:** 1A · **Depende de:** T-31, T-30 · **Modelo:** normal · **Horas:** 5
- **Implementa:** 01 decisión 18; SEC-25, SEC-80
- **Qué hacer:** buckets `dju-resumes`, `dju-backups`, `dju-staging-resumes`, `dju-staging-backups`, privados; tokens "Object Read & Write" por bucket; `wrangler r2 bucket lock add dju-backups --retention-days 35`; par de claves `age` (la privada en el gestor que diga Toya; la pública en el droplet); `backup.timer` activo; ping a healthchecks. **Prueba real del bucket lock:** intentar borrar y sobrescribir el backup de anoche con el token del servidor → denegado. **Primera restauración** siguiendo `restore-test.md` (clave por stdin desde el computador de Sergio) en una base temporal, con conteos.
- **Aceptación:** `aws s3 rm` del backup → `AccessDenied`; la restauración termina y `SELECT count(*)` coincide; la clave privada no está en el disco del droplet (`grep -r AGE-SECRET-KEY /` vacío); healthchecks marca el backup en verde.
- **Pruebas:** manual, registrada en `docs/ops/restores.md`.

### T-35 · Correo, DMARC, Turnstile y monitoreo vivos
- **Fase:** 1A · **Depende de:** T-30, T-33 · **Modelo:** normal · **Horas:** 4
- **Implementa:** 01 decisiones 16 y 27; SEC-42 (claves reales), SEC-59, SEC-74; 8.3 de 02 (DMARC Management)
- **Qué hacer:** dominio de envío en Resend con sus registros; `_dmarc` en `p=none` con `rua` de DMARC Management de Cloudflare; webhook de Resend a staging (Bypass acotado) con su secreto; claves reales de Turnstile en los `.env`; Sentry con `dataCollection` y `beforeSend` activos y un evento de prueba sin datos personales; Better Stack sobre `/healthz` vía el hostname público; healthchecks para backup, barrido, freshclam y cola.
- **Aceptación:** un correo de staging llega con SPF, DKIM y DMARC en `pass` (cabeceras del mensaje); el evento de prueba en Sentry no trae cabeceras ni cuerpo; una alerta de prueba de Better Stack llega a `alerts@`.
- **Pruebas:** `SEC-74 beforeSend` la escribe T-08b; aquí solo la verificación manual con el DSN real.

### T-36 · Staging vivo y verificación de seguridad del entorno
- **Fase:** 1A · **Depende de:** T-33, T-34, T-35 · **Modelo:** **Fable** · **Horas:** 4
- **Implementa:** 02 §7 (lista de revisión), §4.6 (Access + login real); SEC-30 a SEC-32, SEC-65 en producción real
- **Qué hacer:** desplegar a staging, sembrar datos inventados, crear los usuarios del staff, entrar al panel con Access real + contraseña; recorrer la lista de revisión de 02 §7 completa por primera vez; **prueba de gitleaks en CI**: pull request con un secreto falso → el paso falla; CSP obligatoria con cero violaciones en las pruebas de humo contra staging.
- **Aceptación:** la lista de 02 §7 marcada entera; `npm run e2e -- --base-url https://staging…` en verde con el service token de CI; el pull request de prueba de gitleaks aparece rojo.
- **Pruebas:** humo contra staging.

### T-37 · Mockup de toda la plataforma
- **Fase:** 0 y 1A: el dibujo (T-37a a T-37g) es fase 0 y no depende del staging; la pasada de marca y las rondas son 1A · **Depende de:** archivos de marca y textos (solo para la pasada de marca; las tandas con colores provisionales no esperan nada) · **Modelo:** normal · **Horas:** 19 de dibujo + 3 de pasada de marca + 11 de rondas = 33 (antes 10 + 6)
- **Implementa:** Contrato 1A ("mockup aprobado de toda la plataforma"); 01 decisión 29; 05_mockup.md
- **Qué hacer:** el mockup vive en `mockup/` (estático: TSX de Preact + `preact-render-to-string` + Tailwind 4, mismo stack de las páginas reales), construido y revisado por tandas según `05_mockup.md`. Publicación temporal en un servidor de Sergio con usuario y contraseña y noindex hasta que exista el staging (T-36); cuando lleguen los archivos de marca, se reemplazan los tokens provisionales de `mockup/styles/tokens.css` y se repasa cada tanda. Dos rondas de cambios por página con lista clara de lo que cambió ("What changed" en el índice).
- **Re-estimación con lo medido (30 oct).** Al planificar, T-37 era "vestir las páginas de T-24" y se estimó en 16 horas. Pasó a ser un mockup propio de las **121 pantallas** del inventario de 05 §9. Medido: las tandas 1 y 2 (39 pantallas con todo su detalle, más la base del mockup, el servidor, las capturas y las pruebas) se dibujaron en una jornada de unas 6 horas, cerca de 6,5 pantallas por hora. Cada fila de la tabla es una sesión (regla de trabajo 1 de `CLAUDE.md`):

  | Sub | Tanda (05 §3) | Pantallas | Estado al 30 oct | Horas |
  |---|---|---|---|---|
  | T-37a | 1 · Sitio público | 11 | Dibujada, ronda interna | 6, medidas, las dos juntas |
  | T-37b | 2 · Registro y cuenta del técnico | 28 | Dibujada | (en T-37a) |
  | T-37c | 3 · Correos (HTML y texto plano) | 6 | En curso | 2 |
  | T-37d | 4 · Panel de Toya | 27 | Por dibujar | 5 (tablas, filtros y fichas: más lento que la medida) |
  | T-37e | 5 · Sprints 3A y 3B, sencilla | 15 | Por dibujar | 2 |
  | T-37f | 6 · Sprint 2, sencilla | 16 | Por dibujar | 2 |
  | T-37g | 7 · Sprint 4, sencilla | 18 | Por dibujar | 2 |
  | | **Dibujo** | **121** | 39 dibujadas (32 %) | **19** (13 por hacer) |
  | | Pasada de marca: tokens reales y repaso de las siete tandas con capturas | | Espera los archivos de marca | 3 |
  | | Rondas: dos por pantalla (Contrato), 1 h por ronda en las tandas 1 a 4 y 0,5 h en las 5 a 7 | | Espera la revisión de Toya | 11 |

  El dibujo cuenta en la fase 0 (no gasta el reloj si termina antes de que arranque); la pasada de marca y las rondas cuentan en 1A. Lo que no se controla es la **espera** de Toya entre rondas (riesgo 1 de "Estimación honesta").
- **Aceptación:** Toya aprueba por escrito; cada pantalla del Contrato tiene su mockup; revisado en celular.
- **Pruebas:** las de `tests/mockup/` en verde (noindex, cero scripts y recursos externos, enlaces internos, textos prohibidos, casillas, hex solo en tokens, vocabulario, servidor contenido).

### T-38 · Revisión de seguridad 1A y publicación de la base en producción
- **Fase:** 1A · **Depende de:** T-36, T-37 · **Modelo:** **Fable** · **Horas:** 3
- **Implementa:** 02 §7
- **Qué hacer:** lista de revisión completa; despliegue a producción de la base (páginas con marca en "próximamente" o las mismas del mockup sin registro abierto, según decida Toya), redirección, panel con Access, backups corriendo sobre producción; cierre del milestone 1A con Toya.
- **Aceptación:** `https://dieseljobsusa.com` responde con marca; el panel de producción exige Access; backup de la primera noche en el bucket con lock.

**Horas de la fase 1A:** T-30 4 + T-31 6 + T-32 5 + T-33 6 + T-34 5 + T-35 4 + T-36 4 + T-37 (pasada de marca y rondas) 14 + T-38 3 = **51 horas**. El dibujo de T-37 (19 h) está en la fase 0.

---

## Fase 1B · Páginas, roster y conexión con el screener

### T-40 · Conectar el screener real
- **Fase:** 1B · **Depende de:** T-36, endpoint y secretos de Trabian · **Modelo:** **Fable** · **Horas:** 5
- **Implementa:** 03 §3, §4.5, §6; SEC-01 a SEC-16, SEC-60
- **Qué hacer:** secretos reales por canal seguro; muestras reales comparadas con los esquemas zod (ajustar lo que difiera del spec, según el spec); service token de Trabian para el vocabulario; DNS para `screen.dieseljobsusa.com`; correr los escenarios adversarios contra el endpoint de prueba; acordar `return_url` y el comportamiento con el screener caído (01 §9).
- **Aceptación:** un screen completo de punta a punta en staging con el endpoint de prueba; firma mala desde su lado → 401 en nuestros logs; el screener lee el vocabulario con su token.
- **Pruebas:** las de T-07/T-09 con las muestras reales añadidas a `fixtures/`.

### T-41 · Las seis páginas con marca
- **Fase:** 1B · **Depende de:** T-37 aprobado, textos de Toya · **Modelo:** normal · **Horas:** 15 + 6 de rondas
- **Implementa:** Contrato 1B; 03 §2.1
- **Qué hacer:** vestir con la marca las páginas neutras de T-24, mudando a `src/views/` los componentes que Toya aprobó en el mockup: Home, Job Board (empleos reales de RecruiterFlow desde T-44), Job Seekers, For Employers, About, Privacy and Terms (texto del abogado; relleno marcado hasta que llegue); mobile first; dos rondas por página; velocidad dentro del umbral del verifier, medida otra vez con la marca.
- **Aceptación:** Toya aprueba cada página tras sus rondas; `npm run verify` con la medición de velocidad en verde.
- **Pruebas:** humo + velocidad.

### T-42 · Registro, siguientes pasos y cuenta con marca
- **Fase:** 1B · **Depende de:** T-37, T-41 · **Modelo:** normal · **Horas:** 6
- **Implementa:** 03 §4; Walkthrough
- **Qué hacer:** vestir el paso 1, el código SMS, `/account`, la subida con progreso, la página de regreso, las páginas de token y de baja, y las plantillas de correo de T-20 con lo aprobado en la tanda 3 del mockup; textos de las tres casillas (del abogado, con `wording_version`); desplegable de oficio agrupado.
- **Aceptación:** recorrido completo en celular en staging con el screener de prueba; casillas desmarcadas por defecto; nivel ausente en todo lo que ve el candidato.
- **Pruebas:** humo; `SEC-55` recorrido real.

### T-43 · Panel con marca y primeras pantallas del Contrato
- **Fase:** 1B · **Depende de:** T-37, T-16, T-19 · **Modelo:** normal · **Horas:** 6
- **Implementa:** Contrato 1B "Back office"; 03 §2.2
- **Qué hacer:** candidatos, hojas de vida, exportación CSV, filtro por distancia, override, vocabulario, ajustes, tareas con la marca; ocultos marcados; verificado el.
- **Aceptación:** Toya y su staff entran al panel de staging y hacen un override, una exportación y una carga de vocabulario.

### T-44 · RecruiterFlow real
- **Fase:** 1B · **Depende de:** T-21, API key de Toya · **Modelo:** normal · **Horas:** 4
- **Qué hacer:** importación de empleos abiertos cada 30 min en staging y luego producción; sincronización de candidatos con la forma de consentimiento y visibilidad que decida Toya; `sync_mode` por defecto `all`.
- **Aceptación:** el Job Board muestra los empleos de LaTrae; un candidato de prueba de staging aparece en RecruiterFlow etiquetado `DieselJobsUSA` (en una cuenta o etiqueta de prueba acordada con Toya).

### T-45 · Twilio real
- **Fase:** 1B · **Depende de:** T-11, cuenta de Twilio (semana 2) · **Modelo:** normal · **Horas:** 3
- **Qué hacer:** servicio de Verify, Geo Permissions solo EE. UU., Fraud Guard, lista corta de números del equipo en staging, claves en los `.env`.
- **Aceptación:** código real recibido en un teléfono del equipo; un número no US rechazado antes de llamar.

### T-46 · Recordatorio, webhook de Resend y baja en producción
- **Fase:** 1B · **Depende de:** T-20, T-35 · **Modelo:** normal · **Horas:** 3
- **Qué hacer:** recordatorio activo con la audiencia por defecto; prueba de baja de un clic desde Gmail y Outlook; DMARC a `quarantine` si los reportes están limpios (según el calendario de SEC-59).
- **Aceptación:** la baja desde el cliente de correo inserta el `withdrawn`; reportes DMARC sin fallos del envío legítimo.

### T-47 · Consentimientos, visibilidad y textos legales finales
- **Fase:** 1B · **Depende de:** textos del abogado · **Modelo:** normal · **Horas:** 3
- **Implementa:** Contrato 1B "Consent, visibility and privacy"; Rev 8 §3
- **Qué hacer:** `wording_version` definitiva; comprobar las reglas de visibilidad con la vista del staff; captura tardía del consentimiento; ajustes del abogado aplicados (recordatorio, premarcado, RecruiterFlow).
- **Aceptación:** registro con y sin `share` produce `findable`/`hidden`; cambio por el staff a `findable` sin consentimiento exige la captura tardía y queda en el historial con fecha propia.

### T-48 · Entregables de la revisión y documentación de entrega en inglés
- **Fase:** 1B · **Depende de:** todo lo anterior · **Modelo:** normal · **Horas:** 6
- **Qué hacer:** `docs/handoff/sprint-1/` en inglés: resumen de lo construido, cómo operar (panel, ajustes, vocabulario, tareas), la lista de cuentas y secretos (sin valores) y quién los custodia, el runbook de incidentes resumido, y la **traducción al inglés de los tres esquemas** de 03 §9 (diseño de la base de datos con diagrama generado desde el esquema, cómo funcionará el robot de empleos, formato del archivo de taxonomía con la regla de HVAC). Revisión de que nada en `docs/plan/` ni `docs/handoff/` tiene montos ni secretos.
- **Aceptación:** Toya puede leer los tres esquemas sin preguntar qué significa una tabla.

### T-49 · Revisión de seguridad antes de producción y publicación de 1B
- **Fase:** 1B · **Depende de:** T-40 a T-47 · **Modelo:** **Fable** · **Horas:** 6
- **Implementa:** 02 §7 completo; 02 §5.5 (baja de staff si aplica)
- **Qué hacer:** la lista de revisión de 02 §7 entera; verifier en verde; `npm run e2e` contra staging; revisión del diff acumulado buscando lo que la sección 6 de 02 prohíbe; despliegue a producción por tag con aprobación; primer registro real de prueba del equipo y su borrado completo; cierre del Sprint 1.
- **Aceptación:** lista marcada con fecha; producción responde; el registro de prueba borrado deja solo lápida y hash.

### T-50 · Reserva para diferencias de contrato con Trabian y correcciones
- **Fase:** 1B · **Modelo:** normal · **Horas:** 6
- **Qué hacer:** horas reservadas para lo que las muestras reales del screener cambien, y para correcciones de la revisión de Toya que no sean rondas de diseño.

**Horas de la fase 1B:** 5 + 21 + 6 + 6 + 4 + 3 + 3 + 3 + 6 + 6 + 6 = **69 horas**.

---

## Estimación honesta contra los 15 días hábiles

| | Horas estimadas | Con factor de aprendizaje ×1,3 |
|---|---|---|
| Fase 0 (no gasta el reloj) | 189 | 246 |
| Fase 1A | 51 | 66 |
| Fase 1B | 69 | 90 |
| **1A + 1B** | **120** | **156** |

Quince días hábiles a 8 horas son **120 horas** teóricas; a 6 horas productivas con Claude Code (lo realista mientras se aprende) son **90**. Es decir: **1A más 1B no caben en el reloj** si se cuentan solas: llenan las 120 teóricas sin margen y superan las 90 realistas, aun sin el factor de aprendizaje. Lo que las hace caber es la fase 0: 189 horas de trabajo que ya estarán hechas y probadas antes de que arranque el reloj. La regla de las páginas es la que sostiene ese argumento: ninguna tarea de la fase 0 espera una aprobación de Toya, así que ninguna se mete en el reloj por esperar. Con la fase 0 completa, lo que queda dentro del reloj son cuentas, servidor, la pasada de marca y las rondas del mockup, las páginas con marca y las conexiones reales; y aun así el margen es estrecho.

**Calibración (30 oct).** La Tarea 0 y T-01 a T-04, estimadas en 22 horas, se cerraron en poco más de una jornada (sus commits son del 29 de octubre, entre las 09:33 y las 17:20, según `git log`); el dibujo del mockup rinde unas 6,5 pantallas por hora. Las estimaciones no se bajan todavía: las tareas difíciles de la fase 0 (T-07, T-09, T-11, T-17) aún no se han medido, y lo que no se controla (las rondas) no depende de la velocidad de construcción.

**Qué está en riesgo, en orden:**

1. **Las rondas de revisión.** El mockup (2 rondas por pantalla, 11 horas) y las seis páginas con marca (2 rondas cada una, 6 horas) son 17 horas estimadas de cambios más la **espera** de Toya entre rondas, que no se controla. Si cada ronda tarda dos días en volver, el calendario se come solo esperando.
2. **Las diferencias del screener real.** Si las muestras de Trabian difieren del spec, T-40 y T-50 crecen. La reserva son 6 horas.
3. **Lo que llegue tarde:** textos del abogado, API key de RecruiterFlow, cuenta de Twilio (ya prevista para la semana 2).
4. **La fase 0 incompleta** cuando lleguen las cuentas: cada tarea de la fase 0 que falte, incluido el dibujo del mockup que quede (13 horas al 30 de octubre), pasa a gastar el reloj.

**Opciones (ninguna recorta un control de seguridad que proteja datos reales):**

- **A. Pedir a Toya los archivos de marca primero**, separados de las cuentas. El Contrato arranca el reloj cuando llegan las tres cosas; con la marca antes, la pasada de marca y las rondas del mockup (T-37, 14 horas) se hacen **antes del reloj** y 1A baja a unas 37 horas. Es la opción que más ahorra y ya está en 01 §9 ("mandarlos primero lo destraba").
- **B. Textos provisionales en el mockup** (ya acordado) y revisar en celular una ronda a la vez con lista de cambios, para que cada ronda vuelva en un día.
- **C. Orden dentro del reloj:** T-30 a T-33 en los días 1 y 2; T-34 a T-36 el día 3; mockup del día 3 al 6; páginas del día 7 al 12; conexiones reales en paralelo desde el día 7; revisión final días 14 y 15.
- **D. Lo que se puede discutir con Toya si no cabe:** dejar el panel con estilo neutro en 1B y vestirlo en el Sprint 2 (T-43 baja de 6 a 2 horas); limitar las rondas extra (el Contrato incluye dos; las demás se cotizan); y todas las recomendaciones extra de 02 §8.3 siguen fuera del Sprint 1.
- **E. Lo que no se toca:** Access delante del panel, el JWT en la app, el túnel, los backups con lock y restauración, la cadena de borrado, las lápidas, la CSP obligatoria, el verifier completo. Si algo de eso no cabe, se corre la fecha, no el control.

---

## El verifier

Corre en cada pull request y en cada despliegue; si falla, no se publica (Contrato: "a verifier that fails the build on drift"; 01 decisión 21). En local, `npm run verify` corre lo mismo salvo lo que necesita staging.

| Comprobación | Herramienta | Umbral o regla | Entra en |
|---|---|---|---|
| Tipos | `tsc --noEmit` (TypeScript 6.0) | Cero errores | T-01 |
| Lint y formato | Biome 2.6 | Cero errores | T-01 |
| Unitarias, de ruta e integración | Vitest 5 contra PostgreSQL real | Todas en verde; las nombradas `SEC-nn` son obligatorias | T-01 en adelante |
| Esquema | `tests/schema/*` | Cascadas, columnas prohibidas, permisos de roles | T-02, T-04 |
| Vocabulario | Cargador con las reglas de 03 §7.2 sobre el JSON del repo | Cero bloqueos | T-05 |
| Greps de seguridad | `scripts/grep-rules.sh` | Cero coincidencias de `x-forwarded-for`/`cf-connecting-ip` fuera de Nginx y pruebas (SEC-28), de `delete …level/phone/email` (SEC-54), de `sql.raw` fuera de migraciones y de SQL concatenado con algo que no sea una constante del propio código (SEC-62), de `dangerouslySetInnerHTML` sin `sanitize` (SEC-64) | T-23 |
| Dependencias | `npm ci` con `.npmrc`; `node --version` ≥ 24.22; `npm --version` ≥ 11.19; `scripts/check-dependency-age.ts` | Versión cambiada en el lockfile con menos de 7 días → falla (SEC-85) | T-23 |
| Vulnerabilidades | `npm audit --omit=dev --audit-level=high` | `high` o `critical` → falla (SEC-86) | T-23 |
| Secretos | gitleaks 8.30.1 (binario, checksum fijado) sobre los commits del pull request | Cero hallazgos (SEC-87) | T-23 |
| Infra | `nginx -t`, `sshd -t -f`, `shellcheck` | Cero errores | T-26 |
| Humo | Playwright 1.64 en perfil de celular contra la app con el screener falso | Cinco flujos en verde y **cero violaciones de CSP** en consola (SEC-65) | T-25 |
| **Velocidad de las páginas** | `lighthouse` 13.6 + `chrome-launcher` 1.2 desde `scripts/page-speed.ts`, con el Chromium de Playwright (`CHROME_PATH`), emulación móvil por defecto, 3 corridas y mediana | Por página (`/`, `/jobs`, un `/jobs/:slug`, `/job-seekers`, `/for-employers`, `/about`, `/privacy`, `/signup`): rendimiento ≥ 90, LCP ≤ 2,5 s, TBT ≤ 200 ms, CLS ≤ 0,1, peso total ≤ 500 KB. Cualquier página por debajo → falla | T-23 (herramienta), T-24 (páginas neutras), T-41 (con marca) |
| Despliegue | `infra/checks/*.sh` en el servidor | `.env` 600, nada en `0.0.0.0`, `sshd` correcto, rol de staging sin `CONNECT`, firmas ClamAV < 48 h, DMARC presente, producción no apunta al falso | T-26, T-33 |

Por qué `lighthouse` y no Lighthouse CI: `@lhci/cli` no tiene versión desde junio de 2025 y no cumple la regla de 12 meses; `lighthouse` (13.6.0, línea 13 desde octubre de 2025) y `chrome-launcher` (1.2.2) cumplen las dos reglas y no declaran scripts de instalación. El script propio son unas 60 líneas: lanzar Chromium, correr `lighthouse(url, { onlyCategories: ['performance'], port })` tres veces por página, tomar la mediana de cada métrica y comparar con los umbrales.

---

## Al final del sprint: documentación de entrega

En `docs/handoff/sprint-1/`, en inglés, escrita en T-48 y revisada en T-49:

1. **What was built** (1A y 1B contra el Contrato, punto por punto).
2. **How to operate**: panel, ajustes, vocabulario, tareas, exportaciones, qué hacer cuando llega una alerta.
3. **Accounts and secrets**: lista de cuentas, qué secreto vive dónde (sin valores), quién lo custodia, cómo se rota (de 02 §4.15).
4. **Incident runbook** (de 02 §5, resumido).
5. **Database design**, **Job robot (Sprint 3B)** y **Taxonomy file format with the HVAC rule**: los tres esquemas de 03 §9 traducidos, el primero con el diagrama generado desde el esquema de Drizzle.
6. **Open questions** que siguen abiertas (de 01 §9 y 02 §9).
