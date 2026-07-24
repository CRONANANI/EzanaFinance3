import { formatDisplayDate } from '@/lib/usaspending';
import {
  getContractAwardsWithFallback,
  getContractCoverage,
  getContractRollups,
  contractFreshnessNote,
} from '@/lib/usaspending-store';
import { CONTRACT_AWARDS_SAMPLE } from '../government-sample';
import GovContractsClient from './GovContractsClient';

/**
 * Government Contracts dataset page — Claude Design "Option 1b" redesign, bound
 * to live USAspending.gov data.
 *
 * Data source order is UNCHANGED (presentation-layer redesign only): hosted
 * Supabase (daily ingest cron) → live USAspending API → static sample. This
 * server component fetches once and hands the real award rows to the interactive
 * client. We pull a wider slice (limit 200) than the old table so the client can
 * aggregate recipients by agency for the treemap / donut / ranked list without
 * any new API surface.
 */
// The rollups only change when sync-bq-rollups runs, so rebuilding on every
// request was wasted work — and the sole reason the growing rollup paging hit
// the function timeout. Revalidate every 10 minutes instead.
export const revalidate = 600;

// Paging a 19-year rollup plus the award slice and coverage RPC can exceed the
// default limit on a cold render.
export const maxDuration = 60;

export const metadata = {
  title: 'Government contracts | Ezana',
  description:
    'Federal contract awards sourced from USAspending.gov (U.S. Treasury), synced daily into Ezana.',
};

export default async function GovernmentContractsPage() {
  // Primary path: pre-aggregated BigQuery rollups (all fiscal years, scales to
  // millions of rows). Falls back to the raw-award slice + coverage RPC when the
  // rollups aren't populated yet. All resolve to null/empty rather than throwing.
  // Individually guarded: a failure in any one source degrades that source to
  // null rather than taking down the whole page. Previously an unhandled
  // rejection (or a timeout) rendered the generic error boundary instead of the
  // sample-data fallback the page was designed to have.
  const [rollupRes, awardsRes, coverageRes] = await Promise.allSettled([
    getContractRollups({ limit: 40000 }),
    getContractAwardsWithFallback({ limit: 200 }),
    getContractCoverage(),
  ]);

  const rollup = rollupRes.status === 'fulfilled' ? rollupRes.value : null;
  const { rows, source, syncedAt } =
    awardsRes.status === 'fulfilled' ? awardsRes.value : { rows: [], source: null, syncedAt: null };
  const coverage = coverageRes.status === 'fulfilled' ? coverageRes.value : null;

  const usingSample = !rollup && source === null;
  const awardRows = usingSample
    ? CONTRACT_AWARDS_SAMPLE.map((r) => ({ ...r, date: formatDisplayDate(r.date) }))
    : rows;

  const noteSource = rollup ? 'rollup' : (source ?? 'sample');

  return (
    <GovContractsClient
      awards={awardRows}
      isLive={Boolean(rollup) || !usingSample}
      note={contractFreshnessNote(noteSource, syncedAt)}
      coverage={coverage && coverage.total > 0 ? coverage : null}
      rollup={rollup}
    />
  );
}
