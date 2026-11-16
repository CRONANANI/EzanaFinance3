/**
 * GET /api/org/pitch-competitions/overview   the Competitions landing payload
 *
 * Events the council entered (with its own team, deliverables, slot and its
 * own result after reveal), events it hosts (with readiness), events open to
 * join, its fund challenges (no dollar figures) and its trophies this
 * season. See src/lib/competitions/overview.js for what each section reads.
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient, getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadCompetitionsOverview } from '@/lib/competitions/overview';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = withApiGuard(
  async () => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const payload = await loadCompetitionsOverview(supabase, getAdminClient(), member);
    return NextResponse.json(payload, { headers: { 'Cache-Control': 'private, no-store' } });
  },
  { requireAuth: true },
);
