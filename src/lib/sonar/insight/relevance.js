/**
 * Evidence relevance (Nov 2026): every retrieved record is classified against the
 * question's analytical intent before it can support a finding.
 *
 *   direct      the right subject and the right entity (or structured data from a dataset
 *               family the question needs)
 *   supporting  the right subject, a related entity or none named
 *   background  the right entity, a generic economic or political subject
 *   irrelevant  shares a keyword or a name and nothing else (a Thanksgiving turkey on a
 *               Turkish lira question, a sneaker launch on a Jordan question)
 *
 * Only direct and supporting records can carry a key finding on their own. Irrelevant
 * records never enter the answer. Pure: entity, subject and sense checks on the record's
 * own text, plus its period against the question's horizon.
 */

/* Subject vocabularies per query family: what a record has to be about. */
const FAMILY_SUBJECT = {
  currency_stress:
    /\b(lira|peso|pound|yen|rupee|rand|real|naira|won|ruble|rouble|currenc\w*|exchange rate|fx|devaluat\w*|depreciat\w*|inflation|cpi|central bank|policy rate|interest rates?|monetary|reserves|current account|bond|yields?|capital (?:flows?|outflows?)|dollari[sz]ation|swap lines?|imf)\b/i,
  commodity_production:
    /\b(produc\w*|output|supply|barrels?|bpd|b\/d|mined?|mining|wells?|rigs?|opec\+?|reserves|exports?|refin\w*|upstream|shale|crude|lng|tonnes?|tons?)\b/i,
  congressional_trading:
    /\b(trades?|trading|stock|shares?|disclos\w*|periodic transaction|ptr|stock act|purchases?|sales?|portfolio)\b/i,
  inflation_trend:
    /\b(inflation|cpi|pce|prices?|consumer prices?|core|disinflation|deflation|fed|central bank|rates?)\b/i,
  government_contracts:
    /\b(contracts?|awards?|obligat\w*|federal|defen[cs]e|pentagon|agency|procurement|government (?:spending|revenue))\b/i,
  lobbying: /\b(lobby\w*|lda|registrant|disclosure|spending|issues?|congress|regulat\w*)\b/i,
  industry_concentration:
    /\b(market share|share|revenue|capacity|foundr\w*|concentrat\w*|dominat\w*|competitors?|leaders?)\b/i,
  valuation_vs_earnings:
    /\b(valuation|p\/e|multiple|earnings|eps|revenue|guidance|market cap\w*|shares?|stock)\b/i,
  sovereign_debt:
    /\b(debt|deficit|borrowing|bonds?|yields?|gdp|fiscal|budget|imf|rating|default)\b/i,
  institutional_flows:
    /\b(13f|holdings?|stake|positions?|funds?|institutional|asset managers?|bought|sold|shares)\b/i,
};

/* Generic economic or political vocabulary: enough for background, not for direct. */
const GENERIC_ECON =
  /\b(econom\w*|government|minister\w*|president|parliament|election|policy|trade|market\w*|investment|bank\w*|budget|gdp|growth|sanctions?|energy|nuclear|industr\w*|compan(?:y|ies)|exports?|imports?|tariffs?)\b/i;

/* Off-domain content that shares words with financial questions. */
const OFF_DOMAIN =
  /\b(thanksgiving|recipes?|roast(?:ed|ing)?|stuffing|gravy|side dish(?:es)?|sides|gobble|butterball|turkey (?:day|dinner|trot|takeover|drive|giveaway|hunt\w*)|wild turkeys?|hunting season|sneakers?|air jordans?|nba|nfl|mlb|super bowl|playoffs?|touchdowns?|box office|celebrity|horoscope|fashion week|red carpet|wedding|obituar\w*|weather forecast|county fair)\b/i;

/* Country names that are also common words or other places. A record must use them as the
   country (a capital, a demonym, a national institution) to count as naming it. */
const AMBIGUOUS_COUNTRY = {
  turkey: /\b(türkiye|turkiye|turkish|ankara|istanbul|erdogan|erdoğan|lira|tcmb|cbrt)\b/i,
  jordan: /\b(jordanian|amman|hashemite|king abdullah)\b/i,
  georgia: /\b(georgian|tbilisi|lari)\b/i,
  chad: /\b(chadian|n'djamena|ndjamena)\b/i,
  guinea: /\b(guinean|conakry)\b/i,
  niger: /\b(nigerien|niamey)\b/i,
  china: /\b(chinese|beijing|yuan|renminbi|pboc|xi jinping)\b/i,
  jersey: /\b(st helier|channel islands)\b/i,
};

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function namesEntity(text, entity) {
  const label = String(entity?.label || '').trim();
  if (!label) return false;
  /* The country's own name in its other forms (Türkiye, Turkish, Ankara) counts. */
  const alias = AMBIGUOUS_COUNTRY[label.toLowerCase()];
  if (alias && alias.test(text)) return true;
  const re = new RegExp(`\\b${esc(label)}\\b`, 'i');
  const hit =
    re.test(text) || (entity.id && new RegExp(`\\b${esc(String(entity.id))}\\b`).test(text));
  if (!hit) return false;
  const amb = AMBIGUOUS_COUNTRY[label.toLowerCase()];
  /* "Turkey" capitalised mid-sentence next to a national cue is the country; a lone
     "turkey" (or "Hometown Turkey Takeover") is not. */
  if (amb)
    return (
      amb.test(text) ||
      /\bTurkey'?s (?:economy|central bank|government|inflation|lira|exports?|president)\b/.test(
        text,
      )
    );
  return true;
}

function subjectRe(intent) {
  const fam = intent?.family ? FAMILY_SUBJECT[intent.family] : null;
  if (fam) return fam;
  const terms = (intent?.focusTerms || []).filter(
    (t) => !(intent?.geography || []).some((g) => g.toLowerCase().includes(t)),
  );
  return terms.length ? new RegExp(`\\b(${terms.map(esc).join('|')})\\w*`, 'i') : null;
}

/**
 * Classify one evidence record (engine evidence or a news item).
 * -> { relevance: 'direct'|'supporting'|'background'|'irrelevant', reasons: string[] }
 */
export function classifyEvidence(e, intent) {
  const text = [e?.title, e?.text, e?.summary, e?.snippet, e?.description]
    .filter(Boolean)
    .join(' ')
    .slice(0, 1500);
  const reasons = [];
  /* Structured data from a family the question needs is direct by construction. */
  const fam = e?.data?.family;
  if (fam && (intent?.datasetFamilies || []).includes(fam))
    return { relevance: 'direct', reasons: ['dataset_family'] };

  const entities = (intent?.entities || []).filter((x) =>
    [
      'country',
      'state_province',
      'ticker',
      'company',
      'person_politician',
      'fund',
      'commodity',
    ].includes(x.kind),
  );
  /* Dataset records (structured data, Ezana sources) are tagged with their entities by the
     dataset itself, so the tag counts even for an ambiguous name, and such a record is
     never dropped as irrelevant: at worst it is background. Free text (news, web) has to
     use the name as the country. */
  const structured =
    Boolean(e?.data) ||
    e?.kind === 'series' ||
    e?.kind === 'aggregate' ||
    Boolean(e?.source && !['news', 'web', 'web_search'].includes(e.source));
  const tagged = (x) =>
    (e?.entities || []).some(
      (n) =>
        String(n).toLowerCase() === String(x.label).toLowerCase() &&
        (structured || !AMBIGUOUS_COUNTRY[String(x.label).toLowerCase()]),
    );
  const named = entities.length ? entities.some((x) => namesEntity(text, x) || tagged(x)) : null;
  const sre = subjectRe(intent);
  const subject = sre ? sre.test(text) : null;
  const off = OFF_DOMAIN.test(text);
  if (off) reasons.push('off_domain');
  if (named === false) reasons.push('entity_absent');
  if (subject === false) reasons.push('subject_absent');

  if (off && !subject) return { relevance: 'irrelevant', reasons };
  if (named !== false && subject) return { relevance: named ? 'direct' : 'supporting', reasons };
  if (named === false && subject) return { relevance: 'supporting', reasons };
  if (named && GENERIC_ECON.test(text))
    return { relevance: 'background', reasons: [...reasons, 'generic_subject'] };
  if (named) return { relevance: off ? 'irrelevant' : 'background', reasons };
  /* Neither the entity nor the subject: kept only when the question names neither. */
  if (structured && !off)
    return { relevance: 'background', reasons: [...reasons, 'dataset_record'] };
  return {
    relevance: entities.length || sre ? 'irrelevant' : 'background',
    reasons,
  };
}

/** True when the record's period ends well before the question's horizon starts. */
export function outsideHorizon(e, intent, now = new Date()) {
  const months = intent?.horizon?.kind === 'trailing' ? intent.horizon.months : null;
  if (!months) return false;
  const p = String(e?.period?.to || e?.period?.label || e?.date || '');
  const m = /(\d{4})(?:-(\d{2}))?/.exec(p);
  if (!m) return false;
  const end = new Date(Date.UTC(Number(m[1]), m[2] ? Number(m[2]) - 1 : 11, 28));
  const start = new Date(now);
  start.setUTCMonth(start.getUTCMonth() - months - 6);
  return end < start;
}

/**
 * Tag every record and drop the irrelevant ones.
 * -> { kept: [record + { relevance, relevanceReasons, outsideHorizon }], dropped: [...] }
 */
export function gateEvidence(items = [], intent, { now = new Date() } = {}) {
  const kept = [];
  const dropped = [];
  for (const e of items || []) {
    const c = classifyEvidence(e, intent);
    const tagged = {
      ...e,
      relevance: c.relevance,
      relevanceReasons: c.reasons,
      outsideHorizon: outsideHorizon(e, intent, now),
    };
    (c.relevance === 'irrelevant' ? dropped : kept).push(tagged);
  }
  return { kept, dropped };
}

/** News items for a country ping's rail: the irrelevant ones removed, order kept. */
export function gateCountryNews(items = [], intent) {
  return (items || []).filter((n) => classifyEvidence(n, intent).relevance !== 'irrelevant');
}

/** How much a relevance class can carry a finding (used by the insight selector). */
export const RELEVANCE_WEIGHT = { direct: 1, supporting: 0.8, background: 0.35, irrelevant: 0 };
