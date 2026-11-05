/**
 * Sonar research engine: evidence for the strategic positioning assessment
 * (deep research, Nov 2026). "How is Microsoft positioning itself to capture
 * value from the AI infrastructure boom? Connect its financial performance,
 * government contracts, industry exposure, and relevant lobbying activity."
 *
 *   capex_monetization   capital expenditure against revenue, operating cash
 *                        flow and free cash flow, by fiscal year and quarter,
 *                        from the company's SEC filings
 *   hyperscaler_capex    the same capital spending for every listed
 *                        hyperscaler beside its reported cloud revenue
 *   contracts_profile    federal contract obligations by fiscal year and
 *                        agency, the largest awards with their ceilings, and
 *                        which fiscal years are complete
 *   lobbying_profile     lobbying spend by year and quarter, outside firms,
 *                        issue areas mapped to AI infrastructure policy, and
 *                        the same spend for the hyperscaler peers
 *   value_chain          where the company operates in Ezana's AI
 *                        infrastructure value chain (an analytical framework)
 *
 * Every figure in an item's text is one the item's own data states, so the
 * claim validator can check the assessment's numbers. Derived values (free
 * cash flow, a fourth fiscal quarter) say how they were derived.
 *
 * SERVER ONLY. Each runner is bounded by the executor and fails soft. No
 * vendor name in any text.
 */
import { usdB, fmp } from './sources-memo';
import {
  HYPERSCALERS,
  isHyperscaler,
  cloudLine,
  valueChainFor,
  contractYearComplete,
} from '@/lib/sonar/ai-infrastructure';
import { rollupLobbying } from '@/lib/sonar/lobbying-profile';

const pct1 = (r) => `${(r * 100).toFixed(1)}%`;
const signed = (r) => `${r >= 0 ? 'up' : 'down'} ${(Math.abs(r) * 100).toFixed(1)}%`;
const usdM = (v) => {
  const n = Number(v) || 0;
  return Math.abs(n) >= 1e9 ? usdB(n) : `$${(n / 1e6).toFixed(1)}M`;
};
const DAY = 864e5;
const daysBetween = (a, b) => Math.abs(new Date(a).getTime() - new Date(b).getTime()) / DAY;

const CAPEX_NOTE =
  'Capital expenditure is cash paid for property and equipment as tagged in the filings; it excludes assets acquired under finance leases.';

/* ── capex_monetization ─────────────────────────────────────────────── */

const FLOW = ['revenue', 'operating_income', 'operating_cash_flow', 'capex', 'depreciation'];

/**
 * Pure: sec_fundamentals rows -> fiscal years and quarters, newest first,
 * with free cash flow, capex intensity, year-over-year changes, and a fourth
 * fiscal quarter derived as the fiscal year less its three reported quarters
 * when the filings give no standalone value for it.
 */
export function buildCapexSeries(rows) {
  const years = new Map();
  const quarters = new Map();
  let rpo = null;
  for (const r of rows || []) {
    const end = String(r.period_end).slice(0, 10);
    if (r.concept === 'rpo') {
      if (!rpo || end > rpo.date) rpo = { date: end, value: Number(r.value) };
      continue;
    }
    if (!FLOW.includes(r.concept)) continue;
    const m = r.period_type === 'annual' ? years : r.period_type === 'quarter' ? quarters : null;
    if (!m) continue;
    const p = m.get(end) || { periodEnd: end, frame: r.frame || null };
    p[r.concept] = Number(r.value);
    m.set(end, p);
  }
  /* Derive a missing fourth fiscal quarter. */
  for (const y of years.values()) {
    if (quarters.has(y.periodEnd)) continue;
    const inside = [...quarters.values()].filter(
      (q) => q.periodEnd < y.periodEnd && daysBetween(q.periodEnd, y.periodEnd) < 300,
    );
    if (inside.length !== 3) continue;
    const d = { periodEnd: y.periodEnd, frame: null, derived: true };
    for (const k of FLOW) {
      if (Number.isFinite(y[k]) && inside.every((q) => Number.isFinite(q[k])))
        d[k] = y[k] - inside.reduce((s, q) => s + q[k], 0);
    }
    if (Number.isFinite(d.revenue)) quarters.set(y.periodEnd, d);
  }
  const shape = (p) => ({
    ...p,
    fcf:
      Number.isFinite(p.operating_cash_flow) && Number.isFinite(p.capex)
        ? p.operating_cash_flow - p.capex
        : null,
    capexToRevenue: Number.isFinite(p.capex) && p.revenue ? p.capex / p.revenue : null,
    capexToOcf:
      Number.isFinite(p.capex) && p.operating_cash_flow ? p.capex / p.operating_cash_flow : null,
  });
  const ys = [...years.values()]
    .filter((p) => Number.isFinite(p.revenue))
    .map(shape)
    .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd));
  ys.forEach((p, i) => {
    const prev = ys[i + 1];
    p.revenueGrowth = prev?.revenue ? p.revenue / prev.revenue - 1 : null;
    p.capexGrowth = Number.isFinite(p.capex) && prev?.capex ? p.capex / prev.capex - 1 : null;
  });
  const qs = [...quarters.values()]
    .filter((p) => Number.isFinite(p.revenue))
    .map(shape)
    .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd));
  for (const q of qs) {
    const ago = qs.find((x) => {
      const d = daysBetween(x.periodEnd, q.periodEnd);
      return x.periodEnd < q.periodEnd && d > 340 && d < 390;
    });
    q.yearAgo = ago ? ago.periodEnd : null;
    q.revenueYoy = ago?.revenue ? q.revenue / ago.revenue - 1 : null;
    q.capexYoy = Number.isFinite(q.capex) && ago?.capex ? q.capex / ago.capex - 1 : null;
    q.ocfYoy =
      Number.isFinite(q.operating_cash_flow) && ago?.operating_cash_flow
        ? q.operating_cash_flow / ago.operating_cash_flow - 1
        : null;
  }
  return { years: ys.slice(0, 6), quarters: qs.slice(0, 12), rpo };
}

const flowLine = (p) => {
  const parts = [`revenue ${usdB(p.revenue)}`];
  if (Number.isFinite(p.operating_income))
    parts.push(`operating income ${usdB(p.operating_income)}`);
  if (Number.isFinite(p.operating_cash_flow))
    parts.push(`operating cash flow ${usdB(p.operating_cash_flow)}`);
  if (Number.isFinite(p.capex))
    parts.push(
      `capital expenditure ${usdB(p.capex)}${p.capexToRevenue != null ? ` (${pct1(p.capexToRevenue)} of revenue)` : ''}`,
    );
  if (p.fcf != null) parts.push(`free cash flow ${usdB(p.fcf)}`);
  if (Number.isFinite(p.depreciation))
    parts.push(`depreciation and amortization ${usdB(p.depreciation)}`);
  return parts.join(', ');
};

export async function capexMonetization({ ticker, name }, { admin }) {
  const t = String(ticker || '').toUpperCase();
  const { data, error } = await admin
    .from('sec_fundamentals')
    .select('concept, period_type, frame, period_end, value')
    .eq('ticker', t)
    .in('concept', [...FLOW, 'rpo'])
    .in('period_type', ['annual', 'quarter', 'instant'])
    .order('period_end', { ascending: false })
    .limit(400);
  if (error || !data?.length) return { items: [] };
  const s = buildCapexSeries(data);
  if (!s.years.length && !s.quarters.length) return { items: [] };
  const label = name || t;
  const items = [];
  const withCapex = s.years.filter((y) => Number.isFinite(y.capex));
  if (withCapex.length) {
    items.push({
      kind: 'aggregate',
      title: `${label} capital expenditure and cash generation by fiscal year`,
      text: `${label} (${t}) by fiscal year, from its SEC filings: ${withCapex
        .map(
          (y) =>
            `fiscal year ended ${y.periodEnd}: ${flowLine(y)}${
              y.capexGrowth != null
                ? `; capital expenditure ${signed(y.capexGrowth)} on the prior year`
                : ''
            }`,
        )
        .join(
          '. ',
        )}. Free cash flow is operating cash flow less capital expenditure. ${CAPEX_NOTE}`,
      date: withCapex[0].periodEnd,
      period: {
        from: withCapex[withCapex.length - 1].periodEnd,
        to: withCapex[0].periodEnd,
        label: `fiscal years ended ${withCapex[withCapex.length - 1].periodEnd} to ${withCapex[0].periodEnd}`,
      },
      data: { metric: 'capex_monetization', ticker: t, years: s.years, quarters: s.quarters },
      entities: [t, label],
    });
  }
  const q = s.quarters.find((x) => Number.isFinite(x.capex)) || s.quarters[0];
  if (q) {
    const yoy = [
      q.revenueYoy != null ? `revenue ${signed(q.revenueYoy)}` : null,
      q.capexYoy != null ? `capital expenditure ${signed(q.capexYoy)}` : null,
      q.ocfYoy != null ? `operating cash flow ${signed(q.ocfYoy)}` : null,
    ].filter(Boolean);
    items.push({
      kind: 'record',
      title: `${label} quarter ended ${q.periodEnd}: capital expenditure and cash flow`,
      text: `${label} (${t}) quarter ended ${q.periodEnd}${q.derived ? ' (fourth fiscal quarter derived as the fiscal year less its three reported quarters)' : ''}: ${flowLine(q)}.${
        yoy.length ? ` Against the quarter ended ${q.yearAgo}: ${yoy.join(', ')}.` : ''
      } ${CAPEX_NOTE}`,
      date: q.periodEnd,
      period: { to: q.periodEnd, label: `quarter ended ${q.periodEnd}` },
      entities: [t, label],
    });
  }
  if (s.rpo?.value) {
    items.push({
      kind: 'record',
      title: `${label} remaining performance obligation, ${s.rpo.date}`,
      text: `${label} (${t}) reported remaining performance obligation of ${usdB(s.rpo.value)} at ${s.rpo.date}: contracted revenue not yet recognized, from its SEC filings.`,
      date: s.rpo.date,
      period: { to: s.rpo.date, label: `at ${s.rpo.date}` },
      entities: [t, label],
    });
  }
  return {
    items,
    layout: { capex: { ticker: t, name: label, years: s.years, quarters: s.quarters, rpo: s.rpo } },
  };
}

/* ── hyperscaler_capex ──────────────────────────────────────────────── */

/**
 * Pure: per hyperscaler, fiscal years with capital expenditure (filings) and
 * the reported cloud line (segments), matched by fiscal year end.
 */
export function buildHyperscalers(fundRows, segmentsByTicker) {
  return HYPERSCALERS.map((h) => {
    const rows = (fundRows || []).filter(
      (r) => String(r.cik) === h.cik && r.period_type === 'annual',
    );
    const by = new Map();
    for (const r of rows) {
      const end = String(r.period_end).slice(0, 10);
      const p = by.get(end) || { periodEnd: end };
      p[r.concept] = Number(r.value);
      by.set(end, p);
    }
    const segs = Array.isArray(segmentsByTicker?.[h.ticker]) ? segmentsByTicker[h.ticker] : [];
    let cloudLabel = null;
    const years = [...by.values()]
      .filter((p) => Number.isFinite(p.capex))
      .sort((a, b) => a.periodEnd.localeCompare(b.periodEnd))
      .map((p) => {
        const seg = segs.find((s) => daysBetween(String(s.date).slice(0, 10), p.periodEnd) <= 10);
        const c = seg ? cloudLine(h.ticker, seg.data) : null;
        if (c) cloudLabel = cloudLabel || c.label;
        return {
          periodEnd: p.periodEnd,
          capex: p.capex,
          revenue: Number.isFinite(p.revenue) ? p.revenue : null,
          cloud: c ? c.value : null,
        };
      })
      .slice(-5);
    return { ticker: h.ticker, name: h.name, cloudLabel, years };
  }).filter((h) => h.years.length);
}

export async function hyperscalerCapex({ ticker }, { admin, ms }) {
  const t = String(ticker || '').toUpperCase();
  if (!isHyperscaler(t)) return { items: [] };
  const [fund, ...segs] = await Promise.all([
    admin
      .from('sec_fundamentals')
      .select('cik, concept, period_type, period_end, value')
      .in(
        'cik',
        HYPERSCALERS.map((h) => h.cik),
      )
      .in('concept', ['capex', 'revenue'])
      .eq('period_type', 'annual')
      .limit(500),
    ...HYPERSCALERS.map((h) =>
      h.cloud
        ? fmp('revenue-product-segmentation', { symbol: h.ticker, period: 'annual' }, ms)
        : Promise.resolve(null),
    ),
  ]);
  const segmentsByTicker = Object.fromEntries(HYPERSCALERS.map((h, i) => [h.ticker, segs[i]]));
  const list = buildHyperscalers(fund?.data || [], segmentsByTicker);
  if (!list.length) return { items: [] };
  const items = list.map((h) => ({
    kind: 'aggregate',
    title: `${h.name} capital expenditure${h.cloudLabel ? ` and ${h.cloudLabel} revenue` : ''} by fiscal year`,
    text: `${h.name} (${h.ticker}) by fiscal year, from its SEC filings${h.cloudLabel ? ` and reported segments` : ''}: ${h.years
      .map(
        (y) =>
          `fiscal year ended ${y.periodEnd}: capital expenditure ${usdB(y.capex)}${
            y.cloud != null ? `, ${h.cloudLabel} revenue ${usdB(y.cloud)}` : ''
          }`,
      )
      .join(
        '; ',
      )}.${h.cloudLabel ? '' : ' No cloud revenue line is reported in its segments.'} ${CAPEX_NOTE}`,
    date: h.years[h.years.length - 1].periodEnd,
    period: {
      from: h.years[0].periodEnd,
      to: h.years[h.years.length - 1].periodEnd,
      label: `fiscal years ended ${h.years[0].periodEnd} to ${h.years[h.years.length - 1].periodEnd}`,
    },
    data: { metric: 'hyperscaler_capex', subject: t, row: h },
    entities: [h.ticker, h.name],
  }));
  return { items, layout: { hyperscalers: { subject: t, companies: list } } };
}

/* ── contracts_profile ──────────────────────────────────────────────── */

/** Pure: company_contract_history rows -> fiscal years, agencies, completeness. */
export function buildContracts(rows, { now = new Date() } = {}) {
  const fy = new Map();
  for (const r of rows || []) {
    const y = Number(r.fiscal_year);
    const p = fy.get(y) || { fy: y, amount: 0, awards: 0, agencies: new Map() };
    const amt = Number(r.total_amount) || 0;
    p.amount += amt;
    p.awards += Number(r.award_count) || 0;
    p.agencies.set(r.awarding_agency, (p.agencies.get(r.awarding_agency) || 0) + amt);
    fy.set(y, p);
  }
  const years = [...fy.values()]
    .sort((a, b) => a.fy - b.fy)
    .map((p) => ({
      fy: p.fy,
      amount: p.amount,
      awards: p.awards,
      complete: contractYearComplete(p.fy, now),
      agencies: [...p.agencies.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([agency, amount]) => ({ agency, amount, share: p.amount ? amount / p.amount : 0 })),
    }));
  if (!years.length) return null;
  const complete = years.filter((y) => y.complete);
  const last = complete[complete.length - 1] || null;
  const prior = complete[complete.length - 2] || null;
  const window = complete.slice(-3);
  const agency = new Map();
  for (const y of window)
    for (const a of y.agencies) agency.set(a.agency, (agency.get(a.agency) || 0) + a.amount);
  const windowTotal = window.reduce((s, y) => s + y.amount, 0);
  return {
    years,
    total: years.reduce((s, y) => s + y.amount, 0),
    awards: years.reduce((s, y) => s + y.awards, 0),
    lastComplete: last?.fy ?? null,
    growth: last && prior?.amount ? last.amount / prior.amount - 1 : null,
    incomplete: years.filter((y) => !y.complete).map((y) => y.fy),
    agencyWindow: window.length
      ? { from: window[0].fy, to: window[window.length - 1].fy, total: windowTotal }
      : null,
    agencies: [...agency.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, amount]) => ({
        agency: name,
        amount,
        share: windowTotal ? amount / windowTotal : 0,
      })),
  };
}

export async function contractsProfile({ ticker, name }, { admin, now = new Date() }) {
  const t = String(ticker || '').toUpperCase();
  const [hist, top] = await Promise.all([
    admin
      .from('company_contract_history')
      .select('fiscal_year, awarding_agency, award_count, total_amount')
      .eq('ticker', t)
      .limit(2000),
    admin
      .from('company_contract_top_awards')
      .select(
        'generated_award_id, recipient_name, awarding_agency, award_amount, action_date, fiscal_year',
      )
      .eq('ticker', t)
      .order('award_amount', { ascending: false })
      .limit(8),
  ]);
  const k = buildContracts(hist?.data || [], { now });
  if (!k) return { items: [] };
  const ids = (top?.data || []).map((a) => a.generated_award_id);
  const facts = ids.length
    ? await admin
        .from('company_contract_award_facts')
        .select(
          'generated_award_id, piid, description, total_obligation, base_and_all_options, awarding_sub_agency, pop_potential_end',
        )
        .in('generated_award_id', ids)
        .limit(ids.length)
    : { data: [] };
  const factBy = new Map((facts?.data || []).map((f) => [f.generated_award_id, f]));
  const awards = (top?.data || []).map((a) => ({
    ...a,
    ...(factBy.get(a.generated_award_id) || {}),
  }));
  const label = name || t;
  const first = k.years[0];
  const lastY = k.years[k.years.length - 1];
  const items = [
    {
      kind: 'aggregate',
      title: `Federal contract obligations to ${label} by fiscal year`,
      text: `Federal contract obligations on prime awards to entities Ezana resolves to ${label} (${t}), by federal fiscal year: ${k.years
        .map(
          (y) =>
            `FY${y.fy} ${usdM(y.amount)} across ${y.awards} awards${y.complete ? '' : ' (incomplete)'}`,
        )
        .join('; ')}.${
        k.growth != null
          ? ` FY${k.lastComplete}, the latest complete year, was ${signed(k.growth)} on FY${k.lastComplete - 1}.`
          : ''
      }${
        k.incomplete.length
          ? ` FY${k.incomplete.join(' and FY')} ${k.incomplete.length > 1 ? 'are' : 'is'} not complete: the Department of Defense publishes contract actions with a 90-day delay, so a year is compared only from the January after it ends.`
          : ''
      } Obligations are what agencies committed on prime awards, not company revenue, and purchases made through resellers or other prime contractors are recorded under those companies.`,
      date: `${lastY.fy}-09-30`,
      period: {
        from: `${first.fy - 1}-10-01`,
        to: `${lastY.fy}-09-30`,
        label: `FY${first.fy} to FY${lastY.fy}`,
      },
      data: { metric: 'contracts_profile', ticker: t, ...k },
      entities: [t, label],
    },
  ];
  if (k.agencyWindow && k.agencies.length) {
    items.push({
      kind: 'aggregate',
      title: `${label} federal contract obligations by agency, FY${k.agencyWindow.from} to FY${k.agencyWindow.to}`,
      text: `By awarding agency, FY${k.agencyWindow.from} to FY${k.agencyWindow.to} (complete years), of ${usdM(k.agencyWindow.total)} obligated to ${label}: ${k.agencies
        .slice(0, 5)
        .map((a) => `${a.agency} ${usdM(a.amount)} (${pct1(a.share)})`)
        .join('; ')}.`,
      date: `${k.agencyWindow.to}-09-30`,
      period: {
        from: `${k.agencyWindow.from - 1}-10-01`,
        to: `${k.agencyWindow.to}-09-30`,
        label: `FY${k.agencyWindow.from} to FY${k.agencyWindow.to}`,
      },
      entities: [t, label, ...k.agencies.slice(0, 3).map((a) => a.agency)],
    });
  }
  for (const a of awards.slice(0, 5)) {
    const ceiling = Number(a.base_and_all_options);
    const obligated = Number(a.total_obligation);
    items.push({
      kind: 'record',
      title: `${a.awarding_agency} award to ${a.recipient_name}, FY${a.fiscal_year}`,
      text: `${a.awarding_agency}${a.awarding_sub_agency ? ` (${a.awarding_sub_agency})` : ''} contract action of ${usdM(a.award_amount)} to ${a.recipient_name} on ${a.action_date} (FY${a.fiscal_year})${a.piid ? `, award ${a.piid}` : ''}${
        Number.isFinite(obligated) && obligated > 0 ? `; ${usdM(obligated)} obligated to date` : ''
      }${Number.isFinite(ceiling) && ceiling > 0 ? `; ceiling with all options ${usdM(ceiling)}, which is a maximum, not money spent` : ''}${
        a.description ? `. Purpose: ${String(a.description).slice(0, 160)}` : ''
      }.`,
      date: String(a.action_date || '').slice(0, 10) || null,
      period: { to: a.action_date, label: `FY${a.fiscal_year}` },
      entities: [t, label, a.awarding_agency],
    });
  }
  return {
    items,
    layout: {
      contractsProfile: {
        ticker: t,
        name: label,
        ...k,
        awards: awards.slice(0, 8).map((a) => ({
          agency: a.awarding_agency,
          subAgency: a.awarding_sub_agency || null,
          recipient: a.recipient_name,
          amount: Number(a.award_amount) || 0,
          obligated: Number(a.total_obligation) || null,
          ceiling: Number(a.base_and_all_options) || null,
          date: a.action_date,
          fy: a.fiscal_year,
          piid: a.piid || null,
          description: a.description || null,
        })),
      },
    },
  };
}

/* ── lobbying_profile ───────────────────────────────────────────────── */

export async function lobbyingProfile({ ticker, name, peers = [] }, { admin, now = new Date() }) {
  const t = String(ticker || '').toUpperCase();
  const tickers = [t, ...peers.map((p) => String(p.ticker || p).toUpperCase())].slice(0, 7);
  const { data: links } = await admin
    .from('lobbying_client_tickers')
    .select('client_name, ticker')
    .in('ticker', tickers)
    .eq('verified', true)
    .limit(200);
  const namesBy = new Map();
  for (const l of links || []) {
    const k = String(l.ticker).toUpperCase();
    namesBy.set(k, [...(namesBy.get(k) || []), l.client_name]);
  }
  if (!namesBy.get(t)?.length) return { items: [] };
  const y = new Date(now).getUTCFullYear();
  const from = y - 5;
  const { data: rows, error } = await admin
    .from('lobbying_filings')
    .select(
      'client_name, registrant_name, filing_year, quarter, filing_period, amount, issues, specific_issues, dt_posted, is_registration',
    )
    .in('client_name', [...namesBy.values()].flat())
    .gte('filing_year', from)
    .limit(4000);
  if (error || !rows?.length) return { items: [] };
  const roll = (k) => {
    const names = new Set((namesBy.get(k) || []).map((n) => String(n).toUpperCase()));
    return rollupLobbying(
      rows.filter((r) => names.has(String(r.client_name).toUpperCase())),
      { from, to: y },
    );
  };
  const me = roll(t);
  if (!me) return { items: [] };
  const label = name || t;
  const peerRows = tickers
    .slice(1)
    .map((k) => ({ ticker: k, r: roll(k) }))
    .filter((p) => p.r);
  const span = `${me.firstYear} to ${me.lastYear}`;
  const items = [
    {
      kind: 'aggregate',
      title: `${label} federal lobbying, ${span}`,
      text: `${label} (${t}) federal lobbying from Senate LDA reports, ${span}: ${me.byYear
        .map((b) => `${b.year} ${usdM(b.amount)}`)
        .join(
          '; ',
        )} (${me.reports} quarterly reports${me.selfFiled ? ' filed by the company itself, which include its outside firms' : ''}). ${
        me.lastYear === y ? `${y} covers the quarters reported so far. ` : ''
      }${
        me.firms.length
          ? `Outside firms retained: ${me.firms
              .slice(0, 5)
              .map((f) => `${f.firm} ${usdM(f.amount)}`)
              .join('; ')}.`
          : ''
      }`,
      date: `${me.lastYear}-12-31`,
      period: { from: `${me.firstYear}-01-01`, to: `${me.lastYear}-12-31`, label: span },
      data: { metric: 'lobbying_profile', ticker: t, ...me },
      entities: [t, label, ...me.firms.slice(0, 3).map((f) => f.firm)],
    },
  ];
  if (me.areas.length) {
    items.push({
      kind: 'aggregate',
      title: `${label} lobbying reports by policy area, ${span}`,
      text: `Of ${label}'s ${me.allReports} lobbying reports, ${span}, the share naming each policy area (by LDA issue code or the issue text): ${me.areas
        .map((a) => `${a.label} ${a.reports} reports (${pct1(a.share)})`)
        .join('; ')}. An issue code shows that a report touched an area, not the position taken.`,
      date: `${me.lastYear}-12-31`,
      period: { from: `${me.firstYear}-01-01`, to: `${me.lastYear}-12-31`, label: span },
      entities: [t, label],
    });
  }
  if (peerRows.length) {
    const lastFull = y - 1;
    const at = (r) => r.byYear.find((b) => b.year === lastFull)?.amount;
    const cmp = [{ ticker: t, r: me }, ...peerRows].filter((p) => at(p.r) != null);
    if (cmp.length > 1) {
      items.push({
        kind: 'aggregate',
        title: `Federal lobbying in ${lastFull}: ${label} and peers`,
        text: `Federal lobbying reported for ${lastFull} (Senate LDA, same counting rules for each company): ${cmp
          .sort((a, b) => at(b.r) - at(a.r))
          .map((p) => `${p.ticker} ${usdM(at(p.r))}`)
          .join('; ')}.`,
        date: `${lastFull}-12-31`,
        period: { from: `${lastFull}-01-01`, to: `${lastFull}-12-31`, label: String(lastFull) },
        entities: cmp.map((p) => p.ticker),
      });
    }
  }
  return {
    items,
    layout: {
      lobbyingProfile: {
        ticker: t,
        name: label,
        ...me,
        peers: peerRows.map((p) => ({
          ticker: p.ticker,
          byYear: p.r.byYear,
          selfFiled: p.r.selfFiled,
        })),
      },
    },
  };
}

/* ── value_chain ────────────────────────────────────────────────────── */

export async function valueChain({ ticker, name }, { admin }) {
  const t = String(ticker || '').toUpperCase();
  const chain = valueChainFor(t);
  if (!chain) return { items: [] };
  const { data: own } = await admin
    .from('competitive_products')
    .select('product, milestone_date, statement, source_url, source_title')
    .eq('company_ticker', t)
    .eq('review_status', 'approved')
    .order('milestone_date', { ascending: false })
    .limit(3);
  const silicon = (own || [])[0] || null;
  const layers = chain.map((l) =>
    l.id === 'semiconductors' && l.subject && silicon
      ? {
          ...l,
          subject: {
            ...l.subject,
            source: {
              title: silicon.source_title,
              url: silicon.source_url,
              date: silicon.milestone_date,
              statement: silicon.statement,
            },
          },
        }
      : l,
  );
  const mine = layers.filter((l) => l.subject);
  const label = name || t;
  const items = [
    {
      kind: 'aggregate',
      title: `${label} in Ezana's AI infrastructure value chain`,
      text: `Ezana's AI infrastructure value chain (an analytical framework, not an exhaustive list) has ${layers.length} layers. ${label} (${t}) operates in ${mine.length} of them: ${mine
        .map(
          (l) =>
            `${l.label}, through ${l.subject.products} (${l.subject.monetization.toLowerCase()})`,
        )
        .join('; ')}. It does not operate in: ${layers
        .filter((l) => !l.subject)
        .map((l) => l.label.toLowerCase())
        .join(', ')}, where it buys rather than sells.`,
      data: { metric: 'value_chain', ticker: t, layers: layers.map((l) => l.id) },
      entities: [t, label],
    },
  ];
  if (silicon) {
    items.push({
      kind: 'record',
      title: `${label} ${silicon.product}`,
      text: `${silicon.statement} (${silicon.source_title}, ${silicon.milestone_date}).`,
      url: silicon.source_url,
      date: silicon.milestone_date,
      period: { to: silicon.milestone_date, label: silicon.milestone_date },
      entities: [t, label, silicon.product],
    });
  }
  return { items, layout: { valueChain: { ticker: t, name: label, layers } } };
}

export const POSITIONING_RUNNERS = {
  capex_monetization: capexMonetization,
  hyperscaler_capex: hyperscalerCapex,
  contracts_profile: contractsProfile,
  lobbying_profile: lobbyingProfile,
  value_chain: valueChain,
};
