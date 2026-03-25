import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getServerSupabase, getAuthUser } from '@/lib/supabase/server';
import { fetchMarketData } from '@/lib/ai/market-data';
import { buildAnalysisPrompt } from '@/lib/ai/persona-engine';
import { synthesizeResponses } from '@/lib/ai/synthesis';

export const dynamic = 'force-dynamic';


const MODEL = 'claude-sonnet-4-20250514';

function parsePersonaResponse(text, personaId, personaName, personaType) {
  try {
    const parsed = JSON.parse(text);
    return {
      personaId,
      personaName,
      personaType,
      rating: parsed.rating ?? 'hold',
      confidence: parsed.confidence ?? 50,
      analysis: parsed.analysis ?? text,
      keyPoints: parsed.keyPoints ?? [],
      risks: parsed.risks ?? [],
      catalysts: parsed.catalysts ?? [],
      priceTarget: parsed.priceTarget ?? null,
      raw: text,
    };
  } catch {
    return {
      personaId,
      personaName,
      personaType,
      rating: 'hold',
      confidence: 50,
      analysis: text,
      keyPoints: [],
      risks: [],
      catalysts: [],
      priceTarget: null,
      raw: text,
    };
  }
}

async function runPersonaAnalysis(anthropic, persona, marketData, query) {
  const prompt = buildAnalysisPrompt(persona, marketData, query);

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: persona.system_prompt,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content?.[0]?.text ?? '';
  return parsePersonaResponse(text, persona.id, persona.name, persona.type);
}

export async function POST(request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const supabase = getServerSupabase();

    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { boardId, queryType = 'stock_analysis', queryInput, personaIds } = body;

    if (!queryInput?.ticker) {
      return NextResponse.json(
        { error: 'queryInput.ticker is required' },
        { status: 400 }
      );
    }

    // Load personas — either from a saved board or from an explicit list
    let personas;

    if (boardId) {
      const { data: board, error: boardErr } = await supabase
        .from('user_boards')
        .select('persona_ids')
        .eq('id', boardId)
        .eq('user_id', user.id)
        .single();

      if (boardErr || !board) {
        return NextResponse.json(
          { error: 'Board not found' },
          { status: 404 }
        );
      }

      const { data, error } = await supabase
        .from('personas')
        .select('*')
        .in('id', board.persona_ids);

      if (error || !data?.length) {
        return NextResponse.json(
          { error: 'No personas found for this board' },
          { status: 404 }
        );
      }
      personas = data;
    } else if (personaIds?.length) {
      const { data, error } = await supabase
        .from('personas')
        .select('*')
        .in('id', personaIds);

      if (error || !data?.length) {
        return NextResponse.json(
          { error: 'No personas found for the provided IDs' },
          { status: 404 }
        );
      }
      personas = data;
    } else {
      // Default: use all active personas
      const { data, error } = await supabase
        .from('personas')
        .select('*')
        .order('sort_order', { ascending: true })
        .limit(10);

      if (error || !data?.length) {
        return NextResponse.json(
          { error: 'No personas available' },
          { status: 404 }
        );
      }
      personas = data;
    }

    // Fetch real market data from FMP
    const marketData = await fetchMarketData(queryInput.ticker);

    if (!marketData?.quote) {
      return NextResponse.json(
        { error: `Could not fetch market data for ${queryInput.ticker}. Verify the ticker is valid.` },
        { status: 422 }
      );
    }

    // Run all persona analyses in parallel
    const anthropic = new Anthropic({ apiKey });

    const personaResults = await Promise.all(
      personas.map((persona) =>
        runPersonaAnalysis(anthropic, persona, marketData, queryInput)
      )
    );

    // Synthesize into consensus
    const synthesis = await synthesizeResponses(
      personaResults,
      marketData,
      queryInput
    );

    // Persist to Supabase
    let sessionId = null;
    try {
      const { data: session, error: sessErr } = await supabase
        .from('analysis_sessions')
        .insert({
          user_id: user.id,
          board_id: boardId ?? null,
          query_type: queryType,
          query_input: queryInput,
          market_data_snapshot: marketData,
          synthesis: synthesis.text,
          consensus_rating: synthesis.rating,
          confidence_score: synthesis.confidence,
        })
        .select()
        .single();

      if (sessErr) {
        console.error('Failed to save analysis session:', sessErr);
      } else {
        sessionId = session.id;

        const { error: respErr } = await supabase
          .from('persona_responses')
          .insert(
            personaResults.map((r) => ({
              session_id: session.id,
              persona_id: r.personaId,
              rating: r.rating,
              confidence: r.confidence,
              analysis: r.analysis,
              key_points: r.keyPoints,
              risks: r.risks,
              catalysts: r.catalysts,
              price_target: r.priceTarget,
            }))
          );

        if (respErr) {
          console.error('Failed to save persona responses:', respErr);
        }
      }
    } catch (dbErr) {
      console.error('Database save error (non-fatal):', dbErr);
    }

    return NextResponse.json({
      sessionId,
      ticker: queryInput.ticker.toUpperCase(),
      queryType,
      personaResults: personaResults.map((r) => ({
        personaId: r.personaId,
        personaName: r.personaName,
        personaType: r.personaType,
        rating: r.rating,
        confidence: r.confidence,
        analysis: r.analysis,
        keyPoints: r.keyPoints,
        risks: r.risks,
        catalysts: r.catalysts,
        priceTarget: r.priceTarget,
      })),
      synthesis: {
        rating: synthesis.rating,
        confidence: synthesis.confidence,
        summary: synthesis.text,
        agreements: synthesis.agreements,
        disagreements: synthesis.disagreements,
        keyRisks: synthesis.keyRisks,
        keyCatalysts: synthesis.keyCatalysts,
        actionableInsights: synthesis.actionableInsights,
      },
      marketData: {
        ticker: marketData.ticker,
        price: marketData.quote?.price,
        change: marketData.quote?.change,
        changesPercentage: marketData.quote?.changesPercentage,
        marketCap: marketData.quote?.marketCap,
        sector: marketData.profile?.sector,
        industry: marketData.profile?.industry,
      },
    });
  } catch (error) {
    console.error('AI Analyzer error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    );
  }
}
