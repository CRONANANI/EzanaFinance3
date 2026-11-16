import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient, getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';

import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import { getOrgPositionBook } from '@/lib/org-position-book';
import { logOrgAction } from '@/lib/org-audit';
import { loadGraduation, sameMemberSet } from '@/lib/org-cohort-graduation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function resolveParams(context) {
  return (await context?.params) || {};
}

/* POST /api/org/cohorts/:id/archive — graduation, extended (executive only).
   Graduates ONLY the members of this cohort who are flagged (see
   src/lib/org-cohort-graduation.js); the dialog sends expected_member_ids and
   the route refuses (409 roster_changed) when the list moved underneath it.
   Adds the pre-flight HANDOFF-DOCS GATE: refuses (409) when a graduating member
   has covered sectors without a published handoff doc, naming what's missing
   (pass { force: true } to override). On confirm it keeps the existing fund
   snapshot AND freezes graduating members into alumni: final_rating frozen from
   org_member_rating (honest null when unrated), lifecycle_status -> alumni,
   cohort.status -> alumni. Successor promotion + coverage reassignment are left
   to the org-chart tools (see follow-ups) and are intentionally not automated
   here. */
export const POST = withApiGuard(
  async (request, user, context) => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, ['executive'])) {
      return NextResponse.json({ error: 'Executive role required' }, { status: 403 });
    }
    const { id } = await resolveParams(context);

    let body = {};
    try {
      body = await request.json();
    } catch {
      /* graduate defaults to true */
    }
    const graduate = body?.graduate !== false;
    const force = body?.force === true;

    const { data: cohort } = await supabase
      .from('org_cohorts')
      .select('*')
      .eq('id', id)
      .eq('org_id', member.org_id)
      .maybeSingle();
    if (!cohort) return NextResponse.json({ error: 'Cohort not found' }, { status: 404 });
    if (cohort.archived) {
      return NextResponse.json({ error: 'Cohort already archived' }, { status: 400 });
    }

    const orgId = member.org_id;

    // Only members of THIS cohort who are flagged graduate (Org Chart flag or
    // lifecycle status). Members of other cohorts are never swept in.
    const { roster, grads, gate } = await loadGraduation(supabase, orgId, id);

    // The confirmation dialog sends the members it showed. If the list has
    // changed since (someone was flagged or unflagged), stop and say so.
    if (graduate && Array.isArray(body?.expected_member_ids)) {
      if (
        !sameMemberSet(
          body.expected_member_ids,
          grads.map((m) => m.id),
        )
      ) {
        return NextResponse.json(
          {
            error: 'The members flagged to graduate changed. Review the list again.',
            gate: 'roster_changed',
            members: gate.members,
          },
          { status: 409 },
        );
      }
    }

    // ── PRE-FLIGHT HANDOFF-DOCS GATE ─────────────────────────────────────────
    // Every sector a graduating member covers should have a published handoff
    // doc before their knowledge leaves with them.
    const handoffGate = graduate
      ? { required: gate.required, published: gate.published, missing: gate.missing }
      : { required: 0, published: 0, missing: [] };
    if (graduate && handoffGate.missing.length > 0 && !force) {
      return NextResponse.json(
        { error: 'Handoff docs incomplete', gate: 'handoff_docs', ...handoffGate },
        { status: 409 },
      );
    }
    const gradSet = new Set(grads.map((m) => m.id));

    // ── Build the fund snapshot ──────────────────────────────────────────────
    // Canonical org position book; rows carry the legacy team_id/ticker_symbol/
    // current_value aliases the snapshot shape below already expects.
    const portfolios = await getOrgPositionBook(supabase, orgId);

    const { data: pitches } = await supabase
      .from('org_pitches')
      .select('id, ticker, decision, expected_return_pct, analyst_member_id')
      .eq('org_id', orgId);
    const pitchIds = (pitches || []).map((p) => p.id);

    let hindsight = [];
    if (pitchIds.length > 0) {
      const { data: h } = await supabase
        .from('org_pitch_hindsight')
        .select('pitch_id, return_pct, alpha_pct')
        .in('pitch_id', pitchIds);
      hindsight = h || [];
    }

    const totalValue = portfolios.reduce((s, p) => s + (Number(p.current_value) || 0), 0);
    const alphas = hindsight.map((h) => Number(h.alpha_pct)).filter((n) => Number.isFinite(n));
    const avgAlpha = alphas.length ? alphas.reduce((a, b) => a + b, 0) / alphas.length : null;
    const wins = hindsight.filter((h) => Number(h.alpha_pct) > 0).length;

    const snapshot = {
      archived_at: new Date().toISOString(),
      roster: roster.map((m) => ({
        display_name: m.display_name,
        role: m.role,
        sub_role: m.sub_role,
        title: m.title,
        graduated: graduate && gradSet.has(m.id),
      })),
      portfolios,
      fund: {
        total_value: totalValue,
        positions: portfolios.length,
        pitch_count: (pitches || []).length,
        hit_rate: hindsight.length ? wins / hindsight.length : null,
        avg_alpha_pct: avgAlpha,
      },
      pitch_track_record: (pitches || []).map((p) => {
        const h = hindsight.find((x) => x.pitch_id === p.id);
        return {
          ticker: p.ticker,
          decision: p.decision,
          return_pct: h ? Number(h.return_pct) : null,
          alpha_pct: h ? Number(h.alpha_pct) : null,
        };
      }),
    };

    const { data: updated, error: updErr } = await supabase
      .from('org_cohorts')
      .update({
        archived: true,
        archived_at: new Date().toISOString(),
        archived_snapshot: snapshot,
        is_current: false,
        status: 'alumni',
      })
      .eq('id', id)
      .eq('org_id', orgId)
      .select('*')
      .single();
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    // ── Graduate → freeze into alumni ────────────────────────────────────────
    let graduatedCount = 0;
    if (graduate && grads.length > 0) {
      const gradIds = grads.map((m) => m.id);

      // Pitch counts per graduating member (for the frozen scorecard).
      const pitchCountByMember = new Map();
      for (const p of pitches || []) {
        if (gradIds.includes(p.analyst_member_id)) {
          pitchCountByMember.set(
            p.analyst_member_id,
            (pitchCountByMember.get(p.analyst_member_id) || 0) + 1,
          );
        }
      }

      // Frozen ratings from org_member_rating (honest null when unrated).
      const { data: ratings } = await supabase
        .from('org_member_rating')
        .select('member_id, rating')
        .eq('org_id', orgId)
        .in('member_id', gradIds);
      const ratingByMember = new Map((ratings || []).map((r) => [r.member_id, Number(r.rating)]));

      const gradTerm = cohort.expected_grad_term || cohort.name || null;
      const alumniRows = grads.map((m) => ({
        org_id: orgId,
        member_id: m.id,
        cohort_id: cohort.id,
        grad_term: gradTerm,
        final_rating: ratingByMember.has(m.id) ? ratingByMember.get(m.id) : null,
        final_pitch_count: pitchCountByMember.get(m.id) || 0,
      }));
      // UNIQUE(member_id) — ignore if already graduated before.
      await supabase
        .from('org_alumni_records')
        .upsert(alumniRows, { onConflict: 'member_id', ignoreDuplicates: true });

      const { error: gErr } = await supabase
        .from('org_members')
        .update({ is_active: false, lifecycle_status: 'alumni' })
        .in('id', gradIds)
        .eq('org_id', orgId);
      if (!gErr) graduatedCount = gradIds.length;
    }

    if (isServerSupabaseConfigured()) {
      await logOrgAction(getAdminClient(), {
        orgId,
        actorId: member.user_id,
        action: 'cohort_archived',
        targetType: 'cohort',
        targetId: id,
        detail: {
          name: cohort.name,
          graduated: graduatedCount,
          handoff_forced: force && handoffGate.missing.length > 0,
        },
      });
    }

    return NextResponse.json({ cohort: updated, graduated: graduatedCount, handoffGate });
  },
  { requireAuth: true },
);
