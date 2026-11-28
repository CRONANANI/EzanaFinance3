import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { embedViaSupabaseCached } from '@/lib/rag/embed-cached';
import { canonicalIntent, compareIntents } from '@/lib/sonar/semantic/canonical-intent';
import { BENCHMARK_VERSION, GROUPS, HARD_NEGATIVES } from '@/lib/sonar/semantic/benchmark';
import { noisyVariants } from '@/lib/sonar/semantic/noise';
import {
  INTENT_EXEMPLARS,
  INTENT_EXEMPLARS_VERSION,
  MEASURE_MIN_MARGIN,
  MEASURE_MIN_SCORE,
} from '@/lib/sonar/semantic/intent-exemplars';
import { cacheGet, cacheSet, setCacheClient } from '@/lib/sonar/engine/cache';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * GET /api/sonar/semantic-calibration
 *
 * Sonar 6.1 (Nov 28 2026): calibrates the semantic thresholds against the production
 * embedding model (gte-small, 384 dimensions, through the Supabase `embed` function and
 * the query embedding cache), on the fixed, versioned benchmark only. It takes no input,
 * so it cannot be pointed at anyone's text, and it returns similarity statistics, never
 * vectors. The result is cached for 24 hours per benchmark and exemplar version; each
 * text's vector is cached by the embedding cache, so a rerun costs database reads only.
 *
 * Reports, without estimates:
 *   cosine     equivalence decided by cosine similarity alone, at thresholds 0.70 to 0.99
 *              (precision, recall, F1): why similarity alone cannot decide equivalence
 *   structural the canonical intent comparison on the same pairs
 *   measure    the embedding stage's job (filling an unstated ownership measure): accuracy
 *              and coverage over a (min score, margin) grid, and the setting in force
 *   latency    embedding call time and the deterministic canonical intent time
 */

const pairsOf = (n) => {
  const out = [];
  for (let i = 0; i < n; i += 1) for (let j = i + 1; j < n; j += 1) out.push([i, j]);
  return out;
};
const cos = (a, b) => {
  let d = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    d += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? d / Math.sqrt(na * nb) : 0;
};
const pct = (xs, p) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
};
const r3 = (x) => (x == null ? null : Math.round(x * 1000) / 1000);

async function embedAll(texts, deadline) {
  const vecs = new Map();
  const ms = [];
  const queue = [...new Set(texts)];
  const worker = async () => {
    while (queue.length && Date.now() < deadline) {
      const t = queue.shift();
      const t0 = Date.now();
      const v = await embedViaSupabaseCached(t).catch(() => null);
      ms.push(Date.now() - t0);
      if (Array.isArray(v)) vecs.set(t, v);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  return { vecs, ms };
}

function prf(tp, fp, fn) {
  const precision = tp + fp ? tp / (tp + fp) : null;
  const recall = tp + fn ? tp / (tp + fn) : null;
  const f1 = precision && recall ? (2 * precision * recall) / (precision + recall) : null;
  return { precision: r3(precision), recall: r3(recall), f1: r3(f1) };
}

async function calibrate() {
  const started = Date.now();
  const deadline = started + 240_000;

  /* Pairs: every within-group pair is equivalent; every hard negative, and every pair of
     lead questions from two groups of the same family, is not. */
  const positives = [];
  for (const g of GROUPS)
    for (const [i, j] of pairsOf(g.queries.length)) positives.push([g.queries[i], g.queries[j]]);
  const noisy = [];
  for (const g of GROUPS)
    for (const [, v] of noisyVariants(g.queries[0])) noisy.push([g.queries[0], v]);
  const negatives = HARD_NEGATIVES.map(([a, b]) => [a, b]);
  for (const [i, j] of pairsOf(GROUPS.length)) {
    if (GROUPS[i].family === GROUPS[j].family)
      negatives.push([GROUPS[i].queries[0], GROUPS[j].queries[0]]);
  }

  const ownership = GROUPS.filter(
    (g) => g.family === 'institutional_ownership' && g.measure,
  ).flatMap((g) => g.queries.map((q) => ({ q, measure: g.measure })));
  const texts = [
    ...positives.flat(),
    ...noisy.flat(),
    ...negatives.flat(),
    ...INTENT_EXEMPLARS.map((x) => x.text),
  ];
  const { vecs, ms } = await embedAll(texts, deadline);
  const sim = (a, b) => (vecs.has(a) && vecs.has(b) ? cos(vecs.get(a), vecs.get(b)) : null);

  const posSims = [...positives, ...noisy].map(([a, b]) => sim(a, b)).filter((x) => x != null);
  const negSims = negatives.map(([a, b]) => sim(a, b)).filter((x) => x != null);

  const cosine = [];
  for (let t = 0.7; t <= 0.991; t += 0.01) {
    const tp = posSims.filter((x) => x >= t).length;
    const fn = posSims.length - tp;
    const fp = negSims.filter((x) => x >= t).length;
    cosine.push({ threshold: r3(t), ...prf(tp, fp, fn) });
  }
  const bestCos = cosine.reduce((a, b) => ((b.f1 ?? 0) > (a.f1 ?? 0) ? b : a), cosine[0]);

  /* Structural (canonical intent) decisions on the same pairs. */
  const t0 = Date.now();
  const eq = (a, b) => compareIntents(canonicalIntent(a), canonicalIntent(b)).equivalent;
  const sTp = [...positives, ...noisy].filter(([a, b]) => eq(a, b)).length;
  const sFp = negatives.filter(([a, b]) => eq(a, b)).length;
  const structuralMs =
    (Date.now() - t0) / ((positives.length + noisy.length + negatives.length) * 2);
  const structural = {
    ...prf(sTp, sFp, positives.length + noisy.length - sTp),
    positives: positives.length + noisy.length,
    negatives: negatives.length,
    falseEquivalences: sFp,
  };

  /* Measure gating over a grid. */
  const exVecs = INTENT_EXEMPLARS.filter((x) => vecs.has(x.text)).map((x) => ({
    ...x,
    v: vecs.get(x.text),
  }));
  const scored = ownership
    .filter((o) => vecs.has(o.q))
    .map((o) => {
      const cands = exVecs
        .map((x) => ({
          id: x.id,
          family: x.family,
          measure: x.measure,
          score: cos(vecs.get(o.q), x.v),
        }))
        .filter((c) => c.family === 'institutional_ownership' && c.measure)
        .sort((a, b) => b.score - a.score);
      return { truth: o.measure, cands };
    });
  const grid = [];
  for (let minScore = 0.7; minScore <= 0.951; minScore += 0.01) {
    for (const margin of [0, 0.01, 0.02, 0.03, 0.04, 0.06, 0.08]) {
      let answered = 0;
      let right = 0;
      for (const s of scored) {
        const top = s.cands[0];
        if (!top || top.score < minScore) continue;
        const rival = s.cands.find((c) => c.measure !== top.measure);
        if (rival && top.score - rival.score < margin) continue;
        answered += 1;
        if (top.measure === s.truth) right += 1;
      }
      grid.push({
        minScore: r3(minScore),
        margin,
        coverage: r3(scored.length ? answered / scored.length : null),
        accuracy: r3(answered ? right / answered : null),
      });
    }
  }
  const exact = grid.filter((g) => g.accuracy === 1 && g.coverage > 0);
  const recommended = exact.length
    ? exact.reduce((a, b) =>
        b.coverage > a.coverage || (b.coverage === a.coverage && b.minScore > a.minScore) ? b : a,
      )
    : null;
  const current =
    grid.find(
      (g) =>
        Math.abs(g.minScore - MEASURE_MIN_SCORE) < 1e-6 &&
        Math.abs(g.margin - MEASURE_MIN_MARGIN) < 1e-6,
    ) || null;

  return {
    version: 1,
    benchmark: BENCHMARK_VERSION,
    exemplars: INTENT_EXEMPLARS_VERSION,
    model: 'gte-small (384 dimensions) via the Supabase embed function, query embedding cache',
    computedAt: new Date().toISOString(),
    embedded: { texts: new Set(texts).size, ok: vecs.size },
    pairs: { positives: positives.length, noisy: noisy.length, negatives: negatives.length },
    similarity: {
      positives: {
        p05: r3(pct(posSims, 0.05)),
        median: r3(pct(posSims, 0.5)),
        min: r3(Math.min(...posSims)),
      },
      negatives: {
        median: r3(pct(negSims, 0.5)),
        p95: r3(pct(negSims, 0.95)),
        max: r3(Math.max(...negSims)),
      },
    },
    cosineOnly: { best: bestCos, table: cosine },
    structural,
    measure: {
      questions: scored.length,
      inForce: { minScore: MEASURE_MIN_SCORE, margin: MEASURE_MIN_MARGIN, ...(current || {}) },
      recommended,
      grid: grid.filter((g) => [0, 0.02, 0.04, 0.08].includes(g.margin)),
    },
    latency: {
      embedCalls: ms.length,
      embedMsP50: pct(ms, 0.5),
      embedMsP95: pct(ms, 0.95),
      canonicalIntentMs: r3(structuralMs),
      totalMs: Date.now() - started,
    },
  };
}

export async function GET() {
  const key = `sonar:semcal:${BENCHMARK_VERSION}:${INTENT_EXEMPLARS_VERSION}`;
  try {
    setCacheClient(() => getAdminClient());
    const hit = await cacheGet(key);
    if (hit) return NextResponse.json({ ...hit, cached: true });
    const out = await calibrate();
    if (out.embedded.ok >= out.embedded.texts * 0.95) await cacheSet(key, out, 24 * 3600);
    return NextResponse.json({ ...out, cached: false });
  } catch (e) {
    return NextResponse.json(
      { error: 'Calibration failed', detail: String(e?.message || e).slice(0, 200) },
      { status: 500 },
    );
  }
}
