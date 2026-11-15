/**
 * POST /api/watchlists/[listId]/items/move
 * Move one item to another of the caller's lists in a single statement.
 * Body: { type, ticker, toListId }
 *
 * One UPDATE of list_id keeps the row, so its star, its added_by and
 * added_reason, its metadata and its created_at all move with it. The smart
 * watchlist events stay with the source list, so a rule there still will
 * not add the item back.
 *
 * 200  { item }            moved
 * 400  invalid payload, or the source and target are the same list
 * 404  either list is not the caller's, or the item is not in the source list
 * 409  the target list already has this item
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient, getAuthContext } from '@/lib/supabase';
import { dbErrorResponse, exceptionResponse, validationResponse } from '@/lib/api-errors';
import { ITEM_TYPES } from '@/lib/watchlist/asset-classes';

export const dynamic = 'force-dynamic';

export const POST = withApiGuard(
  async (request, user, context) => {
    try {
      const { supabase } = await getAuthContext(request);
      if (!supabase) return NextResponse.json({ error: 'Server error' }, { status: 500 });

      const fromId = context?.params?.listId;
      const body = await request.json().catch(() => ({}));
      const type = typeof body?.type === 'string' ? body.type.toLowerCase() : '';
      const ticker = typeof body?.ticker === 'string' ? body.ticker.trim().toUpperCase() : '';
      const toId = typeof body?.toListId === 'string' ? body.toListId : '';

      if (!fromId) return validationResponse('listId is required.');
      if (!ITEM_TYPES.includes(type)) return validationResponse('Invalid type.');
      if (!ticker) return validationResponse('ticker is required.');
      if (!toId) return validationResponse('toListId is required.');
      if (toId === fromId) return validationResponse('The item is already in that list.');

      /* Both lists must be the caller's. RLS already hides other users' rows;
         the explicit user_id filter keeps that true under any client. */
      const { data: lists, error: listErr } = await supabase
        .from('user_watchlists')
        .select('id, label')
        .eq('user_id', user.id)
        .in('id', [fromId, toId]);
      if (listErr) return dbErrorResponse('watchlist move lists', listErr);
      if ((lists || []).length !== 2) {
        return NextResponse.json({ error: 'List not found or not yours.' }, { status: 404 });
      }

      const { data, error } = await supabase
        .from('user_watchlist_items')
        .update({ list_id: toId })
        .eq('list_id', fromId)
        .eq('user_id', user.id)
        .eq('type', type)
        .eq('ticker', ticker)
        .select('*')
        .maybeSingle();

      if (error) {
        return dbErrorResponse('watchlist move', error, {
          uniqueViolation: 'That list already has this item.',
          fallback: 'Could not move the item.',
        });
      }
      if (!data) return NextResponse.json({ error: 'Item not found.' }, { status: 404 });

      /* Best effort, same as add and remove. */
      const { error: bcErr } = await getAdminClient()
        .from('activity_breadcrumbs')
        .insert({
          user_id: user.id,
          event_type: 'watchlist_move',
          event_data: { ticker, from_watchlist_id: fromId, watchlist_id: toId },
        });
      if (bcErr) console.warn('[watchlist move] breadcrumb', bcErr.message);

      return NextResponse.json({
        item: {
          id: data.id,
          type: data.type,
          ticker: data.ticker,
          name: data.name || data.ticker,
          sector: data.sector || '',
          metadata: data.metadata || {},
          createdAt: data.created_at || null,
          starredAt: data.starred_at || null,
          addedBy: data.added_by || 'user',
          addedReason: data.added_reason || null,
          marketCap: null,
        },
        toListLabel: (lists || []).find((l) => l.id === toId)?.label || null,
      });
    } catch (e) {
      return exceptionResponse('watchlist move', e);
    }
  },
  { requireAuth: true },
);
