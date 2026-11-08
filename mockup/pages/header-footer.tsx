// Cabecera y pie compartidos, mostrados una vez cada uno y a todo el ancho.
// Sin cajas que simulen un celular: el header responde al ancho real de la
// ventana, así que se redimensiona (o se abre en un teléfono) para ver el
// menú móvil.

import { Container } from '../components/Container.js';
import { Footer } from '../components/Footer.js';
import { Header } from '../components/Header.js';
import { Layout } from '../components/Layout.js';
import { MockupFrame } from '../mockup-ui/MockupFrame.js';
import { ROUND } from './shell.js';

export function HeaderFooterPage({ root }: { root: string }) {
  return (
    <Layout title={'Header and footer — DieselJobsUSA mockup'} root={root}>
      <MockupFrame
        root={root}
        screen="Header and footer"
        sprint="1"
        round={ROUND}
        notes={
          <ul class="list-disc space-y-1 pl-5">
            <li>
              Each piece is shown once, full width. Resize the window or open on a phone to see the
              mobile menu (a plain disclosure element, no JavaScript).
            </li>
            <li>The logo is text-only until brand files arrive.</li>
            <li>Exact red to be confirmed with the brand files.</li>
          </ul>
        }
      >
        <div class="pb-16">
          <section aria-labelledby="state-header">
            <Container class="py-6">
              <h2 id="state-header" class="text-sm font-bold text-gray-700">
                Header {'—'} resize the window or open on a phone to see the mobile menu
              </h2>
            </Container>
            <Header root={root} />
          </section>

          <section class="mt-10" aria-labelledby="state-footer">
            <Container class="pb-6">
              <h2 id="state-footer" class="text-sm font-bold text-gray-700">
                Footer
              </h2>
            </Container>
            <Footer root={root} />
          </section>
        </div>
      </MockupFrame>
    </Layout>
  );
}
