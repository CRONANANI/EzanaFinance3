import { NextResponse } from 'next/server';
import { requireUser, getAdminClient } from '@/lib/supabase';
import { isAdminUser } from '@/lib/admin-helpers';
import { getSnapTradeClient, ensureSnapTradeUser, readSnapTradeError } from '@/lib/snaptrade';
import { sanitizeUUID } from '@/lib/sanitize';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/snaptrade/reset-user
 * Body: { userId?: string } — defaults to the calling admin's own user
 */
export async function POST(request) {
  let user;
  try {
    ({ user } = await requireUser(request));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isAdminUser(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const targetUserId = sanitizeUUID(body?.userId || user.id);
  if (!targetUserId) {
    return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
  }

  const snapUserId = `ezana_${targetUserId}`;
  const snaptrade = getSnapTradeClient();
  const supabase = getAdminClient();
  const result = { snapUserId, steps: [] };

  try {
    await snaptrade.authentication.deleteSnapTradeUser({ userId: snapUserId });
    result.steps.push({ step: 'delete_snaptrade_user', ok: true });
  } catch (err) {
    const info = readSnapTradeError(err);
    result.steps.push({
      step: 'delete_snaptrade_user',
      ok: false,
      status: info.status,
      detail: info.detail,
      benign: info.status === 404,
    });
  }

  await new Promise((r) => setTimeout(r, 1500));

  try {
    await supabase.from('snaptrade_accounts').delete().eq('user_id', targetUserId);
    await supabase.from('snaptrade_connections').delete().eq('user_id', targetUserId);
    await supabase.from('snaptrade_users').delete().eq('user_id', targetUserId);
    result.steps.push({ step: 'clear_local_rows', ok: true });
  } catch (err) {
    result.steps.push({ step: 'clear_local_rows', ok: false, message: err?.message });
  }

  try {
    const creds = await ensureSnapTradeUser(targetUserId);
    result.steps.push({
      step: 'reregister',
      ok: true,
      hasUserId: Boolean(creds.userId),
      hasUserSecret: Boolean(creds.userSecret),
    });
  } catch (err) {
    const info = readSnapTradeError(err);
    result.steps.push({
      step: 'reregister',
      ok: false,
      status: info.status,
      detail: info.detail,
      message: err?.message,
    });
    return NextResponse.json({ ok: false, ...result }, { status: 502 });
  }

  return NextResponse.json({ ok: true, ...result });
}
