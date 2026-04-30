import { NextResponse } from 'next/server';
import { createServerSupabaseClient, isServerSupabaseConfigured } from '@/lib/supabase-service-role';
import { scoreCompetition } from '@/app/api/admin/competitions/route';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

async function run(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isServerSupabaseConfigured()) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });
  }

  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();

  const { data: activated } = await supabase
    .from('competitions')
    .update({ status: 'active' })
    .eq('status', 'upcoming')
    .lte('starts_at', now)
    .select('id, name');

  const { data: toScore } = await supabase
    .from('competitions')
    .select('*')
    .in('status', ['active', 'ended'])
    .lte('ends_at', now);

  let scoredCount = 0;
  const scoringErrors = [];

  for (const comp of toScore || []) {
    try {
      if (comp.status === 'active') {
        await supabase.from('competitions').update({ status: 'ended' }).eq('id', comp.id);
      }
      await scoreCompetition(supabase, { ...comp, status: 'ended' });
      scoredCount++;
    } catch (e) {
      scoringErrors.push({
        competitionId: comp.id,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return NextResponse.json({
    success: true,
    activated: (activated || []).length,
    scored: scoredCount,
    errors: scoringErrors.slice(0, 5),
  });
}

export async function GET(request) {
  return run(request);
}

export async function POST(request) {
  return run(request);
}
