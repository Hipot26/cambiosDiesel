// Enlace y botón de envío con el mismo aspecto. Mínimo 44 px de alto y foco
// visible.

import type { ComponentChildren } from 'preact';

export interface ButtonLinkProps {
  href: string;
  children: ComponentChildren;
  variant?: 'primary' | 'secondary';
}

const variants = {
  primary: 'bg-red text-white hover:bg-red-dark',
  secondary: 'border-2 border-navy text-navy hover:bg-navy hover:text-white',
} as const;

const buttonClass =
  'inline-flex min-h-11 items-center justify-center px-6 py-2 font-bold uppercase tracking-wide focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red';

export function ButtonLink({ href, children, variant = 'primary' }: ButtonLinkProps) {
  return (
    <a href={href} class={`${buttonClass} ${variants[variant]}`}>
      {children}
    </a>
  );
}

export interface SubmitButtonProps {
  children: ComponentChildren;
  variant?: 'primary' | 'secondary';
}

export function SubmitButton({ children, variant = 'primary' }: SubmitButtonProps) {
  return (
    <button type="submit" class={`${buttonClass} cursor-pointer ${variants[variant]}`}>
      {children}
    </button>
  );
}
