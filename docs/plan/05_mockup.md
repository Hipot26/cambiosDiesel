# DieselJobsUSA — El mockup de toda la plataforma

Versión 1.1 · 30 de octubre de 2026 · Documento de trabajo de Sergio Duran

## 1. Qué es y por qué va primero

El mockup es el primer entregable del milestone 1A del Contrato: "el mockup aprobado de toda la plataforma: cada página, subpágina y componente, aprobado antes de construir nada" ("approved before anything is built"), lo que incluye las pantallas de los sprints posteriores. Por eso va antes que cualquier otra tarea de páginas: ninguna página se construye con marca hasta que Toya apruebe su pantalla del mockup.

**Cómo está hecho.** Páginas estáticas en la carpeta `mockup/` del repositorio: componentes y páginas TSX de Preact convertidos a HTML con `preact-render-to-string` en un script de build, más Tailwind 4 con su CLI. Es el mismo stack de las páginas reales (01 decisiones 3 y 5), a propósito: lo que Toya aprueba se muda a `src/views/` en T-24, T-37 y T-41 sin reescribir. Sin base de datos, sin servicios externos, sin JavaScript en el navegador (tanda 1); fuera del paquete de producción, como `fake-screener/`.

Esto decide la decisión 29 de `01_arquitectura.md` (estaba abierta) y cambia la tarea T-37 de `04_tareas.md`, que deja de depender del staging (T-36). Decisión de Sergio, 30 de octubre de 2026.

## 2. Condiciones de publicación

- **Temporal, en un servidor de Sergio**, con **usuario y contraseña**, hasta que exista el staging de Toya; entonces el mockup se sirve desde staging detrás de Cloudflare Access. Configurar ese servidor no es parte de la construcción del mockup.
- **noindex en todo**: cada página lleva `<meta name="robots" content="noindex, nofollow">` y hay un `robots.txt` con `Disallow: /`.
- **Solo datos inventados**: oficios y equipos del vocabulario, empresas inventadas (salvo LaTrae Consulting Group), ZIP y ciudades reales, ninguna persona real.
- **Colores provisionales** derivados del Candidate Walkthrough (azul marino `#13233A`, un único rojo `#E4002B` — 3.26:1 sobre el azul marino y 4.85:1 bajo texto blanco; "Exact red to be confirmed with the brand files" —, grises de Tailwind, fuentes del sistema), marcados PROVISIONAL en `mockup/styles/tokens.css`, hasta que lleguen los archivos de marca.
- Todo el texto en inglés (lo lee Toya); el copy es propio y provisional y se marca como placeholder donde irá el texto de Toya o del abogado.

## 3. Las siete tandas

Cada tanda se dibuja, se revisa con Toya y se corrige antes de pasar a la siguiente. Las tandas 1 a 4 cubren lo que el Sprint 1 construye; las 5 a 7 dibujan los sprints posteriores con menos detalle (el Contrato pide que el mockup incluya esas pantallas, no que estén igual de desarrolladas). El detalle pantalla por pantalla, cotejado con el Contrato, está en el inventario de la sección 9.

### Tanda 1 · Sitio público (hecha, ronda 1)

1. Cabecera y pie, una vez cada uno y a todo el ancho: el header es responsivo y el menú del celular (un `<details>`) se ve al angostar la ventana o abrir en un teléfono, sin estados simulados en cajas.
2. Home.
3. Job Board en dos estados: (a) como sale en el Sprint 1 (solo empleos de LaTrae, los más recientes primero, sin filtros); (b) completo (filtros por rol, oficio, ubicación, tipo de equipo y tipo de trabajo del 3A; destacados arriba, que marca el staff desde el 3B y compra un empleador en el Sprint 4; roles de LaTrae y roles agregados del 3B). Cada pieza con su etiqueta de sprint.
4. Detalle de empleo en dos versiones: (a) rol de LaTrae con "Apply" hacia `/signup?job=…` (propuesta pendiente de Toya: en el Sprint 1, Apply lleva al registro con el empleo anotado; el quick apply llega en el Sprint 2); (b) rol agregado con la empresa real, lo esencial y "Apply on company site" hacia afuera, sin copiar la descripción completa.
5. Job Seekers, For Employers y About.
6. Privacy y Terms con estructura y relleno "Attorney's wording goes here".

### Tanda 2 · Registro del técnico

- Formulario de registro: seis campos, tres casillas de consentimiento **desmarcadas**, Turnstile, desplegable de oficio con los 39 valores en sus 12 grupos.
- Pantalla del código SMS, con reenvío y el texto único para duplicados.
- Página de siguientes pasos en sus estados: sin hoja de vida (subir primero, "build one for me" debajo), subiendo, escaneando, lista; screen sin empezar, en curso, abandonado (con enlace de retomar), completado ("Verified").
- Regreso de la entrevista ("gracias, estamos guardando tu resultado").
- Enlaces vencidos o ya usados (token de regreso, confirmación de borrado).
- Borrar mi registro (dos pasos con email de confirmación).
- Baja de correos (página del token de unsubscribe).

### Tanda 3 · Correos

Las plantillas en HTML y texto plano, solo marca DieselJobsUSA: enlace de regreso, recordatorio de screen sin terminar (con la baja de un clic, `List-Unsubscribe`), aviso de registro duplicado, confirmación de borrado y "tu screen está listo", más el informe interno del barrido nocturno a Toya y Sergio. Mismos componentes TSX que usará T-20.

### Tanda 4 · Panel de Toya (Sprint 1)

Login (detrás de Access), lista de candidatos con filtros (nivel con override, oficio, distancia "a X millas", estado del screen, visibilidad), ficha del candidato (registro, historial de screens, consentimientos, visibilidad, archivos, overrides), override de nivel con motivo, exportación CSV, descarga de hoja de vida, empresas y alias, carga del vocabulario con vista previa, cola de no mapeados, ajustes (sincronización con RecruiterFlow, email recordatorio), tareas del staff, auditoría y usuarios.

### Tanda 5 · Sprints 3A y 3B (sencilla)

Búsqueda y filtros completos del Job Board, páginas por estado, ciudad y oficio, y las alertas básicas por email (3A); fuentes del feed, tabla de empleos, lista de exclusión, cola de agencias, vista previa de la taxonomía y cola de títulos sin oficio (3B).

### Tanda 6 · Sprint 2 (sencilla)

Inicio de sesión y cuenta del técnico, perfil con el interruptor de visibilidad, empleos y búsquedas guardados, quick apply, y la búsqueda de candidatos del panel (staff). Las cuentas de empleador y su búsqueda de candidatos **no** son del Sprint 2: son del Sprint 4 o de una fase posterior.

### Tanda 7 · Sprint 4 (sencilla)

Registro y panel del empleador, publicación guiada con aprobación de LaTrae, pago con Stripe (incluido el destacado), sus correos, y las colas y reportes del panel con las métricas del Contrato.

## 4. Reglas para que lo aprobado se reutilice tal cual

1. Componentes de Preact puros, con props tipadas, sin estado global ni lógica de datos.
2. Listos para la CSP de SEC-65: cero `<script>` inline, cero atributos `style=`, cero `on…=`, nada de CDN ni fuentes externas. En la tanda 1 no hay JavaScript: el menú del celular usa `<details>`.
3. Colores, tipografías, radios y sombras como tokens `@theme` en un solo archivo (`mockup/styles/tokens.css`) con comentario PROVISIONAL. Ningún color hex fuera de ese archivo (hay prueba).
4. Las props de las páginas públicas tienen la forma de los modelos de vista futuros (`PublicJobView` en `mockup/data/types.ts`), y ninguna página que vea el técnico tiene un campo `level` (SEC-55).
5. Lo que es solo del mockup (la barra "MOCKUP · provisional colours · sample data", la etiqueta de sprint de cada pieza y las notas de revisión) vive en componentes aparte (`mockup/mockup-ui/MockupFrame.tsx`, `MockupTag.tsx`), nunca dentro de los componentes del sitio.
6. Mobile first: se diseña a 375 px y se amplía hacia arriba. Botones y campos de 44 px de alto como mínimo, contraste AA, HTML semántico, `label` en cada campo y foco visible.
7. Si el mockup muestra un dato que el modelo de 03 §1 todavía no tiene (hoy: equipos y rango de pago en `jobs`), se anota en la nota de revisión de esa página y en el reporte de la sesión; nunca se agrega al modelo en silencio.

## 5. Correcciones obligatorias respecto al Walkthrough

Valen para todas las tandas y tienen prueba automática desde la tanda 1:

- Los empleos de LaTrae muestran la empresa **"LaTrae Consulting Group"** con la etiqueta de rol alojado (hosted role). **Nunca "Confidential employer".**
- El técnico **nunca ve su nivel**; solo "Verified".
- Las **tres casillas** del registro vienen **desmarcadas**.
- **No aparece "pay now"** ni el pago actual en ningún lado.
- La página de siguientes pasos **no promete funciones del Sprint 2**.
- Las pantallas de la entrevista **son de Trabian y no van en el mockup**.

## 6. Cómo se construye y cómo se revisa

**Construir y ver:**

```
npm run mockup:build    # renderiza las páginas y compila el CSS en mockup/dist/ (en .gitignore)
npm run mockup:dev      # reconstruye al guardar y sirve en 127.0.0.1:4173
npm run mockup:dev -- --host    # además lo expone en la red local, para verlo desde el celular
npm run mockup:shots    # capturas de cada página a 375, 768, 1280 y 1920 px en mockup/shots/
```

Las capturas sirven para revisar el diseño en todos los anchos sin abrir el navegador (requieren `npx playwright install chromium` una vez). `mockup/shots/` está en `.gitignore`: las capturas nunca se commitean.

El servidor de desarrollo solo entrega archivos de `mockup/dist/` (solo GET y HEAD, rutas resueltas y contenidas con `path.relative`, tipos de contenido de una lista fija), porque con `--host` queda expuesto en la red local.

**El índice** (`/`) lista todas las pantallas por tanda y sprint, con una línea por pantalla, el número de ronda y la sección "What changed". Cada pantalla lleva su barra de mockup y sus notas de revisión plegables: lo que Toya debe confirmar con esa pantalla.

**Rondas.** Dos rondas de cambios por página están incluidas (Contrato). Cada ronda entrega la lista de lo que cambió en "What changed" del índice y sube el número de ronda. Las rondas extra se cotizan antes de hacerse.

**Pruebas automáticas** (`tests/mockup/`, corren con `npm test` construyendo el mockup en una carpeta temporal): meta noindex en toda página; cero `<script>`, `style=`, `on…=` y recursos externos; todo enlace interno lleva a una página que existe; "Confidential employer", "pay now", "current pay" y el patrón "Level A/B/C" no aparecen; ninguna casilla marcada; ningún color hex fuera de `tokens.css`; todo oficio y equipo de los datos existe en el vocabulario; el servidor no sale de `dist` y responde 400 a rutas mal formadas. Van nombradas "mockup: …" porque **no implementan** los controles de 02_seguridad.md (los preparan); nada del mockup se marca como implementado ahí.

## 7. Cómo se protege el alcance

Lo que Toya pida en la revisión y esté fuera del Contrato **se anota y se cotiza antes de dibujarlo** (Contrato, "Terms"; 01 §8 "Crecimiento de alcance"). La nota va en "What changed" del índice con la etiqueta "out of scope — quoted separately", y el trabajo no empieza hasta que la cotización se apruebe.

## 8. Qué tareas esperan la aprobación del mockup

La aprobación por tanda destraba construcción real:

| Tanda aprobada | Destraba |
|---|---|
| 1 · Sitio público | T-24 (páginas reales con los componentes aprobados) |
| 2 · Registro | T-11 (registro y verificación), T-13 (enlaces de regreso, `/account`, baja) |
| 3 · Correos | T-20 (plantillas de email) |
| 4 · Panel | T-15 (login y roles), T-16 (candidatos, export), T-18 (fusión), T-19 (empresas, vocabulario, ajustes) |

T-37 (vestir con la marca real) espera además los archivos de marca de Toya; T-41/T-42/T-43 (1B) esperan el mockup aprobado completo.

## 9. Inventario de pantallas

La lista exacta de pantallas que promete el Contrato: **el mockup está completo cuando toda fila está dibujada y aprobada por Toya**. Una tabla por tanda, con una fila por pantalla o estado. La columna Contrato resume en español la línea que la fila cubre, con su sección; el texto original vive en `docs/context/` y nunca se copia aquí. El índice del mockup lleva este mismo inventario en inglés, una entrada por pantalla con sus estados como sub-lista.

### Tanda 1 · Sitio público (dibujada, ronda 1)

| Pantalla o estado | Qué muestra | Sprint | Contrato |
|---|---|---|---|
| Cabecera y pie | El marco común, responsivo; menú del celular sin JavaScript | 1 | 1B Páginas: seis páginas en la marca, mobile first |
| Home | Hero, cómo funciona, últimos empleos y oficios | 1 | 1B Páginas: Home |
| Job Board — como sale en el Sprint 1 | Solo roles de LaTrae, los más recientes primero, sin filtros | 1 | 1B Páginas: el Job Board abre con los roles de RecruiterFlow de LaTrae |
| Job Board — completo | Filtros, destacados y roles agregados, cada pieza etiquetada | 1 + 3A + 3B | 3A: búsqueda y filtros; 3B: conectores (roles agregados); Sprint 4: destacado pagado |
| Detalle de empleo — LaTrae (hosted) | Rol alojado con la propuesta de Apply (registro con el empleo anotado) | 1 | 1B Páginas: roles de LaTrae en el board |
| Detalle de empleo — agregado | Empresa real, lo esencial, "Apply on company site" | 3B | 3A: los agregados muestran lo esencial y enlazan a la publicación original |
| Job Seekers | Qué recibe el técnico y qué significa "Verified" | 1 | 1B Páginas: Job Seekers |
| For Employers | Roles alojados hoy; cuentas y destacados marcados como futuros | 1 | 1B Páginas: For Employers |
| About | Historia corta del sitio (placeholder) | 1 | 1B Páginas: About |
| Privacy | Estructura con el texto del abogado pendiente | 1 | 1B Páginas: Privacy y Terms con el texto del abogado |
| Terms | Igual que Privacy | 1 | 1B Páginas: Privacy y Terms con el texto del abogado |

### Tanda 2 · Registro y cuenta del técnico (dibujada, ronda 1)

| Pantalla o estado | Qué muestra | Sprint | Contrato |
|---|---|---|---|
| Formulario de registro — paso 1 | Seis campos; tres casillas desmarcadas (nota: el texto lo decide el abogado; hasta entonces, desmarcadas); Turnstile; oficio con los 39 valores en sus 12 grupos; hoja de vida opcional | 1 | 1B Registro: registro en tres pasos, seis campos más tres consentimientos |
| Formulario — llegando desde "Apply" | El empleo anotado en el formulario | 1 | 1B Páginas: propuesta de Apply del Sprint 1 (tanda 1) |
| Formulario — errores de campo | Validación por campo sin perder lo escrito | 1 | 1B Registro: registro en tres pasos |
| Código SMS — ingresar | El código de Twilio Verify; para todos, el texto idéntico "Didn't get a code? If you'd registered before, we emailed you a link" (SEC-48) | 1 | 1B Integraciones: verificación por Twilio Verify; deduplicación por email |
| Código SMS — reenviar | Reenvío con su límite | 1 | 1B Integraciones: SMS con límite de tasa |
| Código SMS — código incorrecto | Error sin revelar nada más | 1 | 1B Integraciones: verificación por Twilio Verify |
| Código SMS — demasiados intentos | "Pide un código nuevo" | 1 | 1B Integraciones: SMS con límite de tasa |
| Código SMS — no podemos enviar textos | "Sigue por email": el candidato ya quedó guardado en el paso 1 | 1 | 1B Integraciones: el candidato sin verificar sigue alcanzable por email |
| Siguientes pasos — sin empezar | Subir hoja de vida como acción principal, "build one for me" debajo; sin promesas del Sprint 2 | 1 | 1B Registro: siguientes pasos con subir primero y build one for me debajo |
| Siguientes pasos — archivo en revisión | "Revisando tu archivo" (escaneo) | 1 | 1B Integraciones: la hoja de vida se retiene hasta estar limpia |
| Siguientes pasos — archivo rechazado | Sube otro archivo | 1 | 1B Integraciones: la hoja de vida se retiene hasta estar limpia |
| Siguientes pasos — teléfono sin verificar | Ofrece verificar cuando el servicio vuelve | 1 | 1B Integraciones: alcanzable por email mientras tanto |
| Siguientes pasos — screen empezado | Retomar la entrevista | 1 | 1B Screening: inicio del screen y return_url |
| Siguientes pasos — abandonado | "Te faltan N preguntas" con el enlace de retomar | 1 | 1B Screening (retomar según la spec de integración, 03 §4.6) |
| Siguientes pasos — screener no disponible | "Te avisamos por email"; el sitio sigue capturando candidatos | 1 | 1B Screening: el sitio sigue funcionando sin el screener |
| Siguientes pasos — límite de 30 días | Cuándo puede volver a hacer el screen | 1 | Spec de integración vía 03 §4.5 (límite de re-screen) |
| Siguientes pasos — completado | "Verified on <fecha>", nunca el nivel | 1 | 1B Back office: fecha de verificación en el registro; el nivel nunca al técnico (SEC-55) |
| Tarjeta de paso — entrevista | "Interview runs on Trabian's ScreenProof pages": no es diseño nuestro (§5), solo muestra el recorrido completo | 1 | 1B Screening: inicio del screen por nuestra cuenta, entrevista de Trabian |
| Regreso de la entrevista — guardando | "Gracias, estamos guardando tu resultado" | 1 | 1B Screening: return_url de vuelta al sitio |
| Regreso — verificado | El resultado ya llegó | 1 | 1B Screening: resultados por webhook firmado |
| Regreso — resultado pendiente | El webhook no ha llegado todavía; el texto no promete un correo hasta decidirlo (p. ej. "Your result will show on this page. Come back any time with the link in your email.") | 1 | 1B Screening: el barrido nocturno recupera resultados |
| Enlace vencido o inválido | Con el formulario "pide un enlace nuevo" | 1 | 1B Registro: enlace de regreso tokenizado |
| Confirmar borrado — botón | El token se gasta en el POST | 1 | 1B Privacidad: ruta de borrado desde el día uno |
| Confirmar borrado — hecho | El borrado quedó en marcha | 1 | 1B Privacidad: ruta de borrado desde el día uno |
| Borrar mi registro — pedirlo | Desde /account | 1 | 1B Privacidad: ruta de borrado desde el día uno |
| Borrar mi registro — "revisa tu email" | Confirmación en dos pasos | 1 | 1B Privacidad: ruta de borrado desde el día uno |
| Baja de correos — botón | La página del token de unsubscribe | 1 | 1A: List-Unsubscribe en el correo masivo |
| Baja de correos — listo | Confirmación de la baja | 1 | 1A: List-Unsubscribe en el correo masivo |

### Tanda 3 · Correos (HTML y texto plano; solo marca DieselJobsUSA)

| Pantalla o estado | Qué muestra | Sprint | Contrato |
|---|---|---|---|
| Enlace de regreso | El enlace tokenizado que vuelve a abrir la sesión | 1 | 1B Registro: enlace de regreso tokenizado |
| Recordatorio (nudge) | Con la baja de un clic | 1 | 1B Screening: nudge a quien no terminó su screen |
| Aviso de registro duplicado | La respuesta idéntica de SEC-48, por correo | 1 | 1B Integraciones: deduplicación por email y teléfono verificado |
| Confirmar borrado | El enlace que abre la página de confirmación | 1 | 1B Privacidad: ruta de borrado |
| "Tu screen está listo" | Cuando el screener estaba caído al empezar y ya se puede hacer el screen, con el enlace para empezar (03 §5.8) | 1 | 1B Screening: el sitio sigue capturando candidatos con el screener caído |
| Informe interno del barrido nocturno | A Toya y Sergio: screens atascados y recuperados | 1 | 1B Screening: barrido con alerta a Toya y Sergio |

### Tanda 4 · Panel de Toya (Sprint 1)

La pantalla de Cloudflare Access que aparece antes del login es de Cloudflare y no se dibuja.

| Pantalla o estado | Qué muestra | Sprint | Contrato |
|---|---|---|---|
| Login del panel — normal | Email y contraseña detrás de Access | 1 | 1A: login del staff con hash de contraseña y sesiones de servidor |
| Login — error | Mensaje único, sin revelar qué falló | 1 | 1A: login del staff |
| Login — bloqueado | Tras demasiados intentos | 1 | 1A: login del staff |
| Candidatos — lista con filtros | Nivel (usa el override), oficio confirmado, a X millas de un ZIP, certificaciones, CDL, software, verificado desde, pasó a visible desde, estado del screen, visibilidad, needs_review; ocultos marcados | 1 | 1B Back office: primeras pantallas de candidatos; 1B Integraciones: filtro de millas por ZIP; 1B Visibilidad: quién se volvió visible esta semana es un filtro del panel |
| Candidatos — exportar CSV | Exportación de lo filtrado | 1 | 1B Back office: export CSV |
| Ficha del candidato | Datos del registro; historial de screens, de consentimientos y de visibilidad; empresas ocultas; origen de tráfico (referrer y UTM de la primera visita) | 1 | 1B: cada screen guardado como llegó; consentimientos como historial permanente; interruptores logueados en ambos sentidos; cada registro etiquetado con su origen |
| Ficha — hojas de vida | Con descarga (enlace firmado de 1 hora) | 1 | 1B Back office: resumes; URL firmada con vencimiento |
| Ficha — override de nivel | Con motivo: quién, cuándo y por qué; needs_review cuando un screen posterior no coincide | 1 | 1B Back office: override con quién/cuándo/por qué y la marca del desacuerdo |
| Ficha — cambio de visibilidad | Por el staff, con la captura tardía del consentimiento share | 1 | 1B Visibilidad: captura tardía con el texto vigente (el interruptor del candidato es Sprint 2, 01 §decisiones; se confirma con Toya en la revisión) |
| Ficha — iniciar screen | Desde el panel | 1 | 1B Screening: inicio del screen |
| Ficha — borrar | Confirmación en dos pasos | 1 | 1B Privacidad: el borrado se extiende al screener y encola la tarea de RecruiterFlow |
| Ficha — copia en RecruiterFlow | Estado de la sincronización y reintento manual | 1 | 1B Integraciones: copia a RecruiterFlow etiquetada DieselJobsUSA |
| Empresas — lista | Con alias y revisión directa o agencia | 1 | 1B Integraciones: una sola tabla de empresas con alias |
| Empresas — fusión | Unir duplicados de empresa | 1 | 1B Integraciones: una sola tabla de empresas con alias |
| Vocabulario — versiones | Las versiones y cuál está activa | 1 | 1B Integraciones: vocabulario cargado del JSON, nunca hardcodeado |
| Vocabulario — subir | Carga de un archivo nuevo | 1 | 1B Integraciones: vocabulario cargado del JSON |
| Vocabulario — vista previa | Advertencias y bloqueos antes de activar | 1 | 1B Integraciones: lo que no mapea se retiene, nunca se bota |
| Vocabulario — activar | Confirmación de activación | 1 | 1B Integraciones: vocabulario cargado del JSON |
| No mapeados — cola | Valores retenidos para revisión | 1 | 1B Integraciones: lo que no mapea se retiene para revisión |
| Tareas — lista | Tareas del staff (p. ej. limpieza en RecruiterFlow tras un borrado) | 1 | 1B Privacidad: el borrado encola una tarea para la copia |
| Tareas — fusión de duplicados | Lado a lado, con elección por campo | 1 | 1B Integraciones: deduplicación por email y teléfono verificado |
| Tareas — mantener separados | La fusión se puede rechazar | 1 | 1B Integraciones: deduplicación |
| Ajustes (owner) | Copia a RecruiterFlow, recordatorio, descarga de hojas generadas, tope diario de SMS | 1 | 1B Integraciones: la sincronización es un ajuste que cambia sin código |
| Ajustes — lista de limpieza | Si el abogado dice "solo con consentimiento": lo ya copiado sin él | 1 | 1B Integraciones: la limpieza queda como tarea de una sola vez |
| Usuarios (owner) | Alta y baja del staff | 1 | 1A: la base de login sobre la que montan los roles de los Sprints 2 y 4 |
| Cambiar mi contraseña | Del propio usuario del panel | 1 | 1A: login del staff |
| Auditoría (owner) | Quién hizo qué | 1 | Sprint 2: auditoría de quién exportó o cambió qué (se dibuja desde el Sprint 1) |

### Tanda 5 · Sprints 3A y 3B (sencilla)

| Pantalla o estado | Qué muestra | Sprint | Contrato |
|---|---|---|---|
| Búsqueda — filtros funcionando | Rol, oficio, ubicación, tipo de equipo y tipo de trabajo | 3A | 3A: búsqueda y filtros |
| Búsqueda — sin resultados | Estado vacío | 3A | 3A: búsqueda y filtros |
| Páginas por estado, ciudad y oficio | Landing pages | 3A | 3A: landing pages por estado, metro y rol |
| Empleo vencido | Muestra empleos parecidos abiertos | 3A | 3A: los vencidos se retiran limpiamente en el mismo ciclo |
| Alertas — aviso en la página del técnico | "You'll get new jobs for your trade within X miles of your ZIP": llegan solas al roster con hoja de vida y consentimiento de email, sin formulario de suscripción | 3A | 3A: alertas básicas por email, sin cargo y sin cuenta |
| Alertas — correo de alerta | Los empleos nuevos del oficio | 3A | 3A: alertas básicas por email |
| Alertas — baja de un toque | Por el enlace tokenizado | 3A | 3A: baja de un toque sin cuenta |
| Fuentes | Última corrida y salud de cada fuente | 3B | 3B: pantalla de fuentes con cuándo corrió y qué devolvió |
| Tabla de empleos | Todos los listados de todas las fuentes: destacar, editar, quitar, retenidos | 3B | 3B: tabla con destacar, editar o quitar |
| Lista de exclusión | Con variantes de nombre | 3B | 3B: exclusión con variantes, aplicada antes de publicar |
| Cola de agencias | Empresas nuevas marcadas direct o agencia; retenidas hasta revisar | 3B | 3B: cola de agencias; lo no revisado se retiene, no se publica y se baja |
| Vista previa de la taxonomía | Qué entra y qué sale con un cambio, y la regla que decidió cada empleo (incluida la regla HVAC) | 3B | 3B: taxonomía como archivo, con vista previa y regla registrada; regla HVAC |
| Cola de títulos sin oficio | Títulos que no mapean a un oficio | 3B | 3B: el título que no mapea va a la cola de revisión |
| Configuraciones de empleadores | Una fila por empleador del feed | 3B | 3B: primeras diez configuraciones, refrescadas cada seis horas |
| Correo — fuente caída | La alerta del monitor de salud | 3B | 3B: monitor de salud con alertas |

### Tanda 6 · Sprint 2: cuentas del técnico (sencilla)

| Pantalla o estado | Qué muestra | Sprint | Contrato |
|---|---|---|---|
| Iniciar sesión | Google, email y contraseña, enlace mágico | 2 | Sprint 2: sign in sobre la base de login del Sprint 1 |
| Crear cuenta | Alta de la cuenta del técnico | 2 | Sprint 2: cuentas del candidato |
| Perfil | Hoja de vida en archivo y los campos que él puede editar | 2 | Sprint 2: resume on file y gestión del perfil |
| Perfil — mis consentimientos | Email, textos y compartir: los cambia el candidato y los cambios llegan al screener | 2 | Sprint 2: sincronización de consentimientos al screener |
| Interruptor de visibilidad | "Employers can find you / can't find you", con la captura tardía del consentimiento | 2 | 1B Visibilidad (las reglas) + Sprint 2 (el interruptor en el perfil) |
| Ocultarse de empresas | La actual por defecto, por registro de empresa | 2 | Sprint 2: hide from named employers por registro de empresa |
| Empleos guardados | — | 2 | Sprint 2: empleos guardados |
| Búsquedas guardadas | — | 2 | Sprint 2: búsquedas guardadas |
| Alertas | Gestión desde la cuenta | 2 | Sprint 2: manejo de alertas desde la cuenta |
| Aplicar con un clic | Con la hoja de vida guardada, en roles de LaTrae y patrocinados | 2 | Sprint 2: quick apply |
| Aplicar oculto — aviso | Advierte que se expone a esa empresa, permanentemente | 2 | 1B Visibilidad: aviso antes de aplicar oculto |
| Puerta de cuenta | Guardar, alertas y aplicar piden cuenta con hoja de vida; navegar y buscar, nunca | 2 | Sprint 2: gating; Compromisos: navegación abierta |
| Historial de aplicaciones | Cada aplicación como registro propio: candidato, empresa, empleo, fecha | 2 | Sprint 2: las aplicaciones como registro propio |
| Descargar y borrar mis datos | Autoservicio | 2 | Sprint 2: download or delete my data |
| Panel — búsqueda de candidatos | Especialidad, estado, certificación y años; verificados arriba; export CSV y envío a RecruiterFlow (uno o varios) | 2 | Sprint 2: búsqueda del back office con export y push |
| Panel — auditoría de exportaciones y cambios | Roles owner y staff | 2 | Sprint 2: roles y auditoría de quién exportó o cambió qué |

### Tanda 7 · Sprint 4: empleadores y pagos (sencilla)

| Pantalla o estado | Qué muestra | Sprint | Contrato |
|---|---|---|---|
| Registro del empleador | — | 4 | Sprint 4: cuentas de empleador |
| Inicio de sesión del empleador | — | 4 | Sprint 4: cuentas de empleador |
| Panel del empleador | Vistas y aplicaciones contadas por empleo | 4 | Sprint 4: dashboard con conteos por listado |
| Publicación guiada | Con vista previa en vivo | 4 | Sprint 4: guided post con vista previa |
| Esperando aprobación | LaTrae aprueba antes de publicar | 4 | Sprint 4: aprobación de LaTrae antes de salir |
| Stripe Checkout — éxito | Salto a Stripe y regreso | 4 | Sprint 4: Stripe Checkout con webhooks firmados |
| Stripe Checkout — cancelado | Regreso sin pagar | 4 | Sprint 4: Stripe Checkout |
| Opción destacado | El upgrade que pone el listado arriba de los resultados | 4 | Sprint 4: featured upgrade |
| Aplicaciones | Cada una con la hoja de vida guardada del candidato | 4 | Sprint 4: aplicaciones por email y en el dashboard |
| Editar, cerrar y renovar | — | 4 | Sprint 4: edit, close, renew |
| Recibos | Uno por orden | 4 | Sprint 4: un recibo por cada orden |
| Publicación rechazada | Excluida o agencia: no pueden comprar su entrada | 4 | Sprint 4: exclusión y direct-hire aplican a los posts pagados |
| Correo — aplicación recibida | — | 4 | Sprint 4: aplicaciones por email |
| Correo — recibo | — | 4 | Sprint 4: un recibo por orden |
| Correo — aviso antes de vencer | — | 4 | Sprint 4: recordatorio antes de que venza el listado |
| Panel — cola de aprobación | — | 4 | Sprint 4: aprobación de LaTrae |
| Panel — órdenes | Cada orden con su recibo de Stripe | 4 | Sprint 4: back office con cada orden y su recibo |
| Panel — reporte | Las métricas del Contrato: perfiles por semana con hoja de vida, cuentas nuevas y crecimiento, porcentaje con hoja de vida, visitantes que vuelven y suscriptores de alertas, empleadores que publican y recompra, tráfico orgánico e impresiones de Google for Jobs, registros y aplicaciones por origen | 4 | Compromisos: reporting como se especificó |

### Lo que el Contrato promete sin pantalla

Para que se vea que nada quedó por fuera: esto se construye y se entrega, pero no tiene pantalla propia en el mockup.

- Servidor, PostgreSQL, almacenamiento privado de hojas de vida y backups nocturnos cifrados en bucket propio (1A).
- Pipeline de despliegue con despliegues atómicos (todo sprint).
- Staging privado bloqueado de buscadores y la redirección dieseljobusa.com → dieseljobsusa.com (1A).
- Resend en subdominio de correo con SPF, DKIM y DMARC; List-Unsubscribe en el correo masivo (1A).
- Webhooks firmados del screener con claves de idempotencia y la guardia de orden (1B).
- Supresión de teléfono con hash tras el borrado (1B).
- Centroides ZIP del Census y geocodificación con PostGIS, sin servicio pago (1B).
- Vocabulario publicado en un enlace privado que lee el screener (1B).
- Captura del origen de tráfico: referrer y UTM en la primera visita (1B).
- Marcado JobPosting de dos niveles, Indexing API e IndexNow (3A).
- Sitemaps y Google Search Console (3A).
- Parser de datos estructurados antes de escribir cualquier scraper (3B).
- Deduplicación y expiración automática del feed dentro del ciclo de seis horas (3B).
- Filtro direct-hire: roles temporales y de agencia no pasan (3B; la regla se ve en las colas y la vista previa).
- Sincronización de consentimientos al screener (Sprint 2).
- Monitoreo desde el día uno y el verifier automático que tumba el build (todo sprint).
- Documentación de handoff por sprint (todo sprint).

### Pendiente de alinear en 03

- **`email_verify` sin flujo ni columna**: 03 §2 tiene el token, pero ningún flujo lo envía y `candidates` no tiene `email_verified_at`. Decidir en T-13 si se quita — el enlace de regreso ya prueba que el email es suyo.
- **El correo del resultado tardío**: 03 §4.6 lo promete cuando el resultado llega después del regreso, pero no hay plantilla en `emails_sent` (03 §3). Decidirlo en T-14/T-20; mientras tanto, la pantalla de regreso no promete un correo.
