/**
 * Server read for the 13F filing-progress indicator on /datasets/institutional
 * (definition: filing-progress-model.js). SQL first: the
 * thirteen_f_filing_progress RPC (migration 20261023200000, applied by hand)
 * returns the counts in one indexed query. Until it exists, the same counts
 * are computed here from sec_filings rows. Counts FILINGS, not parsed
 * holdings: a filing that has not been parsed yet has still been filed.
 * Cached 15 minutes under 'dataset:13f', which the filing ingest busts.
 */
import { unstable_cache } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { currentReportQuarter, priorQuarterEnd, dayOffset } from '@/lib/sec/quarters';
import { computeFilingProgress } from '@/lib/datasets/institutional/filing-progress-model';

function configured() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function periodRows(admin, period) {
  const out = [];
  for (let from = 0; from < 50000; from += 1000) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await admin
      .from('sec_filings')
      .select('cik, form_type, filed_at')
      .eq('form_family', 'institutional')
      .eq('period_of_report', period)
      .order('accession_no')
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function loadFilingProgress() {
  if (!configured()) return null;
  const admin = getAdminClient();
  const now = new Date();
  const period = currentReportQuarter(now);
  const prior = priorQuarterEnd(period);
  const offset = dayOffset(period, now);

  const { data: last } = await admin
    .from('sec_filings')
    .select('synced_at')
    .eq('form_family', 'institutional')
    .order('synced_at', { ascending: false })
    .limit(1);
  const lastIngestedAt = last?.[0]?.synced_at || null;

  let counts = null;
  const rpc = await admin.rpc('thirteen_f_filing_progress', {
    p_period: period,
    p_prior: prior,
    p_day_offset: offset,
  });
  if (!rpc.error && rpc.data?.[0]) {
    const r = rpc.data[0];
    counts = {
      filed: Number(r.filed) || 0,
      expected: Number(r.expected) || 0,
      priorFiledByOffset: Number(r.prior_filed_by_offset) || 0,
      priorCoverageStart: r.prior_coverage_start || null,
    };
  }
  const [curRows, priorRows] = counts
    ? [[], []]
    : await Promise.all([periodRows(admin, period), periodRows(admin, prior)]);

  const progress = computeFilingProgress({
    period,
    prior,
    now,
    curRows,
    priorRows,
    counts,
    lastIngestedAt,
  });
  if (progress.stale) {
    console.warn(
      `[13f] filing ingest looks stale: last synced ${lastIngestedAt} during the open window for ${period}`,
    );
  }
  return progress;
}

export const getFilingProgress = unstable_cache(loadFilingProgress, ['13f-filing-progress-v1'], {
  revalidate: 900,
  tags: ['dataset:13f', 'titans'],
});
