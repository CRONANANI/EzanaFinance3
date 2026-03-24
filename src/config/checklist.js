export const CHECKLIST_TASKS = {
  capitol_1: {
    id: 'capitol_1',
    section: 'capitol',
    sectionName: 'Inside the Capitol',
    title: "View a congressman's trading activity",
    description: 'Click on any politician to see their recent trades',
    page: '/inside-the-capitol',
  },
  capitol_2: {
    id: 'capitol_2',
    section: 'capitol',
    sectionName: 'Inside the Capitol',
    title: 'Filter trades by party',
    description: 'Use the party filter to view Republican or Democrat trades',
    page: '/inside-the-capitol',
  },
  capitol_3: {
    id: 'capitol_3',
    section: 'capitol',
    sectionName: 'Inside the Capitol',
    title: 'View a specific stock traded by Congress',
    description: 'Click on a stock ticker in the congressional trades list',
    page: '/inside-the-capitol',
  },
  research_1: {
    id: 'research_1',
    section: 'research',
    sectionName: 'Company Research',
    title: 'Search for a company',
    description: 'Use the search bar to look up any public company',
    page: '/company-research',
  },
  research_2: {
    id: 'research_2',
    section: 'research',
    sectionName: 'Company Research',
    title: "View a company's financial overview",
    description: 'Open a company profile and review its key metrics',
    page: '/company-research',
  },
  research_3: {
    id: 'research_3',
    section: 'research',
    sectionName: 'Company Research',
    title: 'Compare two companies',
    description: 'Use the comparison tool to compare company metrics side by side',
    page: '/company-research',
  },
  market_1: {
    id: 'market_1',
    section: 'market',
    sectionName: 'Market Research',
    title: 'Look up a Polymarket trader',
    description: 'Search for a trader by username in the Polymarket Trader Lookup',
    page: '/betting-markets',
  },
  market_2: {
    id: 'market_2',
    section: 'market',
    sectionName: 'Market Research',
    title: 'Browse live prediction markets',
    description: 'Explore at least one live prediction market',
    page: '/betting-markets',
  },
  market_3: {
    id: 'market_3',
    section: 'market',
    sectionName: 'Market Research',
    title: 'Check the sports odds board',
    description: "View today's lines on the Sports Odds Board",
    page: '/betting-markets',
  },
  watchlist_1: {
    id: 'watchlist_1',
    section: 'watchlist',
    sectionName: 'Watchlist',
    title: 'Add a stock to your watchlist',
    description: 'Search for a stock and add it to your watchlist',
    page: '/watchlist',
  },
  watchlist_2: {
    id: 'watchlist_2',
    section: 'watchlist',
    sectionName: 'Watchlist',
    title: 'Create a custom watchlist',
    description: 'Create a new watchlist category for organizing stocks',
    page: '/watchlist',
  },
  watchlist_3: {
    id: 'watchlist_3',
    section: 'watchlist',
    sectionName: 'Watchlist',
    title: 'Set a price alert',
    description: 'Set a price alert on a stock in your watchlist',
    page: '/watchlist',
  },
  community_1: {
    id: 'community_1',
    section: 'community',
    sectionName: 'Community',
    title: 'View the community feed',
    description: 'Browse posts in the Community Feed',
    page: '/community',
  },
  community_2: {
    id: 'community_2',
    section: 'community',
    sectionName: 'Community',
    title: 'Explore a legendary investor profile',
    description: 'Click on a legendary investor to see their strategy and track record',
    page: '/community',
  },
  community_3: {
    id: 'community_3',
    section: 'community',
    sectionName: 'Community',
    title: 'Check the leaderboard',
    description: 'View the top performers on the Leaderboard',
    page: '/community',
  },
  learning_1: {
    id: 'learning_1',
    section: 'learning',
    sectionName: 'Learning Center',
    title: 'Start a learning module',
    description: 'Open any course or module in the Learning Center',
    page: '/learning-center',
  },
  learning_2: {
    id: 'learning_2',
    section: 'learning',
    sectionName: 'Learning Center',
    title: 'Complete a quiz',
    description: 'Finish a quiz at the end of a lesson',
    page: '/learning-center',
  },
  learning_3: {
    id: 'learning_3',
    section: 'learning',
    sectionName: 'Learning Center',
    title: 'Bookmark a lesson',
    description: 'Save a lesson to your bookmarks for later review',
    page: '/learning-center',
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
