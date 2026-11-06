/**
 * Sonar analyst evaluations, deterministic part (Phase 4.1). Runs in CI.
 *
 *   node --no-warnings --import ./scripts/register-sonar-loader.mjs scripts/check-sonar-analyst-evals.mjs
 *     [--analyst <id>]   only cases owned by that analyst's skill
 *     [--quiet]          table only (no per-case lines for unreviewed failures)
 *     [--json <file>]    also write every case result as JSON
 *
 * Loads every sonar-skills/<skill>/tests/evaluation-cases.json and, for each case, builds the
 * routing plan with the engine's own deterministic pipeline (scripts/lib/sonar-eval-cases.mjs:
 * understand -> research mode -> lite resolution -> research spec -> macro route -> router),
 * then checks:
 *   case      the case itself is well formed: known analysts and capabilities, and a
 *             supporting list the mode budget can hold (quick 0, standard 2, deep 3; the red
 *             team runs in deep mode only)
 *   lead      the router's lead is the case's lead. A case led by the research director
 *             expects no specialist lead; a case led by the red team expects the red team in
 *             the controls
 *   support   every supporting specialist is activated; every supporting control role runs
 *   boundary  when the case's own analyst is not in its lead or supporting list (a stay-out
 *             case), that analyst is not activated. Not applicable to the director and the
 *             auditor, which run on every standard and deep question
 *   mustUse   every capability exists in dataset-capabilities.js and is in the plan (the
 *             union of the assignments' capabilities)
 *   compute   every mustCompute names a function exported by src/lib/sonar/analysts/quant.js
 *             (reported as pending while quant.js does not exist)
 *
 * Cases with `reviewed: false` print but never fail. Any reviewed case that fails a check
 * (pending excluded) exits 1.
 */
import { writeFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { ROOT, loadEvalCases, loadPipeline, planCase } from './lib/sonar-eval-cases.mjs';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const ONLY = opt('--analyst');
const QUIET = flag('--quiet');
const JSON_OUT = opt('--json');

const MODES = new Set(['quick', 'standard', 'deep']);
const BUDGET = { quick: 0, standard: 2, deep: 3 };
const ALWAYS_ON = new Set(['research-director', 'methodology-auditor']);
const CHECKS = ['case', 'lead', 'support', 'boundary', 'mustUse', 'compute'];

/* quant.js is being written concurrently: a missing module is "pending", a module that
   exists but fails to load is a failure. */
async function loadQuant() {
  const file = path.join(ROOT, 'src/lib/sonar/analysts/quant.js');
  if (!existsSync(file))
    return { status: 'pending', note: 'quant.js not present yet', exports: null };
  try {
    const mod = await import('@/lib/sonar/analysts/quant');
    return { status: 'loaded', note: null, exports: mod };
  } catch (e) {
    return { status: 'error', note: `quant.js failed to load: ${e?.message || e}`, exports: null };
  }
}

function lintCase(c, p) {
  const problems = [];
  if (!MODES.has(c.mode)) problems.push(`unknown mode ${c.mode}`);
  const ids = [c.lead, ...(c.supporting || [])];
  for (const id of ids) if (!p.ANALYSTS[id]) problems.push(`unknown analyst ${id}`);
  for (const cap of c.mustUse || [])
    if (!p.CAPABILITIES[cap]) problems.push(`unknown capability ${cap}`);
  const specialists = (c.supporting || []).filter((id) => p.SPECIALIST_IDS.includes(id));
  /* A control-led case puts its specialists in lead + supporting. */
  const leadIsControl = p.CONTROL_IDS.includes(c.lead);
  const supportSlots = specialists.length - (leadIsControl && specialists.length ? 1 : 0);
  if (MODES.has(c.mode) && supportSlots > BUDGET[c.mode])
    problems.push(
      `${supportSlots} supporting specialists exceed the ${c.mode} budget of ${BUDGET[c.mode]}`,
    );
  if (ids.includes('red-team') && c.mode !== 'deep')
    problems.push(`red team in ${c.mode} mode (deep only)`);
  return problems;
}

function evaluate(c, plan, p, quant) {
  const r = plan.routing;
  const leadId = r.lead?.id || null;
  const supporting = r.supporting.map((s) => s.id);
  const activated = new Set([leadId, ...supporting, ...r.controls].filter(Boolean));
  const out = {};
  const fail = (check, msg) => {
    out[check] = { ok: false, msg };
  };
  const ok = (check) => {
    if (!out[check]) out[check] = { ok: true };
  };

  const lint = lintCase(c, p);
  if (lint.length) fail('case', lint.join('; '));
  else ok('case');

  /* lead */
  if (c.lead === 'research-director') {
    if (leadId) fail('lead', `expected no specialist lead; got ${leadId}`);
  } else if (c.lead === 'red-team') {
    if (!r.controls.includes('red-team'))
      fail('lead', `expected the red team in controls; got ${r.controls.join(', ')}`);
  } else if (leadId !== c.lead) {
    fail('lead', `expected ${c.lead}; got ${leadId || 'none'}`);
  }
  ok('lead');

  /* support */
  const leadIsControl = p.CONTROL_IDS.includes(c.lead);
  const missing = [];
  for (const id of c.supporting || []) {
    if (p.CONTROL_IDS.includes(id)) {
      if (!r.controls.includes(id)) missing.push(`${id} (control)`);
    } else if (!(supporting.includes(id) || (leadIsControl && leadId === id))) missing.push(id);
  }
  if (missing.length)
    fail('support', `missing ${missing.join(', ')}; got [${supporting.join(', ')}]`);
  ok('support');

  /* boundary */
  const involved = [c.lead, ...(c.supporting || [])].includes(c.owner);
  if (!involved && c.owner && !ALWAYS_ON.has(c.owner)) {
    if (activated.has(c.owner)) fail('boundary', `${c.owner} activated on a stay-out case`);
    ok('boundary');
  } else out.boundary = { ok: true, na: true };

  /* mustUse */
  const planned = new Set(plan.plannedCapabilities);
  const unplanned = (c.mustUse || []).filter((cap) => !planned.has(cap));
  if (unplanned.length) fail('mustUse', `not planned: ${unplanned.join(', ')}`);
  ok('mustUse');

  /* compute */
  if (quant.status === 'pending') out.compute = { ok: true, pending: true, msg: quant.note };
  else if (quant.status === 'error') fail('compute', quant.note);
  else {
    const absent = (c.mustCompute || []).filter((fn) => typeof quant.exports[fn] !== 'function');
    if (absent.length) fail('compute', `not exported by quant.js: ${absent.join(', ')}`);
    ok('compute');
  }

  const failed = CHECKS.filter((k) => out[k] && !out[k].ok);
  return { checks: out, failed, pass: failed.length === 0 };
}

const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);

async function main() {
  const p = await loadPipeline();
  const quant = await loadQuant();
  let cases = loadEvalCases();
  if (ONLY) cases = cases.filter((c) => c.owner === ONLY || c.skill === ONLY);
  if (!cases.length) {
    console.error(`check-sonar-analyst-evals: no cases${ONLY ? ` for ${ONLY}` : ''}`);
    process.exit(1);
  }

  const results = [];
  for (const c of cases) {
    // eslint-disable-next-line no-await-in-loop
    const plan = await planCase(c);
    const res = evaluate(c, plan, p, quant);
    results.push({
      id: c.id,
      owner: c.owner,
      skill: c.skill,
      mode: c.mode,
      reviewed: c.reviewed === true,
      question: c.question,
      expected: { lead: c.lead, supporting: c.supporting },
      got: {
        lead: plan.routing.lead?.id || null,
        supporting: plan.routing.supporting.map((s) => s.id),
        controls: plan.routing.controls,
        org: Boolean(plan.ctx.orgId),
      },
      ...res,
    });
  }

  /* Per-analyst table (by the analyst whose skill owns the case). */
  const owners = [...new Set(results.map((r) => r.owner))].sort();
  const cell = (rows, k) => {
    const applicable = rows.filter((r) => !r.checks[k]?.na && !r.checks[k]?.pending);
    if (!applicable.length) return rows.some((r) => r.checks[k]?.pending) ? 'pending' : 'n/a';
    return `${applicable.filter((r) => r.checks[k].ok).length}/${applicable.length}`;
  };
  const header = ['analyst', 'cases', ...CHECKS, 'pass', 'reviewed fail'];
  const widths = [22, 5, 7, 7, 7, 8, 7, 7, 7, 13];
  const line = (cols) =>
    cols.map((c, i) => (i === 0 ? pad(c, widths[i]) : padL(c, widths[i]))).join('  ');
  console.log('\nSonar analyst evals (deterministic)\n');
  console.log(line(header));
  console.log(line(widths.map((w) => '-'.repeat(w))));
  const totalRows = [];
  for (const o of owners) {
    const rows = results.filter((r) => r.owner === o);
    totalRows.push(...rows);
    console.log(
      line([
        o,
        rows.length,
        ...CHECKS.map((k) => cell(rows, k)),
        `${rows.filter((r) => r.pass).length}/${rows.length}`,
        rows.filter((r) => r.reviewed && !r.pass).length,
      ]),
    );
  }
  console.log(line(widths.map((w) => '-'.repeat(w))));
  console.log(
    line([
      'total',
      totalRows.length,
      ...CHECKS.map((k) => cell(totalRows, k)),
      `${totalRows.filter((r) => r.pass).length}/${totalRows.length}`,
      totalRows.filter((r) => r.reviewed && !r.pass).length,
    ]),
  );
  if (quant.status !== 'loaded') console.log(`\ncompute: ${quant.status} (${quant.note})`);

  const reviewedFailures = results.filter((r) => r.reviewed && !r.pass);
  const unreviewedFailures = results.filter((r) => !r.reviewed && !r.pass);
  const describe = (r) =>
    `  ${r.reviewed ? 'FAIL' : 'warn'} ${r.id} [${r.mode}] ${r.failed
      .map((k) => `${k}: ${r.checks[k].msg}`)
      .join(' | ')}\n       "${r.question}"`;
  if (unreviewedFailures.length && !QUIET) {
    console.log(`\nUnreviewed cases failing (${unreviewedFailures.length}, informational):`);
    unreviewedFailures.forEach((r) => console.log(describe(r)));
  }
  if (reviewedFailures.length) {
    console.log(`\nReviewed cases failing (${reviewedFailures.length}):`);
    reviewedFailures.forEach((r) => console.log(describe(r)));
  }
  const reviewed = results.filter((r) => r.reviewed).length;
  console.log(
    `\n${results.length} cases, ${reviewed} reviewed; ${results.filter((r) => r.pass).length} pass; ` +
      `${reviewedFailures.length} reviewed failure(s).`,
  );
  if (JSON_OUT) {
    writeFileSync(JSON_OUT, `${JSON.stringify({ quant: quant.status, results }, null, 2)}\n`);
    console.log(`wrote ${JSON_OUT}`);
  }
  if (reviewedFailures.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
