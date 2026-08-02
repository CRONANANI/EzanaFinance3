/**
 * RAG eval harness (RAG_SYSTEM.md §3 Phase 2).
 *
 *   node --env-file=.env.local scripts/rag-eval/run.mjs [--mode naive|full] [--save]
 *
 * Runs the golden set (scripts/rag-eval/golden.jsonl) through the real
 * `orchestrate` retrieval path and reports hit@k / MRR / NDCG@10 / empty-state
 * precision, per-category and overall. By default BOTH modes run in one
 * invocation so every saved row carries its naive baseline. `--save` inserts a
 * row into public.rag_eval_runs (service-role). No corpus data is mutated.
 *
 * naive  = semantic-only (no lexical merge, no rerank/rewrite) — the baseline.
 * full   = the shipped orchestrate path (hybrid + any enabled flags).
 */
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

// Resolve `@/…` before importing the app graph.
register(pathToFileURL(path.resolve('scripts/rag-eval/alias-hook.mjs')).href);

const { orchestrate } = await import('@/lib/research-copilot/orchestrate.js');
const { getAdminClient } = await import('@/lib/supabase.js');

// ── Metrics ────────────────────────────────────────────────────────────────
export function mrr(ranks) {
  // ranks: 1-based rank of first relevant hit, Infinity if none
  return ranks.reduce((s, r) => s + (Number.isFinite(r) ? 1 / r : 0), 0) / (ranks.length || 1);
}
export function ndcgAt10(relevances) {
  // per-case binary relevance array, length ≤ 10
  const dcg = relevances.reduce((s, rel, i) => s + rel / Math.log2(i + 2), 0);
  const ideal = [...relevances]
    .sort((a, b) => b - a)
    .reduce((s, rel, i) => s + rel / Math.log2(i + 2), 0);
  return ideal > 0 ? dcg / ideal : 0;
}
function hitAt(ranks, k) {
  const hits = ranks.filter((r) => Number.isFinite(r) && r <= k).length;
  return ranks.length ? hits / ranks.length : 0;
}

// ── Relevance matching (portable: id, echo slug, or corpus) ──────────────────
function slugFromUrl(u) {
  const m = /\/ezana-echo\/([^#?]+)/.exec(String(u || ''));
  return m ? m[1] : null;
}
function itemMatches(item, expectedIds) {
  const slug = slugFromUrl(item.url);
  return expectedIds.some(
    (e) => String(item.id) === e || slug === e || item.corpus === e,
  );
}

function loadGolden() {
  const file = path.resolve('scripts/rag-eval/golden.jsonl');
  return readFileSync(file, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

async function evalMode(cases, mode) {
  const admin = getAdminClient();
  const perCat = new Map();
  const adversarial = [];
  const failures = [];

  for (const c of cases) {
    // eslint-disable-next-line no-await-in-loop
    const { items } = await orchestrate(c.query, {
      admin,
      allowCorpora: Array.isArray(c.corpusScope) && c.corpusScope.length ? c.corpusScope : null,
      semanticOnly: mode === 'naive',
      topK: 10,
    });

    if (c.category === 'adversarial') {
      const clean = items.length === 0; // pass = honest empty state
      adversarial.push(clean ? 1 : 0);
      if (!clean) failures.push({ id: c.id, category: c.category, got: items.length });
      continue;
    }

    const expected = c.expectedIds || [];
    const rank = items.findIndex((it) => itemMatches(it, expected));
    const rank1 = rank >= 0 ? rank + 1 : Infinity;
    const relevances = items.slice(0, 10).map((it) => (itemMatches(it, expected) ? 1 : 0));

    if (!perCat.has(c.category)) perCat.set(c.category, { ranks: [], ndcg: [] });
    perCat.get(c.category).ranks.push(rank1);
    perCat.get(c.category).ndcg.push(ndcgAt10(relevances));
    if (!Number.isFinite(rank1)) failures.push({ id: c.id, category: c.category, got: 0 });
  }

  const allRanks = [...perCat.values()].flatMap((v) => v.ranks);
  const allNdcg = [...perCat.values()].flatMap((v) => v.ndcg);
  const emptyStatePrecision = adversarial.length
    ? adversarial.reduce((a, b) => a + b, 0) / adversarial.length
    : null;

  const perCategory = {};
  for (const [cat, v] of perCat) {
    perCategory[cat] = {
      cases: v.ranks.length,
      hitAt1: +hitAt(v.ranks, 1).toFixed(3),
      hitAt3: +hitAt(v.ranks, 3).toFixed(3),
      hitAt6: +hitAt(v.ranks, 6).toFixed(3),
      mrr: +mrr(v.ranks).toFixed(3),
      ndcg10: +(v.ndcg.reduce((a, b) => a + b, 0) / (v.ndcg.length || 1)).toFixed(3),
    };
  }

  return {
    mode,
    cases: cases.length,
    hitRate: {
      k1: +hitAt(allRanks, 1).toFixed(3),
      k3: +hitAt(allRanks, 3).toFixed(3),
      k6: +hitAt(allRanks, 6).toFixed(3),
    },
    mrr: +mrr(allRanks).toFixed(3),
    ndcg10: +(allNdcg.reduce((a, b) => a + b, 0) / (allNdcg.length || 1)).toFixed(3),
    emptyStatePrecision:
      emptyStatePrecision == null ? null : +emptyStatePrecision.toFixed(3),
    adversarialCases: adversarial.length,
    perCategory,
    failures,
  };
}

function printReport(m) {
  console.log(`\n=== RAG eval — mode: ${m.mode} (${m.cases} cases) ===`);
  const rows = Object.entries(m.perCategory).map(([cat, v]) => ({
    category: cat,
    cases: v.cases,
    'hit@1': v.hitAt1,
    'hit@3': v.hitAt3,
    'hit@6': v.hitAt6,
    mrr: v.mrr,
    ndcg10: v.ndcg10,
  }));
  console.table(rows);
  console.log('overall:', {
    'hit@1': m.hitRate.k1,
    'hit@3': m.hitRate.k3,
    'hit@6': m.hitRate.k6,
    mrr: m.mrr,
    ndcg10: m.ndcg10,
    emptyStatePrecision: m.emptyStatePrecision,
  });
  if (m.failures.length) {
    console.log(`misses (${m.failures.length}):`, m.failures.map((f) => f.id).join(', '));
  }
}

function gitSha() {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const modeArg = args.includes('--mode') ? args[args.indexOf('--mode') + 1] : null;
  const save = args.includes('--save');
  const modes = modeArg ? [modeArg] : ['full', 'naive'];

  const cases = loadGolden();
  console.log(`Loaded ${cases.length} golden cases from scripts/rag-eval/golden.jsonl`);

  const out = {};
  for (const mode of modes) {
    // eslint-disable-next-line no-await-in-loop
    out[mode] = await evalMode(cases, mode);
    printReport(out[mode]);
  }

  if (save) {
    const primary = out.full || out[modes[0]];
    const baseline = out.naive || null;
    const config = {
      mode: out.full ? 'full' : modes[0],
      rerank: process.env.RAG_RERANK === '1',
      rewrite: process.env.RAG_REWRITE === '1',
    };
    const metrics = { ...primary, baseline: baseline ? { ...baseline } : undefined };
    const admin = getAdminClient();
    const { error } = await admin
      .from('rag_eval_runs')
      .insert({ git_sha: gitSha(), config, metrics });
    if (error) {
      console.error('save failed:', error.message);
      process.exitCode = 1;
    } else {
      console.log(`\nSaved run to rag_eval_runs (sha ${gitSha()}, config ${JSON.stringify(config)})`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
