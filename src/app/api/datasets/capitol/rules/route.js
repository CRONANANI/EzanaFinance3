/**
 * GET  /api/datasets/capitol/rules   the signed-in reader's Capitol signal rules, oldest first
 * POST /api/datasets/capitol/rules   { name, datasets, conditions, window, alerts } -> the saved rule
 * Session required. Rows are owned by the reader; RLS enforces it. At most
 * MAX_RULES per reader, enforced here.
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAuthContext } from '@/lib/supabase';
import { dbErrorResponse, exceptionResponse, validationResponse } from '@/lib/api-errors';
import { MAX_RULES, validateRule } from '@/lib/datasets/capitol-hub/signals';
import { RULE_COLS, ruleFromRow, rowFromRule } from '@/lib/datasets/capitol-hub/rule-rows';

export const dynamic = 'force-dynamic';

const TABLE = 'capitol_signal_rules';

export const GET = withApiGuard(async (request, user) => {
  try {
    const { supabase } = await getAuthContext(request);
    const { data, error } = await supabase
      .from(TABLE)
      .select(RULE_COLS)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(MAX_RULES);
    if (error) {
      return dbErrorResponse('capitol rules GET', error, {
        fallback: 'Could not load your signals.',
      });
    }
    return NextResponse.json({ ok: true, rules: (data || []).map(ruleFromRow), max: MAX_RULES });
  } catch (e) {
    return exceptionResponse('capitol rules GET', e);
  }
});

export const POST = withApiGuard(async (request, user) => {
  try {
    const body = await request.json().catch(() => null);
    const v = validateRule(body);
    if (!v.ok) return validationResponse(v.error);
    const { supabase } = await getAuthContext(request);
    const { count, error: countError } = await supabase
      .from(TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);
    if (countError) {
      return dbErrorResponse('capitol rules count', countError, {
        fallback: 'Could not save the signal.',
      });
    }
    if ((count || 0) >= MAX_RULES) {
      return NextResponse.json(
        {
          ok: false,
          error: `You can keep up to ${MAX_RULES} signals. Delete one to save another.`,
        },
        { status: 409 },
      );
    }
    const { data, error } = await supabase
      .from(TABLE)
      .insert({ user_id: user.id, ...rowFromRule(v.rule) })
      .select(RULE_COLS)
      .single();
    if (error) {
      return dbErrorResponse('capitol rules POST', error, {
        fallback: 'Could not save the signal.',
      });
    }
    return NextResponse.json({ ok: true, rule: ruleFromRow(data) }, { status: 201 });
  } catch (e) {
    return exceptionResponse('capitol rules POST', e);
  }
});
