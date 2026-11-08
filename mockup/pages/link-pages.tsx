// Páginas que abren los enlaces del correo (03 §2.1: /r/:token y
// /unsubscribe/:token): enlace vencido con "pide un enlace nuevo", confirmar
// borrado y la baja. Las confirmaciones son una página con un botón que gasta
// el token en el POST; el GET no hace nada (SEC-50: los filtros del correo
// abren los enlaces antes que la persona).

import type { ComponentChildren } from 'preact';
import { ButtonLink, SubmitButton } from '../components/Button.js';
import { Container } from '../components/Container.js';
import { CsrfTokenInput, Notice, TextField } from '../components/forms.js';
import { type FlowLink, MockupFlow } from '../mockup-ui/MockupFlow.js';
import { MockupTag } from '../mockup-ui/MockupTag.js';
import { TurnstilePlaceholder } from '../mockup-ui/TurnstilePlaceholder.js';
import { Shell } from './shell.js';

const FAKE_CSRF = 'mockup-csrf-token';

function TokenPage({
  root,
  screen,
  notes,
  flow,
  children,
}: {
  root: string;
  screen: string;
  notes: ComponentChildren;
  flow: FlowLink[];
  children: ComponentChildren;
}) {
  return (
    <Shell root={root} title={`${screen} — DieselJobsUSA`} screen={screen} sprint="1" notes={notes}>
      <Container class="pt-8" narrow>
        <div class="mx-auto max-w-xl">
          {children}
          <MockupFlow links={flow} />
        </div>
      </Container>
    </Shell>
  );
}

export function ExpiredLinkPage({ root }: { root: string }) {
  return (
    <TokenPage
      root={root}
      screen="Expired or invalid link"
      notes={
        <ul class="list-disc space-y-1 pl-5">
          <li>
            The same neutral page covers expired, already used and invalid tokens: it never says
            which, and shows no data.
          </li>
          <li>
            The "send me a new link" form carries Turnstile and an IP limit like every public form,
            and the response is always the same whether the email exists or not.
          </li>
        </ul>
      }
      flow={[{ label: 'New link opened → next steps', href: `${root}account/` }]}
    >
      <h1 class="text-3xl font-black text-navy">That link doesn't work anymore</h1>
      <p class="mt-3 max-w-prose text-gray-800">
        Links expire to protect your record. Ask for a new one {'—'} it arrives in a minute.
      </p>
      {/* T-13 agrega method="post" y action */}
      <form class="mt-6 max-w-sm space-y-5">
        <CsrfTokenInput token={FAKE_CSRF} />
        <TextField
          id="email"
          name="email"
          label="Email"
          type="email"
          required
          autocomplete="email"
        />
        <TurnstilePlaceholder />
        <SubmitButton>Send me a new link</SubmitButton>
      </form>
      <div class="mt-6 max-w-sm">
        <p class="mb-1">
          <MockupTag label="After submit" note="the reply is always this, exist or not" />
        </p>
        <Notice tone="info">If a record exists with that email, we've sent you a link.</Notice>
      </div>
    </TokenPage>
  );
}

export function DeleteConfirmPage({ root }: { root: string }) {
  return (
    <TokenPage
      root={root}
      screen="Confirm deletion — button"
      notes={
        <ul class="list-disc space-y-1 pl-5">
          <li>
            Opening this link deletes nothing: email security scanners open links on their own, so
            the token is only spent by the button's POST (SEC-50 prepares this).
          </li>
          <li>The link works once and expires in 1 hour.</li>
        </ul>
      }
      flow={[
        { label: 'Yes, delete → deletion done', href: `${root}r/delete-confirm/done/` },
        { label: 'Keep my record → next steps', href: `${root}account/` },
      ]}
    >
      <h1 class="text-3xl font-black text-navy">Delete your record?</h1>
      <p class="mt-3 max-w-prose text-gray-800">
        This removes your signup, your resume files and your screen results {'—'} here and at our
        screening partner. It can't be undone.
      </p>
      {/* T-13 agrega method="post" y action (POST /r/:token/confirm) */}
      <form class="mt-6">
        <CsrfTokenInput token={FAKE_CSRF} />
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SubmitButton>Yes, delete my record</SubmitButton>
          <ButtonLink href={`${root}account/`} variant="secondary">
            Keep my record
          </ButtonLink>
        </div>
      </form>
    </TokenPage>
  );
}

export function DeleteDonePage({ root }: { root: string }) {
  return (
    <TokenPage
      root={root}
      screen="Confirm deletion — done"
      notes={
        <ul class="list-disc space-y-1 pl-5">
          <li>
            The deletion chain runs in the background: this record, the screener's copy, and a staff
            task for the RecruiterFlow copy.
          </li>
        </ul>
      }
      flow={[{ label: 'Home', href: `${root}home/` }]}
    >
      <h1 class="text-3xl font-black text-navy">Your record is being deleted</h1>
      <p class="mt-3 max-w-prose text-gray-800">
        That's done {'—'} your signup, files and screen results are on their way out, including at
        our screening partner. If you change your mind later, you're welcome to sign up again.
      </p>
    </TokenPage>
  );
}

export function UnsubscribePage({ root }: { root: string }) {
  return (
    <TokenPage
      root={root}
      screen="Email unsubscribe — button"
      notes={
        <ul class="list-disc space-y-1 pl-5">
          <li>
            The button withdraws the email consent; the record itself stays. Opening the link does
            nothing by itself (SEC-50); mail apps can also unsubscribe directly via one-click
            (List-Unsubscribe).
          </li>
        </ul>
      }
      flow={[{ label: 'Stop these emails → done', href: `${root}unsubscribe/done/` }]}
    >
      <h1 class="text-3xl font-black text-navy">Stop getting these emails?</h1>
      <p class="mt-3 max-w-prose text-gray-800">
        We'll stop sending you updates and reminders. Your record stays as it is {'—'} this only
        turns off email.
      </p>
      {/* T-13 agrega method="post" y action (POST /unsubscribe/:token) */}
      <form class="mt-6">
        <CsrfTokenInput token={FAKE_CSRF} />
        <SubmitButton>Stop these emails</SubmitButton>
      </form>
    </TokenPage>
  );
}

export function UnsubscribeDonePage({ root }: { root: string }) {
  return (
    <TokenPage
      root={root}
      screen="Email unsubscribe — done"
      notes={
        <ul class="list-disc space-y-1 pl-5">
          <li>A second unsubscribe the same day adds nothing (idempotent).</li>
        </ul>
      }
      flow={[{ label: 'Home', href: `${root}home/` }]}
    >
      <h1 class="text-3xl font-black text-navy">You're unsubscribed</h1>
      <p class="mt-3 max-w-prose text-gray-800">
        No more update emails. If you asked for a sign-in link, that one still arrives {'—'} it's
        how you get back into your record.
      </p>
    </TokenPage>
  );
}
