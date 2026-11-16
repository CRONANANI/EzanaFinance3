/**
 * Applicant tracking: blind-screening redaction, rubric aggregation and the
 * anti-anchoring view of interviewer scores. Pure (no server imports), so the
 * applicant routes and the Cohorts sample bundle apply exactly the same rules.
 * Redaction happens on the server, never in the UI.
 */

export const MANAGER_ROLES = ['executive', 'portfolio_manager'];

export const ATS_STAGES = [
  'applied',
  'screened',
  'interview',
  'pitch',
  'offer',
  'accepted',
  'rejected',
  'declined',
];

// Board columns (the two archive lanes are rendered separately).
export const BOARD_STAGES = ['applied', 'screened', 'interview', 'pitch', 'offer', 'accepted'];
export const ARCHIVE_STAGES = ['rejected', 'declined'];

// Before an applicant reaches the interview, blind screening hides identity.
export const PRE_INTERVIEW_STAGES = ['applied', 'screened'];

export const RUBRIC_CRITERIA = ['technical', 'communication', 'culture_fit', 'prior_experience'];

export function initialsOf(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '–';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* The blind applicant ID: "A-" and the last four characters of the
   applicant's record id. It carries nothing from the person, so it is safe to
   show while names are hidden, and every viewer sees the same ID for the same
   applicant (row-level rules may show them different subsets). */
export function blindIdFor(id) {
  const tail = String(id || '')
    .replace(/[^0-9a-z]/gi, '')
    .slice(-4)
    .toUpperCase();
  return tail ? `A-${tail}` : null;
}

/* Redact PII for blind screening. When the cohort's form has blind_screening ON
   and the applicant is still pre-interview, name, initials, school, files and
   contact are stripped from the payload entirely: the client never receives
   them, whoever the viewer is. The blind ID stands in for the name. */
export function shapeApplicant(a, { blind }) {
  const redacted = !!blind && PRE_INTERVIEW_STAGES.includes(a.stage);
  const base = {
    id: a.id,
    cohort_id: a.cohort_id,
    stage: a.stage,
    source: a.source || null,
    year: a.year || null,
    responses: a.responses || {},
    rejected_reason: a.rejected_reason || null,
    applied_at: a.applied_at || a.created_at || null,
    provisioned_member_id: a.provisioned_member_id || null,
    has_resume: !!a.resume_url,
    has_sample_pitch: !!a.sample_pitch_url,
    blinded: redacted,
    blind_id: blindIdFor(a.id),
  };
  if (redacted) {
    return {
      ...base,
      full_name: null,
      initials: null,
      email: null,
      program: null,
      resume_url: null,
      sample_pitch_url: null,
    };
  }
  return {
    ...base,
    full_name: a.full_name,
    initials: initialsOf(a.full_name),
    email: a.email || null,
    program: a.program || null,
    resume_url: a.resume_url || null,
    sample_pitch_url: a.sample_pitch_url || null,
  };
}

/* Aggregate ★ = weighted mean of SUBMITTED scores only (0–5), or null when no
   submitted scores exist (honest empty - never a fabricated rating). */
export function aggregateStar(scoreRows) {
  const submitted = (scoreRows || []).filter((s) => s.submitted_at);
  if (submitted.length === 0) return null;
  let wSum = 0;
  let wxSum = 0;
  for (const s of submitted) {
    const w = Number(s.weight) || 1;
    wSum += w;
    wxSum += w * Number(s.score);
  }
  if (wSum === 0) return null;
  return Math.round((wxSum / wSum) * 100) / 100;
}

/* Count of distinct interviewers who have SUBMITTED for this applicant. */
export function submittedInterviewerCount(scoreRows) {
  const set = new Set();
  for (const s of scoreRows || []) if (s.submitted_at) set.add(s.interviewer_id);
  return set.size;
}

/**
 * The rubric panel one viewer may see (GET /api/org/applicants/:id/scores).
 * ANTI-ANCHORING: a viewer reads another interviewer's per-criterion scores
 * and notes only once that interviewer has submitted AND the viewer has
 * submitted their own. A manager with no scores of their own is a pure
 * reviewer and may read submitted notes.
 */
export function scoresView(rows, { memberId, role, nameById = new Map() }) {
  const all = rows || [];
  const myRows = all.filter((r) => r.interviewer_id === memberId);
  const viewerSubmitted = myRows.some((r) => r.submitted_at);
  const pureReviewer = MANAGER_ROLES.includes(role) && myRows.length === 0;
  const canViewOthers = viewerSubmitted || pureReviewer;
  const interviewerIds = [...new Set(all.map((r) => r.interviewer_id))];
  const byInterviewer = new Map();
  for (const r of all) {
    if (r.interviewer_id === memberId) continue;
    if (!byInterviewer.has(r.interviewer_id)) byInterviewer.set(r.interviewer_id, []);
    byInterviewer.get(r.interviewer_id).push(r);
  }
  const others = [...byInterviewer.entries()].map(([iid, irows]) => {
    const submitted = irows.some((r) => r.submitted_at);
    const reveal = submitted && canViewOthers;
    return {
      interviewer_id: iid,
      interviewer_name: nameById.get(iid) || 'Interviewer',
      submitted,
      rows: reveal
        ? irows.map((r) => ({
            criterion: r.criterion,
            score: Number(r.score),
            weight: Number(r.weight) || 1,
            notes: r.notes || null,
          }))
        : [],
      locked: !reveal,
    };
  });
  return {
    criteria: RUBRIC_CRITERIA,
    my: {
      submitted: viewerSubmitted,
      rows: myRows.map((r) => ({
        criterion: r.criterion,
        score: Number(r.score),
        weight: Number(r.weight) || 1,
        notes: r.notes || null,
        submitted_at: r.submitted_at || null,
      })),
    },
    others,
    aggregate_star: aggregateStar(all),
    scores_in: submittedInterviewerCount(all),
    interviewer_count: interviewerIds.length,
    can_view_others: canViewOthers,
    viewer: { memberId, canManage: MANAGER_ROLES.includes(role) },
  };
}
