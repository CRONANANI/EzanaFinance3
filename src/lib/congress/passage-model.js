/**
 * Bill-passage probability — a TRANSPARENT structural scorecard (NOT an LLM
 * guess). It combines documented structural features into a log-odds score and
 * returns a probability plus a per-feature breakdown for explainability.
 *
 * Dominant feature: `stage`. Most bills die in committee, so the stage-
 * conditional base rate carries the score; the other features nudge it. The
 * base rates below are calibration PRIORS (order-of-magnitude, grounded in the
 * well-documented reality that only a few percent of introduced bills become
 * law). They are meant to be refined by ingesting 2–3 completed Congresses and
 * measuring realized pass rates per stage — until then they are labeled
 * estimates, never presented as precise.
 *
 * Compliance: informational only. This estimates legislative outcome
 * likelihood, never an investment or betting recommendation.
 */
import { STAGE_RANK } from './stage';

const logit = (p) => Math.log(p / (1 - p));
const sigmoid = (z) => 1 / (1 + Math.exp(-z));
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

/** stage-conditional prior probability a bill ultimately becomes law */
export const STAGE_BASE_RATE = {
  introduced: 0.03,
  committee: 0.06,
  reported: 0.3,
  floor: 0.45,
  passed_chamber: 0.55,
  passed_both: 0.9,
  law: 0.999,
};

/**
 * @param {object} bill
 * @param {string} bill.stage
 * @param {number} [bill.cosponsorCount]
 * @param {number} [bill.cosponsorDem]
 * @param {number} [bill.cosponsorRep]
 * @param {'D'|'R'|'I'|null} [bill.sponsorParty]
 * @param {'D'|'R'} [bill.majorityParty] chamber majority (defaults to 'R' for 119th)
 * @param {boolean} [bill.hasCompanion] related bill in the other chamber
 * @param {boolean} [bill.hasCommitteeReport]
 * @returns {{ probability:number, features:Array<{key:string,label:string,contribution:number,detail:string}> }}
 */
export function estimatePassage(bill = {}) {
  const stage = STAGE_RANK[bill.stage] ? bill.stage : 'introduced';
  const base = STAGE_BASE_RATE[stage] ?? 0.03;
  let z = logit(clamp(base, 0.005, 0.995));
  const features = [
    {
      key: 'stage',
      label: 'Stage',
      contribution: z,
      detail: `${stage} — base rate ${(base * 100).toFixed(1)}%`,
    },
  ];

  const add = (key, label, delta, detail) => {
    z += delta;
    features.push({ key, label, contribution: delta, detail });
  };

  // cosponsor support (log-scaled; more cosponsors → modestly higher odds)
  const co = Number(bill.cosponsorCount) || 0;
  if (co > 0)
    add('cosponsors', 'Cosponsors', Math.min(0.6, Math.log10(1 + co) * 0.35), `${co} cosponsors`);

  // bipartisan mix (min-share of the two parties; broad support helps most)
  const d = Number(bill.cosponsorDem) || 0;
  const r = Number(bill.cosponsorRep) || 0;
  if (d + r > 0) {
    const minShare = Math.min(d, r) / (d + r); // 0 = one-party, 0.5 = even
    add(
      'bipartisan',
      'Bipartisan support',
      minShare * 0.8,
      `${Math.round(minShare * 200)}% cross-party cosponsors`,
    );
  }

  // sponsor in the chamber majority
  const majority = bill.majorityParty || 'R';
  if (bill.sponsorParty && bill.sponsorParty === majority) {
    add('majority', 'Majority-party sponsor', 0.35, `sponsor is ${majority} (majority)`);
  } else if (bill.sponsorParty && bill.sponsorParty !== majority && bill.sponsorParty !== 'I') {
    add('minority', 'Minority-party sponsor', -0.25, `sponsor is ${bill.sponsorParty} (minority)`);
  }

  if (bill.hasCompanion)
    add('companion', 'Companion bill', 0.4, 'related bill in the other chamber');
  if (bill.hasCommitteeReport) add('report', 'Committee report', 0.5, 'reported out of committee');

  const probability = clamp(sigmoid(z), 0.005, 0.98);
  return { probability, features };
}
