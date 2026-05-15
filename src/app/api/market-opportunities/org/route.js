import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Request-time key read — module-level captures freeze build-container env
// values, so a later FMP rotation never reaches running lambdas.
function getFmpKey() {
  return process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY || '';
}

const FMP_BASE = 'https://financialmodelingprep.com/stable';

function classifyEvent(headline, summary) {
  const text = `${headline} ${summary}`.toLowerCase();
  const WINDFALL = [
    'beats',
    'revenue up',
    'profit surge',
    'record',
    'upgrade',
    'bullish',
    'outperform',
    'breakout',
    'expansion',
    'approval',
    'growth',
    'rally',
    'soars',
    'jumps',
    'raises guidance',
  ];
  const BANE = [
    'misses',
    'revenue down',
    'decline',
    'layoffs',
    'downgrade',
    'bearish',
    'warning',
    'lowers guidance',
    'crash',
    'plunge',
    'sell-off',
    'drops',
    'falls',
    'recession',
    'inflation',
    'tariff',
    'sanctions',
  ];
  const w = WINDFALL.reduce((s, k) => s + (text.includes(k) ? 1 : 0), 0);
  const b = BANE.reduce((s, k) => s + (text.includes(k) ? 1 : 0), 0);
  return w > b ? 'windfall' : 'bane';
}

/* Role-specific relevance themes */
const ROLE_THEMES = {
  executive: {
    keywords: [
      'sector',
      'market regime',
      'regulatory',
      'fed',
      'macro',
      'gdp',
      'employment',
      'portfolio-wide',
      'systemic',
      'index',
      'benchmark',
      'policy',
      'trade war',
      'sanctions',
      'geopolitical',
      'leadership',
      'strategy shift',
      'rebalance',
    ],
    label: 'Macro & Portfolio-Level',
  },
  portfolio_manager: {
    keywords: [
      'sector rotation',
      'earnings surprise',
      'position sizing',
      'factor',
      'momentum',
      'value',
      'growth',
      'relative strength',
      'correlation',
      'hedge',
      'allocation',
      'overweight',
      'underweight',
      'technical',
      'catalyst',
    ],
    label: 'Strategy & Sector-Level',
  },
  analyst: {
    keywords: [
      'earnings',
      'revenue',
      'eps',
      'guidance',
      'upgrade',
      'downgrade',
      'price target',
      'buyback',
      'insider',
      'dcf',
      'valuation',
      'breakout',
      'support',
      'resistance',
      'volume',
      'ipo',
      'acquisition',
    ],
    label: 'Ticker & Catalyst-Level',
  },
};

function normalizeOrgRole(role) {
  if (role === 'executive' || role === 'portfolio_manager' || role === 'analyst') return role;
  return 'analyst';
}

function roleRelevanceScore(headline, summary, role) {
  const text = `${headline} ${summary}`.toLowerCase();
  const themes = ROLE_THEMES[role] || ROLE_THEMES.analyst;
  return themes.keywords.reduce((s, k) => s + (text.includes(k) ? 2 : 0), 0);
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

export async function GET() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role = 'analyst';
  let riskCategory = 'Moderate';
  let mgmtProfile = {};

  if (user) {
    const [orgRes, profileRes] = await Promise.all([
      supabase
        .from('org_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('investor_profile, risk_category')
        .eq('id', user.id)
        .maybeSingle(),
    ]);

    const orgMember = orgRes.data;
    const profile = profileRes.data;

    role = normalizeOrgRole(orgMember?.role || 'analyst');
    riskCategory =
      profile?.risk_category ||
      profile?.investor_profile?.risk?.replace('-Oriented', '') ||
      'Moderate';
    mgmtProfile = profile?.investor_profile?.management || {};
  }

  const FMP_KEY = getFmpKey();
  let events = [];
  if (FMP_KEY) {
    try {
      const res = await fetch(
        `${FMP_BASE}/news/stock-latest?page=0&limit=50&apikey=${encodeURIComponent(FMP_KEY)}`,
        { cache: 'no-store' },
      );
      if (res.ok) {
        const d = await res.json();
        events = Array.isArray(d) ? d : [];
      }
    } catch {
      /* empty */
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
      relevance: roleRelevanceScore(e.headline, e.summary, role),
    }))
    .sort((a, b) => b.relevance - a.relevance);

  return NextResponse.json({
    ok: true,
    role,
    roleLabel: ROLE_THEMES[role]?.label || 'General',
    riskCategory,
    managementProfile: mgmtProfile,
    windfalls: classified.filter((e) => e.type === 'windfall').slice(0, 5),
    banes: classified.filter((e) => e.type === 'bane').slice(0, 5),
  });
}
