import { withApiGuard, safeErrorResponse } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { HISTORY_PAGE, isUuid } from '@/lib/sonar/saved';
import { json } from '@/lib/sonar/saved-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/sonar/history?cursor=<ISO created_at>
 * GET /api/sonar/history?id=<uuid>   one run with its stored report ({ run })
 *
 * Research history (Sonar research workspace, Nov 13 2026): the caller's own standard and
 * deep research runs, newest first, 30 a page. RLS on sonar_research_runs returns own rows
 * only. Quick pings are not stored on the server; the page reads those from this device.
 *
 * 200 { items: [{ id, question, subject, depth, status, created_at }], nextCursor }
 */
export const GET = withApiGuard(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const cursor = String(searchParams.get('cursor') || '');
    const supabase = getUserClient();
    /* ?id=<uuid>: one of the caller's runs with its stored report, to open it again. */
    const id = String(searchParams.get('id') || '');
    if (id) {
      if (!isUuid(id)) return json({ error: 'Not found.' }, 404);
      const { data: run, error: runError } = await supabase
        .from('sonar_research_runs')
        .select('id, question, subject, depth, status, created_at, duration_ms, plan, report')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (runError) throw runError;
      if (!run) return json({ error: 'Not found.' }, 404);
      return json({ run });
    }
    let q = supabase
      .from('sonar_research_runs')
      .select('id, question, subject, depth, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(HISTORY_PAGE + 1);
    if (cursor && !Number.isNaN(Date.parse(cursor))) q = q.lt('created_at', cursor);
    const { data, error } = await q;
    if (error) throw error;
    const rows = data || [];
    const items = rows.slice(0, HISTORY_PAGE).map((r) => ({
      id: r.id,
      question: r.question,
      subject:
        typeof r.subject === 'string' ? r.subject : r.subject?.label || r.subject?.name || null,
      depth: r.depth,
      status: r.status,
      created_at: r.created_at,
    }));
    return json({
      items,
      nextCursor: rows.length > HISTORY_PAGE ? items[items.length - 1].created_at : null,
    });
  } catch (err) {
    return safeErrorResponse(err, {
      message: 'Research history is not available right now.',
      context: 'sonar/history',
    });
  }
});
