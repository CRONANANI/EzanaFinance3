/**
 * /api/partner/profile
 * GET — get partner profile (username, avatar, display_name)
 * PATCH — update username and/or avatar
 */
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/plaid';

export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: partner } = await supabaseAdmin
      .from('partners')
      .select('username, display_name, avatar_url, verified, echo_writer_approved')
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({ profile: partner || null });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { username, avatarUrl } = body;

    const updates = {};

    if (username !== undefined) {
      const clean = (username || '').trim().toLowerCase();
      if (clean.length > 0) {
        if (clean.length < 3) return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 });
        if (clean.length > 24) return NextResponse.json({ error: 'Username must be 24 characters or less' }, { status: 400 });
        if (!/^[a-z0-9_]+$/.test(clean)) return NextResponse.json({ error: 'Username can only contain letters, numbers, and underscores' }, { status: 400 });

        const { data: existing } = await supabaseAdmin
          .from('partners')
          .select('user_id')
          .eq('username', clean)
          .neq('user_id', user.id)
          .maybeSingle();

        if (existing) return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
        updates.username = clean;
      } else {
        updates.username = null;
      }
    }

    if (avatarUrl !== undefined) {
      updates.avatar_url = avatarUrl || null;
    }

    if (Object.keys(updates).length === 0) {
      const { data: partner } = await supabaseAdmin
        .from('partners')
        .select('username, display_name, avatar_url')
        .eq('user_id', user.id)
        .single();
      return NextResponse.json({ success: true, profile: partner || null });
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('partners')
      .update(updates)
      .eq('user_id', user.id)
      .select('username, display_name, avatar_url')
      .single();

    if (updateErr) return NextResponse.json({ error: 'Update failed' }, { status: 500 });

    return NextResponse.json({ success: true, profile: updated });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
