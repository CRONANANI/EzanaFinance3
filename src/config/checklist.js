export const CHECKLIST_TASKS = {
  capitol_1: {
    id: 'capitol_1',
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
    section: 'research',
    sectionName: 'Company Research',
    title: 'Search for a company',
    description: 'Use the search bar to look up any public company',
    page: '/company-research',
    guide: {
      targetSelector: '[data-task-target="research-search-bar"]',
      message: 'Type a company name or ticker in the search bar and press Enter or pick a suggestion.',
      position: 'bottom',
    },
    completionTrigger: 'search',
    completionMessage: 'You searched for a company!',
  },
  research_2: {
    id: 'research_2',
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
  watchlist_3: {
    id: 'watchlist_3',
    section: 'watchlist',
    sectionName: 'Watchlist',
    title: 'Set a price alert',
    description: 'Set a price alert on a stock in your watchlist',
    page: '/watchlist',
    guide: {
      targetSelector: '[data-task-target="watchlist-price-alert"]',
      message: 'Select a stock in the strip, then click Set price alert.',
      position: 'left',
    },
    completionTrigger: 'click',
    completionMessage: 'You set a price alert!',
  },

  community_1: {
    id: 'community_1',
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

  learning_1: {
    id: 'learning_1',
    section: 'learning',
    sectionName: 'Learning Center',
    title: 'Start a learning module',
    description: 'Open any course or module in the Learning Center',
    page: '/learning-center',
    guide: {
      targetSelector: '[data-task-target="learning-module-card"]',
      message: 'Click any course card to open it.',
      position: 'bottom',
    },
    completionTrigger: 'click',
    completionMessage: 'You started a learning module!',
  },
  learning_2: {
    id: 'learning_2',
    section: 'learning',
    sectionName: 'Learning Center',
    title: 'Complete a quiz',
    description: 'Finish a quiz at the end of a lesson',
    page: '/learning-center/investing-fundamentals',
    guide: {
      targetSelector: '[data-task-target="learning-quiz-button"]',
      message: 'Answer the questions, then click Submit Quiz.',
      position: 'bottom',
    },
    completionTrigger: 'click',
    completionMessage: 'You completed a quiz!',
  },
  learning_3: {
    id: 'learning_3',
    section: 'learning',
    sectionName: 'Learning Center',
    title: 'Bookmark a lesson',
    description: 'Save a lesson to your bookmarks for later review',
    page: '/learning-center/investing-fundamentals',
    guide: {
      targetSelector: '[data-task-target="learning-bookmark"]',
      message: 'Open a lesson, then click Bookmark lesson.',
      position: 'left',
    },
    completionTrigger: 'click',
    completionMessage: 'You bookmarked a lesson!',
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
