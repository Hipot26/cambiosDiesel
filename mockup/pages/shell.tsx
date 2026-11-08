// Cáscara de las páginas del mockup: junta Layout + MockupFrame + cabecera y
// pie del sitio. Es parte del mockup (no se muda a src/views/): ahí el marco
// de revisión no existe.

import type { ComponentChildren } from 'preact';
import { Footer } from '../components/Footer.js';
import { Header } from '../components/Header.js';
import { Layout } from '../components/Layout.js';
import { MockupFrame } from '../mockup-ui/MockupFrame.js';

export const ROUND = 1;

export interface ShellProps {
  root: string;
  title: string;
  screen: string;
  sprint: string;
  notes: ComponentChildren;
  children: ComponentChildren;
}

export function Shell({ root, title, screen, sprint, notes, children }: ShellProps) {
  return (
    <Layout title={title} root={root}>
      <MockupFrame root={root} screen={screen} sprint={sprint} round={ROUND} notes={notes}>
        <Header root={root} />
        <main class="flex-1 pb-16">{children}</main>
        <Footer root={root} />
      </MockupFrame>
    </Layout>
  );
}
