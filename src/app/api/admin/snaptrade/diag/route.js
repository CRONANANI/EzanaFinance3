import { NextResponse } from 'next/server';
import { requireUser, getAdminClient } from '@/lib/supabase';
import { isAdminUser } from '@/lib/admin-helpers';
import { getSnapTradeClient, ensureSnapTradeUser, readSnapTradeError } from '@/lib/snaptrade';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/snaptrade/diag
 *
 * Full health-check of the SnapTrade integration (admin-only).
 */
export async function GET(request) {
  let user;
  try {
    ({ user } = await requireUser(request));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isAdminUser(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const out = {
    timestamp: new Date().toISOString(),
    env: {
      SNAPTRADE_CLIENT_ID_present: Boolean(process.env.SNAPTRADE_CLIENT_ID),
      SNAPTRADE_CONSUMER_KEY_present: Boolean(process.env.SNAPTRADE_CONSUMER_KEY),
      SNAPTRADE_CLIENT_ID_length: (process.env.SNAPTRADE_CLIENT_ID || '').length,
      SNAPTRADE_CONSUMER_KEY_length: (process.env.SNAPTRADE_CONSUMER_KEY || '').length,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV || 'local',
    },
    clientInit: { ok: false, error: null },
    referenceDataReachable: { ok: false, error: null, brokerageCount: 0 },
    brokeragesCache: { ok: false, error: null, rowCount: 0, sampleSlug: null },
    ensureUser: { ok: false, error: null, hasUserId: false, hasUserSecret: false },
    sampleLogin: { ok: false, error: null, brokerTested: null, hasRedirectURI: false },
  };

  let snaptrade;
  try {
    snaptrade = getSnapTradeClient();
    out.clientInit.ok = true;
  } catch (err) {
    out.clientInit.error = err?.message || String(err);
    return NextResponse.json(out);
  }

  try {
    const res = await snaptrade.referenceData.listAllBrokerages();
    out.referenceDataReachable.ok = true;
    out.referenceDataReachable.brokerageCount = (res?.data || []).length;
  } catch (err) {
    const info = readSnapTradeError(err);
    out.referenceDataReachable.error = {
      status: info.status,
      detail: info.detail,
      message: err?.message,
      code: info.code,
    };
  }

  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('snaptrade_brokerages_cache')
      .select('slug', { count: 'exact' });
    if (error) {
      out.brokeragesCache.error = error.message;
    } else {
      out.brokeragesCache.ok = true;
      out.brokeragesCache.rowCount = (data || []).length;
      out.brokeragesCache.sampleSlug = data?.[0]?.slug || null;
    }
  } catch (err) {
    out.brokeragesCache.error = err?.message || String(err);
  }

  let creds;
  try {
    creds = await ensureSnapTradeUser(user.id);
    out.ensureUser.ok = true;
    out.ensureUser.hasUserId = Boolean(creds?.userId);
    out.ensureUser.hasUserSecret = Boolean(creds?.userSecret);
  } catch (err) {
    const info = readSnapTradeError(err);
    out.ensureUser.error = {
      status: info.status,
      detail: info.detail,
      message: err?.message,
      code: info.code,
    };
    return NextResponse.json(out);
  }

  try {
    const supabase = getAdminClient();
    const { data } = await supabase
      .from('snaptrade_brokerages_cache')
      .select('slug')
      .eq('enabled', true)
      .eq('maintenance_mode', false)
      .limit(1);
    const testBroker = data?.[0]?.slug || undefined;
    out.sampleLogin.brokerTested = testBroker || '(no broker hint)';

    const res = await snaptrade.authentication.loginSnapTradeUser({
      userId: creds.userId,
      userSecret: creds.userSecret,
      broker: testBroker,
      immediateRedirect: false,
      customRedirect: `${new URL(request.url).origin}/portfolio/connect-callback`,
      connectionType: 'read',
    });
    out.sampleLogin.ok = true;
    out.sampleLogin.hasRedirectURI = Boolean(res?.data?.redirectURI);
  } catch (err) {
    const info = readSnapTradeError(err);
    out.sampleLogin.error = {
      status: info.status,
      detail: info.detail,
      message: err?.message,
      code: info.code,
    };
  }

  return NextResponse.json(out);
}
