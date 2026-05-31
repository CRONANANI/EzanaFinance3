import { NextResponse } from 'next/server';
import { requireUser, getAdminClient } from '@/lib/supabase';
import { getSnapTradeClient, getSnapTradeCreds } from '@/lib/snaptrade';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function DELETE(request, { params }) {
  let user;
  try {
    ({ user } = await requireUser(request));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const supabase = getAdminClient();
    const { data: conn } = await supabase
      .from('snaptrade_connections')
      .select('id, brokerage_authorization_id, user_id')
      .eq('id', id)
      .maybeSingle();
    if (!conn || conn.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const creds = await getSnapTradeCreds(user.id);
    if (creds) {
      const snaptrade = getSnapTradeClient();
      await snaptrade.connections.removeBrokerageAuthorization({
        userId: creds.userId,
        userSecret: creds.userSecret,
        authorizationId: conn.brokerage_authorization_id,
      });
    }
    await supabase.from('snaptrade_connections').delete().eq('id', conn.id);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error('[snaptrade/connections DELETE]', err);
    return NextResponse.json({ error: err?.message || 'Delete failed' }, { status: 502 });
  }
}
