import Anthropic from '@anthropic-ai/sdk';
import { buildSynthesisPrompt } from './persona-engine';

const MODEL = 'claude-sonnet-4-20250514';

export async function synthesizeResponses(personaResults, marketData, query) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = buildSynthesisPrompt(personaResults, marketData, query);

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content?.[0]?.text ?? '';

  try {
    const parsed = JSON.parse(text);
    return {
      rating: parsed.consensusRating ?? 'hold',
      confidence: parsed.confidence ?? 50,
      text: parsed.summary ?? text,
      agreements: parsed.agreements ?? [],
      disagreements: parsed.disagreements ?? [],
      keyRisks: parsed.keyRisks ?? [],
      keyCatalysts: parsed.keyCatalysts ?? [],
      actionableInsights: parsed.actionableInsights ?? [],
      raw: text,
    };
  } catch {
    return {
      rating: 'hold',
      confidence: 50,
      text,
      agreements: [],
      disagreements: [],
      keyRisks: [],
      keyCatalysts: [],
      actionableInsights: [],
      raw: text,
    };
  }
}
