#!/usr/bin/env node
/* QA org batch (ORG-6, ORG-7, ORG-9, ORG-10, ORG-12, ORG-15): pure helpers and
   mocked-Supabase checks for the org surface.
   Usage: node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-org-qa.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTeamCalendar, teamHubEyebrow } from '../src/lib/org-team-calendar.js';

const NOW = Date.parse('2026-10-25T12:00:00Z');

/* ── ORG-6: Team Hub calendar from real data ─────────────────────────── */

test('ORG-6: calendar merges meetings, tasks and assignment due dates, sorted', () => {
  const items = buildTeamCalendar({
    now: NOW,
    teams: [{ teamId: 't1', name: 'Tech Desk' }],
    meetings: [
      { id: 'm1', title: 'IC', status: 'scheduled', scheduled_at: '2026-10-28T15:00:00Z' },
      { id: 'm2', title: 'Old', status: 'closed', scheduled_at: '2026-10-27T15:00:00Z' },
      { id: 'm3', title: 'No date', status: 'scheduled', scheduled_at: null },
    ],
    tasks: [
      { id: 'k1', title: 'Model', status: 'pending', due_date: '2026-10-26', team_id: 't1' },
      { id: 'k2', title: 'Done', status: 'completed', due_date: '2026-10-26' },
      { id: 'k3', title: 'Past', status: 'pending', due_date: '2026-10-01' },
    ],
    assignments: [
      { id: 'a1', title: 'Memo', status: 'assigned', due_date: '2026-10-25T20:00:00Z' },
      { id: 'a2', title: 'Graded', status: 'graded', due_date: '2026-10-29' },
    ],
  });
  assert.deepEqual(
    items.map((i) => i.id),
    ['asg-a1', 'task-k1', 'mtg-m1'],
  );
  assert.equal(items[1].team, 'Tech Desk');
  assert.equal(items[2].team, 'Fund');
});

test('ORG-6: empty org gets an empty calendar (no mock events)', () => {
  assert.deepEqual(buildTeamCalendar({ now: NOW }), []);
  assert.deepEqual(buildTeamCalendar({ now: NOW, meetings: null, tasks: undefined }), []);
});

test('ORG-6: eyebrow derives the term from the current cohort', () => {
  assert.equal(teamHubEyebrow('Spring 2027'), 'Team Hub · Spring 2027');
  assert.equal(teamHubEyebrow(null), 'Team Hub');
  assert.equal(teamHubEyebrow('  '), 'Team Hub');
});
