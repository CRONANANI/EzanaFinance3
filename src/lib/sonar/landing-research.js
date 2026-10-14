/**
 * The wider research layer for a Sonar ping (landing band and /datasets
 * search). Two things live here, both additive to runLandingPipeline:
 *
 *   1. Intent. A ping about sanctions ("which US companies are most exposed
 *      to US sanctions") attaches the OFAC SDN aggregates Ezana already holds
 *      (sanctions_entries, via getSanctionsSummary) as dataset evidence for
 *      the brief, and returns them for the results' map and charts.
 *
 *   2. News columns. Three columns of articles under the result cards, each
 *      with a job (for a member of Congress: their heaviest positions, the
 *      member in the news, policy that touches their book). Ezana's own news
 *      cache fills each column first; one web-search call to Claude fills the
 *      rest. The model is asked for links, but only links the search tool
 *      actually returned are kept, so an invented URL can never reach a page.
 *
 * Every function is fail-soft: a dead leg yields an empty column or a null
 * panel, never a lost answer.
 */
import { getSanctionsSummary } from '@/lib/sanctions/summary';
import { programMeta, themeOf } from '@/lib/sanctions/programs';
import { synthesizeWithFallback } from './llm-providers';

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
const PER_COLUMN = 4;

/* ── intent ─────────────────────────────────────────────────────────── */

const SANCTIONS_RE =
  /\b(sanction(?:s|ed|ing)?|ofac|embargo(?:es|ed)?|export controls?|sdn list|specially designated nationals?|blacklist(?:ed)?|entity list)\b/i;

/** 'sanctions' for a ping about sanctions, else null. */
export function detectIntent(query) {
  return SANCTIONS_RE.test(String(query || '')) ? 'sanctions' : null;
}

const fmt = (n) => Number(n || 0).toLocaleString('en-US');

/**
 * The sanctions panel and its dataset evidence. `panel` is what the results
 * draw (map aggregates, top jurisdictions, largest programs); `evidence` is
 * the snippet text the brief cites as [D1] and [D2].
 */
export async function sanctionsContext() {
  let s;
  try {
    s = await getSanctionsSummary();
  } catch {
    return null;
  }
  if (!s?.active) return null;
  const programs = s.programs.slice(0, 12).map((p) => {
    const meta = programMeta(p.code);
    return {
      code: p.code,
      label: meta.label,
      total: p.total,
      color: themeOf(p.code).color,
    };
  });
  const targets = s.targets.slice(0, 10).map((t) => ({
    name: t.name,
    total: t.total,
    entity: t.entity,
    codes: t.codes.slice(0, 3),
  }));
  const panel = {
    active: s.active,
    byType: s.byType,
    synced: s.synced,
    countries: s.countries.map((c) => ({ name: c.name, total: c.total, entity: c.entity })),
    targets,
    programs,
  };
  const topBased = s.countries
    .slice(0, 8)
    .map((c) => `${c.name} ${fmt(c.total)} (${fmt(c.entity)} companies)`)
    .join('; ');
  const topTargets = targets
    .map((t) => `${t.name} ${fmt(t.total)} listings, ${fmt(t.entity)} companies`)
    .join('; ');
  const topPrograms = programs
    .slice(0, 8)
    .map((p) => `${p.code} (${p.label}) ${fmt(p.total)}`)
    .join('; ');
  const evidence = [
    {
      corpus: 'sanctions',
      title: 'OFAC SDN list, jurisdictions',
      snippet: `Ezana's copy of the US Treasury OFAC Specially Designated Nationals list holds ${fmt(s.active)} active listings: ${fmt(s.byType.entity)} companies and organisations, ${fmt(s.byType.individual)} individuals, ${fmt(s.byType.vessel)} vessels, ${fmt(s.byType.aircraft)} aircraft. Jurisdictions under a US program, by listings: ${topTargets}. Address countries with the most listed parties: ${topBased}.`,
    },
    {
      corpus: 'sanctions',
      title: 'OFAC SDN list, programs',
      snippet: `Largest OFAC programs by listings: ${topPrograms}.`,
    },
  ];
  return { panel, evidence };
}

/* Companies the brief names as most exposed, from a fenced JSON block the
   sanctions brief appends. Only well-formed rows survive; the block is
   stripped from the visible answer whatever happens. */
const EXPOSED_RE = /<exposed>([\s\S]*?)<\/exposed>/i;
export function splitExposed(answer) {
  const text = String(answer || '');
  const m = text.match(EXPOSED_RE);
  if (!m) return { answer: text.trim(), exposed: [] };
  let rows = [];
  try {
    const parsed = JSON.parse(m[1].trim());
    rows = Array.isArray(parsed) ? parsed : [];
  } catch {
    rows = [];
  }
  const exposed = rows
    .filter((r) => r && typeof r.company === 'string' && r.company.trim())
    .slice(0, 8)
    .map((r) => ({
      company: r.company.trim().slice(0, 80),
      ticker:
        typeof r.ticker === 'string' && /^[A-Z.]{1,6}$/.test(r.ticker.trim())
          ? r.ticker.trim()
          : null,
      exposure: ['high', 'medium', 'low'].includes(r.exposure) ? r.exposure : 'medium',
      why: typeof r.why === 'string' ? r.why.trim().slice(0, 160) : '',
    }));
  return { answer: text.replace(EXPOSED_RE, '').trim(), exposed };
}

/* ── news columns ──────────────────────────────────────────────────── */

const cleanTerm = (t) =>
  String(t || '')
    .replace(/[^\p{L}\p{N} .&'-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function article(r, origin) {
  return {
    title: String(r.title),
    url: String(r.url || r.article_url),
    source: String(r.source || r.publisher_name || 'News'),
    publishedAt: r.publishedAt || r.published_utc || null,
    origin,
  };
}

async function cacheByTickers(admin, tickers, limit = 6) {
  if (!admin || !tickers.length) return [];
  try {
    const { data } = await admin
      .from('news_articles_cache')
      .select('title, article_url, publisher_name, published_utc')
      .overlaps('tickers', tickers)
      .order('published_utc', { ascending: false })
      .limit(limit);
    return (data || []).filter((r) => r.title && r.article_url).map((r) => article(r, 'dataset'));
  } catch {
    return [];
  }
}

async function cacheBySearch(admin, phrase, limit = 6) {
  const q = cleanTerm(phrase).slice(0, 120);
  if (!admin || q.length < 3) return [];
  try {
    const { data } = await admin
      .from('news_articles_cache')
      .select('title, article_url, publisher_name, published_utc')
      .textSearch('search_tsv', q, { type: 'websearch', config: 'english' })
      .order('published_utc', { ascending: false })
      .limit(limit);
    return (data || []).filter((r) => r.title && r.article_url).map((r) => article(r, 'dataset'));
  } catch {
    return [];
  }
}

/**
 * What the three columns are for, per kind of ping, with the articles
 * Ezana's own cache already holds for each.
 */
export async function columnSpecs({ query, politician, resolved, dossier, intent, admin }) {
  if (politician) {
    const holdings = (dossier?.holdings || []).slice(0, 5);
    const tickers = holdings.map((h) => h.ticker).filter(Boolean);
    const sectors = [...new Set(holdings.map((h) => h.sector).filter(Boolean))].slice(0, 3);
    const last = politician.lastName || politician.name;
    const [positions, member] = await Promise.all([
      cacheByTickers(admin, tickers),
      cacheBySearch(admin, politician.name),
    ]);
    return [
      {
        id: 'positions',
        title: 'Their heaviest positions',
        icon: 'bi-pie-chart',
        hint: tickers.length
          ? `recent news moving the member's largest disclosed holdings: ${holdings
              .map((h) => `${h.company || h.ticker} (${h.ticker})`)
              .join(', ')}`
          : `recent news on the stocks ${politician.name} has traded`,
        seed: positions,
      },
      {
        id: 'member',
        title: `${last} in the news`,
        icon: 'bi-person-badge',
        hint: `recent reporting about ${politician.name} (U.S. ${politician.chamberLabel || 'Congress'}): stock trades and disclosures, votes, bills and committee work`,
        seed: member,
      },
      {
        id: 'policy',
        title: 'Policy that touches the book',
        icon: 'bi-bank',
        hint: `recent legislation, regulation, committee hearings or executive action affecting ${
          sectors.length ? sectors.join(', ') : 'the sectors this member trades'
        }`,
        seed: [],
      },
    ];
  }

  if (resolved) {
    const news = Array.isArray(dossier?.news) ? dossier.news : [];
    const company = news.filter((n) => n.scope === 'company').map((n) => article(n, 'dataset'));
    const sector = news.filter((n) => n.scope === 'industry').map((n) => article(n, 'dataset'));
    const cached = await cacheByTickers(admin, [resolved.ticker]);
    const industry = dossier?.industry?.label || dossier?.industry?.name || null;
    return [
      {
        id: 'company',
        title: `${resolved.name} headlines`,
        icon: 'bi-building',
        hint: `the latest company news about ${resolved.name} (${resolved.ticker}): results, guidance, deals, management`,
        seed: [...company, ...cached],
      },
      {
        id: 'sector',
        title: industry ? `${industry} & peers` : 'Sector & peers',
        icon: 'bi-diagram-3',
        hint: `recent news on ${resolved.name}'s competitors and the ${industry || 'industry'} it operates in`,
        seed: sector,
      },
      {
        id: 'policy',
        title: 'Washington & policy',
        icon: 'bi-bank',
        hint: `recent government contracts, regulation, trade policy, sanctions, lobbying or congressional activity involving ${resolved.name}`,
        seed: [],
      },
    ];
  }

  const seed = await cacheBySearch(admin, query);
  const sanctions = intent === 'sanctions';
  return [
    {
      id: 'latest',
      title: 'Latest developments',
      icon: 'bi-lightning',
      hint: `the most recent reporting on: ${query}`,
      seed,
    },
    {
      id: 'markets',
      title: 'Market impact',
      icon: 'bi-graph-up-arrow',
      hint: `which companies, sectors and markets are affected, with company names, for: ${query}`,
      seed: [],
    },
    {
      id: 'policy',
      title: sanctions ? 'Sanctions actions' : 'Policy & regulators',
      icon: sanctions ? 'bi-shield-exclamation' : 'bi-bank',
      hint: sanctions
        ? 'recent US Treasury OFAC designations, Commerce export-control actions and sanctions enforcement'
        : `government, regulator and legislative action related to: ${query}`,
      seed: [],
    },
  ];
}

const NEWS_SYSTEM = `You are the news desk for Ezana Sonar. Use web search to find recent, reputable news articles (prefer the last 60 days) for each column you are given.
Rules:
- Every article must be a real result returned by your web search. Copy its URL exactly. Never construct, shorten or guess a URL.
- Prefer original reporting from established outlets and official sources (Reuters, AP, Bloomberg, WSJ, FT, CNBC, Politico, government sites). No forums, no press-release mills.
- Up to ${PER_COLUMN} articles per column, newest first. Fewer is fine; an empty list is fine.
- Reply with ONLY a JSON object, no prose: {"columns":{"<column id>":[{"title":"...","url":"https://...","source":"Outlet","date":"YYYY-MM-DD"}]}}`;

function parseJsonObject(text) {
  const s = String(text || '');
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try {
    return JSON.parse(s.slice(a, b + 1));
  } catch {
    return null;
  }
}

const normUrl = (u) =>
  String(u || '')
    .replace(/[#?].*$/, '')
    .replace(/\/$/, '');
const validDate = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(String(d || '')) ? String(d) : null);

/**
 * Fill the columns: cache articles first, then web articles the search tool
 * returned. Returns [{ id, title, icon, items: [...] }]; a column with no
 * items is kept so the layout stays three-up, and the client shows its
 * empty line.
 */
export async function buildNewsColumns({ subject, specs }) {
  const columns = specs.map((c) => ({ id: c.id, title: c.title, icon: c.icon, items: [] }));
  const seen = new Set();
  const push = (col, it) => {
    const key = normUrl(it.url);
    if (!it.title || !/^https:\/\//.test(it.url) || seen.has(key)) return;
    if (col.items.length >= PER_COLUMN) return;
    seen.add(key);
    col.items.push(it);
  };
  specs.forEach((spec, i) => spec.seed.slice(0, PER_COLUMN).forEach((it) => push(columns[i], it)));

  const wanted = specs.filter((_, i) => columns[i].items.length < PER_COLUMN);
  if (!wanted.length) return columns;

  let synth;
  try {
    synth = await synthesizeWithFallback({
      system: NEWS_SYSTEM,
      user: `Subject: ${subject}\n\nColumns:\n${wanted
        .map((c) => `- ${c.id}: ${c.hint}`)
        .join('\n')}`,
      maxTokens: 1400,
      model: HAIKU_MODEL,
      fallbackModel: HAIKU_MODEL,
      webSearch: { enabled: true, maxUses: 4 },
    });
  } catch {
    return columns;
  }
  /* Only links the search tool returned. A fallback provider without web
     search returns none, so nothing from it is kept. */
  const returned = new Map((synth?.webResults || []).map((r) => [normUrl(r.url), r]));
  const parsed = parseJsonObject(synth?.answer);
  const byId = parsed?.columns && typeof parsed.columns === 'object' ? parsed.columns : {};
  for (const col of columns) {
    const rows = Array.isArray(byId[col.id]) ? byId[col.id] : [];
    for (const r of rows) {
      const hit = returned.get(normUrl(r?.url));
      if (!hit) continue;
      push(col, {
        title: String(r.title || hit.title || '').slice(0, 200),
        url: hit.url,
        source: String(r.source || new URL(hit.url).hostname.replace(/^www\./, '')).slice(0, 60),
        publishedAt: validDate(r.date) || hit.pageAge || null,
        origin: 'web',
      });
    }
  }
  return columns;
}
