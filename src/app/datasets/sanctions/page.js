import { shortDate } from '@/lib/titans/format';
import { getNewestAdditions, getSanctionsPage, getSanctionsSummary } from '@/lib/sanctions/summary';
import { worldCountries } from '@/lib/sanctions/world-map';
import SanctionsClient from './SanctionsClient';

/**
 * Sanctions & Trade Policy Tracking. The whole OFAC Specially Designated
 * Nationals list (US Treasury, loaded daily into sanctions_entries; the first
 * load is the baseline): who is listed, where they are based, which programs
 * and jurisdictions the listings fall under, and what was added since
 * tracking began. Aggregates are cached (6h, revalidated by the ingest); the
 * listings table pages through /api/datasets/sanctions.
 */
export const dynamic = 'force-dynamic';

export default async function SanctionsPage() {
  const summary = await getSanctionsSummary();
  const [firstPage, newest] = await Promise.all([
    getSanctionsPage({ page: 1 }),
    getNewestAdditions(summary.baseline, 30),
  ]);
  const map = worldCountries();
  return (
    <SanctionsClient
      summary={summary}
      firstPage={firstPage}
      newest={newest}
      map={map}
      baselineLabel={shortDate(summary.baseline)}
      syncedLabel={shortDate(summary.synced)}
    />
  );
}
