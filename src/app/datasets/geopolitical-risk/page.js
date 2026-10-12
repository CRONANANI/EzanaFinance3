import { lighthouseLatest } from '@/lib/lighthouse/store';
import GeopoliticalRiskClient from './GeopoliticalRiskClient';

/**
 * Geopolitical Risk Indices dataset page. The latest monthly country indexes
 * (GPRC) with the month before, and the global index (GPR) as the headline.
 * Caldara and Iacoviello (2022), loaded weekly into lighthouse_observations.
 */
export const dynamic = 'force-dynamic';

const monthLabel = (iso) => {
  const m = /^(\d{4})-(\d{2})/.exec(String(iso || ''));
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, 1)).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
};
const fix = (v, d = 2) => (v == null || !Number.isFinite(Number(v)) ? null : Number(v).toFixed(d));

export default async function GeopoliticalRiskPage() {
  const obs = await lighthouseLatest('gpr', ['GPR', 'GPRC']);
  const global = obs.find((o) => o.indicator === 'GPR' && o.ref_area === 'WLD') || null;
  const rows = obs
    .filter((o) => o.indicator === 'GPRC' && o.latest_value != null)
    .map((o) => {
      const change = o.prior_value != null ? Number(o.latest_value) - Number(o.prior_value) : null;
      return {
        id: o.ref_area,
        country: o.ref_area_name || o.ref_area,
        index: fix(o.latest_value),
        prior: fix(o.prior_value),
        change: change == null ? null : `${change >= 0 ? '+' : ''}${change.toFixed(2)}`,
        month: monthLabel(o.latest_period),
        indexRaw: Number(o.latest_value),
      };
    })
    .sort((a, b) => b.indexRaw - a.indexRaw);
  return (
    <GeopoliticalRiskClient
      rows={rows}
      global={
        global
          ? { value: fix(global.latest_value, 1), month: monthLabel(global.latest_period) }
          : null
      }
    />
  );
}
