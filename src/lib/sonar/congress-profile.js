/**
 * The congressional profile report (Nov 21 2026): what a quick ping about one member of
 * Congress shows inside the universal Sonar answer shell (SonarAnswerFrame). Pure and
 * client-safe; every figure comes from the member dossier (lib/sonar/landing-politician)
 * and nothing here invents a value. Unit-tested in scripts/check-sonar-congress-profile.mjs.
 *
 *   politicianFollowUps  two or three follow-up questions the member's own datasets can answer
 *   tradingLean          the past year's disclosed purchases against disclosed sales
 *   seriesChange         the estimated open value now against N months earlier
 *   chartAxis            month ticks for the estimated value chart
 *   newsRows             the news columns flattened into one short list
 *   congressSections     the answer sections this report renders (for the side navigation)
 */

const SUFFIX = /^(jr|sr|ii|iii|iv)\.?$/i;

/** The member's last name, for questions ("Pelosi"), from the full filed name. */
export function lastNameOf(name) {
  const words = String(name || '')
    .replace(/,.*$/, '')
    .split(/\s+/)
    .filter((w) => w && !SUFFIX.test(w));
  return words.length ? words[words.length - 1] : '';
}

const clean = (q) =>
  String(q || '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Follow-up questions grounded in the dossier: each is asked only when the member's own data
 * can answer it (holdings, a year of the estimated series, recent filings, committee seats).
 * The answer's own related questions fill any space left, but only those that name the
 * member, so a suggestion never drifts off the subject. At most `max`; fewer than two returns
 * what there is (the row hides when empty).
 */
export function politicianFollowUps(dossier, related = [], { max = 3 } = {}) {
  if (!dossier || dossier.kind !== 'politician') return [];
  const name = clean(dossier.name);
  const last = lastNameOf(name);
  if (!name || !last) return [];
  const out = [];
  if (Array.isArray(dossier.holdings) && dossier.holdings.length)
    out.push(`What are ${name}'s largest estimated current holdings?`);
  if (Array.isArray(dossier.series) && dossier.series.length >= 12)
    out.push(`How has ${last}'s disclosed portfolio changed over the last year?`);
  if (Array.isArray(dossier.recentTrades) && dossier.recentTrades.length)
    out.push(`Which of ${last}'s recent disclosed trades were the most significant?`);
  if (Array.isArray(dossier.committees) && dossier.committees.length)
    out.push(`Do ${last}'s trades fall in sectors their committees oversee?`);
  const named = new RegExp(`\\b${last.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  for (const q of Array.isArray(related) ? related : []) {
    const c = clean(q);
    if (c && named.test(c)) out.push(c);
  }
  const seen = new Set();
  return out
    .filter((q) => {
      const k = q.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, max);
}

/* A grouped position's disclosed total at the range midpoint. */
const midOf = (g) => {
  const lo = Number(g?.min) || 0;
  const hi = Number(g?.max) || lo;
  return (lo + hi) / 2;
};

export const LEAN_BANDS = [
  { min: 0.6, label: 'Strong net buying' },
  { min: 0.2, label: 'Net buying' },
  { min: -0.2, label: 'Balanced' },
  { min: -0.6, label: 'Net selling' },
  { min: -Infinity, label: 'Strong net selling' },
];

/**
 * The past year's disclosed purchases against disclosed sales, at range midpoints. A
 * description of the filings, never a forecast. Null when there is no trade in the year.
 * -> { score (-1 to 1), label, buy, sell, buys, sells }
 */
export function tradingLean(dossier) {
  const buys = Array.isArray(dossier?.buys12m) ? dossier.buys12m : [];
  const sells = Array.isArray(dossier?.sells12m) ? dossier.sells12m : [];
  const buy = buys.reduce((s, g) => s + midOf(g), 0);
  const sell = sells.reduce((s, g) => s + midOf(g), 0);
  if (!(buy + sell > 0)) return null;
  const score = (buy - sell) / (buy + sell);
  const label = LEAN_BANDS.find((b) => score >= b.min).label;
  return {
    score,
    label,
    buy,
    sell,
    buys: buys.reduce((s, g) => s + (Number(g?.count) || 0), 0),
    sells: sells.reduce((s, g) => s + (Number(g?.count) || 0), 0),
  };
}

/**
 * The estimated open value now against `back` months earlier, from the month-end series.
 * Null when the series is too short or the earlier value is zero.
 */
export function seriesChange(series, back = 12) {
  if (!Array.isArray(series) || series.length < back + 1) return null;
  const to = Number(series[series.length - 1]);
  const from = Number(series[series.length - 1 - back]);
  if (!Number.isFinite(to) || !Number.isFinite(from) || from <= 0) return null;
  return { from, to, pct: ((to - from) / from) * 100, back };
}

/* Time periods for the portfolio chart, in months (Nov 21: 1Y, 3Y, 5Y, 10Y, all time). */
export const SERIES_PERIODS = [
  { key: '1Y', months: 12 },
  { key: '3Y', months: 36 },
  { key: '5Y', months: 60 },
  { key: '10Y', months: 120 },
];
export const ALL_TIME = 'ALL TIME';

/**
 * The chart's five periods for a month-end series of `count` points, always in the same order
 * so the selector never changes shape. A period is available when the series covers it (a
 * 36-point series counts as 3Y); ALL TIME always is. -> [{ key, months, available }]
 */
export function seriesPeriods(count) {
  const n = Number(count) || 0;
  if (n < 2) return [];
  return [
    ...SERIES_PERIODS.map((p) => ({ ...p, available: p.months <= n })),
    { key: ALL_TIME, months: n - 1, available: true },
  ];
}

/** The last `period.months` months of the series (months + 1 month-end points). */
export function sliceSeries(series, months, period) {
  const s = Array.isArray(series) ? series : [];
  const m = Array.isArray(months) ? months : [];
  if (!period) return { series: s, months: m };
  const take = Math.min(s.length, period.months + 1);
  return { series: s.slice(-take), months: m.slice(-take) };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2025-01" -> "Jan '25". */
export function monthLabel(key) {
  const m = /^(\d{4})-(\d{2})/.exec(String(key || ''));
  if (!m) return '';
  return `${MONTHS[Number(m[2]) - 1]} '${m[1].slice(2)}`;
}

/**
 * Month ticks for the value chart: about `room` evenly spaced labels, always the first and
 * last month. -> [{ i, text }]
 */
export function chartAxis(months, room = 6) {
  const list = Array.isArray(months) ? months : [];
  if (list.length < 2) return [];
  const n = Math.max(2, Math.min(room, list.length));
  const step = (list.length - 1) / (n - 1);
  const seen = new Set();
  const out = [];
  for (let k = 0; k < n; k += 1) {
    const i = Math.round(k * step);
    if (seen.has(i)) continue;
    seen.add(i);
    out.push({ i, text: monthLabel(list[i]) });
  }
  return out;
}

/** Compact dollars with two decimals: $52.21M, $850.00K. */
export function usdCompact(n) {
  if (n == null || n === '') return 'N/A';
  const v = Number(n);
  if (!Number.isFinite(v)) return 'N/A';
  const a = Math.abs(v);
  if (a >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `$${(v / 1e3).toFixed(2)}K`;
  return `$${v.toFixed(2)}`;
}

/**
 * The news columns as one list: items taken in turn from each column (so the member's own
 * headlines and their positions both appear), deduplicated by URL, at most `max`.
 */
export function newsRows(columns, max = 4) {
  const cols = (Array.isArray(columns) ? columns : []).map((c) =>
    Array.isArray(c?.items) ? c.items.filter((n) => n && n.url && n.title) : [],
  );
  const out = [];
  const seen = new Set();
  for (let depth = 0; out.length < max && cols.some((c) => c.length > depth); depth += 1) {
    for (const c of cols) {
      const n = c[depth];
      if (!n || seen.has(n.url)) continue;
      seen.add(n.url);
      out.push(n);
      if (out.length >= max) break;
    }
  }
  return out;
}

/**
 * The sections this report renders, in the navigation's vocabulary (lib/sonar/answer-sections):
 * the Desk summary always, Key findings with two or more takeaways, Charts and data when the
 * dossier has a chart, positions or similar members, Evidence and sources when there are any.
 */
export function congressSections({ dossier, takeaways = [], sourceCount = 0 } = {}) {
  const out = ['answer'];
  if (Array.isArray(takeaways) && takeaways.length >= 2) out.push('findings');
  const charts =
    (Array.isArray(dossier?.series) && dossier.series.length >= 2) ||
    (Array.isArray(dossier?.holdings) && dossier.holdings.length) ||
    (Array.isArray(dossier?.similar) && dossier.similar.length);
  if (charts) out.push('charts');
  if (sourceCount > 0) out.push('sources');
  return out;
}

/* ── Key findings and the trading lean, explained ────────────────────── */

const STOPW = new Set(
  'the a an and or of in on to for with by at from as is are was were be been her his their its this that these those than over into about which while also more most'.split(
    ' ',
  ),
);
const words = (t) =>
  String(t || '')
    .toLowerCase()
    .replace(/\[s\d+(?:,\s*s\d+)*\]/gi, ' ')
    .replace(/[^a-z0-9$%.]+/g, ' ')
    .split(' ')
    .filter((w) => w.length > 2 && !STOPW.has(w));

/** A paragraph's sentences; citation markers stay with the sentence they close. */
export function sentencesOf(paragraph) {
  return String(paragraph || '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?](?:\s*\[[^\]]+\])?)\s+(?=[A-Z])/)
    .map((x) => x.trim())
    .filter((x) => x.length > 12);
}

/**
 * Key findings: what the full brief says beyond the desk summary, as bullets. A sentence
 * whose words are mostly already in the summary is left out, so nothing repeats. The
 * answer's own takeaways fill in when the brief adds fewer than two. At most `max`.
 */
export function briefFindings(brief = [], summary = [], takeaways = [], { max = 6 } = {}) {
  const seen = new Set(words(summary.join(' ')));
  const novel = (text) => {
    const w = words(text);
    if (!w.length) return false;
    const known = w.filter((x) => seen.has(x)).length;
    return known / w.length < 0.6;
  };
  const out = [];
  const add = (t) => {
    if (out.length >= max || !novel(t)) return;
    out.push(t);
    for (const w of words(t)) seen.add(w);
  };
  for (const p of Array.isArray(brief) ? brief : [])
    for (const sentence of sentencesOf(p)) add(sentence);
  if (out.length < 2)
    for (const t of Array.isArray(takeaways) ? takeaways : []) add(String(t || '').trim());
  return out;
}

/**
 * Why the trading lean reads as it does, from the member's own filings: what was bought,
 * what was sold, the net, and the latest filing. Every figure is a disclosed range or its
 * midpoint. -> string[]
 */
export function leanBullets(dossier, lean = tradingLean(dossier)) {
  if (!lean) return [];
  const buys = Array.isArray(dossier?.buys12m) ? dossier.buys12m : [];
  const sells = Array.isArray(dossier?.sells12m) ? dossier.sells12m : [];
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const lead = (g) =>
    g?.ticker
      ? `led by ${g.ticker} (${plural(Number(g.count) || 0, 'trade')}${g.range ? `, ${g.range}` : ''})`
      : null;
  const out = [];
  out.push(
    lean.buys
      ? `Bought: ${plural(lean.buys, 'purchase')} worth about ${usdCompact(lean.buy)}${lead(buys[0]) ? `, ${lead(buys[0])}` : ''}.`
      : 'Bought: no disclosed purchases in the past 12 months.',
  );
  out.push(
    lean.sells
      ? `Sold: ${plural(lean.sells, 'sale')} worth about ${usdCompact(lean.sell)}${lead(sells[0]) ? `, ${lead(sells[0])}` : ''}.`
      : 'Sold: no disclosed sales in the past 12 months.',
  );
  /* Nov 21: where the money went by kind of asset, so bonds and other untickered holdings
     are part of the explanation and not hidden behind the largest single trade. */
  const split = (groups) => {
    let listed = 0;
    let other = 0;
    let otherN = 0;
    for (const g of groups) {
      const m = midOf(g);
      if (g?.listed === false) {
        other += m;
        otherN += Number(g.count) || 0;
      } else listed += m;
    }
    return { listed, other, otherN };
  };
  const b = split(buys);
  const sl = split(sells);
  if (b.other || sl.other)
    out.push(
      `By asset type: bonds, notes and other untickered assets were about ${usdCompact(b.other)} of purchases (${plural(b.otherN, 'trade')}) and ${usdCompact(sl.other)} of sales; stocks and funds were about ${usdCompact(b.listed)} bought and ${usdCompact(sl.listed)} sold.`,
    );
  const diff = Math.abs(lean.buy - lean.sell);
  if (lean.buy && lean.sell)
    out.push(
      lean.sell > lean.buy
        ? `Sales outweighed purchases by about ${usdCompact(diff)}, so the lean reads ${lean.label.toLowerCase()}.`
        : `Purchases outweighed sales by about ${usdCompact(diff)}, so the lean reads ${lean.label.toLowerCase()}.`,
    );
  const last = Array.isArray(dossier?.recentTrades) ? dossier.recentTrades[0] : null;
  if (last?.member && last?.type)
    out.push(
      `Latest filing: a ${last.type} of ${last.member}${last.range ? ` (${last.range})` : ''}${last.date ? ` on ${last.date}` : ''}.`,
    );
  return out;
}

/**
 * Disclosed volume over the last `months` months of the dossier's monthly volume (the
 * Politician Tracker's measure: range midpoints of every trade in the window). Null when the
 * dossier has no monthly volume (an answer cached before it existed).
 * -> { total, buy, sell, count }
 */
export function periodVolume(volume, months) {
  if (!volume || !Array.isArray(volume.total) || !volume.total.length) return null;
  const take = Math.max(1, Math.min(volume.total.length, Number(months) || volume.total.length));
  const sum = (arr) =>
    Array.isArray(arr) ? arr.slice(-take).reduce((a, b) => a + (Number(b) || 0), 0) : 0;
  return {
    total: sum(volume.total),
    buy: sum(volume.buy),
    sell: sum(volume.sell),
    count: sum(volume.count),
  };
}
