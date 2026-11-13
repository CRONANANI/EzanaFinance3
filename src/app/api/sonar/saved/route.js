import { withApiGuard, safeErrorResponse } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { SAVED_MAX, SAVED_PAGE, cleanSaveBody, isUuid, notMigrated } from '@/lib/sonar/saved';
import { json, NOT_READY } from '@/lib/sonar/saved-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LIST_COLUMNS =
  'id, kind, run_id, collection_id, question, title, subject, ticker, depth, shared_at, created_at, updated_at';

/**
 * GET /api/sonar/saved?collection=<uuid|none>&q=<title search>&ticker=&subject=&limit=
 *
 * Saved research (Sonar research workspace, Nov 13 2026): the caller's saved answers, newest
 * first, without their snapshots. `collection=none` lists the unfiled ones; `ticker` or
 * `subject` (with a small `limit`) feeds the right rail's Related research. RLS: own rows.
 *
 * 200 { items: [{ ...LIST_COLUMNS, shared: boolean }] }
 */
export const GET = withApiGuard(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const supabase = getUserClient();
    const limit = Math.min(
      SAVED_PAGE,
      Math.max(1, Number(searchParams.get('limit')) || SAVED_PAGE),
    );
    let q = supabase
      .from('sonar_saved_research')
      .select(LIST_COLUMNS)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(limit);
    const collection = String(searchParams.get('collection') || '');
    if (collection === 'none') q = q.is('collection_id', null);
    else if (isUuid(collection)) q = q.eq('collection_id', collection);
    const search = String(searchParams.get('q') || '')
      .replace(/[%_,()*\\]/g, ' ')
      .trim()
      .slice(0, 80);
    if (search) q = q.ilike('title', `%${search}%`);
    const ticker = String(searchParams.get('ticker') || '')
      .trim()
      .toUpperCase();
    const subject = String(searchParams.get('subject') || '')
      .replace(/[%_,()*\\]/g, ' ')
      .trim()
      .slice(0, 160);
    if (/^[A-Z0-9.-]{1,12}$/.test(ticker) && subject) {
      q = q.or(`ticker.eq.${ticker},subject.ilike.${subject}`);
    } else if (/^[A-Z0-9.-]{1,12}$/.test(ticker)) q = q.eq('ticker', ticker);
    else if (subject) q = q.ilike('subject', subject);
    const { data, error } = await q;
    if (error) {
      if (notMigrated(error)) return json({ items: [], unavailable: true });
      throw error;
    }
    return json({
      items: (data || []).map(({ shared_at, ...r }) => ({
        ...r,
        shared_at,
        shared: Boolean(shared_at),
      })),
    });
  } catch (err) {
    return safeErrorResponse(err, {
      message: 'Saved research is not available right now.',
      context: 'sonar/saved',
    });
  }
});

/**
 * POST /api/sonar/saved
 * Body { kind, runId?, parentId?, question, subject?, ticker?, depth?, controls?, snapshot }
 *
 * Saves an answer as the reader saw it. The snapshot loses every private field (user, plan,
 * quota, organization, attached file) before it is stored, and may be at most 600 KB. A
 * research item's run must be one the caller owns. At most 500 saved items per reader.
 *
 * 201 { item: { id, title, ... } }
 */
export const POST = withApiGuard(
  async (request, user) => {
    try {
      const body = await request.json().catch(() => null);
      const clean = cleanSaveBody(body);
      if (!clean.ok) return json({ error: clean.error }, clean.status);
      const supabase = getUserClient();
      const { count, error: countError } = await supabase
        .from('sonar_saved_research')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      if (countError) {
        if (notMigrated(countError)) return json(NOT_READY, 503);
        throw countError;
      }
      if ((count || 0) >= SAVED_MAX) {
        return json(
          {
            error: `You have ${SAVED_MAX} saved items, the most Sonar keeps. Remove some to save more.`,
          },
          409,
        );
      }
      const row = clean.row;
      if (row.run_id) {
        const { data: run } = await supabase
          .from('sonar_research_runs')
          .select('id, user_id')
          .eq('id', row.run_id)
          .maybeSingle();
        if (!run || run.user_id !== user.id) return json({ error: 'Unknown research run.' }, 404);
      }
      if (row.parent_id) {
        const { data: parent } = await supabase
          .from('sonar_saved_research')
          .select('id')
          .eq('id', row.parent_id)
          .eq('user_id', user.id)
          .maybeSingle();
        if (!parent) row.parent_id = null;
      }
      const { data, error } = await supabase
        .from('sonar_saved_research')
        .insert({ ...row, user_id: user.id })
        .select(LIST_COLUMNS)
        .single();
      if (error) {
        if (notMigrated(error)) return json(NOT_READY, 503);
        throw error;
      }
      return json({ item: { ...data, shared: Boolean(data.shared_at) } }, 201);
    } catch (err) {
      return safeErrorResponse(err, {
        message: 'That answer could not be saved.',
        context: 'sonar/saved',
      });
    }
  },
  { strict: true },
);
