/**
 * PATCH /api/watchlists/[listId]
 * Rename a watchlist owned by the authenticated user.
 * Body: { label: string }
 *
 * DELETE /api/watchlists/[listId]
 * Delete a watchlist and all its items (cascade).
 */
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/plaid';
import { getAuthUser } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function PATCH(request, { params }) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { listId } = params;
    if (!listId) {
      return NextResponse.json({ error: 'listId required' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const label = typeof body?.label === 'string' ? body.label.trim() : '';
    if (!label) {
      return NextResponse.json({ error: 'Label is required' }, { status: 400 });
    }
    if (label.length > 80) {
      return NextResponse.json({ error: 'Label too long (max 80)' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('user_watchlists')
      .update({ label, updated_at: new Date().toISOString() })
      .eq('id', listId)
      .eq('user_id', user.id)
      .select('id, label')
      .single();

    if (error || !data) {
      console.error('[watchlists PATCH] update error:', error);
      return NextResponse.json(
        { error: 'Watchlist not found or not yours' },
        { status: 404 }
      );
    }

    return NextResponse.json({ watchlist: data });
  } catch (e) {
    console.error('[watchlists PATCH] exception:', e?.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { listId } = params;
    if (!listId) {
      return NextResponse.json({ error: 'listId required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('user_watchlists')
      .delete()
      .eq('id', listId)
      .eq('user_id', user.id);

    if (error) {
      console.error('[watchlists DELETE] error:', error);
      return NextResponse.json(
        { error: 'Failed to delete watchlist' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[watchlists DELETE] exception:', e?.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
