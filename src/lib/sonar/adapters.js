/**
 * Per-dataset adapters (sonar-ezanaql-coverage-prompt.md Step 3). Each turns
 * one dataset's rows into a match card, 2-4 KPIs, chart series candidates,
 * citation sources and a trimmed digest for the model.
 *
 * One generic factory is driven by the derived catalog (so every live
 * EzanaQL dataset gets a working adapter for free), and the OVERRIDES map
 * carries the per-dataset judgement: which metric headlines the card, which
 * dimension splits it, what a row's label is. Adding a dataset to EzanaQL's
 * catalog yields a generic adapter with no Sonar change; promoting it to the
 * gov-contracts quality bar is one OVERRIDES entry.
 */
import { DATASET_DEFS } from '@/lib/sonar/catalog';

const sum = (rows, f) => rows.reduce((t, r) => t + (Number(r?.[f]) || 0), 0);
const uniq = (rows, f) => new Set(rows.map((r) => r?.[f]).filter((v) => v != null)).size;

/** Per-dataset judgement: the headline metric, the split dimension, the row
 *  label and (optionally) extra KPI builders. */
const OVERRIDES = {
  'gov.contracts': {
    primaryMetric: 'award_value',
    splitDim: 'awarding_agency',
    rowLabel: (r) => r.recipient || r.ticker,
    extraKpis: (rows) => [
      {
        id: 'avg_award',
        label: 'Avg award',
        value: rows.length ? sum(rows, 'award_value') / rows.length : null,
        fmt: 'currency_compact',
      },
      { id: 'agencies', label: 'Agencies', value: uniq(rows, 'awarding_agency'), fmt: 'int' },
    ],
  },
  'capitol.congress_trades': {
    primaryMetric: 'amount_est',
    splitDim: 'transaction_type',
    rowLabel: (r) => r.politician || r.ticker,
    extraKpis: (rows) => {
      const buys = rows.filter((r) => /purchase|buy/i.test(String(r.transaction_type))).length;
      const sells = rows.filter((r) => /sale|sell/i.test(String(r.transaction_type))).length;
      return [
        { id: 'buys', label: 'Buys', value: buys, fmt: 'int' },
        { id: 'sells', label: 'Sells', value: sells, fmt: 'int' },
        { id: 'members', label: 'Members', value: uniq(rows, 'bioguide_id'), fmt: 'int' },
      ];
    },
  },
  'capitol.holdings': {
    primaryMetric: 'est_value',
    splitDim: 'ticker',
    rowLabel: (r) => r.politician || r.ticker,
  },
  'capitol.lobbying': {
    primaryMetric: 'amount',
    splitDim: 'client',
    rowLabel: (r) => r.client || r.registrant,
    extraKpis: (rows) => [
      { id: 'clients', label: 'Clients', value: uniq(rows, 'client'), fmt: 'int' },
    ],
  },
  'capitol.committee_seats': {
    splitDim: 'committee',
    rowLabel: (r) => r.politician || r.committee,
  },
  'capitol.campaign_finance': {
    primaryMetric: 'receipts',
    splitDim: 'party',
    rowLabel: (r) => r.politician,
  },
  'prediction.markets': {
    primaryMetric: 'volume',
    splitDim: 'category',
    rowLabel: (r) => r.question,
    extraKpis: (rows) => {
      const probs = rows.map((r) => Number(r.probability)).filter(Number.isFinite);
      return probs.length
        ? [
            {
              id: 'median_odds',
              label: 'Median odds',
              value: probs.sort((a, b) => a - b)[Math.floor(probs.length / 2)],
              fmt: 'pct',
            },
          ]
        : [];
    },
  },
  'titans.holdings_13f': {
    primaryMetric: 'value',
    splitDim: 'filer',
    rowLabel: (r) => r.filer || r.issuer,
    extraKpis: (rows) => [
      { id: 'filers', label: 'Filers', value: uniq(rows, 'filer_cik'), fmt: 'int' },
    ],
  },
  'titans.activist_stakes': {
    primaryMetric: 'percent_of_class',
    splitDim: 'form_type',
    rowLabel: (r) => r.filer || r.company,
  },
  'titans.whale_moves': {
    primaryMetric: 'value',
    splitDim: 'kind',
    rowLabel: (r) => r.filer || r.ticker,
  },
  'lighthouse.oecd': {
    primaryMetric: 'value',
    splitDim: 'country',
    rowLabel: (r) => `${r.country || r.country_code} ${r.indicator || ''}`.trim(),
  },
  'eyes.chokepoints': {
    primaryMetric: 'transits',
    splitDim: 'chokepoint',
    rowLabel: (r) => r.chokepoint,
  },
  'eyes.ports': {
    primaryMetric: 'port_calls',
    splitDim: 'port',
    rowLabel: (r) => r.port,
  },
  'eyes.patents': {
    splitDim: 'assignee',
    rowLabel: (r) => r.title || r.assignee,
  },
  'house.filings': {
    splitDim: 'filing_type',
    rowLabel: (r) => `${r.member_first || ''} ${r.member_last || ''}`.trim(),
  },
};

function pickTimeField(def) {
  return Object.entries(def.dims).find(([, kind]) => kind === 'time')?.[0] || null;
}

function makeAdapter(def) {
  const o = OVERRIDES[def.id] || {};
  const metricField =
    o.primaryMetric && def.metrics[o.primaryMetric]
      ? o.primaryMetric
      : Object.keys(def.metrics)[0] || null;
  const metricFmt = metricField ? def.metrics[metricField].format : null;
  const splitDim =
    o.splitDim || Object.entries(def.dims).find(([, kind]) => kind === 'category')?.[0] || null;
  const timeField = pickTimeField(def);
  const rowLabel =
    o.rowLabel || ((r) => Object.values(r).find((v) => typeof v === 'string') || '·');

  return {
    dataset: def.id,
    label: def.label,

    matchCard(rows) {
      if (!rows?.length) return null;
      const split = new Map();
      if (splitDim) {
        for (const r of rows) {
          const k = r?.[splitDim];
          if (k == null) continue;
          split.set(k, (split.get(k) || 0) + (metricField ? Number(r[metricField]) || 0 : 1));
        }
      }
      return {
        dataset: def.id,
        label: def.label,
        count: rows.length,
        headline: metricField
          ? {
              label: `Total ${metricField.replace(/_/g, ' ')}`,
              value: sum(rows, metricField),
              fmt: metricFmt,
            }
          : { label: 'Rows', value: rows.length, fmt: 'int' },
        split: [...split.entries()]
          .map(([k, v]) => ({ label: String(k), value: v }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5),
        rows: rows.slice(0, 4).map((r) => ({
          label: String(rowLabel(r) ?? '·'),
          value: metricField ? (Number(r[metricField]) ?? null) : null,
          date: timeField ? (r[timeField] ?? null) : null,
        })),
      };
    },

    kpis(rows) {
      if (!rows?.length) return [];
      const base = metricField
        ? [
            {
              id: `${def.id}:total`,
              label: `${def.label}: total`,
              value: sum(rows, metricField),
              fmt: metricFmt,
            },
          ]
        : [];
      base.push({
        id: `${def.id}:count`,
        label: `${def.label}: rows`,
        value: rows.length,
        fmt: 'int',
      });
      return [...base, ...(o.extraKpis ? o.extraKpis(rows) : [])].slice(0, 4);
    },

    chartSeries(rows, cluster) {
      if (!rows?.length) return [];
      const out = [];
      /* With no numeric metric the split still charts as a row count, so a
         seats- or filings-shaped dataset gets a chart rather than nothing. */
      if (splitDim) {
        const split = new Map();
        for (const r of rows) {
          const k = r?.[splitDim];
          if (k == null) continue;
          split.set(k, (split.get(k) || 0) + (metricField ? Number(r[metricField]) || 0 : 1));
        }
        const data = [...split.entries()]
          .map(([label, value]) => ({ label: String(label), value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 12);
        if (data.length > 1) {
          out.push({
            id: `${def.id}:${splitDim}`,
            dataset: def.id,
            title: `${def.label} by ${splitDim.replace(/_/g, ' ')}`,
            shape: data.length <= 6 ? 'part_whole' : 'ranking',
            dim: splitDim,
            data,
            cardinality: data.length,
          });
        }
      }
      if (timeField && metricField && cluster?.timeWindow) {
        const byDate = new Map();
        for (const r of rows) {
          const d = String(r?.[timeField] || '').slice(0, 10);
          if (!d) continue;
          byDate.set(d, (byDate.get(d) || 0) + (Number(r[metricField]) || 0));
        }
        const data = [...byDate.entries()]
          .map(([date, value]) => ({ date, value }))
          .sort((a, b) => a.date.localeCompare(b.date));
        if (data.length > 2) {
          out.push({
            id: `${def.id}:${timeField}`,
            dataset: def.id,
            title: `${def.label} over time`,
            shape: 'timeseries',
            dim: timeField,
            data,
            cardinality: data.length,
          });
        }
      }
      return out;
    },

    sources(rows) {
      return (rows || []).slice(0, 8).map((r, i) => ({
        dataset: def.id,
        label: `${def.label}: ${String(rowLabel(r) ?? `row ${i + 1}`)}`,
        row: r,
      }));
    },

    digest(rows, max = 6) {
      return (rows || []).slice(0, max);
    },
  };
}

const ADAPTERS = Object.fromEntries(
  Object.values(DATASET_DEFS).map((def) => [def.id, makeAdapter(def)]),
);

export function getAdapter(datasetId) {
  return ADAPTERS[datasetId] || null;
}
export const ADAPTER_IDS = Object.keys(ADAPTERS);
