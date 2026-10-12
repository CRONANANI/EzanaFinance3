import { lighthouseLatest } from '@/lib/lighthouse/store';
import { WB_INDICATORS } from '@/lib/lighthouse/indicators';
import { shortDate } from '@/lib/titans/format';
import WorldBankClient from './WorldBankClient';

/**
 * World Bank Economic Indicators dataset page. One row per country with its
 * latest value for each indicator (World Bank Indicators API, CC BY 4.0,
 * loaded weekly into lighthouse_observations).
 */
export const dynamic = 'force-dynamic';

const fmt = (v, digits = 1) => {
  const n = Number(v);
  return v == null || !Number.isFinite(n) ? null : n.toFixed(digits);
};
const usdCompact = (v) => {
  const n = Number(v);
  if (v == null || !Number.isFinite(n)) return null;
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  return `$${Math.round(n).toLocaleString('en-US')}`;
};

export default async function WorldBankPage() {
  const obs = await lighthouseLatest('worldbank');
  const byCountry = new Map();
  for (const o of obs) {
    if (!byCountry.has(o.ref_area)) {
      byCountry.set(o.ref_area, { id: o.ref_area, country: o.ref_area_name || o.ref_area });
    }
    const row = byCountry.get(o.ref_area);
    row[o.indicator] = o.latest_value;
    row[`${o.indicator}__year`] = String(o.latest_period).slice(0, 4);
  }
  const G = 'NY.GDP.MKTP.KD.ZG';
  const rows = [...byCountry.values()]
    .map((r) => ({
      id: r.id,
      country: r.country,
      growth: fmt(r[G]),
      inflation: fmt(r['FP.CPI.TOTL.ZG']),
      unemployment: fmt(r['SL.UEM.TOTL.ZS']),
      debt: fmt(r['GC.DOD.TOTL.GD.ZS']),
      gdpPc: usdCompact(r['NY.GDP.PCAP.CD']),
      year: r[`${G}__year`] || null,
      growthRaw: r[G] != null ? Number(r[G]) : null,
    }))
    .sort((a, b) => a.country.localeCompare(b.country));
  return (
    <WorldBankClient
      rows={rows}
      indicatorCount={WB_INDICATORS.length}
      updated={rows.length ? shortDate(new Date().toISOString()) : null}
    />
  );
}
