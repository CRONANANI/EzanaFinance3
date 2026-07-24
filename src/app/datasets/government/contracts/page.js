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
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Government contracts | Ezana',
  description:
    'Federal contract awards sourced from USAspending.gov (U.S. Treasury), synced daily into Ezana.',
};

export default async function GovernmentContractsPage() {
  // Primary path: pre-aggregated BigQuery rollups (all fiscal years, scales to
  // millions of rows). Falls back to the raw-award slice + coverage RPC when the
  // rollups aren't populated yet. All resolve to null/empty rather than throwing.
  const [rollup, { rows, source, syncedAt }, coverage] = await Promise.all([
    getContractRollups({ limit: 40000 }),
    getContractAwardsWithFallback({ limit: 200 }),
    getContractCoverage(),
  ]);

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
