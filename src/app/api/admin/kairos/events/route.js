import { NextResponse } from 'next/server';
import { getAdminClient, requireUser } from '@/lib/supabase';
import { isAdminUser } from '@/lib/admin-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_TYPES = [
  'shipping_disruption',
  'opec_cut',
  'sanctions',
  'conflict',
  'climate_event',
  'trade_policy',
  'other',
];
const VALID_STATUSES = ['monitoring', 'developing', 'realized', 'resolved'];

async function authorize(request) {
  let user;
  try {
    const auth = await requireUser(request);
    user = auth.user;
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (!isAdminUser(user))
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { ok: true, user };
}

export async function OPTIONS(request) {
  const auth = await authorize(request);
  if (!auth.ok) return auth.response;
  return new NextResponse(null, { status: 204 });
}

export async function POST(request) {
  const auth = await authorize(request);
  if (!auth.ok) return auth.response;
  const supabaseAdmin = getAdminClient();

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body?.title || !body?.description || !body?.scenario_type) {
    return NextResponse.json(
      { error: 'title, description, scenario_type required' },
      { status: 400 },
    );
  }
  if (!VALID_TYPES.includes(body.scenario_type)) {
    return NextResponse.json(
      { error: `scenario_type must be: ${VALID_TYPES.join(', ')}` },
      { status: 400 },
    );
  }

  const insertRow = {
    title: body.title.trim(),
    description: body.description.trim(),
    scenario_type: body.scenario_type,
    estimated_probability:
      body.estimated_probability != null ? Number(body.estimated_probability) : null,
    probability_horizon_months:
      body.probability_horizon_months != null ? Number(body.probability_horizon_months) : null,
    status: VALID_STATUSES.includes(body.status) ? body.status : 'monitoring',
    affected_commodities: body.affected_commodities || [],
    affected_regions: body.affected_regions || [],
    source_links: body.source_links || [],
    is_published: body.is_published !== false,
    created_by: auth.user.id,
  };

  const { data, error } = await supabaseAdmin
    .from('kairos_geopolitical_events')
    .insert(insertRow)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, event: data });
}

export async function PATCH(request) {
  const auth = await authorize(request);
  if (!auth.ok) return auth.response;
  const supabaseAdmin = getAdminClient();

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body?.id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const updates = {};
  [
    'title',
    'description',
    'scenario_type',
    'estimated_probability',
    'probability_horizon_months',
    'status',
    'affected_commodities',
    'affected_regions',
    'source_links',
    'is_published',
  ].forEach((k) => {
    if (body[k] !== undefined) updates[k] = body[k];
  });

  if (updates.scenario_type && !VALID_TYPES.includes(updates.scenario_type)) {
    return NextResponse.json({ error: 'invalid scenario_type' }, { status: 400 });
  }
  if (updates.status && !VALID_STATUSES.includes(updates.status)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('kairos_geopolitical_events')
    .update(updates)
    .eq('id', body.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, event: data });
}

export async function DELETE(request) {
  const auth = await authorize(request);
  if (!auth.ok) return auth.response;
  const supabaseAdmin = getAdminClient();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabaseAdmin.from('kairos_geopolitical_events').delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
