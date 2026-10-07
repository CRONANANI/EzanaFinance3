import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const LOG_RETENTION_DAYS = 30;

/**
 * Daily Ezana API housekeeping:
 *   - drop request-log rows older than 30 days (usage totals stay in api_usage_daily)
 *   - revoke keys past their expiry
 *   - void claim links past their 7 days (the key stays pending_claim, unclaimable,
 *     until an admin re-approves or revokes it)
 */
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  if ((request.headers.get('authorization') ?? '') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getAdminClient();
  const now = new Date().toISOString();
  const logCutoff = new Date(Date.now() - LOG_RETENTION_DAYS * 86400000).toISOString();
  const out = {};

  const logs = await admin.from('api_request_log').delete({ count: 'exact' }).lt('at', logCutoff);
  out.logs_deleted = logs.error ? `error: ${logs.error.message}` : logs.count || 0;

  const expired = await admin
    .from('api_keys')
    .update({ status: 'revoked', revoked_at: now }, { count: 'exact' })
    .eq('status', 'active')
    .lt('expires_at', now);
  out.keys_revoked = expired.error ? `error: ${expired.error.message}` : expired.count || 0;

  const claims = await admin
    .from('api_keys')
    .update({ claim_token_hash: null }, { count: 'exact' })
    .eq('status', 'pending_claim')
    .not('claim_token_hash', 'is', null)
    .lt('claim_expires_at', now);
  out.claims_expired = claims.error ? `error: ${claims.error.message}` : claims.count || 0;

  const failed = Object.values(out).some((v) => typeof v === 'string');
  if (failed) console.error('[api-housekeeping]', out);
  return NextResponse.json({ ok: !failed, ...out }, { status: failed ? 500 : 200 });
}
