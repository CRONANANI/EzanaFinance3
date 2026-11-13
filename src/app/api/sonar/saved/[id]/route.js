import { withApiGuard, safeErrorResponse } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { cleanSavedPatch, isUuid, notMigrated, seatCanShare, shareHref } from '@/lib/sonar/saved';
import { json, NOT_READY, newShareToken, sonarSeat } from '@/lib/sonar/saved-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COLUMNS =
  'id, kind, run_id, parent_id, collection_id, question, title, subject, ticker, depth, note, share_token, shared_at, created_at, updated_at';

const view = (r) => {
  const { share_token: token, ...rest } = r;
  return { ...rest, shared: Boolean(token), shareUrl: token ? shareHref(token) : null };
};

/**
 * /api/sonar/saved/[id] (Sonar research workspace, Nov 13 2026). The caller's own saved item
 * only (RLS and an explicit user filter).
 *
 * GET     the item with its snapshot.
 * PATCH   { title?, note?, collectionId? (the caller's folder or null), share?: boolean }.
 *         share: true makes a new random link on the server (never from the client) and
 *         share: false clears it, which kills the link. Organization and partner seats
 *         cannot share: their research is shared through the organization's own workflow.
 * DELETE  removes the item.
 */
export const GET = withApiGuard(async (request, user, context) => {
  try {
    const id = String(context?.params?.id || '');
    if (!isUuid(id)) return json({ error: 'Not found.' }, 404);
    const { data, error } = await getUserClient()
      .from('sonar_saved_research')
      .select(`${COLUMNS}, snapshot`)
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) {
      if (notMigrated(error)) return json(NOT_READY, 503);
      throw error;
    }
    if (!data) return json({ error: 'Not found.' }, 404);
    return json({ item: view(data) });
  } catch (err) {
    return safeErrorResponse(err, {
      message: 'That saved answer is not available right now.',
      context: 'sonar/saved/id',
    });
  }
});

export const PATCH = withApiGuard(
  async (request, user, context) => {
    try {
      const id = String(context?.params?.id || '');
      if (!isUuid(id)) return json({ error: 'Not found.' }, 404);
      const clean = cleanSavedPatch(await request.json().catch(() => null));
      if (!clean.ok) return json({ error: clean.error }, 400);
      const supabase = getUserClient();
      const patch = { ...clean.patch };
      if (patch.collection_id) {
        const { data: folder } = await supabase
          .from('sonar_research_collections')
          .select('id')
          .eq('id', patch.collection_id)
          .eq('user_id', user.id)
          .maybeSingle();
        if (!folder) return json({ error: 'Unknown folder.' }, 404);
      }
      if (clean.share === true) {
        const seat = await sonarSeat(supabase, user);
        if (!seatCanShare(seat)) {
          return json(
            {
              error:
                "Research from an organization seat is shared through your organization's reports, not a public link.",
            },
            403,
          );
        }
        patch.share_token = newShareToken();
        patch.shared_at = new Date().toISOString();
      } else if (clean.share === false) {
        patch.share_token = null;
        patch.shared_at = null;
      }
      patch.updated_at = new Date().toISOString();
      const { data, error } = await supabase
        .from('sonar_saved_research')
        .update(patch)
        .eq('id', id)
        .eq('user_id', user.id)
        .select(COLUMNS)
        .maybeSingle();
      if (error) {
        if (notMigrated(error)) return json(NOT_READY, 503);
        throw error;
      }
      if (!data) return json({ error: 'Not found.' }, 404);
      return json({ item: view(data) });
    } catch (err) {
      return safeErrorResponse(err, {
        message: 'That change could not be saved.',
        context: 'sonar/saved/id',
      });
    }
  },
  { strict: true },
);

export const DELETE = withApiGuard(
  async (request, user, context) => {
    try {
      const id = String(context?.params?.id || '');
      if (!isUuid(id)) return json({ error: 'Not found.' }, 404);
      const { data, error } = await getUserClient()
        .from('sonar_saved_research')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
        .select('id');
      if (error) {
        if (notMigrated(error)) return json(NOT_READY, 503);
        throw error;
      }
      if (!data?.length) return json({ error: 'Not found.' }, 404);
      return json({ ok: true });
    } catch (err) {
      return safeErrorResponse(err, {
        message: 'That saved answer could not be removed.',
        context: 'sonar/saved/id',
      });
    }
  },
  { strict: true },
);
