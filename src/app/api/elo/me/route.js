import { NextResponse } from 'next/server';
import { getUserClient } from '@/lib/supabase';
import { getUserEloState, reconcileLearningElo } from '@/lib/elo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/elo/me — authenticated user's ELO + recent transactions (session cookie).
 */
export async function GET() {
  const supabase = getUserClient();

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let state = await getUserEloState(user.id, 50);
  if (!state) {
    return NextResponse.json({ error: 'Failed to fetch ELO state' }, { status: 500 });
  }

  const { credited } = await reconcileLearningElo(user.id);
  if (credited > 0) {
    state = (await getUserEloState(user.id, 50)) || state;
  }

  return NextResponse.json(state);
}
