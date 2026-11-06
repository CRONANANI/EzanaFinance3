/**
 * Sonar country Key chart: pick the freshest series per tab (Nov 2026). Pure.
 *
 * The Key chart's tabs were OECD Economic Outlook annual series, whose actual years stop
 * at 2023 for most countries (later years are OECD projections), while Ezana's macro
 * catalogue (IMF CPI, BIS policy rates, Eurostat, national statistics) often runs to last
 * month. Each tab now shows whichever series has the later observed period:
 *
 *   Infl      catalogue inflation_monthly (y/y; computed from the index when the row is one)
 *   Key rate  catalogue policy_rate
 *   GDP, Unemp, Cur. acct, Debt   the catalogue family when its latest period is later
 *   LT rate   OECD only (the catalogue has no long-term yield family)
 *
 * A catalogue story has the same shape as an OECD one (landing-country.js seriesStory), so
 * the UI draws either: points carry `year` (a fractional year for monthly data, so the x
 * axis and hover stay linear) and `label` ('Sep 2026'). Stats are computed over the points
 * shown and labelled with the span they cover (`normYears`). Projections exist only on the
 * OECD series; `projection` and every point's `proj` are false on a catalogue story.
 *
 * No I/O: landing-country.js reads the histories (bounded) and hands them in.
 */
import { yoyFromIndexHistory } from './macro/currency.js';
import { periodLabel, periodEnd, isProjection } from './macro/catalog.js';

export const OECD_SOURCE = 'OECD Economic Outlook';

/** OECD story slug -> the catalogue family that can stand in for it. */
export const KEY_CHART_FAMILIES = {
  'eo-cpi_ytypct': 'inflation_monthly',
  'eo-gdpv_annpct': 'gdp_growth',
  'eo-unr': 'unemployment',
  'eo-ggflq': 'gov_debt',
  'eo-cbgdpr': 'current_account',
  'eo-ircb': 'policy_rate',
};

/* Families whose catalogue series is the tab's series whenever it reaches the OECD
   series' latest actual year (monthly, so fresher within the year as well). */
const PREFER_CATALOGUE = new Set(['inflation_monthly', 'policy_rate']);

/* Plain labels for the headline sentence ("Inflation is running above ..."). */
const FAMILY_LABEL = {
  inflation_monthly: 'Inflation',
  gdp_growth: 'Real GDP growth',
  unemployment: 'Unemployment rate',
  gov_debt: 'Government gross debt',
  current_account: 'Current account balance',
  policy_rate: 'Policy rate',
};

const NORM_YEARS = 20;

/* ------------------------------------------------------------------ periods */

/** '2026-09' -> 2026.667 (start of the month); '2026-Q3' -> 2026.5; '2026-11-05' -> day share; '2023' -> 2023. */
export function periodX(period) {
  const s = String(period ?? '');
  let m;
  if ((m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s))) {
    const y = +m[1];
    const start = Date.UTC(y, 0, 1);
    const days = (Date.UTC(y + 1, 0, 1) - start) / 864e5;
    return y + (Date.UTC(y, +m[2] - 1, +m[3]) - start) / 864e5 / days;
  }
  if ((m = /^(\d{4})-(\d{2})$/.exec(s))) return +m[1] + (+m[2] - 1) / 12;
  if ((m = /^(\d{4})-Q([1-4])$/.exec(s))) return +m[1] + (+m[2] - 1) / 4;
  if ((m = /^(\d{4})$/.exec(s))) return +m[1];
  return null;
}

/** The latest observed period of a story: its catalogue period, or the OECD actual year. */
export function storyLatestPeriod(story) {
  if (!story?.latest) return null;
  return story.latest.period ?? String(story.latest.year);
}

/* ------------------------------------------------------------------ stats */

function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const k = Math.floor(s.length / 2);
  return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2;
}

function stdev(xs) {
  const mu = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - mu) ** 2, 0) / xs.length);
}

/** The headline sentence for a story, naming its latest period. No adjectives the numbers do not carry. */
export function storyHeadline(s) {
  if (!s) return '';
  const when = s.periodLabel ? ` as of ${s.periodLabel}` : '';
  const label = s.headlineLabel || s.label;
  if (Math.abs(s.z) < 0.5) return `${label} is close to its ${s.normYears}-year norm${when}`;
  return `${label} is running ${s.z > 0 ? 'above' : 'below'} its ${s.normYears}-year norm${when}`;
}

/* ------------------------------------------------------------------ catalogue points */

const clean = (h) =>
  (h || [])
    .filter((p) => p && p.period != null && p.value != null && Number.isFinite(Number(p.value)))
    .map((p) => ({ period: String(p.period), value: Number(p.value) }))
    .sort((a, b) => (a.period < b.period ? -1 : a.period > b.period ? 1 : 0));

const MONTHS_RE = /^(\d{4})-(\d{2})/;

/* Daily rows -> one per month (the month's last observation), labelled by the month. A
   policy rate is a step function (ECB rows are dated at each change), so a month with no
   row carries the rate in force forward, up to the latest observed month and no further. */
function toMonthly(h, { stepFill = false } = {}) {
  const byMonth = new Map();
  for (const p of h) {
    const m = MONTHS_RE.exec(p.period);
    if (m) byMonth.set(`${m[1]}-${m[2]}`, p.value);
  }
  const months = [...byMonth.keys()].sort();
  if (!stepFill || months.length < 2)
    return months.map((k) => ({ period: k, value: byMonth.get(k) }));
  const out = [];
  let [y, mo] = months[0].split('-').map(Number);
  const [ly, lm] = months[months.length - 1].split('-').map(Number);
  let last = null;
  while (y < ly || (y === ly && mo <= lm)) {
    const k = `${y}-${String(mo).padStart(2, '0')}`;
    if (byMonth.has(k)) last = byMonth.get(k);
    if (last != null) out.push({ period: k, value: last });
    mo += 1;
    if (mo > 12) {
      mo = 1;
      y += 1;
    }
  }
  return out;
}

/**
 * A catalogue history -> the observed points the chart may show, oldest first.
 *   mode 'yoy_from_index'  the y/y change is computed from the index
 *   projection years (IMF WEO, AMECO: the current year and later) are dropped
 *   daily rows are reduced to months (policy rates carried forward between changes)
 * -> [{ period, value }]
 */
export function cataloguePoints(
  history,
  { family, source, seriesKey, mode = 'rate', now = new Date() } = {},
) {
  let h = clean(history).filter(
    (p) => !isProjection({ source, series_key: seriesKey, period: p.period }, now),
  );
  if (!h.length) return [];
  if (/^\d{4}-\d{2}-\d{2}$/.test(h[h.length - 1].period)) {
    h = toMonthly(h, { stepFill: family === 'policy_rate' });
  } else if (family === 'policy_rate' && /^\d{4}-\d{2}$/.test(h[h.length - 1].period)) {
    h = toMonthly(h, { stepFill: true });
  }
  if (mode === 'yoy_from_index') h = yoyFromIndexHistory(h);
  return h;
}

/**
 * A catalogue series -> a Key chart story (the OECD story's shape plus source fields), or
 * null when too thin for a norm (fewer than 24 monthly or 8 annual / quarterly points before
 * the latest one).
 *   spec: { family, points: [{ period, value }], label, short, unit, seriesName, decimals,
 *           signed, attribution, source, seriesKey, slug, euroArea }
 */
export function catalogueStory(spec) {
  const pts = (spec?.points || [])
    .map((p) => ({ ...p, x: periodX(p.period) }))
    .filter((p) => p.x != null && Number.isFinite(p.value));
  if (pts.length < 2) return null;
  const monthly = /^\d{4}-\d{2}$/.test(pts[pts.length - 1].period);
  const latestP = pts[pts.length - 1];
  const window = pts.filter((p) => p.x < latestP.x && p.x >= latestP.x - NORM_YEARS);
  if (window.length < (monthly ? 24 : 8)) return null;
  const vals = window.map((p) => p.value);
  const med = median(vals);
  const sd = stdev(vals);
  const z = sd > 0 ? (latestP.value - med) / sd : 0;
  /* The span the norm actually covers, stated honestly ("5Y median"). */
  const normYears = Math.max(1, Math.min(NORM_YEARS, Math.round(latestP.x - window[0].x)));
  const shown = [...window, latestP].map((p) => ({
    year: p.x,
    value: p.value,
    proj: false,
    period: p.period,
    label: periodLabel(p.period),
  }));
  const peak = shown.reduce((a, b) => (b.value > a.value ? b : a), shown[0]);
  const trough = shown.reduce((a, b) => (b.value < a.value ? b : a), shown[0]);
  const latest = shown[shown.length - 1];
  const fam = spec.family;
  const story = {
    slug: spec.slug || fam,
    family: fam,
    label: spec.label || FAMILY_LABEL[fam] || fam,
    headlineLabel: `${FAMILY_LABEL[fam] || spec.label || fam}${spec.euroArea ? ' (euro area)' : ''}`,
    short: spec.short || spec.label || fam,
    seriesName: spec.seriesName || null,
    unit: spec.unit || '%',
    decimals: spec.decimals ?? 1,
    signed: Boolean(spec.signed),
    points: shown,
    latest,
    median: med,
    sd,
    z,
    peak,
    trough,
    normYears,
    source: spec.attribution || spec.source || 'Ezana macro catalogue',
    sourceId: spec.source || null,
    seriesKey: spec.seriesKey || null,
    periodLabel: periodLabel(latest.period),
    projection: false,
  };
  story.headline = storyHeadline(story);
  return story;
}

/** An OECD story with the Key chart's source fields (a copy; the dossier's OECD leg is untouched). */
export function annotateOecdStory(s) {
  if (!s) return null;
  const out = {
    ...s,
    source: OECD_SOURCE,
    periodLabel: String(s.latest?.year ?? ''),
    projection: (s.points || []).some((p) => p.proj),
  };
  out.headline = storyHeadline(out);
  return out;
}

/** True when the story draws OECD projection years (dashes, band, legend and note). */
export const hasProjection = (s) =>
  Boolean(s && s.source === OECD_SOURCE && (s.points || []).some((p) => p.proj));

/**
 * The tab's series: the catalogue's when its latest observed period ends after the OECD
 * series' latest actual year (or, for inflation and the policy rate, when it reaches that
 * year at all), else OECD. Either may be null.
 */
export function chooseStory(oecdStory, catStory) {
  if (!catStory) return oecdStory || null;
  if (!oecdStory) return catStory;
  const oEnd = periodEnd(storyLatestPeriod(oecdStory));
  const cEnd = periodEnd(storyLatestPeriod(catStory));
  if (!cEnd) return oecdStory;
  if (!oEnd || cEnd > oEnd) return catStory;
  const cYear = Number(String(storyLatestPeriod(catStory)).slice(0, 4));
  if (PREFER_CATALOGUE.has(catStory.family) && cYear >= Number(oecdStory.latest.year))
    return catStory;
  return oecdStory;
}

/**
 * Merge the OECD stories with the catalogue stories, one tab per slug in `order`.
 *   oecdStories     the OECD leg's stories (landing-country.js seriesStory)
 *   catalogueBySlug { [slug]: catalogueStory }
 *   meta            { [slug]: { label, short } } for a tab only the catalogue fills
 * -> { stories, storyIndex } (the story is the series furthest from its own norm; ties
 *    keep `order`), or null when no tab has a series.
 */
export function mergeKeyStories(oecdStories, catalogueBySlug = {}, { order = [], meta = {} } = {}) {
  const bySlug = new Map((oecdStories || []).map((s) => [s.slug, s]));
  const slugs = [...new Set([...order, ...bySlug.keys()])];
  const stories = [];
  for (const slug of slugs) {
    const o = bySlug.has(slug) ? annotateOecdStory(bySlug.get(slug)) : null;
    let c = catalogueBySlug[slug] || null;
    if (c) {
      /* The tab keeps its OECD name and short label; the note names the catalogue series. */
      const m = meta[slug] || o || {};
      c = { ...c, slug, label: m.label || c.label, short: m.short || c.short };
      c.headline = storyHeadline(c);
    }
    const pick = chooseStory(o, c);
    if (pick) stories.push(pick);
  }
  if (!stories.length) return null;
  let storyIndex = 0;
  stories.forEach((s, i) => {
    if (Math.abs(s.z) > Math.abs(stories[storyIndex].z) + 1e-9) storyIndex = i;
  });
  return { stories, storyIndex };
}
