import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { isAdminUser } from '@/lib/admin-helpers';
import { archiveArticle, republishArticle } from '@/lib/echo-article-status';
import { getArticleBySlug } from '@/lib/echo-data';

export const dynamic = 'force-dynamic';

/**
 * POST /api/echo/admin/archive
 * Body: { articleId: string, notes?: string }
 * Admin-only. Archives the article.
 */
export const POST = withApiGuard(
  async (request, user) => {
    if (!isAdminUser(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const articleId = typeof body?.articleId === 'string' ? body.articleId.trim() : '';
    if (!articleId) return NextResponse.json({ error: 'articleId required' }, { status: 400 });

    const article = await getArticleBySlug(articleId);
    if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 });

    const notes = typeof body?.notes === 'string' ? body.notes.slice(0, 500) : null;

    try {
      const result = await archiveArticle({
        articleId,
        userId: user.id,
        userEmail: user.email,
        notes,
      });
      return NextResponse.json({ ok: true, status: result });
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  },
  { requireAuth: true },
);

/**
 * DELETE /api/echo/admin/archive
 * Body: { articleId: string }
 * Admin-only. Republishes (un-archives) the article.
 */
export const DELETE = withApiGuard(
  async (request, user) => {
    if (!isAdminUser(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const articleId = typeof body?.articleId === 'string' ? body.articleId.trim() : '';
    if (!articleId) return NextResponse.json({ error: 'articleId required' }, { status: 400 });

    try {
      const result = await republishArticle({
        articleId,
        userId: user.id,
        userEmail: user.email,
      });
      return NextResponse.json({ ok: true, status: result });
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  },
  { requireAuth: true },
);
