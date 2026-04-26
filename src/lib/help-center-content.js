/**
 * Help Center Content — User and Partner articles
 * Centralized content for /help-center/user and /help-center/partner
 *
 * ─── Feature inventory (scanned from src/app/(dashboard)) ──────────────
 * Every article below is grounded in a real feature or route. When adding
 * new docs, cross-check against this inventory so we never ship docs for
 * features that don't exist.
 *
 *   • home                      → Home terminal entry (Bloomberg-style layout)
 *   • home-dashboard            → Portfolio hero, My Holdings, Watchlist card,
 *                               Total Profits, Sector Distribution, Recent
 *                               Transactions, performance-vs-platform chart
 *   • trading/                → Live brokerage trading (Alpaca)
 *   • trading/mock            → Paper trading, $100,000 starting cash
 *                               (see src/hooks/useMockPortfolio.js)
 *   • trading/open-account    → Alpaca KYC flow
 *   • watchlist               → Dedicated watchlist page, per-ticker ±5%
 *                               alert thresholds via settings/notifications
 *   • company-research        → Ticker-level research with AI summary,
 *                               peer compare, news, financials
 *   • commodities-research    → Commodities-focused research workspace
 *   • crypto-research         → Crypto-focused research workspace
 *   • economic-indicators     → Macro / economic indicators dashboard
 *   • financial-analytics     → Additional financial analytics views
 *   • market-analysis         → Sector heatmap + rotations
 *   • for-the-quants          → Risk models, Sharpe, beta, Monte Carlo
 *   • inside-the-capitol      → Congressional trades, politician profiles,
 *                               "Top Performing Politicians" chart
 *   • betting-markets         → Polymarket / Kalshi aggregation
 *   • alternative-markets     → Alt-markets aggregation
 *   • centaur-intelligence    → Autonomous AI research sessions
 *   • kairos-signal           → Event-based trading signal
 *   • terminal                → Power-user terminal (Bloomberg-style)
 *   • ezana-echo              → Editorial platform (articles + subscriptions)
 *   • learning-center         → Courses, lessons, quizzes
 *   • learning-center/badges  → Badge catalog + progress
 *   • community               → Feed, friends, legendary investors
 *   • community/messages      → Direct + group messages (realtime, ⌘/ search)
 *   • community/profile       → Public investor profile
 *   • profile                 → User profile routes under dashboard
 *   • onboarding              → In-app onboarding flow
 *   • org-team-hub            → Org / team hub (B2B)
 *   • pricing                 → In-dashboard pricing / plan comparison
 *   • leaderboard             → Relative-performance ranking
 *   • empire-ranking          → 18-dimension global power index + Big Cycle
 *                               chart; GDELT ISR events; Polymarket overlay
 *   • user-profile-settings   → Settings: My Details, Appearance, Plan,
 *                               Billing, Notifications, Integrations, API,
 *                               Security, Delete Account
 *   • partner-home / partner-dashboard / partner-community / partner-learning
 *                             → Partner workflows (see partner articles below)
 *   • select-plan             → Subscription tiers + 14-day free trial
 * ──────────────────────────────────────────────────────────────────────
 */

function p(text) {
  return `<p>${text}</p>`;
}

function wrap(content) {
  return content.map((c) => (typeof c === 'string' ? p(c) : c)).join('');
}

// ═══════════════════════════════════════════════════════════
// USER HELP CENTER
// ═══════════════════════════════════════════════════════════

export const USER_CATEGORIES = [
  { id: 'getting-started', title: 'Getting Started', description: 'Learn the basics of Ezana Finance', iconName: 'BookOpen', articles: [
    { title: 'Creating Your Ezana Finance Account', slug: 'creating-your-account' },
    { title: 'Your First 5 Steps on Ezana', slug: 'first-steps' },
    { title: 'Login Streak & 30-Day Multiplier Reward', slug: 'login-streak-and-rewards' },
    { title: 'Navigating Your Dashboard', slug: 'navigating-the-dashboard' },
    { title: 'Understanding the Navigation Bar', slug: 'understanding-the-navbar' },
    { title: 'Paper Trading vs Live Trading', slug: 'paper-trading-vs-live' },
    { title: 'Setting Up Trade Alerts and Notifications', slug: 'setting-up-alerts' },
    { title: 'Connecting Your External Brokerage Account', slug: 'connecting-your-brokerage' },
    { title: 'Opening an Ezana Brokerage Account', slug: 'opening-a-brokerage-account' },
  ]},
  { id: 'congressional-trading', title: 'Inside the Capitol', description: 'Track and analyze congressional trades', iconName: 'Activity', articles: [
    { title: 'How Congressional Trading Data Works', slug: 'how-congressional-data-works' },
    { title: 'Understanding Congressional Disclosures', slug: 'understanding-disclosures' },
    { title: 'Following Specific Politicians', slug: 'following-politicians' },
    { title: 'Top Performing Politicians Methodology', slug: 'top-performing-politicians-methodology' },
    { title: 'Interpreting Congressional Trade Data', slug: 'interpreting-trade-data' },
    { title: 'Filtering and Searching Congressional Trades', slug: 'using-filters' },
    { title: 'Congressional Trade Alert System', slug: 'trade-alerts' },
  ]},
  { id: 'portfolio', title: 'Portfolio & Trading', description: 'Manage investments and place trades', iconName: 'Wallet', articles: [
    { title: 'Understanding Your Portfolio Dashboard', slug: 'portfolio-overview' },
    { title: 'Paper Trading: Practicing With $100,000', slug: 'paper-trading' },
    { title: 'Mock Trading: Practicing With Virtual Cash', slug: 'mock-trading-deep-dive' },
    { title: 'Tracking Your Performance Metrics', slug: 'performance-metrics' },
    { title: 'How to Place a Trade', slug: 'placing-trades' },
    { title: 'Fractional Share Investing', slug: 'fractional-shares' },
    { title: 'Depositing and Withdrawing Funds', slug: 'funding-your-account' },
    { title: 'Managing Your Watchlist', slug: 'watchlist-guide' },
    { title: 'Understanding Order Types', slug: 'order-types' },
  ]},
  { id: 'watchlists', title: 'Watchlists & Alerts', description: 'Track tickers and get price alerts', iconName: 'Bookmark', articles: [
    { title: 'Creating and Organizing Watchlists', slug: 'creating-watchlists' },
    { title: 'Setting Up Price Alerts (±5%)', slug: 'price-alerts' },
    { title: 'Organizing Tickers Across Multiple Lists', slug: 'organizing-watchlists' },
  ]},
  { id: 'research', title: 'Research Tools', description: 'Company research, market analysis, quant tools', iconName: 'BarChart3', articles: [
    { title: 'Using Company Research', slug: 'company-research' },
    { title: 'Market Analysis Tools', slug: 'market-analysis' },
    { title: 'For The Quants: Advanced Analytics', slug: 'quant-tools' },
    { title: 'Betting Markets & Prediction Data', slug: 'betting-markets' },
    { title: 'Centaur Intelligence: Your AI Research Assistant', slug: 'centaur-intelligence-overview' },
    { title: 'Earnings Call Analyzer (NLP Sentiment)', slug: 'earnings-call-analyzer' },
    { title: 'Kairos Signal: Event-Driven Trading Indicator', slug: 'kairos-signal-overview' },
    { title: 'Related Prediction Markets on Events', slug: 'polymarket-related-markets' },
    { title: 'Reading and Subscribing on Ezana Echo', slug: 'ezana-echo-guide' },
  ]},
  { id: 'account', title: 'Account & Security', description: 'Account settings and security', iconName: 'Shield', articles: [
    { title: 'Managing Your Account Settings', slug: 'account-settings' },
    { title: 'Notification Preferences', slug: 'notifications-and-email' },
    { title: 'Managing External Brokerage Connections', slug: 'managing-brokerage-connections' },
    { title: 'Appearance: Light and Dark Mode', slug: 'appearance-theme' },
    { title: 'Enabling Two-Factor Authentication', slug: 'two-factor-auth' },
    { title: 'How Your Data Is Protected', slug: 'data-security' },
    { title: 'Deleting Your Account', slug: 'deleting-account' },
  ]},
  { id: 'billing', title: 'Billing & Subscriptions', description: 'Plans, payments, and invoices', iconName: 'CreditCard', articles: [
    { title: 'Understanding Ezana Plans', slug: 'plans-overview' },
    { title: 'Upgrading, Downgrading, or Canceling', slug: 'managing-subscription' },
    { title: 'Canceling Your Subscription', slug: 'canceling-subscription' },
    { title: 'Managing Payment Methods', slug: 'payment-methods' },
    { title: 'Viewing Invoices and Billing History', slug: 'billing-history' },
  ]},
  { id: 'community', title: 'Community', description: 'Connect with other investors', iconName: 'Users', articles: [
    { title: 'Using the Ezana Community', slug: 'community-overview' },
    { title: 'Sending Messages to Other Investors', slug: 'messages' },
    { title: 'Understanding the Leaderboard', slug: 'leaderboard' },
    { title: 'Earning and Displaying Badges', slug: 'badges' },
    { title: 'Privacy on Your Public Profile', slug: 'privacy-on-profile' },
    { title: 'Community Guidelines and Posting Rules', slug: 'posting-rules' },
    { title: 'Following Users and Managing Friends', slug: 'following-users' },
  ]},
  { id: 'learning', title: 'Learning Center', description: 'Courses and educational content', iconName: 'GraduationCap', articles: [
    { title: 'Browsing and Enrolling in Courses', slug: 'courses-overview' },
    { title: 'Completing Lessons, Quizzes, and Earning Certificates', slug: 'completing-lessons' },
    { title: 'Tracking Your Learning Progress', slug: 'course-progress' },
  ]},
  { id: 'global-analysis', title: 'Global Analysis', description: 'Empire Rankings, Big Cycle, geopolitics', iconName: 'Globe2', articles: [
    { title: 'Empire Rankings Overview', slug: 'empire-rankings-overview' },
    { title: 'Empire Rankings: 18-Dimension Power Index', slug: 'empire-rankings-deep-dive' },
    { title: 'Reading the Big Cycle Chart', slug: 'big-cycle-chart' },
    { title: 'Geopolitical Events Feed (ISR)', slug: 'geopolitical-events-feed' },
    { title: 'Prediction Markets on Ezana', slug: 'prediction-markets' },
  ]},
  { id: 'legal', title: 'Legal & Disclosures', description: 'Terms, privacy, and disclosures', iconName: 'Scale', articles: [
    { title: 'Terms of Service', slug: 'terms-of-service' },
    { title: 'Privacy Policy', slug: 'privacy-policy' },
    { title: 'Important Disclosures', slug: 'disclosures' },
  ]},
];

export const USER_ARTICLES = {
  'creating-your-account': { title: 'Creating Your Ezana Finance Account', category: 'Getting Started', content: wrap([
    "To get started, visit ezana.world and click <strong>Login</strong>, then <strong>Sign up</strong>. You can register with your email address and a password.",
    "<h3>Password requirements</h3>",
    "<ul><li>Minimum length and complexity rules are shown on the sign-up form.</li><li>Use a unique password you don't reuse on other sites.</li><li>We recommend a password manager (1Password, Bitwarden, etc.).</li></ul>",
    "<h3>Email verification</h3>",
    "After sign-up, check your inbox for a verification link from Ezana. You must verify your email before some features (brokerage linking, payouts) unlock. If you don't see the message, check spam and resend from the prompt on the login page.",
    "<h3>After you land on the dashboard</h3>",
    "You'll see your home dashboard with portfolio cards, watchlist, and navigation to Research, Trading, Community, and Learning. You can explore congressional data and paper trading before connecting a bank or brokerage.",
    "<h3>Legacy invitations</h3>",
    "If you received a <strong>legacy access</strong> or early-access invitation, sign up with the <em>same email address</em> the invite was sent to. Your account tier upgrades automatically once the email matches — no separate code required in most cases.",
  ]) },
  'navigating-the-dashboard': { title: 'Navigating Your Dashboard', category: 'Getting Started', content: wrap([
    "Your dashboard is the home base of your Ezana experience. At the top, you'll see your portfolio value and daily performance.",
    "Below that, the My Holdings section shows your top 4 positions by value and your 2 worst performers. The Watchlist tracks stocks you're monitoring.",
    "Total Profits breaks down your returns by asset type, and Sector Distribution shows your portfolio allocation.",
    "Use the timeframe buttons (1D, 1M, 6M, 1Y) to view performance over different periods — both the hero chart and your holdings data will update accordingly.",
  ]) },
  'understanding-the-navbar': { title: 'Understanding the Navigation Bar', category: 'Getting Started', content: wrap([
    "The navigation bar at the top of every page gives you quick access to all features. Dashboard shows your portfolio overview.",
    "Research opens a dropdown with six tools: Inside The Capitol (congressional trades), Company Research (financial analysis), Market Analysis (sector trends), For The Quants (quantitative tools), Betting Markets (prediction data), and Ezana Echo (articles).",
    "Trading lets you buy and sell stocks. Watchlist tracks your monitored tickers. Community connects you with other investors. Learning Center offers courses and educational content.",
    "The sun/moon icon toggles light and dark mode, and the gear icon opens Settings.",
  ]) },
  'setting-up-alerts': { title: 'Setting Up Trade Alerts and Notifications', category: 'Getting Started', content: wrap([
    "Navigate to <strong>Settings → Notifications</strong>. Each category can be toggled independently and routed to in-app, email, and (where supported) push.",
    "<h3>Congressional Trades</h3>",
    "<ul><li>All new STOCK Act filings, or only politicians you follow.</li><li>Optional filters by party, chamber, or minimum trade size.</li><li>Appears under the Congressional / Capitol category in the notifications bell.</li></ul>",
    "<h3>Watchlist &amp; prices</h3>",
    "<ul><li>Default ±5% move alerts per watchlist ticker; customizable per ticker.</li><li>Configurable in Settings and on the Watchlist page (bell icon per row).</li></ul>",
    "<h3>Portfolio &amp; account</h3>",
    "<ul><li>Daily summaries, risk warnings, contribution reminders.</li><li>Earnings calendar for companies you track.</li></ul>",
    "<h3>Community &amp; learning</h3>",
    "<ul><li>Replies, follows, mentions, and direct messages.</li><li>Learning milestones, badge unlocks, course updates.</li></ul>",
    "<h3>Quiet hours &amp; digests</h3>",
    "Set quiet hours to silence push during sleep. For email-heavy categories, choose instant, daily, or weekly digest instead of one email per event.",
  ]) },
  'connecting-your-brokerage': { title: 'Connecting Your External Brokerage Account', category: 'Getting Started', content: wrap([
    "Ezana can display holdings from your existing brokerage accounts (Fidelity, Schwab, Robinhood, etc.) for portfolio tracking.",
    "Go to Settings → Integrations and click 'Connect' on any supported brokerage. You'll be redirected to Plaid's secure connection flow where you log into your brokerage.",
    "Ezana receives read-only access to your positions and balances — we cannot place trades or move money on your external accounts. This data powers your dashboard portfolio view and AI-generated insights.",
  ]) },
  'opening-a-brokerage-account': { title: 'Opening an Ezana Brokerage Account', category: 'Getting Started', content: wrap([
    "To trade directly on Ezana, you need to open a brokerage account powered by Alpaca Securities.",
    "Navigate to the Trading page — if you don't have an account yet, you'll see a 4-step onboarding form. You'll need to provide your legal name, date of birth, Social Security number, phone number, and residential address.",
    "Alpaca performs identity verification (KYC), which typically takes a few minutes. Once approved, you can fund your account via ACH bank transfer and begin trading stocks, ETFs, and fractional shares. Your account is SIPC insured up to $500,000.",
  ]) },
  'how-congressional-data-works': { title: 'How Congressional Trading Data Works', category: 'Congressional Trading', content: wrap([
    "Under the STOCK Act of 2012, members of Congress must publicly disclose stock, bond, and securities transactions exceeding $1,000 within 45 days.",
    "These filings are submitted to the Clerk of the House or Secretary of the Senate and published as public records. Ezana aggregates these filings, parses the data into structured format, and makes it searchable and filterable on the Inside The Capitol page.",
    "Each trade shows the politician's name, party, chamber, the stock traded, the transaction type (buy/sell), the estimated dollar range, and the filing date.",
  ]) },
  'following-politicians': { title: 'Following Specific Politicians', category: 'Congressional Trading', content: wrap([
    "On the Inside The Capitol page, click on any politician's name to view their full profile.",
    "From their profile, you can see their complete trading history, portfolio holdings, filing statistics (including whether they file on time or late), committee memberships, and their portfolio performance over time.",
    "You can set up alerts for specific politicians so you're notified whenever they file a new trade. The Top Holdings donut chart shows their portfolio allocation, and Recent Trades lists their latest activity.",
  ]) },
  'interpreting-trade-data': { title: 'Interpreting Congressional Trade Data', category: 'Congressional Trading', content: wrap([
    "Congressional disclosures report trades in value ranges (e.g., $15K-$50K), not exact amounts. The transaction date is when the trade was executed, while the filing date is when it was publicly disclosed — the gap between these dates is key.",
    "Look for trades made close to committee hearings or legislative votes on related industries.",
    "The 'Similar Traders' section on each politician's profile shows which other members of Congress have the most overlapping trading patterns, which can help identify coordinated or sector-focused trading.",
  ]) },
  'using-filters': { title: 'Filtering and Searching Congressional Trades', category: 'Congressional Trading', content: wrap([
    "The Latest Trades section supports multiple filters. Use the asset type tabs (Stocks Only, Options, All) to narrow by instrument.",
    "The Buy/Sell/All filter shows only purchases, only sales, or both. You can filter by chamber (House or Senate) and by party.",
    "The search bar lets you look up specific politicians or stock tickers. The Top Performing Politicians chart shows which members have the best trading track records, and clicking any dot navigates to that politician's full profile.",
  ]) },
  'trade-alerts': { title: 'Congressional Trade Alert System', category: 'Congressional Trading', content: wrap([
    "Ezana sends real-time notifications when new congressional trade filings are detected. You can configure these in Settings → Notifications → Congressional Trades.",
    "Options include: alerts for all new filings, alerts only for politicians you follow, alerts filtered by party or chamber, and alerts for specific tickers.",
    "Notification channels include push notifications, email digests (instant, daily, or weekly), and in-app notifications via the bell icon. Large trades (over $500K) are automatically flagged with a special indicator.",
  ]) },
  'portfolio-overview': { title: 'Understanding Your Portfolio Dashboard', category: 'Portfolio & Trading', content: wrap([
    "Your dashboard's hero card shows your total portfolio value, daily change (percentage and dollar amount), and a sparkline chart of recent performance.",
    "<h3>Holdings strip</h3>",
    "<ul><li><strong>My Holdings</strong> — top 4 positions by value plus 2 worst performers marked with an Underperforming badge.</li><li><strong>Watchlist</strong> — tickers you're tracking without a full position.</li><li><strong>Total Profits</strong> — return breakdown by asset type where applicable.</li></ul>",
    "<h3>Timeframes</h3>",
    "Use the timeframe buttons (1D, 1M, 6M, 1Y) to switch views — the chart, headline value, change percentages, and holding rows update together so you're never comparing mismatched windows.",
    "<h3>Mock vs live</h3>",
    "If you haven't connected a brokerage, the dashboard reflects your <strong>paper</strong> portfolio. After linking Alpaca or Plaid read-only, live holdings drive the same cards.",
  ]) },
  'placing-trades': { title: 'How to Place a Trade', category: 'Portfolio & Trading', content: wrap([
    "Navigate to Trading → Trade tab. Select Buy or Sell at the top. Search for a stock by typing its ticker or company name — results appear in a live dropdown showing the symbol, full name, and whether fractional shares are available.",
    "Select your order type (Market executes immediately at current price, Limit executes only at your specified price or better). Choose between Shares (whole or fractional) or Dollars (invest a specific dollar amount).",
    "Set the duration (Day expires at market close, Good Til Canceled stays open). Review and submit your order.",
  ]) },
  'fractional-shares': { title: 'Fractional Share Investing', category: 'Portfolio & Trading', content: wrap([
    "Fractional shares let you invest a specific dollar amount in any eligible stock, regardless of its share price. Instead of needing $3,000+ to buy a single share of a high-priced stock, you can invest as little as $1.",
    "When placing a trade, select 'Dollars' as your amount type and enter the dollar amount you want to invest. The system calculates the fractional quantity automatically.",
    "Not all stocks support fractional trading — look for the 'Fractional' badge in search results.",
  ]) },
  'funding-your-account': { title: 'Depositing and Withdrawing Funds', category: 'Portfolio & Trading', content: wrap([
    "Go to <strong>Trading → Fund Account</strong>. Deposits and withdrawals use ACH through your linked bank (via Plaid).",
    "<h3>Linking your bank</h3>",
    "<ul><li>Choose an existing linked account or connect a new one through Plaid's secure flow.</li><li>Some institutions use <strong>instant verification</strong> (credentials); others may use micro-deposits — two small credits that you confirm by amount in the app.</li><li>Micro-deposit verification can add 1–2 business days before the link is fully active.</li></ul>",
    "<h3>Deposits (ACH)</h3>",
    "Enter an amount and submit. Standard ACH takes <strong>1–3 business days</strong> to settle; buying power updates after settlement. Quick amount buttons ($100, $500, $1,000, $5,000) speed up entry.",
    "<h3>Withdrawals</h3>",
    "Open the <strong>Withdraw</strong> tab, pick the bank, enter the amount, and confirm. Withdrawals follow the same ACH rails — expect several business days before funds hit your external account.",
    "<h3>History &amp; limits</h3>",
    "The <strong>History</strong> tab lists every transfer with status (pending, completed, failed). Your broker (Alpaca) may impose daily or monthly transfer limits; the UI surfaces errors if a transfer is rejected.",
  ]) },
  'watchlist-guide': { title: 'Managing Your Watchlist', category: 'Portfolio & Trading', content: wrap([
    "Your Watchlist tracks stocks you're interested in but may not currently own. From the Dashboard, the Watchlist card shows your tracked tickers with current price and daily change percentage.",
    "To add stocks, navigate to the Watchlist page and use the search function. You can create multiple watchlists organized by strategy (e.g., 'Congressional Picks', 'Dividend Plays', 'Tech Growth').",
    "Set price alerts on any watchlisted stock to be notified when it hits your target price.",
  ]) },
  'order-types': { title: 'Understanding Order Types', category: 'Portfolio & Trading', content: wrap([
    "Ezana supports several order types. Market orders execute immediately at the best available price — use these when you want to buy or sell right now.",
    "Limit orders let you set a specific price — the order only executes when the stock reaches your price or better, protecting you from unfavorable fills.",
    "Day orders expire at market close if not filled. Good Til Canceled (GTC) orders stay open until filled or manually canceled. You can view and cancel all open orders from the Trading → Orders tab.",
  ]) },
  'company-research': { title: 'Using Company Research', category: 'Research Tools', content: wrap([
    "The Company Research page provides institutional-grade analysis for any publicly traded company. Enter a ticker symbol to load a comprehensive overview including: AI-generated analysis powered by real-time market data, financial metrics (P/E ratio, market cap, revenue growth, profit margins), technical indicators, recent news sentiment, and congressional trading activity related to that company.",
    "The AI analysis provides both bull and bear cases and rates the stock on a 1-10 scale across multiple factors.",
  ]) },
  'market-analysis': { title: 'Market Analysis Tools', category: 'Research Tools', content: wrap([
    "The Market Analysis page tracks sector-level trends across the market. View which sectors are gaining or losing momentum, see capital flows between industries, and identify rotation patterns.",
    "Sector data includes performance metrics, top-performing stocks within each sector, and correlation with congressional trading patterns. Use this to understand the macro environment before making individual stock decisions.",
  ]) },
  'quant-tools': { title: 'For The Quants: Advanced Analytics', category: 'Research Tools', content: wrap([
    "The For The Quants section provides professional-grade quantitative tools including: Sharpe ratio calculations, beta analysis against major indices, volatility scoring and historical volatility charts, sector exposure analysis, correlation matrices between your holdings, and Monte Carlo simulations for portfolio stress testing.",
    "Data can be exported in CSV format for use in external tools. These metrics help you understand the risk-adjusted performance of your portfolio.",
  ]) },
  'betting-markets': { title: 'Betting Markets & Prediction Data', category: 'Research Tools', content: wrap([
    "The Betting Markets page aggregates prediction market data for events that could impact financial markets — election outcomes, policy decisions, economic indicators, and more.",
    "Prediction markets often price in information before traditional markets react, giving you an early signal on sentiment shifts. Use this alongside congressional trading data and market analysis for a multi-signal approach to investment research.",
  ]) },
  'ezana-echo-guide': { title: 'Reading and Subscribing on Ezana Echo', category: 'Research Tools', content: wrap([
    "Ezana Echo is our editorial platform where verified partners and the Ezana research team publish market insights, analysis, and commentary.",
    "Browse articles by category (Markets, Investing, Trading, Crypto, Economy, Politics, Technology, Education). Click on any author's name to view their profile, article history, and subscriber count.",
    "Click Subscribe to follow an author — you'll be notified when they publish new content. Subscribing requires a free Ezana account. Pinned articles at the top of the page are selected by our editorial team as must-reads.",
  ]) },
  'account-settings': { title: 'Managing Your Account Settings', category: 'Account & Security', content: wrap([
    "Access Settings by clicking the gear icon in the top-right of the navbar. The Settings page has 10 panels: My Details (personal info), Profile (public profile settings), Password (security and 2FA), Family (shared accounts), Plan (subscription management), Billing (payment methods), Email (email preferences), Notifications (alert configuration), Integrations (brokerage connections), and API (developer access).",
    "Changes save automatically when you click the Save button on each panel.",
  ]) },
  'two-factor-auth': { title: 'Enabling Two-Factor Authentication', category: 'Account & Security', content: wrap([
    "Go to Settings → Password. Toggle on 'Two-Factor Authentication'. You'll be prompted to scan a QR code with an authenticator app (Google Authenticator, Authy, or 1Password).",
    "Enter the 6-digit code to verify setup. Once enabled, you'll need to enter a code from your authenticator app every time you log in.",
    "We strongly recommend enabling 2FA if you have a brokerage account connected or an active trading account.",
  ]) },
  'data-security': { title: 'How Your Data Is Protected', category: 'Account & Security', content: wrap([
    "Ezana uses bank-grade security practices. All data is encrypted in transit using TLS 1.3 and at rest using AES-256 encryption.",
    "Brokerage connections are handled through Plaid (read-only access) and Alpaca Securities (trading), both of which are SOC 2 Type II certified. We never store your brokerage login credentials.",
    "Your Ezana brokerage account is SIPC insured up to $500,000. We do not sell your personal data to third parties. You can request a full export or deletion of your data at any time.",
  ]) },
  'deleting-account': { title: 'Deleting Your Account', category: 'Account & Security', content: wrap([
    "To delete your account, go to Settings → My Details and scroll to the bottom. Click 'Delete Account' in the danger zone. You'll be asked to confirm by typing your email address.",
    "If you have an active brokerage account, you must close all positions and withdraw all funds before deleting. If you have an active subscription, it will be canceled immediately with no refund for the current billing period.",
    "Account deletion is permanent — all your data, watchlists, and settings will be removed within 30 days.",
  ]) },
  'plans-overview': { title: 'Understanding Ezana Plans', category: 'Billing & Subscriptions', content: wrap([
    "Ezana offers four paid tiers plus a free trial. All paid plans include a <strong>14-day free trial</strong> with no charge until the trial ends.",
    "<h3>The tiers</h3>",
    "<ul><li><strong>Personal</strong> — $5/month or $48/year ($4/mo effective). Core dashboard, basic congressional alerts, watchlists, news feed, mock trading. For investors getting started.</li><li><strong>Personal Advanced</strong> — $19/month or $180/year ($15/mo effective). Real-time congressional alerts, advanced portfolio analytics, risk scoring, dividend tracking, sector exposure analysis. The most popular tier.</li><li><strong>Family</strong> — $49/month or $468/year ($39/mo effective). Up to 5 household accounts, shared watchlists and portfolios, parental controls, consolidated household view.</li><li><strong>Professional</strong> — $119/month or $1,140/year. API access, full data exports, priority support, custom reports. For serious traders and small advisor practices.</li></ul>",
    "<h3>What's free without a paid plan</h3>",
    "Ezana doesn't have a permanent free tier — instead, every paid tier includes a 14-day free trial that lets you explore everything before committing.",
    "<h3>Switching tiers</h3>",
    "Settings → Plan lets you upgrade or downgrade. Upgrades take effect immediately and you're prorated for the remainder of the current billing period. Downgrades take effect at the next billing cycle.",
    "<h3>Canceling</h3>",
    "Cancel anytime from Settings → Plan → Cancel Subscription. You keep access until the end of your current paid period. After cancellation, your account remains but Pro features become locked.",
  ]) },
  'managing-subscription': { title: 'Upgrading, Downgrading, or Canceling', category: 'Billing & Subscriptions', content: wrap([
    "Go to Settings → Plan to view your current subscription. To upgrade, click on a higher plan — you'll be prorated for the remainder of your billing cycle.",
    "To downgrade, select a lower plan — the change takes effect at the end of your current billing period. To cancel, click 'Cancel Subscription' — you'll retain access until the end of your current billing period.",
    "Legacy access users cannot be downgraded; your benefits are permanent.",
  ]) },
  'payment-methods': { title: 'Managing Payment Methods', category: 'Billing & Subscriptions', content: wrap([
    "Go to Settings → Billing to view and manage your payment methods. We accept Visa, Mastercard, American Express, and Discover credit and debit cards.",
    "Click 'Add Payment Method' to add a new card. Your default payment method is used for all subscription charges. You can update your billing address from the same page.",
    "All payment processing is handled securely through Stripe — Ezana never sees or stores your full card number.",
  ]) },
  'billing-history': { title: 'Viewing Invoices and Billing History', category: 'Billing & Subscriptions', content: wrap([
    "Go to Settings → Billing and scroll to the Billing History section. Here you'll find a table of all past charges including the date, amount, payment method used, and status.",
    "Click on any invoice to download a PDF receipt. If you need a receipt for a specific transaction, you can also contact support at contact@ezana.world with the transaction date and amount.",
  ]) },
  'community-overview': { title: 'Using the Ezana Community', category: 'Community', content: wrap([
    "The Community page is where Ezana investors connect, share research, and discuss market trends. The Community Feed shows posts from all users, which you can filter by topic, followed discussions, and trending content.",
    "Active Discussions highlights the most engaging conversations. The Leaderboard ranks users by portfolio performance. My Friends shows your connections and their recent activity. Legendary Investors showcases public profiles of iconic investors for learning and inspiration.",
  ]) },
  'posting-rules': { title: 'Community Guidelines and Posting Rules', category: 'Community', content: wrap([
    "Be respectful and constructive. Share research, analysis, and insights — not hype or pump-and-dump schemes. Do not share specific buy/sell recommendations as financial advice.",
    "Cite your sources when referencing data or news. Do not share personal financial information (account numbers, SSN, etc.) in public posts.",
    "Spam, harassment, and hate speech result in immediate account suspension. Report any violations using the flag icon on any post.",
  ]) },
  'following-users': { title: 'Following Users and Managing Friends', category: 'Community', content: wrap([
    "Click 'Add Friend' in the My Friends section to search for and connect with other Ezana users. Once connected, their activity (new investments, posts, and milestones) appears in your Friends Activity feed.",
    "You can follow users without adding them as friends — following lets you see their public posts in your feed. To unfollow or remove a friend, visit your Friends list and click the options menu next to their name.",
  ]) },
  'courses-overview': { title: 'Browsing and Enrolling in Courses', category: 'Learning Center', content: wrap([
    "The Learning Center offers structured courses on investing, trading, and financial literacy created by verified Ezana partners and our research team.",
    "Browse available courses by category — each course card shows the instructor, difficulty level, number of modules, and estimated completion time. Click on a course to see the full curriculum, module breakdown, and lesson list.",
    "Click 'Start Course' to enroll — your progress is saved automatically so you can pick up where you left off.",
  ]) },
  'completing-lessons': { title: 'Completing Lessons, Quizzes, and Earning Certificates', category: 'Learning Center', content: wrap([
    "Each course is divided into modules, and each module contains lessons. Lessons can be video content, articles, or quizzes.",
    "After watching or reading a lesson, click 'Mark Complete' to track your progress. Quizzes test your understanding — select an answer and submit to see if you're correct. Your score is tracked per quiz.",
    "Complete all modules in a course to earn a completion certificate. The Learning Report shows your overall progress, quiz scores, and time spent across all enrolled courses.",
  ]) },
  'course-progress': { title: 'Tracking Your Learning Progress', category: 'Learning Center', content: wrap([
    "Your progress is visible on the course detail page via the progress ring in the left sidebar. The ring fills as you complete lessons.",
    "Each module shows which lessons are complete (green checkmark) and which remain. Use the 'Continue Learning' button to jump to your next uncompleted lesson.",
    "If you've completed a quiz but want to retake it, you can revisit the quiz lesson and try again — your highest score is kept.",
  ]) },

  // ── New: Getting Started ──────────────────────────────────────────────
  'first-steps': { title: 'Your First 5 Steps on Ezana', category: 'Getting Started', content: wrap([
    "After signing up, here's a five-step path to get the most out of Ezana in your first week:",
    "<ol><li><strong>Take your first Learning Center lesson.</strong> Go to Learning Center from the nav and open a recommended course. The first lesson is usually five minutes and orients you to core concepts.</li><li><strong>Create a watchlist.</strong> Use the Watchlist page to add 5–10 tickers you're curious about. The dashboard Watchlist card will start populating immediately.</li><li><strong>Make your first paper trade.</strong> Go to Trading and buy a few shares of something you've just added to your watchlist. Paper trading uses $100,000 of virtual cash, so there's no real risk.</li><li><strong>Open a Company Research page.</strong> Search a ticker you own in paper and skim the AI summary, recent news, and financials.</li><li><strong>Check Inside the Capitol.</strong> Browse the latest congressional trades and follow one or two members to get a feel for the data.</li></ol>",
    "Everything above is free and doesn't require a paid plan or a connected brokerage.",
  ]) },
  'paper-trading-vs-live': { title: 'Paper Trading vs Live Trading', category: 'Getting Started', content: wrap([
    "Ezana supports two portfolio modes side-by-side:",
    "<ul><li><strong>Paper trading</strong> (default): Practice investing with $100,000 of virtual cash. No real money moves. Paper trading is for education — to learn how markets work, test strategies, and build discipline.</li><li><strong>Live trading</strong>: Connect a real brokerage via Plaid (read-only), or open an Ezana brokerage account powered by Alpaca. Your real positions then drive the dashboard.</li></ul>",
    "Paper trading on Ezana does not place real orders anywhere. It exists purely inside the app. Any performance figures you see in paper mode are simulated — they are not advice, forecasts, or guarantees of real-world returns.",
    "When you connect a real brokerage, Ezana automatically uses your live holdings for portfolio metrics. Your paper portfolio is still accessible but the dashboard reflects your real account by default. You can always reset the paper portfolio in Settings → Account.",
  ]) },

  // ── New: Portfolio & Trading ──────────────────────────────────────────
  'paper-trading': { title: 'Paper Trading: Practicing With $100,000', category: 'Portfolio & Trading', content: wrap([
    "<strong>What you get:</strong> Every Ezana account starts with $100,000 in virtual cash for paper trading. This is defined in the app (see <code>useMockPortfolio.js</code>) and is available even on the free tier.",
    "<strong>How fills work:</strong> Paper trades fill at the most recent market close price. There's no slippage, no commissions, no T+1 settlement, and no after-hours fills. The goal is to make the core mechanics tangible, not to simulate every nuance of real trading.",
    "<strong>Limitations:</strong> Paper trading supports long equity positions only. No options, futures, crypto, margin, or short selling. Quotes are delayed 15 minutes during market hours.",
    "<strong>Resetting:</strong> You can reset your paper portfolio back to $100,000 cash at any time from Settings → Account. Your trading history is cleared but any badges you earned for paper-trading milestones are kept.",
    "When you connect a real brokerage, the dashboard switches to showing live data. The paper portfolio is preserved in the background — useful if you want to keep testing strategies alongside real investing.",
  ]) },
  'performance-metrics': { title: 'Tracking Your Performance Metrics', category: 'Portfolio & Trading', content: wrap([
    "Your dashboard displays a set of performance metrics that each answer a specific question about your investing:",
    "<ul><li><strong>Total Return</strong> — time-weighted return since your tracking start date, expressed as a percentage. This is the single headline figure for how you're doing.</li><li><strong>vs S&amp;P 500</strong> — your return minus the S&amp;P 500's return over the same window. Positive means you're outperforming the benchmark.</li><li><strong>Consistency</strong> — how stable your returns are month to month. Higher consistency means fewer large drawdowns.</li><li><strong>Diversification</strong> — how spread out your holdings are across sectors. A very high number indicates concentration risk.</li><li><strong>Holding Discipline</strong> — how long, on average, you hold positions before selling. Rewards a long-term mindset.</li><li><strong>Contribution Streak</strong> — how many consecutive months you've added cash to the portfolio.</li></ul>",
    "The Performance vs. Platform chart on the dashboard uses <em>window-local</em> return math: whichever time range you select (1D, 1M, 6M, 1Y), both your line and the platform line are re-indexed to 0% at the start of that window. This keeps comparisons honest.",
  ]) },

  // ── New: Inside the Capitol (expanded) ────────────────────────────────
  'top-performing-politicians-methodology': { title: 'Top Performing Politicians Methodology', category: 'Inside the Capitol', content: wrap([
    "The Top Performing Politicians chart ranks members of Congress by an <strong>Estimated Return on Disclosed Trades</strong>. It is an estimate, not a report of an actual portfolio return — and that distinction matters.",
    "<h3>How the estimate is built</h3>",
    "<ol><li><strong>Amount midpoints.</strong> Congressional disclosures report trades in value ranges (e.g. $15K–$50K). We use the midpoint of each range as the assumed size of the trade.</li><li><strong>Matched buys and sells.</strong> For each member, we match disclosed buys to later disclosed sells in the same ticker (FIFO). Open positions are marked-to-market at the most recent close price.</li><li><strong>Entry and exit prices.</strong> Executed-price data is not published, so we use the adjusted close price on the <em>transaction</em> date (not the filing date) to approximate entry and exit.</li><li><strong>Aggregation.</strong> The per-trade results are aggregated per politician over the chosen time window to produce the estimated return.</li></ol>",
    "<h3>Why you should treat this as an estimate</h3>",
    "<ul><li>The midpoint of a range can be off by a lot — a trade reported as \"$15K–$50K\" is anywhere in that band.</li><li>Congressional reports don't capture cost basis, holding costs, taxes, or account-level sizing.</li><li>Late filings are common; trades can surface weeks or months after they occurred. The STOCK Act's 45-day reporting window is a floor, not a ceiling.</li><li>There is no public ground-truth portfolio to compare against for any member of Congress.</li></ul>",
    "Use this ranking as a <em>signal</em> about disclosed activity, not as a precise track record.",
  ]) },
  'understanding-disclosures': { title: 'Understanding Congressional Disclosures', category: 'Inside the Capitol', content: wrap([
    "The STOCK Act of 2012 requires members of Congress, their spouses, and their dependent children to publicly disclose covered securities transactions greater than $1,000 within 45 days of the transaction.",
    "<h3>What gets disclosed</h3>",
    "<ul><li>Buys and sells of stocks, bonds, ETFs, and options.</li><li>The transaction date, the disclosure filing date, the ticker, and an amount range (e.g. $1,001–$15,000 or $15,001–$50,000).</li><li>The owner category: self, spouse, or dependent child.</li></ul>",
    "<h3>What's missing on purpose</h3>",
    "<ul><li><strong>Exact amounts.</strong> Only ranges are required.</li><li><strong>Execution prices.</strong> The disclosures do not include the price at which a trade was filled.</li><li><strong>Cost basis and holding history.</strong> There's no ongoing inventory of positions — just discrete transactions.</li></ul>",
    "<h3>Why trades sometimes appear months late</h3>",
    "The 45-day rule is a floor. Enforcement is weak (the maximum fine is $200, which the House and Senate can waive). Some members routinely file months or even years late. We show both the <em>transaction date</em> and the <em>filing date</em> on every row so you can see the gap.",
    "Ezana aggregates these filings, normalizes the fields, and makes them searchable on the Inside the Capitol page. We don't add or adjust amounts — what you see is what was filed.",
  ]) },

  // ── New: Watchlists category ──────────────────────────────────────────
  'creating-watchlists': { title: 'Creating and Organizing Watchlists', category: 'Watchlists & Alerts', content: wrap([
    "Open the Watchlist page from the top nav. Click <strong>New List</strong> to create a named list — for example, \"Dividend Plays,\" \"Congressional Picks,\" or \"Tech Growth.\"",
    "When you create a new list, we offer theme-based suggestions (e.g. high-dividend large caps, Fed-sensitive financials) so you can seed a list in one click and then customize from there.",
    "<h3>Adding and removing tickers</h3>",
    "<ul><li>From the Watchlist page: use the search box at the top, pick a ticker, and click Add.</li><li>From a Company Research page: click the bookmark icon in the header to drop that ticker into a list.</li><li>To remove: hover the row on the Watchlist page and click the trash icon.</li></ul>",
    "<h3>Color tags and descriptions</h3>",
    "Each list supports a color tag and a short description — useful if you keep multiple lists and want to distinguish them at a glance on the dashboard Watchlist card.",
  ]) },
  'price-alerts': { title: 'Setting Up Price Alerts (±5%)', category: 'Watchlists & Alerts', content: wrap([
    "Ezana's default price-alert system watches your watchlist tickers and fires a notification whenever one moves ±5% in a session.",
    "<h3>Where the alerts show up</h3>",
    "<ul><li>The notifications bell in the top-right of the navbar shows a red badge when an alert arrives.</li><li>Alerts are grouped under the <strong>Watchlist</strong> category in the notifications panel.</li><li>You can also receive alerts via email or push by enabling those channels in Settings → Notifications.</li></ul>",
    "<h3>Customizing the threshold</h3>",
    "The default is ±5%, but you can adjust it per-ticker on the Watchlist page by clicking the bell icon on any row and typing a custom threshold (e.g. 3%, 10%).",
    "<h3>Quiet hours</h3>",
    "Settings → Notifications includes a Quiet Hours toggle so price alerts don't wake you up overnight.",
  ]) },
  'organizing-watchlists': { title: 'Organizing Tickers Across Multiple Lists', category: 'Watchlists & Alerts', content: wrap([
    "You can have as many watchlists as you like (Ezana doesn't impose a hard cap). Tickers can appear on multiple lists simultaneously — adding NVDA to \"Tech Growth\" doesn't remove it from \"Congressional Picks.\"",
    "<h3>Reordering lists</h3>",
    "Drag and drop lists in the sidebar on the Watchlist page to reorder them. The top list is shown by default when you return.",
    "<h3>Per-list dashboards</h3>",
    "Click any list to see a per-list dashboard: performance summary, top gainers/losers in the list, and the aggregate sector exposure of the list.",
    "<h3>Deleting a list</h3>",
    "Open the list, click the three-dot menu, and choose Delete. Deleting a list does <em>not</em> remove the underlying tickers from your other lists.",
  ]) },

  // ── New: Community (expanded) ─────────────────────────────────────────
  'messages': { title: 'Sending Messages to Other Investors', category: 'Community', content: wrap([
    "Messages live under Community → Messages in the top nav. The Messages page supports two conversation types:",
    "<ul><li><strong>Direct messages</strong> — one-on-one conversations with any Ezana user.</li><li><strong>Group messages</strong> — up to the limit configured for your plan, useful for study groups or investing circles.</li></ul>",
    "<h3>Realtime updates</h3>",
    "Messages are realtime. When the other person is online, you'll see typing indicators and read receipts; their last-seen time is shown in the conversation header.",
    "<h3>File attachments</h3>",
    "You can attach images (PNG, JPG, WebP) and PDFs up to 10 MB. Attached files are scoped to the conversation and are not visible anywhere else.",
    "<h3>Search</h3>",
    "Press <code>⌘ /</code> (or <code>Ctrl /</code> on Windows) to search across all conversations. The search covers message text, sender name, and ticker symbols mentioned in messages.",
    "<h3>Privacy</h3>",
    "Messages are private between participants. Ezana does not use message content to train models, and we do not surface messages in any public feed.",
  ]) },
  'leaderboard': { title: 'Understanding the Leaderboard', category: 'Community', content: wrap([
    "The Community → Leaderboard ranks users by relative investing performance. It's designed to celebrate skill without ever exposing the dollars in anyone's account.",
    "<h3>How ranking is computed</h3>",
    "<ul><li>Users are ranked on <strong>percentage return</strong>, not account size.</li><li>We use time-weighted return so deposits and withdrawals don't distort the ranking.</li><li>Returns are computed over a rolling window (1M, 3M, 6M, 1Y, YTD, All). Pick a timeframe at the top of the page.</li></ul>",
    "<h3>What's never shown</h3>",
    "<ul><li>Portfolio totals in dollars.</li><li>Individual positions or sizes.</li><li>Any identifying info the user has marked private in their profile.</li></ul>",
    "Leaderboard participation is optional — you can hide your handle from the ranking in Settings → Profile → Public Visibility.",
  ]) },
  'badges': { title: 'Earning and Displaying Badges', category: 'Community', content: wrap([
    "Ezana has a catalog of badges organized into categories: <strong>Learning</strong> (completing lessons/courses), <strong>Portfolio</strong> (return milestones, consistency, diversification), <strong>Community</strong> (following, posting, engagement), <strong>Research</strong> (using Company Research, For the Quants, Inside the Capitol), and <strong>Streaks</strong> (daily logins, contribution streaks).",
    "<h3>Tiers</h3>",
    "Most badges have five tiers — Bronze, Silver, Gold, Platinum, Diamond. Each tier represents a higher threshold for the same activity. Your current tier and progress to the next tier are shown on the Badges page (Learning Center → Badges).",
    "<h3>Where they appear</h3>",
    "<ul><li>Your public profile header (Community → profile pages).</li><li>The Badges page, which has a full catalog and progress meters.</li><li>Next to your username on posts when a badge is marked as \"featured.\"</li></ul>",
    "<h3>Featuring and hiding badges</h3>",
    "You can pick up to three badges to feature on your profile, and you can hide any badge from view. Both options are in Settings → Profile → Badges.",
  ]) },
  'privacy-on-profile': { title: 'Privacy on Your Public Profile', category: 'Community', content: wrap([
    "Your Ezana profile is <em>public by default</em> — other users can view your display name, bio, featured badges, and relative performance metrics. Here's what is and isn't visible:",
    "<h3>Public by default</h3>",
    "<ul><li>Display name and handle.</li><li>Bio and profile photo.</li><li>Featured badges and achievements.</li><li>Relative performance (percentage return, consistency, diversification — as shown on the leaderboard).</li><li>Posts, comments, and public interactions you've made in Community.</li></ul>",
    "<h3>Never public</h3>",
    "<ul><li>Portfolio totals in dollars.</li><li>Your individual trades or positions — unless you explicitly share a trade as a post.</li><li>Your email, phone, or brokerage details.</li><li>Your watchlists (unless you make a list public).</li><li>Direct messages.</li></ul>",
    "<h3>Controls</h3>",
    "Settings → Profile → Public Visibility lets you hide your handle from the leaderboard, hide your performance metrics, or make your entire profile private (you'll still appear to friends you've accepted).",
  ]) },

  // ── New: Account (expanded) ───────────────────────────────────────────
  'appearance-theme': { title: 'Appearance: Light and Dark Mode', category: 'Account & Security', content: wrap([
    "Ezana supports both light and dark themes. The app defaults to <strong>light mode</strong>; the sun/moon icon in the navbar toggles between them at any time.",
    "<h3>How your preference is saved</h3>",
    "Your choice is saved to your account settings in Supabase (<code>user_settings.theme</code>) and also mirrored to <code>localStorage</code> for fast first paint. When you log in on another device, your preferred theme follows you.",
    "<h3>System-specific behavior</h3>",
    "<ul><li>Some pages (the Global Market Analysis map, for instance) are always rendered in dark mode regardless of your preference, because the map visualization only reads well against a dark background. The rest of the app still respects your setting.</li><li>The Help Center, Dashboard, Research, Trading, Community, Settings, and Learning Center all follow your theme preference — they never force a specific mode.</li></ul>",
    "If you ever see a page locked to the wrong theme, email <a href=\"mailto:contact@ezana.world\">contact@ezana.world</a> — that's a bug we want to fix.",
  ]) },
  'canceling-subscription': { title: 'Canceling Your Subscription', category: 'Billing & Subscriptions', content: wrap([
    "You can cancel any paid Ezana plan yourself from Settings → Plan. Click <strong>Cancel Subscription</strong> at the bottom of the page and confirm in the dialog.",
    "<h3>What happens next</h3>",
    "<ul><li>You keep full access to your paid features <strong>until the end of your current billing period</strong>. You will not be charged again.</li><li>On the day after that period ends, your account downgrades automatically — you keep access to the free Starter tier and your data (watchlists, paper portfolio, badges, learning progress).</li><li>If you connected a real brokerage, that connection stays in place; it doesn't require a paid plan.</li></ul>",
    "<h3>Refunds</h3>",
    "Mid-period cancellations are <strong>not refunded</strong> — you keep access through the end of the period you already paid for. If you believe you were charged in error, email <a href=\"mailto:contact@ezana.world\">contact@ezana.world</a> with the charge date and amount and we'll make it right.",
    "<h3>Reactivating</h3>",
    "You can resubscribe at any time from Settings → Plan. Your previous data is untouched — no setup required.",
    "<h3>Deleting vs canceling</h3>",
    "Canceling stops billing. <a href=\"/help-center/user/article/deleting-account\">Deleting</a> removes your account and all associated data. These are separate actions.",
  ]) },

  // ── New: Global Analysis ──────────────────────────────────────────────
  'empire-rankings-overview': { title: 'Empire Rankings Overview', category: 'Global Analysis', content: wrap([
    "Empire Rankings is Ezana's global power index, inspired by Ray Dalio's Changing World Order framework. It measures the world's top 11 nations across <strong>18 dimensions of power</strong>.",
    "<h3>The 18 dimensions</h3>",
    "<ul><li><strong>Economic:</strong> Debt Burden, Expected Growth, Economic Output, Trade, Markets &amp; Financial Center, Reserve Currency Status, Cost Competitiveness.</li><li><strong>Capability:</strong> Education, Innovation &amp; Technology, Infrastructure, Military Strength.</li><li><strong>Resources:</strong> Geology, Resource Efficiency.</li><li><strong>Social &amp; Political:</strong> Internal Conflict, Character &amp; Civility, Rule of Law, Wealth Gaps.</li><li><strong>External:</strong> Acts of Nature.</li></ul>",
    "<h3>How scores are computed</h3>",
    "For each dimension and each year, we normalize raw indicator data across the 11 countries on a 0–1 scale. A country's Empire Score is the weighted average across the 18 dimensions (weights follow Dalio's published framework).",
    "<h3>Data sources</h3>",
    "The initial release pulls most indicators from the <strong>World Bank Open Data API</strong> and UN statistical archives. We're actively adding additional sources (IMF, SIPRI for military, OECD for education) — expect more dimensions to fill in over time. Where data is missing for a given country-year, we forward-fill from the most recent available value and mark the cell as estimated.",
  ]) },
  'big-cycle-chart': { title: 'Reading the Big Cycle Chart', category: 'Global Analysis', content: wrap([
    "The Big Cycle chart visualizes Empire Scores for multiple countries over time, going back as far as data is available (typically 1960 onwards for World Bank–sourced metrics).",
    "<h3>The default view</h3>",
    "Top economies (US, China, EU, India, Japan, UK, Russia, Brazil, Canada, Germany) are plotted simultaneously. Each country is a colored line. Hovering shows that country's exact score for the year under your cursor.",
    "<h3>Adding the All Countries overlay</h3>",
    "Toggle <strong>All Countries</strong> in the toolbar to render every country on the map as a thin gray line, with the focus countries on top. This puts the major powers in global context.",
    "<h3>Anchor mode</h3>",
    "Pick an anchor country to re-index every line to the anchor's score over time. This converts absolute scores into <em>relative</em> scores — useful for questions like \"how has China's power tracked against the US over 30 years?\"",
    "<h3>Date snapshots</h3>",
    "Click any year on the X-axis to open a snapshot panel showing each country's per-dimension scores for that specific year — useful for understanding what was driving an inflection point in the chart.",
  ]) },
  'geopolitical-events-feed': { title: 'Geopolitical Events Feed (ISR)', category: 'Global Analysis', content: wrap([
    "The ISR (Intelligence, Surveillance, Reconnaissance) panel on the Global Analysis page is a live feed of geopolitical events pulled from <strong>GDELT</strong> — the Global Database of Events, Language, and Tone.",
    "<h3>What the pulsating dots mean</h3>",
    "Each pulsating dot on the map is a recent event cluster. The dot's color encodes severity (green/yellow/red) and the pulse rate encodes how fresh it is — faster pulses are newer events.",
    "<h3>Filters</h3>",
    "<ul><li><strong>Country:</strong> scope the feed to one or more countries.</li><li><strong>Topic:</strong> military, diplomatic, economic, energy, protest, other.</li><li><strong>Severity:</strong> include only events above a chosen severity threshold.</li></ul>",
    "<h3>The Polymarket overlay</h3>",
    "Articles with a blue <strong>Polymarket</strong> badge are linked to an active prediction market. Click the badge to see the current odds — useful for gauging how traders are pricing a potentially-market-moving event.",
    "GDELT updates continuously; the feed on Ezana refreshes every few minutes.",
  ]) },
  'prediction-markets': { title: 'Prediction Markets on Ezana', category: 'Global Analysis', content: wrap([
    "Ezana integrates live odds from <strong>Polymarket</strong> (the largest crypto-settled prediction market) on both the Betting Markets page and as contextual overlays in the Global Analysis feed.",
    "<h3>Where prediction odds appear</h3>",
    "<ul><li><strong>Betting Markets page:</strong> dedicated dashboard with top markets by volume, category filters, and historical odds charts.</li><li><strong>Geopolitical Events feed:</strong> articles linked to an active market show a blue Polymarket badge with the current odds.</li><li><strong>Inside the Capitol:</strong> relevant markets (e.g. legislative outcomes) are linked on individual politician profiles where applicable.</li></ul>",
    "<h3>How to read odds</h3>",
    "A market shows \"Yes\" at 62¢ means traders currently price the event at a 62% implied probability. Odds move in real-time as volume flows in.",
    "<h3>Important disclaimer</h3>",
    "Prediction-market odds are <em>not</em> forecasts from Ezana or from any single expert. They reflect the aggregate of what people willing to put money on the question currently believe. Treat them as a useful data point alongside the rest of your research, not as a prediction.",
  ]) },

  'login-streak-and-rewards': { title: 'Login Streak & 30-Day Multiplier Reward', category: 'Getting Started', content: wrap([
    "Ezana tracks how many consecutive days you've logged in via the <strong>Day Streak</strong> card on your home page. Each day you visit Ezana, your streak grows by one. Skip a day and the streak resets to 1.",
    "<h3>How the streak is counted</h3>",
    "<ul><li>One streak day per calendar day, regardless of how many times you log in.</li><li>Counted in UTC — if you log in late at night your local time, the streak day rolls over to the next UTC date.</li><li>Tracked uniquely per user. Your streak is private to your account.</li></ul>",
    "<h3>The 30-day multiplier</h3>",
    "Reaching a 30-day streak unlocks a 7-day multiplier window where points and rewards earned across the platform (badge XP, mock-trading milestone bonuses, learning rewards) are multiplied. The Day Streak card visualizes your progress with 30 bars that fill as you advance — the final 9 bars turn gold to signal you're approaching the reward.",
    "<h3>What happens if you miss a day</h3>",
    "Your current streak resets to 1, but your <strong>longest streak</strong> is preserved. The longest streak is the all-time peak displayed on your profile.",
  ]) },
  'mock-trading-deep-dive': { title: 'Mock Trading: Practicing With Virtual Cash', category: 'Portfolio & Trading', content: wrap([
    "Every Ezana account starts with $100,000 in virtual cash for paper trading. This is genuine simulation — you can place buy and sell orders against live market prices and watch your portfolio respond as the market moves.",
    "<h3>Where to find it</h3>",
    "<ul><li><strong>Trading → Mock</strong> — the dedicated paper-trading interface with a portfolio summary, holdings list, and order entry form.</li><li><strong>Home page Mock Portfolio card</strong> — a snapshot of your virtual portfolio's current value and daily change.</li></ul>",
    "<h3>How orders fill</h3>",
    "Mock buys and sells fill at the most recent close price. There's no slippage, no commission, no fractional-share restrictions, and orders settle instantly. This makes the core mechanics tangible without simulating every nuance of real-world trading.",
    "<h3>What's not simulated</h3>",
    "<ul><li>Options, futures, crypto, margin, short selling — long equity only.</li><li>After-hours fills and pre-market trading.</li><li>Real T+1 settlement (mock cash settles instantly).</li><li>Tax events — mock gains and losses don't generate 1099s.</li></ul>",
    "<h3>Resetting your mock portfolio</h3>",
    "Settings → Account has a <strong>Reset Mock Portfolio</strong> button. This wipes all virtual holdings and returns you to $100,000 cash. Your trading history is cleared, but any badges earned for paper-trading milestones are kept.",
    "<h3>Switching between mock and live</h3>",
    "Once you connect a real brokerage (Plaid read-only or open an Ezana brokerage account via Alpaca), the dashboard's portfolio cards show real holdings. The mock portfolio remains intact in the background — useful for testing strategies you don't yet want to commit real money to.",
  ]) },
  'centaur-intelligence-overview': { title: 'Centaur Intelligence: Your AI Research Assistant', category: 'Research Tools', content: wrap([
    "Centaur Intelligence is Ezana's AI research assistant. It runs autonomous multi-step research sessions to answer questions you'd typically need to spend hours on yourself.",
    "<h3>What you can ask</h3>",
    "<ul><li>\"Compare NVDA's growth trajectory to AMD's over the last 5 years.\"</li><li>\"Summarize the key risks Tesla mentioned across its last four earnings calls.\"</li><li>\"What's the bull case and bear case for the semiconductor sector right now?\"</li><li>\"Show me politicians who bought clean-energy stocks before the IRA passed.\"</li></ul>",
    "<h3>How sessions work</h3>",
    "<ol><li>You ask a question on the Centaur Intelligence page.</li><li>Centaur breaks the question into research sub-steps and works through them sequentially — pulling data from Ezana's databases (congressional trades, market data, etc.) and the web.</li><li>You see each step as it runs, with sources cited.</li><li>The final answer synthesizes everything into a structured response with charts and references.</li></ol>",
    "<h3>What Centaur is and isn't</h3>",
    "<ul><li><strong>It is:</strong> a research accelerator that gathers, structures, and summarizes information.</li><li><strong>It isn't:</strong> personalized investment advice. Treat the output as research, not a recommendation.</li></ul>",
    "<h3>Limits and caveats</h3>",
    "Centaur sessions can take 30 seconds to a few minutes depending on complexity. Sessions are rate-limited per plan tier. The AI can be wrong — always verify specific numerical claims by clicking the cited source.",
  ]) },
  'earnings-call-analyzer': { title: 'Earnings Call Analyzer (NLP Sentiment)', category: 'Research Tools', content: wrap([
    "The Earnings Call Analyzer in Company Research uses natural language processing to extract sentiment and key themes from a company's earnings call transcripts.",
    "<h3>How to use it</h3>",
    "On any company's research page, select the <strong>Earnings Analysis</strong> model. The card shows the most recent quarter's transcript scored across four dimensions:",
    "<ul><li><strong>Tone</strong> — how positive or negative management's language was overall.</li><li><strong>Confidence</strong> — how strongly management hedged versus committed.</li><li><strong>Q&amp;A evasiveness</strong> — how often executives sidestepped analyst questions.</li><li><strong>Topic shifts</strong> — what topics got more or less airtime versus prior quarters.</li></ul>",
    "<h3>What you see</h3>",
    "<ul><li>A directional tilt (Bullish, Neutral, Bearish, Mixed) with a confidence level (Low, Moderate, High).</li><li>The 4-quarter trend on each metric.</li><li>The top topics from the transcript.</li><li>A list of positive and negative signals that justified the tilt.</li></ul>",
    "<h3>Important caveats</h3>",
    "Earnings-call NLP produces a <em>signal</em>, not a prediction. Academic research on similar techniques shows roughly 55–60% directional accuracy over 5–10 day windows for mid-caps — meaningful but modest edge. Use it alongside fundamental analysis, not as a replacement.",
    "<h3>Sources</h3>",
    "Transcripts are sourced from Financial Modeling Prep. Sentiment scoring uses the Loughran-McDonald financial dictionary, the academic standard for finance text analysis.",
  ]) },
  'kairos-signal-overview': { title: 'Kairos Signal: Event-Driven Trading Indicator', category: 'Research Tools', content: wrap([
    "Kairos Signal monitors macro and alternative-data inputs to flag moments when conditions favor specific sectors or themes.",
    "<h3>What it watches</h3>",
    "<ul><li>Weather and climate data that historically correlates with commodity moves (e.g. drought conditions and ag futures).</li><li>Macro indicators from the World Bank, IMF, and FRED.</li><li>Geopolitical event clusters from GDELT.</li><li>Prediction-market odds from Polymarket as a sentiment proxy.</li></ul>",
    "<h3>How to read a signal</h3>",
    "Each signal card shows a thesis (\"Drought in the US Midwest is intensifying — historically correlated with corn futures upside\"), the data points behind it, the implied directional tilt, and a confidence score.",
    "<h3>What this is, and isn't</h3>",
    "Kairos surfaces patterns and lets you decide what to do with them. It does not place trades, recommend specific tickers, or guarantee outcomes. Like any signal-based tool, treat it as one input among many.",
  ]) },
  'polymarket-related-markets': { title: 'Related Prediction Markets on Events', category: 'Research Tools', content: wrap([
    "Many event detail views in Ezana — geopolitical events, market analysis chain entries, Ezana Echo articles — show a <strong>Markets</strong> button that surfaces related prediction markets from Polymarket.",
    "<h3>Where you'll find it</h3>",
    "<ul><li>Global Market Analysis chain view (each event row).</li><li>ISR Article modals (geopolitical news).</li><li>Anywhere an event has a headline and description we can match to live markets.</li></ul>",
    "<h3>How matching works</h3>",
    "Ezana extracts keywords from the event's headline and body, queries Polymarket's public Gamma API for active markets matching those terms, then ranks results by keyword overlap and 24-hour trading volume. Closed and inactive markets are filtered out.",
    "<h3>Reading the panel</h3>",
    "Each market shows the question, current YES/NO odds in cents (e.g. <strong>65¢ YES</strong> means 65% implied probability), 24-hour volume, and how soon the market closes. Click any row to open the live market on polymarket.com.",
    "<h3>Why no results sometimes appear</h3>",
    "If an event is niche or breaking news, Polymarket may not have an active market on it yet. The empty state confirms this — it's not a bug, it's accurate reporting that no relevant market exists.",
    "<h3>Disclaimers</h3>",
    "Prediction-market odds are aggregated probabilities from people willing to put money on a question — useful as a data point, not as a forecast from Ezana. We don't earn commission on Polymarket trades; the integration is informational only.",
  ]) },
  'empire-rankings-deep-dive': { title: 'Empire Rankings: 18-Dimension Power Index', category: 'Global Analysis', content: wrap([
    "Empire Rankings is Ezana's quantitative index of national power, inspired by Ray Dalio's <em>Changing World Order</em>. Each country is scored across 18 dimensions and aggregated into a single Empire Score.",
    "<h3>The 18 dimensions</h3>",
    "<ul><li><strong>Economic:</strong> economic output, trade, markets &amp; financial center, reserve currency status, debt burden, expected growth, cost competition, infrastructure, geology, resource efficiency.</li><li><strong>Power:</strong> military strength, innovation &amp; technology, education.</li><li><strong>Stability:</strong> internal conflict, character &amp; social contracts, rule of law, wealth gaps.</li><li><strong>External:</strong> acts of nature.</li></ul>",
    "<h3>Where the data comes from</h3>",
    "<ul><li>World Bank Open Data API for economic indicators (GDP, debt, trade balance, etc.).</li><li>IMF, FRED, and the Bank for International Settlements for financial-center metrics.</li><li>SIPRI for military expenditure.</li><li>WIPO for innovation/patent data.</li><li>UNESCO for education.</li><li>Other open data providers as documented on each dimension's detail page.</li></ul>",
    "<h3>The Big Cycle chart</h3>",
    "Empire Rankings includes a multi-country overlay chart that plots the Empire Score over time — the so-called Big Cycle. You can compare the trajectories of major powers (US, China, UK, EU, Japan, India, Russia) on one chart, or anchor any country to see relative scores indexed against it.",
    "<h3>Caveats</h3>",
    "<ul><li>Dimensions backed by partner data sources are filled in over time. Some countries have full coverage; others have placeholders for dimensions where the source isn't yet integrated.</li><li>The aggregation weights are debatable — different weighting schemes produce different rankings. We expose the per-dimension breakdown so you can form your own view.</li></ul>",
  ]) },
  'notifications-and-email': { title: 'Notification Preferences', category: 'Account & Security', content: wrap([
    "Settings → Notifications controls every alert and email Ezana might send. Each category can be toggled on/off independently and configured per channel (in-app, email, push).",
    "<h3>Categories</h3>",
    "<ul><li><strong>Congressional Trades</strong> — alerts for new STOCK Act filings, optionally filtered to politicians you follow.</li><li><strong>Watchlist Movement</strong> — fires when a watchlist ticker moves ±5% (default) or your custom threshold per ticker.</li><li><strong>Earnings Calendar</strong> — companies you watch reporting earnings.</li><li><strong>Portfolio Health</strong> — daily summaries, risk warnings, contribution streak reminders.</li><li><strong>Community</strong> — replies, follows, mentions, direct messages.</li><li><strong>Learning</strong> — new courses, badge unlocks, streak milestones.</li><li><strong>Product Updates</strong> — feature launches and platform announcements.</li></ul>",
    "<h3>Quiet Hours</h3>",
    "Set a window (e.g. 10pm–7am local time) where push notifications are silenced. In-app and email notifications still arrive but don't interrupt you.",
    "<h3>Email digest frequency</h3>",
    "For email-eligible categories, choose <strong>Instant</strong> (one email per event), <strong>Daily</strong> (one summary email per day), or <strong>Weekly</strong> (Sunday digest).",
    "<h3>Unsubscribing</h3>",
    "Every email has an unsubscribe link in the footer that opens these settings preconfigured for the specific category that triggered the email.",
  ]) },
  'managing-brokerage-connections': { title: 'Managing External Brokerage Connections', category: 'Account & Security', content: wrap([
    "Ezana uses Plaid to connect to external brokerages with read-only access. We can see your positions and balances; we cannot place trades or move money.",
    "<h3>Supported brokerages</h3>",
    "<ul><li>Charles Schwab</li><li>Fidelity</li><li>Vanguard</li><li>Robinhood</li><li>Interactive Brokers</li><li>Webull</li><li>Wealthfront</li><li>Many others — Plaid supports 12,000+ financial institutions.</li></ul>",
    "<h3>How to connect</h3>",
    "Settings → Integrations → Connect Brokerage. You'll be redirected to Plaid's secure flow where you log into your brokerage. Plaid stores the credentials, not Ezana — we only receive a token that lets us request balances and positions.",
    "<h3>How to disconnect</h3>",
    "Settings → Integrations → click the trash icon next to a connected account. The connection is severed immediately and Ezana retains a snapshot of the most recent data for 30 days before deleting it. You can also revoke connections at the source — every brokerage has a Connected Apps page where Plaid appears.",
    "<h3>What we read, and how often</h3>",
    "Holdings, transactions, and cash balances are refreshed every 4 hours during market hours and once daily after close. We do not read order history, dividends in transit, or any margin/loan information.",
    "<h3>What we never see</h3>",
    "Your brokerage username, password, 2FA codes. Plaid handles authentication and never shares credentials with us.",
  ]) },

  // ── New: Legal ────────────────────────────────────────────────────────
  'terms-of-service': { title: 'Terms of Service', category: 'Legal & Disclosures', content: wrap([
    "The full Terms of Service are maintained at <a href=\"/terms\">ezana.world/terms</a>. That page is the canonical, version-controlled source and will always reflect the most recent update.",
    "<h3>Key points at a glance</h3>",
    "<ul><li>Ezana provides investment research, portfolio tracking, and educational tools. Nothing on Ezana is personalized investment advice.</li><li>Paper trading is an educational simulation. Paper performance is not predictive of real investing results.</li><li>Live trading through the Ezana brokerage is provided by Alpaca Securities LLC, a SIPC-insured broker-dealer. All custody and execution happens on Alpaca.</li><li>Read-only brokerage data is provided through Plaid. We never see or store your brokerage login credentials.</li><li>Content you publish on Community, Ezana Echo, or elsewhere remains yours, but you grant Ezana a license to display it within the platform.</li></ul>",
    "The full document covers eligibility, prohibited uses, limitation of liability, governing law, and the process for disputes. Please read it in full at <a href=\"/terms\">/terms</a>.",
  ]) },
  'privacy-policy': { title: 'Privacy Policy', category: 'Legal & Disclosures', content: wrap([
    "The full Privacy Policy is maintained at <a href=\"/privacy\">ezana.world/privacy</a>.",
    "<h3>The short version</h3>",
    "<ul><li><strong>What we collect:</strong> account info (email, display name), portfolio data you connect or enter, behavioral data (pages visited, features used) to improve the product.</li><li><strong>What we never do:</strong> sell your personal data to third parties, use message content to train models, or share your individual holdings publicly.</li><li><strong>How we store it:</strong> all data in transit is TLS 1.3; data at rest is AES-256 encrypted. Supabase is our primary database (Postgres + row-level security).</li><li><strong>Your controls:</strong> export or delete your data at any time from Settings → Account. Deletion is irreversible and completes within 30 days.</li></ul>",
    "For full details — including cookie policy, regional rights (GDPR, CCPA), and contact for privacy requests — see the <a href=\"/privacy\">Privacy Policy</a>.",
  ]) },
  'disclosures': { title: 'Important Disclosures', category: 'Legal & Disclosures', content: wrap([
    "<h3>Not investment advice</h3>",
    "Nothing on Ezana constitutes personalized investment, legal, or tax advice. Features like Company Research summaries, For the Quants analytics, Top Performing Politicians rankings, and prediction-market overlays are informational. Always do your own research and consider consulting a licensed advisor before investing.",
    "<h3>Paper trading</h3>",
    "Paper portfolios exist only inside Ezana. They fill at the previous close, ignore slippage and commissions, and do not reflect real-world trading frictions. Paper performance is not indicative of real returns.",
    "<h3>Data sources and timeliness</h3>",
    "Market quotes shown in the app are typically delayed 15 minutes. Congressional trading data is sourced from public STOCK Act filings (via FMP). Filings can appear weeks or months after the trade occurred. Empire Rankings data is sourced primarily from the World Bank; dimensions are filled in over time as sources are added.",
    "<h3>Brokerage relationships</h3>",
    "Live trading on Ezana is executed by <strong>Alpaca Securities LLC</strong>, a FINRA-registered broker-dealer and SIPC member. Ezana Finance is not a broker-dealer. Account aggregation for read-only brokerage connections is provided by <strong>Plaid Inc.</strong>",
    "<h3>Ezana Echo articles</h3>",
    "Articles published on Ezana Echo represent the views of their authors, not of Ezana. Authors who hold positions in securities they write about are required to disclose that in the article.",
  ]) },
};

// ═══════════════════════════════════════════════════════════
// PARTNER HELP CENTER
// ═══════════════════════════════════════════════════════════

export const PARTNER_CATEGORIES = [
  { id: 'onboarding', title: 'Partner Onboarding', description: 'Get started as an Ezana partner', iconName: 'BookOpen', articles: [
    { title: 'How to Become an Ezana Partner', slug: 'becoming-a-partner' },
    { title: 'Partner Account vs Regular User Account', slug: 'partner-vs-user' },
    { title: 'Setting Up Your Partner Profile', slug: 'setting-up-profile' },
    { title: 'Understanding the Partner Badge System', slug: 'understanding-badges' },
  ]},
  { id: 'content', title: 'Content Studio & Ezana Echo', description: 'Write articles and build courses', iconName: 'FileText', articles: [
    { title: 'Applying to Write for Ezana Echo', slug: 'applying-to-write' },
    { title: 'Writing and Submitting Articles', slug: 'writing-articles' },
    { title: 'The Editorial Review Process', slug: 'article-review-process' },
    { title: 'Tracking Your Article Performance', slug: 'tracking-article-performance' },
    { title: 'Ezana Echo Content Guidelines', slug: 'content-guidelines' },
    { title: 'Building and Selling Courses on Ezana', slug: 'building-courses' },
  ]},
  { id: 'copy-trading', title: 'Copy Trading & Commissions', description: 'Earn from copy trades and referrals', iconName: 'Repeat', articles: [
    { title: 'How Copy Trading Works for Partners', slug: 'how-copy-trading-works' },
    { title: 'Creating and Managing Trading Strategies', slug: 'managing-strategies' },
    { title: 'Understanding Partner Commissions', slug: 'commission-structure' },
    { title: 'How and When You Get Paid', slug: 'payout-schedule' },
  ]},
  { id: 'dashboard', title: 'Partner Dashboard', description: 'Manage your partner account', iconName: 'LayoutDashboard', articles: [
    { title: 'Partner Dashboard Overview', slug: 'dashboard-overview' },
    { title: 'Understanding Your Partner Metrics', slug: 'reading-metrics' },
    { title: 'How Copier Metrics Update in Real Time', slug: 'realtime-copier-metrics' },
    { title: 'Tips for Growing Your Copier Base', slug: 'growing-copiers' },
  ]},
  { id: 'community', title: 'Community & Engagement', description: 'Engage followers and build audience', iconName: 'Users', articles: [
    { title: 'Using the Partner Community Hub', slug: 'community-hub' },
    { title: 'Best Practices for Follower Engagement', slug: 'engaging-followers' },
    { title: 'Earning Badges and Building Your Reputation', slug: 'badges-and-achievements' },
  ]},
  { id: 'api', title: 'API & Technical', description: 'API keys, webhooks, and integrations', iconName: 'Code2', articles: [
    { title: 'Ezana Partner API Overview', slug: 'api-overview' },
    { title: 'Managing Your API Keys', slug: 'api-keys' },
    { title: 'Setting Up Webhooks', slug: 'webhook-setup' },
  ]},
];

export const PARTNER_ARTICLES = {
  'becoming-a-partner': { title: 'How to Become an Ezana Partner', category: 'Partner Onboarding', content: wrap([
    "To become a partner, click <strong>Become a Partner</strong> on the landing page or navigate to <code>/auth/partner/apply</code>. The application asks for your background, areas of expertise, audience size (if any), and how you plan to contribute.",
    "<h3>What reviewers look for</h3>",
    "<ul><li>Credible investing or finance experience (professional, educator, or documented track record).</li><li>Alignment with Ezana's compliance posture — no guaranteed-return marketing.</li><li>Willingness to complete KYC-style checks where required for payouts.</li></ul>",
    "<h3>Timeline</h3>",
    "Applications are typically reviewed in <strong>5–7 business days</strong>. You'll receive email at each stage (received, approved, or more information needed).",
    "<h3>After approval</h3>",
    "Approved partners get a partner-tier account, access to Partner Hub / Content Studio / Community Hub, and a gold verified badge on profiles and Echo bylines. Feature flags (Echo Writer, API) may require separate applications.",
  ]) },
  'partner-vs-user': { title: 'Partner Account vs Regular User Account', category: 'Partner Onboarding', content: wrap([
    "Partners see a completely different version of the web app with a gold-themed interface. Your Partner Hub replaces the regular dashboard with earnings tracking, copier metrics, and content management.",
    "The Partner Dashboard shows your revenue streams: copy trade commissions (10% of copier profits), course revenue (70% share), and referral bonuses ($25 per referred user).",
    "The Community Hub lets you manage your audience with a compose box, engagement analytics, and direct messages from copiers. Content Studio is where you build courses and write Ezana Echo articles.",
  ]) },
  'setting-up-profile': { title: 'Setting Up Your Partner Profile', category: 'Partner Onboarding', content: wrap([
    "Go to Settings from the gear icon. Set your Platform Username — this appears on your hero card, public profile, and Ezana Echo articles.",
    "Upload a profile avatar that will display on the partner home page hero card. Fill in your bio, social links, and investor type.",
    "Your verified partner badge is automatically displayed once your account is approved. Additional badges (Echo Writer, performance achievements, etc.) appear above your avatar as you earn them.",
  ]) },
  'understanding-badges': { title: 'Understanding the Partner Badge System', category: 'Partner Onboarding', content: wrap([
    "Ezana has 27 achievement badges across 6 categories, each with 5 tiers (Bronze, Silver, Gold, Platinum, Diamond). Status badges (Verified Partner, Echo Writer) are granted on approval.",
    "Performance badges track your portfolio returns (10% to 200%). Content badges track total article reads (100 to 100K). Community badges track your follower count (50 to 25K). Education badges track course enrollments (25 to 10K). Impact badges track users you've helped achieve returns (10 to 1K).",
    "View your badge progress by clicking 'Badges' on the Community Hub page.",
  ]) },
  'applying-to-write': { title: 'Applying to Write for Ezana Echo', category: 'Content Studio & Ezana Echo', content: wrap([
    "Not all partners can publish articles immediately. You must apply for Echo Writer approval. In your Content Studio, go to the Ezana Echo section.",
    "If not yet approved, you'll see the Writer Application form. Provide your writing experience (publications, credentials), links to 2-3 published finance articles you've written, your specialization, and why you want to write.",
    "Applications are reviewed within 2-3 business days. Once approved, the Article Editor appears and you receive the 'Echo Writer' badge.",
  ]) },
  'writing-articles': { title: 'Writing and Submitting Articles', category: 'Content Studio & Ezana Echo', content: wrap([
    "In Content Studio, click 'Write New Article'. Enter your title (make it compelling — this is what readers see first). Select a category (Markets, Investing, Trading, Crypto, Economy, Politics, Technology, Education).",
    "Write an excerpt (1-2 sentences shown on article cards). Write your body text using markdown formatting — ## for headers, **bold**, *italic*, - for bullet points.",
    "Articles must be at least 100 words to submit. You can 'Save Draft' to continue later, or 'Submit for Review' to send it to our editorial team.",
  ]) },
  'article-review-process': { title: 'The Editorial Review Process', category: 'Content Studio & Ezana Echo', content: wrap([
    "After submitting an article, it enters 'submitted' status. Our editorial team reviews it within 24-48 hours. We check for: accuracy of financial data and claims, writing quality and clarity, originality (no plagiarism), appropriate disclosures (if you hold positions in stocks you write about), and adherence to our content guidelines.",
    "If approved, the article is published on Ezana Echo and your subscriber notifications go out. If rejected, you'll receive feedback on what to improve. You can edit and resubmit rejected articles.",
  ]) },
  'tracking-article-performance': { title: 'Tracking Your Article Performance', category: 'Content Studio & Ezana Echo', content: wrap([
    "In Content Studio → Analytics tab, view per-article metrics: total reads, like count, and revenue generated. The Revenue by Course chart also applies to articles if you monetize them.",
    "Student/reader counts feed into your badge progress — hitting milestones like 1,000 reads earns you the 'Growing Audience' Silver badge. Your articles also appear on the Ezana Echo listing page where subscribers and all platform users can discover them.",
  ]) },
  'content-guidelines': { title: 'Ezana Echo Content Guidelines', category: 'Content Studio & Ezana Echo', content: wrap([
    "Write original analysis, not rewritten news summaries. Include data, charts, or specific examples. If you mention stocks you personally hold, disclose your position.",
    "Do not make specific buy/sell recommendations — frame everything as analysis, not advice. Avoid clickbait titles. Minimum length is 100 words; optimal length is 800-2,000 words.",
    "Cite sources when referencing statistics or studies. Do not copy content from other publications. Articles that violate these guidelines will be rejected, and repeated violations can result in Echo Writer status being revoked.",
  ]) },
  'how-copy-trading-works': { title: 'How Copy Trading Works for Partners', category: 'Copy Trading & Commissions', content: wrap([
    "When you publish a trading strategy, regular users can choose to 'copy' it — meaning their accounts automatically mirror your trades.",
    "When you buy 5% of your portfolio in NVDA, copiers' accounts buy 5% of their allocated copy-trading balance in NVDA proportionally. You earn a 10% commission on your copiers' profits each month.",
    "If they lose money, you earn nothing — this aligns your incentives. The more profitable your strategy, the more copiers you attract, and the more you earn.",
  ]) },
  'managing-strategies': { title: 'Creating and Managing Trading Strategies', category: 'Copy Trading & Commissions', content: wrap([
    "On your Partner Dashboard, the 'Your Strategies' section lists all active strategies. Click 'New Strategy' to create one.",
    "Give it a name (e.g., 'Growth Alpha', 'Dividend Machine'), set the description, and choose whether it's public or invite-only.",
    "Once created, your normal trades within that strategy's parameters are mirrored to copiers. You can see how many users are copying each strategy, total AUM (assets under management), and historical returns.",
  ]) },
  'commission-structure': { title: 'Understanding Partner Commissions', category: 'Copy Trading & Commissions', content: wrap([
    "Partners earn from three revenue streams. Copy Trade Commission: 10% of copier profits — calculated monthly, paid if copiers are profitable. Course Revenue: 70% revenue share on paid course enrollments. Referral Bonus: $25 for each new user who signs up using your referral link and activates their account.",
    "All earnings are tracked on your Partner Dashboard under 'Commission Breakdown'. Payouts are processed monthly via bank transfer. Your pending payout amount and next payout date are shown in the dashboard.",
  ]) },
  'payout-schedule': { title: 'How and When You Get Paid', category: 'Copy Trading & Commissions', content: wrap([
    "Payouts are processed on the 1st of each month for the previous month's earnings. You need a minimum balance of $50 to receive a payout.",
    "Set up your payout method in Settings → Billing → Payout Method (bank transfer). The Payout History table on your Partner Dashboard shows all past payouts with date, amount, method, and status.",
    "Processing typically takes 2-3 business days after the payout is initiated.",
  ]) },
  'dashboard-overview': { title: 'Partner Dashboard Overview', category: 'Partner Dashboard', content: wrap([
    "Your Partner Dashboard is the command center for your Ezana business. The top row shows four key metrics: Total Earnings, This Month (with % change from last month), Total Copiers (with new this week), and Total AUM (assets under management by your copiers).",
    "Below, 'Your Strategies' lists each trading strategy with copier count, AUM, total return, and monthly return. 'Top Copiers' ranks your most active copiers by P&L.",
    "The Commission Breakdown shows earnings by source, and Payout History shows your payment records.",
  ]) },
  'reading-metrics': { title: 'Understanding Your Partner Metrics', category: 'Partner Dashboard', content: wrap([
    "AUM (Assets Under Management): The total dollar amount of capital allocated by users copying your strategies. Higher AUM means more commission potential.",
    "Churn Rate: The percentage of copiers who stop copying you each month — keep this low by maintaining consistent returns. Avg Copy Amount: How much each copier allocates on average.",
    "Monthly Return: Your strategy's return for the current month. Use the timeframe buttons (1W, 1M, 3M, 6M, 1Y, ALL) to view metrics across different periods.",
  ]) },
  'growing-copiers': { title: 'Tips for Growing Your Copier Base', category: 'Partner Dashboard', content: wrap([
    "Post regularly in the Community to build visibility. Share your market insights and analysis — users who trust your thinking are more likely to copy your trades.",
    "Publish articles on Ezana Echo to reach a wider audience. Maintain consistent, transparent performance — users can see your full track record.",
    "Respond to copier messages promptly. Create educational courses that demonstrate your expertise. Avoid high-risk, volatile strategies that cause copier churn.",
  ]) },
  'community-hub': { title: 'Using the Partner Community Hub', category: 'Community & Engagement', content: wrap([
    "Your Community Hub has three tabs. Feed: compose and publish posts visible to your followers and copiers, with engagement stats (likes, comments, shares).",
    "Messages: direct messages from copiers asking questions about your strategies — respond promptly to build trust.",
    "Analytics: track your follower growth, post performance, engagement rate (industry avg is 3.2%), and top-performing content. Use the compose box's image, poll, and schedule tools to plan your content calendar.",
  ]) },
  'engaging-followers': { title: 'Best Practices for Follower Engagement', category: 'Community & Engagement', content: wrap([
    "Post at least 3-5 times per week. Share a mix of: market commentary (your take on the day's moves), trade explanations (why you entered or exited a position), educational content (concepts your audience can learn from), and personal insights (your investing philosophy).",
    "Pin your best post to keep it at the top of your profile. Use polls to engage your audience and understand what content they want.",
    "Respond to comments and messages within 24 hours. High engagement rates improve your visibility in the Community and attract more followers.",
  ]) },
  'badges-and-achievements': { title: 'Earning Badges and Building Your Reputation', category: 'Community & Engagement', content: wrap([
    "Badges signal your credibility to potential copiers and followers. Focus on earning badges across all categories — a partner with Performance, Content, Community, AND Impact badges demonstrates well-rounded expertise.",
    "The Verified Partner and Echo Writer badges establish baseline trust. Performance badges (Rising Tide through Legendary Returns) prove your trading ability. Content badges show you share knowledge. Community badges show you have a following.",
    "Impact badges are the most prestigious — they prove you've helped real users make money.",
  ]) },
  'api-overview': { title: 'Ezana Partner API Overview', category: 'API & Technical', content: wrap([
    "Professional plan partners get API access for programmatic data retrieval. Your API key is found in Settings → API.",
    "The API provides endpoints for: congressional trade data, portfolio analytics, market data, and your partner metrics. Rate limits are 100,000 calls per month on the Professional plan.",
    "Authentication uses Bearer token headers. Full API documentation is available at docs.ezana.world (coming soon). Contact partners@ezana.world for enterprise API arrangements.",
  ]) },
  'api-keys': { title: 'Managing Your API Keys', category: 'API & Technical', content: wrap([
    "Go to Settings → API to view your API key. Click 'Show' to reveal it, 'Copy' to copy it to clipboard. Never share your API key publicly or commit it to version control.",
    "If you believe your key has been compromised, click 'Regenerate' to create a new one — the old key is immediately invalidated.",
    "The Usage bar shows how many API calls you've made this month against your limit. The Endpoint Stats table breaks down usage by endpoint.",
  ]) },
  'webhook-setup': { title: 'Setting Up Webhooks', category: 'API & Technical', content: wrap([
    "Webhooks send real-time notifications to your server when events occur. In Settings → API → Webhooks, enter your endpoint URL and select which events to receive: new congressional trades, portfolio alerts, copier events (new copier, copier removed), and payout notifications.",
    "Webhook payloads are sent as JSON POST requests with an HMAC signature for verification. Test your webhook using the 'Send Test' button before enabling it for production events.",
  ]) },
  'realtime-copier-metrics': { title: 'How Copier Metrics Update in Real Time', category: 'Partner Dashboard', content: wrap([
    "Your Partner Dashboard shows several copier metrics that refresh on different cadences:",
    "<h3>Refresh schedule</h3>",
    "<ul><li><strong>Total Copiers / New This Week</strong> — updates the moment a user starts or stops copying you.</li><li><strong>AUM</strong> — recalculated every 15 minutes based on copier portfolio values.</li><li><strong>Monthly Return</strong> — recalculated nightly using the close prices of all positions in your strategy.</li><li><strong>Total Earnings</strong> — accrued continuously but locked at month-end for the next payout.</li></ul>",
    "<h3>How AUM differs from copier dollars</h3>",
    "AUM measures the total dollar value copiers have allocated to follow your strategies — not the dollar value of those copiers' total portfolios. A copier with $50,000 in their account who allocates $5,000 to copying you contributes $5,000 to your AUM.",
    "<h3>When metrics may briefly mismatch</h3>",
    "During market hours, Copier Count updates instantly but Earnings and AUM use the most recent quote refresh. A 15-minute lag in earnings figures during high-volatility periods is normal.",
  ]) },
  'building-courses': { title: 'Building and Selling Courses on Ezana', category: 'Content Studio & Ezana Echo', content: wrap([
    "Partners with Echo Writer status can build paid courses through Content Studio → Courses.",
    "<h3>Course structure</h3>",
    "<ul><li><strong>Modules</strong> — top-level sections, e.g. \"Introduction,\" \"Reading Financial Statements,\" \"Building a Watchlist.\"</li><li><strong>Lessons</strong> — individual units within a module. Each lesson can include text, video (YouTube embed), images, and inline quizzes.</li><li><strong>Quizzes</strong> — multiple-choice or short-answer questions checked at lesson end.</li><li><strong>Capstone</strong> — optional final project that grants a course completion badge to students.</li></ul>",
    "<h3>Pricing</h3>",
    "Set a one-time price ($29–$499) or make the course free for follower acquisition. The 70/30 partner-platform revenue split applies to all paid sales. Bundles let you package multiple courses for a discount.",
    "<h3>Submitting for review</h3>",
    "Courses go through editorial review (typically 5 business days) before publication. Reviewers check for accuracy, structure, audio/video quality, and adherence to content guidelines. You'll receive specific feedback if revisions are required.",
    "<h3>Marketing your course</h3>",
    "Once published, your course appears in the Learning Center catalog. Promote it via your Community posts, Echo articles, and direct messages to existing copiers. Course completion rates and revenue are visible in Content Studio → Analytics.",
  ]) },
};
