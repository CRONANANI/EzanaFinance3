/**
 * Datasets index (Sonar floor): pure derivations from the taxonomy.
 *
 * No imports, so scripts/check-datasets-sonar.mjs can test it directly. Every
 * function takes the taxonomy (or plain data) as an argument: taxonomy.js stays
 * the single source of truth and nothing here redefines a dimension or dataset.
 */

export const MIDDOT = '·';

/* ── copy hygiene ─────────────────────────────────────────────────────── */

/**
 * Display text without em or en dashes. Taxonomy strings are read-only and a
 * few carry spaced em-dash clauses; the page never shows a dash, so they read as a
 * comma here. Number ranges ("$15K" en dash "$50K") become "to".
 */
export function plain(text) {
  if (text == null) return '';
  return String(text)
    .replace(/([\dKMB%])\s*[\u2013\u2014]\s*(\$?\d)/g, '$1 to $2')
    .replace(/\s+[\u2014\u2013]\s+/g, ', ')
    .replace(/[\u2014\u2013]/g, ', ')
    .replace(/,\s*,/g, ',')
    .trim();
}

/**
 * Taxonomy blurbs that say "today" about something that is roadmap. The audit
 * found three; taxonomy.js is read-only, so the page carries an honest version
 * and the test fails the moment a dimension's live state changes, so the
 * override is removed rather than left to drift.
 *   hive        Prediction Markets is live:false, yet the blurb says "odds today".
 *   regulatory  New Laws & Legislation is live:false, yet "legislation tracking today".
 *   lighthouse  only OECD Macro is live, yet "global indicators and wealth today".
 */
export const HONEST_BLURBS = {
  hive: {
    whenLive: 0,
    text: 'Crowd and market-consensus signals: prediction-market odds, community and retail sentiment. On the roadmap.',
  },
  regulatory: {
    whenLive: 0,
    text: 'Legal and policy catalysts: legislation, litigation, enforcement and agency rulings. On the roadmap.',
  },
  lighthouse: {
    whenLive: 1,
    text: 'Macro and geopolitical context: OECD macro indicators today, with world indicators, risk indices, sanctions and GDELT events on the roadmap.',
  },
};

export function honestBlurb(dim, liveCount) {
  const o = HONEST_BLURBS[dim.id];
  if (o && o.whenLive === liveCount) return o.text;
  return plain(dim.blurb);
}

/* ── dimensions ───────────────────────────────────────────────────────── */

const isFullyLive = (item) => item?.live === true;
const isNavigable = (item) => item?.live === true || item?.live === 'preview';

/* Form and filing descriptors that follow a provider in a source string
   ("SEC EDGAR, Form 4"): part of the description, not a separate source. */
const NOT_A_SOURCE = /^(form\b|schedule\b|pay versus|13[fdg]\b|prices pending)/i;

/**
 * Public source names for a list of items, for a caption: split on the middle
 * dot and on commas outside parentheses, parentheticals dropped (web
 * addresses, notes), form descriptors dropped, de-duplicated.
 */
export function sourceNames(items) {
  const out = new Set();
  for (const it of items) {
    const text = plain(it.source || '');
    let depth = 0;
    let cur = '';
    const parts = [];
    for (const ch of text) {
      if (ch === '(') depth++;
      if (ch === ')') depth = Math.max(0, depth - 1);
      if ((ch === '·' || ch === ',') && depth === 0) {
        parts.push(cur);
        cur = '';
      } else cur += ch;
    }
    parts.push(cur);
    for (const raw of parts) {
      const p = raw.replace(/\s*\([^)]*\)/g, '').trim();
      if (p && !NOT_A_SOURCE.test(p)) out.add(p);
    }
  }
  return [...out];
}

/**
 * The view model for every dimension, in taxonomy order. Live and roadmap are
 * split with isFullyLive (a 'preview' page is navigable but never counted as
 * live). `hubHref` is passed in so this module stays import-free.
 */
export function deriveDimensions(taxonomy, hubHref = (id) => `/datasets/${id}`) {
  return taxonomy.map((d) => {
    const live = d.items.filter(isFullyLive);
    const road = d.items.filter((it) => !isFullyLive(it));
    return {
      id: d.id,
      label: d.label,
      color: d.color,
      icon: d.biIcon || 'bi-database',
      tagline: plain(d.tagline),
      blurb: honestBlurb(d, live.length),
      hubHref: hubHref(d.id),
      isLive: live.length > 0,
      liveCount: live.length,
      total: d.items.length,
      live: live.map((it) => ({
        label: it.label,
        description: plain(it.description),
        href: isNavigable(it) ? it.href : null,
        source: plain(it.source),
        sourceType: it.sourceType || 'none',
      })),
      road: road.map((it) => ({
        label: it.label,
        description: plain(it.description),
        source: plain(it.source),
        sourceType: it.sourceType || 'none',
      })),
      sources: sourceNames(live),
    };
  });
}

/** Counts for the header and the sonar head, derived, never typed. */
export function taxonomyCounts(taxonomy) {
  let live = 0;
  let roadmap = 0;
  for (const d of taxonomy) for (const it of d.items) isFullyLive(it) ? live++ : roadmap++;
  return { live, roadmap, dimensions: taxonomy.length };
}

/** A valid dimension id from the URL, or the default. */
export function resolveDimension(taxonomy, raw, fallback = 'capitol') {
  const id = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : null;
  if (id && taxonomy.some((d) => d.id === id)) return id;
  return taxonomy.some((d) => d.id === fallback) ? fallback : taxonomy[0]?.id;
}

/* ── the radar ────────────────────────────────────────────────────────── */

export const RADAR = {
  width: 620,
  height: 560,
  cx: 310,
  cy: 272,
  rings: [62, 125, 188, 252],
  roadRadius: 236,
  /* Live dimensions sit inside the sweep at their own range (approved board). */
  liveRadius: { capitol: 150, titans: 196, eyes: 128, lighthouse: 170 },
  defaultLiveRadius: 160,
  startDeg: 12,
};

const r2 = (n) => Math.round(n * 10) / 10;

/** Short radar name: long labels keep their last word ("Lighthouse", "Whispers"). */
export function radarName(label) {
  return label.length > 16 ? label.split(' ').slice(-1)[0] : label;
}

/**
 * Blip geometry, a pure function of the taxonomy and the selection. Angle is
 * clockwise from 12 o'clock. Labels sit above a blip in the upper half and
 * below it otherwise, anchored left or right once the blip is more than 60
 * units from the centre, and pulled inside the panel.
 */
export function radarLayout(taxonomy, selectedId = null) {
  const { cx, cy, width, height } = RADAR;
  const step = 360 / taxonomy.length;
  return taxonomy.map((d, i) => {
    const liveCount = d.items.filter(isFullyLive).length;
    const live = liveCount > 0;
    const angleDeg = r2(i * step + RADAR.startDeg);
    const radius = live ? (RADAR.liveRadius[d.id] ?? RADAR.defaultLiveRadius) : RADAR.roadRadius;
    const a = (angleDeg * Math.PI) / 180;
    const x = r2(cx + radius * Math.sin(a));
    const y = r2(cy - radius * Math.cos(a));
    const dx = x - cx;
    const anchor = dx > 60 ? 'start' : dx < -60 ? 'end' : 'middle';
    const lx = anchor === 'start' ? x + 12 : anchor === 'end' ? x - 12 : x;
    const upper = y < cy;
    let nameY = upper ? y - 24 : y + 26;
    nameY = Math.max(16, Math.min(height - 22, nameY));
    /* Spoke: a quadratic curve from the blip into the core, bowed slightly
       clockwise so seven spokes read as a flow, not a star. */
    const mx = (x + cx) / 2;
    const my = (y + cy) / 2;
    const bow = 0.12;
    const qx = r2(mx + (y - cy) * bow);
    const qy = r2(my - (x - cx) * bow);
    return {
      id: d.id,
      label: d.label,
      name: radarName(d.label),
      color: d.color,
      live,
      liveCount,
      selected: d.id === selectedId,
      angleDeg,
      radius,
      x,
      y,
      leftPct: r2((x / width) * 100),
      topPct: r2((y / height) * 100),
      labelPos: { x: r2(Math.max(8, Math.min(width - 8, lx))), y: r2(nameY), anchor },
      spoke: `M ${x} ${y} Q ${qx} ${qy} ${cx} ${cy}`,
      /* Two record dots resting along a live spoke (t = 0.35, 0.7). */
      dots: live
        ? [0.35, 0.7].map((t) => ({
            x: r2((1 - t) * (1 - t) * x + 2 * (1 - t) * t * qx + t * t * cx),
            y: r2((1 - t) * (1 - t) * y + 2 * (1 - t) * t * qy + t * t * cy),
          }))
        : [],
    };
  });
}

/** The 66-degree sweep wedge, as a path from the centre. */
export function sweepPath(deg = 66, r = RADAR.rings[3]) {
  const { cx, cy } = RADAR;
  const a = (deg * Math.PI) / 180;
  const x = r2(cx + r * Math.sin(a));
  const y = r2(cy - r * Math.cos(a));
  return `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${x} ${y} Z`;
}

/* ── figures ──────────────────────────────────────────────────────────── */

/** Labels whose summary is another label's (the hub counts these once). */
export const SAME_READ_AS = { 'Fund Holdings Data': 'SEC EDGAR' };

/**
 * Roll a dimension's per-dataset figures up. `figures` maps label to
 * { records, freshest } | { error: true } | null (no summary). Any failed
 * read makes the records roll-up unknown (null) rather than a partial sum;
 * freshest is the latest date that is not in the future.
 */
export function rollup(liveLabels, figures, today = new Date().toISOString().slice(0, 10)) {
  const seen = new Set();
  let records = 0;
  let failed = false;
  let freshest = null;
  for (const label of liveLabels) {
    const key = SAME_READ_AS[label] || label;
    const f = figures[label];
    if (!f || f.error) {
      failed = true;
      continue;
    }
    if (!seen.has(key)) {
      seen.add(key);
      records += Number(f.records) || 0;
    }
    if (f.freshest && f.freshest <= today && f.freshest > (freshest || '')) freshest = f.freshest;
  }
  return { records: failed ? null : records, freshest, failed };
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** "OCT 7", or "DEC 31 2025" outside the current year; null stays null. */
export function shortDay(iso, now = new Date()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m) return null;
  const label = `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}`;
  return Number(m[1]) === now.getUTCFullYear() ? label : `${label} ${m[1]}`;
}

export function int(n) {
  return n == null || !Number.isFinite(Number(n)) ? null : Number(n).toLocaleString('en-US');
}

/** "7.6M", "213K", "3,895": header-sized record counts. */
export function compactCount(n) {
  if (n == null || !Number.isFinite(Number(n))) return null;
  const v = Number(n);
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e5) return `${Math.round(v / 1e3)}K`;
  return v.toLocaleString('en-US');
}

/** "$1.24B", "$860M", "$45K": money in the console preview and arrivals. */
export function compactUsd(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return null;
  const a = Math.abs(v);
  const s = v < 0 ? '-' : '';
  if (a >= 1e9) return `${s}$${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e7) return `${s}$${Math.round(a / 1e6)}M`;
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${s}$${Math.round(a / 1e3)}K`;
  return `${s}$${Math.round(a)}`;
}

/* ── arrivals ─────────────────────────────────────────────────────────── */

/**
 * Round-robin across sources so no source runs back to back, at most
 * `maxPerSource` from each. Empty or missing sources are skipped and named in
 * `omitted`, never filled in.
 */
export function interleaveArrivals(sources, maxPerSource = 4) {
  const buckets = [];
  const omitted = [];
  for (const s of sources) {
    const rows = Array.isArray(s?.items) ? s.items.slice(0, maxPerSource) : [];
    if (rows.length) buckets.push(rows);
    else omitted.push(s?.name || 'unknown');
  }
  const items = [];
  const longest = buckets.reduce((m, b) => Math.max(m, b.length), 0);
  for (let i = 0; i < longest; i++) for (const b of buckets) if (b[i]) items.push(b[i]);
  return { items, omitted };
}

/** "2H AGO", "TODAY", "3D AGO" from an ISO date or timestamp; null when unknown. */
export function relativeAge(value, now = Date.now()) {
  if (!value) return null;
  const s = String(value);
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(s);
  const t = new Date(dateOnly ? `${s}T12:00:00Z` : s).getTime();
  if (!Number.isFinite(t)) return null;
  const mins = Math.max(0, Math.round((now - t) / 60000));
  if (dateOnly) {
    const days = Math.floor(mins / 1440);
    return days <= 0 ? 'TODAY' : `${days}D AGO`;
  }
  if (mins < 60) return `${Math.max(1, mins)}M AGO`;
  if (mins < 1440) return `${Math.round(mins / 60)}H AGO`;
  return `${Math.round(mins / 1440)}D AGO`;
}
