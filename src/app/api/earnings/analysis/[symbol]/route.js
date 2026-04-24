import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/plaid';
import { fetchLastNTranscripts, fetchEarningsHistory } from '@/lib/earnings/fmp-client';
import { analyzeTranscript, synthesize } from '@/lib/earnings/analyze';

export const dynamic = 'force-dynamic';

function hasSupabase() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * @param {import('@/lib/earnings/fmp-client').RawTranscript} t
 * @returns {number | null}
 */
function parseQuarterFromTranscript(t) {
  const p = String(t?.period ?? '').trim();
  // Prefer explicit Q1–Q4 (avoids misparsing "Q1 2025" as 12025 from digit concat)
  const qLabel = p.match(/\bQ([1-4])\b/i);
  if (qLabel) return parseInt(qLabel[1], 10);
  if (/^[1-4]$/.test(p)) return parseInt(p, 10);
  if (t?.date) {
    const d = new Date(t.date);
    if (!Number.isNaN(d.getTime())) return Math.floor(d.getMonth() / 3) + 1;
  }
  return null;
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
  const priorMap = new Map(
    (priorTopics || [])
      .filter((x) => x?.topic)
      .map((x) => [x.topic, Number(x.mentions)]),
  );
  return (currentTopics || [])
    .filter((t) => t?.topic)
    .map((t) => {
      const m = Number(t.mentions);
      const pm = priorMap.get(t.topic);
      const hasPrior = priorMap.has(t.topic) && Number.isFinite(pm);
      return {
        topic: t.topic,
        mentions: Number.isFinite(m) ? m : 0,
        delta_vs_prior: hasPrior && Number.isFinite(m) ? m - (pm || 0) : null,
      };
    });
}

/**
 * @param {import('@/lib/earnings/fmp-client').RawTranscript} t
 * @param {string} symbolUpper
 * @returns {Promise<object | null>}
 */
async function getOrComputeAnalysis(t, symbolUpper) {
  if (!t?.content || typeof t.content !== 'string' || t.content.length < 100) {
    console.warn('[earnings/analysis] skip transcript: content too short or missing', {
      period: t.period,
      len: t?.content?.length ?? 0,
    });
    return null;
  }

  const quarter = parseQuarterFromTranscript(t);
  if (quarter == null) {
    console.warn('[earnings/analysis] skip transcript: unknown quarter', {
      period: t.period,
      date: t.date,
    });
    return null;
  }

  const year = Number(t.year);
  if (!Number.isFinite(year)) {
    console.warn('[earnings/analysis] skip transcript: invalid year', t.year);
    return null;
  }

  const sym = (t.symbol && String(t.symbol).toUpperCase()) || symbolUpper;
  const callDate = toDateOnly(t.date);

  if (hasSupabase()) {
    try {
      const { data: cached, error: cacheErr } = await supabaseAdmin
        .from('earnings_transcript_analysis')
        .select('*')
        .eq('symbol', sym)
        .eq('year', year)
        .eq('quarter', quarter)
        .maybeSingle();

      if (cacheErr) {
        console.warn('[earnings/analysis] cache read:', cacheErr.message);
      }

      if (cached) {
        const topTopics = Array.isArray(cached.top_topics) ? cached.top_topics : [];
        return {
          symbol: sym,
          year,
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
    } catch (e) {
      console.warn('[earnings/analysis] cache read threw:', e?.message);
    }
  }

  if (hasSupabase()) {
    try {
      const { error: trErr } = await supabaseAdmin.from('earnings_transcripts').upsert(
        {
          symbol: sym,
          year,
          quarter,
          call_date: callDate,
          content: t.content,
        },
        { onConflict: 'symbol,year,quarter' },
      );
      if (trErr) console.warn('[earnings/analysis] transcript upsert:', trErr.message);
    } catch (e) {
      console.warn('[earnings/analysis] transcript upsert threw:', e?.message);
    }
  }

  const analysis = analyzeTranscript(t.content);

  if (hasSupabase()) {
    try {
      const { error: anErr } = await supabaseAdmin.from('earnings_transcript_analysis').upsert(
        {
          symbol: sym,
          year,
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
    } catch (e) {
      console.warn('[earnings/analysis] analysis upsert threw:', e?.message);
    }
  }

  return {
    symbol: sym,
    year,
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
  try {
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
  } catch (e) {
    console.warn('[earnings/analysis] synthesis update threw:', e?.message);
  }
}

export async function GET(_req, context) {
  const raw = String(context?.params?.symbol ?? '')
    .trim()
    .toUpperCase();
  const symbol = raw.replace(/\s+/g, '');

  if (!symbol || !/^[A-Z0-9.-]{1,15}$/.test(symbol)) {
    return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 });
  }

  if (!process.env.FMP_API_KEY) {
    console.error('[earnings/analysis] FMP_API_KEY is not set');
    return NextResponse.json(
      { error: 'Service misconfigured — missing FMP API key.', detail: 'Set FMP_API_KEY on the server.' },
      { status: 503 },
    );
  }

  try {
    console.log(`[earnings/analysis] ${symbol}: starting`);

    const { transcripts, fmpAccessDenied } = await fetchLastNTranscripts(symbol, 4);

    const earnings = await fetchEarningsHistory(symbol, 12).catch((err) => {
      console.warn(`[earnings/analysis] ${symbol} earnings history failed:`, err?.message);
      return [];
    });

    console.log(
      `[earnings/analysis] ${symbol}: ${transcripts.length} transcripts, ${earnings.length} earnings rows, fmpAccessDenied=${fmpAccessDenied}`,
    );

    if (transcripts.length > 0) {
      const t0 = transcripts[0];
      console.log(`[earnings/analysis] ${symbol}: first transcript`, {
        period: t0.period,
        year: t0.year,
        contentLength: t0.content?.length ?? 0,
      });
    }

    if (fmpAccessDenied && transcripts.length === 0) {
      return NextResponse.json(
        {
          error:
            'Financial Modeling Prep returned HTTP 402/403 for earning-call transcripts. Your API plan may not include this endpoint.',
          detail:
            'Upgrade the FMP subscription to include earning call transcripts, or verify FMP_API_KEY. Other FMP routes may still work.',
        },
        { status: 503 },
      );
    }

    if (transcripts.length === 0) {
      return NextResponse.json(
        {
          error: 'No earnings call transcripts available for this ticker.',
          detail:
            'Transcript coverage is limited on FMP for some symbols. Try large-cap US listings such as AAPL, MSFT, NVDA, or TSLA.',
        },
        { status: 404 },
      );
    }

    /** @type {Awaited<ReturnType<typeof getOrComputeAnalysis>>[]} */
    const analyses = [];
    for (const t of transcripts) {
      try {
        const row = await getOrComputeAnalysis(t, symbol);
        if (row) analyses.push(row);
      } catch (err) {
        console.error(`[earnings/analysis] ${symbol} analyze failed for period:`, t?.period, t?.year, err);
      }
    }

    if (analyses.length === 0) {
      return NextResponse.json(
        {
          error: 'Transcripts were found but analysis could not be completed.',
          detail: 'Check server logs for cache or parsing errors. Try again in a moment.',
        },
        { status: 500 },
      );
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
    console.error(`[earnings/analysis] ${symbol} failed:`, err);
    if (err?.stack) console.error(err.stack);
    return NextResponse.json(
      {
        error: err?.message ?? 'Unknown error',
        symbol,
        detail: process.env.NODE_ENV === 'development' ? err?.stack : undefined,
      },
      { status: 500 },
    );
  }
}
