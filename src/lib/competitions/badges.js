/**
 * Competition trophy awarding. Runs when results are published (from the results
 * route). Service-role only — users can't self-award. Idempotent via the unique
 * (org_member_id, competition_id, badge_key) constraint. competition_name /
 * host_org_name are denormalized onto each badge so a trophy survives if the
 * competition is later archived or deleted.
 */

/** Best placement badge for a rank (one badge per member per competition). */
export function badgeForRank(rank) {
  if (rank === 1) return 'winner';
  if (rank != null && rank <= 3) return 'top3';
  return 'participant';
}

/**
 * Award trophies for a competition's placed teams. Team members with an account
 * (org_member_id) get the badge with their team role; the team's org PMs also get
 * it with role 'portfolio_manager' (the explicit ask: PMs are recognized for their
 * teams' results, not just analysts). Returns the number of badge rows written.
 */
export async function awardCompetitionBadges(admin, competitionId) {
  const { data: comp } = await admin
    .from('pitch_competitions')
    .select('id, name, host_org_id')
    .eq('id', competitionId)
    .maybeSingle();
  if (!comp) return 0;
  const { data: host } = await admin.from('organizations').select('name, university_name').eq('id', comp.host_org_id).maybeSingle();
  const hostName = host?.university_name || host?.name || null;

  const [{ data: results }, { data: teams }] = await Promise.all([
    admin.from('pitch_results').select('team_id, rank').eq('competition_id', comp.id),
    admin.from('pitch_teams').select('id, org_id').eq('competition_id', comp.id),
  ]);
  const rankByTeam = new Map((results || []).map((r) => [r.team_id, r.rank]));

  const rows = [];
  for (const team of teams || []) {
    const rank = rankByTeam.get(team.id) ?? null;
    const badgeKey = badgeForRank(rank);

    // Team members who have an account.
    // eslint-disable-next-line no-await-in-loop
    const { data: members } = await admin
      .from('pitch_team_members')
      .select('org_member_id, role_on_team')
      .eq('team_id', team.id)
      .not('org_member_id', 'is', null);
    for (const m of members || []) {
      rows.push(badgeRow(m.org_member_id, comp, team.id, badgeKey, rank, m.role_on_team || 'analyst', hostName));
    }

    // The team org's PMs (leaders) — recognized for the team's result.
    if (team.org_id) {
      // eslint-disable-next-line no-await-in-loop
      const { data: pms } = await admin
        .from('org_members')
        .select('id')
        .eq('org_id', team.org_id)
        .eq('role', 'portfolio_manager')
        .eq('is_active', true);
      for (const pm of pms || []) {
        rows.push(badgeRow(pm.id, comp, team.id, badgeKey, rank, 'portfolio_manager', hostName));
      }
    }
  }
  if (!rows.length) return 0;

  // Idempotent: the unique constraint dedupes re-runs.
  const { error } = await admin
    .from('org_competition_badges')
    .upsert(rows, { onConflict: 'org_member_id,competition_id,badge_key', ignoreDuplicates: true });
  if (error) return 0;
  return rows.length;
}

function badgeRow(orgMemberId, comp, teamId, badgeKey, rank, roleAtEvent, hostName) {
  return {
    org_member_id: orgMemberId,
    competition_id: comp.id,
    team_id: teamId,
    badge_key: badgeKey,
    placement: rank,
    role_at_event: roleAtEvent,
    competition_name: comp.name,
    host_org_name: hostName,
  };
}
