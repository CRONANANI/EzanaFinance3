import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MANAGER_ROLES = ['executive', 'portfolio_manager'];
// The providers the ⚙ popover knows about. None are wired to a real OAuth +
// webhook flow yet, so the popover renders an honest "not connected" state.
const PROVIDERS = ['zoom', 'otter', 'fireflies', 'read_ai'];

/* GET /api/org/meetings/recorders — managers only. Returns integration rows
   with ONLY id, provider, enabled, created_at. The `credentials` column is
   NEVER selected, so it can never reach the client. */
export const GET = withApiGuard(
  async () => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, MANAGER_ROLES)) {
      return NextResponse.json({ error: 'Manager role required' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('org_recorder_integrations')
      .select('id, provider, enabled, created_at') // credentials intentionally omitted
      .eq('org_id', member.org_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = data || [];
    const byProvider = new Map(rows.map((r) => [r.provider, r]));
    // Present every known provider so the popover can list them, but only from
    // real rows — an absent provider is honestly "not connected".
    const integrations = PROVIDERS.map((p) => {
      const row = byProvider.get(p);
      return {
        provider: p,
        connected: !!row,
        enabled: !!row?.enabled,
        id: row?.id || null,
        created_at: row?.created_at || null,
      };
    });

    return NextResponse.json({
      integrations,
      connectedCount: integrations.filter((i) => i.enabled).length,
    });
  },
  { requireAuth: true },
);
