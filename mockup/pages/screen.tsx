// La entrevista no se dibuja: corre en las páginas de ScreenProof (Trabian),
// 05_mockup.md §5. Esta tarjeta de paso muestra dónde cae en el recorrido.
// El regreso (GET /account/screen/return, 03 §4.6) tiene tres estados:
// guardando, verificado y resultado pendiente (sin prometer un correo).

import type { ComponentChildren } from 'preact';
import { ButtonLink } from '../components/Button.js';
import { Chip } from '../components/Chip.js';
import { Container } from '../components/Container.js';
import { Notice } from '../components/forms.js';
import { Tag } from '../components/Tag.js';
import { type FlowLink, MockupFlow } from '../mockup-ui/MockupFlow.js';
import { Shell } from './shell.js';

const journey = [
  'Sign up',
  'Phone code',
  'Resume (optional)',
  'Interview on ScreenProof',
  'Verified',
] as const;

export function ScreenInterviewPage({ root }: { root: string }) {
  return (
    <Shell
      root={root}
      title={'Your skills screen — DieselJobsUSA'}
      screen="Interview step card"
      sprint="1"
      notes={
        <ul class="list-disc space-y-1 pl-5">
          <li>
            Not a design: the interview runs on Trabian's ScreenProof pages and is not drawn in this
            mockup. The card exists so the journey reads complete.
          </li>
          <li>When the technician finishes, ScreenProof sends him back to the return page.</li>
        </ul>
      }
    >
      <Container class="pt-8" narrow>
        <div class="mx-auto max-w-xl">
          <h1 class="text-3xl font-black text-navy">Your skills screen</h1>
          <ol class="mt-5 flex flex-wrap items-center gap-2">
            {journey.map((step, index) => (
              <li key={step} class="flex items-center gap-2">
                <Tag tone={step === 'Interview on ScreenProof' ? 'red' : 'gray'}>
                  Step {index + 1} {'·'} {step}
                </Tag>
              </li>
            ))}
          </ol>
          <div class="mt-6 border-2 border-dashed border-gray-400 bg-white p-5">
            <p class="font-black text-navy">Interview runs on Trabian's ScreenProof pages</p>
            <p class="mt-1 text-sm text-gray-700">(not drawn here)</p>
            <p class="mt-3 max-w-prose text-gray-800">
              A short conversation about the equipment you've worked on {'—'} about 10 minutes. When
              you finish, you land back on DieselJobsUSA.
            </p>
          </div>
          <MockupFlow
            links={[
              {
                label: 'Interview done → back from the interview',
                href: `${root}account/screen/return/`,
              },
            ]}
          />
        </div>
      </Container>
    </Shell>
  );
}

function ReturnPage({
  root,
  screen,
  children,
  notes,
  flow,
}: {
  root: string;
  screen: string;
  children: ComponentChildren;
  notes: ComponentChildren;
  flow: FlowLink[];
}) {
  return (
    <Shell
      root={root}
      title={'Welcome back — DieselJobsUSA'}
      screen={screen}
      sprint="1"
      notes={notes}
    >
      <Container class="pt-8" narrow>
        <div class="mx-auto max-w-xl">{children}</div>
        <div class="mx-auto max-w-xl">
          <MockupFlow links={flow} />
        </div>
      </Container>
    </Shell>
  );
}

export function ScreenReturnSavingPage({ root }: { root: string }) {
  return (
    <ReturnPage
      root={root}
      screen="Back from the interview — saving your result"
      notes={
        <ul class="list-disc space-y-1 pl-5">
          <li>
            The page reads nothing from the screener's URL; it trusts only the session. In the build
            it refreshes every 5 seconds for up to 2 minutes.
          </li>
        </ul>
      }
      flow={[
        { label: 'Result arrived → verified', href: `${root}account/screen/return/verified/` },
        { label: 'Still waiting → result pending', href: `${root}account/screen/return/pending/` },
      ]}
    >
      <h1 class="text-3xl font-black text-navy">Thanks, Marcus!</h1>
      <p class="mt-3 max-w-prose text-lg text-gray-800">We're saving your result.</p>
      <p class="mt-2 max-w-prose text-sm text-gray-600">
        This page updates on its own {'—'} no need to refresh.
      </p>
    </ReturnPage>
  );
}

export function ScreenReturnVerifiedPage({ root }: { root: string }) {
  return (
    <ReturnPage
      root={root}
      screen="Back from the interview — verified"
      notes={
        <ul class="list-disc space-y-1 pl-5">
          <li>Only "Verified" and the date {'—'} never a grade (SEC-55 prepares this).</li>
        </ul>
      }
      flow={[{ label: 'Next steps — completed', href: `${root}account/verified/` }]}
    >
      <p>
        <Chip tone="navy">Verified</Chip>
      </p>
      <h1 class="mt-2 text-3xl font-black text-navy">You're verified</h1>
      <p class="mt-3 max-w-prose text-lg text-gray-800">
        Your screen is saved. Your profile now carries the Verified mark.
      </p>
      <p class="mt-6">
        <ButtonLink href={`${root}account/verified/`}>See your next steps</ButtonLink>
      </p>
    </ReturnPage>
  );
}

export function ScreenReturnPendingPage({ root }: { root: string }) {
  return (
    <ReturnPage
      root={root}
      screen="Back from the interview — result pending"
      notes={
        <ul class="list-disc space-y-1 pl-5">
          <li>
            The copy promises no email: whether a "result saved" email exists is still an open
            decision (05 §9, "Pendiente de alinear en 03"). The nightly sweep recovers the result
            either way.
          </li>
        </ul>
      }
      flow={[
        {
          label: 'Result arrived later → verified',
          href: `${root}account/screen/return/verified/`,
        },
      ]}
    >
      <h1 class="text-3xl font-black text-navy">Almost there</h1>
      <div class="mt-4">
        <Notice tone="info" title="Your result is still saving">
          Your result will show on this page. Come back any time with the link in your email.
        </Notice>
      </div>
    </ReturnPage>
  );
}
