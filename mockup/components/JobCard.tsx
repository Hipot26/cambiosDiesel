// Tarjeta de empleo del Job Board: toda la tarjeta es un enlace al detalle.
// Jerarquía: título, empresa con "Hosted role" como marca discreta, ciudad y
// tipo, pago en negrita cuando existe, máximo 3 chips de equipo y la fecha.
// Destacado = borde de acento a la izquierda y la palabra "Featured".
// Los roles de LaTrae muestran la empresa real (nunca "Confidential employer").

import type { PublicJobView } from '../data/types.js';
import { Chip } from './Chip.js';
import { IconPin } from './icons.js';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export function formatPostedAt(iso: string): string {
  const [, month, day] = iso.split('-');
  const name = MONTHS[Number(month) - 1] ?? month ?? '';
  return `${name} ${Number(day)}`;
}

export interface JobCardProps {
  job: PublicJobView;
  root: string;
}

export function JobCard({ job, root }: JobCardProps) {
  const accent = job.featured ? ' border-l-4 border-l-red' : '';
  return (
    <a
      href={`${root}jobs/${job.slug}/`}
      class={`block border border-gray-300 bg-white p-4 shadow-card hover:border-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red sm:p-5${accent}`}
    >
      {job.featured && <p class="text-xs font-bold uppercase tracking-wide text-red">Featured</p>}
      <h3
        class={`text-lg font-black leading-tight text-navy sm:text-xl${job.featured ? ' mt-1' : ''}`}
      >
        {job.title}
      </h3>

      <p class="mt-1 text-sm text-gray-800">
        <span class="font-bold">{job.companyName}</span>
        {job.hostedRole && <span class="text-gray-600"> {'·'} Hosted role</span>}
      </p>

      <p class="mt-1 flex items-center gap-1 text-sm text-gray-700">
        <IconPin class="size-4" />
        {job.city}, {job.state} {'·'} {job.employmentType}
      </p>

      {job.payRange && <p class="mt-2 font-bold text-gray-900">{job.payRange}</p>}

      {job.equipment.length > 0 && (
        <p class="mt-3 flex flex-wrap gap-1.5">
          {job.equipment.slice(0, 3).map((item) => (
            <Chip key={item}>{item}</Chip>
          ))}
        </p>
      )}

      <p class="mt-3 text-xs text-gray-600">Posted {formatPostedAt(job.postedAt)}</p>
    </a>
  );
}
