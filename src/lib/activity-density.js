/**
 * Activity density model for the home Morning Brief card (Nov 2026).
 *
 * Pure: dates, the year grid, levels, stats, and the camera maths the
 * ActivityDensityCard canvas uses to fold the flat heat map into an
 * isometric skyline. Ported from the "Contribution Skyline" component
 * (TypeScript, utility classes) to plain JS; no React, no DOM. Tested by
 * scripts/check-activity-density.mjs.
 *
 * Levels (Ezana's rule, not GitHub's):
 *   0  no login and no recorded action that day
 *   1  logged in (the base colour), no recorded action
 *   2  light activity      } actions split by thirds of the user's own
 *   3  moderate activity   } "busy day" (the 95th percentile of their
 *   4  heavy activity      } action days, so one freak day can't wash
 *                            every other day out to "light")
 * Days are UTC calendar days, matching user_login_history.login_date.
 */

export const DAY_MS = 86400000;

export const clamp01 = (v) => (v > 0 ? (v < 1 ? v : 1) : 0);
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeInOutCubic = (x) => {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
export const easeOutCubic = (x) => 1 - Math.pow(1 - clamp01(x), 3);
export const smoothstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** UTC midnight -> "YYYY-MM-DD". */
export const toKey = (ms) => new Date(ms).toISOString().slice(0, 10);

/** "YYYY-MM-DD" (read literally), a Date (its local day) or a UTC timestamp -> UTC midnight. */
export const dayMs = (v) => {
  if (typeof v === 'number') return Math.floor(v / DAY_MS) * DAY_MS;
  if (typeof v === 'string') {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
    if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
    v = new Date(v);
  }
  return Date.UTC(v.getFullYear(), v.getMonth(), v.getDate());
};

/** 0 none, 1 logged in only, 2-4 by thirds of `busy` (anything at or past `busy` is 4). */
export const levelOf = (actions, login, busy) => {
  if (actions > 0) return busy <= 0 ? 4 : 2 + Math.min(2, Math.floor((actions / busy) * 3));
  return login ? 1 : 0;
};

/**
 * The grid: columns are weeks, rows are weekdays (row 0 = `weekStart`). It
 * ends on `endMs` and starts on the week containing the day one year earlier.
 * `days` is `{ date, actions, login }[]`; repeated dates add up.
 */
export const buildGrid = (days, endMs, weekStart = 0) => {
  const byDay = new Map();
  for (const d of days || []) {
    if (!d || typeof d.date !== 'string') continue;
    const ms = dayMs(d.date);
    if (!Number.isFinite(ms)) continue;
    const k = toKey(ms);
    const prev = byDay.get(k) || { actions: 0, login: false };
    const a = Number(d.actions);
    byDay.set(k, {
      actions: prev.actions + (Number.isFinite(a) && a > 0 ? a : 0),
      login: prev.login || Boolean(d.login),
    });
  }
  let start = endMs - 364 * DAY_MS;
  start -= ((new Date(start).getUTCDay() - weekStart + 7) % 7) * DAY_MS;
  const cells = [];
  for (let ms = start, i = 0; ms <= endMs; ms += DAY_MS, i++) {
    const date = toKey(ms);
    const v = byDay.get(date);
    cells.push({
      date,
      count: v ? v.actions : 0,
      login: v ? v.login : false,
      level: 0,
      week: Math.floor(i / 7),
      day: i % 7,
    });
  }
  const nz = cells
    .map((c) => c.count)
    .filter((c) => c > 0)
    .sort((a, b) => a - b);
  const busy = nz.length ? nz[Math.floor(0.95 * (nz.length - 1))] : 0;
  for (const c of cells) c.level = levelOf(c.count, c.login, busy);
  return {
    cells,
    weeks: cells.length ? cells[cells.length - 1].week + 1 : 0,
    max: nz.length ? nz[nz.length - 1] : 0,
  };
};

const isActive = (c) => c.level > 0;

/**
 * Total actions, active days, busiest day, longest active run, and the run
 * that reaches today (or yesterday: today isn't over).
 */
export const computeStats = (cells) => {
  let total = 0;
  let activeDays = 0;
  let best = 0;
  let bestDate = null;
  let run = 0;
  let runStart = null;
  let longest = { days: 0, start: null, end: null };
  for (const c of cells) {
    total += c.count;
    if (c.count > best) {
      best = c.count;
      bestDate = c.date;
    }
    if (isActive(c)) {
      activeDays += 1;
      if (run === 0) runStart = c.date;
      run++;
      if (run > longest.days) longest = { days: run, start: runStart, end: c.date };
    } else run = 0;
  }
  let j = cells.length - 1;
  if (j >= 0 && !isActive(cells[j])) j--;
  const endAt = j;
  while (j >= 0 && isActive(cells[j])) j--;
  const days = endAt - j;
  const current =
    days > 0
      ? { days, start: cells[j + 1].date, end: cells[endAt].date }
      : { days: 0, start: null, end: null };
  return {
    total,
    activeDays,
    first: cells.length ? cells[0].date : null,
    last: cells.length ? cells[cells.length - 1].date : null,
    busiest: { count: best, date: bestDate },
    longest,
    current,
  };
};

/** A label on each week whose first day starts a new month; a cramped first label is dropped. */
export const monthLabels = (cells, weeks, locale = 'en-US') => {
  const fmt = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' });
  const out = [];
  let prev = -1;
  for (let w = 0; w < weeks; w++) {
    const c = cells[w * 7];
    if (!c) break;
    const m = +c.date.slice(5, 7);
    if (m !== prev) out.push({ week: w, label: fmt.format(dayMs(c.date)) });
    prev = m;
  }
  if (out.length > 1 && out[1].week - out[0].week < 3) out.shift();
  return out;
};

/**
 * Box height in grid units. Empty days are thin slabs, a login-only day a
 * low step, and the busiest day about 7.6 cells tall.
 */
export const barHeight = (count, login, max, scale = 1) => {
  if (count > 0 && max > 0) return 0.6 + Math.pow(count / max, 0.85) * 7 * scale;
  return login ? 0.45 : 0.2;
};

/** Share of the morph each bar spends waiting: the wave sweeps oldest week -> newest. */
export const WAVE = 0.42;

/** 0 -> 1 as a bar rises during the morph. Every bar is flat at t=0 and fully up at t=1. */
export const riseAt = (t, week, weeks, day) => {
  const d = (weeks > 1 ? week / (weeks - 1) : 0) * 0.36 + (day / 6) * 0.06;
  return easeOutCubic((t - d) / (1 - WAVE));
};

export const YAW_3D = Math.PI / 4;
export const ELEV_3D = (34 * Math.PI) / 180;
export const YAW_RANGE = [(8 * Math.PI) / 180, (82 * Math.PI) / 180];
export const ELEV_RANGE = [(18 * Math.PI) / 180, (62 * Math.PI) / 180];

/**
 * e=0 looks straight down (a plain heat map); e=1 is the isometric corner
 * view. Orbit offsets only apply in proportion to e, so the flat view never
 * tilts.
 */
export const camera = (e, dYaw = 0, dElev = 0) => {
  const yaw = Math.min(YAW_RANGE[1], Math.max(0, lerp(0, YAW_3D + dYaw, e)));
  const elev = lerp(
    Math.PI / 2,
    Math.min(ELEV_RANGE[1], Math.max(ELEV_RANGE[0], ELEV_3D + dElev)),
    e,
  );
  return { cs: Math.cos(yaw), sn: Math.sin(yaw), se: Math.sin(elev), ce: Math.cos(elev) };
};

/** World (x = week, y = weekday, z = up) -> screen, before scale/offset. */
export const project = (c, x, y, z) => [
  x * c.cs - y * c.sn,
  (x * c.sn + y * c.cs) * c.se - z * c.ce,
];

export const mixRGB = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
export const luminance = (c) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;

/**
 * A computed CSS colour string -> [r, g, b] (0-255), or null. Handles
 * `rgb()/rgba()` and the `color(srgb r g b)` form browsers return for
 * color-mix(); a fully transparent colour returns null.
 */
export const parseCssColor = (s) => {
  if (!s || typeof s !== 'string') return null;
  let m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/i.exec(
    s.trim(),
  );
  if (m) {
    const a = m[4] == null ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : +m[4];
    return a < 0.03 ? null : [+m[1], +m[2], +m[3]];
  }
  m = /^color\(\s*srgb\s+([\d.e-]+)\s+([\d.e-]+)\s+([\d.e-]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/i.exec(
    s.trim(),
  );
  if (m) {
    const a = m[4] == null ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : +m[4];
    if (a < 0.03) return null;
    return [m[1], m[2], m[3]].map((v) => Math.round(clamp01(+v) * 255));
  }
  return null;
};

/* ------------------------------------------------------------------------
 * Percentiles and profile analytics (Nov 2026). Still pure: the home card
 * shows a percentile under each stat, and the profile Activity section
 * breaks the same year down further.
 * ---------------------------------------------------------------------- */

/** The four stats, in card order, with the profile anchor each one links to. */
export const ACTIVITY_STAT_KEYS = [
  { key: 'activeDays', anchor: 'activity-active-days' },
  { key: 'busiestDay', anchor: 'activity-busiest-day' },
  { key: 'longestStreak', anchor: 'activity-longest-streak' },
  { key: 'currentStreak', anchor: 'activity-current-streak' },
];

/** The live value of each stat, as the percentile RPC wants them. */
export const statValues = (stats) => ({
  activeDays: stats?.activeDays || 0,
  busiestDay: stats?.busiest?.count || 0,
  longestStreak: stats?.longest?.days || 0,
  currentStreak: stats?.current?.days || 0,
});

/** 1 -> "1st", 22 -> "22nd", 13 -> "13th". */
export const ordinal = (n) => {
  const v = Math.abs(Math.trunc(n)) % 100;
  const s = v >= 11 && v <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][v % 10] || 'th';
  return `${Math.trunc(n)}${s}`;
};

/**
 * A 0 to 100 percentile as a label, clamped to 1st..99th so nobody reads
 * "0th" or "100th". null/undefined (not ranked) -> null.
 */
export const percentileLabel = (pct) => {
  if (pct == null || !Number.isFinite(Number(pct))) return null;
  const p = Math.min(99, Math.max(1, Math.round(Number(pct))));
  return `${ordinal(p)} percentile`;
};

/** Per calendar month (UTC) in the grid: active days, actions, days covered. Oldest first. */
export const monthlyActivity = (cells) => {
  const map = new Map();
  for (const c of cells || []) {
    const k = c.date.slice(0, 7);
    const m = map.get(k) || { month: k, activeDays: 0, actions: 0, days: 0 };
    m.days += 1;
    m.actions += c.count;
    if (c.level > 0) m.activeDays += 1;
    map.set(k, m);
  }
  return [...map.values()].sort((a, b) => (a.month < b.month ? -1 : 1));
};

/** Per weekday (0 = Sunday, UTC): active days, actions, and average actions per such day. */
export const weekdayActivity = (cells) => {
  const out = Array.from({ length: 7 }, (_, dow) => ({ dow, activeDays: 0, actions: 0, days: 0 }));
  for (const c of cells || []) {
    const w = out[new Date(dayMs(c.date)).getUTCDay()];
    w.days += 1;
    w.actions += c.count;
    if (c.level > 0) w.activeDays += 1;
  }
  for (const w of out) w.avgActions = w.days ? w.actions / w.days : 0;
  return out;
};

/** The n days with the most actions, most first (newer first on ties). */
export const topDays = (cells, n = 5) =>
  (cells || [])
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count || (a.date < b.date ? 1 : -1))
    .slice(0, n)
    .map((c) => ({ date: c.date, count: c.count }));

/** Every run of active days, longest first (newer first on ties), top n. */
export const topStreaks = (cells, n = 3) => {
  const runs = [];
  let cur = null;
  for (const c of cells || []) {
    if (c.level > 0) {
      if (!cur) cur = { days: 0, start: c.date, end: c.date };
      cur.days += 1;
      cur.end = c.date;
    } else if (cur) {
      runs.push(cur);
      cur = null;
    }
  }
  if (cur) runs.push(cur);
  return runs.sort((a, b) => b.days - a.days || (a.end < b.end ? 1 : -1)).slice(0, n);
};
