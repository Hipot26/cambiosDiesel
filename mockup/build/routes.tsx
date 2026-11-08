// Mapa de rutas del mockup: única fuente para el build y las pruebas.
// Las rutas imitan las de 03_backend.md §2.1; los estados extra llevan un
// sufijo claro (p. ej. jobs/sprint-1/). El detalle de cada empleo inventado
// se genera para que ningún enlace de tarjeta quede roto.

import type { VNode } from 'preact';
import { allJobs } from '../data/jobs.js';
import {
  AccountDeleteCheckEmailPage,
  AccountDeletePage,
  AccountNotStartedPage,
  AccountPhoneUnverifiedPage,
  AccountResumeRejectedPage,
  AccountResumeReviewingPage,
  AccountScreenAbandonedPage,
  AccountScreenerUnavailablePage,
  AccountScreenLimitPage,
  AccountScreenStartedPage,
  AccountVerifiedPage,
} from '../pages/account.js';
import { HeaderFooterPage } from '../pages/header-footer.js';
import { HomePage } from '../pages/home.js';
import { IndexPage } from '../pages/index.js';
import { JobDetailPage } from '../pages/job-detail.js';
import { JobsFullPage, JobsSprint1Page } from '../pages/jobs.js';
import {
  DeleteConfirmPage,
  DeleteDonePage,
  ExpiredLinkPage,
  UnsubscribeDonePage,
  UnsubscribePage,
} from '../pages/link-pages.js';
import {
  ScreenInterviewPage,
  ScreenReturnPendingPage,
  ScreenReturnSavingPage,
  ScreenReturnVerifiedPage,
} from '../pages/screen.js';
import { SignupErrorsPage, SignupFromApplyPage, SignupPage } from '../pages/signup.js';
import {
  AboutPage,
  ForEmployersPage,
  JobSeekersPage,
  PrivacyPage,
  TermsPage,
} from '../pages/static-pages.js';
import {
  VerifyEnterPage,
  VerifyNoSmsPage,
  VerifyResentPage,
  VerifyTooManyAttemptsPage,
  VerifyWrongCodePage,
} from '../pages/verify.js';

export interface Route {
  // Ruta relativa a la raíz, terminada en '/' salvo la raíz misma ('')
  path: string;
  render: (root: string) => VNode;
}

export const routes: Route[] = [
  { path: '', render: (root) => <IndexPage root={root} /> },
  { path: 'components/header-footer/', render: (root) => <HeaderFooterPage root={root} /> },
  { path: 'home/', render: (root) => <HomePage root={root} /> },
  { path: 'jobs/', render: (root) => <JobsFullPage root={root} /> },
  { path: 'jobs/sprint-1/', render: (root) => <JobsSprint1Page root={root} /> },
  ...allJobs.map(({ job }) => ({
    path: `jobs/${job.slug}/`,
    render: (root: string) => <JobDetailPage root={root} job={job} />,
  })),
  // Tanda 2: registro y cuenta del técnico, un estado por página
  { path: 'signup/', render: (root) => <SignupPage root={root} /> },
  { path: 'signup/from-apply/', render: (root) => <SignupFromApplyPage root={root} /> },
  { path: 'signup/errors/', render: (root) => <SignupErrorsPage root={root} /> },
  { path: 'signup/verify/', render: (root) => <VerifyEnterPage root={root} /> },
  { path: 'signup/verify/resent/', render: (root) => <VerifyResentPage root={root} /> },
  { path: 'signup/verify/wrong-code/', render: (root) => <VerifyWrongCodePage root={root} /> },
  {
    path: 'signup/verify/too-many-attempts/',
    render: (root) => <VerifyTooManyAttemptsPage root={root} />,
  },
  { path: 'signup/verify/no-sms/', render: (root) => <VerifyNoSmsPage root={root} /> },
  { path: 'account/', render: (root) => <AccountNotStartedPage root={root} /> },
  {
    path: 'account/resume-reviewing/',
    render: (root) => <AccountResumeReviewingPage root={root} />,
  },
  { path: 'account/resume-rejected/', render: (root) => <AccountResumeRejectedPage root={root} /> },
  {
    path: 'account/phone-unverified/',
    render: (root) => <AccountPhoneUnverifiedPage root={root} />,
  },
  { path: 'account/screen-started/', render: (root) => <AccountScreenStartedPage root={root} /> },
  {
    path: 'account/screen-abandoned/',
    render: (root) => <AccountScreenAbandonedPage root={root} />,
  },
  {
    path: 'account/screener-unavailable/',
    render: (root) => <AccountScreenerUnavailablePage root={root} />,
  },
  { path: 'account/screen-limit/', render: (root) => <AccountScreenLimitPage root={root} /> },
  { path: 'account/verified/', render: (root) => <AccountVerifiedPage root={root} /> },
  { path: 'account/screen/', render: (root) => <ScreenInterviewPage root={root} /> },
  { path: 'account/screen/return/', render: (root) => <ScreenReturnSavingPage root={root} /> },
  {
    path: 'account/screen/return/verified/',
    render: (root) => <ScreenReturnVerifiedPage root={root} />,
  },
  {
    path: 'account/screen/return/pending/',
    render: (root) => <ScreenReturnPendingPage root={root} />,
  },
  { path: 'account/delete/', render: (root) => <AccountDeletePage root={root} /> },
  {
    path: 'account/delete/check-email/',
    render: (root) => <AccountDeleteCheckEmailPage root={root} />,
  },
  { path: 'r/expired/', render: (root) => <ExpiredLinkPage root={root} /> },
  { path: 'r/delete-confirm/', render: (root) => <DeleteConfirmPage root={root} /> },
  { path: 'r/delete-confirm/done/', render: (root) => <DeleteDonePage root={root} /> },
  { path: 'unsubscribe/', render: (root) => <UnsubscribePage root={root} /> },
  { path: 'unsubscribe/done/', render: (root) => <UnsubscribeDonePage root={root} /> },
  { path: 'job-seekers/', render: (root) => <JobSeekersPage root={root} /> },
  { path: 'for-employers/', render: (root) => <ForEmployersPage root={root} /> },
  { path: 'about/', render: (root) => <AboutPage root={root} /> },
  { path: 'privacy/', render: (root) => <PrivacyPage root={root} /> },
  { path: 'terms/', render: (root) => <TermsPage root={root} /> },
];
