/**
 * Shared helpers for Sonar's analyst evaluations (deterministic and offline quality).
 *
 *   loadEvalCases()   every sonar-skills/<skill>/tests/evaluation-cases.json, tagged with the
 *                     skill and the analyst that owns it
 *   planCase(case)    the routing plan the real pipeline would make for the case's question,
 *                     with no database and no model: understandDeterministic -> classifyResearchMode
 *                     -> liteResolution -> buildResearchSpec -> routeMacro -> routeAnalysts
 *
 * The pipeline pieces are the engine's own (imported through the '@/' alias, so run with
 * `--import ./scripts/register-sonar-loader.mjs`). Two inputs are not in the question itself
 * and are set the way a real run sets them:
 *   - mode: the case's `mode` (the user picks the mode; the classifier's operations still apply);
 *   - organization: a first-person fund or portfolio question runs as an org member
 *     (ctx.orgId), as it would from the organization surface; everything else runs without one.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const SKILLS_DIR = path.join(ROOT, 'sonar-skills');
export const EVAL_NOW = new Date('2026-11-06T12:00:00Z');
export const EVAL_ORG_ID = 'org_eval';

/* First-person fund or portfolio wording: the case runs inside an organization. */
const ORG_QUESTION_RE =
  /\b(our|my)\b[^.?!]*\b(fund|portfolio|book|holdings|positions|mandate|ips)\b/i;

export function isOrgQuestion(question) {
  return ORG_QUESTION_RE.test(String(question || ''));
}

/** Reads every evaluation case. Each gets `skill` and `owner` (the skill's analyst id). */
export function loadEvalCases({ dir = SKILLS_DIR } = {}) {
  const out = [];
  const skills = readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  for (const skill of skills) {
    const file = path.join(dir, skill, 'tests', 'evaluation-cases.json');
    if (!existsSync(file)) continue;
    const md = readFileSync(path.join(dir, skill, 'SKILL.md'), 'utf8');
    const owner = (md.match(/^analyst:\s*(\S+)/m) || [])[1] || null;
    const data = JSON.parse(readFileSync(file, 'utf8'));
    const cases = Array.isArray(data) ? data : data.cases || [];
    for (const c of cases) out.push({ ...c, skill, owner });
  }
  return out;
}

let pipeline = null;
/** Lazily imports the engine's deterministic pipeline pieces. */
export async function loadPipeline() {
  if (pipeline) return pipeline;
  const [understand, spec, mode, companies, macro, router, registry, caps] = await Promise.all([
    import('@/lib/sonar/understand'),
    import('@/lib/sonar/engine/research-spec'),
    import('@/lib/sonar/research-mode'),
    import('@/lib/sonar/company-mentions'),
    import('@/lib/sonar/macro/route'),
    import('@/lib/sonar/analysts/analyst-router'),
    import('@/lib/sonar/analysts/registry'),
    import('@/lib/sonar/analysts/dataset-capabilities'),
  ]);
  pipeline = {
    understandDeterministic: understand.understandDeterministic,
    buildResearchSpec: spec.buildResearchSpec,
    classifyResearchMode: mode.classifyResearchMode,
    liteResolution: mode.liteResolution,
    mentionedCompanies: companies.mentionedCompanies,
    routeMacro: macro.routeMacro,
    routeAnalysts: router.routeAnalysts,
    ANALYSTS: registry.ANALYSTS,
    SPECIALIST_IDS: registry.SPECIALIST_IDS,
    CONTROL_IDS: registry.CONTROL_IDS,
    CAPABILITIES: caps.CAPABILITIES,
  };
  return pipeline;
}

/**
 * The routing plan for one case's question.
 * @returns {Promise<{ spec, classification, route, ctx, routing, plannedCapabilities: string[] }>}
 */
export async function planCase(c, { now = EVAL_NOW, orgId } = {}) {
  const p = await loadPipeline();
  const q = c.question;
  const understood = p.understandDeterministic(q);
  const cls = p.classifyResearchMode(q, { understood, now });
  const classification = { ...cls, mode: c.mode || cls.mode };
  const resolution = p.liteResolution(understood, p.mentionedCompanies(q));
  const spec = p.buildResearchSpec(understood, {
    query: q,
    resolution,
    depth: classification.mode,
    now,
    classification: cls,
  });
  const route = p.routeMacro(q);
  const ctx = {
    orgId: orgId !== undefined ? orgId : isOrgQuestion(q) ? EVAL_ORG_ID : null,
    available: null,
  };
  const routing = p.routeAnalysts({ spec, classification, route, ctx });
  const plannedCapabilities = [...new Set(routing.assignments.flatMap((a) => a.capabilities))];
  return { spec, classification, route, ctx, routing, plannedCapabilities };
}
