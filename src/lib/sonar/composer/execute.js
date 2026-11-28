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
 * 4.0 (Nov 23 2026): runResearchComposition executes a whole composition against its
 * dependency graph (context.js planComposition): EzanaQL attachments run through the same
 * validated path as /api/ezanaql/run, set operations match securities on CUSIP (never on a
 * ticker alone), and an analysis that targets a derived set analyses exactly that set.
 *
 * Every number is computed here from stored data. Nothing is estimated by a language model.
 */

import { canonicalFor } from '../canonical-entities.js';
import { runComparison, runGovDependence, runMacro, runScreen } from './analytics-server.js';
import { getAdminClient } from '@/lib/supabase';
import { resolvePolitician } from '@/lib/sonar/landing-politician';
import { getDailyBars } from '@/lib/prices/daily-bars';
import { runBacktest } from '@/lib/quants/backtest-engine';
import { validateSpec, normalizeConfig } from '@/lib/quants/strategy-spec';
import { loadRunBars } from '@/lib/quants/lab-server';
import { validateAttachment, relationText, CAPABILITIES, onSet } from './registry.js';
import { companyRatios, dcfValue } from './calc.js';
import { DEBT_COMPONENTS } from '../../sec/concept-map.js';
import { querySchema } from './schema.js';
import {
  buildContext,
  reconcileTargets,
  planComposition,
  matchSecurities,
  SET_OPS,
  EVIDENCE_OPS,
  MATCH_LEVELS,
  queryRelationOptions,
  COMPANY_TARGETING,
} from './context.js';
import { extractRelation } from './intents.js';
import { holdingsQueryFor, queryCovers } from './auto-queries.js';
import { scope13FQuery, latestRowsPerFiler } from './thirteen-f.js';
import { runEzanaQL, validateEzanaQL } from '@/lib/ezanaql';
import { rankInstitutionalOwnershipForUniverse, universeForSubject } from './ownership-server.js';
import { ownershipText, ownershipStates, OWNERSHIP_CAPABILITY } from './ownership.js';

const TICKER_RE = /^\$?([A-Z]{1,5}(?:\.[A-Z])?)$/;

/* ── subjects ───────────────────────────────────────────────────────── */

/* ── 13F: a filer's own latest filing ───────────────────────────────────
   Per-filer reads use the filer's newest filed period, amendments applied
   (sec_13f_effective_filings, migration 20261129090000), not the market-wide snapshot,
   which waits for a quarter to be complete across filers. Until that migration is applied
   these fall back to the snapshot. See ./thirteen-f.js. */

async function latestFilers(admin, text) {
  const t = text.replace(/[%_]/g, '');
  const { data, error } = await admin.rpc('sec_13f_latest_filers', { p_text: t, p_limit: 10 });
  if (!error && Array.isArray(data) && data.length)
    return data.map((r) => ({
      cik: r.cik,
      filer_name: r.filer_name,
      period: String(r.period).slice(0, 10),
      positions: r.positions,
      book: r.book,
    }));
  const { data: snap } = await admin
    .from('titans_13f_filers')
    .select('cik, filer_name, period, positions, book')
    .ilike('filer_name', `%${t}%`)
    .order('period', { ascending: false })
    .limit(40);
  const byCik = new Map();
  for (const r of snap || []) if (!byCik.has(r.cik)) byCik.set(r.cik, r);
  return [...byCik.values()].sort((a, b) => Number(b.book || 0) - Number(a.book || 0));
}

/** One filer's positions for a period: its effective filing, common shares and options. */
async function filerPositions(admin, cik, period, limit = 2000) {
  const { data, error } = await admin
    .from('ezq_13f_holdings')
    .select('ticker, cusip, issuer, value_usd, shares, put_call, share_type')
    .eq('filer_cik', cik)
    .eq('period_of_report', period)
    .eq('is_current', true)
    .order('value_usd', { ascending: false })
    .limit(limit);
  if (!error && data?.length)
    return data.filter((r) => String(r.share_type || 'SH').toUpperCase() !== 'PRN');
  const { data: snap, error: e2 } = await admin
    .from('titans_13f_positions')
    .select('ticker, cusip, issuer, value_usd, shares, put_call')
    .eq('cik', cik)
    .eq('period', period)
    .order('value_usd', { ascending: false })
    .limit(limit);
  if (e2) throw new Error('13F holdings could not be read');
  return snap || [];
}

/** The filer's largest holdings, one row per issuer (share classes merged). */
async function filerHoldings(admin, cik, period, limit = 400) {
  const data = await filerPositions(admin, cik, period, limit);
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
  /* Sonar 6.4: a canonical identity resolves to its own symbol first; a central bank is
     never a company ("Bank of Canada" is not Bank of the James). */
  const canon = canonicalFor(t);
  if (canon?.type === 'central_bank') return null;
  if (canon?.type === 'company') {
    const { data } = await admin
      .from('sec_fundamentals')
      .select('ticker, entity_name')
      .eq('ticker', canon.id)
      .limit(1);
    return {
      text: t,
      kind: 'company',
      id: canon.id,
      name: data?.[0]?.entity_name || canon.label,
      ...(data?.[0]?.ticker ? {} : { filedFigures: false }),
    };
  }
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

/**
 * Sonar 6.2: a company named in a comparison or a dependence question, resolved to its
 * ticker from filed SEC data only (never to a filer or a member of Congress). A name
 * matches the filer whose name starts with it; ties go to the shortest name.
 */
export async function resolveCompany(text, admin = getAdminClient()) {
  const t = String(text || '').trim();
  if (!t) return null;
  /* Sonar 6.4 hardening: a canonical issuer resolves to its own symbol; a central bank is
     never a company. (A live comparison of Bank of America and Goldman Sachs failed on the
     name search.) */
  const canon = canonicalFor(t);
  if (canon?.type === 'central_bank') return { text: t, kind: 'unresolved' };
  if (canon?.type === 'company') {
    const { data } = await admin
      .from('sec_fundamentals')
      .select('ticker, entity_name')
      .eq('ticker', canon.id)
      .limit(1);
    return { text: t, kind: 'company', id: canon.id, name: data?.[0]?.entity_name || canon.label };
  }
  const tick = t.match(TICKER_RE);
  if (tick) {
    const { data } = await admin
      .from('sec_fundamentals')
      .select('ticker, entity_name')
      .eq('ticker', tick[1])
      .limit(1);
    if (data?.[0]?.ticker)
      return {
        text: t,
        kind: 'company',
        id: data[0].ticker,
        name: data[0].entity_name || data[0].ticker,
      };
  }
  const clean = t.replace(/[%_]/g, '').replace(/\s+(?:inc|corp|corporation|co|ltd|plc)\.?$/i, '');
  const { data } = await admin
    .from('sec_fundamentals')
    .select('ticker, entity_name')
    .ilike('entity_name', `%${clean}%`)
    .eq('concept', 'revenue')
    .not('ticker', 'is', null)
    .limit(1000);
  const seen = new Map();
  for (const r of data || []) if (r.ticker && !seen.has(r.ticker)) seen.set(r.ticker, r);
  const low = clean.toLowerCase();
  const ranked = [...seen.values()]
    .map((r) => {
      const n = String(r.entity_name || '').toLowerCase();
      const start = n.startsWith(low) && !/[a-z0-9]/.test(n.charAt(low.length) || ' ');
      /* A name inside another word ("AMD" in "AMDOCS", "Intel" in "Intellicheck") is not
         a match unless the name starts the filer's name. */
      const word = new RegExp(
        `(^|[^a-z0-9])${low.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`,
      ).test(n);
      const tier = start ? 0 : word ? 1 : null;
      return tier == null ? null : { r, score: tier * 1000 + n.length };
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score);
  const best = ranked[0]?.r;
  if (!best) return { text: t, kind: 'unresolved' };
  return { text: t, kind: 'company', id: best.ticker, name: best.entity_name || best.ticker };
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
  ...DEBT_COMPONENTS,
];

/** { [ticker]: { annual: {concept: [{end, value}] newest first}, instant: {concept: {end, value}} } } */
async function filedFigures(admin, tickers) {
  if (!tickers.length) return {};
  const { data, error } = await admin
    .from('sec_fundamentals')
    .select('ticker, concept, period_type, period_end, value, taxonomy_concept')
    .in('ticker', tickers)
    .in('concept', CONCEPTS)
    .in('period_type', ['annual', 'instant'])
    .order('period_end', { ascending: false })
    .limit(6000);
  if (error) throw new Error('Filed fundamentals could not be read');
  const out = {};
  for (const r of data || []) {
    const t = (out[r.ticker] = out[r.ticker] || { annual: {}, instant: {} });
    /* Missing stays missing: Number(null) is 0 (Sonar 6.4 null audit). */
    if (r.value == null || r.value === '') continue;
    const v = Number(r.value);
    if (!Number.isFinite(v)) continue;
    if (r.period_type === 'annual') {
      const list = (t.annual[r.concept] = t.annual[r.concept] || []);
      if (!list.some((x) => x.end === r.period_end))
        list.push({ end: r.period_end, value: v, concept: r.taxonomy_concept || null });
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

async function companiesFor(admin, att, cap, env = null) {
  if (onSet(att)) {
    const set = env?.sets?.[att.target.dataset?.id];
    if (!set) throw new Error('Its target set was not computed.');
    const all = set.rows;
    const n = att.params?.top_n
      ? Number(att.params.top_n)
      : cap === 3
        ? 5
        : Math.min(25, all.length);
    return {
      rows: all.slice(0, n),
      total: null,
      source: set.source,
      valueLabel: set.valueLabel,
      empty: all.length === 0,
    };
  }
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

async function runFundamentals(admin, att, env) {
  const { rows, total, source, empty, valueLabel } = await companiesFor(admin, att, 10, env);
  if (empty) return emptyTarget(att);
  const isCompany = !onSet(att) && att.subject.kind === 'company';
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
    `| Company | Ticker | ${isCompany ? '' : `${valueLabel || 'Reported value'} | Weight | `}Revenue (FY) | ${metrics.map((m) => METRIC_LABEL[m]).join(' | ')} |`,
    `|---|---|${isCompany ? '' : '---|---|'}---|${metrics.map(() => '---').join('|')}|`,
    ...table.map(
      (t) =>
        `| ${t.issuer} | ${t.ticker} | ${isCompany ? '' : `${usd(t.value)} | ${pct(t.weight)} | `}${usd(t.ratios?.revenue)} | ${metrics
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
    onSet(att)
      ? 'The companies come from the target set above; its matching method and reporting dates apply.'
      : null,
    'Margin and leverage ratios are not comparable for banks, insurers and other financial companies, whose statements are built differently.',
    !onSet(att) && att.subject.kind === 'institution'
      ? "13F holdings are a quarterly, lagged snapshot of reportable US positions, not a live or complete portfolio, and not the manager's total assets under management."
      : null,
    !onSet(att) && att.subject.kind === 'politician'
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

async function runDcf(admin, att, env) {
  const { rows, source, empty } = await companiesFor(admin, att, 3, env);
  if (empty) return emptyTarget(att);
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
      /* Sonar 6.4 final hardening: total debt when it can be reconstructed; otherwise the
         filed long-term debt figure, said so in the limitations; never a silent 0. */
      debt: ratios?.total_debt ?? f?.instant?.long_term_debt?.value ?? Number.NaN,
      shares: f?.instant?.shares_outstanding?.value,
    });
    const debtBasis =
      ratios?.total_debt != null
        ? `total debt (${ratios.total_debt_method})`
        : f?.instant?.long_term_debt?.value != null
          ? 'long-term debt only (total debt could not be reconstructed)'
          : 'no debt figure filed';
    const px = res.ok ? await latestClose(ticker) : null;
    out.push({
      ticker,
      issuer: r.issuer,
      growth,
      growthFrom:
        userGrowth !== null && userGrowth !== undefined && userGrowth !== '' ? 'reader' : 'history',
      fcf: ratios?.fcf ?? null,
      ...res,
      debtBasis,
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
    `Debt deducted: ${[...new Set(out.map((o) => `${o.ticker} ${o.debtBasis}`))].join('; ')}. Leases (unless included in the filed total), minority interests and other claims are not deducted.`,
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

/** An analysis whose target set is empty is not run: nothing is invented for it. */
function emptyTarget(att) {
  const label = att.target?.label || 'the target set';
  return {
    output: 'none',
    title: CAPABILITIES[att.capability].label,
    skipped: true,
    failed: `${label} is empty, so there were no companies to analyse.`,
    text: `${CAPABILITIES[att.capability].label}: not run. ${label} is empty, so there were no companies to analyse. Alternatives the reader can choose: compare the two holdings sets instead, broaden the query beyond its current limit, or analyse each set separately.`,
  };
}

/* ── 4.0: securities, queries and set operations ────────────────────── */

const cleanTicker = (t) =>
  String(t || '')
    .toUpperCase()
    .replace(/[^A-Z0-9.]/g, '');

/**
 * CUSIPs for tickers, read from the 13F book of one period (or the latest). A ticker that
 * maps to more than one CUSIP with comparable support is ambiguous and left unmapped.
 */
async function cusipsForTickers(admin, tickers, period = null) {
  const list = [...new Set(tickers.map(cleanTicker).filter(Boolean))];
  if (!list.length) return { map: {}, ambiguous: [] };
  let per = period;
  if (!per) {
    const { data } = await admin
      .from('titans_13f_positions')
      .select('period')
      .order('period', { ascending: false })
      .limit(1);
    per = data?.[0]?.period || null;
  }
  let q = admin
    .from('titans_13f_positions')
    .select('ticker, cusip')
    .in('ticker', list)
    .limit(20000);
  if (per) q = q.eq('period', per);
  const { data, error } = await q;
  if (error) throw new Error('Security identifiers could not be read');
  const counts = {};
  for (const r of data || []) {
    if (!r.cusip) continue;
    const t = cleanTicker(r.ticker);
    const c = (counts[t] = counts[t] || {});
    c[r.cusip] = (c[r.cusip] || 0) + 1;
  }
  const map = {};
  const ambiguous = [];
  for (const [t, c] of Object.entries(counts)) {
    const ranked = Object.entries(c).sort((a, b) => b[1] - a[1]);
    if (ranked.length > 1 && ranked[1][1] >= ranked[0][1] * 0.2) ambiguous.push(t);
    else map[t] = ranked[0][0];
  }
  return { map, ambiguous, period: per };
}

/** The primary subject's holdings as securities with CUSIPs. */
async function subjectSecurities(admin, primary) {
  if (primary.kind === 'institution') {
    const data = await filerPositions(admin, primary.id, primary.period, 2000);
    const rows = (data || [])
      .filter((r) => !r.put_call && r.cusip)
      .map((r) => ({
        cusip: r.cusip,
        ticker: cleanTicker(r.ticker) || null,
        issuer: r.issuer,
        value: Number(r.value_usd) || null,
        shares: Number(r.shares) || null,
      }));
    return {
      rows,
      asOf: `13F period ${primary.period}`,
      source: `${primary.name} Form 13F, period ${primary.period}`,
      unmapped: [],
    };
  }
  const held = await memberHoldings(admin, primary.id);
  const { map, ambiguous } = await cusipsForTickers(
    admin,
    held.map((h) => h.tickers[0]),
  );
  const { data: last } = await admin
    .from('congress_trades')
    .select('disclosure_date')
    .eq('bioguide_id', primary.id)
    .not('disclosure_date', 'is', null)
    .order('disclosure_date', { ascending: false })
    .limit(1);
  const asOf = last?.[0]?.disclosure_date ? String(last[0].disclosure_date).slice(0, 10) : null;
  const rows = [];
  const unmapped = [];
  for (const h of held) {
    const t = cleanTicker(h.tickers[0]);
    if (map[t])
      rows.push({ cusip: map[t], ticker: t, issuer: h.issuer, est: h.value, share: h.share });
    else unmapped.push(t);
  }
  return {
    rows,
    asOf: asOf ? `estimated from disclosures through ${asOf}` : 'estimated from disclosures',
    source: `${primary.name}'s estimated open positions (STOCK Act disclosures at range midpoints)${asOf ? `, latest disclosure ${asOf}` : ''}`,
    unmapped: [...unmapped, ...ambiguous.filter((t) => !unmapped.includes(t))],
  };
}

/** Run one EzanaQL attachment through the validated path; securities rows when it has them. */
async function runQueryAttachment(admin, item, userId) {
  const v = validateEzanaQL(item.query, { dimension: item.dimension || null });
  if (!v.ok) throw new Error(`The query is not valid EzanaQL: ${v.error}`);
  const run = (query) =>
    runEzanaQL({ query, admin, userId, dimension: item.dimension || null, format: 'table' });
  /* A holdings query means each filer's own latest filing unless it names a period
     (then that period's effective filing); see ./thirteen-f.js. */
  const scoped = scope13FQuery(item.query);
  let scopeNote = scoped.note;
  let out = scoped.scope ? await run(scoped.query) : await run(item.query);
  let fallback = false;
  if (scoped.scope && !out.ok) {
    out = await run(item.query);
    fallback = true;
  }
  if (!out.ok) throw new Error(out.error || 'The query could not run.');
  let rows = out.result?.rows || [];
  if (fallback && scoped.scope === 'latest') {
    const before = rows.length;
    rows = latestRowsPerFiler(rows);
    scopeNote =
      before !== rows.length
        ? "Rows from earlier quarters were dropped, keeping each filer's newest period in the result."
        : null;
  } else if (fallback) scopeNote = null;
  const keys = out.result?.keys || [];
  const securities = [];
  const periods = new Set();
  if (item.schema?.shape === 'securities') {
    const seen = new Set();
    const needMap = [];
    for (const r of rows) {
      if (r.put_call) continue;
      if (r.share_type && String(r.share_type).toUpperCase() === 'PRN') continue;
      const cusip = r.cusip ? String(r.cusip).toUpperCase() : null;
      const ticker = cleanTicker(r.ticker) || null;
      const id = cusip || `t:${ticker}`;
      if (!cusip && !ticker) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      if (r.period) periods.add(String(r.period).slice(0, 10));
      securities.push({
        cusip,
        ticker,
        issuer: r.issuer || null,
        value: r.value != null ? Number(r.value) : null,
        shares: r.shares != null ? Number(r.shares) : null,
        period: r.period ? String(r.period).slice(0, 10) : null,
      });
      if (!cusip && ticker) needMap.push(ticker);
    }
    if (needMap.length) {
      const { map } = await cusipsForTickers(admin, needMap);
      for (const sRow of securities)
        if (!sRow.cusip && map[sRow.ticker]) sRow.cusip = map[sRow.ticker];
    }
  }
  const head = keys.slice(0, 8);
  const table = [
    `| ${head.join(' | ')} |`,
    `|${head.map(() => '---').join('|')}|`,
    ...rows
      .slice(0, 25)
      .map((r) => `| ${head.map((k) => (r[k] == null ? '' : String(r[k]))).join(' | ')} |`),
  ];
  return {
    rows,
    keys,
    securities,
    periods: [...periods].sort(),
    table,
    rowCount: rows.length,
    scope: scopeNote
      ? { kind: scoped.scope, note: scopeNote, query: fallback ? item.query : scoped.query }
      : null,
  };
}

const fmtUsd = (v) => (v == null ? 'N/A' : usd(v));

/** Compute a set operation and the text section that reports it. */
function runSetOp({ item, left, right, leftDs, rightDs, setDs }) {
  const op = SET_OPS[item.relation];
  const level = item.matchLevel === 'issuer' ? 'issuer' : 'security';
  const m = matchSecurities(left.rows, right.securities, { op: op.key, level });
  const rightPeriods = right.periods.length ? right.periods.join(', ') : 'as returned by the query';
  const rows = m.rows
    .map((x) => {
      const l = x.left[0] || null;
      const r = x.right[0] || null;
      return {
        cusip: (r || l).cusip,
        ticker: r?.ticker || l?.ticker || null,
        issuer: r?.issuer || l?.issuer || null,
        tickers: [...new Set([...x.left, ...x.right].map((y) => y.ticker).filter(Boolean))],
        leftEst: l?.est ?? l?.value ?? null,
        leftShare: l?.share ?? null,
        rightValue: x.right.reduce((t, y) => t + (Number(y.value) || 0), 0) || null,
        rightShares: r?.shares ?? null,
        rightPeriod: r?.period ?? null,
      };
    })
    .sort((a, b) => (b.rightValue || 0) - (a.rightValue || 0));
  const title =
    op.key === 'compare'
      ? `Holdings comparison: ${leftDs.short} and ${rightDs.short}`
      : setDs?.label || op.key;
  const lines = [
    `${title} (computed by Research Composer from stored filings; not an AI estimate).`,
    `Relationship: ${op.text(leftDs, rightDs)}`,
    `Matching: ${MATCH_LEVELS[level].note} Rows without a CUSIP are not matched on a ticker alone.`,
    `Left: ${leftDs.label}, ${left.asOf}. ${m.leftCount} securities with identifiers${left.unmapped?.length ? `; ${left.unmapped.length} could not be mapped to a CUSIP (${left.unmapped.slice(0, 8).join(', ')})` : ''}.`,
    `Right: ${rightDs.label}, reporting period ${rightPeriods}. ${m.rightCount} securities with identifiers${m.rightNoId ? `; ${m.rightNoId} without one` : ''}. Options and principal-amount (bond) rows are excluded.`,
    `Result: ${m.overlap} in both, ${m.leftOnly} only on the left, ${m.rightOnly} only on the right.`,
  ];
  if (op.key !== 'compare') {
    lines.push(
      rows.length
        ? `${rows.length} ${op.key === 'intersect' ? 'matching' : 'resulting'} ${level === 'issuer' ? 'issuers' : 'securities'}:`
        : op.key === 'intersect'
          ? 'No equities appear in both datasets. Nothing downstream is run on an empty set.'
          : 'The result is empty.',
    );
    if (rows.length) {
      lines.push(
        '',
        `| Company | Ticker | CUSIP | ${leftDs.short} est. value (midpoint) | ${rightDs.short} reported value |`,
        '|---|---|---|---|---|',
        ...rows
          .slice(0, 40)
          .map(
            (r) =>
              `| ${r.issuer || 'N/A'} | ${r.tickers.join(', ') || 'N/A'} | ${r.cusip} | ${fmtUsd(r.leftEst)} | ${fmtUsd(r.rightValue)} |`,
          ),
      );
    }
  }
  /* 13F periods: say how each side was scoped, and when two 13F sides are from different
     quarters (one filer has filed its newest quarter, the other has not yet). */
  const notes = [];
  if (right.scope?.note) notes.push(`${rightDs.short}: ${right.scope.note}`);
  if (left.scope?.note) notes.push(`${leftDs.short}: ${left.scope.note}`);
  const leftPeriods = left.periods?.length
    ? left.periods
    : String(left.asOf || '').match(/\d{4}-\d{2}-\d{2}/g) || [];
  if (
    leftDs.semantics !== 'estimated_holdings' &&
    leftPeriods.length &&
    right.periods.length &&
    leftPeriods.join() !== right.periods.join()
  )
    notes.push(
      `The two sides are from different 13F quarters (${leftDs.short} ${leftPeriods.join(', ')}; ${rightDs.short} ${right.periods.join(', ')}): each is that filer's latest filing, and a match is not ownership in the same quarter.`,
    );
  if (notes.length) lines.push('', ...notes.map((n) => `Note: ${n}`));
  lines.push(
    '',
    `Limitation: these are the latest available reported or estimated holdings in each dataset. The dates differ, so a match shows a security appearing in both datasets, not verified simultaneous ownership.`,
    leftDs.semantics === 'estimated_holdings'
      ? 'Limitation: congressional positions are estimated from disclosed transaction ranges; exact position sizes are not disclosed.'
      : null,
  );
  return {
    output: 'calculated',
    title,
    op: op.key,
    /* Sonar 5.0: the structured result the research engine and the report consume (the
       text below is the same result in words, for the writer). */
    left: {
      label: leftDs.label,
      short: leftDs.short,
      semantics: leftDs.semantics,
      asOf: left.asOf,
      count: m.leftCount,
      unmapped: (left.unmapped || []).slice(0, 20),
    },
    right: {
      label: rightDs.label,
      short: rightDs.short,
      semantics: rightDs.semantics,
      periods: right.periods,
      count: m.rightCount,
      noId: m.rightNoId,
    },
    matches: rows.slice(0, 100).map((r) => ({
      cusip: r.cusip,
      ticker: r.ticker,
      tickers: r.tickers,
      issuer: r.issuer,
      leftEst: r.leftEst,
      leftShare: r.leftShare,
      rightValue: r.rightValue,
      rightPeriod: r.rightPeriod,
    })),
    stats: { overlap: m.overlap, leftOnly: m.leftOnly, rightOnly: m.rightOnly, level },
    notes,
    set: setDs
      ? {
          rows: rows.map((r) => ({
            issuer: r.issuer || r.ticker,
            tickers: r.tickers.length ? r.tickers : [r.ticker].filter(Boolean),
            value: r.rightValue,
          })),
          source: `${setDs.label} (${MATCH_LEVELS[level].label.toLowerCase()}; ${left.asOf}; ${rightDs.short} period ${rightPeriods})`,
          valueLabel: `${rightDs.short} reported value`,
        }
      : null,
    count: rows.length,
    text: lines.filter((l) => l !== null).join('\n'),
  };
}

/**
 * Execute a whole composition. The server rebuilds the context from the submitted
 * attachments (schemas re-derived, the subject re-resolved, targets reconciled), plans it
 * and runs the tasks in dependency order. Failures stay local: a failed query marks only
 * what depends on it.
 */
export async function runResearchComposition(
  {
    question = '',
    primary: primaryIn = null,
    attachments = [],
    userId = null,
    /* Sonar 6.1: a subject the route already resolved for the same text (no second read). */
    resolvedPrimary = null,
    /* Sonar 6.2: a task that would start after this time is reported as not run, and a
       running task is cut at it; completed tasks are kept (partial-result recovery). */
    deadlineAt = null,
  },
  admin = getAdminClient(),
) {
  /* Sonar 5.0 (Nov 24 2026): the server reads the question itself, so a two-holder
     question runs as an overlap whatever the client sent (an older page, a subject it
     could not resolve, names typed in lower case). The question's first holder is the
     subject; its second gets a holdings query when nothing attached covers it. */
  const relation = extractRelation(question);
  const primaryText =
    relation?.left ||
    String(primaryIn?.text || '')
      .replace(/^both\s+/i, '')
      .trim() ||
    null;
  const reuseResolved =
    resolvedPrimary?.id &&
    primaryText &&
    String(resolvedPrimary.text || '').toLowerCase() === primaryText.toLowerCase();
  const primary = reuseResolved
    ? resolvedPrimary
    : primaryText
      ? await resolveSubject(primaryText, admin).catch(() => null)
      : null;
  const items = attachments
    .slice(0, 8)
    .map((raw, i) => {
      const seq = Number.isFinite(raw?.seq) ? raw.seq : i;
      if (raw?.kind === 'query') {
        const query = String(raw.query || '').slice(0, 4000);
        return {
          key: String(raw.key || `query:${i}`).slice(0, 80),
          kind: 'query',
          seq,
          label: String(raw.label || 'EzanaQL query').slice(0, 120),
          query,
          dimension: raw.dimension || null,
          /* A query Sonar built for a resolved filer names it (a label only). */
          entityName:
            typeof raw.entityName === 'string'
              ? raw.entityName.replace(/[\r\n]+/g, ' ').slice(0, 80)
              : null,
          relation: SET_OPS[raw.relation] || EVIDENCE_OPS[raw.relation] ? raw.relation : 'evidence',
          /* Only a relationship the reader chose is kept as is; any other takes the
             recommended one below, as in the composer. */
          relationExplicit: raw.relationExplicit === true,
          matchLevel: raw.matchLevel === 'issuer' ? 'issuer' : 'security',
          schema: querySchema(query, raw.dimension || null),
        };
      }
      if (raw?.kind === 'analysis' && CAPABILITIES[raw.capability]) {
        return {
          ...raw,
          /* The server's own resolution of the question's subject stands in for a subject
             the client sent only as text (a guest, or a question Sonar inferred itself). */
          subject: CAPABILITIES[raw.capability]?.subjectless
            ? null
            : raw.subject?.kind && raw.subject?.id
              ? raw.subject
              : primary?.kind && primary.kind !== 'unresolved'
                ? primary
                : raw.subject || null,
          seq,
          /* An explicit target, or one the reader still has to reconfigure (stale), is kept as
           explicit: a target that no longer exists stays unrun instead of moving silently. */
          target:
            raw.target?.explicit || raw.target?.stale
              ? { id: String(raw.target.id || ''), explicit: true }
              : null,
          /* A two-holder question's analysis covers the overlap. */
          wantsSet: Boolean(relation) && COMPANY_TARGETING.has(raw.capability),
          origin: relation && COMPANY_TARGETING.has(raw.capability) ? 'auto' : raw.origin,
        };
      }
      return null;
    })
    .filter(Boolean);
  /* Sonar 6.2: companies named in a comparison resolve here (server side); a dependence
     question's subject must be a company, whatever the general resolver chose. */
  for (const it of items) {
    if (it.capability === 'company-comparison' && !it.params?.tickers?.length) {
      const names = (it.params?.company_names || []).slice(0, 8);
      const found = await Promise.all(names.map((n) => resolveCompany(n, admin).catch(() => null)));
      const ok = found.filter((f) => f?.kind === 'company');
      it.params = {
        ...(it.params || {}),
        tickers: [...new Set(ok.map((f) => f.id))],
        names: Object.fromEntries(ok.map((f) => [f.id, f.name])),
        unresolved: names.filter((n, i) => found[i]?.kind !== 'company'),
      };
    }
    if (it.capability === 'government-dependence' && it.subject?.kind !== 'company') {
      const text = it.subject?.text || primaryText;
      const co = text ? await resolveCompany(text, admin).catch(() => null) : null;
      it.subject = co?.kind === 'company' ? co : it.subject;
    }
  }
  if (relation?.right && !items.some((it) => queryCovers(it, relation.right))) {
    const right = await resolveSubject(relation.right, admin).catch(() => null);
    const topN =
      relation.topNFor && relation.topNFor.toLowerCase() === relation.right.toLowerCase()
        ? relation.topN
        : null;
    const auto =
      right?.kind === 'institution' ? holdingsQueryFor(right, { topN, op: relation.op }) : null;
    if (auto) items.push({ ...auto, seq: -1 });
  }
  /* Relationships the reader did not choose take the recommended one (a holdings
     intersection when both sides are security sets); an overlap question asks for it. */
  const pre = buildContext({
    question,
    primary,
    items: items.map((it) =>
      it.kind === 'query' && !it.relationExplicit ? { ...it, relation: 'evidence' } : it,
    ),
  });
  for (const it of items) {
    if (it.kind !== 'query' || it.relationExplicit) continue;
    const opts = queryRelationOptions(it, pre);
    const want = relation && queryCovers(it, relation.right) ? relation.op : opts.recommended;
    it.relation = opts.options.some((o) => o.key === want && !o.disabled) ? want : opts.recommended;
  }
  let ctx = buildContext({ question, primary, items });
  const patches = reconcileTargets(items, ctx);
  const ready = items.map((it) => {
    const next = patches[it.key];
    if (!next) return it;
    /* The same rule as the composer: a count default does not carry across a change of
       target; a count the reader set does. */
    const params = { ...(it.params || {}) };
    if (next.kind === 'set' && !it.editedParams?.top_n) delete params.top_n;
    return { ...it, params, target: next };
  });
  ctx = buildContext({ question, primary, items: ready });
  const { order } = planComposition(ctx);

  const results = [];
  const done = {};
  const sets = {};
  const failed = new Set();
  let subjectRows = null;
  const timings = {};
  const runStarted = Date.now();
  const left = () => (deadlineAt ? deadlineAt - Date.now() : Infinity);
  const timeoutErr = () =>
    Object.assign(new Error('It did not finish within the time limit.'), { name: 'TimeoutError' });
  const bounded = (p) =>
    deadlineAt
      ? Promise.race([
          p,
          new Promise((_, rej) => setTimeout(() => rej(timeoutErr()), Math.max(0, left()))),
        ])
      : p;
  for (const task of order) {
    if (task.deps.some((d) => failed.has(d))) {
      failed.add(task.id);
      continue;
    }
    if (left() < 250) {
      failed.add(task.id);
      const src = task.id.startsWith('analysis:')
        ? ready.find((x) => `analysis:${x.key}` === task.id)
        : null;
      results.push({
        key: src ? src.key : task.id,
        capability: src?.capability,
        task: task.id,
        status: 'failed',
        timedOut: true,
        title: task.label,
        failed: 'Not run: the time limit was reached before this step started.',
      });
      continue;
    }
    const t0 = Date.now();
    try {
      if (task.id === 'subject:resolve') {
        if (!primary?.kind || !['politician', 'institution'].includes(primary.kind))
          throw new Error('The subject did not resolve to holdings.');
      } else if (task.id === 'subject:holdings') {
        subjectRows = await bounded(subjectSecurities(admin, primary));
      } else if (task.id.startsWith('query:')) {
        const item = ready.find((x) => `query:${x.key}` === task.id);
        const res = await bounded(runQueryAttachment(admin, item, userId));
        done[task.id] = res;
        /* A query's own securities are a set an analysis can target (out:<key>). */
        if (res.securities?.length)
          sets[`out:${item.key}`] = {
            rows: res.securities.map((x) => ({
              issuer: x.issuer || x.ticker,
              tickers: [x.ticker].filter(Boolean),
              value: x.value,
            })),
            source: `${item.label} (EzanaQL${res.periods.length ? `, period ${res.periods.join(', ')}` : ''})`,
            valueLabel: 'Reported value',
          };
        if (!SET_OPS[item.relation]) {
          results.push({
            key: item.key,
            kind: 'query',
            status: 'done',
            title: item.label,
            text: [
              `EzanaQL query "${item.label}" (${res.rowCount} rows; first ${Math.min(25, res.rowCount)} shown).`,
              `How to use it: ${EVIDENCE_OPS[item.relation].text()}`,
              res.scope ? `Scope: ${res.scope.note}` : null,
              `Query: ${res.scope?.query || item.query}`,
              '',
              ...res.table,
            ]
              .filter((l) => l !== null)
              .join('\n'),
          });
        }
      } else if (task.id.startsWith('set:')) {
        const key = task.id.slice(4);
        const item = ready.find((x) => x.key === key);
        const rightDs = ctx.datasets.find((d) => d.id === `out:${key}`);
        const setDs = ctx.datasets.find((d) => d.id === `set:${key}`) || null;
        const leftId = setDs ? setDs.inputs[0] : 'subject:holdings';
        const leftDs = ctx.datasets.find((d) => d.id === leftId);
        const left =
          leftId === 'subject:holdings'
            ? subjectRows
            : {
                rows: done[`query:${leftId.slice(4)}`]?.securities || [],
                periods: done[`query:${leftId.slice(4)}`]?.periods || [],
                scope: done[`query:${leftId.slice(4)}`]?.scope || null,
                asOf: done[`query:${leftId.slice(4)}`]?.periods?.length
                  ? `period ${done[`query:${leftId.slice(4)}`].periods.join(', ')}`
                  : 'as returned by its query',
                unmapped: [],
              };
        /* Sonar 6.3: a side with no holdings (a company subject, a query that did not
           run) is a named failure, not a null dereference. */
        if (!left?.rows || !done[`query:${key}`])
          throw new Error(
            `Portfolio operations need holdings on both sides; ${
              !left?.rows
                ? `${primary?.name || 'the subject'} has no holdings`
                : 'the other query returned none'
            }.`,
          );
        const res = runSetOp({ item, left, right: done[`query:${key}`], leftDs, rightDs, setDs });
        if (setDs && res.set) sets[setDs.id] = res.set;
        results.push({ key, kind: 'query', status: 'done', ...res, set: undefined });
      } else if (task.id.startsWith('analysis:')) {
        const raw = ready.find((x) => `analysis:${x.key}` === task.id);
        const att = validateAttachment({
          ...raw,
          target: raw.target && onSetTarget(raw.target, sets),
        });
        if (att.status !== 'supported') {
          results.push({
            key: att.key,
            capability: att.capability,
            status: att.status,
            issues: att.issues,
          });
          continue;
        }
        const res = await bounded(EXECUTORS[att.capability](admin, att, { sets }));
        results.push({
          key: att.key,
          capability: att.capability,
          origin: att.origin,
          relation: relationText(att),
          status: res.skipped ? 'skipped' : res.failed ? 'failed' : 'done',
          ...res,
        });
      }
    } catch (e) {
      failed.add(task.id);
      /* Sonar 6.3: a failed analysis keeps its key and capability, so the fulfillment
         contract and the report attribute the reason to the right step. */
      const src = task.id.startsWith('analysis:')
        ? ready.find((x) => `analysis:${x.key}` === task.id)
        : null;
      results.push({
        key: src ? src.key : task.id,
        capability: src?.capability,
        task: task.id,
        status: 'failed',
        timedOut: e?.name === 'TimeoutError',
        title: task.label,
        failed: String(e?.message || 'This step could not run.'),
      });
    }
    timings[task.id] = Date.now() - t0;
  }
  for (const id of failed) {
    if (results.some((r) => r.key === id || `analysis:${r.key}` === id)) continue;
    results.push({ key: id, status: 'failed', failed: 'A step it depends on could not run.' });
  }
  return {
    results,
    plan: order.map((t) => ({ id: t.id, label: t.label, deps: t.deps, ms: timings[t.id] ?? null })),
    failedTasks: [...failed],
    durationMs: Date.now() - runStarted,
    subject: primary?.name
      ? { name: primary.name, kind: primary.kind, id: primary.id ?? null }
      : null,
  };
}

/** An analysis target with the computed set's size, so validation sees real counts. */
function onSetTarget(target, sets) {
  if (target?.kind !== 'set') return target;
  const set = sets[target.dataset?.id];
  return set ? { ...target, count: set.rows.length } : target;
}

/**
 * Institutional Ownership Analysis (Nov 27 2026): the subject's holdings ranked by how many
 * 13F reporting managers hold each one, in the latest adequately covered quarter.
 * See ./ownership.js (definitions) and ./ownership-server.js (bounded reads).
 */
async function runOwnership(admin, att) {
  const s = att.subject;
  const universe = await universeForSubject(admin, s);
  if (!universe.eligible.length) {
    return {
      output: 'calculated',
      title: 'Institutional Ownership Analysis',
      failed: `None of ${s.name}'s disclosed holdings could be matched to a listed common stock.`,
      ownership: { universe: { total: universe.total, eligible: 0 }, excluded: universe.excluded },
      text: `Institutional Ownership Analysis: not run. None of ${s.name}'s ${universe.total} disclosed holdings matched a listed common stock (${universe.excluded.map((x) => `${x.ticker || x.issuer}: ${x.reason}`).join('; ')}).`,
    };
  }
  const result = await rankInstitutionalOwnershipForUniverse(admin, {
    universe,
    metric: att.params?.metric || 'managers',
    topN: att.params?.top_n ? Number(att.params.top_n) : null,
    comparePrior: att.params?.compare_prior !== 'no',
    subject: s,
  });
  const states = ownershipStates(result);
  const ranked = result.rows.filter((r) => r.rank != null).length;
  return {
    output: 'calculated',
    title: 'Institutional Ownership Analysis',
    coverage: {
      selected: universe.eligible.length,
      withData: ranked,
      complete: ranked,
    },
    ownership: { ...result, states },
    limitations: result.limitations,
    text: ownershipText(result),
  };
}

const EXECUTORS = {
  'fundamental-analysis': runFundamentals,
  'dcf-valuation': runDcf,
  backtesting: runMemberBacktest,
  'financial-screen': runScreen,
  'company-comparison': runComparison,
  'government-dependence': runGovDependence,
  'macro-indicators': runMacro,
  [OWNERSHIP_CAPABILITY]: runOwnership,
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
      const res = await EXECUTORS[att.capability](admin, att, null);
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
        : `${CAPABILITIES[r.capability]?.label || r.title || r.capability || r.key}: not run (${r.failed || r.issues?.map((i) => i.message).join(' ') || r.status}).`,
    )
    .join('\n\n')
    .slice(0, 11500);
}
