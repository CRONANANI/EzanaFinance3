import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import { MANAGER_ROLES, TYPES, STATUSES, resolveTargetsToMembers } from './_shared';
import { loadAssignments, ROSTER_COLS } from './_loader';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* ── GET /api/org/assignments ────────────────────────────────────────────────
   Returns the full visible set (RLS: analysts see their own, managers see all)
   enriched with resolved assignees, derived `overdue`, counts, plus metrics,
   tab_counts, and the targeting reference data (roster/teams/cohorts/roles).
   The client filters by tab/view; the calendar needs the full set.

   The heavy read + shaping lives in `_loader.js` so the org Assignments server
   page can seed the same payload for first paint without a client round-trip. */
export const GET = withApiGuard(
  async () => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const { error, payload } = await loadAssignments(supabase, member);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(payload);
  },
  { requireAuth: true },
);

/* ── POST /api/org/assignments — create + multi-assignee targeting ────────────
   Manager only. Accepts assignees[] ({target_type,target_id?,target_role?}),
   instructions, ticker/sector (by type), require_upload, recurring,
   save_as_template. Persists the raw targets so team/role targets keep routing
   on cohort turnover. */
export const POST = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, MANAGER_ROLES)) {
      return NextResponse.json({ error: 'Manager / advisor role required' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const title = String(body?.title || '').trim();
    if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 });
    const assignment_type = TYPES.includes(body?.assignment_type) ? body.assignment_type : 'pitch';

    const rawTargets = Array.isArray(body?.assignees) ? body.assignees : [];
    if (rawTargets.length === 0) {
      return NextResponse.json({ error: 'At least one assignee target required' }, { status: 400 });
    }

    // Resolution roster + valid id sets for validation.
    const [{ data: roster }, { data: teams }, { data: cohorts }] = await Promise.all([
      supabase
        .from('org_members')
        .select(ROSTER_COLS)
        .eq('org_id', member.org_id)
        .eq('is_active', true),
      supabase.from('org_teams').select('id').eq('org_id', member.org_id),
      supabase.from('org_cohorts').select('id, is_current').eq('org_id', member.org_id),
    ]);
    const rosterList = roster || [];
    const memberIds = new Set(rosterList.map((m) => m.id));
    const teamIds = new Set((teams || []).map((t) => t.id));
    const cohortIds = new Set((cohorts || []).map((c) => c.id));

    // Sanitize the targets.
    const targets = [];
    for (const t of rawTargets) {
      if (t?.target_type === 'member' && memberIds.has(t.target_id)) {
        targets.push({ target_type: 'member', target_id: t.target_id, target_role: null });
      } else if (t?.target_type === 'team' && teamIds.has(t.target_id)) {
        targets.push({ target_type: 'team', target_id: t.target_id, target_role: null });
      } else if (t?.target_type === 'cohort' && cohortIds.has(t.target_id)) {
        targets.push({ target_type: 'cohort', target_id: t.target_id, target_role: null });
      } else if (t?.target_type === 'role' && String(t.target_role || '').trim()) {
        targets.push({
          target_type: 'role',
          target_id: null,
          target_role: String(t.target_role).trim().slice(0, 120),
        });
      } else if (t?.target_type === 'org') {
        targets.push({ target_type: 'org', target_id: null, target_role: null });
      }
    }
    if (targets.length === 0) {
      return NextResponse.json({ error: 'No valid assignee targets' }, { status: 400 });
    }

    // Primary owner for the legacy assigned_to column (NOT NULL). Prefer the
    // first explicit member target, then the first resolved person, then the
    // creator so the row always has a valid owner + is visible to someone.
    const people = resolveTargetsToMembers(targets, rosterList);
    const firstMemberTarget = targets.find((t) => t.target_type === 'member');
    const primary =
      (firstMemberTarget && rosterList.find((m) => m.id === firstMemberTarget.target_id)) ||
      people[0] ||
      null;
    const assignedTo = primary?.user_id || member.user_id;

    // cohort_id: an explicit cohort target, else the primary's cohort, else the
    // org's current cohort.
    const cohortTarget = targets.find((t) => t.target_type === 'cohort');
    const cohortId =
      cohortTarget?.target_id ||
      primary?.cohort_id ||
      (cohorts || []).find((c) => c.is_current)?.id ||
      null;

    const recurring = ['weekly', 'monthly'].includes(body?.recurring) ? body.recurring : null;

    // Optional: save as a reusable template first, then stamp template_id.
    let templateId = null;
    if (body?.save_as_template) {
      const tplName = String(body?.template_name || title)
        .trim()
        .slice(0, 120);
      const { data: tpl } = await supabase
        .from('org_assignment_templates')
        .insert({
          org_id: member.org_id,
          name: tplName,
          assignment_type,
          title: title.slice(0, 200),
          instructions: body?.instructions ? String(body.instructions).slice(0, 4000) : null,
          sector: body?.sector ? String(body.sector).slice(0, 80) : null,
          require_upload: !!body?.require_upload,
          created_by: member.user_id,
        })
        .select('id')
        .single();
      templateId = tpl?.id || null;
    } else if (body?.template_id) {
      templateId = body.template_id;
    }

    const { data: assignment, error } = await supabase
      .from('org_assignments')
      .insert({
        org_id: member.org_id,
        cohort_id: cohortId,
        assigned_to: assignedTo,
        assigned_by: member.user_id,
        title: title.slice(0, 200),
        description: body?.description ? String(body.description).slice(0, 4000) : null,
        instructions: body?.instructions ? String(body.instructions).slice(0, 4000) : null,
        assignment_type,
        ticker:
          assignment_type === 'pitch' && body?.ticker
            ? String(body.ticker).toUpperCase().slice(0, 12)
            : null,
        sector:
          ['pitch', 'coverage'].includes(assignment_type) && body?.sector
            ? String(body.sector).slice(0, 80)
            : null,
        due_date: body?.due_date || null,
        require_upload: !!body?.require_upload,
        recurring,
        template_id: templateId,
        status: 'assigned',
        progress_pct: 0,
      })
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Persist the raw assignee targets.
    const assigneeInserts = targets.map((t) => ({
      assignment_id: assignment.id,
      org_id: member.org_id,
      target_type: t.target_type,
      target_id: t.target_id,
      target_role: t.target_role,
    }));
    if (assigneeInserts.length) {
      await supabase.from('org_assignment_assignees').insert(assigneeInserts);
    }

    // Pitch Pipeline tie (best-effort): a pitch assignment with a ticker seeds a
    // draft idea in org_pitches (the same shape POST /api/org/pitches uses).
    // Guarded so it never blocks assignment creation.
    let pitchDraftId = null;
    if (assignment_type === 'pitch' && assignment.ticker) {
      try {
        const now = new Date().toISOString();
        const { data: draft } = await supabase
          .from('org_pitches')
          .insert({
            org_id: member.org_id,
            team_id: member.team_id || null,
            ticker: assignment.ticker.toUpperCase(),
            company_name: assignment.ticker,
            pitch_type: 'long',
            analyst_member_id: primary?.id || member.id,
            stage: 'idea',
            status: 'active',
            thesis_short: `Assignment: ${title}`.slice(0, 280),
            stage_entered_at: now,
            created_at: now,
            updated_at: now,
          })
          .select('id')
          .single();
        pitchDraftId = draft?.id || null;
      } catch {
        /* non-fatal — pitch seeding is optional */
      }
    }

    return NextResponse.json(
      { assignment, assignee_count: targets.length, pitch_draft_id: pitchDraftId },
      { status: 201 },
    );
  },
  { requireAuth: true },
);

/* ── PATCH /api/org/assignments — lifecycle state machine + progress + rubric ──
   Enforced server-side:
     assignee: assigned → in_progress → submitted (and returned → in_progress/submitted)
     manager:  submitted → under_review → complete | under_review → returned
               (returning REQUIRES a comment; graded carries the rubric)
   'overdue' is derived and rejected on write. */
const ASSIGNEE_STATUSES = ['in_progress', 'submitted'];
const MANAGER_STATUSES = ['under_review', 'returned', 'complete', 'graded'];
const ALLOWED_FROM = {
  in_progress: ['assigned', 'returned'],
  submitted: ['assigned', 'in_progress', 'returned'],
  under_review: ['submitted'],
  returned: ['submitted', 'under_review'],
  complete: ['submitted', 'under_review'],
  graded: ['submitted', 'under_review', 'complete'],
};

export const PATCH = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const { id } = body || {};
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    if (body.status === 'overdue') {
      return NextResponse.json(
        { error: "'overdue' is derived and cannot be set" },
        { status: 400 },
      );
    }

    const { data: assignment } = await supabase
      .from('org_assignments')
      .select('id, assigned_to, status')
      .eq('id', id)
      .eq('org_id', member.org_id)
      .maybeSingle();
    if (!assignment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const isManager = assertOrgRole(member, MANAGER_ROLES);
    const isAssignee = assignment.assigned_to === member.user_id;
    if (!isManager && !isAssignee) {
      return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
    }

    const update = {};

    // Progress (assignee or manager).
    if (body.progress_pct != null) {
      const p = Number(body.progress_pct);
      if (!Number.isFinite(p) || p < 0 || p > 100) {
        return NextResponse.json({ error: 'progress_pct must be 0–100' }, { status: 400 });
      }
      update.progress_pct = Math.round(p);
    }

    // Rubric (manager only).
    if (body.rubric_score != null || body.rubric_max != null || body.rubric_comment != null) {
      if (!isManager)
        return NextResponse.json({ error: 'Manager role required for rubric' }, { status: 403 });
      if (body.rubric_max != null)
        update.rubric_max = Math.max(0, Math.round(Number(body.rubric_max) || 0));
      if (body.rubric_score != null)
        update.rubric_score = Math.max(0, Math.round(Number(body.rubric_score) || 0));
      if (body.rubric_comment != null)
        update.rubric_comment = String(body.rubric_comment).slice(0, 2000);
    }

    // Status transition.
    let returnComment = null;
    if (body.status) {
      const next = body.status;
      if (!STATUSES.includes(next)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      if (MANAGER_STATUSES.includes(next) && !isManager) {
        return NextResponse.json({ error: 'Manager role required' }, { status: 403 });
      }
      if (ASSIGNEE_STATUSES.includes(next) && !isAssignee && !isManager) {
        return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
      }
      const allowedFrom = ALLOWED_FROM[next];
      if (allowedFrom && !allowedFrom.includes(assignment.status) && assignment.status !== next) {
        return NextResponse.json(
          { error: `Cannot move from '${assignment.status}' to '${next}'` },
          { status: 409 },
        );
      }
      if (next === 'returned') {
        returnComment = String(body.comment || '').trim();
        if (!returnComment) {
          return NextResponse.json(
            { error: 'A comment is required when returning for revision' },
            { status: 400 },
          );
        }
      }
      update.status = next;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No changes' }, { status: 400 });
    }

    // Return-for-revision: record the feedback comment (is_return=true) first.
    if (returnComment) {
      await supabase.from('org_assignment_comments').insert({
        assignment_id: id,
        org_id: member.org_id,
        author_id: member.user_id,
        body: returnComment.slice(0, 4000),
        is_return: true,
      });
    }

    const { data, error } = await supabase
      .from('org_assignments')
      .update(update)
      .eq('id', id)
      .eq('org_id', member.org_id)
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ assignment: data });
  },
  { requireAuth: true },
);
