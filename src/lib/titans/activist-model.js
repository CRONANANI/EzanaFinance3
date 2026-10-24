/**
 * Schedule 13D/13G campaign model: PURE calculation, no React, no I/O,
 * no formatting. A campaign is one confirmed investor (CIK) on one target
 * (CUSIP, name fallback); unconfirmed filings are never grouped. Contract:
 * activist-handoff/06-DATA-CONTRACT.md section 4; tested by
 * scripts/check-activist.mjs.
 */

const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
const DAY = 86400000;
const toMs = (d) => Date.parse(`${String(d || '').slice(0, 10)}T00:00:00Z`);

export const EXIT_THRESHOLD = 5;

/* NYSE full-day market holidays, 2024 to 2027 (constant; weekends excluded
   separately). Good Friday included each year. */
export const NYSE_HOLIDAYS = new Set([
  '2024-01-01',
  '2024-01-15',
  '2024-02-19',
  '2024-03-29',
  '2024-05-27',
  '2024-06-19',
  '2024-07-04',
  '2024-09-02',
  '2024-11-28',
  '2024-12-25',
  '2025-01-01',
  '2025-01-20',
  '2025-02-17',
  '2025-04-18',
  '2025-05-26',
  '2025-06-19',
  '2025-07-04',
  '2025-09-01',
  '2025-11-27',
  '2025-12-25',
  '2026-01-01',
  '2026-01-19',
  '2026-02-16',
  '2026-04-03',
  '2026-05-25',
  '2026-06-19',
  '2026-07-03',
  '2026-09-07',
  '2026-11-26',
  '2026-12-25',
  '2027-01-01',
  '2027-01-18',
  '2027-02-15',
  '2027-03-26',
  '2027-05-31',
  '2027-06-18',
  '2027-07-05',
  '2027-09-06',
  '2027-11-25',
  '2027-12-24',
]);

/* ── identity ────────────────────────────────────────────────────────── */

/** The campaign's target key: CUSIP, else a normalised-name fallback. */
export function targetKey({ cusip, subject } = {}) {
  const c = String(cusip || '')
    .trim()
    .toUpperCase();
  if (c) return c;
  const name = String(subject || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  return name ? `name:${name}` : null;
}

/* ── campaigns ───────────────────────────────────────────────────────── */

/**
 * Group filings into campaigns of (confirmed filer CIK, target key), each
 * ordered by filed date. Filings without a confirmed investor are never
 * grouped: each is its own row in `unconfirmed`.
 */
export function groupCampaigns(filings) {
  const by = new Map();
  const unconfirmed = [];
  for (const f of Array.isArray(filings) ? filings : []) {
    if (!f) continue;
    const key = targetKey({ cusip: f.cusip ?? f.subjectCusip, subject: f.subject });
    if (!f.filerConfirmed || !f.filerCik || !key) {
      unconfirmed.push(f);
      continue;
    }
    const k = `${f.filerCik}:${key}`;
    if (!by.has(k)) {
      by.set(k, {
        key: k,
        filerCik: f.filerCik,
        filer: f.filer || null,
        targetKey: key,
        ticker: f.ticker || null,
        subject: f.subject || null,
        filings: [],
      });
    }
    const c = by.get(k);
    if (!c.ticker && f.ticker) c.ticker = f.ticker;
    if (!c.subject && f.subject) c.subject = f.subject;
    c.filings.push(f);
  }
  const campaigns = [...by.values()].map((c) => ({
    ...c,
    filings: c.filings.slice().sort((a, b) => String(a.filedAt).localeCompare(String(b.filedAt))),
  }));
  return { campaigns, unconfirmed };
}

/** Annotate each filing in a campaign with raise, exit and switch flags. */
export function annotateCampaign(filings) {
  const list = (Array.isArray(filings) ? filings : [])
    .slice()
    .sort((a, b) => String(a.filedAt).localeCompare(String(b.filedAt)));
  return list.map((f, i) => {
    const prev = i > 0 ? list[i - 1] : null;
    const pct = num(f.percentOfClass);
    const prevPct = prev ? num(prev.percentOfClass) : null;
    return {
      ...f,
      raise: Boolean(prev && pct != null && prevPct != null && pct > prevPct),
      exit: pct != null && pct < EXIT_THRESHOLD,
      switch: Boolean(prev && f.form === '13D' && prev.form === '13G'),
    };
  });
}

/** new | building | holding | unwinding | exited for one campaign. */
export function campaignStatus(campaign, window = null) {
  const filings = (campaign?.filings || [])
    .slice()
    .sort((a, b) => String(a.filedAt).localeCompare(String(b.filedAt)));
  if (!filings.length) return null;
  const last = filings[filings.length - 1];
  const lastPct = num(last.percentOfClass);
  if (lastPct != null && lastPct < EXIT_THRESHOLD) return 'exited';
  if (filings.length === 1) {
    const [start, end] = Array.isArray(window) ? window : [null, null];
    const inWindow =
      !start ||
      (String(last.filedAt).slice(0, 10) >= start && String(last.filedAt).slice(0, 10) <= end);
    if (inWindow) return 'new';
    return 'holding';
  }
  const firstPct = num(filings[0].percentOfClass);
  const prevPct = num(filings[filings.length - 2].percentOfClass);
  if (lastPct != null && prevPct != null && lastPct < prevPct) return 'unwinding';
  if (lastPct != null && firstPct != null && lastPct > firstPct) return 'building';
  return 'holding';
}

/** Tag-set changes between consecutive v2 13D filings of a campaign. */
export function intentShifts(campaign) {
  const rows = (campaign?.filings || [])
    .filter((f) => f.form === '13D' && f.detailParsed && Array.isArray(f.tags ?? f.purposeTags))
    .sort((a, b) => String(a.filedAt).localeCompare(String(b.filedAt)));
  const tagSet = (f) =>
    new Set((f.tags ?? f.purposeTags).map((t) => (typeof t === 'string' ? t : t.tag)));
  const out = [];
  for (let i = 1; i < rows.length; i += 1) {
    const before = tagSet(rows[i - 1]);
    const after = tagSet(rows[i]);
    const added = [...after].filter((t) => !before.has(t));
    const dropped = [...before].filter((t) => !after.has(t));
    if (added.length || dropped.length) {
      out.push({ from: rows[i - 1], to: rows[i], added, dropped });
    }
  }
  return out;
}

/** Campaigns whose latest 13D follows a 13G, with the days between. */
export function switches(campaigns, window = null) {
  const [start, end] = Array.isArray(window) ? window : [null, null];
  const out = [];
  for (const c of Array.isArray(campaigns) ? campaigns : []) {
    const filings = annotateCampaign(c.filings);
    const idx = filings.findIndex((f) => f.switch);
    if (idx < 0) continue;
    const firstD = filings[idx];
    const day = String(firstD.filedAt).slice(0, 10);
    if (start && (day < start || day > end)) continue;
    const lastG = filings
      .slice(0, idx)
      .reverse()
      .find((f) => f.form === '13G');
    if (!lastG) continue;
    out.push({
      campaign: c,
      lastG,
      firstD,
      days: Math.round((toMs(firstD.filedAt) - toMs(lastG.filedAt)) / DAY),
    });
  }
  return out.sort((a, b) => String(b.firstD.filedAt).localeCompare(String(a.firstD.filedAt)));
}

/** Step geometry for the Stake Ladder: direction per step, 10% crossing. */
export function ladderSteps(campaign, { yMax = 14 } = {}) {
  const filings = (campaign?.filings || [])
    .filter((f) => num(f.percentOfClass) != null)
    .sort((a, b) => String(a.filedAt).localeCompare(String(b.filedAt)));
  let max = yMax;
  for (const f of filings) while (num(f.percentOfClass) > max) max += 2;
  let crossed10 = false;
  const steps = filings.map((f, i) => {
    const pct = num(f.percentOfClass);
    const prev = i > 0 ? num(filings[i - 1].percentOfClass) : null;
    const dir = prev == null || pct === prev ? 'flat' : pct > prev ? 'up' : 'down';
    if (prev != null && prev < 10 && pct >= 10) crossed10 = true;
    return {
      filing: f,
      pct,
      dir,
      x: filings.length > 1 ? i / (filings.length - 1) : 0,
      y: pct / max,
    };
  });
  return { steps, yMax: max, crossed10 };
}

/** True when the tag set states a plan beyond Investment only. */
export function statedPlan(tags) {
  return (Array.isArray(tags) ? tags : [])
    .map((t) => (typeof t === 'string' ? t : t.tag))
    .some((t) => t && t !== 'investment');
}

/** Sole share of voting power: sole / (sole + shared); null when unknown. */
export function controlShare({ sole, shared } = {}) {
  const s = num(sole);
  const sh = num(shared);
  if (s == null || sh == null) return null;
  const total = s + sh;
  if (!total) return null;
  return s / total;
}

/** Weekdays between two dates, NYSE full-day holidays excluded. Same day = 0. */
export function businessDays(from, to) {
  const a = toMs(from);
  const b = toMs(to);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const [lo, hi] = a <= b ? [a, b] : [b, a];
  let days = 0;
  for (let t = lo + DAY; t <= hi; t += DAY) {
    const d = new Date(t);
    const dow = d.getUTCDay();
    if (dow === 0 || dow === 6) continue;
    if (NYSE_HOLIDAYS.has(d.toISOString().slice(0, 10))) continue;
    days += 1;
  }
  return days;
}

export const SPEED_BINS = ['0', '1', '2', '3', '4', '5', '6-10', '11-30', '31+'];

function speedBin(days) {
  if (days == null || days < 0) return null;
  if (days <= 5) return String(days);
  if (days <= 10) return '6-10';
  if (days <= 30) return '11-30';
  return '31+';
}

/**
 * Filing-speed histogram: rows carry { series, days }; returns counts per
 * bin for each series plus the rows with no event date.
 */
export function speedBins(rows) {
  const out = { bins: SPEED_BINS, series: {}, noEventDate: 0 };
  for (const r of Array.isArray(rows) ? rows : []) {
    if (r?.days == null) {
      out.noEventDate += 1;
      continue;
    }
    const bin = speedBin(r.days);
    if (!bin) continue;
    const s = r.series || 'all';
    if (!out.series[s]) out.series[s] = Object.fromEntries(SPEED_BINS.map((b) => [b, 0]));
    out.series[s][bin] += 1;
  }
  return out;
}

/* ── price paths ─────────────────────────────────────────────────────── */

/** Rebase a close path to % change from the value at eventIndex. */
export function rebase(path, eventIndex = 0) {
  const pts = (Array.isArray(path) ? path : []).map((p) => num(Array.isArray(p) ? p[1] : p));
  const base = pts[eventIndex];
  if (base == null || base === 0) return [];
  return pts.map((v, i) => [
    Array.isArray(path[i]) ? path[i][0] : i,
    v == null ? null : ((v - base) / base) * 100,
  ]);
}

/** Pointwise median of several [day, pct] paths (days need not align). */
export function medianPath(paths) {
  const byDay = new Map();
  for (const path of Array.isArray(paths) ? paths : []) {
    for (const [d, v] of path || []) {
      if (num(v) == null) continue;
      if (!byDay.has(d)) byDay.set(d, []);
      byDay.get(d).push(num(v));
    }
  }
  return [...byDay.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([d, vals]) => {
      const s = vals.slice().sort((x, y) => x - y);
      const mid = Math.floor(s.length / 2);
      return [d, s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2];
    });
}

/* ── co-filing graph ─────────────────────────────────────────────────── */

const personKey = (p) =>
  p?.cik ||
  `name:${String(p?.name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')}`;

/**
 * Reporting persons across one investor's filings: nodes sized by the
 * largest shares a person reported, edges weighted by filings together.
 */
export function coFilingGraph(filings) {
  const nodes = new Map();
  const edges = new Map();
  for (const f of Array.isArray(filings) ? filings : []) {
    const persons = (f?.reportingPersons || []).filter((p) => p?.name);
    const keys = [];
    for (const p of persons) {
      const k = personKey(p);
      if (k === 'name:') continue;
      keys.push(k);
      const node = nodes.get(k) || {
        key: k,
        name: p.name,
        cik: p.cik || null,
        type: (p.types?.[0] && (p.types[0].code || p.types[0])) || null,
        maxShares: 0,
      };
      node.maxShares = Math.max(node.maxShares, num(p.shares) || 0);
      if (!node.type && p.types?.length) node.type = p.types[0].code || p.types[0];
      nodes.set(k, node);
    }
    const uniq = [...new Set(keys)].sort();
    for (let i = 0; i < uniq.length; i += 1) {
      for (let j = i + 1; j < uniq.length; j += 1) {
        const ek = `${uniq[i]}|${uniq[j]}`;
        edges.set(ek, (edges.get(ek) || 0) + 1);
      }
    }
  }
  return {
    nodes: [...nodes.values()],
    edges: [...edges.entries()].map(([k, weight]) => {
      const [a, b] = k.split('|');
      return { a, b, weight };
    }),
  };
}

/* ── windows and filters ─────────────────────────────────────────────── */

/** [start, end] ISO dates for a window key, ending on asof. */
export function windowRange(win, asof) {
  const end = String(asof).slice(0, 10);
  const endMs = toMs(end);
  const back = (days) => new Date(endMs - days * DAY).toISOString().slice(0, 10);
  if (win === '30d') return [back(30), end];
  if (win === '90d') return [back(90), end];
  if (win === '12m') return [back(365), end];
  return [null, end];
}

/** Apply the page filters to filing rows. */
export function filterFilings(rows, { form = null, tag = null, type = null, basis = null } = {}) {
  return (Array.isArray(rows) ? rows : []).filter((r) => {
    if (form && String(r.form || '').toLowerCase() !== String(form).toLowerCase()) return false;
    if (tag) {
      const tags = (r.tags ?? r.purposeTags ?? []).map((t) => (typeof t === 'string' ? t : t.tag));
      if (!tags.includes(tag)) return false;
    }
    if (type) {
      const types = (r.personTypes ?? r.types ?? []).map((t) =>
        typeof t === 'string' ? t : t.code,
      );
      if (!types.includes(type)) return false;
    }
    if (basis) {
      const bases = (r.gBasis ?? []).map((b) => (typeof b === 'string' ? b : b.key));
      if (!bases.includes(basis)) return false;
    }
    return true;
  });
}
