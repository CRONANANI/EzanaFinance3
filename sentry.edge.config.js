/* Sentry — Vercel Edge runtime. Used by middleware and any route that
   sets `export const runtime = 'edge'`. The edge runtime is a stripped
   Web Workers environment, so we do not load the Node profiler here. */

import * as Sentry from '@sentry/nextjs';

const DSN =
  process.env.SENTRY_DSN ||
  process.env.NEXT_PUBLIC_SENTRY_DSN ||
  'https://9d6f1b87c81db45041bdd9c6d4136d0f@o4511379103809536.ingest.us.sentry.io/4511379115278336';

Sentry.init({
  dsn: DSN,
  environment:
    process.env.SENTRY_ENVIRONMENT ||
    process.env.VERCEL_ENV ||
    process.env.NODE_ENV ||
    'production',

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  sendDefaultPii: true,
});
