// Getting Started checklist: single source of truth for stages and tasks.
// Task ids are stable keys stored in public.onboarding_task_completions.
// Never rename an id once shipped; add a new one.
//
// hrefs point at real routes. `soon: true` marks a task whose feature does
// not exist yet (stop losses, price alerts, the readiness quiz): it renders
// as "Coming soon", cannot be completed, and is not required by the live
// trading gate until it ships (LIVE_TRADING_TASK_IDS).

export const TASK_XP = 10;
export const STAGE_BONUS_XP = 50;

export const CHECKLIST_STAGES = [
  {
    id: 'basics',
    name: 'Learn the basics',
    lockDesc: '',
    tasks: [
      {
        id: 'basics.create_account',
        title: 'Create your account',
        desc: 'Verify your email and sign in',
        href: '/settings',
      },
      {
        id: 'basics.investor_profile',
        title: 'Set your investor profile',
        desc: 'Answer the 7 onboarding questions',
        href: '/onboarding',
      },
      {
        id: 'basics.first_lesson',
        title: 'Read your first lesson',
        desc: 'Complete "What Is the Stock Market?" in Stocks & Investing',
        href: '/learning-center/course/stocks-basic-1',
      },
      {
        id: 'basics.first_quiz',
        title: 'Take your first quiz',
        desc: 'Pass a lesson quiz to check your understanding',
        href: '/learning-center/course/stocks-basic-1',
      },
      {
        id: 'basics.risk_diversification',
        title: 'Read Risk & Diversification',
        desc: 'Complete "Risk vs Reward" and diversification basics',
        href: '/learning-center/course/stocks-basic-7',
      },
    ],
  },
  {
    id: 'explore',
    name: 'Explore the platform',
    lockDesc: 'View a congress member’s trading activity and explore key platform features.',
    tasks: [
      {
        id: 'explore.view_member_trades',
        title: 'View a congress member’s trades',
        desc: 'Open any member profile in Inside the Capitol',
        href: '/inside-the-capitol',
      },
      {
        id: 'explore.follow_member',
        title: 'Follow a congress member',
        desc: 'Add a member to your watchlist to track their filings',
        href: '/inside-the-capitol',
      },
      {
        id: 'explore.first_sonar_ping',
        title: 'Run your first Sonar ping',
        desc: 'Ping a ticker, company or country',
        href: '/sonar',
      },
      {
        id: 'explore.company_profile',
        title: 'Open a company profile',
        desc: 'Review metrics, peers and news in US Equities',
        href: '/company-research',
      },
      {
        id: 'explore.read_echo',
        title: 'Read an Ezana Echo article',
        desc: 'Finish one story from today’s edition',
        href: '/ezana-echo',
      },
    ],
  },
  {
    id: 'watchlist',
    name: 'Build your watchlist',
    lockDesc: 'Track the stocks and people you care about, with alerts.',
    tasks: [
      {
        id: 'watchlist.add_three',
        title: 'Add 3 stocks to a watchlist',
        desc: 'Start your first custom watchlist',
        href: '/watchlist',
      },
      {
        id: 'watchlist.price_alert',
        title: 'Set a price alert',
        desc: 'Get notified when a stock crosses your level',
        href: '/watchlist',
        soon: true,
      },
      {
        id: 'watchlist.compare_two',
        title: 'Compare two companies',
        desc: 'Use peer comparison side by side',
        href: '/company-research',
      },
      {
        id: 'watchlist.sector_exposure',
        title: 'Check your sector exposure',
        desc: 'See how your watchlist is spread across sectors',
        href: '/watchlist',
      },
    ],
  },
  {
    id: 'mock',
    name: 'Practice with mock trading',
    lockDesc: 'Place paper trades before you go live.',
    tasks: [
      {
        id: 'mock.first_trade',
        title: 'Place a mock trade',
        desc: 'Buy or sell with paper money',
        href: '/trading/mock',
      },
      {
        id: 'mock.stop_loss',
        title: 'Set a stop loss',
        desc: 'Protect a mock position',
        href: '/trading/mock',
        soon: true,
      },
      {
        id: 'mock.hold_three_days',
        title: 'Hold a position for 3 days',
        desc: 'Track how it moves over time',
        href: '/trading/mock',
      },
      {
        id: 'mock.review_pnl',
        title: 'Review your mock P&L',
        desc: 'Open your paper portfolio performance',
        href: '/trading/mock',
      },
      {
        id: 'mock.readiness_check',
        title: 'Pass the readiness check',
        desc: 'A short quiz before live trading unlocks',
        href: '/trading/mock',
        soon: true,
      },
    ],
  },
];

export const ALL_TASK_IDS = CHECKLIST_STAGES.flatMap((s) => s.tasks.map((t) => t.id));

/**
 * Tasks live trading requires: every task whose feature exists. A `soon`
 * task joins the list automatically once its flag is removed, so the gate
 * never asks for something a member cannot do.
 */
export const LIVE_TRADING_TASK_IDS = CHECKLIST_STAGES.flatMap((s) =>
  s.tasks.filter((t) => !t.soon).map((t) => t.id),
);

/** Titles of the live-trading tasks still missing from `completedIds`. */
export function missingForLiveTrading(completedIds = []) {
  const has = new Set(completedIds);
  const titles = new Map(CHECKLIST_STAGES.flatMap((s) => s.tasks.map((t) => [t.id, t.title])));
  return LIVE_TRADING_TASK_IDS.filter((id) => !has.has(id)).map((id) => ({
    id,
    title: titles.get(id),
  }));
}
export const TOTAL_TASKS = ALL_TASK_IDS.length; // 19

/**
 * Tasks that are "open this page" actions. A page view can only be reported
 * by the browser, so these are the only ids /api/onboarding/checklist/view
 * accepts. Everything else is completed by the server code that proves it.
 */
export const VIEW_TASK_IDS = [
  'explore.view_member_trades',
  'explore.company_profile',
  'explore.read_echo',
  'watchlist.compare_two',
  'watchlist.sector_exposure',
  'mock.review_pnl',
];

export function isViewTaskId(id) {
  return VIEW_TASK_IDS.includes(id);
}

/** Where "Start trading" goes once every task is done. */
export const LIVE_TRADING_HREF = '/trading';

export function isValidTaskId(id) {
  return ALL_TASK_IDS.includes(id);
}

/**
 * Derive everything the UI needs from a list of completed task ids.
 * Pure: used on the server (API + live trading gate) and the client.
 */
export function deriveChecklist(completedIds = []) {
  const has = new Set(completedIds);
  let doneCount = 0;
  let xp = 0;
  let activeIndex = -1;

  const stages = CHECKLIST_STAGES.map((stage, i) => {
    const tasks = stage.tasks.map((t) => ({ ...t, xp: TASK_XP, done: has.has(t.id) }));
    const doneN = tasks.filter((t) => t.done).length;
    const complete = doneN === tasks.length;
    doneCount += doneN;
    xp += doneN * TASK_XP + (complete ? STAGE_BONUS_XP : 0);
    if (!complete && activeIndex < 0) activeIndex = i;
    return { ...stage, number: i + 1, tasks, doneN, complete, bonusXp: STAGE_BONUS_XP };
  });

  const allDone = activeIndex < 0;
  const withStatus = stages.map((s, i) => ({
    ...s,
    // Stages are sequential. A later stage stays locked even if some of its
    // tasks were completed early (that progress is kept and shows once unlocked).
    status:
      allDone || i < activeIndex
        ? 'complete'
        : i === activeIndex
          ? 'active'
          : i === activeIndex + 1
            ? 'next-locked'
            : 'locked',
  }));

  const active = allDone ? null : withStatus[activeIndex];
  // Resume skips tasks whose feature has not shipped yet.
  const nextTask = active
    ? active.tasks.find((t) => !t.done && !t.soon) || active.tasks.find((t) => !t.done) || null
    : null;

  return {
    stages: withStatus,
    total: TOTAL_TASKS,
    doneCount,
    xp,
    allDone,
    activeStage: active,
    tasksLeftInStage: active ? active.tasks.length - active.doneN : 0,
    nextTask,
    liveTradingUnlocked: missingForLiveTrading(completedIds).length === 0,
  };
}
