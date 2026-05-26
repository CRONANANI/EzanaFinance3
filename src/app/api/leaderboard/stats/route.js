import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = getAdminClient();

  const { data, error } = await supabase.from('user_elo').select('current_rating');

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }

  const ratings = data.map((r) => r.current_rating).sort((a, b) => a - b);
  const totalTraders = ratings.length;
  if (totalTraders === 0) {
    return NextResponse.json({
      totalTraders: 0,
      totalTradersDelta: 0,
      avgElo: 0,
      avgEloDelta: 0,
      medianElo: 0,
      medianEloDelta: 0,
      top1PctThreshold: 0,
      lastUpdate: new Date().toISOString(),
    });
  }

  const avgElo = Math.round(ratings.reduce((s, r) => s + r, 0) / totalTraders);
  const medianElo = ratings[Math.floor(totalTraders / 2)] ?? 0;
  const top1PctIdx = Math.max(0, Math.floor(totalTraders * 0.99) - 1);
  const top1PctThreshold = ratings[top1PctIdx] ?? 0;

  return NextResponse.json({
    totalTraders,
    totalTradersDelta: 0,
    avgElo,
    avgEloDelta: 0,
    medianElo,
    medianEloDelta: 0,
    top1PctThreshold,
    lastUpdate: new Date().toISOString(),
  });
}
