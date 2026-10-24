/**
 * NIST CHIPS Program Office awards page importer (monthly, gentle).
 * https://www.nist.gov/chips/chips-program-office-awards and ?page=N.
 *
 * The page is the only source that says whether an award is FINAL ("Award
 * Amount:") or PROPOSED ("Proposed Award Amount:"). parseNistAwardsHtml is
 * pure and tested against fixtures in tests/fixtures/nist/; fetchNistPages
 * honours robots.txt, waits 2 s between requests and stops at 15 pages.
 */
import {
  STATE_CODES,
  awardStatusFromLabel,
  isSplitAward,
  parseAmount,
  slugify,
} from '@/lib/ingest/chips/normalize';

export const NIST_BASE = 'https://www.nist.gov';
export const NIST_AWARDS_URL = `${NIST_BASE}/chips/chips-program-office-awards`;
export const USER_AGENT =
  'EzanaFinance-IndustryIngest/1.0 (+https://ezana.world; data@ezana.world)';
const MAX_PAGES = 15;
const DELAY_MS = 2000;

const decode = (s) =>
  String(s || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/&#8212;|&mdash;/g, '—')
    .replace(/&#039;|&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
const text = (html) =>
  decode(
    String(html || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[ \t]+/g, ' ')
    .trim();

/** "Company (State) – City, ST" (or several "City, ST" sites). */
export function parseHeading(heading) {
  const h = text(heading);
  const [left, ...rest] = h.split(/\s+[–—-]\s+/);
  const stateM = /\(([^)]+)\)\s*$/.exec(left || '');
  const company = (stateM ? left.slice(0, stateM.index) : left || '').trim();
  const states = (stateM ? stateM[1] : '')
    .split(/,|\band\b|&/)
    .map(
      (s) => STATE_CODES[s.trim().toLowerCase()] || (/^[A-Z]{2}$/.test(s.trim()) ? s.trim() : null),
    )
    .filter(Boolean);
  const sites = [];
  const re = /([A-Z][A-Za-z.'\s-]*?),\s*([A-Z]{2})\b/g;
  let m;
  const loc = rest.join(' - ');
  while ((m = re.exec(loc))) {
    sites.push({ city: m[1].replace(/^(and|&)\s+/i, '').trim(), state_code: m[2] });
  }
  if (!sites.length) for (const st of states) sites.push({ city: null, state_code: st });
  return { company, states, sites, heading: h };
}

/**
 * Award entries from one page of HTML. Each entry is a heading (h2-h4) that
 * links to a detail page, followed by its body until the next heading.
 */
export function parseNistAwardsHtml(html) {
  const src = String(html || '');
  const heads = [...src.matchAll(/<h([2-4])[^>]*>([\s\S]*?)<\/h\1>/gi)];
  const out = [];
  for (let i = 0; i < heads.length; i += 1) {
    const h = heads[i];
    const link = /<a[^>]+href="([^"]+)"/i.exec(h[2]);
    if (!link) continue;
    const start = h.index + h[0].length;
    const end = i + 1 < heads.length ? heads[i + 1].index : src.length;
    const body = text(src.slice(start, end));
    const amountLine = /((?:Proposed\s+)?Award\s+Amount:\s*[^\n]*)/i.exec(body);
    if (!amountLine) continue;
    const parsed = parseHeading(h[2]);
    if (!parsed.company) continue;
    const status = awardStatusFromLabel(amountLine[1]);
    const amountText = amountLine[1].replace(/^(Proposed\s+)?Award\s+Amount:\s*/i, '').trim();
    const href = link[1].startsWith('http') ? link[1] : `${NIST_BASE}${link[1]}`;
    const split = isSplitAward(body);
    out.push({
      source: 'nist',
      source_record_id: slugify(
        parsed.company,
        parsed.sites.map((s) => `${s.city || ''} ${s.state_code}`).join(' '),
      ),
      recipient_name: parsed.company,
      status,
      amount_text: amountText,
      amount_usd: parseAmount(amountText),
      is_split_award: split || parsed.sites.length > 1,
      sites: parsed.sites,
      city: parsed.sites[0]?.city || null,
      state_code: parsed.sites[0]?.state_code || parsed.states[0] || null,
      description: body.slice(0, 1200),
      source_url: href,
      raw: { heading: parsed.heading, body: body.slice(0, 4000) },
    });
  }
  return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** robots.txt: is the awards path disallowed for every agent? */
export function robotsDisallows(robots, path = '/chips/') {
  let applies = false;
  for (const raw of String(robots || '').split('\n')) {
    const line = raw.replace(/#.*/, '').trim();
    if (/^user-agent:/i.test(line)) applies = line.split(':')[1].trim() === '*';
    else if (applies && /^disallow:/i.test(line)) {
      const rule = line.split(':').slice(1).join(':').trim();
      if (rule && path.startsWith(rule)) return true;
    }
  }
  return false;
}

/**
 * Fetch and parse until a page has no entries (or MAX_PAGES). Returns
 * { entries, pages, robots: 'ok'|'disallowed'|'unreachable' }. A non-empty
 * page that parses to zero entries throws: the structure changed.
 */
export async function fetchNistPages({ fetchImpl = fetch, delayMs = DELAY_MS } = {}) {
  const headers = { 'User-Agent': USER_AGENT, Accept: 'text/html' };
  let robots = 'ok';
  try {
    const r = await fetchImpl(`${NIST_BASE}/robots.txt`, { headers });
    if (r.ok && robotsDisallows(await r.text(), '/chips/chips-program-office-awards')) {
      return { entries: [], pages: 0, robots: 'disallowed' };
    }
  } catch {
    robots = 'unreachable';
  }
  const entries = [];
  let pages = 0;
  for (let p = 0; p < MAX_PAGES; p += 1) {
    if (p) await sleep(delayMs);
    const res = await fetchImpl(p ? `${NIST_AWARDS_URL}?page=${p}` : NIST_AWARDS_URL, { headers });
    if (!res.ok) throw new Error(`nist page ${p} http ${res.status}`);
    const html = await res.text();
    pages += 1;
    const got = parseNistAwardsHtml(html);
    if (!got.length) {
      /* A first page with headings but no parseable awards means the markup
         changed. Fail loudly; never wipe data. */
      if (p === 0 && /<h[2-4][^>]*>\s*<a/i.test(html)) {
        throw new Error('nist parse returned 0 entries from a non-empty page');
      }
      break;
    }
    entries.push(...got);
  }
  return { entries, pages, robots };
}
