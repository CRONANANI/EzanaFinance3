import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { getPriorsForTicker } from '@/lib/org-pitches';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
    const ticker = params.ticker;
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) {
      return NextResponse.json({ ticker: (ticker || '').toUpperCase(), priors: [] });
    }
    const priors = await getPriorsForTicker(supabase, member.org_id, ticker);
    return NextResponse.json({ ticker: (ticker || '').toUpperCase(), priors });
  },
  { requireAuth: true },
);
