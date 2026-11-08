// Índice del mockup: todas las pantallas agrupadas por tanda y sprint, con el
// número de ronda y la sección "What changed". Lo lee Toya, en inglés y
// pensado para el celular.

import { Layout } from '../components/Layout.js';
import { MockupTag } from '../mockup-ui/MockupTag.js';
import { ROUND } from './shell.js';

interface Screen {
  href?: string;
  name: string;
  sprint: string;
  description: string;
  // Estados de la pantalla, como sub-lista: una entrada por pantalla, no por
  // estado. Con href cuando el estado ya está dibujado.
  states?: Array<string | { name: string; href: string }>;
}

interface Batch {
  title: string;
  status: 'ready for review' | 'not drawn yet';
  note?: string;
  screens: Screen[];
}

const batches: Batch[] = [
  {
    title: 'Batch 1 · Public site',
    status: 'ready for review',
    screens: [
      {
        href: 'components/header-footer/',
        name: 'Header and footer',
        sprint: '1',
        description: 'The shared frame, full width; resize to see the mobile menu.',
      },
      {
        href: 'home/',
        name: 'Home',
        sprint: '1',
        description: 'Hero, how it works, latest jobs and trades covered.',
      },
      {
        href: 'jobs/sprint-1/',
        name: 'Job Board — as it ships in Sprint 1',
        sprint: '1',
        description: 'Only LaTrae roles, newest first, no filters.',
      },
      {
        href: 'jobs/',
        name: 'Job Board — complete',
        sprint: '1 + 3A + 3B',
        description: 'Filters, featured pins and aggregated roles, each piece tagged.',
      },
      {
        href: 'jobs/diesel-technician-charlotte-nc/',
        name: 'Job detail — LaTrae (hosted role)',
        sprint: '1',
        description: 'Hosted role with the Apply proposal (signup with the job noted).',
      },
      {
        href: 'jobs/mobile-crane-technician-houston-tx/',
        name: 'Job detail — aggregated role',
        sprint: '3B',
        description: 'Real company, the essentials, apply on the company site.',
      },
      {
        href: 'job-seekers/',
        name: 'Job seekers',
        sprint: '1',
        description: 'What a technician gets and what the Verified mark means.',
      },
      {
        href: 'for-employers/',
        name: 'For employers',
        sprint: '1',
        description:
          'Hosted roles today; employer accounts and featured placement tagged as later.',
      },
      {
        href: 'about/',
        name: 'About',
        sprint: '1',
        description: 'Short story of the site. Placeholder copy.',
      },
      {
        href: 'privacy/',
        name: 'Privacy',
        sprint: '1',
        description: "Section structure with the attorney's wording pending.",
      },
      {
        href: 'terms/',
        name: 'Terms',
        sprint: '1',
        description: "Section structure with the attorney's wording pending.",
      },
    ],
  },
  {
    title: 'Batch 2 · Technician signup and account',
    status: 'ready for review',
    screens: [
      {
        href: 'signup/',
        name: 'Signup form — step one',
        sprint: '1',
        description:
          'Six fields; three consent boxes unchecked (the attorney decides the wording; unchecked until then); Turnstile; trade dropdown with the 39 trades in their 12 groups; optional resume.',
        states: [
          { name: 'Arriving from "Apply" with the job noted', href: 'signup/from-apply/' },
          { name: 'Field errors', href: 'signup/errors/' },
        ],
      },
      {
        href: 'signup/verify/',
        name: 'SMS code',
        sprint: '1',
        description:
          'Enter the code. Everyone sees the same line: "Didn\'t get a code? If you\'d registered before, we emailed you a link".',
        states: [
          { name: 'Code resent', href: 'signup/verify/resent/' },
          { name: 'Wrong code', href: 'signup/verify/wrong-code/' },
          { name: 'Too many attempts', href: 'signup/verify/too-many-attempts/' },
          {
            name: "We can't text this number — continue by email",
            href: 'signup/verify/no-sms/',
          },
        ],
      },
      {
        href: 'account/',
        name: 'Next steps (/account)',
        sprint: '1',
        description:
          'Upload a resume as the primary action, "build one for me" underneath. No Sprint 2 promises.',
        states: [
          { name: 'Not started', href: 'account/' },
          { name: 'File under review', href: 'account/resume-reviewing/' },
          { name: 'File rejected — upload another', href: 'account/resume-rejected/' },
          { name: 'Phone not verified', href: 'account/phone-unverified/' },
          { name: 'Screen started — resume it', href: 'account/screen-started/' },
          { name: 'Abandoned — N questions left', href: 'account/screen-abandoned/' },
          {
            name: "Screener unavailable — we'll email you",
            href: 'account/screener-unavailable/',
          },
          { name: '30-day limit reached', href: 'account/screen-limit/' },
          {
            name: 'Completed — "Verified on <date>", never the level',
            href: 'account/verified/',
          },
        ],
      },
      {
        href: 'account/screen/',
        name: 'Interview step card',
        sprint: '1',
        description:
          "Not a design: the interview runs on Trabian's ScreenProof pages. Shown so the journey reads complete.",
      },
      {
        href: 'account/screen/return/',
        name: 'Back from the interview',
        sprint: '1',
        description: 'The return page after ScreenProof.',
        states: [
          { name: 'Saving your result', href: 'account/screen/return/' },
          { name: 'Verified', href: 'account/screen/return/verified/' },
          {
            name: 'Result pending — no email promised yet',
            href: 'account/screen/return/pending/',
          },
        ],
      },
      {
        href: 'r/expired/',
        name: 'Expired or invalid link',
        sprint: '1',
        description: 'With the "request a new link" form.',
      },
      {
        href: 'r/delete-confirm/',
        name: 'Confirm deletion',
        sprint: '1',
        description: 'Reached from the email link.',
        states: [
          { name: 'Confirm button', href: 'r/delete-confirm/' },
          { name: 'Deletion done', href: 'r/delete-confirm/done/' },
        ],
      },
      {
        href: 'account/delete/',
        name: 'Delete my record',
        sprint: '1',
        description: 'Asked from the account page.',
        states: [
          { name: 'Request deletion', href: 'account/delete/' },
          { name: 'Check your email', href: 'account/delete/check-email/' },
        ],
      },
      {
        href: 'unsubscribe/',
        name: 'Email unsubscribe',
        sprint: '1',
        description: 'One-click opt-out via the tokenised link.',
        states: [
          { name: 'Unsubscribe button', href: 'unsubscribe/' },
          { name: 'Done', href: 'unsubscribe/done/' },
        ],
      },
    ],
  },
  {
    title: 'Batch 3 · Emails',
    status: 'not drawn yet',
    note: 'HTML and plain text for each; DieselJobsUSA brand only.',
    screens: [
      {
        name: 'Return link',
        sprint: '1',
        description: 'The tokenised link that signs the candidate back in.',
      },
      { name: 'Screen reminder', sprint: '1', description: 'With one-click unsubscribe.' },
      {
        name: 'Duplicate signup notice',
        sprint: '1',
        description: 'The identical reply everyone gets, by email.',
      },
      {
        name: 'Delete confirmation',
        sprint: '1',
        description: 'Opens the confirm-deletion page.',
      },
      {
        name: 'Your screen is ready',
        sprint: '1',
        description:
          'The screener was down at signup; the screen can be taken now, with the link to start.',
      },
      {
        name: 'Nightly sweep report (internal)',
        sprint: '1',
        description: 'To Toya and Sergio: screens stuck and recovered.',
      },
    ],
  },
  {
    title: "Batch 4 · Toya's panel (Sprint 1)",
    status: 'not drawn yet',
    note: "The Cloudflare Access screen shown before the login is Cloudflare's, not ours.",
    screens: [
      {
        name: 'Panel login',
        sprint: '1',
        description: 'Email and password, behind Cloudflare Access.',
        states: [
          'Signed in normally',
          'Error — one single message',
          'Locked after too many attempts',
        ],
      },
      {
        name: 'Candidates',
        sprint: '1',
        description:
          'List with filters: level (uses the override), confirmed trade, within X miles of a ZIP, certifications, CDL, software, verified since, switched to findable since, screen status, visibility, needs_review. Hidden candidates marked.',
        states: ['CSV export'],
      },
      {
        name: 'Candidate record',
        sprint: '1',
        description:
          'Registration data; screens, consents and visibility histories; hidden companies; traffic source (referrer and UTM from the first visit).',
        states: [
          'Resumes with download',
          'Level override with a reason, and the needs_review flag',
          'Visibility change with late consent capture',
          'Start a screen',
          'Delete with two-step confirmation',
          'RecruiterFlow copy status',
        ],
      },
      {
        name: 'Companies',
        sprint: '1',
        description: 'One table with aliases; staff mark each one direct or agency.',
        states: ['Merge duplicates'],
      },
      {
        name: 'Vocabulary',
        sprint: '1',
        description: 'Versions of the shared vocabulary.',
        states: ['Upload a new file', 'Preview with warnings and blockers', 'Activate'],
      },
      {
        name: 'Unmapped values queue',
        sprint: '1',
        description: 'Anything that does not map is held for review, never dropped.',
      },
      {
        name: 'Staff tasks',
        sprint: '1',
        description: 'The task list (for example, RecruiterFlow cleanup after a deletion).',
        states: ['Duplicate merge side by side, choosing per field', 'Keep separate'],
      },
      {
        name: 'Settings (owner)',
        sprint: '1',
        description:
          'RecruiterFlow copy, reminder email, generated resume download, daily SMS cap.',
        states: ['Cleanup list if the attorney says consent-only'],
      },
      { name: 'Users (owner)', sprint: '1', description: 'Add and remove staff.' },
      { name: 'Change my password', sprint: '1', description: 'For the signed-in staff user.' },
      { name: 'Audit (owner)', sprint: '1', description: 'Who did what, when.' },
    ],
  },
  {
    title: 'Batch 5 · Sprints 3A and 3B',
    status: 'not drawn yet',
    screens: [
      {
        name: 'Search and filters',
        sprint: '3A',
        description: 'Role, trade, location, equipment type and job type, working.',
        states: ['No results'],
      },
      { name: 'Landing pages', sprint: '3A', description: 'By state, city and trade.' },
      { name: 'Expired job', sprint: '3A', description: 'Shows similar open jobs.' },
      {
        name: 'Job alerts',
        sprint: '3A',
        description:
          'Sent automatically to roster members with a resume on file and email consent; no account and no signup form.',
        states: [
          'Notice on the technician page: "You\'ll get new jobs for your trade within X miles of your ZIP"',
          'Alert email',
          'One-tap unsubscribe',
        ],
      },
      {
        name: 'Sources',
        sprint: '3B',
        description: 'When each source last ran, what it returned, and its health.',
      },
      {
        name: 'Jobs table',
        sprint: '3B',
        description: 'Every listing from every source: feature, edit, remove, held.',
      },
      { name: 'Exclusion list', sprint: '3B', description: 'With name variants.' },
      {
        name: 'Agency review queue',
        sprint: '3B',
        description: 'New companies marked direct or agency; jobs held until reviewed.',
      },
      {
        name: 'Taxonomy preview',
        sprint: '3B',
        description:
          'What a change admits or drops, and the rule that decided each listing (the HVAC rule included).',
      },
      {
        name: 'Unmapped titles queue',
        sprint: '3B',
        description: 'Titles that map to no trade.',
      },
      {
        name: 'Employer configurations',
        sprint: '3B',
        description: 'One row per employer in the feed.',
      },
      {
        name: 'Source-down alert email',
        sprint: '3B',
        description: 'From the source health monitor.',
      },
    ],
  },
  {
    title: 'Batch 6 · Sprint 2: technician accounts',
    status: 'not drawn yet',
    note: 'No employer accounts and no employer-facing candidate search here — that is Sprint 4 or later.',
    screens: [
      {
        name: 'Sign in',
        sprint: '2',
        description: 'Google, email and password, or magic link, on the Sprint 1 login foundation.',
      },
      { name: 'Create account', sprint: '2', description: 'The technician account.' },
      {
        name: 'Profile',
        sprint: '2',
        description: 'Resume on file and the fields the technician can edit.',
        states: ['My consents — email, texts and sharing; changes reach the screener'],
      },
      {
        name: 'Visibility switch',
        sprint: '2',
        description: '"Employers can find you / can\'t find you", with late consent capture.',
      },
      {
        name: 'Hide from named employers',
        sprint: '2',
        description: 'The current one by default, matched on the company record.',
      },
      { name: 'Saved jobs', sprint: '2', description: 'From the account.' },
      { name: 'Saved searches', sprint: '2', description: 'From the account.' },
      { name: 'Job alerts management', sprint: '2', description: 'From the account.' },
      {
        name: 'One-click apply',
        sprint: '2',
        description: "With the stored resume, on LaTrae's and sponsored roles.",
        states: ['Warning when applying while hidden'],
      },
      {
        name: 'Account gate',
        sprint: '2',
        description:
          'Saving, alerts and applying ask for an account with a resume; browsing and search never do.',
      },
      {
        name: 'Application history',
        sprint: '2',
        description: 'Each application as its own record.',
      },
      { name: 'Download or delete my data', sprint: '2', description: 'Self service.' },
      {
        name: 'Back office candidate search',
        sprint: '2',
        description:
          'By specialty, state, certification and years; verified candidates sort on top; CSV export and RecruiterFlow push, one or many.',
      },
      {
        name: 'Export and change audit',
        sprint: '2',
        description: 'Owner and staff roles.',
      },
    ],
  },
  {
    title: 'Batch 7 · Sprint 4: employers and payment',
    status: 'not drawn yet',
    screens: [
      { name: 'Employer signup', sprint: '4', description: 'The employer account.' },
      { name: 'Employer sign in', sprint: '4', description: 'For returning employers.' },
      {
        name: 'Employer dashboard',
        sprint: '4',
        description: 'Views and applications counted per listing.',
      },
      { name: 'Guided post', sprint: '4', description: 'With a live preview.' },
      {
        name: 'Waiting for approval',
        sprint: '4',
        description: 'LaTrae approves before it goes live.',
      },
      {
        name: 'Stripe Checkout',
        sprint: '4',
        description: 'Hop to Stripe and back.',
        states: ['Success', 'Cancelled'],
      },
      {
        name: 'Featured upgrade',
        sprint: '4',
        description: 'Places the listing at the top of results.',
      },
      {
        name: 'Applications',
        sprint: '4',
        description: "Each with the candidate's stored resume.",
      },
      { name: 'Edit, close and renew', sprint: '4', description: 'Listing management.' },
      { name: 'Receipts', sprint: '4', description: 'One per order.' },
      {
        name: 'Post rejected',
        sprint: '4',
        description: 'Excluded companies and staffing agencies cannot buy their way on.',
      },
      {
        name: 'Employer emails',
        sprint: '4',
        description: 'Transactional mail to the employer.',
        states: ['Application received', 'Receipt', 'Reminder before a listing expires'],
      },
      {
        name: 'Approval queue (back office)',
        sprint: '4',
        description: 'Posts waiting on LaTrae.',
      },
      {
        name: 'Orders (back office)',
        sprint: '4',
        description: 'Every order with its Stripe receipt.',
      },
      {
        name: 'Traffic and growth report (back office)',
        sprint: '4',
        description:
          'The contract metrics: profiles per week with a resume, new accounts and growth, share with a resume, returning visitors and alert subscribers, employers posting and repeat purchase, organic traffic and Google for Jobs impressions, signups and applications by source.',
      },
    ],
  },
];

// Lo que el Contrato promete y no tiene pantalla propia, para que se vea que
// nada quedó por fuera.
const behindTheScenes: Array<{ name: string; sprint: string }> = [
  {
    name: 'Server, PostgreSQL, private resume storage and nightly encrypted backups in our own bucket',
    sprint: '1',
  },
  { name: 'Deployment pipeline with atomic deploys', sprint: '1–4' },
  {
    name: 'Private staging blocked from search engines, and the dieseljobusa.com redirect',
    sprint: '1',
  },
  {
    name: 'Mail subdomain with SPF, DKIM and DMARC; List-Unsubscribe on bulk mail',
    sprint: '1',
  },
  {
    name: 'Signed screener webhooks with idempotency keys and the ordering guard',
    sprint: '1',
  },
  { name: 'Phone suppression kept as a keyed hash after deletion', sprint: '1' },
  { name: 'ZIP centroid table and PostGIS geocoding, no paid service', sprint: '1' },
  { name: 'Vocabulary published at a private link the screener reads', sprint: '1' },
  { name: 'Traffic source capture: referrer and UTM on first visit', sprint: '1' },
  { name: 'Two-tier Google for Jobs markup, Indexing API and IndexNow', sprint: '3A' },
  { name: 'Sitemaps and Google Search Console', sprint: '3A' },
  { name: 'Structured-data parser checked before any custom scraper', sprint: '3B' },
  {
    name: 'Feed de-duplication and automatic expiry within the six-hour cycle',
    sprint: '3B',
  },
  { name: 'Direct-hire filter: temp and staffing roles do not pass', sprint: '3B' },
  { name: 'Consent sync to the screener', sprint: '2' },
  {
    name: 'Monitoring from day one, and the automated verifier that fails the build on drift',
    sprint: '1–4',
  },
  { name: 'Handoff documentation each sprint', sprint: '1–4' },
];

export function IndexPage({ root }: { root: string }) {
  return (
    <Layout title="DieselJobsUSA mockup index" root={root}>
      <main class="mx-auto max-w-3xl px-4 py-8">
        <p class="font-mono text-xs uppercase tracking-widest text-red">
          Mockup {'·'} provisional colours {'·'} sample data {'·'} not the real site
        </p>
        <h1 class="mt-2 text-3xl font-black text-navy">
          DieselJobs<span class="text-red">USA</span> mockup
        </h1>
        <p class="mt-3 max-w-prose text-gray-800">
          Every screen of the platform, batch by batch, for review and approval before anything is
          built. Colours and copy are provisional; all data is invented.
        </p>
        <p class="mt-2 flex flex-wrap gap-2">
          <MockupTag label={`Round ${ROUND}`} />
        </p>

        <section class="mt-8" aria-labelledby="what-changed">
          <h2 id="what-changed" class="text-xl font-black text-navy">
            What changed
          </h2>
          <p class="mt-2 text-sm text-gray-700">
            Nothing yet {'—'} this is the first round. Changes from each review land here.
          </p>
        </section>

        {batches.map((batch) => {
          const screens = (
            <ul class="mt-4 space-y-3">
              {batch.screens.map((screen) => (
                <li key={screen.name} class="border border-gray-300 bg-white p-3 shadow-card">
                  <div class="flex flex-wrap items-center gap-2">
                    {screen.href ? (
                      <a
                        href={root + screen.href}
                        class="flex min-h-11 items-center font-bold text-navy underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red"
                      >
                        {screen.name}
                      </a>
                    ) : (
                      <span class="flex min-h-11 items-center font-bold text-gray-600">
                        {screen.name}
                      </span>
                    )}
                    <MockupTag label={`Sprint ${screen.sprint}`} />
                  </div>
                  <p class="text-sm text-gray-700">{screen.description}</p>
                  {screen.states ? (
                    <ul class="mt-1 list-disc pl-5 text-sm text-gray-700">
                      {screen.states.map((state) =>
                        typeof state === 'string' ? (
                          <li key={state}>{state}</li>
                        ) : (
                          <li key={state.name}>
                            <a
                              href={root + state.href}
                              class="inline-flex min-h-11 items-center text-navy underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red"
                            >
                              {state.name}
                            </a>
                          </li>
                        ),
                      )}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          );
          const note = batch.note ? <p class="mt-2 text-sm text-gray-700">{batch.note}</p> : null;
          // Las tandas sin dibujar van plegadas para que el índice se lea corto.
          if (batch.status === 'not drawn yet') {
            return (
              <details key={batch.title} class="mt-10">
                <summary class="min-h-11 cursor-pointer">
                  <h2 class="inline-flex flex-wrap items-center gap-2 align-middle text-xl font-black text-gray-600">
                    {batch.title}
                    <MockupTag label={batch.status} />
                  </h2>
                </summary>
                {note}
                {screens}
              </details>
            );
          }
          return (
            <section key={batch.title} class="mt-10">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="text-xl font-black text-navy">{batch.title}</h2>
                <MockupTag label={batch.status} />
              </div>
              {note}
              {screens}
            </section>
          );
        })}

        <details class="mt-10">
          <summary class="min-h-11 cursor-pointer">
            <h2 class="inline-flex flex-wrap items-center gap-2 align-middle text-xl font-black text-gray-600">
              Built behind the scenes (no screen)
            </h2>
          </summary>
          <p class="mt-2 text-sm text-gray-700">
            Promised in the contract and built, but with no screen of its own {'—'} so nothing is
            left out of this inventory.
          </p>
          <ul class="mt-4 space-y-3">
            {behindTheScenes.map((item) => (
              <li key={item.name} class="border border-gray-300 bg-white p-3 shadow-card">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="flex min-h-11 items-center font-bold text-gray-600">
                    {item.name}
                  </span>
                  <MockupTag label={`Sprint ${item.sprint}`} />
                </div>
              </li>
            ))}
          </ul>
        </details>
      </main>
    </Layout>
  );
}
