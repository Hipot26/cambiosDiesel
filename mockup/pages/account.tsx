// Página de siguientes pasos (/account, 03 §4.3) en sus nueve estados, más
// "borrar mi registro" (pedirlo y "revisa tu email"). Recibe CandidateView,
// que no tiene nivel (SEC-55): el técnico solo ve "Verified" y la fecha.
// No promete nada del Sprint 2 (guardar, alertas, aplicar, visibilidad).

import type { ComponentChildren } from 'preact';
import { ButtonLink, SubmitButton } from '../components/Button.js';
import { Chip } from '../components/Chip.js';
import { Container } from '../components/Container.js';
import { CsrfTokenInput, FileField, Notice } from '../components/forms.js';
import { candidateWith } from '../data/candidate.js';
import type { CandidateView } from '../data/types.js';
import { type FlowLink, MockupFlow } from '../mockup-ui/MockupFlow.js';
import { Shell } from './shell.js';

const FAKE_CSRF = 'mockup-csrf-token';

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function baseNotes(extra?: ComponentChildren) {
  return (
    <ul class="list-disc space-y-1 pl-5">
      {extra}
      <li>
        This page promises nothing from Sprint 2: no saved jobs, no alerts, no quick apply. The
        "Employers can find you" switch is <strong>not</strong> here in Sprint 1 {'—'} it arrives
        with accounts in Sprint 2 (confirm with Toya).
      </li>
      <li>
        The screen result only ever shows as "Verified" with a date {'—'} never a grade or score.
      </li>
      <li>Uploading a resume is the primary action; "build one for me" sits below it, quieter.</li>
    </ul>
  );
}

function UploadForm({ legend }: { legend: string }) {
  return (
    // T-11 agrega method="post" y action (POST /account/resume)
    <form class="mt-3 space-y-3">
      <CsrfTokenInput token={FAKE_CSRF} />
      <FileField
        id="resume-file"
        name="resume"
        label={legend}
        hint="PDF or Word, up to 5 MB."
        accept=".pdf,.doc,.docx"
      />
      <SubmitButton>Upload your resume</SubmitButton>
    </form>
  );
}

function BuildOneNote({ root }: { root: string }) {
  return (
    <p class="mt-3 text-sm text-gray-700">
      No resume?{' '}
      <a
        href={`${root}account/screen/`}
        class="font-semibold text-navy underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red"
      >
        Answer a few questions and we'll build one for you
      </a>
      .
    </p>
  );
}

function SectionCard({ title, children }: { title: string; children: ComponentChildren }) {
  return (
    <section class="border border-gray-300 bg-white p-4 shadow-card sm:p-5">
      <h2 class="text-xl font-black text-navy">{title}</h2>
      {children}
    </section>
  );
}

interface AccountPageProps {
  root: string;
  screen: string;
  candidate: CandidateView;
  topNotice?: ComponentChildren;
  resumeCard: ComponentChildren;
  screenCard: ComponentChildren;
  extraNotes?: ComponentChildren;
  flow: FlowLink[];
}

function AccountPage(props: AccountPageProps) {
  const { root, screen, candidate, topNotice, resumeCard, screenCard, extraNotes, flow } = props;
  return (
    <Shell
      root={root}
      title={'Your next steps — DieselJobsUSA'}
      screen={screen}
      sprint="1"
      notes={baseNotes(extraNotes)}
    >
      <Container class="pt-8" narrow>
        <div class="mx-auto max-w-xl">
          <h1 class="text-3xl font-black text-navy">Your next steps</h1>
          <p class="mt-2 text-gray-800">
            Hi {candidate.firstName} {'—'} here's where you stand.
          </p>

          {topNotice && <div class="mt-5">{topNotice}</div>}

          <div class="mt-6 space-y-5">
            <SectionCard title="Your resume">{resumeCard}</SectionCard>
            <SectionCard title="Your skills screen">{screenCard}</SectionCard>
          </div>

          <p class="mt-8">
            <a
              href={`${root}account/delete/`}
              class="flex min-h-11 items-center text-sm font-semibold text-red underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red"
            >
              Delete my record
            </a>
          </p>

          <MockupFlow links={flow} />
        </div>
      </Container>
    </Shell>
  );
}

// Tarjetas que se repiten entre estados

function resumeOnFile(candidate: CandidateView) {
  return (
    <div>
      <p class="mt-2 flex flex-wrap items-center gap-2 text-gray-800">
        <Chip tone="navy">On file</Chip>
        Uploaded {candidate.resumeUploadedAt ? formatDate(candidate.resumeUploadedAt) : ''}.
      </p>
      <details class="mt-2">
        <summary class="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-navy underline-offset-4 hover:underline">
          Replace it
        </summary>
        <UploadForm legend="New resume" />
      </details>
    </div>
  );
}

function screenInvite(root: string, kind: 'primary' | 'secondary') {
  return (
    <div>
      <p class="mt-2 max-w-prose text-gray-800">
        A short interview about the equipment you've worked on {'—'} about 10 minutes, on your time.
        Finish it and your profile is marked Verified.
      </p>
      <p class="mt-3">
        <ButtonLink href={`${root}account/screen/`} variant={kind}>
          Verify my skills
        </ButtonLink>
      </p>
    </div>
  );
}

// Los nueve estados

export function AccountNotStartedPage({ root }: { root: string }) {
  return (
    <AccountPage
      root={root}
      screen="Next steps — not started"
      candidate={candidateWith({})}
      resumeCard={
        <div>
          <UploadForm legend="Resume" />
          <BuildOneNote root={root} />
        </div>
      }
      screenCard={screenInvite(root, 'secondary')}
      flow={[
        { label: 'Upload → file under review', href: `${root}account/resume-reviewing/` },
        { label: 'Verify my skills → interview step', href: `${root}account/screen/` },
      ]}
    />
  );
}

export function AccountResumeReviewingPage({ root }: { root: string }) {
  return (
    <AccountPage
      root={root}
      screen="Next steps — file under review"
      candidate={candidateWith({ resumeStatus: 'pending' })}
      resumeCard={
        <div class="mt-2">
          <Notice tone="info" title="We're checking your file">
            This usually takes under a minute. The page updates on its own.
          </Notice>
        </div>
      }
      screenCard={
        <p class="mt-2 max-w-prose text-gray-800">
          Your screen opens as soon as your file is checked.
        </p>
      }
      extraNotes={
        <li>
          While the file is in review the screen can't start (the real page polls the status and
          offers the button when the file is clean).
        </li>
      }
      flow={[
        { label: 'File clean → not started with resume', href: `${root}account/screen-started/` },
        { label: 'File rejected', href: `${root}account/resume-rejected/` },
      ]}
    />
  );
}

export function AccountResumeRejectedPage({ root }: { root: string }) {
  return (
    <AccountPage
      root={root}
      screen="Next steps — file rejected"
      candidate={candidateWith({ resumeStatus: 'rejected' })}
      resumeCard={
        <div>
          <div class="mt-2">
            <Notice tone="warn" title="We couldn't use that file">
              Try a PDF or Word file up to 5 MB.
            </Notice>
          </div>
          <UploadForm legend="Upload another file" />
          <BuildOneNote root={root} />
        </div>
      }
      screenCard={screenInvite(root, 'secondary')}
      extraNotes={
        <li>
          The rejected message is the same whether the file was the wrong type, too big or failed
          the malware scan: it never says which.
        </li>
      }
      flow={[
        { label: 'Upload again → file under review', href: `${root}account/resume-reviewing/` },
      ]}
    />
  );
}

export function AccountPhoneUnverifiedPage({ root }: { root: string }) {
  return (
    <AccountPage
      root={root}
      screen="Next steps — phone not verified"
      candidate={candidateWith({ phoneVerified: false })}
      topNotice={
        <Notice tone="info" title="Your phone isn't verified yet">
          <p>
            You can keep going by email. Verify your phone when you're ready {'—'} if you said yes
            to texts, it lets us text you about your screen.
          </p>
          <p class="mt-2">
            <ButtonLink href={`${root}signup/verify/`} variant="secondary">
              Verify my phone
            </ButtonLink>
          </p>
        </Notice>
      }
      resumeCard={
        <div>
          <UploadForm legend="Resume" />
          <BuildOneNote root={root} />
        </div>
      }
      screenCard={screenInvite(root, 'secondary')}
      extraNotes={
        <li>
          An unverified phone blocks nothing: the technician reached this page by email link and can
          upload and screen. Texts stay off until the number is confirmed.
        </li>
      }
      flow={[{ label: 'Verify my phone → SMS code', href: `${root}signup/verify/` }]}
    />
  );
}

export function AccountScreenStartedPage({ root }: { root: string }) {
  return (
    <AccountPage
      root={root}
      screen="Next steps — screen started"
      candidate={candidateWith({
        screenStatus: 'started',
        resumeStatus: 'clean',
        resumeUploadedAt: '2026-10-20',
      })}
      resumeCard={resumeOnFile(
        candidateWith({ resumeStatus: 'clean', resumeUploadedAt: '2026-10-20' }),
      )}
      screenCard={
        <div>
          <p class="mt-2 max-w-prose text-gray-800">
            Your screen is in progress. Pick up right where you left off.
          </p>
          <p class="mt-3">
            <ButtonLink href={`${root}account/screen/`}>Resume my screen</ButtonLink>
          </p>
        </div>
      }
      flow={[{ label: 'Resume my screen → interview step', href: `${root}account/screen/` }]}
    />
  );
}

export function AccountScreenAbandonedPage({ root }: { root: string }) {
  return (
    <AccountPage
      root={root}
      screen="Next steps — screen abandoned"
      candidate={candidateWith({
        screenStatus: 'abandoned',
        resumeStatus: 'clean',
        resumeUploadedAt: '2026-10-20',
        questionsRemaining: 4,
      })}
      resumeCard={resumeOnFile(
        candidateWith({ resumeStatus: 'clean', resumeUploadedAt: '2026-10-20' }),
      )}
      screenCard={
        <div>
          <p class="mt-2 max-w-prose text-gray-800">
            You're close {'—'} <span class="font-bold">4 questions left</span>. Your earlier answers
            are saved.
          </p>
          <p class="mt-3">
            <ButtonLink href={`${root}account/screen/`}>Finish my screen</ButtonLink>
          </p>
        </div>
      }
      extraNotes={<li>The questions-left count comes from the screener's progress data.</li>}
      flow={[{ label: 'Finish my screen → interview step', href: `${root}account/screen/` }]}
    />
  );
}

export function AccountScreenerUnavailablePage({ root }: { root: string }) {
  return (
    <AccountPage
      root={root}
      screen="Next steps — screener unavailable"
      candidate={candidateWith({ resumeStatus: 'clean', resumeUploadedAt: '2026-10-20' })}
      topNotice={
        <Notice tone="warn" title="The screen isn't available right now">
          Your signup and resume are saved. We'll email you as soon as it's back {'—'} nothing to
          redo.
        </Notice>
      }
      resumeCard={resumeOnFile(
        candidateWith({ resumeStatus: 'clean', resumeUploadedAt: '2026-10-20' }),
      )}
      screenCard={
        <p class="mt-2 max-w-prose text-gray-800">
          We'll email you a link to start your screen when it's available again.
        </p>
      }
      extraNotes={
        <li>
          The site keeps capturing candidates while the screener is down; the "your screen is ready"
          email goes out when it returns (Batch 3).
        </li>
      }
      flow={[{ label: 'Screener back → interview step', href: `${root}account/screen/` }]}
    />
  );
}

export function AccountScreenLimitPage({ root }: { root: string }) {
  return (
    <AccountPage
      root={root}
      screen="Next steps — 30-day limit"
      candidate={candidateWith({
        screenStatus: 'completed',
        resumeStatus: 'clean',
        resumeUploadedAt: '2026-10-20',
        verifiedOn: '2026-10-24',
        screenRetryOn: '2026-11-23',
      })}
      resumeCard={resumeOnFile(
        candidateWith({ resumeStatus: 'clean', resumeUploadedAt: '2026-10-20' }),
      )}
      screenCard={
        <div>
          <p class="mt-2 flex flex-wrap items-center gap-2 text-gray-800">
            <Chip tone="navy">Verified</Chip>
            Verified on {formatDate('2026-10-24')}.
          </p>
          <div class="mt-3">
            <Notice tone="info" title="Want to retake your screen?">
              You took it recently. You can take it again on {formatDate('2026-11-23')}.
            </Notice>
          </div>
        </div>
      }
      extraNotes={
        <li>The 30-day limit applies to the technician only; staff can start a screen any time.</li>
      }
      flow={[{ label: 'Verified state', href: `${root}account/verified/` }]}
    />
  );
}

export function AccountVerifiedPage({ root }: { root: string }) {
  return (
    <AccountPage
      root={root}
      screen="Next steps — completed (Verified)"
      candidate={candidateWith({
        screenStatus: 'completed',
        resumeStatus: 'clean',
        resumeUploadedAt: '2026-10-20',
        verifiedOn: '2026-10-24',
      })}
      resumeCard={resumeOnFile(
        candidateWith({ resumeStatus: 'clean', resumeUploadedAt: '2026-10-20' }),
      )}
      screenCard={
        <div>
          <p class="mt-2 flex flex-wrap items-center gap-2 text-gray-800">
            <Chip tone="navy">Verified</Chip>
            <span>
              Verified on <span class="font-bold">{formatDate('2026-10-24')}</span>.
            </span>
          </p>
          <p class="mt-2 max-w-prose text-gray-800">
            Your profile now carries the Verified mark. That's the whole result {'—'} there's
            nothing else to check.
          </p>
        </div>
      }
      extraNotes={
        <li>
          "Verified on {'<date>'}" is all the technician ever sees {'—'} never a grade.
        </li>
      }
      flow={[{ label: 'Back from the interview', href: `${root}account/screen/return/` }]}
    />
  );
}

// Borrar mi registro: pedirlo y "revisa tu email" (dos pasos, SEC-50)

export function AccountDeletePage({ root }: { root: string }) {
  return (
    <Shell
      root={root}
      title={'Delete my record — DieselJobsUSA'}
      screen="Delete my record — request it"
      sprint="1"
      notes={
        <ul class="list-disc space-y-1 pl-5">
          <li>
            Deletion is two steps: this request emails a confirmation link, and only the button on
            that link's page deletes. Nothing is deleted from here.
          </li>
          <li>Deletion extends to the screener and queues the RecruiterFlow cleanup for staff.</li>
        </ul>
      }
    >
      <Container class="pt-8" narrow>
        <div class="mx-auto max-w-xl">
          <h1 class="text-3xl font-black text-navy">Delete my record</h1>
          <p class="mt-3 max-w-prose text-gray-800">
            This removes your signup, your resume files and your screen results {'—'} here and at
            our screening partner. It can't be undone.
          </p>
          <p class="mt-2 max-w-prose text-gray-800">
            To make sure it's you, we'll email a confirmation link to{' '}
            <span class="font-bold">marcus.webb@example.com</span>. Nothing is deleted until you
            confirm there.
          </p>
          {/* T-13 agrega method="post" y action (POST /account/delete) */}
          <form class="mt-6">
            <CsrfTokenInput token={FAKE_CSRF} />
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
              <SubmitButton>Email me the confirmation link</SubmitButton>
              <ButtonLink href={`${root}account/`} variant="secondary">
                Keep my record
              </ButtonLink>
            </div>
          </form>
          <MockupFlow
            links={[
              {
                label: 'Email sent → check your email',
                href: `${root}account/delete/check-email/`,
              },
            ]}
          />
        </div>
      </Container>
    </Shell>
  );
}

export function AccountDeleteCheckEmailPage({ root }: { root: string }) {
  return (
    <Shell
      root={root}
      title={'Check your email — DieselJobsUSA'}
      screen="Delete my record — check your email"
      sprint="1"
      notes={
        <ul class="list-disc space-y-1 pl-5">
          <li>The confirmation link expires in 1 hour and works once.</li>
        </ul>
      }
    >
      <Container class="pt-8" narrow>
        <div class="mx-auto max-w-xl">
          <h1 class="text-3xl font-black text-navy">Check your email</h1>
          <p class="mt-3 max-w-prose text-gray-800">
            We sent a confirmation link to <span class="font-bold">marcus.webb@example.com</span>.
            It expires in 1 hour. Nothing is deleted until you confirm there.
          </p>
          <MockupFlow
            links={[
              { label: 'Email link → confirm deletion', href: `${root}r/delete-confirm/` },
              { label: 'Changed your mind → next steps', href: `${root}account/` },
            ]}
          />
        </div>
      </Container>
    </Shell>
  );
}
