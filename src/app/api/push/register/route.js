/**
 * Native push tokens for the iOS and Android apps.
 *   POST   { token, platform: 'ios'|'android', appVersion? }  session required;
 *          upserts the device's token for the signed-in user.
 *   DELETE { token }  disables the token. Works with or without a session, so
 *          sign-out can still turn the device off; holding the token is the proof.
 */
import { NextResponse } from 'next/server';
import { requireUser, getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const validToken = (t) => typeof t === 'string' && t.length >= 10 && t.length <= 4096;

export async function POST(request) {
  let user;
  try {
    ({ user } = await requireUser(request));
  } catch {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }
  const rl = await checkRateLimit(`push:register:${user.id}`, { interval: 60000, limit: 10 });
  if (!rl.success) return rateLimitResponse(rl);

  const body = await request.json().catch(() => ({}));
  const { token, platform } = body || {};
  if (!validToken(token) || !['ios', 'android'].includes(platform)) {
    return NextResponse.json({ error: 'Invalid token or platform.' }, { status: 400 });
  }
  const appVersion = typeof body.appVersion === 'string' ? body.appVersion.slice(0, 20) : null;

  const admin = getAdminClient();
  const { error } = await admin.from('device_push_tokens').upsert(
    {
      user_id: user.id,
      platform,
      token,
      app_version: appVersion,
      enabled: true,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'token' },
  );
  if (error) {
    console.error('[push/register]', error.message);
    return NextResponse.json({ error: 'Could not register this device.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request) {
  const rl = await checkRateLimit(`push:unregister:${getClientIp(request)}`, {
    interval: 60000,
    limit: 20,
  });
  if (!rl.success) return rateLimitResponse(rl);
  const body = await request.json().catch(() => ({}));
  if (!validToken(body?.token)) {
    return NextResponse.json({ error: 'Invalid token.' }, { status: 400 });
  }
  const admin = getAdminClient();
  await admin.from('device_push_tokens').update({ enabled: false }).eq('token', body.token);
  return NextResponse.json({ ok: true });
}
