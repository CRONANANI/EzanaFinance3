/**
 * Council cards of Alternative Markets (/alternative-markets): the pure model.
 *
 * Council members see the crypto and commodities page unchanged plus two
 * council bands built here from their council's own records: the stored
 * investment policy rules read against a typed ticker, the research library,
 * the pitch pipeline, Learning Center courses, sector coverage, the team
 * sleeves, upcoming meetings and the council's place on Council Rankings.
 *
 * Honesty rules:
 * - The policy check is descriptive. It says whether a ticker is on the
 *   council's recorded prohibited list and reads the other stored rules
 *   against the council's own book. It never approves, blocks or advises.
 *   There is no asset class rule type, so it always says "No asset class
 *   rule set".
 * - Council holdings carry no asset class, so nothing here computes an
 *   alternatives exposure, a country, a currency or an asset class figure.
 * - Research and pitches are matched to crypto or commodities by ticker and
 *   by words in their title, tags or thesis. That is a topic match, never a
 *   claim that a holding moves with a commodity.
 * - Other councils show rank, rating and tier only (the public leaderboard).
 *
 * Pure: no React, no fetch, no server imports.
 */
import { NA, fmtDate, policyReadings, stageText, stageTone } from './org-company-research-model.js';
import { councilTeams, docLabel, sleeveRows, standingRows } from './org-global-market-model.js';
import { ALL_COURSES } from './learning-curriculum.js';

export { NA, fmtDate, sleeveRows, standingRows };

const upper = (t) =>
  String(t || '')
    .toUpperCase()
    .trim();
const lower = (t) => String(t || '').toLowerCase();

export const TICKER_RE = /^[A-Z0-9.^=-]{1,12}$/;

/** Clean a typed ticker: upper case, no spaces, at most 12 characters. */
export function cleanTicker(v) {
  return upper(v)
    .replace(/[^A-Z0-9.^=-]/g, '')
    .slice(0, 12);
}

/* ── Matching research and pitches to the page's mode ───────────────────── */

/*
 * Exchange traded funds and listed proxies a council could pitch for each
 * mode, on top of the page's own asset tickers. A topic list, not a holdings
 * classification.
 */
const MODE_TICKERS = {
  crypto: [
    'IBIT',
    'FBTC',
    'GBTC',
    'BITB',
    'ARKB',
    'BITO',
    'ETHA',
    'ETHE',
    'FETH',
    'COIN',
    'MSTR',
    'MARA',
    'RIOT',
    'CLSK',
  ],
  commodities: [
    'GLD',
    'IAU',
    'SLV',
    'PPLT',
    'USO',
    'BNO',
    'UNG',
    'DBC',
    'DBA',
    'PDBC',
    'GSG',
    'GDX',
    'GDXJ',
    'COPX',
    'CPER',
    'URA',
    'WEAT',
    'CORN',
    'SOYB',
    'XLE',
    'XOP',
    'XME',
    'PICK',
  ],
};

const MODE_WORDS = {
  crypto:
    /\b(crypto\w*|bitcoin|ethereum|blockchain|digital assets?|stablecoins?|tokeni[sz]\w*|tokens?|defi|on-chain|solana)\b/,
  commodities:
    /\b(commodit\w*|gold|silver|platinum|oil|crude|brent|wti|natural gas|lng|copper|wheat|corn|soy\w*|grains?|coffee|metals?|miners?|mining|uranium|opec|crb|futures)\b/,
};

/** Every ticker that marks a record as belonging to this mode. */
export function modeTickers(mode, rowTickers = []) {
  return new Set([...(MODE_TICKERS[mode] || []), ...rowTickers.map(upper)].filter(Boolean));
}

function matchesMode(mode, tickers, ticker, text) {
  if (ticker && tickers.has(upper(ticker))) return true;
  const re = MODE_WORDS[mode];
  return Boolean(re && re.test(lower(text)));
}

const STATUS_HIDDEN = new Set(['archived']);

/**
 * The council's documents on this mode: primers first, then newest. Drafts
 * only reach their author or a manager, as in the Research Library.
 */
export function altResearch(
  notes,
  { mode, rowTickers = [], members = [], viewer = null, limit = 3 } = {},
) {
  const tickers = modeTickers(mode, rowTickers);
  const byUser = new Map((members || []).map((m) => [m.user_id, m.display_name]));
  const isManager = ['executive', 'portfolio_manager'].includes(viewer?.role);
  const rows = (notes || []).filter((n) => {
    if (STATUS_HIDDEN.has(n.status)) return false;
    if (n.status === 'draft' && n.author_id !== viewer?.userId && !isManager) return false;
    const tags = Array.isArray(n.tags) ? n.tags.join(' ') : '';
    return matchesMode(mode, tickers, n.ticker, `${n.title || ''} ${tags}`);
  });
  const when = (n) => new Date(n.published_at || n.created_at).getTime() || 0;
  return rows
    .sort(
      (a, b) =>
        Number(b.doc_type === 'primer') - Number(a.doc_type === 'primer') || when(b) - when(a),
    )
    .slice(0, limit)
    .map((n) => ({
      id: n.id,
      title: n.title || 'Untitled',
      kind: docLabel(n.doc_type),
      author: byUser.get(n.author_id) || n.author_name || 'Former member',
      date: n.published_at || n.created_at || null,
      draft: n.status === 'draft',
    }));
}

const CLOSED_STAGES = new Set(['rejected', 'exited']);

/** Open pitches on this mode, newest first, with their stage words. */
export function altPitches(pitches, { mode, rowTickers = [], members = [], limit = 3 } = {}) {
  const tickers = modeTickers(mode, rowTickers);
  const byMember = new Map((members || []).map((m) => [m.id, m.display_name]));
  return (pitches || [])
    .filter((p) => !p.archived_at && !CLOSED_STAGES.has(p.stage))
    .filter((p) =>
      matchesMode(mode, tickers, p.ticker, `${p.company_name || ''} ${p.thesis_short || ''}`),
    )
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit)
    .map((p) => ({
      id: p.id,
      ticker: upper(p.ticker),
      title: p.company_name || upper(p.ticker),
      stage: stageText(p.stage),
      tone: stageTone(p.stage),
      lead: p.analyst_name || byMember.get(p.analyst_member_id) || null,
    }));
}

/* ── The policy check (descriptive) ─────────────────────────────────────── */

/**
 * What the council's stored rules say about one ticker. Never a verdict.
 *   prohibited   on the recorded prohibited ticker list
 *   sectorHit    held, and its stored sector is on the prohibited sector list
 *   readings     every active stored rule read against the council's book
 */
export function policyLookup(raw, ticker) {
  const t = cleanTicker(ticker);
  const rules = (raw?.rules || []).filter((r) => r.is_active !== false);
  const holding = (raw?.positions || []).find((p) => upper(p.ticker) === t) || null;
  const listed = rules
    .filter((r) => r.rule_type === 'prohibited_ticker')
    .map((r) => upper(r.rule_value?.ticker))
    .filter(Boolean);
  const sectors = rules
    .filter((r) => r.rule_type === 'prohibited_sector')
    .map((r) => r.rule_value?.sector)
    .filter(Boolean);
  const prohibited = Boolean(t) && listed.includes(t);
  const sectorHit = Boolean(holding?.sector) && sectors.includes(holding.sector);
  return {
    ticker: t,
    hasRules: rules.length > 0,
    hasList: listed.length > 0 || sectors.length > 0,
    prohibited,
    sectorHit,
    heldSector: holding?.sector || null,
    held: Boolean(holding),
    listedCount: listed.length,
    prohibitedSectors: sectors,
    readings: t ? policyReadings(raw, { ticker: t, holding }) : [],
  };
}

/** The one-line result under the ticker field. Descriptive words only. */
export function policyLine(look) {
  if (!look?.ticker) return null;
  if (look.prohibited) return { text: `${look.ticker}: On the prohibited list.`, tone: 'down' };
  if (look.sectorHit)
    return {
      text: `${look.ticker}: Held in ${look.heldSector}, a prohibited sector.`,
      tone: 'down',
    };
  return { text: `${look.ticker}: Not on the prohibited list.`, tone: 'flat' };
}

export const POLICY_NOTE =
  'No asset class rule set. This describes the recorded list and is not a recommendation or approval.';

/* ── Learning Center courses for the mode ───────────────────────────────── */

const COURSE_TITLES = {
  crypto: ['Understanding Crypto Prices', 'Institutional Crypto', 'Building a Crypto Thesis'],
  commodities: [
    'Commodity ETFs & Funds',
    'Understanding Commodity Charts',
    'Building a Commodities Thesis',
  ],
};

/** Up to three Learning Center courses on this mode that exist today. */
export function learningLinks(mode, courses = ALL_COURSES) {
  const wanted = COURSE_TITLES[mode] || [];
  return wanted
    .map((title) => (courses || []).find((c) => c.title === title))
    .filter(Boolean)
    .map((c) => ({
      id: c.id,
      title: c.title,
      minutes: c.duration_minutes || null,
      href: `/learning-center/course/${encodeURIComponent(c.id)}`,
    }));
}

/* ── Coverage, meetings ─────────────────────────────────────────────────── */

/** Who covers each sector team, from stored coverage. */
export function coverageRows(raw) {
  return councilTeams(raw).map((t) => ({ id: t.id, name: t.name, owners: t.owners }));
}

/** The next upcoming meetings, soonest first. */
export function nextMeetings(meetings, now = Date.now(), limit = 3) {
  return (meetings || [])
    .filter(
      (m) => m.status !== 'closed' && m.scheduled_at && new Date(m.scheduled_at).getTime() >= now,
    )
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
    .slice(0, limit)
    .map((m) => ({ id: m.id, title: m.title || 'Meeting', at: m.scheduled_at }));
}

/** Nov 19, 2026 */
export function fmtDay(iso) {
  if (!iso) return NA;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return NA;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Card order inside the first band, by role (description, question 2). */
export function bandOrder(role) {
  if (role === 'analyst') return ['research', 'pitches', 'learning', 'policy'];
  return ['policy', 'research', 'pitches', 'learning'];
}

/* ── Where the council's own pages live ─────────────────────────────────── */

export const LINKS = {
  library: '/org-team-hub/research-library',
  newNote: '/org-team-hub/research-library?new=note',
  doc: (id) => `/org-team-hub/research-library?d=${encodeURIComponent(id)}`,
  pitches: '/org-team-hub/pitches',
  pitch: (id) => `/org-team-hub/pitches?pitch=${encodeURIComponent(id)}`,
  newPitch: (ticker) =>
    `/org-team-hub/pitches?new=pitch${ticker ? `&ticker=${encodeURIComponent(upper(ticker))}` : ''}`,
  meetings: '/org-team-hub/meetings',
  meeting: (id) => `/org-team-hub/meetings?m=${encodeURIComponent(id)}`,
  rankings: '/council-rankings',
  compliance: '/org-team-hub/compliance',
  tradingDesk: '/org-trading',
  orgChart: '/org-team-hub/org-chart',
  learning: '/learning-center',
};
