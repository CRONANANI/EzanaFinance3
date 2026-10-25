/* Sentry — Node.js server runtime. Loaded by instrumentation.js when a
   request hits an API route, server component, or middleware running on
   the standard Node runtime (i.e. not the edge runtime). Includes CPU
   profiling via @sentry/profiling-node. */

const Sentry = require('@sentry/nextjs');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');

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

  integrations: [nodeProfilingIntegration()],

  /* Structured logs — Sentry v10 routes Sentry.logger.* and metrics into
     the same project as exceptions. */
  enableLogs: true,

  /* Tracing — capture every transaction in development, 10% in
     production. */
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  /* Profiling — `trace` lifecycle means a CPU profile is automatically
     attached to every sampled transaction. `profileSessionSampleRate` is
     evaluated once per process and decides what fraction of *processes*
     ever profile (1.0 = always-on profiler for sampled traces). */
  profileSessionSampleRate: 1.0,
  profileLifecycle: 'trace',

  /* No IP address, cookies or headers on events. */
  sendDefaultPii: false,
});
