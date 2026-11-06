/**
 * Compiles Sonar's runtime methodology skills into one client-safe module.
 *
 *   node scripts/build-sonar-skills.mjs           write src/lib/sonar/analysts/skills.generated.js
 *   node scripts/build-sonar-skills.mjs --check   exit 1 if the committed file is stale
 *
 * Reads every `sonar-skills/<skill>/SKILL.md` (frontmatter `name`, `analyst`, `version`,
 * `description`, then `## ` sections) and emits the sections keyed by skill id, then by a
 * stable camelCase section key. The "Methodology basis (internal, never sent to the model)"
 * section is dropped entirely: it never reaches the bundle, so it can never reach a prompt.
 *
 * The build fails (exit 1) when a skill:
 *   - is missing a template section, or has a section outside the template;
 *   - contains an em dash (U+2014) anywhere in the file;
 *   - names a person or a book in any section that ships (the methodology basis is exempt
 *     because it is excluded; it lists official public documentation only).
 *
 * Output is deterministic (sorted skill ids and section keys) and formatted with the repo's
 * prettier config, so `--check` is byte-exact. Sonar's runtime never reads sonar-skills/ from
 * disk; it reads the generated module through src/lib/sonar/analysts/skills.js.
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SKILLS_DIR = path.join(ROOT, 'sonar-skills');
export const OUT_FILE = path.join(ROOT, 'src/lib/sonar/analysts/skills.generated.js');

/** The standard section template, in document order: [key, heading]. */
export const TEMPLATE = [
  ['objective', 'Objective'],
  ['whenLeads', 'When this analyst leads, supports, or stays out'],
  ['requiredEvidence', 'Required evidence'],
  ['optionalEvidence', 'Optional evidence'],
  ['definitions', 'Definitions that must not be confused'],
  ['procedure', 'Analytical procedure'],
  ['calculations', 'Calculations (performed by the quantitative engine)'],
  ['mandatoryChecks', 'Mandatory checks'],
  ['commonMistakes', 'Common mistakes to avoid'],
  ['interpretation', 'Interpretation principles'],
  ['outputContract', 'Output contract'],
  ['missingData', 'When data is missing or stale'],
  ['dataLimits', "Known limits of Ezana's data for this discipline"],
  ['methodologyBasis', 'Methodology basis (internal, never sent to the model)'],
];
/** Never shipped. */
export const EXCLUDED_SECTIONS = new Set(['methodologyBasis']);

const EM_DASH = String.fromCharCode(0x2014);
export const NAME_RE =
  /\b(dalio|keynes|minsky|friedman|hayek|krugman|roubini|rogoff|reinhart|kindleberger|soros|bernanke|summers|damodaran|graham|buffett|lynch|fama|french|sharpe|markowitz|taleb|shiller|mises|fisher|samuelson|piketty)\b/i;
export const BOOK_RE = /\b(playbook|book|textbook)\b/i;
/* Text that legitimately uses those words and is removed before the book check:
   code spans and fenced code, Ezana file names (playbook.js is a module, not a book), and
   the portfolio sense of "book" (the org position book, the fund's current book) unless it
   is followed by a word that signals a publication. */
const CODE_FENCE_RE = /```[\s\S]*?```/g;
const CODE_SPAN_RE = /`[^`\n]*`/g;
const FILE_NAME_RE = /\b[\w-]+\.(?:m?js|ts|json|md|sql)\b/gi;
const PORTFOLIO_BOOK_RE =
  /\b(?:org position|position|order|current|the fund's|the|our|its) book\b(?!\s+(?:by|says|argues|describes|explains|written|titled))/gi;

function scrubForBookCheck(text) {
  return text
    .replace(CODE_FENCE_RE, ' ')
    .replace(CODE_SPAN_RE, ' ')
    .replace(FILE_NAME_RE, ' ')
    .replace(PORTFOLIO_BOOK_RE, ' ');
}

/** Parses one SKILL.md into { meta, title, sections: { key: text } } plus parse problems. */
export function parseSkill(source, dirName) {
  const problems = [];
  const text = source.replace(/\r\n/g, '\n');
  const fm = text.match(/^---\n([\s\S]*?)\n---\n/);
  const meta = {};
  if (!fm) problems.push('missing frontmatter');
  else {
    for (const line of fm[1].split('\n')) {
      const m = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
      if (m) meta[m[1]] = m[2].trim();
    }
  }
  for (const k of ['name', 'analyst', 'version']) {
    if (!meta[k]) problems.push(`frontmatter missing "${k}"`);
  }
  if (meta.name && meta.name !== dirName)
    problems.push(`name "${meta.name}" != folder "${dirName}"`);
  const body = fm ? text.slice(fm[0].length) : text;
  const title = (body.match(/^#\s+(.+)$/m) || [])[1]?.trim() || '';

  const byHeading = new Map(TEMPLATE.map(([key, heading]) => [heading, key]));
  const sections = {};
  const parts = body.split(/^## /m).slice(1);
  for (const part of parts) {
    const nl = part.indexOf('\n');
    const heading = (nl === -1 ? part : part.slice(0, nl)).trim();
    const content = (nl === -1 ? '' : part.slice(nl + 1)).trim();
    const key = byHeading.get(heading);
    if (!key) {
      problems.push(`section outside the template: "## ${heading}"`);
      continue;
    }
    if (sections[key] !== undefined) problems.push(`duplicate section "## ${heading}"`);
    if (!content) problems.push(`empty section "## ${heading}"`);
    sections[key] = content;
  }
  for (const [key, heading] of TEMPLATE) {
    if (sections[key] === undefined) problems.push(`missing template section "## ${heading}"`);
  }
  return { meta, title, sections, problems };
}

/** House-rule checks: em dash anywhere; person or book names in shipped sections. */
export function lintSkill(source, parsed) {
  const problems = [];
  if (source.includes(EM_DASH)) {
    const lines = source.split('\n');
    lines.forEach((l, i) => {
      if (l.includes(EM_DASH)) problems.push(`em dash on line ${i + 1}`);
    });
  }
  for (const [key, heading] of TEMPLATE) {
    if (EXCLUDED_SECTIONS.has(key)) continue;
    const content = parsed.sections[key];
    if (!content) continue;
    const name = content.match(NAME_RE);
    if (name) problems.push(`names a person ("${name[0]}") in "## ${heading}"`);
    const book = scrubForBookCheck(content).match(BOOK_RE);
    if (book) problems.push(`names a book ("${book[0]}") in "## ${heading}"`);
  }
  return problems;
}

/** Reads and validates every skill. Returns { skills, errors }. */
export function collectSkills(dir = SKILLS_DIR) {
  const errors = [];
  const skills = {};
  const dirs = readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  for (const id of dirs) {
    const file = path.join(dir, id, 'SKILL.md');
    if (!existsSync(file)) {
      errors.push(`${id}: no SKILL.md`);
      continue;
    }
    const source = readFileSync(file, 'utf8');
    const parsed = parseSkill(source, id);
    const problems = [...parsed.problems, ...lintSkill(source, parsed)];
    problems.forEach((p) => errors.push(`${id}: ${p}`));
    skills[id] = parsed;
  }
  return { skills, errors };
}

const sortObject = (o) =>
  Object.fromEntries(
    Object.keys(o)
      .sort()
      .map((k) => [k, o[k]]),
  );

/** The generated module's source, prettier-formatted. */
export async function renderModule(skills) {
  const sections = {};
  const meta = {};
  for (const id of Object.keys(skills).sort()) {
    const s = skills[id];
    const kept = {};
    for (const [key] of TEMPLATE) {
      if (EXCLUDED_SECTIONS.has(key)) continue;
      kept[key] = s.sections[key];
    }
    sections[id] = sortObject(kept);
    meta[id] = sortObject({
      analyst: s.meta.analyst,
      description: s.meta.description || '',
      name: s.meta.name,
      title: s.title,
      version: s.meta.version,
    });
  }
  const shipped = TEMPLATE.filter(([key]) => !EXCLUDED_SECTIONS.has(key));
  const src = `/* GENERATED by scripts/build-sonar-skills.mjs from sonar-skills/<skill>/SKILL.md. Do not edit.
   Rebuild with \`npm run build:sonar-skills\`. The methodology basis section is excluded by design.
   Read it through src/lib/sonar/analysts/skills.js (loadSkill), not directly. */

/** Section keys in template order (methodology basis excluded). */
export const SECTION_ORDER = ${JSON.stringify(shipped.map(([key]) => key))};

/** The heading each section key carries in SKILL.md. */
export const SECTION_TITLES = ${JSON.stringify(sortObject(Object.fromEntries(shipped)))};

/** Frontmatter and title per skill id. */
export const SKILL_META = ${JSON.stringify(meta)};

/** Section text per skill id, then section key. */
export const SKILL_SECTIONS = ${JSON.stringify(sections)};
`;
  const config = (await prettier.resolveConfig(OUT_FILE)) || {};
  return prettier.format(src, { ...config, filepath: OUT_FILE });
}

async function main() {
  const check = process.argv.includes('--check');
  const { skills, errors } = collectSkills();
  if (errors.length) {
    console.error(`build-sonar-skills: ${errors.length} problem(s)`);
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  const out = await renderModule(skills);
  const rel = path.relative(ROOT, OUT_FILE);
  if (check) {
    const current = existsSync(OUT_FILE) ? readFileSync(OUT_FILE, 'utf8') : '';
    if (current !== out) {
      console.error(`build-sonar-skills: ${rel} is stale. Run npm run build:sonar-skills.`);
      process.exit(1);
    }
    console.log(`build-sonar-skills: ${rel} is current (${Object.keys(skills).length} skills).`);
    return;
  }
  writeFileSync(OUT_FILE, out);
  console.log(`build-sonar-skills: wrote ${rel} (${Object.keys(skills).length} skills).`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
