/**
 * Readiness check (reliability audit P3). The database decides the status
 * (3 s timeout); external providers are reported but never turn the answer
 * into a 503, so an upstream outage does not page anyone about Ezana.
 * Anonymous callers get the status only; operators get the breakdown.
 */
import { getAdminClient } from '@/lib/supabase';

const withTimeout = (p, ms) =>
  Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

async function checkDatabase() {
  const t0 = Date.now();
  try {
    const { error } = await withTimeout(
      getAdminClient().from('profiles').select('id', { head: true, count: 'planned' }).limit(1),
      3000,
    );
    return { status: error ? 'unhealthy' : 'healthy', ms: Date.now() - t0 };
  } catch (e) {
    return { status: 'unhealthy', ms: Date.now() - t0, error: e.message };
  }
}

async function checkFinnhub() {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return { status: 'skipped' };
  try {
    /* The key goes in a header, never the URL (URLs end up in logs). */
    const res = await fetch('https://finnhub.io/api/v1/quote?symbol=SPY', {
      headers: { 'X-Finnhub-Token': key },
      signal: AbortSignal.timeout(3000),
      cache: 'no-store',
    });
    return { status: res.ok ? 'healthy' : 'unhealthy' };
  } catch {
    return { status: 'unhealthy' };
  }
}

export async function readiness() {
  const [database, finnhub] = await Promise.all([checkDatabase(), checkFinnhub()]);
  const ready = database.status === 'healthy';
  return {
    ready,
    body: {
      status: ready ? 'ok' : 'unavailable',
      timestamp: new Date().toISOString(),
      services: { database, providers: { finnhub } },
    },
  };
}

export const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };
