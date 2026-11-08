// Job Seekers, For Employers, About, Privacy y Terms.

import { ButtonLink } from '../components/Button.js';
import { Chip } from '../components/Chip.js';
import { Container } from '../components/Container.js';
import { IconCheck } from '../components/icons.js';
import { MockupTag } from '../mockup-ui/MockupTag.js';
import { Shell } from './shell.js';

export function JobSeekersPage({ root }: { root: string }) {
  return (
    <Shell
      root={root}
      title={'Job seekers — DieselJobsUSA'}
      screen="Job seekers"
      sprint="1"
      notes={
        <ul class="list-disc space-y-1 pl-5">
          <li>All copy is placeholder; Toya's wording replaces it.</li>
          <li>
            The Verified mark is the only thing a technician ever sees about the screen result.
          </li>
          <li>This page promises nothing beyond Sprint 1 (no profile search, no job alerts).</li>
        </ul>
      }
    >
      <Container class="pt-8" narrow>
        <h1 class="text-3xl font-black text-navy">For job seekers</h1>
        <p class="mt-3 max-w-prose text-lg text-gray-800">
          You know your way around an engine bay. We make sure employers know it too. Placeholder
          copy.
        </p>

        <section class="mt-8 max-w-prose" aria-labelledby="what-you-get">
          <h2 id="what-you-get" class="text-xl font-black text-navy">
            What you get
          </h2>
          <ul class="mt-4 space-y-3">
            {[
              'Real diesel and heavy equipment jobs, not spam. Placeholder.',
              'One short screen about the equipment you have worked on — by phone, on your time. Placeholder.',
              'A Verified mark on your applications once you finish the screen. Placeholder.',
              'Your info stays yours: you choose what is shared, and you can delete your record any time. Placeholder.',
            ].map((item) => (
              <li key={item} class="flex gap-2 text-gray-800">
                <IconCheck class="size-5 shrink-0 text-red" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section class="mt-8 max-w-prose" aria-labelledby="verified-mark">
          <div class="flex flex-wrap items-center gap-2">
            <h2 id="verified-mark" class="text-xl font-black text-navy">
              The Verified mark
            </h2>
            <Chip tone="navy">Verified</Chip>
          </div>
          <p class="mt-3 text-gray-800">
            Finish the screen and your profile carries the Verified mark. It tells employers a real
            conversation about real equipment backs your application. Placeholder copy.
          </p>
        </section>

        <p class="mt-10">
          <ButtonLink href={`${root}signup/`}>Sign up</ButtonLink>
        </p>
      </Container>
    </Shell>
  );
}

export function ForEmployersPage({ root }: { root: string }) {
  return (
    <Shell
      root={root}
      title={'For employers — DieselJobsUSA'}
      screen="For employers"
      sprint="1"
      notes={
        <ul class="list-disc space-y-1 pl-5">
          <li>All copy is placeholder.</li>
          <li>
            In Sprint 1 there is no employer portal: this page explains hosted roles and gives a
            contact placeholder. Employer accounts and candidate search arrive in Sprint 2; paid
            featured placement in Sprint 4 (pieces tagged below).
          </li>
        </ul>
      }
    >
      <Container class="pt-8" narrow>
        <h1 class="text-3xl font-black text-navy">For employers</h1>
        <p class="mt-3 max-w-prose text-lg text-gray-800">
          Stop sorting resumes that say "diesel" and mean "oil changes". Placeholder copy.
        </p>

        <section class="mt-8 max-w-prose" aria-labelledby="today">
          <h2 id="today" class="text-xl font-black text-navy">
            Hire through a hosted role
          </h2>
          <p class="mt-3 text-gray-800">
            Roles on DieselJobsUSA are hosted and managed for you: your opening is posted,
            applicants take a short equipment screen, and you get candidates with a Verified mark.
            Placeholder copy.
          </p>
          <p class="mt-3 text-gray-800">
            Contact us to post a role. Placeholder {'—'} contact details from Toya go here.
          </p>
        </section>

        <section class="mt-8 max-w-prose" aria-labelledby="coming">
          <h2 id="coming" class="text-xl font-black text-navy">
            Coming later
          </h2>
          <ul class="mt-4 space-y-3">
            <li class="flex flex-wrap items-center gap-2 text-gray-800">
              <MockupTag label="Sprint 2" />
              Employer accounts and candidate search. Placeholder.
            </li>
            <li class="flex flex-wrap items-center gap-2 text-gray-800">
              <MockupTag label="Sprint 4" />
              Featured placement on the Job Board. Placeholder.
            </li>
          </ul>
        </section>
      </Container>
    </Shell>
  );
}

export function AboutPage({ root }: { root: string }) {
  return (
    <Shell
      root={root}
      title={'About — DieselJobsUSA'}
      screen="About"
      sprint="1"
      notes={
        <ul class="list-disc space-y-1 pl-5">
          <li>All copy is placeholder; the real story comes from Toya.</li>
        </ul>
      }
    >
      <Container class="pt-8" narrow>
        <h1 class="text-3xl font-black text-navy">About DieselJobsUSA</h1>
        <div class="mt-4 max-w-prose space-y-3 text-gray-800">
          <p>
            DieselJobsUSA is a job board built only for diesel and heavy equipment technicians, by
            people who have hired them for years. Placeholder copy.
          </p>
          <p>
            We believe a tech's work speaks louder than a resume template, so we built a screen that
            asks about the equipment, not the buzzwords. Placeholder copy.
          </p>
        </div>
      </Container>
    </Shell>
  );
}

function LegalSection({ title, paragraphs }: { title: string; paragraphs: number }) {
  const bodies = Array.from({ length: paragraphs }, (_, i) => `${title}-p${i + 1}`);
  return (
    <section class="mt-8 max-w-prose">
      <h2 class="text-xl font-black text-navy">{title}</h2>
      {bodies.map((key) => (
        <p key={key} class="mt-3 text-gray-700 italic">
          Attorney's wording goes here.
        </p>
      ))}
    </section>
  );
}

export function PrivacyPage({ root }: { root: string }) {
  return (
    <Shell
      root={root}
      title={'Privacy policy — DieselJobsUSA'}
      screen="Privacy"
      sprint="1"
      notes={
        <ul class="list-disc space-y-1 pl-5">
          <li>
            Structure only: every section body is a placeholder until the attorney's text arrives
            (via Toya).
          </li>
          <li>Confirm the section list covers what the attorney plans to send.</li>
        </ul>
      }
    >
      <Container class="pt-8" narrow>
        <h1 class="text-3xl font-black text-navy">Privacy policy</h1>
        <p class="mt-2 text-sm text-gray-600">Draft structure {'·'} attorney's wording pending</p>
        <LegalSection title="What we collect" paragraphs={2} />
        <LegalSection title="How we use it" paragraphs={2} />
        <LegalSection title="Who we share it with" paragraphs={2} />
        <LegalSection title="Text messages and email" paragraphs={1} />
        <LegalSection title="Deleting your record" paragraphs={1} />
        <LegalSection title="Contact" paragraphs={1} />
      </Container>
    </Shell>
  );
}

export function TermsPage({ root }: { root: string }) {
  return (
    <Shell
      root={root}
      title={'Terms of use — DieselJobsUSA'}
      screen="Terms"
      sprint="1"
      notes={
        <ul class="list-disc space-y-1 pl-5">
          <li>
            Structure only: every section body is a placeholder until the attorney's text arrives
            (via Toya).
          </li>
        </ul>
      }
    >
      <Container class="pt-8" narrow>
        <h1 class="text-3xl font-black text-navy">Terms of use</h1>
        <p class="mt-2 text-sm text-gray-600">Draft structure {'·'} attorney's wording pending</p>
        <LegalSection title="Using the site" paragraphs={2} />
        <LegalSection title="Your account" paragraphs={1} />
        <LegalSection title="Job listings" paragraphs={1} />
        <LegalSection title="Limitation of liability" paragraphs={1} />
        <LegalSection title="Changes to these terms" paragraphs={1} />
      </Container>
    </Shell>
  );
}
