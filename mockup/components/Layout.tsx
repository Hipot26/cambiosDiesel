// Cáscara de página: <html> completo. Componente del sitio (se muda a
// src/views/ al aprobarse). En el mockup la meta robots va siempre; en el
// sitio real será por entorno (staging sí, producción no).

import type { ComponentChildren } from 'preact';

export interface LayoutProps {
  title: string;
  // Prefijo relativo hasta la raíz del sitio estático ('./', '../', '../../')
  root: string;
  children: ComponentChildren;
}

export function Layout({ title, root, children }: LayoutProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, nofollow" />
        <title>{title}</title>
        <link rel="stylesheet" href={`${root}static/app.css`} />
      </head>
      {/* Columna a pantalla completa para que el pie quede siempre abajo */}
      <body class="flex min-h-screen flex-col bg-gray-50 font-sans text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
