/**
 * Ezana Sonar analyst skills: progressive disclosure of each analyst's methodology.
 *
 * The text comes from the generated bundle (skills.generated.js, built from
 * sonar-skills/<skill>/SKILL.md by scripts/build-sonar-skills.mjs). The methodology basis
 * section is excluded at build time and cannot be requested here.
 *
 *   loadSkill('fx-currency-analysis', { mode: 'quick' })
 *     -> "## Definitions that must not be confused\n...\n\n## Mandatory checks\n..."
 *
 * Modes load only what a run needs:
 *   quick     definitions + mandatory checks (appended to the quick synthesis prompt)
 *   standard  + procedure, interpretation, output contract, missing data
 *   deep      every shipped section
 * An explicit `sections` list overrides the mode. Sections always come out in template order.
 *
 * Pure. Client-safe. Tested in scripts/check-sonar-skills.mjs.
 */
import { ANALYSTS } from './registry.js';
import { SECTION_ORDER, SECTION_TITLES, SKILL_META, SKILL_SECTIONS } from './skills.generated.js';

const QUICK = ['definitions', 'mandatoryChecks'];
const STANDARD = [...QUICK, 'procedure', 'interpretation', 'outputContract', 'missingData'];

/** Section keys per mode. Frozen; deep is every shipped section. */
export const SKILL_SECTIONS_BY_MODE = Object.freeze({
  quick: Object.freeze([...QUICK]),
  standard: Object.freeze([...STANDARD]),
  deep: Object.freeze([...SECTION_ORDER]),
});

export { SECTION_ORDER, SECTION_TITLES };

/** True when the bundle holds this skill id. */
export function hasSkill(id) {
  return Object.prototype.hasOwnProperty.call(SKILL_SECTIONS, id);
}

/** Frontmatter and title for a skill id, or null. */
export function skillMeta(id) {
  return hasSkill(id) ? SKILL_META[id] : null;
}

/** The skill id a registry analyst loads, or null for an unknown analyst. */
export function skillForAnalyst(analystId) {
  const skill = ANALYSTS[analystId]?.skill;
  return skill && hasSkill(skill) ? skill : null;
}

/** The ordered section keys a call would load (mode, or an explicit override). */
export function sectionsFor({ sections = null, mode = 'standard' } = {}) {
  const wanted =
    Array.isArray(sections) && sections.length
      ? new Set(sections)
      : new Set(SKILL_SECTIONS_BY_MODE[mode] || SKILL_SECTIONS_BY_MODE.standard);
  return SECTION_ORDER.filter((k) => wanted.has(k));
}

/**
 * The joined text of the sections a run needs, each under its "## " heading.
 * Returns '' for an unknown skill. Unknown section keys (including the excluded
 * methodology basis) are ignored.
 * @param {string} id  skill id, e.g. 'fx-currency-analysis'
 * @param {{ sections?: string[], mode?: 'quick'|'standard'|'deep', headings?: boolean }} [opts]
 */
export function loadSkill(id, { sections = null, mode = 'standard', headings = true } = {}) {
  if (!hasSkill(id)) return '';
  const body = SKILL_SECTIONS[id];
  return sectionsFor({ sections, mode })
    .filter((k) => body[k])
    .map((k) => (headings ? `## ${SECTION_TITLES[k]}\n${body[k]}` : body[k]))
    .join('\n\n');
}
