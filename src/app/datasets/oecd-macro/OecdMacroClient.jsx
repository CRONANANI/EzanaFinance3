'use client';

import { useMemo } from 'react';
import { Globe, LineChart, Gauge, Layers } from 'lucide-react';
import { DatasetDashboard } from '@/components/marketing/DatasetDashboard';
import { Ticker, EntityName, ReturnValue } from '@/components/marketing/DatasetTable';
import { OECD_SERIES_BY_SLUG, OECD_LENSES, PROJECTION_FROM_YEAR } from '@/lib/oecd-curated';
import { OECD_HIGHLIGHTS, OECD_INDICATORS } from './oecd-macro-sample';

const AGGREGATE_AREAS = new Set(['OECD', 'EA17', 'W', 'WXOECD', 'W_O', 'DAE', 'OIL_SAU_O']);
const nf = new Intl.NumberFormat('en-CA', { maximumFractionDigits: 2 });

function fmtPeriod(year) {
  return year >= PROJECTION_FROM_YEAR ? `${year} · proj.` : String(year);
}

function buildLiveRows(latest) {
  const rows = [];
  for (const r of latest) {
    const series = OECD_SERIES_BY_SLUG[r.ezana_slug];
    if (!series || AGGREGATE_AREAS.has(r.ref_area)) continue;
    if (r.latest_value == null) continue;
    const change =
      r.prior_value != null ? Number(r.latest_value) - Number(r.prior_value) : null;
    const lensLabel = OECD_LENSES.find((l) => l.id === series.lens)?.label ?? series.lens;
    rows.push({
      id: `${r.ezana_slug}-${r.ref_area}`,
      country: r.ref_area_name || r.ref_area,
      iso: r.ref_area,
      indicator: series.label,
      lensLabel,
      value: nf.format(Number(r.latest_value)),
      unit: series.unitLabel,
      change: change == null ? '—' : `${change >= 0 ? '+' : ''}${nf.format(change)}`,
      positive: change != null && change >= 0,
      period: fmtPeriod(r.latest_year),
    });
  }
  rows.sort(
    (a, b) => a.indicator.localeCompare(b.indicator) || a.country.localeCompare(b.country),
  );
  return rows;
}

function buildHighlights(latest) {
  const want = [
    { slug: 'eo-gdpv_annpct', name: 'OECD area real GDP growth', suffix: '%', toned: true },
    { slug: 'eo-cpi_ytypct', name: 'OECD area headline inflation', suffix: '%', toned: false },
    { slug: 'eo-unr', name: 'OECD area unemployment', suffix: '%', toned: false },
    { slug: 'eo-sratio', name: 'OECD area household net saving', suffix: '%', toned: true },
  ];
  const items = [];
  for (const w of want) {
    const r = latest.find((x) => x.ezana_slug === w.slug && x.ref_area === 'OECD');
    if (!r || r.latest_value == null) continue;
    const change = r.prior_value != null ? Number(r.latest_value) - Number(r.prior_value) : null;
    items.push({
      name: w.name,
      meta: `${OECD_SERIES_BY_SLUG[w.slug].unitLabel} · ${fmtPeriod(r.latest_year)}`,
      value: `${nf.format(Number(r.latest_value))}${w.suffix}`,
      tone: w.toned && change != null ? (change >= 0 ? 'pos' : 'neg') : undefined,
    });
  }
  return items;
}

export default function OecdMacroClient({ latest }) {
  const isLive = Array.isArray(latest) && latest.length > 0;

  const { rows, highlights } = useMemo(() => {
    if (!isLive) return { rows: OECD_INDICATORS, highlights: OECD_HIGHLIGHTS };
    return { rows: buildLiveRows(latest), highlights: buildHighlights(latest) };
  }, [isLive, latest]);

  const config = {
    title: 'OECD macro data',
    lead:
      'Harmonised OECD Economic Outlook indicators — growth, households, inflation, rates, government, and external balances — on one comparable basis, so a position in one market can be read against the conditions in another.',
    searches: [
      { id: 'country', label: 'Country search', placeholder: 'Search by country…', icon: Globe, keys: ['country', 'iso'] },
      { id: 'indicator', label: 'Indicator search', placeholder: 'Search by indicator…', icon: LineChart, keys: ['indicator'] },
      ...(isLive
        ? [{ id: 'lens', label: 'Lens filter', placeholder: 'Growth, Households, Inflation, Rates, Government, External…', icon: Layers, keys: ['lensLabel'] }]
        : []),
    ],
    highlight: {
      badge: isLive ? 'Live' : 'New',
      icon: Gauge,
      title: 'OECD-area snapshot',
      desc: isLive
        ? 'Latest OECD-area prints from the Economic Outlook database. Years marked proj. are OECD projections, not actuals.'
        : 'Composite view of the OECD area — the series are being loaded.',
      items: highlights,
    },
    table: {
      caption: 'Latest value per country, by indicator',
      columns: [
        { key: 'country', label: 'Country', render: (v) => <EntityName>{v}</EntityName> },
        { key: 'iso', label: 'ISO', render: (v) => <Ticker symbol={v} /> },
        { key: 'indicator', label: 'Indicator' },
        { key: 'lensLabel', label: 'Lens' },
        {
          key: 'value',
          label: 'Value',
          align: 'right',
          mono: true,
          render: (v, row) => (
            <span>
              {v} <span className="mkt-ds-leader-meta">{row.unit}</span>
            </span>
          ),
        },
        {
          key: 'change',
          label: 'Δ vs prior yr',
          align: 'right',
          mono: true,
          render: (v) => <ReturnValue value={v} />,
        },
        { key: 'period', label: 'Period', mono: true },
      ],
      rows,
    },
    sampleNote: isLive
      ? 'Latest OECD Economic Outlook values per country. Years ≥ 2024 are OECD projections. Source: OECD (CC BY 4.0).'
      : 'Placeholder rows — the OECD series are being loaded. Structure shown is final.',
    source: {
      title: 'How we source it',
      body: [
        'Indicators come from the OECD’s SDMX data API — the organisation’s official statistical distribution channel, published under a CC BY 4.0 licence with attribution. OECD harmonises national statistics onto a common methodology, which is what makes a figure for Canada directly comparable to one for Japan; national statistical offices do not guarantee that on their own.',
        'Series are keyed by country and reference period, so a macro reading can be joined to the market, contract, and prediction-market signals that share the same window. Values from 2024 onward are OECD projections from the Economic Outlook database. Attribution: Source — OECD.',
      ],
    },
    cta: { href: '/auth/login', label: 'Explore in the app' },
    activeCategory: 'lighthouse',
    activeItem: 'OECD Macro Data',
  };

  return <DatasetDashboard config={config} />;
}
