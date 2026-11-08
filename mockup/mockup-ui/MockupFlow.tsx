// Caja solo del mockup al pie de las páginas de flujo: adónde lleva cada
// acción, para que Toya recorra los estados sin adivinar las URL. Nunca va
// dentro de un componente del sitio.

export interface FlowLink {
  label: string;
  href: string;
}

export function MockupFlow({ links }: { links: FlowLink[] }) {
  return (
    <div class="mt-10 border-2 border-amber-400 bg-amber-100 p-3 text-amber-950">
      <p class="font-mono text-[11px] uppercase tracking-widest">
        Mockup flow {'—'} where this screen leads
      </p>
      <ul class="mt-1 flex flex-wrap gap-x-5 gap-y-1">
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              class="flex min-h-11 items-center text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
