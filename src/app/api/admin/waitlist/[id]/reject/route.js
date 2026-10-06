/**
 * POST /api/admin/waitlist/:id/reject
 * Admin only. Marks the entry rejected and voids any live invite. No email.
 */
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
    .from('waitlist')
    .update({
      status: 'rejected',
      rejected_at: new Date().toISOString(),
      invite_token_hash: null,
      invite_expires_at: null,
    })
    .eq('id', id)
    .neq('status', 'joined')
    .select('id');
  if (error) {
    console.error('[admin/waitlist reject] update failed:', error.message);
    return NextResponse.json({ ok: false, error: 'Could not reject.' }, { status: 500 });
  }
  if (!data || !data.length) {
    return NextResponse.json(
      { ok: false, error: 'Entry not found, or already joined.' },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true });
}
