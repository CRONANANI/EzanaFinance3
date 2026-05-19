import {
  POSITIVE_WORDS,
  NEGATIVE_WORDS,
  UNCERTAINTY_WORDS,
  LITIGIOUS_WORDS,
  EVASIVE_PHRASES,
} from './lexicon';

/**
 * @typedef {object} AnalysisResult
 * @property {number} wordCount
 * @property {number} positiveCount
 * @property {number} negativeCount
 * @property {number} uncertaintyCount
 * @property {number} litigiousCount
 * @property {number} sentimentScore
 * @property {number} confidenceScore
 * @property {number} uncertaintyScore
 * @property {number} litigiousScore
 * @property {number} preparedRemarksSentiment
 * @property {number} qaSentiment
 * @property {number} qaEvasivenessScore
 * @property {Array<{ topic: string; mentions: number }>} topTopics
 */

/**
 * @param {string} content
 * @returns {{ prepared: string; qa: string }}
 */
function splitSections(content) {
  if (!content || typeof content !== 'string') {
    return { prepared: '', qa: '' };
  }
  const qaStartPatterns = [
    /we[''']ll now (?:take|begin|open) .{0,50}questions?/i,
    /we[''']ll (?:now )?open (?:up |it |the line )?for questions?/i,
    /first question comes? from/i,
    /q-and-a session/i,
    /question.{0,5}answer session/i,
  ];

  for (const pattern of qaStartPatterns) {
    const match = content.match(pattern);
    if (match && match.index !== undefined) {
      return {
        prepared: content.slice(0, match.index),
        qa: content.slice(match.index),
      };
    }
  }

  const split = Math.floor(content.length * 0.4);
  return {
    prepared: content.slice(0, split),
    qa: content.slice(split),
  };
}

/**
 * @param {string} text
 * @returns {string[]}
 */
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z\s']/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

/**
 * @param {string[]} tokens
 */
function scoreLexicon(tokens) {
  let positive = 0;
  let negative = 0;
  let uncertainty = 0;
  let litigious = 0;

  for (const word of tokens) {
    if (POSITIVE_WORDS.has(word)) positive++;
    if (NEGATIVE_WORDS.has(word)) negative++;
    if (UNCERTAINTY_WORDS.has(word)) uncertainty++;
    if (LITIGIOUS_WORDS.has(word)) litigious++;
  }

  return { positive, negative, uncertainty, litigious };
}

/**
 * @param {number} positive
 * @param {number} negative
 * @param {number} total
 */
function computeSentimentScore(positive, negative, total) {
  if (total === 0) return 50;
  if (positive + negative === 0) return 50;
  const ratio = (positive - negative) / (positive + negative);
  return Math.max(0, Math.min(100, 50 + ratio * 50));
}

/**
 * @param {number} count
 * @param {number} total
 */
function computeRateScore(count, total) {
  if (total === 0) return 0;
  const rate = (count / total) * 100;
  return Math.max(0, Math.min(100, rate * 10));
}

/**
 * @param {string} qaText
 */
function detectEvasiveness(qaText) {
  const lower = qaText.toLowerCase();
  let hits = 0;
  for (const phrase of EVASIVE_PHRASES) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/['']/g, "['']");
    const regex = new RegExp(escaped, 'g');
    const matches = lower.match(regex);
    if (matches) hits += matches.length;
  }
  return Math.max(0, Math.min(100, hits * 10));
}

const TOPIC_TERMS = {
  margins: ['margin', 'margins', 'gross margin', 'operating margin', 'profitability'],
  revenue: ['revenue', 'revenues', 'sales', 'top-line', 'top line'],
  growth: ['growth', 'growing', 'grew', 'expansion', 'expanding'],
  guidance: ['guidance', 'outlook', 'forecast', 'forward', 'expect'],
  competition: ['competition', 'competitor', 'competitors', 'competitive', 'share'],
  costs: ['cost', 'costs', 'expense', 'expenses', 'spending'],
  capex: ['capex', 'capital expenditure', 'investment', 'investments'],
  'supply chain': ['supply chain', 'logistics', 'inventory', 'shipping'],
  china: ['china', 'chinese'],
  'ai/tech': ['artificial intelligence', 'ai', 'machine learning', 'generative'],
  macro: ['recession', 'inflation', 'interest rate', 'macroeconomic', 'fed'],
  regulation: ['regulation', 'regulatory', 'compliance', 'sec'],
  workforce: ['employees', 'headcount', 'hiring', 'layoffs', 'workforce'],
  'products/services': ['product', 'products', 'service', 'services', 'launch'],
  customers: ['customer', 'customers', 'client', 'clients', 'user', 'users'],
};

/**
 * @param {string} content
 * @param {number} [topN]
 */
function extractTopTopics(content, topN = 5) {
  const lower = content.toLowerCase();
  /** @type {Array<{ topic: string; mentions: number }>} */
  const counts = [];

  for (const [topic, terms] of Object.entries(TOPIC_TERMS)) {
    let count = 0;
    for (const term of terms) {
      const safe = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${safe}\\b`, 'g');
      const matches = lower.match(regex);
      if (matches) count += matches.length;
    }
    if (count > 0) counts.push({ topic, mentions: count });
  }

  return counts.sort((a, b) => b.mentions - a.mentions).slice(0, topN);
}

/* ── Forward guidance detection ── */

const GUIDANCE_RAISED = [
  'raising our guidance',
  'raising our outlook',
  'raising our full-year',
  'raising our forecast',
  'raise our guidance',
  'increased our guidance',
  'increasing our guidance',
  'raising expectations',
  'revising upward',
  'revising our guidance upward',
  'above our prior guidance',
  'above our previous guidance',
  'better than we expected',
  'exceeding our expectations',
  'we now expect higher',
  'upgraded our outlook',
  'upgrading our outlook',
];

const GUIDANCE_LOWERED = [
  'lowering our guidance',
  'lowering our outlook',
  'lowering our forecast',
  'lower our guidance',
  'reduced our guidance',
  'reducing our guidance',
  'revising downward',
  'revising our guidance downward',
  'below our prior guidance',
  'below our previous guidance',
  'worse than we expected',
  'we now expect lower',
  'downgraded our outlook',
  'downgrading our outlook',
  'withdrawing guidance',
  'suspending guidance',
  'pulling our guidance',
];

const GUIDANCE_REITERATED = [
  'reiterating our guidance',
  'reiterating guidance',
  'reaffirming our guidance',
  'reaffirming guidance',
  'reaffirmed our outlook',
  'maintaining our guidance',
  'maintaining guidance',
  'in line with our guidance',
  'consistent with our guidance',
  'unchanged from our prior guidance',
  'on track with our guidance',
  'confirming our outlook',
];

/**
 * Detect whether guidance was raised, reiterated, or lowered.
 * @param {string} content
 * @returns {'raised' | 'reiterated' | 'lowered' | null}
 */
function detectGuidanceDirection(content) {
  const lower = content.toLowerCase();
  let raised = 0;
  let lowered = 0;
  let reiterated = 0;

  for (const phrase of GUIDANCE_RAISED) {
    if (lower.includes(phrase)) raised++;
  }
  for (const phrase of GUIDANCE_LOWERED) {
    if (lower.includes(phrase)) lowered++;
  }
  for (const phrase of GUIDANCE_REITERATED) {
    if (lower.includes(phrase)) reiterated++;
  }

  if (raised > lowered && raised > reiterated) return 'raised';
  if (lowered > raised && lowered > reiterated) return 'lowered';
  if (reiterated > 0) return 'reiterated';
  return null;
}

/* ── Named executive speaker analysis ── */

/**
 * Parse speaker labels and compute per-speaker sentiment.
 * @param {string} content
 * @returns {Array<{ name: string; role: string; sentiment: number; wordCount: number }>}
 */
function extractSpeakerSentiments(content) {
  if (!content || content.length < 500) return [];

  const speakerPattern = /^([A-Z][a-zA-Z'. -]{2,30})\s*(?:--|—|–|-)\s*(.+)$/gm;
  const speakers = new Map();
  const speakerOrder = [];

  let match;
  const positions = [];
  while ((match = speakerPattern.exec(content)) !== null) {
    const name = match[1].trim();
    const role = match[2].trim().replace(/\s+/g, ' ');
    if (/operator|moderator|forward.looking|safe.harbor|participants/i.test(name)) continue;
    if (/operator|moderator/i.test(role)) continue;
    if (name.length < 3 || name.split(' ').length < 2) continue;

    const key = name.toLowerCase();
    if (!speakers.has(key)) {
      speakers.set(key, { name, role, segments: [] });
      speakerOrder.push(key);
    }
    positions.push({ key, index: match.index + match[0].length });
  }

  if (positions.length < 2) return [];

  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].index;
    const end = i + 1 < positions.length ? positions[i + 1].index - 80 : content.length;
    const text = content.slice(start, Math.max(start, end));
    speakers.get(positions[i].key).segments.push(text);
  }

  const results = [];
  for (const key of speakerOrder) {
    const speaker = speakers.get(key);
    const allText = speaker.segments.join(' ');
    const tokens = tokenize(allText);
    if (tokens.length < 20) continue;

    const scores = scoreLexicon(tokens);
    const sentiment = computeSentimentScore(scores.positive, scores.negative, tokens.length);

    results.push({
      name: speaker.name,
      role: speaker.role.length > 50 ? speaker.role.slice(0, 47) + '...' : speaker.role,
      sentiment: parseFloat(sentiment.toFixed(1)),
      wordCount: tokens.length,
    });
  }

  results.sort((a, b) => b.wordCount - a.wordCount);
  return results.slice(0, 8);
}

/* ── Financial metric extraction ── */

/**
 * Extract specific financial metrics mentioned in the transcript.
 * @param {string} content
 * @returns {Array<{ label: string; value: string; context: string }>}
 */
function extractFinancialMetrics(content) {
  if (!content || content.length < 500) return [];

  const metrics = [];
  const seen = new Set();

  const contextPatterns = [
    {
      re: /(?:revenue|sales|top.?line)\s+(?:of\s+|was\s+|were\s+|reached\s+|totaled\s+)(\$[\d,.]+\s*(?:billion|million|B|M)?)/gi,
      label: 'Revenue',
    },
    {
      re: /(?:earnings per share|EPS|diluted EPS)\s+(?:of\s+|was\s+|were\s+)(\$?[\d,.]+)/gi,
      label: 'EPS',
    },
    {
      re: /(?:gross margin|gross profit margin)\s+(?:of\s+|was\s+|at\s+)([\d,.]+\s*%?)/gi,
      label: 'Gross Margin',
    },
    {
      re: /(?:operating margin)\s+(?:of\s+|was\s+|at\s+)([\d,.]+\s*%?)/gi,
      label: 'Operating Margin',
    },
    {
      re: /(?:net income|net earnings)\s+(?:of\s+|was\s+|were\s+|totaled\s+)(\$[\d,.]+\s*(?:billion|million|B|M)?)/gi,
      label: 'Net Income',
    },
    {
      re: /(?:free cash flow|FCF)\s+(?:of\s+|was\s+|were\s+|totaled\s+)(\$[\d,.]+\s*(?:billion|million|B|M)?)/gi,
      label: 'Free Cash Flow',
    },
    {
      re: /(?:operating income|operating earnings)\s+(?:of\s+|was\s+|were\s+)(\$[\d,.]+\s*(?:billion|million|B|M)?)/gi,
      label: 'Operating Income',
    },
    {
      re: /(?:capital expenditure|capex)\s+(?:of\s+|was\s+|were\s+|totaled\s+)(\$[\d,.]+\s*(?:billion|million|B|M)?)/gi,
      label: 'CapEx',
    },
    {
      re: /(?:EBITDA)\s+(?:of\s+|was\s+|were\s+)(\$[\d,.]+\s*(?:billion|million|B|M)?)/gi,
      label: 'EBITDA',
    },
    {
      re: /(?:year.over.year|YoY)\s+(?:growth|increase|decline)\s+(?:of\s+)?([\d,.]+\s*%)/gi,
      label: 'YoY Growth',
    },
  ];

  for (const { re, label } of contextPatterns) {
    let m;
    while ((m = re.exec(content)) !== null) {
      const value = m[1].trim();
      const key = `${label}:${value}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const ctxStart = Math.max(0, m.index - 30);
      const ctxEnd = Math.min(content.length, m.index + m[0].length + 40);
      let context = content.slice(ctxStart, ctxEnd).replace(/\s+/g, ' ').trim();
      if (ctxStart > 0) context = '…' + context;
      if (ctxEnd < content.length) context = context + '…';

      metrics.push({ label, value, context });
    }
  }

  const byLabel = new Map();
  for (const m of metrics) {
    if (!byLabel.has(m.label)) byLabel.set(m.label, m);
  }

  return [...byLabel.values()].slice(0, 10);
}

/**
 * @returns {AnalysisResult}
 */
function createEmptyAnalysis() {
  return {
    wordCount: 0,
    positiveCount: 0,
    negativeCount: 0,
    uncertaintyCount: 0,
    litigiousCount: 0,
    sentimentScore: 50,
    confidenceScore: 50,
    uncertaintyScore: 0,
    litigiousScore: 0,
    preparedRemarksSentiment: 50,
    qaSentiment: 50,
    qaEvasivenessScore: 0,
    topTopics: [],
    guidanceDirection: null,
    speakerSentiments: [],
    financialMetrics: [],
  };
}

/**
 * @param {string} content
 * @returns {AnalysisResult}
 */
export function analyzeTranscript(content) {
  if (!content || typeof content !== 'string' || content.length < 400) {
    return createEmptyAnalysis();
  }

  try {
    const { prepared, qa } = splitSections(content);

    const allTokens = tokenize(content);
    if (allTokens.length === 0) {
      return createEmptyAnalysis();
    }

    const preparedTokens = tokenize(prepared);
    const qaTokens = tokenize(qa);

    const overall = scoreLexicon(allTokens);
    const preparedScores = scoreLexicon(preparedTokens);
    const qaScores = scoreLexicon(qaTokens);

    const sentimentScore = computeSentimentScore(
      overall.positive,
      overall.negative,
      allTokens.length,
    );

    const uncertaintyScore = computeRateScore(overall.uncertainty, allTokens.length);
    const confidenceScore = 100 - uncertaintyScore;
    const litigiousScore = computeRateScore(overall.litigious, allTokens.length);

    const preparedRemarksSentiment = computeSentimentScore(
      preparedScores.positive,
      preparedScores.negative,
      preparedTokens.length,
    );
    const qaSentiment = computeSentimentScore(
      qaScores.positive,
      qaScores.negative,
      qaTokens.length,
    );

    const qaEvasivenessScore = detectEvasiveness(qa);
    const topTopics = extractTopTopics(content);
    const guidanceDirection = detectGuidanceDirection(content);
    const speakerSentiments = extractSpeakerSentiments(content);
    const financialMetrics = extractFinancialMetrics(content);

    return {
      wordCount: allTokens.length,
      positiveCount: overall.positive,
      negativeCount: overall.negative,
      uncertaintyCount: overall.uncertainty,
      litigiousCount: overall.litigious,
      sentimentScore,
      confidenceScore,
      uncertaintyScore,
      litigiousScore,
      preparedRemarksSentiment,
      qaSentiment,
      qaEvasivenessScore,
      topTopics,
      guidanceDirection,
      speakerSentiments,
      financialMetrics,
    };
  } catch (err) {
    console.error('[analyzeTranscript] failed:', err);
    return createEmptyAnalysis();
  }
}

/**
 * @typedef {object} SynthesisInput
 * @property {AnalysisResult} current
 * @property {AnalysisResult} [prior]
 * @property {boolean | null} [epsBeat]
 * @property {'raised' | 'reiterated' | 'lowered' | null} [guidanceDirection]
 */

/**
 * @typedef {object} Synthesis
 * @property {'bullish' | 'neutral' | 'bearish' | 'mixed'} tilt
 * @property {'low' | 'moderate' | 'high'} confidence
 * @property {string} reasoning
 * @property {string[]} positiveSignals
 * @property {string[]} negativeSignals
 */

function n(v, fallback = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

/**
 * @param {SynthesisInput} input
 * @returns {Synthesis}
 */
export function synthesize(input) {
  /** @type {string[]} */
  const positive = [];
  /** @type {string[]} */
  const negative = [];

  if (!input?.current || typeof input.current !== 'object') {
    return {
      tilt: 'neutral',
      confidence: 'low',
      reasoning: 'Insufficient analysis data to synthesize.',
      positiveSignals: [],
      negativeSignals: [],
    };
  }

  try {
    const { prior, epsBeat, guidanceDirection } = input;

    const c = {
      sentimentScore: n(input.current?.sentimentScore, 50),
      qaSentiment: n(input.current?.qaSentiment, 50),
      qaEvasivenessScore: n(input.current?.qaEvasivenessScore, 0),
      uncertaintyScore: n(input.current?.uncertaintyScore, 0),
      litigiousScore: n(input.current?.litigiousScore, 0),
    };
    const pPrior = prior && typeof prior === 'object' ? n(prior.sentimentScore, 50) : null;

    if (prior && pPrior != null) {
      const delta = c.sentimentScore - pPrior;
      if (delta > 5) positive.push(`Tone improved ${delta.toFixed(0)} pts vs. last quarter`);
      else if (delta < -5)
        negative.push(`Tone declined ${Math.abs(delta).toFixed(0)} pts vs. last quarter`);
    }

    if (c.qaSentiment > 60) positive.push('Positive Q&A session tone');
    else if (c.qaSentiment < 40) negative.push('Defensive Q&A session tone');

    if (c.qaEvasivenessScore > 40) {
      negative.push(`Elevated evasiveness in Q&A (${c.qaEvasivenessScore.toFixed(0)}/100)`);
    }

    if (c.uncertaintyScore > 60) {
      negative.push('High uncertainty language throughout call');
    } else if (c.uncertaintyScore < 30) {
      positive.push('Low uncertainty / confident language');
    }

    if (c.litigiousScore > 30) {
      negative.push('Legal/regulatory language elevated');
    }

    if (epsBeat === true) positive.push('EPS beat consensus');
    if (epsBeat === false) negative.push('EPS missed consensus');

    if (guidanceDirection === 'raised') positive.push('Guidance raised');
    if (guidanceDirection === 'lowered') negative.push('Guidance lowered');

    const posCount = positive.length;
    const negCount = negative.length;
    /** @type {Synthesis['tilt']} */
    let tilt;

    if (posCount >= 3 && negCount <= 1) tilt = 'bullish';
    else if (negCount >= 3 && posCount <= 1) tilt = 'bearish';
    else if (posCount >= 2 && negCount >= 2) tilt = 'mixed';
    else tilt = 'neutral';

    /** @type {Synthesis['confidence']} */
    let confidence;
    const totalSignals = posCount + negCount;
    if (totalSignals >= 4 && Math.abs(posCount - negCount) >= 2) confidence = 'high';
    else if (totalSignals >= 2) confidence = 'moderate';
    else confidence = 'low';

    const reasoning =
      tilt === 'bullish'
        ? 'Multiple positive signals outweigh concerns'
        : tilt === 'bearish'
          ? 'Multiple negative signals outweigh positives'
          : tilt === 'mixed'
            ? 'Meaningful signals on both sides — watch for confirmation'
            : 'Insufficient signal strength either way';

    return {
      tilt,
      confidence,
      reasoning,
      positiveSignals: positive,
      negativeSignals: negative,
    };
  } catch (err) {
    console.error('[synthesize] failed:', err);
    return {
      tilt: 'neutral',
      confidence: 'low',
      reasoning: 'Synthesis could not be completed for this call.',
      positiveSignals: [],
      negativeSignals: [],
    };
  }
}
