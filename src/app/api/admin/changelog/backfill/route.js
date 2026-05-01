import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/plaid';
import { fetchCommits, summarizeCommits, getIsoWeekRange } from '@/lib/changelog/git-summarizer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 600;

/**
 * POST /api/admin/changelog/backfill
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Backfills the last 90 days of weekly summaries on the deployed environment.
 * Idempotent. Safe to retrigger.
 */
export async function POST(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });
  }
  const auth = request.headers.get('authorization') || '';
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setUTCDate(ninetyDaysAgo.getUTCDate() - 90);

  const weeks = [];
  let cursor = new Date(ninetyDaysAgo);
  while (cursor < now) {
    const { start, end, weekKey } = getIsoWeekRange(cursor);
    if (!weeks.find((w) => w.weekKey === weekKey)) {
      weeks.push({ start, end, weekKey });
    }
    cursor = new Date(cursor);
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }

  const log = [];
  let inserted = 0;
  let skipped = 0;
  let errored = 0;

  for (const w of weeks) {
    try {
      const { data: existing } = await supabaseAdmin
        .from('platform_changelog_entries')
        .select('id')
        .ilike('body', `%Week ${w.weekKey}%`)
        .limit(1);

      if (existing && existing.length > 0) {
        log.push(`${w.weekKey}: skip (exists)`);
        skipped++;
        continue;
      }

      const commits = await fetchCommits(w.start.toISOString(), w.end.toISOString());
      if (commits.length === 0) {
        log.push(`${w.weekKey}: skip (0 commits)`);
        skipped++;
        continue;
      }

      const summary = await summarizeCommits(commits, { start: w.start.toISOString(), end: w.end.toISOString() });
      if (!summary) {
        log.push(`${w.weekKey}: skip (no summary, ${commits.length} commits)`);
        skipped++;
        continue;
      }

      const releasedAt = new Date(w.start);
      releasedAt.setUTCDate(releasedAt.getUTCDate() + 6);
      releasedAt.setUTCHours(12, 0, 0, 0);

      const { error } = await supabaseAdmin.from('platform_changelog_entries').insert({
        title: summary.title,
        body: `${summary.body}\n\n_Week ${w.weekKey} · ${commits.length} commits_`,
        category: summary.category,
        is_pinned: false,
        is_published: true,
        author_email: 'changelog-bot@ezana.world',
        released_at: releasedAt.toISOString(),
      });

      if (error) {
        log.push(`${w.weekKey}: ERROR ${error.message}`);
        errored++;
      } else {
        log.push(`${w.weekKey}: inserted "${summary.title}"`);
        inserted++;
      }

      await new Promise((r) => setTimeout(r, 1000));
    } catch (e) {
      log.push(`${w.weekKey}: ERROR ${e.message}`);
      errored++;
    }
  }

  return NextResponse.json({ inserted, skipped, errored, log });
}
