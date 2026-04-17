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
import {
  dbErrorResponse,
  exceptionResponse,
  validationResponse,
} from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

const MAX_LABEL = 80;

export async function PATCH(request, { params }) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { listId } = params;
    if (!listId) return validationResponse('listId is required.');

    const body = await request.json().catch(() => ({}));
    const label = typeof body?.label === 'string' ? body.label.trim() : '';
    if (!label) return validationResponse('Label is required.');
    if (label.length > MAX_LABEL) {
      return validationResponse(`Label too long (max ${MAX_LABEL} characters).`);
    }

    const { data, error } = await supabaseAdmin
      .from('user_watchlists')
      .update({ label, updated_at: new Date().toISOString() })
      .eq('id', listId)
      .eq('user_id', user.id)
      .select('id, label')
      .single();

    if (error) {
      return dbErrorResponse('watchlists PATCH', error, {
        uniqueViolation: 'You already have a watchlist with that name.',
        notFound: 'Watchlist not found or not yours.',
        fallback: 'Failed to rename watchlist.',
      });
    }
    if (!data) {
      return NextResponse.json(
        { error: 'Watchlist not found or not yours.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ watchlist: data });
  } catch (e) {
    return exceptionResponse('watchlists PATCH', e);
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

    const { error } = await supabaseAdmin
      .from('user_watchlists')
      .delete()
      .eq('id', listId)
      .eq('user_id', user.id);

    if (error) {
      return dbErrorResponse('watchlists DELETE', error, {
        fallback: 'Failed to delete watchlist.',
      });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return exceptionResponse('watchlists DELETE', e);
  }
}
