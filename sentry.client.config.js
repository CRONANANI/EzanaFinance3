/* Sentry, browser SDK. Loaded automatically by @sentry/nextjs in every
   client-rendered page. Captures uncaught exceptions, unhandled promise
   rejections and console errors, plus sampled performance traces.

   Session replay is OFF on purpose. Recording what a visitor sees and types
   is a privacy risk (portfolio values, names and messages are on screen) and
   is the setup that wiretap-law suits target. Turning it back on requires a
   consent prompt first, and replayIntegration({ maskAllText: true,
   maskAllInputs: true, blockAllMedia: true }).

   sendDefaultPii is off: no IP address, cookies or request headers are
   attached to events. The SDK sets no user; if one is ever added, use
   Sentry.setUser({ id }) with the account id only, never email or IP. */

import * as Sentry from '@sentry/nextjs';

const DSN =
  process.env.NEXT_PUBLIC_SENTRY_DSN ||
  /* Project DSN from the Sentry "Get Started" wizard; safe to ship to the
     browser because Sentry DSNs are public ingestion endpoints. */
  'https://9d6f1b87c81db45041bdd9c6d4136d0f@o4511379103809536.ingest.us.sentry.io/4511379115278336';

Sentry.init({
  dsn: DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'production',

  sendDefaultPii: false,

  /* Performance: sample every transaction in development, 10% in
     production so the free-tier quota lasts longer. */
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});
