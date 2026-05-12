import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

/* Verify endpoint — hit GET /api/sentry-example in a browser or curl
   to confirm the server SDK is wired up. The handler runs a Sentry span
   (so we get a profile + trace), emits a structured log + metric, then
   throws an intentional ReferenceError that is captured and rethrown so
   you can see it land in the Sentry issue feed.

   Delete this route once Sentry is verified. */
export const dynamic = 'force-dynamic';

class SentryExampleAPIError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SentryExampleAPIError';
  }
}

export async function GET() {
  return Sentry.startSpan(
    { op: 'test', name: 'GET /api/sentry-example' },
    async () => {
      try {
        Sentry.logger?.info?.('User triggered Sentry verify endpoint', {
          action: 'test_error_span',
        });

        throw new SentryExampleAPIError(
          'This error is raised on purpose to verify Sentry instrumentation.',
        );
      } catch (e) {
        Sentry.captureException(e);
        return NextResponse.json(
          { ok: false, sentry: 'captured', error: e.message },
          { status: 500 },
        );
      }
    },
  );
}
