import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { alpaca } from '@/lib/alpaca';
import { supabaseAdmin } from '@/lib/plaid';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              try {
                cookieStore.set(name, value, options);
              } catch {
                /* ignore */
              }
            });
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let account = null;
    const { data: br } = await supabaseAdmin
      .from('brokerage_accounts')
      .select('alpaca_account_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (br) account = br;
    if (!account) {
      const { data: leg } = await supabaseAdmin
        .from('alpaca_accounts')
        .select('alpaca_account_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (leg) account = leg;
    }

    if (!account) return NextResponse.json({ error: 'No brokerage account' }, { status: 400 });

    const accountDetails = await alpaca.get(
      `/v1/trading/accounts/${account.alpaca_account_id}/account`
    );

    const positions = await alpaca.get(
      `/v1/trading/accounts/${account.alpaca_account_id}/positions`
    );

    return NextResponse.json({
      account: accountDetails,
      positions: Array.isArray(positions) ? positions : [],
    });
  } catch (error) {
    console.error('Portfolio error:', error);
    return NextResponse.json(
      { error: error.message || 'Portfolio fetch failed' },
      { status: error.status || 500 }
    );
  }
}
