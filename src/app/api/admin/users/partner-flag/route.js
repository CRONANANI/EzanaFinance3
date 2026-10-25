import { NextResponse } from 'next/server';
import { getAdminClient, requireUser } from '@/lib/supabase';
import { isAdminUser } from '@/lib/admin-helpers';
import { grantPartnerAccess, revokePartnerAccess } from '@/lib/partner-admin';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/users/partner-flag
 * Body: { userId: string, isPartner: boolean }
 */
export async function POST(request) {
  try {
    let user;
    try {
      const auth = await requireUser(request);
      user = auth.user;
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdminUser(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const supabaseAdmin = getAdminClient();

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const userId = body?.userId;
    const isPartner = Boolean(body?.isPartner);
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    // Creator standing tier — only meaningful for partners. When promoting a
    // user we set their tier (defaulting to the baseline "creator"); when
    // demoting we clear it. An explicit tier can also be sent on its own to
    // re-tier an existing partner (e.g. promote a marquee creator to signature).
    const ALLOWED_TIERS = ['creator', 'featured', 'signature'];
    const rawTier =
      typeof body?.creatorTier === 'string' ? body.creatorTier.toLowerCase().trim() : null;
    if (rawTier && !ALLOWED_TIERS.includes(rawTier)) {
      return NextResponse.json({ error: 'Invalid creatorTier' }, { status: 400 });
    }

    // QA PAR-3: the toggle writes the real source of truth (`partners` row and
    // app_metadata.partner_role) as well as the profiles display flag.
    const result = isPartner
      ? await grantPartnerAccess(supabaseAdmin, {
          userId,
          profileUpdates: { creator_tier: rawTier || 'creator' },
        })
      : await revokePartnerAccess(supabaseAdmin, {
          userId,
          profileUpdates: { creator_tier: null },
        });
    if (result.error) {
      logger.error('Admin partner flag failed', { userId, error: result.error });
      return NextResponse.json({ error: 'Failed to update partner access' }, { status: 500 });
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, username, full_name, is_partner, creator_tier')
      .eq('id', userId)
      .single();

    if (error) return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
    return NextResponse.json({ success: true, profile: data });
  } catch (e) {
    logger.error('Admin partner flag error', { error: e?.message });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
