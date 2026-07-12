import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MANAGER_ROLES = ['executive', 'portfolio_manager'];
const WEIGHT_ROLES = ['analyst', 'quant_trader', 'portfolio_manager', 'vp'];

/* GET /api/org/recognition/weights — platform defaults + this org's overrides,
   grouped by role. Every member can read; managers may write. */
export const GET = withApiGuard(
  async () => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const { data, error } = await supabase
      .from('org_rating_weights')
      .select('id, org_id, role, category, weight')
      .or(`org_id.is.null,org_id.eq.${member.org_id}`);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const roles = {};
    for (const role of WEIGHT_ROLES) roles[role] = new Map();
    // platform defaults first, org overrides win.
    for (const r of (data || []).filter((r) => r.org_id == null)) {
      if (roles[r.role])
        roles[r.role].set(r.category, {
          category: r.category,
          default_weight: Number(r.weight),
          weight: Number(r.weight),
          overridden: false,
        });
    }
    for (const r of (data || []).filter((r) => r.org_id === member.org_id)) {
      if (!roles[r.role]) continue;
      const existing = roles[r.role].get(r.category);
      roles[r.role].set(r.category, {
        category: r.category,
        default_weight: existing?.default_weight ?? Number(r.weight),
        weight: Number(r.weight),
        overridden: true,
      });
    }

    const out = WEIGHT_ROLES.map((role) => ({
      role,
      categories: [...roles[role].values()].sort((a, b) => b.weight - a.weight),
    }));

    return NextResponse.json({
      roles: out,
      canEdit: assertOrgRole(member, MANAGER_ROLES),
    });
  },
  { requireAuth: true },
);

/* PUT /api/org/recognition/weights — upsert per-org weight overrides (managers).
   Body: { role, weights: [{ category, weight }] }. Never touches platform defaults. */
export const PUT = withApiGuard(
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
    const role = String(body?.role || '');
    if (!WEIGHT_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    const weights = Array.isArray(body?.weights) ? body.weights : [];
    const rows = [];
    for (const w of weights) {
      const category = String(w?.category || '').trim();
      const weight = Number(w?.weight);
      if (!category || !Number.isFinite(weight) || weight < 0 || weight > 100) {
        return NextResponse.json(
          { error: `Invalid weight for ${category || 'category'}` },
          { status: 400 },
        );
      }
      rows.push({ org_id: member.org_id, role, category, weight });
    }
    if (rows.length === 0)
      return NextResponse.json({ error: 'No weights provided' }, { status: 400 });

    const { error } = await supabase
      .from('org_rating_weights')
      .upsert(rows, { onConflict: 'org_id,role,category' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, role, updated: rows.length });
  },
  { requireAuth: true },
);
