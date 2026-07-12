import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MANAGER_ROLES = ['executive', 'portfolio_manager'];

/*
 * GET /api/org/nav-counts — one batched, count-only round trip for every sidebar
 * badge. Org-scoped by the CALLER's membership (never a client-supplied org_id);
 * RLS additionally scopes analyst-visible counts to their own rows.
 *
 * Semantics: a badge means "there is something here for YOU" — actionable /
 * pending / upcoming, not a raw total. A key is `null` (⇒ NO badge) whenever the
 * count is zero, the query fails, or the data source doesn't exist. Absent, not
 * zero. The SERVER decides `tone` so the rule lives in one place.
 */
export const GET = withApiGuard(
  async () => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const orgId = member.org_id;
    const isExec = member.role === 'executive';
    const isManager = MANAGER_ROLES.includes(member.role);
    const weekAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // count-only helper: returns a number, or null on any error (honest-empty).
    const cnt = async (build) => {
      try {
        const { count, error } = await build();
        return !error && typeof count === 'number' ? count : null;
      } catch {
        return null;
      }
    };
    const head = (table) =>
      supabase.from(table).select('id', { count: 'exact', head: true }).eq('org_id', orgId);

    const [
      asgTotal,
      asgOpen,
      pitchActive,
      researchPublished,
      meetingsUpcoming,
      recognitionNew,
      applicantsAwaiting,
      breachesOpen,
      gradesAwaiting,
    ] = await Promise.all([
      cnt(() => head('org_assignments')),
      cnt(() => head('org_assignments').not('status', 'in', '(complete,graded)')),
      cnt(() =>
        head('org_pitches')
          .is('archived_at', null)
          .neq('stage', 'exited')
          .or('status.is.null,status.neq.rejected'),
      ),
      cnt(() => head('org_research_notes').eq('status', 'published')),
      cnt(() => head('org_meetings').eq('status', 'scheduled')),
      cnt(() => head('org_recognition').gt('created_at', weekAgoIso)),
      isExec
        ? cnt(() => head('org_applicants').not('stage', 'in', '(accepted,rejected,declined)'))
        : Promise.resolve(null),
      isManager
        ? cnt(() => head('org_ips_violations').eq('resolved', false))
        : Promise.resolve(null),
      cnt(() => head('org_assignments').in('status', ['submitted', 'under_review'])),
    ]);

    // Positive-or-null: render nothing at zero.
    const pos = (value, tone) => (value && value > 0 ? { value, tone } : null);

    const assignments =
      asgTotal && asgTotal > 0 ? { value: `${asgOpen ?? 0}/${asgTotal}`, tone: 'accent' } : null;

    return NextResponse.json({
      assignments,
      pitchPipeline: pos(pitchActive, 'neutral'),
      researchLibrary: pos(researchPublished, 'neutral'),
      meetings: pos(meetingsUpcoming, 'neutral'),
      recognition: pos(recognitionNew, 'accent'),
      cohorts: pos(applicantsAwaiting, 'neutral'),
      compliance: pos(breachesOpen, 'danger'),
      grades: pos(gradesAwaiting, 'accent'),
      // Honest nulls: no vacancy source for the chart, no org_competitions table,
      // and no position-flag column, so these carry no badge rather than a guess.
      orgChart: null,
      competitions: null,
      tradingDesk: null,
      reports: null,
      teamPermissions: null,
      commandCenter: null,
      fundAnalytics: null,
    });
  },
  { requireAuth: true },
);
