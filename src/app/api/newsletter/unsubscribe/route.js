import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabaseClient } from '@/lib/supabase-service-role';
import { NEWSLETTER_SITE_URL } from '@/lib/newsletter/config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * One-click unsubscribe — no login, no "are you sure?" gauntlet. CASL requires
 * it to work on the FIRST click. Idempotent (a second click is a no-op). The GET
 * lands from the email link; the optional POST records a non-blocking reason
 * submitted from the /newsletter/unsubscribed page.
 */
async function unsubscribe(token, reason) {
  if (!token) return false;
  const supabase = createServerSupabaseClient();
  const { data: row } = await supabase
    .from('marketing_subscribers')
    .select('id, status')
    .eq('unsubscribe_token', token)
    .maybeSingle();
  if (!row) return false;

  const patch = { updated_at: new Date().toISOString() };
  // Only flip status/timestamp the first time; a re-click must not overwrite it.
  if (row.status !== 'unsubscribed') {
    patch.status = 'unsubscribed';
    patch.unsubscribed_at = new Date().toISOString();
  }
  if (typeof reason === 'string' && reason.trim()) {
    patch.unsubscribe_reason = reason.trim().slice(0, 500);
  }
  await supabase.from('marketing_subscribers').update(patch).eq('id', row.id);
  return true;
}

export const GET = withApiGuard(
  async (request) => {
    const token = new URL(request.url).searchParams.get('token');
    await unsubscribe(token);
    // Carry the token so the page can offer an optional (non-blocking) reason.
    const q = token ? `?token=${encodeURIComponent(token)}` : '';
    return NextResponse.redirect(`${NEWSLETTER_SITE_URL}/newsletter/unsubscribed${q}`);
  },
  { requireAuth: false },
);

export const POST = withApiGuard(
  async (request) => {
    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const ok = await unsubscribe(body?.token, body?.reason);
    return NextResponse.json({ ok });
  },
  { requireAuth: false, strict: true },
);
