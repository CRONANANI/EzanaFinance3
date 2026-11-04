/**
 * Politician pings for the Sonar landing band.
 *
 * When a ping names a member of Congress ("Nancy Pelosi", "Tuberville"), the
 * band's right-hand stack switches from the company layout (price chart, news)
 * to the member layout:
 *
 *   chart card   the member's estimated portfolio value over time
 *   people card  other members whose traded tickers overlap most, with faces
 *
 * ESTIMATES, not holdings. STOCK Act filings disclose amount RANGES, never
 * share counts or prices. The series walks the member's trades in date order
 * with the same open-position rule the politician_portfolio RPC uses: a
 * purchase adds its range midpoint, a partial sale removes its midpoint, a full
 * sale closes the position. The month-end total of open positions is the
 * point. No market prices are applied, and the card says so.
 */
import { headshotCandidates } from '@/lib/politicians/headshots';

const CHAMBER_LABEL = { house: 'House', senate: 'Senate' };

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/* Suffixes and initials carry no identity for matching: "Gilbert Ray
   Cisneros, Jr." is matched by "Gil Cisneros" through the last name. */
const tokensOf = (s) =>
  norm(s)
    .split(' ')
    .filter((t) => t.length > 1 && !/^(jr|sr|ii|iii|iv)$/.test(t));

/* Nov 4: the framing of a question about a member carries no identity.
   "What has Nancy Pelosi been buying lately?" is the name "nancy pelosi";
   before this the whole sentence was matched as a name, failed the 4-token
   cap, and the ping fell through to an ungrounded general brief. Kept to
   words no sitting member is named, so stripping never eats a name. */
const FRAME = new Set(
  (
    'a an the of and or for to in on at by with about from into over is are was were be been being ' +
    'do does did has have had what whats which who how why when where whos tell me show give explain ' +
    'more latest recent recently lately now today this year month week last past ' +
    'buy buys buying bought purchase purchases purchased purchasing sell sells selling sold sale sales ' +
    'trade trades trading traded stock stocks share shares position positions portfolio portfolios ' +
    'holding holdings hold holds own owns investment investments invest investing disclosure disclosures ' +
    'congress congressman congresswoman congressional senator sen rep representative speaker house senate member ' +
    'democrat democratic republican doing up'
  ).split(' '),
);

/** The name-bearing words of a ping: its tokens with question framing removed. */
export function nameTokens(query) {
  return tokensOf(query).filter((t) => !FRAME.has(t));
}

/* A bare ticker ("LMT", "AAPL") is never a politician. */
const looksLikeTicker = (q) => /^\$?[A-Z]{1,5}(\.[A-Z])?$/.test(String(q).trim());

/**
 * Resolve a ping to a member of Congress, or null.
 *
 * Rules, strictest first:
 *   1. the query equals the member's full name (normalized), or
 *   2. the query has 2+ tokens and every one is in the member's name, or
 *   3. the query is ONE token equal to the last name of exactly one sitting
 *      member who has disclosed trades.
 * Rule 3 is the one that could collide with a company ("Ford"), which is why
 * it is limited to sitting members with trades and requires uniqueness.
 */
export async function resolvePolitician(query, admin) {
  const q = String(query || '').trim();
  if (!admin || !q || looksLikeTicker(q)) return null;
  const qTokens = nameTokens(q);
  if (!qTokens.length || qTokens.length > 4) return null;
  const last = qTokens[qTokens.length - 1].replace(/[%,()]/g, '');

  try {
    const { data, error } = await admin
      .from('congress_members')
      .select('bioguide_id, full_name, first_name, last_name, party, chamber, state, in_office')
      .ilike('last_name', `%${last}%`)
      .limit(25);
    if (error || !data?.length) return null;

    const qNorm = qTokens.join(' ');
    const scored = data
      .map((m) => {
        const nameTokens = tokensOf(m.full_name);
        const lastTokens = tokensOf(m.last_name);
        let score = 0;
        if (nameTokens.join(' ') === qNorm) score = 3;
        else if (qTokens.length >= 2 && qTokens.every((t) => nameTokens.includes(t))) score = 2;
        else if (
          /* Last name exact plus a first name that is the filed one or a
             short form of it: "Gil Cisneros" for "Gilbert Ray Cisneros, Jr." */
          qTokens.length >= 2 &&
          lastTokens.length &&
          lastTokens.every((t) => qTokens.includes(t)) &&
          qTokens.some(
            (t) =>
              !lastTokens.includes(t) &&
              nameTokens.some((n) => n === t || (t.length >= 3 && n.startsWith(t))),
          )
        )
          score = 2;
        else if (qTokens.length === 1 && lastTokens.join(' ') === qTokens[0]) score = 1;
        return { m, score };
      })
      .filter((x) => x.score > 0);
    if (!scored.length) return null;

    const ids = scored.map((x) => x.m.bioguide_id);
    const { data: traded } = await admin
      .from('congress_trades')
      .select('bioguide_id')
      .in('bioguide_id', ids)
      .limit(1000);
    const hasTrades = new Set((traded || []).map((r) => r.bioguide_id));

    const best = Math.max(...scored.map((x) => x.score));
    let pool = scored.filter((x) => x.score === best);
    if (best === 1) {
      pool = pool.filter((x) => x.m.in_office && hasTrades.has(x.m.bioguide_id));
      if (pool.length !== 1) return null;
    }
    pool.sort(
      (a, b) =>
        Number(hasTrades.has(b.m.bioguide_id)) - Number(hasTrades.has(a.m.bioguide_id)) ||
        Number(Boolean(b.m.in_office)) - Number(Boolean(a.m.in_office)),
    );
    const m = pool[0].m;
    return memberShape(m, hasTrades.has(m.bioguide_id));
  } catch (e) {
    console.error('[sonar-politician] resolve failed:', e?.message);
    return null;
  }
}

function memberShape(m, hasTrades) {
  return {
    bioguideId: m.bioguide_id,
    name: m.full_name,
    lastName: m.last_name,
    party: m.party || null,
    chamber: m.chamber || null,
    chamberLabel: CHAMBER_LABEL[m.chamber] || null,
    state: m.state || null,
    inOffice: Boolean(m.in_office),
    hasTrades,
  };
}

/**
 * Nov 4: resolve straight from the understanding layer's politician entity
 * ("bioguide:P000197"), however long the ping is. One read, no name match.
 * @param {string} id "bioguide:P000197" or "P000197"
 */
export async function resolvePoliticianById(id, admin) {
  const bioguide = String(id || '')
    .replace(/^bioguide:/i, '')
    .trim()
    .toUpperCase();
  if (!admin || !/^[A-Z]\d{6}$/.test(bioguide)) return null;
  try {
    const [{ data: m }, { data: traded }] = await Promise.all([
      admin
        .from('congress_members')
        .select('bioguide_id, full_name, first_name, last_name, party, chamber, state, in_office')
        .eq('bioguide_id', bioguide)
        .maybeSingle(),
      admin.from('congress_trades').select('bioguide_id').eq('bioguide_id', bioguide).limit(1),
    ]);
    if (!m) return null;
    return memberShape(m, Boolean(traded?.length));
  } catch (e) {
    console.error('[sonar-politician] resolve by id failed:', e?.message);
    return null;
  }
}

const monthKey = (d) => String(d || '').slice(0, 7);

function nextMonth(key) {
  const [y, m] = key.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}

/* Share classes of one company count once, matching the RPC. */
const SHARE_CLASS = { GOOG: 'GOOGL', 'BRK.A': 'BRK.B', FOX: 'FOXA', NWS: 'NWSA', UA: 'UAA' };
const positionKey = (t) => {
  const tk = t.ticker ? String(t.ticker).toUpperCase() : null;
  if (tk) return SHARE_CLASS[tk] || tk;
  return `asset:${norm(t.asset_name || '?')}`;
};

/**
 * Month-end estimated open portfolio, oldest first.
 * @returns {{ months: string[], values: number[] }}
 */
export function portfolioSeries(trades, { months = 36, now = new Date() } = {}) {
  const sorted = [...trades]
    .filter((t) => t?.transaction_date)
    .sort((a, b) => String(a.transaction_date).localeCompare(String(b.transaction_date)));
  if (!sorted.length) return { months: [], values: [] };

  const open = new Map();
  const total = () => {
    let s = 0;
    for (const v of open.values()) s += v;
    return s;
  };

  const endKey = monthKey(now.toISOString());
  const outMonths = [];
  const outValues = [];
  let i = 0;
  let key = monthKey(sorted[0].transaction_date);
  /* Walk every month from the first trade to now, so a quiet stretch reads
     as a flat line rather than being skipped. */
  while (key <= endKey) {
    while (i < sorted.length && monthKey(sorted[i].transaction_date) === key) {
      const t = sorted[i];
      const k = positionKey(t);
      const mid = Number(t.amount_mid) || 0;
      if (t.type === 'purchase') open.set(k, (open.get(k) || 0) + mid);
      else if (t.type === 'sale_partial' && open.has(k))
        open.set(k, Math.max(open.get(k) - mid, 1001));
      else if (t.type === 'sale') open.delete(k);
      i += 1;
    }
    outMonths.push(key);
    outValues.push(Math.round(total()));
    key = nextMonth(key);
  }
  return { months: outMonths.slice(-months), values: outValues.slice(-months) };
}

/* The committee and Echo legs are extras: bounded so they never hold the
   member's trades, which the brief and the stack need first. */
const EXTRA_MS = 1200;
function soft(fn, ms) {
  let timer;
  return Promise.race([
    Promise.resolve()
      .then(fn)
      .catch(() => null),
    new Promise((resolve) => {
      timer = setTimeout(() => resolve(null), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

/**
 * The member dossier. Every leg is fail-soft; the card renders what came back.
 */
export async function buildPoliticianDossier(
  member,
  admin,
  { matchEcho = null, now = new Date() } = {},
) {
  const out = {
    kind: 'politician',
    ticker: null,
    name: member.name,
    bioguideId: member.bioguideId,
    party: member.party,
    chamber: member.chamberLabel,
    state: member.state,
    /* Filled below from congress_members.photo_url (the mirrored copy)
       with the public-domain sources after it; the card steps through them. */
    headshot: null,
    headshots: headshotCandidates({ name: member.name, bioguideId: member.bioguideId }),
    holdings: [],
    series: null,
    seriesLabel: null,
    stats: null,
    topHoldings: [],
    similar: [],
    /* Nov 4: committee seats (parents, with subcommittees), the latest
       disclosed trades with their ranges, and the past year's buying and
       selling by position, for the stack, the matches and the brief. */
    committees: null,
    recentTrades: [],
    buys12m: [],
    sells12m: [],
    overseen: null,
    /* The company layout's fields, empty, so any consumer that has not
       learned about kind still renders without throwing. */
    fundamentals: null,
    spark: null,
    news: [],
    echo: [],
    matches: null,
  };
  if (!admin) return out;

  const [tradesRes, portfolioRes, similarRes, committeesRes, echoRes] = await Promise.all([
    admin
      .from('congress_trades')
      .select(
        'type, transaction_date, disclosure_date, amount_min, amount_max, amount_mid, ticker, asset_name',
      )
      .eq('bioguide_id', member.bioguideId)
      .order('transaction_date', { ascending: true })
      .limit(5000)
      .then(
        (r) => r,
        () => ({ data: null }),
      ),
    admin.rpc('politician_portfolio', { p_bioguide: member.bioguideId, p_limit: 8 }).then(
      (r) => r,
      () => ({ data: null }),
    ),
    admin.rpc('politician_similar', { p_bioguide: member.bioguideId, p_limit: 4 }).then(
      (r) => r,
      () => ({ data: null }),
    ),
    /* Loaded on use: the committee reader pulls in the vendored legislators
       file, which the band's other paths never need. */
    soft(
      () =>
        import('@/lib/congress/committee-data').then(({ getMemberCommittees }) =>
          getMemberCommittees(admin, member.bioguideId),
        ),
      EXTRA_MS,
    ),
    matchEcho ? soft(() => matchEcho(admin, { name: member.name, ticker: null }), EXTRA_MS) : null,
  ]);

  const trades = Array.isArray(tradesRes?.data) ? tradesRes.data : [];
  const { months, values } = portfolioSeries(trades);
  if (values.length >= 2) {
    out.series = values;
    out.seriesMonths = months;
    const firstYear = months[0].slice(0, 4);
    out.seriesLabel = months.length >= 36 ? '3Y' : `SINCE ${firstYear}`;
  }

  const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const recent = trades.filter((t) => String(t.transaction_date) >= yearAgo);
  const lastTrade = trades.length ? trades[trades.length - 1].transaction_date : null;
  const portfolio = portfolioRes?.data || null;
  out.stats = {
    estValue:
      portfolio && Number(portfolio.total) > 0
        ? Number(portfolio.total)
        : values.length
          ? values[values.length - 1]
          : null,
    openPositions: portfolio ? Number(portfolio.positions) || 0 : null,
    trades12m: recent.length,
    lastTrade,
  };
  out.holdings = Array.isArray(portfolio?.holdings)
    ? portfolio.holdings
        .filter((h) => h?.ticker)
        .slice(0, 8)
        .map((h) => ({
          ticker: String(h.ticker),
          company: h.company ? String(h.company).replace(/\s+-\s+.*$/, '') : null,
          sector: h.sector || null,
          share: Number(h.share) || null,
        }))
    : [];
  out.topHoldings = out.holdings.slice(0, 3).map((h) => h.ticker);

  out.similar = (Array.isArray(similarRes?.data) ? similarRes.data : []).map((s) => ({
    bioguideId: s.bioguideId,
    name: s.name,
    party: s.party || null,
    chamber: CHAMBER_LABEL[s.chamber] || null,
    state: s.state || null,
    shared: Array.isArray(s.shared) ? s.shared : [],
    sharedCount: Number(s.shared_count) || 0,
    headshot: null,
    headshots: headshotCandidates({ name: s.name, bioguideId: s.bioguideId }),
  }));

  /* The stored portraits, for the member and the similar members in one
     read. A mirrored photo_url goes to the front of each list. */
  const ids = [member.bioguideId, ...out.similar.map((p) => p.bioguideId)].filter(Boolean);
  const photos = await admin
    .from('congress_members')
    .select('bioguide_id, photo_url')
    .in('bioguide_id', ids)
    .then(
      (r) => new Map((r?.data || []).map((m) => [m.bioguide_id, m.photo_url])),
      () => new Map(),
    );
  const withPhoto = (p) => {
    p.headshots = headshotCandidates({
      name: p.name,
      bioguideId: p.bioguideId,
      photoUrl: photos.get(p.bioguideId) || null,
    });
    p.headshot = p.headshots[0] || null;
  };
  withPhoto(out);
  out.similar.forEach(withPhoto);

  /* Nov 4: the latest disclosed trades with their ranges, and the past
     year's buying and selling grouped by position. */
  out.recentTrades = [...trades]
    .reverse()
    .slice(0, 6)
    .map((t) => tradeRow(t));
  out.buys12m = groupTrades(recent.filter((t) => t.type === 'purchase'));
  out.sells12m = groupTrades(recent.filter((t) => /^sale/.test(String(t.type || ''))));

  /* Committee seats. An empty roster is reported as empty, never guessed. */
  const cm = committeesRes || null;
  if (cm) {
    out.committees = (cm.committees || []).map((c) => ({
      thomasId: c.thomasId,
      name: c.name,
      shortName: c.shortName || c.name,
      chamber: c.chamber || null,
      onCommittee: Boolean(c.onCommittee),
      title: c.title || null,
      side: c.side || null,
      subcommittees: (c.subcommittees || []).map((x) => x.name).filter(Boolean),
      sectors: (c.sectors || []).map((x) => x?.label || x).filter(Boolean),
    }));
    out.overseen = cm.counts
      ? {
          total: Number(cm.counts.trades) || 0,
          matched: Number(cm.counts.overseen) || 0,
          trades: (cm.trades || []).slice(0, 4).map((t) => ({
            ticker: String(t.ticker || '').toUpperCase(),
            type: String(t.type || '').replace('_', ' '),
            date: t.transaction_date || null,
            range: rangeLabel(t.amount_min, t.amount_max),
            committee: t.committee?.shortName || t.committee?.name || null,
            sector: t.sector?.label || null,
          })),
        }
      : null;
  }

  const echo = Array.isArray(echoRes) && echoRes.length ? echoRes : null;
  out.echo = echo || [];

  /* The Sourced matches card: the member's own datasets. CONGRESS carries
     the latest disclosed trades with their ranges, BUYING the past year's
     purchases by position, OVERSIGHT the trades in sectors their committees
     oversee, ECHO the archive pieces that name them. Rows with nothing to
     show stay out, which is the truth. */
  out.matches = {
    echo,
    contracts: null,
    congress: out.recentTrades.length ? out.recentTrades : null,
    buys: out.buys12m.length ? out.buys12m.slice(0, 5) : null,
    overseen: out.overseen?.trades?.length ? out.overseen : null,
    sec: null,
    thirteenF: null,
    lobbying: null,
    markets: null,
  };

  return out;
}

/* ── ranges, rows and evidence ─────────────────────────────────────── */

const shortUsd = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  /* Filed bands start at $1,001, $15,001, ...: round to the band's face. */
  const r = n % 1000 === 1 ? n - 1 : n;
  if (r >= 1e6) return `$${+(r / 1e6).toFixed(r % 1e6 ? 1 : 0)}M`;
  if (r >= 1e3) return `$${Math.round(r / 1e3)}K`;
  return `$${Math.round(r)}`;
};

/** A STOCK Act band: "$500K–$1M", "$50M+"; `sep: ' to '` for prose. */
export function rangeLabel(min, max, { sep = '–' } = {}) {
  const lo = shortUsd(min);
  const hi = shortUsd(max);
  if (lo && hi) return `${lo}${sep}${hi}`;
  if (lo) return `${lo}+`;
  if (hi) return `up to ${hi}`;
  return null;
}

const labelOf = (t) =>
  t.ticker ? String(t.ticker).toUpperCase() : String(t.asset_name || 'Asset').slice(0, 40);
const companyOf = (t) =>
  t.ticker && t.asset_name
    ? String(t.asset_name)
        .replace(/\s+-\s+.*$/, '')
        .replace(/\s+(Class [A-Z]|Common Stock|Ordinary Shares).*$/i, '')
        .trim()
    : null;

function tradeRow(t) {
  return {
    member: labelOf(t),
    company: companyOf(t),
    type: String(t.type || '').replace('_', ' '),
    date: t.transaction_date || null,
    disclosed: t.disclosure_date || null,
    min: Number(t.amount_min) || null,
    max: Number(t.amount_max) || null,
    range: rangeLabel(t.amount_min, t.amount_max),
  };
}

/**
 * Trades grouped by position, largest disclosed total first.
 * @returns {Array<{ ticker, company, count, min, max, range, last }>}
 */
export function groupTrades(trades) {
  const by = new Map();
  for (const t of trades) {
    const k = positionKey(t);
    const g = by.get(k) || {
      ticker: labelOf(t),
      company: companyOf(t),
      count: 0,
      min: 0,
      max: 0,
      mid: 0,
      last: null,
    };
    g.count += 1;
    g.min += Number(t.amount_min) || 0;
    g.max += Number(t.amount_max) || Number(t.amount_min) || 0;
    g.mid += Number(t.amount_mid) || 0;
    if (!g.last || String(t.transaction_date) > g.last) g.last = t.transaction_date || g.last;
    by.set(k, g);
  }
  return [...by.values()]
    .sort((a, b) => b.mid - a.mid || String(b.last).localeCompare(String(a.last)))
    .map(({ mid, ...g }) => ({ ...g, range: rangeLabel(g.min, g.max) }));
}

/**
 * Nov 4: a member's dossier as evidence snippets, so the brief answers "what
 * has she been buying" from the disclosures on screen and never from a
 * general briefing. Every line is a filed fact or a labelled estimate.
 */
export function politicianEvidence(d) {
  if (!d || d.kind !== 'politician') return [];
  const who = d.name;
  const out = [];
  const push = (title, snippet, date = null) =>
    out.push({ corpus: 'congress', title, snippet, date, meta: { member: who } });
  const s = d.stats || {};

  if (s.lastTrade || s.trades12m != null) {
    push(
      `${who} disclosure activity`,
      `${who} (${[d.party, d.state].filter(Boolean).join('-')}, U.S. ${d.chamber || 'Congress'}) disclosed ${s.trades12m ?? 0} trades in the last 12 months under the STOCK Act${
        s.lastTrade ? `; the latest disclosed trade is dated ${s.lastTrade}` : ''
      }. Filings report amount ranges, not exact amounts, and may be filed up to 45 days after the trade.`,
      s.lastTrade,
    );
  }
  /* Prose ranges ("$500K to $1M"): the fallback brief turns dashes into commas. */
  const words = (min, max) => rangeLabel(min, max, { sep: ' to ' });
  const line = (g) => {
    const r = words(g.min, g.max);
    return `${g.ticker}${g.company ? ` (${g.company})` : ''}: ${g.count} ${g.count === 1 ? 'trade' : 'trades'}${r ? `, ${r} disclosed` : ''}${g.last ? `, latest ${g.last}` : ''}`;
  };
  if (d.buys12m?.length) {
    push(
      `${who} purchases, last 12 months`,
      `${who}'s disclosed purchases in the last 12 months, largest first: ${d.buys12m
        .slice(0, 6)
        .map(line)
        .join('; ')}.`,
    );
  }
  if (d.sells12m?.length) {
    push(
      `${who} sales, last 12 months`,
      `${who}'s disclosed sales in the last 12 months, largest first: ${d.sells12m
        .slice(0, 5)
        .map(line)
        .join('; ')}.`,
    );
  }
  if (d.recentTrades?.length) {
    push(
      `${who} latest disclosed trades`,
      `${who}'s latest disclosed trades: ${d.recentTrades
        .map(
          (t) =>
            `${t.date || 'undated'} ${t.type} ${t.member}${t.company ? ` (${t.company})` : ''}${words(t.min, t.max) ? ` ${words(t.min, t.max)}` : ''}`,
        )
        .join('; ')}.`,
      d.recentTrades[0].date,
    );
  }
  if (typeof s.estValue === 'number' && s.estValue > 0) {
    const top = (d.holdings || [])
      .slice(0, 6)
      .map((h) => `${h.ticker}${h.share ? ` ${(h.share * 100).toFixed(1)}%` : ''}`)
      .join(', ');
    push(
      `${who} estimated open portfolio`,
      `Ezana's estimate of ${who}'s open disclosed positions, from filed ranges at their midpoints with no market prices applied: about ${shortUsd(
        Math.round(s.estValue),
      )}${typeof s.openPositions === 'number' ? ` across ${s.openPositions} positions` : ''}${top ? `; largest by estimate: ${top}` : ''}.`,
    );
  }
  if (Array.isArray(d.committees)) {
    push(
      `${who} committee seats`,
      d.committees.length
        ? `${who}'s committee seats in Ezana's roster: ${d.committees
            .map(
              (c) =>
                `${c.name}${c.title ? ` (${c.title})` : ''}${c.subcommittees.length ? `, subcommittees: ${c.subcommittees.slice(0, 3).join(', ')}` : ''}`,
            )
            .join('; ')}.`
        : `Ezana's committee roster lists no current committee seats for ${who}.`,
    );
  }
  if (d.overseen?.trades?.length) {
    push(
      `${who} trades in overseen sectors`,
      `${d.overseen.matched} of ${who}'s ${d.overseen.total} ticker trades in the last 24 months fall in sectors their committees oversee, for example: ${d.overseen.trades
        .map((t) => `${t.date} ${t.type} ${t.ticker} (${t.sector}, ${t.committee})`)
        .join('; ')}.`,
    );
  }
  if (d.similar?.length) {
    push(
      `Members who trade like ${who}`,
      `Members whose traded tickers overlap most with ${who}'s: ${d.similar
        .map(
          (p) =>
            `${p.name}${p.shared?.length ? ` (shares ${p.shared.slice(0, 3).join(', ')})` : ''}`,
        )
        .join('; ')}.`,
    );
  }
  return out;
}
