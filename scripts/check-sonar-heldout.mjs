/**
 * Sonar 6.2 held-out routing set (Nov 28 2026).
 *
 * The evidence-demand concepts were tuned while reading the analyst eval cases, so the
 * eval score can overstate how well routing generalises. These questions were written
 * after that tuning and are never used to tune it: if a concept is changed to make one
 * of these pass, move the question into the eval cases and write a new one here.
 *
 * Report only (exit 0): prints the lead each question gets and the score, for the
 * research quality report. Run: npm run test:sonar-heldout
 */
import { planCase } from './lib/sonar-eval-cases.mjs';

export const HELD_OUT = [
  {
    q: 'Which members of Congress sold airline stocks before the March selloff?',
    lead: 'congress-analyst',
  },
  {
    q: 'Has Raytheon become more reliant on Army contracts over the last five years?',
    lead: 'contracts-analyst',
  },
  {
    q: 'Which hedge funds added to their Tesla positions last quarter?',
    lead: 'ownership-analyst',
  },
  {
    q: 'How much did pharmaceutical companies spend lobbying on drug pricing in 2025?',
    lead: 'lobbying-analyst',
  },
  {
    q: 'What does an inverted 2s10s curve imply for regional bank margins?',
    lead: 'rates-strategist',
  },
  { q: 'Is the Japanese yen likely to keep weakening against the dollar?', lead: 'fx-strategist' },
  {
    q: 'What is a reasonable intrinsic value for Costco using a discounted cash flow?',
    lead: 'valuation',
  },
  {
    q: 'How have Caterpillar gross margins and free cash flow trended since 2021?',
    lead: 'equity-research',
  },
  {
    q: 'Who are Nvidia’s main competitors in AI accelerators and how is market share shifting?',
    lead: 'industry-analyst',
  },
  {
    q: 'Could new Treasury sanctions on Russian aluminum affect US manufacturers?',
    lead: 'sanctions-analyst',
  },
  {
    q: 'What is the risk that Argentina defaults on its dollar bonds again?',
    lead: 'sovereign-risk',
  },
  {
    q: 'How would a drought in Brazil affect global coffee and sugar prices?',
    lead: 'food-analyst',
  },
  { q: 'What is driving the recent rally in copper prices?', lead: 'commodities-analyst' },
  { q: 'Is the euro area heading into a recession next year?', lead: 'macroeconomist' },
  {
    q: 'Does a momentum strategy on S&P 500 sectors beat buy and hold after costs?',
    lead: 'quant-analyst',
  },
  { q: 'What are the odds markets give for a Fed rate cut in March?', lead: 'prediction-analyst' },
  {
    q: 'How would escalation in the Taiwan Strait affect semiconductor supply chains?',
    lead: 'geopolitical-analyst',
  },
  {
    q: 'Did senators on the Banking Committee trade bank stocks while drafting the bill?',
    lead: 'congress-analyst',
  },
  {
    q: 'Which defense contractors won the most Navy shipbuilding awards this year?',
    lead: 'contracts-analyst',
  },
  { q: 'How concentrated is institutional ownership of Palantir?', lead: 'ownership-analyst' },
];

export async function scoreHeldOut() {
  const out = [];
  for (const c of HELD_OUT) {
    const plan = await planCase({ question: c.q, mode: 'standard' });
    const lead = plan.routing.lead?.id || plan.routing.assignments?.[0]?.analyst || null;
    out.push({ ...c, got: lead, ok: lead === c.lead });
  }
  return { rows: out, pass: out.filter((r) => r.ok).length, total: out.length };
}

if (process.argv[1]?.endsWith('check-sonar-heldout.mjs')) {
  const { rows, pass, total } = await scoreHeldOut();
  for (const r of rows)
    console.log(
      `${r.ok ? 'ok  ' : 'MISS'} ${r.lead.padEnd(22)} got ${String(r.got).padEnd(22)} ${r.q}`,
    );
  console.log(`\nheld-out lead accuracy: ${pass}/${total}`);
}
