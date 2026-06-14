import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import {
  createServerSupabaseClient,
  isServerSupabaseConfigured,
} from '@/lib/supabase-service-role';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import { logOrgAction } from '@/lib/org-audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* GET /api/org/branding — logo + accent (any active member reads). */
export const GET = withApiGuard(
  async () => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const [{ data: org }, { data: cfg }] = await Promise.all([
      supabase
        .from('organizations')
        .select('university_name, name, logo_url')
        .eq('id', member.org_id)
        .maybeSingle(),
      supabase
        .from('org_fund_config')
        .select('accent_color')
        .eq('org_id', member.org_id)
        .maybeSingle(),
    ]);

    return NextResponse.json({
      branding: {
        orgName: org?.university_name || org?.name || 'Organization',
        logo_url: org?.logo_url || '',
        accent_color: cfg?.accent_color || '',
      },
      viewer: { canManage: assertOrgRole(member, ['executive']) },
    });
  },
  { requireAuth: true },
);

/* PATCH /api/org/branding — set logo_url + accent (executive only). Accepts a
   URL for the logo (Supabase storage upload can be wired later). */
export const PATCH = withApiGuard(
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

    // Only allow http(s) URLs for the logo to avoid javascript:/data: injection.
    if ('logo_url' in body && body.logo_url) {
      if (!/^https?:\/\//i.test(String(body.logo_url))) {
        return NextResponse.json({ error: 'Logo must be an http(s) URL' }, { status: 400 });
      }
    }

    if (!isServerSupabaseConfigured()) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
    }
    const service = createServerSupabaseClient();

    if ('logo_url' in body) {
      const { error } = await service
        .from('organizations')
        .update({ logo_url: body.logo_url || null })
        .eq('id', member.org_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if ('accent_color' in body) {
      const { error } = await service
        .from('org_fund_config')
        .upsert(
          { org_id: member.org_id, accent_color: body.accent_color || null, updated_at: new Date().toISOString() },
          { onConflict: 'org_id' },
        );
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logOrgAction(service, {
      orgId: member.org_id,
      actorId: member.user_id,
      action: 'branding_updated',
      targetType: 'org',
      targetId: member.org_id,
      detail: { logo_url: 'logo_url' in body, accent_color: 'accent_color' in body },
    });

    return NextResponse.json({ ok: true });
  },
  { requireAuth: true },
);
