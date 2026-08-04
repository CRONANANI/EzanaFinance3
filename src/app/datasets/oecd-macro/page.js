import { getOecdLatest } from '@/lib/oecd-store';
import { getEmpireScoresForExplorer } from '@/lib/empire-public-store';
import OecdExplorerClient from './OecdExplorerClient';

/**
 * OECD Macro dataset page — Global Empire Lighthouse. Server component fetches
 * the curated latest-values rollup (Supabase, synced from BigQuery by
 * /api/cron/sync-oecd-rollups) and hands rows to the interactive explorer
 * (wireframe 3a). When the rollup is empty the explorer falls back to the
 * co-located static sample (via OecdMacroClient) — the honest empty state.
 * Rollups change only when the sync runs — revalidate instead of rebuilding.
 */
export const revalidate = 600;

export const metadata = {
  title: 'OECD macro data | Ezana',
  description:
    'Harmonised OECD Economic Outlook indicators — growth, households, inflation, rates, government, external — on one comparable basis. Source: OECD.',
};

export default async function OecdMacroDatasetPage() {
  // Both sources resolve to null on failure (never throw), so a settled pair is
  // enough — no source can take down the page. Empire scores are live-only; when
  // the backbone is unsynced this is null and empire mode shows its unavailable
  // state (OECD mode is unaffected).
  const [latestRes, empireRes] = await Promise.allSettled([
    getOecdLatest(),
    getEmpireScoresForExplorer(),
  ]);
  const latest = latestRes.status === 'fulfilled' ? latestRes.value : null;
  const empire = empireRes.status === 'fulfilled' ? empireRes.value : null;

  return <OecdExplorerClient latest={latest} empire={empire} />;
}
