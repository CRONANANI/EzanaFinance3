import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/community/posts/conviction?postIds=id1,id2,id3
 */
export async function GET(request) {
  try {
    const { user, client } = await requireUser(request);
    const url = new URL(request.url);
    const postIdsParam = url.searchParams.get('postIds') || '';
    const postIds = postIdsParam
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (postIds.length === 0) {
      return NextResponse.json({ stats: {} });
    }
    if (postIds.length > 100) {
      return NextResponse.json({ error: 'Too many postIds (max 100)' }, { status: 400 });
    }

    const { data: myConvictions, error: myErr } = await client
      .from('post_convictions')
      .select('post_id, conviction_pct')
      .eq('user_id', user.id)
      .in('post_id', postIds);

    if (myErr) {
      return NextResponse.json({ error: myErr.message }, { status: 500 });
    }

    const { data: aggStats, error: aggErr } = await client
      .from('post_conviction_stats')
      .select('post_id, conviction_count, avg_conviction')
      .in('post_id', postIds);

    if (aggErr) {
      return NextResponse.json({ error: aggErr.message }, { status: 500 });
    }

    const stats = {};
    for (const id of postIds) {
      stats[id] = { my_conviction: null, avg_conviction: null, conviction_count: 0 };
    }
    for (const row of myConvictions || []) {
      if (!stats[row.post_id]) {
        stats[row.post_id] = { my_conviction: null, avg_conviction: null, conviction_count: 0 };
      }
      stats[row.post_id].my_conviction = row.conviction_pct;
    }
    for (const row of aggStats || []) {
      if (!stats[row.post_id]) {
        stats[row.post_id] = { my_conviction: null, avg_conviction: null, conviction_count: 0 };
      }
      stats[row.post_id].avg_conviction = row.avg_conviction;
      stats[row.post_id].conviction_count = row.conviction_count;
    }

    return NextResponse.json({ stats });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

/**
 * POST /api/community/posts/conviction
 * Body: { postId: string, conviction: number (0-100) }
 */
export async function POST(request) {
  try {
    const { user, client } = await requireUser(request);
    const body = await request.json().catch(() => null);
    const postId = body?.postId?.trim();
    const conviction = Number(body?.conviction);

    if (!postId) {
      return NextResponse.json({ error: 'postId required' }, { status: 400 });
    }
    if (!Number.isFinite(conviction) || conviction < 0 || conviction > 100) {
      return NextResponse.json({ error: 'conviction must be 0-100' }, { status: 400 });
    }

    const pct = Math.round(conviction);
    const now = new Date().toISOString();

    const { error: upsertErr } = await client.from('post_convictions').upsert(
      {
        post_id: postId,
        user_id: user.id,
        conviction_pct: pct,
        updated_at: now,
      },
      { onConflict: 'post_id,user_id' },
    );

    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }

    const { data: stats } = await client
      .from('post_conviction_stats')
      .select('conviction_count, avg_conviction')
      .eq('post_id', postId)
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      my_conviction: pct,
      avg_conviction: stats?.avg_conviction ?? pct,
      conviction_count: stats?.conviction_count ?? 1,
    });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

/**
 * DELETE /api/community/posts/conviction?postId=...
 */
export async function DELETE(request) {
  try {
    const { user, client } = await requireUser(request);
    const url = new URL(request.url);
    const postId = url.searchParams.get('postId')?.trim();

    if (!postId) {
      return NextResponse.json({ error: 'postId required' }, { status: 400 });
    }

    const { error } = await client
      .from('post_convictions')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
