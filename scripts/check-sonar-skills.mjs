/**
 * Sonar skill bundle: the generated module is current, never carries the methodology basis,
 * loads the right sections per mode, holds no em dash or person/book names, and covers every
 * registry analyst.
 *   node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-sonar-skills.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  collectSkills,
  parseSkill,
  lintSkill,
  NAME_RE,
  OUT_FILE,
  TEMPLATE,
} from './build-sonar-skills.mjs';
import { ANALYSTS } from '../src/lib/sonar/analysts/registry.js';
import {
  loadSkill,
  skillForAnalyst,
  sectionsFor,
  hasSkill,
  SKILL_SECTIONS_BY_MODE,
  SECTION_ORDER,
  SECTION_TITLES,
} from '../src/lib/sonar/analysts/skills.js';
import { SKILL_SECTIONS, SKILL_META } from '../src/lib/sonar/analysts/skills.generated.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASIS_HEADING = 'Methodology basis';

test('the generated bundle is current (build-sonar-skills --check)', () => {
  /* Throws (non-zero exit) when the file is stale or a skill fails the house rules. */
  execFileSync(process.execPath, [path.join(ROOT, 'scripts/build-sonar-skills.mjs'), '--check'], {
    cwd: ROOT,
    stdio: 'pipe',
  });
});

test('every skill passes the template and house rules', () => {
  const { skills, errors } = collectSkills();
  assert.deepEqual(errors, []);
  assert.equal(Object.keys(skills).length, 21);
});

test('the methodology basis is never in the bundle', () => {
  const generated = readFileSync(OUT_FILE, 'utf8');
  assert.ok(!generated.includes(BASIS_HEADING), 'basis heading leaked into the bundle');
  assert.ok(!SECTION_ORDER.includes('methodologyBasis'));
  const { skills } = collectSkills();
  for (const [id, s] of Object.entries(skills)) {
    assert.equal(SKILL_SECTIONS[id].methodologyBasis, undefined, id);
    /* No basis bullet line survives anywhere in the generated text. */
    for (const line of s.sections.methodologyBasis
      .split('\n')
      .filter((l) => l.trim().length > 20)) {
      const body = JSON.stringify(SKILL_SECTIONS[id]);
      assert.ok(
        !body.includes(JSON.stringify(line.trim()).slice(1, -1)),
        `${id}: basis line leaked: ${line}`,
      );
    }
    for (const mode of ['quick', 'standard', 'deep']) {
      assert.ok(!loadSkill(id, { mode }).includes(BASIS_HEADING), `${id} ${mode}`);
    }
    assert.equal(
      loadSkill(id, { sections: ['methodologyBasis'] }),
      '',
      `${id}: basis is requestable`,
    );
  }
});

test('mode section sets', () => {
  assert.deepEqual([...SKILL_SECTIONS_BY_MODE.quick], ['definitions', 'mandatoryChecks']);
  assert.deepEqual([...SKILL_SECTIONS_BY_MODE.standard].sort(), [
    'definitions',
    'interpretation',
    'mandatoryChecks',
    'missingData',
    'outputContract',
    'procedure',
  ]);
  const expectedDeep = TEMPLATE.map(([k]) => k).filter((k) => k !== 'methodologyBasis');
  assert.deepEqual([...SKILL_SECTIONS_BY_MODE.deep], expectedDeep);
  assert.equal(SECTION_ORDER.length, 13);

  const id = 'fx-currency-analysis';
  const quick = loadSkill(id, { mode: 'quick' });
  assert.ok(quick.startsWith(`## ${SECTION_TITLES.definitions}\n`));
  assert.ok(quick.includes(`## ${SECTION_TITLES.mandatoryChecks}\n`));
  assert.ok(!quick.includes(`## ${SECTION_TITLES.procedure}`));
  const standard = loadSkill(id, { mode: 'standard' });
  for (const k of SKILL_SECTIONS_BY_MODE.standard)
    assert.ok(standard.includes(`## ${SECTION_TITLES[k]}\n`), k);
  assert.ok(!standard.includes(`## ${SECTION_TITLES.calculations}`));
  assert.ok(!standard.includes(`## ${SECTION_TITLES.dataLimits}`));
  const deep = loadSkill(id, { mode: 'deep' });
  for (const k of SECTION_ORDER) assert.ok(deep.includes(`## ${SECTION_TITLES[k]}\n`), k);
  assert.ok(quick.length < standard.length && standard.length < deep.length);

  /* Explicit sections override the mode and keep template order. */
  assert.deepEqual(sectionsFor({ sections: ['outputContract', 'objective'], mode: 'quick' }), [
    'objective',
    'outputContract',
  ]);
  const two = loadSkill(id, { sections: ['outputContract', 'objective'] });
  assert.ok(two.indexOf('## Objective') < two.indexOf('## Output contract'));
  assert.equal(
    loadSkill(id, { sections: ['objective'], headings: false }),
    SKILL_SECTIONS[id].objective,
  );
  /* Unknown mode falls back to standard; unknown skill is empty. */
  assert.equal(loadSkill(id, { mode: 'nope' }), standard);
  assert.equal(loadSkill('no-such-skill'), '');
});

test('no em dash or person/book names in anything shipped', () => {
  const all = JSON.stringify(SKILL_SECTIONS) + JSON.stringify(SKILL_META);
  assert.ok(!all.includes(String.fromCharCode(0x2014)), 'em dash in bundle');
  for (const [id, sections] of Object.entries(SKILL_SECTIONS)) {
    for (const [k, text] of Object.entries(sections))
      assert.ok(!NAME_RE.test(text), `${id}.${k} names a person`);
  }
});

test('the linter catches the violations it exists for', () => {
  const head = '---\nname: x\nanalyst: macroeconomist\nversion: 1.0.0\n---\n\n# X\n\n';
  const body = (over = {}) =>
    head + TEMPLATE.map(([k, h]) => `## ${h}\n${over[k] ?? 'Plain original text.'}\n`).join('\n');
  const lint = (src) => {
    const p = parseSkill(src, 'x');
    return [...p.problems, ...lintSkill(src, p)];
  };
  assert.deepEqual(lint(body()), []);
  assert.ok(
    lint(body({ objective: 'Per Minsky, stability breeds instability.' })).some((e) =>
      e.includes('person'),
    ),
  );
  assert.ok(
    lint(body({ procedure: 'Follow the textbook approach.' })).some((e) => e.includes('book')),
  );
  assert.ok(
    lint(body({ procedure: 'As the book by a famous author says.' })).some((e) =>
      e.includes('book'),
    ),
  );
  assert.ok(
    lint(body({ objective: `A ${String.fromCharCode(0x2014)} B` })).some((e) =>
      e.includes('em dash'),
    ),
  );
  /* Allowed: code module names, the portfolio sense of "book", names in the excluded basis. */
  assert.deepEqual(
    lint(body({ calculations: 'assessCurrencyPressure in playbook.js and `playbook.js`.' })),
    [],
  );
  assert.deepEqual(
    lint(body({ procedure: 'Map each rule to the org position book and the current book.' })),
    [],
  );
  assert.deepEqual(lint(body({ methodologyBasis: 'Official documentation (not Keynes).' })), []);
  /* Missing and unknown sections. */
  const missing = body().replace(/## Mandatory checks\n[^\n]*\n/, '');
  assert.ok(
    lint(missing).some((e) => e.includes('missing template section "## Mandatory checks"')),
  );
  assert.ok(lint(`${body()}\n## Extra\ntext\n`).some((e) => e.includes('outside the template')));
});

test('every registry analyst loads a skill that exists in the bundle', () => {
  for (const a of Object.values(ANALYSTS)) {
    assert.ok(hasSkill(a.skill), `${a.id}: skill ${a.skill} not in bundle`);
    assert.equal(skillForAnalyst(a.id), a.skill);
    assert.equal(SKILL_META[a.skill].analyst, a.id, `${a.skill}: frontmatter analyst != ${a.id}`);
    assert.ok(loadSkill(a.skill, { mode: 'quick' }).length > 100, a.id);
  }
  assert.equal(skillForAnalyst('nobody'), null);
});
