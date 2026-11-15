# Ezana Trading (brokerage account) page: how it works today

Page: Trading, which the owner calls "the brokerage account page". Version: retail. Route: /trading.
What I want from the redesign (owner, verbatim): "the brokerage account page of the web application, not a dashboard page but just come up with a new design for it". Read as: this page must not look like another dashboard of cards. The designer is free to propose a new concept for a page where a member connects, views and manages their real brokerage accounts and trades.
Keep or drop: nothing specified.
Written from the code at commit 3f6c013 (main, November 15, 2026). The page was not run while writing this. Screenshots of the live page are supplied separately.

## 1. Summary

Today this address is not an account page. It is a sales page for opening an Ezana real-money brokerage account, plus two thin follow-up states. It never shows holdings, orders or linked accounts.

- Who uses it: retail members. Signed-out visitors can open it too.
- Organization (university fund) members get exactly the same page. Their council trading lives on a separate page reached from Team Hub.
- How they get to it: Trading in the top navigation (menu item "Brokerage Account", described as "Real-money trading account"), the centre "Trade" tab on phones, the phone menu, the "Deposit funds" button on the Dashboard, and "Start trading" at the end of the Getting Started checklist.
- What they do next: go to Mock Trading, start the account application, or go back to the Dashboard.
- Two different things are called a brokerage account in the product. (a) An Ezana brokerage account that the member applies for here. One per member. (b) Outside brokerage accounts the member already owns and links to Ezana. Linking (b) does not happen on this page at all. It happens in a dialog on the Home page.

## 2. What is on the page today

The page picks one of four states from the member's Ezana brokerage account. It ignores linked outside accounts, so a member with zero accounts and a member with three linked outside accounts see the same thing.

### State A: no Ezana account (also what signed-out visitors and members with zero accounts see)

Centred sales layout, top to bottom:

| Section                    | What it shows                                                                                                                                                                                                                                               | Controls                                                   |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Hero                       | Emerald title "Trade smarter with Ezana" and a two-sentence pitch                                                                                                                                                                                           | Outlined button "Try Mock Trading: $100,000 Paper Account" |
| Feature grid               | Six filled cards in two columns, each an icon, a title and a paragraph: Hybrid portfolios, Copy trading, Margin trading and short selling, Automated investing, Commission-free trading, Fractional shares. Some carry pill badges such as "$2,000 minimum" | None                                                       |
| Before you open an account | Three numbered steps: complete all 18 checklist tasks (a tick when done), verify your identity, fund your account                                                                                                                                           | None                                                       |
| Call to action             | Primary button "Open brokerage account". Until the checklist is complete it is disabled and reads "Complete checklist to unlock", with a hint line                                                                                                          | Opens the application                                      |
| Footer                     | A legal line naming the brokerage firm, with FINRA and SIPC links and "not FDIC insured". A "Back to dashboard" link                                                                                                                                        | Links                                                      |

### State B: application sent, not yet approved

A "Back to dashboard" link, then one centred card: "Application received", a sentence with the raw status word in bold, "We will email you when it is approved", and the Mock Trading button.

### State C: account approved or active

The page shows "Redirecting" and moves the member to a separate Trading dashboard subpage: a title "Trading", a sentence saying the full trading workspace ships in a later release, the Mock Trading button, an "Account snapshot" card with Equity, Buying power, Cash and a count of open positions, two links (Back to dashboard, Trading overview) and the legal line.

### State D: loading and errors

Loading is the plain word "Loading". There are no skeletons. The snapshot shows "Loading account" and, on failure, one inline error line with no retry. If the account lookup fails, the member simply sees the sales page.

### The application (its own subpage, opened from State A)

A "Trading overview" back link, then a six-step form with a numbered step bar:

1. Personal: legal first and last name, date of birth, Social Security number (masked), phone.
2. Address: street, unit (optional), city, state, ZIP code.
3. Employment and finances: funding source, annual income range, liquid net worth range.
4. Investment profile: experience, risk tolerance, objective, time horizon.
5. Disclosures: four tick boxes (control person, exchange or FINRA affiliation, politically exposed, family politically exposed).
6. Review: a summary and a required agreement tick box.

Controls: Back, Continue (disabled until required fields are filled), Submit application. Errors show inline above the form. On success the member returns to this page in State B or C. The form only fits United States residents, and nothing says so.

### Linking an outside brokerage (not on this page today)

On the Home page, a "Connect" chip or the "Connect a brokerage" menu item opens a dialog: a searchable grid of institutions (logo, name, country, a read-only marker), an "Add manually" option, sometimes a choice between two connection providers, then a consent screen with Continue. The member signs in at their institution in a secure window and lands back on Home. Settings, Integrations shows "N accounts connected" with a Manage link that also goes to Home.

### Tablet and phone

Under 768px the feature grid becomes one column and the snapshot figures stack. In the phone apps these pages are replaced by a "web only" notice.

## 3. What the user can do

- Open Mock Trading (every state) or go back to the Dashboard
- Start, fill in and submit the six-step application, once the checklist is complete
- See that an application is in review
- See equity, buying power, cash and the number of open positions (approved accounts)
- Elsewhere, not here: link an outside brokerage account (Home page dialog)
- Easy to miss: the page is open to signed-out visitors, who see the locked button.
- Exists in the code but has no button anywhere: an order ticket for the Ezana account (buy or sell, market or limit, shares or dollars, day or good until cancelled, a confirm step, a market-closed notice); a positions list with sorting, refresh and close position; an order history with All, Open and Closed filters and cancel; deposit and withdraw with a transfer history; linking a bank; removing a linked outside connection; refreshing linked accounts on demand.

## 4. Data we have

Shown on this page today:

| Field                      | What it means         | Public source             | Freshness                                                 | Missing for                     |
| -------------------------- | --------------------- | ------------------------- | --------------------------------------------------------- | ------------------------------- |
| Application status         | One status word       | Ezana brokerage account   | On load. Changes when the brokerage firm reports a change | Members who never applied       |
| Equity, buying power, cash | Account money figures | Ezana brokerage account   | On load                                                   | Accounts not yet approved       |
| Open positions             | A count               | Ezana brokerage account   | On load                                                   | Accounts not yet approved       |
| Checklist complete         | Yes or no             | Getting Started checklist | On load                                                   | Signed-out visitors (always no) |

In the product but not on this page today. Real, but each needs build work and a check that it works:

| Field                             | What it means                                                                                                                                                               | Public source                      | Freshness                                              | Missing for                                               |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------ | --------------------------------------------------------- |
| Application dates, account number | Submitted date, approved date, account number                                                                                                                               | Ezana brokerage account            | Stored                                                 | Unapproved accounts                                       |
| Ezana account positions           | Symbol, quantity, average entry price, current price, market value, cost basis, unrealised gain or loss (dollars and percent), today's change percent, and portfolio totals | Ezana brokerage account            | On load                                                | Empty accounts                                            |
| Ezana account orders              | Symbol, side, order type, quantity or dollar amount, average fill price, submitted time, status                                                                             | Ezana brokerage account            | On load                                                | Members who never traded                                  |
| Transfers                         | Date, deposit or withdrawal, amount, status, bank name and last digits                                                                                                      | Ezana brokerage account            | On load                                                | No way to link a bank in the interface today              |
| Symbol search, market status      | Symbol, name, exchange, fractional or not. A market open or closed sentence                                                                                                 | Brokerage asset list, market clock | As typed                                               | Non-US listings                                           |
| Linked outside accounts           | Institution name, account name, last four digits, account type, total balance, last synced time                                                                             | Member's linked institutions       | Several times a day, or once a day for read-only links | Buying power and cash are not split out                   |
| Linked holdings per account       | Ticker, name, quantity, average cost, cost basis, price, market value, security type, intraday or end-of-day marker                                                         | Member's linked institutions       | Same as above                                          | Average cost is sometimes missing. Sector is always blank |
| Linked totals                     | Total value, cost basis, gain or loss (dollars and percent)                                                                                                                 | Member's linked institutions       | Same as above                                          | Members with nothing linked                               |
| Institution directory             | Name, country, read-only or trade-capable                                                                                                                                   | Ezana institution list             | On open                                                | None                                                      |

Ask first: a daily value history exists for linked accounts (used by the Home chart) but part of it can be estimated, and transactions from linked accounts are stored but nothing reads them back today.

## 5. Data we do not have

Do not design around these.

- Placing trades in a linked outside account. Only the Ezana account has an order path.
- Copy trading, hybrid portfolios, automated or recurring investing, margin controls and short selling. The current page advertises them. Nothing is built behind them.
- Options or crypto trading on the Ezana account.
- Streaming quotes, order book depth, live fill notices. Never say "real-time".
- A value-over-time chart or performance percentage for the Ezana brokerage account. No history series was found for it.
- Per-account day change or performance for linked accounts. Only gain or loss against cost.
- Realised gain or loss, dividends, fees paid, benchmarks, risk scores, analyst ratings, news.
- Statements, tax documents, trade confirmations, transfers in from another broker.
- More than one Ezana account per member, or account types such as retirement or joint.
- Application progress steps, an expected approval time, or a reason for a refusal. Only a status word.
- Applications from outside the United States.
- Renaming, reordering or grouping linked accounts.
- Company logos on the page (branding rule), and sector labels for linked holdings.

## 6. Must keep working

- The address stays open to signed-out visitors, and stays replaced by the "web only" notice in the phone apps.
- The page still tells apart: no Ezana account, application in review, account active. The Trading dashboard address must keep resolving (the phone menu links to it).
- The application keeps its own address and all six steps, every field, the four disclosures and the agreement tick box. These are regulatory.
- The Getting Started checklist gate. No application and no real order until the required tasks are done. The server decides.
- One Ezana brokerage account per member. A double submit never opens two.
- The legal line naming the brokerage firm, its FINRA and SIPC membership, and the risk wording.
- A route to Mock Trading in every state.
- Inbound links keep landing here: the Trading menu, the phone "Trade" tab, Dashboard "Deposit funds", the checklist's "Start trading".
- Real orders confirm before they are placed, send once per submit, and show the market-closed notice.
- The existing connect dialog and consent screen stay as they are. If linking is offered here, the member returns here afterwards.
- Sample content is only for admin and demo accounts, is labelled "Sample content", and nothing done to it is saved.

## 7. Problems with the current page

### Design problems

- The menu promises a "Brokerage Account" and delivers a sales pitch. An approved member gets a placeholder that says the workspace is not built.
- Half of the feature cards describe things that do not exist.
- There is nowhere to see or manage linked outside accounts. Linking is hidden in a Home page chart menu, and "Manage" in Settings leads to a page with no account list.
- "Deposit funds" on the Dashboard lands here, with no deposit.
- It breaks most branding rules: a title block with an intro sentence, a centred narrow column, filled and bordered cards, an outlined button, pill badges, title case labels, arrow characters in links.
- The in-review state shows a raw system status word in capitals.
- The application does not say it is for United States residents only, and loses everything typed if the member leaves.

### Bugs and gaps

- The copy says 18 checklist tasks. The current checklist has 19, some marked coming soon and not required.
- The button unlocks from an older "checklist complete" marker, while the server checks the current checklist. It is unclear whether the two always agree.
- "Trading overview" on the active page loops straight back to the same page.
- A refused or closed application still reads "Application received. We will email you when it is approved."
- The built order ticket, positions, order history and funding screens are unreachable. From the code they look up an older account record, so they may fail for accounts opened through the current application. Not verified by running.
- The connect dialog tells members they can place trades in a linked account from Ezana. No order path for linked accounts was found.
- The phone menu shows "Trading dashboard" to everyone. A member with no account sees a bare error there.
- Loading is plain text, errors have no retry, and signed-out visitors are told to complete a checklist, not to sign in.

## 8. Design rules the mock must follow

This page must not read as a dashboard: no grid of stat cards or tiles. The rules outside tools get wrong most often come first.

1. Sections are flat. No fill, border, outline, shadow, glow or rounded panel, in dark or light mode. A section is a title and whitespace.
2. Content runs from the left edge of the Ezana logo to the right edge of the logout icon (x = 32 to x = 1408 at 1440px). Text sits on those lines, with no outer side padding and no narrower inner column.
3. Tabs, toggles, view switches and time selectors are text only. No track, pill, fill or border. Selected is emerald text, the rest grey.
4. No outlined buttons. Primary: solid emerald fill, white text, 8px radius, no border, 30 to 36px tall, one per group. Secondary: plain text. Destructive (remove an account, cancel an order): plain red text, confirmed in a dialog.
5. Search has no border, fill, outline or focus ring.
6. No page title block, eyebrow or intro sentence. Start with content.
7. Bootstrap Icons only. No emoji, illustrations, or company or bank logos. An institution is its name in text or a small letter tile.
8. Two typefaces: Plus Jakarta Sans for interface text, JetBrains Mono for every number, ticker, account digit and table date.
9. Sentence case for titles and buttons. No em dashes anywhere.
10. Describe, never advise. No "should" or "recommend". Never say "real-time". Say when figures were last synced.
11. Dark mode first. Light mode must work.
12. Nothing drawn touches text. A selected row is emerald text only, no accent bar, no wash. A vertical rule keeps 24px from text, a horizontal rule 12px.
13. Side-by-side sections are 64px apart, stacked sections 20px. A side column (for example an order ticket) is split off by one full-height grey vertical hairline.
14. Hairlines (1px, primary text at about 7 to 10 percent) divide content and never enclose it.
15. Tables: no header fill, 11px grey caps headers over one hairline, hairlines between rows, numbers right-aligned in mono.
16. A figure strip, if used, is about 48px tall and only as wide as its content.
17. Draw the real navigation bar unchanged: 64px tall, emerald ibex logo with bell and checklist on the left, Dashboard, Research, Trading, Sonar (filled emerald pill), Watchlist, Community, Learning Center in the centre, profile, settings and red logout on the right, one hairline below.
18. Money shows two decimals. Changes are signed (+9.33%, -0.92%). Missing values read N/A. Colour is never the only signal.
19. No chart, sparkline or statistic without real data behind it.
20. Only overlays (dialogs, menus, tooltips) have a solid surface, border, shadow and radius.

Colours:

| Name              | Dark    | Light   |
| ----------------- | ------- | ------- |
| Page ground       | #0a0e13 | #ffffff |
| Primary text      | #f0f6fc | #0f172a |
| Muted text        | #8b949e | #64748b |
| Emerald, positive | #10b981 | #059669 |
| Emerald as text   | #34d399 | #047857 |
| Negative          | #ef4444 | #dc2626 |
| Warning           | #fbbf24 | #d97706 |

## 9. Open questions for me

This run is automated, so each question carries the default that will be used unless you say otherwise.

1. Should linking and managing outside accounts move onto this page? Default: yes, reusing the existing connect dialog. Home keeps its shortcut.
2. Should real order entry, positions, orders and funding for the Ezana account appear here? Default: design them in. The build ships only what is confirmed working and marks the rest "not available yet".
3. What happens to the advertised features that are not built (copy trading, hybrid portfolios, automated investing, margin)? Default: removed from the page.
4. Keep the separate Trading dashboard subpage? Default: fold it into this page and keep the old address pointing here.
5. Removing a linked account from this page? Default: drawn as a red text action with a confirm dialog, built only where a removal path exists.
6. Signed-out visitors? Default: the page stays public and shows a short flat explanation with a sign-in action.
7. The legal line naming the brokerage firm? Default: kept as one caption line at the foot of the page.
8. The United States only application? Default: say so plainly before the member starts.
9. How is this page kept apart from Mock Trading? Default: Mock Trading stays the practice page (paper cash, thesis builder, what-if and risk cards, market movers, reset). This page repeats none of those tools.

## 10. Request to ChatGPT

Ezana Finance: Redesign this page. Execute the Ezana Autonomous Page Redesign workflow using the master prompt you wrote in this chat (ezana_autonomous_page_redesign_master_prompt.md) and the EZANA_BRANDING_AND_UI_GUIDE.md attached earlier in this chat. Page: Trading (the brokerage account page). Route: /trading. Version: retail. The attached screenshots show the existing page. Everything above this section is the description of the page's existing functionality. The owner's brief, verbatim: "the brokerage account page of the web application, not a dashboard page but just come up with a new design for it". This page must not look like another dashboard of cards. You are free to propose a new concept for a page where a member connects, views and manages their real brokerage accounts and trades. Do not duplicate the Mock Trading page. Show the page for a member with accounts, and show clearly what a member with zero linked accounts sees. Design one full-page desktop mock at 1440px wide in dark mode and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5. Keep everything in section 6 working, and solve the problems in section 7. Use the defaults in section 9. Label all numbers, names and tickers as sample content. Show the key loading and empty states. Finish with a written list of: every section you drew, every design decision I may want to reverse, and anything you drew that is not in section 4.
