import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabaseClient } from '@/lib/supabase-service-role';
import { NEWSLETTER_SITE_URL } from '@/lib/newsletter/config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Double opt-in confirmation. Idempotent: a second click on an already-confirmed
 * link (token cleared) just lands on the friendly page. Tokens expire after 7d.
 */
export const GET = withApiGuard(
  async (request) => {
    const token = new URL(request.url).searchParams.get('token');
    const to = (path) => NextResponse.redirect(`${NEWSLETTER_SITE_URL}${path}`);
    if (!token) return to('/newsletter/confirmed?status=invalid');

    const supabase = createServerSupabaseClient();
    const { data: row } = await supabase
      .from('marketing_subscribers')
      .select('id, status, confirm_sent_at')
      .eq('confirm_token', token)
      .maybeSingle();

    // Token cleared already → most likely a second click on a confirmed link.
    if (!row) return to('/newsletter/confirmed');

    // Expired (>7 days) → ask them to sign up again.
    if (
      row.confirm_sent_at &&
      Date.now() - new Date(row.confirm_sent_at).getTime() > SEVEN_DAYS_MS
    ) {
      return to('/newsletter/confirmed?status=expired');
    }

    await supabase
      .from('marketing_subscribers')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        confirm_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);

    return to('/newsletter/confirmed');
  },
  { requireAuth: false },
);
