/**
 * Pairwise link rules (sonar-ezanaql-coverage-prompt.md Step 4): for every
 * dataset pair sharing an entity key, a narrative hint for the brief, and a
 * ratio where one is financially meaningful. The base list is GENERATED from
 * the catalog's shared-key matrix, so every valid pair has at least a
 * narrative; the hand-written entries below override pairs where the overlap
 * means something specific. Combinations of 3+ datasets apply every pair rule
 * that fires.
 */
import { sharedKeyPairs, getDatasetDef } from '@/lib/sonar/catalog';

const sum = (rows, f) => rows.reduce((t, r) => t + (Number(r?.[f]) || 0), 0);
const safeDiv = (a, b) => (Number.isFinite(a) && Number.isFinite(b) && b !== 0 ? a / b : null);

const key = (a, b) => [a, b].sort().join('|');

/** Hand-written judgement per pair (order-insensitive). */
const CURATED = {
  [key('capitol.congress_trades', 'gov.contracts')]: {
    on: 'company',
    narrative:
      'Members of Congress trading companies that receive federal awards; name the members, tickers and award totals.',
    ratios: [
      {
        id: 'congress_vol_to_awards',
        label: 'Congress trade $ / award $',
        fmt: 'ratio',
        explain:
          'Disclosed member trading (range midpoints) against federal award dollars to the same companies.',
        compute: (trades, contracts) =>
          safeDiv(sum(trades, 'amount_est'), sum(contracts, 'award_value')),
      },
    ],
  },
  [key('capitol.lobbying', 'gov.contracts')]: {
    on: 'company',
    narrative: 'Companies lobbying Washington and winning federal awards in the same window.',
    ratios: [
      {
        id: 'contracts_per_lobby_dollar',
        label: 'Award $ per lobbying $',
        fmt: 'ratio',
        explain: 'Federal award dollars per disclosed lobbying dollar for the shared companies.',
        compute: (lobby, contracts) => safeDiv(sum(contracts, 'award_value'), sum(lobby, 'amount')),
      },
    ],
  },
  [key('capitol.congress_trades', 'capitol.committee_seats')]: {
    on: 'person_politician',
    narrative:
      "Flag trades in sectors overseen by the member's committees; the committee seat is the context for the trade.",
  },
  [key('capitol.campaign_finance', 'capitol.lobbying')]: {
    on: 'company',
    narrative: 'Donor and lobbyist overlap: who funds campaigns and lobbies the same offices.',
  },
  [key('titans.holdings_13f', 'titans.activist_stakes')]: {
    on: 'company',
    narrative: 'Activist and block stakes against the passive 13F holder base of the same issuer.',
  },
  [key('titans.holdings_13f', 'titans.whale_moves')]: {
    on: 'fund',
    narrative: 'The quarter-over-quarter moves behind the reported book.',
  },
  [key('capitol.congress_trades', 'titans.whale_moves')]: {
    on: 'company',
    narrative: 'Congressional trading beside institutional moves in the same tickers.',
  },
  [key('eyes.patents', 'gov.contracts')]: {
    on: 'company',
    narrative:
      'Who patents and who gets paid: R&D output beside federal awards for the same companies.',
  },
  [key('capitol.congress_trades', 'eyes.patents')]: {
    on: 'company',
    narrative: 'Members trading companies with active patent flow.',
  },
  [key('capitol.congress_trades', 'capitol.holdings')]: {
    on: 'person_politician',
    narrative: 'Trades against the estimated open holdings of the same members.',
  },
  [key('capitol.campaign_finance', 'capitol.committee_seats')]: {
    on: 'person_politician',
    narrative: 'Fundraising beside committee power: who raises most on the panels that matter.',
  },
};

/** The full rule list: curated entries first, then a generated narrative for
 *  every remaining shared-key pair. */
export function linkRules() {
  const rules = [];
  const seen = new Set();
  for (const { pair, shared } of sharedKeyPairs()) {
    const k = key(pair[0], pair[1]);
    seen.add(k);
    const curated = CURATED[k];
    if (curated) {
      rules.push({ pair, ...curated });
    } else {
      const a = getDatasetDef(pair[0]);
      const b = getDatasetDef(pair[1]);
      rules.push({
        pair,
        on: shared[0],
        narrative: `${a.label} and ${b.label} overlap on the same ${shared[0].replace(/_/g, ' ')}; say what the overlap shows, citing both.`,
      });
    }
  }
  return rules;
}

/** Rules whose both datasets are present in the cluster. */
export function applicableLinks(cluster) {
  const present = new Set(cluster.datasets);
  return linkRules().filter((r) => present.has(r.pair[0]) && present.has(r.pair[1]));
}

/** Computed cross-dataset ratios for the cluster (finite values only). */
export function computeRatios(cluster) {
  const out = [];
  for (const rule of applicableLinks(cluster)) {
    for (const ratio of rule.ratios || []) {
      const value = ratio.compute(
        cluster.rowsByDataset[rule.pair[0]] || [],
        cluster.rowsByDataset[rule.pair[1]] || [],
      );
      if (value != null && Number.isFinite(value)) {
        out.push({
          id: ratio.id,
          label: ratio.label,
          fmt: ratio.fmt,
          explain: ratio.explain,
          value,
        });
      }
    }
  }
  return out;
}
