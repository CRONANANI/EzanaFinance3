/**
 * Echo date style (Nov 18 2026): month first with an ordinal day,
 * "November 2nd" and "November 2nd, 2026", never "2 November".
 *
 * usDateText rewrites dates written day-first in article prose, captions,
 * figure notes and keyword cards ("6 November 2026" becomes "November 6th,
 * 2026"; "6–8 November" becomes "November 6th–8th"), and adds the ordinal to
 * month-first dates that lack one ("November 6" becomes "November 6th").
 * Abbreviated months keep their abbreviation ("5 Aug 2026" becomes
 * "Aug 5th, 2026"). Only capitalised month names match, so "may" the verb is
 * left alone; ISO dates and slugs never match.
 *
 * usDatesDeep applies it to every string inside an article object, so
 * articles stored in public.echo_articles read the new style without
 * rewriting their rows.
 */
const MONTH =
  '(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec)';

export function ordinal(n) {
  const v = Number(n);
  const t = v % 100;
  if (t >= 11 && t <= 13) return `${v}th`;
  return `${v}${{ 1: 'st', 2: 'nd', 3: 'rd' }[v % 10] || 'th'}`;
}

const RANGE = new RegExp(
  `(?<![\\d:.,$])\\b(\\d{1,2})(?:st|nd|rd|th)?\\s*[–-]\\s*(\\d{1,2})(?:st|nd|rd|th)?\\s+${MONTH}\\b\\.?(?:,?\\s+(\\d{4})\\b)?`,
  'g',
);
/* "11 and 12 June" */
const PAIR = new RegExp(
  `(?<![\\d:.,$])\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+and\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s+${MONTH}\\b\\.?(?:,?\\s+(\\d{4})\\b)?`,
  'g',
);
const DAY_FIRST = new RegExp(
  `(?<![\\d:.,$])\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${MONTH}\\b\\.?(?:,?\\s+(\\d{4})\\b)?`,
  'g',
);
/* Month first without an ordinal: "November 6" or "November 6, 2026". */
const MONTH_FIRST = new RegExp(`\\b${MONTH}\\.?\\s+(\\d{1,2})\\b(?!\\s*[:.]\\d)`, 'g');

const valid = (d) => Number(d) >= 1 && Number(d) <= 31;

export function usDateText(text) {
  if (typeof text !== 'string' || !/\d/.test(text)) return text;
  return text
    .replace(RANGE, (m, a, b, mon, yr) =>
      valid(a) && valid(b) ? `${mon} ${ordinal(a)}–${ordinal(b)}${yr ? `, ${yr}` : ''}` : m,
    )
    .replace(PAIR, (m, a, b, mon, yr) =>
      valid(a) && valid(b)
        ? `${mon} ${ordinal(a)} and ${ordinal(b)}${yr ? `, ${yr}` : ''}`
        : m,
    )
    .replace(DAY_FIRST, (m, d, mon, yr) =>
      valid(d) ? `${mon} ${ordinal(d)}${yr ? `, ${yr}` : ''}` : m,
    )
    .replace(MONTH_FIRST, (m, mon, d) => (valid(d) ? `${mon} ${ordinal(d)}` : m));
}

export function usDatesDeep(value) {
  if (typeof value === 'string') return usDateText(value);
  if (Array.isArray(value)) return value.map(usDatesDeep);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = usDatesDeep(v);
    return out;
  }
  return value;
}

const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** "November 2nd, 2026" from an ISO date (UTC calendar day). */
export function longUsDate(iso, { year = true } = {}) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const s = `${MONTHS_LONG[d.getUTCMonth()]} ${ordinal(d.getUTCDate())}`;
  return year ? `${s}, ${d.getUTCFullYear()}` : s;
}
