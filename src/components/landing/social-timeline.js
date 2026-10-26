/**
 * The Social investing board's one timeline: 50 days (0..49) from the
 * visitor's "today". Illustrative fixture, labelled so in the section foot.
 * Day 0 is today; the calendar shows today + day.
 *
 * Everything on the board (chart, dot, standings, ledger) and the climb's
 * step points derive from this one module, so they can never disagree.
 * Import-free, so scripts/check-social-timeline.mjs can test it directly.
 */
export const DAYS = 49;
export const YOU_START = 2410;

/* [day, delta, event]. Weekly sums reproduce YOU_SERIES exactly; the seven
   climb events keep the texts and points SocialAscentStage reads. */
export const EVENTS = [
  [2, 6, "Passed 'Options Greeks I' in the Learning Center"],
  [4, 5, '7-day login streak'],
  [6, -3, 'Daily P&L below circle median'],
  [9, 4, "Beat Priya S. in a 'Season 4 Sprint' heat"],
  [11, -10, 'Research thesis challenged and closed out'],
  [16, 8, 'Research post upvoted, consensus signal'],
  [18, 3, 'Trade idea copied by 3 circle members'],
  [20, 2, 'Maya K. joined your circle on your referral'],
  [21, 5, 'Weekly P&L above circle median'],
  [23, 6, "Passed 'Portfolio Construction I' in the Learning Center"],
  [25, 4, 'Won a duel against Jordan T.'],
  [27, 2, '14-day login streak'],
  [30, 8, 'Second research post upvoted'],
  [32, -6, 'Closed a sprint position below entry'],
  [34, 10, "Podium in the 'Weekly Macro Duel'"],
  [38, 24, "Won 'Q3 Momentum Sprint'"],
  [41, 8, 'Trade idea copied by 5 circle members'],
  [44, -9, 'Drawdown passed your risk limit'],
  [46, 15, "Beat Daniel R. in a 'Season 4 Sprint' heat"],
  [48, 8, "Weekly P&L in the circle's top quartile"],
].map(([day, d, event], i) => ({ id: `e${i}`, day, d, event }));

/* Weekly anchors (days 0,7,...,49) for the other members; daily values are
   linear between anchors, rounded. Daniel R. is COHORTS.friends.a. */
export const MEMBER_WEEKLY = {
  'Daniel R.': [2454, 2462, 2468, 2474, 2486, 2496, 2506, 2514],
  'Maya K.': [2420, 2426, 2432, 2440, 2446, 2452, 2456, 2460],
  'Priya S.': [2450, 2452, 2449, 2447, 2446, 2444, 2445, 2443],
  'Jordan T.': [2405, 2408, 2410, 2412, 2414, 2416, 2418, 2420],
  'Sam O.': [2410, 2408, 2406, 2404, 2402, 2400, 2399, 2398],
};

export const youAt = (day) =>
  YOU_START + EVENTS.filter((e) => e.day <= day).reduce((s, e) => s + e.d, 0);

export const lerpWeekly = (series, day) => {
  const w = Math.min(series.length - 2, Math.floor(day / 7));
  const t = (day - w * 7) / 7;
  return Math.round(series[w] + (series[w + 1] - series[w]) * t);
};

/* Ledger rows with from/to, chronological. */
export const LEDGER_ROWS = (() => {
  let r = YOU_START;
  return EVENTS.map((e) => {
    const row = { ...e, from: r, to: r + e.d };
    r += e.d;
    return row;
  });
})();

/** Standings at `day`: rating, 7-day change, rank. Ties keep the previous
    order (pass prevOrder) so rows never flicker between equal ratings. */
export function standingsAt(day, prevOrder = []) {
  const rows = [
    { name: 'You', you: true, rating: youAt(day), week: youAt(day) - youAt(Math.max(0, day - 7)) },
    ...Object.entries(MEMBER_WEEKLY).map(([name, s]) => ({
      name,
      rating: lerpWeekly(s, day),
      week: lerpWeekly(s, day) - lerpWeekly(s, Math.max(0, day - 7)),
    })),
  ];
  rows.sort(
    (a, b) =>
      b.rating - a.rating ||
      ((prevOrder.indexOf(a.name) + 99) % 99) - ((prevOrder.indexOf(b.name) + 99) % 99),
  );
  return rows.map((r, i) => ({ ...r, rank: String(i + 1).padStart(2, '0') }));
}

/** The weekly view (days 0, 7, ... 49): the chart's original eight points. */
export const WEEK_DAYS = Array.from({ length: Math.floor(DAYS / 7) + 1 }, (_, i) => i * 7);
export const YOU_WEEKLY = WEEK_DAYS.map(youAt);

/** How many events have landed by `day` (events with event.day <= day). */
export const eventsBy = (day) => {
  let k = 0;
  while (k < EVENTS.length && EVENTS[k].day <= day) k += 1;
  return k;
};
