/* Shared ATS helpers for the applicant routes (not a route file).
   Blind-screening redaction and rubric aggregation live here so every applicant
   endpoint redacts identically — server-side, never in the UI. */

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
  if (parts.length === 0) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* Redact PII for blind screening. When the cohort's form has blind_screening ON
   and the applicant is still pre-interview, name / school / photo / contact are
   stripped from the payload entirely — the client never receives them. */
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
  };
  if (redacted) {
    return {
      ...base,
      full_name: null,
      initials: initialsOf(a.full_name),
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
   submitted scores exist (honest empty — never a fabricated rating). */
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
