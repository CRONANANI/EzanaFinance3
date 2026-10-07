/**
 * Self-serve API keys (Settings, API tab). Session required.
 *   GET   your keys (prefix, name, tier, status, created, last used) and
 *         30-day usage per day
 *   POST  { name } create a Developer key; the raw key is returned once
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { createDeveloperKey, IssueError } from '@/lib/ezana-api/issue';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = withApiGuard(
  async (request, user) => {
    const admin = getAdminClient();
    const { data: keys } = await admin
      .from('api_keys')
      .select(
        'id, key_prefix, name, tier, status, rate_limit_per_min, delay_days, created_at, last_used_at, revoked_at, expires_at',
      )
      .eq('owner_user_id', user.id)
      .order('created_at', { ascending: false });
    const ids = (keys || []).map((k) => k.id);
    const since = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
    const { data: usage } = ids.length
      ? await admin
          .from('api_usage_daily')
          .select('key_id, day, requests, errors')
          .in('key_id', ids)
          .gte('day', since)
      : { data: [] };
    return NextResponse.json({
      keys: (keys || []).map((k) => ({
        id: k.id,
        prefix: k.status === 'pending_claim' ? null : k.key_prefix,
        name: k.name,
        tier: k.tier,
        status: k.status,
        rateLimitPerMin: k.rate_limit_per_min,
        delayDays: k.delay_days,
        createdAt: k.created_at,
        lastUsedAt: k.last_used_at,
        expiresAt: k.expires_at,
      })),
      usage: usage || [],
    });
  },
  { requireAuth: true },
);

export const POST = withApiGuard(
  async (request, user) => {
    const rl = await checkRateLimit(`ezana-api:keys:create:${user.id}`, {
      limit: 5,
      window: '1 h',
    });
    if (!rl.success) return rateLimitResponse(rl);
    if (!user.email)
      return NextResponse.json({ error: 'Your account needs an email address.' }, { status: 400 });
    const body = await request.json().catch(() => ({}));
    try {
      const key = await createDeveloperKey(getAdminClient(), user, body?.name);
      return NextResponse.json(
        { ok: true, id: key.id, prefix: key.prefix, key: key.raw },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    } catch (e) {
      if (e instanceof IssueError)
        return NextResponse.json({ error: e.message }, { status: e.status });
      console.error('[ezana-api keys]', e?.message || e);
      return NextResponse.json({ error: 'Could not create the key.' }, { status: 500 });
    }
  },
  { requireAuth: true },
);
