/**
 * GET /api/org/learning   the council band of the Learning Center
 *
 * The signed-in member's own council learning: their assignments and council
 * learning items, their cohort's onboarding checklist with their own
 * completion, their own grades (never anyone else's), the council path, and,
 * for managers only, team progress (assignment completion and the Learning
 * score of the council rating). See _loader.js for each part's rules.
 *
 * RLS-scoped client only; read-only. Non-members get 403.
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadCouncilLearning } from './_loader';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PRIVATE = { 'Cache-Control': 'private, no-store' };

export const GET = withApiGuard(
  async () => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const payload = await loadCouncilLearning(supabase, member);
    return NextResponse.json(payload, { headers: PRIVATE });
  },
  { requireAuth: true },
);
