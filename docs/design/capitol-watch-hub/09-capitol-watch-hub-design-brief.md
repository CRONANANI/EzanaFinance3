# Capitol Watch hub: design brief

A brief for Claude Design to propose better layouts for the Capitol Watch hub page on Ezana (ezana.world/datasets/capitol-watch). It has two parts:
- what the page does today, module by module, with the exact data each one shows;
- new data modules we can add, with a suggested visual form for each.

---

## 1. What the page is for

Capitol Watch is one of Ezana's dataset "dimensions". Its hub page is the front door to everything about **political money and power**: how members of Congress trade, which committees they sit on, who funds their campaigns, which companies lobby them, and which companies win federal contracts. It also shows how all of that connects to the stock market.

The hub has three jobs:
1. **Summarise** the five Capitol datasets at a glance, and send people into each full dataset page.
2. **Connect** the datasets into signals no single dataset shows. For example, a member who trades a stock in a sector their own committee oversees, or a trade made days before that company wins a federal contract.
3. **Let people ask their own questions** with EzanaQL, our plain-English query bar, limited to Capitol data.

**Who uses it:**
- Retail investors who follow "what Congress is buying".
- Students in university investment funds doing research.
- Journalists and analysts who want sourced, defensible numbers.

The tone is institutional and evidence-first, not sensational. Every number is a public record or computed from one, and the page says how.

---

## 2. The page today, top to bottom

### 2.1 Header
- Eyebrow "Datasets · Capitol Watch" with a bank icon, the title "Capitol Watch", the tagline "Follow your politicians' investment activity", and a one-line blurb.
- **Stat strip**, three figures:
  - **Live datasets:** "5 of 5".
  - **Records:** the total records across the Capitol datasets.
  - **Latest data:** the freshest date across them.

### 2.2 EzanaQL bar (ask the data)
- A plain-English prompt box that turns a question into a query and returns a table. Example prompts:
  - "Which members bought stock in the last 90 days?"
  - "Top 10 contractors by award value this fiscal year"
  - "Members who raised the most money this cycle"
- It is limited to Capitol datasets: congressional trades, inferred holdings, contracts, lobbying, committee seats and campaign finance.
- A row with a ticker opens a **company card**, showing that company's federal contracts and which members hold it.
- **Without an account,** people can run and view reports. Export (CSV/JSON), adding to the watchlist and saving to research ask them to create an account; Ezana is waitlist-only right now.
- People can save reports to a "Saved" list for this hub.

### 2.3 Dataset cards (one compact row of five)
Each card shows a title, a lead figure, a second figure, a freshness date and an "Open" link. It scrolls sideways on phones.

| Dataset | Lead figure | Also shows | Source |
|---|---|---|---|
| Politician Tracker | Trades disclosed, last 30 days | Members trading; most-traded ticker this month | House Clerk, Senate eFD (STOCK Act) |
| Campaign Finance Records | Total raised this cycle | Top raiser | FEC |
| Lobbying Activity | Lobbying spend this year | Top spender | Senate LDA filings |
| Government Contracts | Awards, last 90 days | Total value; top recipient | USAspending.gov |
| Committee Assignments | Committees and subcommittees | Seats; last sync | congress-legislators project |

### 2.4 "Signals across datasets" (the core of the page)
Five linkage cards. Each row in every card has the same actions:
- **Watchlist / Save:** a menu to add the ticker to the watchlist or save the row to the person's research. Signed-out users get a centred "create an account" modal.
- **Query this:** opens the EzanaQL bar with that row's query and runs it.
- **Share.**

Every card ends with its time window and named public sources.

**A. Trades near contract awards** (full width)
- **What it shows:** the best 30-day returns on trades made within 30 days of a federal contract award to the same company. It covers four kinds of trader: **politicians, corporate insiders (Form 4), institutions (13F changes) and whales (13D/13G stakes).**
- **Row fields:** trader name and type tag (Politician / Insider / Institution / Whale), party, ticker, bought or sold and the date, 30-day return, award amount, award date, awarding agency.
- **Per-row chart:**
  - daily closing prices around the award, with a dashed line on the award date and a marker on the trade;
  - the 30 days after the trade drawn heavier in green (gain) or red (loss);
  - hover and keyboard crosshair with date and price.
- **How it's measured:** a sale counts as a gain when the price fell. Institutions and whales are measured from the filing date, because those filings carry no trade date.

**B. Who reads contract awards best** (rankings)
- **Leaderboard of traders:** insight score (average 30-day return × hit rate, scaled down for small samples), number of trades, average return, hit rate, best ticker.
- **"Companies after their awards":** each company's average stock move in the 30 days after its award dates, and how often it rose.
- **Quick Step badge:**
  - **Traders earn it** with 3 or more measured trades near awards, 60% or more of them ahead 30 days later, averaging +5% or better.
  - **Companies earn it** with 3 or more award dates, 60% or more followed by a rise, averaging +3% or better.
  - **Hover or tap** explains what it means and how a user earns it. A signed-in user sees their own progress from their linked brokerage trades.
  - A locked version of the badge sits in the card header as a legend.

**C. Trades in sectors a member's committees oversee** (committee confidence)
- **Rows:** one per ticker, built from the last 180 days of trades where the member's committee oversees the company's sector (e.g. Energy and Commerce → Technology).
- **Row fields:** latest trade (member and party), trade type, date, overseeing committee, sector.
- **Confidence block:**
  - every full committee with at least one member who still holds the stock, each with its **share of members holding** (e.g. "12.5%, 3/24") and a bar;
  - five shown, the rest under "N more committees";
  - hovering a committee shows the holders' names.
- **Sort:** rows are ordered by **confidence score**, the highest share of any one committee holding the stock.
- **How it's measured:** holdings are inferred from disclosures (a purchase not followed by a full sale). Members report up to 45 days late.

**D. Lobbying and contracts, same company**
- Verified public companies that lobbied this calendar year **and** won federal contracts in the last 12 months.
- Row fields: company, ticker, lobbying spend, number of awards in the last 12 months, award value.

**E. Top raisers who also trade**
- The members raising the most this election cycle, and how often they disclosed trades.
- Row fields: member, party, state, receipts, cash on hand, number of trades in the last 12 months.

### 2.5 Footer
A "Sources" line naming every public source used on the page.

### 2.6 States every module needs
- **Loading:** skeleton bars per card, so each card streams in on its own.
- **Empty:** honest copy saying what fills it, e.g. "Appears once a trade near an award has 30 days of price history".
- **Error:** "This signal could not be loaded just now. It refreshes on its own; reload in a minute."
- **Signed out:** account actions show a lock and open the centred account modal.
- **Preview:** for data from a dataset that is not fully live yet.

---

## 3. Design constraints (Ezana design system)

- **Typography:** Plus Jakarta Sans for UI text. JetBrains Mono with tabular figures for **every number, ticker, date and percentage**.
- **Colour:**
  - Capitol Watch's accent is **emerald** (#10b981). Emerald also means gain, positive, and hover/selected.
  - Red is used sparingly, for losses only.
  - The page works in light and dark mode.
- **Cards:** an 8 to 12px radius, a thin border with a 2px accent top border, and quiet, receding gridlines.
- **Icons:** Bootstrap Icons only.
- **Copy:** no em dashes anywhere in the copy. Never name backend infrastructure in the UI; only the public sources (FEC, House Clerk, USAspending.gov and so on).
- **Honesty is part of the design:** amounts are the ranges members disclose, holdings are "inferred", and returns say what they are measured from. Labels and footnotes have to fit in every layout.
- **Responsive:** it must work at 375px wide with no sideways page scroll. Tables can scroll inside their card.
- **Motion:** respect reduced-motion settings.

---

## 4. New data we could show on the hub

Grouped by how ready the data is.

### Ready now (data already in Ezana)
1. **Congress's portfolio**
   - **What:** the stocks most widely held across Congress (inferred open positions), with the number of members and the estimated value range for each.
   - **Visual:** treemap or ranked bar list, filterable by party.
2. **Party split by sector**
   - **What:** how Democrats and Republicans are positioned across sectors.
   - **Visual:** a diverging bar chart, Democrats left and Republicans right.
3. **Disclosure lag tracker**
   - **What:** days between each trade and its disclosure, by member, including late filers past the 45-day STOCK Act limit.
   - **Visual:** a dot-strip plot with a 45-day reference line.
4. **Buy/sell pulse**
   - **What:** congressional buys versus sells each week over the past year, by chamber.
   - **Visual:** stacked weekly bars.
5. **Committee heatmap**
   - **What:** committees by sectors, coloured by the share of members holding stocks in each sector. It shows at a glance where oversight and ownership overlap.
6. **Contract leaders**
   - **What:** the top federal contractors in the last 90 days, by agency, with which of them members hold.
   - **Visual:** a ranked list with a "held by N members" chip.
7. **Lobbying to contracts funnel**
   - **What:** lobbying spend next to contract value won for the same companies (return on lobbying).
   - **Visual:** a scatter plot, spend against awards.
8. **Member spotlight**
   - **What:** a rotating card for one member, with their trades, committees, top donors, the companies they hold and those companies' contracts.
9. **Recent disclosures feed**
   - **What:** a live ticker or timeline of the newest filings across trades, lobbying and awards.
10. **Insider and Congress overlap**
    - **What:** stocks that members bought in the same month as corporate insiders (Form 4) or funds (13F).
    - **Visual:** a confluence list with a badge for each source.
11. **Prediction markets on policy**
    - **What:** live probabilities on bills, elections and appointments, from the prediction markets dataset, linked to the members and sectors involved.

### Needs a new public source (all free)
12. **Bills and votes, next to trades:** members who traded a company shortly before voting on a bill that affects it. Sources: Congress.gov API and roll-call votes.
13. **Upcoming hearings:** a calendar of committee hearings, with the stocks committee members hold in the affected sectors. Source: Congress.gov committee meetings.
14. **Revolving door:** former members and staff who became registered lobbyists, and the clients they lobby for. Source: LDA filings.
15. **Earmarks by district:** federal money flowing to each member's district, with recipients matched to public companies where possible. Source: USAspending.gov.
16. **Annual net worth ranges:** members' estimated wealth from annual financial disclosures, and its change over time.
17. **State officials:** state legislators' disclosures for a few states with machine-readable data, as a later expansion.

---

## 5. What we'd like from Claude Design

Propose 2 to 3 layout directions for this hub page. For each one:
- **Order and hierarchy:** a strong first screen that answers "what is Congress doing with money right now", with the cross-dataset signals given more weight than the dataset directory.
- **Which modules lead and which are secondary:** pick from sections 2 and 4.
- **A clear treatment for each signal card,** so a reader can scan many rows. Consider the per-row price chart, the committee confidence bars and the Quick Step badge.
- **A layout for one member or company** a user drills into from any row: a profile drawer or a page.
- **Desktop and mobile versions.**

Keep the sourcing and honesty labels visible in every direction.
