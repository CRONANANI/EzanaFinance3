/**
 * Research Composer: subject resolution and execution (Nov 22 2026). SERVER ONLY.
 *
 * resolveSubject   a subject's text to a 13F filer, a member of Congress or a company, with
 *                  the data-dependent limit (eligible holdings) the composer validates against
 * runComposition   executes every valid analysis attachment with deterministic code and
 *                  returns structured results plus the text Sonar's research run reads
 *
 * Executors:
 *   fundamental-analysis  sec_fundamentals (filed annual and balance-sheet figures) for a
 *                         company, a 13F filer's top holdings (titans_13f_positions, merged by
 *                         issuer so two share classes count once) or a member's estimated
 *                         open holdings (politician_portfolio)
 *   dcf-valuation         a free-cash-flow DCF on the same filed figures, every assumption
 *                         shown, against the latest close
 *   backtesting           the Quant Lab engine (runBacktest) on the member's own purchase
 *                         disclosures, each dated by when it became public (no look-ahead)
 *
 * Every number is computed here from stored data. Nothing is estimated by a language model.
 */

import { getAdminClient } from '@/lib/supabase';
import { resolvePolitician } from '@/lib/sonar/landing-politician';
import { getDailyBars } from '@/lib/prices/daily-bars';
import { runBacktest } from '@/lib/quants/backtest-engine';
import { validateSpec, normalizeConfig } from '@/lib/quants/strategy-spec';
import { loadRunBars } from '@/lib/quants/lab-server';
import { validateAttachment, relationText, CAPABILITIES } from './registry.js';
import { companyRatios, dcfValue } from './calc.js';

const TICKER_RE = /^\$?([A-Z]{1,5}(?:\.[A-Z])?)$/;

/* ── subjects ───────────────────────────────────────────────────────── */

async function latestFilers(admin, text) {
  const { data } = await admin
    .from('titans_13f_filers')
    .select('cik, filer_name, period, positions, book')
    .ilike('filer_name', `%${text.replace(/[%_]/g, '')}%`)
    .order('period', { ascending: false })
    .limit(40);
  const byCik = new Map();
  for (const r of data || []) if (!byCik.has(r.cik)) byCik.set(r.cik, r);
  return [...byCik.values()].sort((a, b) => Number(b.book || 0) - Number(a.book || 0));
}

/** The filer's largest holdings, one row per issuer (share classes merged). */
async function filerHoldings(admin, cik, period, limit = 400) {
  const { data, error } = await admin
    .from('titans_13f_positions')
    .select('ticker, issuer, value_usd, put_call')
    .eq('cik', cik)
    .eq('period', period)
    .order('value_usd', { ascending: false })
    .limit(limit);
  if (error) throw new Error('13F holdings could not be read');
  const byIssuer = new Map();
  for (const r of data || []) {
    if (r.put_call) continue;
    const issuer = String(r.issuer || r.ticker || '')
      .replace(/&amp;/g, '&')
      .trim();
    if (!issuer) continue;
    const cur = byIssuer.get(issuer) || { issuer, tickers: [], value: 0 };
    if (r.ticker && !cur.tickers.includes(r.ticker)) cur.tickers.push(r.ticker);
    cur.value += Number(r.value_usd) || 0;
    byIssuer.set(issuer, cur);
  }
  return [...byIssuer.values()].sort((a, b) => b.value - a.value);
}

async function memberHoldings(admin, bioguide) {
  const { data, error } = await admin.rpc('politician_portfolio', {
    p_bioguide: bioguide,
    p_limit: 50,
  });
  if (error) throw new Error('Estimated holdings could not be read');
  const holdings = (Array.isArray(data?.holdings) ? data.holdings : [])
    .filter((h) => h?.ticker)
    .map((h) => ({
      issuer: h.company ? String(h.company).replace(/\s+-\s+.*$/, '') : h.ticker,
      tickers: [String(h.ticker)],
      value: Number(h.est) || 0,
      share: Number(h.share) || null,
    }))
    .sort((a, b) => b.value - a.value);
  return holdings;
}

/**
 * Resolve a subject's text. Order: member of Congress (strict name match), 13F filer, then
 * company (ticker or filed name). Two filers that both match leave the choice to the
 * reader (candidates) rather than picking one silently.
 */
export async function resolveSubject(text, admin = getAdminClient()) {
  const t = String(text || '').trim();
  if (!t) return null;
  const tick = t.match(TICKER_RE);
  if (!tick) {
    const member = await resolvePolitician(t, admin).catch(() => null);
    if (member?.bioguideId) {
      const holdings = await memberHoldings(admin, member.bioguideId).catch(() => []);
      return {
        text: t,
        kind: 'politician',
        id: member.bioguideId,
        name: member.name || member.fullName || t,
        eligible: holdings.length,
      };
    }
    const filers = await latestFilers(admin, t).catch(() => []);
    if (filers.length) {
      const top = filers[0];
      const close =
        filers.length > 1 && Number(filers[1].book || 0) >= Number(top.book || 0) * 0.25;
      const holdings = await filerHoldings(admin, top.cik, top.period, 200).catch(() => []);
      return {
        text: t,
        kind: 'institution',
        id: top.cik,
        name: String(top.filer_name).replace(/\s*\([A-Z.]+\)\s*$/, ''),
        period: top.period,
        eligible: holdings.filter((h) => h.tickers.length).length,
        candidates: close
          ? filers.slice(0, 5).map((f) => ({ id: f.cik, name: f.filer_name, period: f.period }))
          : undefined,
      };
    }
  }
  const sym = tick ? tick[1] : null;
  const q = admin.from('sec_fundamentals').select('ticker, entity_name').limit(1);
  const { data } = sym
    ? await q.eq('ticker', sym)
    : await q.ilike('entity_name', `%${t.replace(/[%_]/g, '')}%`).not('ticker', 'is', null);
  const row = data?.[0];
  if (row?.ticker) {
    return { text: t, kind: 'company', id: row.ticker, name: row.entity_name || row.ticker };
  }
  return { text: t, kind: 'unresolved' };
}

/* ── filed figures ──────────────────────────────────────────────────── */

const CONCEPTS = [
  'revenue',
  'gross_profit',
  'operating_income',
  'net_income',
  'operating_cash_flow',
  'capex',
  'equity',
  'long_term_debt',
  'cash',
  'shares_outstanding',
];

/** { [ticker]: { annual: {concept: [{end, value}] newest first}, instant: {concept: {end, value}} } } */
async function filedFigures(admin, tickers) {
  if (!tickers.length) return {};
  const { data, error } = await admin
    .from('sec_fundamentals')
    .select('ticker, concept, period_type, period_end, value')
    .in('ticker', tickers)
    .in('concept', CONCEPTS)
    .in('period_type', ['annual', 'instant'])
    .order('period_end', { ascending: false })
    .limit(6000);
  if (error) throw new Error('Filed fundamentals could not be read');
  const out = {};
  for (const r of data || []) {
    const t = (out[r.ticker] = out[r.ticker] || { annual: {}, instant: {} });
    const v = Number(r.value);
    if (!Number.isFinite(v)) continue;
    if (r.period_type === 'annual') {
      const list = (t.annual[r.concept] = t.annual[r.concept] || []);
      if (!list.some((x) => x.end === r.period_end)) list.push({ end: r.period_end, value: v });
    } else if (!t.instant[r.concept]) {
      t.instant[r.concept] = { end: r.period_end, value: v };
    }
  }
  return out;
}

/* ── formatting ─────────────────────────────────────────────────────── */

const pct = (v, d = 1) => (v == null || !Number.isFinite(v) ? 'N/A' : `${(v * 100).toFixed(d)}%`);
const usd = (v) => {
  if (v == null || !Number.isFinite(v)) return 'N/A';
  const s = v < 0 ? '-' : '';
  const n = Math.abs(v);
  if (n >= 1e12) return `${s}$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${s}$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${s}$${(n / 1e6).toFixed(1)}M`;
  return `${s}$${Math.round(n).toLocaleString('en-US')}`;
};
const METRIC_LABEL = {
  revenue_growth: 'Revenue growth',
  gross_margin: 'Gross margin',
  operating_margin: 'Operating margin',
  net_margin: 'Net margin',
  fcf_margin: 'FCF margin',
  roe: 'ROE',
  debt_to_equity: 'Debt/equity',
};

/* ── the companies an attachment covers ─────────────────────────────── */

async function companiesFor(admin, att, cap) {
  const s = att.subject;
  if (s.kind === 'company') return { rows: [{ issuer: s.name, tickers: [s.id], value: null }] };
  const n = Math.max(1, Number(att.params?.top_n) || cap);
  if (s.kind === 'institution') {
    const all = await filerHoldings(admin, s.id, s.period);
    return {
      rows: all.filter((h) => h.tickers.length).slice(0, n),
      total: all.reduce((t, h) => t + h.value, 0),
      source: `${s.name} Form 13F, period ${s.period} (filed quarterly, about 45 days after the quarter ends)`,
    };
  }
  const all = await memberHoldings(admin, s.id);
  return {
    rows: all.slice(0, n),
    total: all.reduce((t, h) => t + h.value, 0),
    source: `${s.name}'s estimated open positions, from STOCK Act disclosures at range midpoints`,
  };
}

/* ── executors ──────────────────────────────────────────────────────── */

async function runFundamentals(admin, att) {
  const { rows, total, source } = await companiesFor(admin, att, 10);
  const tickers = [...new Set(rows.flatMap((r) => r.tickers))];
  const figs = await filedFigures(admin, tickers);
  const metrics = att.params?.metrics?.length ? att.params.metrics : Object.keys(METRIC_LABEL);
  const table = rows.map((r) => {
    const ticker = r.tickers.find((t) => figs[t]) || r.tickers[0];
    const ratios = companyRatios(figs[ticker]);
    return {
      ticker,
      issuer: r.issuer,
      value: r.value,
      weight: total && r.value ? r.value / total : null,
      ratios,
    };
  });
  const withData = table.filter((t) => t.ratios?.revenue != null);
  const complete = withData.filter((t) => metrics.every((m) => t.ratios[m] != null));
  const lines = [
    `Fundamental Analysis (calculated from filed SEC annual figures).`,
    `Relationship: ${relationText(att)}`,
    source ? `Holdings source: ${source}.` : null,
    `Coverage: ${table.length} selected, ${withData.length} with filed financials, ${complete.length} with every requested metric.`,
    '',
    `| Company | Ticker | ${att.subject.kind === 'company' ? '' : 'Reported value | Weight | '}Revenue (FY) | ${metrics.map((m) => METRIC_LABEL[m]).join(' | ')} |`,
    `|---|---|${att.subject.kind === 'company' ? '' : '---|---|'}---|${metrics.map(() => '---').join('|')}|`,
    ...table.map(
      (t) =>
        `| ${t.issuer} | ${t.ticker} | ${att.subject.kind === 'company' ? '' : `${usd(t.value)} | ${pct(t.weight)} | `}${usd(t.ratios?.revenue)} | ${metrics
          .map((m) =>
            m === 'debt_to_equity'
              ? t.ratios?.[m] == null
                ? 'N/A'
                : t.ratios[m].toFixed(2)
              : pct(t.ratios?.[m]),
          )
          .join(' | ')} |`,
    ),
  ].filter((l) => l !== null);
  const limitations = [
    att.subject.kind === 'institution'
      ? "13F holdings are a quarterly, lagged snapshot of reportable US positions, not a live or complete portfolio, and not the manager's total assets under management."
      : null,
    att.subject.kind === 'politician'
      ? 'Holdings are estimated from disclosed transaction ranges; members report ranges, not exact positions.'
      : null,
    'Ratios use the latest filed fiscal year; revenue growth compares it with the year before.',
    withData.length < table.length
      ? `${table.length - withData.length} of ${table.length} companies have no filed financials on record (for example funds or non-US issuers).`
      : null,
  ].filter(Boolean);
  return {
    output: 'calculated',
    title: 'Fundamental Analysis',
    coverage: { selected: table.length, withData: withData.length, complete: complete.length },
    table,
    metrics,
    limitations,
    text: [...lines, '', ...limitations.map((l) => `Limitation: ${l}`)].join('\n'),
  };
}

async function latestClose(ticker) {
  const from = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
  const { candles } = await getDailyBars(ticker, from).catch(() => ({ candles: [] }));
  const last = candles?.[candles.length - 1];
  return last ? { close: last.close, date: last.date } : null;
}

async function runDcf(admin, att) {
  const { rows, source } = await companiesFor(admin, att, 3);
  const tickers = [...new Set(rows.flatMap((r) => r.tickers))];
  const figs = await filedFigures(admin, tickers);
  const years = Number(att.params?.years) || 5;
  const wacc = Number(att.params?.wacc_pct ?? 9) / 100;
  const terminal = Number(att.params?.terminal_pct ?? 2.5) / 100;
  const out = [];
  for (const r of rows) {
    const ticker = r.tickers.find((t) => figs[t]) || r.tickers[0];
    const f = figs[ticker];
    const ratios = companyRatios(f);
    const revs = (f?.annual?.revenue || []).slice(0, 4).map((x) => x.value);
    const histGrowth =
      revs.length >= 2 && revs[revs.length - 1] > 0
        ? (revs[0] / revs[revs.length - 1]) ** (1 / (revs.length - 1)) - 1
        : null;
    const userGrowth = att.params?.growth_pct;
    const growth =
      userGrowth !== null && userGrowth !== undefined && userGrowth !== ''
        ? Number(userGrowth) / 100
        : Math.min(0.2, Math.max(0, histGrowth ?? 0.05));
    const res = dcfValue({
      fcf: ratios?.fcf,
      growth,
      wacc,
      terminal,
      years,
      cash: f?.instant?.cash?.value,
      debt: f?.instant?.long_term_debt?.value,
      shares: f?.instant?.shares_outstanding?.value,
    });
    const px = res.ok ? await latestClose(ticker) : null;
    out.push({
      ticker,
      issuer: r.issuer,
      growth,
      growthFrom:
        userGrowth !== null && userGrowth !== undefined && userGrowth !== '' ? 'reader' : 'history',
      fcf: ratios?.fcf ?? null,
      ...res,
      price: px?.close ?? null,
      priceDate: px?.date ?? null,
      upside: res.ok && res.perShare && px?.close ? res.perShare / px.close - 1 : null,
    });
  }
  const lines = [
    'DCF Valuation (an estimate: the output of the stated assumptions, not an observed value).',
    `Relationship: ${relationText(att)}`,
    source ? `Companies from: ${source}.` : null,
    `Assumptions: ${years} forecast years, discount rate ${(wacc * 100).toFixed(2)}%, terminal growth ${(terminal * 100).toFixed(2)}%, base = latest filed annual free cash flow (operating cash flow minus capex).`,
    '',
    '| Company | Ticker | Base FCF | FCF growth | Value per share | Last close | Implied vs close |',
    '|---|---|---|---|---|---|---|',
    ...out.map((o) =>
      o.ok
        ? `| ${o.issuer} | ${o.ticker} | ${usd(o.fcf)} | ${pct(o.growth)} (${o.growthFrom === 'reader' ? 'set by reader' : 'filed revenue CAGR, held to 0 to 20%'}) | ${o.perShare != null ? `$${o.perShare.toFixed(2)}` : 'N/A'} | ${o.price != null ? `$${o.price.toFixed(2)} (${o.priceDate})` : 'N/A'} | ${pct(o.upside)} |`
        : `| ${o.issuer} | ${o.ticker} | ${usd(o.fcf)} | N/A | not computed: ${o.reason} | | |`,
    ),
  ].filter((l) => l !== null);
  const limitations = [
    'A DCF is highly sensitive to growth, discount rate and terminal growth; small changes move the value a lot.',
    'Free cash flow is one filed year; cyclical or one-off items are not normalised.',
    'Debt is long-term debt only; leases, minority interests and other claims are not deducted.',
  ];
  return {
    output: 'estimated',
    title: 'DCF Valuation',
    coverage: { selected: out.length, withData: out.filter((o) => o.ok).length },
    table: out,
    limitations,
    text: [...lines, '', ...limitations.map((l) => `Limitation: ${l}`)].join('\n'),
  };
}

async function runMemberBacktest(admin, att) {
  const s = att.subject;
  const years = Number(att.params?.years) || 5;
  const today = new Date().toISOString().slice(0, 10);
  const start = `${Number(today.slice(0, 4)) - years}${today.slice(4)}`;
  const { data, error } = await admin
    .from('congress_trades')
    .select('ticker, disclosure_date')
    .eq('bioguide_id', s.id)
    .eq('type', 'purchase')
    .not('ticker', 'is', null)
    .not('disclosure_date', 'is', null)
    .gte('disclosure_date', start)
    .order('disclosure_date', { ascending: true })
    .limit(2000);
  if (error) throw new Error('Disclosures could not be read');
  const byTicker = {};
  for (const r of data || []) {
    const t = String(r.ticker)
      .toUpperCase()
      .replace(/[^A-Z.]/g, '');
    if (!t) continue;
    (byTicker[t] = byTicker[t] || new Set()).add(String(r.disclosure_date).slice(0, 10));
  }
  const ranked = Object.entries(byTicker).sort((a, b) => b[1].size - a[1].size);
  if (!ranked.length) {
    return {
      output: 'simulated',
      title: 'Backtesting',
      failed: `No disclosed purchases with a public date in the last ${years} years.`,
      text: `Backtesting: no disclosed purchases by ${s.name} with a public disclosure date in the last ${years} years, so nothing was simulated.`,
    };
  }
  const universe = ranked.slice(0, 20).map(([t]) => t);
  const checked = validateSpec({
    universe,
    benchmark: att.params?.benchmark || 'SPY',
    side: 'long',
    entry: {
      op: 'cond',
      id: 'congress_buy',
      params: { withinDays: Number(att.params?.within_days) || 5 },
    },
    exit: { maxHoldDays: Number(att.params?.hold_days) || 90 },
    sizing: { type: 'equal_weight', maxPositions: Math.min(10, universe.length) },
  });
  if (!checked.ok) throw new Error(checked.errors.join('; '));
  const { config, errors } = normalizeConfig({ startDate: start, endDate: today });
  if (errors.length) throw new Error(errors.join('; '));
  const loaded = await loadRunBars(checked.spec, config);
  const events = {
    congress_buy: Object.fromEntries(universe.map((t) => [t, [...byTicker[t]].sort()])),
  };
  const result = runBacktest({
    spec: checked.spec,
    config,
    bars: loaded.bars,
    benchmarkBars: loaded.benchmarkBars,
    sources: loaded.sources,
    events,
  });
  const m = result.metrics || {};
  const lines = [
    'Backtest (simulated on the Quant Lab engine; past simulated performance, not a forecast).',
    `Relationship: ${relationText(att)}`,
    `Window: ${config.startDate} to ${config.endDate}. Universe: the ${universe.length} tickers ${s.name} bought most often in the window (${ranked.length} in all). Signals use the disclosure date, never the trade date; orders fill at the next session open.`,
    '',
    '| Measure | Strategy | Benchmark |',
    '|---|---|---|',
    `| Total return | ${pct(m.totalReturn)} | ${pct(m.benchmarkReturn)} |`,
    `| Annualised return | ${pct(m.cagr)} | |`,
    `| Volatility (annualised) | ${pct(m.volatility)} | |`,
    `| Max drawdown | ${pct(m.maxDrawdown)} | |`,
    `| Sharpe ratio | ${m.sharpe == null ? 'N/A' : m.sharpe.toFixed(2)} | |`,
    `| Closed trades | ${m.closedTrades ?? 'N/A'} | |`,
    `| Win rate | ${pct(m.winRate)} | |`,
  ];
  const limitations = [...(result.assumptions || []), ...(result.warnings || [])].slice(0, 8);
  return {
    output: 'simulated',
    title: 'Backtesting',
    metrics: m,
    curve: (result.curve || []).filter(
      (_, i, arr) => i % Math.max(1, Math.floor(arr.length / 120)) === 0,
    ),
    universe,
    limitations,
    text: [...lines, '', ...limitations.map((l) => `Limitation: ${l}`)].join('\n'),
  };
}

const EXECUTORS = {
  'fundamental-analysis': runFundamentals,
  'dcf-valuation': runDcf,
  backtesting: runMemberBacktest,
};

/**
 * Execute every valid analysis attachment. An invalid one is reported, never run; a failure
 * in one does not drop the others (partial results are reported as such).
 */
export async function runComposition(attachments = [], admin = getAdminClient()) {
  const results = [];
  for (const raw of attachments.slice(0, 6)) {
    if (raw?.kind !== 'analysis' || !CAPABILITIES[raw.capability]) continue;
    const att = validateAttachment(raw);
    if (att.status !== 'supported') {
      results.push({
        key: att.key,
        capability: att.capability,
        status: att.status,
        issues: att.issues,
      });
      continue;
    }
    try {
      const res = await EXECUTORS[att.capability](admin, att);
      results.push({
        key: att.key,
        capability: att.capability,
        origin: att.origin,
        relation: relationText(att),
        status: res.failed ? 'failed' : 'done',
        ...res,
      });
    } catch (e) {
      results.push({
        key: att.key,
        capability: att.capability,
        status: 'failed',
        failed: String(e?.message || 'The analysis could not run.'),
      });
    }
  }
  return results;
}

/** The text Sonar's research run reads: every result, labelled by what it is. */
export function compositionText(results = []) {
  return results
    .map((r) =>
      r.text
        ? r.text
        : `${CAPABILITIES[r.capability]?.label || r.capability}: not run (${r.failed || r.issues?.map((i) => i.message).join(' ') || r.status}).`,
    )
    .join('\n\n')
    .slice(0, 11500);
}
