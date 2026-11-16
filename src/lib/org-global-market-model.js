/**
 * Council view of Global Market Analysis (/market-analysis): the pure model.
 *
 * Council members see the retail terminal unchanged plus a third view,
 * Council, built here from their council's own records: the position book,
 * sector teams, sector coverage and stored policy rules (the same fund part
 * US Equities reads, GET /api/org/company-research), plus the fund snapshot
 * series, the council's research with no single ticker, upcoming meetings
 * and the council's standing on Council Rankings (GET /api/org/market-analysis).
 * The live routes and the sample bundles hand over the same raw shapes, so
 * one set of functions draws both.
 *
 * Honesty rules:
 * - An event is matched to a sector team by its topic and the team's sector
 *   only. Holdings carry no country, currency or asset class, and no event
 *   is linked to a ticker, so the page says "sector match" and never
 *   estimates an impact.
 * - The policy check is descriptive: stored limits read against the book,
 *   never a block or advice. A sleeve warning appears only against a real
 *   stored sector cap.
 * - Council versus council shows the stored rating and tier only.
 * - A missing figure is N/A.
 *
 * Pure: no React, no fetch, no server imports.
 */
import { NA, fmtDate, fmtSignedPct, fundTotals, sleevesOf } from './org-company-research-model.js';
import {
  evaluateHoldings,
  ruleLabel,
  ruleReading,
  sectorCap,
  STATUS_TEXT,
} from './org-compliance-model.js';
import { nextMeeting } from './org-meetings-model.js';
import { ownStanding, rankRows, tierLabel } from './council-rankings-model.js';

export { NA };
const DAY = 86400000;
const finite = (v) => v != null && v !== '' && Number.isFinite(Number(v));
const lower = (s) =>
  String(s || '')
    .toLowerCase()
    .trim();

/* ── Sectors ────────────────────────────────────────────────────────────── */

/* The eleven GICS sectors and the sector fund that tracks each. */
export const SECTOR_FUND = {
  'Information Technology': 'XLK',
  Financials: 'XLF',
  'Health Care': 'XLV',
  Industrials: 'XLI',
  Energy: 'XLE',
  Materials: 'XLB',
  Utilities: 'XLU',
  'Real Estate': 'XLRE',
  'Consumer Discretionary': 'XLY',
  'Consumer Staples': 'XLP',
  'Communication Services': 'XLC',
};
export const GICS = Object.keys(SECTOR_FUND);

/* Words a team name or a stored sector uses, to the GICS sector. The book
   stores the council's own sector words (Banks, Semiconductors, ...). */
const SECTOR_WORDS = [
  [
    'Information Technology',
    /\b(tech|technology|information technology|semiconductors?|software|hardware|it)\b/,
  ],
  [
    'Financials',
    /\b(financials?|banks?|banking|brokerage|insurance|asset management|capital markets|fintech)\b/,
  ],
  [
    'Health Care',
    /\b(health ?care|healthcare|pharma\w*|biotech\w*|medical|managed care|life sciences)\b/,
  ],
  [
    'Industrials',
    /\b(industrials?|aerospace|defen[cs]e|machinery|conglomerates?|transport\w*|airlines?|railroads?)\b/,
  ],
  ['Energy', /\b(energy|oil|gas|exploration|refining)\b/],
  ['Materials', /\b(materials|chemicals|metals|mining|steel)\b/],
  ['Utilities', /\b(utilities|utility)\b/],
  ['Real Estate', /\b(real estate|reits?)\b/],
  [
    'Consumer Discretionary',
    /\b(consumer discretionary|discretionary|retail|autos?|automobiles?|leisure|restaurants?)\b/,
  ],
  ['Consumer Staples', /\b(consumer staples|staples|beverages?|food|household)\b/],
  ['Communication Services', /\b(communication services|communications|media|telecom\w*)\b/],
];

/** A team name or stored sector to its GICS sector, or null. */
export function gicsOf(text) {
  const t = lower(text);
  if (!t) return null;
  for (const [g, re] of SECTOR_WORDS) if (re.test(t)) return g;
  return null;
}

/* ── Event topics ───────────────────────────────────────────────────────── */

/*
 * Topic rules, checked in order on an event's title (and its stored topic
 * when there is one). Each topic lists the sectors it is conventionally
 * read against. This is a sector match, not a sensitivity estimate.
 */
export const TOPICS = [
  {
    key: 'rates',
    label: 'Rates and central banks',
    re: /\b(fed|fomc|federal reserve|rate (decision|cut|hike)s?|interest rates?|ecb|bank of england|boe|bank of japan|boj|central bank|treasury yields?|bond yields?|powell|lagarde)\b/,
    sectors: ['Financials', 'Real Estate', 'Utilities'],
  },
  {
    key: 'inflation',
    label: 'Inflation',
    re: /\b(cpi|ppi|pce|inflation|consumer prices|producer prices)\b/,
    sectors: ['Financials', 'Consumer Staples', 'Consumer Discretionary'],
  },
  {
    key: 'energy',
    label: 'Oil and energy',
    re: /\b(oil|crude|brent|wti|opec\+?|natural gas|lng|gasoline|refiner\w*)\b/,
    sectors: ['Energy', 'Industrials', 'Materials'],
  },
  {
    key: 'metals',
    label: 'Metals and materials',
    re: /\b(copper|gold|silver|aluminum|aluminium|steel|iron ore|lithium)\b/,
    sectors: ['Materials'],
  },
  {
    key: 'industry',
    label: 'Industrial activity',
    re: /\b(pmi|ism|industrial production|manufacturing|factory orders?|durable goods)\b/,
    sectors: ['Industrials', 'Materials'],
  },
  {
    key: 'labour',
    label: 'Labour market',
    re: /\b(payrolls?|nonfarm|non-farm|jobless|unemployment|jobs report|employment)\b/,
    sectors: ['Consumer Discretionary', 'Financials'],
  },
  {
    key: 'consumer',
    label: 'Consumer demand',
    re: /\b(retail sales|consumer (confidence|sentiment|spending|credit))\b/,
    sectors: ['Consumer Discretionary', 'Consumer Staples'],
  },
  {
    key: 'housing',
    label: 'Housing',
    re: /\b(housing|home sales|housing starts|mortgages?|building permits)\b/,
    sectors: ['Real Estate', 'Financials'],
  },
  {
    key: 'health',
    label: 'Health policy',
    re: /\b(fda|drug pricing|medicare|medicaid|pharma\w*|biotech\w*|health ?care)\b/,
    sectors: ['Health Care'],
  },
  {
    key: 'tech',
    label: 'Technology and chips',
    re: /\b(chips?|chipmakers?|semiconductors?|export controls?|artificial intelligence|ai)\b/,
    sectors: ['Information Technology', 'Communication Services'],
  },
  {
    key: 'trade',
    label: 'Trade and tariffs',
    re: /\b(tariffs?|trade (war|deal|balance|deficit)|exports?|imports?)\b/,
    sectors: ['Industrials', 'Materials', 'Information Technology'],
  },
  {
    key: 'credit',
    label: 'Banks and credit',
    re: /\b(banks?|lenders?|credit|loans?|deposits?)\b/,
    sectors: ['Financials'],
  },
  {
    key: 'growth',
    label: 'Growth',
    re: /\b(gdp|recession|economic growth)\b/,
    sectors: ['Industrials', 'Consumer Discretionary'],
  },
];

/** The first topic an event's title (or stored topic) names, or null. */
export function topicOf(event) {
  const text = lower(`${event?.title || ''} ${event?.topic || ''}`);
  if (!text) return null;
  return TOPICS.find((t) => t.re.test(text)) || null;
}

/* ── Teams ──────────────────────────────────────────────────────────────── */

function names(raw) {
  const byId = new Map();
  for (const m of raw?.members || []) if (m.id) byId.set(m.id, m.display_name || null);
  return (id) => (id && byId.get(id)) || null;
}

/**
 * The council's sector teams: GICS sector (from the team name, else its
 * holdings), the stored sectors of its holdings, its tickers and owners
 * (members with stored coverage of one of those sectors, primary first).
 */
export function councilTeams(raw) {
  const memberName = names(raw);
  const positions = raw?.positions || [];
  const coverage = raw?.coverage || [];
  return (raw?.teams || []).map((t) => {
    const held = positions.filter((p) => p.team_id === t.id);
    const stored = [...new Set(held.map((p) => p.sector).filter(Boolean))];
    let gics = gicsOf(t.name);
    if (!gics) {
      const counts = new Map();
      for (const s of stored) {
        const g = gicsOf(s);
        if (g) counts.set(g, (counts.get(g) || 0) + 1);
      }
      gics = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    }
    const covers = (sector) => {
      const s = lower(sector);
      return (
        stored.some((x) => lower(x) === s) ||
        (gics && gicsOf(sector) === gics) ||
        lower(t.name) === s
      );
    };
    const owners = [];
    for (const c of [...coverage].sort(
      (a, b) => Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary)),
    )) {
      if (!c.sector || !covers(c.sector)) continue;
      const n = memberName(c.member_id);
      if (n && !owners.includes(n)) owners.push(n);
    }
    return {
      id: t.id,
      name: t.name,
      gics,
      stored,
      tickers: held.map((p) => String(p.ticker || '').toUpperCase()).filter(Boolean),
      owners,
    };
  });
}

/* ── This week's events matched to sector teams ─────────────────────────── */

const IMPACT_ORDER = { CRITICAL: 0, ELEVATED: 1, MODERATE: 2 };

/**
 * Events from the last seven days (and any dated ahead) whose topic names a
 * sector one of the council's teams covers. One row per event title.
 */
export function matchEvents(events, raw, { now = Date.now(), limit = 8 } = {}) {
  const teams = councilTeams(raw).filter((t) => t.gics);
  if (!teams.length) return [];
  const seen = new Set();
  const rows = [];
  for (const e of events || []) {
    const title = String(e?.title || '').trim();
    if (!title || seen.has(lower(title))) continue;
    const at = new Date(e.time).getTime();
    if (Number.isFinite(at) && at < now - 7 * DAY) continue;
    const topic = topicOf(e);
    if (!topic) continue;
    const matched = teams.filter((t) => topic.sectors.includes(t.gics));
    if (!matched.length) continue;
    seen.add(lower(title));
    rows.push({
      id: e.id || title,
      event: e,
      title,
      time: Number.isFinite(at) ? new Date(at).toISOString() : null,
      impact: e.impact || null,
      topic: topic.label,
      teams: matched.map((t) => ({ id: t.id, name: t.name, owners: t.owners })),
    });
  }
  return rows
    .sort(
      (a, b) =>
        (IMPACT_ORDER[a.impact] ?? 3) - (IMPACT_ORDER[b.impact] ?? 3) ||
        (new Date(b.time).getTime() || 0) - (new Date(a.time).getTime() || 0),
    )
    .slice(0, limit);
}

/* ── Sleeves beside sector moves ────────────────────────────────────────── */

/**
 * One row per sector team: weight of the fund, tickers, the GICS sector fund
 * that tracks it (its day move comes from the page's delayed quotes) and a
 * warning only when a stored sector inside the sleeve is near or over a
 * real stored sector cap.
 */
export function sleeveRows(raw) {
  const positions = raw?.positions || [];
  const { value: total } = fundTotals(positions);
  const cap = sectorCap(raw?.rules || []);
  const sectorValue = {};
  for (const p of positions)
    if (p.sector) sectorValue[p.sector] = (sectorValue[p.sector] || 0) + (Number(p.value) || 0);
  const teams = new Map(councilTeams(raw).map((t) => [t.id, t]));
  return sleevesOf(raw).map((s) => {
    const team = s.teamId ? teams.get(s.teamId) : null;
    let capNote = null;
    if (cap != null && total > 0 && team) {
      const worst = team.stored
        .map((sec) => ({ sec, pct: ((sectorValue[sec] || 0) / total) * 100 }))
        .sort((a, b) => b.pct - a.pct)[0];
      if (worst && worst.pct > cap * 0.9) {
        capNote = {
          over: worst.pct > cap,
          text: `${worst.sec} ${worst.pct.toFixed(1)}% of fund, ${worst.pct > cap ? 'over' : 'near'} the ${cap}% sector cap`,
        };
      }
    }
    return {
      teamId: s.teamId,
      name: s.name,
      weightPct: s.weightPct,
      count: s.count,
      unpriced: s.unpriced,
      tickers: team ? team.tickers : [],
      gics: team?.gics || null,
      fund: team?.gics ? SECTOR_FUND[team.gics] : null,
      capNote,
    };
  });
}

/** Sector funds the sleeve table asks quotes for. */
export const sleeveFunds = (rows) => [...new Set((rows || []).map((r) => r.fund).filter(Boolean))];

/* The page's delayed index strip, picked down to the moves worth showing. */
const MOVE_KEYS = ['S&P 500', 'NASDAQ', 'DOW', 'RUSSELL 2K', 'VIX', 'OIL WTI', 'BRENT', 'GOLD'];
export function marketMoves(tickerData) {
  const by = new Map((tickerData || []).map((q) => [String(q.symbol || '').toUpperCase(), q]));
  return MOVE_KEYS.map((k) => by.get(k))
    .filter((q) => q && q.price && q.price !== '–' && finite(q.change))
    .map((q) => ({ name: q.symbol, price: q.price, change: Number(q.change) }));
}

/* ── Policy and exposure check (descriptive) ────────────────────────────── */

const STATUS_TONE = {
  within: 'up',
  near: 'warn',
  over: 'down',
  below: 'warn',
  held: 'down',
  na: 'na',
  recorded: 'na',
};

/** One row per active stored rule, read against the book; never a block. */
export function policyCheck(raw) {
  const positions = (raw?.positions || []).map((p) => ({
    ticker_symbol: p.ticker,
    current_value: Number(p.value) || 0,
    sector: p.sector || null,
  }));
  const rules = (raw?.rules || []).filter((r) => r.is_active !== false);
  const holdings = positions.length ? evaluateHoldings({ rules, positions }) : null;
  const rows = rules.map((rule) => {
    const r = ruleReading(rule, holdings);
    return {
      id: rule.id,
      label: ruleLabel(rule),
      reading: r.reading,
      mono: Boolean(r.mono),
      status: STATUS_TEXT[r.status] || NA,
      tone: STATUS_TONE[r.status] || 'na',
    };
  });
  const unpriced = (raw?.positions || [])
    .filter((p) => !p.priced)
    .map((p) => String(p.ticker || '').toUpperCase());
  return { rows, unpriced, ruleCount: rules.length };
}

/* ── Fund against benchmark ─────────────────────────────────────────────── */

export const RANGES = ['1M', '3M', 'YTD', '1Y', 'ALL'];

function rangeStart(range, last) {
  const d = new Date(last);
  if (range === '1M') return last - 31 * DAY;
  if (range === '3M') return last - 92 * DAY;
  if (range === '1Y') return last - 366 * DAY;
  if (range === 'YTD') return Date.UTC(d.getUTCFullYear(), 0, 1);
  return -Infinity;
}

/**
 * Snapshot rows ({ date, value, cost, benchmarkPct }) to two return series
 * rebased to 0% at the start of the range. Fund return is value over cost;
 * the benchmark is the stored cumulative benchmark return. null when fewer
 * than two snapshots fall in the range.
 */
export function returnSeries(snapshots, range = 'ALL') {
  const rows = (snapshots || [])
    .map((s) => ({
      t: new Date(s.date).getTime(),
      date: s.date,
      fund: finite(s.value) && finite(s.cost) && Number(s.cost) > 0 ? s.value / s.cost : null,
      bench: finite(s.benchmarkPct) ? 1 + Number(s.benchmarkPct) / 100 : null,
    }))
    .filter((r) => Number.isFinite(r.t) && r.fund != null)
    .sort((a, b) => a.t - b.t);
  if (rows.length < 2) return null;
  const from = rangeStart(range, rows[rows.length - 1].t);
  const inRange = rows.filter((r) => r.t >= from);
  if (inRange.length < 2) return null;
  const f0 = inRange[0].fund;
  const b0 = inRange.find((r) => r.bench != null)?.bench ?? null;
  const points = inRange.map((r) => ({
    t: r.t,
    date: r.date,
    fund: (r.fund / f0 - 1) * 100,
    bench: b0 != null && r.bench != null ? (r.bench / b0 - 1) * 100 : null,
  }));
  const last = points[points.length - 1];
  const hasBench = points.some((p) => p.bench != null);
  return {
    points,
    fundPct: last.fund,
    benchPct: hasBench ? last.bench : null,
    alphaPct: hasBench && last.bench != null ? last.fund - last.bench : null,
    hasBench,
    from: points[0].date,
    to: last.date,
  };
}

const niceStep = (span) => {
  const raw = span / 4;
  const mag = 10 ** Math.floor(Math.log10(raw || 1));
  const n = raw / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
};

/** SVG geometry for the return chart. */
export function chartGeometry(series, { width = 800, height = 240 } = {}) {
  if (!series) return null;
  const left = 52;
  const right = 8;
  const top = 10;
  const bottom = 26;
  const plotW = Math.max(40, width - left - right);
  const plotH = Math.max(40, height - top - bottom);
  const vals = series.points.flatMap((p) => [p.fund, p.bench]).filter((v) => v != null);
  let lo = Math.min(0, ...vals);
  let hi = Math.max(0, ...vals);
  if (hi - lo < 1) hi = lo + 1;
  const step = niceStep(hi - lo);
  lo = Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;
  const t0 = series.points[0].t;
  const t1 = series.points[series.points.length - 1].t;
  const x = (t) => left + ((t - t0) / Math.max(1, t1 - t0)) * plotW;
  const y = (v) => top + (1 - (v - lo) / (hi - lo)) * plotH;
  const path = (key) => {
    let d = '';
    let pen = false;
    for (const p of series.points) {
      if (p[key] == null) {
        pen = false;
        continue;
      }
      d += `${pen ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p[key]).toFixed(1)}`;
      pen = true;
    }
    return d;
  };
  const line = path('fund');
  const baseY = y(Math.max(lo, Math.min(0, hi)));
  const firstX = x(t0).toFixed(1);
  const lastX = x(t1).toFixed(1);
  const area = `${line}L${lastX},${baseY.toFixed(1)}L${firstX},${baseY.toFixed(1)}Z`;
  const yTicks = [];
  for (let v = lo; v <= hi + step / 2; v += step) {
    yTicks.push({ y: y(v), label: fmtSignedPct(v, 0), zero: Math.abs(v) < step / 2 });
  }
  const spanDays = (t1 - t0) / DAY;
  const fmtX = (t) =>
    new Date(t).toLocaleDateString('en-US', {
      month: 'short',
      ...(spanDays < 120 ? { day: 'numeric' } : { year: 'numeric' }),
      timeZone: 'UTC',
    });
  const count = width < 480 ? 3 : 5;
  const xTicks = Array.from({ length: count }, (_, i) => {
    const t = t0 + ((t1 - t0) * i) / (count - 1);
    return {
      x: x(t),
      label: fmtX(t),
      anchor: i === 0 ? 'start' : i === count - 1 ? 'end' : 'middle',
    };
  });
  return {
    W: width,
    H: height,
    left,
    top,
    plotW,
    baseY,
    line,
    area,
    bench: series.hasBench ? path('bench') : null,
    yTicks,
    xTicks,
    xOf: x,
    yOf: y,
  };
}

/* ── Council research with no single ticker ─────────────────────────────── */

const MACRO_TAG =
  /\b(macro|rates?|inflation|fed|central bank|oil|energy|commodit\w*|fx|currency|dollar|gdp|recession|policy|outlook|tariffs?|trade)\b/;

const DOC_LABEL = {
  note: 'Note',
  pitch_memo: 'Pitch memo',
  model: 'Model',
  primer: 'Primer',
  post_mortem: 'Post-mortem',
  ic_minutes: 'IC minutes',
  reading: 'Reading',
  external: 'External',
};
export const docLabel = (t) => DOC_LABEL[t] || (t ? String(t).replace(/_/g, ' ') : 'Document');

const STATUS_LABEL = {
  draft: ['Draft', 'muted'],
  in_review: ['In review', 'warn'],
  review: ['In review', 'warn'],
  submitted: ['In review', 'warn'],
  published: ['Published', 'up'],
  approved: ['Published', 'up'],
  archived: ['Archived', 'muted'],
};

/**
 * Documents with no single ticker, or tagged with a macro word, newest first.
 * Drafts only reach their author or a manager, as in the Research Library.
 */
export function macroResearch(notes, { members = [], viewer = null, limit = 6 } = {}) {
  const byUser = new Map((members || []).map((m) => [m.user_id, m.display_name]));
  const isManager = ['executive', 'portfolio_manager'].includes(viewer?.role);
  return (notes || [])
    .filter((n) => {
      if (n.status === 'archived') return false;
      if (n.status === 'draft' && n.author_id !== viewer?.userId && !isManager) return false;
      const tags = Array.isArray(n.tags) ? n.tags.join(' ') : '';
      return !n.ticker || MACRO_TAG.test(lower(tags));
    })
    .sort(
      (a, b) => new Date(b.published_at || b.created_at) - new Date(a.published_at || a.created_at),
    )
    .slice(0, limit)
    .map((n) => {
      const [status, tone] = STATUS_LABEL[n.status] || [n.status ? String(n.status) : NA, 'muted'];
      return {
        id: n.id,
        title: n.title || 'Untitled',
        kind: docLabel(n.doc_type),
        sector: n.sector || null,
        author: byUser.get(n.author_id) || n.author_name || 'Former member',
        status,
        tone,
        date: n.published_at || n.created_at,
      };
    });
}

/* ── Meetings ───────────────────────────────────────────────────────────── */

/** Upcoming meetings, soonest first, and the next one. */
export function upcoming(meetings, now = Date.now()) {
  const list = (meetings || [])
    .filter(
      (m) => m.status !== 'closed' && m.scheduled_at && new Date(m.scheduled_at).getTime() >= now,
    )
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
  return { list, next: nextMeeting(meetings, now) };
}

/** Thu, Nov 19 */
export function fmtMeetingDay(iso) {
  if (!iso) return NA;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return NA;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/* Agenda item kinds the meetings route stores, with the page's words. */
export const AGENDA_KINDS = [
  { key: 'discussion', label: 'Discussion' },
  { key: 'review', label: 'Review' },
  { key: 'update', label: 'Update' },
  { key: 'vote', label: 'Vote' },
];
export const agendaKindLabel = (k) => AGENDA_KINDS.find((x) => x.key === k)?.label || NA;

/** A drafted agenda item for an event row. */
export function agendaDraft(row) {
  return {
    key: `ev-${row.id}`,
    label: `${row.title} (${row.topic})`.slice(0, 240),
    owner: row.teams.flatMap((t) => t.owners)[0] || null,
    kind: 'discussion',
    minutes: 10,
  };
}

/** The meeting's stored agenda with the drafts appended, in route shape. */
export function appendAgenda(existing, drafts) {
  const base = (Array.isArray(existing) ? existing : []).map((it) => ({
    id: it.id,
    label: it.label,
    minutes: it.minutes ?? null,
    owner: it.owner ?? null,
    kind: it.kind ?? null,
    pitch_id: it.pitch_id ?? null,
  }));
  return [
    ...base,
    ...(drafts || []).map((d) => ({
      label: d.label,
      minutes: d.minutes,
      owner: d.owner,
      kind: d.kind,
    })),
  ];
}

/* ── Council versus council ─────────────────────────────────────────────── */

/**
 * The council's place on Council Rankings and the councils beside it (two
 * above, two below): rank, name, rating and tier only.
 */
export function standingRows(rows, myOrgId) {
  const ranked = rankRows(rows || [], 'overall');
  const own = ownStanding(rows || [], myOrgId);
  if (!own) return { status: ranked.length ? 'unrated' : 'empty', rows: [], field: ranked.length };
  const i = ranked.findIndex((r) => r.orgId === myOrgId);
  const slice = ranked.slice(Math.max(0, i - 2), i + 3);
  return {
    status: 'ready',
    field: ranked.length,
    rank: own.rank,
    rows: slice.map((r) => ({
      orgId: r.orgId,
      rank: r.rank,
      name: r.name,
      rating: finite(r.rating) ? Math.round(Number(r.rating)) : null,
      tier: tierLabel(r.tier),
      mine: r.orgId === myOrgId,
    })),
  };
}

/* ── KPI strip ──────────────────────────────────────────────────────────── */

export function kpis(raw, next) {
  const t = fundTotals(raw?.positions || []);
  const b = raw?.benchmark || null;
  return {
    empty: t.positions === 0,
    value: t.value,
    gainPct: t.gainPct,
    benchLabel:
      b && finite(b.pct)
        ? b.source === 'pitch_proxy'
          ? 'Benchmark (est.)'
          : b.symbol || 'Benchmark'
        : 'Benchmark',
    benchPct: b && finite(b.pct) ? Number(b.pct) : null,
    positions: t.positions,
    unpriced: t.unpriced,
    next: next ? { title: next.title, day: fmtMeetingDay(next.scheduled_at), id: next.id } : null,
  };
}

export { fmtDate, fmtSignedPct };

/* ── Where the council's own pages live ─────────────────────────────────── */

export const LINKS = {
  library: '/org-team-hub/research-library',
  newNote: '/org-team-hub/research-library?new=note',
  doc: (id) => `/org-team-hub/research-library?d=${encodeURIComponent(id)}`,
  meetings: '/org-team-hub/meetings',
  meeting: (id) => `/org-team-hub/meetings?m=${encodeURIComponent(id)}`,
  rankings: '/council-rankings',
  compliance: '/org-team-hub/compliance',
  tradingDesk: '/org-trading',
  fundAnalytics: '/org-team-hub/fund-analytics',
  orgChart: '/org-team-hub/org-chart',
  debrief: '/centaur-intelligence',
};
