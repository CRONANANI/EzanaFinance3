/**
 * OFAC Recent Actions listing page -> notices. Pure, no imports.
 *
 * Source: https://ofac.treasury.gov/recent-actions (Treasury, public domain).
 * Each notice is a link of the form /recent-actions/YYYYMMDD or
 * /recent-actions/YYYYMMDD_NN whose text is the notice title. The date is
 * read from the link itself, so nothing is guessed. Category links
 * (/recent-actions/<slug>) and pagination are ignored.
 *
 * kinds and programHints are keyword matches on the TITLE only. They are
 * hints for filtering, shown as "from the notice title", never as a
 * statement of what the notice contains.
 */
const BASE = 'https://ofac.treasury.gov';
const LINK =
  /<a\b[^>]*href="((?:https:\/\/ofac\.treasury\.gov)?\/recent-actions\/(\d{8})(?:_(\d+))?)\/?"[^>]*>([\s\S]*?)<\/a>/gi;

const ENTITIES = {
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&#039;': "'",
  '&nbsp;': ' ',
  '&lt;': '<',
  '&gt;': '>',
};
const decode = (s) =>
  s
    .replace(/&(amp|quot|#39|#039|nbsp|lt|gt);/g, (m) => ENTITIES[m] || m)
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

const clean = (html) =>
  decode(String(html).replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();

function isoFromSlug(d) {
  const y = Number(d.slice(0, 4));
  const m = Number(d.slice(4, 6));
  const day = Number(d.slice(6, 8));
  const dt = new Date(Date.UTC(y, m - 1, day));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== day)
    return null;
  if (y < 1990) return null;
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

/* Title keyword -> kind. Order does not matter; a title can carry several. */
const KIND_RULES = [
  ['removal', /\b(designation )?removals?\b|\bdelist/i],
  ['update', /\bupdates?\b|\bamend/i],
  ['designation', /\bdesignations?\b(?!\s+(removals?|updates?))|\bidentifications?\b/i],
  ['general_license', /\bgeneral licen[cs]es?\b/i],
  ['enforcement', /\benforcement\b|\bsettlement\b|\bcivil penalt|\bfinding of violation/i],
  ['guidance', /\bFAQs?\b|\bguidance\b|\badvisory\b|\balert\b|\bfrequently asked\b/i],
  ['regulation', /\bregulations?\b|\brule\b|\bfederal register\b/i],
];

const PROGRAM_RULES = [
  ['Russia', /\bRussia(n)?(-related)?\b/i],
  ['Ukraine', /\bUkraine(-related)?\b/i],
  ['Iran', /\bIran(ian)?(-related)?\b/i],
  ['Venezuela', /\bVenezuela(-related)?\b/i],
  ['Counter terrorism', /\bcounter[ -]?terrorism\b|\bterrorism\b/i],
  ['Counter narcotics', /\bcounter[ -]?narcotics\b|\bnarcotics?\b|\billicit drugs?\b/i],
  ['Cyber', /\bcyber(-related)?\b/i],
  ['North Korea', /\bNorth Korea\b|\bDPRK\b/i],
  ['Syria', /\bSyria(n)?(-related)?\b/i],
  ['Burma', /\bBurma(-related)?\b/i],
  ['Belarus', /\bBelarus(-related)?\b/i],
  ['Cuba', /\bCuba(n)?(-related)?\b/i],
  ['Global Magnitsky', /\bMagnitsky\b/i],
  ['International Criminal Court', /\bInternational Criminal Court\b|\bICC\b/i],
  ['Sudan', /\bSudan(-related)?\b/i],
  ['Nicaragua', /\bNicaragua(-related)?\b/i],
  ['Western Balkans', /\bBalkans?\b/i],
  ['Hostages', /\bhostage/i],
  ['Non-proliferation', /\bnon-?proliferation\b|\bweapons of mass destruction\b/i],
  ['Transnational crime', /\btransnational criminal\b/i],
];

export function classifyTitle(title) {
  const t = String(title || '');
  const kinds = KIND_RULES.filter(([, re]) => re.test(t)).map(([k]) => k);
  const programHints = PROGRAM_RULES.filter(([, re]) => re.test(t)).map(([k]) => k);
  return { kinds: kinds.length ? kinds : ['other'], programHints };
}

/**
 * @param {string} html one Recent Actions listing page
 * @returns {{id,date,title,url,kinds,programHints}[]} newest first, de-duplicated
 */
export function parseRecentActions(html) {
  const seen = new Map();
  for (const m of String(html || '').matchAll(LINK)) {
    const [, href, day, suffix, inner] = m;
    const date = isoFromSlug(day);
    const title = clean(inner);
    if (!date || title.length < 4) continue;
    const id = suffix ? `${day}_${suffix}` : day;
    if (seen.has(id)) continue;
    const url = href.startsWith('http') ? href : `${BASE}${href}`;
    seen.set(id, { id, date, title: title.slice(0, 400), url, ...classifyTitle(title) });
  }
  return [...seen.values()].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export const ACTION_KIND_LABEL = {
  designation: 'Designation',
  removal: 'Removal',
  update: 'Update',
  general_license: 'General license',
  enforcement: 'Enforcement',
  guidance: 'Guidance',
  regulation: 'Regulation',
  other: 'Notice',
};
