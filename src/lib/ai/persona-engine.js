import { formatMarketDataForPrompt } from './market-data';

export function buildAnalysisPrompt(persona, marketData, query) {
  const dataContext = formatMarketDataForPrompt(marketData);
  const ticker = query.ticker?.toUpperCase() ?? 'UNKNOWN';

  return `You are participating in an investment board discussion. A user has asked for your analysis of ${ticker}.

Here is the current market data:

${dataContext}

${query.additionalContext ? `Additional context from the user: ${query.additionalContext}\n` : ''}
Please provide your analysis in the following JSON structure. Be specific, reference the actual numbers provided above, and stay true to your investment philosophy.

{
  "rating": "strong_buy" | "buy" | "hold" | "sell" | "strong_sell",
  "confidence": <number 0-100>,
  "analysis": "<Your 2-4 paragraph analysis of this investment. Reference specific financial metrics, explain your reasoning through your unique lens, and be honest about what you don't know.>",
  "keyPoints": ["<point 1>", "<point 2>", "<point 3>"],
  "risks": ["<risk 1>", "<risk 2>", "<risk 3>"],
  "catalysts": ["<catalyst 1>", "<catalyst 2>"],
  "priceTarget": {
    "low": <number or null>,
    "mid": <number or null>,
    "high": <number or null>,
    "timeframe": "<e.g. 12 months, 5 years>"
  }
}

Respond ONLY with valid JSON. No markdown fences, no preamble.`;
}

export function buildSynthesisPrompt(personaResults, marketData, query) {
  const ticker = query.ticker?.toUpperCase() ?? 'UNKNOWN';
  const dataContext = formatMarketDataForPrompt(marketData);

  const analysisBlock = personaResults
    .map(
      (r) =>
        `### ${r.personaName} (${r.personaType})\nRating: ${r.rating} | Confidence: ${r.confidence}%\n${r.analysis}\nKey Points: ${r.keyPoints?.join('; ')}\nRisks: ${r.risks?.join('; ')}\nCatalysts: ${r.catalysts?.join('; ')}`
    )
    .join('\n\n');

  return `You are the moderator of an investment advisory board. Multiple expert investors have analyzed ${ticker}. Your job is to synthesize their views into a clear consensus.

## Market Data
${dataContext}

## Individual Analyses
${analysisBlock}

Synthesize all perspectives into a unified assessment. Identify points of agreement and disagreement. Weight opinions by how relevant each investor's expertise is to this particular stock.

Respond with this JSON structure:

{
  "consensusRating": "strong_buy" | "buy" | "hold" | "sell" | "strong_sell",
  "confidence": <number 0-100>,
  "summary": "<3-5 paragraph synthesis that weaves together the different perspectives, highlights where they agree and disagree, and provides actionable takeaways>",
  "agreements": ["<what most board members agree on>"],
  "disagreements": ["<where opinions diverge and why>"],
  "keyRisks": ["<top risks across all analyses>"],
  "keyCatalysts": ["<top catalysts across all analyses>"],
  "actionableInsights": ["<what an investor should actually do>"]
}

Respond ONLY with valid JSON. No markdown fences, no preamble.`;
}
