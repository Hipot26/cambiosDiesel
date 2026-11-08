// Iconos SVG simples hechos aquí. Decorativos (aria-hidden); sin CDN ni
// fuentes externas. Trazos de 2px, estilo hoja técnica.

interface IconProps {
  class?: string;
}

function base(className: string | undefined) {
  return {
    class: className ?? 'size-5',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'square' as const,
  };
}

export function IconWrench({ class: className }: IconProps) {
  return (
    <svg {...base(className)} aria-hidden="true">
      <path d="M14 7a4 4 0 1 0-5.6 3.7L4 15.1V20h4.9l4.4-4.4A4 4 0 0 0 17 10" />
      <path d="M14 7l3 3" />
    </svg>
  );
}

export function IconTruck({ class: className }: IconProps) {
  return (
    <svg {...base(className)} aria-hidden="true">
      <path d="M2 6h12v10H2zM14 10h4l4 4v2h-8z" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </svg>
  );
}

export function IconPin({ class: className }: IconProps) {
  return (
    <svg {...base(className)} aria-hidden="true">
      <path d="M12 21s-6-5.5-6-10a6 6 0 1 1 12 0c0 4.5-6 10-6 10z" />
      <circle cx="12" cy="11" r="2" />
    </svg>
  );
}

export function IconCheck({ class: className }: IconProps) {
  return (
    <svg {...base(className)} aria-hidden="true">
      <path d="M4 12l5 5L20 6" />
    </svg>
  );
}

export function IconArrowRight({ class: className }: IconProps) {
  return (
    <svg {...base(className)} aria-hidden="true">
      <path d="M4 12h16M14 6l6 6-6 6" />
    </svg>
  );
}

export function IconExternal({ class: className }: IconProps) {
  return (
    <svg {...base(className)} aria-hidden="true">
      <path d="M14 4h6v6M20 4l-9 9M19 14v6H4V5h6" />
    </svg>
  );
}

export function IconChevronDown({ class: className }: IconProps) {
  return (
    <svg {...base(className)} aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function IconMenu({ class: className }: IconProps) {
  return (
    <svg {...base(className)} aria-hidden="true">
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}
