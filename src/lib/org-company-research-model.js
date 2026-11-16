/**
 * Council sections of US Equities (/company-research): the pure model.
 *
 * Council members see the retail page unchanged plus council sections built
 * here from their council's own records: the position book, sector teams,
 * sector coverage, the research library, coverage handoffs, pitches, the
 * stored investment policy rules and the latest fund snapshot's benchmark.
 * The live route (GET /api/org/company-research) and the sample bundle
 * (src/lib/org-company-research-sample.js) hand over the same raw shape, so
 * one set of functions draws both.
 *
 * Honesty rules, the same as Compliance and the Research Library:
 * - The policy check is descriptive. It reads stored limits against the
 *   council's own book and never blocks, advises or places anything. The cash
 *   floor is recorded only, never checked.
 * - A holding without a price is carried at cost: no return, no contribution.
 * - A missing figure is N/A, never a dash or a zero.
 *
 * Pure: no React, no fetch, no server imports.
 */
import { docTypeLabel } from './org-research-library-model.js';
import { RULE_META, ruleValueText } from './org-compliance-model.js';

export const NA = 'N/A';
export const STALE_DAYS = 90;
const DAY = 86400000;

/* ── Formatting ─────────────────────────────────────────────────────────── */

const finite = (v) => v != null && v !== '' && Number.isFinite(Number(v));

/** $240,050.00 */
export function fmtMoney(v) {
  if (!finite(v)) return NA;
  const n = Number(v);
  const s = Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${n < 0 ? '-' : ''}$${s}`;
}

/** +46.73% (signed) */
export function fmtSignedPct(v, digits = 2) {
  if (!finite(v)) return NA;
  const n = Number(v);
  const r = n.toFixed(digits);
  const zero = Number(r) === 0;
  return `${n > 0 && !zero ? '+' : ''}${zero ? Math.abs(Number(r)).toFixed(digits) : r}%`;
}

/** 13.0% (a share of something, never signed) */
export function fmtShare(v, digits = 1) {
  return finite(v) ? `${Number(v).toFixed(digits)}%` : NA;
}

/** +4.19 pp */
export function fmtPp(v) {
  if (!finite(v)) return NA;
  const n = Number(v);
  const r = n.toFixed(2);
  return `${n > 0 && Number(r) !== 0 ? '+' : ''}${Number(r) === 0 ? '0.00' : r} pp`;
}

/** Nov 12, 2026 (UTC, so server and browser agree) */
export function fmtDate(v) {
  if (!v) return NA;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return NA;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export const fmtShares = (v) =>
  finite(v) ? Number(v).toLocaleString('en-US', { maximumFractionDigits: 4 }) : NA;

/** 'up' | 'down' | 'flat' | 'na' for a signed figure. */
export function toneOf(v) {
  if (!finite(v)) return 'na';
  const n = Number(v);
  return n > 0 ? 'up' : n < 0 ? 'down' : 'flat';
}

/** "$3.80T", "$750M" (the market data snapshot's display string) to dollars. */
export function parseCompactDollars(text) {
  const m = String(text || '')
    .replace(/,/g, '')
    .match(/^\$?\s*(-?\d+(?:\.\d+)?)\s*([TBMK]?)$/i);
  if (!m) return null;
  const mult = { T: 1e12, B: 1e9, M: 1e6, K: 1e3, '': 1 }[m[2].toUpperCase()];
  return Number(m[1]) * mult;
}

/* ── Labels ─────────────────────────────────────────────────────────────── */

const STAGE = {
  idea: 'Idea',
  screening: 'Screening',
  deep_dive: 'Deep dive',
  cross_desk_review: 'Cross-desk review',
  pitch_scheduled: 'Pitch scheduled',
  ic_vote: 'IC vote',
  approved: 'Approved',
  in_portfolio: 'In portfolio',
  exited: 'Exited',
  rejected: 'Rejected',
};
export const stageText = (s) => STAGE[s] || (s ? String(s).replace(/_/g, ' ') : NA);

const DECISION = {
  accepted: 'Accepted',
  rejected: 'Rejected',
  watchlist: 'Watchlist',
  deferred: 'Deferred',
};
export const decisionText = (d) => (d ? DECISION[d] || String(d).replace(/_/g, ' ') : null);

/** 'idea' etc. to a tone for the stage word: live stages emerald, closed grey. */
export function stageTone(stage) {
  if (stage === 'rejected' || stage === 'exited') return 'muted';
  if (stage === 'in_portfolio' || stage === 'approved') return 'up';
  return 'accent';
}

/* ── The book ───────────────────────────────────────────────────────────── */

const upper = (t) =>
  String(t || '')
    .toUpperCase()
    .trim();

/** Fund totals from the position book (value at price, unpriced at cost). */
export function fundTotals(positions = []) {
  let value = 0;
  let cost = 0;
  let priced = 0;
  for (const p of positions || []) {
    value += Number(p.value) || 0;
    cost += Number(p.cost) || 0;
    if (p.priced) priced += 1;
  }
  const count = (positions || []).length;
  return {
    value,
    cost,
    pl: value - cost,
    gainPct: cost > 0 && priced > 0 ? ((value - cost) / cost) * 100 : null,
    positions: count,
    priced,
    unpriced: count - priced,
  };
}

/** The benchmark as the page names it (an estimate is always labelled). */
export function benchmarkOf(raw) {
  const b = raw?.benchmark || null;
  if (!b || !finite(b.pct)) return { label: 'Benchmark', pct: null, note: 'No snapshot yet' };
  if (b.source === 'index' && b.symbol) {
    return { label: b.symbol, pct: Number(b.pct), note: 'Latest fund snapshot' };
  }
  if (b.source === 'pitch_proxy') {
    return { label: 'Benchmark (est.)', pct: Number(b.pct), note: 'Estimate from past pitches' };
  }
  return { label: 'Benchmark', pct: null, note: 'No benchmark set' };
}

/** Team sleeves: cost, value, return on cost and weight per sector team. */
export function sleevesOf(raw) {
  const positions = raw?.positions || [];
  const { value: total } = fundTotals(positions);
  const teamName = new Map((raw?.teams || []).map((t) => [t.id, t.name]));
  const by = new Map();
  for (const p of positions) {
    const key = p.team_id && teamName.has(p.team_id) ? p.team_id : '__none';
    if (!by.has(key)) by.set(key, []);
    by.get(key).push(p);
  }
  const rows = [...by.entries()].map(([key, list]) => {
    const t = fundTotals(list);
    return {
      teamId: key === '__none' ? null : key,
      name: key === '__none' ? 'Unassigned' : teamName.get(key),
      count: list.length,
      cost: t.cost,
      value: t.value,
      returnPct: t.gainPct,
      weightPct: total > 0 ? (t.value / total) * 100 : null,
      unpriced: t.unpriced,
    };
  });
  return rows.sort((a, b) => {
    if (!a.teamId) return 1;
    if (!b.teamId) return -1;
    return (b.value || 0) - (a.value || 0);
  });
}

/** The KPI band. status 'empty' when the council holds nothing. */
export function fundOverview(raw) {
  const totals = fundTotals(raw?.positions || []);
  return {
    status: totals.positions ? 'ready' : 'empty',
    totals,
    teams: (raw?.teams || []).length,
    benchmark: benchmarkOf(raw),
  };
}

/* ── Coverage ───────────────────────────────────────────────────────────── */

function memberNames(raw) {
  const byId = new Map();
  const byUser = new Map();
  for (const m of raw?.members || []) {
    if (m.id) byId.set(m.id, m.display_name || null);
    if (m.user_id) byUser.set(m.user_id, m.display_name || null);
  }
  return {
    member: (id) => (id && byId.get(id)) || null,
    user: (id) => (id && byUser.get(id)) || null,
  };
}

/** Who covers a ticker: the latest handoff, else primary sector coverage, else the latest author. */
function analystFor(raw, ticker, sector, docs, names) {
  const t = upper(ticker);
  const hops = (raw?.hops || [])
    .filter((h) => upper(h.ticker) === t && h.to_member_id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  if (hops[0]) return names.member(hops[0].to_member_id);
  if (sector) {
    const cov = (raw?.coverage || [])
      .filter((c) => c.sector && c.sector === sector)
      .sort((a, b) => Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary)));
    for (const c of cov) {
      const n = names.member(c.member_id);
      if (n) return n;
    }
  }
  const latest = (docs || [])[0];
  return latest ? names.user(latest.author_id) || latest.author_name || null : null;
}

/** Held names with no research on file, or none in the last 90 days. */
export function coverageGaps(raw) {
  const now = raw?.now || Date.now();
  const names = memberNames(raw);
  const teamName = new Map((raw?.teams || []).map((t) => [t.id, t.name]));
  const docsByTicker = new Map();
  for (const d of raw?.noteIndex || []) {
    const t = upper(d.ticker);
    if (!t) continue;
    if (!docsByTicker.has(t)) docsByTicker.set(t, []);
    docsByTicker.get(t).push(d);
  }
  const rows = [];
  for (const p of raw?.positions || []) {
    const t = upper(p.ticker);
    const docs = (docsByTicker.get(t) || []).sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at),
    );
    const last = docs[0]?.created_at || null;
    const stale = last ? now - new Date(last).getTime() > STALE_DAYS * DAY : true;
    if (!stale) continue;
    rows.push({
      ticker: t,
      name: p.name || null,
      team: teamName.get(p.team_id) || null,
      sector: p.sector || null,
      status: docs.length ? 'stale' : 'uncovered',
      lastDocAt: last,
      docCount: docs.length,
      analyst: analystFor(raw, t, p.sector, docs, names),
      priced: Boolean(p.priced),
    });
  }
  return rows.sort(
    (a, b) =>
      (a.status === 'uncovered' ? 0 : 1) - (b.status === 'uncovered' ? 0 : 1) ||
      a.ticker.localeCompare(b.ticker),
  );
}

/** Words for a coverage gap's note column. */
export function gapNote(g) {
  const parts = [];
  if (g.status === 'uncovered') parts.push('No research on file.');
  else parts.push(`No research in ${STALE_DAYS} days.`);
  if (!g.priced) parts.push('Held at cost, not yet priced.');
  return parts.join(' ');
}

/* ── The policy check (descriptive) ─────────────────────────────────────── */

const POLICY_ORDER = [
  'max_position_pct',
  'max_sector_pct',
  'max_single_trade_pct',
  'max_positions',
  'min_positions',
  'min_market_cap',
  'prohibited_ticker',
  'prohibited_sector',
  'cash_floor_pct',
];

function reading(current, limit, kind) {
  /* kind 'max': at or under the limit is within; 'min': at or over. */
  if (!finite(current) || !finite(limit)) return { text: NA, tone: 'na' };
  const c = Number(current);
  const l = Number(limit);
  if (kind === 'min')
    return c >= l ? { text: 'Within', tone: 'up' } : { text: 'Below', tone: 'warn' };
  if (c > l) return { text: 'Above', tone: 'down' };
  if (c > l * 0.9) return { text: 'Nearing', tone: 'warn' };
  return { text: 'Within', tone: 'up' };
}

/**
 * One row per ACTIVE stored rule: the stored limit, the figure on this name
 * read from the council's own book, and a one-word reading. Never a block.
 */
export function policyReadings(raw, { ticker, holding, sector, marketCapText }) {
  const t = upper(ticker);
  const positions = raw?.positions || [];
  const { value: total } = fundTotals(positions);
  const count = positions.length;
  const nameSector = holding?.sector || sector || null;
  const sectorValue = nameSector
    ? positions
        .filter((p) => p.sector === nameSector)
        .reduce((s, p) => s + (Number(p.value) || 0), 0)
    : null;
  const cap = parseCompactDollars(marketCapText);
  const rows = [];
  for (const rule of raw?.rules || []) {
    if (rule.is_active === false) continue;
    const meta = RULE_META[rule.rule_type];
    if (!meta) continue;
    const v = rule.rule_value || {};
    const limitText = ruleValueText(rule);
    let current = NA;
    let r = { text: NA, tone: 'na' };
    switch (rule.rule_type) {
      case 'max_position_pct': {
        if (holding && total > 0) {
          const w = (holding.value / total) * 100;
          current = `${fmtShare(w)} of fund`;
          r = reading(w, v.pct, 'max');
        } else {
          current = 'Not held';
          r = { text: 'No position', tone: 'na' };
        }
        break;
      }
      case 'max_sector_pct': {
        if (nameSector && total > 0) {
          const w = (sectorValue / total) * 100;
          current = `${nameSector}: ${fmtShare(w)} of fund`;
          r = reading(w, v.pct, 'max');
        } else {
          current = 'Sector N/A';
        }
        break;
      }
      case 'max_single_trade_pct':
        current = 'Needs a proposed size';
        r = { text: 'At pitch', tone: 'na' };
        break;
      case 'max_positions': {
        const after = holding ? count : count + 1;
        current = holding ? `${count} positions` : `${after} positions if added`;
        r = reading(after, v.max, 'max');
        break;
      }
      case 'min_positions':
        current = `${count} positions`;
        r = reading(count, v.min, 'min');
        break;
      case 'min_market_cap':
        current = cap != null ? marketCapText : 'Market cap N/A';
        r = cap != null ? reading(cap, v.value, 'min') : r;
        if (r.text === 'Within') r = { text: 'Above', tone: 'up' };
        break;
      case 'prohibited_ticker': {
        const hit = v.ticker && upper(v.ticker) === t;
        current = t || NA;
        r = hit ? { text: 'Prohibited', tone: 'down' } : { text: 'Not listed', tone: 'up' };
        break;
      }
      case 'prohibited_sector': {
        const hit =
          v.sector && [holding?.sector, sector].filter(Boolean).some((s) => s === v.sector);
        current = nameSector || 'Sector N/A';
        r = !nameSector
          ? { text: NA, tone: 'na' }
          : hit
            ? { text: 'Prohibited', tone: 'down' }
            : { text: 'Not listed', tone: 'up' };
        break;
      }
      case 'cash_floor_pct':
        current = 'Recorded only';
        r = { text: 'Not checked', tone: 'na' };
        break;
      default:
        break;
    }
    rows.push({
      id: rule.id,
      type: rule.rule_type,
      label: meta.label,
      limit: limitText,
      current,
      reading: r.text,
      tone: r.tone,
    });
  }
  return rows.sort((a, b) => POLICY_ORDER.indexOf(a.type) - POLICY_ORDER.indexOf(b.type));
}

/* ── One name ───────────────────────────────────────────────────────────── */

/**
 * Everything the council sections show for one ticker.
 * @param raw     the fund part (positions, teams, members, coverage, hops, rules, ...)
 * @param part    the ticker part { docs, pitches, hops? }
 * @param ctx     { ticker, sector, marketCapText } from the page's market data
 */
export function onTicker(raw, part, { ticker, sector = null, marketCapText = null } = {}) {
  const t = upper(ticker);
  const names = memberNames(raw);
  const positions = raw?.positions || [];
  const totals = fundTotals(positions);
  const teamName = new Map((raw?.teams || []).map((x) => [x.id, x.name]));
  const pos = positions.find((p) => upper(p.ticker) === t) || null;

  const holding = pos
    ? {
        ticker: t,
        name: pos.name || null,
        shares: pos.shares,
        avgCost: pos.avg_cost,
        price: pos.priced ? pos.current_price : null,
        value: pos.value,
        cost: pos.cost,
        priced: Boolean(pos.priced),
        returnPct: pos.priced && pos.cost > 0 ? (pos.pl / pos.cost) * 100 : null,
        weightPct: totals.value > 0 ? (pos.value / totals.value) * 100 : null,
        teamId: pos.team_id || null,
        team: teamName.get(pos.team_id) || null,
        sector: pos.sector || null,
      }
    : null;

  /* The sleeve: every holding on the same team, the name first. */
  let sleeve = null;
  if (holding) {
    const mates = positions.filter((p) =>
      holding.teamId ? p.team_id === holding.teamId : !p.team_id,
    );
    const st = fundTotals(mates);
    sleeve = {
      team: holding.team || 'Unassigned',
      rows: mates
        .map((p) => ({
          ticker: upper(p.ticker),
          shares: p.shares,
          avgCost: p.avg_cost,
          price: p.priced ? p.current_price : null,
          value: p.value,
          priced: Boolean(p.priced),
          returnPct: p.priced && p.cost > 0 ? (p.pl / p.cost) * 100 : null,
          isThis: upper(p.ticker) === t,
        }))
        .sort((a, b) => Number(b.isThis) - Number(a.isThis) || b.value - a.value),
      cost: st.cost,
      value: st.value,
      returnPct: st.gainPct,
      weightPct: totals.value > 0 ? (st.value / totals.value) * 100 : null,
      count: mates.length,
    };
  }

  /* Research on this name, newest first. */
  const docs = (part?.docs || [])
    .slice()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map((d) => ({
      id: d.id,
      date: d.published_at || d.created_at,
      created_at: d.created_at,
      version: finite(d.version) ? `v${Number(d.version)}` : NA,
      title: d.title || 'Untitled',
      author: names.user(d.author_id) || d.author_name || 'Former member',
      author_id: d.author_id,
      kind: docTypeLabel(d.doc_type),
      status: d.status || null,
    }));
  const lastDocAt = docs[0]?.created_at || null;
  const now = raw?.now || Date.now();
  const stale = lastDocAt ? now - new Date(lastDocAt).getTime() > STALE_DAYS * DAY : true;
  const hopRaw = { ...raw, hops: [...(raw?.hops || []), ...(part?.hops || [])] };
  const analyst = analystFor(hopRaw, t, holding?.sector || sector, docs, names);

  /* Pitches on this name, newest first. */
  const pitches = (part?.pitches || [])
    .slice()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map((p) => ({
      id: p.id,
      title: `${t} ${p.pitch_type === 'short' ? 'short' : 'long'} thesis`,
      owner: names.member(p.analyst_member_id) || 'Former member',
      stage: p.stage || null,
      stageLabel: stageText(p.stage),
      tone: stageTone(p.stage),
      decision: decisionText(p.decision),
      expectedReturn: finite(p.expected_return_pct) ? Number(p.expected_return_pct) : null,
      horizon: p.time_horizon || null,
      lastAt: p.decision_at || p.stage_entered_at || p.created_at,
      created_at: p.created_at,
    }));

  const contribution = holding
    ? {
        returnPct: holding.returnPct,
        fundGainPct: totals.gainPct,
        contributionPp:
          holding.priced && totals.cost > 0
            ? ((holding.value - holding.cost) / totals.cost) * 100
            : null,
        weightPct: holding.weightPct,
        analyst,
      }
    : null;

  return {
    ticker: t,
    held: Boolean(holding),
    holding,
    sleeve,
    docs,
    docCount: docs.length,
    lastDocAt,
    stale,
    analyst,
    pitches,
    latestPitch: pitches[0] || null,
    policy: policyReadings(raw, { ticker: t, holding, sector, marketCapText }),
    contribution,
  };
}

/** The ticker part of a sample bundle, filtered the way the live route filters. */
export function sampleTickerPart(raw, ticker) {
  const t = upper(ticker);
  return {
    docs: (raw?.notes || []).filter((n) => upper(n.ticker) === t),
    pitches: (raw?.pitches || []).filter((p) => upper(p.ticker) === t),
    hops: [],
  };
}

/* ── Where the council's own pages live ─────────────────────────────────── */

export const LINKS = {
  dossier: (t) =>
    `/org-team-hub/research-library?view=ticker&symbol=${encodeURIComponent(upper(t))}`,
  library: '/org-team-hub/research-library',
  pitch: (id) => `/org-team-hub/pitches?pitch=${encodeURIComponent(id)}`,
  pipeline: '/org-team-hub/pitches',
  compliance: '/org-team-hub/compliance',
  tradingDesk: '/org-trading',
  lineage: '/org-team-hub/research-library?view=lineage',
};

/**
 * Order of the council sections by role (description, open question 2):
 * analysts read coverage and pitches first, portfolio managers their sleeve,
 * executives and faculty the whole fund and the policy check.
 */
export function sectionOrder(role) {
  if (role === 'analyst') return ['research', 'pitches', 'position', 'policy'];
  if (role === 'portfolio_manager') return ['position', 'research', 'pitches', 'policy'];
  return ['position', 'policy', 'research', 'pitches'];
}
