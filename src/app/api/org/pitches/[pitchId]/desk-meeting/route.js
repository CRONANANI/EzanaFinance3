import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getPitchContext, fetchPitchRaw } from '@/lib/org-pitch-api-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Only a desk PM / exec may log the deep-dive desk meeting (spec §5.2).
const ELIGIBLE_ROLES = ['portfolio_manager', 'executive'];
const DECISIONS = ['advance', 'more_work', 'kill'];

/**
 * GET /api/org/pitches/[pitchId]/desk-meeting
 * Returns the latest logged desk meeting for the pitch (or null).
 */
export const GET = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
    const { supabase, member, orgId } = await getPitchContext();
    if (!orgId || !member)
      return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const pitch = await fetchPitchRaw(supabase, orgId, params.pitchId);
    if (!pitch) return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });

    const { data, error } = await supabase
      .from('org_desk_meeting')
      .select('*')
      .eq('pitch_id', pitch.id)
      .eq('org_id', orgId)
      .order('held_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ meeting: data || null });
  },
  { requireAuth: true },
);

/**
 * POST /api/org/pitches/[pitchId]/desk-meeting
 * Logs a structured desk meeting. Gate `desk_meeting_logged` passes once a row
 * exists with held_at set AND attendee_ids length >= 3.
 * Body: { held_at, attendee_ids[], compliance_notes, sector_weight_notes,
 *         headwinds, tailwinds, proposed_sizing_pct, decision }
 */
export const POST = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
    const { supabase, member, orgId } = await getPitchContext();
    if (!orgId || !member)
      return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const pitch = await fetchPitchRaw(supabase, orgId, params.pitchId);
    if (!pitch) return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });

    // Only a desk PM / exec may log the meeting — the artifact is theirs to sign.
    if (!ELIGIBLE_ROLES.includes(member.role)) {
      return NextResponse.json(
        { error: 'Only a desk PM or executive may log a desk meeting.' },
        { status: 403 },
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    // ── Validate: held_at present, >= 3 attendees, text fields non-empty ──────
    if (!body.held_at) {
      return NextResponse.json(
        { error: 'A meeting date/time (held_at) is required.' },
        { status: 400 },
      );
    }
    const heldAt = new Date(body.held_at);
    if (Number.isNaN(heldAt.getTime())) {
      return NextResponse.json({ error: 'held_at is not a valid date.' }, { status: 400 });
    }

    const attendeeIds = Array.isArray(body.attendee_ids)
      ? body.attendee_ids.map((x) => String(x).trim()).filter(Boolean)
      : [];
    if (attendeeIds.length < 3) {
      return NextResponse.json(
        { error: 'At least 3 attendees are required to log a desk meeting.' },
        { status: 400 },
      );
    }

    const textFields = {
      compliance_notes: body.compliance_notes,
      sector_weight_notes: body.sector_weight_notes,
      headwinds: body.headwinds,
      tailwinds: body.tailwinds,
    };
    for (const [key, value] of Object.entries(textFields)) {
      if (!value || !String(value).trim()) {
        return NextResponse.json(
          { error: `Field "${key}" is required and cannot be empty.` },
          { status: 400 },
        );
      }
    }

    const sizing = body.proposed_sizing_pct;
    if (sizing == null || sizing === '' || Number.isNaN(Number(sizing))) {
      return NextResponse.json(
        { error: 'A numeric proposed sizing % is required.' },
        { status: 400 },
      );
    }

    let decision = null;
    if (body.decision != null && body.decision !== '') {
      if (!DECISIONS.includes(body.decision)) {
        return NextResponse.json(
          { error: `decision must be one of ${DECISIONS.join(', ')}.` },
          { status: 400 },
        );
      }
      decision = body.decision;
    }

    const insert = {
      pitch_id: pitch.id,
      org_id: orgId,
      held_at: heldAt.toISOString(),
      attendee_ids: attendeeIds,
      compliance_notes: String(body.compliance_notes).trim(),
      sector_weight_notes: String(body.sector_weight_notes).trim(),
      headwinds: String(body.headwinds).trim(),
      tailwinds: String(body.tailwinds).trim(),
      proposed_sizing_pct: Number(sizing),
      decision,
      notes: body.notes ? String(body.notes).trim() : null,
      logged_by: member.id,
      recorded_by: member.id,
    };

    const { data, error } = await supabase
      .from('org_desk_meeting')
      .insert(insert)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ meeting: data }, { status: 201 });
  },
  { requireAuth: true },
);
