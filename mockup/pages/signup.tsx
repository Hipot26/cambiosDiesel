// Paso 1 del registro en sus tres estados: formulario base, llegando desde
// "Apply" con el empleo anotado, y errores de campo sin perder lo escrito.
// Seis campos (03 §4.1), tres casillas desmarcadas, Turnstile y el oficio con
// los 39 valores en sus 12 grupos del vocabulario.

import type { ComponentChildren } from 'preact';
import { SubmitButton } from '../components/Button.js';
import { Container } from '../components/Container.js';
import {
  CheckboxField,
  CsrfTokenInput,
  FileField,
  Notice,
  SelectField,
  type SelectGroup,
  TextField,
} from '../components/forms.js';
import { allJobs } from '../data/jobs.js';
import type { PublicJobView } from '../data/types.js';
import { tradesByGroup } from '../data/vocabulary.js';
import { MockupFlow } from '../mockup-ui/MockupFlow.js';
import { MockupTag } from '../mockup-ui/MockupTag.js';
import { TurnstilePlaceholder } from '../mockup-ui/TurnstilePlaceholder.js';
import { Shell } from './shell.js';

// Token falso: en T-11 llega el de la sesión (SEC-36)
const FAKE_CSRF = 'mockup-csrf-token';

const tradeGroups: SelectGroup[] = [...tradesByGroup()].map(([label, options]) => ({
  label,
  options,
}));

interface SignupValues {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  zip?: string;
  trade?: string;
}

interface SignupErrors {
  phone?: string;
  zip?: string;
  trade?: string;
}

function SignupForm({
  root,
  job,
  values = {},
  errors = {},
}: {
  root: string;
  job?: PublicJobView;
  values?: SignupValues;
  errors?: SignupErrors;
}) {
  return (
    <Container class="pt-8" narrow>
      <div class="mx-auto max-w-xl">
        <h1 class="text-3xl font-black text-navy">Sign up</h1>
        <p class="mt-2 max-w-prose text-gray-800">
          Tell us your trade and we'll put your name in front of employers who hire for it.
          Placeholder copy.
        </p>

        {job && (
          <div class="mt-5 border border-gray-300 bg-white p-4 shadow-card">
            <p class="text-xs font-semibold uppercase tracking-wide text-gray-600">
              You're applying for
            </p>
            <p class="mt-1 font-black text-navy">{job.title}</p>
            <p class="text-sm text-gray-800">
              {job.companyName} {'·'} {job.city}, {job.state}
            </p>
            <p class="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-700">
              We'll note this job on your signup.
              <MockupTag label="Proposal" note="real URL is /signup?job=<id>" />
            </p>
          </div>
        )}

        {Object.keys(errors).length > 0 && (
          <div class="mt-5">
            <Notice tone="warn" title="Check the fields marked below">
              Your answers are still here {'—'} fix the marked ones and continue.
            </Notice>
          </div>
        )}

        {/* T-11 agrega method="post" y action; estático no envía nada */}
        <form class="mt-6 space-y-5">
          <CsrfTokenInput token={FAKE_CSRF} />

          <fieldset>
            <legend class="font-bold text-navy">Your name</legend>
            <div class="mt-1 grid grid-cols-2 gap-3">
              <TextField
                id="first-name"
                name="first_name"
                label="First name"
                required
                autocomplete="given-name"
                value={values.firstName}
              />
              <TextField
                id="last-name"
                name="last_name"
                label="Last name"
                required
                autocomplete="family-name"
                value={values.lastName}
              />
            </div>
          </fieldset>

          <TextField
            id="phone"
            name="phone"
            label="Mobile number"
            type="tel"
            required
            autocomplete="tel-national"
            hint="US mobile numbers only. We'll text you a 6-digit code."
            error={errors.phone}
            value={values.phone}
          />

          <TextField
            id="email"
            name="email"
            label="Email"
            type="email"
            required
            autocomplete="email"
            value={values.email}
          />

          <TextField
            id="zip"
            name="zip"
            label="ZIP code"
            required
            autocomplete="postal-code"
            inputmode="numeric"
            pattern="[0-9]{5}"
            maxlength={5}
            hint="So we can match you with jobs near you."
            error={errors.zip}
            value={values.zip}
          />

          <SelectField
            id="trade"
            name="trade_claimed"
            label="Your trade"
            placeholder="Choose your trade"
            groups={tradeGroups}
            required
            error={errors.trade}
            value={values.trade}
          />

          <FileField
            id="resume"
            name="resume"
            label="Resume (optional)"
            hint="PDF or Word, up to 5 MB. You can also add it later."
            accept=".pdf,.doc,.docx"
          />

          <fieldset>
            <legend class="flex flex-wrap items-center gap-2 font-bold text-navy">
              Choose what we can do
              <MockupTag label="Placeholder" note="attorney's wording goes here" />
            </legend>
            <div class="mt-1">
              <CheckboxField id="consent-sms" name="consent_sms">
                Text me about my screen and about jobs for my trade. Message and data rates may
                apply.
              </CheckboxField>
              <CheckboxField id="consent-email" name="consent_email">
                Email me updates about my screen and new jobs for my trade.
              </CheckboxField>
              <CheckboxField
                id="consent-share"
                name="consent_share"
                hint="You can change this any time."
              >
                Share my profile with employers hiring for my trade.
              </CheckboxField>
            </div>
          </fieldset>

          <TurnstilePlaceholder />

          <div>
            <SubmitButton>Continue</SubmitButton>
          </div>
        </form>

        <MockupFlow links={[{ label: 'Continue → SMS code', href: `${root}signup/verify/` }]} />
      </div>
    </Container>
  );
}

function signupNotes(extra?: ComponentChildren) {
  return (
    <ul class="list-disc space-y-1 pl-5">
      {extra}
      <li>
        Name is drawn as two fields in one row ("Your name"): the data model stores first and last
        name and the screener needs the first name on its own. The Walkthrough shows a single field
        {' — '}confirm the two-field version.
      </li>
      <li>
        The three consent boxes start unchecked on purpose: the attorney decides the wording and the
        default. The "share my profile" box decides whether the technician starts findable or
        hidden.
      </li>
      <li>All consent and page copy is placeholder until the attorney's and Toya's text arrive.</li>
      <li>
        The Turnstile box is a placeholder: the mockup loads no external scripts. The real widget
        arrives with the build.
      </li>
      <li>Phone accepts US mobile numbers only.</li>
      <li>The trade list is the shared vocabulary: 39 trades in their 12 groups.</li>
      <li>The resume is optional and never blocks the signup.</li>
    </ul>
  );
}

export function SignupPage({ root }: { root: string }) {
  return (
    <Shell
      root={root}
      title={'Sign up — DieselJobsUSA'}
      screen="Signup form — step one"
      sprint="1"
      notes={signupNotes()}
    >
      <SignupForm root={root} />
    </Shell>
  );
}

const APPLY_JOB_SLUG = 'diesel-technician-charlotte-nc';

export function SignupFromApplyPage({ root }: { root: string }) {
  const job = allJobs.find(({ job: j }) => j.slug === APPLY_JOB_SLUG)?.job;
  if (!job) throw new Error(`No existe el empleo ${APPLY_JOB_SLUG} en los datos del mockup`);
  return (
    <Shell
      root={root}
      title={'Sign up — DieselJobsUSA'}
      screen="Signup form — arriving from Apply"
      sprint="1"
      notes={signupNotes(
        <li>
          Arriving from a LaTrae job's Apply button: the job is noted on the signup so staff see
          which role the technician wanted. <strong>Proposal pending Toya's confirmation</strong>
          {' — '}quick apply arrives in Sprint 2.
        </li>,
      )}
    >
      <SignupForm root={root} job={job} />
    </Shell>
  );
}

export function SignupErrorsPage({ root }: { root: string }) {
  return (
    <Shell
      root={root}
      title={'Sign up — DieselJobsUSA'}
      screen="Signup form — field errors"
      sprint="1"
      notes={signupNotes(
        <li>
          Field errors: each message sits under its field, joined with aria-describedby, and the
          technician's answers are kept. Nothing is retyped.
        </li>,
      )}
    >
      <SignupForm
        root={root}
        values={{
          firstName: 'Marcus',
          lastName: 'Webb',
          phone: '704 555 013',
          email: 'marcus.webb@example.com',
          zip: '2820',
          trade: 'Diesel technician',
        }}
        errors={{
          phone: 'Enter a US mobile number, like (704) 555-0134.',
          zip: 'ZIP code is 5 digits.',
        }}
      />
    </Shell>
  );
}
