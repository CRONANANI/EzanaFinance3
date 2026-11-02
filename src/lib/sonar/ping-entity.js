/**
 * The short entity label the Sonar ping loader shows while a ping runs
 * (SonarPingLoader, Nov 2). Client-side and instant: the loader appears the
 * moment a ping is sent, before the server has resolved anything, so this is
 * a best guess from the words alone, never a claim about the answer.
 *
 * In order: a ticker ($NVDA, or a bare NVDA that is not a common acronym),
 * a company Sonar knows by another name (SpaceX), a country (including its
 * demonym: "brazilian economy" -> Brazil), the subject of the question with
 * its framing stripped ("what was the ipo value of spacex" -> spacex), and
 * finally the first few words. At most 28 characters.
 */
import { COUNTRIES } from '@/lib/sonar/understand/geo-codes';
import { TICKER_BLOCKLIST } from '@/lib/sonar/understand/blocklist';
import { ipoSubject } from '@/lib/sonar/resolveQuery';

const MAX = 28;
const clip = (s) => {
  const t = String(s || '')
    .replace(/\s+/g, ' ')
    .trim();
  return t.length > MAX ? `${t.slice(0, MAX - 1).trimEnd()}…` : t;
};
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* Brands people use for a listed company whose legal name differs. */
const KNOWN = [[/(^|[^\p{L}])space\s?x(?=[^\p{L}]|$)/iu, 'SpaceX']];

/* Every country alias, longest first; "us" is too ambiguous to count. */
const COUNTRY_TERMS = COUNTRIES.flatMap(([, , label, aliases]) =>
  [label.toLowerCase(), ...aliases].filter((a) => a !== 'us').map((a) => [a, label]),
).sort((a, b) => b[0].length - a[0].length);
const COUNTRY_RE = new RegExp(
  `(^|[^\\p{L}])(${COUNTRY_TERMS.map(([a]) => escapeRe(a)).join('|')})(?:n|an|ian|ese|i|ish)?(?=[^\\p{L}]|$)`,
  'iu',
);
const COUNTRY_BY_TERM = new Map(COUNTRY_TERMS);

const STOP = new Set(
  'a an the of and or for to in on at by with about from into over what whats which who how why is are was were be do does did can could would should tell me more give show explain latest top best'.split(
    ' ',
  ),
);

/**
 * @param {string} query the ping as typed
 * @returns {string} a short label, '' for an empty ping
 */
export function pingEntityLabel(query) {
  const raw = String(query || '').trim();
  if (!raw) return '';

  const cued = raw.match(/\$([A-Za-z]{1,5})\b/);
  if (cued) return cued[1].toUpperCase();
  const bare = (raw.match(/\b[A-Z]{2,5}\b/g) || []).find((t) => !TICKER_BLOCKLIST.has(t));
  if (bare) return bare;

  for (const [re, label] of KNOWN) if (re.test(raw)) return label;

  const country = raw.match(COUNTRY_RE);
  if (country) return COUNTRY_BY_TERM.get(country[2].toLowerCase()) || clip(country[2]);

  const subject = ipoSubject(raw);
  const words = (subject || raw)
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w.toLowerCase()))
    .slice(0, 3);
  return clip(words.join(' ') || raw);
}
