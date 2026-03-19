/**
 * Help Center Content — User and Partner articles
 * Centralized content for /help-center/user and /help-center/partner
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
    { title: 'Navigating Your Dashboard', slug: 'navigating-the-dashboard' },
    { title: 'Understanding the Navigation Bar', slug: 'understanding-the-navbar' },
    { title: 'Setting Up Trade Alerts and Notifications', slug: 'setting-up-alerts' },
    { title: 'Connecting Your External Brokerage Account', slug: 'connecting-your-brokerage' },
    { title: 'Opening an Ezana Brokerage Account', slug: 'opening-a-brokerage-account' },
  ]},
  { id: 'congressional-trading', title: 'Congressional Trading', description: 'Track and analyze congressional trades', iconName: 'Activity', articles: [
    { title: 'How Congressional Trading Data Works', slug: 'how-congressional-data-works' },
    { title: 'Following Specific Politicians', slug: 'following-politicians' },
    { title: 'Interpreting Congressional Trade Data', slug: 'interpreting-trade-data' },
    { title: 'Filtering and Searching Congressional Trades', slug: 'using-filters' },
    { title: 'Congressional Trade Alert System', slug: 'trade-alerts' },
  ]},
  { id: 'portfolio', title: 'Portfolio & Trading', description: 'Manage investments and place trades', iconName: 'Wallet', articles: [
    { title: 'Understanding Your Portfolio Dashboard', slug: 'portfolio-overview' },
    { title: 'How to Place a Trade', slug: 'placing-trades' },
    { title: 'Fractional Share Investing', slug: 'fractional-shares' },
    { title: 'Depositing and Withdrawing Funds', slug: 'funding-your-account' },
    { title: 'Managing Your Watchlist', slug: 'watchlist-guide' },
    { title: 'Understanding Order Types', slug: 'order-types' },
  ]},
  { id: 'research', title: 'Research Tools', description: 'Company research, market analysis, quant tools', iconName: 'BarChart3', articles: [
    { title: 'Using Company Research', slug: 'company-research' },
    { title: 'Market Analysis Tools', slug: 'market-analysis' },
    { title: 'For The Quants: Advanced Analytics', slug: 'quant-tools' },
    { title: 'Betting Markets & Prediction Data', slug: 'betting-markets' },
    { title: 'Reading and Subscribing on Ezana Echo', slug: 'ezana-echo-guide' },
  ]},
  { id: 'account', title: 'Account & Security', description: 'Account settings and security', iconName: 'Shield', articles: [
    { title: 'Managing Your Account Settings', slug: 'account-settings' },
    { title: 'Enabling Two-Factor Authentication', slug: 'two-factor-auth' },
    { title: 'How Your Data Is Protected', slug: 'data-security' },
    { title: 'Deleting Your Account', slug: 'deleting-account' },
  ]},
  { id: 'billing', title: 'Billing & Subscriptions', description: 'Plans, payments, and invoices', iconName: 'CreditCard', articles: [
    { title: 'Understanding Ezana Plans', slug: 'plans-overview' },
    { title: 'Upgrading, Downgrading, or Canceling', slug: 'managing-subscription' },
    { title: 'Managing Payment Methods', slug: 'payment-methods' },
    { title: 'Viewing Invoices and Billing History', slug: 'billing-history' },
  ]},
  { id: 'community', title: 'Community', description: 'Connect with other investors', iconName: 'Users', articles: [
    { title: 'Using the Ezana Community', slug: 'community-overview' },
    { title: 'Community Guidelines and Posting Rules', slug: 'posting-rules' },
    { title: 'Following Users and Managing Friends', slug: 'following-users' },
  ]},
  { id: 'learning', title: 'Learning Center', description: 'Courses and educational content', iconName: 'GraduationCap', articles: [
    { title: 'Browsing and Enrolling in Courses', slug: 'courses-overview' },
    { title: 'Completing Lessons, Quizzes, and Earning Certificates', slug: 'completing-lessons' },
    { title: 'Tracking Your Learning Progress', slug: 'course-progress' },
  ]},
];

export const USER_ARTICLES = {
  'creating-your-account': { title: 'Creating Your Ezana Finance Account', category: 'Getting Started', content: wrap([
    "To get started, visit ezana.world and click 'Login' then 'Sign up'. You can register with your email address and a password, or sign in directly with your Google account.",
    "After registering, you'll be taken to your personal dashboard where you can explore congressional trading data, connect your brokerage, and customize your experience.",
    "If you received a legacy access invitation, your account will automatically be upgraded once you sign up with the same email.",
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
    "Navigate to Settings and select the Notifications panel. Here you can configure push notifications, email alerts, and sound settings.",
    "Key alerts include: congressional trade notifications (when a politician you follow makes a trade), price target alerts (when a stock on your watchlist hits a target price), portfolio alerts (daily performance summaries, risk warnings), and community mentions (when someone replies to your posts).",
    "You can set quiet hours to pause notifications during specific times.",
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
    "Below it, My Holdings displays your top 4 positions by value plus your 2 worst performers marked with an 'Underperforming' badge.",
    "Use the timeframe buttons to switch between 1-day, 1-month, 6-month, and 1-year views — the chart, portfolio value, change percentages, and all holding values update together.",
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
    "Go to Trading → Fund Account. To deposit, you first need to link a bank account — click your connected bank in the dropdown or link a new one through Plaid.",
    "Enter the dollar amount and click Deposit. ACH transfers typically take 1-3 business days to settle, after which your buying power updates. Quick deposit buttons ($100, $500, $1,000, $5,000) are available for convenience.",
    "To withdraw, select the Withdraw tab, choose your bank, enter the amount, and submit. The History tab shows all past transfers and their status.",
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
    "Ezana offers four plans: Free ($0/forever — basic congressional data, limited watchlist, weekly digest), Individual ($19/month — real-time alerts, full database, unlimited watchlists, priority support), Family ($39/month — up to 5 accounts, shared watchlists, family portfolio dashboard), and Professional ($99/month — API access, custom exports, white-label reports, dedicated account manager).",
    "All paid plans include a 14-day free trial. Early access legacy users receive Individual plan features permanently at no cost.",
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
    "To become a partner, click 'Become a Partner' on the landing page or navigate to /auth/partner/apply. Fill out the application with your background, areas of expertise, and how you plan to contribute to the platform.",
    "Applications are reviewed within 5-7 business days. Once approved, you'll receive a partner account with access to the Partner Hub, Content Studio, and all partner-exclusive features. Partners get a golden verified badge visible across the platform.",
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
};
