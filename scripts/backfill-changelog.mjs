#!/usr/bin/env node
/**
 * One-shot backfill: scan the last 90 days of GitHub commits, group by ISO week,
 * generate a Claude summary per week, and insert into platform_changelog_entries.
 *
 * Usage:
 *   node scripts/backfill-changelog.mjs
 *
 * Required env vars:
 *   GITHUB_TOKEN
 *   GITHUB_REPO
 *   ANTHROPIC_API_KEY
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Loads `.env` then `.env.local` from the project root (local overrides).
 *
 * Idempotent: re-runs skip weeks that already have an entry.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { fetchCommits, summarizeCommits, getIsoWeekRange } from '../src/lib/changelog/git-summarizer.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env') });
dotenv.config({ path: path.join(root, '.env.local'), override: true });

async function main() {
  // ─────────────────────────────────────────────────────────────────
  // Env check
  // ─────────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────
  // Supabase probe
  // ─────────────────────────────────────────────────────────────────
  {
    const { error } = await supabase.from('platform_changelog_entries').select('id', { head: true });
    if (error) {
      console.error('❌ Supabase probe failed:', error.message);
      console.error('   Verify SUPABASE_SERVICE_ROLE_KEY is correct and migration ran.');
      process.exit(1);
    }
    console.log('✓ Supabase reachable');
  }

  // ─────────────────────────────────────────────────────────────────
  // GitHub API probe
  // ─────────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────
  // Anthropic API probe (cheap test call)
  // ─────────────────────────────────────────────────────────────────
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

  // Build a list of ISO weeks to backfill (chronological, oldest first)
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

  console.log(`Backfilling ${weeks.length} weeks: ${weeks[0]?.weekKey} → ${weeks[weeks.length - 1]?.weekKey}`);

  let inserted = 0;
  let skipped = 0;
  let errored = 0;

  for (const w of weeks) {
    try {
      // Idempotency check
      const { data: existing } = await supabase
        .from('platform_changelog_entries')
        .select('id')
        .ilike('body', `%Week ${w.weekKey}%`)
        .limit(1);

      if (existing && existing.length > 0) {
        console.log(`  ${w.weekKey}: SKIP (already exists)`);
        skipped++;
        continue;
      }

      console.log(`  ${w.weekKey}: fetching commits…`);
      const commits = await fetchCommits(w.start.toISOString(), w.end.toISOString());
      console.log(`    → ${commits.length} commits returned`);
      if (commits.length === 0) {
        console.log(`  ${w.weekKey}: SKIP (no commits in window)`);
        skipped++;
        continue;
      }

      console.log(`  ${w.weekKey}: summarizing with Claude…`);
      const summary = await summarizeCommits(commits, { start: w.start.toISOString(), end: w.end.toISOString() });
      if (!summary) {
        console.log(`  ${w.weekKey}: SKIP (Claude returned no meaningful summary, ${commits.length} commits)`);
        skipped++;
        continue;
      }
      console.log(`    → "${summary.title}" (${summary.category})`);

      const releasedAt = new Date(w.start);
      releasedAt.setUTCDate(releasedAt.getUTCDate() + 6);
      releasedAt.setUTCHours(12, 0, 0, 0);

      const { error } = await supabase.from('platform_changelog_entries').insert({
        title: summary.title,
        body: `${summary.body}\n\n_Week ${w.weekKey} · ${commits.length} commits_`,
        category: summary.category,
        is_pinned: false,
        is_published: true,
        author_email: 'changelog-bot@ezana.world',
        released_at: releasedAt.toISOString(),
      });

      if (error) {
        console.error(`  ${w.weekKey}: ERROR ${error.message}`);
        errored++;
      } else {
        console.log(`  ${w.weekKey}: INSERTED — "${summary.title}" (${commits.length} commits)`);
        inserted++;
      }

      // Be polite to GitHub + Anthropic — 2s between weeks
      await new Promise((r) => setTimeout(r, 2000));
    } catch (e) {
      console.error(`  ${w.weekKey}: ERROR ${e.message}`);
      errored++;
    }
  }

  console.log(`\nDone. Inserted: ${inserted}, Skipped: ${skipped}, Errored: ${errored}`);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
