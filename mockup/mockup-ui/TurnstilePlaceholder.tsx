// Recuadro solo del mockup en el lugar del widget de Cloudflare Turnstile:
// el mockup no carga recursos externos (05_mockup.md §4.2), así que el widget
// real llega en T-11. Las páginas lo pasan al espacio que el formulario deja.

import { MockupTag } from './MockupTag.js';

export function TurnstilePlaceholder() {
  return (
    <div class="flex min-h-16 w-full max-w-xs flex-col items-start justify-center gap-1 border-2 border-dashed border-gray-400 bg-gray-100 px-4 py-3">
      <p class="text-sm text-gray-700">Cloudflare Turnstile check appears here</p>
      <MockupTag
        label="Placeholder"
        note="real widget in T-11; no external scripts in the mockup"
      />
    </div>
  );
}
