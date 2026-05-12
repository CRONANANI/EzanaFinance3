/* Next.js instrumentation hook — runs once per server runtime before any
   request is handled. We use it to load the right Sentry SDK for the
   active runtime so that exceptions, traces and profiles flow correctly
   for the standard Node runtime and the Vercel Edge runtime. */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

/* Forward request errors that Next.js catches in its own boundary to
   Sentry. Required for the `nestedRouterError` / "uncaught in server
   component" capture path to populate the Sentry issue feed. */
export const onRequestError = async (...args) => {
  const { captureRequestError } = await import('@sentry/nextjs');
  return captureRequestError(...args);
};
