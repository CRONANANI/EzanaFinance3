import { NextResponse } from 'next/server';
import { getAdminClient, requireUser } from '@/lib/supabase';
import { isAdminUser } from '@/lib/admin-helpers';

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

    const updates = { is_partner: isPartner };
    if (!isPartner) {
      updates.creator_tier = null;
    } else {
      updates.creator_tier = rawTier || 'creator';
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select('id, username, full_name, is_partner, creator_tier')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, profile: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
