import { getOecdLatest } from '@/lib/oecd-store';
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
  let latest = null;
  try {
    latest = await getOecdLatest();
  } catch {
    latest = null;
  }
  return <OecdExplorerClient latest={latest} />;
}
