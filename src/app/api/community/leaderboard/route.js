import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FIRST_NAMES = [
  'Emma',
  'David',
  'Lisa',
  'Alex',
  'Sarah',
  'Michael',
  'Emily',
  'James',
  'Maria',
  'Chris',
  'Jordan',
  'Taylor',
  'Riley',
  'Casey',
  'Morgan',
];

const LAST_NAMES = [
  'Wilson',
  'Kim',
  'Park',
  'Chen',
  'Johnson',
  'Brown',
  'Davis',
  'Taylor',
  'Garcia',
  'Lee',
  'Martinez',
  'Anderson',
  'Thomas',
  'White',
  'Harris',
];

function deterministicUuid(seed) {
  const hex = '0123456789abcdef';
  let h = '';
  for (let i = 0; i < 32; i++) {
    const n = (seed * 9301 + 49297 + i * 17) % 16;
    h += hex[(n + i) % 16];
  }
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function buildRankings(n) {
  const rows = [];
  for (let i = 0; i < n; i++) {
    const name = `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[(i + 3) % LAST_NAMES.length]}`;
    const ret = Math.max(3, 35 - i * 0.55 + ((i * 7) % 5));
    rows.push({
      id: deterministicUuid(i + 1),
      rank: i + 1,
      name,
      return: Math.round(ret * 10) / 10,
      trades: 5 + ((i * 3) % 20),
      winRate: 55 + ((i * 11) % 40),
      bar: Math.max(8, 100 - i * 4),
    });
  }
  return rows;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '50', 10)));
  const period = searchParams.get('period') || 'weekly';
  return NextResponse.json({
    period,
    rankings: buildRankings(limit),
  });
}
