import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Priority ordering for the Add Portfolio grid.
 *
 * Institutions listed here appear at the top in this order. Everything
 * not in the list appears after, alphabetically.
 */
const PRIORITY_INSTITUTIONS = [
  'charles schwab',
  'fidelity investments',
  'fidelity',
  'robinhood',
  'e*trade',
  'etrade',
  'td ameritrade',
  'interactive brokers',
  'merrill edge',
  'merrill lynch',
  'webull',
  'tastytrade',
  'public',
  'sofi',
  'coinbase',
  'kraken',
  'gemini',
  'binance us',
  'vanguard',
  'alpaca',
  'wealthfront',
  'betterment',
  'fidelity netbenefits',
  'empower retirement',
  'empower',
  'voya',
  'principal',
  'tiaa',
  'john hancock',
  'transamerica',
];

function canonicalize(raw) {
  if (!raw) return '';
  return String(raw)
    .replace(/[\u2018\u2019']/g, '')
    .replace(/&\s*co\.?/gi, '')
    .replace(/\b(inc|llc|ltd|corp|corporation|incorporated)\b\.?/gi, '')
    .replace(/\((us|usa|na|n\.a\.)\)/gi, '')
    .replace(/[^\w\s*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const PRIORITY_LOOKUP = new Map();
PRIORITY_INSTITUTIONS.forEach((name, idx) => {
  PRIORITY_LOOKUP.set(canonicalize(name), idx);
});

function getPriority(displayName) {
  const canon = canonicalize(displayName);
  const exact = PRIORITY_LOOKUP.get(canon);
  if (exact !== undefined) return exact;
  for (const [priorityCanon, idx] of PRIORITY_LOOKUP) {
    if (canon.startsWith(priorityCanon) || canon === priorityCanon) {
      return idx;
    }
  }
  return Number.MAX_SAFE_INTEGER;
}

export const GET = withApiGuard(
  async (request, user) => {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('institution_registry')
      .select(
        'id, canonical_name, display_name, logo_url, square_logo_url, category, snaptrade_slug, snaptrade_brokerage_type, snaptrade_allows_trading, plaid_institution_id',
      )
      .eq('enabled', true)
      .eq('maintenance_mode', false);

    if (error) {
      console.error('[institutions/list]', error);
      return NextResponse.json({ institutions: [] }, { status: 502 });
    }

    const institutions = (data || []).map((r) => ({
      id: r.id,
      displayName: r.display_name,
      logoUrl: r.square_logo_url || r.logo_url,
      category: r.category,
      snaptradeSlug: r.snaptrade_slug,
      snaptradeBrokerageType: r.snaptrade_brokerage_type,
      snaptradeAllowsTrading: r.snaptrade_allows_trading,
      plaidInstitutionId: r.plaid_institution_id,
      providers: [
        r.snaptrade_slug ? 'snaptrade' : null,
        r.plaid_institution_id ? 'plaid' : null,
      ].filter(Boolean),
    }));

    institutions.sort((a, b) => {
      const pa = getPriority(a.displayName);
      const pb = getPriority(b.displayName);
      if (pa !== pb) return pa - pb;
      return a.displayName.localeCompare(b.displayName);
    });

    return NextResponse.json({ institutions, count: institutions.length });
  },
  { requireAuth: false },
);
