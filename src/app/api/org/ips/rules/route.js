import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import { loadIpsRules, RULE_TYPES } from './_loader';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* GET /api/org/ips/rules — list rules (any member).
   The read lives in `_loader.js` so the Compliance server page can seed the
   same payload for first paint without a client round-trip. */
export const GET = withApiGuard(
  async () => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const { error, payload } = await loadIpsRules(supabase, member);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(payload);
  },
  { requireAuth: true },
);

/* POST /api/org/ips/rules — create or toggle a rule (executive only). */
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

    // Toggle an existing rule.
    if (body?.id && 'is_active' in body) {
      const { data, error } = await supabase
        .from('org_ips_rules')
        .update({ is_active: !!body.is_active })
        .eq('id', body.id)
        .eq('org_id', member.org_id)
        .select('*')
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ rule: data });
    }

    const ruleType = body?.rule_type;
    if (!RULE_TYPES.includes(ruleType) || !body?.rule_value) {
      return NextResponse.json(
        { error: 'Valid rule_type and rule_value required' },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from('org_ips_rules')
      .insert({
        org_id: member.org_id,
        rule_type: ruleType,
        rule_value: body.rule_value,
        label: body?.label ? String(body.label).slice(0, 160) : null,
        is_active: body?.is_active !== false,
        created_by: member.user_id,
      })
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ rule: data });
  },
  { requireAuth: true },
);

/* DELETE /api/org/ips/rules?id= — remove a rule (executive only). */
export const DELETE = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, ['executive'])) {
      return NextResponse.json({ error: 'Executive role required' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { error } = await supabase
      .from('org_ips_rules')
      .delete()
      .eq('id', id)
      .eq('org_id', member.org_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  },
  { requireAuth: true },
);
