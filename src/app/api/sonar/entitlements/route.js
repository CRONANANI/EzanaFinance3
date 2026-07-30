import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient, getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { isActivePartner } from '@/lib/partner-access';
import { getActivePlan, getPlanTier } from '@/lib/subscription';
import { getSonarEntitlements, describeDatasetAccess } from '@/lib/sonar/entitlements';

/**
 * GET /api/sonar/entitlements — the current user's Sonar capabilities and today's
 * remaining quota, so the surface can render what's searchable and the upgrade
 * prompt before any ping is sent. Resolution mirrors the query route exactly.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function startOfUtcDayISO() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export const GET = withApiGuard(async (request, user) => {
  const admin = getAdminClient();
  const userClient = getUserClient();

  const { data: profile } = await admin
    .from('profiles')
    .select('subscription_plan, subscription_status, one_time_plan')
    .eq('id', user.id)
    .maybeSingle();
  const planTier = getPlanTier(getActivePlan(profile));

  const member = await getCurrentOrgMember(userClient).catch(() => null);
  const isPartner = await isActivePartner(userClient, user).catch(() => false);
  const version = member ? 'org' : isPartner ? 'partner' : 'regular';

  const entitlements = getSonarEntitlements({
    planTier,
    version,
    isPartner,
    orgRole: member?.role || null,
  });
  const { available, locked } = describeDatasetAccess(entitlements);

  const { count } = await admin
    .from('sonar_queries')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', startOfUtcDayISO());
  const used = count || 0;

  return NextResponse.json({
    version,
    planTier,
    depth: entitlements.depth,
    exportsEnabled: entitlements.exportsEnabled,
    userLookup: entitlements.userLookup,
    available,
    locked,
    quota: {
      limit: entitlements.dailyQueries,
      used,
      remaining: Math.max(0, entitlements.dailyQueries - used),
    },
  });
});
