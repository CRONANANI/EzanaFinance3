/* Search over the supported-institution directory. Pure functions, shared by
   the directory component and its checks: no React, no network. */

/** Capability bits carried on each directory row. */
export const CAP_HOLDINGS = 1; // investment holdings can be read
export const CAP_BANKING = 2; // bank accounts and transactions can be read

/* What people type is rarely the listed name. Kept short on purpose: an alias
   is only worth having where the common name shares no prefix with the listed
   one, so plain prefix search cannot find it. */
const ALIASES = {
  bofa: 'bank of america',
  boa: 'bank of america',
  amex: 'american express',
  'jp morgan': 'chase',
  jpmorgan: 'chase',
  ibkr: 'interactive brokers',
};

/** Lowercase, accents and punctuation removed, single spaces. */
export function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** rows: [[name, caps], ...] as the API sends them. */
export function buildIndex(rows) {
  return (Array.isArray(rows) ? rows : [])
    .filter((r) => Array.isArray(r) && typeof r[0] === 'string' && r[0])
    .map(([name, caps]) => ({ name, caps: Number(caps) || 0, key: normalizeName(name) }));
}

/* Lower is better; -1 is no match. Exact name, then a name that starts with
   the query, then a word that starts with it, then every typed word starting
   some word of the name, then the query anywhere inside. */
function score(key, q, tokens) {
  if (key === q) return 0;
  if (key.startsWith(q)) return 1;
  if (` ${key}`.includes(` ${q}`)) return 2;
  const words = key.split(' ');
  if (tokens.length > 1 && tokens.every((t) => words.some((w) => w.startsWith(t)))) return 3;
  if (q.length >= 3 && key.includes(q)) return 4;
  return -1;
}

/**
 * @param {Array<{name: string, caps: number, key: string}>} index
 * @param {string} query
 * @param {{ limit?: number, hasLogo?: (name: string) => boolean }} [opts]
 * @returns {{ items: Array<{name: string, caps: number}>, total: number }}
 */
export function searchInstitutions(index, query, opts = {}) {
  const { limit = 48, hasLogo = () => false } = opts;
  const typed = normalizeName(query);
  if (typed.length < 2) return { items: [], total: 0 };
  const q = ALIASES[typed] || typed;
  const tokens = q.split(' ');

  const hits = [];
  for (const row of index) {
    const s = score(row.key, q, tokens);
    if (s >= 0) hits.push({ row, s });
  }
  hits.sort(
    (a, b) =>
      a.s - b.s ||
      Number(hasLogo(b.row.name)) - Number(hasLogo(a.row.name)) ||
      a.row.key.length - b.row.key.length ||
      a.row.key.localeCompare(b.row.key),
  );
  return {
    items: hits.slice(0, limit).map(({ row }) => ({ name: row.name, caps: row.caps })),
    total: hits.length,
  };
}

/** Two letters for a tile with no logo: "Navy Federal Credit Union" is NF. */
export function initialsFor(name) {
  const words = normalizeName(name)
    .split(' ')
    .filter((w) => w && !/^(of|the|and|for)$/.test(w));
  if (!words.length) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

const cleanName = (value) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim();

const httpsOnly = (value) =>
  typeof value === 'string' && /^https:\/\//i.test(value) ? value : null;

/**
 * Registry rows to the API payload. Server side, but kept here so it can be
 * checked without a database.
 */
export function buildDirectory(rows) {
  /* One entry per name. The registry can hold the same institution twice,
     once per connection route, and a visitor should see it once with every
     capability either route gives. */
  const byKey = new Map();
  for (const r of rows) {
    const name = cleanName(r.display_name);
    if (!name) continue;
    const products = Array.isArray(r.plaid_products) ? r.plaid_products : [];
    let caps = 0;
    if (r.snaptrade_slug || products.includes('investments')) caps |= CAP_HOLDINGS;
    if (products.includes('transactions')) caps |= CAP_BANKING;
    const logo = httpsOnly(r.square_logo_url) || httpsOnly(r.logo_url);

    const key = name.toLowerCase();
    const prev = byKey.get(key);
    if (prev) {
      prev.caps |= caps;
      prev.logo = prev.logo || logo;
    } else {
      byKey.set(key, { name, caps, logo });
    }
  }
  const entries = [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name, 'en'));
  return {
    total: entries.length,
    featured: entries.filter((e) => e.logo),
    all: entries.map((e) => [e.name, e.caps]),
  };
}
