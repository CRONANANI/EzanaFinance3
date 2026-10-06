/**
 * GET  /api/moderation/terms  { accepted: boolean }
 * POST /api/moderation/terms  record that the user accepted the community
 *      guidelines (shown once, before their first post or comment).
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export const GET = withApiGuard(
  async (request, user) => {
    const { data } = await getAdminClient()
      .from('profiles')
      .select('community_terms_accepted_at')
      .eq('id', user.id)
      .maybeSingle();
    return NextResponse.json({ accepted: !!data?.community_terms_accepted_at });
  },
  { requireAuth: true },
);

export const POST = withApiGuard(
  async (request, user) => {
    const { error } = await getAdminClient()
      .from('profiles')
      .update({ community_terms_accepted_at: new Date().toISOString() })
      .eq('id', user.id)
      .is('community_terms_accepted_at', null);
    if (error) return NextResponse.json({ error: 'Could not save.' }, { status: 500 });
    return NextResponse.json({ ok: true });
  },
  { requireAuth: true },
);
