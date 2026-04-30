import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getUserEloState } from '@/lib/elo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/elo/me — authenticated user's ELO + recent transactions (session cookie).
 */
export async function GET() {
  const supabase = createServerSupabase();

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const state = await getUserEloState(user.id, 50);
  if (!state) {
    return NextResponse.json({ error: 'Failed to fetch ELO state' }, { status: 500 });
  }

  return NextResponse.json(state);
}
