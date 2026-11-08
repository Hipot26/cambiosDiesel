// Filtros del Job Board completo (Sprint 3A). Solo apariencia en el mockup:
// el formulario no filtra nada todavía. Cada campo con su <label>; oficios y
// tipos de equipo salen del vocabulario, nunca a mano. Columna vertical: en
// escritorio vive en el lateral izquierdo y en celular dentro de un <details>.
// idPrefix evita ids duplicados cuando la página lo dibuja dos veces.

import { equipmentList, tradesByGroup } from '../data/vocabulary.js';

const fieldClass =
  'min-h-11 w-full border border-gray-400 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red';
const labelClass = 'block text-sm font-semibold text-gray-700';

export interface FilterBarProps {
  idPrefix?: string;
}

export function FilterBar({ idPrefix = '' }: FilterBarProps) {
  const id = (name: string) => `${idPrefix}filter-${name}`;
  const trades = tradesByGroup();
  return (
    <form
      method="get"
      action=""
      aria-label="Job filters"
      class="space-y-4 border border-gray-300 bg-white p-4 shadow-card"
    >
      <div class="space-y-1">
        <label class={labelClass} for={id('keyword')}>
          Role
        </label>
        <input
          id={id('keyword')}
          name="q"
          type="text"
          placeholder="Job title or keyword"
          class={fieldClass}
        />
      </div>

      <div class="space-y-1">
        <label class={labelClass} for={id('trade')}>
          Trade
        </label>
        <select id={id('trade')} name="trade" class={fieldClass}>
          <option value="">Any trade</option>
          {[...trades.entries()].map(([group, values]) => (
            <optgroup key={group} label={group}>
              {values.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div class="space-y-1">
        <label class={labelClass} for={id('zip')}>
          ZIP code
        </label>
        <input
          id={id('zip')}
          name="zip"
          type="text"
          inputmode="numeric"
          placeholder="e.g. 28206"
          class={fieldClass}
        />
      </div>

      <div class="space-y-1">
        <label class={labelClass} for={id('radius')}>
          Within
        </label>
        <select id={id('radius')} name="radius" class={fieldClass}>
          <option value="25">25 miles</option>
          <option value="50">50 miles</option>
          <option value="100">100 miles</option>
        </select>
      </div>

      <div class="space-y-1">
        <label class={labelClass} for={id('equipment')}>
          Equipment type
        </label>
        <select id={id('equipment')} name="equipment" class={fieldClass}>
          <option value="">Any equipment</option>
          {(equipmentList.groups ?? []).map((group) => (
            <option key={group} value={group}>
              {group}
            </option>
          ))}
        </select>
      </div>

      <div class="space-y-1">
        <label class={labelClass} for={id('type')}>
          Job type
        </label>
        <select id={id('type')} name="type" class={fieldClass}>
          <option value="">Any type</option>
          <option value="full-time">Full-time</option>
          <option value="part-time">Part-time</option>
          <option value="contract">Contract</option>
        </select>
      </div>

      <button
        type="submit"
        class="inline-flex min-h-11 w-full items-center justify-center bg-navy px-6 font-bold uppercase tracking-wide text-white hover:bg-navy-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red"
      >
        Filter jobs
      </button>
    </form>
  );
}
