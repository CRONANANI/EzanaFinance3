import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Request-time key read — module-level captures freeze build-container env
// values, so a later FMP rotation never reaches running lambdas.
function getFmpKey() {
  return process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY || '';
}

const FMP_BASE = 'https://financialmodelingprep.com/stable';

/** Classify an event as windfall or bane based on sentiment keywords */
function classifyEvent(headline, summary) {
  const text = `${headline} ${summary}`.toLowerCase();

  const WINDFALL_SIGNALS = [
    'beats expectations',
    'revenue up',
    'profit surge',
    'record high',
    'upgrade',
    'bullish',
    'outperform',
    'breakout',
    'dividend increase',
    'partnership',
    'acquisition',
    'approval',
    'launch',
    'growth',
    'expands',
    'raises guidance',
    'strong demand',
    'beats estimates',
    'ipo',
    'merger',
    'deal',
    'rally',
    'new high',
    'positive',
    'gains',
    'soars',
    'climbs',
    'jumps',
  ];

  const BANE_SIGNALS = [
    'misses expectations',
    'revenue down',
    'profit decline',
    'layoffs',
    'downgrade',
    'bearish',
    'underperform',
    'breakdown',
    'dividend cut',
    'lawsuit',
    'sec probe',
    'default',
    'bankruptcy',
    'recall',
    'warning',
    'lowers guidance',
    'weak demand',
    'misses estimates',
    'crash',
    'plunge',
    'sell-off',
    'drops',
    'falls',
    'tanks',
    'risk',
    'threat',
    'sanctions',
    'tariff',
    'war',
    'recession',
    'inflation',
  ];

  const windfallScore = WINDFALL_SIGNALS.reduce((s, k) => s + (text.includes(k) ? 1 : 0), 0);
  const baneScore = BANE_SIGNALS.reduce((s, k) => s + (text.includes(k) ? 1 : 0), 0);

  if (windfallScore > baneScore) return 'windfall';
  if (baneScore > windfallScore) return 'bane';
  return windfallScore > 0 ? 'windfall' : 'bane';
}

/** Map risk category to relevant sectors/themes */
const RISK_THEMES = {
  Conservative: [
    'dividend',
    'bond',
    'treasury',
    'utility',
    'healthcare',
    'consumer staples',
    'blue chip',
    'defensive',
  ],
  Moderate: ['earnings', 'sector rotation', 'index', 'etf', 'macro', 'fed', 'gdp', 'employment'],
  Growth: ['growth', 'tech', 'ai', 'startup', 'ipo', 'saas', 'cloud', 'semiconductor', 'ev'],
  Aggressive: [
    'options',
    'momentum',
    'breakout',
    'crypto',
    'bitcoin',
    'prediction market',
    'meme',
    'short squeeze',
    'volatility',
  ],
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

function relevanceScore(headline, summary, riskCategory) {
  const text = `${headline} ${summary}`.toLowerCase();
  const cat = normalizeRiskCategory(riskCategory);
  const themes = RISK_THEMES[cat] || RISK_THEMES.Moderate;
  return themes.reduce((s, t) => s + (text.includes(t) ? 2 : 0), 0);
}

function mapFmpArticle(e) {
  const headline = e?.title || e?.headline || '';
  const summary = e?.text || e?.content || e?.description || '';
  const ticker = e?.symbol || e?.ticker || null;
  const publishedAt = e?.publishedDate || e?.date || e?.published_date || new Date().toISOString();
  const source = e?.site || e?.publisher || e?.source || 'Market Data';
  const url = e?.url || e?.link || null;
  return { headline, summary, ticker, publishedAt, source, url };
}

export const GET = withApiGuard(
  async (request, user, context) => {
    let riskCategory = 'Moderate';
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('investor_profile, risk_category')
        .eq('id', user.id)
        .maybeSingle();

      const fromProfile = profile?.risk_category || profile?.investor_profile?.risk || null;
      riskCategory = normalizeRiskCategory(fromProfile || 'Moderate');
    }

    const FMP_KEY = getFmpKey();
    let events = [];
    if (FMP_KEY) {
      try {
        const res = await fetch(
          `${FMP_BASE}/news/stock-latest?page=0&limit=40&apikey=${encodeURIComponent(FMP_KEY)}`,
          { cache: 'no-store' },
        );
        if (res.ok) {
          const data = await res.json();
          events = Array.isArray(data) ? data : [];
        }
      } catch {
        /* fallback to empty */
      }
    }

    const classified = events
      .map(mapFmpArticle)
      .filter((e) => e.headline && e.summary)
      .map((e) => ({
        id: `${e.ticker || 'mkt'}-${e.publishedAt || Date.now()}-${e.headline.slice(0, 24)}`,
        headline: e.headline,
        summary: e.summary.slice(0, 200),
        ticker: e.ticker,
        source: e.source,
        publishedAt: e.publishedAt,
        url: e.url,
        type: classifyEvent(e.headline, e.summary),
        relevance: relevanceScore(e.headline, e.summary, riskCategory),
      }))
      .sort((a, b) => b.relevance - a.relevance);

    const windfalls = classified.filter((e) => e.type === 'windfall').slice(0, 5);
    const banes = classified.filter((e) => e.type === 'bane').slice(0, 5);

    return NextResponse.json({
      ok: true,
      riskCategory,
      windfalls,
      banes,
    });
  },
  { requireAuth: true },
);
