import { withApiGuard, safeErrorResponse } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { COLLECTIONS_MAX, cleanCollectionName, notMigrated } from '@/lib/sonar/saved';
import { json, NOT_READY } from '@/lib/sonar/saved-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * /api/sonar/collections (Sonar research workspace, Nov 13 2026): the folders of the caller's
 * research library. RLS: own rows.
 *
 * GET   { items: [{ id, name, count, created_at }], unfiled }
 * POST  { name } (1 to 60 characters, unique per reader ignoring case, at most 50 folders)
 */
export const GET = withApiGuard(async (request, user) => {
  try {
    const supabase = getUserClient();
    const [{ data: folders, error }, { data: items, error: itemsError }] = await Promise.all([
      supabase
        .from('sonar_research_collections')
        .select('id, name, created_at')
        .eq('user_id', user.id)
        .order('name', { ascending: true }),
      supabase.from('sonar_saved_research').select('collection_id').eq('user_id', user.id),
    ]);
    if (error || itemsError) {
      if (notMigrated(error || itemsError))
        return json({ items: [], unfiled: 0, unavailable: true });
      throw error || itemsError;
    }
    const counts = new Map();
    for (const r of items || []) {
      const k = r.collection_id || 'none';
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    return json({
      items: (folders || []).map((f) => ({ ...f, count: counts.get(f.id) || 0 })),
      unfiled: counts.get('none') || 0,
    });
  } catch (err) {
    return safeErrorResponse(err, {
      message: 'Your research library is not available right now.',
      context: 'sonar/collections',
    });
  }
});

export const POST = withApiGuard(
  async (request, user) => {
    try {
      const body = await request.json().catch(() => null);
      const name = cleanCollectionName(body?.name);
      if (!name) return json({ error: 'A folder name needs 1 to 60 characters.' }, 400);
      const supabase = getUserClient();
      const { count, error: countError } = await supabase
        .from('sonar_research_collections')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      if (countError) {
        if (notMigrated(countError)) return json(NOT_READY, 503);
        throw countError;
      }
      if ((count || 0) >= COLLECTIONS_MAX)
        return json({ error: `Your library holds at most ${COLLECTIONS_MAX} folders.` }, 409);
      const { data, error } = await supabase
        .from('sonar_research_collections')
        .insert({ user_id: user.id, name })
        .select('id, name, created_at')
        .single();
      if (error) {
        if (error.code === '23505')
          return json({ error: 'You already have a folder with that name.' }, 409);
        if (notMigrated(error)) return json(NOT_READY, 503);
        throw error;
      }
      return json({ item: { ...data, count: 0 } }, 201);
    } catch (err) {
      return safeErrorResponse(err, {
        message: 'That folder could not be created.',
        context: 'sonar/collections',
      });
    }
  },
  { strict: true },
);
