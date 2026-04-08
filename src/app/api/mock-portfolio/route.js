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
      .from('mock_portfolios')
      .select('portfolio, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ portfolio: null, updated_at: null });
    }

    return NextResponse.json({
      portfolio: data.portfolio,
      updated_at: data.updated_at,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || 'Internal server error' },
      { status: 500 }
    );
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
    const portfolio = body?.portfolio;
    if (!portfolio || typeof portfolio !== 'object') {
      return NextResponse.json({ error: 'Invalid portfolio' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('mock_portfolios')
      .upsert(
        {
          user_id: user.id,
          portfolio,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select('updated_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated_at: data.updated_at });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
