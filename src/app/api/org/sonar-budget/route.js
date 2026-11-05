import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient, getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import { logOrgAction } from '@/lib/org-audit';
import {
  DEEP_PREFIX,
  cleanBudgetPatch,
  defaultOrgPool,
  maxOrgPool,
  monthStartUtc,
  monthlyHistory,
  usageSummary,
} from '@/lib/org-sonar/budget';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/org/sonar-budget
 * The org's pooled deep research budget this month: the pool, what is used
 * and left, when it resets and six months of history. Executives also get
 * every member's runs and allocation, most used first; anyone else gets
 * their own line only.
 */
export const GET = withApiGuard(
  async () => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!isServerSupabaseConfigured())
      return NextResponse.json({ error: 'Not available.' }, { status: 503 });
    const admin = getAdminClient();
    const isExec = assertOrgRole(member, ['executive']);
    const now = new Date();
    const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));

    const [budget, allocations, ledger, members] = await Promise.all([
      admin
        .from('org_sonar_budget')
        .select('monthly_deep_runs, updated_at')
        .eq('org_id', member.org_id)
        .maybeSingle(),
      admin
        .from('org_sonar_allocations')
        .select('user_id, monthly_deep_runs')
        .eq('org_id', member.org_id),
      admin
        .from('sonar_queries')
        .select('user_id, version, created_at')
        .eq('org_id', member.org_id)
        .like('version', `${DEEP_PREFIX}%`)
        .gte('created_at', since.toISOString())
        .limit(20000),
      admin
        .from('org_members')
        .select('user_id, display_name, role, is_active')
        .eq('org_id', member.org_id)
        .eq('is_active', true),
    ]);
    if (ledger.error && /org_id/.test(ledger.error.message || '')) {
      return NextResponse.json({ error: 'The fund budget is not set up yet.' }, { status: 503 });
    }
    const pool = budget.data?.monthly_deep_runs ?? defaultOrgPool();
    const monthRows = (ledger.data || []).filter(
      (r) => new Date(r.created_at) >= monthStartUtc(now),
    );
    const summary = usageSummary({
      pool,
      rows: monthRows,
      allocations: allocations.data || [],
      members: members.data || [],
      now,
    });
    const mine = summary.members.find((m) => m.userId === member.user_id) || {
      userId: member.user_id,
      deepRuns: 0,
      allocation: null,
      left: null,
    };
    return NextResponse.json({
      pool,
      isDefault: !budget.data,
      maxPool: maxOrgPool(),
      used: summary.used,
      remaining: summary.remaining,
      resetsOn: summary.resetsOn,
      history: monthlyHistory(ledger.data || [], { now }),
      me: mine,
      members: isExec ? summary.members : null,
      viewer: { canManage: isExec },
    });
  },
  { requireAuth: true },
);

/**
 * PATCH /api/org/sonar-budget (executive only)
 *   { monthlyDeepRuns?, allocations?: [{ userId, monthlyDeepRuns|null }] }
 * null removes a member's allocation (they draw from the pool).
 */
export const PATCH = withApiGuard(
  async (request) => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, ['executive']))
      return NextResponse.json({ error: 'Executive role required' }, { status: 403 });
    if (!isServerSupabaseConfigured())
      return NextResponse.json({ error: 'Not available.' }, { status: 503 });
    const body = (await request.json().catch(() => null)) || {};
    const c = cleanBudgetPatch(body);
    if (c.error) return NextResponse.json({ error: c.error }, { status: 400 });
    const admin = getAdminClient();
    const now = new Date().toISOString();

    if ('pool' in c.patch) {
      const { error } = await admin.from('org_sonar_budget').upsert(
        {
          org_id: member.org_id,
          monthly_deep_runs: c.patch.pool,
          updated_by: member.user_id,
          updated_at: now,
        },
        { onConflict: 'org_id' },
      );
      if (error) return NextResponse.json({ error: 'The budget was not saved.' }, { status: 500 });
    }
    if (c.patch.allocations?.length) {
      const { data: inOrg } = await admin
        .from('org_members')
        .select('user_id')
        .eq('org_id', member.org_id)
        .in(
          'user_id',
          c.patch.allocations.map((a) => a.userId),
        );
      const ok = new Set((inOrg || []).map((m) => m.user_id));
      const set = c.patch.allocations.filter((a) => ok.has(a.userId) && a.runs != null);
      const clear = c.patch.allocations.filter((a) => ok.has(a.userId) && a.runs == null);
      if (set.length) {
        const { error } = await admin.from('org_sonar_allocations').upsert(
          set.map((a) => ({
            org_id: member.org_id,
            user_id: a.userId,
            monthly_deep_runs: a.runs,
            updated_by: member.user_id,
            updated_at: now,
          })),
          { onConflict: 'org_id,user_id' },
        );
        if (error)
          return NextResponse.json({ error: 'The allocations were not saved.' }, { status: 500 });
      }
      if (clear.length) {
        await admin
          .from('org_sonar_allocations')
          .delete()
          .eq('org_id', member.org_id)
          .in(
            'user_id',
            clear.map((a) => a.userId),
          );
      }
    }
    await logOrgAction(admin, {
      orgId: member.org_id,
      actorId: member.user_id,
      action: 'sonar_budget_updated',
      targetType: 'org',
      targetId: member.org_id,
      detail: {
        pool: c.patch.pool ?? null,
        allocations: (c.patch.allocations || []).length,
      },
    });
    return NextResponse.json({ ok: true });
  },
  { requireAuth: true },
);
