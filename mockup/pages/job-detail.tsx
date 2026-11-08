// Detalle de empleo, en sus dos versiones: rol de LaTrae (alojado, con Apply
// hacia el registro) y rol agregado (empresa real inventada, lo esencial y
// "Apply on company site" hacia afuera, sin copiar la descripción completa).

import { ButtonLink } from '../components/Button.js';
import { Chip } from '../components/Chip.js';
import { Container } from '../components/Container.js';
import { IconExternal } from '../components/icons.js';
import { formatPostedAt } from '../components/JobCard.js';
import type { PublicJobView } from '../data/types.js';
import { MockupTag } from '../mockup-ui/MockupTag.js';
import { Shell } from './shell.js';

const factLabelClass = 'text-xs font-semibold uppercase tracking-wide text-gray-600';

function Facts({ job }: { job: PublicJobView }) {
  return (
    <dl class="mt-6 grid gap-x-8 gap-y-3 border border-gray-300 bg-white p-4 shadow-card sm:grid-cols-2">
      <div>
        <dt class={factLabelClass}>Location</dt>
        <dd class="mt-0.5 text-sm text-gray-900">
          {job.city}, {job.state} {job.zip}
        </dd>
      </div>
      <div>
        <dt class={factLabelClass}>Job type</dt>
        <dd class="mt-0.5 text-sm text-gray-900">{job.employmentType}</dd>
      </div>
      <div>
        <dt class={factLabelClass}>Trade</dt>
        <dd class="mt-0.5 text-sm text-gray-900">{job.trade}</dd>
      </div>
      {job.payRange && (
        <div>
          <dt class={factLabelClass}>Pay range</dt>
          <dd class="mt-0.5 text-sm font-bold text-gray-900">{job.payRange}</dd>
        </div>
      )}
      <div class="sm:col-span-2">
        <dt class={factLabelClass}>Equipment</dt>
        <dd class="mt-1 flex flex-wrap gap-1.5">
          {job.equipment.map((item) => (
            <Chip key={item}>{item}</Chip>
          ))}
        </dd>
      </div>
      <div class="sm:col-span-2">
        <dt class={factLabelClass}>Posted</dt>
        <dd class="mt-0.5 text-sm text-gray-900">{formatPostedAt(job.postedAt)}</dd>
      </div>
    </dl>
  );
}

function latraeNotes(job: PublicJobView) {
  return (
    <ul class="list-disc space-y-1 pl-5">
      <li>
        The Apply button goes to signup with the job noted ({`/signup?job=${job.slug}`}).
        <strong> Proposal pending Toya's confirmation:</strong> in Sprint 1, Apply leads to signup
        so staff can see which role the technician wanted; quick apply arrives in Sprint 2.
      </li>
      <li>
        Hosted roles always show "{job.companyName}" with the Hosted role mark {'—'} never a hidden
        employer.
      </li>
      <li>Description text is invented placeholder; real descriptions come from RecruiterFlow.</li>
      <li>Pay range and equipment list are not in the jobs data model yet.</li>
    </ul>
  );
}

function aggregatedNotes() {
  return (
    <ul class="list-disc space-y-1 pl-5">
      <li>
        Aggregated listings (Sprint 3B) show the real company, the essentials, and send the
        technician to the company's own site to apply. The full description is never copied.
      </li>
      <li>The external link goes to example.com in the mockup.</li>
      <li>Pay range and equipment list are not in the jobs data model yet.</li>
    </ul>
  );
}

export function JobDetailPage({ root, job }: { root: string; job: PublicJobView }) {
  const hosted = job.hostedRole;
  return (
    <Shell
      root={root}
      title={`${job.title} — DieselJobsUSA`}
      screen={hosted ? 'Job detail — LaTrae (hosted role)' : 'Job detail — aggregated role'}
      sprint={hosted ? '1' : '3B'}
      notes={hosted ? latraeNotes(job) : aggregatedNotes()}
    >
      <Container class="pt-8">
        <div class="mx-auto max-w-3xl">
          <p>
            <a
              href={`${root}jobs/`}
              class="text-sm font-semibold text-gray-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red"
            >
              {'←'} Back to Job Board
            </a>
          </p>

          {job.featured && (
            <p class="mt-4 text-xs font-bold uppercase tracking-wide text-red">Featured</p>
          )}
          <h1 class="mt-2 text-3xl font-black leading-tight text-navy sm:text-4xl">{job.title}</h1>
          <p class="mt-1 text-lg font-bold text-gray-800">
            {job.companyName}
            {hosted && <span class="text-sm font-normal text-gray-600"> {'·'} Hosted role</span>}
          </p>

          <Facts job={job} />

          {hosted ? (
            <>
              <section class="mt-8 max-w-prose" aria-labelledby="job-description">
                <h2 id="job-description" class="text-xl font-black text-navy">
                  About this job
                </h2>
                <p class="mt-3 text-gray-800">{job.summary}</p>
                <p class="mt-3 text-gray-800">
                  You will work with a tight crew, a stocked parts room and a service manager who
                  used to turn wrenches. Placeholder description {'—'} the real text comes from the
                  posting.
                </p>
                <h3 class="mt-5 font-black text-navy">What you bring</h3>
                <ul class="mt-2 list-disc space-y-1 pl-5 text-gray-800">
                  <li>Hands-on experience with the equipment listed above. Placeholder.</li>
                  <li>Your own hand tools; specialty tooling provided. Placeholder.</li>
                  <li>A valid driver's license. Placeholder.</li>
                </ul>
              </section>
              <div class="mt-8 flex flex-wrap items-center gap-3">
                <ButtonLink href={`${root}signup/from-apply/`}>Apply</ButtonLink>
                <MockupTag label="Proposal" note="Apply leads to signup with the job noted" />
              </div>
            </>
          ) : (
            <>
              <section class="mt-8 max-w-prose" aria-labelledby="job-summary">
                <h2 id="job-summary" class="text-xl font-black text-navy">
                  About this job
                </h2>
                <p class="mt-3 text-gray-800">{job.summary}</p>
                <p class="mt-3 text-sm text-gray-600">
                  This role was found on the employer's site. Read the full posting and apply there.
                </p>
              </section>
              <div class="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href={job.applyUrl ?? 'https://example.com/'}
                  class="inline-flex min-h-11 items-center justify-center gap-2 bg-red px-6 py-2 font-bold uppercase tracking-wide text-white hover:bg-red-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red"
                >
                  Apply on company site
                  <IconExternal class="size-4" />
                </a>
                <MockupTag label="Sprint 3B" note="external application" />
              </div>
            </>
          )}
        </div>
      </Container>
    </Shell>
  );
}
