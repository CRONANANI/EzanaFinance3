/** DELETE /api/ezana-api/keys/<id>: revoke one of your own keys. Takes effect on the next request. */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { sanitizeUUID } from '@/lib/sanitize';

export const dynamic = 'force-dynamic';

export const DELETE = withApiGuard(
  async (request, user, context) => {
    const id = sanitizeUUID(context?.params?.id);
    if (!id) return NextResponse.json({ error: 'Invalid key.' }, { status: 400 });
    const { data, error } = await getAdminClient()
      .from('api_keys')
      .update({ status: 'revoked', revoked_at: new Date().toISOString(), claim_token_hash: null })
      .eq('id', id)
      .eq('owner_user_id', user.id)
      .neq('status', 'revoked')
      .select('id');
    if (error) return NextResponse.json({ error: 'Could not revoke the key.' }, { status: 500 });
    if (!data?.length) return NextResponse.json({ error: 'Key not found.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  },
  { requireAuth: true },
);
