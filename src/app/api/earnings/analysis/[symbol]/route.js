import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/plaid';
import { fetchLastNTranscripts, fetchEarningsHistory } from '@/lib/earnings/fmp-client';
import { analyzeTranscript, synthesize } from '@/lib/earnings/analyze';

function hasSupabase() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * @param {import('@/lib/earnings/fmp-client').RawTranscript} t
 */
function parseQuarterFromTranscript(t) {
  const q = parseInt(String(t.period).replace(/\D/g, ''), 10);
  if (!q || q < 1 || q > 4) {
    throw new Error(`Invalid period: ${t.period}`);
  }
  return q;
}

/**
 * @param {string} [dateStr]
 */
function toDateOnly(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * @param {Awaited<ReturnType<typeof fetchEarningsHistory>>} earnings
 * @param {number} year
 * @param {number} quarter
 */
function findEarningsRowForQuarter(earnings, year, quarter) {
  for (const row of earnings) {
    if (!row?.date) continue;
    const d = new Date(row.date);
    if (Number.isNaN(d.getTime())) continue;
    const y = d.getFullYear();
    const q = Math.floor(d.getMonth() / 3) + 1;
    if (y === year && q === quarter) return row;
  }
  return earnings[0] ?? null;
}

/**
 * @param {Array<{ topic: string; mentions: number }>} currentTopics
 * @param {Array<{ topic: string; mentions: number }> | null} priorTopics
 */
function enrichTopicsWithDelta(currentTopics, priorTopics) {
  const priorMap = new Map((priorTopics || []).map((x) => [x.topic, x.mentions]));
  return currentTopics.map((t) => ({
    topic: t.topic,
    mentions: t.mentions,
    delta_vs_prior: priorMap.has(t.topic) ? t.mentions - priorMap.get(t.topic) : null,
  }));
}

/**
 * @param {import('@/lib/earnings/fmp-client').RawTranscript} t
 */
async function getOrComputeAnalysis(t) {
  const quarter = parseQuarterFromTranscript(t);
  const callDate = toDateOnly(t.date);

  if (hasSupabase()) {
    const { data: cached, error: cacheErr } = await supabaseAdmin
      .from('earnings_transcript_analysis')
      .select('*')
      .eq('symbol', t.symbol)
      .eq('year', t.year)
      .eq('quarter', quarter)
      .maybeSingle();

    if (cacheErr) {
      console.warn('[earnings/analysis] cache read:', cacheErr.message);
    }

    if (cached) {
      const topTopics = Array.isArray(cached.top_topics) ? cached.top_topics : [];
      return {
        symbol: t.symbol,
        year: t.year,
        quarter,
        callDate: cached.call_date || t.date,
        analysis: {
          wordCount: cached.word_count,
          positiveCount: cached.positive_word_count,
          negativeCount: cached.negative_word_count,
          uncertaintyCount: cached.uncertainty_word_count,
          sentimentScore: Number(cached.sentiment_score),
          confidenceScore: Number(cached.confidence_score),
          uncertaintyScore: Number(cached.uncertainty_score),
          litigiousScore: Number(cached.litigious_score),
          preparedRemarksSentiment: Number(cached.prepared_remarks_sentiment),
          qaSentiment: Number(cached.qa_sentiment),
          qaEvasivenessScore: Number(cached.qa_evasiveness_score),
          topTopics,
          litigiousCount: 0,
        },
      };
    }
  }

  if (hasSupabase()) {
    const { error: trErr } = await supabaseAdmin.from('earnings_transcripts').upsert(
      {
        symbol: t.symbol,
        year: t.year,
        quarter,
        call_date: callDate,
        content: t.content,
      },
      { onConflict: 'symbol,year,quarter' },
    );
    if (trErr) console.warn('[earnings/analysis] transcript upsert:', trErr.message);
  }

  const analysis = analyzeTranscript(t.content);

  if (hasSupabase()) {
    const { error: anErr } = await supabaseAdmin.from('earnings_transcript_analysis').upsert(
      {
        symbol: t.symbol,
        year: t.year,
        quarter,
        call_date: callDate,
        sentiment_score: analysis.sentimentScore,
        confidence_score: analysis.confidenceScore,
        uncertainty_score: analysis.uncertaintyScore,
        litigious_score: analysis.litigiousScore,
        prepared_remarks_sentiment: analysis.preparedRemarksSentiment,
        qa_sentiment: analysis.qaSentiment,
        qa_evasiveness_score: analysis.qaEvasivenessScore,
        top_topics: analysis.topTopics,
        word_count: analysis.wordCount,
        positive_word_count: analysis.positiveCount,
        negative_word_count: analysis.negativeCount,
        uncertainty_word_count: analysis.uncertaintyCount,
        directional_tilt: 'neutral',
        tilt_confidence: 'low',
        tilt_reasoning: '',
      },
      { onConflict: 'symbol,year,quarter' },
    );
    if (anErr) console.warn('[earnings/analysis] analysis upsert:', anErr.message);
  }

  return {
    symbol: t.symbol,
    year: t.year,
    quarter,
    callDate: t.date,
    analysis,
  };
}

/**
 * @param {string} symbol
 * @param {number} year
 * @param {number} quarter
 * @param {ReturnType<typeof synthesize>} synthesis
 */
async function persistSynthesis(symbol, year, quarter, synthesis) {
  if (!hasSupabase()) return;
  const { error } = await supabaseAdmin
    .from('earnings_transcript_analysis')
    .update({
      directional_tilt: synthesis.tilt,
      tilt_confidence: synthesis.confidence,
      tilt_reasoning: synthesis.reasoning,
    })
    .eq('symbol', symbol)
    .eq('year', year)
    .eq('quarter', quarter);
  if (error) console.warn('[earnings/analysis] synthesis update:', error.message);
}

export async function GET(_req, { params }) {
  const symbol = String(params.symbol || '')
    .trim()
    .toUpperCase();
  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
  }

  if (!process.env.FMP_API_KEY) {
    return NextResponse.json(
      { error: 'Earnings call analysis requires FMP_API_KEY on the server.' },
      { status: 503 },
    );
  }

  try {
    const [transcripts, earnings] = await Promise.all([
      fetchLastNTranscripts(symbol, 4),
      fetchEarningsHistory(symbol, 12),
    ]);

    if (transcripts.length === 0) {
      return NextResponse.json(
        { error: 'No earnings transcripts available for this symbol yet.' },
        { status: 404 },
      );
    }

    /** @type {Awaited<ReturnType<typeof getOrComputeAnalysis>>[]} */
    const analyses = [];
    for (const t of transcripts) {
      const row = await getOrComputeAnalysis({
        ...t,
        symbol: t.symbol?.toUpperCase?.() || symbol,
      });
      analyses.push(row);
    }

    const current = analyses[0];
    const prior = analyses[1];

    const matchedEarnings = findEarningsRowForQuarter(earnings, current.year, current.quarter);
    const epsBeat =
      matchedEarnings?.epsActual != null && matchedEarnings?.epsEstimated != null
        ? matchedEarnings.epsActual >= matchedEarnings.epsEstimated
        : null;

    const synthesis = synthesize({
      current: current.analysis,
      prior: prior?.analysis,
      epsBeat,
      guidanceDirection: null,
    });

    await persistSynthesis(symbol, current.year, current.quarter, synthesis);

    const priorTopics = prior?.analysis?.topTopics || null;
    const topTopicsWithDelta = enrichTopicsWithDelta(current.analysis.topTopics || [], priorTopics);

    return NextResponse.json({
      symbol,
      current: {
        period: `Q${current.quarter} ${current.year}`,
        callDate: current.callDate,
        analysis: {
          ...current.analysis,
          topTopics: topTopicsWithDelta,
        },
      },
      history: analyses.map((a) => ({
        period: `Q${a.quarter} ${a.year}`,
        callDate: a.callDate,
        sentimentScore: a.analysis.sentimentScore,
        qaSentiment: a.analysis.qaSentiment,
        uncertaintyScore: a.analysis.uncertaintyScore,
        qaEvasivenessScore: a.analysis.qaEvasivenessScore,
      })),
      earningsHistory: earnings.slice(0, 8),
      synthesis,
    });
  } catch (err) {
    console.error('[earnings/analysis]', err);
    return NextResponse.json({ error: err?.message ?? 'Unknown' }, { status: 500 });
  }
}
