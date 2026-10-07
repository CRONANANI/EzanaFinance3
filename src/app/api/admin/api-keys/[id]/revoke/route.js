/** POST /api/admin/api-keys/<id>/revoke: admin only. Takes effect on the key's next request. */
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { sanitizeUUID } from '@/lib/sanitize';
import { requireWaitlistAdmin } from '@/lib/waitlist/admin';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const { denied } = await requireWaitlistAdmin(request);
  if (denied) return denied;
  const id = sanitizeUUID(params?.id);
  if (!id) return NextResponse.json({ ok: false, error: 'Invalid id.' }, { status: 400 });
  const { data, error } = await getAdminClient()
    .from('api_keys')
    .update({ status: 'revoked', revoked_at: new Date().toISOString(), claim_token_hash: null })
    .eq('id', id)
    .neq('status', 'revoked')
    .select('id');
  if (error) return NextResponse.json({ ok: false, error: 'Could not revoke.' }, { status: 500 });
  if (!data?.length)
    return NextResponse.json(
      { ok: false, error: 'Key not found or already revoked.' },
      { status: 404 },
    );
  return NextResponse.json({ ok: true });
}
