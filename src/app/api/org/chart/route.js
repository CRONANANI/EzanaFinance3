import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import { ORG_TIERS, tierOf, canEditMember, assignableTiers } from '@/lib/org-hierarchy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* The 11 GICS sectors — the single source of truth for what may be assigned.
   Any sector outside this set is rejected so the coverage map stays clean. */
const GICS_SECTORS = [
  'Energy',
  'Materials',
  'Industrials',
  'Consumer Discretionary',
  'Consumer Staples',
  'Health Care',
  'Financials',
  'Information Technology',
  'Communication Services',
  'Utilities',
  'Real Estate',
];

const MANAGER_ROLES = ['executive', 'portfolio_manager'];

const MEMBER_FIELDS =
  'id, user_id, display_name, title, role, sub_role, tier, team_id, reports_to, term_start, term_end, is_graduating';

/* ── GET: flat member array + sector coverage + university name ──────────── */
export const GET = withApiGuard(
  async () => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) {
      return NextResponse.json({ error: 'Not an active organization member' }, { status: 403 });
    }

    const orgId = member.org_id;

    const [{ data: members, error: membersErr }, { data: coverage }, { data: org }] =
      await Promise.all([
        supabase
          .from('org_members')
          .select(MEMBER_FIELDS)
          .eq('org_id', orgId)
          .eq('is_active', true),
        supabase
          .from('org_sector_coverage')
          .select('member_id, sector, is_primary')
          .eq('org_id', orgId),
        supabase
          .from('organizations')
          .select('university_name, name')
          .eq('id', orgId)
          .maybeSingle(),
      ]);

    if (membersErr) {
      return NextResponse.json({ error: 'Failed to load members' }, { status: 500 });
    }

    // Group sector coverage by member so the client gets a `sectors` array.
    const sectorsByMember = new Map();
    for (const row of coverage || []) {
      if (!sectorsByMember.has(row.member_id)) sectorsByMember.set(row.member_id, []);
      sectorsByMember.get(row.member_id).push({ sector: row.sector, isPrimary: row.is_primary });
    }

    // Hierarchical edit rights: flag each member the viewer may re-role.
    const membersById = new Map((members || []).map((m) => [m.id, m]));
    const viewerRow = membersById.get(member.id) || member;
    const shaped = (members || []).map((m) => ({
      ...m,
      tier: tierOf(m).id,
      sectors: sectorsByMember.get(m.id) || [],
      editable: canEditMember(viewerRow, m, membersById),
    }));

    return NextResponse.json({
      universityName: org?.university_name || org?.name || 'Organization',
      orgId,
      sectors: GICS_SECTORS,
      tiers: ORG_TIERS,
      viewer: {
        memberId: member.id,
        role: member.role,
        subRole: member.sub_role,
        tier: tierOf(viewerRow).id,
        canManage: MANAGER_ROLES.includes(member.role),
        assignableTiers: assignableTiers(viewerRow),
      },
      members: shaped,
    });
  },
  { requireAuth: true },
);

/* ── PATCH: update a member's chart fields + sector coverage (manager only) ─ */
export const PATCH = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) {
      return NextResponse.json({ error: 'Not an active organization member' }, { status: 403 });
    }

    // Server-side role gate — never trust the client to hide the button.
    if (!assertOrgRole(member, MANAGER_ROLES)) {
      return NextResponse.json(
        { error: 'Only executives and portfolio managers can edit the org chart' },
        { status: 403 },
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const targetId = body?.member_id;
    if (!targetId) {
      return NextResponse.json({ error: 'member_id is required' }, { status: 400 });
    }

    // Target must belong to the caller's org.
    const { data: target } = await supabase
      .from('org_members')
      .select('id, org_id')
      .eq('id', targetId)
      .eq('org_id', member.org_id)
      .maybeSingle();
    if (!target) {
      return NextResponse.json({ error: 'Member not found in your organization' }, { status: 404 });
    }

    // Build the org_members update from only the fields that were provided.
    const update = {};
    if ('title' in body) update.title = body.title === '' ? null : body.title;
    if ('reports_to' in body) {
      // Guard against a member reporting to themselves (a trivial cycle).
      if (body.reports_to && body.reports_to === targetId) {
        return NextResponse.json({ error: 'A member cannot report to themselves' }, { status: 400 });
      }
      update.reports_to = body.reports_to || null;
    }
    if ('term_start' in body) update.term_start = body.term_start || null;
    if ('term_end' in body) update.term_end = body.term_end || null;
    if ('is_graduating' in body) update.is_graduating = !!body.is_graduating;

    if (Object.keys(update).length > 0) {
      const { error: updErr } = await supabase
        .from('org_members')
        .update(update)
        .eq('id', targetId)
        .eq('org_id', member.org_id);
      if (updErr) {
        return NextResponse.json({ error: 'Failed to update member' }, { status: 500 });
      }
    }

    // Replace sector coverage when a `sectors` array is provided.
    if (Array.isArray(body.sectors)) {
      const clean = [...new Set(body.sectors.filter((s) => GICS_SECTORS.includes(s)))];

      const { error: delErr } = await supabase
        .from('org_sector_coverage')
        .delete()
        .eq('org_id', member.org_id)
        .eq('member_id', targetId);
      if (delErr) {
        return NextResponse.json({ error: 'Failed to update sector coverage' }, { status: 500 });
      }

      if (clean.length > 0) {
        const rows = clean.map((sector) => ({
          org_id: member.org_id,
          member_id: targetId,
          sector,
          is_primary: true,
          assigned_by: member.user_id,
        }));
        const { error: insErr } = await supabase.from('org_sector_coverage').insert(rows);
        if (insErr) {
          return NextResponse.json({ error: 'Failed to save sector coverage' }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ ok: true });
  },
  { requireAuth: true },
);
