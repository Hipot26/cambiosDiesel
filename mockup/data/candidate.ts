// Candidato inventado para las páginas de la tanda 2. Ninguna persona real;
// el teléfono usa el rango ficticio 555-01XX.

import type { CandidateView } from './types.js';

// Estado base: recién verificado el teléfono, sin hoja de vida ni screen.
export const sampleCandidate: CandidateView = {
  firstName: 'Marcus',
  lastName: 'Webb',
  email: 'marcus.webb@example.com',
  phoneMasked: '(•••) •••-0134',
  phoneVerified: true,
  screenStatus: 'not_started',
  resumeStatus: 'none',
};

export function candidateWith(overrides: Partial<CandidateView>): CandidateView {
  return { ...sampleCandidate, ...overrides };
}
