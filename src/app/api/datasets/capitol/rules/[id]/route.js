/**
 * PATCH  /api/datasets/capitol/rules/:id  any of { name, datasets, conditions, window, alerts }
 * DELETE /api/datasets/capitol/rules/:id
 * Session required; RLS keeps each reader to their own rows.
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAuthContext } from '@/lib/supabase';
import { dbErrorResponse, exceptionResponse, validationResponse } from '@/lib/api-errors';
import { validateRule } from '@/lib/datasets/capitol-hub/signals';
import { RULE_COLS, ruleFromRow, rowFromRule } from '@/lib/datasets/capitol-hub/rule-rows';

export const dynamic = 'force-dynamic';

const TABLE = 'capitol_signal_rules';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const PATCH = withApiGuard(async (request, user, { params }) => {
  try {
    if (!UUID.test(params?.id || '')) return validationResponse('Unknown signal.');
    const body = (await request.json().catch(() => null)) || {};
    const { supabase } = await getAuthContext(request);
    const { data: cur, error: readError } = await supabase
      .from(TABLE)
      .select(RULE_COLS)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (readError) {
      return dbErrorResponse('capitol rules PATCH read', readError, {
        fallback: 'Could not update the signal.',
      });
    }
    if (!cur) return NextResponse.json({ ok: false, error: 'Signal not found.' }, { status: 404 });
    /* Merge onto the stored rule, then validate the whole rule again. */
    const merged = { ...ruleFromRow(cur), ...body };
    const v = validateRule(merged);
    if (!v.ok) return validationResponse(v.error);
    const { data, error } = await supabase
      .from(TABLE)
      .update({ ...rowFromRule(v.rule), updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select(RULE_COLS)
      .single();
    if (error) {
      return dbErrorResponse('capitol rules PATCH', error, {
        fallback: 'Could not update the signal.',
      });
    }
    return NextResponse.json({ ok: true, rule: ruleFromRow(data) });
  } catch (e) {
    return exceptionResponse('capitol rules PATCH', e);
  }
});

export const DELETE = withApiGuard(async (request, user, { params }) => {
  try {
    if (!UUID.test(params?.id || '')) return validationResponse('Unknown signal.');
    const { supabase } = await getAuthContext(request);
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id);
    if (error) {
      return dbErrorResponse('capitol rules DELETE', error, {
        fallback: 'Could not delete the signal.',
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return exceptionResponse('capitol rules DELETE', e);
  }
});
