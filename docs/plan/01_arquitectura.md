# DieselJobsUSA — Arquitectura del Sprint 1

Versión 1.1 · 7 de noviembre de 2026 · Documento de trabajo de Sergio Duran

Este documento registra cómo se construye DieselJobsUSA: las decisiones ya tomadas en los documentos del proyecto, las decisiones técnicas de esta construcción, las piezas del sistema y cómo se comunican, los tres entornos, qué entrega el milestone 1A y qué el 1B, las dependencias externas, los riesgos para el calendario de 15 días hábiles y las preguntas abiertas. Está escrito para que cualquiera que retome el proyecto entienda por qué las cosas son como son.

Las versiones de librerías y servicios de la sección 3 se verificaron el 28 de octubre de 2026 contra el registro de npm, la documentación vigente de cada proyecto (vía Context7) y la documentación de Cloudflare. Dos reglas aplican a toda dependencia: **un paquete sin versión publicada en los últimos 12 meses no entra**, y **ninguna versión mayor con menos de un mes de publicada entra**; si la línea nueva es muy reciente, se usa la anterior mientras siga mantenida y se sube después del Sprint 1. Donde esas reglas descartaron un paquete o una versión, la sección 2 y la sección 3 dicen qué los reemplaza y por qué.

Fuentes citadas:

| Nombre corto | Documento |
|---|---|
| Contrato | Acuerdo de construcción de los Sprints 1 a 4 (27 oct 2026) |
| Spec de integración | Spec de integración ScreenProof ↔ DieselJobsUSA (markdown). Manda sobre el Rev 8 en todo lo del screener |
| Rev 8 | DieselJobsUSA Technical Spec, Revision 8 |
| Sprint Scope | Documento Sprint Scope (1 oct 2026) |
| Walkthrough | Candidate Walkthrough ("What the technician sees") |
| Vocabulario | `dieseljobsusa_vocabulary.json`, versión 2026-10-26 |
| Correspondencia | Mensajes entre LaTrae y Sergio (con fecha) |
| Decisiones de planificación | Decisiones técnicas de planificación, 28 oct 2026 |

---

## 1. Decisiones ya tomadas

No se vuelven a discutir en el Sprint 1. Cada fila dice de dónde sale la decisión.

### Ampliación funcional propuesta: organizaciones y roster central

El 7 de noviembre de 2026 se aclaró para esta planificación que cada organización reclutadora o empleadora es un tenant, pero el registro maestro de candidatos sigue siendo propiedad de la plataforma DieselJobsUSA. La plataforma conserva un roster central; una organización solo puede acceder a los datos de un candidato cuando existe autorización explícita para esa organización. La pertenencia de un usuario a una organización no basta por sí sola para revelar candidatos.

Esta ampliación no cambia el stack acordado: siguen vigentes Node 24, TypeScript, Fastify, PostgreSQL, Drizzle y las vistas SSR. No se adoptan Python/FastAPI, React/Vite, Alembic ni `uv` del documento de estructura; esas son decisiones técnicas ajenas a la lógica de negocio que se incorporó.

El candidato y su evaluación de ScreenProof siguen siendo registros maestros de la plataforma, no registros propiedad de un empleador. Las organizaciones no pueden editar esos registros. Toda exposición de campos, nivel, documentos, exportaciones o búsquedas a una organización requiere una autorización vigente y acotada a esa organización. Sin autorización vigente, el acceso falla cerrado. El detalle de la autorización, su texto legal, su revocación y los campos visibles quedan pendientes de aprobación del cliente y del abogado.

Esta es una ampliación propuesta en la planificación, no una modificación aprobada del contrato ni del calendario. Antes de implementar acceso para tenants se debe cerrar el alcance contractual, aprobar las reglas de consentimiento y decidir el mecanismo técnico de aislamiento. No se agrega `tenant_id` mecánicamente al roster central ni se cambia el mockup hasta superar ese bloqueo.

### Alcance y orden

| Decisión | Fuente |
|---|---|
| Orden de construcción: Sprint 1 (1A, luego 1B) → 3A → 3B → 2 → 4 | Contrato, "Build order" |
| El Sprint 1 dura 15 días hábiles desde el día en que Sergio tiene las cuentas, los archivos de marca y un endpoint de prueba del screener con el secreto compartido y una muestra de cada webhook. Si los textos de las páginas se atrasan, el mockup usa textos provisionales | Contrato, "Terms"; Decisiones de planificación |
| Todo se construye en una copia privada de staging, se revisa ahí y se publica en el dominio real al aprobarse | Contrato, "Terms" |
| Todo el código vive en la organización de GitHub y la cuenta de DigitalOcean de TL Turner Holdings; cada cuenta de servicio está a nombre de TL Turner Holdings con Sergio invitado | Contrato, "Terms"; Correspondencia 23 sep |
| Documentación en cada sprint; un verificador automático que hace fallar el build si algo se desvía ("fails the build on drift") | Contrato, "What every sprint ships with" |
| Para la revisión del Sprint 1, Toya recibe además un esquema del diseño de la base de datos, la estructura del robot de empleos y el formato del archivo de taxonomía | Correspondencia 22 sep y 2 oct |

### Propiedad de los datos y registro del candidato

| Decisión | Fuente |
|---|---|
| El PostgreSQL del sitio es el sistema de registro. RecruiterFlow recibe copias y nunca escribe de vuelta para los screens de roster | Contrato, 1B "Data and integrations"; Rev 8 §4; Spec de integración §11 |
| La copia a RecruiterFlow es un ajuste del panel, sin cambiar código. Por defecto: sincronizar a todos y llevar el estado de consentimiento y visibilidad al registro de RecruiterFlow. Si el abogado responde "solo con consentimiento", el panel lista los registros ya sincronizados sin consentimiento para una limpieza única | Contrato, 1B; Correspondencia 26 oct |
| DieselJobsUSA usa su propia API key de RecruiterFlow, separada de la de latraeconsulting.com, para poder revocarla aparte | Decisiones de planificación |
| Tabla de candidatos según Rev 8 §1, con nivel, versión de rúbrica, estado del screen y fecha de verificación. Sin columna de score en ninguna parte | Contrato, 1B; Rev 8 §1 y §3; Spec de integración §11 |
| Cada screen completado se guarda tal como llega; los valores actuales van en el registro del candidato encima de ese historial | Contrato, 1B; Correspondencia 2 oct |
| Propiedad de campos en un re-screen: los campos del screener se sobrescriben; los campos "del screener salvo que él los haya editado en el sitio" conservan la edición del candidato y el sitio registra cuáles tocó; los campos solo del candidato y solo del staff nunca vienen en un webhook | Spec de integración §3 "Who owns each field"; Contrato, 1B |
| `sms.opted_out` es la única excepción a "los consentimientos nunca llegan por webhook". No sobrescribe nada: agrega un evento de baja de textos al historial de consentimientos de todos los registros con ese teléfono y pone el número en la lista de supresión, aunque `dju_candidate_id` venga en null | Spec de integración §5; Decisiones de planificación |
| La misma hoja de vida generada puede llegar en `screen.completed` y en `resume.generated`. Se guarda una sola vez | Decisiones de planificación |
| El nivel nunca se muestra al candidato. `null` significa "no ubicable como técnico", no una C | Spec de integración §3; Rev 8 cambio 18 |
| El pago actual nunca se pregunta. El pago deseado es un rango (mínimo, máximo, por hora o por año) | Spec de integración §3 y §11; Rev 8 cambio 17 |
| Las aplicaciones son su propio registro (candidato, empleador, empleo, fecha), desde el Sprint 2 | Correspondencia 2 y 26 oct; Contrato, Sprint 2 |
| Tabla de empresas con alias: las listas de ocultos, la lista de exclusión, la cola de agencias y más adelante las cuentas de empleadores apuntan a ella, para que ocultar coincida con la empresa y no con un texto | Contrato, 1B; Correspondencia 26 oct |

### Registro, consentimiento y visibilidad

| Decisión | Fuente |
|---|---|
| Registro en tres pasos: captura (seis campos, tres consentimientos) → página de siguientes pasos (subir hoja de vida como acción principal, "build one for me" debajo) → el screen. El candidato se guarda al enviar el paso 1 | Rev 8 §2; Contrato, 1B; Walkthrough pasos 2–3 |
| Verificación de teléfono con Twilio Verify a nombre de TL Turner Holdings. Solo números de EE. UU., con límites, Cloudflare Turnstile en el formulario. Hasta confirmar el número, los textos están apagados y el número no se usa para unir registros; el candidato sigue alcanzable por email | Contrato, 1B; Correspondencia 26 oct |
| Los límites por IP viven en memoria; los límites por teléfono y por día (los que cuestan dinero) viven en PostgreSQL para sobrevivir a un despliegue. Se activan además las protecciones propias de Twilio: Geo Permissions (solo EE. UU.) y Fraud Guard | Decisiones de planificación |
| Los teléfonos se guardan y se envían en E.164 | Spec de integración §4; Rev 8 cambio 14 |
| Deduplicación por email y luego por teléfono verificado. Un registro con un email que ya existe nunca le da a quien llenó el formulario acceso al registro existente (ni página de siguientes pasos, ni enlace de regreso, ni inicio del screen). El dueño del registro continúa solo con un enlace enviado a ese email o con el código SMS a su teléfono verificado. Los datos nuevos sin verificar nunca sobrescriben los existentes | Contrato, 1B; Decisiones de planificación |
| Tres casillas de consentimiento, cada una guardada como entrada permanente del historial con el texto exacto mostrado y la fecha. Nunca se sobrescriben | Contrato, 1B "Consent, visibility and privacy"; Rev 8 §7 |
| Las casillas vienen desmarcadas por defecto hasta que el abogado diga otra cosa. Las casillas marcadas del Walkthrough son una ilustración | Decisiones de planificación |
| Reglas de visibilidad: visible por defecto para quien dio el consentimiento de compartir, oculto si no; oculto significa ausente de la búsqueda de empleadores (sin perfil ciego ni "teaser"); aplicar estando oculto lo expone a esa empresa, para siempre, con aviso previo; subir hoja de vida nunca cambia la visibilidad; cada cambio queda registrado en ambos sentidos; pasar a visible sin consentimiento de compartir captura ese consentimiento en ese momento, con el mismo texto y su propia fecha | Rev 8 §3; Contrato, 1B; Correspondencia 26 oct |
| En 1B se construyen y prueban el campo de visibilidad, sus valores por defecto, las reglas, el historial, la captura tardía del consentimiento y la vista del staff. El interruptor en el perfil del candidato es Sprint 2 ("with the rules built in Sprint 1"). Se confirma en la revisión del mockup | Contrato, 1B y Sprint 2; Rev 8 §9; Decisiones de planificación |
| El oficio en el registro es la elección del candidato de la lista Trade del vocabulario: 39 valores mostrados agrupados en sus 12 grupos. La regla "never show the controlled vocabulary to the candidate" aplica a la conversación del screener, no al formulario. Se confirma con Toya en la revisión del mockup | Rev 8 §1 y §5; Spec de integración §1; Decisiones de planificación |
| El borrado elimina el registro del sitio y del screener y crea una tarea para el staff sobre la copia de RecruiterFlow. Tras el borrado queda solo un hash con clave del teléfono, para que un STOP o un borrado sigan coincidiendo con un registro posterior sin guardar el número legible | Contrato, 1B; Rev 8 §7; Spec de integración §5 |
| La clave del hash de teléfonos vive en el archivo de entorno, nunca en la base de datos ni en los backups. Cada fila guarda qué versión de clave la produjo, para poder rotarla | Decisiones de planificación |
| Email recordatorio a quien se registró y no terminó un screen. Es un ajuste del panel; por defecto va solo a quienes dieron el consentimiento de email, hasta que responda el abogado | Contrato, 1B; Decisiones de planificación |
| Límite de re-screen: una repetición iniciada por el candidato cada 30 días, aplicada por el sitio al iniciar un screen, haga lo que haga el screener. Los screens iniciados por el staff no tienen límite | Spec de integración §6; Decisiones de planificación |

### Integración con el screener

| Decisión | Fuente |
|---|---|
| El screener es ScreenProof, el servicio de Trabian con sus propias páginas. El sitio inicia un screen (`POST /v1/intake/sessions` con id del candidato, nombre, oficio elegido, ZIP, teléfono, email, consentimientos, enlace firmado de la hoja de vida y `return_url`), consulta estado (`GET`), borra (`DELETE /v1/intake/candidates/{id}`) y recibe cuatro webhooks: `screen.completed`, `screen.abandoned`, `resume.generated`, `sms.opted_out` | Spec de integración §4–§6; Rev 8 §4; Contrato, 1B |
| Todo webhook va firmado: HMAC-SHA256 sobre `timestamp + "." + raw_body`, cabecera `X-ScreenProof-Signature: kid=…,sha256=…`, cabecera de timestamp rechazada a los 300 segundos, comparación en tiempo constante, calculada sobre los bytes crudos antes de parsear el JSON. Las llamadas del sitio al screener se firman igual con un segundo secreto. Cada lado acepta dos secretos válidos a la vez para rotar | Spec de integración §7 |
| Las claves de idempotencia se guardan; las repeticiones se ignoran. Cualquier `screen.completed` cuyo `screened_at` no sea más nuevo que el guardado se responde 200 y se ignora. Una `spec_version` mayor desconocida se rechaza con 400, se registra y alerta; una menor desconocida se procesa con los campos conocidos | Spec de integración §7; Contrato, 1B |
| Un webhook nunca crea un candidato. Un webhook de un candidato borrado se responde 200 y se descarta | Spec de integración §5 |
| Los enlaces de hojas de vida en ambas direcciones van firmados y vencen en una hora. El sitio descarga la hoja de vida generada en cuanto llega el webhook; el screener descarga la subida en cuanto llega la llamada de inicio | Spec de integración §4 y §7 |
| El sitio sigue funcionando, y sigue capturando candidatos, cuando el screener no está disponible. Un barrido nocturno encuentra screens atascados en "started", recupera cualquier resultado completado por el mismo camino de validación que el webhook, y alerta a Toya y a Sergio | Contrato, 1B; Rev 8 §4 |
| El vocabulario se carga del archivo JSON, nunca se escribe a mano en el código, y el sitio lo publica en un enlace privado que lee el screener, para que ambos usen una sola copia. Lo que no coincide se retiene para revisión, nunca se descarta | Contrato, 1B; Vocabulario "how_to_use"; Correspondencia 26–27 oct |
| Toya actualiza el vocabulario desde el panel (subir el JSON, validar la estructura, ver qué cambia antes de aplicar, guardar versiones anteriores, solo staff) y desde el repositorio | Correspondencia 26 oct; Decisiones de planificación |
| La búsqueda de alias normaliza exactamente como el archivo: minúsculas, puntuación reemplazada por un espacio, espacios colapsados. Por eso existen claves como "6 7 cummins" y "ec 60". Una sola función compartida, con prueba automática, usada por el sitio ahora y por el robot de empleos en el Sprint 3B | Vocabulario `alias_index`; Decisiones de planificación |

### Archivos, hosting y operación

| Decisión | Fuente |
|---|---|
| Hojas de vida: PDF, DOC o DOCX hasta 5 MB, tipo verificado por contenido y no por extensión, escaneadas con ClamAV en el servidor y retenidas hasta estar limpias. Aplica también a las generadas por el screener. El escaneo falla cerrado: si clamd no responde, o el archivo no se puede escanear completo (cifrado, comprimido, por encima de los límites de ClamAV), no está limpio y se queda en cuarentena | Contrato, 1B; Decisiones de planificación |
| ZIP convertido a coordenadas al guardar, desde una tabla pública y gratuita cargada en la base (archivo Gazetteer ZCTA del Census). Un ZIP sin coordenadas se guarda sin ellas y queda marcado; nunca bloquea un registro. PostGIS calcula las distancias; sin servicio pago | Contrato, 1B; Correspondencia 2 oct; Decisiones de planificación |
| Cada registro lleva su origen de tráfico: referrer y UTM capturados en la primera visita. La misma cookie de primera visita sirve para contar visitantes que vuelven para el reporte del Sprint 4, porque Cloudflare Web Analytics no los mide (no usa cookies y cuenta "visits" como páginas vistas que llegan desde otro sitio). El conteo empieza en 1B | Contrato, 1B; Decisiones de planificación; documentación de Cloudflare Web Analytics |
| Hosting: un droplet de DigitalOcean de 4 GB (el tamaño que necesita ClamAV), PostgreSQL con PostGIS en él, Cloudflare R2 con un bucket privado para hojas de vida y otro para backups, Resend en un subdominio de correo con SPF, DKIM, DMARC y List-Unsubscribe, Twilio Verify, Cloudflare Turnstile, ClamAV en el mismo servidor, backups cifrados cada noche en el bucket de backups, despliegues atómicos, staging y producción | Contrato, 1A y "Terms"; Correspondencia 26 oct; Decisiones de planificación |
| Staging vive en el mismo droplet con su propia base de datos, su propio usuario del sistema, su propio archivo de entorno y su propio puerto, compartiendo el daemon de ClamAV. Staging tiene sus propios secretos y su propio endpoint de prueba del screener. El rol de base de datos de staging no puede leer la base de producción | Decisiones de planificación |
| Nunca hay datos reales de candidatos ni hojas de vida reales en local ni en staging. Pruebas y demostraciones usan datos inventados | Decisiones de planificación |
| El screener falso de desarrollo vive en una carpeta aparte, no entra en el paquete de producción, y producción se niega a arrancar si su URL del screener apunta a él | Decisiones de planificación |
| Backups: el servidor solo tiene una clave pública de `age`; la privada nunca toca el servidor ni se escribe en su disco. El token de R2 del servidor lee y escribe solo el bucket de backups (R2 no ofrece tokens de solo escritura); lo que protege los backups es el bucket lock, que impide borrarlos o sobrescribirlos durante la retención incluso desde un servidor comprometido, más el cifrado con `age`. La prueba de restauración mensual corre en el droplet, en una base temporal que se borra al terminar, con la clave privada entrando por stdin desde el computador de Sergio durante la sesión SSH (procedimiento en la decisión 18) | Decisiones de planificación; documentación de tokens y bucket locks de R2 |
| El monitoreo de errores (Sentry) no recibe datos personales: ni cuerpos de peticiones, ni cookies, ni teléfonos, ni emails, ni archivos. El filtro se configura y se prueba. Las cuentas de monitoreo (Sentry, Better Stack, healthchecks.io) se crean con `alerts@dieseljobsusa.com` para que sean del cliente desde el inicio | Decisiones de planificación |
| Los identificadores públicos son UUIDv7. La seguridad nunca depende de que un id sea difícil de adivinar: el `DELETE` al screener va firmado y los ids nunca se usan como tokens. Los enlaces de regreso usan tokens aleatorios aparte, guardados como hash | Decisiones de planificación |
| Las páginas que ve el candidato reciben un modelo de vista tipado que no tiene el campo del nivel, para que no pueda filtrarse por accidente | Decisiones de planificación |
| Staging es privado detrás de Cloudflare Access; el tráfico máquina a máquina (webhooks del screener, el enlace del vocabulario, webhooks de Resend) usa service tokens de Access o políticas de excepción acotadas a una ruta, nunca una excepción abierta | Decisiones de planificación; documentación de Cloudflare Access |
| El servidor acepta tráfico web solo a través de Cloudflare: Nginx y Node escuchan únicamente en `127.0.0.1`, todo entra por el túnel, y por eso Nginx puede confiar en `CF-Connecting-IP` (la app usa `request.ip`, SEC-27). Nadie que conozca la IP del droplet se salta Turnstile, los límites o Access | Decisiones de planificación |
| SSH entra también por el túnel de Cloudflare, con Access: Sergio se autentica con su email, y el despliegue desde GitHub Actions usa un service token de Access. Siempre con llave, sin root y sin contraseña. El firewall de DigitalOcean no abre ningún puerto de entrada; la consola de DigitalOcean es el acceso de emergencia | Decisiones de planificación; documentación de Cloudflare Tunnel y Access |
| Las reglas del Sprint 3 (marcado de Google for Jobs en dos niveles, regla de HVAC, retener empresas no revisadas, seis conectores JSON) están en el Contrato y quedan fuera de este documento | Contrato, 3A y 3B; Correspondencia 27 oct |

---

## 2. Decisiones técnicas de esta construcción

Tomadas el 28 de octubre de 2026 tras comparar opciones. Cada línea da la elección y el motivo que más pesó.

1. **TypeScript estricto, línea 6.0.** Las reglas de datos (propiedad de campos, historial de consentimientos, enums del screener, nivel que puede ser `null`) son el riesgo principal del sprint; el compilador atrapa lo que las pruebas no cubren. La línea 7 (el compilador reescrito) queda para después del Sprint 1: es un cambio grande de herramienta y no vale la pena estrenarlo a mitad de un sprint de 15 días.
2. **Fastify 5** como framework web. Validación de esquemas integrada, plugins oficiales para cookies, sesiones, multipart, rate limiting, CSRF y archivos estáticos, logs con pino y redacción de datos, e `inject()` para probar rutas sin abrir un puerto.
3. **TSX renderizado en el servidor con `preact-render-to-string`.** Las plantillas son componentes tipados que se convierten en HTML en el servidor; en el navegador no corre ningún framework. Se eligió porque Nunjucks, la alternativa convencional, no tiene versión desde abril de 2023 y no cumple la regla de 12 meses. Se usa Preact en su línea 10 (10.29.x), porque la 11 salió el 30 de septiembre de 2026 y no cumple la regla del mes; `preact-render-to-string` 6.8 acepta ambas líneas (`peerDependencies: preact >=10`). Cada modelo de vista que recibe una página del candidato es un tipo sin campo `level`.
4. **JavaScript plano en el navegador, con mejora progresiva.** Los formularios funcionan sin JavaScript; scripts pequeños agregan el paso del código SMS, el progreso de subida y similares. HTMX puede entrar después para las tablas del panel; sin bundler, sin SPA.
5. **Tailwind CSS 4** con los tokens de marca definidos en el tema. Rápido para iterar seis páginas con dos rondas de cambios cada una; no impone apariencia.
6. **Drizzle ORM 0.45 (línea estable) + drizzle-kit** para acceso a datos y migraciones. Esquema en TypeScript, migraciones SQL generadas y revisadas en pull requests, soporte de `geometry` de PostGIS. La línea 1.0 sigue en release candidate y no se usa.
7. **Sesiones del lado del servidor en PostgreSQL** con `@fastify/session` y un store pequeño escrito para este proyecto (cuatro métodos: `get`, `set`, `compareAndSet` y `destroy`; `compareAndSet` reemplaza la sesión solo si su generación coincide, para que una petición en vuelo no reviva una sesión destruida o regenerada). El paquete habitual de store no tiene versión desde 2024. Las sesiones vencidas las limpia una tarea programada.
8. **pg-boss 12** como cola de trabajos, sobre PostgreSQL. Sin Redis. Trabajos: escaneo ClamAV, procesamiento de eventos del screener, copia a RecruiterFlow, barrido nocturno, emails recordatorio, publicación del vocabulario, limpieza de sesiones. Los backups quedan fuera de la cola a propósito (ver 18).
9. **zod 4** para validar todo (rutas vía `@fastify/type-provider-zod`, payloads de webhooks, estructura del archivo de vocabulario, variables de entorno).
10. **Identificadores UUIDv7**, generados por PostgreSQL 18. Ordenables, no adivinables, nativos. Nunca se usan como secreto.
11. **Node.js 24 LTS y PostgreSQL 18.** Node 24 tiene módulos nativos precompilados para todo y soporte de seguridad hasta abril de 2028; Node 26 pasó a LTS activa el 28 oct 2026 y es la meta de actualización en la ventana de 30 días posterior al Sprint 1. PostgreSQL 18 es la versión actual; la 19 sale a mediados de noviembre de 2026 y no se instala a mitad de sprint. PostGIS es la versión que el repositorio PGDG empaqueta para PostgreSQL 18, y la misma se usa en la imagen Docker local y en CI.
12. **argon2id con `@node-rs/argon2`** para las contraseñas del staff. Binarios precompilados; no hace falta compilador en el servidor ni en CI.
13. **Límites en dos capas.** `@fastify/rate-limit` por IP en memoria (un proceso de Node por entorno); límites por teléfono y por día en PostgreSQL; una regla de rate limiting en Cloudflare en las rutas de registro y verificación; Geo Permissions y Fraud Guard de Twilio en el servicio de Verify. CSRF con `@fastify/csrf-protection`; cookies `Secure`, `HttpOnly`, `SameSite=Lax`.
14. **Secretos en archivos `.env` por entorno** en el servidor, fuera del repositorio, permisos 600, cargados con el `--env-file` nativo de Node. Un `.env.example` en el repositorio lista cada variable. Los secretos de CI viven en GitHub Environments. Dónde viven las copias maestras es pregunta para Toya (sección 9).
15. **Staging detrás de Cloudflare Access** (gratis hasta 50 usuarios; login con código al email). Usuarios de navegador: Toya, Trabian, Sergio. Máquinas: los webhooks del screener y sus lecturas del enlace del vocabulario usan un **service token** de Access (política "Service Auth"); la ruta de webhooks de Resend recibe una política de excepción (Bypass) acotada solo a esa ruta. Staging envía además `X-Robots-Tag: noindex` y un `robots.txt` que bloquea todo.
16. **Monitoreo:** Sentry (errores, datos personales filtrados), Better Stack (caídas), healthchecks.io (aviso si no llega el ping del backup nocturno, del barrido nocturno, de la actualización de firmas de ClamAV y de la cola). Todas las alertas van a `alerts@dieseljobsusa.com`, una dirección de Cloudflare Email Routing reenviada a Sergio y a la dirección que elija Toya.
17. **Logs:** pino (viene con Fastify) con redacción de teléfono, email, tokens y cuerpos de webhooks; rotación con pm2-logrotate; 14 días en disco; sin servicio externo de logs.
18. **Backups:** un timer de systemd corre `pg_dump` cada noche, comprime, cifra con `age` hacia una clave pública y sube al bucket de backups de R2. El token que usa el servidor es "Object Read & Write" acotado solo a ese bucket: R2 ofrece Object Read & Write, Object Read only, Admin Read & Write y Admin Read only, y no tiene un permiso de solo escritura. Lo que protege los backups no es el token sino dos cosas: el bucket lock (Cloudflare: `wrangler r2 bucket lock add … --retention-days N`), que impide borrar o sobrescribir los objetos durante la retención incluso desde un servidor comprometido, y el cifrado con `age`, cuya clave privada nunca está en el servidor. El bucket de hojas de vida no tiene versionado, porque un borrado tiene que ser real.
    **Prueba de restauración mensual.** Corre en el droplet, no en local (ahí nunca hay datos reales) ni en staging. Pasos: (1) Sergio abre una sesión SSH y crea una base temporal, por ejemplo `restore_test_<fecha>`, con un rol que solo existe durante la prueba. (2) Descarga el backup más reciente del bucket. (3) Descifra y restaura en un solo comando encadenado, con la clave privada leída de stdin desde su computador (por ejemplo, `age -d -i /dev/stdin backup.age < clave_local | pg_restore -d restore_test_<fecha>`, con el archivo de la clave en la máquina de Sergio y pasado por la sesión SSH), de modo que la clave nunca se escribe en el disco del droplet ni queda en el historial de la shell. (4) Verifica conteos de tablas y una consulta de muestra contra la base de producción. (5) Borra la base temporal y el rol, y elimina el archivo de backup descargado. (6) Registra la fecha y el resultado en el archivo de operaciones del repositorio y manda el ping a healthchecks.io. Si la clave privada se rota, la prueba se repite ese mismo día con la clave nueva.
19. **Origen alcanzable solo a través de Cloudflare, con Cloudflare Tunnel.** Se comparó contra un firewall de DigitalOcean que permita los rangos de IP de Cloudflare más Authenticated Origin Pulls (mTLS). Ambos están en el plan gratuito y documentados por Cloudflare; son excluyentes entre sí. Se eligió Tunnel porque el droplet queda **sin ningún puerto de entrada**, ni web ni SSH (SSH también entra por el túnel, ver abajo), no hay lista de IPs de Cloudflare que mantener, no hay certificado de origen que administrar, y Access se integra directo. Costo: un daemon pequeño (`cloudflared`) en el droplet y que Nginx lea la IP del visitante de `CF-Connecting-IP` (la app no la lee: usa `request.ip`, SEC-27). Para que ese dato sea confiable, **Nginx y Node escuchan solo en `127.0.0.1`**: nada en el droplet acepta conexiones web desde fuera, así que toda petición que llega pasó por Cloudflare. La alternativa queda documentada como plan B si el túnel diera problemas.
    **SSH por el mismo túnel.** Restringir SSH a direcciones IP no sirve: la IP de casa de Sergio puede cambiar y las de GitHub Actions cambian en cada ejecución. Cloudflare documenta tres piezas que resuelven las dos cosas: el túnel publica un servicio `ssh://localhost:22` en un hostname propio (por ejemplo `ssh.dieseljobsusa.com`); una aplicación de Access protege ese hostname; y el cliente usa `cloudflared access ssh --hostname …` como `ProxyCommand` en su configuración de SSH. Sergio entra con su email (política Allow); el despliegue entra con un **service token** de Access (política "Service Auth"), cuyas credenciales viven como secretos del repositorio en GitHub y se pasan a `cloudflared` en el paso de despliegue. Reglas fijas: autenticación solo por llave, `PermitRootLogin no`, `PasswordAuthentication no`, un usuario de despliegue sin privilegios de root y con permisos solo sobre `/srv/dju`. El firewall de DigitalOcean no abre ningún puerto de entrada, ni el 22. Si el túnel o Access fallan, el acceso de emergencia es la consola de DigitalOcean. Se consideró la alternativa de que el servidor descargue la release por sí mismo (sin SSH desde CI); se descartó porque exige un disparador adicional y un token de GitHub en el servidor, y el túnel ya resuelve el problema con una sola pieza.
20. **Despliegues atómicos al estilo Capistrano.** GitHub Actions construye (type check, pruebas, Tailwind, `npm ci --omit=dev` con el mismo Node y Ubuntu del servidor), sube la release por SSH a través del túnel de Cloudflare con el service token de Access (decisión 19) a `/srv/dju/releases/<commit>`, corre migraciones, hace un health check de la release nueva en su puerto interno, y solo entonces cambia el symlink `current` y reinicia el proceso. Rollback = volver el symlink atrás. Las migraciones se escriben en dos pasos (expandir, luego contraer) para que la release anterior siga funcionando durante el cambio.
21. **Ramas:** `main` despliega a staging automáticamente; producción se despliega desde un tag de versión con aprobación obligatoria en el environment "production" de GitHub. La compuerta de CI (type check, lint, pruebas, validación del JSON de vocabulario, y la **medición de velocidad de las páginas en cada build**, prometida en la propuesta original) es el "verifier that fails the build on drift". La herramienta de medición y los umbrales que hacen fallar el build se eligen en el plan de tareas.
22. **Pruebas:** Vitest 5 para unitarias e integración contra un PostgreSQL real con PostGIS (la base nunca se simula); `inject()` de Fastify para rutas; Playwright para unos pocos flujos de humo en celular (registro, código SMS, subida, webhook, panel). Twilio, Resend, R2 y el screener se reemplazan por dobles de prueba guardados en el repositorio.
23. **Entorno local:** Docker Compose para PostgreSQL+PostGIS (mismas versiones mayores que producción) y ClamAV; Node corre nativo. R2 es un bucket `dev` real cuando existan las cuentas; hasta entonces, un adaptador a disco local detrás de la misma interfaz de almacenamiento.
24. **Un screener falso en el repositorio**, en su propia carpeta, que implementa el spec de integración: inicio, estado, borrado, webhooks firmados disparados a demanda, reintentos, entregas fuera de orden, firmas malas, versiones desconocidas. Se justifica como código propio porque no existe librería que implemente el contrato de Trabian; además es el endpoint de prueba de staging hasta que llegue el real, y corre los casos adversarios en CI. Excluido del paquete de producción; producción se niega a arrancar si está configurada para usarlo.
25. **Cliente de ClamAV escrito para este proyecto** (el comando `INSTREAM` de clamd sobre el socket Unix, unas sesenta líneas con pruebas). El paquete popular `clamscan` no tiene versión desde octubre de 2024 y no cumple la regla de 12 meses. El protocolo tiene tres comandos y no cambia hace años.
26. **Subidas:** el servidor recibe el archivo (`@fastify/multipart`, límite de 5 MB), detecta el tipo por sus bytes (`file-type`, con el detector `@file-type/cfbf` del mismo autor porque `file-type` solo no reconoce el `.doc` de Word 97-2003), lo guarda en un directorio de cuarentena, lo escanea, y solo entonces lo sube a R2 con el SDK S3 de AWS (R2 habla la API de S3). Las descargas usan enlaces GET firmados que vencen en una hora. Nada es alcanzable antes de que el escaneo esté limpio; el `resume_url` para el screener solo se genera después del escaneo.
27. **Email:** SDK oficial de Resend con las mismas plantillas TSX (HTML y texto plano), cabeceras `List-Unsubscribe` (cabeceras personalizadas confirmadas en el SDK), y webhooks de Resend para marcar direcciones que rebotan.
28. **Tabla de ZIP:** archivo Gazetteer ZCTA del Census Bureau (obra federal de EE. UU., de uso libre). Los ZIP que son solo de apartado postal no tienen ZCTA y quedan marcados "sin coordenadas"; se puede agregar una fuente secundaria en el Sprint 3 si el hueco importa.
29. **Herramienta del mockup: decidida** (Sergio, 30 oct 2026; antes estaba abierta). Mockup HTML estático en la carpeta `mockup/` del repositorio: componentes y páginas TSX de Preact convertidos con `preact-render-to-string` en un script de build, más Tailwind 4 con su CLI — el mismo stack de las páginas reales (decisiones 3 y 5), para que lo aprobado se mude a `src/views/` sin reescribir. Sin base de datos ni servicios externos; fuera del paquete de producción, como `fake-screener/`. Publicación temporal en un servidor de Sergio con usuario y contraseña y `noindex`, hasta que exista el staging de Toya. Solo datos inventados y colores provisionales del Walkthrough. Detalles, tandas y reglas en `05_mockup.md`.
30. **Redirección de dieseljobusa.com** en Cloudflare con una regla de Single Redirect (el plan gratuito permite 10). Todo el DNS de ambos dominios en Cloudflare.
31. **Decisiones menores:** npm como gestor de paquetes; Biome para lint y formato; `timestamptz` en UTC; HMAC-SHA-256 (`crypto` de Node) para el hash de teléfonos con la clave del entorno y un id de clave en cada fila; visitantes que vuelven contados en el servidor desde la cookie de primera visita, desde 1B.
32. **Staging en el mismo droplet.** Presupuesto de memoria en 4 GB: PostgreSQL unos 0.4 GB, clamd unos 1.3 GB (con `ConcurrentDatabaseReload no` para que una recarga de firmas no lo duplique), dos procesos de Node unos 0.5 GB entre los dos, Nginx y cloudflared menos de 0.1 GB, sistema operativo unos 0.3 GB: alrededor de 2.6 GB en régimen normal. Se agrega un swap de 2 GB con swappiness baja como margen. Cada entorno tiene su propio rol de PostgreSQL con permisos solo sobre su base: el rol de staging no puede leer la base de producción, ni al revés.
33. **Solo datos inventados** en local y staging. Scripts de semilla generan candidatos, hojas de vida y screens ficticios.

---

## 3. Stack con versiones verificadas

Verificado el 28 de octubre de 2026. "Publicado" es la fecha de la última versión en npm; todo lo listado tiene una versión dentro de los últimos 12 meses.

### Runtime y servidor

| Pieza | Elección | Versión | Notas |
|---|---|---|---|
| Servidor | Droplet de DigitalOcean, Ubuntu 24.04 LTS, 4 GB RAM | — | Un droplet para staging y producción |
| Node.js | 24 LTS | 24.x | LTS en mantenimiento hasta abril 2028; subir a 26 después del Sprint 1 |
| PostgreSQL | 18 desde el repositorio apt de PGDG | 18.x | PostGIS: la versión que PGDG empaqueta para PostgreSQL 18, la misma en Docker y CI |
| ClamAV | `clamav-daemon` de Ubuntu 24.04 | distro | `freshclam` diario; `ConcurrentDatabaseReload no` |
| Proxy inverso | Nginx de Ubuntu 24.04 | distro | Archivos estáticos, límite de tamaño de subida, proxy a Node |
| Túnel | `cloudflared` del repositorio apt de Cloudflare | actual | Conexión de salida hacia Cloudflare |
| Gestor de procesos | PM2 | 7.1.1 (publicado 2026-10-23) | Un proceso por entorno, `pm2 startup` |
| Cifrado de backups | `age` de Ubuntu 24.04 | distro | Solo la clave pública en el servidor |
| Gestor de paquetes | npm (viene con Node 24) | — | `npm ci` en CI y en el servidor |

### Dependencias de la aplicación

| Paquete | Versión | Publicado | Para qué |
|---|---|---|---|
| fastify | 5.12.7 | 2026-10-13 | Framework web |
| @fastify/cookie | 11.1.3 | 2026-10-08 | Cookies (la 11.1.5 del 27 de octubre no pasa el cooldown de 7 días; se sube cuando pase) |
| @fastify/session | 11.1.6 | 2026-10-27 | Sesiones en servidor (store de PostgreSQL escrito en el proyecto) |
| @fastify/csrf-protection | 8.0.2 | 2026-10-18 | Tokens CSRF en formularios |
| @fastify/rate-limit | 11.2.1 | 2026-10-18 | Límites por IP |
| @fastify/multipart | 10.1.6 | 2026-10-22 | Subida de archivos |
| @fastify/formbody | 9.0.1 | 2026-10-18 | Cuerpos de formularios HTML |
| @fastify/static | 10.1.8 | 2026-10-27 | Archivos estáticos |
| @fastify/helmet | 13.2.0 | 2026-10-13 | Cabeceras de seguridad |
| @fastify/sensible | 6.0.7 | 2026-10-08 | Errores HTTP estándar. Desde T-04b no se registra (ningún uso en `src/`; los errores los responde `src/security/error-handler.ts`); desinstalarlo lo decide Sergio |
| @fastify/type-provider-zod | 1.0.1 | 2026-10-12 | Esquemas zod en rutas. Reemplaza a `fastify-type-provider-zod` 7.0.0: este es el paquete de la organización Fastify, mantenido (1.0.1 del 12 de octubre) y el que sigue la documentación vigente; el original no está marcado como obsoleto pero no tiene versiones desde junio de 2026. Peers obligatorios: `@fastify/swagger` y `openapi-types` (ver excepciones) |
| zod | 4.6.7 | 2026-10-12 | Validación |
| preact + preact-render-to-string | 10.29.8 + 6.8.1 | 2026-08-01 / 2026-10-14 | Plantillas TSX renderizadas en servidor (Preact 11 queda fuera por la regla del mes; la 6.8.2 del 27 de octubre no pasa el cooldown de 7 días, se sube cuando pase). Instalados en T-37 (mockup) |
| drizzle-orm / drizzle-kit | 0.45.4 / 0.31.11 | 2026-10-08 / 2026-09-21 | Acceso a datos y migraciones (drizzle-kit va en `devDependencies`) |
| pg | 8.23.1 | 2026-09-30 | Driver de PostgreSQL |
| pg-boss | 12.38.0 | 2026-10-13 | Cola de trabajos y cron |
| @node-rs/argon2 | 2.2.2 | 2026-10-06 | Hash de contraseñas (argon2id) |
| file-type | 22.2.0 | 2026-10-14 | Tipo de archivo por bytes (PDF y DOCX) |
| @file-type/cfbf | 0.2.2 | 2026-10-24 | Detector de `.doc` (Word 97-2003, formato CFB) para `file-type` |
| @aws-sdk/client-s3 + @aws-sdk/s3-request-presigner | 3.1158.0 | 2026-10-27 | Subidas a R2 y enlaces firmados |
| twilio | 6.2.0 | 2026-10-12 | Twilio Verify |
| resend | 6.35.0 | 2026-10-27 | Email |
| libphonenumber-js | 1.13.15 | 2026-10-08 | Normalización a E.164 |
| pino | 10.4.0 | 2026-10-02 | Logs (vía Fastify) |
| @sentry/node | 11.10.0 | 2026-10-28 | Monitoreo de errores |

### Desarrollo y build

| Paquete | Versión | Publicado | Para qué |
|---|---|---|---|
| typescript | 6.0.3 | 2026-04-16 | Type checking (la línea 7 queda para después del Sprint 1) |
| tsx | 4.23.15 | 2026-09-20 | Correr TypeScript en desarrollo |
| tailwindcss + @tailwindcss/cli | 4.3.3 | 2026-07-16 | CSS (la fecha 2026-10-19 anotada antes era de builds insiders; la 4.3.3 estable es del 16 de julio y es la última, dist-tag `latest`). Instalados en T-37 (mockup) |
| vitest | 5.0.5 | 2026-10-15 | Pruebas unitarias e integración |
| @playwright/test | 1.64.1 | 2026-10-14 | Pruebas de humo en celular y capturas del mockup (`mockup:shots`). La fecha 2026-10-28 anotada antes era de los builds diarios `1.65.0-alpha`; la 1.64.1 estable es del 14 de octubre y pasa el cooldown de 7 días. Instalado en T-37 (pasada de diseño del mockup) |
| @biomejs/biome | 2.6.2 | 2026-10-21 | Lint y formato (la 2.6.3 no pasaba el cooldown de 7 días el 29 de octubre) |
| @types/node | 24.19.2 | 2026-10-09 | Tipos de Node 24 para TypeScript (línea 24, la del runtime) |
| @types/pg | 8.23.1 | 2026-08-17 | Tipos de `pg` (no los trae el paquete) |

### Descartados por la regla de 12 meses

| Paquete | Última versión | Reemplazado por |
|---|---|---|
| nunjucks | 2023-04-13 | TSX renderizado en servidor (decisión 3) |
| clamscan | 2024-10-21 | Cliente INSTREAM propio (decisión 25) |
| connect-pg-simple | 2024-09-13 | Store de sesiones propio (decisión 7) |

### Alcance de la regla de 12 meses

La regla de 12 meses aplica a las dependencias directas de `package.json` y a los peers que npm instala por obligación. No aplica a las dependencias transitivas: a esas las cubren el lockfile, `npm ci`, `ignore-scripts`, `min-release-age` y `npm audit`, y la revisión SEC-88 solo pide revisar cuántas agrega un paquete nuevo.

### Excepciones a la regla de 12 meses

| Paquete | Última versión | Por qué entra | Cuándo se revisa |
|---|---|---|---|
| openapi-types | 12.1.3 (2023-05-24) | Peer obligatorio de `@fastify/type-provider-zod`. Solo tipos: sin código de runtime, sin scripts, y no se importa en `src/`. Lo cubre `npm audit --omit=dev --audit-level=high` como a cualquier dependencia de producción | Al actualizar `@fastify/type-provider-zod` |

### Revisiones SEC-88

Hechas el 29 de octubre de 2026 (T-01). Ningún paquete de esta lista declara scripts de instalación (`npm view <pkg> scripts`).

| Paquete | Mantenedores | Dependencias y notas |
|---|---|---|
| fastify 5.12.7, @fastify/helmet 13.2.0, @fastify/sensible 6.0.7, @fastify/cookie 11.1.3 | matteo.collina, eomm y otros (organización Fastify) | Las del ecosistema Fastify (`helmet`, `cookie`, `http-errors`, `fastify-plugin`, …) |
| @fastify/type-provider-zod 1.0.1 | eomm (organización Fastify) | `@fastify/error`; peers obligatorios `fastify`, `zod`, `@fastify/swagger` y `openapi-types`. En el paquete publicado, `@fastify/swagger` y `openapi-types` solo se importan en los `.d.ts`, nunca en el JS que corre |
| @fastify/swagger 9.9.2 (2026-10-09) | matteo.collina, eomm, tony133 | Entra como peer y la app no lo registra. Dependencias: `rfdc`, `yaml`, `openapi-types`, `fastify-plugin`, `json-schema-resolver`. Agrega 6 paquetes que el resto no trae ya: él mismo, `yaml`, `openapi-types`, `json-schema-resolver`, `debug`, `ms` |
| zod 4.6.7 | colinhacks | Sin dependencias de runtime |
| pino 10.4.0 | matteo.collina, jsumners y otros (pinojs) | Las de pino; ya viene con Fastify |
| typescript 6.0.3, @types/node 24.19.2 | Microsoft / DefinitelyTyped | `@types/node` depende solo de `undici-types` |
| tsx 4.23.15 | hirokiosame | `esbuild` (su `postinstall` solo optimiza el arranque; funciona con `ignore-scripts`, ver SEC-84) |
| vitest 5.0.5 | antfu, ariperkkio, hiogawa y otros | Peer obligatorio `vite` (solo desarrollo) |
| @biomejs/biome 2.6.2 | ematipico, conaclos y otros (equipo de Biome) | Binario por `optionalDependencies` |

Hechas el 29 de octubre de 2026 (T-02). Ninguno declara scripts de instalación. Todos pasan el cooldown de 7 días; ninguna línea mayor tiene menos de un mes. Documentación consultada en Context7 (pg-boss, Drizzle, PostgreSQL 18). Ninguno tiene alternativa en el stack.

| Paquete | Mantenedores | Dependencias y notas |
|---|---|---|
| drizzle-orm 0.45.4 (2026-10-08; línea 0.45 desde 2025-12-04) | dankochetov, sheriman, alexblokh, kyrylo_usichenko (Drizzle Team) | Sin dependencias; peers opcionales por driver (`pg`, `@types/pg`, …) |
| drizzle-kit 0.31.11 (2026-09-21; línea 0.31 desde 2025-04-15), dev | Drizzle Team | `tsx` (se une al nuestro), `@drizzle-team/brocli`, `esbuild 0.25` y, por `@esbuild-kit/esm-loader` (obsoleto, "merged into tsx"), `esbuild 0.18`. Los dos `esbuild` declaran `postinstall`, que solo optimiza el arranque y no corre con `ignore-scripts` (SEC-84). `npm audit` marca 4 moderadas en esa cadena (GHSA-67mh-4wv8-2f99, el servidor de desarrollo de esbuild, que drizzle-kit no usa); son de desarrollo y `npm audit --omit=dev` queda limpio. Se revisa al salir drizzle-kit 1.0 |
| pg 8.23.1 (2026-09-30) | brianc | 6 paquetes del mismo proyecto (`pg-pool`, `pg-protocol`, `pg-types`, `pgpass`, `pg-connection-string`, `pg-cloudflare`); peer opcional `pg-native`, que no se instala |
| @types/pg 8.23.1 (2026-08-17), dev | DefinitelyTyped | `pg-types`, `pg-protocol`, `@types/node` |
| pg-boss 12.38.0 (2026-10-13; línea 12 desde 2025-11-09) | timjones | `pg`, `cron-parser`, `rrule-temporal`, `serialize-error`; peer obligatorio `@opentelemetry/api` |
| @opentelemetry/api 1.10.0 (2026-10-20), peer de pg-boss | Organización OpenTelemetry (dyladan, pichlermarc, trentm y otros) | Sin dependencias. npm lo instala solo; no va en `package.json` y queda fijado en el lockfile |

Hechas el 30 de octubre de 2026 (T-37, base del mockup). Documentación consultada en Context7 (preact-render-to-string, Tailwind 4 CLI/@theme/@source, JSX de Preact con TypeScript). Ninguno tiene alternativa en el stack (Nunjucks quedó descartado por la regla de 12 meses, decisión 3; Tailwind es la decisión 5).

| Paquete | Mantenedores | Dependencias y notas |
|---|---|---|
| preact 10.29.8 (2026-08-01) | Organización preactjs (developit, marvinhagemeister, jdecroock, rschristian y otros) | Sin dependencias de runtime. Sin scripts de instalación (`prepare` solo corre en el repositorio de desarrollo o en dependencias de git, no al instalar del registro). Línea 10 por la decisión 3 |
| preact-render-to-string 6.8.1 (2026-10-14) | Los mismos de preactjs | Sin dependencias de runtime; peer `preact >=10` (ya presente). Sin scripts de instalación. La 6.8.2 (2026-10-27) no pasa el cooldown de 7 días |
| tailwindcss 4.3.3 (2026-07-16), dev | Tailwind Labs (adamwathan, reinink, malfaitrobin) | Sin dependencias; sin scripts de instalación |
| @tailwindcss/cli 4.3.3 (2026-07-16), dev | Tailwind Labs | `mri`, `picocolors`, `tailwindcss`, `enhanced-resolve` (`tapable`, `graceful-fs`), `@parcel/watcher`, `@tailwindcss/node` (`jiti`, `lightningcss`, `magic-string`, `source-map-js`, `@jridgewell/remapping`), `@tailwindcss/oxide`; más binarios opcionales por plataforma. **Nota SEC-84:** `@parcel/watcher` 2.5.1 declara un script `install` (compilar desde fuente); con `ignore-scripts` no corre y no hace falta, porque en runtime carga el binario precompilado de sus `optionalDependencies` por plataforma (`@parcel/watcher-win32-x64`, …). `lightningcss` y `@tailwindcss/oxide` no declaran scripts de instalación (binarios por `optionalDependencies`). Toda la cadena funciona con `ignore-scripts=true`; además `mockup:dev` usa `fs.watch` propio, no el `--watch` del CLI |

Hecha el 30 de octubre de 2026 (T-37, pasada de diseño del mockup). Documentación consultada en Context7 (Playwright: viewport y capturas; Tailwind 4: breakpoints). Sin alternativa en el stack: Vitest no maneja navegador, y @playwright/test ya estaba decidido para T-25 (pruebas de humo); esta pasada solo adelanta la instalación.

| Paquete | Mantenedores | Dependencias y notas |
|---|---|---|
| @playwright/test 1.64.1 (2026-10-14), dev | Microsoft (equipo Playwright: pavelfeldman, yurys, dgozman-ms y las cuentas de publicación de Microsoft) | Solo `playwright` → `playwright-core`, sin dependencias opcionales. Ninguno de los tres declara scripts de instalación (`npm view <pkg>@1.64.1 scripts`). Chromium se descarga con el paso explícito `npx playwright install chromium` (CDN de Microsoft), nunca durante `npm install` |

Hechas el 30 de octubre de 2026 (T-04b) para los paquetes que 02 y 04 ya citan con versión y que llegan con tareas futuras. **Ninguno está instalado**: cada tarea repite el paso 3 de SEC-88 con la versión del día y pregunta a Sergio antes de instalar. Fechas con `npm view <pkg> time --json`; scripts con `npm view <pkg>@<versión> scripts` (ninguno declara `preinstall`, `install`, `postinstall` ni `prepare`; los `prepack`, `postpack` o `preversion` solo corren al publicar). Documentación en Context7: `/panva/jose` (v6.2.13), `/apostrophecms/sanitize-html`, `/adaltas/node-csv`, `/googlechrome/lighthouse` (su guía de uso desde Node incluye `chrome-launcher`). Ninguno tiene alternativa en el stack.

| Paquete | Línea mayor y su primera versión | Mantenedores | Dependencias y notas |
|---|---|---|---|
| jose 6.2.13 (2026-10-20), T-15 | 6, desde 2025-02-22 | panva | Sin dependencias. La 6.2.14 (2026-10-29) todavía no pasa el cooldown de 7 días. Es la librería que usa la documentación de Cloudflare para validar el JWT de Access (`createRemoteJWKSet` + `jwtVerify` con `issuer` y `audience`) |
| csv-stringify 6.9.0 (2026-09-25), T-16 | 6, desde 2021-11-15 | david (Adaltas, proyecto node-csv) | Sin dependencias. No neutraliza fórmulas: eso lo hace `neutralizeFormula()` propia (SEC-63) |
| sanitize-html 2.18.1 (2026-10-14), T-21 y T-24 | 2, desde 2020-09-23 | alexgilbert, boutell, romanek, bodonkey (ApostropheCMS) | 6 directas: `htmlparser2`, `postcss`, `launder`, `parse-srcset`, `is-plain-object`, `escape-string-regexp` (`postcss` ya llega por vite en desarrollo; en producción entra con este paquete). Sin jsdom |
| lighthouse 13.6.0 (2026-10-27), dev, T-23 | 13, desde 2025-10-10 | paulirish, hoten, lusayaa (equipo de Chrome) | 22 directas, entre ellas `puppeteer-core` 25, `chrome-launcher`, `axe-core`, `yargs`, `configstore`, `open` y **`@sentry/node` ^11.8.0** (dependencia de desarrollo transitiva; no cambia la revisión de Sentry de T-08b). Revisados sin scripts de instalación: `puppeteer-core` 25.16.0, `@puppeteer/browsers` 3.2.6, `chromium-bidi`, `axe-core` 4.14.0, `@paulirish/trace_engine`. Es la cadena más pesada de desarrollo: T-23 mide cuántos paquetes agrega al lockfile. **La 13.6.0 pasa el cooldown desde el 3 de noviembre**; si T-23 corre antes, usa la 13.5.0 (2026-09-18) |
| chrome-launcher 1.2.2 (2026-09-29), dev, T-23 | 1, desde 2023-07-18 | paulirish, brendankenny, hoten, adamraine (equipo de Chrome) | 4 directas: `is-wsl`, `lighthouse-logger`, `escape-string-regexp`, `@types/node` (`*`). Se usa con `chromePath` apuntando al Chromium de Playwright (`CHROME_PATH`) |
| vite 8.3.5 (2026-10-21), dev, transitiva | 8, desde 2026-03-12 | yyx990803, vitebot (VoidZero) | Peer obligatorio de vitest 5.0.5; npm lo instala solo, no va en `package.json` y queda fijado en el lockfile. 5 directas (`postcss`, `rolldown`, `picomatch`, `tinyglobby`, `lightningcss`) y `fsevents` opcional (solo macOS, declara script de instalación que `ignore-scripts` no corre). Sin scripts de instalación propios |

### Versiones mayores revisadas con la regla del mes

Fecha de la primera versión estable de cada línea mayor usada, contada al 28 de octubre de 2026. Todas las demás líneas de la tabla son de 2025 o anteriores.

| Paquete | Línea mayor | Primera versión estable | Resultado |
|---|---|---|---|
| preact | 11 | 2026-09-30 (28 días) | No entra; se usa 10.29.8 |
| typescript | 7 | 2026-07-08 (112 días; la 7.0.2 de hoy es un parche) | Cumple la regla, pero queda para después del Sprint 1 por decisión de Sergio; se usa 6.0.3 |
| @sentry/node | 11 | 2026-09-23 (35 días) | Entra |
| vitest | 5 | 2026-09-03 (55 días) | Entra |
| @fastify/formbody | 9 | 2026-08-08 (81 días) | Entra |
| @fastify/static | 10 | 2026-07-11 (109 días) | Entra |
| @fastify/rate-limit, @fastify/csrf-protection | 11, 8 | 2026-06-09 (141 días) | Entran |
| @fastify/type-provider-zod | 1 | 2026-04-19 (193 días) | Entra |
| pm2 | 7 | 2026-05-02 (179 días) | Entra |
| twilio | 6 | 2026-04-20 (191 días) | Entra |
| @fastify/multipart | 10 | 2026-04-07 (204 días) | Entra |
| file-type | 22 | 2026-03-26 (216 días) | Entra |

### Servicios de Cloudflare (plan gratuito salvo que se indique)

| Servicio | Uso | Confirmado en la documentación de Cloudflare |
|---|---|---|
| DNS y proxy | Ambos dominios, subdominios de staging y de correo | — |
| Tunnel | Conexión al origen sin puertos de entrada; también publica SSH (`ssh://localhost:22`) | Disponible en todos los planes; incompatible con Authenticated Origin Pulls; `cloudflared access ssh` como `ProxyCommand` del cliente |
| Access (Zero Trust) | Staging privado; SSH con login por email para Sergio y service token para el despliegue; service tokens para máquinas; políticas Bypass por ruta | Plan gratuito hasta 50 usuarios; políticas "Allow", "Service Auth" y "Bypass" |
| Turnstile | Protección anti-bots en todos los formularios | El `siteverify` del lado del servidor es obligatorio; el token dura 5 minutos y es de un solo uso |
| R2 | Bucket de hojas de vida y bucket de backups | Enlaces firmados (de 1 s a 7 días); bucket locks; tokens acotados a buckets específicos con permisos Object Read & Write, Object Read only, Admin Read & Write o Admin Read only (no existe solo escritura) |
| Single Redirects | dieseljobusa.com → dieseljobsusa.com | 10 reglas en el plan gratuito |
| Email Routing | Reenvío de `alerts@dieseljobsusa.com` | Gratis |
| Reglas de rate limiting | Rutas de registro y verificación | Aplican las cuotas del plan |
| Web Analytics | Páginas vistas y visitas | Sin cookies; no mide visitantes que vuelven |

---

## 4. Piezas del sistema y cómo se comunican

```
                      Candidatos · equipo de Toya · Trabian
                                        │
                 ┌──────────────────────┴───────────────────────┐
                 │                  Cloudflare                   │
                 │  DNS · proxy y WAF · Turnstile · Access       │
                 │  rate limiting · Single Redirect · Email      │
                 │  Routing (alerts@) · Web Analytics            │
                 └──────────────────────┬───────────────────────┘
                                        │  Cloudflare Tunnel
                                        │  (sale desde el droplet; sin puertos web de entrada)
   ┌────────────────────────────────────┴────────────────────────────────────┐
   │  Droplet de DigitalOcean · Ubuntu 24.04 · 4 GB                           │
   │                                                                          │
   │  cloudflared ─► Nginx ─► app Node, producción (PM2, puerto 3000)         │
   │                      └─► app Node, staging    (PM2, puerto 3100)         │
   │                          cada app corre sus propios workers de pg-boss   │
   │                                                                          │
   │  PostgreSQL 18 + PostGIS   bases: dju_production, dju_staging            │
   │  clamd (ClamAV)            un daemon, socket Unix, compartido            │
   │  timer de systemd          pg_dump nocturno → age → bucket de backups    │
   └───┬───────────┬────────────┬───────────┬────────────┬───────────────┬───┘
       │           │            │           │            │               │
   R2 hojas    R2 backups   Resend      Twilio      ScreenProof     RecruiterFlow
   de vida     bucket con   email +     Verify      (Trabian)       API
   bucket      lock, token  webhooks    códigos     start/status/   empleos entran,
   privado,    acotado                  SMS         delete + 4      copias de
   enlaces                                          webhooks +      candidatos salen
   firmados 1 h                                     enlace del
                                                    vocabulario

   Observabilidad (fuera del droplet): Sentry · Better Stack · healthchecks.io
```

Cómo funciona cada conexión:

| De → a | Protocolo y autenticación | Dirección |
|---|---|---|
| Navegador → sitio | HTTPS a través de Cloudflare. Staging exige además login de Access. Los formularios llevan un token de Turnstile que se verifica en el servidor en cada envío | Entrada |
| Cloudflare → droplet | Cloudflare Tunnel; `cloudflared` abre la conexión hacia afuera y entrega a Nginx en `127.0.0.1`. Nginx y Node escuchan solo en `127.0.0.1` y el firewall de DigitalOcean no abre puertos de entrada, así que toda petición pasó por Cloudflare. **Nginx** lee `CF-Connecting-IP` y la entrega a Node en `X-Forwarded-For`, sobrescribiendo lo que viniera; la app **nunca** lee esa cabecera: usa `request.ip`, que Fastify calcula con `trustProxy: '127.0.0.1'` (SEC-27, SEC-28) | Iniciada desde el droplet |
| Sergio / GitHub Actions → SSH del droplet | SSH por el mismo túnel (`ssh.dieseljobsusa.com`), con `cloudflared access ssh` como `ProxyCommand`. Sergio pasa Access con su email; el despliegue con un service token. Solo llave, sin root, sin contraseña; usuario de despliegue sin privilegios. Emergencia: consola de DigitalOcean | Iniciada desde el droplet (túnel) |
| Sitio → PostgreSQL | Socket local, una base y un rol por entorno | Interna |
| Sitio → clamd | Socket Unix, `INSTREAM`. Falla cerrado | Interna |
| Sitio → R2 | API S3 sobre HTTPS con el SDK de AWS. El token de la app solo lee y escribe el bucket de hojas de vida de su entorno; el token de backups lee y escribe solo el bucket de backups (R2 no tiene permiso de solo escritura; la protección es el bucket lock más el cifrado). Descargas con enlaces GET firmados válidos por una hora | Salida |
| Sitio → Twilio Verify | HTTPS, API key en el archivo de entorno. Geo Permissions limitado a EE. UU.; Fraud Guard activo | Salida |
| Sitio → Resend | HTTPS, API key. Subdominio de correo con SPF, DKIM, DMARC; `List-Unsubscribe` en correos masivos | Salida |
| Resend → sitio | Webhooks de rebotes y quejas, verificados con el secreto de firma de Resend; ruta permitida en Access con una política Bypass acotada a esa ruta | Entrada |
| Sitio → ScreenProof | HTTPS `POST /v1/intake/sessions`, `GET /v1/intake/sessions/{id}`, `DELETE /v1/intake/candidates/{id}`, firmados con el secreto sitio→screener (`kid` + HMAC-SHA256 sobre timestamp y cuerpo) | Salida |
| ScreenProof → sitio | Cuatro webhooks firmados con el secreto screener→sitio; claves de idempotencia; guard de orden por `screened_at`; ventana de 300 segundos contra repeticiones. En staging, cabeceras de service token de Access | Entrada |
| ScreenProof → enlace del vocabulario | HTTPS GET del JSON de vocabulario publicado, con cabecera de versión; en staging vía service token de Access | Entrada |
| Sitio → RecruiterFlow | HTTPS con la API key propia de DieselJobsUSA. Tareas: leer los empleos abiertos de LaTrae para el Job Board; crear o encontrar candidatos (email, luego teléfono), etiquetar `DieselJobsUSA`, adjuntar la hoja de vida, llevar el estado de consentimiento y visibilidad. Reintentos con idempotencia para no crear un candidato dos veces; respeta los límites de la API (10 llamadas simultáneas) | Salida |
| Teléfono del candidato ↔ páginas del screener | La entrevista corre en las páginas de Trabian en un subdominio de DieselJobsUSA por acordar (por ejemplo `screen.dieseljobsusa.com`); el sitio pone el registro DNS, Trabian el certificado | — |
| Sitio → Sentry / Better Stack / healthchecks.io | HTTPS. Sentry recibe errores sin datos personales; healthchecks recibe un ping cuando termina cada tarea programada | Salida |

Reglas de diseño que salen de las decisiones:

- Un webhook se revisa por completo **antes** de responder: firma y timestamp (401 si fallan), versión mayor de `spec_version` (400 si es desconocida) y estructura del payload con zod (400 si no cumple el esquema). Un payload inválido se responde con error, para que los reintentos y la alerta de agotamiento del lado del screener se enteren. Solo cuando todo pasa, el evento crudo, la clave de idempotencia y el trabajo de la cola se guardan en una sola transacción, y entonces se responde 200. Un evento repetido (misma clave de idempotencia) o un `screen.completed` con `screened_at` no más nuevo que el guardado se responde 200 y no se encola. El procesamiento posterior nunca crea un candidato.
- El sitio envía `consents.sms: false` en la llamada de inicio hasta que el teléfono esté verificado, para que el screener nunca mande textos a un número sin confirmar. (Regla por confirmar con Trabian; ver sección 9.)
- La llamada de inicio solo se hace después de que la hoja de vida subida, si la hay, pasó el escaneo.
- Cada página del candidato se renderiza desde un tipo de modelo de vista que no puede llevar el nivel.
- La cookie de primera visita (id aleatorio, fecha de primera vez) alimenta tanto la etiqueta de origen de tráfico como el conteo de visitantes que vuelven; no guarda datos personales.

---

## 5. Entornos

| | Local | Staging | Producción |
|---|---|---|---|
| Dónde | Máquina del desarrollador; PostgreSQL+PostGIS y ClamAV en Docker; Node nativo | El droplet: usuario del sistema propio, base propia, archivo de entorno propio, puerto propio; clamd compartido | El droplet |
| Dirección | `localhost` | `staging.dieseljobsusa.com`, detrás de Cloudflare Access, `noindex` | `dieseljobsusa.com` (y la redirección desde `dieseljobusa.com`) |
| Secretos | `.env` local con valores de prueba | `.env` propio; buckets de R2 propios, configuración de dominio de Resend propia, claves de Twilio propias, secretos del screener propios | `.env` propio; el único lugar con claves reales |
| Screener | Screener falso del repositorio | Endpoint de prueba de Trabian; hasta que exista, el screener falso; los webhooks llegan a staging con un service token de Access | Endpoint real de Trabian; producción se niega a arrancar si apunta al falso |
| R2 | Adaptador a disco local o un bucket `dev` | `dju-staging-resumes`, `dju-staging-backups` | `dju-resumes`, `dju-backups` (con lock) |
| Email | Se registra en el log, no se envía | Se envía por Resend solo a direcciones del equipo | Real |
| SMS | Verify falso (el código sale en el log) | Twilio con una lista corta de números del equipo | Real |
| Datos | Solo inventados | Solo inventados | Reales |
| Despliegue | `npm run dev` | Automático al fusionar en `main` | Tag de versión + aprobación en GitHub |
| Monitoreo | Ninguno | Proyecto de staging en Sentry | Sentry, Better Stack, healthchecks.io |
| Backups | Ninguno | Ninguno | Nocturnos, cifrados, bucket con lock |

**Variable `APP_ENV`** (`development`, `test`, `staging`, `production`; decidido en T-01). Dice en qué entorno corre la app, independiente de `NODE_ENV`: staging corre con `NODE_ENV=production`, pero puede usar el screener falso. Las reglas que solo valen en producción (`HOST` = `127.0.0.1`, SEC-77; no apuntar al screener falso, decisión 24) se deciden con `APP_ENV=production`. **Candado:** `APP_ENV` es obligatoria y no tiene valor por defecto (si falta, la app no arranca), y si `NODE_ENV=production` solo puede ser `staging` o `production`; con cualquier otro valor la app no arranca. Así un proceso de producción mal configurado no puede quedar con las reglas de desarrollo.

Qué separa staging de producción en la misma máquina: un usuario de Linux y un directorio distintos, una base de datos y un rol distintos (el rol de staging no tiene ningún permiso sobre la base de producción, ni al revés), un `.env` distinto, un puerto y un nombre de proceso de PM2 distintos, buckets y tokens de R2 distintos, claves de terceros distintas y secretos del screener distintos. No se comparte nada salvo el sistema operativo, PostgreSQL y el daemon de ClamAV.

---

## 6. Qué entrega el milestone 1A y qué el 1B

Tomado del Contrato, Sprint 1. La división es lo que Toya revisa y financia.

### Milestone 1A: mockup y base

- El mockup aprobado de toda la plataforma: cada página, subpágina y componente, incluidas las pantallas de sprints posteriores, aprobado antes de construir nada.
- Servidor, PostgreSQL con PostGIS, almacenamiento privado de hojas de vida, email, backups cifrados de la base cada noche en el bucket propio de TL Turner Holdings, y el pipeline de despliegue.
- Resend en un subdominio de correo con SPF, DKIM y DMARC, y `List-Unsubscribe` en correos masivos.
- Login del staff con hash de contraseñas, sesiones del lado del servidor y reglas de acceso; la base de login a la que los Sprints 2 y 4 agregan roles.
- Despliegues atómicos: una release sale completa o no sale.
- Copia privada de staging, bloqueada a buscadores. `dieseljobusa.com` redirige a `dieseljobsusa.com`.

### Milestone 1B: páginas, roster y conexión con el screener

- Seis páginas con la marca: Home, Job Board (mostrando los empleos de LaTrae desde RecruiterFlow desde el día uno), Job Seekers, For Employers, About, Privacy and Terms (texto del abogado). Dos rondas de cambios por página; mobile first.
- Registro en tres pasos, página de siguientes pasos con enlace tokenizado de regreso, tabla de candidatos según Rev 8 (sin score), cada screen completado guardado, inicio de screen y webhooks firmados con idempotencia y guard de orden, propiedad de campos en re-screen, hoja de vida generada por URL firmada, `return_url`, barrido nocturno con alerta, el sitio funcionando sin el screener, email recordatorio.
- Historial de consentimientos, reglas de visibilidad y su registro, captura tardía del consentimiento, borrado que llega al screener y crea la tarea de RecruiterFlow, supresión de teléfono como hash con clave.
- Copia a RecruiterFlow como ajuste del panel; deduplicación por email y luego teléfono verificado; Twilio Verify con Turnstile; límites de subida de hojas de vida y ClamAV; ZIP a coordenadas con PostGIS y filtro "a X millas"; tabla de empresas con alias; vocabulario cargado del JSON y publicado en enlace privado; etiqueta de origen de tráfico; anti-spam en todos los formularios.
- Panel: candidatos, hojas de vida, exportación CSV, filtro por distancia, override de nivel por el staff (quién, cuándo, por qué; un screen posterior que discrepe marca el registro), carga del vocabulario con validación y vista previa, ajustes de la sincronización con RecruiterFlow y del email recordatorio.
- Para la revisión del Sprint 1: el esquema de la base de datos, el esquema de la estructura del robot de empleos y el formato del archivo de taxonomía.

---

## 7. Dependencias externas y qué se puede avanzar sin ellas

| Dependencia | Quién la entrega | Para qué hace falta | Qué avanza sin ella |
|---|---|---|---|
| Equipo de DigitalOcean, organización de GitHub, cuenta de Cloudflare, cuenta de Resend | Toya | La base de 1A; el reloj del Sprint 1 | Desarrollo local del modelo de datos, la lógica de registro, la integración con el screener contra el screener falso, el cargador de vocabulario, la tabla de ZIP; estructura del repositorio y CI en un repositorio temporal que se mueve a la organización cuando exista |
| Archivos de marca (colores, fuentes, logo) | Toya | El mockup; el clon del screener de Trabian | Estructura de páginas y componentes con estilo neutro; todo lo que no es visual |
| Diseño inicial y textos de las páginas | Toya | El mockup, luego las seis páginas | Mockup con textos provisionales |
| Textos de privacidad, términos y consentimientos | Abogado vía Toya | Páginas de Privacy/Terms; registros de consentimiento | Páginas con texto de relleno; el historial de consentimientos guarda el texto que se muestre, así que el texto final entra sin cambiar el esquema |
| API key de RecruiterFlow para DieselJobsUSA | Toya | Empleos en el Job Board; copia de candidatos | Conector construido contra la API documentada de RecruiterFlow con respuestas grabadas; se cambia a la clave real cuando llegue |
| Cuenta de Twilio a nombre de TL Turner Holdings | Toya (semana 2) | Verificación de teléfono | Flujo de verificación construido contra un cliente de Verify falso |
| Endpoint de prueba del screener, dos secretos, cuatro webhooks de muestra | Trabian | Conexión con el screener; el reloj del Sprint 1 | Construido contra el spec de integración usando el screener falso; se conecta cuando llegue el endpoint real |
| Subdominio y certificado del screener | Trabian con Toya | Que la entrevista abra en una dirección de DieselJobsUSA | Todo lo demás |
| Dirección de reenvío para `alerts@dieseljobsusa.com` | Toya | Cuentas de monitoreo | El monitoreo se configura cuando exista la dirección |
| Decisión de dónde se guardan los secretos maestros y la clave privada de backups | Toya | Configuración final de backups | Backups construidos y probados con un par de claves temporal |

---

## 8. Riesgos para el calendario de 15 días hábiles

| Riesgo | Efecto | Cómo se maneja |
|---|---|---|
| Las cuentas o los archivos de marca llegan tarde | El reloj no arranca, pero el mockup y el clon del screener esperan | Lo que no necesita ninguno de los dos empieza ya (sección 7). El clon de Trabian necesita solo los valores de color; mandarlos primero lo destraba |
| La revisión del mockup toma más de uno o dos días por ronda | Todo lo de 1B espera al mockup aprobado | Revisión en celular, una ronda a la vez, con lista clara de lo que cambió. Dos rondas por página están incluidas; las rondas extra se cotizan antes de hacerlas |
| El endpoint o las muestras de Trabian llegan tarde o difieren del spec | El trabajo de integración se corre al final del sprint | El screener falso mantiene la construcción en marcha; el primer día con el endpoint real se reserva para diferencias de contrato, y cualquier diferencia se resuelve según el spec de integración |
| El texto del abogado llega después de construidas las páginas | Privacy, Terms y los tres textos de casillas muestran relleno en la revisión | Las páginas y el historial de consentimientos aceptan el texto final sin cambios de código; el sitio no sale al público hasta tener el texto final |
| Crecimiento de alcance en la revisión del mockup | Más páginas o flujos de los que lista el Contrato | Lo que esté fuera del Contrato se cotiza antes de construirlo |
| Memoria de ClamAV en un droplet compartido | Escaneos que fallan o servidor que usa swap | Droplet de 4 GB, `ConcurrentDatabaseReload no`, swap de 2 GB, memoria revisada el día uno de 1A |
| Sorpresas con las herramientas de Node 24 / TypeScript 6 / Vitest 5 | Horas perdidas en configuración del build | La cadena de herramientas se prueba en CI el día uno de 1A; cualquier paquete que falle se baja a su línea anterior mantenida |
| Cloudflare Tunnel, Access y service tokens mal configurados | Webhooks bloqueados, staging inaccesible | Se configura y prueba en 1A con el screener falso antes de empezar 1B; el esquema de firewall más Authenticated Origin Pulls es el plan B documentado |
| La API de RecruiterFlow se comporta distinto de su documentación | Job Board o copia de candidatos se atrasan | Conector probado primero con llamadas de solo lectura; las escrituras detrás del ajuste del panel |
| Un solo desarrollador | Enfermedad o interrupciones golpean el calendario directo | Commits diarios, CI siempre en verde, documentación escrita mientras se trabaja para que nada viva solo en una cabeza |
| Los entregables de la revisión (esquema de base, estructura del robot, formato de taxonomía) quedan apretados al final | La revisión empieza sin ellos | Reservados para los días 14 y 15; el esquema de la base se genera desde el esquema que ya está en el repositorio |

---

## 9. Preguntas abiertas

Las preguntas ya respondidas durante la planificación no se repiten. "Se necesita para" cuenta días hábiles desde el día en que arranca el reloj del Sprint 1 (día 1).

### Para Toya

| Pregunta | Qué bloquea si no llega | Se necesita para |
|---|---|---|
| Las cuatro cuentas (equipo de DigitalOcean, organización de GitHub, Cloudflare, Resend), con Sergio invitado | La base de 1A y el reloj mismo | Antes del día 1 |
| Archivos de marca: valores de color, fuentes, logo | El mockup y el clon del screener de Trabian (él necesita solo los colores) | Día 1 |
| Diseño inicial y textos de las seis páginas | Las páginas finales; el mockup puede usar textos provisionales | Día 5 |
| Una API key de RecruiterFlow creada para DieselJobsUSA (no la que usa latraeconsulting.com) | Los empleos en el Job Board; la copia de candidatos | Día 5 |
| El botón "Apply" en los empleos de LaTrae en 1B, antes de que exista el quick apply: la propuesta es que lleve al registro con el empleo anotado en el candidato, para que el staff vea qué puesto quería. Agregarlo al empleo en RecruiterFlow es el quick apply del Sprint 2 | La página de detalle del Job Board | Revisión del mockup |
| El desplegable de oficio en el registro: los 39 valores del vocabulario agrupados en sus 12 grupos | El formulario de registro | Revisión del mockup |
| Dónde vivirán las copias maestras de todos los secretos y la clave privada de backups (por ejemplo, el gestor de contraseñas de TL Turner Holdings), y quién las custodia | Configuración final de backups; custodia de claves | Día 3 |
| ¿TL Turner Holdings es dueña de `dieseljobusa.com`? Ambos dominios necesitan su DNS en la cuenta de Cloudflare | La redirección; DNS para correo y staging | Día 1 para el dominio principal; en cualquier momento de 1A para el otro |
| A qué dirección de Toya se reenvía `alerts@dieseljobsusa.com` | Cuentas de monitoreo | Día 2 |
| Usuarios del staff para el Sprint 1: nombres, emails y qué puede hacer cada uno | Login del staff y reglas de acceso | Día 5 |
| ¿Las páginas del sitio son solo en inglés? (La entrevista ofrece inglés y español; los documentos no dicen nada de las páginas) | Construcción de páginas | Revisión del mockup |
| Cuenta de Twilio a nombre de TL Turner Holdings | Verificación de teléfono en staging | Semana 2 (día 6) |
| Nombre del subdominio de correo (por ejemplo `mail.dieseljobsusa.com`) y las direcciones From y Reply-To | Configuración de Resend | Día 2 |
| Cuándo se crea la copia en RecruiterFlow (al paso 1, tras verificar el teléfono, o tras el screen), si se refresca cuando un screen cambia campos, y cómo deben verse consentimiento y visibilidad en el registro de RecruiterFlow (etiquetas o campos) | La tarea de sincronización | Día 7 |
| Su respuesta al plan para los empleos de LaTrae en los dos dominios (enviado el 27 oct) | Nada del Sprint 1; el Sprint 3A | Antes del Sprint 3A |

### Para el abogado (vía Toya)

| Pregunta | Qué bloquea si no llega | Se necesita para |
|---|---|---|
| Política de privacidad, términos y el texto exacto de las tres casillas de consentimiento | Las páginas muestran relleno; los registros de consentimiento guardan texto provisional | Día 10 para la revisión; definitivo antes del lanzamiento público |
| ¿Se pueden copiar a RecruiterFlow los candidatos que no marcaron "share my profile"? | El valor por defecto del ajuste de sincronización; la lista de limpieza | Antes del lanzamiento |
| ¿Puede alguna casilla venir premarcada? (Por defecto hasta que responda: desmarcada) | Valor por defecto del formulario | Antes del lanzamiento |
| ¿Puede el email recordatorio ir a quien no marcó el consentimiento de email? (Por defecto hasta que responda: no) | Valor por defecto del recordatorio | Antes del lanzamiento |
| Retención tras el borrado: qué debe conservarse, si algo, como prueba de consentimiento o de baja, y por cuánto tiempo | El camino de borrado | Día 8 |
| La cláusula de transferencia en caso de venta y el período de retención para los términos | Página de Terms | Antes del lanzamiento |

### Para Trabian

| Pregunta | Qué bloquea si no llega | Se necesita para |
|---|---|---|
| El endpoint de prueba, los dos secretos compartidos (uno por dirección) y una muestra real de cada uno de los cuatro webhooks | El reloj; la conexión real (el screener falso cubre el desarrollo) | Día 1 |
| Confirmación de que su lado implementa el §7 del spec de integración tal cual: secreto aparte para las llamadas sitio→screener, `kid` con dos secretos válidos a la vez, cabecera de timestamp, reintentos con la misma clave de idempotencia, 400 ante una versión mayor desconocida | El receptor de webhooks y el `DELETE` firmado | Día 5 |
| Formato **exacto** de la cabecera de firma: el spec §7 muestra `sha256=<hex>` en una fila y `kid=k1,sha256=<hex>` en otra. El sitio acepta solo `kid=<id>,sha256=<hex>` (hex de 64, sin espacios, siempre con `kid`; SEC-03) y responde 401 a lo demás | El receptor de webhooks (T-07) | Día 5 |
| Cada **reintento** de un webhook se firma con un timestamp nuevo. Si reutilizan el de la primera entrega, todo reintento después de 300 s se rechaza para siempre (SEC-05) y el evento se pierde | El receptor de webhooks y las alertas | Día 5 |
| El secreto screener→sitio debe tener **al menos 32 caracteres** (el spec dice "30+"; el sitio exige 32 al arrancar, SEC-06). Puede ser cualquier texto sin `,`; no hace falta que sea hex | El `.env` del receptor | Día 1 |
| La respuesta de `GET /v1/intake/sessions/{id}`: debe traer el resultado completo, y el spec no define su forma | El barrido nocturno | Día 8 |
| Cómo nos llega la alerta de "reintentos agotados" (email a `alerts@`, o un webhook) | Alertas | Día 8 |
| Qué ve el sitio cuando el screener no está disponible (códigos de estado, timeouts) | Manejo de errores en la llamada de inicio | Día 5 |
| El parámetro exacto de `return_url` y si agrega algo al devolver al candidato | La página de regreso | Día 5 |
| Quién manda el texto con el enlace de la entrevista y el texto de "vuelve y termina", desde qué número (número dedicado y registro son decisión suya antes del lanzamiento), y confirmación de que no sale ningún texto mientras el sitio envíe `consents.sms: false` por un teléfono sin verificar | Reglas de textos | Día 5 |
| El subdominio donde viven las páginas de la entrevista (por ejemplo `screen.dieseljobsusa.com`): el sitio agrega el registro DNS, él instala el certificado | Que la entrevista abra en una dirección de DieselJobsUSA | Día 5 |
| Cómo va a leer su servidor el enlace del vocabulario (en staging necesita cabeceras de service token de Access) | El vocabulario compartido | Día 7 |
| Confirmación de que el screener agrega el empleador actual a `hide_from_employers` por defecto, como dice el Rev 8 | La lista de ocultos | Día 7 |
| Si su `DELETE` también borra hojas de vida generadas y transcripciones | El camino de borrado | Día 8 |
| El formato de la hoja de vida generada (`resume.generated` dice PDF; `screen.completed` no lo dice) | Almacenamiento de hojas de vida | Día 7 |
