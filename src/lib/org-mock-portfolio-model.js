/**
 * Council sandbox on Mock Portfolio (/trading/mock): the pure model.
 *
 * Everything the council layer of the paper trading page shows is worked out
 * here, from the viewer's own sandbox and the council's own records (or the
 * labelled sample): the IPS check on the order being typed and on the sandbox
 * holdings, sector weights against the stored cap, the sandbox against the
 * real fund rebased over one window, the pitches, the fund's holdings and the
 * fund challenge standing. No React, no fetch, no server imports, so the
 * page, the routes and the tests share it.
 *
 * Honesty rules for every string here:
 *   - The IPS check describes. It never stops, changes or logs a sandbox
 *     order, and it never writes a breach.
 *   - The proposal rules (prohibited ticker and sector, minimum market cap,
 *     maximum single trade, maximum positions) run through the same engine
 *     the council's own check route runs (evaluateProposal). The holdings
 *     rules (largest position, sector cap, minimum positions, cash floor) are
 *     read from the sandbox after the order, as a share of the sandbox's total
 *     value, because a paper account holds its cash explicitly.
 *   - A rule that needs an input the page does not have (a sector or market
 *     cap the market data did not return) reads "Not tested", never "Passes".
 *   - The cash floor is recorded but never checked in the real fund, so a
 *     sandbox below it reads as a warning, never as blocked.
 *   - No figure is invented: missing values read N/A.
 */
import {
  RULE_META,
  evaluateProposal,
  isHardRule,
  ruleLabel,
  sectorCap,
} from './org-compliance-model.js';
import { fundRowsOf } from './org-competitions-model.js';
import { stageLabel } from './pitch/stages.js';

export const NA = 'N/A';
const DAY = 86400000;

/* ── Formatting ─────────────────────────────────────────────────────────── */

const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

export function fmtUSD(v) {
  const n = num(v);
  if (n == null) return NA;
  const s = Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${n < 0 ? '-' : ''}$${s}`;
}

export function fmtPct(v, digits = 1) {
  const n = num(v);
  return n == null ? NA : `${n.toFixed(digits)}%`;
}

export function fmtSignedPct(v, digits = 2) {
  const n = num(v);
  if (n == null) return NA;
  const fixed = n.toFixed(digits);
  if (Number(fixed) === 0) return `${(0).toFixed(digits)}%`;
  return `${n > 0 ? '+' : ''}${fixed}%`;
}

export const toneOf = (v) => {
  const n = num(v);
  if (n == null || Math.abs(n) < 0.005) return 'flat';
  return n > 0 ? 'up' : 'down';
};

export function fmtDate(v, withYear = true) {
  if (!v) return NA;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return NA;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(withYear ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  });
}

/** "$3.21T", "$750M", "$5.20B" (the market data's compact form) to dollars. */
export function parseCompactDollars(text) {
  if (text == null) return null;
  if (typeof text === 'number') return Number.isFinite(text) ? text : null;
  const m = String(text)
    .replace(/[$,\s]/g, '')
    .match(/^(-?\d+(?:\.\d+)?)([KMBT]?)$/i);
  if (!m) return null;
  const mult = { '': 1, K: 1e3, M: 1e6, B: 1e9, T: 1e12 }[m[2].toUpperCase()];
  return Number(m[1]) * mult;
}

const upper = (s) =>
  String(s || '')
    .trim()
    .toUpperCase();

/* ── Sectors ────────────────────────────────────────────────────────────── */

/* Market data and a council's book can name the same sector differently.
   A market-data name is only mapped onto a name the fund itself uses. */
const SECTOR_ALIASES = [
  ['Financial Services', 'Financials', 'Financial'],
  ['Healthcare', 'Health Care'],
  ['Technology', 'Information Technology', 'Tech'],
  ['Consumer Cyclical', 'Consumer Discretionary'],
  ['Consumer Defensive', 'Consumer Staples'],
  ['Basic Materials', 'Materials'],
  ['Communication Services', 'Communication', 'Communications'],
  ['Industrials', 'Industrial'],
  ['Real Estate', 'REITs'],
  ['Energy'],
  ['Utilities'],
];

/** The fund's own name for a market-data sector, else the name unchanged. */
export function alignSector(name, fundSectors = []) {
  if (!name) return null;
  const have = new Set((fundSectors || []).filter(Boolean));
  if (have.has(name)) return name;
  const group = SECTOR_ALIASES.find((g) => g.some((x) => x.toLowerCase() === name.toLowerCase()));
  if (group) {
    const match = group.find((x) => have.has(x));
    if (match) return match;
  }
  return name;
}

/**
 * How a sandbox ticker gets its sector: the fund's own sector when the fund
 * holds the name, else the market-data sector mapped onto the fund's names.
 */
export function sectorResolver({ fundPositions = [], marketSectors = {} } = {}) {
  const byTicker = new Map();
  const names = new Set();
  for (const p of fundPositions || []) {
    const t = upper(p.ticker_symbol || p.ticker);
    if (p.sector) names.add(p.sector);
    if (t && p.sector && !byTicker.has(t)) byTicker.set(t, p.sector);
  }
  const list = [...names];
  return (ticker) => {
    const t = upper(ticker);
    if (!t) return null;
    if (byTicker.has(t)) return byTicker.get(t);
    const m = marketSectors?.[t];
    return m ? alignSector(m, list) : null;
  };
}

/* ── The sandbox book ───────────────────────────────────────────────────── */

/**
 * The sandbox as the rules read it: positions at market value, cash, total.
 * `positions` are the page's rows ({ symbol, qty, currentPrice } or value).
 */
export function sandboxBook({ positions = [], cash = 0, sectorOf = () => null } = {}) {
  const list = (positions || [])
    .map((p) => {
      const ticker = upper(p.symbol || p.ticker);
      const value =
        num(p.value) ?? (num(p.qty) ?? 0) * (num(p.currentPrice) ?? num(p.avgCost) ?? 0);
      return { ticker, sector: p.sector || sectorOf(ticker) || null, value };
    })
    .filter((p) => p.ticker && p.value > 0);
  const c = num(cash) ?? 0;
  const total = c + list.reduce((s, p) => s + p.value, 0);
  return { positions: list, cash: c, total };
}

/**
 * The sandbox after a market order of `amount` dollars. A sell is capped at
 * the position's value. Nothing is placed: this only projects.
 */
export function applyOrder(book, order) {
  if (!book || !order) return book;
  const amount = num(order.amount);
  const t = upper(order.symbol);
  if (!t || amount == null || amount <= 0) return book;
  const positions = book.positions.map((p) => ({ ...p }));
  let pos = positions.find((p) => p.ticker === t);
  let cash = book.cash;
  if (order.side === 'sell') {
    if (!pos) return book;
    const sold = Math.min(amount, pos.value);
    pos.value -= sold;
    cash += sold;
  } else {
    if (!pos) {
      pos = { ticker: t, sector: order.sector || null, value: 0 };
      positions.push(pos);
    }
    pos.value += amount;
    cash -= amount;
  }
  const kept = positions.filter((p) => p.value > 0.005);
  return { positions: kept, cash, total: cash + kept.reduce((s, p) => s + p.value, 0) };
}

function sectorTotals(book) {
  const out = {};
  for (const p of book.positions) {
    const k = p.sector || 'Unclassified';
    out[k] = (out[k] || 0) + p.value;
  }
  return out;
}

const share = (v, total) => (total > 0 ? (v / total) * 100 : null);

/* ── The IPS check ──────────────────────────────────────────────────────── */

export const IPS_STATES = {
  pass: { label: 'Passes', icon: 'bi-check-circle', tone: 'up' },
  warn: { label: 'Warning', icon: 'bi-exclamation-triangle', tone: 'warn' },
  block: { label: 'Would be blocked in the real fund', icon: 'bi-x-octagon', tone: 'down' },
  untested: { label: 'Not tested', icon: 'bi-dash-circle', tone: 'muted' },
};

const breachState = (rule) => (isHardRule(rule) ? 'block' : 'warn');

/**
 * Every active stored rule read against the sandbox, before or after the
 * order being typed. Purely descriptive: the result is never used to stop,
 * change or log an order.
 *
 * @param {{ rules: object[], book: object, order?: { side, symbol, amount, sector }|null,
 *           marketCap?: number|null }} input
 * @returns {{ rows: { id, type, label, state, detail }[], counts: object, hasRules: boolean }}
 */
export function sandboxIpsCheck({ rules = [], book, order = null, marketCap = null } = {}) {
  const active = (rules || []).filter((r) => r && r.is_active !== false && RULE_META[r.rule_type]);
  const empty = { pass: 0, warn: 0, block: 0, untested: 0 };
  if (!book) return { rows: [], counts: empty, hasRules: active.length > 0 };

  const hasOrder = Boolean(order && upper(order.symbol) && num(order.amount) > 0);
  const isBuy = hasOrder && order.side !== 'sell';
  const ticker = hasOrder ? upper(order.symbol) : null;
  const sector = hasOrder ? order.sector || null : null;
  const after = hasOrder ? applyOrder(book, { ...order, sector }) : book;
  const tradePct = hasOrder ? share(num(order.amount), book.total) : null;
  const sectors = sectorTotals(after);

  /* The council's own engine for the proposal rules (buy side). The sandbox
     before the order is the "current holdings" it reads. */
  const engine =
    hasOrder && isBuy
      ? evaluateProposal({
          rules: active,
          positions: book.positions.map((p) => ({
            ticker_symbol: p.ticker,
            sector: p.sector,
            current_value: p.value,
          })),
          ticker,
          sector,
          sizePct: tradePct == null ? null : Number(tradePct.toFixed(2)),
          marketCap,
        })
      : null;
  const engineHit = new Map((engine?.violations || []).map((v) => [v.rule_id, v]));

  const rows = active.map((rule) => {
    const v = rule.rule_value || {};
    const pct = num(v.pct);
    const label = ruleLabel(rule);
    const row = (state, detail) => ({ id: rule.id, type: rule.rule_type, label, state, detail });
    const engineSays = (okDetail) => {
      const hit = engineHit.get(rule.id);
      if (hit) return row(breachState(rule), hit.detail.replace(/^[^:]*: /, ''));
      return row('pass', okDetail);
    };

    switch (rule.rule_type) {
      case 'max_position_pct': {
        if (pct == null) return row('untested', 'No limit is stored.');
        if (hasOrder && isBuy) {
          const p = after.positions.find((x) => x.ticker === ticker);
          const w = share(p?.value ?? 0, after.total);
          const text = `${ticker} would be ${fmtPct(w)} of the sandbox, limit ${pct}%.`;
          return w > pct ? row(breachState(rule), text) : row('pass', text);
        }
        if (!after.positions.length) return row('pass', 'No positions to read.');
        const top = after.positions.reduce((a, b) => (b.value > a.value ? b : a));
        const w = share(top.value, after.total);
        const text = `Largest position ${top.ticker} ${fmtPct(w)}, limit ${pct}%.`;
        return w > pct ? row(breachState(rule), text) : row('pass', text);
      }
      case 'max_sector_pct': {
        if (pct == null) return row('untested', 'No cap is stored.');
        if (hasOrder) {
          if (!sector) return row('untested', `Sector not known for ${ticker}.`);
          const w = share(sectors[sector] || 0, after.total);
          const text = `${sector} would be ${fmtPct(w)} of the sandbox, cap ${pct}%.`;
          return w > pct ? row(breachState(rule), text) : row('pass', text);
        }
        const named = Object.entries(sectors).filter(([k]) => k !== 'Unclassified');
        if (!named.length) return row('pass', 'No classified positions to read.');
        const [k, val] = named.reduce((a, b) => (b[1] > a[1] ? b : a));
        const w = share(val, after.total);
        const text = `Largest sector ${k} ${fmtPct(w)}, cap ${pct}%.`;
        return w > pct ? row(breachState(rule), text) : row('pass', text);
      }
      case 'max_single_trade_pct': {
        if (!hasOrder) return row('untested', 'Applies to an order.');
        const text = `Trade size ${fmtPct(tradePct)} of sandbox value, limit ${pct ?? NA}%.`;
        if (!isBuy) {
          return pct != null && tradePct > pct ? row(breachState(rule), text) : row('pass', text);
        }
        const hit = engineHit.get(rule.id);
        return hit ? row(breachState(rule), text) : row('pass', text);
      }
      case 'min_market_cap': {
        if (!hasOrder) return row('untested', 'Applies to a buy order.');
        if (!isBuy) return row('pass', 'A sell is not read against the minimum.');
        if (marketCap == null) return row('untested', `Market cap not known for ${ticker}.`);
        return engineSays(`${ticker} meets the minimum market cap.`);
      }
      case 'prohibited_ticker': {
        const banned = upper(v.ticker);
        const held = after.positions.some((p) => p.ticker === banned);
        if (hasOrder && isBuy && engineHit.has(rule.id)) return engineSays('');
        if (hasOrder && isBuy && !held)
          return row('pass', `${banned || NA} is not part of this order.`);
        return held
          ? row(breachState(rule), `${banned} is held in the sandbox.`)
          : row('pass', `${banned || NA} is not held.`);
      }
      case 'prohibited_sector': {
        const banned = v.sector || null;
        const held = banned && after.positions.some((p) => p.sector === banned);
        if (hasOrder && isBuy && engineHit.has(rule.id)) return engineSays('');
        if (hasOrder && isBuy && !held) {
          if (!sector) return row('untested', `Sector not known for ${ticker}.`);
          return row('pass', `${ticker} is not in ${banned || NA}.`);
        }
        return held
          ? row(breachState(rule), `A ${banned} position is held.`)
          : row('pass', `No ${banned || NA} positions.`);
      }
      case 'max_positions': {
        const max = num(v.max);
        const count = after.positions.length;
        const text = `${count} positions after this, maximum ${max ?? NA}.`;
        if (hasOrder && isBuy) return engineSays(text);
        return max != null && count > max ? row(breachState(rule), text) : row('pass', text);
      }
      case 'min_positions': {
        const min = num(v.min);
        const count = after.positions.length;
        const text = `${count} positions, minimum ${min ?? NA}.`;
        return min != null && count < min ? row(breachState(rule), text) : row('pass', text);
      }
      case 'cash_floor_pct': {
        if (pct == null) return row('untested', 'No floor is stored.');
        const w = share(after.cash, after.total);
        const text = `Cash ${fmtPct(w)} of the sandbox, floor ${pct}%.`;
        /* The real fund records the cash floor but never checks it. */
        return w < pct
          ? row('warn', `${text} The real fund does not check this rule.`)
          : row('pass', text);
      }
      default:
        return row('untested', 'Not read here.');
    }
  });
  const counts = { ...empty };
  for (const r of rows) counts[r.state] += 1;
  return { rows, counts, hasRules: active.length > 0 };
}

/** One line for a check result: "2 warnings, 1 would be blocked". */
export function ipsSummary(counts) {
  if (!counts) return NA;
  const parts = [];
  if (counts.block) parts.push(`${counts.block} would be blocked in the real fund`);
  if (counts.warn) parts.push(`${counts.warn} ${counts.warn === 1 ? 'warning' : 'warnings'}`);
  if (!parts.length) return counts.pass ? 'Every tested rule passes.' : 'No rule could be tested.';
  return `${parts.join(', ')}.`;
}

/* ── Sector weights ─────────────────────────────────────────────────────── */

/**
 * Sandbox and real fund weights by sector, as a share of each one's total
 * value (the fund's total is its book; the sandbox's includes its cash),
 * against the lowest active stored sector cap.
 */
export function sectorWeights({ book, fundPositions = [], rules = [] } = {}) {
  const cap = sectorCap(rules);
  const fundTotal = (fundPositions || []).reduce((s, p) => s + (num(p.current_value) || 0), 0);
  const fund = {};
  for (const p of fundPositions || []) {
    const k = p.sector || 'Unclassified';
    fund[k] = (fund[k] || 0) + (num(p.current_value) || 0);
  }
  const sandbox = book ? sectorTotals(book) : {};
  const keys = [...new Set([...Object.keys(fund), ...Object.keys(sandbox)])];
  const rows = keys
    .map((sector) => {
      const s = book ? share(sandbox[sector] || 0, book.total) : null;
      const f = fundTotal > 0 ? share(fund[sector] || 0, fundTotal) : null;
      const unclassified = sector === 'Unclassified';
      return {
        sector,
        sandbox: s,
        fund: f,
        cap: unclassified ? null : cap,
        sandboxOver: !unclassified && cap != null && s != null && s > cap,
        fundOver: !unclassified && cap != null && f != null && f > cap,
        unclassified,
      };
    })
    .sort((a, b) => {
      if (a.unclassified !== b.unclassified) return a.unclassified ? 1 : -1;
      return (b.fund ?? 0) + (b.sandbox ?? 0) - ((a.fund ?? 0) + (a.sandbox ?? 0));
    });
  return {
    cap,
    rows,
    sandboxCash: book ? share(book.cash, book.total) : null,
  };
}

/* ── The real fund ──────────────────────────────────────────────────────── */

/** The fund's return on its book: value against cost. null without a cost. */
export function fundReturn(positions = []) {
  const list = positions || [];
  const value = list.reduce((s, p) => s + (num(p.current_value ?? p.value) || 0), 0);
  const cost = list.reduce(
    (s, p) => s + (num(p.cost) ?? (num(p.shares) || 0) * (num(p.avg_cost) || 0)),
    0,
  );
  return { value, cost, pct: cost > 0 ? (value / cost - 1) * 100 : null };
}

/** The fund's holdings, read-only: largest first, with team and weight. */
export function fundHoldings(raw) {
  const positions = raw?.positions || [];
  const teams = new Map((raw?.teams || []).map((t) => [t.id, t.name]));
  const total = positions.reduce((s, p) => s + (num(p.current_value ?? p.value) || 0), 0);
  return positions
    .map((p) => {
      const value = num(p.current_value ?? p.value);
      return {
        id: p.id || p.ticker,
        ticker: upper(p.ticker_symbol || p.ticker),
        name: p.name || null,
        sector: p.sector || null,
        team: teams.get(p.team_id) || null,
        value,
        weight: total > 0 && value != null ? (value / total) * 100 : null,
        priced: p.priced !== false,
      };
    })
    .filter((r) => r.ticker)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
}

/* ── Sandbox against the real fund ─────────────────────────────────────── */

export const COMPARE_RANGES = ['1M', '3M', '6M', '1Y', 'ALL'];
const RANGE_DAYS = { '1M': 30, '3M': 91, '6M': 182, '1Y': 365 };

/** Points inside the last `range` (ALL keeps everything). */
export function clipToRange(points, range, at = (p) => p.at) {
  const list = points || [];
  const days = RANGE_DAYS[range];
  if (!days || !list.length) return list;
  const end = new Date(at(list[list.length - 1])).getTime();
  const from = end - days * DAY;
  const out = list.filter((p) => new Date(at(p)).getTime() >= from);
  return out.length >= 2 ? out : list;
}

const dayKey = (v) => String(v || '').slice(0, 10);

function rebase(list) {
  const first = list.find((p) => p.v > 0);
  if (!first) return [];
  return list.map((p) => ({ t: p.t, pct: (p.v / first.v - 1) * 100 }));
}

/**
 * The sandbox, the real fund and the S&P 500 rebased to 0% over ONE window:
 * the sandbox series' window. The fund line uses its daily snapshots inside
 * that window, starting from its first snapshot there.
 *
 * fundNote: 'none' when the fund has fewer than two snapshots in the window,
 * 'late' when its first snapshot there is after the window's first day.
 */
export function rebaseCompare({ points = [], benchmark = [], snapshots = [] } = {}) {
  const sandbox = (points || [])
    .map((p) => ({ t: dayKey(p.at ?? p.t), v: num(p.value ?? p.v) }))
    .filter((p) => p.t && p.v != null);
  if (sandbox.length < 2) {
    return { start: null, end: null, sandbox: [], spy: [], fund: [], fundNote: null, last: {} };
  }
  const start = sandbox[0].t;
  const end = sandbox[sandbox.length - 1].t;
  const inside = (p) => p.t >= start && p.t <= end;
  const spy = (benchmark || [])
    .map((p) => ({ t: dayKey(p.t ?? p.at), v: num(p.v ?? p.value) }))
    .filter((p) => p.t && p.v != null)
    .filter(inside);
  const fund = (snapshots || [])
    .map((s) => ({ t: dayKey(s.date ?? s.snapshot_date), v: num(s.value ?? s.total_value) }))
    .filter((p) => p.t && p.v != null && p.v > 0)
    .filter(inside)
    .sort((a, b) => (a.t < b.t ? -1 : 1));
  const series = {
    sandbox: rebase(sandbox),
    spy: spy.length >= 2 ? rebase(spy) : [],
    fund: fund.length >= 2 ? rebase(fund) : [],
  };
  const lastOf = (s) => (s.length ? s[s.length - 1].pct : null);
  return {
    start,
    end,
    ...series,
    fundStart: series.fund.length ? series.fund[0].t : null,
    fundNote: fund.length < 2 ? 'none' : fund[0].t > start ? 'late' : null,
    last: {
      sandbox: lastOf(series.sandbox),
      spy: lastOf(series.spy),
      fund: lastOf(series.fund),
    },
  };
}

/**
 * Chart geometry for the three lines in a w by h box: SVG path strings,
 * y-axis ticks and x labels. Pure maths, so it is tested.
 */
export function chartGeometry(cmp, { w = 640, h = 220, pad = { l: 44, r: 8, t: 8, b: 22 } } = {}) {
  const all = [...cmp.sandbox, ...cmp.spy, ...cmp.fund];
  if (!all.length || !cmp.start) return null;
  const t0 = new Date(cmp.start).getTime();
  const t1 = Math.max(new Date(cmp.end).getTime(), t0 + DAY);
  let lo = Math.min(0, ...all.map((p) => p.pct));
  let hi = Math.max(0, ...all.map((p) => p.pct));
  if (hi - lo < 1) {
    hi += 0.5;
    lo -= 0.5;
  }
  const span = hi - lo;
  const stepRaw = span / 4;
  const mag = 10 ** Math.floor(Math.log10(stepRaw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= stepRaw) || stepRaw;
  lo = Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const x = (t) => pad.l + ((new Date(t).getTime() - t0) / (t1 - t0)) * iw;
  const y = (v) => pad.t + (1 - (v - lo) / (hi - lo)) * ih;
  const path = (s) =>
    s.length >= 2
      ? s.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)} ${y(p.pct).toFixed(1)}`).join(' ')
      : '';
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push({ v: Number(v.toFixed(6)), y: y(v) });
  const xLabels = [0, 0.5, 1].map((f) => {
    const t = new Date(t0 + f * (t1 - t0)).toISOString();
    return { t, x: pad.l + f * iw, label: fmtDate(t, f !== 0.5) };
  });
  const sandboxPath = path(cmp.sandbox);
  const area =
    cmp.sandbox.length >= 2
      ? `${sandboxPath} L${x(cmp.sandbox[cmp.sandbox.length - 1].t).toFixed(1)} ${y(lo).toFixed(1)} L${x(cmp.sandbox[0].t).toFixed(1)} ${y(lo).toFixed(1)} Z`
      : '';
  return {
    w,
    h,
    zeroY: y(0),
    ticks,
    xLabels,
    paths: { sandbox: sandboxPath, spy: path(cmp.spy), fund: path(cmp.fund), area },
    left: pad.l,
    right: w - pad.r,
  };
}

/* ── Pitches ────────────────────────────────────────────────────────────── */

export const CLOSED_PITCH_STAGES = ['rejected', 'exited', 'in_portfolio', 'approved'];

/** Open pitches with names, newest first. `mine` marks the viewer's own. */
export function pitchRows(pitches = [], members = [], viewerMemberId = null) {
  const names = new Map((members || []).map((m) => [m.id, m.display_name]));
  return (pitches || [])
    .filter((p) => p && p.ticker && !p.archived_at && !CLOSED_PITCH_STAGES.includes(p.stage))
    .map((p) => ({
      id: p.id,
      ticker: upper(p.ticker),
      company: p.company_name || null,
      analyst: names.get(p.analyst_member_id) || null,
      stage: p.stage ? stageLabel(p.stage) : NA,
      expected: num(p.expected_return_pct),
      mine: Boolean(viewerMemberId) && p.analyst_member_id === viewerMemberId,
      created_at: p.created_at || null,
    }))
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
}

/* ── Fund challenge standing ────────────────────────────────────────────── */

/** Standing in each fund challenge the council entered, active first. */
export function challengeRows(challenges) {
  if (!challenges) return [];
  return fundRowsOf(challenges.competitions || [], challenges.boards || {});
}
