export const CHECKLIST_STAGES = [
  { id: 1, name: 'Learn the basics', rewardXp: 50 },
  { id: 2, name: 'Explore the platform', rewardXp: 50 },
  { id: 3, name: 'Take an action', rewardXp: 75 },
  { id: 4, name: 'Join the community', rewardXp: 100 },
];

export const CHECKLIST_TASKS = {
  learning_1: {
    id: 'learning_1',
    stage: 1,
    section: 'learning',
    sectionName: 'Learning Center',
    title: 'Read your first lesson',
    description: 'Complete "What Is the Stock Market?" in Stocks & Investing',
    page: '/learning-center/course/stocks-basic-1',
    guide: {
      targetSelector: '[data-task-target="learning-module-card"]',
      message: 'Open the first Bronze lesson and read through all sections.',
      position: 'bottom',
    },
    completionTrigger: 'course-complete',
    completionMessage: 'You read your first lesson!',
  },
  learning_2: {
    id: 'learning_2',
    stage: 1,
    section: 'learning',
    sectionName: 'Learning Center',
    title: 'Take your first quiz',
    description: 'Pass a lesson quiz to check your understanding',
    page: '/learning-center/course/stocks-basic-1',
    guide: {
      targetSelector: '[data-task-target="learning-quiz-button"]',
      message: 'Answer the questions, then click Submit Quiz.',
      position: 'bottom',
    },
    completionTrigger: 'click',
    completionMessage: 'You passed your first quiz!',
  },
  learning_3: {
    id: 'learning_3',
    stage: 1,
    section: 'learning',
    sectionName: 'Learning Center',
    title: 'Read Risk & Diversification',
    description: 'Complete "Risk vs Reward" — diversification basics',
    page: '/learning-center/course/stocks-basic-7',
    guide: {
      targetSelector: '[data-task-target="learning-module-card"]',
      message: 'Read the Risk vs Reward lesson through to the end.',
      position: 'bottom',
    },
    completionTrigger: 'course-complete',
    completionMessage: 'You learned about risk and diversification!',
  },

  capitol_1: {
    id: 'capitol_1',
    stage: 2,
    section: 'capitol',
    sectionName: 'Inside the Capitol',
    title: "View a congressman's trading activity",
    description: 'Click on any politician to see their recent trades',
    page: '/inside-the-capitol',
    guide: {
      targetSelector: '[data-task-target="capitol-politician-name"]',
      message:
        "Click on a politician's name in the Latest Trades table to view their full trading activity.",
      position: 'top',
    },
    completionTrigger: 'click',
    completionMessage: "You viewed a congressman's trading activity!",
  },
  capitol_2: {
    id: 'capitol_2',
    stage: 2,
    section: 'capitol',
    sectionName: 'Inside the Capitol',
    title: 'Filter trades by party',
    description: 'Use the party filter to view Republican or Democrat trades',
    page: '/inside-the-capitol',
    guide: {
      targetSelector: '[data-task-target="capitol-party-filter"]',
      message: 'Click R or D to filter the trades by political party.',
      position: 'bottom',
    },
    completionTrigger: 'click',
    completionMessage: 'You filtered trades by party!',
  },
  capitol_3: {
    id: 'capitol_3',
    stage: 2,
    section: 'capitol',
    sectionName: 'Inside the Capitol',
    title: 'View a specific stock traded by Congress',
    description: 'Click on a stock ticker in the congressional trades list',
    page: '/inside-the-capitol',
    guide: {
      targetSelector: '[data-task-target="capitol-stock-ticker"]',
      message: 'Click a ticker (exchange line) to open company research for that symbol.',
      position: 'top',
    },
    completionTrigger: 'click',
    completionMessage: 'You explored a stock traded by Congress!',
  },

  research_1: {
    id: 'research_1',
    stage: 2,
    section: 'research',
    sectionName: 'Company Research',
    title: 'Search for a company',
    description: 'Use the search bar to look up any public company',
    page: '/company-research',
    guide: {
      targetSelector: '[data-task-target="research-search-bar"]',
      message:
        'Type a company name or ticker in the search bar and press Enter or pick a suggestion.',
      position: 'bottom',
    },
    completionTrigger: 'search',
    completionMessage: 'You searched for a company!',
  },
  research_2: {
    id: 'research_2',
    stage: 2,
    section: 'research',
    sectionName: 'Company Research',
    title: "View a company's financial overview",
    description: 'Open a company profile and review its key metrics',
    page: '/company-research',
    guide: {
      targetSelector: '[data-task-target="research-company-card"]',
      message: 'Click any stock in the heatmap to open its full financial profile.',
      position: 'right',
    },
    completionTrigger: 'click',
    completionMessage: "You viewed a company's financial overview!",
  },
  research_3: {
    id: 'research_3',
    stage: 2,
    section: 'research',
    sectionName: 'Company Research',
    title: 'Compare two companies',
    description: 'Use the comparison tool to compare company metrics side by side',
    page: '/company-research',
    guide: {
      targetSelector: '[data-task-target="research-compare-button"]',
      message: 'Select a stock first, then click a peer ticker to compare.',
      position: 'bottom',
    },
    completionTrigger: 'click',
    completionMessage: 'You compared two companies!',
  },

  market_1: {
    id: 'market_1',
    stage: 2,
    section: 'market',
    sectionName: 'Market Research',
    title: 'Look up a Polymarket trader',
    description: 'Search for a trader by username in the Polymarket Trader Lookup',
    page: '/betting-markets',
    guide: {
      targetSelector: '[data-task-target="polymarket-search"]',
      message: 'Enter a Polymarket username and click Look Up.',
      position: 'bottom',
    },
    completionTrigger: 'search',
    completionMessage: 'You looked up a Polymarket trader!',
  },
  market_2: {
    id: 'market_2',
    stage: 2,
    section: 'market',
    sectionName: 'Market Research',
    title: 'Browse live prediction markets',
    description: 'Explore at least one live prediction market',
    page: '/betting-markets',
    guide: {
      targetSelector: '[data-task-target="prediction-market-item"]',
      message: 'Click a live prediction market row to explore it.',
      position: 'right',
    },
    completionTrigger: 'click',
    completionMessage: 'You explored a live prediction market!',
  },
  market_3: {
    id: 'market_3',
    stage: 2,
    section: 'market',
    sectionName: 'Market Research',
    title: 'Check the sports odds board',
    description: "View today's lines on the Sports Odds Board",
    page: '/betting-markets',
    guide: {
      targetSelector: '[data-task-target="sports-odds-board"]',
      message: 'Scroll to the Sports Odds Board to see today’s lines.',
      position: 'top',
    },
    completionTrigger: 'scroll-into-view',
    completionMessage: "You checked today's sports odds!",
  },

  watchlist_1: {
    id: 'watchlist_1',
    stage: 3,
    section: 'watchlist',
    sectionName: 'Watchlist',
    title: 'Add a stock to your watchlist',
    description: 'Search for a stock and add it to your watchlist',
    page: '/watchlist',
    guide: {
      targetSelector: '[data-task-target="watchlist-add-button"]',
      message: 'Click Add to Watchlist to save a stock to your list.',
      position: 'bottom',
    },
    completionTrigger: 'click',
    completionMessage: 'You added a stock to your watchlist!',
  },
  watchlist_2: {
    id: 'watchlist_2',
    stage: 3,
    section: 'watchlist',
    sectionName: 'Watchlist',
    title: 'Create a custom watchlist',
    description: 'Create a new watchlist category for organizing stocks',
    page: '/watchlist',
    guide: {
      targetSelector: '[data-task-target="watchlist-create-list"]',
      message: 'Use the sidebar tabs (e.g. Stocks) to filter your watchlist view.',
      position: 'bottom',
    },
    completionTrigger: 'click',
    completionMessage: 'You created a custom watchlist!',
  },
  action_1: {
    id: 'action_1',
    stage: 3,
    section: 'action',
    sectionName: 'Take Action',
    title: 'Run a company analysis',
    description: 'Select a stock and run any AI analysis model',
    page: '/company-research',
    guide: {
      targetSelector: '[data-model="grpv"]',
      message: 'Pick a stock, then click a model tile to run your first analysis.',
      position: 'bottom',
    },
    completionTrigger: 'click',
    completionMessage: 'You ran a company analysis!',
  },
  action_2: {
    id: 'action_2',
    stage: 3,
    section: 'action',
    sectionName: 'Take Action',
    title: 'Place a mock trade',
    description: 'Try a practice trade in Mock Trading',
    page: '/trading/mock',
    guide: {
      targetSelector: '[data-task-target="mock-trade-submit"]',
      message: 'Submit a buy or sell order in Mock Trading.',
      position: 'top',
    },
    completionTrigger: 'click',
    completionMessage: 'You placed a mock trade!',
  },

  community_1: {
    id: 'community_1',
    stage: 4,
    section: 'community',
    sectionName: 'Community',
    title: 'View the community feed',
    description: 'Browse posts in the Community Feed',
    page: '/community',
    guide: {
      targetSelector: '[data-task-target="community-feed"]',
      message: 'Scroll through the Community Feed to see discussions.',
      position: 'top',
    },
    completionTrigger: 'scroll-into-view',
    completionMessage: 'You browsed the community feed!',
  },
  community_2: {
    id: 'community_2',
    stage: 4,
    section: 'community',
    sectionName: 'Community',
    title: 'Explore a legendary investor profile',
    description: 'Click on a legendary investor to see their strategy and track record',
    page: '/community',
    guide: {
      targetSelector: '[data-task-target="legendary-investor-card"]',
      message: 'Click a legendary investor card to read their profile.',
      position: 'bottom',
    },
    completionTrigger: 'click',
    completionMessage: 'You explored a legendary investor!',
  },
  community_3: {
    id: 'community_3',
    stage: 4,
    section: 'community',
    sectionName: 'Community',
    title: 'Check the leaderboard',
    description: 'View the top performers on the Leaderboard',
    page: '/community',
    guide: {
      targetSelector: '[data-task-target="community-leaderboard"]',
      message: 'Review the Leaderboard in the sidebar.',
      position: 'top',
    },
    completionTrigger: 'scroll-into-view',
    completionMessage: 'You checked the leaderboard!',
  },
};

export const TOTAL_TASKS = Object.keys(CHECKLIST_TASKS).length;

export function getTasksBySection() {
  const grouped = {};
  Object.values(CHECKLIST_TASKS).forEach((task) => {
    if (!grouped[task.section]) {
      grouped[task.section] = {
        sectionName: task.sectionName,
        tasks: [],
      };
    }
    grouped[task.section].tasks.push(task);
  });
  return grouped;
}

export function getTasksByStage() {
  const grouped = {};
  CHECKLIST_STAGES.forEach((stage) => {
    grouped[stage.id] = {
      ...stage,
      tasks: [],
    };
  });
  Object.values(CHECKLIST_TASKS).forEach((task) => {
    const stageId = task.stage ?? 2;
    if (!grouped[stageId]) {
      grouped[stageId] = { id: stageId, name: `Stage ${stageId}`, tasks: [] };
    }
    grouped[stageId].tasks.push(task);
  });
  return grouped;
}

export function isStageUnlocked(stageId, progress) {
  if (stageId <= 1) return true;
  for (let s = 1; s < stageId; s++) {
    const tasks = Object.values(CHECKLIST_TASKS).filter((t) => t.stage === s);
    const allDone = tasks.every((t) => progress[t.id]);
    if (!allDone) return false;
  }
  return true;
}
