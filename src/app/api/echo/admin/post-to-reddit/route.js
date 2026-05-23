import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { isAdminUser } from '@/lib/admin-helpers';
import { runRedditPosterAgent } from '@/lib/agents/reddit-poster-agent';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * POST /api/echo/admin/post-to-reddit
 *
 * Body: { articleId: string, dryRun?: boolean }
 *
 * Auth: admin only (per ADMIN_EMAILS env var).
 *
 * Triggers the Reddit posting agent for ONE article. Idempotent — re-running
 * for the same article skips subreddits already posted to.
 */
export async function POST(request) {
  let user;
  try {
    const supabase = createServerSupabase();
    const { data } = await supabase.auth.getUser();
    user = data?.user;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdminUser(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const articleId = typeof body?.articleId === 'string' ? body.articleId.trim() : '';
  if (!articleId) {
    return NextResponse.json({ error: 'articleId is required' }, { status: 400 });
  }

  const dryRun = body?.dryRun === true;

  const started = Date.now();
  try {
    const summary = await runRedditPosterAgent({ articleId, dryRun });
    return NextResponse.json({
      ok: true,
      dryRun,
      elapsedMs: Date.now() - started,
      ...summary,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || 'Agent run failed',
        elapsedMs: Date.now() - started,
      },
      { status: 500 },
    );
  }
}

/**
 * GET — bearer-token alternative for triggering from curl/scripts without
 * a Supabase session. Uses CRON_SECRET so you can fire from a terminal.
 *
 * Example:
 *   curl -X GET -H "Authorization: Bearer $CRON_SECRET" \
 *     "https://ezana.world/api/echo/admin/post-to-reddit?articleId=nvidia-worlds-second-most-valuable-asset-2026"
 */
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 });

  const auth = request.headers.get('authorization') ?? '';
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const articleId = url.searchParams.get('articleId')?.trim();
  const dryRun = url.searchParams.get('dryRun') === 'true';

  if (!articleId) {
    return NextResponse.json({ error: 'articleId query param required' }, { status: 400 });
  }

  const started = Date.now();
  try {
    const summary = await runRedditPosterAgent({ articleId, dryRun });
    return NextResponse.json({
      ok: true,
      dryRun,
      elapsedMs: Date.now() - started,
      ...summary,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err?.message, elapsedMs: Date.now() - started },
      { status: 500 },
    );
  }
}
