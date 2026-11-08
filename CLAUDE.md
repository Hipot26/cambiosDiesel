# DieselJobsUSA — reglas para cada sesión de Claude Code

## Qué es

DieselJobsUSA es una bolsa de empleo para técnicos diésel y de equipo pesado, de TL Turner Holdings (Toya Turner, LaTrae Consulting Group). El sitio registra candidatos, los manda a una entrevista automática externa (ScreenProof, de Trabian) que devuelve un nivel A/B/C, guarda todo en PostgreSQL y copia a RecruiterFlow. Sergio Duran es el único desarrollador y programa con ayuda de Claude Code. El nivel del técnico nunca se le muestra al técnico. Sprint 1 = milestones 1A (mockup y base) y 1B (páginas, roster, screener).

## Dónde está todo

- `docs/00_contexto.md` es la puerta de entrada para quien llega de fuera: qué pidió el cliente, qué se propuso, por qué se planificó así y en qué estado va.
- `docs/plan/` **manda**: `01_arquitectura.md` (decisiones y stack), `02_seguridad.md` (controles `SEC-nn`), `03_backend.md` (modelo de datos, rutas, flujos, trabajos), `04_tareas.md` (plan por tareas), `05_mockup.md` (el mockup en `mockup/`: tandas, reglas y revisión). Si el código y estos documentos no coinciden, se para y se pregunta.
- `docs/context/` es referencia (contrato, spec, correspondencia). **Nunca se sube al repositorio** (está en `.gitignore`) y nunca se copia su contenido a otros archivos.
- `docs/ops/` (operación; llega con T-23, T-26 y T-34) y `docs/handoff/` (entrega en inglés para Toya; llega con T-48). Hoy no existen.

## Stack y comandos

Node 24.22 (`.node-version`), TypeScript 6.0 estricto, Fastify 5, TSX con `preact-render-to-string`, Tailwind 4, Drizzle 0.45 + drizzle-kit, PostgreSQL 18 + PostGIS, pg-boss 12, zod 4, Vitest 5, Playwright, Biome 2. Versiones exactas en `01_arquitectura.md` §3.

```
docker compose up -d        # PostgreSQL+PostGIS y ClamAV locales
npm ci && npm run prepare   # instalar (sin scripts) y activar el hook de gitleaks
npm run db:migrate          # migraciones (rol de migración) + esquema de pg-boss; va antes de dev
npm run dev                 # app en 127.0.0.1:3000
npm test                    # Vitest contra PostgreSQL real
npm run typecheck           # TypeScript estricto
npm run lint                # Biome
npm run mockup:dev          # mockup estático (05_mockup.md)
npm run fake-screener       # screener falso (llega en T-06)
npm run seed                # datos inventados; se niega en producción (llega en T-22)
npm run zip:load            # centroides ZIP del Census (llega en T-22)
npm run e2e                 # Playwright (llega en T-25)
npm run verify              # verifier local completo (llega en T-23)
```

## Reglas fijas de seguridad (02_seguridad.md §6)

**Nunca:**
1. Parsear un webhook antes de verificar la firma sobre los bytes crudos; comparar firmas con `===` (SEC-01, SEC-02, SEC-07).
2. Crear o modificar un candidato, un consentimiento o un campo del staff desde un webhook; `sms.opted_out` solo agrega (SEC-10 a SEC-12).
3. "Borrar un campo antes de responder". Toda salida pasa por un esquema zod de lista permitida; las páginas del candidato usan `CandidateView`, que no tiene `level` (SEC-54, SEC-55).
4. Leer `x-forwarded-for` ni `cf-connecting-ip` en la app; se usa `request.ip` (SEC-27, SEC-28).
5. Escribir teléfono, email, token, cookie, firma, cuerpo de webhook o secreto en logs, Sentry o errores (SEC-13, SEC-71, SEC-73, SEC-74).
6. `sql.raw` o SQL concatenado con datos de entrada (SEC-62); `dangerouslySetInnerHTML` sin `sanitize-html` (SEC-64).
7. Servir un archivo subido desde el dominio del sitio; solo enlaces firmados de 1 hora como adjunto y solo si `isResumeAvailable` (SEC-22, SEC-26).
8. Seguir redirecciones ni descargar de un host fuera de la lista al traer la hoja de vida generada (SEC-17).
9. Registrar una ruta del panel sin `config.role`, ni una ruta POST sin CSRF ni sin `audit()` (SEC-36, SEC-38, SEC-40). Ningún `GET` ejecuta una acción (SEC-50).
10. Agregar una dependencia sin la revisión SEC-88; habilitar scripts de instalación para todo el proyecto (SEC-84, SEC-85).
11. Escribir un secreto en código, en un archivo del repo, en una prueba o en `.env.example` con valor real (SEC-70, SEC-87). Nunca leer el `.env` real.
12. Usar datos reales de candidatos en local, staging, pruebas o documentación.
13. Confiar en Access sin validar el JWT en la app y comparar el email con el usuario de la sesión (SEC-31).
14. Redirigir a un valor del usuario sin `safeRedirect` (SEC-53).

**Siempre, antes de dar una tarea por terminada:**
1. Cada ruta nueva tiene esquema zod de entrada `.strict()` y de salida (SEC-54, SEC-61).
2. Cada control `SEC` que la tarea toca tiene su prueba escrita y en verde, nombrada con el identificador.
3. `npm run typecheck`, `npm run lint`, `npm test` y `npm audit --omit=dev --audit-level=high` en verde.
4. Una lectura del diff buscando datos personales en logs, campos borrados a mano, SQL concatenado, redirecciones, cookies sin atributos, rutas sin rol o sin CSRF, y que `trustProxy: '127.0.0.1'` siga en la creación de Fastify (SEC-27).
5. Si cambia el esquema: migración en dos pasos (expandir, contraer) y toda FK hacia `candidates` con `ON DELETE CASCADE` (SEC-75).
6. Si la tarea toca un control, se actualiza `02_seguridad.md` en el mismo cambio.

## Reglas de dependencias

- Ningún paquete sin versión publicada en los últimos 12 meses.
- Ninguna versión mayor con menos de un mes de publicada; se usa la línea anterior mantenida.
- `.npmrc` fija `ignore-scripts=true`, `min-release-age=7`, `engine-strict=true`.
- Antes de agregar un paquete: revisión SEC-88 (fecha, mayor, `npm view <pkg> scripts`, mantenedores, alternativa ya en el stack, dependencias transitivas, documentación en Context7) anotada en `01_arquitectura.md` §3. **No se instala ningún paquete sin preguntar a Sergio.**

## Reglas de trabajo

1. **Una tarea de `04_tareas.md` por sesión.** Se empieza leyendo la tarea completa, las secciones de `03_backend.md` que implementa y los `SEC` que cubre en `02_seguridad.md`.
2. **Context7 antes de usar una librería:** consultar la documentación vigente (`.mcp.json` trae `context7` y `cloudflare-docs`) y no confiar en la memoria.
3. **No reinventar lo que ya existe:** antes de escribir código propio, buscar en el repo (`src/security/`, `src/domain/`) y en el stack; código propio solo con justificación escrita.
4. **No instalar paquetes sin preguntar.** **Nunca hacer `git push`** (la herramienta Bash lo tiene bloqueado en `.claude/settings.json`; la regla vale igual en PowerShell y en cualquier otra vía; el push al remoto y los despliegues los hace Sergio). Commits locales sí, por ruta y con mensaje en español.
5. **Pruebas junto con el código**, en el mismo cambio, nombradas con su `SEC` cuando aplica. Las pruebas de base de datos corren contra PostgreSQL real, nunca simulado.
6. **Parar y preguntar** si algo contradice `docs/plan/`, si una tarea exige más de una sesión, o si un control de seguridad estorba. No se "arregla" un control para que pase.
7. **Español sencillo** en documentos, comentarios y mensajes de commit; en inglés solo nombres técnicos, campos y eventos. `docs/handoff/` en inglés.
8. **Al terminar**, decir en tres partes: qué se hizo (archivos y decisiones), qué pruebas se escribieron (con sus `SEC`), y qué debe revisar Sergio con sus manos (los criterios de aceptación de la tarea).
