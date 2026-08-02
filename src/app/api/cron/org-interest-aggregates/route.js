import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

/**
 * Compute org-level "attention" aggregates from members' interest profiles, so
 * a fund manager can see what topics their team is collectively paying
 * attention to — WITHOUT ever exposing an individual's interests.
 *
 * Privacy model:
 *   - K-ANONYMITY: a (dimension, value) row is written only when at least K
 *     distinct members contribute a positive score to it. Anything a smaller
 *     group cares about is dropped, so no row can be tied back to one person.
 *   - OPT-OUT: members with personalization_enabled = false are excluded
 *     entirely — the same kill switch that turns off their own personalization
 *     also keeps them out of org analytics.
 *   - Only taxonomy topics are aggregated (sector/industry/entity/geo/theme/
 *     asset_class). Per-ticker scores are intentionally NOT aggregated.
 *
 *   GET /api/cron/org-interest-aggregates[?k=3&top=20]
 *   CRON_SECRET bearer (or ?key= fallback).
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

// profile column -> public dimension name.
const DIMENSIONS = {
  sector_scores: 'sector',
  industry_scores: 'industry',
  entity_scores: 'entity',
  geo_scores: 'geo',
  theme_scores: 'theme',
  asset_class_scores: 'asset_class',
};
const PROFILE_COLS = ['user_id', 'personalization_enabled', ...Object.keys(DIMENSIONS)].join(', ');
const DEFAULT_K = 3;

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if ((request.headers.get('authorization') || '') === `Bearer ${secret}`) return true;
  try {
    return new URL(request.url).searchParams.get('key') === secret;
  } catch {
    return false;
  }
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  // K floor never drops below the hard privacy minimum, whatever the query says.
  const K = Math.max(Number(searchParams.get('k')) || DEFAULT_K, DEFAULT_K);
  const topPerDim = Math.min(Math.max(Number(searchParams.get('top')) || 20, 1), 100);
  const admin = getAdminClient();
  const stamp = new Date().toISOString();

  // All active memberships -> org_id => [user_id].
  const { data: memberRows, error: memErr } = await admin
    .from('org_members')
    .select('org_id, user_id')
    .eq('is_active', true)
    .limit(100000);
  if (memErr) {
    return NextResponse.json({ ok: false, error: memErr.message }, { status: 500 });
  }
  const orgUsers = new Map();
  for (const r of memberRows || []) {
    if (!r.org_id || !r.user_id) continue;
    if (!orgUsers.has(r.org_id)) orgUsers.set(r.org_id, new Set());
    orgUsers.get(r.org_id).add(r.user_id);
  }

  let orgsWritten = 0;
  let rowsWritten = 0;

  for (const [orgId, userSet] of orgUsers) {
    const userIds = [...userSet];
    if (userIds.length < K) {
      // Can't possibly satisfy k-anonymity — clear any stale rows and skip.
      // eslint-disable-next-line no-await-in-loop
      await admin.from('org_interest_aggregates').delete().eq('org_id', orgId);
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    const { data: profiles } = await admin
      .from('user_interest_profiles')
      .select(PROFILE_COLS)
      .in('user_id', userIds);

    // dimension -> value -> { score, members:Set }
    const agg = {};
    for (const dim of Object.values(DIMENSIONS)) agg[dim] = new Map();

    for (const p of profiles || []) {
      if (p.personalization_enabled === false) continue; // respect opt-out
      for (const [col, dim] of Object.entries(DIMENSIONS)) {
        const map = p[col];
        if (!map || typeof map !== 'object') continue;
        for (const [value, rawScore] of Object.entries(map)) {
          const score = Number(rawScore);
          if (!(score > 0) || !value) continue;
          const bucket = agg[dim];
          const cur = bucket.get(value) || { score: 0, members: new Set() };
          cur.score += score;
          cur.members.add(p.user_id);
          bucket.set(value, cur);
        }
      }
    }

    // Flatten, apply k-anonymity floor, keep top-N per dimension.
    const rows = [];
    for (const [dim, bucket] of Object.entries(agg)) {
      const kept = [...bucket.entries()]
        .filter(([, v]) => v.members.size >= K)
        .sort((a, b) => b[1].score - a[1].score)
        .slice(0, topPerDim);
      for (const [value, v] of kept) {
        rows.push({
          org_id: orgId,
          dimension: dim,
          value,
          score: Number(v.score.toFixed(4)),
          member_count: v.members.size,
          computed_at: stamp,
        });
      }
    }

    // Atomic-ish replace: clear the org's rows, then insert the fresh set.
    // eslint-disable-next-line no-await-in-loop
    await admin.from('org_interest_aggregates').delete().eq('org_id', orgId);
    if (rows.length) {
      // eslint-disable-next-line no-await-in-loop
      const { error: insErr } = await admin.from('org_interest_aggregates').insert(rows);
      if (!insErr) {
        orgsWritten += 1;
        rowsWritten += rows.length;
      }
    }
  }

  return NextResponse.json({ ok: true, orgs: orgUsers.size, orgsWritten, rowsWritten, k: K });
}
