/**
 * Server loaders for the Campaign Finance Intelligence page. Reads the cached
 * per-member tables (written hourly by /api/cron/ingest-fec) and hands them to
 * the pure aggregator. Never called from the browser; the page server-renders
 * the overview and the drawer reads /api/campaign-finance/member.
 *
 * Every read degrades to an empty, `ready: false` payload: the page then shows
 * its neutral "Not available yet" states, never zeros.
 */
import { unstable_cache } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { memberByBioguide } from '@/lib/politicians/member-directory';
import { buildMemberDetail, buildOverview } from './aggregate';

const supaConfigured = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

const TOTALS_COLS =
  'bioguide_id,cycle,name,party,office,state,receipts,disbursements,cash_on_hand_end_period,individual_itemized_contributions,other_political_committee_contributions,debts_owed_by_committee,coverage_start_date,coverage_end_date,size_buckets,top_states,synced_at';
const OUTSIDE_COLS =
  'bioguide_id,cycle,support_total,oppose_total,by_committee,spending_by_purpose,synced_at';

export const CF_DEFAULT_CYCLE = 2026;
export const CF_CYCLES = [2026, 2024, 2022];

function emptyOverview(cycle) {
  return buildOverview({ cycle, totals: [], outside: [], directory: memberByBioguide });
}

async function loadOverview(cycle) {
  if (!supaConfigured()) return emptyOverview(cycle);
  try {
    const admin = getAdminClient();
    const [t, o] = await Promise.all([
      admin.from('fec_candidate_totals').select(TOTALS_COLS).eq('cycle', cycle).limit(1000),
      admin.from('fec_candidate_outside').select(OUTSIDE_COLS).eq('cycle', cycle).limit(1000),
    ]);
    if (t.error || !Array.isArray(t.data)) return emptyOverview(cycle);
    return buildOverview({
      cycle,
      totals: t.data,
      outside: Array.isArray(o.data) ? o.data : [],
      directory: memberByBioguide,
    });
  } catch {
    return emptyOverview(cycle);
  }
}

/** Which cycles have any rows. A cycle with none is listed but disabled. */
async function loadCycles() {
  if (!supaConfigured()) return [];
  try {
    const admin = getAdminClient();
    const found = [];
    for (const c of CF_CYCLES) {
      const { count } = await admin
        .from('fec_candidate_totals')
        .select('bioguide_id', { count: 'exact', head: true })
        .eq('cycle', c);
      if (count) found.push(c);
    }
    return found;
  } catch {
    return [];
  }
}

/* The cron refreshes hourly; ten minutes keeps the page close behind it. */
export const getCampaignFinanceOverview = unstable_cache(loadOverview, ['cf-overview-v1'], {
  revalidate: 600,
  tags: ['campaign-finance'],
});

export const getCampaignFinanceCycles = unstable_cache(loadCycles, ['cf-cycles-v1'], {
  revalidate: 3600,
  tags: ['campaign-finance'],
});

export async function getCampaignFinanceMember(bioguideId, cycle) {
  if (!supaConfigured() || !bioguideId) return null;
  try {
    const admin = getAdminClient();
    const [t, o] = await Promise.all([
      admin
        .from('fec_candidate_totals')
        .select('bioguide_id,coverage_start_date,coverage_end_date,size_buckets,top_states')
        .eq('bioguide_id', bioguideId)
        .eq('cycle', cycle)
        .maybeSingle(),
      admin
        .from('fec_candidate_outside')
        .select('support_total,oppose_total,by_committee,spending_by_purpose')
        .eq('bioguide_id', bioguideId)
        .eq('cycle', cycle)
        .maybeSingle(),
    ]);
    if (t.error || !t.data) return null;
    return buildMemberDetail({ totals: t.data, outside: o.data || null });
  } catch {
    return null;
  }
}
