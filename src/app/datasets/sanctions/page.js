import { sanctionsEntries } from '@/lib/lighthouse/store';
import { shortDate } from '@/lib/titans/format';
import SanctionsClient from './SanctionsClient';

/**
 * Sanctions & Trade Policy Tracking dataset page. The OFAC Specially
 * Designated Nationals list, newest additions first (US Treasury, loaded
 * daily into sanctions_entries; the first load is the baseline).
 */
export const dynamic = 'force-dynamic';

const TYPE = { individual: 'Individual', entity: 'Entity', vessel: 'Vessel', aircraft: 'Aircraft' };

export default async function SanctionsPage() {
  const entries = await sanctionsEntries(300);
  const baseline = entries.reduce(
    (min, e) => (!min || e.first_seen < min ? e.first_seen : min),
    null,
  );
  const rows = entries.map((e) => ({
    id: String(e.ent_num),
    name: e.name,
    type: TYPE[e.entry_type] || e.entry_type || null,
    programs: (e.programs || []).join(', ') || null,
    country: (e.countries || []).slice(0, 2).join(', ') || null,
    added: e.first_seen && baseline && e.first_seen > baseline ? shortDate(e.first_seen) : null,
  }));
  const synced = entries.reduce((m, e) => (e.synced_at > (m || '') ? e.synced_at : m), null);
  return <SanctionsClient rows={rows} updated={synced ? shortDate(synced) : null} />;
}
