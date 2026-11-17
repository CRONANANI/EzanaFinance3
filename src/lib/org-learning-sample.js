/**
 * Sample content for the council band of the Learning Center (/learning-center).
 *
 * Served ONLY to master admin and demo accounts who are council members, by
 * GET /api/org/learning/sample. Real councils never receive it, the band
 * labels it "Sample content" while it shows, and nothing on the band writes.
 *
 * It is the same sample council as every rebuilt org page, built from the
 * other samples so the figures agree:
 *   assignments     the Assignments sample (same ids, people, dates, statuses)
 *   grades          the Grades sample's own-grades set (the member shape), so
 *                   "My grades" reads exactly what Grades shows a member
 *   learning scores the Recognition sample's Learning category
 *   onboarding      the Cohorts sample's checklist for the current analyst
 *                   class (same task titles and gate flags), with the viewer
 *                   shown as a member of that class who has done the first task
 *   council material and two council learning items, invented here
 *
 * The bundle has the shape of GET /api/org/learning, so the band draws it with
 * the same code. Pure: no React, no fetch, no server imports. Rows carry is_demo.
 */
import { buildAssignmentsSample } from './org-assignments-sample.js';
import { buildGradesSample } from './org-grades-sample.js';
import { sampleLearningScores } from './org-recognition-sample.js';
import { MANAGER_ROLES } from './org-learning-model.js';

const DAY = 86400000;

/* Council material, oldest first (the council path). Invented. */
const CONTENT = [
  ['Investment policy statement walkthrough', 'video', 60],
  ['How the council votes', 'presentation', 55],
  ['Pitch memo template, annotated', 'document', 40],
  ['Policy limits check', 'quiz', 30],
];

/* The cohort checklist, as the Cohorts sample lists it for the current class. */
const ONBOARDING = [
  [1, 'Fund orientation', false, true],
  [2, 'Investment policy statement quiz', true, false],
  [3, 'Compliance orientation', true, false],
  [4, 'Research Library orientation', false, false],
];

/**
 * @param {{ userId: string, memberId?: string, role: string, displayName?: string,
 *           title?: string, subRole?: string, now?: number }} viewer
 */
export function buildLearningCouncilSample({
  userId,
  memberId,
  role,
  displayName,
  title,
  subRole,
  now = Date.now(),
}) {
  const manager = MANAGER_ROLES.includes(role);
  const iso = (days) => new Date(now + days * DAY).toISOString();
  const year = new Date(now).getUTCFullYear();

  const { board } = buildAssignmentsSample({
    userId,
    memberId,
    role,
    displayName,
    title,
    subRole,
    now,
  });
  const assignments = board.assignments.map((a) => ({
    id: a.id,
    title: a.title,
    type: a.type,
    status: a.status,
    due_date: a.due_date,
    mine: Boolean(a.mine),
    is_demo: true,
    ...(manager
      ? {
          assignees: (a.assignees || []).map((p) => ({
            member_id: p.member_id,
            name: p.name,
            role: p.role,
          })),
        }
      : {}),
  }));
  const visible = manager ? assignments : assignments.filter((a) => a.mine);

  const content = CONTENT.map(([t, type, daysAgo], i) => ({
    id: `sample-learning-content-${String(i + 1).padStart(3, '0')}`,
    title: t,
    content_type: type,
    url: null,
    created_at: iso(-daysAgo),
    is_demo: true,
  }));
  const learningItems = [
    { ...content[0], status: 'in_progress', due: 3 },
    { ...content[1], status: 'assigned', due: -2 },
  ].map((c, i) => ({
    id: `sample-learning-item-${String(i + 1).padStart(3, '0')}`,
    title: c.title,
    content_type: c.content_type,
    url: null,
    status: c.status,
    due_date: iso(c.due),
    completed_at: null,
    is_demo: true,
  }));

  const own = buildGradesSample({ userId, role: 'analyst', displayName, now });

  return {
    now,
    sample: true,
    viewer: {
      memberId: memberId || 'sample-member-me',
      userId,
      role,
      subRole: subRole || title || null,
      canManage: manager,
    },
    council: { name: 'Sample council', university: null },
    assignments: visible,
    roster: manager
      ? board.roster.map((m) => ({
          member_id: m.member_id,
          user_id: m.user_id,
          display_name: m.display_name,
          role: m.role,
        }))
      : null,
    learningScores: manager ? sampleLearningScores() : null,
    learningItems,
    content,
    onboarding: {
      cohortName: `${year} analyst class`,
      gateEnabled: true,
      tasks: ONBOARDING.map(([n, t, gate, done]) => ({
        id: `sample-onb-task-${String(n).padStart(3, '0')}`,
        assignment_id: `sample-onb-assignment-${String(n).padStart(3, '0')}`,
        title: t,
        is_gate: gate,
        sort_order: n - 1,
        done,
        is_demo: true,
      })),
    },
    grades: { hidden: false, grades: own.grades },
  };
}
