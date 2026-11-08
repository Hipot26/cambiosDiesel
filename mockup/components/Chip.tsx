// Píldora pequeña en sans y minúsculas: chips de equipo (gris suave) y la
// marca "Verified" (navy). Para etiquetas técnicas monoespaciadas ("STEP 01")
// está Tag.

import type { ComponentChildren } from 'preact';

export interface ChipProps {
  children: ComponentChildren;
  tone?: 'gray' | 'navy';
}

const tones = {
  gray: 'bg-gray-100 text-gray-700',
  navy: 'bg-navy text-white',
} as const;

export function Chip({ children, tone = 'gray' }: ChipProps) {
  return (
    <span class={`inline-block rounded-full px-2.5 py-0.5 text-xs ${tones[tone]}`}>{children}</span>
  );
}
