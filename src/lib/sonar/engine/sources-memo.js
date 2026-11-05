/**
 * Sonar research engine: evidence for the investment risk assessment
 * (deep research, Nov 2026).
 *
 *   company_financials  the company's own SEC-reported results: the latest
 *                       quarters and fiscal years, with margins and growth
 *                       computed from the reported lines
 *   product_segments    revenue by product or segment, as the company
 *                       reports it (the data center share, for a chip maker)
 *   holder_positioning  13F positioning: the largest reported holders, how
 *                       concentrated they are, and quarter-over-quarter
 *                       adds, cuts, new positions and exits among managers
 *                       that filed for both quarters (sonar_13f_positioning)
 *   peer_financials     the same reported lines for the company's listed
 *                       peers, side by side
 *
 * Every figure in an item's text is one the item's own data states, so the
 * claim validator can check a memo's numbers against it. Periods are always
 * named: 13F, filings and market data have different dates and are never
 * presented as one point in time.
 *
 * SERVER ONLY. Each runner is bounded by the executor and fails soft. No
 * vendor name in any text.
 */
import { fetchWithTimeout } from '@/lib/http/fetch-json';
import { getFmpKey } from '@/lib/fmp/upcoming-events';
import { cacheGet, cacheSet } from './cache';

const FMP_STABLE = 'https://financialmodelingprep.com/stable';

export const usdB = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 'n/a';
  const a = Math.abs(n);
  if (a >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
};
const pct1 = (r) => `${(r * 100).toFixed(1)}%`;
const signed = (r) => `${r >= 0 ? 'up' : 'down'} ${(Math.abs(r) * 100).toFixed(1)}%`;
const shares = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return 'n/a';
  if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(2)}B shares`;
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M shares`;
  return `${Math.round(v).toLocaleString('en-US')} shares`;
};

export async function fmp(path, params, ms) {
  const key = getFmpKey();
  if (!key) return null;
  const cacheKey = `fmp:${path}:${JSON.stringify(params)}`;
  const hit = await cacheGet(cacheKey);
  if (hit !== undefined) return hit;
  try {
    const qs = new URLSearchParams({ ...params, apikey: key }).toString();
    const res = await fetchWithTimeout(`${FMP_STABLE}/${path}?${qs}`, { cache: 'no-store' }, ms);
    if (!res.ok) return null;
    const data = await res.json();
    await cacheSet(cacheKey, data, 6 * 3600);
    return data;
  } catch {
    return null;
  }
}

const CONCEPTS = [
  'revenue',
  'gross_profit',
  'operating_income',
  'net_income',
  'operating_cash_flow',
  'capex',
  'rd_expense',
  /* balance-sheet instants, attached to the period that ends on their date */
  'inventory',
  'receivables',
  'purchase_obligations',
];
const INSTANTS = new Set(['inventory', 'receivables', 'purchase_obligations']);

/** Reported periods for tickers: { [ticker]: { quarters: [...], years: [...] } } newest first. */
export async function reportedPeriods(admin, tickers) {
  const { data, error } = await admin
    .from('sec_fundamentals')
    .select('ticker, entity_name, concept, period_type, frame, period_end, value')
    .in('ticker', tickers)
    .in('concept', CONCEPTS)
    .in('period_type', ['quarter', 'annual', 'instant'])
    .order('period_end', { ascending: false })
    .limit(90 * tickers.length);
  if (error || !data?.length) return {};
  const out = {};
  const instants = [];
  for (const r of data) {
    const t = String(r.ticker).toUpperCase();
    out[t] = out[t] || { name: r.entity_name || t, quarter: new Map(), annual: new Map() };
    if (r.period_type === 'instant' || INSTANTS.has(r.concept)) {
      instants.push(r);
      continue;
    }
    const bucket = r.period_type === 'quarter' ? out[t].quarter : out[t].annual;
    const key = String(r.period_end).slice(0, 10);
    const row = bucket.get(key) || { periodEnd: key, frame: r.frame || null };
    row[r.concept] = Number(r.value);
    bucket.set(key, row);
  }
  /* A balance-sheet value belongs to the quarter (or year) ending that day. */
  for (const r of instants) {
    const t = String(r.ticker).toUpperCase();
    const key = String(r.period_end).slice(0, 10);
    for (const bucket of [out[t].quarter, out[t].annual]) {
      const row = bucket.get(key);
      if (row && row[r.concept] == null) row[r.concept] = Number(r.value);
    }
  }
  for (const t of Object.keys(out)) {
    const shape = (m) =>
      [...m.values()]
        .filter((p) => Number.isFinite(p.revenue))
        .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd))
        .map((p) => ({
          ...p,
          grossMargin: Number.isFinite(p.gross_profit) ? p.gross_profit / p.revenue : null,
          operatingMargin: Number.isFinite(p.operating_income)
            ? p.operating_income / p.revenue
            : null,
        }));
    out[t] = { name: out[t].name, quarters: shape(out[t].quarter), years: shape(out[t].annual) };
  }
  return out;
}

function periodLine(p, label) {
  const parts = [`revenue ${usdB(p.revenue)}`];
  if (Number.isFinite(p.gross_profit))
    parts.push(`gross profit ${usdB(p.gross_profit)} (gross margin ${pct1(p.grossMargin)})`);
  if (Number.isFinite(p.operating_income))
    parts.push(
      `operating income ${usdB(p.operating_income)} (operating margin ${pct1(p.operatingMargin)})`,
    );
  if (Number.isFinite(p.net_income)) parts.push(`net income ${usdB(p.net_income)}`);
  if (Number.isFinite(p.operating_cash_flow))
    parts.push(`operating cash flow ${usdB(p.operating_cash_flow)}`);
  if (Number.isFinite(p.capex)) parts.push(`capital expenditure ${usdB(p.capex)}`);
  if (Number.isFinite(p.rd_expense)) parts.push(`research and development ${usdB(p.rd_expense)}`);
  if (Number.isFinite(p.inventory)) parts.push(`inventory at period end ${usdB(p.inventory)}`);
  if (Number.isFinite(p.receivables))
    parts.push(`accounts receivable at period end ${usdB(p.receivables)}`);
  if (Number.isFinite(p.purchase_obligations))
    parts.push(`purchase obligations ${usdB(p.purchase_obligations)}`);
  return `${label}: ${parts.join(', ')}`;
}

/* ── company_financials ─────────────────────────────────────────────── */

export async function companyFinancials({ ticker, name }, { admin }) {
  const t = String(ticker || '').toUpperCase();
  if (!t) return { items: [] };
  const all = await reportedPeriods(admin, [t]);
  const f = all[t];
  if (!f || (!f.quarters.length && !f.years.length)) return { items: [] };
  const label = name || f.name || t;
  const items = [];
  const q = f.quarters.slice(0, 4);
  q.forEach((p, i) => {
    const prev = q[i + 1];
    const growth = prev?.revenue ? p.revenue / prev.revenue - 1 : null;
    items.push({
      kind: 'record',
      title: `${label} results, quarter ended ${p.periodEnd}`,
      text: `${label} (${t}) reported for the quarter ended ${p.periodEnd}${p.frame ? ` (${p.frame})` : ''}, from its SEC filings: ${periodLine(p, 'results').replace(/^results: /, '')}.${
        growth != null
          ? ` Revenue was ${signed(growth)} from ${usdB(prev.revenue)} in the quarter ended ${prev.periodEnd}.`
          : ''
      }`,
      date: p.periodEnd,
      period: { to: p.periodEnd, label: `quarter ended ${p.periodEnd}` },
      entities: [t, label],
    });
  });
  const y = f.years.slice(0, 3);
  y.forEach((p, i) => {
    const prev = y[i + 1];
    const growth = prev?.revenue ? p.revenue / prev.revenue - 1 : null;
    items.push({
      kind: 'record',
      title: `${label} fiscal year ended ${p.periodEnd}`,
      text: `${label} (${t}) fiscal year ended ${p.periodEnd}, from its SEC filings: ${periodLine(p, 'results').replace(/^results: /, '')}.${
        growth != null
          ? ` Annual revenue was ${signed(growth)} from ${usdB(prev.revenue)} in the fiscal year ended ${prev.periodEnd}.`
          : ''
      }`,
      date: p.periodEnd,
      period: { to: p.periodEnd, label: `fiscal year ended ${p.periodEnd}` },
      entities: [t, label],
    });
  });
  items.unshift({
    kind: 'aggregate',
    title: `${label} reported financials`,
    text: `${label} (${t}) reported financial history from SEC filings: ${q.length} recent quarters and ${y.length} fiscal years.`,
    data: { metric: 'financials', ticker: t, quarters: q, years: y },
    entities: [t, label],
  });
  return { items, layout: { financials: { ticker: t, name: label, quarters: q, years: y } } };
}

/* ── product_segments ───────────────────────────────────────────────── */

/**
 * Pure: segment rows (newest first) -> the latest quarter's segments with
 * the change from the same quarter a year earlier, and each segment's share
 * of the year-over-year change across the reported segments.
 */
export function segmentsWithGrowth(rows) {
  const sorted = [...(rows || [])].sort((a, b) => String(b?.date).localeCompare(String(a?.date)));
  const row = sorted[0];
  const parts = Object.entries(row?.data || {})
    .map(([seg, v]) => [seg, Number(v)])
    .filter(([, v]) => Number.isFinite(v) && v > 0)
    .sort((a, b) => b[1] - a[1]);
  const total = parts.reduce((s, [, v]) => s + v, 0);
  if (!parts.length || !total) return null;
  const date = String(row.date).slice(0, 10);
  const days = (d) => Math.abs(new Date(d).getTime() - new Date(date).getTime()) / 864e5;
  const ago = sorted.find((r) => {
    const d = days(String(r?.date).slice(0, 10));
    return d > 340 && d < 390;
  });
  const agoDate = ago ? String(ago.date).slice(0, 10) : null;
  const prevOf = (seg) => {
    const v = Number(ago?.data?.[seg]);
    return Number.isFinite(v) && v > 0 ? v : null;
  };
  const changes = parts.map(([seg, v]) => (prevOf(seg) != null ? v - prevOf(seg) : null));
  const comparable = changes.every((c) => c != null);
  const totalChange = comparable ? changes.reduce((s, c) => s + c, 0) : null;
  const segments = parts.map(([segment, value], i) => {
    const prev = prevOf(segment);
    return {
      segment,
      value,
      share: value / total,
      prev,
      growth: prev ? value / prev - 1 : null,
      change: changes[i],
      changeShare:
        totalChange && totalChange > 0 && changes[i] != null ? changes[i] / totalChange : null,
    };
  });
  return { date, prevDate: agoDate, total, totalChange, segments };
}

export async function productSegments({ ticker, name }, { ms }) {
  const t = String(ticker || '').toUpperCase();
  const d = await fmp('revenue-product-segmentation', { symbol: t, period: 'quarter' }, ms);
  const g = segmentsWithGrowth(Array.isArray(d) ? d : []);
  if (!g) return { items: [] };
  const { date, segments } = g;
  const label = name || t;
  return {
    layout: {
      segments: { ticker: t, date, prevDate: g.prevDate, totalChange: g.totalChange, segments },
    },
    items: [
      {
        kind: 'record',
        title: `${label} revenue by segment, quarter ended ${date}`,
        text: `${label} (${t}) revenue by reported segment, quarter ended ${date}: ${segments
          .map(
            (s) =>
              `${s.segment} ${usdB(s.value)} (${pct1(s.share)} of the segment total${
                s.growth != null ? `, ${signed(s.growth)} from ${usdB(s.prev)} a year earlier` : ''
              })`,
          )
          .join(', ')}.${
          g.totalChange && g.totalChange > 0
            ? ` Across these segments revenue rose ${usdB(g.totalChange)} from the quarter ended ${g.prevDate}; ${segments
                .filter((s) => s.changeShare != null && s.changeShare > 0)
                .sort((a, b) => b.changeShare - a.changeShare)
                .slice(0, 3)
                .map((s) => `${s.segment} accounted for ${pct1(s.changeShare)} of that increase`)
                .join(', ')}.`
            : ''
        }`,
        date,
        period: { to: date, label: `quarter ended ${date}` },
        data: {
          metric: 'segments',
          ticker: t,
          segments,
          prevDate: g.prevDate,
          totalChange: g.totalChange,
        },
        entities: [t, label],
      },
    ],
  };
}

/* ── holder_positioning ─────────────────────────────────────────────── */

export async function holderPositioning({ ticker, name }, { admin }) {
  const t = String(ticker || '').toUpperCase();
  const { data, error } = await admin.rpc('sonar_13f_positioning', { p_ticker: t });
  if (error || !data?.period || !data?.holders) {
    /* Before the positioning function exists (SQL not yet applied), the
       largest holders still come from the existing top-holders function. */
    const fb = await admin.rpc('sonar_top_13f', { p_ticker: t, p_limit: 10 });
    const d = fb?.data;
    if (fb?.error || !d?.top?.length) return { items: [] };
    return {
      items: [
        {
          kind: 'record',
          title: `Largest institutional holders of ${name || t}, quarter ending ${d.period}`,
          text: `Largest 13F holders of ${name || t} (${t}) for the quarter ending ${d.period}: ${d.top
            .slice(0, 6)
            .map((h) => `${h.filer_name} ${usdB(h.value_usd)}`)
            .join('; ')}.`,
          date: d.period,
          period: { to: d.period, label: `quarter ending ${d.period}` },
          entities: [t, ...d.top.slice(0, 6).map((h) => h.filer_name)],
        },
      ],
    };
  }
  const label = name || t;
  const top = Array.isArray(data.top) ? data.top : [];
  const items = [
    {
      kind: 'aggregate',
      title: `Institutional positioning in ${label}, quarter ending ${data.period}`,
      text: `13F positioning in ${label} (${t}) for the quarter ending ${data.period}: ${Number(
        data.holders,
      ).toLocaleString('en-US')} of the ${Number(data.filers_in_period).toLocaleString(
        'en-US',
      )} institutional managers in Ezana's 13F dataset reported a position, ${shares(
        data.shares,
      )} worth ${usdB(data.value_usd)}. The ten largest reported holders held ${pct1(
        Number(data.top10_share) || 0,
      )} of that reported value: ${top
        .slice(0, 5)
        .map((h) => `${h.filer} ${shares(h.shares)} (${usdB(h.value_usd)})`)
        .join('; ')}.`,
      date: data.period,
      period: { to: data.period, label: `quarter ending ${data.period}` },
      data: { metric: 'positioning', ...data },
      entities: [t, ...top.slice(0, 5).map((h) => h.filer)],
    },
  ];
  if (data.previous_period && Number(data.compared_filers) > 0) {
    const adds = (data.adds || []).slice(0, 3);
    const cuts = (data.cuts || []).slice(0, 3);
    items.push({
      kind: 'aggregate',
      title: `Quarter-over-quarter 13F changes in ${label}`,
      text: `Among the ${data.compared_filers} managers that filed 13F reports for both ${data.previous_period} and ${data.period}: ${data.added} added to ${t}, ${data.reduced} reduced, ${data.new_positions} opened a new position and ${data.exits} exited.${
        adds.length
          ? ` Largest additions: ${adds.map((a) => `${a.filer} ${shares(a.change_shares)}`).join('; ')}.`
          : ''
      }${
        cuts.length
          ? ` Largest reductions: ${cuts
              .map((c) => `${c.filer} ${shares(Math.abs(c.change_shares))}`)
              .join('; ')}.`
          : ''
      } This covers only managers present in both quarters of Ezana's dataset, not every 13F filer.`,
      date: data.period,
      period: {
        from: data.previous_period,
        to: data.period,
        label: `${data.previous_period} to ${data.period}`,
      },
      data: { metric: 'positioning_changes', ...data },
      entities: [t, ...adds.map((a) => a.filer), ...cuts.map((c) => c.filer)],
    });
  }
  const st = await styleTrend(admin, t, label);
  items.push(...st.items);
  return {
    items,
    layout: { positioning: { ticker: t, name: label, ...data, ...(st.layout || {}) } },
  };
}

export const STYLE_LABEL = {
  index_heavy: 'Index-heavy managers',
  pension_sovereign: 'Pensions and sovereign funds',
  insurer: 'Insurers',
  bank_wealth: 'Banks and wealth managers',
  hedge_quant: 'Hedge funds and trading firms',
  active: 'Active asset managers',
  unclassified: 'Other managers',
};

/* Holders by manager type and the reported-holder trend
   (sonar_13f_style_trend). The type comes from the manager's name, so it is
   an approximation and is described as one. */
async function styleTrend(admin, t, label) {
  const { data, error } = await admin.rpc('sonar_13f_style_trend', { p_ticker: t });
  if (error || !data?.period) return { items: [] };
  const items = [];
  const mix = (data.style_mix || []).filter((m) => Number(m.value_usd) > 0);
  if (mix.length) {
    items.push({
      kind: 'aggregate',
      title: `${label} 13F holders by manager type, quarter ending ${data.period}`,
      text: `By manager type (classified from each manager's name, so approximate), the reported 13F value in ${label} (${t}) for the quarter ending ${data.period} splits: ${mix
        .slice(0, 5)
        .map(
          (m) =>
            `${STYLE_LABEL[m.style] || m.style} ${pct1(Number(m.share) || 0)} (${m.holders} managers)`,
        )
        .join('; ')}.`,
      date: data.period,
      period: { to: data.period, label: `quarter ending ${data.period}` },
      data: { metric: 'holder_styles', ...data },
      entities: [t, label],
    });
  }
  const trend = (data.trend || []).filter((q) => Number(q.holders) > 0);
  if (trend.length >= 2) {
    const a = trend[0];
    const b = trend[trend.length - 1];
    items.push({
      kind: 'aggregate',
      title: `${label} reported 13F holders, ${a.period} to ${b.period}`,
      text: `Managers reporting a position in ${label} (${t}) in Ezana's 13F dataset: ${trend
        .map(
          (q) =>
            `${q.period} ${Number(q.holders).toLocaleString('en-US')} of ${Number(q.filers).toLocaleString('en-US')} filers, ${shares(q.shares)}`,
        )
        .join('; ')}.`,
      date: b.period,
      period: { from: a.period, to: b.period, label: `${a.period} to ${b.period}` },
      data: { metric: 'holder_trend', trend },
      entities: [t, label],
    });
  }
  return {
    items,
    layout: { styleMix: mix, indexHeavyShare: data.index_heavy_share ?? null, trend },
  };
}

/* ── peer_financials ────────────────────────────────────────────────── */

export async function peerFinancials({ ticker, name, peers = [] }, { admin, ms }) {
  const t = String(ticker || '').toUpperCase();
  let list = (peers || []).map((p) => String(p.ticker || p).toUpperCase()).filter(Boolean);
  if (!list.length) {
    const d = await fmp('stock-peers', { symbol: t }, ms);
    list = (Array.isArray(d) ? d : [])
      .map((r) => String(r.symbol || '').toUpperCase())
      .filter((s) => s && s !== t)
      .slice(0, 6);
  }
  if (!list.length) return { items: [] };
  const tickers = [t, ...list.slice(0, 6)];
  const all = await reportedPeriods(admin, tickers);
  const rows = tickers
    .map((x) => {
      const f = all[x];
      const q = f?.quarters?.[0];
      const y0 = f?.years?.[0];
      const y1 = f?.years?.[1];
      if (!q && !y0) return null;
      return {
        ticker: x,
        name: f.name,
        subject: x === t,
        quarterEnd: q?.periodEnd || null,
        revenue: q?.revenue ?? null,
        grossMargin: q?.grossMargin ?? null,
        operatingMargin: q?.operatingMargin ?? null,
        yearEnd: y0?.periodEnd || null,
        annualRevenue: y0?.revenue ?? null,
        annualGrowth: y0?.revenue && y1?.revenue ? y0.revenue / y1.revenue - 1 : null,
      };
    })
    .filter(Boolean);
  if (rows.length < 2) return { items: [] };
  const line = (r) =>
    `${r.ticker}${r.quarterEnd ? ` quarter ended ${r.quarterEnd} revenue ${usdB(r.revenue)}${r.grossMargin != null ? `, gross margin ${pct1(r.grossMargin)}` : ''}${r.operatingMargin != null ? `, operating margin ${pct1(r.operatingMargin)}` : ''}` : ''}${
      r.annualGrowth != null
        ? `${r.quarterEnd ? ';' : ''} fiscal year ended ${r.yearEnd} revenue ${usdB(r.annualRevenue)}, ${signed(r.annualGrowth)}`
        : ''
    }`;
  return {
    layout: { peers: { ticker: t, rows } },
    items: [
      {
        kind: 'aggregate',
        title: `${name || t} and listed peers, reported results`,
        text: `Reported results of ${name || t} and listed peers from SEC filings (each company's own latest periods, which differ): ${rows
          .map(line)
          .join('. ')}.`,
        data: { metric: 'peers', rows },
        entities: rows.map((r) => r.ticker),
      },
    ],
  };
}

/* ── customer_capex (Nov 2026, deep research step 3) ────────────────── */

/**
 * Capital expenditure of the subject's main customers, from their own SEC
 * filings: the leading indicator of the subject's demand (hyperscaler
 * spending is an AI chip maker's revenue). Each company's latest quarter and
 * fiscal years, capex as a share of operating cash flow, and fiscal-year
 * growth. Periods differ by company and are always named.
 */
export async function customerCapex({ ticker, name, customers = [] }, { admin }) {
  const list = (customers || []).map((c) => String(c.ticker || c).toUpperCase()).filter(Boolean);
  if (!list.length) return { items: [] };
  const all = await reportedPeriods(admin, list);
  const rows = list
    .map((t) => {
      const f = all[t];
      if (!f) return null;
      const q = f.quarters.find((p) => Number.isFinite(p.capex)) || null;
      const ys = f.years.filter((p) => Number.isFinite(p.capex));
      const y0 = ys[0] || null;
      const y1 = ys[1] || null;
      if (!q && !y0) return null;
      const label = (customers.find((c) => String(c.ticker || c).toUpperCase() === t) || {}).name;
      return {
        ticker: t,
        name: label || f.name,
        quarterEnd: q?.periodEnd || null,
        quarterCapex: q?.capex ?? null,
        quarterOcf: q?.operating_cash_flow ?? null,
        yearEnd: y0?.periodEnd || null,
        yearCapex: y0?.capex ?? null,
        yearOcf: y0?.operating_cash_flow ?? null,
        priorYearEnd: y1?.periodEnd || null,
        priorYearCapex: y1?.capex ?? null,
        growth: y0?.capex && y1?.capex ? y0.capex / y1.capex - 1 : null,
      };
    })
    .filter(Boolean);
  if (!rows.length) return { items: [] };
  const subject = name || ticker;
  const line = (r) => {
    const parts = [];
    if (r.quarterCapex != null)
      parts.push(
        `quarter ended ${r.quarterEnd} capital expenditure ${usdB(r.quarterCapex)}${
          r.quarterOcf ? ` (${pct1(r.quarterCapex / r.quarterOcf)} of operating cash flow)` : ''
        }`,
      );
    if (r.yearCapex != null)
      parts.push(
        `fiscal year ended ${r.yearEnd} ${usdB(r.yearCapex)}${
          r.growth != null ? `, ${signed(r.growth)} from ${usdB(r.priorYearCapex)}` : ''
        }`,
      );
    return `${r.name} (${r.ticker}) ${parts.join('; ')}`;
  };
  return {
    layout: { customerCapex: { ticker, rows } },
    items: [
      {
        kind: 'aggregate',
        title: `Capital spending by ${subject}'s largest customers`,
        text: `Capital expenditure reported in SEC filings by the companies Ezana tracks as ${subject}'s largest customers (each company's own fiscal periods, which differ): ${rows
          .map(line)
          .join(
            '. ',
          )}. Capital expenditure covers all property and equipment, not only purchases from ${subject}.`,
        data: { metric: 'customer_capex', rows },
        entities: [ticker, ...rows.map((r) => r.ticker)],
      },
    ],
  };
}

/* ── estimates (Nov 2026, deep research step 3) ─────────────────────── */

/**
 * Consensus analyst estimates and trailing valuation multiples from the
 * market data provider. These are third-party forecasts: every item says so,
 * with the number of analysts and the date, and the memo may only attribute
 * them, never adopt them.
 */
export async function estimates({ ticker, name }, { ms, now = new Date() }) {
  const t = String(ticker || '').toUpperCase();
  if (!t) return { items: [] };
  const [est, ratios, metrics] = await Promise.all([
    fmp('analyst-estimates', { symbol: t, period: 'annual', limit: 6 }, ms),
    fmp('ratios-ttm', { symbol: t }, ms),
    fmp('key-metrics-ttm', { symbol: t }, ms),
  ]);
  return estimatesFromPayload({ est, ratios, metrics }, { ticker: t, name, now });
}

/** The estimates items from the provider's payloads. Pure, so it is testable. */
export function estimatesFromPayload({ est, ratios, metrics }, { ticker, name, now = new Date() }) {
  const t = String(ticker || '').toUpperCase();
  const asOf = new Date(now).toISOString().slice(0, 10);
  const label = name || t;
  const today = asOf;
  const forward = (Array.isArray(est) ? est : [])
    .filter((r) => String(r?.date || '') >= today && Number.isFinite(Number(r?.revenueAvg)))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .slice(0, 2)
    .map((r) => ({
      fiscalYearEnd: String(r.date).slice(0, 10),
      revenueAvg: Number(r.revenueAvg),
      revenueLow: Number(r.revenueLow) || null,
      revenueHigh: Number(r.revenueHigh) || null,
      epsAvg: Number.isFinite(Number(r.epsAvg)) ? Number(r.epsAvg) : null,
      analysts: Number(r.numAnalystsRevenue || r.numberAnalystsEstimatedRevenue) || null,
    }));
  const r0 = Array.isArray(ratios) ? ratios[0] : ratios;
  const m0 = Array.isArray(metrics) ? metrics[0] : metrics;
  const pe = Number(r0?.priceToEarningsRatioTTM ?? r0?.peRatioTTM);
  const evEbitda = Number(m0?.evToEBITDATTM ?? m0?.enterpriseValueOverEBITDATTM);
  const ps = Number(r0?.priceToSalesRatioTTM);
  const items = [];
  if (forward.length) {
    items.push({
      kind: 'record',
      title: `Consensus estimates for ${label}`,
      text: `Consensus analyst estimates for ${label} (${t}) as of ${asOf}, a third-party forecast, not Ezana's: ${forward
        .map(
          (f) =>
            `fiscal year ending ${f.fiscalYearEnd} revenue ${usdB(f.revenueAvg)}${
              f.revenueLow && f.revenueHigh
                ? ` (range ${usdB(f.revenueLow)} to ${usdB(f.revenueHigh)})`
                : ''
            }${f.epsAvg != null ? `, EPS $${f.epsAvg.toFixed(2)}` : ''}${
              f.analysts ? ` from ${f.analysts} analysts` : ''
            }`,
        )
        .join('; ')}.`,
      date: asOf,
      period: { to: asOf, label: `estimates as of ${asOf}` },
      data: { metric: 'estimates', ticker: t, forward },
      entities: [t, label],
    });
  }
  const mult = [];
  if (Number.isFinite(pe) && pe > 0) mult.push(`price to trailing earnings ${pe.toFixed(1)}x`);
  if (Number.isFinite(evEbitda) && evEbitda > 0)
    mult.push(`enterprise value to trailing EBITDA ${evEbitda.toFixed(1)}x`);
  if (Number.isFinite(ps) && ps > 0) mult.push(`price to trailing sales ${ps.toFixed(1)}x`);
  if (mult.length) {
    items.push({
      kind: 'record',
      title: `Valuation multiples for ${label}`,
      text: `Trailing twelve-month valuation multiples for ${label} (${t}) as of ${asOf}: ${mult.join(', ')}.`,
      date: asOf,
      period: { to: asOf, label: `trailing twelve months as of ${asOf}` },
      data: { metric: 'valuation', ticker: t, pe, evEbitda, ps },
      entities: [t, label],
    });
  }
  return {
    items,
    layout: items.length
      ? {
          expectations: {
            ticker: t,
            asOf,
            forward,
            pe: Number.isFinite(pe) ? pe : null,
            evEbitda: Number.isFinite(evEbitda) ? evEbitda : null,
            ps: Number.isFinite(ps) ? ps : null,
          },
        }
      : undefined,
  };
}

/* ── disclosures (Nov 2026, deep research step 3) ───────────────────── */

const KIND_LABEL = {
  customer_concentration: 'customer concentration',
  export_risk: 'export controls and China',
  purchase_obligations: 'purchase and supply obligations',
  cloud_ai_metrics: 'cloud and AI performance',
  infrastructure_commitments: 'data center and infrastructure commitments',
};

/**
 * What the company's own 10-Q and 10-K say about customer concentration,
 * export controls and purchase obligations, quoted word for word
 * (company_disclosures, written by /api/cron/ingest-disclosures). The newest
 * filing per topic, at most three quotes each.
 */
export async function disclosures({ ticker, name }, { admin }) {
  const t = String(ticker || '').toUpperCase();
  const { data, error } = await admin
    .from('company_disclosures')
    .select(
      'kind, quote, party, period_label, figures, form_type, filed_at, period_end, source_url',
    )
    .eq('ticker', t)
    .eq('review_status', 'approved')
    .order('filed_at', { ascending: false })
    .limit(40);
  if (error || !data?.length) return { items: [] };
  const label = name || t;
  const byKind = new Map();
  for (const r of data) {
    const list = byKind.get(r.kind) || [];
    /* the newest filing for the topic only */
    if (list.length && list[0].filed_at !== r.filed_at) continue;
    if (list.length < 3) list.push(r);
    byKind.set(r.kind, list);
  }
  const items = [];
  for (const [kind, rows] of byKind) {
    for (const r of rows) {
      items.push({
        kind: 'record',
        title: `${label} ${r.form_type || 'filing'} on ${KIND_LABEL[kind] || kind}`,
        text: `${label} (${t}) ${r.form_type || 'filing'} filed ${r.filed_at}${
          r.period_end ? ` for the period ended ${r.period_end}` : ''
        }, on ${KIND_LABEL[kind] || kind}: "${r.quote}"`,
        url: r.source_url,
        date: r.filed_at,
        period: { to: r.period_end || r.filed_at, label: r.period_label || `filed ${r.filed_at}` },
        data: { metric: 'disclosure', kind, figures: r.figures || [] },
        entities: [t, label, ...(r.party ? [r.party] : [])],
      });
    }
  }
  return {
    items,
    layout: {
      disclosures: [...byKind.entries()].map(([kind, rows]) => ({
        kind,
        label: KIND_LABEL[kind] || kind,
        form: rows[0].form_type,
        filedAt: rows[0].filed_at,
        url: rows[0].source_url,
        quotes: rows.map((r) => ({ quote: r.quote, party: r.party, figures: r.figures || [] })),
      })),
    },
  };
}

/* ── export_controls (Nov 2026, deep research step 3) ───────────────── */

const COUNTRY_NAME = { CN: 'China', HK: 'Hong Kong', MO: 'Macau', RU: 'Russia', IR: 'Iran' };

/**
 * US export controls around the subject: the Bureau of Industry and
 * Security's recent advanced-computing and semiconductor rules (Federal
 * Register), and how many parties located in the subject's restricted
 * markets BIS has added to its lists. Primary government sources only.
 */
export async function exportControls(
  { ticker, name, countries = ['CN', 'HK'] },
  { admin, now = new Date() },
) {
  const since = new Date(new Date(now).getTime() - 3 * 365 * 864e5).toISOString().slice(0, 10);
  const yearAgo = new Date(new Date(now).getTime() - 365 * 864e5).toISOString().slice(0, 10);
  const [rules, entries] = await Promise.all([
    admin
      .from('export_control_rules')
      .select('document_number, title, type, publication_date, effective_on, html_url, topics')
      .contains('topics', ['advanced_computing'])
      .gte('publication_date', since)
      .order('publication_date', { ascending: false })
      .limit(8),
    admin
      .from('export_control_entries')
      .select('list, countries, start_date')
      .overlaps('countries', countries)
      .gte('start_date', since)
      .limit(5000),
  ]);
  const items = [];
  const label = name || ticker;
  for (const r of rules?.data || []) {
    items.push({
      kind: 'record',
      title: `BIS ${String(r.type || 'document').toLowerCase()}: ${r.title}`,
      text: `The Bureau of Industry and Security published "${r.title}" in the Federal Register on ${r.publication_date}${
        r.effective_on ? `, effective ${r.effective_on}` : ''
      } (document ${r.document_number}).`,
      url: r.html_url,
      date: r.publication_date,
      period: { to: r.publication_date, label: `published ${r.publication_date}` },
      entities: [
        'Bureau of Industry and Security',
        ...((r.topics || []).includes('china') ? ['China'] : []),
      ],
    });
  }
  const rows = entries?.data || [];
  if (rows.length) {
    const el = rows.filter((r) => r.list === 'entity_list');
    const recent = el.filter((r) => String(r.start_date) >= yearAgo);
    const where = countries.map((c) => COUNTRY_NAME[c] || c).join(' or ');
    items.push({
      kind: 'aggregate',
      title: `Entity List additions located in ${where}`,
      text: `The Consolidated Screening List shows ${el.length} Entity List entries located in ${where} added since ${since}, ${recent.length} of them since ${yearAgo}. Exporting covered items to an Entity List party needs a US license, under the review policy BIS sets for each entry.`,
      date: new Date(now).toISOString().slice(0, 10),
      period: {
        from: since,
        to: new Date(now).toISOString().slice(0, 10),
        label: `${since} to ${new Date(now).toISOString().slice(0, 10)}`,
      },
      data: { metric: 'entity_list', total: el.length, lastYear: recent.length, countries },
      entities: ['Bureau of Industry and Security', ...countries.map((c) => COUNTRY_NAME[c] || c)],
    });
  }
  return {
    items,
    layout: items.length
      ? {
          exportControls: {
            subject: label,
            rules: (rules?.data || []).map((r) => ({
              title: r.title,
              date: r.publication_date,
              effective: r.effective_on,
              url: r.html_url,
              number: r.document_number,
            })),
            entityList: rows.length
              ? {
                  total: rows.filter((r) => r.list === 'entity_list').length,
                  lastYear: rows.filter(
                    (r) => r.list === 'entity_list' && String(r.start_date) >= yearAgo,
                  ).length,
                  since,
                  countries,
                }
              : null,
          },
        }
      : undefined,
  };
}

/* ── lobbying_associations (Nov 2026, deep research step 3) ─────────── */

/**
 * Lobbying by the trade associations the company belongs to (Senate LDA
 * filings, sonar_lobbying_associations). An association lobbies for all its
 * members, so the text never attributes its spend to the company.
 */
export async function lobbyingAssociations({ ticker, name }, { admin, now = new Date() }) {
  const t = String(ticker || '').toUpperCase();
  const y = new Date(now).getUTCFullYear();
  const from = y - 2;
  const { data, error } = await admin.rpc('sonar_lobbying_associations', {
    p_ticker: t,
    p_from: from,
    p_to: y,
  });
  if (error || !Array.isArray(data) || !data.length) return { items: [] };
  const label = name || t;
  const rows = data.filter((r) => Number(r.total_amount) > 0);
  const items = rows.map((r) => ({
    kind: 'aggregate',
    title: `${r.association} lobbying, ${from} to ${y}`,
    text: `${label} (${t}) is a member of the ${r.association}, which reported ${usdB(
      r.total_amount,
    )} in federal lobbying across ${r.filings} quarterly filings, ${from} to ${y}${
      r.top_issues?.length ? `, most often on ${r.top_issues.slice(0, 4).join(', ')}` : ''
    }. The association lobbies for all ${r.members?.length || 'its'} listed members, not for ${label} alone.`,
    url: r.members_source_url,
    date: new Date(now).toISOString().slice(0, 10),
    period: { from: `${from}-01-01`, to: `${y}-12-31`, label: `${from} to ${y}` },
    data: { metric: 'association_lobbying', row: r },
    entities: [t, label, r.association],
  }));
  return {
    items,
    layout: items.length
      ? {
          associations: rows.map((r) => ({
            association: r.association,
            total: Number(r.total_amount),
            filings: r.filings,
            byYear: r.by_year || {},
            issues: (r.top_issues || []).slice(0, 4),
            members: r.members || [],
            url: r.members_source_url,
            from,
            to: y,
          })),
        }
      : undefined,
  };
}

/* ── competitive_products (Nov 2026, deep research step 3) ──────────── */

const KIND_TEXT = {
  custom_accelerator: 'custom accelerator',
  merchant_gpu: 'merchant accelerator',
  domestic_alternative: 'domestic alternative',
  other: 'product',
};

/**
 * Dated, sourced product milestones from companies that compete with the
 * subject (competitive_products, approved rows only). When the competitor is
 * also one of the subject's large customers, the item says so.
 */
export async function competitiveProducts({ ticker, name, customers = [] }, { admin }) {
  const t = String(ticker || '').toUpperCase();
  const { data, error } = await admin
    .from('competitive_products')
    .select(
      'company, company_ticker, product, kind, milestone_date, statement, source_url, source_title',
    )
    .contains('competes_with', [t])
    .eq('review_status', 'approved')
    .order('milestone_date', { ascending: false })
    .limit(12);
  if (error || !data?.length) return { items: [] };
  const label = name || t;
  const cust = new Set(customers.map((c) => String(c.ticker || c).toUpperCase()));
  const rows = data.map((r) => ({
    ...r,
    isCustomer: !!r.company_ticker && cust.has(r.company_ticker),
  }));
  return {
    items: rows.map((r) => ({
      kind: 'record',
      title: `${r.company} ${r.product}`,
      text: `${r.company} (${KIND_TEXT[r.kind] || 'product'}, ${r.milestone_date}): ${r.statement}${
        r.isCustomer
          ? ` ${r.company} is also among the customers whose capital spending this assessment tracks for ${label}.`
          : ''
      } Source: ${r.source_title}.`,
      url: r.source_url,
      date: r.milestone_date,
      period: { to: r.milestone_date, label: r.milestone_date },
      data: { metric: 'competitive_product', kind: r.kind, isCustomer: r.isCustomer },
      entities: [t, r.company, ...(r.company_ticker ? [r.company_ticker] : []), r.product],
    })),
    layout: {
      competitors: rows.map((r) => ({
        company: r.company,
        ticker: r.company_ticker,
        product: r.product,
        kind: r.kind,
        kindLabel: KIND_TEXT[r.kind] || 'product',
        date: r.milestone_date,
        statement: r.statement,
        url: r.source_url,
        source: r.source_title,
        isCustomer: r.isCustomer,
      })),
    },
  };
}

export const MEMO_RUNNERS = {
  company_financials: companyFinancials,
  product_segments: productSegments,
  holder_positioning: holderPositioning,
  peer_financials: peerFinancials,
  customer_capex: customerCapex,
  estimates,
  disclosures,
  export_controls: exportControls,
  lobbying_associations: lobbyingAssociations,
  competitive_products: competitiveProducts,
};
