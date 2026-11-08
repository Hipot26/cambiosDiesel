// Job Board en sus dos estados: completo (/jobs/) y como sale en el
// Sprint 1 (/jobs/sprint-1/). En escritorio, filtros en columna a la
// izquierda y los empleos como lista a la derecha; en celular los filtros
// van plegados en un <details>.

import { Container } from '../components/Container.js';
import { FilterBar } from '../components/FilterBar.js';
import { IconChevronDown } from '../components/icons.js';
import { JobCard } from '../components/JobCard.js';
import { allJobs, sprint1Jobs } from '../data/jobs.js';
import { MockupTag } from '../mockup-ui/MockupTag.js';
import { Shell } from './shell.js';

export function JobsFullPage({ root }: { root: string }) {
  const featured = allJobs.filter(({ job }) => job.featured);
  const rest = allJobs.filter(({ job }) => !job.featured);
  return (
    <Shell
      root={root}
      title={'Job Board — DieselJobsUSA'}
      screen={'Job Board — complete'}
      sprint={'1 + 3A + 3B'}
      notes={
        <ul class="list-disc space-y-1 pl-5">
          <li>
            This is the board once Sprints 3A and 3B land. The launch state is at{' '}
            <a href="sprint-1/" class="underline underline-offset-4">
              Job Board {'—'} Sprint 1
            </a>
            .
          </li>
          <li>Filters (role, trade, location, equipment type, job type) arrive in Sprint 3A.</li>
          <li>
            Featured pins: staff marks them from Sprint 3B; employers can buy placement in Sprint 4.
          </li>
          <li>Aggregated roles (Sprint 3B) show the real company and link out to apply.</li>
          <li>
            Equipment chips and pay ranges are not in the jobs data model yet; confirm whether they
            should be.
          </li>
        </ul>
      }
    >
      <Container class="pt-8">
        <h1 class="text-3xl font-black text-navy">Job Board</h1>
        <p class="mt-2 max-w-prose text-gray-700">
          Diesel and heavy equipment roles across the country. Placeholder copy.
        </p>
        <p class="mt-3">
          <MockupTag
            label="Sprint legend"
            note="Hosted roles: Sprint 1 · Aggregated: Sprint 3B · Featured: 3B staff / Sprint 4 paid"
          />
        </p>

        <div class="mt-6 items-start gap-8 lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
          <div class="space-y-2">
            <MockupTag label="Sprint 3A" note="filters arrive with search" />
            <details class="group lg:hidden">
              <summary class="flex min-h-11 cursor-pointer items-center justify-between border border-gray-300 bg-white px-4 text-sm font-bold text-navy shadow-card">
                Filters
                <IconChevronDown class="size-4 transition-transform group-open:rotate-180" />
              </summary>
              <div class="mt-2">
                <FilterBar idPrefix="m-" />
              </div>
            </details>
            <div class="hidden lg:block">
              <FilterBar idPrefix="d-" />
            </div>
          </div>

          <div class="mt-8 lg:mt-0">
            <section aria-labelledby="featured-jobs">
              <h2 id="featured-jobs" class="text-xl font-black text-navy">
                Featured
              </h2>
              <div class="mt-4 space-y-4">
                {featured.map(({ job }) => (
                  <JobCard key={job.slug} job={job} root={root} />
                ))}
              </div>
            </section>

            <section class="mt-8" aria-labelledby="all-jobs">
              <h2 id="all-jobs" class="text-xl font-black text-navy">
                All jobs
              </h2>
              <div class="mt-4 space-y-4">
                {rest.map(({ job }) => (
                  <JobCard key={job.slug} job={job} root={root} />
                ))}
              </div>
            </section>
          </div>
        </div>
      </Container>
    </Shell>
  );
}

export function JobsSprint1Page({ root }: { root: string }) {
  return (
    <Shell
      root={root}
      title={'Job Board — DieselJobsUSA'}
      screen={'Job Board — as it ships in Sprint 1'}
      sprint="1"
      notes={
        <ul class="list-disc space-y-1 pl-5">
          <li>
            Launch state: only LaTrae roles from RecruiterFlow, newest first, no filters. The full
            board with filters and aggregated roles is at{' '}
            <a href="../" class="underline underline-offset-4">
              Job Board {'—'} complete
            </a>
            .
          </li>
          <li>Each role links to its detail page; Apply goes to signup with the job noted.</li>
          <li>
            Equipment chips and pay ranges are not in the jobs data model yet; confirm whether they
            should be.
          </li>
        </ul>
      }
    >
      <Container class="pt-8" narrow>
        <h1 class="text-3xl font-black text-navy">Job Board</h1>
        <p class="mt-2 max-w-prose text-gray-700">
          Open roles hosted on DieselJobsUSA. Placeholder copy.
        </p>
        <div class="mt-6 space-y-4">
          {sprint1Jobs.map((job) => (
            <JobCard key={job.slug} job={job} root={root} />
          ))}
        </div>
      </Container>
    </Shell>
  );
}
