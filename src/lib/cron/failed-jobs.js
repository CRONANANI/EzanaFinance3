/**
 * Dead-letter capture (reliability audit P2-14): a job, webhook or drain that
 * fails records one row in public.failed_jobs and reports to Sentry, instead
 * of the failure living only in a log line. Never throws.
 */
import * as Sentry from '@sentry/nextjs';
import { getAdminClient } from '@/lib/supabase';

export async function recordFailedJob({ job, error, payload = null, attempts = 1 }) {
  const message = String(error?.message || error || 'unknown error').slice(0, 2000);
  try {
    Sentry.captureMessage(`failed_job ${job}: ${message.slice(0, 200)}`, {
      level: 'error',
      tags: { failed_job: job },
    });
  } catch {
    /* Sentry not initialised */
  }
  try {
    const { error: dbErr } = await getAdminClient()
      .from('failed_jobs')
      .insert({ job, error: message, payload, attempts });
    if (dbErr) console.warn(`[failed-jobs] ${job}: ${dbErr.message}`);
  } catch (e) {
    console.warn(`[failed-jobs] ${job}: ${e?.message || e}`);
  }
}
