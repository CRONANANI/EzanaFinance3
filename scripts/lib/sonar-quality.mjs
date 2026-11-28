/**
 * Shared pieces of Sonar's offline analyst quality loop (Phase 4.2): the regression
 * benchmarks, the snapshot format, the recording runners used at capture time and the
 * replay runners and blocked database client used at replay time.
 *
 *   scripts/sonar-analyst-snapshot.mjs   captures snapshots (recordingRunners)
 *   scripts/sonar-analyst-quality.mjs    replays them (replayRunners, blockedAdmin)
 */

export const SNAPSHOT_VERSION = 1;

/**
 * The regression benchmark, run end to end on every release. Expectations follow the
 * reviewed routing table in scripts/check-sonar-analysts.mjs where it covers the question;
 * the Microsoft positioning expectation is new and unreviewed.
 */
export const BENCHMARK_CASES = [
  {
    id: 'bench-turkey-lira',
    question: "Is Turkey's lira under pressure?",
    mode: 'standard',
    lead: 'fx-strategist',
    supporting: ['macroeconomist', 'sovereign-risk'],
    mustUse: ['fx_spot', 'inflation_monthly', 'policy_rate', 'current_account'],
    mustCompute: ['bothConventionsFx', 'annualise', 'realRateExPost'],
    mustNotClaim: [
      'states an overall pressure level different from assessCurrencyPressure',
      'calls a crisis without disorderly-market or reserve-exhaustion evidence',
      'presents thresholds as official',
      'quotes only the dollar-dearer percentage as the currency loss',
    ],
    goodAnswerTraits: [
      'gives both FX conventions with start and end periods',
      'labels the real policy rate ex-post',
      'cites Ezana thresholds for each component level',
      'states reserves are gross if reserves are used',
    ],
    reviewed: true,
  },
  {
    id: 'bench-msft-ai-infrastructure',
    question:
      'How is Microsoft positioning itself to capture value from the AI infrastructure boom?',
    mode: 'deep',
    lead: 'equity-research',
    supporting: ['industry-analyst'],
    mustUse: ['sec_fundamentals', 'company_profile_segments', 'peer_set'],
    mustCompute: ['marginDecomposition', 'cagr'],
    mustNotClaim: [
      'treats AI market growth as Microsoft revenue',
      'quotes a price target or recommends buying',
      'states a segment figure without its fiscal or calendar period',
    ],
    goodAnswerTraits: [
      'separates market growth from what Microsoft captures',
      'uses the reported cloud segment line with its period',
      'compares with listed hyperscaler peers',
    ],
    reviewed: false,
  },
  {
    id: 'bench-palantir-dependence',
    question: 'How dependent is Palantir on government spending?',
    mode: 'deep',
    lead: 'equity-research',
    supporting: ['contracts-analyst'],
    mustUse: ['sec_fundamentals', 'contract_awards'],
    mustCompute: ['contractObligationsByFY', 'awardCeilingVsObligated'],
    mustNotClaim: [
      'treats contract ceilings as revenue',
      'treats obligations as recognised revenue without saying they differ',
      'mixes federal fiscal years with company fiscal years without saying so',
    ],
    goodAnswerTraits: [
      'reports the government revenue share from filings with its period',
      'distinguishes ceilings, obligations and revenue',
      'states federal fiscal year boundaries',
    ],
    reviewed: true,
  },
  {
    id: 'bench-nvidia-risks',
    question: "What are NVIDIA's biggest risks?",
    mode: 'deep',
    lead: 'equity-research',
    supporting: ['industry-analyst'],
    mustUse: ['sec_fundamentals', 'company_profile_segments'],
    mustCompute: ['marginDecomposition'],
    mustNotClaim: [
      'presents a risk as certain to happen',
      'quotes a price target or recommends selling',
      'states customer concentration figures not in the filings',
    ],
    goodAnswerTraits: [
      'ranks risks by evidence, each cited',
      'separates demand risk from company-specific value capture',
      'states data gaps such as delayed 13F data',
    ],
    reviewed: true,
  },
];

export {
  plain,
  paramsKey,
  recordingRunners,
  replayRunners,
  blockedAdmin,
} from '../../src/lib/sonar/engine/eval/replay.js';
