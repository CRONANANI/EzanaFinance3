import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/plaid';
import { isAdminUser } from '@/lib/admin-helpers';

export const dynamic = 'force-dynamic';

const VALID_CATEGORIES = ['feature', 'improvement', 'fix', 'announcement', 'breaking'];

/**
 * OPTIONS /api/admin/changelog
 * Used by the client to detect whether the current user is an admin.
 * Returns 204 if admin, 403 otherwise.
 */
export async function OPTIONS() {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse(null, { status: 401 });
    }
    if (!isAdminUser(user)) {
      return new NextResponse(null, { status: 403 });
    }
    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}

/**
 * POST /api/admin/changelog
 * Body: { title, body, category?, is_pinned?, is_published?, released_at? }
 *
 * Authorization: logged-in user's email must be in ADMIN_EMAILS env var.
 */
export async function POST(request) {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdminUser(user)) {
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const title = (body?.title || '').trim();
    const entryBody = (body?.body || '').trim();
    if (!title || !entryBody) {
      return NextResponse.json({ error: 'title and body required' }, { status: 400 });
    }
    if (title.length > 200) {
      return NextResponse.json({ error: 'title max 200 chars' }, { status: 400 });
    }
    if (entryBody.length > 5000) {
      return NextResponse.json({ error: 'body max 5000 chars' }, { status: 400 });
    }

    const category = VALID_CATEGORIES.includes(body?.category) ? body.category : 'improvement';

    const insertRow = {
      title,
      body: entryBody,
      category,
      is_pinned: Boolean(body?.is_pinned),
      is_published: body?.is_published !== false, // default true
      author_email: user.email,
    };
    if (body?.released_at) {
      insertRow.released_at = body.released_at;
    }

    const { data: created, error } = await supabaseAdmin
      .from('platform_changelog_entries')
      .insert(insertRow)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, entry: created });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/changelog
 * Body: { id, title?, body?, category?, is_pinned?, is_published?, released_at? }
 *
 * Update an existing entry.
 */
export async function PATCH(request) {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdminUser(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const id = body?.id;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const updates = {};
    if (typeof body.title === 'string') updates.title = body.title.trim();
    if (typeof body.body === 'string') updates.body = body.body.trim();
    if (VALID_CATEGORIES.includes(body.category)) updates.category = body.category;
    if (typeof body.is_pinned === 'boolean') updates.is_pinned = body.is_pinned;
    if (typeof body.is_published === 'boolean') updates.is_published = body.is_published;
    if (body.released_at) updates.released_at = body.released_at;

    if (updates.title !== undefined && updates.title.length > 200) {
      return NextResponse.json({ error: 'title max 200 chars' }, { status: 400 });
    }
    if (updates.body !== undefined && updates.body.length > 5000) {
      return NextResponse.json({ error: 'body max 5000 chars' }, { status: 400 });
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    const { data: updated, error } = await supabaseAdmin
      .from('platform_changelog_entries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, entry: updated });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/changelog?id=<uuid>
 */
export async function DELETE(request) {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdminUser(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { error } = await supabaseAdmin.from('platform_changelog_entries').delete().eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
