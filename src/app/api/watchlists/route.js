/**
 * GET /api/watchlists
 * Returns all watchlists for the authenticated user, each with its items.
 * On first call for a new user (no rows), seeds one default "My Watchlist" list.
 *
 * POST /api/watchlists
 * Creates a new named watchlist for the authenticated user.
 * Body: { label: string }
 *
 * 200 / 201  — success
 * 400        — missing / invalid payload
 * 401        — not authenticated
 * 409        — a list with that label already exists for this user
 * 500        — unexpected DB / runtime error (real cause in `detail` in dev)
 */
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/plaid';
import { getAuthUser } from '@/lib/auth-helpers';
import {
  dbErrorResponse,
  exceptionResponse,
  validationResponse,
} from '@/lib/api-errors';
import {
  computeNextPosition,
  POSITION_STEP,
} from '@/lib/watchlists/position';

export const dynamic = 'force-dynamic';

const MAX_LABEL = 80;
const MAX_POSITION_RETRIES = 3;

async function ensureDefaultList(userId) {
  const { data: existing, error: existingErr } = await supabaseAdmin
    .from('user_watchlists')
    .select('id')
    .eq('user_id', userId)
    .limit(1);

  if (existingErr) {
    // Let the caller decide — we don't want to 500 the GET just because we
    // couldn't pre-seed. The outer select will surface the real problem.
    console.error('[watchlists ensureDefaultList] select error:', existingErr);
    return;
  }

  if (existing && existing.length > 0) return;

  const { error: insertErr } = await supabaseAdmin
    .from('user_watchlists')
    .insert({ user_id: userId, label: 'My Watchlist', sort_order: 0 });

  if (insertErr) {
    console.error('[watchlists ensureDefaultList] insert error:', insertErr);
  }
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
      return dbErrorResponse('watchlists GET lists', listsErr, {
        fallback: 'Failed to fetch watchlists.',
      });
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
        // Non-fatal — the lists load fine even without items.
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
    return exceptionResponse('watchlists GET', e);
  }
}

/**
 * Read all existing sort_order values for a user. Returns an empty array on
 * any error — the goal is that a read failure never masks the real cause of
 * an eventual write failure; if the table is missing or auth is broken, the
 * INSERT below will surface the same error with the correct code + hint.
 */
async function readUserPositions(userId) {
  const { data, error } = await supabaseAdmin
    .from('user_watchlists')
    .select('sort_order')
    .eq('user_id', userId);

  if (error) {
    console.warn('[watchlists POST] position pre-fetch failed (non-fatal):', {
      code: error.code,
      message: error.message,
    });
    return [];
  }
  return Array.isArray(data) ? data.map((r) => r.sort_order) : [];
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
      return validationResponse('Label is required.');
    }
    if (label.length > MAX_LABEL) {
      return validationResponse(`Label too long (max ${MAX_LABEL} characters).`);
    }

    // Retry loop — if a future (user_id, sort_order) unique index is ever
    // added, two concurrent inserts could compute the same position. We
    // recompute up to MAX_POSITION_RETRIES times before giving up. Duplicate
    // name (unique (user_id, label)) is handled separately below with a 409.
    let attempt = 0;
    while (attempt <= MAX_POSITION_RETRIES) {
      const positions = await readUserPositions(user.id);
      const nextSort =
        computeNextPosition(positions) + attempt * POSITION_STEP;

      const { data: created, error } = await supabaseAdmin
        .from('user_watchlists')
        .insert({ user_id: user.id, label, sort_order: nextSort })
        .select('id, label, sort_order, created_at, updated_at')
        .single();

      if (!error) {
        return NextResponse.json(
          { watchlist: { id: created.id, label: created.label, stocks: [] } },
          { status: 201 }
        );
      }

      // Detect a (user_id, sort_order) collision specifically — keep
      // retrying. Any other unique violation (e.g. duplicate label) or any
      // other DB error stops the loop and bubbles the real cause up.
      const isPositionCollision =
        error.code === '23505' &&
        typeof error.message === 'string' &&
        /sort_order/i.test(error.message);

      if (isPositionCollision && attempt < MAX_POSITION_RETRIES) {
        attempt += 1;
        continue;
      }

      return dbErrorResponse('watchlists POST insert', error, {
        uniqueViolation: 'You already have a watchlist with that name.',
        fallback: 'Failed to create watchlist.',
      });
    }

    // Exhausted retries — extremely unlikely path.
    return NextResponse.json(
      { error: 'Could not assign a watchlist position after several attempts. Please try again.' },
      { status: 503 }
    );
  } catch (e) {
    return exceptionResponse('watchlists POST', e);
  }
}
