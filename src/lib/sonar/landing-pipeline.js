import crypto from 'crypto';
import { getSonarEntitlements, SONAR_DATASETS } from '@/lib/sonar/entitlements';
import {
  corporaForDatasets,
  depthBudget,
  classifyQuery,
  CORPUS_TO_DATASET,
} from '@/lib/sonar/retrieval';
import { orchestrate } from '@/lib/research-copilot/orchestrate';
import { synthesizeWithFallback } from '@/lib/sonar/llm-providers';
import { getFmpKey } from '@/lib/fmp/upcoming-events';
import { understandQuery } from '@/lib/sonar/understand';
import { TICKER_BLOCKLIST } from '@/lib/sonar/understand/blocklist';
import { gateMarkets, gateNews, subjectTerms } from '@/lib/sonar/relevance';
import { analyticalIntent } from '@/lib/sonar/insight/intent';
import { gateCountryNews } from '@/lib/sonar/insight/relevance';
import { passesCountryIntentGuard } from '@/lib/sonar/guards';
import { extractIntents, ipoSubject, resolveQuery } from '@/lib/sonar/resolveQuery';
import ipoEvents from '@/lib/sonar/sources/ipo-events';
import { enforceGrounding, GROUNDING_RULES } from '@/lib/sonar/groundingGuard';
import { rankSourcedMatches } from '@/lib/sonar/rankSourcedMatches';
import {
  getIndustryRegistry,
  getIndustryRegistryCached,
  industryBasket,
} from '@/lib/sonar/industries';
import {
  basket13f,
  basketCongress,
  buildIndustryDossier,
  industryEvidence,
} from '@/lib/sonar/landing-industry';
import { getMacroRankings } from '@/lib/sonar/macro/store';
import { countryRankView, SCOPE_NOTE, WB_ATTRIBUTION } from '@/lib/sonar/macro/rank';
import {
  RANK_SECTIONS,
  deterministicBrief,
  rankFacts,
  rankFollowups,
  rankLede,
  unsupportedNumbers,
} from '@/lib/sonar/macro/brief';
import { REGIONS as NEWS_REGIONS } from '@/lib/services/massive-news';
import { industryProfile, industryNewsTitle, fetchIndustryNews } from '@/lib/sonar/industry-news';
import {
  resolvePolitician,
  resolvePoliticianById,
  buildPoliticianDossier,
  politicianEvidence,
} from '@/lib/sonar/landing-politician';
import { buildSectorScreen, sectorEvidence, sectorUniverse } from '@/lib/sonar/sector-screen';
import { DOMAINS } from '@/lib/sonar/engine/domains';
import { issueBucketsFor, issueTextFor } from '@/lib/sonar/engine/planner';
import { topicForText } from '@/lib/lobbying/topics';
import {
  resolveCountry,
  mentionedCountry,
  countryByIso3,
  buildCountryDossier,
  countryEvidence,
  countryEntityTerms,
  COUNTRY_ADDENDUM,
} from '@/lib/sonar/landing-country';
import {
  detectIntent,
  sanctionsContext,
  splitExposed,
  columnSpecs,
  buildNewsColumns,
  newsEvidence,
} from '@/lib/sonar/landing-research';
import { analystEvidence } from '@/lib/sonar/analyst-evidence';
import { detectGovExposure, fetchRevenueMix, exposureEvidence } from '@/lib/sonar/revenue-mix';
import {
  detectFlowsPing,
  buildFlowsDossier,
  flowsEvidence,
  FLOWS_ADDENDUM,
  flowsBrief,
} from '@/lib/sonar/landing-flows';
import {
  detectCongressActivityPing,
  buildCongressActivityDossier,
  congressActivityEvidence,
  congressActivityBrief,
  CONGRESS_ACTIVITY_ADDENDUM,
} from '@/lib/sonar/landing-congress-activity';
import { mentionedCompany } from '@/lib/sonar/company-mentions';
import { routeMacro, isMacroRelevant } from '@/lib/sonar/macro/route';
import countries from 'i18n-iso-countries';
import {
  MACRO_LENS,
  FRAMEWORKS,
  frameworkPrompt,
  PRESSURE_LABEL,
} from '@/lib/sonar/macro/playbook';
import { buildCountryIntel, frameworksFor } from '@/lib/sonar/macro/intel';
import {
  intelSystemPrompt,
  parseIntelBrief,
  validateIntelBrief,
  intelBriefText,
  fallbackIntelBrief,
  assessmentRows,
} from '@/lib/sonar/macro/intel-brief';
import { directionLine } from '@/lib/sonar/macro/currency';
import { buildResearchSpec } from '@/lib/sonar/engine/research-spec';
import { classifyCore } from '@/lib/sonar/research-mode-core';
import { routeAnalysts } from '@/lib/sonar/analysts/analyst-router';
import { ANALYSTS } from '@/lib/sonar/analysts/registry';
import { loadSkill } from '@/lib/sonar/analysts/skills';
import { auditLanding } from '@/lib/sonar/analysts/audit';
import { CURRENCY_OF } from '@/lib/sonar/macro/currencies';
import { BoundedMap } from '@/lib/bounded-map';
import { withTimeout } from '@/lib/with-timeout';
import { usd } from '@/lib/research-copilot/retrievers/shared';
/* Echo matches and the market snapshot live in landing-sources.js so the
   research engine's sources can use them without importing this pipeline
   (Nov 2026, no import cycle). Re-exported for existing callers. */
import { matchEcho, marketSnapshot } from '@/lib/sonar/landing-sources';

export { matchEcho, marketSnapshot };
import { canonicalPing } from '@/lib/sonar/canonical-ping';
import { cacheGet, cacheSet, hasCacheClient, setCacheClient } from '@/lib/sonar/engine/cache';
import { compactMetrics } from '@/lib/sonar/macro/fx-findings';

/**
 * The landing-page Sonar pipeline, shared by the two routes that run it:
 * POST /api/sonar/landing-query (a guest ping, with quota, cookie and ledger)
 * and GET /api/landing/demo-ping (the cached Lockheed Martin demo, with none
 * of those). Everything a ping produces lives here so the two cannot drift;
 * the routes own only their own concerns.
 *
 * A run produces:
 *   answer       the synthesized briefing, or null if synthesis failed
 *   grounded     true when the answer is built from retrieved sources
 *   sources      the dataset manifest, marked used/searched
 *   relevance    per-taxonomy-dimension 0..1, what the orbital map orbits on
 *   dossier      resolved company detail, or null when nothing resolved
 */

const FMP_STABLE = 'https://financialmodelingprep.com/stable';
/* The legacy v3 API, same key. Every dossier leg falls back to it, so a
   /stable/ path this plan does not serve degrades one field instead of the
   whole card. */
const FMP_V3 = 'https://financialmodelingprep.com/api/v3';
const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
/* The research brief runs on a stronger model than the old 480-token Haiku
   summary: it reads more snippets, searches the web more and writes a longer,
   denser brief. SONAR_LANDING_MODEL overrides it; a model the key cannot use
   400s and anthropicSynthesize retries once on Haiku. */
const BRIEF_MODEL = process.env.SONAR_LANDING_MODEL || 'claude-sonnet-4-5';
const BRIEF_TOKENS = 1100;
const BRIEF_WEB_USES = 5;

export const DISCLAIMER =
  'Sonar synthesizes sourced research from Ezana datasets. Findings only, never financial advice.';

/* Oct 26: briefs were telling visitors to "watch the October 2026
   presidential election" after it had happened, and attributing facts to
   Reuters and Bloomberg on runs where no web search ran. Every brief now
   gets today's date in the ping and these two rule blocks. */
const DATE_RULES = `
Dates: today's date is the first line of the ping. Anything dated before today has already happened. Never describe a past election, vote, meeting, data release or deadline as upcoming, and never tell the reader to watch an event that has passed. If a past event's outcome is not in the sources, say it has taken place and never guess its result. A projection for a year that is already over is history, not a forecast.`;

/* Oct 30 (v2): no longer tells the model web search is off. Briefs were
   passing that on to the reader ("this is general background", "web search
   did not run"), which says nothing about the subject. */
const NO_WEB_RULES = `
Use only the sources below. Never attribute a fact to an outlet, agency or report you did not read here (no "per Reuters", no "according to Bloomberg") unless a (news) snippet names it. Never let anything you add contradict the sources.`;

/* Nov 6 (A6): the freshest data wins. A Turkey brief led with OECD's 2023
   inflation while the sources held IMF CPI for September 2026, and said the
   data did not cover currency pressure while BIS exchange rates sat in the
   prompt. Every grounded prompt carries this block. */
export const FRESHEST_RULES = `
Freshest data: when sources give the same measure for different periods, lead with the most recent observed figure. Mention older figures only with their year, and only when the comparison helps. Never present a projection as current when a later observed figure exists. Never say the data does not cover a topic when evidence for it is in the sources.`;

/** Today in Toronto (the brief's reader), long form: "Monday, October 26, 2026". */
function todayLine() {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Toronto',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());
}

/* The same switch anthropicSynthesize reads: without it no search runs. */
const webSearchOn = () => process.env.SONAR_WEB_SEARCH === 'true';

const GROUNDED_SYSTEM_PROMPT = `You are Ezana Sonar, a research analyst answering a ping. You have two kinds of evidence: numbered dataset snippets from Ezana's proprietary datasets (congressional trades, government contracts, SEC and 13F filings, lobbying, the OFAC sanctions list, official macro and commodity statistics marked (macro), prediction markets, Echo editorial), and live web search.
Rules:
- A (macro) snippet is an official statistic held by Ezana (IMF, World Bank, BIS, central banks, JODI, EIA, the World Bank Pink Sheet, risk indices). Give every figure its period as the snippet states it, cite it, and keep a projection a projection. Compare two figures only when their periods match, or say that they differ.
- Ezana's datasets come first. Build the brief around every snippet that is genuinely about the subject and cite its marker inline, e.g. [S1]. Never cite a snippet about a different entity.
- Then go beyond the datasets: search the web for current facts, recent events, figures and context the snippets do not cover, and weave them in. Name the outlet or source for web facts in passing ("per Reuters").
- Answer the question the visitor actually asked. Lead with the direct answer, then the evidence, then what it means.
- Never ask the visitor a question, ask them to rephrase, or offer to help: answer the likeliest reading of the ping.
- Findings only. No financial or investment advice of your own: no price target, rating or buy/sell/hold call in Ezana's voice. Reporting a named firm's published rating or price target from a snippet, attributed to that firm or to analyst consensus, is a finding. No fabricated figures: a number comes from a snippet or a web result, or it does not appear.
- Four short paragraphs separated by blank lines: (1) direct answer, (2) what Ezana's datasets show, cited, (3) what the web adds: recent events and figures, (4) cross-signals and what to watch. Each paragraph 50 to 90 words. No headers, no lists, no em dashes.`;

/* The no-snippet path: the datasets returned nothing about the subject, so
   the brief is web research. It says so in one clause, never invents a
   dataset citation, and still has to be substantive. */
const GENERAL_SYSTEM_PROMPT = `You are Ezana Sonar, a research analyst answering a ping. Your evidence is live web search.
Rules:
- Search the web thoroughly and answer the question the visitor actually asked, leading with what is true and current. Give real substance: names, dates, figures, outlets.
- Write only about the subject. Never mention Ezana's datasets, what they cover, or how the research was done.
- Never invent dataset citations. Do not use [S1] style markers: there are no snippets to cite.
- No fabricated figures, dates or names. A number either comes from a web result or does not appear.
- Findings only. No financial or investment advice, price targets, or buy/sell/hold language.
- Four short paragraphs separated by blank lines: (1) direct answer, (2) the strongest specifics, (3) recent developments, (4) what to watch. Each paragraph 50 to 90 words. No headers, no lists, no em dashes.`;

/* Oct 30 (v2): the 6-second ping. No live web search fits in six seconds,
   so the brief's internet evidence is what the pipeline fetched itself:
   live market data and the listing record for a resolved company (market),
   the IPO filings source (ipo) and recent headlines from Ezana's news feed
   (news). Three shorter paragraphs, so a fast model finishes in time. */
const FAST_GROUNDED_PROMPT = `You are Ezana Sonar, a research analyst answering a ping. Your evidence is the numbered snippets below: Ezana's datasets (congressional trades, government contracts, SEC and IPO filings, 13F holdings, lobbying, the OFAC sanctions list, prediction markets, Echo editorial), live market data marked (market), published analyst ratings and price targets marked (analysts), and recent headlines from Ezana's news feed marked (news). The (market), (analysts) and (news) snippets are current as of today. Snippets marked (macro) are official statistics (IMF, World Bank, BIS, central banks, JODI, EIA, the World Bank Pink Sheet, risk indices), each with its own period.
Rules:
- Give every (macro) figure the period the snippet states, and keep a projection a projection. Compare two figures only when their periods match, or say that they differ.
- Answer the question the visitor actually asked. Lead with the direct answer, then the evidence, then what it means.
- Cite every fact inline with its snippet marker, e.g. [S1]. Never cite a snippet about a different entity.
- Write only about the subject. Never comment on what the snippets, datasets or searches contain or lack, and never mention web search. If the snippets answer only part of the question, answer that part.
- Never ask the visitor a question, ask them to rephrase, or offer to help. Read the ping the most useful way (the visitor's own words are given) and answer it; if it is ambiguous, answer the likeliest reading.
- Findings only. No financial or investment advice of your own: no price target, rating or buy/sell/hold call in Ezana's voice. Reporting a named firm's published rating or price target from an (analysts) snippet, attributed to that firm or to analyst consensus, is a finding. No fabricated figures: a number comes from a snippet or it does not appear.
- Three short paragraphs separated by blank lines: (1) direct answer, (2) the evidence, cited, (3) what it means and what to watch. Each paragraph 40 to 70 words. No headers, no lists, no em dashes.`;

/* No snippet at all, and no web: established background, dated. */
const FAST_GENERAL_PROMPT = `You are Ezana Sonar, a research analyst answering a ping. Answer the question the visitor asked from established background knowledge.
Rules:
- Lead with the direct answer, then the key specifics, then what to watch.
- Never ask the visitor a question, ask them to rephrase, or offer to help: answer the likeliest reading of the ping.
- Your knowledge may be out of date. Give the year a time-sensitive fact dates from ("as of 2025"), and never state whether a recent event happened or did not happen.
- Write only about the subject. Never mention Ezana's datasets, sources, coverage or web search.
- No fabricated figures, dates or names. Findings only. No financial or investment advice, price targets, or buy/sell/hold language.
- Three short paragraphs separated by blank lines, each 40 to 70 words. No headers, no lists, no em dashes.`;

/* Nov 3: appended for a ping about one listed company ("aapl"). The brief
   breaks down how the stock is moving and what named analysts expect, then
   what Ezana's datasets add. Headlines are context for a move, never a list:
   a brief that read "Headline: ..." three times told the visitor nothing. */
const COMPANY_ADDENDUM = `
This ping is about one listed company. Write exactly three paragraphs:
(1) Market moves: how the stock is trading, from the (market) snippets only: last price and the day's move, the change over 1 month, 3 months, year to date and 1 year, where the price sits in its 52-week range, and market cap. Say what the moves add up to (a rally, a pullback, range-bound).
(2) What analysts expect: from the (analysts) snippets, the consensus price target with its high and low and what it implies against the last price, how the ratings split, and the latest rating actions, each named with its firm ("Morgan Stanley maintained Overweight"). These are the firms' published views: always attribute them, never present a target or rating as Ezana's own, and never tell the reader to buy, sell or hold.
(3) What Ezana's datasets show and what to watch: congressional trades, institutional holders, government contracts and lobbying from the dataset snippets, then the next catalysts.
Use (news) snippets only to explain a move or an analyst action, cited inline; never list headlines and never quote a headline in full. Leave out a paragraph that has no snippets.`;

/* Nov 4 (v2): a company ping that asks how dependent it is on government
   money ("How dependent is Palantir on government spending? Examine its
   federal contract history..."). Replaces COMPANY_ADDENDUM: the answer
   leads, price and analysts become context. */
const GOV_EXPOSURE_ADDENDUM = `
This ping asks how dependent one listed company is on government spending. Write exactly three paragraphs:
(1) The answer: open with the company's name and ticker, then the government share of revenue from the (exposure) snippets for the latest quarter and the trailing four quarters, how it compares with a year earlier, and whether government or commercial revenue is growing faster. Say plainly whether the company is becoming more or less dependent on government customers.
(2) Federal contracts from the (contracts) snippets: obligations by fiscal year and the largest awarding agencies, naming the subsidiaries the awards went to, and the largest awards with their ceilings where given. Obligations are money committed on awards, not revenue, and a ceiling is not guaranteed revenue: say so in a clause. Never add obligations and ceilings together.
(3) What to watch and the limits: congressional trading from the (congress) snippets in one sentence, then the risks the snippets support (budget and procurement, agency concentration, renewals). Mention price or analyst views in at most one sentence.
Keep customer type (government vs commercial revenue) separate from geography (U.S. vs international). Never state a figure the snippets do not give.`;

/* Nov 4: a ping about a member of Congress ("What has Nancy Pelosi been
   buying lately?"). The brief answers from the member's own disclosures;
   before this the ping fell to a general briefing that stated stale facts
   about the member from memory. */
const POLITICIAN_ADDENDUM = `
This ping is about one member of Congress. Answer from the (congress) snippets, which are the member's STOCK Act disclosures in Ezana's datasets. Write up to three short paragraphs:
(1) What they have been buying and selling: the latest disclosed purchases and sales by ticker with dates and the disclosed ranges, largest first, and the overall pattern (sectors, repeat buys).
(2) The estimated open portfolio and its largest positions, labelled as Ezana's estimate from filed ranges at their midpoints, with committee seats and any trades in sectors those committees oversee.
(3) Members who trade similarly, and what to watch, using (news) snippets only to add context, cited inline.
Disclosures report ranges, never exact amounts: write "between $500K and $1M" or "a $500K to $1M purchase", never a single figure. State no biography, office, role, retirement or election fact unless a snippet gives it. Never suggest a trade shows intent or inside knowledge, and never tell the reader to copy a trade.`;

/* Nov 4: a sector screen ("Which defense stocks are members of Congress
   trading?"). The brief answers from the screen's tables, in the order the
   ping asked. */
/* Nov 4: a lobbying question ("Who is lobbying hardest on AI regulation?").
   The brief answers from the disclosures: clients ranked by disclosed spend
   on the matching filings, the period, and what the figure does and does
   not measure. */
const LOBBYING_ADDENDUM = `
This ping is about lobbying. Answer from the (lobbying) snippets, which are Senate LDA lobbying disclosures in Ezana's datasets:
- Lead with who reported the most lobbying on the matching filings, by name, with the disclosed amount, the number of filings and the period. Say whether each is a company or a trade association when the name makes it clear.
- Say what the ranking covers exactly as the snippet states it (the issue area or topic it matched).
- A filing's amount is the client's total lobbying spend reported on that filing across every issue it lists; never present it as spend on one issue alone.
- Then what to watch, using (news) snippets only for context, cited inline.
Never suggest that lobbying shows improper influence or wrongdoing.`;

const SECTOR_ADDENDUM = `
This ping is about a sector, read through Ezana's datasets. Answer the question as asked, from the snippets, leading with what it asks about:
- (congress) snippets: which of the sector's stocks members of Congress traded most in the last 12 months, purchases against sales, the most active members by name and party, and the latest trades with their disclosed ranges.
- (market) snippets: the best and weakest performers year to date with 1-year and 1-month moves.
- (contracts) snippets: the companies with the largest federal contract obligations by fiscal year; say when a fiscal year is still being synced.
Write two or three short paragraphs. Never present one company as the subject. Disclosures report ranges, never exact amounts. Never suggest a trade shows intent or inside knowledge, and never tell the reader to buy, sell or copy a trade.`;

/* Appended for an IPO ping (Oct 30). */
const IPO_ADDENDUM = `
This ping is about an IPO. Snippets marked (ipo) are IPO filing records: offer price, shares offered, proceeds, valuation, exchange, ticker and first trade date. Lead with them and cite them. A value written with "about" is derived from the record's own numbers; say "about". A (market) snippet that shows the stock trading, with its listing date, means the company is public: say when it listed and how it trades now. Without an (ipo) or (market) snippet, do not say whether the company has gone public unless a (news) snippet or a web result reports it.`;

/* Recent-event pings (IPO, M&A, earnings, elections, appointments, deaths,
   launches) can postdate any model's training, so they search a little more. */
const RECENT_WEB_USES = BRIEF_WEB_USES + 2;

/* Nov 3: a company ping about sanctions or export controls ("How exposed is
   Nvidia to China export controls?"). The brief answers the exposure
   question itself, with the country as context, instead of describing the
   sanctions list in general. */
function exposureAddendum(company, country) {
  const where = country ? ` involving ${country}` : '';
  return `
This ping asks how exposed ${company} is to US sanctions and export controls${where}. Answer that directly, in three paragraphs:
(1) The direct answer: what the snippets show about ${company}'s ties${country ? ` to ${country}` : ''} (revenue by region, operations, the export rules reported in (news) snippets) and how the stock trades now.
(2) ${country ? `${country} on the US sanctions list` : 'The US sanctions list'}: what the (sanctions) snippets show. Say plainly that the SDN list is Treasury's sanctions list and that chip export controls sit on the Commerce Department's Entity List, a separate list.
(3) What analysts say, attributed to their firms, and what to watch next.`;
}

/* Appended for a sanctions ping. The JSON is stripped from the brief and
   drawn as the exposure table; splitExposed drops malformed rows. */
const SANCTIONS_ADDENDUM = `
This ping is about sanctions. The [S#] snippets marked (sanctions) are Ezana's copy of the US Treasury OFAC SDN list; use them for which jurisdictions and programs carry the most listings. Use web search for which companies are exposed (revenue, operations or supply chains in sanctioned jurisdictions, or named in enforcement).
After the brief, append on its own line a JSON array inside <exposed></exposed> tags, up to 8 companies a web result names as exposed, most exposed first: [{"company":"Name","ticker":"TICK or null","exposure":"high|medium|low","why":"one clause, under 20 words"}]. Only companies a search result supports. If none, write <exposed>[]</exposed>.`;

/* Dataset to taxonomy dimension. SONAR_DATASETS entries carry {id,label,source}
   and no dimension, so the mapping is stated here against DATASET_TAXONOMY's
   own blurbs: Capitol Watch covers "congressional trading, committee power,
   campaign money, lobbying, and the federal contracts that political influence
   moves"; Titans Shadow covers "institutional and corporate-insider filings";
   The Hive covers "prediction-market odds".
   Echo is deliberately absent. It is Ezana's editorial layer ACROSS the seven
   dimensions rather than one of them, and assigning it to a dimension would
   invent a signal the retrieval never produced. */
const DATASET_DIMENSION = {
  congress: 'capitol',
  'gov-contracts': 'capitol',
  lobbying: 'capitol',
  '13f': 'titans',
  'sec-filings': 'titans',
  'prediction-markets': 'hive',
};

const ALL_DIMENSIONS = [
  'capitol',
  'titans',
  'eyes',
  'whispers',
  'hive',
  'lighthouse',
  'regulatory',
];

/* Floors, so the map never collapses to the hub: a dimension whose datasets
   were searched and came back empty still sits further out than one that was
   never entitled to be searched at all. */
const FLOOR_SEARCHED = 0.15;
const FLOOR_UNSEARCHED = 0.1;
const FLOOR_UNGROUNDED = 0.12;

/* Name resolutions are stable for a company's lifetime, so a day is a
   conservative stamp. Module level, which on a serverless runtime means per
   warm instance: a cache miss costs one cheap search call, never a wrong
   answer. */
const RESOLVE_TTL_MS = 24 * 60 * 60 * 1000;
/* Oct 30: a miss used to be cached for the same day as a hit, so a company
   that listed after its first failed lookup (a new IPO) stayed unresolvable
   for 24 hours on that instance. A miss now expires in 10 minutes. */
const RESOLVE_MISS_TTL_MS = 10 * 60 * 1000;
const resolveCache = new BoundedMap(1000);

/* Companies the name-search endpoints do not know by the name people use
   (the listing is newer than their name index, or the brand is not the
   legal name). Oct 30 (v2): matched as whole words ANYWHERE in the ping and
   tried BEFORE the name search. Tried after it, "spacex" went to the name
   search first, which answered with the "SpaceXAI Lab Ecosystem ETF"
   (XAIW), and the brief described that fund instead of SpaceX. The ticker
   is still checked against the profile endpoint, so an alias can never
   resolve to a symbol that does not trade. */
const COMPANY_ALIASES = [
  {
    re: /(^|[^\p{L}\p{N}])(?:space\s?x|space exploration technologies)(?=[^\p{L}\p{N}]|$)/iu,
    ticker: 'SPCX',
    surface: 'SpaceX',
  },
];

/** The aliased company a ping names, or null. */
export function aliasedCompany(text) {
  const t = String(text || '');
  return COMPANY_ALIASES.find((a) => a.re.test(t)) || null;
}

/** Resolve an aliased company, keeping the name people use as `alias`. */
async function resolveAlias(alias) {
  const hit = await resolveCompany(`$${alias.ticker}`);
  return hit ? { ...hit, alias: alias.surface } : null;
}

/**
 * Resolve the company an IPO ping is about.
 * @param {string} subject  the ping with the question framing stripped
 * @param {string} [raw]    the whole ping, searched for an alias first
 */
export async function resolveIpoCompany(subject, raw = '') {
  const s = String(subject || '').trim();
  const alias = aliasedCompany(raw) || aliasedCompany(s);
  if (alias) {
    const hit = await resolveAlias(alias);
    if (hit) return hit;
  }
  if (!s) return null;
  return resolveCompany(s);
}

/* A bare all-caps token is a ticker only when it is not geography or a
   common acronym: "…industry in the USA" used to take the ticker branch and
   resolve to Liberty All-Star Equity Fund (USA). A $-cued token always is. */
const bareTickers = (query) =>
  (String(query).match(/\b[A-Z]{2,5}\b/g) || []).filter((t) => !TICKER_BLOCKLIST.has(t));

function looksLikeTicker(query) {
  return /\$[A-Za-z]{1,5}\b/.test(query) || bareTickers(query).length > 0;
}

async function fetchJson(url, ms = 4000) {
  const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(ms) });
  if (!res.ok) return null;
  return res.json();
}

/**
 * Same fetch, but it reports the status. A leg that comes back empty tells you
 * nothing on its own: 200-with-no-rows (wrong symbol) and 403 (plan does not
 * cover this path) look identical downstream, and that ambiguity is what made
 * the empty dossier hard to pin down. Every leg now records its code.
 */
async function fetchWithStatus(url, ms = 4000) {
  try {
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(ms) });
    const status = res.status;
    if (!res.ok) return { status, data: null };
    return { status, data: await res.json() };
  } catch (e) {
    return { status: e?.name === 'TimeoutError' ? 'timeout' : 'neterr', data: null };
  }
}

/** First non-empty response across a chain of URLs, with the status of each. */
async function firstOf(urls, pick, ms = 4000) {
  const codes = [];
  for (const { id, url } of urls) {
    if (!url) continue;
    const { status, data } = await fetchWithStatus(url, ms);
    const value = data == null ? null : pick(data);
    codes.push(`${id}:${status}${value ? '' : ':empty'}`);
    if (value) return { value, codes };
  }
  return { value: null, codes };
}

function tickerToken(query) {
  const dollar = String(query).match(/\$([A-Za-z]{1,5})\b/);
  if (dollar) return dollar[1].toUpperCase();
  return bareTickers(query)[0] || null;
}

/**
 * Resolution has to work from either end, because both arrive: a visitor
 * types "lockheed martin" and every ticker-keyed retriever needs a ticker, or
 * they type "LMT" and the dossier needs a company name.
 *
 * Each direction tries more than one upstream, and that is deliberate rather
 * than defensive padding. No search or profile endpoint is used anywhere else
 * in this repo, so none of them is proven against this FMP plan, and the
 * sandbox this was written in cannot reach FMP at all to find out. Trying the
 * documented paths in order and falling back to Finnhub, which the city-news
 * route already calls server-side with the same pattern, means resolution
 * works on whichever one the plan actually answers instead of on a guess. The
 * log line names the winner, so production tells us which it is.
 */
/**
 * Pick the US primary listing out of a search result set.
 *
 * This is the whole reason the dossier was empty. FMP's name search returned
 * LMT.BA, the Buenos Aires cross-listing, as its first match for "Lockheed
 * Martin", and every dossier leg then queried a symbol the quote, ratios and
 * price-history endpoints have nothing useful for: fund=false spark=0 news=0.
 * The /stable/ paths were never the problem; the ticker was.
 *
 * A suffixed symbol (LMT.BA, LMT.MX) is a foreign listing by FMP's
 * convention, so an unsuffixed match wins. Exchange is the tiebreak where the
 * payload carries one.
 */
const US_EXCHANGES = new Set(['NASDAQ', 'NYSE', 'AMEX', 'NYSEARCA', 'BATS', 'OTC']);

/* Oct 30 (v2): a fund is never the answer to a company ping. "spacex"
   resolved to the SpaceXAI Lab Ecosystem ETF because nothing here told a
   fund from a company. A fund wins only when the ping asks for one. */
const FUND_NAME_RE =
  /\b(?:etf|etn|etp|fund|ishares|spdr|proshares|direxion|leveraged|inverse|2x|3x)\b/i;
const FUND_ASK_RE = /\b(?:etf|etfs|etn|etp|fund|funds)\b/i;
const isFund = (r) =>
  FUND_NAME_RE.test(String(r.name || r.companyName || '')) ||
  /^(?:etf|etp|fund|mutual fund)$/i.test(String(r.type || ''));

function pickUsListing(rows, query = '') {
  const list = Array.isArray(rows)
    ? rows.filter((r) => r?.symbol && (r.name || r.companyName))
    : [];
  if (!list.length) return null;
  const wantsFund = FUND_ASK_RE.test(String(query));
  const words = String(query)
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 3);
  const score = (r) => {
    const sym = String(r.symbol).toUpperCase();
    const ex = String(r.exchangeShortName || r.exchange || '').toUpperCase();
    const name = String(r.name || r.companyName).toLowerCase();
    let n = 0;
    if (!sym.includes('.')) n += 2;
    if (US_EXCHANGES.has(ex)) n += 1;
    /* A whole query word in the name ("lockheed" in "Lockheed Martin
       Corporation"); "spacex" is not a whole word of "SpaceXAI ...". */
    if (
      words.some((w) => new RegExp(`(^|[^\\p{L}\\p{N}])${w}(?=[^\\p{L}\\p{N}]|$)`, 'u').test(name))
    ) {
      n += 1;
    }
    if (!wantsFund && isFund(r)) n -= 4;
    return n;
  };
  const best = list.reduce((a, b) => (score(b) > score(a) ? b : a), list[0]);
  if (!wantsFund && isFund(best)) return null;
  return {
    ticker: String(best.symbol).toUpperCase(),
    name: String(best.name || best.companyName),
  };
}

/* limit=10, not 1: picking the right listing needs more than one candidate. */
const NAME_LOOKUPS = [
  {
    id: 'fmp/search-name',
    url: (q, k) => `${FMP_STABLE}/search-name?query=${encodeURIComponent(q)}&limit=10&apikey=${k}`,
    pick: (d) => d,
    map: (d, q) => pickUsListing(d, q),
  },
  {
    id: 'fmp/search-symbol',
    url: (q, k) =>
      `${FMP_STABLE}/search-symbol?query=${encodeURIComponent(q)}&limit=10&apikey=${k}`,
    pick: (d) => d,
    map: (d, q) => pickUsListing(d, q),
  },
  {
    id: 'fmp-v3/search',
    url: (q, k) => `${FMP_V3}/search?query=${encodeURIComponent(q)}&limit=10&apikey=${k}`,
    pick: (d) => d,
    map: (d, q) => pickUsListing(d, q),
  },
];

const TICKER_LOOKUPS = [
  {
    id: 'fmp/profile',
    url: (t, k) => `${FMP_STABLE}/profile?symbol=${encodeURIComponent(t)}&apikey=${k}`,
    pick: (d) => (Array.isArray(d) ? d[0] : d),
    map: (r, t) => (r?.companyName ? { ticker: t, name: String(r.companyName) } : null),
  },
  {
    id: 'fmp-v3/profile',
    url: (t, k) => `${FMP_V3}/profile/${encodeURIComponent(t)}?apikey=${k}`,
    pick: (d) => (Array.isArray(d) ? d[0] : d),
    map: (r, t) => (r?.companyName ? { ticker: t, name: String(r.companyName) } : null),
  },
];

async function tryFmp(lookups, arg) {
  const key = getFmpKey();
  if (!key) return null;
  const k = encodeURIComponent(key);
  for (const lookup of lookups) {
    try {
      const data = await fetchJson(lookup.url(arg, k), pingProfile().resolveFetchMs);
      const hit = lookup.map(lookup.pick(data), arg);
      if (hit) {
        console.log('[sonar-pipeline] resolved via', lookup.id, hit);
        return hit;
      }
    } catch {
      /* try the next one */
    }
  }
  return null;
}

/** Finnhub, the one search upstream this repo already uses in production. */
async function tryFinnhub(query, ticker) {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return null;
  const k = encodeURIComponent(key);
  try {
    if (ticker) {
      const d = await fetchJson(
        `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(ticker)}&token=${k}`,
        pingProfile().resolveFetchMs,
      );
      if (d?.name) {
        console.log('[sonar-pipeline] resolved via finnhub/profile2', { ticker, name: d.name });
        return { ticker, name: String(d.name) };
      }
      return null;
    }
    const d = await fetchJson(
      `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&exchange=US&token=${k}`,
      pingProfile().resolveFetchMs,
    );
    /* Same picker as FMP, so a fund is passed over here too. */
    const hit = pickUsListing(
      (Array.isArray(d?.result) ? d.result : []).map((r) => ({
        symbol: r?.symbol,
        name: r?.description,
        type: r?.type,
      })),
      query,
    );
    if (hit) {
      console.log('[sonar-pipeline] resolved via finnhub/search', hit);
      return hit;
    }
  } catch {
    /* fail-soft */
  }
  return null;
}

/**
 * Resolve a query to { ticker, name }, from either direction. Memoized for a
 * day; any failure returns null and the raw query proceeds unchanged.
 */
export async function resolveCompany(query) {
  const q = String(query || '').trim();
  if (!q) return null;
  const key = q.toLowerCase();
  const hit = resolveCache.get(key);
  if (hit && Date.now() - hit.at < (hit.value ? RESOLVE_TTL_MS : RESOLVE_MISS_TTL_MS)) {
    return hit.value;
  }

  const ticker = looksLikeTicker(q) ? tickerToken(q) : null;
  let value = null;
  try {
    value = ticker
      ? (await tryFmp(TICKER_LOOKUPS, ticker)) || (await tryFinnhub(q, ticker))
      : (await tryFmp(NAME_LOOKUPS, q)) || (await tryFinnhub(q, null));
  } catch {
    /* fail-soft: an unreachable or rate-limited upstream must not cost a ping */
  }
  if (!value) console.log('[sonar-pipeline] no resolution', { query: q, ticker });
  resolveCache.set(key, { at: Date.now(), value });
  return value;
}

/** Counts per corpus, normalized, floored, keyed by taxonomy dimension. */
function relevanceFrom(items, corporaSearched) {
  const byDimension = {};
  for (const item of items) {
    const dataset = CORPUS_TO_DATASET[item.corpus];
    /* The OFAC aggregates are attached by intent, not retrieved, so they
       have no SONAR_DATASETS entry; they light Global Lighthouse. */
    /* The OECD and Empire figures for a country ping are attached the same
       way and are Global Lighthouse datasets (DATASET_TAXONOMY). */
    const dim =
      item.corpus === 'sanctions' ||
      item.corpus === 'oecd' ||
      item.corpus === 'empire' ||
      item.corpus === 'macro'
        ? 'lighthouse'
        : DATASET_DIMENSION[dataset];
    if (!dim) continue;
    byDimension[dim] = (byDimension[dim] || 0) + 1;
  }
  const searchedDims = new Set(
    corporaSearched.map((c) => DATASET_DIMENSION[CORPUS_TO_DATASET[c]]).filter(Boolean),
  );
  const max = Math.max(0, ...Object.values(byDimension));
  const out = {};
  for (const dim of ALL_DIMENSIONS) {
    const n = byDimension[dim] || 0;
    if (max > 0 && n > 0) out[dim] = Math.min(1, n / max);
    else out[dim] = searchedDims.has(dim) ? FLOOR_SEARCHED : FLOOR_UNSEARCHED;
  }
  return out;
}

function flatRelevance(v) {
  return Object.fromEntries(ALL_DIMENSIONS.map((d) => [d, v]));
}

/** First finite number among the candidates, so field-name drift is survivable. */
function num(...vals) {
  for (const v of vals) if (typeof v === 'number' && Number.isFinite(v)) return v;
  return null;
}

/** The fourth stat, named from whatever the ratios payload actually carries. */
function fourthStat(ratios) {
  if (!ratios) return null;
  const candidates = [
    ['Dividend yield TTM', ratios.dividendYieldTTM, 'percent'],
    ['Price / sales TTM', ratios.priceToSalesRatioTTM, 'ratio'],
    ['Return on equity TTM', ratios.returnOnEquityTTM, 'percent'],
    ['Current ratio TTM', ratios.currentRatioTTM, 'ratio'],
  ];
  for (const [label, value, kind] of candidates) {
    if (typeof value === 'number' && Number.isFinite(value)) return { label, value, kind };
  }
  return null;
}

/**
 * Company detail for the dossier stage. Every leg is independent, capped at 4s
 * and allowed to come back null: a dossier with a chart and no news is worth
 * more than no dossier because one upstream was slow.
 */
/* ── dossier.matches ───────────────────────────────────────────────────────
   What each dataset actually found for this ping, so a Sourced matches row can
   preview the finding rather than only name the dataset.

   Every leg is fail-soft and returns null on any error or empty result, which
   the band reads as "searched, nothing found" and renders as a dry row. No
   figure here is estimated or interpolated: a number that is not in the rows
   does not appear.
   ========================================================================= */

const FY_NOW = (() => {
  /* The US federal fiscal year starts on 1 October, so Oct to Dec belongs to
     the next one. The CURRENT fiscal year is always partial, which is the
     whole reason the year-over-year figure below refuses to use it. */
  const d = new Date();
  return d.getUTCMonth() >= 9 ? d.getUTCFullYear() + 1 : d.getUTCFullYear();
})();

const AGENCY_SHORT = (name) =>
  String(name || '')
    .replace(/^Department of (the )?/i, '')
    .replace(/\s*\(.*\)\s*$/, '')
    .trim() || 'Other';

/* "PALANTIR USG" -> "Palantir USG": the name keys are upper case. Short
   all-caps words (USG, IBM, AT) stay capitalised. */
const keyLabel = (k) =>
  String(k || '')
    .split(/\s+/)
    .map((w) => (w.length <= 3 ? w : `${w[0]}${w.slice(1).toLowerCase()}`))
    .join(' ');

/**
 * Turn FY x agency rows into the contracts match. `rows` carry fiscal_year,
 * awarding_agency, total_amount and award_count; the amounts are what
 * USAspending reports as obligated on awards dated in each fiscal year,
 * never a ceiling.
 */
export function summarizeContractRows(rows, recipient, extra = {}) {
  let total = 0;
  let awards = 0;
  const byFy = new Map();
  const byAgency = new Map();
  const byFyAgency = new Map();
  for (const r of rows) {
    const v = Number(r.total_amount) || 0;
    const c = Number(r.award_count) || 0;
    total += v;
    awards += c;
    const fy = Number(r.fiscal_year);
    const a = AGENCY_SHORT(r.awarding_agency);
    if (Number.isFinite(fy)) {
      byFy.set(fy, (byFy.get(fy) || 0) + v);
      const k = `${fy}|${a}`;
      const cur = byFyAgency.get(k) || { fy, agency: a, value: 0, awards: 0 };
      cur.value += v;
      cur.awards += c;
      byFyAgency.set(k, cur);
    }
    byAgency.set(a, (byAgency.get(a) || 0) + v);
  }
  if (!total || !byFy.size) return null;

  const series = [...byFy.entries()]
    .map(([fy, value]) => ({ fy, value }))
    .sort((x, y) => x.fy - y.fy);

  /* Complete fiscal years only. Comparing a partial current year against a
     whole one is how a quick view ends up reporting a 60% collapse that
     never happened. */
  const complete = series.filter((d) => d.fy < FY_NOW);
  const yoy =
    complete.length >= 2
      ? (() => {
          const to = complete[complete.length - 1];
          const from = complete[complete.length - 2];
          if (!from.value) return null;
          return { value: (to.value - from.value) / from.value, from: from.fy, to: to.fy };
        })()
      : null;

  const ranked = [...byAgency.entries()].sort((x, y) => y[1] - x[1]);
  const top = ranked.slice(0, 3);
  const otherValue = ranked.slice(3).reduce((sum, [, v]) => sum + v, 0);
  const agencies = top.map(([nm, v]) => ({ name: nm, value: v, share: v / total }));
  if (otherValue > 0) {
    agencies.push({ name: 'Other', value: otherValue, share: otherValue / total });
  }

  return {
    recipient,
    total,
    awards,
    avg: awards ? total / awards : null,
    yoy,
    coverage: { fromFy: series[0].fy, toFy: series[series.length - 1].fy },
    series,
    agencies,
    /* Nov 4: for the interactive Federal contracts card. Every agency, so
       its chips can filter the bars; partial current fiscal year flagged. */
    byFyAgency: [...byFyAgency.values()].sort((x, y) => x.fy - y.fy || y.value - x.value),
    agencyRanking: ranked.map(([nm, v]) => ({ name: nm, value: v, share: v / total })),
    fyNow: FY_NOW,
    measure: 'obligations',
    ...extra,
  };
}

/* The largest awards for a ticker, with the award facts the enrichment cron
   stores (ceiling, PIID, purpose, dates) when it has reached them. */
async function topAwardsFor(admin, ticker) {
  const { data } = await admin
    .from('company_contract_top_awards')
    .select(
      'generated_award_id, recipient_name, awarding_agency, award_amount, action_date, fiscal_year',
    )
    .eq('ticker', ticker)
    .order('award_amount', { ascending: false })
    .limit(15);
  if (!data?.length) return [];
  /* The facts table arrives with SQL_01; until it is applied the read fails
     and the table shows obligations only. */
  let facts = new Map();
  try {
    const { data: f, error } = await admin
      .from('company_contract_award_facts')
      .select(
        'generated_award_id, piid, description, award_type, awarding_sub_agency, total_obligation, base_exercised_options, base_and_all_options, date_signed, last_modified_date, modification_count, pop_start, pop_end, pop_potential_end',
      )
      .in(
        'generated_award_id',
        data.map((r) => r.generated_award_id),
      );
    if (!error) facts = new Map((f || []).map((r) => [r.generated_award_id, r]));
  } catch {
    /* table not created yet */
  }
  const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
  return data.map((r) => {
    const x = facts.get(r.generated_award_id) || {};
    const obligated = num(x.total_obligation) ?? num(r.award_amount);
    const ceiling = num(x.base_and_all_options);
    return {
      id: r.generated_award_id,
      recipient: r.recipient_name,
      agency: AGENCY_SHORT(r.awarding_agency),
      subAgency: x.awarding_sub_agency || null,
      purpose: x.description || null,
      piid: x.piid || null,
      awardType: x.award_type || null,
      signed: x.date_signed || null,
      lastModified: x.last_modified_date || r.action_date || null,
      modifications: num(x.modification_count),
      fy: Number(r.fiscal_year) || null,
      obligated,
      exercised: num(x.base_exercised_options),
      ceiling,
      /* Potential, never promised: the ceiling less what is obligated. */
      remainingPotential:
        ceiling != null && obligated != null ? Math.max(0, ceiling - obligated) : null,
      popEnd: x.pop_end || null,
      popPotentialEnd: x.pop_potential_end || null,
      hasFacts: Boolean(x.generated_award_id),
      url: `https://www.usaspending.gov/award/${encodeURIComponent(r.generated_award_id)}`,
    };
  });
}

async function matchContracts(admin, { name, ticker }) {
  if (!admin || (!name && !ticker)) return null;
  try {
    /* Nov 4: by ticker first. company_contract_history (weekly, from the
       BigQuery USAspending corpus) adds up every recipient name the ticker
       maps to in contractor_tickers, so a defense subsidiary counts:
       Palantir USG Inc holds most of Palantir's Pentagon awards, and the old
       two-word name prefix ("PALANTIR TECHNOLOGIES") never saw it. */
    if (ticker) {
      const t = ticker.toUpperCase();
      const [{ data: hist }, { data: keys }] = await Promise.all([
        admin
          .from('company_contract_history')
          .select('fiscal_year, awarding_agency, total_amount, award_count')
          .eq('ticker', t)
          .limit(5000),
        admin.from('contractor_tickers').select('name_key').eq('ticker', t).limit(20),
      ]);
      if (hist?.length) {
        const entities = [...new Set((keys || []).map((k) => keyLabel(k.name_key)))];
        const top = await topAwardsFor(admin, t).catch(() => []);
        const summary = summarizeContractRows(
          hist,
          entities.length ? entities.join(' and ') : name || t,
          { entities, topAwards: top, source: 'ticker' },
        );
        if (summary) return summary;
      }
    }
    if (!name) return null;
    /* Fallback for a company no ticker map covers: prefix match, not
       equality. USAspending spells one recipient several ways ("LOCKHEED
       MARTIN CORPORATION", "LOCKHEED MARTIN CORP"), and matching exactly
       splits one company into several. */
    const prefix = name
      .replace(/[%_,()]/g, ' ')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .join(' ');
    if (!prefix) return null;
    const { data } = await admin
      .from('gov_contract_recipient_rollup')
      .select('fiscal_year, recipient_name, awarding_agency, total_amount, award_count')
      .ilike('recipient_name', `${prefix}%`)
      .limit(5000);
    if (!data?.length) return null;
    return summarizeContractRows(data, data[0].recipient_name || name, {
      entities: [...new Set(data.map((r) => r.recipient_name))],
      topAwards: [],
      source: 'name',
    });
  } catch (e) {
    console.error('[sonar-pipeline] contract matches failed:', e?.message);
    return null;
  }
}

/* public.congress_trades is the live STOCK Act table (House Clerk and Senate
   eFD, one row per disclosed transaction). This used to read
   public.congressional_trades, a retired table with zero rows, which is why
   every ping's CONGRESS row rendered dry. Member names come from
   congress_members in a second keyed read. */
const TRADE_TYPE_LABEL = {
  purchase: 'Purchase',
  sale: 'Sale',
  sale_partial: 'Partial sale',
  exchange: 'Exchange',
};

async function matchCongress(admin, { ticker }) {
  if (!admin || !ticker) return null;
  try {
    const { data, error } = await admin
      .from('congress_trades')
      .select('bioguide_id, type, transaction_date')
      .eq('ticker', ticker.toUpperCase())
      .order('transaction_date', { ascending: false })
      .limit(3);
    if (error || !data?.length) return null;
    const ids = [...new Set(data.map((r) => r.bioguide_id).filter(Boolean))];
    const { data: members } = ids.length
      ? await admin.from('congress_members').select('bioguide_id, full_name').in('bioguide_id', ids)
      : { data: [] };
    const nameOf = new Map((members || []).map((m) => [m.bioguide_id, m.full_name]));
    return data.map((r) => ({
      member: String(nameOf.get(r.bioguide_id) || 'Member of Congress'),
      type: TRADE_TYPE_LABEL[r.type] || String(r.type || ''),
      date: r.transaction_date || null,
    }));
  } catch (e) {
    console.error('[sonar-pipeline] congress matches failed:', e?.message);
    return null;
  }
}

/**
 * Nov 4: every disclosed congressional trade in a ticker, compact, for the
 * interactive sentiment chart in the CONGRESS row (the browser buckets them
 * by the period the visitor picks). Disclosures report amount RANGES, so
 * dollar views use the range midpoint and say so. Purchases and sales only;
 * exchanges are counted apart and never read as sentiment.
 *   trades   [date, 'b' | 's' | 'x', min, max, memberIndex]
 *   members  [{ name, party, state, chamber }]
 */
export async function congressSeries(admin, { ticker }) {
  if (!admin || !ticker) return null;
  try {
    const { data, error } = await admin
      .from('congress_trades')
      .select('bioguide_id, type, transaction_date, amount_min, amount_max')
      .eq('ticker', ticker.toUpperCase())
      .not('transaction_date', 'is', null)
      .order('transaction_date', { ascending: true })
      .limit(1500);
    if (error || !data?.length) return null;
    const ids = [...new Set(data.map((r) => r.bioguide_id).filter(Boolean))];
    const { data: members } = ids.length
      ? await admin
          .from('congress_members')
          .select('bioguide_id, full_name, party, state, chamber')
          .in('bioguide_id', ids)
      : { data: [] };
    const byId = new Map((members || []).map((m) => [m.bioguide_id, m]));
    const index = new Map();
    const list = [];
    const idx = (id) => {
      if (!index.has(id)) {
        const m = byId.get(id) || {};
        index.set(id, list.length);
        list.push({
          name: m.full_name || 'Member of Congress',
          party: m.party || null,
          state: m.state || null,
          chamber: m.chamber || null,
        });
      }
      return index.get(id);
    };
    const side = (t) => (/^purchase/.test(t || '') ? 'b' : /^sale/.test(t || '') ? 's' : 'x');
    const num = (v) => (v == null || !Number.isFinite(Number(v)) ? null : Number(v));
    return {
      ticker: ticker.toUpperCase(),
      trades: data.map((r) => [
        String(r.transaction_date).slice(0, 10),
        side(r.type),
        num(r.amount_min),
        num(r.amount_max),
        idx(r.bioguide_id || 'unknown'),
      ]),
      members: list,
      first: String(data[0].transaction_date).slice(0, 10),
      last: String(data[data.length - 1].transaction_date).slice(0, 10),
    };
  } catch (e) {
    console.error('[sonar-pipeline] congress series failed:', e?.message);
    return null;
  }
}

/** Counts for a window of the series: the brief's sentence and the tests. */
export function congressWindow(series, { months = null, now = new Date() } = {}) {
  if (!series?.trades?.length) return null;
  const from = months
    ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, now.getUTCDate()))
        .toISOString()
        .slice(0, 10)
    : '0000';
  const rows = series.trades.filter((t) => t[0] >= from);
  const buys = rows.filter((t) => t[1] === 'b');
  const sells = rows.filter((t) => t[1] === 's');
  const members = new Set(rows.filter((t) => t[1] !== 'x').map((t) => t[4]));
  const buyers = new Set(buys.map((t) => t[4]));
  const sellers = new Set(sells.map((t) => t[4]));
  const mid = (t) => (t[2] != null && t[3] != null ? (t[2] + t[3]) / 2 : (t[2] ?? t[3] ?? 0));
  return {
    from: months ? from : series.first,
    buys: buys.length,
    sells: sells.length,
    members: members.size,
    buyers: buyers.size,
    sellers: sellers.size,
    buyMid: buys.reduce((s0, t) => s0 + mid(t), 0),
    sellMid: sells.reduce((s0, t) => s0 + mid(t), 0),
    /* Defined rule, shown in the UI: share of purchases among purchases and
       sales. At least 60% purchases reads as net buying, at most 40% as net
       selling, anything between as mixed. Fewer than 3 trades: too few. */
    lean:
      buys.length + sells.length < 3
        ? 'too few'
        : buys.length / (buys.length + sells.length) >= 0.6
          ? 'net buying'
          : buys.length / (buys.length + sells.length) <= 0.4
            ? 'net selling'
            : 'mixed',
  };
}

/* "STATE STREET CORP (STT, STT-PG)" reads as a shouted ledger line on a
   landing page. Drop the trailing ticker list and soften all-caps names;
   mixed-case names ("BlackRock, Inc.") are left exactly as filed. */
function filerLabel(raw) {
  const s = String(raw || '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim();
  if (s !== s.toUpperCase()) return s;
  return s
    .toLowerCase()
    .replace(/\b([a-z])/g, (c) => c.toUpperCase())
    .replace(/\b(Llc|Lp|Llp|Na|Fsb|Plc|Ag|Sa)\b/g, (w) => w.toUpperCase());
}

const quarterLabel = (iso) => {
  const d = String(iso || '');
  const m = Number(d.slice(5, 7));
  return m ? `Q${Math.ceil(m / 3)} ${d.slice(0, 4)}` : null;
};

async function matchSec(admin, { ticker }) {
  if (!admin || !ticker) return null;
  try {
    const { data } = await admin
      .from('sec_filings')
      .select('form_type, filer_name, filed_at')
      .eq('ticker', ticker.toUpperCase())
      .order('filed_at', { ascending: false })
      .limit(3);
    if (!data?.length) return null;
    return data.map((r) => ({
      form: String(r.form_type || ''),
      filer: String(r.filer_name || ''),
      filedAt: r.filed_at || null,
    }));
  } catch (e) {
    console.error('[sonar-pipeline] sec matches failed:', e?.message);
    return null;
  }
}

/* The largest 13F holders in the latest COMPLETE quarter, via the
   sonar_top_13f RPC (supabase/migrations/20261009120000_sonar_top_13f.sql).
   This used to read public.whale_moves, a few hundred scored moves with
   nothing for most tickers. A missing RPC (migration not yet applied) leaves
   the row dry exactly as before rather than failing the dossier. */
async function match13f(admin, { ticker }) {
  if (!admin || !ticker) return null;
  try {
    const { data, error } = await admin.rpc('sonar_top_13f', {
      p_ticker: ticker.toUpperCase(),
      p_limit: 3,
    });
    if (error) {
      console.error('[sonar-pipeline] 13f rpc failed:', error.message);
      return null;
    }
    const top = Array.isArray(data?.top) ? data.top : [];
    if (!top.length) return null;
    const quarter = quarterLabel(data.period);
    return top.map((r) => ({
      filer: filerLabel(r.filer_name),
      changeType: r.change_type || null,
      valueUsd: r.value_usd == null ? null : Number(r.value_usd),
      quarter,
    }));
  } catch (e) {
    console.error('[sonar-pipeline] 13f matches failed:', e?.message);
    return null;
  }
}

async function matchLobbying(admin, { ticker, name }) {
  if (!admin) return null;
  try {
    /* The verified ticker map first; a name prefix only as the fallback. */
    let clients = [];
    if (ticker) {
      const { data } = await admin
        .from('lobbying_client_tickers')
        .select('client_name')
        .eq('ticker', ticker.toUpperCase());
      clients = (data || []).map((r) => r.client_name).filter(Boolean);
    }
    const prefix = String(name || '')
      .replace(/[%_,()]/g, ' ')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .join(' ')
      .toUpperCase();
    if (!clients.length && !prefix) return null;

    let q = admin
      .from('lobbying_filings')
      .select('filing_year, amount, registrant_name, client_name, dt_posted');
    q = clients.length ? q.in('client_name', clients) : q.ilike('client_name', `${prefix}%`);
    const { data } = await q.order('dt_posted', { ascending: false }).limit(1000);
    if (!data?.length) return null;

    const years = data.map((r) => Number(r.filing_year)).filter(Number.isFinite);
    const byRegistrant = new Map();
    for (const r of data) {
      const k = r.registrant_name || 'Unknown';
      byRegistrant.set(k, (byRegistrant.get(k) || 0) + 1);
    }

    /* In-house spend only: filings where the registrant IS the client, for
       the latest COMPLETE calendar year. Adding outside firms' reported
       income on top would double count, and a partial year would understate. */
    let inHouse = null;
    if (prefix) {
      const nowYear = new Date().getUTCFullYear();
      const own = data.filter((r) =>
        String(r.registrant_name || '')
          .toUpperCase()
          .startsWith(prefix),
      );
      const ownYears = [...new Set(own.map((r) => Number(r.filing_year)))]
        .filter((y) => Number.isFinite(y) && y < nowYear)
        .sort((a, b) => b - a);
      if (ownYears.length) {
        const spend = own
          .filter((r) => Number(r.filing_year) === ownYears[0])
          .reduce((s, r) => s + (Number(r.amount) || 0), 0);
        if (spend > 0) inHouse = { year: ownYears[0], spend };
      }
    }

    return {
      client: String(data[0].client_name || name || ''),
      filings: data.length,
      fromYear: years.length ? Math.min(...years) : null,
      toYear: years.length ? Math.max(...years) : null,
      registrantCount: byRegistrant.size,
      registrants: [...byRegistrant.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([n]) => n),
      inHouse,
    };
  } catch (e) {
    console.error('[sonar-pipeline] lobbying matches failed:', e?.message);
    return null;
  }
}

/* Search terms only, never data. A market found through these is labelled
   "related" on the card, because it is about the company's exposure rather
   than the company. Extend per ticker as coverage grows. */
const RELATED_MARKET_TERMS = {
  LMT: ['F-35', 'defense budget', 'Pentagon'],
};

async function matchMarkets(admin, { ticker, name, understood = null }) {
  if (!admin || !name) return null;
  const run = async (terms) => {
    const ors = terms
      .map(
        (t) =>
          `question.ilike.%${String(t)
            .replace(/[,()%*]/g, ' ')
            .trim()}%`,
      )
      .join(',');
    const { data } = await admin
      .from('prediction_market_index')
      .select('question, description, category, probability, platform, volume')
      .or(ors)
      .order('volume', { ascending: false, nullsFirst: false })
      .limit(12);
    /* Relevance gate: no sports or entertainment, and the subject must
       appear in the market itself. Never padded with weak matches. */
    const gate = understood
      ? understood
      : {
          entities: [
            ticker ? { kind: 'ticker', id: ticker, label: name } : null,
            { kind: 'company', id: name, label: name },
          ].filter(Boolean),
        };
    return gateMarkets(data || [], gate).slice(0, 2);
  };
  try {
    /* The full name only. The old first-word fallback ("Liberty" from
       "Liberty All-Star Equity Fund") matched sports spreads. */
    let rows = await run(understood?.marketTerms?.length ? understood.marketTerms : [name]);
    let related = false;
    const extra = ticker ? RELATED_MARKET_TERMS[ticker.toUpperCase()] : null;
    if (!rows.length && extra) {
      rows = await run(extra);
      related = true;
    }
    if (!rows.length) return null;
    return rows.map((r) => ({
      question: String(r.question || ''),
      probability: r.probability == null ? null : Number(r.probability),
      platform: r.platform || null,
      related,
    }));
  } catch (e) {
    console.error('[sonar-pipeline] market matches failed:', e?.message);
    return null;
  }
}

export async function buildMatches({ ticker, name }, admin, understood = null) {
  const [echo, contracts, congress, sec, thirteenF, lobbying, markets] = await Promise.all([
    matchEcho(admin, { name, ticker }),
    matchContracts(admin, { name, ticker }),
    matchCongress(admin, { ticker }),
    matchSec(admin, { ticker }),
    match13f(admin, { ticker }),
    matchLobbying(admin, { ticker, name }),
    matchMarkets(admin, { ticker, name, understood }),
  ]);
  /* Nov 4: the full series for the interactive sentiment chart, only when
     the latest-trades read found any (one more query, not a second scan). */
  const congressHistory = congress?.length
    ? await congressSeries(admin, { ticker }).catch(() => null)
    : null;
  return {
    echo,
    contracts,
    congress,
    congressSeries: congressHistory,
    sec,
    thirteenF,
    lobbying,
    markets,
  };
}

export async function buildDossier({ ticker, name }, admin) {
  const apikey = getFmpKey();
  const sym = encodeURIComponent(ticker);
  const finnhubKey = process.env.FINNHUB_API_KEY || '';
  const today = new Date();
  const from = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const to = today.toISOString().slice(0, 10);

  /* Year to date, not a rolling 60 rows: the chart is labelled YTD, so the
     window has to be the actual year rather than whatever 60 trading days
     happens to cover. */
  const ytdFrom = `${today.getUTCFullYear()}-01-01`;

  const k = encodeURIComponent(apikey);
  const u = (path) => (apikey ? { id: path.split('?')[0].split('/').pop(), url: path } : {});

  /* Every leg is a chain: the /stable/ path first, then the legacy v3 path on
     the same key. A plan that does not serve one of them loses a field, not
     the card. Each chain reports the status of every attempt, so the next
     empty dossier says WHY: 403 means the plan, 200:empty means the symbol. */
  const legs = await Promise.all([
    firstOf(
      [u(`${FMP_STABLE}/quote?symbol=${sym}&apikey=${k}`), u(`${FMP_V3}/quote/${sym}?apikey=${k}`)],
      (d) => (Array.isArray(d) ? d[0] : d) || null,
    ),
    firstOf(
      [
        u(`${FMP_STABLE}/ratios-ttm?symbol=${sym}&apikey=${k}`),
        u(`${FMP_V3}/ratios-ttm/${sym}?apikey=${k}`),
        u(`${FMP_V3}/key-metrics-ttm/${sym}?apikey=${k}`),
      ],
      (d) => (Array.isArray(d) ? d[0] : d) || null,
    ),
    firstOf(
      [
        u(
          `${FMP_STABLE}/historical-price-eod/light?symbol=${sym}&from=${ytdFrom}&to=${to}&apikey=${k}`,
        ),
        u(`${FMP_V3}/historical-price-full/${sym}?from=${ytdFrom}&serietype=line&apikey=${k}`),
      ],
      (d) => {
        const r = Array.isArray(d) ? d : Array.isArray(d?.historical) ? d.historical : null;
        return r && r.length ? r : null;
      },
    ),
    /* News: Finnhub first, the upstream the city-news route already uses, then
       FMP's own stock_news on the same key so a resolved ticker is never
       structurally newsless for want of a second provider. */
    firstOf(
      [
        finnhubKey
          ? {
              id: 'finnhub/company-news',
              url: `https://finnhub.io/api/v1/company-news?symbol=${sym}&from=${from}&to=${to}&token=${encodeURIComponent(finnhubKey)}`,
            }
          : {},
        u(`${FMP_V3}/stock_news?tickers=${sym}&limit=4&apikey=${k}`),
      ],
      (d) => (Array.isArray(d) && d.length ? d : null),
    ),
    /* Profile, for the industry that titles the news card and picks the
       industry stories ("Aerospace & Defense" for LMT). Finnhub's
       finnhubIndustry is the fallback on the same chain. */
    firstOf(
      [
        u(`${FMP_STABLE}/profile?symbol=${sym}&apikey=${k}`),
        u(`${FMP_V3}/profile/${sym}?apikey=${k}`),
        finnhubKey
          ? {
              id: 'finnhub/profile2',
              url: `https://finnhub.io/api/v1/stock/profile2?symbol=${sym}&token=${encodeURIComponent(finnhubKey)}`,
            }
          : {},
      ],
      (d) => {
        const r = Array.isArray(d) ? d[0] : d;
        const industry = r?.industry || r?.finnhubIndustry || null;
        return industry ? { industry: String(industry), sector: r?.sector || null } : null;
      },
    ),
  ]);

  let echoRes = null;
  try {
    echoRes = admin
      ? await admin
          .from('echo_articles')
          .select('article_title, article_slug, published_at')
          .eq('article_status', 'published')
          .gte('published_at', new Date(today.getTime() - 42 * 24 * 60 * 60 * 1000).toISOString())
          .or(
            `article_title.ilike.%${name.replace(/[,()%*]/g, ' ')}%,article_body.ilike.%${name.replace(/[,()%*]/g, ' ')}%`,
          )
          .order('published_at', { ascending: false })
          .limit(3)
      : null;
  } catch {
    /* fail-soft: the card renders on external news alone */
  }

  const quote = legs[0].value;
  const ratios = legs[1].value;
  const eod = legs[2].value;
  const news = legs[3].value;
  const profile = legs[4].value;
  const legCodes = legs.flatMap((l) => l.codes);

  /* Industry coverage that need not name the company: a ping on Lockheed
     should still surface a Northrop munitions award or a Pentagon budget
     story. Fail-soft to an empty list. */
  const industry = industryProfile(profile?.industry);
  const industryNews = industry ? await fetchIndustryNews(admin, industry, { limit: 3 }) : [];

  const rows = Array.isArray(eod) ? eod : [];
  /* FMP returns newest first; the chart reads left to right in time. No
     slice: the whole year is the series. */
  const spark = rows
    .map((r) =>
      typeof r?.price === 'number' ? r.price : typeof r?.close === 'number' ? r.close : null,
    )
    .filter((n) => typeof n === 'number')
    .reverse();

  const fundamentals =
    quote && typeof quote.price === 'number'
      ? {
          price: quote.price,
          marketCap: typeof quote.marketCap === 'number' ? quote.marketCap : null,
          /* Field names differ between /stable/ and v3 and between
             ratios-ttm and key-metrics-ttm; whichever chain answered, the
             label stays truthful to the source field. */
          peTtm: num(
            ratios?.priceToEarningsRatioTTM,
            ratios?.peRatioTTM,
            ratios?.priceEarningsRatioTTM,
            quote?.pe,
          ),
          evToEbitdaTtm: num(
            ratios?.enterpriseValueMultipleTTM,
            ratios?.evToEBITDATTM,
            ratios?.enterpriseValueOverEBITDATTM,
          ),
          fourth: fourthStat(ratios),
        }
      : null;

  return {
    ticker,
    name,
    fundamentals,
    spark: spark.length >= 2 ? spark : null,
    sparkLabel: 'YTD',
    /* Surfaced in the trace so an empty card explains itself. */
    legCodes,
    kind: 'company',
    industry: industry ? { label: industry.label, name: industry.name } : null,
    newsTitle: industryNewsTitle(industry),
    /* Industry stories first, then the company's own, newest first within
       each, four at most. Finnhub calls it headline/datetime, FMP calls it
       title/publishedDate. */
    news: [
      ...industryNews,
      ...(Array.isArray(news) ? news : [])
        .filter((n) => (n?.headline || n?.title) && n?.url)
        .slice(0, 2)
        .map((n) => ({
          title: String(n.headline || n.title),
          url: String(n.url),
          source: String(n.source || n.site || 'News'),
          publishedAt: n.datetime
            ? new Date(n.datetime * 1000).toISOString()
            : n.publishedDate
              ? new Date(n.publishedDate).toISOString()
              : null,
          scope: 'company',
        })),
    ]
      .filter((n, i, all) => all.findIndex((x) => x.url === n.url) === i)
      .slice(0, 4),
    echo: (Array.isArray(echoRes?.data) ? echoRes.data : [])
      .filter((r) => r?.article_title && r?.article_slug)
      .map((r) => ({
        title: String(r.article_title),
        slug: String(r.article_slug),
        publishedAt: r.published_at || null,
      })),
  };
}

/* The dossier for whatever the ping resolved to: a member of Congress, a
   company, or nothing. An enrichment throughout: a failed leg yields null,
   never a lost answer. */
async function buildDossierFor({
  country,
  politician,
  resolved,
  industry,
  sector = null,
  flows = null,
  activity = null,
  understood,
  admin,
  leg,
}) {
  /* Nov 7: a congressional activity ping ("How has disclosed congressional
     trading changed over the last three years?"): one RPC, no member,
     company or retrieval legs. */
  if (activity) {
    try {
      return await leg(
        'dossier-congress-activity',
        () => buildCongressActivityDossier({ admin, years: activity.years }),
        (v) =>
          v
            ? `windows=${v.windows.length} house=${v.house.windows.map((r) => r?.trades ?? 0).join('/')} senate=${v.senate.windows.map((r) => r?.trades ?? 0).join('/')}`
            : 'none',
      );
    } catch {
      return null;
    }
  }
  /* Nov 4: a 13F flows ping ("What are hedge funds selling right now?"):
     one snapshot read, no company legs. */
  if (flows) {
    try {
      return await leg(
        'dossier-flows',
        () => buildFlowsDossier({ admin, side: flows.side, sector: flows.sector }),
        (v) =>
          v
            ? `q=${v.quarter} filers=${v.coverage.filersCompared} sold=${v.mostSold.length} bought=${v.mostBought.length} open=${v.open ? v.open.coverage.filersCompared : 0}`
            : 'none',
      );
    } catch {
      return null;
    }
  }
  if (sector) {
    try {
      return await leg(
        'dossier-sector',
        () => buildSectorScreen(sector),
        (v) =>
          `congress=${v.congress?.total ?? 0} perf=${v.performance?.rows?.length ?? 0} contracts=${v.contracts?.rows?.length ?? 0}`,
      );
    } catch {
      return null;
    }
  }
  if (industry) {
    try {
      return await leg(
        'dossier-industry',
        () => buildIndustryDossier({ registry: industry, understood, admin, deps: { match13f } }),
        (v) =>
          `stages=${v.registry.stages.length} companies=${v.registry.companies.length} 13f=${v.matches.thirteenF?.length || 0} congress=${v.matches.congress?.length || 0} markets=${v.matches.markets?.length || 0} echo=${v.echo.length}`,
      );
    } catch {
      return null;
    }
  }
  /* A country carries its own matches (OECD, Empire, Echo, markets); the
     company legs (contracts, SEC, 13F, lobbying) have nothing to say about a
     country and render dry. */
  if (country) {
    try {
      return await leg(
        'dossier-country',
        () => buildCountryDossier(country, admin, { matchEcho, query: understood?.raw || '' }),
        (v) =>
          `oecd=${v.oecd ? v.oecd.headline.length : 0} story=${v.oecd?.stories?.length || 0} empire=${v.empire ? v.empire.rank || 'unranked' : 'n'} news=${v.news.length} echo=${v.echo.length} conflict=${v.conflict ? v.conflict.kpis.deaths : 'n'}`,
      );
    } catch {
      return null;
    }
  }
  if (politician) {
    try {
      return await leg(
        'dossier-politician',
        () => buildPoliticianDossier(politician, admin, { matchEcho }),
        (v) =>
          `series=${v.series ? v.series.length : 0} similar=${v.similar.length} trades12m=${v.stats?.trades12m ?? 0} buys=${v.buys12m.length} committees=${v.committees ? v.committees.length : 'n'} echo=${v.echo.length}`,
      );
    } catch {
      return null;
    }
  }
  if (!resolved) return null;
  let dossier = null;
  try {
    dossier = await leg(
      'dossier',
      () => buildDossier(resolved, admin),
      (v) =>
        `fund=${Boolean(v.fundamentals)} spark=${v.spark ? v.spark.length : 0} news=${v.news.length} echo=${v.echo.length} [${(v.legCodes || []).join(' ')}]`,
    );
  } catch {
    return null;
  }
  /* What each dataset found, for the Sourced matches previews. Its own leg so
     a slow rollup scan cannot cost the dossier; a null leg renders its
     dataset as a dry row. */
  if (dossier) {
    try {
      dossier.matches = await leg(
        'matches',
        () => buildMatches(resolved, admin, understood),
        (m) =>
          `echo=${m.echo?.length || 0} contracts=${m.contracts ? 'y' : 'n'} congress=${m.congress?.length || 0} sec=${m.sec?.length || 0} 13f=${m.thirteenF?.length || 0} lobbying=${m.lobbying ? 'y' : 'n'} markets=${m.markets?.length || 0}`,
      );
    } catch {
      dossier.matches = null;
    }
  }
  return dossier;
}

/**
 * One ping, end to end. `admin` is the service-role client; the caller owns it
 * so the demo route and the guest route share one connection policy.
 */
const INDUSTRY_INTENTS = new Set(['industry_layout', 'industry_country']);

/* The country's US-listed basket (ETFs and ADRs) from the repo's
   region -> ticker map, never a hard-coded list here. */
function countryBasket(country) {
  const iso2 = (country.iso2 || '').toUpperCase();
  const hit = NEWS_REGIONS.find(
    (r) => r.id === iso2 || String(r.label || '').toLowerCase() === country.name.toLowerCase(),
  );
  return hit ? [...new Set(hit.tickers)] : [];
}

/** Everything the country_rank briefing adds to the country dossier. */
async function buildRankBlock(country, dossier, admin) {
  const payload = await getMacroRankings();
  const view = payload ? countryRankView(payload, country.iso3) : null;
  const basket = countryBasket(country);
  const [congress, thirteenF] = await Promise.all([
    basketCongress(admin, basket).catch(() => null),
    basket13f(admin, basket, match13f).catch(() => null),
  ]);
  if (!view && !dossier.empire) return null;
  return {
    view,
    lede: view ? rankLede(view, dossier.empire) : null,
    followups: rankFollowups(view, dossier.empire),
    attribution: WB_ATTRIBUTION,
    scope: SCOPE_NOTE,
    source: payload?.source || null,
    builtAt: payload?.builtAt || null,
    basket,
    congress,
    thirteenF,
  };
}

/**
 * Dataset snippets for a company ping, from the dossier's Sourced matches, in
 * the shape the retrievers emit. Only what the match cards show.
 */
export function companyEvidence(matches, resolved, { gov = false } = {}) {
  const out = [];
  const name = resolved?.name || resolved?.ticker || 'The company';
  const c = matches?.contracts;
  if (c?.total) {
    const agencies = (c.agencies || [])
      .filter((a) => a.name !== 'Other')
      .map((a) => `${a.name} ${Math.round(a.share * 100)}%`)
      .join(', ');
    const yoy = c.yoy
      ? ` Fiscal ${c.yoy.to} versus fiscal ${c.yoy.from}: ${c.yoy.value >= 0 ? 'up' : 'down'} ${Math.abs(Math.round(c.yoy.value * 100))}%.`
      : '';
    /* Nov 4: named as what it is. USAspending's award amount is the money
       obligated on awards dated in each fiscal year: not a ceiling, not
       revenue. The recipients are every entity the ticker maps to. */
    const who = c.entities?.length > 1 ? `${name} (as ${c.entities.join(' and ')})` : c.recipient;
    out.push({
      corpus: 'contracts',
      title: `${c.recipient} federal contract obligations`,
      snippet: `${who} received ${usd(c.total)} in federal contract obligations across ${c.awards} awards dated fiscal ${c.coverage?.fromFy} to fiscal ${c.coverage?.toFy} (USAspending).${agencies ? ` Largest awarding agencies by value: ${agencies}.` : ''}${yoy}`,
      meta: { recipient: c.recipient, measure: 'obligations', gov },
    });
    const latestFy = (c.series || []).filter((d) => d.fy < c.fyNow).slice(-1)[0];
    if (gov && latestFy && c.byFyAgency?.length) {
      const fyRows = c.byFyAgency
        .filter((r) => r.fy === latestFy.fy)
        .sort((x, y) => y.value - x.value)
        .slice(0, 4);
      out.push({
        corpus: 'contracts',
        title: `${name} obligations by agency, fiscal ${latestFy.fy}`,
        snippet: `In fiscal ${latestFy.fy}, federal agencies obligated ${usd(latestFy.value)} to ${name} on awards dated that year: ${fyRows
          .map(
            (r) => `${r.agency} ${usd(r.value)} (${Math.round((r.value / latestFy.value) * 100)}%)`,
          )
          .join(', ')}.`,
        meta: { recipient: c.recipient, measure: 'obligations', gov },
      });
    }
    const big = (c.topAwards || []).slice(0, 3);
    if (gov && big.length) {
      out.push({
        corpus: 'contracts',
        title: `${name} largest federal awards`,
        snippet: `Largest federal awards to ${name}: ${big
          .map(
            (w) =>
              `${w.agency}${w.piid ? ` ${w.piid}` : ''} to ${w.recipient}, ${usd(w.obligated)} obligated${w.ceiling != null ? ` against a ${usd(w.ceiling)} ceiling (base and all options)` : ''}${w.signed ? `, signed ${w.signed}` : w.fy ? `, fiscal ${w.fy}` : ''}`,
          )
          .join(
            '; ',
          )}.${big.some((w) => w.ceiling != null) ? ' A ceiling is the most that could be awarded, not committed money.' : ''}`,
        meta: { recipient: c.recipient, measure: 'awards', gov },
      });
    }
  }
  const trades = matches?.congress;
  const series = matches?.congressSeries;
  if (trades?.length) {
    const w12 = congressWindow(series, { months: 12 });
    const all = congressWindow(series);
    const lean =
      all && all.buys + all.sells
        ? ` Since ${all.from}, members disclosed ${all.buys} purchases and ${all.sells} sales (${all.members} members, ${all.lean})${
            w12 && w12.buys + w12.sells
              ? `; in the last 12 months ${w12.buys} purchases and ${w12.sells} sales (${w12.lean})`
              : ''
          }.`
        : '';
    out.push({
      corpus: 'congress',
      title: `Congressional trades in ${resolved?.ticker || name}`,
      snippet: `Most recent STOCK Act disclosures in ${name} (${resolved?.ticker || ''}): ${trades
        .map((t) => `${t.member}, ${String(t.type).toLowerCase()}${t.date ? ` on ${t.date}` : ''}`)
        .join('; ')}.${lean}`,
      meta: { ticker: resolved?.ticker || null },
    });
  }
  const holders = matches?.thirteenF;
  if (holders?.length) {
    out.push({
      corpus: '13f',
      title: `13F holders of ${resolved?.ticker || name}`,
      snippet: `Largest 13F holders of ${name}${holders[0]?.quarter ? ` as of ${holders[0].quarter}` : ''}: ${holders
        .map((h) => `${h.filer}${h.valueUsd != null ? ` ${usd(h.valueUsd)}` : ''}`)
        .join('; ')} (SEC 13F filings).`,
      meta: { ticker: resolved?.ticker || null },
    });
  }
  const l = matches?.lobbying;
  if (l?.filings) {
    out.push({
      corpus: 'lobbying',
      title: `${l.client} lobbying disclosures`,
      snippet: `${l.client} appears in ${l.filings} federal lobbying disclosures${l.fromYear ? ` from ${l.fromYear} to ${l.toYear}` : ''}, filed by ${l.registrantCount} registrant firms${l.registrants?.length ? ` including ${l.registrants.join(', ')}` : ''}.${l.inHouse ? ` In-house lobbying spend in ${l.inHouse.year}: ${usd(l.inHouse.spend)}.` : ''} (Senate LDA filings)`,
      meta: { client: l.client },
    });
  }
  return out;
}

/* Per-leg ceilings for the landing ping. A leg that misses its ceiling
   degrades to the same value it returns when it finds nothing, so the ping
   still answers (prod Oct 26: unbounded legs stacked past the function cap
   and the client got a bare 504).

   Oct 30 (v2): two profiles. 'fast' is the default and answers inside six
   seconds end to end: tight legs run side by side, a fast model writes a
   shorter brief, nothing is regenerated, and live web search (which alone
   takes longer than six seconds) is off; the internet evidence is fetched
   by the pipeline itself (market data, IPO filings, the news feed). 'deep'
   (SONAR_PING_PROFILE=deep) is the previous behaviour: the stronger model,
   web search when SONAR_WEB_SEARCH=true, a 70 second budget.

   evidenceReserveMs is the time kept back after the evidence legs for the
   brief and the tail; tailMs after the brief for the response itself. */
/* Nov 6 (v3): the six-second limit is gone. The 'standard' profile replaces
   'fast': the route has SONAR_PING_BUDGET_MS (default 25 s), the legs are
   relaxed in proportion and run side by side, synthesis always starts with
   at least 8 s left (evidenceReserveMs), and a draft the grounding guard
   flags can be regenerated once. The visitor sees the estimate up front
   (/api/sonar/estimate) and can choose deep research instead. */
const pingBudgetMs = () => {
  const n = Number(process.env.SONAR_PING_BUDGET_MS);
  return Number.isFinite(n) && n >= 8_000 ? Math.min(n, 80_000) : 25_000;
};
/** The least time synthesis starts with on the standard profile. */
export const SYNTHESIS_MIN_MS = 8_000;

const PROFILES = {
  standard: {
    id: 'standard',
    get routeBudgetMs() {
      return pingBudgetMs();
    },
    get defaultBudgetMs() {
      return pingBudgetMs();
    },
    authMs: 1_500,
    reserveMs: 2_000,
    ledgerMs: 800,
    rateLimitMs: 1_000,
    resolveFetchMs: 2_500,
    tailMs: 800,
    /* Synthesis starts with at least SYNTHESIS_MIN_MS left, plus the tail. */
    evidenceReserveMs: SYNTHESIS_MIN_MS + 800,
    dossierReserveMs: SYNTHESIS_MIN_MS + 800,
    model: process.env.SONAR_LANDING_MODEL || process.env.SONAR_FAST_MODEL || HAIKU_MODEL,
    briefTokens: 1_100,
    sanctionsExtraTokens: 300,
    web: false,
    regenerate: true,
    /* A regenerated draft needs this much left after the first one. */
    regenerateMinMs: 6_000,
    generalMinMs: 5_000,
    minHopMs: 2_500,
    hopReserveMs: 0,
    maxSnippets: 18,
    legs: {
      industry: 1_500,
      politician: 1_500,
      sector: 4_000,
      lobbying: 4_000,
      flows: 3_000,
      activity: 3_000,
      resolve: 2_500,
      retrieveCap: 6_000,
      retriever: 4_000,
      embed: 1_500,
      rerank: 1_800,
      sanctions: 2_500,
      countryDossier: 4_000,
      companyDossier: 4_000,
      macroRank: 2_500,
      /* The country question's own macro read (buildCountryIntel), one retry. */
      macro: 2_500,
      ipo: 4_000,
      ipoFetch: 2_500,
      market: 3_000,
      analysts: 3_000,
      news: 3_000,
    },
  },
  deep: {
    id: 'deep',
    routeBudgetMs: 70_000,
    defaultBudgetMs: 52_000,
    authMs: 3_000,
    reserveMs: 6_000,
    ledgerMs: 5_000,
    rateLimitMs: undefined,
    resolveFetchMs: 4_000,
    tailMs: 3_000,
    evidenceReserveMs: 22_000,
    dossierReserveMs: 25_000,
    model: BRIEF_MODEL,
    briefTokens: BRIEF_TOKENS,
    sanctionsExtraTokens: 400,
    web: true,
    regenerate: true,
    regenerateMinMs: 14_000,
    generalMinMs: 8_000,
    minHopMs: undefined,
    hopReserveMs: undefined,
    maxSnippets: 40,
    legs: {
      industry: 5_000,
      politician: 5_000,
      sector: 6_000,
      lobbying: 6_000,
      flows: 4_000,
      activity: 4_000,
      resolve: 6_000,
      retrieveCap: 18_000,
      retriever: 15_000,
      embed: 3_000,
      rerank: 4_000,
      sanctions: 5_000,
      countryDossier: 8_000,
      companyDossier: 18_000,
      macroRank: 5_000,
      macro: 5_000,
      ipo: 6_000,
      ipoFetch: 4_000,
      market: 4_000,
      analysts: 4_000,
      news: 4_000,
    },
  },
};

/** The ping profile in force: 'standard' unless SONAR_PING_PROFILE=deep. */
export function pingProfile() {
  return process.env.SONAR_PING_PROFILE === 'deep' ? PROFILES.deep : PROFILES.standard;
}

/* "Space Exploration Technologies Corp." -> "Space Exploration Technologies". */
const shortName = (name) =>
  String(name || '')
    .replace(
      /[,.]?\s+(?:inc|corp|corporation|co|company|ltd|limited|plc|holdings?|group|sa|ag|nv|se|llc|lp)\.?$/i,
      '',
    )
    .trim();

/* Headlines from Ezana's news feed as (news) snippets. */
function newsItems(articles) {
  return (articles || []).map((a) => {
    const day = String(a.publishedAt || '').slice(0, 10);
    return {
      corpus: 'news',
      title: a.title,
      snippet: `Reported by ${a.source}${day ? ` on ${day}` : ''}: ${String(a.title).replace(
        /\s*[—–]\s*/g,
        ', ',
      )}.`,
      url: a.url,
      date: day || null,
      meta: { source: a.source },
    };
  });
}

/**
 * The brief when synthesis cannot answer in time: the strongest snippets in
 * order, each cited. Every word comes from the evidence, so it can never
 * make a claim the sources do not, and the ping still answers.
 */
export function evidenceBrief(subject, marked) {
  const clip = (raw, max = 280) => {
    let t = String(raw || '')
      /* Nov 2026: the citation marker credits the source; an inline "Source: ..." tail
         (macro rows carry one for the model) never reaches the visitor. */
      .replace(/\s*Source:\s[^.]*(?:\([^)]*\))?[^.]*\.?\s*$/i, '')
      .replace(/\s*[—–]\s*/g, ', ')
      .replace(/\s+/g, ' ')
      .trim();
    if (t.length > max) {
      const cut = t.slice(0, max);
      const end = cut.lastIndexOf('. ');
      t = end > 120 ? cut.slice(0, end + 1) : `${cut.replace(/\s+\S*$/, '')}...`;
    }
    return /[.!?]$/.test(t) ? t : `${t}.`;
  };
  /* lineAt takes a length cap; line is the plain form, safe to pass to
     Array.map (which would hand it the index as a second argument). */
  const lineAt = (it, max) =>
    `${clip(it.snippet || it.text || it.title, max).replace(/[.!?]$/, '')} [${it.marker}].`;
  const line = (it) => lineAt(it, 280);
  /* Nov 3: headlines only when there is nothing else; never a paragraph of
     them under real findings. A company's moves and its analysts each get a
     paragraph of their own, then the dataset matches. */
  const nonNews = marked.filter((it) => it.corpus !== 'news');
  const pool = nonNews.length ? nonNews : marked;
  /* Nov 4: an industry reads as its shape, not its registry. The summary
     lines (which companies are based in the pinged country, the chain at a
     glance) lead; the stage-by-stage lists stay in the Industry Layout
     beside the brief instead of being read out here; up to two other
     findings (Echo, filings) follow. */
  const registry = pool.filter((it) => it.corpus === 'industry_registry');
  if (registry.length) {
    /* The country line when the ping names one (the chain is on screen
       beside the brief), else the chain line. */
    const geoLine = registry.filter((it) => it.meta?.geo);
    const chainLine = registry.filter((it) => it.meta?.chain);
    const summary = geoLine.length ? geoLine : chainLine;
    const head = (summary.length ? summary : registry.slice(0, 2)).map((it) => lineAt(it, 440));
    const other = pool.filter((it) => it.corpus !== 'industry_registry').slice(0, 2);
    const paras = [head.join(' ')];
    if (other.length) paras.push(other.map(line).join(' '));
    return paras.join('\n\n');
  }
  const moves = pool.filter((it) => it.corpus === 'market' || it.corpus === 'ipo');
  const analysts = pool.filter((it) => it.corpus === 'analysts');
  /* Nov 4 (v2): a government-exposure ping ("How dependent is Palantir on
     government spending?") answers the question first: the company's
     identity line (the first sentence of its listing snippet, "Palantir
     Technologies Inc. (PLTR) is a listed company..."), then the revenue mix
     and the federal contract findings, then Congress, then price and
     analysts as context. */
  const exposure = pool.filter((it) => it.corpus === 'exposure');
  /* The contracts snippets of a government-exposure ping are marked gov, so
     the answer-first order holds when the revenue mix is not available. */
  if (exposure.length || pool.some((it) => it.meta?.gov)) {
    const contracts = pool.filter((it) => it.corpus === 'contracts');
    const congress = pool.filter((it) => it.corpus === 'congress');
    const identity = moves.find((it) => it.corpus === 'market');
    const idLine = identity ? firstSentenceOf(identity) : '';
    const lead = exposure.length ? exposure.slice(0, 2) : contracts.slice(0, 2);
    const rest = exposure.length ? contracts.slice(0, 2) : contracts.slice(2, 3);
    const paras = [[idLine, ...lead.map((it) => lineAt(it, 420))].filter(Boolean).join(' ')];
    if (rest.length) paras.push(rest.map((it) => lineAt(it, 420)).join(' '));
    if (congress.length)
      paras.push(
        congress
          .slice(0, 1)
          .map((it) => lineAt(it, 420))
          .join(' '),
      );
    return paras.join('\n\n');
  }
  if (moves.length || analysts.length) {
    const data = pool.filter((it) => !moves.includes(it) && !analysts.includes(it));
    const paras = [];
    if (moves.length) paras.push(moves.slice(0, 3).map(line).join(' '));
    if (analysts.length) paras.push(analysts.slice(0, 3).map(line).join(' '));
    if (data.length) paras.push(data.slice(0, 3).map(line).join(' '));
    return paras.join('\n\n');
  }
  /* Nov 4: no "Here is what Sonar found on X." opener on any path. The
     brief starts with the first finding about the subject. `subject` stays
     in the signature for the callers. */
  void subject;
  const top = pool.slice(0, 3).map(line);
  if (!top.length) return null;
  const rest = pool.slice(3, 6).map(line);
  const paras = [top.join(' ')];
  if (rest.length) paras.push(rest.join(' '));
  return paras.join('\n\n');
}

/* The first sentence of a snippet, cited: the listing snippet's "X (TICK) is
   a listed company trading on ..." line, without the price detail after it. */
function firstSentenceOf(it) {
  const t = String(it.snippet || it.text || '')
    .replace(/\s+/g, ' ')
    .trim();
  const m = t.match(/^.*?[a-z0-9)][.!?](?=\s+[A-Z]|$)/);
  const first = (m ? m[0] : t).replace(/[.!?]$/, '');
  return first ? `${first} [${it.marker}].` : '';
}

/** Seconds a finished ping is shared across phrasings and visitors (0 = off). */
export function pingCacheTtlSeconds() {
  const raw = process.env.SONAR_PING_CACHE_TTL_S;
  if (raw == null || raw === '') return 1800;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 86_400) : 0;
}

export async function runLandingPipeline(
  query,
  { admin, wantDossier = true, noCorrect = false, force = null, deadlineAt = null } = {},
) {
  const startedAt = Date.now();
  const P = pingProfile();
  const LEG = P.legs;
  const TAIL_MS = P.tailMs;
  const deadline = Number(deadlineAt) || Date.now() + P.defaultBudgetMs;
  const left = () => deadline - Date.now();
  /* Resolve a leg's value within `ms` (clipped to what the request has left)
     or fall back. A thrown error still throws, so the trace records it. */
  const within = async (promise, ms, fallback, label) => {
    const r = await withTimeout(promise, Math.max(0, Math.min(ms, left())), label);
    if (r.ok) return r.value;
    if (r.error) throw r.error;
    console.warn('[sonar-pipeline] leg timed out', { label, ms, leftMs: left() });
    return fallback;
  };

  /* A run that ends without an answer has to say WHERE it broke, or the only
     signal in the logs is that it broke. Each leg records its name, outcome
     and duration; nothing from an error message goes in, so the leg names are
     safe to hand back to a client as `failedAt`. */
  const trace = [];
  const leg = async (name, fn, note, okOf) => {
    const t0 = Date.now();
    try {
      const value = await fn();
      /* Not throwing is not the same as working. Synthesis returns a shape
         with a null answer when the provider rejects it, which is precisely
         the failure worth naming, so a leg can declare its own success. */
      trace.push({
        leg: name,
        ok: okOf ? Boolean(okOf(value)) : true,
        ms: Date.now() - t0,
        note: note ? note(value) : undefined,
      });
      return value;
    } catch (e) {
      trace.push({ leg: name, ok: false, ms: Date.now() - t0, note: e?.name || 'threw' });
      throw e;
    }
  };

  /* Understanding first (spec Part A): the corrected text, the display
     title, the intent and the typed entities. Everything downstream reads
     this, never the raw string, so "give me a lyout of the semiconductor
     industry in the USA" is never echoed back and "USA" after "in the" is a
     country, not the Liberty All-Star Equity Fund. */
  const understood = await leg(
    'understand',
    () => understandQuery(query, { noCorrect, force }),
    (v) => `${v.intent} ${v.entities.map((e) => `${e.kind}:${e.id}`).join(',')}`,
  );
  const q = understood.corrected || query;
  const entity = (kind) => understood.entities.find((e) => e.kind === kind) || null;
  /* Oct 30: event intents from the visitor's own words. An IPO ping resolves
     the company it names (the question framing stripped: "what was the ipo
     value of spacex" resolves "spacex", not the whole sentence) and reads
     the IPO filings source first. A recent-event ping always asks for live
     web, whatever the tier. */
  const eventIntents = extractIntents(query);
  const ipoIntent = eventIntents.includes('ipo');
  const recentEvent = eventIntents.includes('recentEvent');
  const ipoSubj = ipoIntent ? ipoSubject(q) : null;
  /* Nov 4: one question, one answer. Two phrasings of the same question
     ("semiconductor industry in Taiwan", "Give me a breakdown of the
     semiconductor industry in Taiwan") share a canonical key: the synthesis
     is told the same words, and a finished answer is served to both from the
     shared cache. Guests and members read the same entry, so a free ping on
     /datasets and a signed-in ping on /sonar get the same result. A forced
     entity, a "search instead" re-ping or a recent-event ping always runs. */
  const canon = canonicalPing(understood, query);
  const asked = canon.asked;
  const cacheTtl = pingCacheTtlSeconds();
  /* Nov 6 (v3): the intent is part of the key, so a country profile
     ("Turkey") and a country question ("Is Turkey's lira under pressure?")
     never share a brief, and today's cached v2 Turkey brief is not served. */
  /* Nov 2026 (v4): a country answer's news rail is relevance-gated (insight/relevance.js). */
  const cacheKey = `landing:v4:${understood.intent}:${canon.key}`;
  const cacheable = cacheTtl > 0 && !force && !noCorrect && !recentEvent;
  if (admin && !hasCacheClient()) setCacheClient(() => admin);
  if (cacheable) {
    const hit = await withTimeout(cacheGet(cacheKey), 300, 'ping-cache')
      .then((r) => (r.ok ? r.value : undefined))
      .catch(() => undefined);
    if (hit?.answer && (hit.briefKind === 'model' || hit.briefKind === 'facts')) {
      trace.push({ leg: 'ping-cache', ok: true, ms: 0, note: 'hit' });
      console.log('[sonar-pipeline] cache hit', { key: canon.key });
      return {
        ...hit,
        understood: {
          ...hit.understood,
          raw: understood.raw,
          corrected: understood.corrected,
          corrections: understood.corrections,
        },
        cached: true,
        providerErrors: [],
        failedAt: [],
      };
    }
  }
  /* Oct 30 (v2): a company people know by a name the search endpoints do
     not (SpaceX), anywhere in the ping, before any name search runs. */
  const companyAlias = aliasedCompany(query) || aliasedCompany(q);
  /* Nov 3: a company named in words ("How exposed is Nvidia to China export
     controls?") makes the ping about that company; a country it names stays
     on as context (sanctionsFocus below), not as the subject. */
  const companyMention =
    !companyAlias && !entity('ticker') ? mentionedCompany(query) || mentionedCompany(q) : null;
  /* Nov 4: "What are hedge funds selling right now?" names managers and an
     action but no company, member, country or industry, so it fell through
     to a general briefing about what a 13F is. It now reads Ezana's own 13F
     flows. A named company or ticker still wins ("hedge funds selling NVDA"
     is a company ping, with its 13F holders). */
  const flowsAsk =
    !companyAlias && !companyMention && !entity('ticker')
      ? detectFlowsPing(query) || detectFlowsPing(q)
      : null;
  const flowsPing = Boolean(flowsAsk);
  /* Nov 7: "How has disclosed congressional trading activity changed over the
     last three years?" names Congress, trading and a change, but no member,
     company or sector, so it fell to a general briefing that said Sonar lacked
     the data. It now reads Ezana's own disclosures (sonar_congress_activity).
     A named member, ticker, company or sector screen still wins. */
  const activityAsk =
    !companyAlias &&
    !companyMention &&
    !flowsPing &&
    !entity('ticker') &&
    understood.intent !== 'sector_screen' &&
    !understood.entities.some((e) => e.kind === 'person_politician')
      ? detectCongressActivityPing(query) || detectCongressActivityPing(q)
      : null;
  const activityPing = Boolean(activityAsk);
  /* Pings answered from one Ezana aggregate: no subject is resolved. */
  const aggregatePing = flowsPing || activityPing;
  /* "spacex ipo" is about the company, never the space industry. */
  const industryEnt =
    INDUSTRY_INTENTS.has(understood.intent) && !companyAlias && !companyMention && !aggregatePing
      ? entity('industry')
      : null;
  const tickerEnt = entity('ticker');
  const countryEnt = entity('country');
  /* Nov 4: a sector screen ("Which defense stocks are members of Congress
     trading?"): never a country, a member or one company. A company named in
     words still wins ("Lockheed Martin and defense contracts"). */
  const sectorEnt =
    understood.intent === 'sector_screen' && !companyAlias && !companyMention && !aggregatePing
      ? entity('industry')
      : null;
  const sectorPing = Boolean(sectorEnt);

  /* An industry ping is about the industry: no politician or company
     resolution at all. The registry may not cover every lexicon industry; the
     brief still answers, the layout renders only when the registry has it. */
  const industry = industryEnt
    ? await leg(
        'industry',
        () =>
          within(
            admin
              ? getIndustryRegistryCached(industryEnt.id)
              : getIndustryRegistry(null, industryEnt.id),
            LEG.industry,
            null,
            'industry',
          ),
        (v) => (v ? `${v.source} stages=${v.stages.length}` : 'none'),
      )
    : null;
  const industryPing = Boolean(industry);

  /* Nov 6: the macro router on the raw words. A currency word implies its
     country and the currency theme ("Is the lira under pressure?" -> TUR);
     a shared word with no country named ("the peso") stays ambiguous. */
  const macroRoute = routeMacro(query);
  const currencyAsk = macroRoute.currency || null;
  /* A country: the strict whole-string match, a country-intent ping whose
     chosen country entity resolves by name (or by its id, for a forced chip),
     or the country a currency word names. */
  const COUNTRY_INTENTS = ['country', 'country_rank', 'country_question'];
  let country =
    industryPing || companyMention || sectorPing || flowsPing
      ? null
      : resolveCountry(q) ||
        (COUNTRY_INTENTS.includes(understood.intent) && countryEnt
          ? resolveCountry(countryEnt.label) || countryByIso3(countryEnt.id)
          : null) ||
        (currencyAsk?.iso3 &&
        !companyAlias &&
        !tickerEnt &&
        !industryEnt &&
        !understood.entities.some((e) => e.kind === 'person_politician')
          ? countryByIso3(currencyAsk.iso3)
          : null);
  const rankPing = understood.intent === 'country_rank' && Boolean(country);
  /* "What is the peso doing?": five countries use the peso. Sonar asks which,
     with a chip per country, and never guesses (or resolves a company). */
  const currencyAmbiguous =
    !country &&
    Boolean(currencyAsk?.ambiguous) &&
    !companyAlias &&
    !companyMention &&
    !tickerEnt &&
    !industryEnt &&
    !sectorPing &&
    !aggregatePing;
  /* A member of Congress before a company: "Nancy Pelosi" must not resolve
     to whatever FMP's fuzzy name search returns for it. */
  /* Nov 4: a member the understanding layer already named (its politician
     entity carries the bioguide id) resolves by id, however long the ping:
     "What has Nancy Pelosi been buying lately?" used to fail the name
     match's 4-word cap and fall through to a general briefing. */
  const politicianEnt = understood.entities.find((e) => e.kind === 'person_politician') || null;
  /* A company: only from a chosen ticker entity, or a ping with no other
     reading. A blocklisted word ("USA", "IT") never reaches here as a ticker
     unless the understanding layer chose it (a cue, or the chip). */
  const companyCandidate =
    !country &&
    !currencyAmbiguous &&
    !aggregatePing &&
    !industryEnt &&
    !sectorPing &&
    (tickerEnt ||
      ipoIntent ||
      companyAlias ||
      companyMention ||
      ['company', 'ticker_lookup', 'open_question', 'fund'].includes(understood.intent));
  /* Nov 6 (B1): the member and company lookups run side by side. The company
     lookup starts with the member lookup and is discarded if a member resolves,
     so a company ping no longer waits for the member search first. */
  const resolveP = companyCandidate
    ? leg(
        'resolve',
        () =>
          within(
            tickerEnt
              ? resolveCompany(`$${tickerEnt.id}`)
              : ipoIntent
                ? resolveIpoCompany(ipoSubj, query)
                : companyAlias
                  ? resolveIpoCompany(null, query)
                  : companyMention
                    ? resolveCompany(`$${companyMention.ticker}`)
                    : resolveCompany(q),
            LEG.resolve,
            null,
            'resolve',
          ),
        (v) => (v ? v.ticker : 'none'),
      )
    : null;
  /* A discarded lookup's failure is not this ping's failure. */
  resolveP?.catch(() => {});
  const politician =
    country ||
    currencyAmbiguous ||
    industryPing ||
    sectorPing ||
    aggregatePing ||
    companyAlias ||
    companyMention ||
    (tickerEnt && !politicianEnt)
      ? null
      : await leg(
          'resolve-politician',
          () =>
            within(
              (async () =>
                (politicianEnt ? await resolvePoliticianById(politicianEnt.id, admin) : null) ||
                resolvePolitician(q, admin))(),
              LEG.politician,
              null,
              'politician',
            ),
          (v) => (v ? v.bioguideId : 'none'),
        );
  const companyAllowed = companyCandidate && !politician;
  const resolved = companyAllowed ? await resolveP : null;
  /* Oct 26: a country named anywhere in an otherwise unresolved ping
     ("brazilian economy outlook for the next 4 years after the 2026 federal
     election") brings that country's dossier: the OECD key chart, the Empire
     rankings and the country news, and their figures as evidence. The ping's
     own words still drive retrieval, and the country filter keeps off-topic
     snippets (contracts for unrelated US firms) out of the brief. */
  const countryMentioned =
    !country &&
    !politician &&
    !resolved &&
    !industryPing &&
    !industryEnt &&
    !sectorPing &&
    !aggregatePing
      ? mentionedCountry(q)
      : null;
  if (countryMentioned) country = countryMentioned;
  /* Nov 6: a question about a country ("Is Turkey's lira under pressure?",
     "Is the lira under pressure?", "How is Brazil's economy doing?") gets the
     Country & Currency Intelligence brief: its own macro read, started at the
     top of the country path beside the dossier, and an answer-first brief.
     A bare country ("Turkey") keeps the profile. */
  const countryQuestion =
    Boolean(country) &&
    !rankPing &&
    (understood.intent === 'country_question' ||
      Boolean(currencyAsk?.iso3) ||
      Boolean(countryMentioned));
  /* The router's view of the question, with the country settled: the
     frameworks it needs and the families its evidence leads with. */
  const intelRoute = countryQuestion
    ? (() => {
        const route = {
          ...macroRoute,
          countries: [country.iso3, ...macroRoute.countries.filter((c) => c !== country.iso3)],
        };
        const frameworks = frameworksFor(route);
        const lead = frameworks.includes('currency') ? FRAMEWORKS.currency.families : [];
        return {
          ...route,
          frameworks,
          families: [...new Set([...lead, ...route.families])],
        };
      })()
    : null;
  /* Macro questions without a company read the lens and their frameworks; every
     other grounded brief reads the lens alone. */
  const macroAsk =
    countryQuestion ||
    (!resolved &&
      !politician &&
      !industryPing &&
      !sectorPing &&
      !aggregatePing &&
      isMacroRelevant(macroRoute, { hasCompany: false, text: query }));
  const lensBlock = `\n${frameworkPrompt(macroAsk ? (intelRoute?.frameworks ?? frameworksFor(macroRoute)) : [])}`;
  /* Nov 6 (analyst team, quick mode): no analyst calls on a ping. The router picks the lead
     specialist and its skill's definitions and mandatory checks join the synthesis prompt. */
  const leadAnalyst = (() => {
    try {
      const subject = country
        ? { kind: 'country', id: country.iso3, label: country.name }
        : resolved
          ? { kind: 'company', id: resolved.ticker, label: resolved.name }
          : politician
            ? { kind: 'politician', id: politician.bioguideId, label: politician.name }
            : industry
              ? { kind: 'industry', id: industry.industry.id, label: industry.industry.label }
              : null;
      const classification = classifyCore(query, { understood, coverage: null });
      const spec = buildResearchSpec(understood, {
        query,
        resolution: { subject, countries: country ? [{ iso3: country.iso3 }] : [], universe: null },
        depth: 'quick',
        classification,
      });
      const routing = routeAnalysts({
        spec,
        classification: { ...classification, mode: 'quick' },
        route: macroRoute,
        ctx: {},
      });
      return routing.lead ? ANALYSTS[routing.lead.id] : null;
    } catch {
      return null;
    }
  })();
  const leadSkillBlock = leadAnalyst
    ? `\n\nMethod (${leadAnalyst.title}):\n${loadSkill(leadAnalyst.skill, { mode: 'quick' })}`
    : '';
  /* The one country a company ping names, kept as context: it focuses the
     sanctions map and the brief on that country. */
  const contextCountry = !country && resolved ? mentionedCountry(q) : null;
  /* "NVIDIA, China and export controls", not "Export controls". */
  const topicOf = (t) => (t ? `${t[0].toLowerCase()}${t.slice(1)}` : null);
  const mentionParts = companyMention
    ? [companyMention.name, contextCountry ? contextCountry.name : null].filter(Boolean)
    : [];
  /* Nov 4: a topic is a short phrase ("export controls"). A full question
     ("How dependent is Palantir on government spending? Examine its...")
     is not one: gluing it on read "Palantir and how dependent is Palantir
     on...", in the brief's subject and the news heading. A question, or
     anything past eight words, leaves the company name as the subject. */
  const topicText = understood.display || '';
  const isQuestion =
    /[?]/.test(topicText) ||
    /^(how|what|why|which|who|when|where|is|are|does|do|can|should|examine|explain)\b/i.test(
      topicText,
    ) ||
    topicText.split(/\s+/).filter(Boolean).length > 8;
  const mentionTopic =
    companyMention && understood.intent !== 'company' && !isQuestion
      ? topicOf(understood.display)
      : null;
  const display =
    companyMention && resolved
      ? mentionTopic
        ? `${mentionParts.join(', ')} and ${mentionTopic}`
        : mentionParts.join(' and ')
      : understood.display || q;
  /* Retrieval sees the enriched string; the ledger keeps the raw words, the
     UI shows the display title. */
  const retrievalQuery =
    industryPing || sectorPing
      ? display
      : country
        ? countryMentioned || countryQuestion
          ? q
          : rankPing
            ? `${country.name} economy size, growth and world ranking`
            : country.name
        : politician
          ? politician.name
          : resolved
            ? `${resolved.name} (${resolved.ticker})`
            : q;
  /* What the synthesis is told the ping resolved to. */
  const resolvedNote = activityPing
    ? ` (understood as a congressional activity question: how disclosed STOCK Act trading changed over the last ${activityAsk.years} years, by chamber and side; answer from the (congress) snippets only, which are Ezana's own counts)`
    : flowsPing
      ? ` (understood as a 13F flows question: what institutional managers ${
          flowsAsk.side === 'buy' ? 'bought' : flowsAsk.side === 'sell' ? 'sold' : 'sold and bought'
        } most in the latest filed quarter${flowsAsk.sector ? ` in ${flowsAsk.sector}` : ''}; answer from the (13f) snippets)`
      : sectorPing
        ? ` (understood as a sector screen: ${display}; answer from the congressional trading, performance and contract snippets, not about any single company)`
        : industryPing
          ? ` (understood as an industry layout: ${display}; describe structure, major players, where it operates, concentration, capital flows, key dependencies and what to watch, from the sources only)`
          : country
            ? countryMentioned || countryQuestion
              ? ` (about ${country.name}, ISO ${country.iso3}${
                  currencyAsk?.iso3 === country.iso3 && CURRENCY_OF[country.iso3]
                    ? `, currency ${CURRENCY_OF[country.iso3].name} (${CURRENCY_OF[country.iso3].code})`
                    : ''
                }; Ezana's official statistics, OECD Economic Outlook and Global Empire Rankings figures for ${country.name} are among the sources; answer the question as asked)`
              : rankPing
                ? ` (understood as ${display}: where ${country.name} ranks among the world's economies. Use ONLY the ranks, values, years and sources in the sources; name the measure, year and source for every rank; never state a rank or figure the sources do not give; projections only as "IMF projects" with the year. Sections: ${RANK_SECTIONS.join(' · ')}.)`
                : ` (resolved to the country ${country.name}, ISO ${country.iso3})`
            : politician
              ? ` (resolved to ${politician.name}, ${[politician.party, politician.state].filter(Boolean).join('-')}, U.S. ${politician.chamberLabel || 'Congress'})`
              : resolved
                ? ` (resolved to ${resolved.alias ? `${resolved.alias}, ` : ''}${resolved.name}, ${resolved.ticker})`
                : '';

  const entitlements = getSonarEntitlements({ planTier: 0, version: 'regular' });
  const classification = classifyQuery(retrievalQuery);
  const allowCorpora = corporaForDatasets(entitlements.datasets);
  /* Wider than the old 'summary' budget: more snippets per corpus and more
     characters for the brief to read. */
  const budget = depthBudget('standard');
  const intent = detectIntent(q);

  /* The dossier and the news columns do not depend on the brief, so they run
     beside it instead of after it. Started BEFORE retrieval (Oct 26 v2) so
     a company's dataset matches are ready by the time the brief needs them:
     a country's dossier is its evidence (OECD, Empire), and a company's
     matches (contracts, Congress, 13F, lobbying) are too. */
  /* The sector screen's inputs: the industry's universe (the listed one, or
     the registry basket), the ping's words for panel order. */
  const sectorU = sectorPing ? sectorUniverse(sectorEnt.id, { label: sectorEnt.label }) : null;
  const sector = sectorPing
    ? { industryId: sectorEnt.id, label: sectorEnt.label, basket: [], query, admin, ms: LEG.sector }
    : null;
  const dossierP =
    wantDossier || country || industry || sector || flowsAsk || activityAsk
      ? buildDossierFor({
          country,
          politician,
          resolved,
          industry,
          sector,
          flows: flowsAsk,
          activity: activityAsk,
          understood,
          admin,
          leg,
        })
      : null;

  /* Nov 6: a country question's own macro read, started beside the dossier at
     the top of the country path (it used to sit inside retrieval, capped at
     900 ms, and missed). The router on the raw words decides the families, so
     a currency word leads with the exchange rate, policy rate, inflation,
     reserves and the current account. A failed read retries once while there
     is time; its items always reach synthesis. */
  const intelOnce = () =>
    within(
      buildCountryIntel(admin, { iso3: country.iso3, route: intelRoute, timeoutMs: LEG.macro }),
      LEG.macro + 400,
      null,
      'macro-intel',
    ).catch(() => null);
  const intelP =
    countryQuestion && admin
      ? leg(
          'macro-intel',
          async () => {
            let v = await intelOnce();
            if (!v && left() - P.evidenceReserveMs > LEG.macro) {
              console.warn('[sonar-pipeline] macro-intel retry', { iso3: country.iso3 });
              v = await intelOnce();
            }
            return v;
          },
          (v) =>
            v
              ? v.empty
                ? 'empty'
                : `items=${v.items.length} ${v.picture?.assessment?.overall || 'n/a'} ${v.ms}ms`
              : 'none',
          (v) => Boolean(v),
        ).catch(() => null)
      : Promise.resolve(null);

  /* Oct 30 (v2): the internet evidence, started beside retrieval rather
     than after it. A resolved company gets live market data (where it
     trades, since when, price, market cap) and, on an IPO ping, the IPO
     filings source; every ping gets recent headlines from Ezana's news feed
     for its subject. Each is bounded and degrades to nothing. */
  const ipoP =
    ipoIntent && resolved?.ticker
      ? leg(
          'ipo',
          () =>
            within(
              ipoEvents.search(
                { intents: eventIntents, tickers: [resolved.ticker] },
                { timeoutMs: LEG.ipoFetch },
              ),
              LEG.ipo,
              [],
              'ipo',
            ),
          (v) => `findings=${v.length}`,
        ).catch(() => [])
      : Promise.resolve([]);
  const marketP =
    resolved?.ticker && !country && !politician && !industryPing
      ? leg(
          'market',
          () => within(marketSnapshot(resolved.ticker, LEG.market), LEG.market, null, 'market'),
          (v) => (v ? 'snapshot' : 'none'),
        ).catch(() => null)
      : Promise.resolve(null);
  /* Nov 3: a company ping also reads its price performance and what
     analysts publish (targets, ratings, recent actions), beside the market
     snapshot. */
  const analystsP =
    resolved?.ticker && !country && !politician && !industryPing
      ? leg(
          'analysts',
          () =>
            within(
              analystEvidence(resolved.ticker, {
                ms: LEG.analysts,
                regions: intent === 'sanctions' || Boolean(contextCountry),
              }),
              LEG.analysts,
              [],
              'analysts',
            ),
          (v) => `items=${v.length}`,
        ).catch(() => [])
      : Promise.resolve([]);
  /* Nov 4 (v2): a company ping about government dependence reads the
     company's reported revenue by customer type beside the market legs. */
  const govPing = Boolean(
    resolved?.ticker && !country && !politician && !industryPing && detectGovExposure(query),
  );
  const revenueMixP = govPing
    ? leg(
        'revenue-mix',
        () =>
          within(
            fetchRevenueMix(resolved.ticker, { ms: LEG.analysts }),
            LEG.analysts,
            null,
            'revenue-mix',
          ),
        (v) => (v ? `quarters=${v.quarters.length} gov=${v.latest.govShare.toFixed(3)}` : 'none'),
      ).catch(() => null)
    : Promise.resolve(null);
  /* Nov 4: a lobbying question reads the disclosures themselves (the
     research engine's lobbying-leaders runner: same RPC, same counting rule,
     and the topic's own filings only once its ingest is complete). */
  const lobbyingPing =
    DOMAINS.lobbying.cues[0].test(query) && !resolved && !politician && !aggregatePing;
  const lobbyYear = new Date().getUTCFullYear();
  const lobbyingP = lobbyingPing
    ? leg(
        'lobbying',
        () =>
          within(
            import('@/lib/sonar/engine/sources').then(({ RUNNERS }) =>
              RUNNERS.lobbying_leaders(
                {
                  issueBuckets: issueBucketsFor(
                    { rawQuery: query },
                    { industry: industry ? { label: industry.industry.label } : null },
                  ),
                  text: issueTextFor({ rawQuery: query }),
                  topic: topicForText(query)?.key || null,
                  years: { from: lobbyYear - 2, to: lobbyYear },
                },
                { admin, maxItems: 5 },
              ),
            ),
            LEG.lobbying,
            { items: [] },
            'lobbying',
          ),
        (v) => `items=${v?.items?.length || 0}`,
      ).catch(() => ({ items: [] }))
    : Promise.resolve({ items: [] });
  const newsPhrase = activityPing
    ? 'congressional stock trading'
    : flowsPing
      ? flowsAsk.side === 'buy'
        ? 'hedge fund buying'
        : 'hedge fund selling'
      : sectorPing
        ? `${sectorU.label} stocks`
        : industryPing
          ? display
          : country
            ? country.name
            : politician
              ? politician.name
              : resolved
                ? resolved.alias || shortName(resolved.name)
                : ipoSubj || subjectTerms(understood).slice(0, 3).join(' ');
  const newsP = leg(
    'news',
    () =>
      within(
        newsEvidence(admin, {
          tickers: resolved?.ticker ? [resolved.ticker] : [],
          phrase: newsPhrase,
          limit: 5,
        }),
        LEG.news,
        [],
        'news',
      ),
    (v) => `articles=${v.length}`,
  ).catch(() => []);

  const out = await leg(
    'retrieve',
    () =>
      within(
        /* Nov 4 (v2): a flows ping answers from the 13F snapshot alone. The
           corpora have nothing on "what are hedge funds selling" (retrieved
           0, and 0.9 s of the six-second budget spent finding that out). */
        aggregatePing
          ? Promise.resolve({ items: [], corporaSearched: [] })
          : orchestrate(retrievalQuery, {
              admin,
              allowCorpora,
              /* The user's own words, so a retriever that resolves its own entities
             (sanctions reads countries/themes) sees the second country even
             when retrievalQuery collapsed to a single resolved name. */
              rawQuery: query,
              topK: budget.topK,
              perCorpusCap: budget.perCorpusCap,
              charBudget: budget.charBudget,
              /* A slow corpus drops out instead of holding the whole fan-out. */
              retrieverTimeoutMs: LEG.retriever,
              embedTimeoutMs: LEG.embed,
              rerankTimeoutMs: LEG.rerank,
            }),
        /* Never let retrieval eat the brief's time: the profile's reserve
           stays for synthesis and the tail. */
        Math.min(LEG.retrieveCap, left() - P.evidenceReserveMs),
        { items: [], corporaSearched: allowCorpora || [] },
        'retrieve',
      ),
    (v) => `retrieved ${(v.items || []).length}`,
  );
  const retrieved = out.items || [];
  const corporaSearched = [...(out.corporaSearched || [])];

  /* Off-entity chunks poison the synthesis: an Apple ping came back citing
     Boeing and Lockheed awards, because semantic retrieval returns what is
     SIMILAR, not what is about the same company. When resolution tells us the
     entity, keep only the items that actually mention it.

     The haystack is title plus snippet plus the structured meta, NOT a `text`
     field: no retriever emits one, so matching on it would leave every
     haystack empty, drop every item, and send every entity ping down the
     ungrounded path. Checked against the retrievers rather than assumed. */
  const industryTermList = industryPing
    ? subjectTerms(understood).map((t) => t.toLowerCase())
    : null;
  const sectorTermList = sectorPing
    ? [
        ...sectorU.companies.map((c) => c.name).filter(Boolean),
        ...sectorU.companies.map((c) => c.ticker).filter((t) => t.length >= 3),
        ...subjectTerms(understood),
      ].map((t) => t.toLowerCase())
    : null;
  const entityTerms = activityPing
    ? ['congress', 'congressional', 'stock act', 'senator', 'senators', 'lawmakers']
    : flowsPing
      ? ['13f', 'hedge fund', 'hedge funds', 'institutional']
      : sectorTermList?.length
        ? sectorTermList
        : industryTermList?.length
          ? industryTermList
          : country
            ? countryEntityTerms(country)
            : politician
              ? [politician.name, politician.lastName].filter(Boolean).map((t) => t.toLowerCase())
              : resolved
                ? [resolved.name, shortName(resolved.name), resolved.ticker, resolved.alias]
                    .filter(Boolean)
                    .map((t) => t.toLowerCase())
                : ipoSubj
                  ? /* An IPO ping for a company nothing resolved: only snippets
                 that name it, never unrelated ones for the brief to fill. */
                    [ipoSubj.toLowerCase()]
                  : null;
  /* Oct 27: whole words, not substrings ("india" must not match Indiana),
     and for a country, US domestic names that carry a demonym are removed
     first: an India ping was citing federal awards to "The Friendship House
     Association of American Indians" and American Indian health centers. */
  const termRes = (entityTerms || []).map(
    (t) =>
      new RegExp(
        `(^|[^\\p{L}\\p{N}])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=[^\\p{L}\\p{N}]|$)`,
        'u',
      ),
  );
  const US_DOMESTIC =
    /\b(?:american indians?|native americans?|alaska natives?|indian (?:health|affairs|tribes?|tribal|education|country|reservations?|nations?)|bureau of indian|tribal)\b/g;
  /* A country ping with no company/politician resolution: contracts that
     matched only because a recipient name contains the country word (e.g.
     "UNITED STATES VETERANS INITIATIVE") are noise, not a real country link. */
  const countryIntent = Boolean(country) && !resolved && !politician && !industryPing;
  const items = entityTerms
    ? retrieved.filter((it) => {
        /* US Sanctions rows are selected by a foreign sanctioned jurisdiction,
           so they will not carry the (US) country term; keep them as relevant
           by construction. The retriever only runs when the ping warrants it. */
        if (it.corpus === 'sanctions') return true;
        /* Macro rows are chosen by the macro router for this question's countries, themes
           or commodity; euro-area rows ("the euro area") answer a Germany ping without
           naming Germany, and a company ping's country context never names the company. */
        if (it.corpus === 'macro') return true;
        let hay = [it.title, it.snippet, ...Object.values(it.meta || {})]
          .filter((v) => typeof v === 'string')
          .join(' ')
          .toLowerCase();
        if (country) hay = hay.replace(US_DOMESTIC, ' ');
        if (!termRes.some((re) => re.test(hay))) return false;
        if (countryIntent && it.corpus === 'contracts') {
          return passesCountryIntentGuard(
            { intent: 'country' },
            { nameField: it.meta?.recipient || it.title, hasStructuredCountryMatch: false },
          );
        }
        return true;
      })
    : retrieved;

  /* A sanctions ping reads the OFAC aggregates as dataset evidence too. */
  const sanctions =
    intent === 'sanctions'
      ? await within(
          sanctionsContext({ focus: country || contextCountry, query, intl: false }),
          LEG.sanctions,
          null,
          'sanctions',
        ).catch(() => null)
      : null;
  if (sanctions) items.push(...sanctions.evidence);

  /* An IPO ping reads the IPO filings source (price, shares, proceeds,
     valuation, exchange, first trade) for the resolved symbol, at the top of
     the evidence so the brief leads with it. */
  /* The IPO filings and the market snapshot lead the evidence, so the
     brief opens with them. */
  const evidenceWait = Math.max(0, left() - P.evidenceReserveMs);
  const [ipoFindings, market, analystItems, revenueMix] = await Promise.all([
    within(ipoP, evidenceWait, [], 'ipo-wait').catch(() => []),
    within(marketP, evidenceWait, null, 'market-wait').catch(() => null),
    within(analystsP, evidenceWait, [], 'analysts-wait').catch(() => []),
    within(revenueMixP, evidenceWait, null, 'revenue-mix-wait').catch(() => null),
  ]);
  /* Order: market snapshot, performance, analysts, then the datasets. A
     government-exposure ping puts the revenue mix right after the listing
     line, so the brief answers before it reports the price. */
  items.unshift(...analystItems.filter((it) => it.corpus === 'analysts'));
  items.unshift(...analystItems.filter((it) => it.corpus === 'market'));
  if (revenueMix) {
    items.unshift(
      ...exposureEvidence(revenueMix, { name: resolved?.alias || shortName(resolved?.name) }),
    );
  }
  if (market) items.unshift(market);
  items.unshift(
    ...ipoFindings.map((f) => ({
      corpus: 'ipo',
      title: f.title,
      snippet: f.summary,
      url: f.citation?.href || null,
      date: f.date || null,
      score: f.relevance,
      meta: { symbol: f.meta?.symbol || resolved?.ticker, citation: f.citation?.label || null },
    })),
  );

  /* A company ping cites its own dataset matches. Before this the brief saw
     only the retrievers, so when the contracts scan missed its window the
     brief said "Ezana's datasets do not cover this" directly above cards
     showing Congress trades, 13F holders and lobbying for the same company.
     The matches are what the cards render, so the brief cannot cite a figure
     the page does not show. Bounded: a slow matches leg leaves the retrieved
     items as the only evidence, as before. */
  if (resolved && !country && !politician && !industryPing && dossierP) {
    const early = await within(
      dossierP,
      Math.min(LEG.companyDossier, left() - P.dossierReserveMs),
      null,
      'company-dossier',
    ).catch(() => null);
    if (early?.matches) {
      const ev = companyEvidence(early.matches, resolved, { gov: govPing });
      /* A government-exposure ping reads its contracts right after the mix. */
      if (govPing) {
        const lead = ev.filter((it) => it.corpus === 'contracts');
        const at = items.findIndex((it) => it.corpus !== 'market' && it.corpus !== 'exposure');
        items.splice(at < 0 ? items.length : at, 0, ...lead);
        items.push(...ev.filter((it) => !lead.includes(it)));
      } else {
        items.push(...ev);
      }
    }
  }
  /* Nov 4: a sector screen's tables lead the evidence, in the order the
     ping asked. */
  if (sectorPing && dossierP) {
    const early = await within(
      dossierP,
      Math.max(0, Math.min(LEG.sector + 400, left() - P.dossierReserveMs)),
      null,
      'sector-dossier',
    ).catch(() => null);
    if (early) items.unshift(...sectorEvidence(early));
  }
  /* Nov 4: a member's disclosures lead the evidence, so the brief answers
     from the trades on screen. */
  if (politician && dossierP) {
    const early = await within(
      dossierP,
      Math.min(LEG.companyDossier, left() - P.dossierReserveMs),
      null,
      'politician-dossier',
    ).catch(() => null);
    if (early) items.unshift(...politicianEvidence(early));
  }

  /* Nov 4: the 13F flows lead the evidence for a flows ping. */
  let flowsDossier = null;
  if (flowsPing && dossierP) {
    const early = await within(
      dossierP,
      Math.min(LEG.flows, left() - P.dossierReserveMs),
      null,
      'flows-dossier',
    ).catch(() => null);
    flowsDossier = early;
    if (early) items.unshift(...flowsEvidence(early));
    if (!corporaSearched.includes('13f')) corporaSearched.push('13f');
  }

  /* Nov 7: the activity counts are the evidence for an activity ping. */
  let activityDossier = null;
  if (activityPing && dossierP) {
    const early = await within(
      dossierP,
      Math.min(LEG.activity, left() - P.dossierReserveMs),
      null,
      'congress-activity-dossier',
    ).catch(() => null);
    activityDossier = early;
    if (early) items.unshift(...congressActivityEvidence(early));
    if (!corporaSearched.includes('congress')) corporaSearched.push('congress');
  }

  /* The lobbying disclosures lead the evidence for a lobbying question. */
  if (lobbyingPing) {
    const lob = await within(
      lobbyingP,
      Math.max(0, left() - P.evidenceReserveMs),
      { items: [] },
      'lobbying-wait',
    ).catch(() => ({ items: [] }));
    items.unshift(
      ...(lob?.items || []).map((it) => ({
        corpus: 'lobbying',
        title: it.title,
        snippet: it.text,
        date: it.date || it.period?.to || null,
        meta: { source: 'Senate LDA disclosures' },
      })),
    );
    if (!corporaSearched.includes('lobbying')) corporaSearched.push('lobbying');
  }

  /* Headlines last: the brief reads the datasets first. */
  const news = await within(
    newsP,
    Math.max(0, left() - P.evidenceReserveMs),
    [],
    'news-wait',
  ).catch(() => []);
  items.push(...newsItems(news));

  if (ipoIntent && resolved?.ticker && !corporaSearched.includes('ipo')) {
    corporaSearched.push('ipo');
  }

  /* The country question's evidence leads: the computed currency measures,
     then the catalogue rows for the question's families. */
  const intel = countryQuestion
    ? await within(
        intelP,
        Math.max(0, left() - P.evidenceReserveMs),
        null,
        'macro-intel-wait',
      ).catch(() => null)
    : null;
  const intelItems = (intel?.items || []).map((it) => ({
    corpus: 'macro',
    title: it.title,
    snippet: it.text,
    url: it.citation?.href || null,
    date: it.date || null,
    meta: { ...(it.meta || {}), source: it.citation?.label || it.meta?.source || null },
  }));
  /* The general retrieval's macro rows repeat the intel read; the intel read wins. */
  if (intelItems.length) {
    for (let i = items.length - 1; i >= 0; i -= 1)
      if (items[i].corpus === 'macro') items.splice(i, 1);
    items.unshift(...intelItems);
    if (!corporaSearched.includes('macro')) corporaSearched.push('macro');
  }

  /* Recomputed from the survivors: a corpus that only contributed off-entity
     noise must not be shown as a match. */
  const corporaUsed = [...new Set(items.map((i) => i.corpus))];

  let rankFactLines = [];
  if (country) {
    const countryDossier = await within(
      dossierP,
      LEG.countryDossier,
      null,
      'country-dossier',
    ).catch(() => null);
    if (countryDossier) items.push(...countryEvidence(countryDossier));
    /* A country_rank ping: the macro rankings (one snapshot row), the
       country basket's 13F and Congress matches, and the rank facts the
       brief may cite. */
    if (rankPing && countryDossier) {
      const rank = await leg(
        'macro-rank',
        () =>
          within(buildRankBlock(country, countryDossier, admin), LEG.macroRank, null, 'macro-rank'),
        (v) => (v ? `metrics=${Object.keys(v.view?.metrics || {}).length}` : 'none'),
      ).catch(() => null);
      if (rank) {
        countryDossier.rank = rank;
        countryDossier.matches.congress = rank.congress;
        countryDossier.matches.thirteenF = rank.thirteenF;
        rankFactLines = rankFacts(rank.view, countryDossier.empire);
        items.push(
          ...rankFactLines.map((line, i) => ({
            corpus: 'macro',
            title: `World Bank rank fact ${i + 1}`,
            snippet: line,
            meta: { source: WB_ATTRIBUTION },
          })),
        );
      }
    }
  }
  /* The registry's structure is the industry brief's spine. */
  if (industry) {
    const industryDossier = await within(
      dossierP,
      LEG.countryDossier,
      null,
      'industry-dossier',
    ).catch(() => null);
    if (industryDossier) {
      /* The summary lines lead the sources (the brief opens with them, and
         the snippet cap can never cut them); the stage lines follow. */
      const ind = industryEvidence(industryDossier);
      const lead = ind.filter((it) => it.meta?.geo || it.meta?.chain);
      items.unshift(...lead);
      items.push(...ind.filter((it) => !lead.includes(it)));
    }
  }
  const columnsP = wantDossier
    ? (async () => {
        /* Bounded (Oct 30 v2): the columns no longer wait for the whole
           dossier; without it they still have the feed's headlines. */
        const dossierNow = dossierP
          ? await within(
              dossierP,
              Math.max(0, left() - TAIL_MS - 600),
              null,
              'columns-dossier',
            ).catch(() => null)
          : null;
        const specs = await columnSpecs({
          query: display,
          country,
          politician,
          resolved,
          dossier: dossierNow,
          intent,
          admin,
          industry: industry
            ? {
                label: industry.industry.label,
                basket: industryBasket(industry),
                geo: countryEnt?.label || null,
              }
            : sectorPing
              ? {
                  label: sectorU.label,
                  basket: sectorU.companies.map((c) => c.ticker),
                  geo: null,
                }
              : null,
        });
        const cols = await leg(
          'news-columns',
          () =>
            buildNewsColumns({
              subject:
                industryPing || sectorPing
                  ? display
                  : country
                    ? country.name
                    : politician
                      ? politician.name
                      : resolved
                        ? resolved.name
                        : display,
              specs,
              webSearch: P.web,
            }),
          (c) => c.map((x) => `${x.id}=${x.items.length}`).join(' '),
        );
        /* Term-gated for any ping that is not one named entity: a column
           item must mention the subject in its title or lead. Never padded. */
        const gated = !country && !politician && !resolved && subjectTerms(understood).length;
        if (gated) return cols.map((c) => ({ ...c, items: gateNews(c.items, understood) }));
        /* Nov 2026: a country ping's rail drops items that only share the country's name
           (a Thanksgiving turkey on a lira question) or sit outside the question's subject
           (insight/relevance.js). Never padded. */
        if (country) {
          const ci = analyticalIntent(query, { understood });
          return cols.map((c) => ({ ...c, items: gateCountryNews(c.items, ci) }));
        }
        return cols;
      })().catch(() => null)
    : null;

  let answer = null;
  let grounded = false;
  /* Where the brief came from: 'model' (grounded synthesis), 'facts' (a
     deterministic brief built from a snapshot, flows pings), 'evidence' (the
     cited-snippet fallback), 'general' (ungrounded synthesis). Model and
     facts briefs are cached; a fallback is re-run so the next ping can do
     better. */
  let briefKind = null;
  let providerErrors = [];
  let webUsed = false;
  let webSources = [];

  /* The grounding guard (groundingGuard.js): a negative claim no source or web
     result supports is regenerated once through the same synthesis call when
     there is time, and removed otherwise. */
  const guardBrief = async (draft, args, synth, sourceTexts) => {
    if (!draft) return draft;
    const findings = [...sourceTexts, ...(synth?.webCitedText || [])];
    /* The fast profile never regenerates: a second model call does not fit
       in six seconds, so an unsupported negative is removed instead. */
    const canRetry = P.regenerate && left() - TAIL_MS > P.regenerateMinMs;
    const res = await enforceGrounding(
      draft,
      findings,
      canRetry
        ? async (extra) => {
            const again = await synthesizeWithFallback({
              ...args,
              system: `${args.system}\n${extra}`,
              deadlineAt: deadline - TAIL_MS,
              minHopMs: P.minHopMs,
              reserveMs: P.hopReserveMs,
            });
            return again?.answer || null;
          }
        : null,
    );
    if (res.flagged.length) {
      console.warn('[sonar-pipeline] grounding guard', {
        flagged: res.flagged.length,
        regenerated: res.regenerated,
        removed: res.removed.length,
      });
    }
    return res.text;
  };
  const webUses = recentEvent ? RECENT_WEB_USES : BRIEF_WEB_USES;
  /* Live web search runs only in the deep profile, and only when the
     deployment turns it on. */
  const webActive = P.web && webSearchOn();
  /* What the brief is about, for the evidence fallback's opening line. */
  const subjectLabel =
    industryPing || sectorPing
      ? display
      : country
        ? country.name
        : politician
          ? politician.name
          : resolved
            ? resolved.alias || shortName(resolved.name)
            : display;
  /* The news headlines a brief read are the pages it read: listed under
     the brief like web pages when no web search ran. */
  const newsSources = items
    .filter((it) => it.corpus === 'news' && it.url)
    .slice(0, 6)
    .map((it) => ({ url: it.url, title: it.title }));

  /* Nov 4 (v2): a flows ping's brief is one paragraph that reads the
     charts and tables beside it (flowsBrief), built from the same snapshot:
     instant, no model call to time out, no figure the cards do not show.
     The model's three-paragraph brief used to time out on the fast profile
     and fall back to every snippet pasted in a row. */
  /* Nov 7: an activity ping's brief is built from the same numbers as its
     cards (congressActivityBrief): answer first, no model call. */
  if (activityPing && activityDossier) {
    answer = congressActivityBrief(activityDossier);
    if (answer) {
      grounded = true;
      briefKind = 'facts';
    }
  }
  if (!answer && flowsPing && flowsDossier) {
    answer = flowsBrief(flowsDossier);
    if (answer) {
      grounded = true;
      briefKind = 'facts';
    }
  }

  /* Nov 6: "What is the peso doing?" names a currency five countries use.
     Sonar asks which, with a chip per country (understood.ambiguities). */
  if (!answer && currencyAmbiguous) {
    const names = currencyAsk.candidates
      .map((c) => {
        const ctry = countryByIso3(c);
        const cur = CURRENCY_OF[c];
        return ctry && cur ? `${ctry.name} (${cur.name}, ${cur.code})` : null;
      })
      .filter(Boolean);
    if (names.length) {
      const list =
        names.length > 1
          ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
          : names[0];
      answer = `Which ${currencyAsk.word}? Several countries use it: ${list}. Choose one below, or ask about it by name, for example "Is the ${CURRENCY_OF[currencyAsk.candidates[1] || currencyAsk.candidates[0]].name} under pressure?"`;
      grounded = true;
      briefKind = 'facts';
    }
  }

  /* Nov 6: a country question with its macro read answers in the Country &
     Currency Intelligence format: the model writes the judgement as JSON, code
     computed every number, and the validator keeps only what the evidence
     supports. */
  const useIntel = Boolean(countryQuestion && intelItems.length);
  let intelBrief = null;
  let synthesisStartMsLeft = null;

  if (!answer && items.length) {
    /* The feed's headlines always keep a few places. */
    const newsKept = items.filter((it) => it.corpus === 'news').slice(0, 4);
    const evidence =
      items.length > P.maxSnippets
        ? [
            ...items.filter((it) => it.corpus !== 'news').slice(0, P.maxSnippets - newsKept.length),
            ...newsKept,
          ]
        : items;
    const snippetChars = 500;
    const marked = evidence.map((it, i) => ({ ...it, marker: `S${i + 1}` }));
    const sourcesBlock = marked
      .map(
        (it) =>
          `[${it.marker}] (${it.corpus}) ${String(it.text || it.snippet || '').slice(0, snippetChars)}`,
      )
      .join('\n');
    const intelSystem = useIntel
      ? intelSystemPrompt(intel.frameworks?.length ? intel.frameworks : intelRoute.frameworks) +
        leadSkillBlock +
        DATE_RULES +
        GROUNDING_RULES +
        NO_WEB_RULES
      : null;
    const groundedArgs = {
      system:
        intelSystem ||
        (webActive ? GROUNDED_SYSTEM_PROMPT : FAST_GROUNDED_PROMPT) +
          lensBlock +
          leadSkillBlock +
          (sanctions ? SANCTIONS_ADDENDUM : '') +
          (intent === 'sanctions' && resolved && !country && !politician && !industryPing
            ? exposureAddendum(resolved.alias || shortName(resolved.name), contextCountry?.name)
            : '') +
          (country ? COUNTRY_ADDENDUM : '') +
          (politician ? POLITICIAN_ADDENDUM : '') +
          (sectorPing ? SECTOR_ADDENDUM : '') +
          (lobbyingPing ? LOBBYING_ADDENDUM : '') +
          (flowsPing ? FLOWS_ADDENDUM : '') +
          (activityPing ? CONGRESS_ACTIVITY_ADDENDUM : '') +
          (ipoIntent ? IPO_ADDENDUM : '') +
          (resolved &&
          !country &&
          !politician &&
          !industryPing &&
          !ipoIntent &&
          intent !== 'sanctions'
            ? govPing
              ? GOV_EXPOSURE_ADDENDUM
              : COMPANY_ADDENDUM
            : '') +
          DATE_RULES +
          FRESHEST_RULES +
          GROUNDING_RULES +
          (webActive ? '' : NO_WEB_RULES),
      /* The visitor's own words too (Nov 3): "Export controls" alone, with
         China as the resolved subject, read as no question at all, and the
         brief asked the visitor what they meant. */
      user: `Today is ${todayLine()}.\nPing: ${display}${resolvedNote}\nThe visitor asked: "${String(
        asked,
      ).slice(0, 300)}"\n\nSources:\n${sourcesBlock}`,
      maxTokens: useIntel
        ? Math.max(P.briefTokens, 1_400)
        : sanctions
          ? P.briefTokens + P.sanctionsExtraTokens
          : P.briefTokens,
      model: P.model,
      fallbackModel: HAIKU_MODEL,
      /* Inert unless webActive: anthropicSynthesize also gates the tool on
         SONAR_WEB_SEARCH. The intelligence brief reads only the evidence. */
      webSearch: { enabled: webActive && !useIntel, maxUses: webUses },
      deadlineAt: deadline - TAIL_MS,
      minHopMs: P.minHopMs,
      reserveMs: P.hopReserveMs,
    };
    synthesisStartMsLeft = left();
    const synth = await leg(
      'synthesize',
      () => synthesizeWithFallback(groundedArgs),
      (v) => (v.answer ? `answered${v.webUsed ? ' +web' : ''}` : v.degraded || 'no answer'),
      (v) => Boolean(v.answer),
    );
    const sourceTexts = marked.map(
      (it) => `${it.title || ''}. ${String(it.text || it.snippet || '')}`,
    );
    if (useIntel) {
      const checked = validateIntelBrief(parseIntelBrief(synth.answer), {
        allowedTexts: sourceTexts,
        picture: intel.picture,
      });
      if (checked.dropped.length) {
        console.warn('[sonar-pipeline] intel brief validator', {
          ok: checked.ok,
          dropped: checked.dropped.slice(0, 6),
        });
      }
      if (checked.ok) {
        /* The negative-claim guard on the prose fields, no regeneration. */
        const b = checked.brief;
        for (const f of ['answer', 'assessmentLine', 'bottomLine']) {
          if (b[f]) b[f] = (await enforceGrounding(b[f], sourceTexts, null)).text || '';
        }
        if (b.answer) {
          intelBrief = b;
          answer = intelBriefText(b, { label: intel.assessmentLabel });
        }
      }
    } else {
      answer = await guardBrief(synth.answer || null, groundedArgs, synth, sourceTexts);
    }
    if (answer) briefKind = 'model';
    /* country_rank: every number must come from the rank facts and the
       other sources; a brief with an invented figure is replaced by the
       deterministic brief built from the same facts. */
    if (answer && rankPing && rankFactLines.length) {
      const allowed = [
        ...rankFactLines,
        ...marked.map((it) => String(it.text || it.snippet || '')),
      ];
      const bad = unsupportedNumbers(answer, allowed);
      if (bad.length) {
        console.error('[sonar-pipeline] rank brief had unsupported numbers', bad.slice(0, 5));
        const dossierNow = await within(
          dossierP,
          Math.max(0, left() - TAIL_MS),
          null,
          'dossier',
        ).catch(() => null);
        answer = deterministicBrief(dossierNow?.rank?.view, dossierNow?.empire) || answer;
      }
    }
    /* Oct 30 (v2): synthesis that cannot answer in time (or whose every
       sentence the guard removed) no longer costs the ping: the brief is
       the strongest snippets, cited, word for word. */
    /* Nov 6: a country question's fallback opens with the computed direction
       line, then the computed measures, never pasted source text. */
    if (!answer && useIntel) {
      answer = fallbackIntelBrief(intel, {
        direction: directionLine(intel.picture, { place: intel.place, currency: intel.currency }),
      });
      if (answer) briefKind = 'evidence';
    }
    if (!answer) {
      answer = evidenceBrief(subjectLabel, marked);
      if (answer) briefKind = 'evidence';
      if (answer) {
        console.warn('[sonar-pipeline] evidence brief', {
          reason: synth.answer ? 'guard emptied the draft' : synth.degraded || 'no answer',
        });
      }
    }
    grounded = Boolean(answer);
    webUsed = Boolean(synth.webUsed);
    webSources = (synth.webSources?.length ? synth.webSources : newsSources).slice(0, 6);
    providerErrors = synth.providerErrors || [];
  }

  /* The general brief only starts when there is time to finish it.
     Running out here returns no answer, which the route turns into a fast
     502 that does not spend the visitor's ping. */
  /* Never an ungrounded general answer for a country question when the
     dossier or the macro read holds evidence (it would describe the country
     from memory beside cards showing its data). */
  const countryEvidenceHeld = countryQuestion && (intelItems.length > 0 || items.length > 0);
  if (!answer && !countryEvidenceHeld && left() - TAIL_MS > P.generalMinMs) {
    const generalArgs = {
      system: webActive
        ? GENERAL_SYSTEM_PROMPT + lensBlock + DATE_RULES + GROUNDING_RULES
        : FAST_GENERAL_PROMPT + lensBlock + DATE_RULES,
      user: `Today is ${todayLine()}.\nPing: ${display}${resolvedNote}\nThe visitor asked: "${String(
        asked,
      ).slice(0, 300)}"`,
      maxTokens: P.briefTokens,
      model: P.model,
      fallbackModel: HAIKU_MODEL,
      webSearch: { enabled: webActive, maxUses: webUses },
      deadlineAt: deadline - TAIL_MS,
      minHopMs: P.minHopMs,
      reserveMs: P.hopReserveMs,
    };
    const synth = await leg(
      'synthesize-general',
      () => synthesizeWithFallback(generalArgs),
      (v) => (v.answer ? `answered${v.webUsed ? ' +web' : ''}` : v.degraded || 'no answer'),
      (v) => Boolean(v.answer),
    );
    answer = await guardBrief(synth.answer || null, generalArgs, synth, []);
    if (answer) briefKind = 'general';
    grounded = false;
    webUsed = Boolean(synth.webUsed);
    webSources = (synth.webSources || []).slice(0, 6);
    providerErrors = [...providerErrors, ...(synth.providerErrors || [])];
  }

  const usedCorpora = new Set(corporaUsed);
  const sources = corporaSearched
    .map((corpus) => {
      const id = CORPUS_TO_DATASET[corpus];
      const meta = SONAR_DATASETS[id];
      return meta ? { id, label: meta.label, used: usedCorpora.has(corpus) } : null;
    })
    .filter(Boolean);

  /* The brief is the answer; the dossier and the news columns are extras.
     Whatever has not landed by the tail is left off rather than holding the
     response past the function cap. */
  const tailMs = Math.max(0, left() - Math.min(1_500, TAIL_MS));
  const dossier =
    wantDossier && dossierP
      ? await within(dossierP, tailMs, null, 'dossier-tail').catch(() => null)
      : null;
  const newsColumns = columnsP
    ? await within(
        columnsP,
        Math.max(0, left() - Math.min(1_500, TAIL_MS)),
        null,
        'news-tail',
      ).catch(() => null)
    : null;
  if (dossier) dossier.newsColumns = newsColumns;
  /* Nov 6: what the Country & Currency Intelligence card renders. */
  const intelView =
    useIntel && intel?.picture
      ? {
          iso3: intel.iso3,
          /* Nov 6: the flag on the country answer board (public/flags/3x2/<iso2>.svg). */
          iso2: (intel.iso3 && countries.alpha3ToAlpha2(intel.iso3)) || null,
          place: intel.place,
          currency: intel.currency || null,
          focus: (intel.frameworks || []).includes('currency') ? 'FX risk' : 'Macro',
          asOf: new Date().toISOString().slice(0, 10),
          overall: intel.picture.assessment?.overall || null,
          assessmentLabel: intel.assessmentLabel || null,
          brief: intelBrief,
          fallbackText: intelBrief ? null : answer,
          kpis: intel.picture.kpis || [],
          rows: intel.picture.assessment?.overall ? assessmentRows(intel.picture, intelBrief) : [],
          missing: intel.picture.missing || [],
          charts: intel.charts || {},
          /* Nov 7: the computed measures (no long series) for the board's Key findings. */
          metrics: compactMetrics(intel.picture.metrics, { reerBasis: intel.reerBasis || null }),
          transmission: (intel.frameworks || []).includes('currency') ? intel.transmission : null,
          sources: intel.sources || [],
        }
      : null;
  if (dossier && intelView) dossier.intel = intelView;
  /* Nov 4 (v2): what the government-exposure cards render. */
  if (dossier && govPing) {
    dossier.govFocus = true;
    dossier.revenueMix = await within(revenueMixP, 300, null, 'revenue-mix-tail').catch(() => null);
  }

  /* A sanctions brief carries its exposure table as a JSON block. */
  let exposed = [];
  if (answer && sanctions) {
    ({ answer, exposed } = splitExposed(answer));
  }

  /* One line, and it names the leg. A run with no answer logs at error level
     so it surfaces in the runtime error groups without a text search. */
  /* retrieved vs kept is the line that shows the entity filter working: a
     ping whose retrieval was all off-entity reads "retrieved 6, kept 0" and
     routes to the web-backed path instead of citing noise. */
  const summary = JSON.stringify(trace).replace(
    '"leg":"retrieve"',
    `"leg":"retrieve","kept":${items.length}`,
  );
  /* Nov 6: the methodology auditor's deterministic checks on every ping (telemetry). */
  const audit = answer
    ? auditLanding(
        answer,
        items.map((it) => `${it.title || ''} ${it.text || it.snippet || ''}`),
        { markers: Math.min(items.length, P.maxSnippets) },
      )
    : null;
  /* Nov 6: the synthesis-start budget and the total, on the trace line. */
  const timing = {
    lead: leadAnalyst?.id || null,
    audit: audit ? `${audit.passed}/${audit.total}` : null,
    profile: P.id,
    synthesisStartMsLeft,
    totalMs: Date.now() - startedAt,
  };
  if (answer) {
    console.log('[sonar-pipeline] trace', summary, JSON.stringify(timing));
  } else {
    console.error('[sonar-pipeline] trace', summary, JSON.stringify(timing));
  }

  const result = {
    answer,
    grounded,
    briefKind,
    sources,
    relevance: grounded ? relevanceFrom(items, corporaSearched) : flatRelevance(FLOOR_UNGROUNDED),
    webUsed,
    webSources,
    dossier,
    newsColumns,
    intent,
    sanctions: sanctions ? { ...sanctions.panel, exposed } : null,
    classification,
    resolved,
    politician,
    country,
    /* What the UI shows instead of the raw text, plus the corrections and
       ambiguity chips. */
    understood: {
      raw: understood.raw,
      corrected: understood.corrected,
      corrections: understood.corrections,
      display,
      intent: understood.intent,
      metric: understood.metric || null,
      metricExplicit: understood.metricExplicit ?? null,
      entities: understood.entities.map(({ kind, id, label, surface, confidence }) => ({
        kind,
        id,
        label,
        surface,
        confidence,
      })),
      ambiguities: currencyAmbiguous
        ? [
            ...(understood.ambiguities || []),
            {
              surface: currencyAsk.word,
              chosen: `currency:${currencyAsk.word}`,
              alternatives: currencyAsk.candidates
                .map((c) => countryByIso3(c))
                .filter(Boolean)
                .map((c) => ({ kind: 'country', id: c.iso3, label: c.name })),
            },
          ]
        : understood.ambiguities,
    },
    countryIntel: intelView,
    timing,
    industry: industry ? industry.industry.id : null,
    /* Oct 26: what each matched dataset actually contributed, for the
       Sourced matches rows that have no dossier preview (an open question's
       contracts or Echo hits). Same items the brief cites; trimmed. */
    /* Ranked for the ping BEFORE the cut (rankSourcedMatches): a ping about a
       sanctioned jurisdiction leads with US Sanctions, and a late-retrieved
       sanctions row is never sliced off the list. UI order only; the brief
       already read `items`. */
    evidence: rankSourcedMatches(
      items
        .filter((it) => CORPUS_TO_DATASET[it.corpus])
        .map((it) => ({
          ...it,
          dataset: CORPUS_TO_DATASET[it.corpus],
          relevance: it.score ?? it.similarity ?? 0.5,
        })),
      resolveQuery(query),
    )
      .slice(0, 12)
      .map((it) => ({
        dataset: it.dataset,
        title: String(it.title || '').slice(0, 160),
        snippet: String(it.snippet || it.text || '').slice(0, 220),
        url: typeof it.url === 'string' ? it.url : null,
        date: it.date || null,
      })),
    itemCount: items.length,
    retrievedCount: retrieved.length,
    corporaSearched,
    corporaUsed,
    providerErrors,
    /* Leg names only, never messages: safe to return to a client. */
    failedAt: trace.filter((t) => !t.ok).map((t) => t.leg),
  };
  /* A finished, grounded model brief is the answer for every phrasing of
     this question until the TTL runs out. Fire and forget: the write never
     holds the response. */
  if (cacheable && answer && grounded && (briefKind === 'model' || briefKind === 'facts')) {
    cacheSet(cacheKey, result, cacheTtl).catch(() => {});
  }
  return result;
}

/** Salted hash, so the ledger can rate-account an IP without storing one. */
export function hashIp(ip, salt) {
  return crypto.createHash('sha256').update(`snr:${ip}:${salt}`).digest('hex');
}
