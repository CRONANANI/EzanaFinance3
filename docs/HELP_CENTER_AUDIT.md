# Help Center audit (Nov 23, 2026)

Scope: every article in `src/lib/help-center-content.js` (the only Help Center content source; no database or CMS content exists), the article page (`HelpArticleView`), search (`help-center-search.js`), feedback (`ArticleFeedback`, `/api/help-center/feedback`) and the support routes. 149 articles after this pass: 106 user, 43 partner (146 before, plus 3 new Sonar articles).

## How the Help Center is built

- Content: static HTML strings per article, grouped by `USER_CATEGORIES` / `PARTNER_CATEGORIES`. Optional `keywords` feed search.
- Pages: `/help-center/{user|partner}/article/[slug]`, category pages, and the two support landing pages (`SupportCenter`).
- Search: in-repo lexical index (title 5, keywords 4, headings 2, body 1), also the fallback for the AI Ask endpoint.
- Feedback: Yes/No plus optional comment, stored in `help_article_feedback`. A "No" now also records a reason: Steps didn't work, Instructions were unclear, Information is outdated, My problem isn't covered.
- Support channels that exist: the "Still have questions? Contact support" form at the foot of every article (`/api/support/contact` to the support inbox), `contact@ezana.world` (User Support), `partners@ezana.world` (Partner Support). The product also shows `support@ezana.world` (locked account, onboarding), `partnersupport@ezana.world` (partner sign-in), `orgsupport@ezana.world` (organization sign-in) and `api@ezana.world`. No response-time commitment is published, so articles make none.
- Error pages show a `Reference` code (Next.js digest). Escalation sections now ask users to include it.

## Quality standard applied

Every troubleshooting section must name the symptom (the exact on-screen message where one exists), the verified cause, specific steps, how to tell it worked, what to do if it did not, and a real support route with what to include and what never to send. "Refresh the page", "Try again later" and "Contact support" are allowed only as part of a step that says why. Review times, refunds and features are stated only when the code or the published terms support them.

## Major findings

1. **Applying to Write for Ezana Echo (example article).** "Form won't submit? Writing experience is required" was the only guidance. The real behaviour: the Submit button was silently disabled until the experience box had text; sample links were marked required but never checked; any API failure surfaced a raw parser error; a failed status check showed a blank form (inviting a duplicate application); eligibility accepted any `partners` row, active or not; a second submission while pending silently overwrote the first; and a 2 to 3 business day review promise had no basis. Fixed in the product and rewritten (see Application changes).
2. **Billing articles described a catalogue that no longer exists**: Personal / Personal Advanced / Professional, monthly prices, a "14-Day" trial titled article whose body said 1 month. Current terms (`src/config/plan-features.js`, `renewal-terms.js`): Free, Starter, Advanced, Family; only Advanced open (Starter, Family by waitlist); quarterly or yearly billing; 30-day trial, one per customer. A canceled subscription does not "return to Free" automatically; the user is asked to choose a plan. The refund statement was not backed by the Terms.
3. **Community articles described the retired page**: Signal / Friends / Latest lenses, conviction filters, a "Legendary takes" card, "Free is read-only", and "no in-app report button" (contradicting Reporting and Blocking). Rewritten to the current page.
4. **Quant Lab article was out of date**: it said backtests were sample data. Real versioned backtests now run (Strategy Lab, Backtesting) with server-enforced limits and specific errors. Rewritten.
5. **No Ezana Sonar documentation existed.** Three articles added: using Sonar, saving and sharing, and fixing failed runs.
6. **Content Studio article** said five tabs (Analytics, Reviews, sample stats); the page has three (My Courses, Videos, Ezana Echo). "Creator Studio" and "Content Studio" were used inconsistently: the nav says Content Studio, the page heading says Creator Studio; articles now say so.
7. **Login article** gave an incomplete password rule (missing the special character) and generic "contact support" for locked accounts. Rewritten with every verified sign-in message.
8. 73 troubleshooting sections had no route to support. Each now has one.
9. Navigation path errors: Quant Lab, Betting Markets and Echo said "Research & markets menu"; desktop calls it **Research** (mobile drawer: Research & markets).

## Content change log

| Article | Issue | Change | Verified against | Remaining limits |
|---|---|---|---|---|
| Applying to Write for Ezana Echo | One vague bullet; invented review time; no states | Full rewrite: eligibility, exact field rules, decision tree, every form message, duplicate/unknown-outcome handling, escalation | `WriterApplication.jsx`, `/api/echo/writer-application`, `partner-access.js`, `writer-application.js` | Reviewer workflow happens outside the app (no admin UI in code); no email is sent on submit or decision |
| Content Studio Overview | Wrong tab list, sample stats that don't exist | Rewrite to three tabs and real messages | `partner-learning/page.js`, `CreatorVideoStudio.jsx` | |
| Troubleshooting Login Issues | Generic steps; wrong password rule | Rewrite by message: credentials, verification code (10 min, 5 tries, 60 s resend), 2FA, wrong account type, locked, deleted, loops | `SignInCard.js`, `verify-code`, `send-verification`, `MfaChallengeCard`, `account-locked`, `password-rules.js` | Lost 2FA has no self-service path (stated) |
| Partner Account Access Issues | Refresh-first triage | Rewrite: verified causes, order of checks, expected result | `partner-access.js`, `SignInCard.js`, `partner-denied` | |
| Understanding Ezana Plans | Retired plans and prices | Rewrite to Free/Starter/Advanced/Family, availability, quarterly/yearly, legacy name mapping, checkout messages | `plan-features.js`, `pricing.js`, `select-plan`, `create-checkout-session` | Feature lists point to /pricing rather than being copied |
| How the 30-Day Free Trial Works (was "14-Day") | Wrong length, contradictory | Rewrite; title fixed everywhere | `renewal-terms.js`, `trial.js`, checkout route | |
| Upgrading, Downgrading, or Canceling | Monthly framing, app-store gap | Rewrite: portal and in-app switch, org and app-store cases, portal errors | `ManageBillingButton.js`, `customer-portal`, `plan-switch.js` | |
| Canceling Your Subscription | Unbacked refund policy; wrong end state | Refund and post-cancel wording corrected; charge-after-cancel steps | Terms (no refund clause), `trial.js` | |
| Viewing Invoices and Billing History | Generic load-failure advice | Specific steps; trial invoice timing | `SettingsPanels.jsx` | |
| Using the Ezana Community | Described retired page | Rewrite to tabs, filters, sorts, rail, post actions | `CommunityPage.jsx` and the v3 components | Sorting and Events depend on the v3 migration being applied |
| Community Guidelines and Posting Rules | Retired composer | Rewrite: post types, title/topic/length rules, every publish error | `/api/community/posts`, `EvoComposer`, `CreatePostDialog` | |
| Following Users, Legendary Investors | Retired lenses and cards | Updated | Community components | |
| Quant Lab | Said backtests were samples | Rewrite: workspaces, plan, limits, every backtest error, simulation caveats | `/api/quants/backtests`, `strategy-spec.js`, `lab-server.js`, `QuantLabSidebar` | Strategy Comparison and parts of Datasets & Research still show illustrative data (stated) |
| Researching With Ezana Sonar (new) | Missing | Depths, controls, Research Composer, reading answers, where research goes | `entitlements.js`, `quota.js`, `SonarBuildMenu`, `SonarResearchControls` | Exact per-plan counts left to /pricing |
| Saving and Sharing Sonar Research (new) | Missing | Save, folders, public links, org/partner limits, every save error | `/api/sonar/saved`, `saved.js`, `SonarSaveActions` | |
| Fix Sonar Research That Fails or Won't Save (new) | Missing | Decision tree, every quota and failure message, thin-answer guidance | `/api/sonar/research`, `v2`, `query` routes | |
| 26 further articles | Vague "refresh"/"try again later"; unqualified review targets; wrong menu names; stale Settings list | Targeted fixes | Components named in each fix | |
| 67 further articles | No support route | "Still stuck?" line with verified channel and what to include | | |
| 43 articles | None found | Reviewed, no change | | Not walked through in a live signed-in session |

## Error and troubleshooting matrix

| Area | Message | Trigger | User action | Article |
|---|---|---|---|---|
| Echo application | Field messages (experience 40 to 5,000 chars; 2 to 5 http(s) links; portfolio URL) | `validateWriterApplication` (client and server) | Fix the field | Applying to Write |
| Echo application | Only active Ezana partners can apply | Not an active partner | Wait for decision; re-sign-in with applied email; contact partner support | Applying to Write; Partner Account Access |
| Echo application | You already have an application under review | Pending row exists | Check status; don't resubmit | Applying to Write |
| Echo application | We couldn't confirm whether your application was saved | Network drop or 5xx | Check status before resubmitting | Applying to Write |
| Sign-in | Invalid credentials | Wrong email or password | Reset password | Login Issues |
| Sign-in | Incorrect code / Code has expired / Please wait N seconds | Email verification | Retype; resend after 60 s | Login Issues |
| Sign-in | This account is not registered as a partner / Access Denied | Partner sign-in, not a partner | Sign in as user; check email | Login Issues; Partner Access |
| Sign-in | Account Locked | `profiles.is_disabled` | support@ezana.world | Login Issues |
| Password reset | Your new password still needs ... | Missing requirement | Add it | Resetting Your Password |
| Billing | X is opening by waitlist | Waitlist plan checkout | Join waitlist or choose Advanced | Plans |
| Billing | Quarterly billing is not available yet | No quarterly price | Choose Yearly | Plans |
| Billing | No billing account found | Portal without a checkout | Start checkout | Upgrading/Canceling |
| Community | Choose a topic / title length / Post content is required | Composer validation | Fix and publish | Posting Rules |
| Community | Make the report public by link in Sonar first | Sonar share without link | Share in Sonar | Posting Rules; Sonar Sharing |
| Sonar | You have used today's research runs / deep research runs | Daily quota | Wait for midnight UTC or run standard | Sonar Troubleshooting |
| Sonar | That ping did not land / research run did not start / Sonar is busy | Service failure (not counted) | Retry once; check Research history | Sonar Troubleshooting |
| Sonar | You have 500 saved items / 50 folders / folder name exists | Save caps | Remove or rename | Sonar Sharing |
| Quant Lab | Date window, ticker, rule, unsupported-condition messages | `strategy-spec` validation | Edit and save a new version | Quant Lab |
| Quant Lab | A backtest is already running / Daily limit of 200 | Concurrency and daily cap | Wait | Quant Lab |
| Quant Lab | ... is part of the Advanced plan | Plan gate | Upgrade | Quant Lab; Plans |

## Application changes

- `src/lib/echo/writer-application.js` (new): one validator for the form and the API.
- `/api/echo/writer-application`: canonical active-partner check; validation; 409 for a pending application; safe JSON parsing; error `code`s; `isActivePartner` in GET.
- `WriterApplication.jsx`: errors shown next to fields instead of a silently disabled button; answers saved in the browser; specific messages for session, eligibility, rate limit, pending and unknown outcomes; **Check status** before any resubmit; a status-load failure no longer shows a blank form; no promised review time; link to the troubleshooting article.
- Reset password: uses the shared sign-up rules and names the missing requirement ("Please choose a stronger password" removed); clearer expired-link message.
- Forgot password: removed a console log that printed the user's email.
- Help Center feedback: reasons for a "No".
- Search: problem-phrased keywords on the articles users reach in a hurry (Echo application, login, billing, Sonar, Quant Lab, CSV import, posting).

## Verification

- `npm run test:help-content` (new, 5 tests): every article filed once and category strings match; unique titles; no bare "refresh / try again later / contact support" bullets; every troubleshooting section has a support route; no "typically takes N" promises; code-backed numbers in articles match the code (Echo limits, trial length, Sonar caps, Quant Lab limits).
- `test:help-search`, `test:help-follow-ups`, `test:support`, `check:help-links`, `check:help-emdash`, `test:em-dash`, `test:community-redesign`: pass.
- `check:help-routes` against a local dev server: 149 of 149 article routes render (200, heading, body).
- ESLint, Prettier, branding, type-scale and CSS gates on changed files: clean.
- The Echo form was exercised in a local preview with mocked responses: field errors and the unknown-outcome state with Check status render as written. Live end-to-end submission (real partner account, production database) was not run.

## Not verified end to end

Steps that depend on third parties or real accounts were checked against code, not walked through: Stripe checkout and portal screens, Plaid and SnapTrade linking, Alpaca account opening, email delivery, App Store and Google Play subscriptions, and the editorial team's review process for Echo writers and articles.

## Maintenance

- Treat `src/lib/help-center-content.js` as part of a feature: a PR that changes a user-facing message, limit, menu label or route should update the article in the same PR. `test:help-content` fails when the coded limits it tracks drift from the article.
- When adding a code-backed number to an article, add an assertion for it in `scripts/check-help-content-quality.mjs`.
- Review the `help_article_feedback` rows with a "No" reason monthly; "Steps didn't work" and "Information is outdated" point to articles to re-verify first.
- Keep a separate technical-verification date from the publish date. Articles do not show a "last reviewed" date; add one only when someone has actually re-verified the article.
- Suggested ownership: Support owns wording; the engineer who changes a flow is the technical reviewer for its article.

## Full inventory

Status key: **New**, **Rewritten** (end to end), **Updated** (targeted corrections), **Updated (support route added)**, **Reviewed, accurate** (troubleshooting and claims read against the product; no change needed).

| # | Audience | Article | Category | Words | Troubleshooting | Support route | Status |
|---|---|---|---|---|---|---|---|
| 1 | User | [Creating Your Ezana Finance Account](/help-center/user/article/creating-your-account) | Getting Started | 424 | Yes | Yes | Updated (support route added) |
| 2 | User | [Your First 5 Steps on Ezana](/help-center/user/article/first-steps) | Getting Started | 441 | No | Footer form only | Reviewed, accurate |
| 3 | User | [Login Streak & 30-Day Multiplier Reward](/help-center/user/article/login-streak-and-rewards) | Getting Started | 403 | Yes | Yes | Updated (support route added) |
| 4 | User | [Navigating Your Dashboard](/help-center/user/article/navigating-the-dashboard) | Getting Started | 481 | Yes | Yes | Updated |
| 5 | User | [The Home Terminal Layout](/help-center/user/article/home-terminal-overview) | Getting Started | 399 | Yes | Yes | Updated (support route added) |
| 6 | User | [Understanding the Navigation Bar](/help-center/user/article/understanding-the-navbar) | Getting Started | 404 | Yes | Yes | Updated (support route added) |
| 7 | User | [The In-App Onboarding Walkthrough](/help-center/user/article/onboarding-walkthrough) | Getting Started | 430 | Yes | Yes | Updated |
| 8 | User | [Keyboard Shortcuts and Global Search](/help-center/user/article/keyboard-shortcuts-and-search) | Getting Started | 420 | Yes | Yes | Updated (support route added) |
| 9 | User | [Supported Browsers and Devices](/help-center/user/article/browser-and-device-support) | Getting Started | 444 | Yes | Yes | Updated |
| 10 | User | [Paper Trading vs Live Trading](/help-center/user/article/paper-trading-vs-live) | Getting Started | 465 | No | Footer form only | Reviewed, accurate |
| 11 | User | [Setting Up Trade Alerts and Notifications](/help-center/user/article/setting-up-alerts) | Getting Started | 450 | Yes | Yes | Updated (support route added) |
| 12 | User | [Connecting Your External Brokerage Account](/help-center/user/article/connecting-your-brokerage) | Getting Started | 436 | Yes | Yes | Reviewed, accurate |
| 13 | User | [Brokerage Access Levels: Read-Only vs Read & Write](/help-center/user/article/brokerage-access-levels) | Getting Started | 463 | No | Yes | Reviewed, accurate |
| 14 | User | [Opening an Ezana Brokerage Account](/help-center/user/article/opening-a-brokerage-account) | Getting Started | 412 | Yes | Yes | Updated (support route added) |
| 15 | User | [What to Know Before You Sign Up](/help-center/user/article/what-to-know-before-you-sign-up) | Getting Started | 453 | No | Footer form only | Reviewed, accurate |
| 16 | User | [Understanding Your Portfolio Dashboard](/help-center/user/article/portfolio-overview) | Portfolio & Trading | 405 | Yes | Yes | Updated (support route added) |
| 17 | User | [Reading Your Recent Transactions](/help-center/user/article/reading-recent-transactions) | Portfolio & Trading | 460 | Yes | Footer form only | Updated |
| 18 | User | [Total Profits Breakdown Explained](/help-center/user/article/total-profits-breakdown) | Portfolio & Trading | 460 | Yes | Yes | Updated (support route added) |
| 19 | User | [Sector Distribution Explained](/help-center/user/article/sector-distribution-explained) | Portfolio & Trading | 426 | Yes | Yes | Updated (support route added) |
| 20 | User | [Paper Trading: Practicing With $100,000](/help-center/user/article/paper-trading) | Portfolio & Trading | 444 | Yes | Yes | Updated (support route added) |
| 21 | User | [Mock Trading: Practicing With Virtual Cash](/help-center/user/article/mock-trading-deep-dive) | Portfolio & Trading | 579 | Yes | Yes | Updated (support route added) |
| 22 | User | [Tracking Your Performance Metrics](/help-center/user/article/performance-metrics) | Portfolio & Trading | 414 | Yes | Yes | Updated (support route added) |
| 23 | User | [Comparing Your Performance to the Platform](/help-center/user/article/comparing-to-platform) | Portfolio & Trading | 387 | Yes | Yes | Updated (support route added) |
| 24 | User | [The Underperforming Badge Explained](/help-center/user/article/understanding-underperforming-badge) | Portfolio & Trading | 388 | Yes | Yes | Updated (support route added) |
| 25 | User | [How to Place a Trade](/help-center/user/article/placing-trades) | Portfolio & Trading | 408 | Yes | Yes | Updated (support route added) |
| 26 | User | [Fractional Share Investing](/help-center/user/article/fractional-shares) | Portfolio & Trading | 397 | Yes | Yes | Updated (support route added) |
| 27 | User | [Depositing and Withdrawing Funds](/help-center/user/article/funding-your-account) | Portfolio & Trading | 421 | Yes | Yes | Updated (support route added) |
| 28 | User | [Managing Your Watchlist](/help-center/user/article/watchlist-guide) | Portfolio & Trading | 383 | Yes | Yes | Updated (support route added) |
| 29 | User | [Understanding Order Types](/help-center/user/article/order-types) | Portfolio & Trading | 399 | No | Footer form only | Reviewed, accurate |
| 30 | User | [Importing Your Portfolio From a Brokerage](/help-center/user/article/importing-your-portfolio-from-a-brokerage) | Portfolio & Trading | 569 | Yes | Yes | Updated |
| 31 | User | [Executing Trades From Ezana](/help-center/user/article/executing-trades-from-ezana) | Portfolio & Trading | 497 | No | Footer form only | Reviewed, accurate |
| 32 | User | [Creating and Organizing Watchlists](/help-center/user/article/creating-watchlists) | Watchlists & Alerts | 355 | No | Footer form only | Reviewed, accurate |
| 33 | User | [Setting Up Price Alerts (±5%)](/help-center/user/article/price-alerts) | Watchlists & Alerts | 408 | Yes | Yes | Updated (support route added) |
| 34 | User | [Organizing Tickers Across Multiple Lists](/help-center/user/article/organizing-watchlists) | Watchlists & Alerts | 399 | No | Yes | Updated (support route added) |
| 35 | User | [Using US Equities](/help-center/user/article/company-research) | Research Tools | 386 | Yes | Yes | Updated (support route added) |
| 36 | User | [Researching With Ezana Sonar](/help-center/user/article/using-ezana-sonar) | Research Tools | 499 | No | Footer form only | New |
| 37 | User | [Saving and Sharing Sonar Research](/help-center/user/article/sonar-saving-and-sharing) | Research Tools | 477 | Yes | Yes | New |
| 38 | User | [Fix Sonar Research That Fails or Won’t Save](/help-center/user/article/sonar-troubleshooting) | Research Tools | 691 | Yes | Yes | New |
| 39 | User | [Market Analysis Tools](/help-center/user/article/market-analysis) | Research Tools | 403 | Yes | Yes | Updated (support route added) |
| 40 | User | [How Congressional Trading Data Works](/help-center/user/article/how-congressional-data-works) | Research Tools | 387 | Yes | Yes | Updated (support route added) |
| 41 | User | [Understanding Congressional Disclosures](/help-center/user/article/understanding-disclosures) | Research Tools | 381 | No | Footer form only | Reviewed, accurate |
| 42 | User | [Following Specific Politicians](/help-center/user/article/following-politicians) | Research Tools | 385 | Yes | Yes | Updated (support route added) |
| 43 | User | [Top Performing Politicians Methodology](/help-center/user/article/top-performing-politicians-methodology) | Research Tools | 396 | No | Footer form only | Reviewed, accurate |
| 44 | User | [Interpreting Congressional Trade Data](/help-center/user/article/interpreting-trade-data) | Research Tools | 374 | No | Footer form only | Reviewed, accurate |
| 45 | User | [Filtering and Searching Congressional Trades](/help-center/user/article/using-filters) | Research Tools | 412 | Yes | Yes | Updated (support route added) |
| 46 | User | [Congressional Trade Alert System](/help-center/user/article/trade-alerts) | Research Tools | 407 | Yes | Yes | Updated (support route added) |
| 47 | User | [Quant Lab: Strategies, Backtests and Analytics](/help-center/user/article/quant-tools) | Research Tools | 1022 | Yes | Yes | Rewritten |
| 48 | User | [Financial Analytics Views](/help-center/user/article/financial-analytics-views) | Research Tools | 399 | Yes | Yes | Updated (support route added) |
| 49 | User | [Researching a Stock End-to-End](/help-center/user/article/research-workflow) | Research Tools | 399 | Yes | Yes | Updated (support route added) |
| 50 | User | [Crypto Research Workspace](/help-center/user/article/crypto-research) | Research Tools | 410 | Yes | Yes | Updated (support route added) |
| 51 | User | [Commodities Research Workspace](/help-center/user/article/commodities-research) | Research Tools | 405 | Yes | Yes | Updated (support route added) |
| 52 | User | [Economic Indicators Dashboard](/help-center/user/article/economic-indicators) | Research Tools | 405 | Yes | Yes | Updated (support route added) |
| 53 | User | [Using the Power-User Terminal](/help-center/user/article/using-the-terminal) | Research Tools | 400 | Yes | Yes | Updated (support route added) |
| 54 | User | [Betting Markets & Prediction Data](/help-center/user/article/betting-markets) | Research Tools | 502 | Yes | Yes | Updated (support route added) |
| 55 | User | [Alternative Markets Aggregation](/help-center/user/article/alternative-markets) | Research Tools | 398 | Yes | Yes | Updated (support route added) |
| 56 | User | [Managing Your Ezana Echo Subscriptions](/help-center/user/article/managing-echo-subscriptions) | Research Tools | 392 | Yes | Yes | Updated (support route added) |
| 57 | User | [Centaur Intelligence: Your AI Research Assistant](/help-center/user/article/centaur-intelligence-overview) | Research Tools | 539 | Yes | Yes | Updated (support route added) |
| 58 | User | [Earnings Call Analyzer (NLP Sentiment)](/help-center/user/article/earnings-call-analyzer) | Research Tools | 438 | Yes | Yes | Updated (support route added) |
| 59 | User | [Kairos Signal: Event-Driven Trading Indicator](/help-center/user/article/kairos-signal-overview) | Research Tools | 446 | Yes | Yes | Updated (support route added) |
| 60 | User | [Related Prediction Markets on Events](/help-center/user/article/polymarket-related-markets) | Research Tools | 443 | Yes | Yes | Updated (support route added) |
| 61 | User | [Reading and Subscribing on Ezana Echo](/help-center/user/article/ezana-echo-guide) | Research Tools | 424 | No | Footer form only | Reviewed, accurate |
| 62 | User | [Managing Your Account Settings](/help-center/user/article/account-settings) | Account & Security | 429 | No | Yes | Updated |
| 63 | User | [Notification Preferences](/help-center/user/article/notifications-and-email) | Account & Security | 421 | Yes | Yes | Updated (support route added) |
| 64 | User | [Managing External Brokerage Connections](/help-center/user/article/managing-brokerage-connections) | Account & Security | 434 | Yes | Yes | Reviewed, accurate |
| 65 | User | [Which Brokerages We Support](/help-center/user/article/supported-brokerages) | Account & Security | 408 | Yes | Yes | Reviewed, accurate |
| 66 | User | [Supported Banks and Brokerages](/help-center/user/article/supported-institutions) | Account & Security | 192 | No | Yes | Reviewed, accurate |
| 67 | User | [Appearance: Light and Dark Mode](/help-center/user/article/appearance-theme) | Account & Security | 359 | Yes | Yes | Reviewed, accurate |
| 68 | User | [Enabling Two-Factor Authentication](/help-center/user/article/two-factor-auth) | Account & Security | 410 | Yes | Yes | Reviewed, accurate |
| 69 | User | [Troubleshooting Login Issues](/help-center/user/article/troubleshooting-login-issues) | Account & Security | 1137 | Yes | Yes | Rewritten |
| 70 | User | [Resetting Your Password](/help-center/user/article/resetting-your-password) | Account & Security | 374 | Yes | Footer form only | Reviewed, accurate |
| 71 | User | [How Your Data Is Protected](/help-center/user/article/data-security) | Account & Security | 428 | Yes | Yes | Reviewed, accurate |
| 72 | User | [Personal API Access and Integrations](/help-center/user/article/user-api-access) | Account & Security | 371 | Yes | Yes | Reviewed, accurate |
| 73 | User | [Exporting Your Data](/help-center/user/article/exporting-your-data) | Account & Security | 376 | Yes | Yes | Reviewed, accurate |
| 74 | User | [Deleting Your Account](/help-center/user/article/deleting-account) | Account & Security | 372 | Yes | Yes | Reviewed, accurate |
| 75 | User | [Understanding Ezana Plans](/help-center/user/article/plans-overview) | Billing & Subscriptions | 700 | Yes | Yes | Rewritten |
| 76 | User | [How the 30-Day Free Trial Works](/help-center/user/article/free-trial-explained) | Billing & Subscriptions | 552 | Yes | Yes | Rewritten |
| 77 | User | [Upgrading, Downgrading, or Canceling](/help-center/user/article/managing-subscription) | Billing & Subscriptions | 638 | Yes | Yes | Rewritten |
| 78 | User | [Canceling Your Subscription](/help-center/user/article/canceling-subscription) | Billing & Subscriptions | 460 | Yes | Footer form only | Updated |
| 79 | User | [Earn a Free Year of Personal Advanced With the Ezana Referral Program](/help-center/user/article/referral-program) | Billing & Subscriptions | 567 | Yes | Yes | Reviewed, accurate |
| 80 | User | [Managing Payment Methods](/help-center/user/article/payment-methods) | Billing & Subscriptions | 390 | Yes | Yes | Updated (support route added) |
| 81 | User | [Viewing Invoices and Billing History](/help-center/user/article/billing-history) | Billing & Subscriptions | 413 | Yes | Yes | Updated |
| 82 | User | [Using the Ezana Community](/help-center/user/article/community-overview) | Community | 503 | Yes | Yes | Rewritten |
| 83 | User | [Sending Messages to Other Investors](/help-center/user/article/messages) | Community | 421 | Yes | Yes | Updated (support route added) |
| 84 | User | [Understanding the Leaderboard](/help-center/user/article/leaderboard) | Community | 352 | No | Footer form only | Reviewed, accurate |
| 85 | User | [Learning From Legendary Investors](/help-center/user/article/legendary-investors) | Community | 351 | Yes | Yes | Updated |
| 86 | User | [Earning and Displaying Badges](/help-center/user/article/badges) | Community | 401 | Yes | Yes | Updated (support route added) |
| 87 | User | [Privacy on Your Public Profile](/help-center/user/article/privacy-on-profile) | Community | 399 | Yes | Yes | Updated (support route added) |
| 88 | User | [Community Guidelines and Posting Rules](/help-center/user/article/posting-rules) | Community | 636 | Yes | Yes | Rewritten |
| 89 | User | [Following Users and Managing Friends](/help-center/user/article/following-users) | Community | 430 | Yes | Yes | Updated |
| 90 | User | [Reporting and Blocking](/help-center/user/article/reporting-and-blocking) | Community | 316 | No | Footer form only | Reviewed, accurate |
| 91 | User | [Browsing and Enrolling in Courses](/help-center/user/article/courses-overview) | Learning Center | 404 | Yes | Footer form only | Updated |
| 92 | User | [Completing Lessons, Quizzes, and Earning Certificates](/help-center/user/article/completing-lessons) | Learning Center | 414 | Yes | Yes | Updated (support route added) |
| 93 | User | [Tracking Your Learning Progress](/help-center/user/article/course-progress) | Learning Center | 401 | Yes | Yes | Updated (support route added) |
| 94 | User | [The Learning Report and Certificates](/help-center/user/article/learning-report-and-certificates) | Learning Center | 395 | Yes | Footer form only | Updated |
| 95 | User | [Empire Rankings Overview](/help-center/user/article/empire-rankings-overview) | Global Analysis | 365 | No | Footer form only | Reviewed, accurate |
| 96 | User | [Empire Rankings: 18-Dimension Power Index](/help-center/user/article/empire-rankings-deep-dive) | Global Analysis | 462 | Yes | Yes | Updated (support route added) |
| 97 | User | [Reading the Big Cycle Chart](/help-center/user/article/big-cycle-chart) | Global Analysis | 396 | Yes | Yes | Updated (support route added) |
| 98 | User | [Geopolitical Events Feed (ISR)](/help-center/user/article/geopolitical-events-feed) | Global Analysis | 404 | Yes | Yes | Updated (support route added) |
| 99 | User | [Prediction Markets on Ezana](/help-center/user/article/prediction-markets) | Global Analysis | 381 | No | Footer form only | Updated |
| 100 | User | [Team Hub Overview (B2B)](/help-center/user/article/team-hub-overview) | Teams & Organizations | 376 | Yes | Yes | Reviewed, accurate |
| 101 | User | [Inviting Team Members and Managing Seats](/help-center/user/article/inviting-team-members) | Teams & Organizations | 408 | Yes | Yes | Updated (support route added) |
| 102 | User | [Team Roles, Permissions, and Billing](/help-center/user/article/team-roles-and-billing) | Teams & Organizations | 512 | Yes | Yes | Reviewed, accurate |
| 103 | User | [Importing Positions From a CSV](/help-center/user/article/importing-positions-from-a-csv) | Teams & Organizations | 483 | Yes | Yes | Updated (support route added) |
| 104 | User | [Terms of Service](/help-center/user/article/terms-of-service) | Legal & Disclosures | 456 | No | Yes | Reviewed, accurate |
| 105 | User | [Privacy Policy](/help-center/user/article/privacy-policy) | Legal & Disclosures | 438 | No | Footer form only | Reviewed, accurate |
| 106 | User | [Important Disclosures](/help-center/user/article/disclosures) | Legal & Disclosures | 402 | No | Footer form only | Reviewed, accurate |
| 107 | Partner | [The Ezana Partner Program: Overview](/help-center/partner/article/partner-program-overview) | Partner Onboarding | 363 | Yes | Yes | Updated |
| 108 | Partner | [How to Become an Ezana Partner](/help-center/partner/article/becoming-a-partner) | Partner Onboarding | 416 | Yes | Yes | Updated |
| 109 | Partner | [Partner Verification & Approval Timeline](/help-center/partner/article/verification-and-approval) | Partner Onboarding | 407 | Yes | Yes | Updated |
| 110 | Partner | [Partner Account vs Regular User Account](/help-center/partner/article/partner-vs-user) | Partner Onboarding | 460 | Yes | Yes | Updated |
| 111 | Partner | [Brokerage Access for Partner Accounts](/help-center/partner/article/partner-brokerage-access) | Partner Onboarding | 499 | No | Footer form only | Reviewed, accurate |
| 112 | Partner | [Setting Up Your Partner Profile](/help-center/partner/article/setting-up-profile) | Partner Onboarding | 466 | Yes | Yes | Updated |
| 113 | Partner | [New Partner Onboarding Checklist](/help-center/partner/article/partner-onboarding-checklist) | Partner Onboarding | 404 | Yes | Yes | Updated |
| 114 | Partner | [Understanding the Partner Badge System](/help-center/partner/article/understanding-badges) | Partner Onboarding | 452 | Yes | Footer form only | Updated |
| 115 | Partner | [Before You Apply: Partner Checklist](/help-center/partner/article/before-you-apply-checklist) | Partner Onboarding | 492 | No | Yes | Updated |
| 116 | Partner | [Content Studio Overview](/help-center/partner/article/content-studio-overview) | Content Studio & Ezana Echo | 533 | Yes | Yes | Rewritten |
| 117 | Partner | [Applying to Write for Ezana Echo](/help-center/partner/article/applying-to-write) | Content Studio & Ezana Echo | 1388 | Yes | Yes | Rewritten |
| 118 | Partner | [Writing and Submitting Articles](/help-center/partner/article/writing-articles) | Content Studio & Ezana Echo | 419 | Yes | Yes | Updated (support route added) |
| 119 | Partner | [The Editorial Review Process](/help-center/partner/article/article-review-process) | Content Studio & Ezana Echo | 370 | Yes | Footer form only | Updated |
| 120 | Partner | [Echo Publishing Workflow for Partners](/help-center/partner/article/echo-publishing-for-partners) | Content Studio & Ezana Echo | 397 | Yes | Yes | Updated |
| 121 | Partner | [Tracking Your Article Performance](/help-center/partner/article/tracking-article-performance) | Content Studio & Ezana Echo | 390 | Yes | Yes | Updated (support route added) |
| 122 | Partner | [Ezana Echo Content Guidelines](/help-center/partner/article/content-guidelines) | Content Studio & Ezana Echo | 423 | Yes | Yes | Updated (support route added) |
| 123 | Partner | [Building and Selling Courses on Ezana](/help-center/partner/article/building-courses) | Content Studio & Ezana Echo | 376 | Yes | Yes | Updated |
| 124 | Partner | [Copy Trading Roadmap (Coming Soon)](/help-center/partner/article/copy-trading-roadmap) | Copy Trading & Commissions | 381 | Yes | Yes | Updated (support route added) |
| 125 | Partner | [How Copy Trading Works for Partners](/help-center/partner/article/how-copy-trading-works) | Copy Trading & Commissions | 435 | Yes | Yes | Updated (support route added) |
| 126 | Partner | [Creating and Managing Trading Strategies](/help-center/partner/article/managing-strategies) | Copy Trading & Commissions | 406 | Yes | Yes | Updated (support route added) |
| 127 | Partner | [Understanding Partner Commissions](/help-center/partner/article/commission-structure) | Copy Trading & Commissions | 388 | Yes | Yes | Updated (support route added) |
| 128 | Partner | [The Referral Program](/help-center/partner/article/referral-program) | Copy Trading & Commissions | 382 | Yes | Yes | Reviewed, accurate |
| 129 | Partner | [Partner Earnings and Taxes](/help-center/partner/article/partner-earnings-and-taxes) | Copy Trading & Commissions | 363 | Yes | Yes | Reviewed, accurate |
| 130 | Partner | [How and When You Get Paid](/help-center/partner/article/payout-schedule) | Copy Trading & Commissions | 370 | Yes | Yes | Reviewed, accurate |
| 131 | Partner | [How Copiers Are Attributed to You](/help-center/partner/article/how-copiers-are-attributed-to-you) | Copy Trading & Commissions | 443 | No | Footer form only | Reviewed, accurate |
| 132 | Partner | [Payout Accounts and Tax Forms](/help-center/partner/article/payout-accounts-and-tax-forms) | Copy Trading & Commissions | 412 | Yes | Yes | Reviewed, accurate |
| 133 | Partner | [Partner Dashboard Overview](/help-center/partner/article/dashboard-overview) | Partner Dashboard | 397 | Yes | Yes | Updated (support route added) |
| 134 | Partner | [Using Dashboard Timeframes](/help-center/partner/article/partner-dashboard-timeframes) | Partner Dashboard | 351 | No | Footer form only | Reviewed, accurate |
| 135 | Partner | [Understanding Your Partner Metrics](/help-center/partner/article/reading-metrics) | Partner Dashboard | 423 | Yes | Yes | Updated (support route added) |
| 136 | Partner | [How Copier Metrics Update in Real Time](/help-center/partner/article/realtime-copier-metrics) | Partner Dashboard | 417 | Yes | Yes | Updated (support route added) |
| 137 | Partner | [Top Copiers and Managing Relationships](/help-center/partner/article/top-copiers-and-relationships) | Partner Dashboard | 380 | Yes | Yes | Updated (support route added) |
| 138 | Partner | [Tips for Growing Your Copier Base](/help-center/partner/article/growing-copiers) | Partner Dashboard | 386 | Yes | Yes | Updated (support route added) |
| 139 | Partner | [Using the Partner Community Hub](/help-center/partner/article/community-hub) | Community & Engagement | 393 | Yes | Yes | Updated (support route added) |
| 140 | Partner | [Partner Community Guidelines](/help-center/partner/article/partner-community-guidelines) | Community & Engagement | 392 | Yes | Yes | Updated (support route added) |
| 141 | Partner | [Best Practices for Follower Engagement](/help-center/partner/article/engaging-followers) | Community & Engagement | 393 | Yes | Yes | Updated (support route added) |
| 142 | Partner | [Earning Badges and Building Your Reputation](/help-center/partner/article/badges-and-achievements) | Community & Engagement | 390 | Yes | Footer form only | Updated |
| 143 | Partner | [Ezana Partner API Overview](/help-center/partner/article/api-overview) | API & Technical | 434 | No | Yes | Reviewed, accurate |
| 144 | Partner | [Managing Your API Keys](/help-center/partner/article/api-keys) | API & Technical | 443 | Yes | Yes | Reviewed, accurate |
| 145 | Partner | [Setting Up Webhooks](/help-center/partner/article/webhook-setup) | API & Technical | 379 | Yes | Yes | Reviewed, accurate |
| 146 | Partner | [API Endpoints Reference](/help-center/partner/article/api-endpoints-reference) | API & Technical | 361 | Yes | Yes | Reviewed, accurate |
| 147 | Partner | [Partner Troubleshooting Guide](/help-center/partner/article/partner-troubleshooting) | Support & Troubleshooting | 410 | Yes | Yes | Updated |
| 148 | Partner | [Partner Account Access Issues](/help-center/partner/article/partner-account-access-issues) | Support & Troubleshooting | 623 | No | Yes | Rewritten |
| 149 | Partner | [Payout Problems and How to Fix Them](/help-center/partner/article/partner-payouts-troubleshooting) | Support & Troubleshooting | 366 | Yes | Yes | Reviewed, accurate |
