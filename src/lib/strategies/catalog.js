/**
 * Strategy Desk catalogue (Nov 18 2026): Ezana's proprietary sports betting
 * and prediction-market strategies. Each strategy reads as plain sentences
 * (the same idea as the Quant Lab), names the data it needs, and carries a
 * status the verification standard in metrics.js decides:
 *
 *   verified        every check passes on bets counted after the rules froze
 *   in_backtest     data flows and bets are being counted; checks pending
 *   awaiting_data   the strategy is written but its data is not connected
 *
 * `rulesFrozenAt` is set when a strategy's rules are locked; only bets after
 * it count toward Verified, so a rule cannot be tuned to its own results.
 */
export const STRATEGIES = [
  {
    slug: 'pm-late-favourite',
    name: 'Late favourite',
    market: 'prediction',
    venue: 'Polymarket and Kalshi',
    summary:
      'Buy the heavy favourite two days before a market settles, when the crowd has priced it between 85 and 97 cents, and hold to settlement.',
    rules: [
      ['universe', 'Every settled Polymarket and Kalshi market with $1,000 or more of liquidity'],
      ['entry', 'Two days (36 to 60 hours) before the market closes'],
      ['signal', 'YES priced between 85 and 97 cents at the best ask'],
      ['stake', 'One unit per market, held to settlement'],
      ['costs', 'Priced at the ask; venue fees taken off winnings'],
    ],
    thesis:
      'Favourites near settlement are often underpriced because traders rotate out early to free capital. The edge, if any, is small per bet, so it only shows on a large sample.',
    backtest: { kind: 'pm-late-favourite', params: { minPrice: 0.85, maxPrice: 0.97, hours: 48, minLiquidity: 1000 } },
    feeRate: 0,
    rulesFrozenAt: '2026-11-18',
    status: 'in_backtest',
    dataNote:
      'Prices from Ezana prediction-market snapshots (from October 19th, 2026), settlement from the final recorded price.',
  },
  {
    slug: 'nba-3pt-matchup',
    name: 'Three-point matchup',
    market: 'sports',
    venue: 'NBA player props',
    summary:
      'Back a shooter on a top three-point team to hit at least one three when the opponent allows among the most threes in the league.',
    rules: [
      ['universe', 'Rotation players on the team ranked first in threes made per game'],
      ['filter', 'Opponent ranked in the bottom ten for threes allowed per game'],
      ['bet', 'Player to make one or more three-pointers'],
      ['edge', 'Season and matchup hit rates both above the price-implied probability'],
      ['stake', 'One unit per qualifying player-game'],
    ],
    thesis:
      'A high hit rate is not the edge: these props are usually priced at -300 or shorter, so a 90% hit rate can still lose. The strategy only bets when the hit rate clears the price.',
    backtest: null,
    feeRate: 0,
    rulesFrozenAt: null,
    status: 'awaiting_data',
    dataNote:
      'Needs historical player box scores and historical prop prices (odds at the time of the bet). Box scores are available from free sports APIs; historical prop odds require a paid odds feed.',
  },
];

export function strategyBySlug(slug) {
  return STRATEGIES.find((s) => s.slug === slug) || null;
}

export const STATUS_LABEL = {
  verified: 'Verified',
  in_backtest: 'In backtest',
  awaiting_data: 'Awaiting data',
};
