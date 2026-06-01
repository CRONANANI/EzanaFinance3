import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('institution_registry')
    .select(
      'id, canonical_name, display_name, logo_url, square_logo_url, category, snaptrade_slug, snaptrade_brokerage_type, snaptrade_allows_trading, plaid_institution_id',
    )
    .eq('enabled', true)
    .eq('maintenance_mode', false)
    .order('display_name');

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

  return NextResponse.json({ institutions, count: institutions.length });
}
