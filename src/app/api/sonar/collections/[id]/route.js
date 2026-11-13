import { withApiGuard, safeErrorResponse } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { cleanCollectionName, isUuid, notMigrated } from '@/lib/sonar/saved';
import { json, NOT_READY } from '@/lib/sonar/saved-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * /api/sonar/collections/[id] (Sonar research workspace, Nov 13 2026). The caller's own
 * folder only.
 *
 * PATCH   { name } renames it.
 * DELETE  removes the folder; its items stay saved, with no folder (the foreign key sets
 *         collection_id to null).
 */
export const PATCH = withApiGuard(
  async (request, user, context) => {
    try {
      const id = String(context?.params?.id || '');
      if (!isUuid(id)) return json({ error: 'Not found.' }, 404);
      const body = await request.json().catch(() => null);
      const name = cleanCollectionName(body?.name);
      if (!name) return json({ error: 'A folder name needs 1 to 60 characters.' }, 400);
      const { data, error } = await getUserClient()
        .from('sonar_research_collections')
        .update({ name, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)
        .select('id, name, created_at')
        .maybeSingle();
      if (error) {
        if (error.code === '23505')
          return json({ error: 'You already have a folder with that name.' }, 409);
        if (notMigrated(error)) return json(NOT_READY, 503);
        throw error;
      }
      if (!data) return json({ error: 'Not found.' }, 404);
      return json({ item: data });
    } catch (err) {
      return safeErrorResponse(err, {
        message: 'That folder could not be renamed.',
        context: 'sonar/collections/id',
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
        .from('sonar_research_collections')
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
        message: 'That folder could not be removed.',
        context: 'sonar/collections/id',
      });
    }
  },
  { strict: true },
);
