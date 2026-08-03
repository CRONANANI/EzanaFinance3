import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/org/setup-status — the onboarding checklist for a fresh org. Any
 * active member reads; five completion checks computed from existing tables,
 * each with a live count and a deep link. `manager_only` steps render as
 * status (not a CTA) for analysts.
 */
export const GET = withApiGuard(
  async () => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const orgId = member.org_id;

    const countOf = async (table, extra) => {
      let q = supabase.from(table).select('id', { count: 'exact', head: true }).eq('org_id', orgId);
      if (extra) q = extra(q);
      const { count } = await q;
      return count || 0;
    };

    const [positions, teams, members, coverage, ips] = await Promise.all([
      countOf('org_positions', (q) => q.eq('is_active', true)),
      countOf('org_teams'),
      countOf('org_members', (q) => q.eq('is_active', true)),
      countOf('org_sector_coverage'),
      countOf('org_ips_rules'),
    ]);

    const steps = [
      { key: 'positions', label: 'Add or import positions', count: positions, done: positions >= 1, href: '/org-trading', manager_only: true },
      { key: 'teams', label: 'Create sector teams', count: teams, done: teams >= 1, href: '/settings', manager_only: true },
      { key: 'members', label: 'Invite members', count: members, done: members >= 2, href: '/settings', manager_only: false },
      { key: 'coverage', label: 'Assign sector coverage', count: coverage, done: coverage >= 1, href: '/org-team-hub/org-chart', manager_only: false },
      { key: 'ips', label: 'Set IPS rules', count: ips, done: ips >= 1, href: '/org-team-hub/compliance', manager_only: true },
    ];
    const doneCount = steps.filter((s) => s.done).length;

    return NextResponse.json({ steps, complete: doneCount === steps.length, done_count: doneCount });
  },
  { requireAuth: true },
);
