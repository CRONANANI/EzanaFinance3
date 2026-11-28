import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { parseOrgIntent } from '@/lib/org-sonar/intelligence/intent';
import { chooseOrg } from '@/lib/org-sonar/intelligence/context';
import { validateOrgAttachment, ORG_CAPABILITIES } from '@/lib/sonar/composer/org-capabilities';
import { runCouncilResearch } from '@/lib/org-sonar/intelligence-server';
import { withNoEmDash } from '@/lib/text/no-em-dash-response';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/org/sonar/intelligence (Sonar for organizations, Nov 28 2026)
 *   { question?, capability?, params?, removed?, orgId? }
 *
 * Council research on authorized council records. The active organization is the caller's
 * own membership, resolved on the server; `orgId` can only pick between the caller's own
 * memberships. The answer is deterministic (no model call) and read-only: proposals in it
 * become writes only through POST /api/org/sonar/actions with the member's confirmation.
 */
const POST_HANDLER = withApiGuard(
  async (request) => {
    const supabase = getUserClient();
    const body = await request.json().catch(() => ({}));
    const first = await getCurrentOrgMember(supabase).catch(() => null);
    if (!first || first.is_active === false)
      return NextResponse.json(
        { error: 'Council research needs an active council membership.' },
        { status: 403 },
      );
    const orgId = chooseOrg(first.memberships || [first], body.orgId || null, first.org_id);
    const member =
      orgId === first.org_id ? first : await getCurrentOrgMember(supabase, orgId).catch(() => null);
    if (!member || member.org_id !== orgId)
      return NextResponse.json(
        { error: 'Council research needs an active council membership.' },
        { status: 403 },
      );

    let capability = null;
    let params = {};
    if (body.capability) {
      const v = validateOrgAttachment({ capability: body.capability, params: body.params || {} });
      if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
      capability = v.value.capability;
      params = v.value.params;
    }
    const question = String(body.question || '').slice(0, 1000);
    const intent = parseOrgIntent(question || ORG_CAPABILITIES[capability]?.example || '', {
      explicitCapability: capability,
    });
    if (!intent.orgScoped)
      return NextResponse.json({ orgScoped: false, reason: intent.reason }, { status: 200 });
    if (params.ticker && !intent.tickers.includes(params.ticker))
      intent.tickers.unshift(params.ticker);
    if (intent.scenario && params.ticker) intent.scenario.ticker = params.ticker;

    const removed = Array.isArray(body.removed) ? body.removed.map(String).slice(0, 12) : [];
    const { plan, result } = await runCouncilResearch(supabase, member, intent, params, {
      removed,
    });
    return NextResponse.json(
      {
        orgScoped: true,
        org: { id: member.org_id },
        intent: {
          capability: intent.capability,
          operation: intent.operation,
          explicit: intent.explicit,
          tickers: intent.tickers,
          timeScope: intent.timeScope,
        },
        context: plan,
        result,
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  },
  { requireAuth: true },
);

export const POST = withNoEmDash(POST_HANDLER);
