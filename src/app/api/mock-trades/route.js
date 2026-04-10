import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('mock_trades')
      .select('id, ticker, quantity, price, trade_type, total_amount, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ trades: data || [] });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const ticker = String(body?.ticker || '')
      .trim()
      .toUpperCase()
      .slice(0, 32);
    const quantity = Number(body?.quantity);
    const price = Number(body?.price);
    const trade_type = body?.trade_type === 'sell' ? 'sell' : 'buy';
    const total_amount = body?.total_amount != null ? Number(body.total_amount) : quantity * price;

    if (!ticker || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: 'Invalid trade payload' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('mock_trades')
      .insert({
        user_id: user.id,
        ticker,
        quantity,
        price,
        trade_type,
        total_amount: Number.isFinite(total_amount) ? total_amount : quantity * price,
      })
      .select('id, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id, created_at: data.created_at });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
