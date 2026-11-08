// Pie del sitio. El espaciado sobre el pie lo pone cada página (el <main> de
// la cáscara), no el pie mismo.

import { Container } from './Container.js';

export interface FooterProps {
  root: string;
}

const links = [
  { href: 'jobs/', label: 'Jobs' },
  { href: 'job-seekers/', label: 'Job seekers' },
  { href: 'for-employers/', label: 'For employers' },
  { href: 'about/', label: 'About' },
  { href: 'privacy/', label: 'Privacy' },
  { href: 'terms/', label: 'Terms' },
] as const;

export function Footer({ root }: FooterProps) {
  return (
    <footer class="bg-navy text-white">
      <Container class="py-10">
        <div class="gap-8 md:flex md:items-start md:justify-between">
          <div>
            <p class="text-xl font-black tracking-tight">
              DieselJobs<span class="text-red">USA</span>
            </p>
            <p class="mt-1 text-sm text-gray-300">
              Jobs for diesel and heavy equipment technicians
            </p>
          </div>
          <nav aria-label="Footer" class="mt-6 flex max-w-md flex-wrap gap-x-6 gap-y-1 md:mt-0">
            {links.map((link) => (
              <a
                key={link.href}
                href={root + link.href}
                class="flex min-h-11 items-center text-sm text-gray-200 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
        <p class="mt-8 border-t border-white/20 pt-4 text-xs text-gray-300">
          {'©'} 2026 DieselJobsUSA. Legal line placeholder {'—'} attorney's wording goes here.
        </p>
      </Container>
    </footer>
  );
}
