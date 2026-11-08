// Forma prevista de los modelos de vista públicos (03_backend.md §2.1).
// Ningún tipo que vea el técnico tiene campo de nivel (SEC-55).

export type EmploymentType = 'Full-time' | 'Part-time' | 'Contract';

// Empleo como lo verá una página pública. Los campos que el modelo de
// 03_backend.md §1.6 todavía no tiene se anotan en la nota de revisión
// de cada página que los muestra, nunca se agregan al modelo en silencio.
export interface PublicJobView {
  slug: string;
  title: string;
  companyName: string;
  // true = empleo de LaTrae publicado por el sitio ("hosted role")
  hostedRole: boolean;
  city: string;
  state: string;
  zip: string;
  employmentType: EmploymentType;
  // Valor exacto de la lista Trade del vocabulario
  trade: string;
  // Valores exactos de la lista Equipment. `jobs` no tiene esta columna todavía.
  equipment: string[];
  // `jobs` no tiene campos de pago todavía. Texto provisional.
  payRange?: string;
  // Fecha ISO (solo fecha)
  postedAt: string;
  featured: boolean;
  // Solo roles agregados (3B): el enlace externo de "Apply on company site"
  applyUrl?: string;
  summary: string;
}

// Candidato como lo verá /account (03_backend.md §4.3). Sin campo de nivel
// (SEC-55): el técnico solo ve "Verified" y la fecha.
export type ScreenStatus = 'not_started' | 'started' | 'abandoned' | 'completed';
export type ResumeStatus = 'none' | 'pending' | 'clean' | 'rejected';

export interface CandidateView {
  firstName: string;
  lastName: string;
  email: string;
  // Solo los últimos dígitos, como "(•••) •••-0134"
  phoneMasked: string;
  phoneVerified: boolean;
  screenStatus: ScreenStatus;
  resumeStatus: ResumeStatus;
  // Fecha ISO (solo fecha) de la hoja de vida vigente
  resumeUploadedAt?: string;
  // Fecha ISO que se muestra como "Verified on <fecha>"
  verifiedOn?: string;
  // Estado abandoned: "te faltan N preguntas"
  questionsRemaining?: number;
  // Límite de 30 días: cuándo puede repetir el screen
  screenRetryOn?: string;
}

export type SprintTag = '1' | '2' | '3A' | '3B' | '4';

// Envoltura solo del mockup: a qué sprint pertenece cada pieza dibujada.
export interface MockJob {
  job: PublicJobView;
  sprint: SprintTag;
}
