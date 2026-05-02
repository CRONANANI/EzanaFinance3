import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/plaid';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * GET /api/admin/changelog/diagnose
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Read-only health check for changelog generation (env, Supabase, GitHub, Anthropic).
 */
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({
      ok: false,
      error: 'Server misconfigured: CRON_SECRET not set in Vercel env',
    }, { status: 503 });
  }
  const auth = request.headers.get('authorization') || '';
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({
      ok: false,
      error: 'Unauthorized — pass `Authorization: Bearer <CRON_SECRET>`',
    }, { status: 401 });
  }

  const report = {
    timestamp: new Date().toISOString(),
    env: {},
    supabase: {},
    github: {},
    anthropic: {},
    database: {},
    overall: 'unknown',
  };

  const REQUIRED = [
    'GITHUB_TOKEN',
    'GITHUB_REPO',
    'ANTHROPIC_API_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'CRON_SECRET',
  ];
  for (const k of REQUIRED) {
    const v = process.env[k];
    report.env[k] = {
      present: Boolean(v),
      length: v ? v.length : 0,
      preview: v ? `${v.slice(0, 6)}…${v.slice(-3)}` : null,
    };
  }
  report.env.GITHUB_REPO_value = process.env.GITHUB_REPO || null;

  const missingEnv = REQUIRED.filter((k) => !process.env[k]);
  if (missingEnv.length > 0) {
    report.overall = 'fail';
    report.summary = `Missing env vars on Vercel: ${missingEnv.join(', ')}. Set these in your Vercel project settings.`;
    return NextResponse.json(report);
  }

  try {
    const { count, error } = await supabaseAdmin
      .from('platform_changelog_entries')
      .select('id', { count: 'exact', head: true });
    if (error) {
      report.supabase = { ok: false, error: error.message };
    } else {
      report.supabase = { ok: true, total_entries: count ?? 0 };
    }
  } catch (e) {
    report.supabase = { ok: false, error: e.message };
  }

  try {
    const repoUrl = `https://api.github.com/repos/${process.env.GITHUB_REPO}`;
    const res = await fetch(repoUrl, {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (!res.ok) {
      const text = await res.text();
      report.github = {
        ok: false,
        status: res.status,
        error: text.slice(0, 200),
      };
    } else {
      const data = await res.json();
      report.github = {
        ok: true,
        repo: data.full_name,
        default_branch: data.default_branch,
        private: data.private,
      };
    }
  } catch (e) {
    report.github = { ok: false, error: e.message };
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 8,
        messages: [{ role: 'user', content: 'Say "ok" and nothing else.' }],
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      report.anthropic = { ok: false, status: res.status, error: text.slice(0, 200) };
    } else {
      const data = await res.json();
      const reply = data?.content?.[0]?.text || '';
      report.anthropic = { ok: true, reply: reply.trim() };
    }
  } catch (e) {
    report.anthropic = { ok: false, error: e.message };
  }

  try {
    const { data: entries, error } = await supabaseAdmin
      .from('platform_changelog_entries')
      .select('id, title, released_at, body')
      .order('released_at', { ascending: false })
      .limit(5);
    if (error) {
      report.database = { ok: false, error: error.message };
    } else {
      const rows = entries || [];
      report.database = {
        ok: true,
        recent_entries_count: rows.length,
        most_recent: rows[0] ? {
          title: rows[0].title,
          released_at: rows[0].released_at,
        } : null,
        any_daily_entries: rows.some((r) => /Day \d{4}-\d{2}-\d{2}/.test(r.body || '')),
        any_weekly_entries: rows.some((r) => /Week \d{4}-W\d{2}/.test(r.body || '')),
      };
    }
  } catch (e) {
    report.database = { ok: false, error: e.message };
  }

  const allOk = report.supabase.ok && report.github.ok && report.anthropic.ok;
  if (allOk) {
    report.overall = 'pass';
    report.summary = `All probes passed. ${report.supabase.total_entries || 0} total entries in DB. Ready to backfill.`;
  } else {
    report.overall = 'fail';
    const fails = [];
    if (!report.supabase.ok) fails.push(`Supabase: ${report.supabase.error}`);
    if (!report.github.ok) fails.push(`GitHub: ${report.github.error}`);
    if (!report.anthropic.ok) fails.push(`Anthropic: ${report.anthropic.error}`);
    report.summary = fails.join(' | ');
  }

  return NextResponse.json(report);
}
