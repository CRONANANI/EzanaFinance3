/**
 * Readiness check (reliability audit P3). The database decides the status
 * (3 s timeout); external providers are reported but never turn the answer
 * into a 503, so an upstream outage does not page anyone about Ezana.
 * Anonymous callers get the status only; operators get the breakdown.
 */
import { getAdminClient } from '@/lib/supabase';
import { empireStatus } from '@/lib/health/empire-status';

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

/* Informational: the Empire Rankings backbone (catalog seed + populated
   materialized view). Never turns readiness into a 503. */
async function checkEmpire() {
  try {
    const db = getAdminClient();
    const count = async (table) => {
      const { count: n, error } = await withTimeout(
        db.from(table).select('*', { head: true, count: 'exact' }),
        3000,
      );
      return error ? null : n;
    };
    const [dims, metricMap, countries, latest] = await Promise.all([
      count('empire_dimensions'),
      count('dimension_metric_map'),
      count('empire_countries'),
      withTimeout(
        db
          .from('country_dimension_scores_mat')
          .select('year')
          .order('year', { ascending: false })
          .limit(1),
        3000,
      ),
    ]);
    /* An unpopulated materialized view errors on read (55000). */
    const populated = !latest.error;
    const latestYear = Number(latest.data?.[0]?.year);
    return {
      status: empireStatus({ dims, metricMap, countries, populated, latestYear }),
      dims,
      metricMap,
      countries,
      populated,
      latestYear: Number.isFinite(latestYear) ? latestYear : null,
    };
  } catch (e) {
    return { status: 'unknown', error: e.message };
  }
}

export async function readiness() {
  const [database, finnhub, empire] = await Promise.all([
    checkDatabase(),
    checkFinnhub(),
    checkEmpire(),
  ]);
  const ready = database.status === 'healthy';
  return {
    ready,
    body: {
      status: ready ? 'ok' : 'unavailable',
      timestamp: new Date().toISOString(),
      services: { database, providers: { finnhub }, data: { empire } },
    },
  };
}

export const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };
