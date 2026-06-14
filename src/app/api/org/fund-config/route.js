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

const TERM_TYPES = ['semester', 'quarter', 'year'];

/* GET /api/org/fund-config — current fund configuration (any active member). */
export const GET = withApiGuard(
  async () => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const [{ data: cfg }, { data: org }] = await Promise.all([
      supabase
        .from('org_fund_config')
        .select('fund_display_name, benchmark_symbol, term_type, term_start, term_end, accent_color')
        .eq('org_id', member.org_id)
        .maybeSingle(),
      supabase
        .from('organizations')
        .select('university_name, name')
        .eq('id', member.org_id)
        .maybeSingle(),
    ]);

    return NextResponse.json({
      config: {
        fund_display_name: cfg?.fund_display_name || '',
        benchmark_symbol: cfg?.benchmark_symbol || 'SPY',
        term_type: cfg?.term_type || 'semester',
        term_start: cfg?.term_start || '',
        term_end: cfg?.term_end || '',
        accent_color: cfg?.accent_color || '',
      },
      orgName: org?.university_name || org?.name || 'Organization',
      viewer: { canManage: assertOrgRole(member, ['executive']) },
    });
  },
  { requireAuth: true },
);

/* PATCH /api/org/fund-config — update fund configuration (executive only). */
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

    const update = { org_id: member.org_id, updated_at: new Date().toISOString() };
    if ('fund_display_name' in body) update.fund_display_name = body.fund_display_name || null;
    if ('benchmark_symbol' in body) {
      update.benchmark_symbol = String(body.benchmark_symbol || 'SPY').toUpperCase().slice(0, 12) || 'SPY';
    }
    if ('term_type' in body) {
      update.term_type = TERM_TYPES.includes(body.term_type) ? body.term_type : 'semester';
    }
    if ('term_start' in body) update.term_start = body.term_start || null;
    if ('term_end' in body) update.term_end = body.term_end || null;

    if (!isServerSupabaseConfigured()) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
    }
    const service = createServerSupabaseClient();
    const { data, error } = await service
      .from('org_fund_config')
      .upsert(update, { onConflict: 'org_id' })
      .select('fund_display_name, benchmark_symbol, term_type, term_start, term_end, accent_color')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ config: data });
  },
  { requireAuth: true },
);
