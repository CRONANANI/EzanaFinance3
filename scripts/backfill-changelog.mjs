#!/usr/bin/env node
/**
 * One-shot backfill: scan the last 90 days of GitHub commits and insert one
 * changelog entry per day (or per week with `weekly` arg).
 *
 * Usage:
 *   node scripts/backfill-changelog.mjs           # daily (default)
 *   node scripts/backfill-changelog.mjs daily
 *   node scripts/backfill-changelog.mjs weekly    # legacy weekly mode
 *
 * Required env vars: GITHUB_TOKEN, GITHUB_REPO, ANTHROPIC_API_KEY,
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Idempotent. Re-runs skip days that already have an entry.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { fetchCommits, summarizeCommits, getIsoWeekRange, getDayRange } from '../src/lib/changelog/git-summarizer.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env') });
dotenv.config({ path: path.join(root, '.env.local'), override: true });

const rawMode = (process.argv[2] || 'daily').toLowerCase();
const MODE = rawMode === 'weekly' ? 'weekly' : 'daily';

async function main() {
  const REQUIRED_ENV = [
    'GITHUB_TOKEN',
    'GITHUB_REPO',
    'ANTHROPIC_API_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error('❌ Missing required env vars:');
    missing.forEach((k) => console.error(`   - ${k}`));
    console.error('');
    console.error(`Loading from: ${path.join(root, '.env.local')}`);
    process.exit(1);
  }

  console.log('✓ Env loaded');
  console.log(`  GITHUB_REPO=${process.env.GITHUB_REPO}`);
  console.log(`  GITHUB_TOKEN=${process.env.GITHUB_TOKEN.slice(0, 7)}…`);
  console.log(`  ANTHROPIC_API_KEY=${process.env.ANTHROPIC_API_KEY.slice(0, 10)}…`);

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  {
    const { error } = await supabase.from('platform_changelog_entries').select('id', { head: true });
    if (error) {
      console.error('❌ Supabase probe failed:', error.message);
      console.error('   Verify SUPABASE_SERVICE_ROLE_KEY is correct and migration ran.');
      process.exit(1);
    }
    console.log('✓ Supabase reachable');
  }

  {
    const probeUrl = `https://api.github.com/repos/${process.env.GITHUB_REPO}`;
    const res = await fetch(probeUrl, {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`❌ GitHub API probe failed: ${res.status} ${res.statusText}`);
      console.error('   Response:', text.slice(0, 500));
      console.error('   Verify GITHUB_TOKEN is a valid PAT with read access to the repo.');
      process.exit(1);
    }
    const repoInfo = await res.json();
    console.log(`✓ GitHub reachable (${repoInfo.full_name}, default branch: ${repoInfo.default_branch})`);
  }

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const probe = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Say "ok"' }],
    });
    const text = probe.content?.[0]?.text || '';
    if (!text) throw new Error('Empty response from Claude');
    console.log(`✓ Anthropic reachable (probe response: "${text.trim()}")`);
  } catch (e) {
    console.error('❌ Anthropic API probe failed:', e.message);
    console.error('   Verify ANTHROPIC_API_KEY is valid.');
    process.exit(1);
  }

  console.log('');
  console.log('All probes passed. Starting backfill…');
  console.log('');

  const now = new Date();
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setUTCDate(ninetyDaysAgo.getUTCDate() - 90);

  const ranges = [];
  if (MODE === 'weekly') {
    let cursor = new Date(ninetyDaysAgo);
    while (cursor < now) {
      const r = getIsoWeekRange(cursor);
      if (!ranges.find((x) => x.key === r.weekKey)) {
        ranges.push({ start: r.start, end: r.end, key: r.weekKey, label: 'Week' });
      }
      cursor = new Date(cursor);
      cursor.setUTCDate(cursor.getUTCDate() + 7);
    }
  } else {
    let cursor = new Date(ninetyDaysAgo);
    cursor.setUTCHours(0, 0, 0, 0);
    while (cursor < now) {
      const r = getDayRange(cursor);
      ranges.push({ start: r.start, end: r.end, key: r.dayKey, label: 'Day' });
      cursor = new Date(cursor);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  console.log(`Mode: ${MODE} — backfilling ${ranges.length} ${MODE === 'weekly' ? 'weeks' : 'days'}`);
  console.log(`Range: ${ranges[0]?.key} → ${ranges[ranges.length - 1]?.key}`);

  let inserted = 0;
  let skipped = 0;
  let errored = 0;

  for (const r of ranges) {
    try {
      const { data: existing } = await supabase
        .from('platform_changelog_entries')
        .select('id')
        .ilike('body', `%${r.label} ${r.key}%`)
        .limit(1);

      if (existing && existing.length > 0) {
        console.log(`  ${r.key}: SKIP (already exists)`);
        skipped++;
        continue;
      }

      console.log(`  ${r.key}: fetching commits…`);
      const commits = await fetchCommits(r.start.toISOString(), r.end.toISOString());
      console.log(`    → ${commits.length} commits returned`);
      if (commits.length === 0) {
        console.log(`  ${r.key}: SKIP (no commits in window)`);
        skipped++;
        continue;
      }

      console.log(`  ${r.key}: summarizing with Claude…`);
      const summary = await summarizeCommits(commits, {
        start: r.start.toISOString(),
        end: r.end.toISOString(),
      });
      if (!summary) {
        console.log(`  ${r.key}: SKIP (no meaningful summary, ${commits.length} commits)`);
        skipped++;
        continue;
      }
      console.log(`    → "${summary.title}" (${summary.category})`);

      const releasedAt = new Date(r.start);
      if (r.label === 'Week') releasedAt.setUTCDate(releasedAt.getUTCDate() + 6);
      releasedAt.setUTCHours(12, 0, 0, 0);

      const { error } = await supabase.from('platform_changelog_entries').insert({
        title: summary.title,
        body: `${summary.body}\n\n_${r.label} ${r.key} · ${commits.length} commits_`,
        category: summary.category,
        is_pinned: false,
        is_published: true,
        author_email: 'changelog-bot@ezana.world',
        released_at: releasedAt.toISOString(),
      });

      if (error) {
        console.error(`  ${r.key}: ERROR ${error.message}`);
        errored++;
      } else {
        console.log(`  ${r.key}: INSERTED — "${summary.title}" (${commits.length} commits)`);
        inserted++;
      }

      await new Promise((res) => setTimeout(res, MODE === 'daily' ? 800 : 2000));
    } catch (e) {
      console.error(`  ${r.key}: ERROR ${e.message}`);
      errored++;
    }
  }

  console.log(`\nDone. Inserted: ${inserted}, Skipped: ${skipped}, Errored: ${errored}`);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
