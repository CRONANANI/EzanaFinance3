/**
 * Pure view model for UCDP conflict data, shared by the Armed Conflict Tracker page and
 * Sonar's country conflict panel. No I/O, no React. Copy rules: sentence case, no em dashes,
 * findings only; every figure is a UCDP best estimate unless labelled a range.
 */

export const TYPES = [
  {
    id: 1,
    key: 'state_based',
    label: 'State-based',
    long: 'State-based armed conflict',
    tone: 'sb',
  },
  { id: 2, key: 'non_state', label: 'Non-state', long: 'Non-state conflict', tone: 'ns' },
  {
    id: 3,
    key: 'one_sided',
    label: 'One-sided',
    long: 'One-sided violence against civilians',
    tone: 'os',
  },
];
export const TYPE_BY_ID = Object.fromEntries(TYPES.map((t) => [t.id, t]));

export const TYPE_DEFINITIONS = {
  1: 'Fighting where at least one side is a government, over government or territory.',
  2: 'Fighting between organized armed groups, neither of them a government.',
  3: 'Deliberate killing of civilians by a government or an organized armed group.',
};

export const ATTRIBUTION =
  'Uppsala Conflict Data Program (UCDP), Georeferenced Event Dataset. CC BY 4.0.';

export const fmt = (n) =>
  n == null || !Number.isFinite(Number(n)) ? 'n/a' : Math.round(Number(n)).toLocaleString('en-US');

export const pctChange = (cur, prior) =>
  prior > 0 && cur != null ? (Number(cur) / Number(prior) - 1) * 100 : null;

export const changeText = (v) =>
  v == null
    ? 'new'
    : `${v >= 0 ? '+' : '−'}${Math.abs(v) >= 10 ? Math.round(Math.abs(v)) : Math.abs(v).toFixed(1)}%`;

/** 'YYYY-MM-DD' -> 'Sep 10, 2026' (UTC). */
export const dayLabel = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

/** 'YYYY-MM' -> 'Sep 26' (short) or 'September 2026'. */
export const monthLabel = (ym, long = false) =>
  new Date(`${String(ym).slice(0, 7)}-01T00:00:00Z`).toLocaleDateString('en-US', {
    month: long ? 'long' : 'short',
    year: long ? 'numeric' : '2-digit',
    timeZone: 'UTC',
  });

/** First month with preliminary (monthly release) data, or null. */
export function preliminaryFrom(monthly = []) {
  const m = monthly
    .filter((r) => r.preliminary)
    .map((r) => r.month)
    .sort();
  return m[0] || null;
}

/**
 * Monthly rows by type -> one row per month: { month, sb, ns, os, total, low, high,
 * preliminary }. Months with no events inside the span come back as zeros, so a quiet month
 * is drawn as a gap, not skipped.
 */
export function monthlySeries(monthly = []) {
  if (!monthly.length) return [];
  const by = new Map();
  for (const r of monthly) {
    const row = by.get(r.month) || {
      month: r.month,
      sb: 0,
      ns: 0,
      os: 0,
      total: 0,
      low: 0,
      high: 0,
      events: 0,
      preliminary: false,
    };
    const t = TYPE_BY_ID[r.type]?.tone;
    if (t) row[t] += Number(r.best) || 0;
    row.total += Number(r.best) || 0;
    row.low += Number(r.low) || 0;
    row.high += Number(r.high) || 0;
    row.events += Number(r.events) || 0;
    row.preliminary = row.preliminary || Boolean(r.preliminary);
    by.set(r.month, row);
  }
  const months = [...by.keys()].sort();
  const out = [];
  const [y0, m0] = months[0].split('-').map(Number);
  const [y1, m1] = months[months.length - 1].split('-').map(Number);
  for (
    let y = y0, m = m0;
    y < y1 || (y === y1 && m <= m1);
    m === 12 ? ((m = 1), (y += 1)) : (m += 1)
  ) {
    const key = `${y}-${String(m).padStart(2, '0')}`;
    out.push(
      by.get(key) || {
        month: key,
        sb: 0,
        ns: 0,
        os: 0,
        total: 0,
        low: 0,
        high: 0,
        events: 0,
        preliminary: false,
      },
    );
  }
  return out;
}

/** Headline tiles for the page. */
export function overviewKpis(o) {
  const k = o?.kpis;
  if (!k) return [];
  const change = pctChange(k.deaths, k.prior_deaths);
  return [
    {
      id: 'deaths',
      label: 'Deaths in organized violence, last 12 months',
      value: fmt(k.deaths),
      sub: `Range ${fmt(k.deaths_low)} to ${fmt(k.deaths_high)}`,
      delta:
        change == null
          ? null
          : { text: `${changeText(change)} vs prior 12 months`, up: change >= 0 },
    },
    {
      id: 'conflicts',
      label: 'Active state-based conflicts',
      value: fmt(k.conflicts_active),
      sub: `${fmt(k.wars)} at war level (1,000+ deaths)`,
      delta: null,
    },
    {
      id: 'countries',
      label: 'Countries with active conflict',
      value: fmt(k.countries_active),
      sub: `${fmt(k.countries_with_deaths)} countries recorded deaths`,
      delta: null,
    },
    {
      id: 'civilians',
      label: 'Civilian deaths',
      value: fmt(k.civilians),
      sub: k.deaths > 0 ? `${Math.round((k.civilians / k.deaths) * 100)}% of all deaths` : null,
      delta: null,
    },
  ];
}

/** Country rows with change and dominant type, sorted by a key. */
export function countryRows(o, sort = 'best') {
  const rows = (o?.countries || []).map((c) => {
    const parts = TYPES.map((t) => ({ ...t, value: Number(c[t.key]) || 0 }));
    const dominant = parts.reduce((a, b) => (b.value > a.value ? b : a), parts[0]);
    return {
      ...c,
      change: pctChange(c.best, c.prior),
      dominant: c.best > 0 ? dominant : null,
      parts,
    };
  });
  const key =
    {
      best: (r) => r.best,
      change: (r) => (r.change == null ? -Infinity : r.change),
      events: (r) => r.events,
      civilians: (r) => r.civilians,
    }[sort] || ((r) => r.best);
  return rows.sort((a, b) => key(b) - key(a) || b.events - a.events);
}

/** The fastest-rising countries (at least 100 deaths now, a prior year to compare with). */
export function risingCountries(o, limit = 6) {
  return countryRows(o)
    .filter((r) => r.best >= 100 && r.prior > 0 && r.change != null && r.change > 0)
    .sort((a, b) => b.change - a.change)
    .slice(0, limit);
}

/** Ticker items: the deadliest countries over the last 12 months with their change. */
export function tickerItems(o, limit = 25) {
  return countryRows(o)
    .slice(0, limit)
    .map((r) => ({
      id: r.iso3,
      lead: r.dominant?.label || 'Conflict',
      main: r.country,
      value: `${fmt(r.best)} deaths`,
      _iso3: r.iso3,
    }));
}

/** Map cells -> { x, y, r, ... } on the 360 x 150 equirectangular viewBox (lat 85 to -65). */
export function mapPoints(cells = [], { maxR = 7, minR = 0.6 } = {}) {
  const max = Math.max(1, ...cells.map((c) => Number(c[2]) || 0));
  return cells
    .filter((c) => c[0] <= 85 && c[0] >= -65)
    .map(([lat, lon, best, events, sb, ns, os, iso3]) => {
      const dom = [
        [1, sb],
        [2, ns],
        [3, os],
      ].reduce((a, b) => (b[1] > a[1] ? b : a));
      return {
        key: `${lat}:${lon}`,
        x: lon + 180,
        y: 85 - lat,
        r: best > 0 ? Math.max(minR, Math.sqrt(best / max) * maxR) : minR,
        best,
        events,
        type: best > 0 ? dom[0] : null,
        iso3,
        lat,
        lon,
      };
    });
}

/** Country picture -> KPI tiles for the country panel and Sonar. */
export function countryKpis(c) {
  const k = c?.kpis;
  if (!k) return [];
  const change = pctChange(k.deaths, k.prior_deaths);
  return [
    {
      id: 'deaths',
      label: 'Deaths, last 12 months',
      value: fmt(k.deaths),
      sub: `Range ${fmt(k.deaths_low)} to ${fmt(k.deaths_high)}`,
      delta:
        change == null
          ? null
          : { text: `${changeText(change)} vs prior 12 months`, up: change >= 0 },
    },
    {
      id: 'events',
      label: 'Recorded events',
      value: fmt(k.events),
      sub: null,
      delta: null,
    },
    {
      id: 'civilians',
      label: 'Civilian deaths',
      value: fmt(k.civilians),
      sub: k.deaths > 0 ? `${Math.round((k.civilians / k.deaths) * 100)}% of deaths` : null,
      delta: null,
    },
    {
      id: 'share',
      label: 'Share of global deaths',
      value: k.global_share == null ? 'n/a' : `${(k.global_share * 100).toFixed(1)}%`,
      sub: null,
      delta: null,
    },
  ];
}

/**
 * Answer-first findings for a country (Sonar evidence and the panel's summary line). Only
 * figures the panel shows.
 */
export function countryFindings(c) {
  const k = c?.kpis;
  if (!k) return [];
  const out = [];
  const name = c.country || c.iso3;
  const window = `the 12 months to ${dayLabel(c.window?.to)}`;
  const change = pctChange(k.deaths, k.prior_deaths);
  out.push(
    `UCDP recorded ${fmt(k.deaths)} deaths in organized violence in ${name} in ${window} (range ${fmt(k.deaths_low)} to ${fmt(k.deaths_high)}), across ${fmt(k.events)} events${
      change == null
        ? ''
        : `, ${change >= 0 ? 'up' : 'down'} ${Math.round(Math.abs(change))}% on the 12 months before (${fmt(k.prior_deaths)})`
    }.`,
  );
  const parts = TYPES.map((t) => [t, Number(k[t.key]) || 0]).filter(([, v]) => v > 0);
  if (parts.length)
    out.push(
      `By type: ${parts.map(([t, v]) => `${t.label.toLowerCase()} ${fmt(v)}`).join(', ')}; civilians were ${fmt(k.civilians)} of the deaths.`,
    );
  const top = c.conflicts?.[0];
  if (top)
    out.push(
      `The deadliest conflict was ${top.name} with ${fmt(top.best)} deaths over ${fmt(top.events)} events; the most active parties were ${(
        c.actors || []
      )
        .slice(0, 3)
        .map((a) => a.actor)
        .join(', ')}.`,
    );
  if (k.global_share != null)
    out.push(
      `${name} accounted for ${(k.global_share * 100).toFixed(1)}% of deaths UCDP recorded worldwide in the same period.`,
    );
  return out;
}

/** True when a country has enough conflict to show the panel unasked (1,000+ deaths a year). */
export const majorConflict = (c) => Number(c?.kpis?.deaths) >= 1000;

/** A ping that asks about conflict, violence or security. */
export const CONFLICT_CUE_RE =
  /\b(conflicts?|war|wars|warfare|violence|violent|fighting|clashes?|fatalit\w*|deaths?|killed|killings?|attacks?|insurgen\w*|militan\w*|rebels?|civil war|armed|security situation|terror\w*|massacres?|genocide|ceasefire|battles?|casualt\w*)\b/i;
