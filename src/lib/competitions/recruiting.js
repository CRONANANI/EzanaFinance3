/**
 * Phase 7 recruiting-signal helpers. Consent is load-bearing: these gates are the
 * single source of truth for "may this student be surfaced, and to whom". Default
 * is none/private; opt-in only; a revocation (revoked_at set) removes the student
 * from every downstream view immediately. The pure gates are unit-tested; the firm
 * query is service-role and re-checks consent at query time.
 */

/** May the student's pitch be shown to JUDGES (judges_only or wider)? */
export function consentAllowsJudges(optin) {
  if (!optin || !optin.consented || optin.revoked_at) return false;
  return optin.consent_scope === 'judges_only' || optin.consent_scope === 'sponsoring_firms';
}

/** May the student be surfaced to SPONSORING FIRMS for recruiting? */
export function consentAllowsFirms(optin) {
  if (!optin || !optin.consented || optin.revoked_at) return false;
  return optin.consent_scope === 'sponsoring_firms';
}

/**
 * Candidates a firm may see: students flagged by one of the firm's judges AND who
 * consented to 'sponsoring_firms'. Consent is re-checked here at query time, so a
 * revoked consent drops the student on the next call. Service-role client only —
 * this must NEVER be exposed on the account-less judge token path (firm recruiting
 * needs real auth, which is why this helper is not wired to a live route yet; see
 * the Phase 7 notes).
 */
export async function firmCandidates(admin, firm) {
  if (!firm) return [];
  const { data: judges } = await admin.from('pitch_judges').select('id').eq('firm', firm);
  const judgeIds = (judges || []).map((j) => j.id);
  if (!judgeIds.length) return [];

  const { data: flags } = await admin
    .from('pitch_talent_flags')
    .select('pitch_team_member_id, note, judge_id, created_at')
    .in('judge_id', judgeIds);
  if (!flags || !flags.length) return [];

  const memberIds = [...new Set(flags.map((f) => f.pitch_team_member_id))];
  const [{ data: optins }, { data: members }] = await Promise.all([
    admin.from('pitch_talent_optin').select('pitch_team_member_id, consented, consent_scope, revoked_at').in('pitch_team_member_id', memberIds),
    admin.from('pitch_team_members').select('id, full_name, team_id').in('id', memberIds),
  ]);
  const optinById = new Map((optins || []).map((o) => [o.pitch_team_member_id, o]));
  const memberById = new Map((members || []).map((m) => [m.id, m]));

  // Only members who consented to sponsoring_firms survive.
  return flags
    .filter((f) => consentAllowsFirms(optinById.get(f.pitch_team_member_id)))
    .map((f) => ({
      member_id: f.pitch_team_member_id,
      full_name: memberById.get(f.pitch_team_member_id)?.full_name || null,
      note: f.note,
      flagged_at: f.created_at,
    }));
}
