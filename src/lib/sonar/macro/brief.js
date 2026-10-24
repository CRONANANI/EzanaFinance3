/**
 * The country_rank brief's facts, lede and number check (sonar-country-
 * ranking-fix, B6). Pure; tested in scripts/check-macro-rank.mjs.
 *
 * Every number the brief may use comes from rankFacts(); numbersSupported()
 * rejects a model-written brief containing any number not found in those
 * facts, and deterministicBrief() is the fallback built from the same facts.
 * Copy: findings only.
 */
import { METRICS, WB_ATTRIBUTION } from '@/lib/sonar/macro/rank';

export const RANK_SECTIONS = [
  'Headline rank',
  'How the measure changes the answer',
  'Trajectory',
  'Neighbours',
  'Global Empire Lighthouse view',
  'Markets & money flows',
  'What to watch',
];

export function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

export function fmtMetric(id, v) {
  if (v == null || !Number.isFinite(Number(v))) return null;
  const n = Number(v);
  if (id === 'gdp_growth_real') return `${n.toFixed(1)}%`;
  if (id === 'gdp_per_capita_usd' || id === 'gdp_per_capita_ppp')
    return `$${Math.round(n).toLocaleString('en-US')}`;
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)} trillion`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)} billion`;
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

const ORDER = [
  'gdp_nominal_usd',
  'gdp_ppp',
  'gdp_per_capita_usd',
  'gdp_per_capita_ppp',
  'gdp_growth_real',
];

/** The metrics with a rank for this country, in display order. */
export function rankedMetrics(view) {
  return ORDER.map((id) => view?.metrics?.[id]).filter((m) => m && m.rank != null);
}

/** Evidence lines the synthesis cites (and the only numbers it may use). */
export function rankFacts(view, empire = null) {
  if (!view) return [];
  const facts = [];
  for (const m of rankedMetrics(view)) {
    facts.push(
      `${view.name} ranked ${ordinal(m.rank)} of ${m.of} economies by ${METRICS[m.id].short} in ${m.year}, at ${fmtMetric(m.id, m.value)} (${WB_ATTRIBUTION}; sovereign economies, regional aggregates excluded).`,
    );
    const g = m.gap;
    if (g?.above)
      facts.push(
        `By ${METRICS[m.id].short} in ${m.year}, the economy one place above ${view.name} was ${g.above.name} at ${fmtMetric(m.id, g.above.value)}${g.below ? `; one place below was ${g.below.name} at ${fmtMetric(m.id, g.below.value)}` : ''}.`,
      );
    const h = (m.history || []).filter((x) => x.rank != null);
    if (h.length >= 2) {
      const first = h[0];
      const last = h[h.length - 1];
      facts.push(
        `${view.name}'s rank by ${METRICS[m.id].short} was ${ordinal(first.rank)} in ${first.year} and ${ordinal(last.rank)} in ${last.year}.`,
      );
    }
  }
  if (empire?.rank != null) {
    facts.push(
      `On Ezana's Global Empire Rankings (${empire.year}), ${view.name} ranks ${ordinal(empire.rank)} of ${empire.of}, composite score ${empire.composite}.`,
    );
  }
  return facts;
}

/** The lede: measure, year and source named; numbers from data only. */
export function rankLede(view, empire = null) {
  const ms = rankedMetrics(view);
  if (!ms.length) return null;
  const [head, ...rest] = ms;
  const tail = rest
    .filter((m) => m.id !== 'gdp_growth_real')
    .map((m) => `${ordinal(m.rank)} by ${METRICS[m.id].short}`);
  const growth = ms.find((m) => m.id === 'gdp_growth_real' && m !== head);
  let s = `${view.name} ranks ${ordinal(head.rank)} of ${head.of} economies by ${METRICS[head.id].short} in ${head.year} (World Bank)`;
  if (tail.length) s += `, ${tail.join(', ')}`;
  if (growth) s += `, and ${ordinal(growth.rank)} by ${METRICS.gdp_growth_real.short}`;
  s += '.';
  if (empire?.rank != null)
    s += ` On the Global Empire Rankings it is ${ordinal(empire.rank)} of ${empire.of}.`;
  return s;
}

/** The fallback brief: the lede plus one line per fact. */
export function deterministicBrief(view, empire = null) {
  const lede = rankLede(view, empire);
  if (!lede) return null;
  const facts = rankFacts(view, empire).slice(0, 8);
  return [lede, ...facts.map((f) => `- ${f}`)].join('\n\n');
}

/* ── the number check ─────────────────────────────────────────────────── */

const SCALES = { trillion: 1e12, billion: 1e9, million: 1e6, thousand: 1e3, tn: 1e12, bn: 1e9 };

/** Every number in a text, scaled ("$3.9 trillion" -> 3.9e12; "140th" -> 140). */
export function numbersIn(text) {
  const out = [];
  const re = /(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(trillion|billion|million|thousand|tn|bn)?/gi;
  let m;
  while ((m = re.exec(String(text || '')))) {
    const n = Number(m[1].replace(/,/g, ''));
    if (!Number.isFinite(n)) continue;
    out.push(m[2] ? n * SCALES[m[2].toLowerCase()] : n);
  }
  return out;
}

/** Numbers in `answer` that no fact supports (1% or 0.05 tolerance). */
export function unsupportedNumbers(answer, facts) {
  const allowed = numbersIn((facts || []).join(' '));
  /* Citation markers [S3] are references, not figures. */
  const cleaned = String(answer || '').replace(/\[S\d+\]/g, ' ');
  return numbersIn(cleaned).filter(
    (n) => !allowed.some((a) => Math.abs(n - a) <= Math.max(0.05, Math.abs(a) * 0.01)),
  );
}

export function numbersSupported(answer, facts) {
  return unsupportedNumbers(answer, facts).length === 0;
}

/**
 * Follow-ups as resolved queries (B7). `kind` is the intent each re-ping
 * resolves to; the Empire one is a link to the explorer filtered to the
 * country. The comparison partner is the economy one place above by nominal
 * GDP (or the first ranked metric), from data.
 */
export function rankFollowups(view, empire = null) {
  if (!view) return [];
  const name = view.name;
  const m = view.metrics?.gdp_nominal_usd?.gap
    ? view.metrics.gdp_nominal_usd
    : rankedMetrics(view)[0];
  const peer = m?.gap?.above?.name || m?.gap?.below?.name || null;
  const out = [];
  if (peer)
    out.push({
      label: `Compare ${name} and ${peer}'s economies`,
      query: `compare ${name} and ${peer} economy`,
      kind: 'comparison',
    });
  out.push({
    label: 'Top 10 economies by PPP',
    query: 'top 10 economies by gdp ppp',
    kind: 'ranking',
  });
  out.push({
    label: `${name} GDP per capita rank over time`,
    query: `where does ${name} rank by gdp per capita`,
    kind: 'country_rank',
  });
  out.push({
    label: 'Fastest-growing large economies',
    query: 'fastest growing economies over $1 trillion',
    kind: 'ranking',
  });
  if (empire?.href)
    out.push({ label: `${name} on the Global Empire Rankings`, href: empire.href, kind: 'link' });
  out.push({
    label: `Institutional money in ${name} ETFs`,
    query: `13F holders of ${name} ETFs`,
    kind: 'fund',
  });
  return out;
}
