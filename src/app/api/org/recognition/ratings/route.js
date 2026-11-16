import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadRatings } from '../_loader';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* GET /api/org/recognition/ratings?listMode=movers|all|vp|pm|analyst|quant&period=30d|qtd|ytd
   - movers: rank by the signed change in rating over the period (dated changes only)
   - all and role modes: rank by rating
   Faculty advisors are left out. `summary` carries the KPI strip figures. */
export const GET = withApiGuard(
  async (request) => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const url = new URL(request.url);
    const { payload, error } = await loadRatings(
      supabase,
      member,
      (url.searchParams.get('listMode') || 'movers').toLowerCase(),
      (url.searchParams.get('period') || '30d').toLowerCase(),
    );
    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json(payload, { headers: { 'Cache-Control': 'private, no-store' } });
  },
  { requireAuth: true },
);
