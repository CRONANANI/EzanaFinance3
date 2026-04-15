/**
 * POST /api/watchlists/[listId]/items
 * Add an item (stock, crypto, commodity, politician) to a watchlist.
 * Body: { type: 'stock' | 'crypto' | 'commodity' | 'politician', ticker: string, name?: string, sector?: string, metadata?: object }
 *
 * DELETE /api/watchlists/[listId]/items?ticker=<ticker>&type=<type>
 * Remove an item from a watchlist. ticker and type identify the row.
 */
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/plaid';
import { getAuthUser } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

const VALID_TYPES = new Set(['stock', 'crypto', 'commodity', 'politician']);

async function assertListOwnedByUser(listId, userId) {
  const { data } = await supabaseAdmin
    .from('user_watchlists')
    .select('id')
    .eq('id', listId)
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
}

export async function POST(request, { params }) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { listId } = params;
    if (!listId) {
      return NextResponse.json({ error: 'listId required' }, { status: 400 });
    }

    const owned = await assertListOwnedByUser(listId, user.id);
    if (!owned) {
      return NextResponse.json(
        { error: 'List not found or not yours' },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const type = typeof body?.type === 'string' ? body.type.toLowerCase() : '';
    const ticker = typeof body?.ticker === 'string' ? body.ticker.trim().toUpperCase() : '';
    const name = typeof body?.name === 'string' ? body.name.trim() : null;
    const sector = typeof body?.sector === 'string' ? body.sector.trim() : null;
    const metadata = body?.metadata && typeof body.metadata === 'object' ? body.metadata : {};

    if (!VALID_TYPES.has(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${[...VALID_TYPES].join(', ')}` },
        { status: 400 }
      );
    }
    if (!ticker) {
      return NextResponse.json({ error: 'ticker required' }, { status: 400 });
    }

    // Upsert by unique (list_id, type, ticker) — idempotent add.
    const { data, error } = await supabaseAdmin
      .from('user_watchlist_items')
      .upsert(
        {
          list_id: listId,
          user_id: user.id,
          type,
          ticker,
          name,
          sector,
          metadata,
        },
        { onConflict: 'list_id,type,ticker', ignoreDuplicates: false }
      )
      .select('id, list_id, type, ticker, name, sector, metadata, created_at')
      .single();

    if (error) {
      console.error('[watchlist items POST] upsert error:', error);
      return NextResponse.json(
        { error: 'Failed to add item' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      item: {
        id: data.id,
        type: data.type,
        ticker: data.ticker,
        name: data.name || data.ticker,
        sector: data.sector || '',
        metadata: data.metadata || {},
        price: 0,
        change: 0,
        changePct: 0,
        marketCap: '—',
        volume: '—',
      },
    });
  } catch (e) {
    console.error('[watchlist items POST] exception:', e?.message);
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

    const { searchParams } = new URL(request.url);
    const ticker = (searchParams.get('ticker') || '').trim().toUpperCase();
    const type = (searchParams.get('type') || '').toLowerCase();

    if (!ticker) {
      return NextResponse.json({ error: 'ticker required' }, { status: 400 });
    }
    if (!VALID_TYPES.has(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${[...VALID_TYPES].join(', ')}` },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('user_watchlist_items')
      .delete()
      .eq('list_id', listId)
      .eq('user_id', user.id)
      .eq('type', type)
      .eq('ticker', ticker);

    if (error) {
      console.error('[watchlist items DELETE] error:', error);
      return NextResponse.json(
        { error: 'Failed to remove item' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[watchlist items DELETE] exception:', e?.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
