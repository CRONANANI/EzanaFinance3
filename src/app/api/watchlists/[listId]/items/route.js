/**
 * POST /api/watchlists/[listId]/items
 * Add an item (stock, bond ETF, crypto, commodity, politician) to a watchlist.
 * Body: { type: 'stock' | 'bond_etf' | 'crypto' | 'commodity' | 'politician', ticker: string, name?: string, sector?: string, metadata?: object }
 *
 * PATCH /api/watchlists/[listId]/items
 * Star or unstar an item (Nov 2026). Body: { type, ticker, starred: boolean }
 *
 * DELETE /api/watchlists/[listId]/items?ticker=<ticker>&type=<type>
 * Remove an item from a watchlist. ticker and type identify the row.
 */
import { NextResponse } from 'next/server';
import { reconcileChecklist } from '@/lib/onboarding/completeTask';
import { withApiGuard } from '@/lib/api-guard';

import { getAdminClient, getAuthContext } from '@/lib/supabase';
import { dbErrorResponse, exceptionResponse, validationResponse } from '@/lib/api-errors';
import { FmpAPI } from '@/lib/services/fmp';

export const dynamic = 'force-dynamic';

const VALID_TYPES = new Set(['stock', 'bond_etf', 'crypto', 'commodity', 'politician']);
const MAX_REASON = 300;
const STOCK_RE = /^[A-Z][A-Z0-9.-]{0,9}$/;

/** The shape every item response uses (the same fields GET /api/watchlists returns). */
const itemOut = (row) => ({
  id: row.id,
  type: row.type,
  ticker: row.ticker,
  name: row.name || row.ticker,
  sector: row.sector || '',
  metadata: row.metadata || {},
  createdAt: row.created_at || null,
  starredAt: row.starred_at || null,
  addedBy: row.added_by || 'user',
  addedReason: row.added_reason || null,
  price: 0,
  change: 0,
  changePct: 0,
  marketCap: null,
  volume: '–',
});

/**
 * Undo support: the provenance a removed row had. Only what the row can
 * legitimately hold is accepted, and only onto the caller's own list.
 */
function parseRestore(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const out = {};
  if (raw.starred === true) out.starred_at = new Date().toISOString();
  if (raw.addedBy === 'smart' || raw.addedBy === 'user') out.added_by = raw.addedBy;
  if (out.added_by === 'smart' && typeof raw.addedReason === 'string' && raw.addedReason.trim())
    out.added_reason = raw.addedReason.trim().slice(0, MAX_REASON);
  return Object.keys(out).length ? out : null;
}

/**
 * A stock added from search arrives with no sector or market cap, which
 * leaves sector concentration and the cap label empty. Fill them from the
 * company profile (cached for a day). Best effort: a failure adds nothing.
 */
async function stockFacts(ticker) {
  if (!STOCK_RE.test(ticker)) return {};
  try {
    const p = await FmpAPI.getCompanyProfile(ticker);
    const cap = Number(p?.marketCap ?? p?.mktCap);
    return {
      sector: typeof p?.sector === 'string' && p.sector.trim() ? p.sector.trim() : null,
      marketCap: Number.isFinite(cap) && cap > 0 ? cap : null,
    };
  } catch {
    return {};
  }
}

async function assertListOwnedByUser(supabase, listId, userId) {
  const { data, error } = await supabase
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

export const POST = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
    try {
      const { supabase } = await getAuthContext(request);
      if (!supabase) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
      }

      const listId = params.listId;
      if (!listId) return validationResponse('listId is required.');

      const owned = await assertListOwnedByUser(supabase, listId, user.id);
      if (!owned) {
        return NextResponse.json({ error: 'List not found or not yours.' }, { status: 404 });
      }

      const body = await request.json().catch(() => ({}));
      const type = typeof body?.type === 'string' ? body.type.toLowerCase() : '';
      const ticker = typeof body?.ticker === 'string' ? body.ticker.trim().toUpperCase() : '';
      const name = typeof body?.name === 'string' ? body.name.trim() : null;
      let sector = typeof body?.sector === 'string' ? body.sector.trim() : null;
      let metadata = body?.metadata && typeof body.metadata === 'object' ? body.metadata : {};
      const restore = parseRestore(body?.restore);

      if (!VALID_TYPES.has(type)) {
        return validationResponse(`Invalid type. Must be one of: ${[...VALID_TYPES].join(', ')}.`);
      }
      if (!ticker) {
        return validationResponse('ticker is required.');
      }

      if (type === 'stock' && (!sector || !Number.isFinite(Number(metadata.marketCap)))) {
        const facts = await stockFacts(ticker);
        if (!sector && facts.sector) sector = facts.sector;
        if (!Number.isFinite(Number(metadata.marketCap)) && facts.marketCap)
          metadata = { ...metadata, marketCap: facts.marketCap };
      }

      // Upsert by unique (list_id, type, ticker) — idempotent add.
      const { data, error } = await supabase
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
            ...(restore || {}),
          },
          { onConflict: 'list_id,type,ticker', ignoreDuplicates: false },
        )
        .select('*')
        .single();

      if (error) {
        return dbErrorResponse('watchlist items POST', error, {
          fallback: 'Failed to add item to watchlist.',
        });
      }

      const admin = getAdminClient();
      /* Best-effort. Query builders have no .catch, so read the error. */
      const { error: bcErr } = await admin.from('activity_breadcrumbs').insert({
        user_id: user.id,
        event_type: 'watchlist_add',
        event_data: { ticker: data.ticker, watchlist_id: listId },
      });
      if (bcErr) console.warn('[watchlist items] breadcrumb', bcErr.message);

      /* Getting Started checklist: 3 stocks watched, or a member followed. */
      await reconcileChecklist(user.id, {
        only: ['watchlist.add_three', 'explore.follow_member'],
      }).catch(() => {});

      return NextResponse.json({ item: itemOut(data) });
    } catch (e) {
      // assertListOwnedByUser may rethrow a Supabase error — treat it as a DB error.
      if (e?.code) return dbErrorResponse('watchlist items POST ownership', e);
      return exceptionResponse('watchlist items POST', e);
    }
  },
  { requireAuth: true },
);

export const DELETE = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
    try {
      const { supabase } = await getAuthContext(request);
      if (!supabase) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
      }

      const listId = params.listId;
      if (!listId) return validationResponse('listId is required.');

      const { searchParams } = new URL(request.url);
      const ticker = (searchParams.get('ticker') || '').trim().toUpperCase();
      const type = (searchParams.get('type') || '').toLowerCase();

      if (!ticker) return validationResponse('ticker is required.');
      if (!VALID_TYPES.has(type)) {
        return validationResponse(`Invalid type. Must be one of: ${[...VALID_TYPES].join(', ')}.`);
      }

      /* Return what was removed so Undo can put it back as it was. */
      const { data: gone, error } = await supabase
        .from('user_watchlist_items')
        .delete()
        .eq('list_id', listId)
        .eq('user_id', user.id)
        .eq('type', type)
        .eq('ticker', ticker)
        .select('*');

      if (error) {
        return dbErrorResponse('watchlist items DELETE', error, {
          fallback: 'Failed to remove item from watchlist.',
        });
      }

      const admin = getAdminClient();
      /* Best-effort. Query builders have no .catch, so read the error. */
      const { error: bcErr } = await admin.from('activity_breadcrumbs').insert({
        user_id: user.id,
        event_type: 'watchlist_remove',
        event_data: { ticker, watchlist_id: listId },
      });
      if (bcErr) console.warn('[watchlist items] breadcrumb', bcErr.message);

      const removed = Array.isArray(gone) && gone[0] ? itemOut(gone[0]) : null;
      return NextResponse.json({ success: true, removed });
    } catch (e) {
      return exceptionResponse('watchlist items DELETE', e);
    }
  },
  { requireAuth: true },
);

export const PATCH = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
    try {
      const { supabase } = await getAuthContext(request);
      if (!supabase) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
      }
      const listId = params.listId;
      if (!listId) return validationResponse('listId is required.');

      const body = await request.json().catch(() => ({}));
      const type = typeof body?.type === 'string' ? body.type.toLowerCase() : '';
      const ticker = typeof body?.ticker === 'string' ? body.ticker.trim().toUpperCase() : '';
      if (!VALID_TYPES.has(type)) {
        return validationResponse(`Invalid type. Must be one of: ${[...VALID_TYPES].join(', ')}.`);
      }
      if (!ticker) return validationResponse('ticker is required.');
      if (typeof body?.starred !== 'boolean')
        return validationResponse('starred must be true or false.');

      const { data, error } = await supabase
        .from('user_watchlist_items')
        .update({ starred_at: body.starred ? new Date().toISOString() : null })
        .eq('list_id', listId)
        .eq('user_id', user.id)
        .eq('type', type)
        .eq('ticker', ticker)
        .select('id, starred_at')
        .maybeSingle();

      if (error) {
        return dbErrorResponse('watchlist items PATCH', error, {
          fallback: 'Failed to update the star.',
        });
      }
      if (!data) return NextResponse.json({ error: 'Item not found.' }, { status: 404 });
      return NextResponse.json({ item: { id: data.id, starredAt: data.starred_at } });
    } catch (e) {
      return exceptionResponse('watchlist items PATCH', e);
    }
  },
  { requireAuth: true },
);
