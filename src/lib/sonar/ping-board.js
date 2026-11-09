/**
 * The ping board (Nov 2026): pure view helpers for SonarPingBoard.jsx, the shared answer
 * layout for every quick ping on /datasets that is not a country intelligence answer
 * (a company, a member of Congress, a sector, an industry, flows, sanctions, a commodity, an
 * open question). Same rows as the country and research boards
 * (docs/sonar/answer-templates): executive answer and top matches, a KPI strip, evidence and
 * coverage, the charts and data, then sources. No I/O; tested in
 * scripts/check-sonar-ping-board.mjs.
 */
import { datasetEvidence } from './country-board.js';

const num = (v) => typeof v === 'number' && Number.isFinite(v);

const usd = (n) => {
  if (!num(n)) return null;
  const a = Math.abs(n);
  const [d, s] = a >= 1e12 ? [1e12, 'T'] : a >= 1e9 ? [1e9, 'B'] : a >= 1e6 ? [1e6, 'M'] : [1, ''];
  return `$${(n / d).toFixed(2)}${s}`;
};

/** The answer's paragraphs, trimmed: [lead, ...rest] (at most `max`). */
export function answerParagraphs(answer, max = 4) {
  return String(answer || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, max);
}

/**
 * The KPI strip: a company's valuation tiles when the dossier has fundamentals, else nothing.
 * Nov 9, 2026: the fallback tiles that counted what the ping drew on (datasets matched,
 * records cited, web pages read, news stories) are gone from every Sonar answer; the counts
 * said nothing about the answer, and the evidence and sources rows already list the records.
 * -> [{ id, icon, value, label, sub }]
 */
export function pingKpis(live) {
  const f = live?.dossier?.fundamentals;
  /* Nov 2026: with a Valuation Snapshot beside the answer, the strip carries complementary
     business and market measures (price, market cap, revenue growth, dividend yield), not the
     multiples the snapshot already shows. */
  const snap = live?.dossier?.valuation;
  if (f && snap?.rows?.length) {
    const g = snap.growth || {};
    const tiles = [
      num(f.price)
        ? {
            id: 'price',
            icon: 'bi-currency-dollar',
            value: `$${f.price.toFixed(2)}`,
            label: 'Share price',
            sub: num(f.changePct)
              ? `${f.changePct >= 0 ? '+' : '−'}${Math.abs(f.changePct).toFixed(2)}% today`
              : live.dossier.ticker || null,
          }
        : null,
      num(f.marketCap)
        ? {
            id: 'mcap',
            icon: 'bi-building',
            value: usd(f.marketCap),
            label: 'Market cap',
            sub: null,
          }
        : null,
      num(g.revenueYoyPct)
        ? {
            id: 'growth',
            icon: 'bi-graph-up-arrow',
            value: `${g.revenueYoyPct >= 0 ? '+' : '−'}${Math.abs(g.revenueYoyPct).toFixed(1)}%`,
            label: 'Revenue growth',
            sub: 'Trailing 12 months vs a year earlier',
          }
        : null,
      num(f.dividendYieldPct) && f.dividendYieldPct > 0
        ? {
            id: 'dividend',
            icon: 'bi-cash-coin',
            value: `${f.dividendYieldPct.toFixed(2)}%`,
            label: 'Dividend yield',
            sub: 'Trailing 12 months',
          }
        : num(g.netIncomeYoyPct)
          ? {
              id: 'earnings',
              icon: 'bi-bar-chart-line',
              value: `${g.netIncomeYoyPct >= 0 ? '+' : '−'}${Math.abs(g.netIncomeYoyPct).toFixed(1)}%`,
              label: 'Net income growth',
              sub: 'Trailing 12 months vs a year earlier',
            }
          : null,
    ].filter(Boolean);
    if (tiles.length >= 2) return tiles.slice(0, 4);
  }
  if (f) {
    const tiles = [
      num(f.price)
        ? {
            id: 'price',
            icon: 'bi-currency-dollar',
            value: `$${f.price.toFixed(2)}`,
            label: 'Share price',
            sub: live.dossier.ticker || null,
          }
        : null,
      num(f.marketCap)
        ? {
            id: 'mcap',
            icon: 'bi-building',
            value: usd(f.marketCap),
            label: 'Market cap',
            sub: null,
          }
        : null,
      num(f.peTtm)
        ? {
            id: 'pe',
            icon: 'bi-calculator',
            value: f.peTtm.toFixed(2),
            label: 'P/E, trailing 12 months',
            sub: null,
          }
        : null,
      num(f.evToEbitdaTtm)
        ? {
            id: 'ev',
            icon: 'bi-graph-up',
            value: f.evToEbitdaTtm.toFixed(2),
            label: 'EV/EBITDA, trailing 12 months',
            sub: null,
          }
        : null,
    ].filter(Boolean);
    if (tiles.length >= 2) return tiles.slice(0, 4);
  }
  return [];
}

/**
 * Nov 9, 2026: answers whose chart IS the answer. For these the board opens on "Charts and
 * data" (full width) in place of the desk summary and top matches; the brief still reaches
 * screen readers and the evidence rows stay below. Add a dossier kind here to give it the
 * same layout.
 */
export const LEAD_VISUAL_KINDS = new Set(['insider_buying']);
export const leadsWithVisual = (live) => LEAD_VISUAL_KINDS.has(live?.dossier?.kind);

/** The top matches snapshot: the first five dataset evidence rows, compact. */
export function topMatches(live, n = 5) {
  return datasetEvidence(live)
    .slice(0, n)
    .map((r) => ({
      id: r.id,
      chip: r.chip,
      title: r.title,
      summary: r.summary,
      href: r.href,
      external: Boolean(r.external),
    }));
}

/* ------------------------------------------------------------------ company answer */

const TAKEAWAY_LABELS = ['Valuation', 'Fundamentals', 'Primary consideration'];
const TAKEAWAY_RE = new RegExp(
  `^\\**\\s*(${TAKEAWAY_LABELS.join('|')})\\s*\\**\\s*:\\s*(.+)$`,
  'i',
);
const words = (t) =>
  String(t || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

/**
 * The company brief as an equity research brief: headline, summary and up to three labelled
 * takeaways, all from the brief's own text (the model writes them in that order, see
 * COMPANY_ADDENDUM). A brief in the older three-paragraph shape has no headline: the first
 * paragraph is the summary and the rest stay available, never relabelled.
 * -> { structured, headline, summary, takeaways: [{ label, text }], more: string[] }
 */
export function companyBrief(answer) {
  const lines = String(answer || '')
    .split(/\n\s*\n|\n(?=\**\s*(?:Valuation|Fundamentals|Primary consideration)\s*\**\s*:)/i)
    .map((p) => p.trim())
    .filter(Boolean);
  const takeaways = [];
  const rest = [];
  for (const l of lines) {
    const m = TAKEAWAY_RE.exec(l);
    if (m) {
      const label = TAKEAWAY_LABELS.find((x) => x.toLowerCase() === m[1].toLowerCase());
      if (!takeaways.some((t) => t.label === label)) takeaways.push({ label, text: m[2].trim() });
    } else rest.push(l.replace(/^(Headline|Summary)\s*:\s*/i, ''));
  }
  const first = rest[0] || '';
  const headlineLike =
    first &&
    words(first) <= 30 &&
    !/\[S?\d+\]/.test(first) &&
    (first.match(/[.!?](\s|$)/g) || []).length <= 1;
  if (headlineLike && rest.length >= 2)
    return {
      structured: true,
      headline: first.replace(/\s+/g, ' '),
      summary: rest[1],
      takeaways,
      more: rest.slice(2),
    };
  return {
    structured: false,
    headline: null,
    summary: first || null,
    takeaways,
    more: rest.slice(1),
  };
}

/** A text with its citation markers split out: [{ text } | { cite: 'S1' }]. */
export function splitCitations(text) {
  const out = [];
  const re = /\[(S?\d+)\]/g;
  let last = 0;
  let m;
  const str = String(text || '');
  while ((m = re.exec(str))) {
    if (m.index > last) out.push({ text: str.slice(last, m.index) });
    out.push({ cite: m[1].startsWith('S') ? m[1] : `S${m[1]}` });
    last = m.index + m[0].length;
  }
  if (last < str.length) out.push({ text: str.slice(last) });
  return out;
}

/**
 * The company identity for the executive answer: "Apple Inc. (AAPL)" and a metadata line
 * with only the fields the data has (exchange, sector, industry, data as of).
 */
export function companyIdentity(live) {
  const d = live?.dossier;
  if (d?.kind !== 'company' || !d.ticker) return null;
  const p = d.profile || {};
  const meta = [p.exchange, p.sector, p.industry || d.industry?.name || null]
    .filter(Boolean)
    .map(String);
  return {
    name: d.name || d.ticker,
    ticker: d.ticker,
    meta,
    asOf: d.asOf || d.valuation?.asOf || null,
  };
}

/** The executive answer's footer: what the brief drew on and when. */
export function briefFooter(live) {
  const used = (live?.sources || []).filter((x) => x?.used).length;
  const cited = (live?.evidence || []).length;
  const web = (live?.webSources || []).length;
  return {
    datasets: used,
    cited,
    web,
    asOf: live?.dossier?.asOf || null,
    status:
      live?.grounded === false ? 'Not grounded in Ezana data' : cited ? 'Cited to sources' : null,
  };
}

/**
 * What "Explore valuations" does for this reader. Never starts a run by itself.
 *   scroll   the Valuation section is open on this page: go to it
 *   deep     the plan includes deep research: open the deep research offer (cost and quota
 *            shown, the reader confirms)
 *   upgrade  / signup: the existing plan flow
 */
export function exploreValuationAction(access, { hasSection = false } = {}) {
  if (access?.unlocked && hasSection)
    return { kind: 'scroll', label: 'Explore valuations', href: '#sa-valuation' };
  const cta = access?.cta || null;
  if (cta?.kind === 'deep' || (access?.unlocked && !hasSection))
    return { kind: 'deep', label: 'Explore valuations', note: 'Opens with deep research' };
  if (cta?.href)
    return {
      kind: cta.kind === 'signup' ? 'signup' : 'upgrade',
      label: 'Explore valuations',
      href: cta.href,
      note: cta.kind === 'signup' ? 'Free account, then the Starter plan' : 'On the Starter plan',
    };
  return null;
}
