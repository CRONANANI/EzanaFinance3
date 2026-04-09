import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // If session cookie isn't available during beacon (page close),
    // silently succeed — the immediate POST from Change 1 already wrote the data.
    if (!user) {
      return NextResponse.json({ ok: true });
    }

    const body = await request.json();
    const portfolio = body?.portfolio;
    if (!portfolio || typeof portfolio !== 'object') {
      return NextResponse.json({ ok: true });
    }

    await supabase.from('mock_portfolios').upsert(
      {
        user_id: user.id,
        portfolio,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

    return NextResponse.json({ ok: true });
  } catch {
    // Beacon responses are ignored by the browser — always return 200.
    return NextResponse.json({ ok: true });
  }
}
