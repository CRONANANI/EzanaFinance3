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

    /* Deep research (Nov 2026): the company's own reported results. */
    if (d.metric === 'financials') {
      const q = d.quarters || [];
      const y = d.years || [];
      const qp = (p) => ({ to: p.periodEnd, label: `quarter ended ${p.periodEnd}` });
      const yp = (p) => ({ to: p.periodEnd, label: `fiscal year ended ${p.periodEnd}` });
      const method = 'SEC-reported line items for the period';
      if (q[0]) {
        metrics.push(
          metric('revenue_latest_quarter', `${d.ticker} revenue, latest quarter`, q[0].revenue, {
            unit: 'USD',
            method,
            inputs: [e.id],
            period: qp(q[0]),
          }),
        );
        if (q[0].grossMargin != null)
          metrics.push(
            metric(
              'gross_margin_latest_quarter',
              `${d.ticker} gross margin, latest quarter`,
              q[0].grossMargin,
              {
                unit: 'ratio',
                method: 'gross profit / revenue',
                inputs: [e.id],
                period: qp(q[0]),
              },
            ),
          );
        if (q[0].operatingMargin != null)
          metrics.push(
            metric(
              'operating_margin_latest_quarter',
              `${d.ticker} operating margin, latest quarter`,
              q[0].operatingMargin,
              {
                unit: 'ratio',
                method: 'operating income / revenue',
                inputs: [e.id],
                period: qp(q[0]),
              },
            ),
          );
        if (q[1]?.revenue)
          metrics.push(
            metric(
              'revenue_growth_qoq',
              `${d.ticker} revenue change from the prior quarter`,
              (q[0].revenue / q[1].revenue - 1) * 100,
              {
                unit: 'percent',
                method: 'latest quarter revenue / prior quarter revenue - 1',
                inputs: [e.id],
                period: {
                  from: q[1].periodEnd,
                  to: q[0].periodEnd,
                  label: `${q[1].periodEnd} to ${q[0].periodEnd}`,
                },
              },
            ),
          );
      }
      if (y[0] && y[1]?.revenue)
        metrics.push(
          metric(
            'revenue_growth_fy',
            `${d.ticker} revenue growth, latest fiscal year`,
            (y[0].revenue / y[1].revenue - 1) * 100,
            {
              unit: 'percent',
              method: 'fiscal year revenue / prior fiscal year revenue - 1',
              inputs: [e.id],
              period: yp(y[0]),
            },
          ),
        );
    }

    if (d.metric === 'customer_capex' && Array.isArray(d.rows) && d.rows.length) {
      const fy = d.rows.filter((r) => r.yearCapex != null);
      if (fy.length) {
        metrics.push(
          metric(
            'customer_capex_fy_total',
            'Largest customers, combined capital expenditure (latest fiscal years)',
            fy.reduce((s, r) => s + r.yearCapex, 0),
            {
              unit: 'USD',
              method:
                "sum of each tracked customer's latest reported fiscal-year capital expenditure",
              inputs: [e.id],
              period: e.period,
            },
          ),
        );
      }
      const g = d.rows.filter((r) => r.growth != null);
      if (g.length) {
        metrics.push(
          metric(
            'customers_capex_rising',
            'Largest customers with higher capital expenditure than the prior fiscal year',
            g.filter((r) => r.growth > 0).length,
            {
              unit: 'count',
              method:
                'count of tracked customers whose latest fiscal-year capex exceeds the prior year',
              inputs: [e.id],
              period: e.period,
            },
          ),
        );
      }
    }

    /* Strategic positioning (Nov 2026). */
    if (d.metric === 'capex_monetization' && Array.isArray(d.years) && d.years.length) {
      const y = d.years.find((p) => Number.isFinite(p.capex));
      const yp = y ? { to: y.periodEnd, label: `fiscal year ended ${y.periodEnd}` } : null;
      if (y?.capexToRevenue != null)
        metrics.push(
          metric(
            'capex_to_revenue_fy',
            `${d.ticker} capital expenditure as a share of revenue, latest fiscal year`,
            y.capexToRevenue,
            {
              unit: 'ratio',
              method: 'fiscal year capital expenditure / fiscal year revenue',
              inputs: [e.id],
              period: yp,
            },
          ),
        );
      if (y?.capexToOcf != null)
        metrics.push(
          metric(
            'capex_to_ocf_fy',
            `${d.ticker} capital expenditure as a share of operating cash flow, latest fiscal year`,
            y.capexToOcf,
            {
              unit: 'ratio',
              method: 'fiscal year capital expenditure / fiscal year operating cash flow',
              inputs: [e.id],
              period: yp,
            },
          ),
        );
      if (y?.fcf != null)
        metrics.push(
          metric('fcf_fy', `${d.ticker} free cash flow, latest fiscal year`, y.fcf, {
            unit: 'USD',
            method: 'fiscal year operating cash flow - fiscal year capital expenditure',
            inputs: [e.id],
            period: yp,
          }),
        );
      if (y?.capexGrowth != null && y?.revenueGrowth != null)
        metrics.push(
          metric(
            'capex_growth_fy',
            `${d.ticker} capital expenditure growth, latest fiscal year`,
            y.capexGrowth * 100,
            {
              unit: 'percent',
              method: 'fiscal year capital expenditure / prior fiscal year capital expenditure - 1',
              inputs: [e.id],
              period: yp,
            },
          ),
        );
      const q = (d.quarters || []).find((p) => p.capexYoy != null || p.revenueYoy != null);
      if (q?.revenueYoy != null)
        metrics.push(
          metric(
            'revenue_growth_yoy_q',
            `${d.ticker} revenue growth, latest quarter on the same quarter a year earlier`,
            q.revenueYoy * 100,
            {
              unit: 'percent',
              method: 'quarter revenue / same quarter a year earlier - 1',
              inputs: [e.id],
              period: { from: q.yearAgo, to: q.periodEnd, label: `${q.yearAgo} to ${q.periodEnd}` },
            },
          ),
        );
      if (q?.capexYoy != null)
        metrics.push(
          metric(
            'capex_growth_yoy_q',
            `${d.ticker} capital expenditure growth, latest quarter on the same quarter a year earlier`,
            q.capexYoy * 100,
            {
              unit: 'percent',
              method: 'quarter capital expenditure / same quarter a year earlier - 1',
              inputs: [e.id],
              period: { from: q.yearAgo, to: q.periodEnd, label: `${q.yearAgo} to ${q.periodEnd}` },
            },
          ),
        );
    }

    if (d.metric === 'segments' && Array.isArray(d.segments)) {
      const top = [...d.segments]
        .filter((s) => s.changeShare != null && s.changeShare > 0)
        .sort((a, b) => b.changeShare - a.changeShare)[0];
      if (top)
        metrics.push(
          metric(
            'segment_increase_share',
            `${top.segment} share of the year-over-year revenue increase across reported segments`,
            top.changeShare,
            {
              unit: 'ratio',
              method:
                'segment revenue change / total change across reported segments, same quarter a year apart',
              inputs: [e.id],
              period: e.period,
            },
          ),
        );
    }

    if (d.metric === 'contracts_profile' && Array.isArray(d.agencies) && d.agencies.length) {
      metrics.push(
        metric(
          'contracts_top_agency_share',
          `${d.agencies[0].agency} share of federal contract obligations to ${d.ticker}, FY${d.agencyWindow.from} to FY${d.agencyWindow.to}`,
          d.agencies[0].share,
          {
            unit: 'ratio',
            method:
              'obligations by the largest awarding agency / all obligations, complete fiscal years',
            inputs: [e.id],
            period: { label: `FY${d.agencyWindow.from} to FY${d.agencyWindow.to}` },
          },
        ),
      );
      if (d.growth != null)
        metrics.push(
          metric(
            'contracts_growth_complete_fy',
            `${d.ticker} federal contract obligations, change in FY${d.lastComplete}`,
            d.growth * 100,
            {
              unit: 'percent',
              method: 'latest complete fiscal year obligations / prior fiscal year obligations - 1',
              inputs: [e.id],
              period: { label: `FY${d.lastComplete - 1} to FY${d.lastComplete}` },
            },
          ),
        );
    }

    if (d.metric === 'positioning' && d.top10_share != null) {
      metrics.push(
        metric(
          'holders_top10_share',
          'Ten largest 13F holders, share of reported value',
          d.top10_share,
          {
            unit: 'ratio',
            method:
              'value held by the ten largest reported holders / value reported by all holders in the dataset',
            inputs: [e.id],
            period: e.period,
          },
        ),
      );
    }

    /* Nov 2026: series from the macro catalogue (macro_series source). */
    if (d.metric === 'macro_series') analyzeMacroSeries(e, d, metrics, visualizations);
  }
  return { metrics, visualizations };
}

const slug = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

/** Where the latest value sits among the last five years of observations, 0 to 100. */
export function fiveYearPercentile(history, latest, frequency = 'M') {
  const per = { A: 5, Q: 20, M: 60, D: 1260 }[frequency] || 60;
  const pts = (history || []).filter((p) => Number.isFinite(p.value)).slice(-per);
  if (pts.length < Math.min(12, per) || !Number.isFinite(latest)) return null;
  const below = pts.filter((p) => p.value <= latest).length;
  return {
    value: (below / pts.length) * 100,
    n: pts.length,
    from: pts[0].period,
    to: pts[pts.length - 1].period,
  };
}

const freqOfPeriod = (p) =>
  /^\d{4}$/.test(p) ? 'A' : /-Q[1-4]$/.test(p) ? 'Q' : /^\d{4}-\d{2}$/.test(p) ? 'M' : 'D';

function analyzeMacroSeries(e, d, metrics, visualizations) {
  const where = d.place ? ` (${d.place})` : '';
  const id = `${slug(d.family)}_${slug(d.iso3 || d.scope || 'world')}`;
  const unit = d.unit || null;
  if (d.ranking?.rows?.length) {
    const rows = d.ranking.rows;
    for (const r of rows.slice(0, 5)) {
      metrics.push(
        metric(
          `macro_rank_${slug(d.family)}_${slug(r.iso3)}`,
          `${r.name}: rank on ${d.name}`,
          r.rank,
          {
            unit: 'rank',
            method: `rank among ${rows.length >= 10 ? 'the countries listed' : `${rows.length} countries`} by each country's latest observation (${d.order === 'asc' ? 'lowest' : 'highest'} first), one source for all: ${d.attribution}`,
            inputs: [e.id],
            period: { label: `latest observation per country, most recent ${r.period}` },
          },
        ),
      );
    }
    visualizations.push({
      id: `macro_rank_${slug(d.family)}`,
      type: 'bars',
      title: d.name,
      unit: unit || 'value',
      period: { label: d.ranking.mix || 'latest observation per country' },
      source: d.attribution,
      method: "each country's latest observation; periods differ by country as noted",
      rows: rows.map((r) => ({ label: r.name, value: r.value, note: r.period })),
      evidenceIds: [e.id],
    });
    return;
  }
  if (!Number.isFinite(d.value)) return;
  metrics.push(
    metric(`macro_latest_${id}`, `${d.name}${where}, ${d.period}`, d.value, {
      unit,
      method: `latest observed value as published by ${d.attribution}`,
      inputs: [e.id],
      period: { label: d.period },
    }),
  );
  if (Number.isFinite(d.change)) {
    metrics.push(
      metric(`macro_yoy_${id}`, `${d.name}${where}: change on a year earlier`, d.change, {
        unit: d.changeKind === 'pp' ? 'percentage points' : 'percent',
        method:
          d.changeKind === 'pp'
            ? `value in ${d.period} minus value in ${d.yearAgoPeriod}`
            : `(value in ${d.period} / value in ${d.yearAgoPeriod} - 1) x 100`,
        inputs: [e.id],
        period: { label: `${d.yearAgoPeriod} to ${d.period}` },
      }),
    );
  }
  const hist = Array.isArray(d.history) ? d.history : [];
  const pct = fiveYearPercentile(hist, d.rawLatest ?? d.value, freqOfPeriod(String(d.period)));
  if (pct && !d.derived) {
    metrics.push(
      metric(
        `macro_pct5y_${id}`,
        `${d.name}${where}: percentile of the latest value in five years`,
        pct.value,
        {
          unit: 'percentile',
          method: `share of the ${pct.n} observations from ${pct.from} to ${pct.to} at or below the latest value`,
          inputs: [e.id],
          period: { label: `${pct.from} to ${pct.to}` },
        },
      ),
    );
  }
  if (hist.length > 1) {
    visualizations.push({
      id: `macro_line_${id}`,
      type: 'line',
      title: `${d.name}${where}`,
      unit: d.seriesUnit || unit || 'value',
      period: {
        from: hist[0].period,
        to: hist[hist.length - 1].period,
        label: `${hist[0].period} to ${hist[hist.length - 1].period}`,
      },
      source: d.attribution,
      method: d.derived ? 'underlying index as published' : 'as published',
      series: hist.map((p) => ({ x: p.period, y: p.value })),
      evidenceIds: [e.id],
    });
  }
}
