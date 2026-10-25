/**
 * Competition final scoring, shared by the admin PATCH and the
 * competition-scorer cron (reliability audit P1-7).
 *
 * 1. Claim: claim_competition_scoring() moves the competition to 'scoring'
 *    in one UPDATE ... WHERE status IN (...) RETURNING. Only the caller that
 *    gets the row back scores; a concurrent cron run or admin click gets
 *    nothing and stops.
 * 2. Award: each participant's ELO goes through award_elo with the key
 *    competition:<id>, so a re-run (after a crash or a score_failed retry)
 *    is a no-op for anyone already awarded.
 * 3. Finish: 'scored', or 'score_failed' with the error so an admin can
 *    retry safely.
 */
import { awardELO } from '@/lib/elo';

const MISSING_FN = new Set(['PGRST202', '42883']);

/** Claim the competition for scoring. Returns the claimed row or null. */
export async function claimCompetitionScoring(supabase, comp) {
  const { data, error } = await supabase.rpc('claim_competition_scoring', { p_id: comp.id });
  if (error) {
    if (MISSING_FN.has(error.code)) {
      /* Pre-migration: the old status guard. */
      return comp.status === 'scored' ? null : comp;
    }
    throw new Error(`claim_competition_scoring: ${error.message}`);
  }
  const row = Array.isArray(data) ? data[0] : data;
  return row || null;
}

async function finish(supabase, id, patch) {
  const { error } = await supabase.from('competitions').update(patch).eq('id', id);
  if (error) throw new Error(`competition status update: ${error.message}`);
}

/**
 * Rank participants by return, award ELO brackets, mark competition scored.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {Record<string, unknown>} compIn — row from public.competitions
 * @returns {Promise<Record<string, unknown>>}
 */
export async function scoreCompetition(supabase, compIn) {
  const comp = await claimCompetitionScoring(supabase, compIn);
  if (!comp) {
    return { participantCount: 0, awarded: 0, skipped: true, reason: 'not_claimable' };
  }

  const { data: participants, error: pErr } = await supabase
    .from('competition_participants')
    .select('id, user_id, current_value, starting_balance')
    .eq('competition_id', comp.id);
  if (pErr) {
    await finish(supabase, comp.id, { status: 'score_failed', scoring_error: pErr.message });
    throw new Error(`competition participants: ${pErr.message}`);
  }

  if (!participants || participants.length === 0) {
    await finish(supabase, comp.id, { status: 'scored', scored_at: new Date().toISOString() });
    return { participantCount: 0, awarded: 0 };
  }

  const ranked = participants
    .map((p) => {
      const startBal = Number(p.starting_balance) || 0;
      const currVal = Number(p.current_value) || startBal;
      const returnPct = startBal > 0 ? ((currVal - startBal) / startBal) * 100 : 0;
      return { ...p, return_pct: returnPct };
    })
    .sort((a, b) => b.return_pct - a.return_pct);

  const total = ranked.length;
  const top1pctCutoff = Math.max(1, Math.ceil(total * 0.01));
  const top10pctCutoff = Math.max(1, Math.ceil(total * 0.1));
  const bottom25pctStart = Math.floor(total * 0.75);

  const awardTop1 = Number(comp.elo_top1pct_award) || 500;
  const awardTop10 = Number(comp.elo_top10pct_award) || 200;
  const penaltyBottom = Number(comp.elo_bottom25pct_penalty) || -50;

  let awarded = 0;
  const errors = [];

  for (let i = 0; i < ranked.length; i++) {
    const p = ranked[i];
    const rank = i + 1;
    let eloDelta = 0;
    let bracket = 'middle';

    if (rank <= top1pctCutoff) {
      eloDelta = awardTop1;
      bracket = 'top1pct';
    } else if (rank <= top10pctCutoff) {
      eloDelta = awardTop10;
      bracket = 'top10pct';
    } else if (rank > bottom25pctStart) {
      eloDelta = penaltyBottom;
      bracket = 'bottom25pct';
    }

    try {
      const { error: upErr } = await supabase
        .from('competition_participants')
        .update({
          rank,
          return_pct: p.return_pct,
          elo_change: eloDelta,
          scored_at: new Date().toISOString(),
        })
        .eq('id', p.id);
      if (upErr) throw new Error(upErr.message);

      if (eloDelta !== 0) {
        const awardResult = await awardELO(
          p.user_id,
          eloDelta,
          `Competition: ${comp.name} (rank ${rank}/${total})`,
          'competition',
          {
            competition_id: comp.id,
            competition_name: comp.name,
            rank,
            total_participants: total,
            return_pct: Number(p.return_pct.toFixed(4)),
            bracket,
          },
          { key: `competition:${comp.id}` },
        );
        if (awardResult) awarded++;
      }
    } catch (e) {
      errors.push({ userId: p.user_id, error: e instanceof Error ? e.message : String(e) });
    }
  }

  if (errors.length) {
    await finish(supabase, comp.id, {
      status: 'score_failed',
      scoring_error: `${errors.length} participant(s) failed: ${errors[0].error}`.slice(0, 500),
    });
  } else {
    await finish(supabase, comp.id, { status: 'scored', scored_at: new Date().toISOString() });
  }

  return {
    status: errors.length ? 'score_failed' : 'scored',
    participantCount: total,
    awarded,
    bracketsApplied: {
      top1pct: top1pctCutoff,
      top10pct: top10pctCutoff,
      bottom25pctStart,
    },
    errors: errors.slice(0, 10),
  };
}
