/**
 * GET  /api/ezanaql/saved        the signed-in user's saved EzanaQL reports, newest first
 * POST /api/ezanaql/saved        { title, query, prompt?, datasetScope?, rowCount? }
 * Session required. Rows are owned by the user; RLS enforces it.
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAuthContext } from '@/lib/supabase';
import { dbErrorResponse, exceptionResponse, validationResponse } from '@/lib/api-errors';
import { validateEzanaQL } from '@/lib/ezanaql';

export const dynamic = 'force-dynamic';

const MAX_SAVED = 200;
const COLS = 'id, title, prompt, query, dataset_scope, row_count, created_at';
const clip = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

export const GET = withApiGuard(async (request, user) => {
  try {
    const { supabase } = await getAuthContext(request);
    const { data, error } = await supabase
      .from('ezanaql_saved_reports')
      .select(COLS)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(MAX_SAVED);
    if (error) {
      return dbErrorResponse('ezanaql saved GET', error, {
        fallback: 'Could not load saved reports.',
      });
    }
    return NextResponse.json({ ok: true, reports: data || [] });
  } catch (e) {
    return exceptionResponse('ezanaql saved GET', e);
  }
});

export const POST = withApiGuard(async (request, user) => {
  try {
    const body = await request.json().catch(() => ({}));
    const query = clip(body?.query, 4000);
    const title = clip(body?.title, 120) || 'Untitled report';
    const prompt = clip(body?.prompt, 500) || null;
    const datasetScope = clip(body?.datasetScope, 80) || null;
    const rowCount = Number.isInteger(body?.rowCount) && body.rowCount >= 0 ? body.rowCount : null;
    if (!query) return validationResponse('No query to save.');
    const v = validateEzanaQL(query);
    if (!v.ok) return validationResponse(v.error || 'That query is not valid EzanaQL.');

    const { supabase } = await getAuthContext(request);
    const { count } = await supabase
      .from('ezanaql_saved_reports')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);
    if ((count || 0) >= MAX_SAVED) {
      return NextResponse.json(
        {
          ok: false,
          error: `You can keep up to ${MAX_SAVED} saved reports. Delete one to save another.`,
        },
        { status: 409 },
      );
    }
    const { data, error } = await supabase
      .from('ezanaql_saved_reports')
      .insert({
        user_id: user.id,
        title,
        prompt,
        query,
        dataset_scope: datasetScope,
        row_count: rowCount,
      })
      .select(COLS)
      .single();
    if (error) {
      return dbErrorResponse('ezanaql saved POST', error, {
        fallback: 'Could not save the report.',
      });
    }
    return NextResponse.json({ ok: true, report: data }, { status: 201 });
  } catch (e) {
    return exceptionResponse('ezanaql saved POST', e);
  }
});
