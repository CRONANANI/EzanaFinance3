import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const supabaseAdmin = getAdminClient();
    const event = await request.json();

    if (event.account_id && event.status_to) {
      const patch = {
        account_status: event.status_to,
        updated_at: new Date().toISOString(),
      };
      if (event.status_to === 'APPROVED' || event.status_to === 'ACTIVE') {
        patch.approved_at = new Date().toISOString();
      }

      await supabaseAdmin
        .from('brokerage_accounts')
        .update(patch)
        .eq('alpaca_account_id', event.account_id);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Alpaca webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
