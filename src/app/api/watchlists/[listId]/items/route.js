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
import {
  dbErrorResponse,
  exceptionResponse,
  validationResponse,
} from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

const VALID_TYPES = new Set(['stock', 'crypto', 'commodity', 'politician']);

async function assertListOwnedByUser(listId, userId) {
  const { data, error } = await supabaseAdmin
    .from('user_watchlists')
    .select('id')
    .eq('id', listId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    // Propagate so the caller can 500 with the real reason instead of a
    // misleading "not yours" 404 when the table is missing.
    throw error;
  }
  return !!data;
}

export async function POST(request, { params }) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { listId } = params;
    if (!listId) return validationResponse('listId is required.');

    const owned = await assertListOwnedByUser(listId, user.id);
    if (!owned) {
      return NextResponse.json(
        { error: 'List not found or not yours.' },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const type = typeof body?.type === 'string' ? body.type.toLowerCase() : '';
    const ticker =
      typeof body?.ticker === 'string' ? body.ticker.trim().toUpperCase() : '';
    const name = typeof body?.name === 'string' ? body.name.trim() : null;
    const sector = typeof body?.sector === 'string' ? body.sector.trim() : null;
    const metadata =
      body?.metadata && typeof body.metadata === 'object' ? body.metadata : {};

    if (!VALID_TYPES.has(type)) {
      return validationResponse(
        `Invalid type. Must be one of: ${[...VALID_TYPES].join(', ')}.`
      );
    }
    if (!ticker) {
      return validationResponse('ticker is required.');
    }

    // Upsert by unique (list_id, type, ticker) — idempotent add.
    const { data, error } = await supabaseAdmin
      .from('user_watchlist_items')
      .upsert(
        { list_id: listId, user_id: user.id, type, ticker, name, sector, metadata },
        { onConflict: 'list_id,type,ticker', ignoreDuplicates: false }
      )
      .select('id, list_id, type, ticker, name, sector, metadata, created_at')
      .single();

    if (error) {
      return dbErrorResponse('watchlist items POST', error, {
        fallback: 'Failed to add item to watchlist.',
      });
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
    // assertListOwnedByUser may rethrow a Supabase error — treat it as a DB error.
    if (e?.code) return dbErrorResponse('watchlist items POST ownership', e);
    return exceptionResponse('watchlist items POST', e);
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { listId } = params;
    if (!listId) return validationResponse('listId is required.');

    const { searchParams } = new URL(request.url);
    const ticker = (searchParams.get('ticker') || '').trim().toUpperCase();
    const type = (searchParams.get('type') || '').toLowerCase();

    if (!ticker) return validationResponse('ticker is required.');
    if (!VALID_TYPES.has(type)) {
      return validationResponse(
        `Invalid type. Must be one of: ${[...VALID_TYPES].join(', ')}.`
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
      return dbErrorResponse('watchlist items DELETE', error, {
        fallback: 'Failed to remove item from watchlist.',
      });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return exceptionResponse('watchlist items DELETE', e);
  }
}
