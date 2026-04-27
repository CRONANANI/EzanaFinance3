import { NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  isServerSupabaseConfigured,
} from '@/lib/supabase-service-role';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Auth: Authorization: Bearer must equal CRON_SECRET (set in Vercel env). */
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
    return NextResponse.json({ error: 'Service unavailable' }, { status: 500 });
  }

  const admin = createServerSupabaseClient();
  const now = new Date().toISOString();

  const { data: dueAccounts, error: readErr } = await admin
    .from('profiles')
    .select('id')
    .not('deleted_at', 'is', null)
    .lt('deletion_scheduled_for', now);

  if (readErr) {
    console.error('[cron/hard-delete] read error:', readErr);
    return NextResponse.json({ error: readErr.message }, { status: 500 });
  }

  const results = { processed: 0, succeeded: 0, failed: 0, errors: [] };

  for (const acct of dueAccounts || []) {
    results.processed++;
    try {
      await admin.from('account_deletion_log').insert({
        user_id: acct.id,
        event: 'hard_deleted',
        metadata: { deleted_at: now },
      });

      const { error: authErr } = await admin.auth.admin.deleteUser(acct.id);
      if (authErr) {
        throw authErr;
      }

      results.succeeded++;
    } catch (err) {
      results.failed++;
      results.errors.push({ user_id: acct.id, error: err?.message || String(err) });
      console.error('[cron/hard-delete] failed for', acct.id, err);
    }
  }

  return NextResponse.json(results);
}

export async function GET(request) {
  return run(request);
}

export async function POST(request) {
  return run(request);
}
