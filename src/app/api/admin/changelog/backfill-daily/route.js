import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/plaid';
import { fetchCommits, summarizeCommits, getDayRange } from '@/lib/changelog/git-summarizer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 800;

/**
 * POST /api/admin/changelog/backfill-daily
 *   Authorization: Bearer <CRON_SECRET>
 *   Body: { days?: number }   // default 90, max 180
 */
export async function POST(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });
  if ((request.headers.get('authorization') || '') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const days = Math.min(180, Math.max(1, Number(body?.days) || 90));

  const now = new Date();
  const startBound = new Date(now);
  startBound.setUTCDate(startBound.getUTCDate() - days);

  const dayList = [];
  let cursor = new Date(startBound);
  cursor.setUTCHours(0, 0, 0, 0);
  while (cursor < now) {
    const range = getDayRange(cursor);
    dayList.push(range);
    cursor = new Date(cursor);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const log = [];
  let inserted = 0;
  let skipped = 0;
  let errored = 0;

  for (const r of dayList) {
    try {
      const { data: existing } = await supabaseAdmin
        .from('platform_changelog_entries')
        .select('id')
        .ilike('body', `%Day ${r.dayKey}%`)
        .limit(1);

      if (existing && existing.length > 0) {
        log.push(`${r.dayKey}: skip (exists)`);
        skipped++;
        continue;
      }

      const commits = await fetchCommits(r.start.toISOString(), r.end.toISOString());
      if (commits.length === 0) {
        log.push(`${r.dayKey}: skip (0 commits)`);
        skipped++;
        continue;
      }

      const summary = await summarizeCommits(commits, {
        start: r.start.toISOString(),
        end: r.end.toISOString(),
      });
      if (!summary) {
        log.push(`${r.dayKey}: skip (no summary, ${commits.length} commits — all noise filtered)`);
        skipped++;
        continue;
      }

      const releasedAt = new Date(r.start);
      releasedAt.setUTCHours(12, 0, 0, 0);

      const { error } = await supabaseAdmin.from('platform_changelog_entries').insert({
        title: summary.title,
        body: `${summary.body}\n\n_Day ${r.dayKey} · ${commits.length} commits_`,
        category: summary.category,
        is_pinned: false,
        is_published: true,
        author_email: 'changelog-bot@ezana.world',
        released_at: releasedAt.toISOString(),
      });

      if (error) {
        log.push(`${r.dayKey}: ERROR ${error.message}`);
        errored++;
      } else {
        log.push(`${r.dayKey}: inserted "${summary.title}" (${commits.length} commits)`);
        inserted++;
      }

      await new Promise((res) => setTimeout(res, 800));
    } catch (e) {
      log.push(`${r.dayKey}: ERROR ${e.message}`);
      errored++;
    }
  }

  return NextResponse.json({
    inserted,
    skipped,
    errored,
    days_processed: dayList.length,
    log,
  });
}
