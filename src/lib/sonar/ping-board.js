/**
 * The ping board (Nov 2026): pure view helpers for SonarPingBoard.jsx, the shared answer
 * layout for every quick ping on /datasets that is not a country intelligence answer
 * (a company, a member of Congress, a sector, an industry, flows, sanctions, a commodity, an
 * open question). Same rows as the country and research boards
 * (docs/sonar/answer-templates): executive answer and top matches, a KPI strip, evidence and
 * coverage, the charts and data, then sources. No I/O; tested in
 * scripts/check-sonar-ping-board.mjs.
 */
import { datasetEvidence, hostOf } from './country-board.js';

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
 * The KPI strip: a company's valuation tiles when the dossier has fundamentals, else what the
 * ping drew on (datasets matched, records cited, web pages read, news stories).
 * -> [{ id, icon, value, label, sub }]
 */
export function pingKpis(live) {
  const f = live?.dossier?.fundamentals;
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
  const ev = datasetEvidence(live);
  const web = (live?.webSources || []).length;
  const news = (live?.newsColumns || []).reduce((n, c) => n + (c?.items?.length || 0), 0);
  const cited = (live?.evidence || []).length;
  return [
    {
      id: 'datasets',
      icon: 'bi-database',
      value: String(ev.length),
      label: 'Ezana datasets matched',
      sub:
        ev
          .slice(0, 3)
          .map((r) => r.dataset)
          .join(', ') || null,
    },
    cited
      ? {
          id: 'records',
          icon: 'bi-file-earmark-text',
          value: String(cited),
          label: 'Records cited',
          sub: 'From Ezana datasets',
        }
      : null,
    web
      ? {
          id: 'web',
          icon: 'bi-globe2',
          value: String(web),
          label: 'Web pages read',
          sub:
            [...new Set((live.webSources || []).map((w) => hostOf(w.url)))]
              .slice(0, 2)
              .join(', ') || null,
        }
      : null,
    news
      ? {
          id: 'news',
          icon: 'bi-newspaper',
          value: String(news),
          label: 'News stories',
          sub: 'Around this question',
        }
      : null,
  ].filter(Boolean);
}

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
