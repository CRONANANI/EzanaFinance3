import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import { loadIpsViolations } from './_loader';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MANAGER_ROLES = ['executive', 'portfolio_manager'];

/* GET /api/org/ips/violations?all=1 — violations (open by default).
   The read lives in `_loader.js` so the Compliance server page can seed the
   same payload for first paint without a client round-trip. */
export const GET = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const includeResolved = searchParams.get('all') === '1';

    const { error, payload } = await loadIpsViolations(supabase, member, { includeResolved });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(payload);
  },
  { requireAuth: true },
);

/* PATCH /api/org/ips/violations — resolve a violation (manager only). */
export const PATCH = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, MANAGER_ROLES)) {
      return NextResponse.json({ error: 'Manager role required' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    if (!body?.id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { data, error } = await supabase
      .from('org_ips_violations')
      .update({ resolved: body?.resolved !== false })
      .eq('id', body.id)
      .eq('org_id', member.org_id)
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ violation: data });
  },
  { requireAuth: true },
);
