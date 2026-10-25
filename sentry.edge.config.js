/* Sentry — Vercel Edge runtime. Used by middleware and any route that
   sets `export const runtime = 'edge'`. The edge runtime is a stripped
   Web Workers environment, so we do not load the Node profiler here. */

import * as Sentry from '@sentry/nextjs';

/* No hard-coded fallback DSN (security assessment C-4): previews and forks
   without SENTRY_DSN must not report into the production project. Events
   carry the Vercel environment so production and preview never mix. */
const DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || '';

Sentry.init({
  dsn: DSN,
  enabled: Boolean(DSN),
  environment:
    process.env.SENTRY_ENVIRONMENT ||
    process.env.VERCEL_ENV ||
    process.env.NODE_ENV ||
    'production',

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  /* No IP address, cookies or headers on events. */
  sendDefaultPii: false,
});
