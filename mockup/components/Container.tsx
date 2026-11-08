// Contenedor del sitio: ancho máximo de 1152 px centrado, con margen lateral
// de 16 px en celular. Las bandas de color van de borde a borde y ponen un
// Container adentro; el contenido suelto se envuelve directo.

import type { ComponentChildren } from 'preact';

export interface ContainerProps {
  children: ComponentChildren;
  class?: string;
  // Columna de lectura centrada (detalle, páginas de texto) en vez del ancho completo
  narrow?: boolean;
}

export function Container({ children, class: className, narrow = false }: ContainerProps) {
  const width = narrow ? 'max-w-3xl' : 'max-w-6xl';
  return (
    <div class={`mx-auto w-full ${width} px-4 sm:px-6${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  );
}
