import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/trade-notes?userId=<uuid>&ticker=<symbol>
 */
export async function GET(request) {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const ticker = searchParams.get('ticker');

    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    let q = supabase
      .from('profile_trade_notes')
      .select('id, user_id, ticker, body, is_public, created_at, updated_at')
      .eq('user_id', userId);

    if (ticker) q = q.eq('ticker', ticker.toUpperCase());

    if (userId !== user.id) q = q.eq('is_public', true);

    q = q.order('updated_at', { ascending: false });

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (ticker) {
      return NextResponse.json({ note: (data || [])[0] || null });
    }
    return NextResponse.json({ notes: data || [] });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * POST /api/trade-notes
 */
export async function POST(request) {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const ticker = (body?.ticker || '').toUpperCase().trim();
    const noteBody = (body?.body || '').trim();
    if (!ticker || !noteBody) return NextResponse.json({ error: 'ticker + body required' }, { status: 400 });
    if (noteBody.length > 1000) return NextResponse.json({ error: 'body max 1000 chars' }, { status: 400 });

    const { data, error } = await supabase
      .from('profile_trade_notes')
      .upsert(
        {
          user_id: user.id,
          ticker,
          body: noteBody,
          is_public: body?.is_public !== false,
        },
        { onConflict: 'user_id,ticker' },
      )
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ note: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * DELETE /api/trade-notes?ticker=<symbol>
 */
export async function DELETE(request) {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker');
    if (!ticker) return NextResponse.json({ error: 'ticker required' }, { status: 400 });

    const { error } = await supabase
      .from('profile_trade_notes')
      .delete()
      .eq('user_id', user.id)
      .eq('ticker', ticker.toUpperCase());

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
