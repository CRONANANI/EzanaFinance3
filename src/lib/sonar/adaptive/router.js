/**
 * Sonar adaptive research: the router (Nov 2026).
 *
 * Turns a question, and the thread it was asked in, into a ResearchPlan: the
 * lead scenario and up to three supporting ones, the entities, the evidence
 * the scenario must have, the numbers code will compute, the analysts who
 * work it, and the order its sections appear in.
 *
 * It sits on top of the existing layers and replaces none of them:
 * company-mentions.js names companies, research-spec.js gives the time
 * horizon, and the analysts come from the registry by id. The existing
 * research-mode classifier still decides quick, standard or deep for every
 * ping this router does not take.
 *
 * Scoring: every profile's triggers are tried and their weights summed, with
 * a bonus when the entities the profile needs are present. The highest total
 * leads. Reasons, the runner-up and the confidence are kept on the plan so a
 * route can be explained.
 *
 * Pure and deterministic. No I/O.
 */
import { geoIntent } from './geo-economic';
import { fxIntent } from './fx-pressure';
import { explainerIntent } from './explainer';
import { planPresentation } from './presentation-families';
import { mentionedCompanies } from '@/lib/sonar/company-mentions';
import { timeHorizonOf } from '@/lib/sonar/engine/research-spec';
import { ANALYSTS } from '@/lib/sonar/analysts/registry';
import { SCENARIOS, SCENARIO_BY_ID, PROFILE_VERSION } from './profiles';
import { countryOf } from './country-ref';
import { planControls, sourcesAllow, FOCUS_BIAS } from './controls-plan';
import { rankingOf } from './company-metrics';
import { commodityIdOf } from './series-metrics';
import { resolveReferences, personFromText } from './thread-context';

const PLAN_VERSION = 'arie-plan-v1';

/* All-caps words that are never a ticker in a question. */
const NOT_TICKERS = new Set(
  `CEO CFO COO CTO RSI MACD SMA EMA ATR AI ETF US USA UK EU EM FX IPS LNG OPEC IMF FED FOMC ECB BOE BOJ
   GDP CPI SEC FTC DOJ OFAC BIS SDN IPO FCF PE EV EPS IC PM NO YES AND OR THE FOR NOT VS Q1 Q2 Q3 Q4 FY
   BTC ETH SOL XRP WTI II III IV NATO GPU API SOXX DCF ESG`.split(/\s+/),
);
const CRYPTO = { bitcoin: 'BTC', btc: 'BTC', ethereum: 'ETH', eth: 'ETH', solana: 'SOL' };

const BUDGETS = {
  quick: { totalMs: 12_000, providerCalls: 4 },
  standard: { totalMs: 40_000, providerCalls: 10 },
  deep: { totalMs: 240_000, providerCalls: 40 },
};

const VISUAL = new Set([
  'price_comparison',
  'ohlcv_technical',
  'forecast_market',
  'ranking',
  'macro_timeseries',
  'heatmap',
  'impact_network',
  'sector_exposure',
  'valuation',
  'fundamentals',
]);

/** Companies, tickers, people and crypto assets a question names. */
function extractEntities(text, refs = {}) {
  const entities = [];
  const seen = new Set();
  const add = (e) => {
    if (seen.has(e.id)) return;
    seen.add(e.id);
    entities.push(e);
  };
  for (const c of mentionedCompanies(text) || []) {
    const ticker = c.ticker || c[1] || null;
    const label = c.name || c.label || c[2] || ticker;
    if (ticker) add({ id: `company:${ticker}`, type: 'company', label, ticker });
  }
  for (const m of String(text).matchAll(
    /(?:^|[^A-Za-z])\$?([A-Z]{2,5})(?:[’']s)?(?=[^A-Za-z]|$)/g,
  )) {
    const t = m[1];
    if (NOT_TICKERS.has(t)) continue;
    add({ id: `company:${t}`, type: 'company', label: t, ticker: t });
  }
  /* A ticker typed in lower case right beside a chart word ("is nvda oversold"). */
  const lower = String(text).match(
    /\b([a-z]{2,5})\b\s+(?:is\s+|looks?\s+|stock\s+)?(?:technically\s+)?(?:oversold|overbought|rsi|macd|breaking)\b/,
  );
  if (
    lower &&
    !NOT_TICKERS.has(lower[1].toUpperCase()) &&
    !/^(is|it|are|the|this|that|stock|looks?|now|so|too|very)$/.test(lower[1])
  ) {
    const t = lower[1].toUpperCase();
    add({ id: `company:${t}`, type: 'company', label: t, ticker: t });
  }
  for (const [word, sym] of Object.entries(CRYPTO)) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(text)) {
      add({ id: `crypto:${sym}`, type: 'crypto', label: sym });
    }
  }
  if (refs.ticker && !entities.some((e) => e.type === 'company')) {
    add({
      id: `company:${refs.ticker}`,
      type: 'company',
      label: refs.subject || refs.ticker,
      ticker: refs.ticker,
    });
  }
  const person = refs.person || personFromText(text);
  if (person)
    add({
      id: `person:${person.toLowerCase().replace(/\s+/g, '-')}`,
      type: 'person',
      label: person,
    });
  return entities;
}

function scoreProfile(profile, text, entities) {
  let score = 0;
  const reasons = [];
  for (const [re, weight] of profile.triggers) {
    const m = text.match(re);
    if (!m) continue;
    score += weight;
    reasons.push(`${profile.id} +${weight}: "${m[0].slice(0, 48)}"`);
  }
  if (!score) return { score: 0, reasons };
  const hasCompany = entities.some((e) => e.type === 'company');
  const hasPerson = entities.some((e) => e.type === 'person');
  /* A profile about a security or a person is a better fit when one is named. */
  if (profile.id === 'B01' && (hasCompany || entities.some((e) => e.type === 'crypto'))) score += 1;
  if (profile.id === 'A02' && (hasPerson || hasCompany)) score += 1;
  if (profile.id === 'A05' && hasCompany) score += 1;
  if (profile.id === 'A01' && hasPerson) score += 0.5;
  return { score, reasons };
}

/**
 * The ResearchPlan for a question.
 *
 * @param {string} question
 * @param {{ thread?: object, depth?: 'quick'|'standard'|'deep', now?: Date, orgId?: string|null,
 *   audience?: string }} [opts]
 */
export function planAdaptive(question, opts = {}) {
  const {
    thread = null,
    depth = 'standard',
    now = new Date(),
    orgId = null,
    audience = 'retail',
    controls: rawControls = null,
  } = opts;
  const controls = planControls(rawControls);
  const lean = new Set(controls ? FOCUS_BIAS[controls.focus] || [] : []);
  const original = String(question || '').trim();
  const refs = resolveReferences(original, thread);
  const text = refs.resolvedQuestion;
  const entities = extractEntities(text, refs);

  const scored = SCENARIOS.map((profile) => ({ profile, ...scoreProfile(profile, text, entities) }))
    .filter((s) => s.score > 0)
    /* A focus tips between scenarios that already match; it never makes one match. */
    .map((s) =>
      lean.has(s.profile.id)
        ? {
            ...s,
            score: s.score + 1,
            reasons: [...s.reasons, `${s.profile.id} +1: focus ${controls.focus}`],
          }
        : s,
    )
    .sort((a, b) => b.score - a.score || a.profile.id.localeCompare(b.profile.id));

  /* A question about how a geopolitical event reaches an economy is A08's geo-economic
     analysis, whatever single word scored highest ("economy" alone must not open the country
     dashboard). A company question stays with its own scenario. */
  const geo = geoIntent(text, {
    thread,
    hasCompany: entities.some((e) => e.type === 'company'),
  });
  if (geo && scored[0]?.profile.id !== 'A08') {
    const a08 = SCENARIOS.find((s) => s.id === 'A08');
    const rest = scored.filter((s) => s.profile.id !== 'A08');
    scored.splice(
      0,
      scored.length,
      {
        profile: a08,
        score: (rest[0]?.score || 0) + 2,
        reasons: [`A08: geo-economic impact (focus ${geo.focus})`],
      },
      ...rest,
    );
  }

  /* Nov 17: a one-country currency-pressure question ("is turkeys lira under pressure?",
     "how resilient are Brazil's reserves?") is C01's currency-pressure strategy
     (fx-pressure.js). A geo-economic event question, a company question, a same-day move or
     a comparison keeps its own route (fxIntent returns null for those). */
  const fx = geo
    ? null
    : fxIntent(text, { thread, hasCompany: entities.some((e) => e.type === 'company') });
  if (fx && scored[0]?.profile.id !== 'C01') {
    const c01 = SCENARIOS.find((s) => s.id === 'C01');
    const rest = scored.filter((s) => s.profile.id !== 'C01');
    scored.splice(
      0,
      scored.length,
      {
        profile: c01,
        score: (rest[0]?.score || 0) + 2,
        reasons: [`C01: currency pressure (focus ${fx.focus})`],
      },
      ...rest,
    );
  }

  /* Nov 18: a definitional question a reviewed glossary entry covers ("What is the difference
     between nominal and real interest rates?") presents as a financial explainer, on the
     entry's scenario. A named country or company keeps the research route. */
  const explainer =
    geo || fx
      ? null
      : explainerIntent(text, { hasCompany: entities.some((e) => e.type === 'company') });
  if (explainer && scored[0]?.profile.id !== explainer.scenario) {
    const host = SCENARIOS.find((s) => s.id === explainer.scenario);
    const rest = scored.filter((s) => s.profile.id !== explainer.scenario);
    if (host)
      scored.splice(
        0,
        scored.length,
        {
          profile: host,
          score: (rest[0]?.score || 0) + 2,
          reasons: [`${explainer.scenario}: financial explainer (${explainer.entry})`],
        },
        ...rest,
      );
  }

  const top = scored[0] || null;
  const second = scored[1] || null;
  const confidence = top
    ? Number((top.score / (top.score + (second?.score || 0) + 1)).toFixed(3))
    : 0;
  const primary = top?.profile || null;
  const supporting = scored
    .slice(1)
    .filter((s) => s.score >= Math.max(2, (top?.score || 0) * 0.4))
    .slice(0, 3)
    .map((s) => s.profile.id);

  const horizon = timeHorizonOf(text, now);
  const routeReasons = scored.slice(0, 4).flatMap((s) => s.reasons);
  const excludedSources = [];
  const missing = [];

  const company = entities.find((e) => e.type === 'company') || null;
  const person = entities.find((e) => e.type === 'person') || null;

  let executable = Boolean(primary?.executable) && !primary.overlay;
  let needsDisambiguation = false;
  if (refs.unresolved.length) {
    needsDisambiguation = true;
    executable = false;
    missing.push(`reference not resolved: ${refs.unresolved.join(', ')}`);
  }
  if (primary?.id === 'B01' && !company?.ticker) {
    executable = false;
    missing.push('no listed security named: daily bars need a ticker');
  }
  /* Disclosed transactions: a named member, a listed company, or Congress as a whole. */
  if (
    primary?.id === 'B07' &&
    !person &&
    !company?.ticker &&
    !/\b(congress|senat|house|politician|lawmaker|members?)\b/i.test(text)
  ) {
    executable = false;
    missing.push('no member, company or chamber named');
  }
  if (['C01', 'C04', 'C05'].includes(primary?.id) && !countryOf(text) && !(primary?.id === 'C01' && fx) && !(explainer && primary?.id === explainer.scenario)) {
    executable = false;
    missing.push('no country named: this pipeline reads one country’s series');
  }
  if (primary?.id === 'C03' && !commodityIdOf(text)) {
    executable = false;
    missing.push('no commodity Sonar holds a price series for');
  }
  if (primary?.id === 'C08' && !company && !person && !countryOf(text)) {
    executable = false;
    missing.push('no entity to match a contract against');
  }
  const tickers = entities.filter((e) => e.type === 'company' && e.ticker).length;
  if (primary?.id === 'B09' && !tickers && !/\b(sectors?|industr|asset)/i.test(text)) {
    executable = false;
    missing.push('no securities, sectors or asset classes named to compare');
  }
  if (primary?.id === 'C07' && !entities.some((e) => e.type === 'crypto')) {
    executable = false;
    missing.push('no crypto asset Sonar holds prices for');
  }
  if (
    primary?.id === 'C06' &&
    !company &&
    !countryOf(text) &&
    !/\b(affect|on|against)\s+[A-Z]/.test(text)
  ) {
    executable = false;
    missing.push('no entity or country named to search the lists for');
  }
  if (['A01', 'A06'].includes(primary?.id) && !company && !person) {
    executable = false;
    needsDisambiguation = true;
    missing.push('no company or person named');
  }
  if (
    ['B02', 'B03', 'B05', 'B06', 'A04', 'B04', 'B08', 'B10', 'A09'].includes(primary?.id) &&
    !company?.ticker
  ) {
    executable = false;
    missing.push('no listed company named: this pipeline reads one company’s records');
  }
  if (primary?.id === 'C02' && !rankingOf(text)) {
    executable = false;
    missing.push('not a measure Sonar ranks from stored series');
  }
  if (primary?.id === 'A05' && !company?.ticker) {
    executable = false;
    missing.push('no listed security named: a move is measured from daily bars');
  }
  if (primary?.id === 'A03' && !company && !person) {
    executable = false;
    needsDisambiguation = true;
    missing.push('no company or person named');
  }
  if (primary?.id === 'A02' && !company && !person) {
    executable = false;
    needsDisambiguation = true;
    missing.push('no company or person named');
  }
  if (executable && controls && !sourcesAllow(primary.id, controls.sources)) {
    executable = false;
    missing.push(
      `data sources narrowed to ${controls.sources}: this scenario's evidence is outside it`,
    );
  }
  /* A lead the triggers barely separate from its runner-up is not confident enough to
     take the ping away from the existing classifier. */
  if (executable && confidence < 0.42) {
    executable = false;
    missing.push(`low routing confidence (${confidence})`);
  }
  const requiresOrg = Boolean(
    primary?.requiresOrg || supporting.some((id) => SCENARIO_BY_ID[id].requiresOrg),
  );
  if (requiresOrg && !orgId)
    excludedSources.push('org_positions', 'org_ips', 'org_pitches', 'org_research');

  const analysts = primary
    ? [...new Set([...(primary.analysts || []), ...(primary.supportingAnalysts || [])])].filter(
        (id) => ANALYSTS[id],
      )
    : [];

  const layout = primary ? primary.layout : [];
  const planned = {
    version: PLAN_VERSION,
    profiles: PROFILE_VERSION,
    originalQuestion: original,
    resolvedQuestion: text,
    parentContext: refs.usedThread
      ? { question: String(thread?.question || '').slice(0, 300), usedFor: ['references'] }
      : null,
    entities,
    objective: primary?.objective || null,
    primaryScenario: primary?.id || null,
    geo: primary?.id === 'A08' && geo ? geo : null,
    fx: primary?.id === 'C01' && fx ? fx : null,
    explainer: explainer && primary?.id === explainer.scenario ? explainer : null,
    primaryKey: primary?.key || null,
    supportingScenarios: supporting,
    depth,
    audience,
    timeHorizon: { ...horizon, asOf: now.toISOString().slice(0, 10), tz: 'UTC' },
    uncertainty: primary?.uncertainty || 'mixed',
    requiredEvidence: primary?.evidence || [],
    optionalEvidence: primary?.optional || [],
    specialistAssignments: analysts,
    leadAnalyst: analysts[0] || null,
    requiredComputations: primary?.computations || [],
    visualCandidates: layout.filter((t) => VISUAL.has(t)),
    componentOrder: layout,
    leadSection: primary?.lead || null,
    budgets: BUDGETS[depth] || BUDGETS.standard,
    confidence,
    executable,
    controls,
    needsDisambiguation,
    requiresOrg,
    audit: { routeReasons, excludedSources, missing, runnerUp: second?.profile.id || null },
  };
  /* Nov 18: the presentation family the plan proposes (presentation-families.js); the report
     confirms it against the sections that came back. */
  planned.presentation = planPresentation(planned, text);
  return planned;
}
