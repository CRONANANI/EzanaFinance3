/**
 * Relevance gating for sourced matches (Part B). Every gate reads the
 * UNDERSTOOD query, never the raw text, and never pads a block with weak
 * matches: anything that fails the gate is dropped, and an emptied block
 * shows the existing "searched, no matches" state.
 *
 * A match must carry a SUBJECT term: an industry synonym, a sector, theme or
 * policy label, a company or a ticker. Geography alone ("US") never
 * qualifies, or every US headline would match every US ping.
 */
import { INDUSTRIES } from '@/lib/sonar/understand/lexicons';

const SPORTS_RE =
  /\bspread:|\bo\/u\b|\b(over\/under|moneyline|total points|nfl|nba|mlb|nhl|ncaa|premier league|la liga|serie a|champions league|ufc|wwe|super bowl|world series|stanley cup|grand slam|wimbledon|f1|formula 1|playoffs?|touchdowns?|map \d|game \d)\b|\bvs\.? .*\(\s*[-+]?\d/i;
const ENTERTAINMENT_RE =
  /\b(oscars?|grammys?|emmys?|box office|album|eurovision|bachelor|survivor)\b/i;
const BLOCKED_CATEGORIES = new Set(['sports', 'entertainment']);

export function isSportsMarket(m) {
  const text = `${m?.question || ''} ${m?.description || ''}`;
  return SPORTS_RE.test(text);
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The subject terms an understood query licenses. */
export function subjectTerms(understood) {
  const terms = new Set();
  for (const e of understood?.entities || []) {
    if (e.kind === 'industry') {
      const ind = INDUSTRIES.find((i) => i.id === e.id);
      for (const s of ind?.synonyms || []) terms.add(s);
      terms.add(e.label);
    } else if (e.kind === 'ticker') {
      terms.add(e.id);
      if (e.label && e.label !== e.id) terms.add(e.label);
    } else if (
      ['sector', 'theme', 'policy', 'company', 'person_politician', 'fund', 'commodity'].includes(
        e.kind,
      )
    ) {
      terms.add(e.label);
    }
  }
  return [...terms].filter((t) => t && t.length >= 2);
}

function termRegexes(terms) {
  return terms.map((t) =>
    /^[A-Z0-9.]{2,6}$/.test(t)
      ? new RegExp(`(^|[^A-Za-z])${esc(t)}([^A-Za-z]|$)`) // tickers: case-sensitive
      : new RegExp(`\\b${esc(t)}\\b`, 'i'),
  );
}

export function mentionsSubject(text, understood) {
  const res = termRegexes(subjectTerms(understood));
  return res.length > 0 && res.some((re) => re.test(String(text || '')));
}

/** Prediction markets: no sports/entertainment (unless the ping is a sports
 *  or entertainment event), and a subject term in the question or description. */
export function gateMarkets(markets, understood) {
  const eventPing = understood?.intent === 'event';
  return (markets || []).filter((m) => {
    const cat = String(m?.category || '').toLowerCase();
    if (
      !eventPing &&
      (BLOCKED_CATEGORIES.has(cat) || isSportsMarket(m) || ENTERTAINMENT_RE.test(m?.question || ''))
    ) {
      return false;
    }
    return mentionsSubject(`${m?.question || ''} ${m?.description || ''}`, understood);
  });
}

/** News: a subject term in the title or the first 200 characters. */
export function gateNews(items, understood) {
  return (items || []).filter((n) =>
    mentionsSubject(
      `${n?.title || ''} ${String(n?.summary || n?.description || n?.snippet || '').slice(0, 200)}`,
      understood,
    ),
  );
}

/** A boolean news query for upstreams that take one (Marketaux, web). */
export function newsQueryFor(understood) {
  const subject = subjectTerms(understood).slice(0, 4);
  const geo = (understood?.entities || [])
    .filter((e) => e.kind === 'country' || e.kind === 'state_province')
    .map((e) => e.label);
  const or = (xs) => `(${xs.map((x) => (x.includes(' ') ? `"${x}"` : x)).join(' OR ')})`;
  if (!subject.length) return understood?.display || '';
  return geo.length ? `${or(subject)} AND ${or(geo)}` : or(subject);
}
