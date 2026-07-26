import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient, getAdminClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import {
  loadConfig,
  evaluateRegistration,
  registrationOutcome,
} from '@/lib/competitions/onboarding';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const bad = (msg, status = 400) => NextResponse.json({ error: msg }, { status });

/* POST /api/org/pitch-competitions/:id/join — a visiting org self-registers,
   requests to join, or applies, per the host's admission_mode. Fully enforced
   server-side. Identity comes from the authenticated member (user client); config,
   counts, and the privileged writes go through the admin client because a
   not-yet-joined org has no RLS read/write path to the competition or pitch_teams
   until it has a team. */
export const POST = withApiGuard(
  async (request, _user, context) => {
    const { id } = await context.params;
    const userClient = getUserClient();
    const member = await getCurrentOrgMember(userClient);
    if (!member) return bad('Not an org member', 403);

    const admin = getAdminClient();
    const { data: comp } = await admin
      .from('pitch_competitions')
      .select('id, host_org_id, status')
      .eq('id', id)
      .maybeSingle();
    if (!comp) return bad('Not found', 404);
    if (comp.host_org_id === member.org_id) return bad('Your org hosts this competition.', 400);
    if (!['open', 'draft'].includes(comp.status) && comp.status !== 'in_progress') {
      // Registration is only meaningful before/at the open phase.
      if (comp.status === 'complete' || comp.status === 'archived') return bad('Registration is closed.', 400);
    }

    const config = await loadConfig(admin, comp.id);

    let body;
    try {
      body = await request.json();
    } catch {
      return bad('Invalid JSON');
    }
    const teamName = String(body?.team_name || '').trim();
    if (!teamName) return bad('team_name is required');

    // Current counts (privileged read — the joiner can't see these under RLS yet).
    const [{ count: teamCount }, { count: orgTeamCount }] = await Promise.all([
      admin.from('pitch_teams').select('id', { count: 'exact', head: true }).eq('competition_id', comp.id),
      admin
        .from('pitch_teams')
        .select('id', { count: 'exact', head: true })
        .eq('competition_id', comp.id)
        .eq('org_id', member.org_id),
    ]);

    // Ticker resolution per config.
    let ticker = body?.ticker ? String(body.ticker).trim().toUpperCase() : null;
    if (config.ticker_assignment === 'host_assigns') {
      ticker = null; // host assigns later
    } else if (config.ticker_assignment === 'from_pool') {
      if (!ticker || !(config.ticker_pool || []).map((t) => t.toUpperCase()).includes(ticker)) {
        return bad('Pick a ticker from the competition’s pool.');
      }
    } else if (config.requires_ticker_at_signup && !ticker) {
      return bad('A ticker is required to register.');
    }

    // Side resolution per config.
    let side = body?.side === 'long' || body?.side === 'short' ? body.side : null;
    if (config.side_constraint === 'host_assigns') side = null;
    if (config.side_constraint === 'long_only') side = 'long';
    if (config.side_constraint === 'short_only') side = 'short';

    const check = evaluateRegistration(config, {
      nowIso: new Date().toISOString(),
      teamCount: teamCount || 0,
      orgTeamCount: orgTeamCount || 0,
      side,
    });
    if (!check.ok) return bad(check.error, 409);

    // ── request_approval / application → a pending join request ──
    if (config.admission_mode === 'request_approval' || config.admission_mode === 'application') {
      const { count: pendingCount } = await admin
        .from('pitch_join_requests')
        .select('id', { count: 'exact', head: true })
        .eq('competition_id', comp.id)
        .eq('org_id', member.org_id)
        .eq('status', 'pending');
      if (pendingCount) return bad('Your org already has a pending request for this competition.', 409);

      const row = {
        competition_id: comp.id,
        org_id: member.org_id,
        requested_by: member.id,
        team_name: teamName,
        contact_email: body?.contact_email || null,
      };
      if (config.admission_mode === 'application') {
        if (config.application_requires_deck && !body?.application_deck_url) return bad('A pitch deck link is required to apply.');
        if (config.application_requires_thesis && !String(body?.application_thesis || '').trim()) return bad('A written thesis is required to apply.');
        row.application_deck_url = body?.application_deck_url || null;
        row.application_thesis = body?.application_thesis || null;
        row.application_note = body?.application_note || null;
      }
      const { data, error } = await admin.from('pitch_join_requests').insert(row).select('id, status').single();
      if (error) return bad(error.message, 500);
      return NextResponse.json({ request: data, mode: config.admission_mode }, { status: 201 });
    }

    // ── open_signup → a team row directly (status per host-approval flag) ──
    const status = registrationOutcome(config);
    const { data: team, error } = await admin
      .from('pitch_teams')
      .insert({
        competition_id: comp.id,
        org_id: member.org_id,
        team_name: teamName,
        ticker,
        side,
        invite_email: body?.contact_email || null,
        status,
      })
      .select('id, team_name, status')
      .single();
    if (error) return bad(error.message, 500);
    return NextResponse.json({ team, mode: 'open_signup' }, { status: 201 });
  },
  { requireAuth: true },
);
