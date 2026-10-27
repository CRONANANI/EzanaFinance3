/**
 * Sonar country pings: resolution, dossier and grounded evidence.
 *
 * Third entity kind beside the company (landing-pipeline.js) and the member of
 * Congress (landing-politician.js). A ping that names a country resolves here
 * BEFORE either of those: FMP's fuzzy name search turns "Japan" into Japan
 * Airlines and "China" into China Mobile, which is exactly the wrong dossier.
 *
 * Resolution is a strict whole-string match against a static ISO table
 * (names, common aliases). No fuzzy matching, so "Apple" or "China tariffs on
 * EVs" never land here; a sentence about a country is a topic ping and keeps
 * the topic path.
 *
 * The dossier reads two Ezana datasets and nothing else:
 *   OECD Economic Outlook  oecd_series_observations, curated slugs only
 *   Global Empire Rankings country_dimension_scores_mat via empire-public-store
 * Every figure it returns is a stored observation or a rank computed from
 * stored observations. Years at or after PROJECTION_FROM_YEAR are OECD
 * projections and are flagged `proj: true` all the way to the UI. Every leg
 * resolves null on failure and never throws, matching the other dossiers.
 */
import {
  OECD_CURATED_SLUGS,
  OECD_SERIES_BY_SLUG,
  OECD_AGGREGATE_AREAS,
  PROJECTION_FROM_YEAR,
} from '@/lib/oecd-curated';
import { getEmpireScoresForExplorer } from '@/lib/empire-public-store';
import { empireDossier } from '@/lib/sonar/empire-dossier';
import { buildEmpireModel } from '@/app/datasets/oecd-macro/oecd-empire-model';
import { fetchIndustryNews } from '@/lib/sonar/industry-news';

/* ── resolution ─────────────────────────────────────────────────────────── */

/* [iso3, display name, aliases, news terms]. Aliases are whole-query matches
   only. News terms feed the cached-headline filter: the country name plus an
   unambiguous demonym; "American" is deliberately absent (American Airlines,
   American Express). `oecd` overrides the OECD area code where it differs. */
const COUNTRIES = [
  [
    'USA',
    'United States',
    ['us', 'usa', 'america', 'united states of america', 'the us', 'the usa'],
    ['United States', 'US economy', 'Federal Reserve'],
  ],
  ['CHN', 'China', ['prc', "people's republic of china", 'mainland china'], ['China', 'Chinese']],
  [
    'EUR',
    'Eurozone',
    ['euro area', 'euro zone', 'the eurozone'],
    ['Eurozone', 'euro area', 'ECB'],
    { oecd: 'EA17' },
  ],
  ['JPN', 'Japan', [], ['Japan', 'Japanese']],
  ['DEU', 'Germany', ['deutschland'], ['Germany', 'German']],
  [
    'GBR',
    'United Kingdom',
    ['uk', 'u.k.', 'britain', 'great britain', 'the uk'],
    ['Britain', 'British', 'UK economy'],
  ],
  ['FRA', 'France', [], ['France', 'French']],
  ['IND', 'India', [], ['India', 'Indian']],
  ['ITA', 'Italy', [], ['Italy', 'Italian']],
  ['CAN', 'Canada', [], ['Canada', 'Canadian']],
  ['KOR', 'South Korea', ['korea', 'republic of korea'], ['South Korea', 'Korean']],
  ['RUS', 'Russia', ['russian federation'], ['Russia', 'Russian']],
  ['BRA', 'Brazil', [], ['Brazil', 'Brazilian']],
  ['AUS', 'Australia', [], ['Australia', 'Australian']],
  ['ESP', 'Spain', [], ['Spain', 'Spanish']],
  ['MEX', 'Mexico', [], ['Mexico', 'Mexican']],
  ['IDN', 'Indonesia', [], ['Indonesia', 'Indonesian']],
  ['NLD', 'Netherlands', ['the netherlands', 'holland'], ['Netherlands', 'Dutch']],
  ['SAU', 'Saudi Arabia', ['saudi', 'ksa'], ['Saudi Arabia', 'Saudi']],
  ['TUR', 'Turkey', ['turkiye', 'türkiye'], ['Turkey', 'Turkish', 'Türkiye']],
  ['CHE', 'Switzerland', [], ['Switzerland', 'Swiss']],
  ['POL', 'Poland', [], ['Poland', 'Polish']],
  ['SWE', 'Sweden', [], ['Sweden', 'Swedish']],
  ['BEL', 'Belgium', [], ['Belgium', 'Belgian']],
  ['ARG', 'Argentina', [], ['Argentina', 'Argentine']],
  ['NOR', 'Norway', [], ['Norway', 'Norwegian']],
  ['AUT', 'Austria', [], ['Austria', 'Austrian']],
  ['IRL', 'Ireland', ['republic of ireland'], ['Ireland', 'Irish']],
  ['ISR', 'Israel', [], ['Israel', 'Israeli']],
  [
    'ARE',
    'UAE',
    ['united arab emirates', 'the uae', 'emirates'],
    ['UAE', 'Emirati', 'Dubai', 'Abu Dhabi'],
  ],
  ['SGP', 'Singapore', [], ['Singapore']],
  ['DNK', 'Denmark', [], ['Denmark', 'Danish']],
  ['FIN', 'Finland', [], ['Finland', 'Finnish']],
  ['PRT', 'Portugal', [], ['Portugal', 'Portuguese']],
  ['GRC', 'Greece', [], ['Greece', 'Greek']],
  ['CZE', 'Czechia', ['czech republic'], ['Czech']],
  ['HUN', 'Hungary', [], ['Hungary', 'Hungarian']],
  ['ROU', 'Romania', [], ['Romania', 'Romanian']],
  ['NZL', 'New Zealand', [], ['New Zealand']],
  ['CHL', 'Chile', [], ['Chile', 'Chilean']],
  ['COL', 'Colombia', [], ['Colombia', 'Colombian']],
  ['PER', 'Peru', [], ['Peru', 'Peruvian']],
  ['ZAF', 'South Africa', [], ['South Africa', 'South African']],
  ['EGY', 'Egypt', [], ['Egypt', 'Egyptian']],
  ['NGA', 'Nigeria', [], ['Nigeria', 'Nigerian']],
  ['KEN', 'Kenya', [], ['Kenya', 'Kenyan']],
  ['ETH', 'Ethiopia', [], ['Ethiopia', 'Ethiopian']],
  ['MAR', 'Morocco', [], ['Morocco', 'Moroccan']],
  ['DZA', 'Algeria', [], ['Algeria', 'Algerian']],
  ['IRN', 'Iran', [], ['Iran', 'Iranian']],
  ['PAK', 'Pakistan', [], ['Pakistan', 'Pakistani']],
  ['BGD', 'Bangladesh', [], ['Bangladesh']],
  ['VNM', 'Vietnam', ['viet nam'], ['Vietnam', 'Vietnamese']],
  ['THA', 'Thailand', [], ['Thailand', 'Thai']],
  ['MYS', 'Malaysia', [], ['Malaysia', 'Malaysian']],
  ['PHL', 'Philippines', ['the philippines'], ['Philippines', 'Philippine']],
  ['KAZ', 'Kazakhstan', [], ['Kazakhstan']],
  ['UKR', 'Ukraine', [], ['Ukraine', 'Ukrainian']],
  ['QAT', 'Qatar', [], ['Qatar']],
  ['KWT', 'Kuwait', [], ['Kuwait']],
  ['ECU', 'Ecuador', [], ['Ecuador']],
  ['EST', 'Estonia', [], ['Estonia']],
  ['LVA', 'Latvia', [], ['Latvia']],
  ['LTU', 'Lithuania', [], ['Lithuania']],
  ['SVK', 'Slovakia', ['slovak republic'], ['Slovakia']],
  ['SVN', 'Slovenia', [], ['Slovenia']],
  ['LUX', 'Luxembourg', [], ['Luxembourg']],
  ['ISL', 'Iceland', [], ['Iceland']],
  ['CRI', 'Costa Rica', [], ['Costa Rica']],
  ['BGR', 'Bulgaria', [], ['Bulgaria']],
  ['HRV', 'Croatia', [], ['Croatia']],
];

const norm = (s) =>
  String(s || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}' .]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/* Trailing words that still mean "tell me about this country". Anything else
   ("Japan tariffs", "China EV exports") is a topic ping, not a country ping. */
const SUFFIX =
  /\s+(economy|economics|macro|macroeconomy|outlook|overview|country profile|profile)$/;

const BY_KEY = new Map();
for (const [iso3, name, aliases, newsTerms, opts] of COUNTRIES) {
  const entry = { iso3, name, newsTerms, oecdArea: opts?.oecd || iso3 };
  for (const k of [name, ...aliases]) BY_KEY.set(norm(k), entry);
}

/** { iso3, name, oecdArea, newsTerms } or null. Strict, synchronous, free. */
export function resolveCountry(query) {
  let q = norm(query).replace(/^the\s+/, '');
  if (!q || q.length > 40) return null;
  q = q.replace(SUFFIX, '');
  const hit = BY_KEY.get(q) || BY_KEY.get(`the ${q}`) || BY_KEY.get(q.replace(/\./g, ''));
  return hit ? { ...hit } : null;
}

/* Oct 26: a country named anywhere in a longer ping ("brazilian economy
   outlook for the next 4 years after the 2026 federal election"), for the
   country's OECD and Empire charts. Looser than resolveCountry, so it uses
   only full names, news terms (names and demonyms) and long aliases: short
   aliases stay whole-query-only ("tell us ...", "Bank of America"), and four
   demonyms that are everyday words are skipped. Whole words only. */
const MENTION_SKIP = new Set(['turkey', 'polish', 'danish', 'swiss']);
const escapeRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const MENTION = [];
for (const [iso3, name, aliases, newsTerms, opts] of COUNTRIES) {
  const entry = { iso3, name, newsTerms, oecdArea: opts?.oecd || iso3 };
  const terms = new Set(
    [name, ...newsTerms, ...aliases.filter((a) => a.length >= 6 && !/america/i.test(a))]
      .map(norm)
      .filter((t) => t && !MENTION_SKIP.has(t)),
  );
  for (const t of terms) {
    MENTION.push({ entry, re: new RegExp(`(^|[^\\p{L}])${escapeRe(t)}(?=[^\\p{L}]|$)`, 'u') });
  }
}

/** The first country named anywhere in the ping, or null. */
export function mentionedCountry(query) {
  const q = norm(query);
  if (!q) return null;
  let best = null;
  for (const { entry, re } of MENTION) {
    const m = re.exec(q);
    if (m && (!best || m.index < best.at)) best = { entry, at: m.index };
  }
  return best ? { ...best.entry } : null;
}

/** Lowercased terms that mark a retrieved chunk as being about the country. */
export function countryEntityTerms(country) {
  return [country.name, ...country.newsTerms].map((t) => t.toLowerCase());
}

/* ── OECD leg ───────────────────────────────────────────────────────────── */

/* The four figures the Sourced matches row leads with, in display order. */
const HEADLINE = ['eo-gdpv_annpct', 'eo-cpi_ytypct', 'eo-unr', 'eo-ggflq'];

/* Series the story chart may choose from, in tie-break order. All are rates
   or ratios, so a country's history is comparable with itself. */
const STORY_SLUGS = [
  'eo-cpi_ytypct',
  'eo-gdpv_annpct',
  'eo-unr',
  'eo-ggflq',
  'eo-cbgdpr',
  'eo-ircb',
  'eo-irl',
  'eo-sratio',
];

const HISTORY_FROM = 1990;
const CHART_FROM = 1995;
const NORM_YEARS = 20;
const MIN_ACTUAL_YEARS = 12;

async function oecdHistory(admin, area) {
  const PAGE = 1000;
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from('oecd_series_observations')
      .select('ezana_slug, year, obs_value')
      .eq('ref_area', area)
      .in('ezana_slug', OECD_CURATED_SLUGS)
      .gte('year', HISTORY_FROM)
      .order('ezana_slug')
      .order('year')
      .range(from, from + PAGE - 1);
    if (error) return null;
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}

function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function stdev(xs) {
  const mu = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - mu) ** 2, 0) / xs.length);
}

/** One series' story stats from its own history. null when too thin. */
function seriesStory(slug, points) {
  const meta = OECD_SERIES_BY_SLUG[slug];
  const actual = points.filter((p) => !p.proj);
  if (!meta || actual.length < MIN_ACTUAL_YEARS) return null;
  const latest = actual[actual.length - 1];
  const window = actual.filter((p) => p.year < latest.year && p.year >= latest.year - NORM_YEARS);
  if (window.length < 8) return null;
  const vals = window.map((p) => p.value);
  const med = median(vals);
  const sd = stdev(vals);
  const z = sd > 0 ? (latest.value - med) / sd : 0;
  const shown = points.filter((p) => p.year >= CHART_FROM);
  const shownActual = shown.filter((p) => !p.proj);
  const peak = shownActual.reduce((a, b) => (b.value > a.value ? b : a), shownActual[0]);
  const trough = shownActual.reduce((a, b) => (b.value < a.value ? b : a), shownActual[0]);
  return {
    slug,
    label: meta.label,
    short: meta.short,
    unit: meta.unitLabel,
    decimals: meta.decimals ?? 1,
    signed: Boolean(meta.signed),
    points: shown,
    latest,
    median: med,
    sd,
    z,
    peak,
    trough,
    normYears: NORM_YEARS,
  };
}

/* Peer rank for one slug in one year: position by value, highest first,
   across every non-aggregate area that reported it. Descriptive, never a
   judgement: "5th highest of 46", not "5th best". */
async function peerRank(admin, slug, year, area) {
  const { data, error } = await admin
    .from('oecd_series_observations')
    .select('ref_area, obs_value')
    .eq('ezana_slug', slug)
    .eq('year', year)
    .not('obs_value', 'is', null)
    .limit(400);
  if (error || !data?.length) return null;
  const peers = data
    .filter((r) => !OECD_AGGREGATE_AREAS.includes(r.ref_area))
    .map((r) => ({ area: r.ref_area, v: Number(r.obs_value) }))
    .filter((r) => Number.isFinite(r.v))
    .sort((a, b) => b.v - a.v);
  const at = peers.findIndex((r) => r.area === area);
  return at < 0 ? null : { rank: at + 1, of: peers.length };
}

async function buildOecd(admin, country) {
  try {
    const rows = await oecdHistory(admin, country.oecdArea);
    if (!rows?.length) return null;

    const bySlug = new Map();
    for (const r of rows) {
      const v = r.obs_value == null ? null : Number(r.obs_value);
      if (!Number.isFinite(v)) continue;
      if (!bySlug.has(r.ezana_slug)) bySlug.set(r.ezana_slug, []);
      bySlug.get(r.ezana_slug).push({
        year: r.year,
        value: v,
        proj: r.year >= PROJECTION_FROM_YEAR,
      });
    }

    const headline = [];
    for (const slug of HEADLINE) {
      const pts = bySlug.get(slug);
      const meta = OECD_SERIES_BY_SLUG[slug];
      const actual = pts?.filter((p) => !p.proj) || [];
      if (!meta || !actual.length) continue;
      const latest = actual[actual.length - 1];
      const prior = actual.length > 1 ? actual[actual.length - 2] : null;
      const nextProj = pts.find((p) => p.proj) || null;
      headline.push({
        slug,
        label: meta.label,
        short: meta.short,
        unit: meta.unitLabel,
        decimals: meta.decimals ?? 1,
        latest,
        prior,
        projection: nextProj,
        peer: null,
      });
    }
    /* Ranks side by side; a failed rank is a missing caption, not a lost row. */
    await Promise.all(
      headline.map(async (h) => {
        try {
          h.peer = await peerRank(admin, h.slug, h.latest.year, country.oecdArea);
        } catch {
          h.peer = null;
        }
      }),
    );

    const stories = STORY_SLUGS.map((s) =>
      bySlug.has(s) ? seriesStory(s, bySlug.get(s)) : null,
    ).filter(Boolean);
    /* The story is the series furthest from its own 20-year norm. Ties keep
       STORY_SLUGS order, so the choice is deterministic for a given dataset. */
    let storyIndex = 0;
    stories.forEach((s, i) => {
      if (Math.abs(s.z) > Math.abs(stories[storyIndex].z) + 1e-9) storyIndex = i;
    });

    if (!headline.length && !stories.length) return null;
    return {
      area: country.oecdArea,
      projectionFrom: PROJECTION_FROM_YEAR,
      headline,
      stories,
      storyIndex: stories.length ? storyIndex : null,
      source: 'OECD Economic Outlook',
    };
  } catch (e) {
    console.error('[sonar-country] oecd leg failed:', e?.message);
    return null;
  }
}

/* ── Empire leg ─────────────────────────────────────────────────────────── */

/* The backbone refreshes weekly, and every country ping would otherwise
   re-read every score row. Ten minutes per warm instance is plenty. */
let empireCache = { at: 0, value: null };
const EMPIRE_TTL_MS = 10 * 60 * 1000;

async function empireModel() {
  if (empireCache.value && Date.now() - empireCache.at < EMPIRE_TTL_MS) return empireCache.value;
  const raw = await getEmpireScoresForExplorer();
  const model = buildEmpireModel(raw);
  if (model) empireCache = { at: Date.now(), value: model };
  return model;
}

async function buildEmpire(country) {
  try {
    return empireDossier(await empireModel(), country);
  } catch (e) {
    console.error('[sonar-country] empire leg failed:', e?.message);
    return null;
  }
}

/* ── news + markets ─────────────────────────────────────────────────────── */

async function countryNews(admin, country) {
  const rows = await fetchIndustryNews(
    admin,
    { label: country.name, name: country.name, terms: country.newsTerms },
    { days: 21, limit: 4 },
  );
  return rows.map((r) => ({ ...r, scope: 'country' }));
}

async function countryMarkets(admin, country) {
  if (!admin) return null;
  try {
    const terms = [country.name, ...country.newsTerms.filter((t) => t.length >= 5)].slice(0, 3);
    const ors = terms.map((t) => `question.ilike.%${t.replace(/[,()%*]/g, ' ').trim()}%`).join(',');
    const { data } = await admin
      .from('prediction_market_index')
      .select('question, probability, platform, volume')
      .or(ors)
      .order('volume', { ascending: false, nullsFirst: false })
      .limit(2);
    if (!data?.length) return null;
    return data.map((r) => ({
      question: String(r.question || ''),
      probability: r.probability == null ? null : Number(r.probability),
      platform: r.platform || null,
      related: false,
    }));
  } catch (e) {
    console.error('[sonar-country] market matches failed:', e?.message);
    return null;
  }
}

/* ── dossier ────────────────────────────────────────────────────────────── */

/**
 * The dossier for a country ping. `matchEcho` is passed in by the pipeline so
 * the Echo match stays one implementation. Resolves even when every leg is
 * empty (the brief still answers); the UI renders only what came back.
 */
export async function buildCountryDossier(country, admin, { matchEcho } = {}) {
  const [oecd, empire, news, markets, echoMatches] = await Promise.all([
    buildOecd(admin, country),
    buildEmpire(country),
    countryNews(admin, country).catch(() => []),
    countryMarkets(admin, country),
    matchEcho ? matchEcho(admin, { name: country.name, ticker: null }).catch(() => null) : null,
  ]);
  return {
    kind: 'country',
    iso3: country.iso3,
    name: country.name,
    ticker: null,
    oecd,
    empire,
    newsTitle: `${country.name} Relevant News`,
    news,
    echo: (echoMatches || []).map((e) => ({
      title: e.title,
      slug: e.slug,
      publishedAt: e.publishedAt,
    })),
    matches: {
      oecd,
      empire,
      echo: echoMatches,
      markets,
      contracts: null,
      congress: null,
      sec: null,
      thirteenF: null,
      lobbying: null,
    },
  };
}

/* ── grounded evidence for the brief ────────────────────────────────────── */

function fmtVal(v, decimals, unit) {
  const pct = /%/.test(unit || '');
  return `${v.toFixed(decimals)}${pct ? '%' : ''}`;
}

const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

/**
 * Dataset snippets the synthesis cites as [S#], in the same shape the
 * retrievers emit. Built only from the dossier, so the brief cannot cite a
 * figure the cards do not show.
 */
export function countryEvidence(dossier) {
  const out = [];
  const o = dossier?.oecd;
  if (o?.headline?.length) {
    const parts = o.headline.map((h) => {
      const rank = h.peer
        ? h.peer.rank === 1
          ? `, the highest of ${h.peer.of} economies`
          : `, ${ordinal(h.peer.rank)} highest of ${h.peer.of} economies`
        : '';
      const proj = h.projection
        ? `; OECD projects ${fmtVal(h.projection.value, h.decimals, h.unit)} for ${h.projection.year}`
        : '';
      return `${h.label} ${fmtVal(h.latest.value, h.decimals, h.unit)} in ${h.latest.year}${rank}${proj}`;
    });
    out.push({
      corpus: 'oecd',
      title: `OECD Economic Outlook, ${dossier.name}`,
      snippet: `OECD Economic Outlook figures for ${dossier.name} (latest actual year per series; years from ${o.projectionFrom} on are OECD projections): ${parts.join('; ')}.`,
    });
    const story = o.storyIndex != null ? o.stories[o.storyIndex] : null;
    if (story) {
      out.push({
        corpus: 'oecd',
        title: `OECD Economic Outlook, ${dossier.name} ${story.label.toLowerCase()} history`,
        snippet: `${dossier.name} ${story.label.toLowerCase()} was ${fmtVal(story.latest.value, story.decimals, story.unit)} in ${story.latest.year}, against a ${story.normYears}-year median of ${fmtVal(story.median, story.decimals, story.unit)} (${Math.abs(story.z).toFixed(1)} standard deviations ${story.z >= 0 ? 'above' : 'below'}). Since ${CHART_FROM} it peaked at ${fmtVal(story.peak.value, story.decimals, story.unit)} in ${story.peak.year} and bottomed at ${fmtVal(story.trough.value, story.decimals, story.unit)} in ${story.trough.year}.`,
      });
    }
  }
  const e = dossier?.empire;
  if (e) {
    const head = e.rank
      ? `${dossier.name} ranks ${ordinal(e.rank)} of ${e.of} countries on Ezana's Global Empire Rankings composite (${e.year} scores, score ${e.composite} of 100, ${e.coverage.present} of ${e.coverage.total} live dimensions).`
      : `${dossier.name} carries ${e.coverage.present} of ${e.coverage.total} live dimensions on Ezana's Global Empire Rankings (${e.year} scores), too few for a composite rank.`;
    /* The same three dimensions the card shows: where it ranks highest. */
    const top = (e.top || [])
      .map((d) => `${d.name}, ${ordinal(d.rank)} of ${d.of} (score ${d.score})`)
      .join('; ');
    out.push({
      corpus: 'empire',
      title: `Global Empire Rankings, ${dossier.name}`,
      snippet: `${head}${top ? ` Ranks highest in: ${top}.` : ''} Weakest: ${e.weakest.join(', ')}.`,
    });
  }
  return out;
}

/** System-prompt addendum for a country ping. */
export const COUNTRY_ADDENDUM = `
This ping is about a country. Snippets marked (oecd) are OECD Economic Outlook series held by Ezana; any figure for ${PROJECTION_FROM_YEAR} or later is an OECD projection and must be called a projection, never an outcome. Snippets marked (empire) are Ezana's own Global Empire Rankings; call it Ezana's ranking, never an official one. Paragraph two leads with these figures, cited. Use web search for current policy, central bank and political developments the snippets do not cover.`;
