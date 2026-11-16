#!/usr/bin/env node
/* Cohorts (/org-team-hub/cohorts) regression suite: graduation scoped to the
   cohort being graduated, the dialog's list equal to what the server
   graduates, new cohorts not made current, blind screening redacted in every
   response, onboarding scoped to the cohort, alumni placements only from what
   is stored, and the sample bundle applying the same rules.
   Usage: node --no-warnings --test scripts/check-org-cohorts.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createMockSupabase } from './lib/mock-supabase.mjs';
import {
  graduatesOf,
  handoffStatus,
  isPublishedHandoff,
  loadGraduation,
  sameMemberSet,
} from '../src/lib/org-cohort-graduation.js';
import { blindIdFor, scoresView, shapeApplicant } from '../src/lib/org-ats.js';
import {
  alumniSummary,
  defaultCohortId,
  effectiveLifecycle,
  filterRoster,
  lifecycleActions,
  readAddress,
} from '../src/lib/org-cohorts-model.js';
import { buildCohortsSample, sampleRespond } from '../src/lib/org-cohorts-sample.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

/* ── Graduation ─────────────────────────────────────────────────────────── */
const MEMBERS = [
  {
    id: 'a',
    user_id: 'ua',
    display_name: 'A',
    cohort_id: 'c1',
    is_active: true,
    is_graduating: true,
  },
  {
    id: 'b',
    user_id: 'ub',
    display_name: 'B',
    cohort_id: 'c1',
    is_active: true,
    lifecycle_status: 'graduating',
  },
  { id: 'c', user_id: 'uc', display_name: 'C', cohort_id: 'c1', is_active: true },
  {
    id: 'd',
    user_id: 'ud',
    display_name: 'D',
    cohort_id: 'c2',
    is_active: true,
    is_graduating: true,
  },
  {
    id: 'e',
    user_id: 'ue',
    display_name: 'E',
    cohort_id: 'c1',
    is_active: false,
    is_graduating: true,
  },
];

test('graduation takes only flagged, active members of the cohort being graduated', () => {
  assert.deepEqual(
    graduatesOf(MEMBERS, 'c1').map((m) => m.id),
    ['a', 'b'],
  );
  assert.deepEqual(
    graduatesOf(MEMBERS, 'c2').map((m) => m.id),
    ['d'],
  );
  assert.deepEqual(graduatesOf(MEMBERS, null), []);
});

test('handoff check: a covered sector needs a published handoff by that member', () => {
  const grads = graduatesOf(MEMBERS, 'c1');
  const coverage = [
    { member_id: 'a', sector: 'Financials' },
    { member_id: 'b', sector: 'Energy' },
    { member_id: 'd', sector: 'Utilities' },
  ];
  const notes = [
    { author_id: 'ua', sector: 'financials', doc_type: 'handoff', status: 'published' },
    { author_id: 'ub', sector: 'Energy', doc_type: 'thesis', status: 'published' },
  ];
  const gate = handoffStatus({ grads, coverage, notes });
  assert.equal(gate.required, 2, 'a sector covered by another cohort never counts');
  assert.equal(gate.published, 1);
  assert.deepEqual(gate.missing, [{ member_id: 'b', member_name: 'B', sector: 'Energy' }]);
  assert.equal(gate.members.length, 2);
  const hidden = handoffStatus({ grads, coverage, notes, showHandoffs: false });
  assert.equal(hidden.members[0].sectors[0].published, null);
  assert.equal(isPublishedHandoff({ tags: ['Handoff'], published_at: '2026-01-01' }), true);
  assert.equal(isPublishedHandoff({ doc_type: 'handoff', status: 'draft' }), false);
});

test('loadGraduation reads only the cohort’s members (the preview and the archive share it)', async () => {
  const db = createMockSupabase({
    seed: {
      org_members: MEMBERS.map((m) => ({ ...m, org_id: 'o1' })),
      org_sector_coverage: [
        { org_id: 'o1', member_id: 'a', sector: 'Financials' },
        { org_id: 'o1', member_id: 'd', sector: 'Utilities' },
      ],
      org_research_notes: [],
    },
  });
  const { grads, gate, roster } = await loadGraduation(db, 'o1', 'c1');
  assert.deepEqual(grads.map((m) => m.id).sort(), ['a', 'b']);
  assert.ok(roster.every((m) => m.cohort_id === 'c1'));
  assert.deepEqual(
    gate.missing.map((m) => m.member_id),
    ['a'],
  );
});

test('sameMemberSet compares ids regardless of order', () => {
  assert.equal(sameMemberSet(['a', 'b'], ['b', 'a']), true);
  assert.equal(sameMemberSet(['a'], ['a', 'b']), false);
});

test('the archive route graduates the shared list and refuses when it changed', () => {
  const src = read('src/app/api/org/cohorts/[id]/archive/route.js');
  assert.match(src, /loadGraduation\(supabase, orgId, id\)/);
  assert.match(src, /expected_member_ids/);
  assert.match(src, /roster_changed/);
  assert.doesNotMatch(src, /\.filter\(\(m\) => m\.is_graduating\)/, 'no council-wide sweep');
});

/* ── New cohort is not current ──────────────────────────────────────────── */
test('creating a cohort does not make it current', () => {
  const dialog = read('src/components/org/cohorts/CohortDialogs.jsx');
  const create = dialog.slice(
    dialog.indexOf('export function NewCohortDialog'),
    dialog.indexOf('export function SetCurrentDialog'),
  );
  assert.doesNotMatch(create, /is_current/);
  const b = buildCohortsSample({ userId: 'u', memberId: 'me', role: 'executive' });
  const before = b.cohorts.find((c) => c.is_current).id;
  const res = sampleRespond(b, {
    method: 'POST',
    url: '/api/org/cohorts',
    body: { name: 'New class' },
  });
  assert.equal(res.status, 200);
  assert.equal(res.json.cohort.is_current, false);
  assert.equal(res.bundle.cohorts.find((c) => c.is_current).id, before);
  const set = sampleRespond(res.bundle, {
    method: 'PATCH',
    url: '/api/org/cohorts',
    body: { cohort_id: res.json.cohort.id, is_current: true },
  });
  assert.deepEqual(
    set.bundle.cohorts.filter((c) => c.is_current).map((c) => c.id),
    [res.json.cohort.id],
    'Set as current leaves exactly one current cohort',
  );
});

/* ── Blind screening ────────────────────────────────────────────────────── */
test('blind screening strips name, initials, program and files before the interview', () => {
  const a = {
    id: '00000000-0000-4000-a000-000000000123',
    stage: 'screened',
    full_name: 'Jane Doe',
    email: 'j@x.edu',
    program: 'Economics',
    resume_url: 'https://x/r.pdf',
  };
  const blind = shapeApplicant(a, { blind: true });
  assert.equal(blind.full_name, null);
  assert.equal(blind.initials, null);
  assert.equal(blind.email, null);
  assert.equal(blind.program, null);
  assert.equal(blind.resume_url, null);
  assert.equal(blind.blind_id, 'A-0123');
  assert.doesNotMatch(JSON.stringify(blind), /Jane|Doe|JD|Economics/);
  const open = shapeApplicant({ ...a, stage: 'interview' }, { blind: true });
  assert.equal(open.full_name, 'Jane Doe');
  assert.equal(blindIdFor(a.id), blind.blind_id, 'the ID is the same for every viewer');
});

test('moving a blinded applicant does not return the name', () => {
  const src = read('src/app/api/org/applicants/[id]/route.js');
  assert.match(src, /shapeApplicant\(data, \{ blind \}\)/);
  const b = buildCohortsSample({ userId: 'u', memberId: 'me', role: 'executive' });
  const target = b.applicants.find((x) => x.stage === 'applied');
  const res = sampleRespond(b, {
    method: 'PATCH',
    url: `/api/org/applicants/${target.id}`,
    body: { stage: 'screened' },
  });
  assert.equal(res.status, 200);
  assert.equal(res.json.applicant.full_name, null);
  const board = sampleRespond(b, {
    method: 'GET',
    url: `/api/org/applicants?cohort_id=${target.cohort_id}`,
  });
  for (const x of board.json.applicants.filter((y) => y.blinded)) {
    assert.equal(x.full_name, null);
    assert.equal(x.initials, null);
  }
});

test('anti-anchoring: notes of others stay locked until the viewer submits', () => {
  const rows = [
    { interviewer_id: 'p1', criterion: 'technical', score: 4, notes: 'n1', submitted_at: 't' },
    { interviewer_id: 'me', criterion: 'technical', score: 3, notes: null, submitted_at: null },
  ];
  const v1 = scoresView(rows, { memberId: 'me', role: 'analyst' });
  assert.equal(v1.others[0].locked, true);
  assert.deepEqual(v1.others[0].rows, []);
  const v2 = scoresView(
    rows.map((r) => (r.interviewer_id === 'me' ? { ...r, submitted_at: 't' } : r)),
    { memberId: 'me', role: 'analyst' },
  );
  assert.equal(v2.others[0].locked, false);
  assert.equal(
    scoresView([rows[0]], { memberId: 'pm', role: 'portfolio_manager' }).others[0].locked,
    false,
  );
});

test('the application form shows no public link', () => {
  for (const f of ['RecruitmentTab.jsx', 'ApplicantDialogs.jsx']) {
    const src = read(`src/components/org/cohorts/${f}`);
    assert.doesNotMatch(src, /public_slug|\/apply\//);
  }
});

/* ── Onboarding scoped to the cohort ────────────────────────────────────── */
test('onboarding lists only this cohort’s onboarding members', () => {
  const src = read('src/app/api/org/cohorts/[id]/onboarding/route.js');
  assert.match(src, /m\.lifecycle_status === 'onboarding' && m\.cohort_id === id/);
  const b = buildCohortsSample({ userId: 'u', memberId: 'me', role: 'executive' });
  for (const c of b.cohorts) {
    const res = sampleRespond(b, { method: 'GET', url: `/api/org/cohorts/${c.id}/onboarding` });
    const ids = new Set(b.members.filter((m) => m.cohort_id === c.id).map((m) => m.id));
    assert.ok(
      res.json.members.every((m) => ids.has(m.id)),
      c.name,
    );
  }
});

/* ── Roster and lifecycle ───────────────────────────────────────────────── */
test('a member flagged on the Org Chart reads Graduating', () => {
  assert.equal(
    effectiveLifecycle({ lifecycle_status: 'active', is_graduating: true }),
    'graduating',
  );
  assert.equal(
    effectiveLifecycle({ lifecycle_status: 'departed', is_graduating: true }),
    'departed',
  );
  assert.equal(effectiveLifecycle({ is_active: false }), 'departed');
  assert.match(read('src/app/api/org/cohorts/[id]/roster/route.js'), /effectiveLifecycle\(m\)/);
  assert.deepEqual(
    lifecycleActions('graduating').map((a) => a.to),
    ['departed'],
  );
  assert.deepEqual(lifecycleActions('alumni'), []);
});

test('roster sort keeps missing ratings last both ways', () => {
  const rows = [
    { display_name: 'A', rating: null, sectors: [] },
    { display_name: 'B', rating: 1300, sectors: [] },
    { display_name: 'C', rating: 1200, sectors: [] },
  ];
  assert.deepEqual(
    filterRoster(rows, { sort: { key: 'rating', dir: 1 } }).map((r) => r.display_name),
    ['C', 'B', 'A'],
  );
  assert.deepEqual(
    filterRoster(rows, { sort: { key: 'rating', dir: -1 } }).map((r) => r.display_name),
    ['B', 'C', 'A'],
  );
});

test('default cohort per tab and the address', () => {
  const list = [
    { id: 'r', status: 'recruiting' },
    { id: 'cur', status: 'active', is_current: true },
  ];
  assert.equal(defaultCohortId(list, 'roster'), 'cur');
  assert.equal(defaultCohortId(list, 'recruitment'), 'r');
  assert.deepEqual(readAddress('?cohort=x&tab=alumni'), { cohort: 'x', tab: 'alumni' });
  assert.deepEqual(readAddress('?tab=nope'), { cohort: null, tab: null });
});

/* ── Alumni placements only from what is stored ─────────────────────────── */
test('placements: only stored industries are destinations; ties read Tied', () => {
  const s = alumniSummary([
    { employer_industry: 'am', placed_within_6mo: true, engagement_flags: ['mentor'] },
    { employer_industry: 'ib', placed_within_6mo: true, engagement_flags: [] },
    { employer_industry: null, placed_within_6mo: null, engagement_flags: [] },
  ]);
  assert.deepEqual(s.destinations.map((d) => d.key).sort(), ['am', 'ib']);
  assert.equal(s.unrecorded, 1);
  assert.equal(s.top.label, 'Tied');
  assert.equal(s.placedFinancePct, 67);
  assert.equal(s.engaged, 1);
  assert.equal(alumniSummary([]).top, null);
  const route = read('src/app/api/org/alumni/placement/route.js');
  assert.doesNotMatch(route, /Undisclosed|'unknown'/);
  assert.match(route, /unrecorded/);
});

/* ── Sample bundle ──────────────────────────────────────────────────────── */
test('sample: graduating a class takes only its flagged members, as the dialog lists', () => {
  const b = buildCohortsSample({ userId: 'u', memberId: 'me', role: 'executive' });
  const current = b.cohorts.find((c) => c.is_current);
  const preview = sampleRespond(b, {
    method: 'GET',
    url: `/api/org/cohorts/${current.id}/graduation`,
  }).json;
  const ids = preview.members.map((m) => m.member_id);
  assert.ok(ids.length > 0);
  const flaggedElsewhere = b.members.filter((m) => m.is_graduating && m.cohort_id !== current.id);
  assert.ok(flaggedElsewhere.length > 0, 'the sample has a flagged member in another cohort');
  const refused = sampleRespond(b, {
    method: 'POST',
    url: `/api/org/cohorts/${current.id}/archive`,
    body: { graduate: true, expected_member_ids: ids },
  });
  assert.equal(refused.status, 409, 'a missing handoff needs the override');
  const stale = sampleRespond(b, {
    method: 'POST',
    url: `/api/org/cohorts/${current.id}/archive`,
    body: { graduate: true, force: true, expected_member_ids: [...ids, flaggedElsewhere[0].id] },
  });
  assert.equal(stale.json.gate, 'roster_changed');
  const done = sampleRespond(b, {
    method: 'POST',
    url: `/api/org/cohorts/${current.id}/archive`,
    body: { graduate: true, force: true, expected_member_ids: ids },
  });
  assert.equal(done.status, 200);
  assert.equal(done.json.graduated, ids.length);
  for (const m of flaggedElsewhere) {
    const after = done.bundle.members.find((x) => x.id === m.id);
    assert.equal(after.is_active, true, `${m.display_name} of another cohort stays`);
  }
  assert.equal(done.bundle.cohorts.find((c) => c.id === current.id).is_current, false);
  assert.ok(
    b.cohorts.find((c) => c.id === current.id).is_current,
    'the original bundle is untouched',
  );
});

test('sample: rights match the routes', () => {
  const analyst = buildCohortsSample({ userId: 'u', memberId: 'me', role: 'analyst' });
  const c = analyst.cohorts[0];
  assert.equal(
    sampleRespond(analyst, { method: 'POST', url: '/api/org/cohorts', body: { name: 'x' } }).status,
    403,
  );
  assert.equal(
    sampleRespond(analyst, { method: 'POST', url: `/api/org/cohorts/${c.id}/archive`, body: {} })
      .status,
    403,
  );
  assert.equal(
    sampleRespond(analyst, {
      method: 'POST',
      url: '/api/org/applicants',
      body: { full_name: 'x', cohort_id: c.id },
    }).status,
    403,
  );
  const board = sampleRespond(analyst, {
    method: 'GET',
    url: `/api/org/applicants?cohort_id=${c.id}`,
  });
  assert.equal(board.json.applicants.length, 0, 'an analyst sees only applicants they scored');
});

test('sample: provisional ratings are marked the same way everywhere', () => {
  const b = buildCohortsSample({ userId: 'u', memberId: 'me', role: 'executive' });
  for (const r of b.ratings) {
    if (r.rating != null) assert.equal(r.is_provisional, r.rated_thesis_count < 10, r.member_id);
  }
  for (const a of b.alumni) {
    if (a.final_rating != null)
      assert.ok(a.final_pitch_count >= 10, 'a frozen rating comes from 10 or more pitches');
  }
  const json = JSON.stringify(b);
  assert.doesNotMatch(json, new RegExp(String.fromCharCode(0x2014)), 'no em dashes');
  assert.ok(b.members.every((m) => m.is_demo) && b.applicants.every((a) => a.is_demo));
});
