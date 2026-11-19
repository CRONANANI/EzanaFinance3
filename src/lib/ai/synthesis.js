import Anthropic from '@anthropic-ai/sdk';
import { buildSynthesisPrompt } from './persona-engine';
import { RESEARCH_MODEL } from '@/lib/ai/models';

const MODEL = RESEARCH_MODEL;

export async function synthesizeResponses(personaResults, marketData, query) {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    timeout: 60_000,
    maxRetries: 2,
  });

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
