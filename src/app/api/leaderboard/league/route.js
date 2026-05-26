import { NextResponse } from 'next/server';
import { getTierLabel } from '@/lib/elo-tier-colors';

export const dynamic = 'force-dynamic';

export async function GET() {
  const now = new Date();
  const daysUntilSunday = (7 - now.getUTCDay()) % 7 || 7;
  const endsAt = new Date(now);
  endsAt.setUTCDate(endsAt.getUTCDate() + daysUntilSunday);
  endsAt.setUTCHours(0, 0, 0, 0);
  const msLeft = endsAt.getTime() - now.getTime();
  const days = Math.floor(msLeft / 86400000);
  const hours = Math.floor((msLeft % 86400000) / 3600000);
  const endsIn = `${days}d ${hours}h`;

  const week = Math.ceil(
    (now.getTime() - new Date(Date.UTC(now.getUTCFullYear(), 0, 1)).getTime()) / (7 * 86400000),
  );

  return NextResponse.json({
    name: 'Strategist League',
    week: week % 52 || 1,
    endsAt: endsAt.toISOString(),
    endsIn,
    promoteTo: getTierLabel('tactician'),
    demoteTo: getTierLabel('apprentice'),
    promotionCount: 3,
    demotionCount: 2,
  });
}
