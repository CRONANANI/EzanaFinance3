/* Sentry — browser SDK. Loaded automatically by @sentry/nextjs in every
   client-rendered page. Captures uncaught exceptions, unhandled promise
   rejections, console errors, and (when enabled) session replays. */

import * as Sentry from '@sentry/nextjs';

const DSN =
  process.env.NEXT_PUBLIC_SENTRY_DSN ||
  /* Project DSN from the Sentry "Get Started" wizard; safe to ship to the
     browser because Sentry DSNs are public ingestion endpoints. */
  'https://9d6f1b87c81db45041bdd9c6d4136d0f@o4511379103809536.ingest.us.sentry.io/4511379115278336';

Sentry.init({
  dsn: DSN,
  environment:
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
    process.env.NODE_ENV ||
    'production',

  /* Send IP / cookie info so user sessions can be grouped. The Sentry
     wizard recommends this for personalised debugging; turn off if your
     compliance posture forbids automatic PII collection. */
  sendDefaultPii: true,

  /* Performance — sample every transaction in development, 10% in
     production so the free-tier quota lasts longer. */
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  /* Session replay: record 1% of normal sessions and 100% of sessions
     that contain an error. Keeps replay quota lean while still giving us
     the recording every time something breaks. */
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
});
