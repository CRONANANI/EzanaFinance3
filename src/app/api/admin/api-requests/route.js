/**
 * GET /api/admin/api-requests?status=pending|approved|declined|all
 * Admin only (isAdminUser). Access requests newest first, plus every issued key.
 */
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { requireWaitlistAdmin } from '@/lib/waitlist/admin';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { denied } = await requireWaitlistAdmin(request);
  if (denied) return denied;
  const status = new URL(request.url).searchParams.get('status') || 'pending';
  const admin = getAdminClient();
  let q = admin
    .from('api_access_requests')
    .select(
      'id, created_at, name, email, company, role, use_case, datasets, volume, status, reviewed_at, reviewed_by, review_note, api_key_id',
    )
    .order('created_at', { ascending: false })
    .limit(500);
  if (status === 'pending') q = q.or('status.is.null,status.eq.pending,status.eq.new');
  else if (status !== 'all') q = q.eq('status', status);
  const [{ data: requests, error }, { data: keys }] = await Promise.all([
    q,
    admin
      .from('api_keys')
      .select(
        'id, key_prefix, name, owner_email, company, tier, scopes, rate_limit_per_min, delay_days, status, created_at, claimed_at, last_used_at, expires_at, claim_expires_at',
      )
      .order('created_at', { ascending: false })
      .limit(500),
  ]);
  if (error)
    return NextResponse.json({ ok: false, error: 'Could not load requests.' }, { status: 500 });
  return NextResponse.json({
    ok: true,
    requests: requests || [],
    keys: (keys || []).map((k) => ({
      ...k,
      key_prefix: k.status === 'pending_claim' ? null : k.key_prefix,
    })),
  });
}
