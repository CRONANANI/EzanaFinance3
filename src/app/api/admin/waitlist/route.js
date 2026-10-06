/**
 * GET /api/admin/waitlist?status=pending|approved|joined|rejected
 * Admin only (ADMIN_EMAILS). Waitlist rows, newest first, up to 500, plus
 * per-status counts for the tabs.
 */
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { requireWaitlistAdmin, WAITLIST_ADMIN_COLS } from '@/lib/waitlist/admin';

export const dynamic = 'force-dynamic';

const STATUSES = ['pending', 'approved', 'joined', 'rejected'];

export async function GET(request) {
  const { denied } = await requireWaitlistAdmin(request);
  if (denied) return denied;

  const raw = new URL(request.url).searchParams.get('status') || 'pending';
  const status = STATUSES.includes(raw) ? raw : 'pending';
  const admin = getAdminClient();

  const [{ data, error }, ...counts] = await Promise.all([
    admin
      .from('waitlist')
      .select(WAITLIST_ADMIN_COLS)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(500),
    ...STATUSES.map((s) =>
      admin.from('waitlist').select('id', { count: 'exact', head: true }).eq('status', s),
    ),
  ]);
  if (error) {
    console.error('[admin/waitlist] list failed:', error.message);
    return NextResponse.json({ ok: false, error: 'Could not load the waitlist.' }, { status: 500 });
  }
  return NextResponse.json(
    {
      ok: true,
      status,
      rows: data || [],
      counts: Object.fromEntries(STATUSES.map((s, i) => [s, counts[i]?.count || 0])),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
