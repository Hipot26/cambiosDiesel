// Componentes de formulario del sitio, reutilizables en T-11 y T-13: campo de
// texto, select con grupos, archivo, casilla, aviso y el input oculto del
// token CSRF (lo reciben por prop; en el mockup es un valor falso). Todos con
// label visible, error unido con aria-describedby y mínimo 44 px de alto.
// Atributos para el celular según MDN: autocomplete, inputmode y pattern.

import type { ComponentChildren } from 'preact';

const inputClass =
  'mt-1 block w-full min-h-11 border bg-white px-3 py-2 text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red';

function borderClass(error?: string) {
  return error ? 'border-2 border-red' : 'border-gray-400';
}

function describedBy(id: string, hint?: string, error?: string): string | undefined {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean);
  return ids.length > 0 ? ids.join(' ') : undefined;
}

function Hint({ id, hint }: { id: string; hint?: string | undefined }) {
  if (!hint) return null;
  return (
    <p id={`${id}-hint`} class="mt-0.5 text-sm text-gray-600">
      {hint}
    </p>
  );
}

function FieldError({ id, error }: { id: string; error?: string | undefined }) {
  if (!error) return null;
  return (
    <p id={`${id}-error`} class="mt-1 text-sm font-bold text-red">
      {error}
    </p>
  );
}

export interface TextFieldProps {
  id: string;
  name: string;
  label: string;
  type?: 'text' | 'email' | 'tel' | undefined;
  hint?: string | undefined;
  error?: string | undefined;
  value?: string | undefined;
  required?: boolean | undefined;
  autocomplete?: string | undefined;
  inputmode?: 'numeric' | undefined;
  pattern?: string | undefined;
  maxlength?: number | undefined;
}

export function TextField(props: TextFieldProps) {
  const { id, name, label, type = 'text', hint, error, value, required } = props;
  return (
    <div>
      <label for={id} class="block font-bold text-navy">
        {label}
        {!required && <span class="font-normal text-gray-600"> (optional)</span>}
      </label>
      <Hint id={id} hint={hint} />
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        required={required}
        autocomplete={props.autocomplete}
        inputmode={props.inputmode}
        pattern={props.pattern}
        maxlength={props.maxlength}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy(id, hint, error)}
        class={`${inputClass} ${borderClass(error)}`}
      />
      <FieldError id={id} error={error} />
    </div>
  );
}

export interface SelectGroup {
  label: string;
  options: string[];
}

export interface SelectFieldProps {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  groups: SelectGroup[];
  hint?: string | undefined;
  error?: string | undefined;
  value?: string | undefined;
  required?: boolean | undefined;
}

export function SelectField(props: SelectFieldProps) {
  const { id, name, label, placeholder, groups, hint, error, value, required } = props;
  return (
    <div>
      <label for={id} class="block font-bold text-navy">
        {label}
      </label>
      <Hint id={id} hint={hint} />
      <select
        id={id}
        name={name}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy(id, hint, error)}
        class={`${inputClass} ${borderClass(error)}`}
      >
        <option value="" selected={!value}>
          {placeholder}
        </option>
        {groups.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.options.map((option) => (
              <option key={option} value={option} selected={option === value}>
                {option}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <FieldError id={id} error={error} />
    </div>
  );
}

export interface FileFieldProps {
  id: string;
  name: string;
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  // Tipos aceptados; la validación real es por contenido (SEC-20), esto solo
  // filtra el selector del navegador
  accept?: string | undefined;
}

export function FileField({ id, name, label, hint, error, accept }: FileFieldProps) {
  return (
    <div>
      <label for={id} class="block font-bold text-navy">
        {label}
      </label>
      <Hint id={id} hint={hint} />
      <input
        id={id}
        name={name}
        type="file"
        accept={accept}
        aria-describedby={describedBy(id, hint, error)}
        class={`${inputClass} ${borderClass(error)} file:mr-3 file:border-0 file:bg-navy file:px-3 file:py-1 file:font-bold file:text-white`}
      />
      <FieldError id={id} error={error} />
    </div>
  );
}

export interface CheckboxFieldProps {
  id: string;
  name: string;
  children: ComponentChildren;
  hint?: string | undefined;
}

// En el mockup y en el registro real la casilla nunca viene marcada
// (05_mockup.md §5; hay prueba automática).
export function CheckboxField({ id, name, children, hint }: CheckboxFieldProps) {
  return (
    <div class="flex min-h-11 items-start gap-3 py-1">
      <input
        id={id}
        name={name}
        type="checkbox"
        value="yes"
        aria-describedby={hint ? `${id}-hint` : undefined}
        class="mt-0.5 size-5 shrink-0 accent-red"
      />
      <div>
        <label for={id} class="block text-gray-900">
          {children}
        </label>
        <Hint id={id} hint={hint} />
      </div>
    </div>
  );
}

export interface NoticeProps {
  tone: 'info' | 'success' | 'warn';
  title?: string | undefined;
  children: ComponentChildren;
}

const noticeTones = {
  info: 'border-navy bg-white text-gray-900',
  success: 'border-navy bg-navy text-white',
  warn: 'border-red bg-white text-gray-900',
} as const;

export function Notice({ tone, title, children }: NoticeProps) {
  return (
    <div class={`border-l-4 p-4 shadow-card ${noticeTones[tone]}`}>
      {title && <p class="font-black">{title}</p>}
      <div class={title ? 'mt-1 text-sm' : 'text-sm'}>{children}</div>
    </div>
  );
}

// Token CSRF por prop (SEC-36). En el mockup las páginas pasan un valor falso;
// en T-11/T-13 llega el de la sesión.
export function CsrfTokenInput({ token }: { token: string }) {
  return <input type="hidden" name="csrf_token" value={token} />;
}
