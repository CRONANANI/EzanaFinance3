import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import {
  createServerSupabaseClient,
  isServerSupabaseConfigured,
} from '@/lib/supabase-service-role';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import { logOrgAction } from '@/lib/org-audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function resolveParams(context) {
  return (await context?.params) || {};
}

/* A research note counts as a published coverage handoff when it is published
   and typed/tagged as a handoff. */
function isPublishedHandoff(note) {
  const published = !!note.published_at || note.status === 'published';
  const dt = (note.doc_type || '').toLowerCase();
  const tags = Array.isArray(note.tags) ? note.tags.map((t) => String(t).toLowerCase()) : [];
  return published && (dt.includes('handoff') || tags.includes('handoff'));
}

/* POST /api/org/cohorts/:id/archive — graduation, extended (executive only).
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
    const supabase = createServerSupabase();
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

    const { data: members } = await supabase
      .from('org_members')
      .select('id, user_id, display_name, role, sub_role, title, is_graduating, team_id')
      .eq('org_id', orgId)
      .eq('is_active', true);
    const roster = members || [];
    const grads = roster.filter((m) => m.is_graduating);

    // ── PRE-FLIGHT HANDOFF-DOCS GATE ─────────────────────────────────────────
    // Every sector a graduating member covers should have a published handoff
    // doc before their knowledge leaves with them.
    let handoffGate = { required: 0, published: 0, missing: [] };
    if (graduate && grads.length > 0) {
      const gradIds = grads.map((m) => m.id);
      const gradUserIds = grads.map((m) => m.user_id).filter(Boolean);

      const { data: coverage } = await supabase
        .from('org_sector_coverage')
        .select('member_id, sector')
        .eq('org_id', orgId)
        .in('member_id', gradIds);

      let notes = [];
      if (gradUserIds.length > 0) {
        const { data: n } = await supabase
          .from('org_research_notes')
          .select('author_id, sector, doc_type, tags, status, published_at')
          .eq('org_id', orgId)
          .in('author_id', gradUserIds);
        notes = (n || []).filter(isPublishedHandoff);
      }

      const nameById = new Map(roster.map((m) => [m.id, m.display_name]));
      const userIdByMember = new Map(grads.map((m) => [m.id, m.user_id]));
      const publishedKeys = new Set(
        notes.map((n) => `${n.author_id}:${(n.sector || '').toLowerCase()}`),
      );

      const required = coverage || [];
      const missing = required.filter((c) => {
        const uid = userIdByMember.get(c.member_id);
        return !uid || !publishedKeys.has(`${uid}:${(c.sector || '').toLowerCase()}`);
      });

      handoffGate = {
        required: required.length,
        published: required.length - missing.length,
        missing: missing.map((c) => ({
          member_id: c.member_id,
          member_name: nameById.get(c.member_id) || null,
          sector: c.sector,
        })),
      };

      if (handoffGate.missing.length > 0 && !force) {
        return NextResponse.json(
          {
            error: 'Handoff docs incomplete',
            gate: 'handoff_docs',
            ...handoffGate,
          },
          { status: 409 },
        );
      }
    }

    // ── Build the fund snapshot (unchanged) ──────────────────────────────────
    const { data: teams } = await supabase.from('org_teams').select('id, name').eq('org_id', orgId);
    const teamIds = (teams || []).map((t) => t.id);

    let portfolios = [];
    if (teamIds.length > 0) {
      const { data: pf } = await supabase
        .from('org_team_portfolios')
        .select('team_id, ticker_symbol, shares, avg_cost, current_value, sector')
        .in('team_id', teamIds);
      portfolios = pf || [];
    }

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
        graduated: graduate && m.is_graduating,
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
      await logOrgAction(createServerSupabaseClient(), {
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
