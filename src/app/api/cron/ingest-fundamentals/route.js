import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { getTickerMap, buildCikTickerIndex, secRequestCount } from '@/lib/sec-edgar';
import { METRICS, framePeriods, getFrame, pickFirstConcept, periodTypeOf } from '@/lib/sec/xbrl';

/**
 * Daily company fundamentals from the SEC XBRL frames API into
 * sec_fundamentals: for every metric in METRICS, the last three calendar years
 * and the last four quarters (instant frames for balance-sheet metrics). One
 * frames request returns every filer's value for that concept and period;
 * when a metric has several concepts, the first concept a company reports for
 * the period wins. Only companies with a ticker in company_tickers.json are
 * stored. Nothing is derived: ratios and growth are computed at read time.
 *
 * About 100 requests at the shared 6 req/s throttle. The upserts dominate the
 * run, so metrics rotate their starting point by day and the run stops cleanly
 * at the time budget; every metric is refreshed at least every few days.
 * Auth: CRON_SECRET bearer (or ?key=).   GET /api/cron/ingest-fundamentals[?metrics=revenue,cash]
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const RUN_BUDGET_MS = 240_000;
const CHUNK = 1000;

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if ((request.headers.get('authorization') || '') === `Bearer ${secret}`) return true;
  try {
    return new URL(request.url).searchParams.get('key') === secret;
  } catch {
    return false;
  }
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const started = Date.now();
  const outOfTime = () => Date.now() - started > RUN_BUDGET_MS;
  const { searchParams } = new URL(request.url);
  const only = (searchParams.get('metrics') || '').split(',').filter(Boolean);

  const admin = getAdminClient();
  const errors = [];
  const perMetric = {};
  const conceptHits = {};

  let tickers;
  try {
    tickers = buildCikTickerIndex(await getTickerMap());
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: `ticker map: ${e?.message || e}` },
      { status: 502 },
    );
  }

  const { durations, instants } = framePeriods(new Date());
  let metrics = only.length ? METRICS.filter((m) => only.includes(m.key)) : METRICS;
  const day = Math.floor(Date.now() / 86400000);
  const shift = metrics.length ? day % metrics.length : 0;
  metrics = [...metrics.slice(shift), ...metrics.slice(0, shift)];

  for (const metric of metrics) {
    if (outOfTime()) break;
    const periods = metric.instant ? instants : durations;
    let written = 0;
    for (const period of periods) {
      if (outOfTime()) break;
      const frames = [];
      for (const qualified of metric.concepts) {
        const [taxonomy, concept] = qualified.split(':');
        try {
          // eslint-disable-next-line no-await-in-loop
          const data = await getFrame(taxonomy, concept, metric.unit, period);
          frames.push({ concept: qualified, data });
          conceptHits[qualified] = (conceptHits[qualified] || 0) + (data?.data?.length || 0);
        } catch (e) {
          // 404 = nobody reported that concept for that period; not an error.
          if (!/ 404 /.test(` ${e?.message} `))
            errors.push(`${qualified} ${period}: ${e?.message || e}`);
          conceptHits[qualified] = conceptHits[qualified] || 0;
        }
      }
      const picked = pickFirstConcept(frames);
      const rows = [];
      for (const p of picked.values()) {
        const ticker = tickers.get(p.cik);
        if (!ticker) continue;
        rows.push({
          cik: p.cik,
          concept: metric.key,
          frame: period,
          ticker,
          entity_name: p.entityName,
          period_type: periodTypeOf(period),
          period_end: p.end,
          value: p.val,
          unit: metric.unit,
          taxonomy_concept: p.concept,
          accession_no: p.accn,
          synced_at: new Date().toISOString(),
        });
      }
      for (let i = 0; i < rows.length; i += CHUNK) {
        // eslint-disable-next-line no-await-in-loop
        const { error } = await admin
          .from('sec_fundamentals')
          .upsert(rows.slice(i, i + CHUNK), { onConflict: 'cik,concept,frame' });
        if (error) {
          errors.push(`${metric.key} ${period}: ${error.message}`);
          break;
        }
        written += Math.min(CHUNK, rows.length - i);
      }
    }
    perMetric[metric.key] = written;
  }

  const total = Object.values(perMetric).reduce((s, n) => s + n, 0);
  if (total) revalidateTag('titans');

  return NextResponse.json({
    ok: errors.length === 0,
    periods: { durations, instants },
    rows_per_metric: perMetric,
    concept_points: conceptHits,
    sec_requests: secRequestCount(),
    errors: errors.slice(0, 20),
  });
}
