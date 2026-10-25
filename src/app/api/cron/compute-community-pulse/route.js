import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { cronRoute } from '@/lib/cron/with-cron-lock';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

async function run(request) {
  try {
    const base =
      process.env.VERCEL_URL != null
        ? `https://${process.env.VERCEL_URL}`
        : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const res = await fetch(`${base}/api/community/pulse`, { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: data.error || 'pulse failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, pulse: data });
  } catch (err) {
    console.error('[cron/compute-community-pulse]', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export const GET = cronRoute('compute-community-pulse', run, { ttlSeconds: 180 });
