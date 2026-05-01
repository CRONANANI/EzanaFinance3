import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/plaid';
import { fetchCommits, summarizeCommits, getIsoWeekRange } from '@/lib/changelog/git-summarizer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (request.headers.get('authorization') ?? '') === `Bearer ${secret}`;
}

async function run(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get the just-completed week (Monday-Sunday in UTC).
  // Cron runs Sunday 23:00 UTC, so "this week" is the week we just finished.
  const now = new Date();
  const { start, end, weekKey } = getIsoWeekRange(now);

  // Idempotency: skip if we already have an entry whose body tags this week
  const { data: existing } = await supabaseAdmin
    .from('platform_changelog_entries')
    .select('id')
    .ilike('body', `%Week ${weekKey}%`)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ skipped: true, reason: 'week already summarized', weekKey });
  }

  let commits;
  try {
    commits = await fetchCommits(start.toISOString(), end.toISOString());
  } catch (e) {
    return NextResponse.json({ error: `GitHub fetch failed: ${e.message}` }, { status: 500 });
  }

  if (commits.length === 0) {
    return NextResponse.json({ skipped: true, reason: 'no commits this week', weekKey });
  }

  let summary;
  try {
    summary = await summarizeCommits(commits, { start: start.toISOString(), end: end.toISOString() });
  } catch (e) {
    return NextResponse.json({ error: `Claude summarization failed: ${e.message}` }, { status: 500 });
  }

  if (!summary) {
    return NextResponse.json({ skipped: true, reason: 'no meaningful commits', weekKey, commitCount: commits.length });
  }

  // released_at must fall inside the summarized week (end is exclusive Monday 00:00 UTC).
  const releasedAt = new Date(start);
  releasedAt.setUTCDate(releasedAt.getUTCDate() + 6);
  releasedAt.setUTCHours(12, 0, 0, 0);

  // Insert as published entry
  const { data: entry, error } = await supabaseAdmin
    .from('platform_changelog_entries')
    .insert({
      title: summary.title,
      body: `${summary.body}\n\n_Week ${weekKey} · ${commits.length} commits_`,
      category: summary.category,
      is_pinned: false,
      is_published: true,
      author_email: 'changelog-bot@ezana.world',
      released_at: releasedAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    weekKey,
    commitCount: commits.length,
    entryId: entry.id,
  });
}

export async function GET(request) {
  return run(request);
}

export async function POST(request) {
  return run(request);
}
