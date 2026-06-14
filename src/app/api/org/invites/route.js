import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import {
  createServerSupabaseClient,
  isServerSupabaseConfigured,
} from '@/lib/supabase-service-role';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ROLES = ['executive', 'portfolio_manager', 'analyst'];

/* GET /api/org/invites — pending invites for the caller's org (executive only). */
export const GET = withApiGuard(
  async () => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, ['executive'])) {
      return NextResponse.json({ error: 'Executive role required' }, { status: 403 });
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('email_domain')
      .eq('id', member.org_id)
      .maybeSingle();

    const { data, error } = await supabase
      .from('org_invites')
      .select('id, email, role, sub_role, team_id, cohort_id, token, status, created_at, expires_at')
      .eq('org_id', member.org_id)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ invites: data || [], emailDomain: org?.email_domain || null });
  },
  { requireAuth: true },
);

/* POST /api/org/invites — create an invite (executive only). Enforces the org's
   email-domain. Returns a copyable invite link (no transactional email wired). */
export const POST = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, ['executive'])) {
      return NextResponse.json({ error: 'Executive role required' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const email = String(body?.email || '').trim().toLowerCase();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    }
    const role = ROLES.includes(body?.role) ? body.role : 'analyst';

    const { data: org } = await supabase
      .from('organizations')
      .select('email_domain')
      .eq('id', member.org_id)
      .maybeSingle();
    const domain = (org?.email_domain || '').toLowerCase();
    if (domain && !email.endsWith(`@${domain}`)) {
      return NextResponse.json(
        { error: `Email must end in @${domain}` },
        { status: 400 },
      );
    }

    if (!isServerSupabaseConfigured()) {
      return NextResponse.json({ error: 'Server not configured for invites' }, { status: 503 });
    }
    const service = createServerSupabaseClient();
    const { data: invite, error } = await service
      .from('org_invites')
      .insert({
        org_id: member.org_id,
        email,
        role,
        sub_role: body?.sub_role || null,
        team_id: body?.team_id || null,
        cohort_id: body?.cohort_id || null,
        status: 'pending',
        invited_by: member.user_id,
      })
      .select('id, email, role, sub_role, team_id, cohort_id, token, status, created_at, expires_at')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ invite }, { status: 201 });
  },
  { requireAuth: true },
);
