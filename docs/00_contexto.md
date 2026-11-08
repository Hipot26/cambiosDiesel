# DieselJobsUSA — Contexto del proyecto

Versión 1.0 · 30 de octubre de 2026 · Puerta de entrada para quien llega de fuera

Este documento es para un programador que recibe el repositorio y necesita entender, en una jornada, qué pidió el cliente, qué se propuso, por qué el plan es como es, cómo se trabaja y en qué estado va. Resume y apunta; el detalle vive en `docs/plan/`, que **manda** si algo no coincide. Las fuentes del cliente (contrato, especificaciones, correspondencia) no están en el repositorio: aquí se cuentan con palabras propias y sin cifras de dinero.

---

## 1. Qué es DieselJobsUSA y para quién

Una bolsa de empleo **solo para técnicos de camiones diésel y de equipo pesado** en Estados Unidos, con marca propia. El cliente quiere dos cosas: que los técnicos lleguen solos y formen una base de candidatos propia (el *roster*) para su firma de reclutamiento, y más adelante que los empleadores paguen por publicar y destacar empleos. Para el técnico es gratis.

| Quién | Qué es | Qué hace con el sistema |
|---|---|---|
| **TL Turner Holdings Inc.** | El cliente y dueño de todo: código, datos, servidor y cuentas | Financia y aprueba cada hito |
| **LaTrae Consulting Group** | Firma de reclutamiento de contratación directa del grupo | Sus empleos abren el Job Board; su staff usa el panel |
| **Toya Turner** | La clienta, dueña de LaTrae | Revisa y aprueba el mockup, las páginas y cada sprint |
| **Técnicos** (candidatos) | Usuarios del sitio público | Se registran, suben la hoja de vida, hacen la entrevista. **Nunca ven su nivel** |
| **Staff de LaTrae** | Usuarios del panel | Buscan candidatos, ven y corrigen el nivel, exportan, cargan el vocabulario, cambian ajustes |
| **Empleadores** | Sprint 4 | Antes del Sprint 4 solo existen como registros de empresa |
| **Sergio Duran** | Único desarrollador, con Claude Code | Construye, despliega y opera |

| Sistema externo | Para qué | Cómo se conecta |
|---|---|---|
| **ScreenProof** (de Trabian) | Entrevista automática de 8 a 12 minutos, por texto o voz, en inglés o español. Lee la hoja de vida y devuelve el nivel (A, B, C o "no ubicable"), equipos, marcas, software y certificaciones mapeados al vocabulario, el pago deseado y una hoja de vida limpia. Lo construye Trabian; no está en este repositorio | El sitio inicia, consulta y borra con llamadas firmadas; recibe cuatro webhooks firmados (`screen.completed`, `screen.abandoned`, `resume.generated`, `sms.opted_out`) |
| **RecruiterFlow** | El sistema de reclutamiento de LaTrae | De ahí salen los empleos de LaTrae para el Job Board; ahí se copia cada candidato (ajuste del panel). Nunca escribe de vuelta |
| **Twilio Verify** | Código SMS para confirmar el teléfono, solo EE. UU. | API desde el servidor |
| **Resend** | Correo del sitio (enlace de regreso, recordatorio, avisos) | API y webhook de rebotes, en un subdominio con SPF, DKIM y DMARC |
| **Cloudflare** | DNS, túnel al servidor, Access (staging y panel), Turnstile (anti-bots), R2 (hojas de vida y backups), Web Analytics, Email Routing | Todo el tráfico entra por Cloudflare; el servidor no abre puertos |
| **DigitalOcean** | Un droplet de 4 GB con staging y producción | — |
| **Sentry, Better Stack, healthchecks.io** | Errores, caídas y tareas programadas, sin datos personales | Salida desde el servidor |

---

## 2. Qué pidió el cliente

### 2.1 Lo funcional, por sprint

Orden de construcción acordado: **1 (1A → 1B) → 3A → 3B → 2 → 4**.

| Sprint | Qué entrega, en nuestras palabras | Cuándo |
|---|---|---|
| **1A · Mockup y base** | Mockup de **toda** la plataforma (también las pantallas de sprints posteriores), aprobado antes de construir páginas. Servidor, PostgreSQL, almacenamiento privado de hojas de vida, backups cifrados cada noche en un bucket del cliente, pipeline de despliegue. Correo con SPF, DKIM, DMARC y baja de un clic. Login del staff con hash de contraseña, sesiones de servidor y roles base. Despliegues atómicos. Staging privado y fuera de buscadores. Redirección del dominio mal escrito al bueno | Este sprint |
| **1B · Páginas, roster y screener** | Seis páginas con la marca (Home, Job Board con los empleos de LaTrae desde el primer día, Job Seekers, For Employers, About, Privacy y Terms), mobile first, dos rondas de cambios por página. Registro en tres pasos: captura de seis campos con tres consentimientos → página de siguientes pasos con enlace de regreso → la entrevista. Conexión con el screener: inicio, webhooks firmados con idempotencia y guardia de orden, dueño de cada campo en un re-screen, hoja de vida generada, barrido nocturno, el sitio sigue funcionando si el screener cae, recordatorio por correo. Consentimientos como historial, reglas de visibilidad, borrado que llega al screener, supresión del teléfono como huella. Copia a RecruiterFlow como ajuste del panel. Duplicados por email y luego por teléfono verificado. Twilio Verify con Turnstile. ClamAV. ZIP a coordenadas con PostGIS. Empresas con alias. Vocabulario cargado de un JSON y publicado en un enlace privado. Origen de tráfico. Anti-spam en todo formulario. Panel: candidatos, hojas de vida, CSV, filtro por distancia, cambio de nivel por el staff con motivo | Este sprint |
| **3A · Búsqueda y Google for Jobs** | Filtros, páginas por estado, ciudad y oficio, marcado JobPosting en dos niveles, Indexing API, IndexNow, sitemaps, Search Console, alertas básicas por correo sin cuenta | Después |
| **3B · Robot de empleos** | Seis conectores JSON a plataformas de empleo de empresas, lector de marcado JobPosting, archivo de taxonomía editable por el cliente (con la regla de HVAC), lista de exclusión, filtro de contratación directa, cola de agencias, duplicados y vencimiento en ciclos de 6 horas, monitor de fuentes | Después |
| **2 · Cuentas del técnico** | Inicio de sesión (Google, email y contraseña, enlace mágico), perfil, aplicar con un clic, guardados y alertas, interruptor de visibilidad, ocultarse de empresas, descargar o borrar sus datos, búsqueda de candidatos en el panel, roles y auditoría | Después |
| **4 · Empleadores y pagos** | Cuentas y panel del empleador, publicación guiada con aprobación de LaTrae, Stripe Checkout con la opción destacada, aplicaciones, recibos y el reporte de métricas | Después |

Para la revisión del Sprint 1 el cliente pidió además tres esquemas: el diseño de la base de datos, cómo funcionará el robot de empleos y el formato del archivo de taxonomía (borradores en 03 §9).

### 2.2 Lo no funcional

| Requisito | Cómo se cumple aquí | Dónde |
|---|---|---|
| Mobile first, páginas livianas, velocidad medida en cada build | HTML renderizado en el servidor; umbrales de Lighthouse en el verifier | 01 decisión 21; 04 "El verifier" |
| Un verificador automático que tumba el build si algo se desvía | El verifier: tipos, lint, pruebas `SEC-nn`, greps, dependencias, secretos, velocidad | 04 T-23 |
| Staging privado revisado antes de publicar; despliegues atómicos | Access delante de staging; releases al estilo Capistrano con health check | 01 decisiones 15 y 20 |
| Monitoreo desde el primer día | Sentry, Better Stack, healthchecks.io | 01 decisión 16 |
| Documentación en cada sprint, para que otro pueda continuar | `docs/plan/`, este documento y la entrega en inglés | 04 T-48 |
| Todo en cuentas del cliente | GitHub, DigitalOcean y servicios a nombre de TL Turner Holdings | 01 §1 |
| Marca propia: el sitio y sus correos solo llevan DieselJobsUSA | Los empleos sí muestran la empresa real, o LaTrae Consulting Group en los propios | 05 §5 |
| Navegar y buscar nunca piden cuenta | Puertas de cuenta solo para guardar, alertas y aplicar | Sprint 2 |
| Fuentes legítimas para el robot | Sin bolsas de empleo grandes; se respetan las reglas de cada sitio | Sprint 3B |
| Privacidad | Consentimientos con texto exacto y fecha, borrado completo, solo datos inventados fuera de producción | 02 |

### 2.3 Restricciones

- **El nivel nunca se muestra al técnico**: ni en el HTML, ni en un JSON, ni en un correo. `null` significa "no ubicable como técnico", no una C. No hay columna de puntaje. (SEC-54, SEC-55)
- **No se pregunta el pago actual**; el deseado es un rango.
- **Datos personales**: el PostgreSQL del sitio es el sistema de registro y RecruiterFlow recibe copias; un borrado deja solo huellas con clave; local, staging y pruebas usan solo datos inventados.
- **Calendario**: el Sprint 1 son **15 días hábiles** que empiezan cuando llegan tres cosas a la vez: las cuentas, los archivos de marca y el endpoint de prueba del screener con su secreto y una muestra de cada webhook. Si el screener se atrasa, se construye contra su especificación y se conecta después.
- **Rondas de revisión**: dos rondas de cambios por página están incluidas; las demás, y todo lo que quede fuera del alcance, se cotizan y se aprueban antes de hacerse. El diseño inicial del cliente es una dirección, no un final.
- **Alcance cerrado**: el Sprint 1 tiene precio fijo y los sprints siguientes tienen techo. Si algo toma más, lo absorbe el desarrollador. Por eso el plan estima con franqueza y protege el alcance (05 §7).
- **Textos legales** (privacidad, términos, las tres casillas): los escribe el abogado de LaTrae. Hasta entonces, relleno marcado.

---

## 3. Qué propusimos y qué se acordó

| Tema | Propuesta original (septiembre) | Alcance firmado (27 oct) |
|---|---|---|
| Enfoque | Todo a la medida, en sprints, sin plataforma de bolsa de empleo ni CMS | Igual |
| Stack | Node.js, PostgreSQL, Cloudflare R2, Stripe y un servicio de correo | Igual, con PostGIS, Resend como correo y DigitalOcean como servidor (elección del cliente) |
| Orden | Sprints 1, 2, 3 y 4 | **1, 3, 2, 4**: el robot de empleos antes que las cuentas (acordado el 23 sep) |
| Perfil del técnico | Formulario de preguntas en el sitio | Lo reemplaza la entrevista de ScreenProof, que el cliente agregó el 1 oct junto con el registro en tres pasos y la separación entre consentimiento y visibilidad |
| Sprint 1 | Un bloque más corto | **15 días hábiles en dos hitos, 1A y 1B**; creció con el screener y con ocho pedidos nuevos del 26 oct |
| Robot de empleos | Conectores a plataformas de empleo conocidas | **Seis conectores** elegidos tras la investigación del cliente sobre dónde publican sus empresas; los conectores tipo navegador quedan fuera y se cotizan aparte |
| Alertas de empleo | En las cuentas (Sprint 2) | Básicas y sin cuenta, en el 3A, sin cargo |
| Verifier y velocidad | Prometidos en la propuesta | Quedaron como "lo que acompaña a cada sprint" |
| Seguridad | Hash argon2, sesiones de servidor, límites de login, archivos revisados por tipo y tamaño | Se mantiene y se amplía (Access, ClamAV, Turnstile, firmas HMAC, lápidas) |
| Arreglos | 30 días de arreglos tras cada salida a producción | Igual |

**Cómo se definieron los hitos.** El contrato tiene seis hitos en el orden de construcción: 1A, 1B, 3A, 3B, 2 y 4. Cada uno se financia antes de empezar y el cliente lo aprueba contra su lista de alcance. El Sprint 1 se partió en dos: **1A** reúne lo que se puede aprobar sin páginas (el mockup y la base técnica) y **1B** lo que depende del mockup aprobado y del screener (páginas, registro, roster y conexión). Los documentos que el contrato declara obligatorios son el spec técnico Rev 8, el spec de integración de ScreenProof (manda en todo lo del screener), el Sprint Scope, el Candidate Walkthrough y el archivo de vocabulario.

| Fecha (2026) | Qué pasó |
|---|---|
| 21 sep | El cliente manda el brief; se responde con un plan por sprints |
| 22–23 sep | Preguntas sobre experiencia y mantenimiento; dónde publican de verdad las empresas del sector; orden 1, 3, 2, 4 |
| 1 oct | El cliente agrega ScreenProof, el registro en tres pasos, las puertas de cuenta y la diferencia entre consentimiento y visibilidad; elige DigitalOcean |
| 2 oct | El Sprint 1 se ajusta por el screener; las alertas básicas pasan al 3A |
| 26 oct | Llegan el vocabulario y el spec de integración; ocho pedidos nuevos dejan el Sprint 1 en 15 días hábiles |
| 27 oct | Spec Rev 8, vocabulario corregido y regla de HVAC; contrato aceptado |
| 28 oct | Planificación: `docs/plan/` 01 a 04 y `CLAUDE.md` |
| 29 oct | Entorno local y tareas T-01 a T-04 |
| 30 oct | Mockup: tandas 1 y 2; revisión interna de cimientos (T-04b) |

---

## 4. Por qué se planificó así

Las ocho decisiones que más explican el repositorio. El resto está en 01 §2 (33 decisiones, cada una con su motivo).

| Decisión | Motivo | Dónde |
|---|---|---|
| **TypeScript estricto, Fastify 5, PostgreSQL 18 y Node 24 LTS** | El riesgo principal son las reglas de datos (dueño de cada campo, historial de consentimientos, nivel que puede ser `null`): el compilador y los esquemas zod atrapan lo que las pruebas no cubren. Fastify trae validación, `inject()` para probar rutas y plugins oficiales de seguridad | 01 decisiones 1, 2, 9 y 11 |
| **HTML en el servidor, sin SPA** (TSX con `preact-render-to-string`) | Páginas livianas en el celular y velocidad medida en cada build; formularios que funcionan sin JavaScript; los mismos componentes sirven al mockup y a las páginas reales | 01 decisiones 3, 4 y 29 |
| **PostgreSQL con pg-boss, sin Redis** | Un servicio menos en un droplet de 4 GB que también corre ClamAV, y el trabajo se encola en la misma transacción que el dato (un webhook y su trabajo entran juntos o no entran) | 01 decisiones 8 y 32 |
| **Controles `SEC-nn` con prueba del mismo nombre** | 89 controles con identificador fijo; cada uno dice qué exige, de dónde sale y qué prueba lo vigila. La prueba lleva el identificador, así un `grep` une el plan con el código | 02, introducción y §4 |
| **Pruebas contra PostgreSQL real, nunca simulado** | Los permisos por columna, las cascadas, los roles y PostGIS solo se prueban de verdad en una base real; la suite tarda segundos | 01 decisión 22 |
| **Fase 0 antes del reloj** | 1A y 1B no caben solos en 15 días hábiles. Lo que no necesita cuentas ni marca se construye antes, con dobles de prueba; el reloj queda para cuentas, servidor, mockup, páginas y conexiones reales | 04, cabecera y "Estimación honesta" |
| **Mockup antes de las páginas con marca; lógica neutra en paralelo** | El contrato pide el mockup aprobado antes de construir páginas. La lógica y las páginas neutras no esperan esa aprobación; solo la espera el vestido con la marca (T-41, T-42 y T-43) | 01 decisión 29; 05; 04 "Regla de las páginas" |
| **Cloudflare Access delante del panel, y un túnel sin puertos abiertos** | El panel concentra los datos personales. Access pone un factor fuera de la app, la app valida además el JWT y la sesión, y el servidor no acepta conexiones de entrada | 01 decisiones 15 y 19; 02 §4.6 (SEC-30, SEC-31) |

---

## 5. Cómo se trabaja aquí

| Pieza | Cómo funciona |
|---|---|
| Quién construye | Un solo desarrollador, Sergio Duran, con Claude Code. Commits locales; el push al remoto y los despliegues los hace Sergio |
| `CLAUDE.md` | El contrato de la herramienta: reglas fijas "nunca" y "siempre" (las mismas de 02 §6), comandos, reglas de dependencias y cómo se cierra una tarea. `.claude/settings.json` le impide a la herramienta leer el `.env` y algunos comandos; **no frena a una persona** |
| Una tarea por sesión | Se lee la tarea de 04, las secciones de 03 que implementa y los `SEC` que cubre. Al terminar: un commit por tarea con su identificador, y en 02 la nota "Implementado en T-xx" con archivo y prueba |
| Controles `SEC-nn` | La prueba se llama `SEC-nn …`; `grep -rn "SEC-73" src tests` lleva a todas las que vigilan ese control |
| Dependencias | Versiones exactas; nada sin versión en los últimos 12 meses ni versión mayor con menos de un mes; `ignore-scripts=true` y un cooldown de 7 días en `.npmrc`; revisión SEC-88 anotada en 01 §3; ningún paquete se instala sin preguntar a Sergio |
| Verifier hoy | A mano antes de cada commit: `npm run typecheck`, `npm run lint`, `npm test` (incluye las pruebas de esquema contra la base y las del mockup) y `npm audit --omit=dev --audit-level=high`; gitleaks en el hook de pre-commit |
| Verifier en T-23 | CI en GitHub Actions y `npm run verify`: greps de seguridad, edad de dependencias, gitleaks en CI y velocidad de páginas con Lighthouse. T-25 suma las pruebas de humo con Playwright y T-26 los chequeos de infraestructura |

**Qué garantiza este método.** Trazabilidad de punta a punta (decisión → control → prueba → código); que lo probado se probó contra la base real; que cada dependencia tiene su revisión escrita; que cada tarea deja sus pruebas en el mismo commit.

**Qué no garantiza.**
- Hasta T-23 no hay CI: todo depende de la disciplina local, y el hook de gitleaks se puede saltar.
- Las barreras de `.claude/` solo aplican a la herramienta.
- Una prueba cubre lo que busca, no más.
- Cinco documentos largos pueden desviarse del código. La revisión interna del 30 de octubre encontró varias contradicciones y las corrigió en T-04b; repetirla es parte del método.
- Las horas de 04 son "con Claude Code" y todavía se están calibrando con lo medido.

---

## 6. Estado al 30 de octubre de 2026

| Tarea | Qué | Estado | Commit |
|---|---|---|---|
| Tarea 0 | Entorno local en Windows (fnm, Docker, gitleaks) | Hecha, 29 oct | `3f9c81f` |
| T-01 | Esqueleto del repositorio y app mínima | Hecha, 29 oct | `2a8d0c0` |
| T-02 | Base local, roles separados y migración cero | Hecha, 29 oct | `9b462c9` |
| T-03 | Primitivas de seguridad (firma HMAC, anillo de claves, tokens, redirecciones, CSP) | Hecha, 29 oct | `fb5e82c` |
| T-04 | Modelo de datos completo: 34 tablas | Hecha, 29 oct | `ae645b8` |
| T-04b | Revisión interna de cimientos: correcciones antes de T-05 | Hecha, 30 oct | `71bc055`, `bba56bc` y los de `docs/plan/` |
| T-37 | Mockup de toda la plataforma | En curso: tandas 1 y 2 dibujadas (39 de 121 pantallas); tanda 3 (correos) en curso | `c3afd95` … `874f28d` |
| T-05 | Vocabulario: carga, validación y endpoint | Siguiente | — |

**Cifras del repositorio:**

| Medida | Antes de T-04b (commit `dff2372`) | Al cerrar T-04b (30 oct) |
|---|---|---|
| Archivos versionados | 130 | 141 |
| Código de la app (`src/`, sin pruebas) | unas 1 750 líneas de TypeScript | unas 2 350 |
| Pruebas | 18 archivos, 127 pruebas en verde (104 del código, 23 del mockup); ningún `skip` | 22 archivos, 159 pruebas en verde; typecheck, lint y `npm audit --omit=dev --audit-level=high` limpios |
| Migraciones | 3 (`0000_extensions`, `0001_modelo_de_datos`, `0002_permisos`), 34 tablas | 5 (más `0003_endurecimiento` y `0004_permisos_supresion`), las mismas 34 tablas |
| Controles SEC | 88: 6 implementados con prueba, 35 con su parte de esquema o función pura hecha, el resto asignado a tareas | Se suman SEC-27 y SEC-71 (salvo Sentry) y se completan partes de SEC-15, SEC-65, SEC-67, SEC-72, SEC-73, SEC-75 y SEC-77; ningún control queda sin tarea |
| Mockup | 38 archivos, unas 4 500 líneas | Igual en lo versionado (la tanda 3 está en curso) |
| Plan | 5 documentos, unas 2 700 líneas | 5 documentos y este contexto |

Qué hizo T-04b, control por control: las notas "Implementado en T-04b" de 02 y la tarea T-04b en 04.

**Actualización del 7 de noviembre de 2026:** se propuso una ampliación multi-tenant por organización, conservando el roster maestro bajo DieselJobsUSA y permitiendo el acceso de cada organización solo con autorización explícita vigente del candidato. El stack acordado no cambia. T-04c registra esta decisión en los documentos y SEC-89; el código y las migraciones siguen sin cambios. La ampliación no forma parte del alcance contractual aprobado: T-04d debe cerrar el consentimiento, los campos visibles, los roles, el calendario y el mecanismo de aislamiento antes de implementarla. Hasta entonces el tenant no accede al roster.

**Lo que todavía no existe:** CI y verifier completo (T-23), screener falso (T-06), datos de semilla (T-22), infraestructura del servidor (T-26), `docs/ops/` y `docs/handoff/`. No hay servidor ni cuentas: el reloj del Sprint 1 no ha empezado (faltan las cuentas, los archivos de marca y el endpoint de Trabian).

---

## 7. Orden de lectura recomendado para un revisor

| Paso | Qué leer | Para qué | Tiempo |
|---|---|---|---|
| 1 | `README.md` | Levantar el repositorio y correr las pruebas | 30 min |
| 2 | Este documento | El cuadro completo | 30 min |
| 3 | `docs/plan/01_arquitectura.md` §1 y §2 | Decisiones del cliente y decisiones técnicas, con su motivo | 45 min |
| 4 | `docs/plan/02_seguridad.md` §4 y §7 | Los controles `SEC-nn` y la lista antes de publicar | 60 min |
| 5 | `docs/plan/03_backend.md` §1 | El modelo de datos y qué se borra con el candidato | 30 min |
| 6 | `docs/plan/04_tareas.md`, fase 0 | Qué está hecho (T-01 a T-04b) y qué sigue (T-05) | 30 min |
| 7 | El código | `src/config/env.ts`, `src/security/`, `src/logging/`, `src/db/schema/`, `tests/schema/` | resto |

`CLAUDE.md` explica las reglas que sigue la herramienta; `05_mockup.md` explica el mockup (`npm run mockup:dev`).

---

## 8. Glosario

| Término | Qué significa aquí |
|---|---|
| **Screener** | ScreenProof, la entrevista automática de Trabian. El sitio la inicia y recibe los resultados por webhook |
| **Nivel** | A, B o C según la rúbrica del screener; `null` = no ubicable como técnico. Lo ven el staff y, más adelante, los empleadores; **nunca el técnico**. El staff puede corregirlo con motivo (*override*) |
| **Lápida** | Lo que queda al borrar un candidato: una huella con clave de su id, sin datos personales. Sirve para descartar en silencio un webhook tardío de alguien borrado y para alertar si el id nunca existió (SEC-10) |
| **Huella** | HMAC-SHA256 con clave de un dato (teléfono, email, id), con un prefijo por uso. Permite buscar sin guardar el dato legible |
| **Anillo de claves** | Las claves de huella del `.env`, cada una con su `key_id` (`v1`, `v2`…). Se rota hacia adelante: una clave vieja no se retira mientras queden filas con su `key_id`, y la app no arranca si falta una (SEC-72) |
| **Verifier** | La batería automática que corre en cada build y lo hace fallar si algo se desvía. Es una promesa del contrato |
| **Tanda** | Grupo de pantallas del mockup que se dibuja y se revisa junto; son siete (05 §3) |
| **Access** | Cloudflare Access: login por email antes de llegar al panel y al staging, y *service tokens* para máquinas. La app valida además el JWT que emite |
| **pg-boss** | Cola de trabajos sobre PostgreSQL (esquema `pgboss`). El esquema lo crea el rol de migración; la app no hace DDL |
| **Fase 0** | Las tareas que se construyen en local, sin cuentas ni marca, antes de que arranque el reloj |
| **Reloj** | Los 15 días hábiles del Sprint 1 |
| **Rol de app / rol de migración** | Dos roles de PostgreSQL por entorno: la app solo lee y escribe filas; las migraciones corren con otro rol que la app no conoce |
| **`CandidateView`** | El modelo de vista de las páginas del técnico. No tiene el campo `level`, así que usarlo no compila |
| **C, S, S/E, T** | Dueño de cada columna del candidato: candidato, screener, screener salvo edición del candidato, staff (03 §1) |

---

## 9. Preguntas abiertas con el cliente

Resumen de 01 §9 y 02 §9, donde cada pregunta tiene su fecha límite. Ninguna frena la fase 0.

| Para | Pregunta | Qué frena |
|---|---|---|
| Toya | Las cuatro cuentas (DigitalOcean, GitHub, Cloudflare, Resend) y los archivos de marca | El reloj y la base de 1A |
| Toya | Diseño inicial y textos de las seis páginas | Las páginas finales (el mockup usa textos provisionales) |
| Toya | Una API key de RecruiterFlow propia de DieselJobsUSA; cuándo y cómo se copia cada candidato | El Job Board y la copia |
| Toya | La cuenta de Twilio; los usuarios del staff y sus permisos | Verificación en staging; login |
| Toya | Dónde viven las copias maestras de los secretos y la clave privada de backups, y quién las custodia | La configuración final de backups |
| Toya | Subdominio de correo, remitentes y a quién se reenvían las alertas; si el dominio mal escrito es del cliente | Resend, monitoreo, la redirección |
| Toya | El botón "Apply" de los empleos de LaTrae en 1B (propuesta: lleva al registro con el empleo anotado), el desplegable de oficio y si las páginas son solo en inglés | La revisión del mockup |
| Toya | Panel en subdominio propio y método de login de Access; quién administra Zero Trust; buzón DMARC; aviso de incidentes en 24 horas; retención de la auditoría y de los eventos crudos | SEC-30, SEC-32, SEC-59, SEC-40 |
| Abogado | Textos de privacidad, términos y las tres casillas; si alguna puede venir marcada | Páginas legales y registros de consentimiento |
| Abogado | Si se copia a RecruiterFlow a quien no dio el consentimiento de compartir; si el recordatorio puede ir a quien no dio el de email | Valores por defecto de dos ajustes |
| Abogado | Qué conservar tras un borrado (¿bastan la lápida y la huella?); aviso de filtraciones por estado; ley aplicable al trabajo desde otro país; qué hacer con un archivo malicioso | La cadena de borrado y el plan de incidentes |
| Trabian | Endpoint de prueba, los dos secretos y una muestra real de cada webhook | El reloj y la conexión real |
| Trabian | Formato exacto de la cabecera de firma (siempre con `kid`), timestamp nuevo en cada reintento, secreto de al menos 32 caracteres | El receptor de webhooks (T-07) |
| Trabian | La forma de la respuesta de estado de una sesión | El barrido nocturno |
| Trabian | Alerta de reintentos agotados, comportamiento cuando su servicio cae, parámetro de `return_url`, quién manda los textos y desde qué número | Alertas, manejo de errores, reglas de textos |
| Trabian | Subdominio de la entrevista, lectura del vocabulario con *service token*, hosts de las hojas de vida, qué borra su `DELETE`, formato de la hoja generada, rotación de secretos | DNS, SEC-60, SEC-17, borrado, SEC-06 |
