import { NextResponse } from 'next/server';
import { getAdminClient, getCurrentUser } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const SECTIONS = new Set(['user', 'partner']);
const RATINGS = new Set(['up', 'down']);
const MAX_COMMENT = 300;

/**
 * POST /api/help-center/feedback
 * Body: { section: 'user'|'partner', articleSlug, rating: 'up'|'down', comment? }
 *
 * Help pages are public, so anonymous feedback is allowed (user_id null).
 * Logged-in users get one row per (section, article_slug, user_id) — changing
 * a vote updates in place rather than duplicating. Writes use the admin client;
 * RLS keeps direct client reads owner-only. Never throws a 500 at the caller.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body' }, { status: 400 });
  }

  const section = String(body?.section || '');
  const articleSlug = String(body?.articleSlug || '').trim();
  const rating = String(body?.rating || '');
  let comment = typeof body?.comment === 'string' ? body.comment.trim() : '';

  if (!SECTIONS.has(section)) {
    return NextResponse.json({ ok: false, error: 'Invalid section' }, { status: 400 });
  }
  if (!RATINGS.has(rating)) {
    return NextResponse.json({ ok: false, error: 'Invalid rating' }, { status: 400 });
  }
  if (!articleSlug) {
    return NextResponse.json({ ok: false, error: 'Missing article' }, { status: 400 });
  }
  // Enforce the 300-char cap server-side even though the UI also caps it.
  if (comment.length > MAX_COMMENT) comment = comment.slice(0, MAX_COMMENT);
  const commentValue = comment.length ? comment : null;

  try {
    const admin = getAdminClient();
    const user = await getCurrentUser(request).catch(() => null);

    if (user?.id) {
      // Logged-in: update an existing vote, else insert (manual upsert avoids
      // partial-unique-index ON CONFLICT edge cases).
      const { data: existing } = await admin
        .from('help_article_feedback')
        .select('id')
        .eq('section', section)
        .eq('article_slug', articleSlug)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await admin
          .from('help_article_feedback')
          .update({ rating, comment: commentValue, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await admin.from('help_article_feedback').insert({
          section,
          article_slug: articleSlug,
          user_id: user.id,
          rating,
          comment: commentValue,
        });
        if (error) throw error;
      }
    } else {
      const { error } = await admin.from('help_article_feedback').insert({
        section,
        article_slug: articleSlug,
        user_id: null,
        rating,
        comment: commentValue,
      });
      if (error) throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[help-feedback] save failed:', err?.message || err);
    return NextResponse.json({ ok: false, error: 'Could not save feedback' }, { status: 200 });
  }
}
