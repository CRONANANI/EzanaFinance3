import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient, getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';

import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import { logOrgAction } from '@/lib/org-audit';
import { cleanMandate } from '@/lib/org-sonar/fund-fit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TERM_TYPES = ['semester', 'quarter', 'year'];

/* The fund mandate Sonar reads for "should our fund invest?" (Nov 2026,
   20261107140000_org_fund_mandate.sql). Read separately so the page still
   loads before the migration. */
const MANDATE_COLS =
  'investment_thesis, mandate_universe, mandate_horizon, investment_style, focus_sectors, excluded_sectors, min_market_cap_musd';
const MANDATE_EMPTY = {
  investment_thesis: '',
  mandate_universe: '',
  mandate_horizon: '',
  investment_style: '',
  focus_sectors: [],
  excluded_sectors: [],
  min_market_cap_musd: '',
};

async function readMandate(client, orgId) {
  const { data, error } = await client
    .from('org_fund_config')
    .select(MANDATE_COLS)
    .eq('org_id', orgId)
    .maybeSingle();
  if (error) return { mandate: null, available: false };
  return {
    available: true,
    mandate: {
      investment_thesis: data?.investment_thesis || '',
      mandate_universe: data?.mandate_universe || '',
      mandate_horizon: data?.mandate_horizon || '',
      investment_style: data?.investment_style || '',
      focus_sectors: data?.focus_sectors || [],
      excluded_sectors: data?.excluded_sectors || [],
      min_market_cap_musd: data?.min_market_cap_musd ?? '',
    },
  };
}

/* GET /api/org/fund-config — current fund configuration (any active member). */
export const GET = withApiGuard(
  async () => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const [{ data: cfg }, { data: org }] = await Promise.all([
      supabase
        .from('org_fund_config')
        .select(
          'fund_display_name, benchmark_symbol, term_type, term_start, term_end, accent_color',
        )
        .eq('org_id', member.org_id)
        .maybeSingle(),
      supabase
        .from('organizations')
        .select('university_name, name')
        .eq('id', member.org_id)
        .maybeSingle(),
    ]);

    const m = await readMandate(supabase, member.org_id);
    return NextResponse.json({
      mandateAvailable: m.available,
      config: {
        ...(m.mandate || MANDATE_EMPTY),
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
    const supabase = getUserClient();
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
      update.benchmark_symbol =
        String(body.benchmark_symbol || 'SPY')
          .toUpperCase()
          .slice(0, 12) || 'SPY';
    }
    if ('term_type' in body) {
      update.term_type = TERM_TYPES.includes(body.term_type) ? body.term_type : 'semester';
    }
    if ('term_start' in body) update.term_start = body.term_start || null;
    if ('term_end' in body) update.term_end = body.term_end || null;
    const mandate = cleanMandate(body);

    if (!isServerSupabaseConfigured()) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
    }
    const service = getAdminClient();
    const { data, error } = await service
      .from('org_fund_config')
      .upsert(update, { onConflict: 'org_id' })
      .select('fund_display_name, benchmark_symbol, term_type, term_start, term_end, accent_color')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    let mandateSaved = null;
    if (Object.keys(mandate).length) {
      const { error: mErr } = await service
        .from('org_fund_config')
        .update(mandate)
        .eq('org_id', member.org_id);
      if (mErr) {
        return NextResponse.json(
          {
            error:
              'The fund mandate could not be saved yet. Ask an administrator to apply the latest database update.',
          },
          { status: 503 },
        );
      }
      mandateSaved = Object.keys(mandate);
    }
    const m = await readMandate(service, member.org_id);

    await logOrgAction(service, {
      orgId: member.org_id,
      actorId: member.user_id,
      action: 'fund_config_updated',
      targetType: 'org',
      targetId: member.org_id,
      detail: {
        fields: [
          ...Object.keys(update).filter((k) => k !== 'org_id' && k !== 'updated_at'),
          ...(mandateSaved || []),
        ],
      },
    });

    return NextResponse.json({ config: { ...(m.mandate || MANDATE_EMPTY), ...data } });
  },
  { requireAuth: true },
);
