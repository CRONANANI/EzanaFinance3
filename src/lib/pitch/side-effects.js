/**
 * Transition side effects (spec §3.3) — a dispatcher, not inline logic. Called
 * by the advance endpoint AFTER the stage update commits. Effects that depend
 * on engines not yet wired (notifications, assignment creation, pre-read
 * generation, IC agenda) are represented as explicit no-ops so the dispatcher
 * is complete and each becomes a one-line wire-up later.
 *
 * Best-effort: a failing side effect must never roll back a valid transition.
 */
export async function applyTransitionSideEffects(
  supabase,
  orgId,
  pitch,
  fromStage,
  toStage,
  actor,
) {
  try {
    switch (toStage) {
      case 'screening':
        // TODO: notify desk Senior Analysts — sign-off requested.
        break;
      case 'deep_dive':
        // TODO: create Assignments for each required model; schedule desk meeting.
        break;
      case 'cross_desk_review':
        // TODO: notify the other desks' Senior PMs; create a review task each.
        break;
      case 'pitch_scheduled':
        // TODO: add to next IC agenda; generate pre-read pack.
        break;
      case 'ic_vote':
        // TODO: open the vote; compute recusals from compliance disclosures.
        break;
      case 'approved':
        // TODO: create a position record; post to the social feed.
        break;
      case 'in_portfolio':
        // Start the 90d thesis-review clock. (Memo auto-publish → Research
        // Library is a TODO once that publish path is exposed.)
        await supabase
          .from('org_pitches')
          .update({ last_reaffirmed_at: new Date().toISOString() })
          .eq('id', pitch.id);
        break;
      default:
        break;
    }
  } catch (e) {
    console.error('[pitch side-effect]', toStage, e?.message || e);
  }
}

/**
 * Falsification trip (spec §5.3). The analyst wrote the kill condition; when it
 * trips they don't get to ignore it — auto-create a Red Flag on the ticker
 * routed to the desk PM. Wires into the existing org_position_flags system.
 */
export async function tripFalsification(supabase, orgId, pitch, note) {
  const raiser = pitch.analyst_member_id || null;
  const recipient = pitch.pm_member_id || pitch.reviewer_member_id || null;
  const body =
    `Falsification condition tripped for ${pitch.ticker}. ` +
    (pitch.falsification ? `Condition: “${pitch.falsification}”. ` : '') +
    (note ? `Observed: ${note}` : 'The analyst’s own kill condition has been met.');
  const { data, error } = await supabase
    .from('org_position_flags')
    .insert({
      org_id: orgId,
      team_id: pitch.team_id || null,
      ticker: pitch.ticker,
      raiser_member_id: raiser,
      recipient_member_id: recipient,
      flag_color: 'red',
      subject: `Falsification tripped: ${pitch.ticker}`,
      body,
      reason: 'thesis_broken',
      conviction: 'high',
      suggested_action: 'reunderwrite',
      status: 'open',
    })
    .select('id')
    .maybeSingle();
  if (error) {
    console.error('[falsification→flag]', error.message);
    return { error: error.message };
  }
  return { flagId: data?.id || null };
}
