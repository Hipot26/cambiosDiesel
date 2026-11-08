// Pantalla del código SMS (03 §4.2) en sus cinco estados: ingresar, reenviado,
// código incorrecto, demasiados intentos y "no podemos enviar textos". Para
// todos, el texto idéntico de SEC-48: la pantalla nunca revela si el email ya
// estaba registrado.

import type { ComponentChildren } from 'preact';
import { SubmitButton } from '../components/Button.js';
import { Container } from '../components/Container.js';
import { CsrfTokenInput, Notice, TextField } from '../components/forms.js';
import { sampleCandidate } from '../data/candidate.js';
import { MockupFlow } from '../mockup-ui/MockupFlow.js';
import { Shell } from './shell.js';

const FAKE_CSRF = 'mockup-csrf-token';

// El texto para todos, idéntico en el camino nuevo y en el duplicado (SEC-48)
const SEC48_COPY = "Didn't get a code? If you'd registered before, we emailed you a link";

interface VerifyState {
  screen: string;
  notice?: ComponentChildren;
  codeError?: string;
  // "No podemos enviar textos": sin campo de código, el camino sigue por email
  smsBlocked?: boolean;
  extraNote?: ComponentChildren;
}

function VerifyPage({ root, state }: { root: string; state: VerifyState }) {
  return (
    <Shell
      root={root}
      title={'Enter your code — DieselJobsUSA'}
      screen={state.screen}
      sprint="1"
      notes={
        <ul class="list-disc space-y-1 pl-5">
          <li>
            Everyone sees the same line {'—'} "{SEC48_COPY}" {'—'} whether the email was new or
            already registered. The screen never reveals which one it was.
          </li>
          <li>The code autofills from the SMS (autocomplete="one-time-code").</li>
          <li>Resend has hourly and daily limits; the screen looks the same when one is hit.</li>
          {state.extraNote}
        </ul>
      }
    >
      <Container class="pt-8" narrow>
        <div class="mx-auto max-w-xl">
          <h1 class="text-3xl font-black text-navy">Check your phone</h1>
          <p class="mt-2 text-gray-800">
            We sent a 6-digit code to <span class="font-bold">{sampleCandidate.phoneMasked}</span>.
          </p>

          {state.notice && <div class="mt-5">{state.notice}</div>}

          {state.smsBlocked ? (
            <div class="mt-5 max-w-prose space-y-3 text-gray-800">
              <p>
                Your signup is saved. We sent a sign-in link to{' '}
                <span class="font-bold">{sampleCandidate.email}</span> {'—'} open it to keep going
                and upload your resume.
              </p>
            </div>
          ) : (
            // T-11 agrega method="post" y action
            <form class="mt-6 space-y-5">
              <CsrfTokenInput token={FAKE_CSRF} />
              <div class="max-w-48">
                <TextField
                  id="code"
                  name="code"
                  label="6-digit code"
                  required
                  autocomplete="one-time-code"
                  inputmode="numeric"
                  pattern="[0-9]{6}"
                  maxlength={6}
                  error={state.codeError}
                />
              </div>
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
                <SubmitButton>Verify my phone</SubmitButton>
                <SubmitButton variant="secondary">Send a new code</SubmitButton>
              </div>
            </form>
          )}

          <p class="mt-6 max-w-prose text-sm text-gray-700">{SEC48_COPY}.</p>

          <MockupFlow
            links={
              state.smsBlocked
                ? [{ label: 'Email link → next steps', href: `${root}account/` }]
                : [{ label: 'Code accepted → next steps', href: `${root}account/` }]
            }
          />
        </div>
      </Container>
    </Shell>
  );
}

export function VerifyEnterPage({ root }: { root: string }) {
  return <VerifyPage root={root} state={{ screen: 'SMS code — enter the code' }} />;
}

export function VerifyResentPage({ root }: { root: string }) {
  return (
    <VerifyPage
      root={root}
      state={{
        screen: 'SMS code — code resent',
        notice: (
          <Notice tone="success" title="We sent a new code">
            Give it a minute to arrive. Only the newest code works.
          </Notice>
        ),
      }}
    />
  );
}

export function VerifyWrongCodePage({ root }: { root: string }) {
  return (
    <VerifyPage
      root={root}
      state={{
        screen: 'SMS code — wrong code',
        codeError: "That code didn't work. Check it and try again.",
        extraNote: (
          <li>
            The wrong-code message is the same whatever the reason (typo, expired, duplicate path
            without a matching phone): it reveals nothing else.
          </li>
        ),
      }}
    />
  );
}

export function VerifyTooManyAttemptsPage({ root }: { root: string }) {
  return (
    <VerifyPage
      root={root}
      state={{
        screen: 'SMS code — too many attempts',
        codeError: 'Too many tries with that code. Send a new code and use the newest one.',
        extraNote: <li>After the attempt limit, only "Send a new code" moves things forward.</li>,
      }}
    />
  );
}

export function VerifyNoSmsPage({ root }: { root: string }) {
  return (
    <VerifyPage
      root={root}
      state={{
        screen: "SMS code — we can't text this number",
        smsBlocked: true,
        notice: (
          <Notice tone="warn" title="We can't send texts to this number right now">
            Continue by email instead {'—'} nothing is lost.
          </Notice>
        ),
        extraNote: (
          <li>
            The candidate is already saved from step one. The same screen covers every blocked-SMS
            reason (carrier, limits, a prior STOP): it never says which one.
          </li>
        ),
      }}
    />
  );
}
