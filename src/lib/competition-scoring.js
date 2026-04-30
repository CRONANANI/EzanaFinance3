/**
 * Competition final scoring — shared by admin PATCH and competition-scorer cron.
 */
import { awardELO } from '@/lib/elo';

/**
 * Rank participants by return, award ELO brackets, mark competition scored.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {Record<string, unknown>} comp — row from public.competitions
 * @returns {Promise<Record<string, unknown>>}
 */
export async function scoreCompetition(supabase, comp) {
  if (comp.status === 'scored') {
    return { participantCount: 0, awarded: 0, skipped: true, reason: 'already_scored' };
  }

  const { data: participants } = await supabase
    .from('competition_participants')
    .select('id, user_id, current_value, starting_balance')
    .eq('competition_id', comp.id);

  if (!participants || participants.length === 0) {
    await supabase
      .from('competitions')
      .update({ status: 'scored', scored_at: new Date().toISOString() })
      .eq('id', comp.id);
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
      await supabase
        .from('competition_participants')
        .update({
          rank,
          return_pct: p.return_pct,
          elo_change: eloDelta,
          scored_at: new Date().toISOString(),
        })
        .eq('id', p.id);

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
          }
        );
        if (awardResult) awarded++;
      }
    } catch (e) {
      errors.push({ userId: p.user_id, error: e instanceof Error ? e.message : String(e) });
    }
  }

  await supabase
    .from('competitions')
    .update({ status: 'scored', scored_at: new Date().toISOString() })
    .eq('id', comp.id);

  return {
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
