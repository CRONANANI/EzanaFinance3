/**
 * Sonar for organizations: research reports (Nov 2026).
 *
 * A deep or standard research run an analyst keeps becomes an org research
 * report: its own object (org_sonar_reports), linked into the Research
 * Library, a pitch and collections, never converted into a note. Every save
 * is a frozen version (org_sonar_report_versions): the snapshot is exactly
 * what the analyst saw on screen, read server-side from the run itself, so a
 * report can never carry findings Sonar did not produce.
 *
 * Status:      draft -> under_review -> approved -> superseded
 *              (under_review -> draft when the author withdraws it or a
 *              reviewer returns it; a new version of an approved report goes
 *              back to draft and keeps the approved version on record)
 * Visibility:  private, members (named people), team (the author's desk),
 *              executives (executives and portfolio managers), org
 *
 * The same rules are enforced by RLS and the guard trigger in
 * 20261107120000_org_sonar_reports.sql; these helpers mirror them so the API
 * and the UI agree with the database. Pure and client-safe; unit-tested in
 * scripts/check-org-sonar.mjs.
 */

export const REPORT_VISIBILITY = ['private', 'members', 'team', 'executives', 'org'];
export const REPORT_STATUSES = ['draft', 'under_review', 'approved', 'superseded'];
export const REPORT_KINDS = ['research', 'fund_fit', 'challenge'];
export const MANAGER_ROLES = ['executive', 'portfolio_manager'];

export const VISIBILITY_LABEL = {
  private: 'Only me',
  members: 'Selected members',
  team: 'My desk',
  executives: 'Executives and portfolio managers',
  org: 'Whole organization',
};

export const STATUS_LABEL = {
  draft: 'Draft',
  under_review: 'Under review',
  approved: 'Approved',
  superseded: 'Superseded',
};

export const KIND_LABEL = {
  research: 'Research',
  fund_fit: 'Fund fit',
  challenge: 'Challenge',
};

/** Sonar's answer to "should our fund invest?" (fund fit research). */
export const STANCE_LABEL = {
  invest: 'Invest',
  watch: 'Watch',
  pass: 'Pass',
};

/** Largest snapshot we keep (bytes of JSON); panels go first if it is larger. */
export const SNAPSHOT_MAX = 1_500_000;

export function isManager(viewer) {
  return Boolean(viewer && viewer.is_active !== false && MANAGER_ROLES.includes(viewer.role));
}

/**
 * Can `viewer` read `report`? viewer: { user_id, org_id, role, team_id }.
 * Mirrors public.org_sonar_report_visible().
 */
export function canReadReport(report, viewer) {
  if (!report || !viewer || viewer.is_active === false) return false;
  if (report.org_id !== viewer.org_id) return false;
  if (report.author_id === viewer.user_id) return true;
  if (isManager(viewer) && report.status !== 'draft') return true;
  switch (report.visibility) {
    case 'org':
      return true;
    case 'team':
      return Boolean(report.team_id && report.team_id === viewer.team_id);
    case 'executives':
      return isManager(viewer);
    case 'members':
      return (report.shared_with || []).includes(viewer.user_id);
    default:
      return false;
  }
}

/** May `viewer` change the report's settings (title, sharing, links)? */
export function canEditReport(report, viewer) {
  if (!report || !viewer || report.org_id !== viewer.org_id) return false;
  return report.author_id === viewer.user_id || isManager(viewer);
}

/**
 * Whether `viewer` may move `report` to status `to`. `canApprove` is the
 * viewer's approve_deliverables permission (tier defaults plus overrides).
 * Returns { ok, reason }.
 */
export function canTransition(report, to, viewer, { canApprove = false } = {}) {
  if (!report || !viewer) return { ok: false, reason: 'Unknown report.' };
  if (!REPORT_STATUSES.includes(to)) return { ok: false, reason: 'Unknown status.' };
  const from = report.status;
  if (from === to) return { ok: false, reason: 'The report already has that status.' };
  const author = report.author_id === viewer.user_id;
  const reviewer = isManager(viewer) || canApprove;
  if (from === 'draft' && to === 'under_review') {
    return author ? { ok: true } : { ok: false, reason: 'Only the author submits a report.' };
  }
  if (from === 'under_review' && to === 'draft') {
    return author || reviewer
      ? { ok: true }
      : { ok: false, reason: 'Only the author or a reviewer can return a report.' };
  }
  if (from === 'under_review' && to === 'approved') {
    if (!reviewer) return { ok: false, reason: 'Approval needs a portfolio manager or executive.' };
    if (author)
      return { ok: false, reason: 'A report is approved by someone other than its author.' };
    return { ok: true };
  }
  if (from === 'approved' && to === 'superseded') {
    return author || reviewer
      ? { ok: true }
      : { ok: false, reason: 'Only the author or a reviewer can supersede a report.' };
  }
  return {
    ok: false,
    reason: `A ${STATUS_LABEL[from] || from} report cannot become ${STATUS_LABEL[to] || to}.`,
  };
}

const clean = (v, max) =>
  String(v ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

/** A sanitized settings patch from a request body. */
export function cleanSettings(body = {}) {
  const out = {};
  if ('title' in body) {
    const t = clean(body.title, 160);
    if (t) out.title = t;
  }
  if ('visibility' in body && REPORT_VISIBILITY.includes(body.visibility)) {
    out.visibility = body.visibility;
  }
  if ('sharedWith' in body) {
    out.shared_with = [
      ...new Set(
        (Array.isArray(body.sharedWith) ? body.sharedWith : [])
          .map(String)
          .filter((id) => /^[0-9a-f-]{36}$/i.test(id)),
      ),
    ].slice(0, 50);
  }
  if ('pitchId' in body) {
    out.pitch_id = /^[0-9a-f-]{36}$/i.test(String(body.pitchId || '')) ? body.pitchId : null;
  }
  return out;
}

/** A clean comment row, or { error }. Anchors name a part of the report. */
export function cleanComment(body = {}) {
  const text = String(body.body ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ')
    .trim()
    .slice(0, 4000);
  if (text.length < 1) return { error: 'Write a comment first.' };
  const anchor = /^[a-z0-9_:-]{1,80}$/i.test(String(body.anchor || '')) ? body.anchor : 'report';
  const version =
    Number.isInteger(Number(body.version)) && Number(body.version) > 0
      ? Number(body.version)
      : null;
  const parentId = /^[0-9a-f-]{36}$/i.test(String(body.parentId || '')) ? body.parentId : null;
  return { row: { body: text, anchor, version, parent_id: parentId } };
}

/**
 * The parts of a snapshot a reviewer can comment on, in reading order:
 * the conclusion, then findings, risks, sections, catalysts, headwinds.
 */
export function anchorsOf(snapshot) {
  const r = snapshot?.report || {};
  const out = [{ id: 'report', label: 'Whole report' }];
  if (r.executiveConclusion) out.push({ id: 'conclusion', label: 'Conclusion' });
  if (r.verdict) out.push({ id: 'verdict', label: 'Sonar view' });
  for (const f of r.keyFindings || []) {
    if (f?.id) out.push({ id: f.id, label: String(f.title || f.text || f.id).slice(0, 80) });
  }
  for (const x of r.risks || []) if (x?.id) out.push({ id: x.id, label: x.title || x.id });
  for (const x of r.sections || []) if (x?.id) out.push({ id: x.id, label: x.title || x.id });
  for (const x of r.catalysts || []) if (x?.id) out.push({ id: x.id, label: x.title || x.id });
  for (const x of r.headwinds || []) if (x?.id) out.push({ id: x.id, label: x.title || x.id });
  return out.filter((a, i, all) => all.findIndex((b) => b.id === a.id) === i);
}

/**
 * The saved snapshot: the folded research state without anything that is
 * only meaningful while a run is live (status, errors, quotas, timers).
 * Over SNAPSHOT_MAX it drops the dataset panels, then the relationships.
 */
export function snapshotFromState(state) {
  if (!state?.report) return null;
  const run = state.run
    ? (({ layout, understood, ...rest }) => ({
        ...rest,
        researchMetadata: rest.researchMetadata
          ? (({ trace, validationLog, ...m }) => m)(rest.researchMetadata)
          : null,
      }))(state.run)
    : null;
  let snap = {
    v: 1,
    plan: state.plan || null,
    stages: state.stages || [],
    panels: state.panels || {},
    memory: state.memory || null,
    evidence: state.evidence || null,
    analysis: state.analysis || null,
    relationships: state.relationships || null,
    coverage: state.coverage || null,
    report: state.report,
    brief: state.brief || null,
    run,
  };
  const size = (o) => JSON.stringify(o).length;
  if (size(snap) > SNAPSHOT_MAX) snap = { ...snap, panels: {}, trimmed: ['panels'] };
  if (size(snap) > SNAPSHOT_MAX)
    snap = { ...snap, relationships: null, trimmed: ['panels', 'relationships'] };
  return size(snap) > SNAPSHOT_MAX ? null : snap;
}

/** The state ResearchReport renders for a saved snapshot. */
export function stateFromSnapshot(snapshot) {
  if (!snapshot) return null;
  return {
    status: 'done',
    plan: snapshot.plan,
    stage: null,
    stages: snapshot.stages || [],
    tasks: {},
    panels: snapshot.panels || {},
    memory: snapshot.memory,
    evidence: snapshot.evidence,
    analysis: snapshot.analysis,
    relationships: snapshot.relationships,
    report: snapshot.report,
    brief: snapshot.brief,
    run: snapshot.run,
    error: null,
    remaining: null,
    coverage: snapshot.coverage || null,
    signup: false,
    standardAvailable: false,
    org: null,
  };
}

/**
 * The summary stored beside every version, so lists, the pitch panel and
 * analytics never parse the snapshot: the subject, the conclusion and the
 * validation statistics.
 */
export function summarizeSnapshot(snapshot) {
  const r = snapshot?.report || {};
  const run = snapshot?.run || {};
  const subject = run.researchScope?.subject || snapshot?.plan?.subject || null;
  const stats = r.validation?.stats || run.researchMetadata?.validation || null;
  const evidence = run.evidence || [];
  return {
    question: clean(run.researchQuestion || snapshot?.plan?.spec?.question || '', 500),
    ticker:
      subject && (subject.kind === 'company' || subject.kind === 'ticker')
        ? clean(subject.id, 12).toUpperCase()
        : null,
    subjectLabel: subject ? clean(subject.label || subject.id, 120) : null,
    format: r.format || run.format || 'report',
    memoKind: r.memoKind || null,
    conclusion: clean(r.executiveConclusion?.text || '', 1200),
    confidence: ['high', 'medium', 'low'].includes(r.confidence || run.confidence)
      ? r.confidence || run.confidence
      : null,
    stance: r.verdict?.stance || null,
    thesisFit: r.thesisFit?.fit || null,
    challengeVerdict: r.challenge?.verdict || null,
    stats: {
      claims: stats?.claims ?? null,
      kept: stats?.kept ?? null,
      claimSupportRate: stats?.claimSupportRate ?? null,
      citationCoverage: stats?.citationCoverage ?? null,
      evidence: evidence.length,
      sources: new Set(evidence.map((e) => e.source)).size,
    },
  };
}

/** A default title for a saved report. */
export function defaultTitle(summary, kind = 'research') {
  const base = summary?.subjectLabel || summary?.ticker || summary?.question || 'Sonar research';
  if (kind === 'fund_fit') return clean(`Fund fit: ${base}`, 160);
  if (kind === 'challenge') return clean(`Challenge: ${base}`, 160);
  return clean(summary?.question || base, 160);
}
