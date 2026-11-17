# Ezana Insider trading page: how it works today

Page: Insider trading. Route: /datasets/insider. Version: retail (public dataset page). Brief: unlock and redesign; new design and new features requested, following the dataset family look.
Written from the code at commit caa179e (main, November 16, 2026). The page was not run while writing this; screenshots of the live page are supplied separately.

## 1. Summary

The page lists buys and sales of company stock by officers, directors and 10 percent owners, from the SEC Form 4 filings they must make after a trade. Open-market purchases and sales lead; grants, option exercises, tax withholding and gifts are de-emphasised.

- Who uses it: retail investors, student analysts and journalists asking which insiders trade their own company's stock, and how much.
- How they get there: the Titans Shadow menu in the green category bar, the Titans Shadow hub, search engines, shared links, and the insider signal links on the Institutional Holdings page.
- What they do next: open the filing on SEC EDGAR, search another ticker or insider, or open EzanaQL.
- Data connected today: yes, live. Form 4 transactions are collected from SEC EDGAR several times an hour; the page caches for about 15 minutes. Whether rows exist today was not checked.
- Sample data: none on this page today. Figures in the wireframe are sample content with invented names; on the live page only admin and demo accounts will see sample data, labelled "Sample content"; everyone else sees real data or, if no source is connected, the honest empty state "This dataset's source is not connected yet."

## 2. What is on the page today

Desktop, top to bottom, in a column up to 1,400px wide.

**Frame.** The navigation bar, the full-bleed green category band, and under it a ticker strip of the 20 newest open-market trades: lead "Insider buy" or "Insider sale", ticker (or company) and insider name, dollar value. Items are not clickable. The shared dataset footer closes the page.

**Header (centred).** Eyebrow "DATASETS · TITANS SHADOW", title "Insider trading", a two-sentence intro, and three stats: "Open-market buys, 30 days" (count and total value in one string, for example "142 · $88.1M"), "Open-market sales, 30 days", and "Latest transaction" (date). With no data each reads a dash.

**EzanaQL row.** Terminal icon, "Query this data with EzanaQL" linking to the Titans Shadow hub, "on the Titans Shadow hub", and Share.

**Page empty notice.** With no open-market trades in 30 days: "No open-market Form 4 trades parsed for the last 30 days yet. Transactions appear here as filings are read from SEC EDGAR."

**Largest buys and sales.** Two bordered, rounded cards side by side: "Largest open-market buys, last 30 days" and "Largest open-market sales, last 30 days", each up to 25 trades with a reported value, largest first.

| Column                            | Content                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------ |
| Date                              | Transaction date                                                               |
| Ticker                            | Mono chip, or "None"                                                           |
| Company                           | Issuer name                                                                    |
| Insider                           | Name, then a muted title ("Chief Financial Officer", or "Director, 10% owner") |
| Shares, Price, Value, Owned after | Right-aligned mono; missing reads "Not reported", never zero                   |
| Filing                            | External-link icon opening the filing index on SEC EDGAR in a new tab          |

Empty: "No open-market buys with a reported price yet." (same for sales).

**Cluster buys.** Note: "Companies where three or more different insiders bought on the open market within 14 days, over the last 90 days." Up to 15 rows, most insiders first: Ticker, Company, Window (first to last date), Insiders, Buys, Value, Who (first four names, then "and others"). Empty: "No cluster buys in the last 90 days."

**Search by ticker or insider.** Note: "Every Form 4 transaction in the last 12 months, newest first." A bordered drop-down (Ticker or Insider name), a bordered field and a bordered Search button; Enter also searches. Results use the same columns plus Code: a chip, P green, S red, others neutral, "(deriv.)" for derivative lines, meaning on hover. Non open-market rows are dimmed. Up to 500 rows, no paging, sorting or count. Loading: two skeleton bars. Errors: "Type at least three letters.", "Unknown ticker.", "Could not load transactions.", "Search failed." Empty: "No Form 4 transactions for (term) in the last 12 months."

**What the codes mean.** A legend: P open-market or private purchase; S open-market or private sale; A grant or award; M exercise or conversion of a derivative; F shares withheld for tax or exercise price; G gift.

**Source footer.** "Source: SEC EDGAR, Form 4 (and the SEC insider transactions data sets for older history)." and "Amounts are as filed. A price the filing did not report shows as Not reported, never as zero."

**Loading.** The shared dataset skeleton, which does not match this layout.

**Tablet and phone.** The two cards stack below about 990px. Under 640px padding drops to 16px and the search field goes full width. Tables scroll sideways inside their wrapper.

## 3. What the user can do

- Read the 30-day buy and sale totals and the latest transaction date
- Scan the 25 largest open-market buys and sales of the last 30 days
- Search the last 12 months by ticker or insider name
- Open any transaction's filing on SEC EDGAR
- Read the code legend, share the page, open EzanaQL
- Easy to miss: hover a code chip for its meaning.
- Not available: sorting, filtering by role or code, paging, export, an insider or company detail, and any URL state. A search cannot be shared.
- Stored but not shown: security title (common stock, class B), direct or indirect holding, separate director, officer and 10 percent owner flags, form type.

## 4. Data we have

| Field                                          | What it means                            | Public source           | Freshness                                                    | Missing for                          |
| ---------------------------------------------- | ---------------------------------------- | ----------------------- | ------------------------------------------------------------ | ------------------------------------ |
| Transaction date                               | When the insider traded                  | SEC Form 4              | Collected several times an hour; page cache about 15 minutes | Rare lines                           |
| Ticker                                         | Issuer symbol as filed                   | SEC Form 4              | Same                                                         | Unlisted issuers ("None")            |
| Company                                        | Issuer name                              | SEC Form 4              | Same                                                         | None                                 |
| Insider name                                   | Reporting person                         | SEC Form 4              | Same                                                         | None                                 |
| Title or role                                  | Officer title, or Director and 10% owner | SEC Form 4              | Same                                                         | Some filings                         |
| Transaction code                               | P, S, A, M, F, G and others              | SEC Form 4              | Same                                                         | None                                 |
| Derivative flag                                | Option or other derivative line          | SEC Form 4              | Same                                                         | None                                 |
| Shares, Owned after                            | Shares traded and held after             | SEC Form 4              | Same                                                         | Some lines                           |
| Price                                          | Price per share                          | SEC Form 4              | Same                                                         | Grants, gifts, many derivative lines |
| Value                                          | Shares times price                       | Calculated              | Same                                                         | Wherever price is missing            |
| Filing link                                    | Filing index                             | SEC EDGAR               | Same                                                         | None                                 |
| 30-day counts and totals                       | Open-market buys and sales               | Calculated              | Page cache                                                   | None                                 |
| Cluster buys                                   | Company, window, insiders, trades, value | Calculated over 90 days | Page cache                                                   | Top 15 only                          |
| Search results                                 | All codes, 12 months, up to 500 rows     | SEC Form 4              | Page cache                                                   | Older than 12 months                 |
| Security title, direct or indirect, role flags | Stored per line                          | SEC Form 4              | Same                                                         | Not shown today; available           |

## 5. Data we do not have

Do not design around these.

- Price charts or returns after an insider trade.
- Whether a sale was under a pre-arranged trading plan, or filing footnotes.
- Percent of the company an insider owns, or an insider's holdings over time.
- Insider photos, biographies or past roles.
- Sector, industry or market cap for the issuer.
- Any insider sentiment score or "signal strength".
- Live or streaming trades; show the latest date and last update instead.
- Analyst ratings, price targets or news.
- Form 3 and Form 5 filings; anything older than 12 months.
- Wireframe figures are sample content with invented names; only admin and demo accounts will see sample data live, labelled "Sample content".

## 6. Must keep working

- Open-market trades (P and S) lead; other codes stay visible but de-emphasised.
- "Not reported" for any missing figure, never zero.
- The cluster rule: three or more different insiders, open-market buys, within 14 days, over 90 days.
- Ticker and insider-name search with its checks (letters only for tickers, three letters minimum for names, rate limited).
- Every transaction links to its original filing.
- An explainer for every code shown.
- The ticker strip of newest trades, the EzanaQL row and Share.
- Institutional Holdings links here from its convergence board and Security X-ray; those links must keep landing here.
- Sample data rule: admin and demo accounts may see sample content labelled "Sample content", never saved; everyone else sees real data or "This dataset's source is not connected yet." Known change: a parallel commit applies this rule to every dataset page.

## 7. Problems with the current page

### Design problems

- A centred title and intro paragraph instead of the compact identity row.
- Bordered, filled, rounded cards; bordered pill chips; a bordered drop-down, field and outlined button.
- P and S chips lean on green and red.
- No sorting, counts or paging; a 500-row search is one long list.
- No entity detail: an insider or a company cannot be opened.
- No ranked hero or chart: the page answers "biggest trades" but not "who is buying most" or "which companies see the most insider activity".
- Count and dollars share one stat value.

### Bugs and gaps

- Links from Institutional Holdings drop the ticker, and the page has no URL parameter to receive one.
- Search is not in the URL and cannot be shared.
- Placeholders use a real ticker and a real surname.
- The loading skeleton does not match the layout.

## 8. Design rules the mock must follow

Family look first, then the corrections outside tools get wrong most often.

1. Draw the frame as it is: the 64px Ezana navigation bar; the full-bleed green band (emerald gradient, white labels) with the dataset category bar, Titans Shadow active; under it the ticker strip of the newest open-market insider trades (small caps mono lead, white name, mint mono value); the shared light grey dataset footer. Do not redesign them.
2. Light mode as rendered on the live site: white ground, dark ink, only colours that exist in both themes.
3. Compact identity row on the left line: small caps mono eyebrow "DATASETS · TITANS SHADOW" (11px, muted) above "Insider trading" (22px, weight 700, sentence case); on the right a mono freshness line and at most one primary action. No centred title or intro paragraph; one sentence may go in a bi-info-circle tooltip.
4. Under it, the slim EzanaQL row: bi-terminal, "Query this data with EzanaQL", muted "on the Titans Shadow hub", plain-text Share on the right.
5. Content runs from x=32 to x=1408 at 1440px, text on those lines with no side padding.
6. Flat cards: no fill, border, shadow or radius; whitespace and hairlines only. 64px between side-by-side cards, 20px between stacked rows, 24px beside vertical rules. Only overlays (side panel, menus, tooltips) have a surface.
7. Tabs, toggles, filters and time selectors are text only, selected in emerald text, the rest grey; time ranges in 12px mono caps.
8. No outlined or pill buttons: one solid emerald primary per group, everything else plain text, emerald on hover.
9. Borderless search: bi-search icon, grey placeholder, no outline at rest, hover or focus.
10. JetBrains Mono with tabular figures for every figure, ticker, date, rank, eyebrow and table header; Plus Jakarta Sans for names and prose. 11px minimum. Card title 18px, section title 22px, body 14px.
11. Ruled tables: 11px caps mono headers over one hairline, no header fill, 1px row hairlines, 42 to 48px rows, no zebra, cell borders or boxed wrapper, numbers right-aligned, sort by clicking a header (emerald with bi-arrow-up or bi-arrow-down).
12. Entity detail opens in a 480px right side panel with its own URL parameter; Back closes it.
13. Bootstrap Icons only; no emoji, logos or photos; tickers as mono text; colour is never the only signal.
14. Selected rows: emerald text or a faint wash with 12px clearance; no edge bar; no mark touches text.
15. Skeletons in the final layout, never spinners; a one-line empty state with one action; an inline error with Retry.
16. Sentence case. No em dashes. Describe, never advise. Never "real-time": show the last update. No vendor names in interface text. Signed changes, compact headline money ($4.92M), N/A or "Not reported" for missing values.

Colours, light (dark): ground white #ffffff (#0a0e13); primary text #0f172a (#f0f6fc); secondary text #1e293b (#e2e8f0); muted grey #64748b (#8b949e); faint grey #94a3b8 (#6b7280); emerald #059669 (#10b981); emerald text #047857 (#34d399); negative red #dc2626 (#ef4444); warning amber #d97706 (#fbbf24); cyan #06b6d4; purple #a78bfa; hairline = primary text at about 8 percent; green band = emerald gradient with white text.

## 9. Open questions for me

Each question carries the default that will be used.

1. Keep the 30-day window? Default: 30 days by default, with 30D and 90D as text toggles (90 days are already read).
2. Should search drive the whole page? Default: yes, one borderless search for ticker or insider, mirrored to the URL.
3. Side panels for an insider and a company? Default: yes, from the 12-month data.
4. Show non open-market codes outside search? Default: no; a text toggle "All codes" reveals them.
5. Keep the code legend as a section? Default: move it to an info tooltip on the Code header plus one line under the table.
6. What does a row click do? Default: opens the side panel; the filing stays an icon link.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this dataset page. Follow the Ezana dataset page redesign master prompt (DATASET_MASTER_PROMPT.md) and the Ezana Branding and UI Guide, both pasted earlier in this chat. Page: Insider trading. Route: /datasets/insider. Version: retail, public dataset page. Data connected today: yes, live. The attached screenshots show the existing page. Everything above this section describes the page's existing functionality and data. Design one full-page desktop mock at 1440px wide in light mode, as rendered on the live site, and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5 except as clearly marked future features. Keep everything in section 6 working and solve the problems in section 7. Use the defaults in section 9. Propose and draw 4 to 8 new features and functions that would be genuinely useful for this specific dataset, such as a ranked hero of the companies with the most insider buying, insider and company side panels with 12-month trade history, a role filter (officer, director, 10 percent owner), cluster-buy alerts, and a CSV export with a filing citation. Use invented sample names only and label all numbers, names and tickers as sample content. Show the key loading, empty and error states. Finish with the written outputs listed in section 10 of the master prompt.
