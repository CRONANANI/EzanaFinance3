/**
 * Sonar research engine: quantitative analysis and visualizations
 * (engine v3, Sections 6 and 8.3).
 *
 * Reproducible calculations over the structured data that evidence carries.
 * Every metric names its method, its inputs (evidence ids) and its period, so
 * the claim validator can accept a number only if a metric or an evidence
 * record states it. A chart is produced only when its data came back, and it
 * always carries its source, period, unit and method.
 *
 * Pure. Unit-tested in scripts/check-sonar-engine.mjs.
 */

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const round = (v, d = 4) => Number(Number(v).toFixed(d));

function metric(id, label, value, { unit, method, inputs, period = null }) {
  return {
    id,
    label,
    value: round(value),
    unit,
    method,
    inputs,
    period,
    classification: 'calculated_result',
  };
}

/**
 * @param {Array} evidence  normalised evidence (all retrieved, not just packed)
 * @param {object} spec
 * @returns {{ metrics: Array, visualizations: Array }}
 */
export function analyze(evidence, spec = {}) {
  const metrics = [];
  const visualizations = [];
  const sourceLabel = {
    lobbying_spend: 'Senate LDA lobbying disclosures',
    trade_count: 'STOCK Act congressional disclosures',
    contract_obligations: 'Federal contract obligations (USAspending)',
    holdings_value: 'SEC 13F holdings',
    revenue_by_region: 'Company-reported revenue segments',
    price_change: 'Market price data',
  };

  for (const e of evidence) {
    const d = e.data;
    if (!d?.metric) continue;
    const src = sourceLabel[d.metric];

    if (d.metric === 'lobbying_spend' && Array.isArray(d.rows) && d.rows.length) {
      const rows = d.rows.filter((r) => r.total > 0);
      const total = rows.reduce((s, r) => s + r.total, 0);
      const top5 = rows.slice(0, 5).reduce((s, r) => s + r.total, 0);
      if (total > 0) {
        metrics.push(
          metric(
            'lobbying_top5_share',
            'Top five clients, share of the listed spend',
            top5 / total,
            {
              unit: 'ratio',
              method: 'sum(total of the five largest clients) / sum(total of all listed clients)',
              inputs: [e.id],
              period: e.period,
            },
          ),
        );
      }
      visualizations.push({
        id: 'lobbying_leaders',
        type: 'leaderboard',
        title: `Disclosed lobbying spend, ${d.scope}`,
        unit: 'USD',
        period: e.period,
        source: src,
        method:
          "Each client's reported spend on the matching filings; self-filed expenses where the client files itself, otherwise outside firms' reported income",
        rows: rows.slice(0, 10).map((r) => ({ label: r.client, sub: r.ticker, value: r.total })),
        evidenceIds: [e.id],
      });
    }

    if (d.metric === 'trade_count' && d.summary) {
      const c = d.summary;
      metrics.push(
        metric('congress_trades_total', 'Congressional trades disclosed', c.total, {
          unit: 'count',
          method: 'count of disclosed transactions in the period',
          inputs: [e.id],
          period: e.period,
        }),
        metric(
          'congress_buy_share',
          'Purchases as a share of trades',
          c.total ? c.buys / c.total : 0,
          {
            unit: 'ratio',
            method: 'purchases / all disclosed transactions',
            inputs: [e.id],
            period: e.period,
          },
        ),
      );
      visualizations.push(
        {
          id: 'congress_monthly',
          type: 'timeline',
          title: 'Congressional purchases and sales by month',
          unit: 'transactions',
          period: e.period,
          source: src,
          method: 'count of disclosed transactions per calendar month by transaction date',
          series: c.monthly.map((m) => ({ x: m.month, buys: m.buys, sells: m.sells })),
          evidenceIds: [e.id],
        },
        {
          id: 'congress_most_traded',
          type: 'leaderboard',
          title: 'Most traded by members of Congress',
          unit: 'transactions',
          period: e.period,
          source: src,
          method: 'count of disclosed transactions per stock',
          rows: c.byTicker.slice(0, 10).map((t) => ({
            label: t.ticker,
            sub: t.name,
            value: t.trades,
            note: `${t.members} members`,
          })),
          evidenceIds: [e.id],
        },
      );
    }

    if (d.metric === 'contract_obligations' && d.contracts?.rows?.length) {
      const k = d.contracts;
      const key = k.rankBy;
      const total = k.rows.reduce((s, r) => s + r[key], 0);
      const top3 = k.rows.slice(0, 3).reduce((s, r) => s + r[key], 0);
      const fy = key === 'latest' ? k.latestFy : k.priorFy;
      if (total > 0) {
        metrics.push(
          metric(
            'contracts_top3_share',
            `Top three recipients, share of FY${fy} obligations listed`,
            top3 / total,
            {
              unit: 'ratio',
              method: `sum(FY${fy} obligations of the three largest) / sum(FY${fy} obligations of all listed)`,
              inputs: [e.id],
              period: e.period,
            },
          ),
        );
      }
      visualizations.push({
        id: 'contracts_leaders',
        type: 'leaderboard',
        title: `Federal contract obligations, FY${fy}`,
        unit: 'USD',
        period: e.period,
        source: src,
        method: `sum of obligations per company in FY${fy}${k.latestComplete ? '' : `; FY${k.latestFy} is still being synced`}`,
        rows: k.rows
          .slice(0, 10)
          .map((r) => ({ label: r.name || r.ticker, sub: r.ticker, value: r[key] })),
        evidenceIds: [e.id],
      });
    }

    if (d.metric === 'holdings_value' && d.leaders?.length) {
      visualizations.push({
        id: 'holders_leaders',
        type: 'leaderboard',
        title: 'Largest institutional holders across the companies',
        unit: 'USD',
        period: e.period,
        source: src,
        method:
          "sum of each filer's reported value across the companies where it is a top-five holder",
        rows: d.leaders
          .slice(0, 10)
          .map((l) => ({ label: l.filer, value: l.value, note: l.tickers.join(', ') })),
        evidenceIds: [e.id],
      });
    }

    if (d.metric === 'revenue_by_region' && d.exposure?.length) {
      const top = d.exposure[0];
      metrics.push(
        metric(
          'china_taiwan_revenue_share_max',
          `Highest disclosed China, Taiwan and Hong Kong revenue share (${top.ticker})`,
          top.chinaTaiwanShare,
          {
            unit: 'ratio',
            method:
              'sum of revenue in segments named for China, Taiwan or Hong Kong / total segment revenue, latest fiscal year',
            inputs: [e.id],
          },
        ),
      );
      visualizations.push({
        id: 'revenue_exposure',
        type: 'bars',
        title: 'Revenue reported in China, Taiwan and Hong Kong segments',
        unit: 'share of revenue',
        period: { label: 'latest fiscal year per company' },
        source: src,
        method: 'segment revenue / total segment revenue, as each company reports its regions',
        rows: d.exposure.map((r) => ({
          label: r.ticker,
          value: r.chinaTaiwanShare,
          note: `FY${r.fiscalYear}`,
        })),
        evidenceIds: [e.id],
      });
    }

    if (d.metric === 'price_change' && Array.isArray(d.rows) && d.rows.length) {
      const ytd = d.rows.map((r) => r.ytd).filter((v) => v != null);
      if (ytd.length) {
        metrics.push(
          metric('median_ytd_change', 'Median year-to-date share price change', median(ytd), {
            unit: 'percent',
            method: 'median of year-to-date price change across the companies',
            inputs: [e.id],
            period: e.period || { to: e.date },
          }),
        );
      }
      visualizations.push({
        id: 'performance_leaders',
        type: 'leaderboard',
        title: 'Share price change, year to date',
        unit: 'percent',
        period: { to: e.date, label: `year to date as of ${e.date}` },
        source: src,
        method: 'percent change from the first trading day of the year to the last close',
        rows: d.rows
          .slice(0, 10)
          .map((r) => ({ label: r.ticker, sub: r.name, value: r.ytd ?? r.y1 })),
        evidenceIds: [e.id],
      });
    }

    if (d.metric === 'price_change' && Array.isArray(d.series) && d.series.length > 1) {
      const pts = d.series;
      const first = pts[0].v;
      const last = pts[pts.length - 1].v;
      metrics.push(
        metric(
          'commodity_change_period',
          `${d.label} change over the period shown`,
          ((last - first) / first) * 100,
          {
            unit: 'percent',
            method: '(last close - first close) / first close x 100',
            inputs: [e.id],
            period: e.period,
          },
        ),
      );
      visualizations.push({
        id: 'commodity_price',
        type: 'line',
        title: `${d.label} price`,
        unit: 'USD',
        period: e.period,
        source: src,
        method: 'daily closing price',
        series: pts.map((p) => ({ x: p.d, y: p.v })),
        evidenceIds: [e.id],
      });
    }
  }
  return { metrics, visualizations };
}
