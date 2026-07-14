import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getMemberPermissions } from '@/lib/orgMockData';
import {
  dbTeamIdFromMockTeamId,
  getCurrentOrgMember,
  mockTeamIdFromDbTeams,
  normalizeTeamDbId,
  resolveFlagRouting,
} from '@/lib/org-trading-server';
import {
  MIN_MESSAGE_CHARS,
  benchmarkForSector,
  defaultResponseHoursForConviction,
  isReasonValidForColor,
} from '@/lib/org-flag-taxonomy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Server-side guardrails. A client check is not a guardrail — these are the
// real limits, enforced here regardless of what the UI allows.
const MAX_FLAGS_PER_WEEK = 10;
const COOLDOWN_DAYS = 14;

const FLAG_SELECT = `
  *,
  attachments:org_flag_attachments(*),
  evidence:org_flag_evidence(*),
  raiser:org_members!org_position_flags_raiser_member_id_fkey(display_name, role, sub_role),
  recipient:org_members!org_position_flags_recipient_member_id_fkey(display_name, role, sub_role),
  sector_head:org_members!org_position_flags_sector_head_member_id_fkey(display_name, role, sub_role)
`;

/** GET /api/org-trading/flags?asRaiser&asRecipient&status&limit */
export const GET = withApiGuard(
  async (request, user) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ flags: [] });

    const { searchParams } = new URL(request.url);
    const asRaiser = searchParams.get('asRaiser') === 'true';
    const asRecipient = searchParams.get('asRecipient') === 'true';
    const status = searchParams.get('status');
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 50)));

    let q = supabase
      .from('org_position_flags')
      .select(FLAG_SELECT)
      .eq('org_id', member.org_id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (asRaiser && asRecipient) {
      // Everything routed to or raised by me (covering-analyst OR sector-head seat).
      q = q.or(
        `raiser_member_id.eq.${member.id},recipient_member_id.eq.${member.id},sector_head_member_id.eq.${member.id}`,
      );
    } else if (asRaiser) {
      q = q.eq('raiser_member_id', member.id);
    } else if (asRecipient) {
      q = q.or(`recipient_member_id.eq.${member.id},sector_head_member_id.eq.${member.id}`);
    }
    if (status) q = q.eq('status', status);

    const { data, error } = await q;
    if (error) {
      console.error('[org-trading/flags GET]', error);
      return NextResponse.json({ flags: [] });
    }
    return NextResponse.json({ flags: data || [] });
  },
  { requireAuth: true },
);

/** POST /api/org-trading/flags */
export const POST = withApiGuard(
  async (request, user) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: permRows } = await supabase
      .from('org_member_permissions')
      .select('permission_key')
      .eq('org_member_id', member.id);
    const overrides = (permRows || []).map((p) => p.permission_key);
    const perms = getMemberPermissions(member, overrides);
    if (!perms.includes('flag_positions')) {
      return NextResponse.json(
        { error: 'You do not have permission to flag positions.' },
        { status: 403 },
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const {
      ticker,
      team_id,
      mock_team_id,
      flag_color,
      subject,
      body: messageBody,
      reason,
      conviction,
      suggested_action,
      escalate_to_ic = false,
      conflict_disclosed = false,
      response_hours,
      allow_duplicate = false,
      position_snapshot = {},
      attachments = [],
      evidence = [],
    } = body;

    // ── Required fields ────────────────────────────────────────────
    if (!ticker || !flag_color || !subject || !messageBody) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!['green', 'red'].includes(flag_color)) {
      return NextResponse.json({ error: 'flag_color must be green or red' }, { status: 400 });
    }
    // Message minimum — the flag has to say something.
    if (String(messageBody).trim().length < MIN_MESSAGE_CHARS) {
      return NextResponse.json(
        { error: `Message must be at least ${MIN_MESSAGE_CHARS} characters.` },
        { status: 400 },
      );
    }
    // Reason must exist AND match the flag color (a Red reason on a Green flag is invalid).
    if (!reason) {
      return NextResponse.json({ error: 'A reason is required.' }, { status: 400 });
    }
    if (!isReasonValidForColor(flag_color, reason)) {
      return NextResponse.json(
        { error: `Reason "${reason}" is not valid for a ${flag_color} flag.` },
        { status: 400 },
      );
    }
    if (!['low', 'med', 'high'].includes(conviction)) {
      return NextResponse.json(
        { error: 'A conviction (low/med/high) is required.' },
        { status: 400 },
      );
    }
    if (!['monitor', 'size_up', 'trim', 'exit', 'reunderwrite'].includes(suggested_action)) {
      return NextResponse.json({ error: 'A suggested action is required.' }, { status: 400 });
    }

    // ── Resolve team + org-chart routing (both recipients) ─────────
    const { data: teams } = await supabase
      .from('org_teams')
      .select('id, slug')
      .eq('org_id', member.org_id);
    const orgTeams = teams || [];

    const teamDbId = normalizeTeamDbId(team_id) || dbTeamIdFromMockTeamId(orgTeams, mock_team_id);
    const mockTeamKey =
      mock_team_id || (teamDbId ? mockTeamIdFromDbTeams(orgTeams, teamDbId) : null) || null;

    const { coveringAnalystOrgId, sectorHeadOrgId, coverage } = await resolveFlagRouting(
      supabase,
      member.org_id,
      ticker,
      mockTeamKey,
    );

    // If the raiser IS the covering analyst, this is a Thesis Update — route the
    // primary seat to the sector head instead. Otherwise route to the analyst.
    const raiserIsCoveringAnalyst = coveringAnalystOrgId && coveringAnalystOrgId === member.id;
    const primaryRecipientId = raiserIsCoveringAnalyst
      ? sectorHeadOrgId
      : coveringAnalystOrgId || sectorHeadOrgId;

    if (!primaryRecipientId) {
      return NextResponse.json(
        {
          error:
            'Could not determine flag recipient. Ensure roster names match the council demo data.',
        },
        { status: 400 },
      );
    }

    // ── Guardrails (server-side) ───────────────────────────────────
    const now = Date.now();

    // Duplicate detection: an open flag on this ticker already exists in the org.
    // Return it so the UI can offer "View his flag / Raise a separate flag".
    if (!allow_duplicate) {
      const { data: dupe } = await supabase
        .from('org_position_flags')
        .select('id, ticker, flag_color, subject, raiser_member_id, created_at, status')
        .eq('org_id', member.org_id)
        .eq('ticker', ticker)
        .eq('status', 'open')
        .neq('raiser_member_id', member.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (dupe) {
        return NextResponse.json(
          { error: 'duplicate_open_flag', existing_flag: dupe },
          { status: 409 },
        );
      }
    }

    // Cooldown: the same member cannot re-flag the same position within 14 days.
    const cooldownIso = new Date(now - COOLDOWN_DAYS * 86400000).toISOString();
    const { data: recentSame } = await supabase
      .from('org_position_flags')
      .select('id, created_at')
      .eq('org_id', member.org_id)
      .eq('ticker', ticker)
      .eq('raiser_member_id', member.id)
      .gte('created_at', cooldownIso)
      .limit(1)
      .maybeSingle();
    if (recentSame) {
      return NextResponse.json(
        { error: `You flagged ${ticker} within the last ${COOLDOWN_DAYS} days.` },
        { status: 429 },
      );
    }

    // Rate limit: max flags per member per rolling week.
    const weekIso = new Date(now - 7 * 86400000).toISOString();
    const { count: weekCount } = await supabase
      .from('org_position_flags')
      .select('id', { count: 'exact', head: true })
      .eq('raiser_member_id', member.id)
      .gte('created_at', weekIso);
    if ((weekCount || 0) >= MAX_FLAGS_PER_WEEK) {
      return NextResponse.json(
        { error: `Flag limit reached (${MAX_FLAGS_PER_WEEK}/week).` },
        { status: 429 },
      );
    }

    // ── Snapshots (honest — bind to real coverage/sector data) ─────
    const sector = position_snapshot?.sector || coverage?.sector || null;
    const thesisSnapshot = coverage?.thesis || position_snapshot?.thesis || null;
    const benchmarkSymbol = benchmarkForSector(sector);
    const hours =
      Number(response_hours) > 0
        ? Number(response_hours)
        : defaultResponseHoursForConviction(conviction);
    const responseDueAt = new Date(now + hours * 3600000).toISOString();

    const { data: flag, error: insertErr } = await supabase
      .from('org_position_flags')
      .insert({
        org_id: member.org_id,
        team_id: teamDbId,
        ticker,
        raiser_member_id: member.id,
        recipient_member_id: primaryRecipientId,
        sector_head_member_id: sectorHeadOrgId,
        flag_color,
        subject,
        body: messageBody,
        reason,
        conviction,
        suggested_action,
        escalated_to_ic: Boolean(escalate_to_ic),
        conflict_disclosed: Boolean(conflict_disclosed),
        response_due_at: responseDueAt,
        thesis_snapshot: thesisSnapshot,
        benchmark_symbol: benchmarkSymbol,
        excess_at_flag_pp:
          position_snapshot?.excess_pp != null ? Number(position_snapshot.excess_pp) : null,
        status: 'open',
        position_shares: position_snapshot?.shares ?? null,
        position_avg_cost: position_snapshot?.avg_cost ?? null,
        position_current_price: position_snapshot?.current_price ?? null,
      })
      .select()
      .single();

    if (insertErr) {
      console.error('[org-trading/flags POST] insert', insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    if (Array.isArray(attachments) && attachments.length > 0) {
      const rows = attachments.map((a) => ({
        flag_id: flag.id,
        attachment_kind: a.attachment_kind,
        attachment_ref: a.attachment_ref,
        attachment_label: a.attachment_label || null,
        attachment_meta: a.attachment_meta || {},
      }));
      const { error: attachErr } = await supabase.from('org_flag_attachments').insert(rows);
      if (attachErr) console.error('[org-trading/flags POST] attachments', attachErr);
    }

    if (Array.isArray(evidence) && evidence.length > 0) {
      const rows = evidence
        .filter((e) => e && e.type && e.ref)
        .map((e) => ({
          flag_id: flag.id,
          org_id: member.org_id,
          type: e.type,
          ref: e.ref,
          caption: e.caption || null,
          created_by: member.id,
        }));
      if (rows.length) {
        const { error: evErr } = await supabase.from('org_flag_evidence').insert(rows);
        if (evErr) console.error('[org-trading/flags POST] evidence', evErr);
      }
    }

    return NextResponse.json({
      flag,
      recipient_id: primaryRecipientId,
      sector_head_id: sectorHeadOrgId,
      thesis_update: raiserIsCoveringAnalyst,
    });
  },
  { requireAuth: true },
);
