// Cabecera del sitio: azul marino, logo de texto "DieselJobs" con "USA" en
// rojo. El menú del celular usa <details>, sin JavaScript (listo para la CSP).

import { Container } from './Container.js';
import { IconMenu } from './icons.js';

export interface HeaderProps {
  root: string;
}

const links = [
  { href: 'jobs/', label: 'Jobs' },
  { href: 'job-seekers/', label: 'Job seekers' },
  { href: 'for-employers/', label: 'For employers' },
  { href: 'about/', label: 'About' },
] as const;

export function Header({ root }: HeaderProps) {
  return (
    <header class="bg-navy text-white">
      <Container class="flex min-h-16 items-center justify-between gap-4">
        <a
          href={`${root}home/`}
          class="py-2 text-2xl font-black tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red"
        >
          DieselJobs<span class="text-red">USA</span>
        </a>

        <nav aria-label="Main" class="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={root + link.href}
              class="flex min-h-11 items-center px-3 text-sm font-semibold underline-offset-8 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red"
            >
              {link.label}
            </a>
          ))}
          <a
            href={`${root}signup/`}
            class="ml-2 flex min-h-11 items-center bg-red px-4 font-bold uppercase tracking-wide hover:bg-red-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Sign up
          </a>
        </nav>

        <details class="relative md:hidden">
          <summary class="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center gap-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red">
            <IconMenu class="size-6" />
            Menu
          </summary>
          <nav
            aria-label="Main, mobile"
            class="absolute right-0 z-10 mt-2 flex w-56 flex-col border border-navy bg-white text-navy shadow-card"
          >
            {links.map((link) => (
              <a
                key={link.href}
                href={root + link.href}
                class="flex min-h-11 items-center border-b border-gray-200 px-4 text-sm font-semibold hover:bg-gray-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-red"
              >
                {link.label}
              </a>
            ))}
            <a
              href={`${root}signup/`}
              class="flex min-h-11 items-center bg-red px-4 font-bold uppercase tracking-wide text-white hover:bg-red-dark focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white"
            >
              Sign up
            </a>
          </nav>
        </details>
      </Container>
    </header>
  );
}
