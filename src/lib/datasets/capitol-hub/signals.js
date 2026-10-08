/**
 * Capitol Watch hub: the pure half. No React, no database, no imports beyond
 * the EzanaQL templates (themselves import free), so scripts/check-capitol-hub.mjs
 * can run every function on placeholder fixtures.
 *
 *   build*            one HighSignalEvent from one set of linked records
 *   signalStrength    the count of datasets linking an event (never a score)
 *   rankHighSignalEvents / selectEventWindow
 *   matchSignalRule   a reader's rule over the candidate pool
 *   validateRule      the API's check on a rule body
 *   heatmapCell / heatmapGrid / congressPortfolio
 *
 * Values stay raw (numbers, ISO dates); components format them. Headlines are
 * the exception: they are plain English sentences, so their amounts are
 * written out here with usdShort.
 */
import { HUB_QUERIES as Q } from '../hub-queries.js';

/* ── datasets ─────────────────────────────────────────────────────────── */

export const CAPITOL_DATASETS = [
  'Politician Tracker',
  'Government Contracts',
  'Committee Assignments',
  'Lobbying Activity',
  'Campaign Finance Records',
];

/* Datasets from other dimensions a rule can join by ticker. Prediction
   markets have no company join yet, so they render as a preview only. */
export const OUTSIDE_DATASETS = [
  { id: 'Form 4 insiders', join: true },
  { id: '13F institutions', join: true },
  { id: '13D/G whales', join: true },
  { id: 'Prediction markets', join: false },
];
export const JOINABLE_OUTSIDE = OUTSIDE_DATASETS.filter((d) => d.join).map((d) => d.id);
export const RULE_DATASETS = [...CAPITOL_DATASETS, ...JOINABLE_OUTSIDE];

/* Datasets that need a member, so an event built on them is one trade. */
export const MEMBER_DATASETS = [
  'Politician Tracker',
  'Committee Assignments',
  'Campaign Finance Records',
];

export const EVENT_KINDS = {
  trade_before_award: 'Trade before award',
  committee_overlap: 'Committee overlap',
  lobbied_then_won: 'Lobbied, then won',
  insider_same_month: 'Same month as insiders',
  late_filing: 'Late filing',
  user_rule: 'My signals',
};

/**
 * Strength is how many datasets link an event. All Capitol: "N OF 5
 * DATASETS" over five dots. Any outside dataset: "N DATASETS LINKED" over N.
 */
export function signalStrength(linkedDatasets = []) {
  const list = [...new Set(linkedDatasets)];
  const count = list.length;
  const capitolOnly = list.every((d) => CAPITOL_DATASETS.includes(d));
  const total = capitolOnly ? CAPITOL_DATASETS.length : count;
  return {
    count,
    total,
    label: capitolOnly ? `${count} OF ${total} DATASETS` : `${count} DATASETS LINKED`,
    dots: Array.from({ length: total }, (_, i) => i < count),
  };
}

/* ── small helpers ────────────────────────────────────────────────────── */

const DAY = 86400000;
const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
const iso = (v) => (v ? String(v).slice(0, 10) : null);
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);
const up = (s) => (s == null ? null : String(s).trim().toUpperCase());

/** $1.24B, $860M, $15K. For sentences; tables format their own. */
export function usdShort(v) {
  const n = num(v);
  if (n == null) return null;
  const a = Math.abs(n);
  const f = (x, s) => `$${x >= 100 ? Math.round(x) : Number(x.toFixed(x >= 10 ? 1 : 2))}${s}`;
  if (a >= 1e9) return f(n / 1e9, 'B');
  if (a >= 1e6) return f(n / 1e6, 'M');
  if (a >= 1e3) return f(n / 1e3, 'K');
  return `$${Math.round(n)}`;
}

/** "Department of Defense" -> "Defense", for headlines and facts. */
export function agencyShort(name) {
  if (!name) return null;
  return String(name)
    .replace(/^(U\.?S\.?\s+)?Department of (the )?/i, '')
    .replace(/^Office of (the )?/i, '')
    .trim();
}

const sideWord = (side) => (/^s/i.test(side || '') ? 'sold' : 'bought');
const sidePast = (side) => (/^s/i.test(side || '') ? 'Sold' : 'Bought');
const normSide = (side) => (/^s/i.test(side || '') ? 'sell' : 'buy');
const signOf = (v) => (num(v) == null ? undefined : num(v) >= 0 ? 'pos' : 'neg');
const nonEmpty = (list) => list.filter(Boolean);

function memberOf(r) {
  return {
    bioguideId: up(r.bioguideId) || null,
    name: r.member || r.bioguideId || null,
    party: r.party || null,
  };
}

/* ── event builders: one per kind ─────────────────────────────────────── */

/**
 * A member traded a company's stock before a federal contract award to it.
 * @param {object} r  { sourceId, bioguideId, member, party, ticker, company,
 *   side, tradeDate, amountMin, amountMax, awardDate, awardAmount, agency,
 *   daysFromAward, ret30 }
 * @param {object} [ctx]  { committee: { name, sector }, lobbying: { client,
 *   spend, year }, prices: [{ date, close }] }
 */
export function buildTradeBeforeAward(r, ctx = {}) {
  const ticker = up(r.ticker);
  const days = Math.abs(num(r.daysFromAward) ?? daysBetween(r.tradeDate, r.awardDate));
  const award = usdShort(r.awardAmount);
  const agency = agencyShort(r.agency);
  const m = memberOf(r);
  const { committee = null, lobbying = null, prices = [] } = ctx;
  const linked = nonEmpty([
    'Politician Tracker',
    'Government Contracts',
    committee && 'Committee Assignments',
    lobbying && 'Lobbying Activity',
  ]);
  return {
    id: `tba-${r.sourceId || `${m.bioguideId}-${ticker}-${iso(r.tradeDate)}`}`,
    kind: 'trade_before_award',
    flaggedAt: iso(r.awardDate),
    headline: `${m.name} ${sideWord(r.side)} ${ticker} ${days} day${days === 1 ? '' : 's'} before a ${award || 'federal'}${agency ? ` ${agency}` : ''} award`,
    ticker,
    company: r.company || null,
    member: m,
    side: normSide(r.side),
    reasons: nonEmpty([
      {
        dataset: 'Politician Tracker',
        fact: `${sidePast(r.side)} ${ticker}`,
        date: iso(r.tradeDate),
        range: [num(r.amountMin), num(r.amountMax)],
      },
      {
        dataset: 'Government Contracts',
        fact: `${award || 'Contract'} award`,
        date: iso(r.awardDate),
        detail: r.agency || null,
      },
      committee && {
        dataset: 'Committee Assignments',
        fact: committee.name,
        detail: `member oversees ${committee.sector}`,
      },
      lobbying && {
        dataset: 'Lobbying Activity',
        fact: `Lobbied in ${lobbying.year}`,
        detail: lobbying.spend
          ? `${usdShort(lobbying.spend)} reported by ${lobbying.client}`
          : null,
      },
    ]),
    linkedDatasets: linked,
    prices,
    tradeDate: iso(r.tradeDate),
    awardDate: iso(r.awardDate),
    return30d: num(r.ret30),
    measuredFrom: 'trade_date',
    facts: [
      { label: '30D return', value: num(r.ret30), kind: 'signed-pct', sign: signOf(r.ret30) },
      { label: 'Award', value: num(r.awardAmount), kind: 'usd' },
      { label: 'Oversight', value: committee?.name || null, kind: 'text' },
      { label: 'Agency', value: agency, kind: 'text' },
    ],
    sources: nonEmpty([
      'House Clerk',
      'Senate eFD',
      'USAspending.gov',
      committee && 'congress-legislators',
      lobbying && 'Senate LDA',
    ]),
    query: Q.tickerAwards(ticker),
  };
}

/**
 * A member traded in a sector one of their committees oversees.
 * @param {object} r  { bioguideId, member, party, ticker, company, side,
 *   tradeDate, committee, sector, holding: { name, holders, seats, share } }
 * @param {object} [ctx]  { lobbying, award: { date, amount, agency }, prices }
 */
export function buildCommitteeOverlap(r, ctx = {}) {
  const ticker = up(r.ticker);
  const m = memberOf(r);
  const h = r.holding || null;
  const { lobbying = null, award = null, prices = [] } = ctx;
  const headline =
    h && h.holders > 1
      ? `${h.holders} of ${h.seats} ${h.name} members hold ${ticker}, a sector the committee oversees`
      : `${m.name} ${sideWord(r.side)} ${ticker}, in a sector their ${r.committee} seat oversees`;
  return {
    id: `cov-${m.bioguideId}-${ticker}-${iso(r.tradeDate)}`,
    kind: 'committee_overlap',
    flaggedAt: iso(r.tradeDate),
    headline,
    ticker,
    company: r.company || null,
    member: m,
    side: normSide(r.side),
    reasons: nonEmpty([
      {
        dataset: 'Politician Tracker',
        fact: `${m.name} ${sideWord(r.side)} ${ticker}`,
        date: iso(r.tradeDate),
      },
      {
        dataset: 'Committee Assignments',
        fact: r.committee,
        detail: `oversees ${r.sector}${h ? `; ${h.holders} of ${h.seats} members hold ${ticker}` : ''}`,
      },
      award && {
        dataset: 'Government Contracts',
        fact: `${usdShort(award.amount) || 'Contract'} award`,
        date: iso(award.date),
        detail: award.agency || null,
      },
      lobbying && {
        dataset: 'Lobbying Activity',
        fact: `Lobbied in ${lobbying.year}`,
        detail: lobbying.spend
          ? `${usdShort(lobbying.spend)} reported by ${lobbying.client}`
          : null,
      },
    ]),
    linkedDatasets: nonEmpty([
      'Politician Tracker',
      'Committee Assignments',
      award && 'Government Contracts',
      lobbying && 'Lobbying Activity',
    ]),
    prices,
    tradeDate: iso(r.tradeDate),
    awardDate: award ? iso(award.date) : null,
    return30d: null,
    measuredFrom: 'trade_date',
    facts: [
      {
        label: 'Holding',
        value: h ? h.share * 100 : null,
        kind: 'pct',
        of: h ? `${h.holders}/${h.seats}` : null,
      },
      { label: 'Latest trade', value: iso(r.tradeDate), kind: 'date' },
      { label: 'Sector', value: r.sector, kind: 'text' },
      { label: 'Committee', value: r.committee, kind: 'text' },
    ],
    sources: nonEmpty([
      'House Clerk',
      'Senate eFD',
      'congress-legislators',
      award && 'USAspending.gov',
      lobbying && 'Senate LDA',
    ]),
    query: Q.tickerHolders(ticker),
  };
}

/**
 * A company lobbied this year and won federal contracts.
 * @param {object} r  { ticker, company, client, year, spend, awardsN, awardsV,
 *   latestAward: { date, amount, agency } }
 * @param {object} [ctx]  { memberTrade: { bioguideId, member, party, side, date }, prices }
 */
export function buildLobbiedThenWon(r, ctx = {}) {
  const ticker = up(r.ticker);
  const { memberTrade = null, prices = [] } = ctx;
  const latest = r.latestAward || null;
  const name = r.company || ticker;
  return {
    id: `ltw-${ticker}-${r.year}`,
    kind: 'lobbied_then_won',
    flaggedAt: iso(latest?.date) || null,
    headline: `${name} spent ${usdShort(r.spend)} lobbying this year and won ${r.awardsN} award${r.awardsN === 1 ? '' : 's'} worth ${usdShort(r.awardsV)}`,
    ticker,
    company: r.company || null,
    member: memberTrade ? memberOf(memberTrade) : null,
    side: memberTrade ? normSide(memberTrade.side) : null,
    reasons: nonEmpty([
      {
        dataset: 'Lobbying Activity',
        fact: `${usdShort(r.spend)} lobbying`,
        detail: `${r.client || name}, ${r.year}`,
      },
      {
        dataset: 'Government Contracts',
        fact: `${r.awardsN} award${r.awardsN === 1 ? '' : 's'}, ${usdShort(r.awardsV)}`,
        date: iso(latest?.date),
        detail: latest?.agency || null,
      },
      memberTrade && {
        dataset: 'Politician Tracker',
        fact: `${memberTrade.member} ${sideWord(memberTrade.side)} ${ticker}`,
        date: iso(memberTrade.date),
      },
    ]),
    linkedDatasets: nonEmpty([
      'Lobbying Activity',
      'Government Contracts',
      memberTrade && 'Politician Tracker',
    ]),
    prices,
    tradeDate: memberTrade ? iso(memberTrade.date) : null,
    awardDate: iso(latest?.date),
    return30d: null,
    measuredFrom: 'trade_date',
    facts: [
      { label: `Lobbying, ${r.year}`, value: num(r.spend), kind: 'usd' },
      { label: 'Awards, 12M', value: num(r.awardsN), kind: 'int' },
      { label: 'Award value', value: num(r.awardsV), kind: 'usd' },
      { label: 'Latest award', value: iso(latest?.date), kind: 'date' },
    ],
    sources: nonEmpty([
      'Senate LDA',
      'USAspending.gov',
      memberTrade && 'House Clerk',
      memberTrade && 'Senate eFD',
    ]),
    query: Q.tickerAwards(ticker),
  };
}

/**
 * A member and a company insider bought the same stock in the same month.
 * @param {object} r  { ticker, company, bioguideId, member, party, memberDate,
 *   insiderName, insiderTitle, insiderDate, insiderValue }
 */
export function buildInsiderSameMonth(r, ctx = {}) {
  const ticker = up(r.ticker);
  const m = memberOf(r);
  const { prices = [] } = ctx;
  const flagged = [iso(r.memberDate), iso(r.insiderDate)].filter(Boolean).sort().pop() || null;
  const gap =
    r.memberDate && r.insiderDate ? Math.abs(daysBetween(r.memberDate, r.insiderDate)) : null;
  return {
    id: `ism-${m.bioguideId}-${ticker}-${iso(r.memberDate)}`,
    kind: 'insider_same_month',
    flaggedAt: flagged,
    headline: `${m.name} and a ${ticker} insider both bought in the same month`,
    ticker,
    company: r.company || null,
    member: m,
    side: 'buy',
    reasons: [
      {
        dataset: 'Politician Tracker',
        fact: `${m.name} bought ${ticker}`,
        date: iso(r.memberDate),
      },
      {
        dataset: 'Form 4 insiders',
        fact: `${r.insiderName}${r.insiderTitle ? `, ${r.insiderTitle}` : ''} bought`,
        date: iso(r.insiderDate),
        detail: num(r.insiderValue) ? usdShort(r.insiderValue) : null,
      },
    ],
    linkedDatasets: ['Politician Tracker', 'Form 4 insiders'],
    prices,
    tradeDate: iso(r.memberDate),
    awardDate: null,
    return30d: null,
    measuredFrom: 'trade_date',
    facts: [
      { label: 'Member bought', value: iso(r.memberDate), kind: 'date' },
      { label: 'Insider bought', value: iso(r.insiderDate), kind: 'date' },
      { label: 'Insider value', value: num(r.insiderValue), kind: 'usd' },
      { label: 'Days apart', value: gap, kind: 'int' },
    ],
    sources: ['House Clerk', 'Senate eFD', 'SEC EDGAR Form 4'],
    query: Q.memberTicker(m.bioguideId, ticker),
  };
}

/**
 * A member disclosed a trade more than 45 days after making it.
 * @param {object} r  { id, bioguideId, member, party, ticker, company, side,
 *   tradeDate, disclosureDate, amountMin, amountMax }
 */
export function buildLateFiling(r, ctx = {}) {
  const ticker = up(r.ticker);
  const m = memberOf(r);
  const { prices = [] } = ctx;
  const lag = daysBetween(r.tradeDate, r.disclosureDate);
  return {
    id: `late-${r.id || `${m.bioguideId}-${ticker}-${iso(r.tradeDate)}`}`,
    kind: 'late_filing',
    flaggedAt: iso(r.disclosureDate),
    headline: `${m.name} disclosed a ${ticker} ${normSide(r.side) === 'sell' ? 'sale' : 'purchase'} ${lag} days after the trade`,
    ticker,
    company: r.company || null,
    member: m,
    side: normSide(r.side),
    reasons: [
      {
        dataset: 'Politician Tracker',
        fact: `${sidePast(r.side)} ${ticker}, disclosed ${lag} days later`,
        date: iso(r.tradeDate),
        range: [num(r.amountMin), num(r.amountMax)],
        detail: 'the STOCK Act asks for 45 days',
      },
    ],
    linkedDatasets: ['Politician Tracker'],
    prices,
    tradeDate: iso(r.tradeDate),
    awardDate: null,
    return30d: null,
    measuredFrom: 'trade_date',
    facts: [
      { label: 'Days late', value: lag - 45, kind: 'int' },
      { label: 'Traded', value: iso(r.tradeDate), kind: 'date' },
      { label: 'Disclosed', value: iso(r.disclosureDate), kind: 'date' },
      { label: 'Amount', value: [num(r.amountMin), num(r.amountMax)], kind: 'range' },
    ],
    sources: ['House Clerk', 'Senate eFD'],
    query: Q.memberTicker(m.bioguideId, ticker),
  };
}

/* ── ranking and window ───────────────────────────────────────────────── */

/** Linked-dataset count first, then the most recently flagged; one per id. */
export function rankHighSignalEvents(events = []) {
  const seen = new Set();
  const out = [];
  for (const e of events) {
    if (!e?.id || seen.has(e.id)) continue;
    seen.add(e.id);
    out.push(e);
  }
  return out.sort(
    (a, b) =>
      new Set(b.linkedDatasets).size - new Set(a.linkedDatasets).size ||
      String(b.flaggedAt || '').localeCompare(String(a.flaggedAt || '')) ||
      a.id.localeCompare(b.id),
  );
}

/**
 * The last 7 days, or the last 30 when the week has fewer than `min`
 * events. Returns { days, events } with the events ranked.
 */
export function selectEventWindow(events, today, min = 5) {
  const since = (n) => new Date(Date.parse(today) - n * DAY).toISOString().slice(0, 10);
  const within = (n) =>
    events.filter((e) => e.flaggedAt && e.flaggedAt >= since(n) && e.flaggedAt <= today);
  const week = within(7);
  if (week.length >= min) return { days: 7, events: rankHighSignalEvents(week) };
  return { days: 30, events: rankHighSignalEvents(within(30)) };
}

/* ── signal rules ─────────────────────────────────────────────────────── */

export const RULE_WINDOWS = { '30D': 30, '90D': 90, '180D': 180, '12M': 365 };
export const MAX_RULES = 20;

export const TRADER_TYPES = [
  { id: 'politician', label: 'Politicians' },
  { id: 'insider', label: 'Insiders' },
  { id: 'institution', label: 'Institutions' },
  { id: 'whale', label: 'Whales' },
];

const money = (v) => ({ value: v, label: usdShort(v) });

/** The conditions a rule can carry, in the order step 2 lists them. */
export const RULE_CONDITIONS = [
  {
    id: 'trade_within_days',
    label: ['Trade within', 'of an award to the same company'],
    values: [7, 14, 30, 60, 90].map((d) => ({ value: d, label: `${d} DAYS` })),
    default: 30,
    requires: ['Politician Tracker', 'Government Contracts'],
  },
  {
    id: 'award_min',
    label: ['Award of at least', ''],
    values: [10e6, 50e6, 100e6, 500e6, 1e9].map(money),
    default: 100e6,
    requires: ['Government Contracts'],
  },
  {
    id: 'committee_oversees',
    label: ["Member's committee oversees the company's sector", ''],
    values: [{ value: 'any', label: 'ANY' }],
    default: 'any',
    requires: ['Committee Assignments'],
  },
  {
    id: 'trader_types',
    label: ['Traders', ''],
    values: TRADER_TYPES.map((t) => ({ value: t.id, label: t.label.toUpperCase() })),
    multi: true,
    default: TRADER_TYPES.map((t) => t.id),
    requires: [],
  },
  {
    id: 'amount_floor',
    label: ['Trade amount at least', '(disclosed range floor)'],
    values: [1e3, 15e3, 50e3, 100e3].map(money),
    default: 15e3,
    defaultOff: true,
    requires: ['Politician Tracker'],
  },
  {
    id: 'party',
    label: ['Party', ''],
    values: ['any', 'D', 'R', 'I'].map((p) => ({ value: p, label: p === 'any' ? 'ANY' : p })),
    default: 'any',
    defaultOff: true,
    requires: ['Politician Tracker'],
  },
];

const CONDITION = Object.fromEntries(RULE_CONDITIONS.map((c) => [c.id, c]));

/** The starting rule step 2 opens with. */
export function defaultRule() {
  return {
    name: '',
    datasets: ['Politician Tracker', 'Government Contracts', 'Committee Assignments'],
    conditions: RULE_CONDITIONS.map((c) => ({
      id: c.id,
      value: c.default,
      enabled: !c.defaultOff,
    })),
    window: '90D',
    alerts: false,
  };
}

/** Condition ids that apply to a set of datasets. */
export function visibleConditions(datasets = []) {
  return RULE_CONDITIONS.filter((c) => c.requires.every((d) => datasets.includes(d))).map(
    (c) => c.id,
  );
}

/** A suggested name from the datasets and conditions. */
export function suggestRuleName(rule) {
  const ds = rule?.datasets || [];
  const on = (id) => (rule?.conditions || []).find((c) => c.id === id && c.enabled);
  if (ds.includes('Committee Assignments') && ds.includes('Government Contracts'))
    return 'Committee members trading before awards';
  if (ds.includes('Lobbying Activity') && ds.includes('Government Contracts'))
    return 'Lobbied, then won';
  if (ds.includes('Form 4 insiders')) return 'Members and insiders in step';
  if (on('trade_within_days')) return 'Trades near awards';
  return 'My Capitol signal';
}

/**
 * The API's check on a rule body. Returns { ok: true, rule } with a clean
 * rule, or { ok: false, error } with a sentence for the reader.
 */
export function validateRule(input, { requireName = true } = {}) {
  if (!input || typeof input !== 'object') return { ok: false, error: 'Send a rule.' };
  const name = String(input.name ?? '').trim();
  if (requireName && (name.length < 1 || name.length > 80))
    return { ok: false, error: 'Give the rule a name of 1 to 80 characters.' };
  const datasets = [...new Set(Array.isArray(input.datasets) ? input.datasets : [])];
  if (datasets.some((d) => !RULE_DATASETS.includes(d)))
    return { ok: false, error: 'One of those datasets cannot be joined yet.' };
  if (datasets.length < 2) return { ok: false, error: 'Pick at least two datasets.' };
  const window = String(input.window ?? '90D');
  if (!RULE_WINDOWS[window]) return { ok: false, error: 'Pick a window: 30D, 90D, 180D or 12M.' };
  const conditions = [];
  for (const c of Array.isArray(input.conditions) ? input.conditions : []) {
    const def = CONDITION[c?.id];
    if (!def) return { ok: false, error: 'One of those conditions is not supported.' };
    const allowed = def.values.map((v) => v.value);
    const value = def.multi
      ? [...new Set(Array.isArray(c.value) ? c.value : [])].filter((v) => allowed.includes(v))
      : c.value;
    if (def.multi ? !value.length : !allowed.includes(value))
      return { ok: false, error: 'One of the condition values is not on the list.' };
    if (conditions.some((x) => x.id === def.id)) continue;
    conditions.push({ id: def.id, value, enabled: c.enabled !== false });
  }
  return {
    ok: true,
    rule: { name: name.slice(0, 80), datasets, conditions, window, alerts: input.alerts === true },
  };
}

/** Trader types an event candidate carries. */
function traderTypesOf(c) {
  return nonEmpty([
    c.member && 'politician',
    c.insiders?.length && 'insider',
    c.institutions?.length && 'institution',
    c.whales?.length && 'whale',
  ]);
}

/** Datasets a candidate has a record in, given the rule's award test. */
function datasetsOf(c, awardOk) {
  return nonEmpty([
    c.member && 'Politician Tracker',
    awardOk && 'Government Contracts',
    c.oversees && 'Committee Assignments',
    c.lobbying && 'Lobbying Activity',
    c.fec && 'Campaign Finance Records',
    c.insiders?.length && 'Form 4 insiders',
    c.institutions?.length && '13F institutions',
    c.whales?.length && '13D/G whales',
  ]);
}

/**
 * Which candidates a rule matches. A candidate qualifies only when every
 * selected dataset has a record for it and every enabled condition that
 * applies to the selection holds.
 *
 * Candidates (built server side, see pool.js) are one trade by a member, or
 * one company when the rule names no member dataset:
 *   { id, level: 'trade' | 'company', ticker, company, member, side,
 *     tradeDate, amountMin, flaggedAt, awards: [{ date, amount, agency }],
 *     oversees, lobbying, fec, insiders, institutions, whales, ret30 }
 *
 * @returns {{ count: number, matches: object[] }}  matches most recent first,
 *   each with `award`, the qualifying award when the rule tests one.
 */
export function matchSignalRule(rule, pool = [], { today } = {}) {
  const datasets = rule?.datasets || [];
  const visible = visibleConditions(datasets);
  const cond = (id) => {
    const c = (rule?.conditions || []).find((x) => x.id === id);
    return c && c.enabled !== false && visible.includes(id) ? c.value : undefined;
  };
  const level = datasets.some((d) => MEMBER_DATASETS.includes(d)) ? 'trade' : 'company';
  const days = RULE_WINDOWS[rule?.window] || 90;
  const end = today || new Date().toISOString().slice(0, 10);
  const since = new Date(Date.parse(end) - days * DAY).toISOString().slice(0, 10);
  const within = cond('trade_within_days');
  const awardMin = cond('award_min');
  const floor = cond('amount_floor');
  const party = cond('party');
  const types = cond('trader_types');

  const out = [];
  for (const c of pool) {
    if (c.level !== level) continue;
    if (!c.flaggedAt || c.flaggedAt < since || c.flaggedAt > end) continue;
    const awards = (c.awards || []).filter(
      (a) =>
        (awardMin == null || (num(a.amount) ?? 0) >= awardMin) &&
        (within == null || !c.tradeDate || Math.abs(daysBetween(c.tradeDate, a.date)) <= within),
    );
    const award = awards.sort((a, b) => (num(b.amount) ?? 0) - (num(a.amount) ?? 0))[0] || null;
    const has = datasetsOf(c, Boolean(award));
    if (!datasets.every((d) => has.includes(d))) continue;
    if (floor != null && (num(c.amountMin) ?? 0) < floor) continue;
    if (party != null && party !== 'any' && c.member?.party !== party) continue;
    if (Array.isArray(types) && types.length && !traderTypesOf(c).some((t) => types.includes(t)))
      continue;
    out.push({ ...c, award });
  }
  out.sort(
    (a, b) => String(b.flaggedAt).localeCompare(String(a.flaggedAt)) || a.id.localeCompare(b.id),
  );
  return { count: out.length, matches: out };
}

/** One line for a rule match in the preview list. */
export function describeMatch(m) {
  const who = m.member?.name;
  if (m.award && m.tradeDate) {
    const d = daysBetween(m.tradeDate, m.award.date);
    const when = d >= 0 ? `${d} days before` : `${-d} days after`;
    return `${who} ${sideWord(m.side)} ${when} ${usdShort(m.award.amount)} ${agencyShort(m.award.agency) || ''} award`
      .replace(/\s+/g, ' ')
      .trim();
  }
  if (who) {
    const extra = m.oversees ? `, oversees ${m.oversees.sector}` : '';
    return `${who} ${sideWord(m.side)} ${m.ticker}${extra}`;
  }
  if (m.award)
    return `${usdShort(m.award.amount)} ${agencyShort(m.award.agency) || ''} award`.trim();
  return `${m.company || m.ticker}`;
}

/** A rule match as a carousel event (kind user_rule). */
export function buildRuleEvent(m, rule) {
  const reasons = nonEmpty([
    m.member && {
      dataset: 'Politician Tracker',
      fact: `${m.member.name} ${sideWord(m.side)} ${m.ticker}`,
      date: iso(m.tradeDate),
      range: [num(m.amountMin), num(m.amountMax)],
    },
    m.award && {
      dataset: 'Government Contracts',
      fact: `${usdShort(m.award.amount)} award`,
      date: iso(m.award.date),
      detail: m.award.agency || null,
    },
    m.oversees && {
      dataset: 'Committee Assignments',
      fact: m.oversees.committee,
      detail: `oversees ${m.oversees.sector}`,
    },
    m.lobbying && {
      dataset: 'Lobbying Activity',
      fact: `Lobbied in ${m.lobbying.year}`,
      detail: m.lobbying.client,
    },
    m.fec && {
      dataset: 'Campaign Finance Records',
      fact: `Raised ${usdShort(m.fec.receipts)} this cycle`,
    },
    m.insiders?.length && {
      dataset: 'Form 4 insiders',
      fact: `${m.insiders.length} insider trade${m.insiders.length === 1 ? '' : 's'} in ${m.ticker}`,
      date: iso(m.insiders[0].date),
    },
    m.institutions?.length && {
      dataset: '13F institutions',
      fact: `${m.institutions.length} fund filing${m.institutions.length === 1 ? '' : 's'} in ${m.ticker}`,
      date: iso(m.institutions[0].date),
    },
    m.whales?.length && {
      dataset: '13D/G whales',
      fact: `${m.whales.length} activist stake${m.whales.length === 1 ? '' : 's'} in ${m.ticker}`,
      date: iso(m.whales[0].date),
    },
  ]).filter((r) => (rule?.datasets || []).includes(r.dataset));
  return {
    id: `rule-${rule?.id || 'preview'}-${m.id}`,
    kind: 'user_rule',
    ruleId: rule?.id || null,
    flaggedAt: m.flaggedAt,
    headline: `${rule?.name ? `${rule.name}: ` : ''}${describeMatch(m)}`,
    ticker: m.ticker,
    company: m.company || null,
    member: m.member || null,
    side: m.side || null,
    reasons,
    linkedDatasets: reasons.map((r) => r.dataset),
    prices: [],
    tradeDate: iso(m.tradeDate),
    awardDate: iso(m.award?.date),
    return30d: num(m.ret30),
    measuredFrom: m.member ? 'trade_date' : 'filing_date',
    facts: [
      { label: '30D return', value: num(m.ret30), kind: 'signed-pct', sign: signOf(m.ret30) },
      { label: 'Award', value: num(m.award?.amount), kind: 'usd' },
      { label: 'Traded', value: iso(m.tradeDate), kind: 'date' },
      { label: 'Agency', value: agencyShort(m.award?.agency), kind: 'text' },
    ],
    sources: nonEmpty([
      m.member && 'House Clerk',
      m.member && 'Senate eFD',
      m.award && 'USAspending.gov',
      m.oversees && 'congress-legislators',
      m.lobbying && 'Senate LDA',
      m.fec && 'FEC',
      (m.insiders?.length || m.institutions?.length || m.whales?.length) && 'SEC EDGAR',
    ]),
    query: m.member?.bioguideId
      ? Q.memberTicker(m.member.bioguideId, m.ticker)
      : Q.tickerAwards(m.ticker),
  };
}

/* ── heatmap ──────────────────────────────────────────────────────────── */

/** GICS sector -> the short head the heatmap prints. */
export const SECTOR_SHORT = {
  'Information Technology': 'Tech',
  'Health Care': 'Health',
  Financials: 'Finance',
  'Consumer Discretionary': 'Consumer',
  'Consumer Staples': 'Staples',
  'Communication Services': 'Comms',
  Industrials: 'Industrials',
  Energy: 'Energy',
  Utilities: 'Utilities',
  'Real Estate': 'Real estate',
  Materials: 'Materials',
};

/**
 * One heatmap cell from one committee-by-sector row.
 * @param {object} r  { committee_thomas_id, committee, chamber, sector, seats,
 *   holders, share_pct, holder_rows }
 * @param {(name: string) => string} [shortName]
 */
export function heatmapCell(r, shortName = (s) => s) {
  const seats = num(r.seats) || 0;
  const holders = num(r.holders) || 0;
  const rows = Array.isArray(r.holder_rows) ? r.holder_rows : [];
  return {
    committeeId: r.committee_thomas_id,
    committee: shortName(r.committee),
    chamber: r.chamber,
    sector: r.sector,
    share: seats ? holders / seats : 0,
    holders,
    members: seats,
    holderRows: rows
      .map((h) => ({
        bioguideId: up(h.bioguideId),
        member: h.member,
        party: h.party || null,
        tickers: (h.tickers || []).map(up),
        lastTrade: iso(h.lastTrade),
      }))
      .sort((a, b) => String(b.lastTrade || '').localeCompare(String(a.lastTrade || ''))),
  };
}

/**
 * The grid: the `committees` committees with the highest top share, by the
 * `sectors` sectors with the most holders. Cells missing from the rows are
 * zero. `selected` is the highest-share cell.
 */
export function heatmapGrid(rows = [], { committees = 8, sectors = 7, shortName } = {}) {
  const cells = rows.map((r) => heatmapCell(r, shortName));
  const top = new Map();
  const bySector = new Map();
  for (const c of cells) {
    const t = top.get(c.committeeId);
    if (!t || c.share > t.share)
      top.set(c.committeeId, {
        id: c.committeeId,
        name: c.committee,
        share: c.share,
        seats: c.members,
      });
    bySector.set(c.sector, (bySector.get(c.sector) || 0) + c.holders);
  }
  const cs = [...top.values()]
    .sort((a, b) => b.share - a.share || a.name.localeCompare(b.name))
    .slice(0, committees);
  const ss = [...bySector.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, sectors)
    .map(([s]) => s);
  const at = new Map(cells.map((c) => [`${c.committeeId}|${c.sector}`, c]));
  const grid = cs.map((c) =>
    ss.map(
      (s) =>
        at.get(`${c.id}|${s}`) || {
          committeeId: c.id,
          committee: c.name,
          chamber: null,
          sector: s,
          share: 0,
          holders: 0,
          members: c.seats,
          holderRows: [],
        },
    ),
  );
  let max = 0;
  let selected = null;
  grid.forEach((row, i) =>
    row.forEach((cell, j) => {
      if (cell.share > max) {
        max = cell.share;
        selected = [i, j];
      }
    }),
  );
  return { committees: cs, sectors: ss, grid, max, selected };
}

/** Cell shade, 0.06 at zero to 0.86 at the grid's highest share. */
export function heatAlpha(share, max) {
  if (!max || !share) return 0.06;
  return Math.round((0.06 + (share / max) * 0.8) * 100) / 100;
}

/* ── Congress's portfolio ─────────────────────────────────────────────── */

/**
 * The most widely held stocks, from portfolio rows. Ranges are sums of each
 * holder's disclosed purchase ranges, so they are estimates.
 * @returns {{ rows: { rank, ticker, members, estLow, estHigh, sector }[], maxMembers }}
 */
export function congressPortfolio(rows = [], limit = 16) {
  const out = rows
    .map((r) => ({
      ticker: up(r.ticker),
      members: num(r.members) || 0,
      estLow: num(r.est_low ?? r.estLow),
      estHigh: num(r.est_high ?? r.estHigh),
      sector: r.sector || null,
    }))
    .filter((r) => r.ticker && r.members > 0)
    .sort(
      (a, b) =>
        b.members - a.members ||
        (b.estHigh ?? 0) - (a.estHigh ?? 0) ||
        a.ticker.localeCompare(b.ticker),
    )
    .slice(0, limit)
    .map((r, i) => ({ rank: i + 1, ...r }));
  return { rows: out, maxMembers: out.reduce((m, r) => Math.max(m, r.members), 0) };
}
