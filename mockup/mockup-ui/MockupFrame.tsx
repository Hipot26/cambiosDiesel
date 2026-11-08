// Marco solo del mockup: la barra "MOCKUP · provisional colours · sample
// data", el enlace al índice y las notas de revisión plegables de cada
// pantalla. Envuelve a los componentes del sitio; nunca vive dentro de ellos.

import type { ComponentChildren } from 'preact';
import { Container } from '../components/Container.js';
import { MockupTag } from './MockupTag.js';

export interface MockupFrameProps {
  root: string;
  // Nombre de la pantalla, como aparece en el índice
  screen: string;
  // Etiqueta de sprint de la pantalla completa
  sprint: string;
  round: number;
  // Contenido de "Review notes": qué debe confirmar Toya con esta pantalla
  notes: ComponentChildren;
  children: ComponentChildren;
}

export function MockupFrame({ root, screen, sprint, round, notes, children }: MockupFrameProps) {
  return (
    <div class="flex flex-1 flex-col">
      <div class="border-b-2 border-amber-400 bg-amber-100 text-amber-950">
        <Container class="py-2">
          <p class="font-mono text-[11px] uppercase tracking-widest">
            Mockup {'·'} provisional colours {'·'} sample data
          </p>
          <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span class="font-bold">{screen}</span>
            <MockupTag label={`Sprint ${sprint}`} />
            <MockupTag label={`Round ${round}`} />
            <a
              href={root}
              class="flex min-h-11 items-center underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
            >
              Back to mockup index
            </a>
          </div>
          <details class="pb-2">
            <summary class="flex min-h-11 cursor-pointer items-center font-mono text-xs uppercase tracking-widest underline-offset-4 hover:underline">
              Review notes {'—'} what to confirm on this screen
            </summary>
            <div class="max-w-prose space-y-2 pb-2 text-sm">{notes}</div>
          </details>
        </Container>
      </div>
      {children}
    </div>
  );
}
