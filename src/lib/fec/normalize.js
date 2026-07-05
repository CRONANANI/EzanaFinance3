/**
 * OpenFEC response → normalized shapes used by the API routes and the cache.
 * Field names mirror the OpenFEC schemas exactly (CandidateTotal,
 * ScheduleABySize, ScheduleAByState, ScheduleE …) — no invented fields. Every
 * helper tolerates missing/empty input and returns an honest zero/empty value.
 */

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** CandidateTotal row → normalized member-finance core. */
export function normalizeCandidateTotals(row = {}) {
  return {
    raised: num(row.receipts),
    spent: num(row.disbursements),
    cashOnHand: num(row.cash_on_hand_end_period),
    individualItemized: num(row.individual_itemized_contributions),
    pac: num(row.other_political_committee_contributions),
    debts: num(row.debts_owed_by_committee),
    hasRaisedFunds: !!row.has_raised_funds,
    coverageStart: row.coverage_start_date || null,
    coverageEnd: row.coverage_end_date || null,
    office: row.office || null,
    party: row.party || null,
    state: row.state || null,
    cycle: row.cycle != null ? Number(row.cycle) : null,
  };
}

/** ScheduleABySize results → [{ size, total, count }] (small vs large donors). */
export function normalizeSizeBuckets(results = []) {
  return (Array.isArray(results) ? results : [])
    .map((r) => ({ size: Number(r.size), total: num(r.total), count: num(r.count) }))
    .filter((r) => Number.isFinite(r.size))
    .sort((a, b) => a.size - b.size);
}

/** ScheduleAByState results → [{ state, stateFull, total, count }] desc by total. */
export function normalizeTopStates(results = [], limit = 5) {
  return (Array.isArray(results) ? results : [])
    .map((r) => ({
      state: r.state || null,
      stateFull: r.state_full || r.state || null,
      total: num(r.total),
      count: num(r.count),
    }))
    .filter((r) => r.state)
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

/** by_employer results → [{ employer, total, count }]. */
export function normalizeByEmployer(results = [], limit = 10) {
  return (Array.isArray(results) ? results : [])
    .map((r) => ({ employer: r.employer || null, total: num(r.total), count: num(r.count) }))
    .filter((r) => r.employer)
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

/** by_occupation results → [{ occupation, total, count }]. */
export function normalizeByOccupation(results = [], limit = 10) {
  return (Array.isArray(results) ? results : [])
    .map((r) => ({ occupation: r.occupation || null, total: num(r.total), count: num(r.count) }))
    .filter((r) => r.occupation)
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

/**
 * schedule_e/by_candidate results → { supportTotal, opposeTotal, byCommittee[] }.
 * support_oppose_indicator is 'S' (for) or 'O' (against).
 */
export function normalizeScheduleE(results = []) {
  let supportTotal = 0;
  let opposeTotal = 0;
  const byCommittee = [];
  for (const r of Array.isArray(results) ? results : []) {
    const t = num(r.total);
    const ind = String(r.support_oppose_indicator || '').toUpperCase();
    if (ind === 'S') supportTotal += t;
    else if (ind === 'O') opposeTotal += t;
    byCommittee.push({
      committeeId: r.committee_id || null,
      committeeName: r.committee_name || null,
      supportOpposeIndicator: ind || null,
      total: t,
    });
  }
  byCommittee.sort((a, b) => b.total - a.total);
  return { supportTotal, opposeTotal, byCommittee: byCommittee.slice(0, 12) };
}

/** communication_costs/by_candidate results → total. */
export function sumCommunicationCosts(results = []) {
  return (Array.isArray(results) ? results : []).reduce((s, r) => s + num(r.total), 0);
}

/** schedule_b/by_purpose results → [{ purpose, total, count }]. */
export function normalizeByPurpose(results = [], limit = 10) {
  return (Array.isArray(results) ? results : [])
    .map((r) => ({ purpose: r.purpose || null, total: num(r.total), count: num(r.count) }))
    .filter((r) => r.purpose)
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}
