/**
 * understandQuery(raw, opts): the layer every Sonar ping passes through
 * before routing (sonar-query-understanding-industry-layout.md, Part A).
 * Downstream code uses its output (intent, entities, display), never the raw
 * string. Deterministic first (normalise, spell pass, phrase pass, token pass
 * with the ticker guard, intent rules, display string); an optional fast LLM
 * call (SONAR_UNDERSTAND_MODEL, 1200 ms cap) may only fill an intent the
 * rules left open. It can never override a cued ticker or a >= 0.9 geo.
 */
import { correct } from '@/lib/sonar/understand/spell';
import { resolveToken } from '@/lib/sonar/understand/entities';
import { COUNTRIES } from '@/lib/sonar/understand/geo-codes';
import {
  INDUSTRIES,
  LAYOUT_WORDS,
  METRIC_LABEL,
  RANK_CUE,
  rankMetricOf,
  POLICIES,
  SECTORS,
  THEMES,
} from '@/lib/sonar/understand/lexicons';
import { EXAMPLES } from '@/lib/sonar/understand/examples';
import { callUnderstandModel } from '@/lib/sonar/understand/llm';

export { EXAMPLES };

export const INTENTS = [
  'industry_layout',
  'industry_country',
  'company',
  'ticker_lookup',
  'politician',
  'fund',
  'country',
  'policy',
  'ranking',
  'country_rank',
  'comparison',
  'theme',
  'commodity',
  'event',
  'open_question',
];

export function normalise(raw) {
  return (
    String(raw || '')
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/** Tokens keep $TICKER, dotted abbreviations (U.S.) and quoted phrases whole. */
export function tokenize(text) {
  return normalise(text).match(/"[^"]*"|\$?[A-Za-z0-9][\w.&'-]*/g) || [];
}

/* ── phrase pass: multi-word entities consume their tokens ─────────── */

function phraseEntities(tokens) {
  const lower = tokens.map((t) => t.toLowerCase());
  const consumed = new Set();
  const out = [];
  const text = tokens.join(' ');
  const claim = (words, entity) => {
    const n = words.length;
    for (let i = 0; i + n <= lower.length; i += 1) {
      if (words.every((w, k) => lower[i + k] === w)) {
        let free = true;
        for (let k = 0; k < n; k += 1) if (consumed.has(i + k)) free = false;
        if (!free) continue;
        for (let k = 0; k < n; k += 1) consumed.add(i + k);
        const prefix = `${tokens.slice(0, i).join(' ')} `;
        out.push({ ...entity, surface: tokens.slice(i, i + n).join(' '), prefix });
        return true;
      }
    }
    return false;
  };
  for (const s of SECTORS) {
    for (const re of s.phrases) {
      const m = re.exec(text);
      if (m) {
        claim(m[0].toLowerCase().split(/\s+/), {
          kind: 'sector',
          id: s.id,
          label: s.label,
          confidence: 0.95,
        });
        break;
      }
    }
  }
  for (const p of POLICIES) {
    const m = p.phrase.exec(text);
    if (m)
      claim(m[0].toLowerCase().split(/\s+/), {
        kind: 'policy',
        id: p.id,
        label: p.label,
        confidence: 0.95,
      });
  }
  for (const t of THEMES) {
    const m = t.phrase?.exec(text);
    if (m)
      claim(m[0].toLowerCase().split(/\s+/), {
        kind: 'theme',
        id: t.id,
        label: t.label,
        confidence: 0.9,
      });
  }
  for (const ind of INDUSTRIES) {
    for (const syn of ind.synonyms.filter((s) => s.includes(' '))) {
      if (
        claim(syn.split(/\s+/), {
          kind: 'industry',
          id: ind.id,
          label: ind.label,
          noun: ind.noun,
          confidence: 0.9,
        })
      )
        break;
    }
  }
  for (const [iso2, , label, aliases, takesThe] of COUNTRIES) {
    for (const alias of [label.toLowerCase(), ...aliases].filter((a) => a.includes(' '))) {
      if (
        claim(alias.split(/\s+/), { kind: 'country', id: iso2, label, takesThe, confidence: 0.9 })
      )
        break;
    }
  }
  return { entities: out, consumed };
}

/* ── intent and display ─────────────────────────────────────────────── */

const the = (e) => (e?.takesThe ? 'the ' : '');
const inPlace = (country) => (country ? ` in ${the(country)}${country.label}` : '');

const ECONOMY_WORDS = /\b(econom(y|ies)|gdp|ppp|per capita)\b/i;

function pickIntent(text, entities) {
  const has = (k) => entities.find((e) => e.kind === k) || null;
  const tickers = entities.filter((e) => e.kind === 'ticker');
  const countries = entities.filter((e) => e.kind === 'country');
  if (/\s(vs\.?|versus)\s/i.test(text) || /^compare\b/i.test(text)) return 'comparison';
  /* "is india bigger than japan's economy" */
  if (countries.length >= 2 && /\b(bigger|larger|smaller|richer|poorer) than\b/i.test(text))
    return 'comparison';
  if (/^\s*(top|biggest|largest)\b/i.test(text)) return 'ranking';
  /* A country plus a rank cue: "what ranking is india in the world economy". */
  if (countries.length === 1 && !has('industry') && RANK_CUE.test(text)) return 'country_rank';
  /* "fastest growing economies", "richest countries" */
  if (
    !countries.length &&
    /\b(fastest|slowest|richest|poorest|largest|biggest)\b/i.test(text) &&
    /\b(econom(y|ies)|countries|nations)\b/i.test(text)
  )
    return 'ranking';
  if (has('person_politician')) return 'politician';
  if (has('policy')) return 'policy';
  if (has('industry') && LAYOUT_WORDS.test(text)) return 'industry_layout';
  if (has('industry') && (has('country') || has('state_province'))) return 'industry_country';
  /* A bare industry ("semiconductors", "the steel industry") is a layout;
     an industry inside a longer question ("what is happening with oil
     prices") stays an open question that carries the industry's terms. */
  if (
    (has('industry') || has('sector')) &&
    (/\b(industry|industries|sector|sectors)\b/i.test(text) || tokenize(text).length <= 3)
  ) {
    return 'industry_layout';
  }
  if (has('theme')) return 'theme';
  if (tickers.length && /\b(13f|holders|holdings|fund)\b/i.test(text)) return 'fund';
  if (tickers.length === 1 && tokenize(text).length <= 2) return 'ticker_lookup';
  if (tickers.length) return 'company';
  if (has('country')) return 'country';
  return 'open_question';
}

function buildDisplay(intent, entities, corrected) {
  const get = (k) => entities.find((e) => e.kind === k) || null;
  const industry = get('industry');
  const sector = get('sector');
  const country = get('country') || get('state_province');
  const tickers = entities.filter((e) => e.kind === 'ticker');
  switch (intent) {
    case 'industry_layout':
    case 'industry_country':
      if (industry) return `${industry.noun || industry.label} industry${inPlace(country)}`;
      if (sector) return `${sector.label} sector${inPlace(country)}`;
      break;
    case 'country_rank': {
      const { metric, metricExplicit } = rankMetricOf(corrected);
      const who = country ? `${the(country) ? 'The ' : ''}${country.label}` : 'The country';
      const poss = /s$/i.test(who) ? `${who}'` : `${who}'s`;
      if (metric === 'lighthouse_composite') return `${who} on the Global Empire ranking`;
      return metricExplicit
        ? `${poss} rank by ${METRIC_LABEL[metric]}`
        : `${poss} rank in the world economy`;
    }
    case 'ranking': {
      const n = (/\b(\d{1,3})\b/.exec(corrected) || [])[1] || '10';
      if (!industry && ECONOMY_WORDS.test(corrected) && /\btop\b/i.test(corrected)) {
        const { metric, metricExplicit } = rankMetricOf(corrected);
        return `Top ${n} economies${metricExplicit ? ` by ${METRIC_LABEL[metric]}` : ''}`;
      }
      if (!industry && /\bfastest\b/i.test(corrected) && ECONOMY_WORDS.test(corrected))
        return 'Fastest-growing economies';
      if (industry)
        return `Top ${n} ${(industry.noun || industry.label).toLowerCase()} companies${inPlace(country)}`;
      break;
    }
    case 'comparison':
      if (tickers.length >= 2) return `${tickers[0].id} vs ${tickers[1].id}`;
      {
        const cs = entities.filter((e) => e.kind === 'country');
        if (cs.length >= 2 && ECONOMY_WORDS.test(corrected))
          return `${cs[0].label} vs ${cs[1].label}: economy size`;
      }
      break;
    case 'politician':
      return get('person_politician').label;
    case 'ticker_lookup':
    case 'company':
    case 'fund':
      if (tickers[0]) return `${tickers[0].label} (${tickers[0].id})`;
      break;
    case 'policy':
      return get('policy').label;
    case 'theme':
      return `${get('theme').label}${inPlace(country)}`;
    case 'country':
      return country.label;
    default:
      break;
  }
  const s = normalise(corrected);
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/** The deterministic understanding: no I/O, unit tested. */
export function understandDeterministic(raw, { noCorrect = false, tickerName = null } = {}) {
  const rawTokens = tokenize(raw);
  const spell = noCorrect
    ? { tokens: rawTokens, corrections: [], readings: [] }
    : correct(rawTokens);
  const tokens = spell.tokens;
  /* Readings (a demonym read as its place) rewrite the working text exactly
     like corrections, so intent and display are unchanged, but only real
     corrections are reported to the UI's "Showing results for" notice. */
  const rewrites = [...spell.corrections, ...(spell.readings || [])];
  const corrected = rewrites.length
    ? rewrites.reduce(
        (s, c) =>
          s.replace(new RegExp(`\\b${c.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`), c.to),
        normalise(raw),
      )
    : normalise(raw);

  const { entities: phrased, consumed } = phraseEntities(tokens);
  const tokenEntities = [];
  tokens.forEach((_, i) => {
    if (consumed.has(i)) return;
    const e = resolveToken(tokens, i, { tickerName });
    if (e) tokenEntities.push(e);
  });

  /* One entity per id, the highest confidence. */
  const byKey = new Map();
  for (const e of [...phrased, ...tokenEntities]) {
    const k = `${e.kind}:${e.id}`;
    if (!byKey.has(k) || byKey.get(k).confidence < e.confidence) byKey.set(k, e);
  }
  const entities = [...byKey.values()].map((e) => ({
    kind: e.kind,
    id: e.id,
    label: e.label,
    surface: e.surface,
    confidence: e.confidence,
    ...(e.noun ? { noun: e.noun } : {}),
    ...(e.takesThe ? { takesThe: true } : {}),
    ...(e.alternatives?.length ? { alternatives: e.alternatives } : {}),
  }));

  const intent = pickIntent(corrected, entities);
  const ambiguities = entities
    .filter((e) => e.alternatives?.length)
    .map((e) => ({
      surface: e.surface,
      chosen: `${e.kind}:${e.id}`,
      alternatives: e.alternatives,
    }));

  const macro =
    intent === 'country_rank' ||
    ((intent === 'ranking' || intent === 'comparison') && ECONOMY_WORDS.test(corrected))
      ? rankMetricOf(corrected)
      : null;

  return {
    raw: normalise(raw),
    corrected,
    corrections: spell.corrections,
    display: buildDisplay(intent, entities, corrected),
    intent,
    entities,
    ambiguities,
    ...(macro ? { metric: macro.metric, metricExplicit: macro.metricExplicit } : {}),
  };
}

/**
 * The full understanding. `force` pins one entity (an ambiguity chip
 * re-ping): it replaces whatever was chosen for the same surface.
 */
export async function understandQuery(raw, opts = {}) {
  const base = understandDeterministic(raw, opts);
  let out = base;
  if (opts.force?.kind && opts.force?.id) {
    const forced = { ...opts.force, confidence: 1 };
    const entities = [
      forced,
      ...base.entities.filter(
        (e) =>
          e.surface?.replace(/^\$/, '') !== String(opts.force.surface || '').replace(/^\$/, ''),
      ),
    ];
    const intent = pickIntent(base.corrected, entities);
    out = {
      ...base,
      entities,
      intent,
      display: buildDisplay(intent, entities, base.corrected),
      ambiguities: [],
    };
  }
  if (out.intent === 'open_question' && process.env.SONAR_UNDERSTAND_MODEL) {
    const llm = await callUnderstandModel(out).catch(() => null);
    if (llm && INTENTS.includes(llm.intent) && llm.intent !== 'open_question') {
      out = { ...out, intent: llm.intent, display: llm.display || out.display, llmUsed: true };
    }
  }
  return out;
}
