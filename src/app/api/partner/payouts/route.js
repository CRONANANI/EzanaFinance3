/**
 * GET /api/partner/payouts -> { payouts: [...], pendingCents, lifetimeCents }
 * Partners only (403 otherwise).
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { supabaseAdmin } from '@/lib/plaid';
import { isActivePartner } from '@/lib/partner-payouts';

export const dynamic = 'force-dynamic';

export const GET = withApiGuard(
  async (request, user) => {
    if (!(await isActivePartner(user.id))) {
      return NextResponse.json({ error: 'Partner access required' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('partner_payouts')
      .select(
        'id, amount_cents, currency, period_start, period_end, status, paid_at, memo, created_at',
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return NextResponse.json({ error: 'Failed to load payouts' }, { status: 500 });

    const payouts = data || [];
    const pendingCents = payouts
      .filter((p) => p.status === 'pending' || p.status === 'processing')
      .reduce((s, p) => s + p.amount_cents, 0);
    const lifetimeCents = payouts
      .filter((p) => p.status === 'paid')
      .reduce((s, p) => s + p.amount_cents, 0);

    return NextResponse.json({ payouts, pendingCents, lifetimeCents });
  },
  { requireAuth: true },
);
