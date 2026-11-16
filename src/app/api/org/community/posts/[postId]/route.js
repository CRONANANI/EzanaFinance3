/**
 * PATCH  /api/org/community/posts/:postId   { action: 'edit' | 'pin' | 'unpin', content?, title? }
 * DELETE /api/org/community/posts/:postId?as=author|executive
 *
 * Authors edit and delete their own posts; executives (the faculty advisor
 * included) remove any post in their council and pin up to three. Each rule
 * is checked here and again by the database. Until the database change in
 * sql.md is applied these answer 409 "not available yet".
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { changePost } from '@/lib/org-community-server';
import { isValidUuid } from '@/lib/uuid';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function postIdOf(context) {
  const params = (await context?.params) || {};
  return isValidUuid(params.postId) ? params.postId : null;
}

export const PATCH = withApiGuard(
  async (request, user, context) => {
    const id = await postIdOf(context);
    if (!id) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const action = ['edit', 'pin', 'unpin'].includes(body?.action) ? body.action : null;
    if (!action) return NextResponse.json({ error: 'Unknown change' }, { status: 400 });
    const r = await changePost(supabase, member, id, action, body);
    return NextResponse.json(r.body, { status: r.status });
  },
  { requireAuth: true },
);

export const DELETE = withApiGuard(
  async (request, user, context) => {
    const id = await postIdOf(context);
    if (!id) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const as = new URL(request.url).searchParams.get('as');
    const action = as === 'executive' ? 'remove' : 'delete';
    const r = await changePost(supabase, member, id, action, null);
    return NextResponse.json(r.body, { status: r.status });
  },
  { requireAuth: true },
);
