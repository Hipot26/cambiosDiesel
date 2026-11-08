// Etiqueta corta en mayúsculas monoespaciadas con espaciado, estilo hoja
// técnica: "STEP 01", chips de equipo, "VERIFIED", "HOSTED ROLE".

import type { ComponentChildren } from 'preact';

export interface TagProps {
  children: ComponentChildren;
  tone?: 'navy' | 'red' | 'gray';
}

const tones = {
  navy: 'border-navy text-navy',
  red: 'border-red text-red',
  gray: 'border-gray-400 text-gray-600',
} as const;

export function Tag({ children, tone = 'gray' }: TagProps) {
  return (
    <span
      class={`inline-block border px-2 py-0.5 font-mono text-xs uppercase tracking-widest ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
