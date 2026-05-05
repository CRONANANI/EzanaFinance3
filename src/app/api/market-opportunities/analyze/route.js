import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FMP_KEY = process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY;
const FMP_BASE = 'https://financialmodelingprep.com/stable';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

/** Match risk labels used by GET /api/market-opportunities */
const RISK_THEMES = {
  Conservative: ['dividend', 'bond', 'treasury', 'utility', 'healthcare', 'consumer staples', 'blue chip', 'defensive'],
  Moderate: ['earnings', 'sector rotation', 'index', 'etf', 'macro', 'fed', 'gdp', 'employment'],
  Growth: ['growth', 'tech', 'ai', 'startup', 'ipo', 'saas', 'cloud', 'semiconductor', 'ev'],
  Aggressive: ['options', 'momentum', 'breakout', 'crypto', 'bitcoin', 'prediction market', 'meme', 'short squeeze', 'volatility'],
};

function normalizeRiskCategory(raw) {
  if (!raw || typeof raw !== 'string') return 'Moderate';
  const s = raw.replace('-Oriented', '').trim();
  if (RISK_THEMES[s]) return s;
  const fallbacks = {
    Intermediate: 'Moderate',
    Beginner: 'Conservative',
    Expert: 'Aggressive',
  };
  return fallbacks[s] || 'Moderate';
}

async function fetchRelatedNews(ticker, headline) {
  if (!FMP_KEY) return [];
  try {
    const res = await fetch(
      `${FMP_BASE}/news/stock-latest?page=0&limit=10${ticker ? `&tickers=${encodeURIComponent(ticker)}` : ''}&apikey=${encodeURIComponent(FMP_KEY)}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (Array.isArray(data) ? data : [])
      .filter((n) => n?.title && n.title !== headline)
      .slice(0, 5)
      .map((n) => ({
        title: n.title,
        source: n.site || 'Market Data',
        publishedAt: n.publishedDate || new Date().toISOString(),
        url: n.url || null,
        ticker: n.symbol || null,
      }));
  } catch {
    return [];
  }
}

async function fetchTickerStats(ticker) {
  if (!FMP_KEY || !ticker) return null;
  try {
    const [quoteRes, statsRes] = await Promise.all([
      fetch(`${FMP_BASE}/quote?symbol=${encodeURIComponent(ticker)}&apikey=${encodeURIComponent(FMP_KEY)}`, { cache: 'no-store' }),
      fetch(`${FMP_BASE}/ratios-ttm?symbol=${encodeURIComponent(ticker)}&apikey=${encodeURIComponent(FMP_KEY)}`, { cache: 'no-store' }),
    ]);

    const quote = quoteRes.ok ? await quoteRes.json() : [];
    const ratios = statsRes.ok ? await statsRes.json() : [];
    const q = Array.isArray(quote) ? quote[0] : quote;
    const r = Array.isArray(ratios) ? ratios[0] : ratios;

    return {
      price: q?.price,
      change: q?.change,
      changePct: q?.changesPercentage,
      marketCap: q?.marketCap,
      pe: r?.peRatioTTM ?? q?.pe,
      eps: q?.eps,
      yearHigh: q?.yearHigh,
      yearLow: q?.yearLow,
      volume: q?.volume,
      avgVolume: q?.avgVolume,
      sector: q?.sector || null,
      industry: q?.industry || null,
    };
  } catch {
    return null;
  }
}

async function generateAiAnalysis(event, riskProfile, tickerStats) {
  if (!ANTHROPIC_KEY) {
    return buildFallbackAnalysis(event, riskProfile, tickerStats);
  }

  const mcBillions =
    tickerStats?.marketCap != null ? (tickerStats.marketCap / 1e9).toFixed(1) : null;
  const statsLine =
    tickerStats && tickerStats.price != null
      ? `Current price: $${tickerStats.price}, Change: ${tickerStats.changePct ?? '—'}%, P/E: ${tickerStats.pe ?? '—'}, Market Cap: $${mcBillions ?? '—'}B`
      : '';

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        messages: [
          {
            role: 'user',
            content: `You are a financial analyst at Ezana Finance. Analyze this market event for a ${riskProfile} investor.

Event: "${event.headline}"
Summary: "${event.summary || ''}"
Type: ${event.type} (${event.type === 'windfall' ? 'positive opportunity' : 'market risk'})
${event.ticker ? `Ticker: ${event.ticker}` : ''}
${statsLine ? `${statsLine}` : ''}

Respond ONLY with a JSON object (no markdown, no backticks):
{
  "context": "2-3 sentence explanation of WHY this is a ${event.type} for a ${riskProfile} investor specifically",
  "insight": "1 sentence actionable takeaway — what to watch for or consider",
  "confidence": "high" or "medium" or "low",
  "factors": ["factor 1", "factor 2", "factor 3"]
}`,
          },
        ],
      }),
    });

    if (!res.ok) return buildFallbackAnalysis(event, riskProfile, tickerStats);

    const data = await res.json();
    const text = data.content?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    try {
      const parsed = JSON.parse(clean);
      if (parsed && typeof parsed.context === 'string') return parsed;
    } catch {
      /* fall through */
    }
    return buildFallbackAnalysis(event, riskProfile, tickerStats);
  } catch {
    return buildFallbackAnalysis(event, riskProfile, tickerStats);
  }
}

function buildFallbackAnalysis(event, riskProfile, tickerStats) {
  const isWindfall = event.type === 'windfall';
  return {
    context: isWindfall
      ? `This event signals a potential opportunity aligned with a ${riskProfile} investment approach. The market reaction suggests positive momentum that could benefit positioned investors.`
      : `This event presents a risk factor that ${riskProfile} investors should monitor. The implications could affect portfolio positions in this sector or asset class.`,
    insight: isWindfall
      ? 'Monitor price action over the next 48 hours for confirmation of the trend before adjusting positions.'
      : 'Review exposure to this sector and consider whether your current position sizing reflects this new risk factor.',
    confidence: 'medium',
    factors: [
      isWindfall ? 'Positive market sentiment' : 'Elevated volatility risk',
      tickerStats ? `${tickerStats.sector || 'Market'} sector dynamics` : 'Broad market implications',
      `Alignment with ${riskProfile} risk tolerance`,
    ],
  };
}

function buildKpis(tickerStats, event) {
  const kpis = [];

  if (tickerStats) {
    if (tickerStats.marketCap) {
      const mcStr =
        tickerStats.marketCap >= 1e12
          ? `$${(tickerStats.marketCap / 1e12).toFixed(2)}T`
          : tickerStats.marketCap >= 1e9
            ? `$${(tickerStats.marketCap / 1e9).toFixed(1)}B`
            : `$${(tickerStats.marketCap / 1e6).toFixed(0)}M`;
      kpis.push({ label: 'Market Cap', value: mcStr, sub: tickerStats.sector || '' });
    }
    if (tickerStats.pe) {
      kpis.push({ label: 'P/E Ratio', value: Number(tickerStats.pe).toFixed(1), sub: 'Trailing 12M' });
    }
    if (tickerStats.yearHigh && tickerStats.yearLow) {
      kpis.push({
        label: '52-Week Range',
        value: `$${Number(tickerStats.yearLow).toFixed(0)} – $${Number(tickerStats.yearHigh).toFixed(0)}`,
        sub: tickerStats.price ? `Current: $${Number(tickerStats.price).toFixed(2)}` : '',
      });
    }
    if (tickerStats.volume && tickerStats.avgVolume) {
      const volRatio = (tickerStats.volume / tickerStats.avgVolume).toFixed(1);
      kpis.push({
        label: 'Volume vs Avg',
        value: `${volRatio}×`,
        sub: `${(tickerStats.volume / 1e6).toFixed(1)}M shares today`,
      });
    }
  }

  if (kpis.length < 3) {
    const defaults = [
      { label: 'Signal Type', value: event.type === 'windfall' ? 'Bullish' : 'Bearish', sub: 'Market sentiment' },
      { label: 'Source', value: event.source || 'Market Data', sub: 'Publisher' },
      { label: 'Relevance', value: 'Profile-matched', sub: 'Based on your risk level' },
    ];
    while (kpis.length < 3) kpis.push(defaults[kpis.length]);
  }

  return kpis.slice(0, 3);
}

export async function POST(request) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let riskProfile = 'Moderate';
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('investor_profile, risk_category')
      .eq('id', user.id)
      .maybeSingle();
    const fromProfile = profile?.risk_category || profile?.investor_profile?.risk || null;
    riskProfile = normalizeRiskCategory(fromProfile || 'Moderate');
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const event = body.event;
  if (!event?.headline) {
    return NextResponse.json({ error: 'Event required' }, { status: 400 });
  }

  const [relatedNews, tickerStats] = await Promise.all([
    fetchRelatedNews(event.ticker, event.headline),
    fetchTickerStats(event.ticker),
  ]);

  const aiAnalysis = await generateAiAnalysis(event, riskProfile, tickerStats);
  const kpis = buildKpis(tickerStats, event);

  return NextResponse.json({
    ok: true,
    event,
    riskProfile,
    analysis: aiAnalysis,
    relatedNews,
    kpis,
    tickerStats,
  });
}
