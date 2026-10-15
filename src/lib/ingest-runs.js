/**
 * Ingest run log (public.ingest_runs) for scheduled cron routes.
 *
 * withIngestRun(source, handler) wraps a cron GET handler. After the handler
 * returns, one row is written with what the handler's own JSON body says
 * happened, so the log is written by the job itself and a failed or skipped
 * run is never recorded as an update:
 *   401 (not authorised)       not a run, nothing logged
 *   body.skipped               'skipped'
 *   body.ok                    'ok'
 *   !ok but something written  'partial'
 *   otherwise                  'failed'
 * A run the platform kills (timeout) writes nothing; the page's staleness
 * rule catches that because no recent success exists.
 *
 * Logging never breaks the job: a log write that fails is warned about and
 * the handler's response is returned unchanged.
 */
import { getAdminClient } from '@/lib/supabase';
import { summarizeRun } from './ingest-runs-summary.js';

export { summarizeRun };

export function withIngestRun(source, handler) {
  return async function GET(request, context) {
    const startedAt = new Date().toISOString();
    let response;
    try {
      response = await handler(request, context);
    } catch (e) {
      await writeRun(source, startedAt, {
        status: 'failed',
        rows_read: null,
        rows_written: null,
        note: String(e?.message || e).slice(0, 500),
        validation: null,
      });
      throw e;
    }
    if (!response || response.status === 401) return response;
    let body = null;
    try {
      body = await response.clone().json();
    } catch {
      body = null;
    }
    await writeRun(source, startedAt, summarizeRun(body, response.status));
    return response;
  };
}

async function writeRun(source, startedAt, fields) {
  try {
    const { error } = await getAdminClient()
      .from('ingest_runs')
      .insert({ source, started_at: startedAt, finished_at: new Date().toISOString(), ...fields });
    if (error) console.warn(`[ingest-runs] ${source}: ${error.message}`);
  } catch (e) {
    console.warn(`[ingest-runs] ${source}: ${e?.message || e}`);
  }
}
