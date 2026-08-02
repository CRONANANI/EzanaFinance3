import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

/**
 * Compute a per-user interest vector (Echo gte-small 384-dim space) as the
 * engagement-weighted mean of the embeddings of the Echo articles the user has
 * actually consumed. Stored on user_interest_profiles.interest_vector and read
 * by match_echo_articles_for_user (RPC) for vector-ranked Echo surfaces.
 *
 * This is the SAME space as echo_articles.embedding (populated by
 * index-echo-articles), so cosine similarity between the two is meaningful.
 *
 *   GET /api/cron/compute-interest-vectors?days=45[&limit=1000]
 *   CRON_SECRET bearer (or ?key= fallback).
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

// Engagement weights per consumption event — a confirmed read/save says far
// more than a bounce-open. meta_click is an explicit taxonomy signal.
const EVENT_WEIGHT = {
  article_read: 3,
  article_save: 4,
  article_meta_click: 2,
  article_open: 1,
};
const CONSUMPTION_EVENTS = Object.keys(EVENT_WEIGHT);
const EMBED_DIM = 384;

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

/** pgvector columns come back as a JSON-ish string or an array; normalize. */
function parseEmbedding(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : null;
    } catch {
      return null;
    }
  }
  return null;
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const days = Math.min(Math.max(Number(searchParams.get('days')) || 45, 1), 180);
  const userLimit = Math.min(Math.max(Number(searchParams.get('limit')) || 1000, 1), 5000);
  const admin = getAdminClient();
  const since = new Date(Date.now() - days * 86400000).toISOString();

  // Users who consumed at least one article in the window.
  const { data: activeRows, error: actErr } = await admin
    .from('activity_breadcrumbs')
    .select('user_id')
    .in('event_type', CONSUMPTION_EVENTS)
    .gte('created_at', since)
    .limit(50000);
  if (actErr) {
    return NextResponse.json({ ok: false, error: actErr.message }, { status: 500 });
  }
  const userIds = [...new Set((activeRows || []).map((r) => r.user_id).filter(Boolean))].slice(
    0,
    userLimit,
  );
  if (!userIds.length) {
    return NextResponse.json({ ok: true, users: 0, updated: 0 });
  }

  // Cache article embeddings once — the working set is small (one catalog).
  const { data: artRows } = await admin
    .from('echo_articles')
    .select('article_slug, embedding')
    .eq('article_status', 'published')
    .not('embedding', 'is', null);
  const embBySlug = {};
  for (const r of artRows || []) {
    const emb = parseEmbedding(r.embedding);
    if (emb && emb.length === EMBED_DIM) embBySlug[r.article_slug] = emb;
  }
  if (!Object.keys(embBySlug).length) {
    return NextResponse.json({
      ok: true,
      users: userIds.length,
      updated: 0,
      reason: 'no_article_embeddings',
    });
  }

  let updated = 0;
  const stamp = new Date().toISOString();

  for (const userId of userIds) {
    // eslint-disable-next-line no-await-in-loop
    const { data: bcs } = await admin
      .from('activity_breadcrumbs')
      .select('event_type, event_data')
      .eq('user_id', userId)
      .in('event_type', CONSUMPTION_EVENTS)
      .gte('created_at', since)
      .limit(1000);

    // Accumulate per-slug weight, then a weighted mean of article embeddings.
    const slugWeight = {};
    for (const b of bcs || []) {
      const slug = b.event_data?.article_id;
      if (!slug || !embBySlug[slug]) continue;
      slugWeight[slug] = (slugWeight[slug] || 0) + (EVENT_WEIGHT[b.event_type] || 0);
    }
    const slugs = Object.keys(slugWeight);
    if (!slugs.length) continue;

    const acc = new Array(EMBED_DIM).fill(0);
    let totalW = 0;
    for (const slug of slugs) {
      const w = slugWeight[slug];
      const emb = embBySlug[slug];
      for (let i = 0; i < EMBED_DIM; i += 1) acc[i] += emb[i] * w;
      totalW += w;
    }
    if (totalW <= 0) continue;

    // Mean, then L2-normalize (keeps cosine distance well-conditioned).
    let norm = 0;
    for (let i = 0; i < EMBED_DIM; i += 1) {
      acc[i] /= totalW;
      norm += acc[i] * acc[i];
    }
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let i = 0; i < EMBED_DIM; i += 1) acc[i] /= norm;
    }

    // eslint-disable-next-line no-await-in-loop
    const { error: upErr } = await admin
      .from('user_interest_profiles')
      .update({
        interest_vector: JSON.stringify(acc),
        interest_vector_computed_at: stamp,
      })
      .eq('user_id', userId);
    if (!upErr) updated += 1;
  }

  return NextResponse.json({ ok: true, users: userIds.length, updated });
}
