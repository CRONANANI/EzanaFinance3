import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/plaid';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * DELETE /api/echo/comments/<commentId> — soft-delete own comment
 */
export async function DELETE(request, { params }) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const commentId = params?.commentId;
    if (!commentId) {
      return NextResponse.json({ error: 'commentId required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('echo_article_comments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', commentId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('[echo/comments DELETE] update failed:', error);
      return NextResponse.json({ error: 'Could not delete comment' }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json(
        { error: 'Comment not found or already deleted' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[echo/comments DELETE] unexpected error:', err);
    return NextResponse.json(
      { error: err?.message || 'Unknown error' },
      { status: 500 },
    );
  }
}
