import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getOrgMemberForUser, ORG_COOKIE } from '@/lib/org-trading-server';
import { isValidUuid } from '@/lib/uuid';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ONE_YEAR_S = 60 * 60 * 24 * 365;

/**
 * POST /api/org/switch — body { orgId }. Sets the `ez_org` cookie that
 * getCurrentOrgMember / getOrgMemberForUser use to pick which of a multi-org
 * user's memberships is active (QA ORG-9). The cookie is only a PREFERENCE:
 * it is honoured only when the caller holds an active membership in that org,
 * and RLS still scopes every read. 403 when the caller is not a member there.
 */
export const POST = withApiGuard(
  async (request, user) => {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const orgId = body?.orgId;
    if (!isValidUuid(orgId)) {
      return NextResponse.json({ error: 'orgId required' }, { status: 400 });
    }

    const supabase = getUserClient();
    const member = await getOrgMemberForUser(supabase, user.id, {
      preferredOrgId: orgId,
      select: 'id, org_id',
    });
    if (!member || member.org_id !== orgId) {
      return NextResponse.json({ error: 'Not a member of that organization' }, { status: 403 });
    }

    const res = NextResponse.json({ ok: true, orgId });
    res.cookies.set(ORG_COOKIE, orgId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: ONE_YEAR_S,
    });
    return res;
  },
  { requireAuth: true },
);
