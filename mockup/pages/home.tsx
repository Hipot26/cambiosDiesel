// Home del sitio público.

import { ButtonLink } from '../components/Button.js';
import { Container } from '../components/Container.js';
import { JobCard } from '../components/JobCard.js';
import { Tag } from '../components/Tag.js';
import { sprint1Jobs } from '../data/jobs.js';
import { tradeList } from '../data/vocabulary.js';
import { MockupTag } from '../mockup-ui/MockupTag.js';
import { Shell } from './shell.js';

const steps = [
  {
    tag: 'Step 01',
    title: 'Sign up in two minutes',
    body: 'Name, contact, ZIP and your trade. Upload a resume if you have one — or we can build one for you.',
  },
  {
    tag: 'Step 02',
    title: 'Take a short screen',
    body: 'A quick guided interview about the equipment you have worked on. No trick questions.',
  },
  {
    tag: 'Step 03',
    title: 'Get the Verified mark',
    body: 'Finish the screen and your profile carries the Verified mark — proof that a real conversation about real equipment backs it.',
  },
] as const;

export function HomePage({ root }: { root: string }) {
  const latest = sprint1Jobs.slice(0, 3);
  return (
    <Shell
      root={root}
      title={'DieselJobsUSA — Jobs for diesel and heavy equipment technicians'}
      screen="Home"
      sprint="1"
      notes={
        <ul class="list-disc space-y-1 pl-5">
          <li>
            All copy on this page is provisional placeholder text; Toya's wording replaces it.
          </li>
          <li>Confirm the site is English-only (open question in the plan).</li>
          <li>
            On desktop the blue block has a reserved photo space; the image comes from Toya's brand
            files. On phones the space is not shown.
          </li>
          <li>
            The "Latest jobs" strip shows LaTrae roles only in Sprint 1; aggregated roles join in
            Sprint 3B.
          </li>
          <li>
            Pay ranges and equipment chips on job cards are not in the data model yet; shown here
            for the review.
          </li>
        </ul>
      }
    >
      <section class="bg-navy py-12 text-white lg:py-20">
        <Container>
          <div class="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
            <div>
              <p class="text-sm font-bold uppercase tracking-widest text-gray-300">
                Diesel {'·'} heavy equipment {'·'} power generation
              </p>
              <h1 class="mt-3 max-w-xl text-4xl font-black leading-tight sm:text-5xl">
                Built for techs who keep the heavy stuff running.
              </h1>
              <p class="mt-4 max-w-xl text-lg text-gray-200">
                Real diesel and heavy equipment jobs. One short screen, one Verified profile, no
                guesswork. Placeholder copy.
              </p>
              <div class="mt-8 flex flex-wrap gap-3">
                <ButtonLink href={`${root}jobs/`}>Browse jobs</ButtonLink>
                <a
                  href={`${root}signup/`}
                  class="inline-flex min-h-11 items-center justify-center border-2 border-white px-6 py-2 font-bold uppercase tracking-wide text-white hover:bg-white hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red"
                >
                  Sign up
                </a>
              </div>
            </div>
            <div class="hidden aspect-[4/3] items-center justify-center border-2 border-dashed border-white/40 lg:flex">
              <MockupTag label="Photo" note="from Toya's brand files" />
            </div>
          </div>
        </Container>
      </section>

      <Container>
        <section class="mt-12" aria-labelledby="how-it-works">
          <h2 id="how-it-works" class="text-2xl font-black text-navy">
            How it works
          </h2>
          <div class="mt-6 grid gap-6 sm:grid-cols-3">
            {steps.map((step) => (
              <div key={step.tag} class="border border-gray-300 bg-white p-4 shadow-card">
                <Tag tone="red">{step.tag}</Tag>
                <h3 class="mt-3 text-lg font-black text-navy">{step.title}</h3>
                <p class="mt-2 text-sm text-gray-700">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section class="mt-12" aria-labelledby="latest-jobs">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 id="latest-jobs" class="text-2xl font-black text-navy">
              Latest jobs
            </h2>
            <MockupTag label="Sprint 1" note="LaTrae roles only at launch" />
          </div>
          <div class="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {latest.map((job) => (
              <JobCard key={job.slug} job={job} root={root} />
            ))}
          </div>
          <p class="mt-6">
            <ButtonLink href={`${root}jobs/`} variant="secondary">
              See all jobs
            </ButtonLink>
          </p>
        </section>

        <section class="mt-12" aria-labelledby="trades">
          <h2 id="trades" class="text-2xl font-black text-navy">
            Trades we cover
          </h2>
          <p class="mt-2 max-w-prose text-sm text-gray-700">
            From truck and fleet to power generation. Placeholder copy.
          </p>
          <div class="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {(tradeList.groups ?? []).map((group) => (
              <p
                key={group}
                class="border border-gray-300 bg-white px-3 py-2.5 text-sm font-bold text-navy shadow-card"
              >
                {group}
              </p>
            ))}
          </div>
        </section>
      </Container>
    </Shell>
  );
}
