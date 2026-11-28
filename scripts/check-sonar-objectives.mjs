/**
 * Sonar held-out objective eval (Nov 28 2026).
 *
 * Reads sonar-evals/heldout/objective-cases.json, which is maintained independently of
 * routing and intent work (see its "rule"). Unlike the analyst eval, this scores whether
 * the research objective was met:
 *
 *   planned    the right analysis is attached, or an unsupported request attaches nothing
 *              that would substitute another measure
 *   executed   the analysis ran on the frozen fixtures and met its required outputs
 *              (an honest, named failure counts where the data does not exist)
 *   correct    the computed result matches the hand-worked expectation
 *   routed     the lead analyst (engine cases)
 *
 * Report only (exit 0). Run: npm run test:sonar-objectives [-- --json]
 */
import { readFileSync } from 'node:fs';
import { fakeSupabase } from './lib/fake-supabase.mjs';
import { FIXTURES, PRICES } from './lib/sonar-exec-fixtures.mjs';
import { planCase } from './lib/sonar-eval-cases.mjs';
import { inferComposition } from '../src/lib/sonar/composer/intents.js';
import { runResearchComposition } from '../src/lib/sonar/composer/execute.js';
import { fulfillmentContract } from '../src/lib/sonar/composer/fulfillment.js';

const DATA = JSON.parse(
  readFileSync(new URL('../sonar-evals/heldout/objective-cases.json', import.meta.url), 'utf8'),
);
const close = (a, b) => Number.isFinite(a) && Math.abs(a - b) < 1e-6;
const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

function checkResult(r, expect) {
  const why = [];
  const tickers = (r.table || []).map((t) => t.ticker).filter(Boolean);
  if (expect.set && !sameSet(tickers, expect.set)) why.push(`got ${tickers.join(',') || 'none'}`);
  if (expect.order && tickers.join(',') !== expect.order.join(','))
    why.push(`order ${tickers.join(',')}`);
  if (
    expect.orderPrefix &&
    tickers.slice(0, expect.orderPrefix.length).join(',') !== expect.orderPrefix.join(',')
  )
    why.push(`order ${tickers.join(',')}`);
  if (expect.tickers && !sameSet(tickers, expect.tickers))
    why.push(`companies ${tickers.join(',')}`);
  for (const [k, v] of Object.entries(expect.values || {})) {
    const [t, m] = k.split('.');
    const row = (r.table || []).find((x) => x.ticker === t);
    if (!close(row?.[m], v)) why.push(`${k}=${row?.[m] ?? 'missing'}`);
  }
  for (const [m, t] of Object.entries(expect.leaders || {}))
    if (r.leaders?.[m] !== t) why.push(`leader ${m}=${r.leaders?.[m] ?? 'none'}`);
  for (const [k, v] of Object.entries(expect.macro || {})) {
    const [iso, field] = k.split('.');
    const got = r.macro?.byCountry?.[iso]?.[field];
    if (typeof v === 'number' ? !close(got, v) : got !== v) why.push(`${k}=${got ?? 'missing'}`);
  }
  if (expect.macroCountries) {
    const got = Object.keys(r.macro?.byCountry || {}).sort();
    if (!sameSet(got, expect.macroCountries)) why.push(`countries ${got.join(',') || 'none'}`);
  }
  for (const [k, v] of Object.entries(expect.dependence || {})) {
    const got = r.dependence?.[k];
    if (typeof v === 'number' ? !close(got, v) : got !== v) why.push(`${k}=${got ?? 'missing'}`);
  }
  return why;
}

/* v3: typed entity resolution and intent shape, judged without execution. */
async function runEntityCase(c, out) {
  const { understandDeterministic } = await import('../src/lib/sonar/understand/index.js');
  const { canonicalIntent } = await import('../src/lib/sonar/semantic/canonical-intent.js');
  const u = understandDeterministic(c.question);
  const intent = canonicalIntent(c.question);
  const inf = inferComposition(c.question);
  const e = c.expect;
  const why = [];
  const ents = u.entities || [];
  if (e.entity) {
    const hit = ents.some(
      (x) =>
        (x.type === e.entity.kind || x.kind === e.entity.kind) &&
        (!e.entity.id || x.id === e.entity.id) &&
        (!e.entity.country || x.country === e.entity.country || x.id === e.entity.country),
    );
    if (!hit) why.push(`entities ${ents.map((x) => `${x.kind}:${x.id}`).join(',') || 'none'}`);
  }
  if (e.notEntity && ents.some((x) => x.kind === e.notEntity.kind || x.type === e.notEntity.kind))
    why.push(`unexpected ${e.notEntity.kind}`);
  if (e.family && intent.family !== e.family) why.push(`family ${intent.family}`);
  if (e.companies) {
    const names = [
      intent.primary_entity?.text,
      ...(intent.secondary_entities || []).map((x) => x.text),
    ].filter(Boolean);
    if (!sameSet(names, e.companies)) why.push(`companies ${names.join(',') || 'none'}`);
  }
  const att = inf.attachments[0];
  if (e.macroCountries) {
    const got = (
      inf.attachments.find((a) => a.capability === 'macro-indicators')?.params?.countries || []
    )
      .slice()
      .sort();
    if (!sameSet(got, e.macroCountries)) why.push(`macro ${got.join(',') || 'none'}`);
  }
  if (e.universe && intent.composition?.universe?.id !== e.universe)
    why.push(`universe ${intent.composition?.universe?.id || 'none'}`);
  if (e.universeCountry && intent.composition?.universe?.country !== e.universeCountry)
    why.push(`universe country ${intent.composition?.universe?.country || 'none'}`);
  if (e.rankBy && att?.params?.rank_by !== e.rankBy)
    why.push(`rank ${att?.params?.rank_by || 'none'}`);
  out.planned = why.length === 0;
  out.correct = why.length === 0;
  out.notes.push(...why);
  return out;
}

async function runCase(c) {
  const out = {
    id: c.id,
    kind: c.kind,
    question: c.question,
    planned: null,
    executed: null,
    correct: null,
    routed: null,
    notes: [],
  };
  if (c.kind === 'entity') return runEntityCase(c, out);
  const inf = inferComposition(c.question);
  const caps = inf.attachments.map((a) => a.capability);
  if (c.kind === 'unsupported' || c.kind === 'engine') {
    const bad = caps.filter((x) => (c.forbid || []).includes(x));
    out.planned = bad.length === 0;
    if (bad.length) out.notes.push(`attached ${bad.join(',')} (would substitute)`);
    if (c.kind === 'unsupported' && inf.intent?.unsupported)
      out.notes.push('unsupported notice given');
  }
  if (c.kind === 'engine' || c.lead) {
    const plan = await planCase({ question: c.question, mode: 'standard' });
    const lead = plan.routing.lead?.id || null;
    out.routed = lead === c.lead;
    if (!out.routed) out.notes.push(`lead ${lead}`);
  }
  if (c.kind !== 'execute') return out;
  const att = inf.attachments.find((a) => a.capability === c.capability);
  out.planned = Boolean(att);
  if (!att) {
    out.notes.push(
      `no ${c.capability} (family ${inf.intent?.family || 'none'}${inf.intent?.unsupported ? `, unsupported: ${inf.intent.unsupported}` : ''})`,
    );
    out.executed = false;
    out.correct = false;
    return out;
  }
  const comp = await runResearchComposition(
    {
      question: c.question,
      attachments: [att],
      primary: att.subject?.text ? { text: att.subject.text } : null,
    },
    fakeSupabase(FIXTURES),
  );
  const r = (comp.results || []).find((x) => x.capability === c.capability);
  const obj = fulfillmentContract(comp).objectives.find((o) => o.id === `analysis:${att.key}`);
  if (c.expect.honestFailure) {
    out.executed =
      r?.status === 'failed' && new RegExp(c.expect.honestFailure).test(r.failed || '');
    out.correct = out.executed;
    if (!out.executed) out.notes.push(`status ${r?.status}: ${r?.failed || ''}`);
    return out;
  }
  /* 'limited' (a stated data gap, e.g. a universe member with no filings) still executed;
     it is counted separately so gaps stay visible. */
  out.executed = r?.status === 'done' && ['done', 'limited'].includes(obj?.status);
  out.limited = obj?.status === 'limited';
  if (!out.executed || out.limited)
    out.notes.push(
      `status ${r?.status}/${obj?.status}${r?.failed ? `: ${r.failed}` : ''}${obj?.detail ? ` (${obj.detail})` : ''}`,
    );
  const why = r?.status === 'done' ? checkResult(r, c.expect) : ['not computed'];
  out.correct = why.length === 0;
  out.notes.push(...why);
  return out;
}

/* An authorized quote provider stands in for live prices (Sonar 6.4 valuation). Older
   code without the hook simply has no prices. */
async function installPrices() {
  const mod = await import('../src/lib/sonar/composer/analytics-server.js');
  if (typeof mod.setQuoteProvider === 'function')
    mod.setQuoteProvider(async (tickers) =>
      Object.fromEntries(tickers.filter((t) => PRICES[t]).map((t) => [t, PRICES[t]])),
    );
}

export async function scoreObjectives() {
  await installPrices();
  const rows = [];
  for (const c of DATA.cases) rows.push(await runCase(c));
  const rate = (k, f = () => true) => {
    const xs = rows.filter((r) => r[k] !== null && f(r));
    return { pass: xs.filter((r) => r[k]).length, total: xs.length };
  };
  return {
    version: DATA.version,
    rows,
    summary: {
      planned: rate('planned'),
      executed: rate('executed'),
      correct: rate('correct'),
      routed: rate('routed'),
      limited: rows.filter((r) => r.limited).length,
      objectiveMet: {
        pass:
          rows.filter((r) => r.kind === 'execute' && r.planned && r.executed && r.correct).length +
          rows.filter((r) => r.kind === 'entity' && r.correct).length +
          rows.filter(
            (r) => !['execute', 'entity'].includes(r.kind) && r.planned && r.routed !== false,
          ).length,
        total: rows.length,
      },
    },
  };
}

if (process.argv[1]?.endsWith('check-sonar-objectives.mjs')) {
  const res = await scoreObjectives();
  if (process.argv.includes('--json')) console.log(JSON.stringify(res, null, 2));
  else {
    for (const r of res.rows) {
      const flag = (v) => (v === null ? '-' : v ? 'Y' : 'n');
      console.log(
        `${r.id.padEnd(4)} ${r.kind.padEnd(11)} plan ${flag(r.planned)} exec ${flag(r.executed)} correct ${flag(r.correct)} lead ${flag(r.routed)}  ${r.question}${r.notes.length ? `\n      ${r.notes.join('; ')}` : ''}`,
      );
    }
    const s = res.summary;
    console.log(
      `\nplanned ${s.planned.pass}/${s.planned.total}  executed ${s.executed.pass}/${s.executed.total}  correct ${s.correct.pass}/${s.correct.total}  lead ${s.routed.pass}/${s.routed.total}  objective met ${s.objectiveMet.pass}/${s.objectiveMet.total}  (limited by data gaps: ${s.limited})`,
    );
  }
}
