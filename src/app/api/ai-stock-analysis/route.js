import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getModelConfig } from '@/lib/ai/analysis-prompts';
import { fetchMarketData, formatMarketDataForPrompt } from '@/lib/ai/market-data';
import { createServerSupabase } from '@/lib/supabase-server';
import { sanitizeAIOutput } from '@/lib/sanitize';

export const dynamic = 'force-dynamic';

const MODEL = 'claude-sonnet-4-20250514';

const aiRateMap = new Map();
function checkAiRateLimit(ip) {
  const now = Date.now();
  const entry = aiRateMap.get(ip);
  if (!entry || now - entry.ts > 60000) {
    aiRateMap.set(ip, { ts: now, n: 1 });
    return true;
  }
  entry.n++;
  return entry.n <= 10;
}

export async function POST(request) {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!checkAiRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again in 60 seconds.' },
        { status: 429 },
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'AI analysis is not configured. Set ANTHROPIC_API_KEY in Vercel environment variables.',
        },
        { status: 503 },
      );
    }

    const body = await request.json();
    const { ticker, model: modelId, investmentProfile, simpleExplain } = body;

    if (!ticker) {
      return NextResponse.json({ error: 'ticker is required' }, { status: 400 });
    }

    if (!modelId) {
      return NextResponse.json(
        {
          error:
            'model is required (grpv, dcf, earnings, comps, threestatement, lbo, ma, risk, montecarlo)',
        },
        { status: 400 },
      );
    }

    const modelConfig = getModelConfig(modelId);
    if (!modelConfig) {
      return NextResponse.json({ error: `Unknown model: ${modelId}` }, { status: 400 });
    }

    // Fetch real market data (FMP + AV — fetchMarketData never throws)
    let marketData = null;
    let marketDataPrompt = 'Market data unavailable — provide analysis based on your knowledge.';

    try {
      marketData = await fetchMarketData(ticker);
      const prompt = formatMarketDataForPrompt(marketData);
      if (prompt && prompt !== 'No market data available.') {
        marketDataPrompt = prompt;
      }
    } catch (err) {
      console.warn('[ai-stock-analysis] Market data fetch failed (non-fatal):', err?.message);
    }

    // Build the user prompt
    let userPrompt = modelConfig.userPromptTemplate(ticker.toUpperCase(), marketDataPrompt);

    if (investmentProfile) {
      userPrompt += `\n\nInvestment profile context: ${investmentProfile}`;
    }

    // Call Anthropic API
    let systemPrompt = modelConfig.systemPrompt;
    if (simpleExplain) {
      systemPrompt =
        'Explain for a beginner: short, plain language, define any jargon inline, no buy/sell advice.\n\n' +
        systemPrompt;
    }

    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const analysisText = sanitizeAIOutput(response.content?.[0]?.text ?? '');

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
      { status: 500 },
    );
  }
}
