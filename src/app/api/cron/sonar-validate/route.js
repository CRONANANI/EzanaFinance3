import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { cronRoute } from '@/lib/cron/with-cron-lock';
import { planAdaptive } from '@/lib/sonar/adaptive/router';
import { runAdaptive } from '@/lib/sonar/adaptive/orchestrator';
import { sanitizeThread } from '@/lib/sonar/adaptive/thread-context';
import { ADAPTIVE_BUDGET_MS, adaptiveRunDeps } from '@/lib/sonar/adaptive/runtime';
import {
  VALIDATION_SET,
  FOLLOW_UP_CHAINS,
  checkReport,
  passed,
} from '@/lib/sonar/adaptive/validation-set';

/**
 * Sonar production validation (Nov 2026). Scheduled; CRON_SECRET only (cronRoute).
 *
 * Works runs an operator queued in sonar_validation_runs (service role only). For each
 * question: the same planner, executors, readers, model and per-scenario budgets as
 * /api/sonar/landing-query (shared through adaptive/runtime.js). There is no user account and
 * no ping reservation, so no customer is charged and no user data is read. A council overlay
 * needs an organization member and is recorded as not run here; tenant isolation is checked
 * by database role tests instead.
 *
 * Writes only to sonar_validation_results and sonar_validation_runs. Records which flags are
 * set and whether each provider key is present, never a value.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const RUN_BUDGET_MS = 255_000;
const DEFAULT_BUDGET_MS = 45_000;

function items(run) {
  const only = run.only_items?.length ? new Set(run.only_items) : null;
  const single = VALIDATION_SET.filter((v) => !only || only.has(v.id)).map((v) => ({
    item: v.id,
    question: v.q,
    expect: v,
  }));
  const chains = run.include_chains
    ? FOLLOW_UP_CHAINS.flatMap((c, ci) =>
        c.steps.map(([question, id], si) => ({
          item: `chain${ci + 1}.${si + 1}`,
          question,
          expect: { id },
          chain: ci,
          step: si,
        })),
      )
    : [];
  return [...single, ...chains];
}

function environment() {
  const present = (k) => Boolean(process.env[k]);
  return {
    commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
    deployment: process.env.VERCEL_URL || null,
    region: process.env.VERCEL_REGION || null,
    flags: {
      SONAR_ADAPTIVE: process.env.SONAR_ADAPTIVE ?? '(unset: on)',
      SONAR_ADAPTIVE_STREAM: process.env.SONAR_ADAPTIVE_STREAM ?? '(unset: on)',
    },
    keys_present: {
      anthropic: present('ANTHROPIC_API_KEY'),
      openai: present('OPENAI_API_KEY'),
      fmp: present('FMP_API_KEY'),
      supabase_service: present('SUPABASE_SERVICE_ROLE_KEY'),
      validation_secret: (process.env.SONAR_VALIDATION_SECRET || '').length >= 32,
    },
  };
}

const sectionSummary = (report) =>
  (report?.sections || []).map((s) => ({
    type: s.type,
    ...(s.rows ? { rows: s.rows.length } : {}),
    ...(s.items ? { items: s.items.length } : {}),
    ...(s.series ? { series: s.series.length, points: s.categories?.length || 0 } : {}),
  }));

async function runOne(admin, it, thread) {
  const t0 = Date.now();
  const plan = planAdaptive(it.question, { thread: thread ? sanitizeThread(thread) : null });
  const base = {
    item: it.item,
    question: it.question,
    expected_scenario: it.expect.id || null,
    planned_scenario: plan?.primaryScenario || null,
    executable: Boolean(plan?.executable),
  };
  if (!plan) return { ...base, ok: false, error: 'not routed to adaptive research', ms: 0 };
  if (!plan.executable) {
    return {
      ...base,
      ok: false,
      ms: Date.now() - t0,
      error: plan.overlay ? 'council overlay: needs an organization member' : 'no executor',
    };
  }
  const budget = ADAPTIVE_BUDGET_MS[plan.primaryScenario] || DEFAULT_BUDGET_MS;
  let report = null;
  let error = null;
  try {
    report = await runAdaptive(plan, adaptiveRunDeps(admin), { deadlineAt: t0 + budget });
  } catch (e) {
    error = String(e?.message || e).slice(0, 300);
  }
  const findings = checkReport(report, { ...it.expect, now: new Date() });
  return {
    report,
    row: {
      ...base,
      ok: !error && Boolean(report) && passed(findings),
      findings,
      ms: Date.now() - t0,
      degraded: report?.telemetry?.degraded || [],
      steps: (report?.telemetry?.steps || []).map((s) => ({
        step: s.step,
        ms: s.ms,
        ok: s.ok,
        ...(s.error ? { error: String(s.error).slice(0, 160) } : {}),
      })),
      model: report?.telemetry?.model || [],
      sections: sectionSummary(report),
      sources: report?.sources?.length || 0,
      error: error || (report ? null : 'no report (executor declined or timed out)'),
    },
  };
}

async function run() {
  const started = Date.now();
  const admin = getAdminClient();
  const { data: runs, error } = await admin
    .from('sonar_validation_runs')
    .select('*')
    .in('status', ['queued', 'running'])
    .order('requested_at', { ascending: true })
    .limit(1);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  const vrun = runs?.[0];
  if (!vrun) return NextResponse.json({ ok: true, idle: true });
  if (vrun.status === 'queued') {
    await admin
      .from('sonar_validation_runs')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
        environment: environment(),
      })
      .eq('id', vrun.id);
  }

  const all = items(vrun);
  const { data: doneRows } = await admin
    .from('sonar_validation_results')
    .select('item')
    .eq('run_id', vrun.id);
  const done = new Set((doneRows || []).map((r) => r.item));
  const threads = new Map(); // chain index -> thread of the previous step, this invocation

  let ran = 0;
  for (const it of all) {
    if (done.has(it.item)) continue;
    // A chain step after the first needs the previous step's thread, which exists only in
    // the invocation that ran it: run a chain from its start in one invocation.
    if (it.chain != null && it.step > 0 && !threads.has(it.chain)) continue;
    const prior = threads.get(it.chain);
    const plan = planAdaptive(it.question, { thread: prior ? sanitizeThread(prior) : null });
    const budget = ADAPTIVE_BUDGET_MS[plan?.primaryScenario] || DEFAULT_BUDGET_MS;
    if (Date.now() - started + budget > RUN_BUDGET_MS) break;
    // eslint-disable-next-line no-await-in-loop
    const out = await runOne(admin, it, threads.get(it.chain) || null);
    const row = out.row || out;
    if (it.chain != null) threads.set(it.chain, out.report?.thread || null);
    // eslint-disable-next-line no-await-in-loop
    await admin
      .from('sonar_validation_results')
      .upsert({ run_id: vrun.id, ...row }, { onConflict: 'run_id,item' });
    ran += 1;
  }

  // A chain whose later steps were skipped because its start ran in an earlier invocation
  // is restarted next time: clear its partial rows so it runs whole.
  const { data: rows } = await admin
    .from('sonar_validation_results')
    .select('item, ok, ms, degraded, model, planned_scenario, expected_scenario, error')
    .eq('run_id', vrun.id);
  const have = new Set((rows || []).map((r) => r.item));
  const partialChains = FOLLOW_UP_CHAINS.map((c, ci) => ({
    ci,
    keys: c.steps.map((_, si) => `chain${ci + 1}.${si + 1}`),
  })).filter(
    ({ keys }) =>
      vrun.include_chains && keys.some((k) => have.has(k)) && !keys.every((k) => have.has(k)),
  );
  if (ran === 0 && partialChains.length) {
    for (const { keys } of partialChains) {
      // eslint-disable-next-line no-await-in-loop
      await admin.from('sonar_validation_results').delete().eq('run_id', vrun.id).in('item', keys);
    }
  }

  const remaining = all.filter((it) => !have.has(it.item)).length;
  if (remaining === 0) {
    const list = rows || [];
    const ms = list.map((r) => r.ms || 0).sort((a, b) => a - b);
    const pct = (p) => (ms.length ? ms[Math.min(ms.length - 1, Math.floor(p * ms.length))] : null);
    const summary = {
      items: list.length,
      passed: list.filter((r) => r.ok).length,
      failed: list.filter((r) => !r.ok).length,
      routed_as_expected: list.filter((r) => r.planned_scenario === r.expected_scenario).length,
      degraded: list.filter((r) => (r.degraded || []).length).length,
      latency_ms: { p50: pct(0.5), p90: pct(0.9), max: ms.at(-1) ?? null },
      model_calls: list.reduce((n, r) => n + (r.model || []).length, 0),
      input_tokens: list.reduce(
        (n, r) => n + (r.model || []).reduce((m, c) => m + (c.inputTokens || 0), 0),
        0,
      ),
      output_tokens: list.reduce(
        (n, r) => n + (r.model || []).reduce((m, c) => m + (c.outputTokens || 0), 0),
        0,
      ),
      web_searches: list.reduce(
        (n, r) => n + (r.model || []).reduce((m, c) => m + (c.webSearches || 0), 0),
        0,
      ),
    };
    await admin
      .from('sonar_validation_runs')
      .update({ status: 'done', finished_at: new Date().toISOString(), summary })
      .eq('id', vrun.id);
    console.log('[sonar-validate] done', vrun.id, JSON.stringify(summary));
    return NextResponse.json({ ok: true, run: vrun.id, done: true, summary });
  }
  console.log(`[sonar-validate] ${vrun.id} ran ${ran}, ${remaining} left`);
  return NextResponse.json({ ok: true, run: vrun.id, ran, remaining });
}

export const GET = cronRoute('sonar-validate', run, { ttlSeconds: 300 });
