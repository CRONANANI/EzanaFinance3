/**
 * GET /api/watchlists
 * Returns all watchlists for the authenticated user, each with its items.
 * On first call for a new user (no rows), seeds one default "My Watchlist" list.
 *
 * POST /api/watchlists
 * Creates a new named watchlist for the authenticated user.
 * Body: { label: string }
 */
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/plaid';
import { getAuthUser } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

async function ensureDefaultList(userId) {
  const { data: existing } = await supabaseAdmin
    .from('user_watchlists')
    .select('id')
    .eq('user_id', userId)
    .limit(1);

  if (existing && existing.length > 0) return;

  await supabaseAdmin.from('user_watchlists').insert({
    user_id: userId,
    label: 'My Watchlist',
    sort_order: 0,
  });
}

export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureDefaultList(user.id);

    const { data: lists, error: listsErr } = await supabaseAdmin
      .from('user_watchlists')
      .select('id, label, sort_order, created_at, updated_at')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (listsErr) {
      console.error('[watchlists GET] lists error:', listsErr);
      return NextResponse.json(
        { error: 'Failed to fetch watchlists' },
        { status: 500 }
      );
    }

    const listIds = (lists || []).map((l) => l.id);
    let items = [];
    if (listIds.length > 0) {
      const { data: itemRows, error: itemsErr } = await supabaseAdmin
        .from('user_watchlist_items')
        .select('id, list_id, type, ticker, name, sector, metadata, created_at')
        .eq('user_id', user.id)
        .in('list_id', listIds)
        .order('created_at', { ascending: true });

      if (itemsErr) {
        console.error('[watchlists GET] items error:', itemsErr);
      } else {
        items = itemRows || [];
      }
    }

    const itemsByList = new Map();
    for (const item of items) {
      if (!itemsByList.has(item.list_id)) itemsByList.set(item.list_id, []);
      itemsByList.get(item.list_id).push({
        id: item.id,
        type: item.type,
        ticker: item.ticker,
        name: item.name || item.ticker,
        sector: item.sector || '',
        metadata: item.metadata || {},
        price: 0,
        change: 0,
        changePct: 0,
        marketCap: '—',
        volume: '—',
      });
    }

    const result = (lists || []).map((l) => ({
      id: l.id,
      label: l.label,
      stocks: itemsByList.get(l.id) || [],
    }));

    return NextResponse.json({ watchlists: result });
  } catch (e) {
    console.error('[watchlists GET] exception:', e?.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const label = typeof body?.label === 'string' ? body.label.trim() : '';
    if (!label) {
      return NextResponse.json({ error: 'Label is required' }, { status: 400 });
    }
    if (label.length > 80) {
      return NextResponse.json({ error: 'Label too long (max 80)' }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from('user_watchlists')
      .select('sort_order')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextSort = (existing?.[0]?.sort_order ?? -1) + 1;

    const { data: created, error } = await supabaseAdmin
      .from('user_watchlists')
      .insert({ user_id: user.id, label, sort_order: nextSort })
      .select('id, label, sort_order, created_at, updated_at')
      .single();

    if (error) {
      console.error('[watchlists POST] insert error:', error);
      return NextResponse.json(
        { error: 'Failed to create watchlist' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      watchlist: { id: created.id, label: created.label, stocks: [] },
    });
  } catch (e) {
    console.error('[watchlists POST] exception:', e?.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
