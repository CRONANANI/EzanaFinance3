/**
 * Entity candidates with the ticker guard. A token is a ticker candidate with
 * real confidence only when it is $-prefixed, follows a ticker cue, or is
 * (part of) a one- or two-token ping. A blocklisted token (USA, US, UK, AI,
 * IT, every ISO and state code) read without a cue scores at most 0.15 as a
 * ticker, so a geography reading after "in the" / "across" (0.95) always
 * wins, and the ticker survives only as an alternative.
 */
import { TICKER_BLOCKLIST, TICKER_CUES, GEO_PREPOSITION } from '@/lib/sonar/understand/blocklist';
import {
  KNOWN_TICKERS,
  lookupGeo,
  lookupIndustry,
  lookupPolitician,
  lookupState,
  THEMES,
} from '@/lib/sonar/understand/lexicons';

const clean = (t) =>
  String(t || '')
    .replace(/^\$/, '')
    .replace(/[^\w.&]/g, '');

/**
 * @param {string[]} tokens   corrected tokens
 * @param {number} i
 * @param {{ tickerName?: (sym:string)=>string|null }} ctx
 */
export function resolveToken(tokens, i, ctx = {}) {
  const raw = tokens[i];
  const prefix = `${tokens.slice(0, i).join(' ')} `;
  const isDollar = raw.startsWith('$');
  const sym = clean(raw).toUpperCase();
  const tickerName = KNOWN_TICKERS[sym] || ctx.tickerName?.(sym) || null;
  const looksTicker =
    /^[A-Z][A-Z.]{0,5}$/.test(clean(raw)) && clean(raw) === clean(raw).toUpperCase();
  const shortQuery = tokens.length <= 2;
  const cued = isDollar || TICKER_CUES.test(prefix);
  const geoPrep = GEO_PREPOSITION.test(prefix);
  const candidates = [];

  const geo = lookupGeo(clean(raw));
  if (geo) {
    const conf = geoPrep ? 0.95 : geo.major ? 0.75 : 0.35;
    candidates.push({
      kind: 'country',
      id: geo.id,
      label: geo.label,
      surface: raw,
      confidence: conf,
      takesThe: geo.takesThe,
    });
  }
  const state = !geo ? lookupState(clean(raw)) : null;
  if (state) {
    candidates.push({
      kind: 'state_province',
      id: state.id,
      label: state.label,
      surface: raw,
      confidence: geoPrep ? 0.9 : 0.7,
    });
  }

  if (tickerName || (isDollar && looksTicker)) {
    let conf = 0.2;
    if (cued) conf = 0.97;
    else if (shortQuery) conf = 0.8;
    else if (!TICKER_BLOCKLIST.has(sym) && looksTicker && raw.length >= 2) conf = 0.55;
    if (TICKER_BLOCKLIST.has(sym) && !cued && !shortQuery) conf = Math.min(conf, 0.15);
    candidates.push({
      kind: 'ticker',
      id: sym,
      label: tickerName || sym,
      surface: raw,
      confidence: conf,
    });
  }

  const industry = lookupIndustry(raw);
  if (industry) {
    candidates.push({
      kind: 'industry',
      id: industry.id,
      label: industry.label,
      surface: raw,
      confidence: 0.9,
      noun: industry.noun,
    });
  }
  const politician = lookupPolitician(raw);
  if (politician) {
    candidates.push({
      kind: 'person_politician',
      id: politician.id,
      label: politician.label,
      surface: raw,
      confidence: 0.9,
    });
  }
  const theme = THEMES.find((t) => t.match && t.match.test(clean(raw)));
  if (theme) {
    candidates.push({
      kind: 'theme',
      id: theme.id,
      label: theme.label,
      surface: raw,
      confidence: 0.85,
    });
  }

  candidates.sort((a, b) => b.confidence - a.confidence);
  const [chosen, ...rest] = candidates;
  if (!chosen || chosen.confidence < 0.3) return null;
  return {
    ...chosen,
    alternatives: rest
      .filter((r) => r.confidence >= 0.15)
      .map(({ kind, id, label, confidence }) => ({ kind, id, label, confidence })),
  };
}
