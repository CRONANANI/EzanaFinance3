import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MANAGER_ROLES = ['executive', 'portfolio_manager'];
const FIELD_KINDS = ['short_text', 'long_text', 'dropdown', 'file', 'ticker'];

async function resolveParams(context) {
  return (await context?.params) || {};
}

function cleanFields(fields) {
  if (!Array.isArray(fields)) return [];
  return fields
    .filter((f) => f && FIELD_KINDS.includes(f.kind))
    .slice(0, 40)
    .map((f) => ({
      kind: f.kind,
      label: String(f.label || '').slice(0, 200),
      required: !!f.required,
      options: Array.isArray(f.options)
        ? f.options.map((o) => String(o).slice(0, 80)).slice(0, 30)
        : [],
    }));
}

/* GET /api/org/cohorts/:id/forms — application forms for the cohort. The public
   intake page itself is out of scope; the manager-side builder + is_open toggle
   + slug (informational public link) live here. */
export const GET = withApiGuard(
  async (request, user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const { id } = await resolveParams(context);

    const { data, error } = await supabase
      .from('org_application_forms')
      .select('*')
      .eq('org_id', member.org_id)
      .eq('cohort_id', id)
      .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      forms: data || [],
      canManage: MANAGER_ROLES.includes(member.role),
    });
  },
  { requireAuth: true },
);

/* POST /api/org/cohorts/:id/forms — create an application form (manager only). */
export const POST = withApiGuard(
  async (request, user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, MANAGER_ROLES)) {
      return NextResponse.json({ error: 'Manager role required' }, { status: 403 });
    }
    const { id } = await resolveParams(context);

    const { data: cohort } = await supabase
      .from('org_cohorts')
      .select('id')
      .eq('id', id)
      .eq('org_id', member.org_id)
      .maybeSingle();
    if (!cohort) return NextResponse.json({ error: 'Cohort not found' }, { status: 404 });

    let body = {};
    try {
      body = await request.json();
    } catch {
      /* defaults */
    }

    const { data, error } = await supabase
      .from('org_application_forms')
      .insert({
        org_id: member.org_id,
        cohort_id: id,
        fields: cleanFields(body?.fields),
        public_slug: randomUUID().slice(0, 12),
        is_open: !!body?.is_open,
        blind_screening: !!body?.blind_screening,
      })
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ form: data }, { status: 201 });
  },
  { requireAuth: true },
);

/* PATCH /api/org/cohorts/:id/forms — update fields / is_open / blind_screening
   (manager only). */
export const PATCH = withApiGuard(
  async (request, user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, MANAGER_ROLES)) {
      return NextResponse.json({ error: 'Manager role required' }, { status: 403 });
    }
    const { id } = await resolveParams(context);

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const formId = body?.form_id;
    if (!formId) return NextResponse.json({ error: 'form_id required' }, { status: 400 });

    const update = {};
    if ('fields' in body) update.fields = cleanFields(body.fields);
    if ('is_open' in body) update.is_open = !!body.is_open;
    if ('blind_screening' in body) update.blind_screening = !!body.blind_screening;
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('org_application_forms')
      .update(update)
      .eq('id', formId)
      .eq('org_id', member.org_id)
      .eq('cohort_id', id)
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ form: data });
  },
  { requireAuth: true },
);
