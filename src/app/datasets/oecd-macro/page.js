import { getOecdLatest } from '@/lib/oecd-store';
import OecdMacroClient from './OecdMacroClient';

/**
 * OECD Macro dataset page — Global Empire Lighthouse. Server component fetches
 * the small curated latest-values rollup (Supabase, synced from BigQuery by
 * /api/cron/sync-oecd-rollups) and hands rows to the client. Falls back to the
 * co-located static sample when rollups are empty. Rollups change only when the
 * sync runs — revalidate instead of rebuilding per request.
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
  return <OecdMacroClient latest={latest} />;
}
