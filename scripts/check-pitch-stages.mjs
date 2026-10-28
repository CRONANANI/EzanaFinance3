#!/usr/bin/env node
/* Pitch pipeline: stage-vocabulary guard + gate/permission regressions.
   Usage: node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-pitch-stages.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { STAGES } from '../src/lib/pitch/stages.js';
import { evaluateGates, allGatesPass } from '../src/lib/pitch/gates.js';
import { buildPitchPermissions } from '../src/lib/org-pitch-api-helpers.js';

const SRC = new URL('../src/', import.meta.url).pathname;
const STAGE_SET = new Set(STAGES);

// The guard enforces the pitch pipeline's own stage vocabulary, so it scans the
// pitch domain only. (org_applicants.stage is a separate ATS field with its own
// values like 'offer'/'accepted' and is deliberately out of scope.)
const SCAN_DIRS = ['lib/pitch', 'components/org/pitches', 'app/api/org/pitches'];
const SCAN_FILES = [
  'lib/org-pitch-api-helpers.js',
  'lib/org-pitch-state-machine.js',
  'lib/org-pitch-notifications.js',
  'lib/org-pitches.js',
  'lib/org-pitch-permissions.js',
];

function walk(dir) {
  const out = [];
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else if (/\.(js|jsx)$/.test(ent.name)) out.push(p);
  }
  return out;
}

function pitchFiles() {
  const files = [];
  for (const d of SCAN_DIRS) files.push(...walk(path.join(SRC, d)));
  for (const f of SCAN_FILES) files.push(path.join(SRC, f));
  return files;
}

// Strip block and line comments so commented-out vocabulary is ignored.
function stripComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

// A stage literal is a single-quoted value in one of these stage contexts.
function stageLiterals(code) {
  const found = [];
  const push = (re) => {
    let m;
    while ((m = re.exec(code))) found.push({ value: m[1] });
  };
  push(/\bto_stage:\s*'([^']+)'/g);
  push(/\bstage:\s*'([^']+)'/g);
  push(/\bstage\s*===\s*'([^']+)'/g);
  push(/\bstage\s*!==\s*'([^']+)'/g);
  push(/\btoStage\s*===\s*'([^']+)'/g);
  // Elements of an inline array literal fed to `.includes(... stage ...)`.
  const incl = /\[([^\]]*)\]\.includes\(([^)]*)\)/g;
  let m;
  while ((m = incl.exec(code))) {
    if (!/stage/.test(m[2])) continue;
    const arr = m[1];
    const str = /'([^']+)'/g;
    let s;
    while ((s = str.exec(arr))) found.push({ value: s[1] });
  }
  return found;
}

test('every stage literal in src is a known STAGE', () => {
  const offenders = [];
  for (const file of pitchFiles()) {
    const code = stripComments(readFileSync(file, 'utf8'));
    for (const { value } of stageLiterals(code)) {
      if (!STAGE_SET.has(value)) offenders.push(`${file.replace(SRC, 'src/')}: '${value}'`);
    }
  }
  assert.equal(offenders.length, 0, `Non-STAGE literals found:\n${offenders.join('\n')}`);
});

// ── Gate engine ──────────────────────────────────────────────────────────────
function icGate(ctx) {
  return evaluateGates('ic_vote', { stage: 'ic_vote' }, ctx);
}

test('ic_vote gates: quorum + closed + carried all pass', () => {
  const gates = icGate({ votesCast: 3, quorumNeeded: 3, voteClosed: true, votePassed: true });
  assert.equal(allGatesPass(gates), true);
});

test('ic_vote gates: a vote that did not carry fails vote_passed', () => {
  const gates = icGate({ votesCast: 3, quorumNeeded: 3, voteClosed: true, votePassed: false });
  assert.equal(allGatesPass(gates), false);
  assert.equal(gates.find((g) => g.id === 'vote_passed').status, 'fail');
});

test('ic_vote gates: an open vote leaves vote_closed pending', () => {
  const gates = icGate({ votesCast: 3, quorumNeeded: 3, voteClosed: false, votePassed: false });
  assert.equal(gates.find((g) => g.id === 'vote_closed').status, 'pending');
});

// ── Sign-off default scales to the eligible senior count ─────────────────────
function signoffGate(ctx) {
  return evaluateGates('screening', { stage: 'screening' }, ctx).find(
    (g) => g.id === 'senior_analyst_signoffs',
  );
}

test('sign-offs: two approvals (one in-desk) pass with two eligible seniors', () => {
  const gate = signoffGate({
    eligibleSeniorCount: 2,
    signoffs: [
      { decision: 'approve', in_desk: true },
      { decision: 'approve', in_desk: false },
    ],
  });
  assert.equal(gate.status, 'pass');
});

test('sign-offs: two approvals fail when five seniors are eligible', () => {
  const gate = signoffGate({
    eligibleSeniorCount: 5,
    signoffs: [
      { decision: 'approve', in_desk: true },
      { decision: 'approve', in_desk: false },
    ],
  });
  assert.notEqual(gate.status, 'pass');
});

// ── Permissions ──────────────────────────────────────────────────────────────
test('buildPitchPermissions: voting at ic_vote, uploads through pitch_scheduled', () => {
  assert.equal(buildPitchPermissions({ status: 'active', stage: 'ic_vote' }).can_vote, true);
  assert.equal(
    buildPitchPermissions({ status: 'active', stage: 'deep_dive' }).can_upload_deliverable,
    true,
  );
});
