import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getModelConfig } from '@/lib/ai/analysis-prompts';
import { fetchMarketData, formatMarketDataForPrompt } from '@/lib/ai/market-data';

const MODEL = 'claude-sonnet-4-20250514';

export async function POST(request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { ticker, model: modelId, investmentProfile } = body;

    if (!ticker) {
      return NextResponse.json(
        { error: 'ticker is required' },
        { status: 400 }
      );
    }

    if (!modelId) {
      return NextResponse.json(
        { error: 'model is required (grpv, dcf, risk, earnings, technical, dividend)' },
        { status: 400 }
      );
    }

    const modelConfig = getModelConfig(modelId);
    if (!modelConfig) {
      return NextResponse.json(
        { error: `Unknown model: ${modelId}` },
        { status: 400 }
      );
    }

    // Fetch real market data
    let marketData = null;
    let marketDataPrompt = 'Market data unavailable — provide analysis based on your knowledge.';

    try {
      if (process.env.FMP_API_KEY) {
        marketData = await fetchMarketData(ticker);
        if (marketData?.quote) {
          marketDataPrompt = formatMarketDataForPrompt(marketData);
        }
      }
    } catch (err) {
      console.warn('Market data fetch failed (non-fatal):', err.message);
    }

    // Build the user prompt
    let userPrompt = modelConfig.userPromptTemplate(ticker.toUpperCase(), marketDataPrompt);

    if (investmentProfile) {
      userPrompt += `\n\nInvestment profile context: ${investmentProfile}`;
    }

    // Call Anthropic API
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: modelConfig.systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const analysisText = response.content?.[0]?.text ?? '';

    return NextResponse.json({
      ticker: ticker.toUpperCase(),
      model: modelId,
      modelName: modelConfig.name,
      analysis: analysisText,
      marketData: marketData?.quote
        ? {
            price: marketData.quote.price,
            change: marketData.quote.change,
            changesPercentage: marketData.quote.changesPercentage,
            marketCap: marketData.quote.marketCap,
          }
        : null,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('AI Stock Analysis error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    );
  }
}
