// Seeded random number generator using user ID as seed
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Generate a range of values using the seed
function seededRange(seed, min, max) {
  return min + seededRandom(seed) * (max - min);
}

// Stock ticker pool for mock portfolios
const TICKER_POOL = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'JPM', 'V', 'JNJ',
  'PG', 'MA', 'DIS', 'HD', 'NFLX', 'PYPL', 'INTC', 'AMD', 'IBM', 'CSCO',
  'CRM', 'ADBE', 'MU', 'QCOM', 'INTU', 'SBUX', 'PEP', 'KO', 'MCD', 'NKE',
  'BKNG', 'AIRBNB', 'UBER', 'LYFT', 'SNAP', 'PIN', 'SQ', 'Z', 'OKTA', 'DDOG',
];

// Sector pool for mock data
const SECTOR_POOL = [
  'Technology',
  'Financial Services',
  'Healthcare',
  'Consumer',
  'Energy',
  'Industrials',
  'Materials',
  'Real Estate',
  'Utilities',
  'Communication Services',
];

/**
 * Generate unique mock portfolio data for a user based on their ID
 * @param {string} userId - The user's ID (used as seed)
 * @returns {object} Mock portfolio data with holdings, movers, sectors, activity
 */
export function generateUserMockData(userId) {
  // Convert user ID to a numeric seed
  let seed = 0;
  for (let i = 0; i < userId.length; i++) {
    seed = ((seed << 5) - seed) + userId.charCodeAt(i);
    seed = seed & seed; // Convert to 32bit integer
  }
  // Make seed positive and reasonable
  seed = Math.abs(seed) % 10000;

  // Generate number of holdings (5-12)
  const holdingCount = Math.floor(seededRange(seed, 5, 12));
  const holdings = [];

  // Generate holdings
  for (let i = 0; i < holdingCount; i++) {
    const tickerIdx = Math.floor(seededRandom(seed + i * 100) * TICKER_POOL.length);
    const ticker = TICKER_POOL[tickerIdx];

    // Avoid duplicates
    if (holdings.some((h) => h.ticker === ticker)) continue;

    const quantity = Math.floor(seededRange(seed + i * 101, 5, 500));
    const avgCost = parseFloat(
      seededRange(seed + i * 102, 10, 500).toFixed(2)
    );
    const currentPrice = parseFloat(
      (avgCost * seededRange(seed + i * 103, 0.8, 1.3)).toFixed(2)
    );
    const dailyChange = parseFloat(
      (seededRange(seed + i * 104, -5, 5) ).toFixed(2)
    );

    holdings.push({
      ticker,
      quantity,
      avg_cost: avgCost,
      current_price: currentPrice,
      daily_change_percent: dailyChange,
      value: quantity * currentPrice,
    });
  }

  // Calculate top movers (by daily change %)
  const movers = holdings
    .sort((a, b) => Math.abs(b.daily_change_percent) - Math.abs(a.daily_change_percent))
    .slice(0, 3)
    .map((h) => ({
      ticker: h.ticker,
      change: h.daily_change_percent,
      value: h.value,
    }));

  // Generate activity score (0-100)
  const activityScore = Math.floor(seededRange(seed + 1000, 40, 95));

  // Generate streak (days)
  const streak = Math.floor(seededRange(seed + 1001, 1, 45));

  // Generate sector allocation (2-3 random sectors)
  const sectorCount = Math.floor(seededRange(seed + 1002, 2, 3.99));
  const sectors = [];
  for (let i = 0; i < sectorCount; i++) {
    const sectorIdx = Math.floor(seededRandom(seed + i * 200 + 1002) * SECTOR_POOL.length);
    const sectorName = SECTOR_POOL[sectorIdx];

    if (!sectors.some((s) => s.name === sectorName)) {
      sectors.push({
        name: sectorName,
        change: parseFloat((seededRange(seed + i * 201 + 1002, -3, 5)).toFixed(2)),
      });
    }
  }

  // Total portfolio value
  const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);

  // Daily portfolio change
  const dailyChange = parseFloat(
    (seededRange(seed + 2000, -2, 3)).toFixed(2)
  );

  return {
    holdings,
    movers,
    sectors,
    activityScore,
    streak,
    totalValue: parseFloat(totalValue.toFixed(2)),
    dailyChange,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Get a seeded random color (for charts, etc)
 * @param {string} userId - User ID for seeding
 * @param {number} index - Index for variation
 * @returns {string} Hex color string
 */
export function getSeededColor(userId, index = 0) {
  const colors = [
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#3b82f6', // blue
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f97316', // orange
  ];

  // Convert user ID to numeric seed
  let seed = 0;
  for (let i = 0; i < userId.length; i++) {
    seed = ((seed << 5) - seed) + userId.charCodeAt(i);
    seed = seed & seed;
  }

  const colorIdx = (Math.abs(seed) + index) % colors.length;
  return colors[colorIdx];
}
