/**
 * Bill-stage derivation — a documented state machine over Congress.gov action
 * text / codes. Most bills die in committee, so the stage is the dominant
 * feature of the passage model (passage-model.js). Ordered stages:
 *
 *   introduced (1) → committee (2) → reported (3) → floor (4)
 *   → passed_chamber (5) → passed_both (6) → law (7)
 *
 * We derive the stage from the LATEST meaningful action (and the action history
 * when available), matching on the stable phrases Congress.gov uses. This is
 * intentionally transparent and reviewable — no ML, no guessing.
 */

export const STAGES = [
  'introduced',
  'committee',
  'reported',
  'floor',
  'passed_chamber',
  'passed_both',
  'law',
];

/** numeric rank used by the momentum weights + passage model */
export const STAGE_RANK = STAGES.reduce((m, s, i) => ((m[s] = i + 1), m), {});

export const STAGE_LABEL = {
  introduced: 'Introduced',
  committee: 'In committee',
  reported: 'Reported',
  floor: 'Floor',
  passed_chamber: 'Passed chamber',
  passed_both: 'Passed both',
  law: 'Became law',
};

const RULES = [
  // most-advanced first — the first match wins
  [/became public law|enacted|signed by president|public law no/i, 'law'],
  [/passed\/agreed to in (house|senate).*(received|referred).*(house|senate)/i, 'passed_both'],
  [/resolving differences|conference report agreed/i, 'passed_both'],
  [
    /passed (house|senate)|passed\/agreed to in (house|senate)|agreed to in (house|senate)/i,
    'passed_chamber',
  ],
  [/placed on (the )?(union |senate )?calendar|scheduled for|floor|motion to proceed/i, 'floor'],
  [/reported (by|to)|ordered to be reported|committee reports/i, 'reported'],
  [
    /referred to (the )?(committee|subcommittee)|committee consideration|markup|hearings held/i,
    'committee',
  ],
  [/introduced in (house|senate)|read twice|sponsor introductory/i, 'introduced'],
];

/**
 * @param {{latestActionText?:string, actions?:Array<{text?:string}>}} bill
 * @returns {string} one of STAGES
 */
export function deriveStage(bill = {}) {
  const texts = [];
  if (Array.isArray(bill.actions)) for (const a of bill.actions) if (a?.text) texts.push(a.text);
  if (bill.latestActionText) texts.push(bill.latestActionText);

  let best = 'introduced';
  let bestRank = STAGE_RANK.introduced;
  for (const t of texts) {
    for (const [re, stage] of RULES) {
      if (re.test(t)) {
        if (STAGE_RANK[stage] > bestRank) {
          best = stage;
          bestRank = STAGE_RANK[stage];
        }
        break; // rules are ordered most-advanced first
      }
    }
  }
  return best;
}
