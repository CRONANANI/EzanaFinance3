#!/usr/bin/env node
/**
 * Live validation of Sonar adaptive research against a deployed app (Nov 2026).
 *
 *   node scripts/validate-sonar-adaptive.mjs              # plan only: what a run would do and cost
 *   node scripts/validate-sonar-adaptive.mjs --run        # execute against SONAR_BASE_URL
 *   node scripts/validate-sonar-adaptive.mjs --run --only B06,C02
 *   node scripts/validate-sonar-adaptive.mjs --run --kill-switch   # deployment has SONAR_ADAPTIVE=off
 *
 * Environment (never written to the report, never echoed):
 *   SONAR_BASE_URL              the deployment to test, e.g. a Vercel preview URL
 *   NEXT_PUBLIC_SUPABASE_URL    the project URL (public)
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY  the anon key (public)
 *   SONAR_VALIDATION_EMAIL      a dedicated test account
 *   SONAR_VALIDATION_PASSWORD   its password
 *   SONAR_VALIDATION_SECRET     optional; must equal the deployment's value. With it the route
 *                               returns each run's audit trail (steps, model usage, ledger row)
 *   SONAR_PRICE_IN_PER_M, SONAR_PRICE_OUT_PER_M, SONAR_PRICE_PER_SEARCH  optional, to turn
 *                               token counts into dollars
 *
 * What a run changes in production, all on the test account:
 *   - one ledger row (sonar_queries) per ping, counted against that account's daily cap
 *   - nothing else: no saved research, no profile change, no other user's data
 * What it spends: one model call (with web search) for each scenario marked model: true, plus
 * the market-data and news requests each scenario makes. The plan mode prints the totals.
 *
 * The script never prints a token, a password or the secret, and writes its findings to
 * validation/sonar-adaptive-<date>.md and .json.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  VALIDATION_SET,
  FOLLOW_UP_CHAINS,
  checkReport,
  modelCost,
  passed,
} from './lib/sonar-validation.mjs';

const args = new Set(process.argv.slice(2));
const argValue = (name) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : null;
};
const only =
  argValue('--only')
    ?.split(',')
    .map((s) => s.trim().toUpperCase()) || null;
const set = VALIDATION_SET.filter((c) => !only || only.includes(c.id));
const chains = args.has('--no-chains') || only ? [] : FOLLOW_UP_CHAINS;
const env = process.env;
const price = {
  inPerM: env.SONAR_PRICE_IN_PER_M ? Number(env.SONAR_PRICE_IN_PER_M) : null,
  outPerM: env.SONAR_PRICE_OUT_PER_M ? Number(env.SONAR_PRICE_OUT_PER_M) : null,
  perSearch: env.SONAR_PRICE_PER_SEARCH ? Number(env.SONAR_PRICE_PER_SEARCH) : null,
};

function plan() {
  const chainPings = chains.reduce((s, c) => s + c.steps.length, 0);
  const pings = set.length + chainPings + (args.has('--kill-switch') ? 0 : 1);
  const modelCalls = set.filter((c) => c.model).length + chains.length * 2;
  console.log(`Sonar adaptive validation: plan

Target            ${env.SONAR_BASE_URL || '(SONAR_BASE_URL not set)'}
Test account      ${env.SONAR_VALIDATION_EMAIL ? 'set' : 'NOT SET'}
Audit trail       ${env.SONAR_VALIDATION_SECRET ? 'requested (needs the same secret on the deployment)' : 'not requested: latency only, no step timings, usage or ledger checks'}

Pings             ${pings} (${set.length} questions, ${chainPings} follow-up steps, 1 unavailable-data probe)
Ledger rows       ${pings}, all on the test account, each counted against its daily cap
Model calls       about ${modelCalls}, each with web search
Other mutations   none

Nothing has been sent. Re-run with --run to execute.`);
}

async function signIn() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon || !env.SONAR_VALIDATION_EMAIL || !env.SONAR_VALIDATION_PASSWORD)
    throw new Error(
      'Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SONAR_VALIDATION_EMAIL and SONAR_VALIDATION_PASSWORD.',
    );
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anon, 'content-type': 'application/json' },
    body: JSON.stringify({
      email: env.SONAR_VALIDATION_EMAIL,
      password: env.SONAR_VALIDATION_PASSWORD,
    }),
  });
  if (!res.ok) throw new Error(`Sign-in failed (${res.status}). Check the test account.`);
  const body = await res.json();
  if (!body.access_token) throw new Error('Sign-in returned no session.');
  return body.access_token;
}

async function ping(token, query, thread = null) {
  const t0 = Date.now();
  const res = await fetch(`${env.SONAR_BASE_URL.replace(/\/$/, '')}/api/sonar/landing-query`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
      ...(env.SONAR_VALIDATION_SECRET ? { 'x-sonar-validation': env.SONAR_VALIDATION_SECRET } : {}),
    },
    body: JSON.stringify({ query, formats: ['adaptive'], ...(thread ? { thread } : {}) }),
  });
  const ms = Date.now() - t0;
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* not JSON: reported below */
  }
  return { status: res.status, ms, body };
}

async function linkOk(url) {
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(12000),
      headers: { 'user-agent': 'EzanaSonarValidation/1.0' },
    });
    return res.status < 400 || res.status === 403; // some publishers refuse scripts; a 403 is not a dead link
  } catch {
    return false;
  }
}

async function run() {
  if (!env.SONAR_BASE_URL) throw new Error('Set SONAR_BASE_URL to the deployment under test.');
  const token = await signIn();
  const results = [];
  let lastUsed = null;
  const record = async (label, expect, query, thread = null) => {
    const r = await ping(token, query, thread);
    const report = r.body?.adaptive || null;
    const v = r.body?.validation || null;
    const findings = [];
    if (r.status !== 200)
      findings.push({
        level: 'fail',
        check: 'http',
        detail: `status ${r.status}: ${r.body?.error || ''}`,
      });
    if (args.has('--kill-switch')) {
      if (report)
        findings.push({
          level: 'fail',
          check: 'kill-switch',
          detail: 'an adaptive report was returned with the switch off',
        });
      else if (!r.body?.answer && !r.body?.sections && !r.body?.research && !r.body?.exemplary)
        findings.push({
          level: 'warn',
          check: 'kill-switch',
          detail: 'no adaptive report, and the fallback answer shape was not recognised',
        });
    } else {
      findings.push(...checkReport(report, expect));
      if (report && args.has('--links'))
        for (const s of (report.sources || []).filter((x) => x.url).slice(0, 6))
          if (!(await linkOk(s.url)))
            findings.push({
              level: 'fail',
              check: 'links',
              detail: `source ${s.id} did not open: ${s.url}`,
            });
    }
    /* Charged once: the account's count for the day rises by exactly one per ping. */
    let charged = 'not verified (no audit trail)';
    if (v?.ledger?.usedToday != null) {
      if (lastUsed != null && v.ledger.usedToday !== lastUsed + 1)
        findings.push({
          level: 'fail',
          check: 'charge',
          detail: `daily count went ${lastUsed} to ${v.ledger.usedToday} for one ping`,
        });
      charged =
        lastUsed == null ? 'baseline' : v.ledger.usedToday === lastUsed + 1 ? 'once' : 'MISMATCH';
      lastUsed = v.ledger.usedToday;
    } else if (v === null && report) lastUsed = null;
    const usage = modelCost(v?.telemetry?.model || [], price);
    results.push({
      label,
      query,
      expected: expect.id || null,
      scenario: report?.scenario?.id || null,
      evidence: report?.plan?.requiredEvidence || [],
      sections: (report?.sections || []).map((s) => s.type),
      sources: (report?.sources || []).length,
      degraded: report?.degraded || [],
      ms: r.ms,
      steps: (v?.telemetry?.steps || []).map((s) => ({ step: s.step, ms: s.ms, ok: s.ok })),
      usage,
      charged,
      findings,
      ok: passed(findings),
    });
    process.stdout.write(
      `${passed(findings) ? 'ok  ' : 'FAIL'} ${label.padEnd(14)} ${String(r.ms).padStart(6)} ms  ${report?.scenario?.id || '-'}\n`,
    );
    return report;
  };

  for (const c of set) await record(c.key, c, c.q);
  for (const chain of chains) {
    let thread = null;
    for (const [q, id] of chain.steps) {
      const report = await record(`chain:${id}`, { id }, q, thread);
      thread = report?.thread || thread;
      if (thread && !thread.subject && !thread.person)
        results
          .at(-1)
          .findings.push({
            level: 'warn',
            check: 'thread',
            detail: 'the answer carries no subject for the next follow-up',
          });
    }
  }
  if (!args.has('--kill-switch')) {
    /* Unavailable data: a ticker with no prices must give a truthful state or fall back. */
    const r = await ping(token, 'Is ZZZZQ technically oversold?');
    const rep = r.body?.adaptive;
    const honest = !rep || /not available right now/i.test(rep.sections?.[0]?.headline || '');
    results.push({
      label: 'unavailable',
      query: 'Is ZZZZQ technically oversold?',
      scenario: rep?.scenario?.id || null,
      ms: r.ms,
      sections: (rep?.sections || []).map((s) => s.type),
      findings: honest
        ? []
        : [
            {
              level: 'fail',
              check: 'unavailable',
              detail: 'an unknown ticker produced an answer with content',
            },
          ],
      ok: honest,
      usage: modelCost([]),
      charged: 'n/a',
      steps: [],
      degraded: [],
      sources: 0,
      evidence: [],
    });
    process.stdout.write(`${honest ? 'ok  ' : 'FAIL'} unavailable\n`);
  }
  return results;
}

function writeReport(results) {
  const day = new Date().toISOString().slice(0, 10);
  const dir = path.join(process.cwd(), 'validation');
  fs.mkdirSync(dir, { recursive: true });
  const host = new URL(env.SONAR_BASE_URL).host;
  const total = results.reduce(
    (s, r) => ({
      in: s.in + r.usage.tokensIn,
      out: s.out + r.usage.tokensOut,
      searches: s.searches + r.usage.searches,
      usd: r.usage.usd == null ? s.usd : (s.usd || 0) + r.usage.usd,
    }),
    { in: 0, out: 0, searches: 0, usd: null },
  );
  const lat = results.map((r) => r.ms).sort((a, b) => a - b);
  const pct = (p) => lat[Math.min(lat.length - 1, Math.floor(lat.length * p))];
  const md = [
    `# Sonar adaptive: live validation, ${day}`,
    '',
    `Target: ${host}. Mode: ${args.has('--kill-switch') ? 'kill switch (SONAR_ADAPTIVE=off expected)' : 'adaptive on'}. Audit trail: ${env.SONAR_VALIDATION_SECRET ? 'yes' : 'no'}.`,
    '',
    `**${results.filter((r) => r.ok).length} of ${results.length} checks passed.** Latency: median ${pct(0.5)} ms, p90 ${pct(0.9)} ms, max ${lat.at(-1)} ms. Model: ${total.in.toLocaleString('en-US')} tokens in, ${total.out.toLocaleString('en-US')} out, ${total.searches} searches${total.usd != null ? `, about $${total.usd.toFixed(2)}` : ''}.`,
    '',
    '| Check | Expected | Got | ms | Sources | Charged | Degraded | Result |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...results.map(
      (r) =>
        `| ${r.label} | ${r.expected || ''} | ${r.scenario || 'none'} | ${r.ms} | ${r.sources} | ${r.charged} | ${(r.degraded || []).join(', ') || 'none'} | ${r.ok ? 'pass' : 'FAIL'} |`,
    ),
    '',
    '## Findings',
    '',
    ...results.flatMap((r) =>
      r.findings.length
        ? [
            `**${r.label}** (${r.query})`,
            ...r.findings.map((f) => `- ${f.level}: ${f.check}: ${f.detail}`),
            '',
          ]
        : [],
    ),
  ].join('\n');
  fs.writeFileSync(path.join(dir, `sonar-adaptive-${day}.md`), `${md}\n`);
  fs.writeFileSync(
    path.join(dir, `sonar-adaptive-${day}.json`),
    `${JSON.stringify({ day, host, results }, null, 2)}\n`,
  );
  console.log(`\nWrote validation/sonar-adaptive-${day}.md`);
}

if (!args.has('--run')) plan();
else {
  try {
    const results = await run();
    writeReport(results);
    process.exit(results.every((r) => r.ok) ? 0 : 1);
  } catch (e) {
    console.error(`Validation could not run: ${e.message}`);
    process.exit(2);
  }
}
