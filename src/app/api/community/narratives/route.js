import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export const GET = withApiGuard(
  async (request, user) => {
    try {
      const admin = getAdminClient();
      const { data } = await admin
        .from('community_narratives')
        .select('*')
        .eq('is_active', true)
        .order('strength', { ascending: false })
        .limit(5);

      return NextResponse.json({
        narratives: (data || []).map((n) => ({
          id: n.id,
          label: n.label,
          strength: n.strength,
          direction: n.direction,
          delta_pct: n.delta_pct,
          related_tickers: n.related_tickers,
        })),
      });
    } catch {
      return NextResponse.json({ narratives: [] });
    }
  },
  { requireAuth: false },
);
