import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { fetchCommits, summarizeCommits, getDayRange } from '@/lib/changelog/git-summarizer';
import { cronRoute } from '@/lib/cron/with-cron-lock';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * Daily cron: summarize commits for the current UTC day.
 * Runs at 23:00 UTC via vercel.json.
 */
async function run(request) {
  let supabaseAdmin;
  try {
    supabaseAdmin = getAdminClient();
  } catch {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });
  }

  const now = new Date();
  const range = getDayRange(now);

  const { data: existing } = await supabaseAdmin
    .from('platform_changelog_entries')
    .select('id')
    .ilike('body', `%Day ${range.dayKey}%`)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({
      skipped: true,
      reason: 'day already summarized',
      dayKey: range.dayKey,
    });
  }

  let commits;
  try {
    commits = await fetchCommits(range.start.toISOString(), range.end.toISOString());
  } catch (e) {
    return NextResponse.json({ error: `GitHub fetch failed: ${e.message}` }, { status: 500 });
  }

  if (commits.length === 0) {
    return NextResponse.json({ skipped: true, reason: 'no commits today', dayKey: range.dayKey });
  }

  let summary;
  try {
    summary = await summarizeCommits(commits, {
      start: range.start.toISOString(),
      end: range.end.toISOString(),
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Claude summarization failed: ${e.message}` },
      { status: 500 },
    );
  }

  if (!summary) {
    return NextResponse.json({
      skipped: true,
      reason: 'no meaningful commits',
      dayKey: range.dayKey,
      commitCount: commits.length,
    });
  }

  const releasedAt = new Date(range.start);
  releasedAt.setUTCHours(12, 0, 0, 0);

  const { data: entry, error } = await supabaseAdmin
    .from('platform_changelog_entries')
    .insert({
      title: summary.title,
      body: `${summary.body}\n\n_Day ${range.dayKey} · ${commits.length} commits_`,
      category: summary.category,
      is_pinned: false,
      is_published: true,
      author_email: 'changelog-bot@ezana.world',
      released_at: releasedAt.toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    dayKey: range.dayKey,
    commitCount: commits.length,
    entryId: entry.id,
  });
}

export const GET = cronRoute('changelog-daily-summary', run, { ttlSeconds: 180 });
export const POST = GET;
