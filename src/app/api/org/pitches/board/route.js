import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { FmpAPI } from '@/lib/services/fmp';
import {
  getPitchContext,
  fetchBoardPitches,
  icEligibleVoters,
  computeQuorum,
  listIcMeetings,
} from '@/lib/org-pitch-api-helpers';
import { ACTIVE_STAGES, designStageLabel, nextForwardGate } from '@/lib/org-pitch-state-machine';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Stage → design dot color token (light + dark safe theme tokens).
const STAGE_TOKENS = {
  idea: 'var(--info)',
  research_approved: 'var(--cyan)',
  research_in_progress: 'var(--purple)',
  pm_review: 'var(--warning)',
  committee_scheduled: 'var(--gold)',
  committee_vote: 'var(--pink)',
  decision: 'var(--emerald)',
};

/** Batch-fetch current prices from FMP; degrade gracefully (stale/null). */
async function attachQuotes(pitches) {
  const symbols = [...new Set(pitches.map((p) => p.ticker).filter(Boolean))];
  let quoteMap = new Map();
  let stale = false;
  if (symbols.length) {
    try {
      const quotes = await FmpAPI.getBatchQuote(symbols);
      quoteMap = new Map((quotes || []).map((q) => [q.symbol, q]));
    } catch {
      stale = true; // never fabricate a price — mark the strip stale instead
    }
  }
  const decorated = pitches.map((p) => {
    const q = quoteMap.get(p.ticker);
    const current = q?.price ?? null;
    const upside =
      current != null && p.target_price != null && Number(p.target_price) !== 0
        ? (Number(p.target_price) - current) / current
        : null;
    const gate = nextForwardGate(p, {
      deliverableCount: p.deliverable_count,
      deliverableKinds: (p.deliverables || []).map((d) => d.kind),
    });
    return {
      ...p,
      current_price: current,
      current_price_stale: current == null,
      upside,
      gate_block: gate?.blocked ? gate.reason : null,
      next_gate_hint: gate && !gate.blocked ? gate.reason : null,
    };
  });
  return { decorated, stale };
}

export const GET = withApiGuard(
  async (request) => {
    const { supabase, orgId } = await getPitchContext();
    if (!orgId) {
      return NextResponse.json({ view: 'kanban', columns: [], archive: [], total_active: 0 });
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'kanban';
    const teamId = searchParams.get('team_id') || undefined;

    const { active, portfolio, archived } = await fetchBoardPitches(supabase, orgId, { teamId });

    // ── Tracker (1b): live book (in_portfolio) + still-active pitches vs price ─
    if (view === 'tracker') {
      const { decorated, stale } = await attachQuotes([...portfolio, ...active]);
      const rows = decorated.map((p) => {
        const base = p.pitch_price ?? p.current_price_at_submission ?? null;
        const pnl_pct =
          base != null && p.current_price != null && Number(base) !== 0
            ? (p.current_price - Number(base)) / Number(base)
            : null;
        const review_due =
          p.stage === 'in_portfolio' &&
          (!p.last_reaffirmed_at ||
            Date.now() - new Date(p.last_reaffirmed_at).getTime() > 90 * 86400000);
        return { ...p, pitch_price: base, pnl_pct, review_due };
      });
      return NextResponse.json({ view, rows, stale, total: rows.length });
    }

    // ── IC vote (1c): agenda auto-assembles from Pitch-Scheduled + IC-Vote ────
    if (view === 'ic') {
      const agendaPitches = active.filter((p) =>
        ['committee_scheduled', 'committee_vote'].includes(p.stage),
      );
      const { decorated } = await attachQuotes(agendaPitches);
      const eligible = await icEligibleVoters(supabase, orgId);
      const meetings = await listIcMeetings(supabase, orgId);
      const agenda = decorated.map((p) => {
        const cast = (p.vote_yes_count || 0) + (p.vote_no_count || 0) + (p.vote_abstain_count || 0);
        return {
          ...p,
          quorum: computeQuorum(eligible.length, cast, 50),
          voting_open: p.stage === 'committee_vote',
        };
      });
      return NextResponse.json({
        view,
        agenda,
        meetings,
        eligible_voters: eligible.length,
        eligible: eligible.map((m) => ({ id: m.id, name: m.display_name, role: m.role })),
      });
    }

    // ── Kanban (1a, default): 7 stage columns + archive lane ─────────────────
    const { decorated, stale } = await attachQuotes(active);
    const columns = ACTIVE_STAGES.map((stage) => ({
      id: stage,
      stage,
      label: designStageLabel(stage),
      token: STAGE_TOKENS[stage] || 'var(--text-secondary)',
      pitches: decorated.filter((p) => p.stage === stage),
    }));

    return NextResponse.json({
      view: 'kanban',
      columns,
      archive: archived,
      portfolio_count: portfolio.filter((p) => p.stage === 'in_portfolio').length,
      total_active: active.length,
      stale,
    });
  },
  { requireAuth: true },
);
