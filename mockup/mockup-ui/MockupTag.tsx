// Etiqueta solo del mockup: marca a qué sprint pertenece una pieza, o que un
// texto es provisional. Nunca va dentro de un componente del sitio; las
// páginas la ponen al lado de la pieza que marcan.

export interface MockupTagProps {
  label: string;
  note?: string;
}

export function MockupTag({ label, note }: MockupTagProps) {
  return (
    <span class="inline-flex items-center gap-1 bg-amber-200 px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-widest text-amber-950">
      {label}
      {note && <span class="normal-case tracking-normal text-amber-800">{note}</span>}
    </span>
  );
}
