import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient, getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import {
  readMethodologyForMember,
  writeMethodologyForMember,
} from '@/lib/org-sonar/research-methodology-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* GET /api/org/research-methodology: the active org's research methodology
   (any active member; defaults when the org has not set one). */
export const GET = withApiGuard(
  async () => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    const { status, body } = await readMethodologyForMember(supabase, member);
    return NextResponse.json(body, { status });
  },
  { requireAuth: true },
);

/* PUT /api/org/research-methodology: replace it (executives with the org
   settings grant; checked server-side, written with the service role). */
export const PUT = withApiGuard(
  async (request) => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    const { status, body } = await writeMethodologyForMember({
      supabase,
      member,
      readBody: () => request.json(),
      getService: () => (isServerSupabaseConfigured() ? getAdminClient() : null),
    });
    return NextResponse.json(body, { status });
  },
  { requireAuth: true },
);
