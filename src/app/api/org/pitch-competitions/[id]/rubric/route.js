import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { canManageCompetition } from '@/lib/competitions/permissions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* PUT /api/org/pitch-competitions/:id/rubric — replace the competition's scoring
   criteria wholesale. Host executives/PMs only. { criteria: [{ label, description?,
   weight, max_score, sort_order }] }. */
export const PUT = withApiGuard(
  async (request, _user, context) => {
    const { id } = await context.params;
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const { data: competition } = await supabase
      .from('pitch_competitions')
      .select('id, host_org_id')
      .eq('id', id)
      .maybeSingle();
    if (!competition) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!canManageCompetition(member, competition)) {
      return NextResponse.json({ error: 'Host manager role required' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const criteria = Array.isArray(body?.criteria) ? body.criteria : null;
    if (!criteria) return NextResponse.json({ error: 'criteria array is required' }, { status: 400 });

    const rows = [];
    criteria.forEach((c, i) => {
      const label = String(c?.label || '').trim();
      if (!label) return; // skip blank rows rather than erroring
      const weight = Number(c?.weight);
      const maxScore = Number(c?.max_score);
      rows.push({
        competition_id: competition.id,
        label,
        description: c?.description || null,
        weight: Number.isFinite(weight) && weight > 0 ? weight : 1,
        max_score: Number.isFinite(maxScore) && maxScore > 0 ? Math.round(maxScore) : 10,
        sort_order: Number.isFinite(Number(c?.sort_order)) ? Number(c.sort_order) : i,
      });
    });
    if (!rows.length) return NextResponse.json({ error: 'At least one criterion is required' }, { status: 400 });

    // Replace wholesale (idempotent): delete existing, insert the new set.
    const del = await supabase.from('pitch_rubric_criteria').delete().eq('competition_id', competition.id);
    if (del.error) return NextResponse.json({ error: del.error.message }, { status: 500 });
    const { data, error } = await supabase
      .from('pitch_rubric_criteria')
      .insert(rows)
      .select('id, label, description, weight, max_score, sort_order')
      .order('sort_order', { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ rubric: data });
  },
  { requireAuth: true },
);
