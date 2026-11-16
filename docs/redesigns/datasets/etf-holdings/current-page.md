# Ezana ETF holdings page: how it works today

Page: ETF holdings. Route: /datasets/etf-holdings. Version: retail (public dataset page). Brief: unlock and redesign; new design and new features requested, following the dataset family look.
Written from the code at commit caa179e (main, November 16, 2026). The page was not run while writing this; screenshots of the live page are supplied separately.

## 1. Summary

The page shows what about 50 of the largest US-listed ETFs hold, which of them hold a given stock, and how much two ETFs overlap, from the quarterly holdings reports (Form N-PORT) that registered funds file with the SEC.

- Who uses it: retail investors checking what is inside a fund they own, whether two funds duplicate each other, and how much fund money sits in one stock.
- How they get there: the Titans Shadow menu in the green category bar, the Titans Shadow hub, search engines, shared links, and the ETF cross-signal row in the Institutional Holdings Security X-ray.
- What they do next: pick another ETF, look up a stock, compare two funds, or open EzanaQL on the hub.
- Data connected today: yes, live. Holdings are read daily from N-PORT filings on SEC EDGAR (a few new filings per run); the page caches about 15 minutes. Reports are public about 60 days after each quarter ends, so holdings are always a past quarter end. Whether rows exist today was not checked.
- Sample data: none on this page today. Figures in the wireframe are sample content with invented names; on the live page only admin and demo accounts will see sample data, labelled "Sample content"; everyone else sees real data or, if no source is connected, the honest empty state "This dataset's source is not connected yet."

## 2. What is on the page today

**Frame.** The navigation bar, the full-bleed green category band, and a ticker strip of up to 20 tracked ETFs by net assets: lead the fund ticker, the fund name, net assets. Not clickable. The shared dataset footer closes the page.

**Header (centred).** Eyebrow "DATASETS · TITANS SHADOW", title "ETF holdings", one paragraph (what the page does, and that holdings publish about 60 days after quarter end), and one stat: "ETFs tracked".

**EzanaQL row.** Terminal icon, "Query this data with EzanaQL" linking to the Titans Shadow hub, and Share.

**Page empty notice.** With no funds: "No ETF holdings loaded yet. They are read from Form N-PORT filings on SEC EDGAR daily." The three sections below are then hidden.

**Holdings.** Section title, then a bordered drop-down of every tracked ETF ("TICKER · Fund name"), largest by net assets first and selected by default. Choosing a fund loads:

- A stat line: Report date, Net assets, Holdings (count of lines).
- Left, a bordered card "Top 25 holdings": Holding (mono ticker chip, or the issuer name in grey when no ticker is mapped, or "Unmapped"), Name, Weight (percent of net assets, two decimals), Value (compact dollars).
- Right, two stacked cards: "By asset category" and "By country", each up to 12 rows of a label, a thin proportional bar and a percent. Asset categories read in plain words (Equity, common; Debt; Repurchase agreement; Equity derivative and so on). Countries show as reported, as short codes. Missing groups read "Not reported".
- Loading: one skeleton bar. Error: "Holdings could not be loaded." Empty: "No holdings loaded for this ETF yet."

**Which ETFs hold this stock?** A bordered field ("Ticker, e.g. AAPL") and a bordered "Find ETFs" button. Results: ETF (ticker chip), Fund, Weight, Value, Report date, highest weight first, from each fund's latest report only. Empty: "No tracked ETF holds (ticker) in its latest N-PORT report." Errors: "Unknown ticker." or "Search failed." Loading: one skeleton bar.

**Overlap between two ETFs.** Shown when at least two funds exist. Note: "For each security both hold, the smaller of the two weights; summed." Two bordered drop-downs (tickers only) joined by "and", defaulting to the two largest funds. Result: "(x)% overlap across (n) shared holdings", then up to 25 shared holdings: Holding, Name, first fund's weight, second fund's weight, Overlap. Same fund twice: "Pick two different ETFs." Error: "Overlap could not be computed."

**Not covered.** A grey line listing universe tickers with no holdings and why, for example gold and spot bitcoin trusts: "Not a registered fund series (no N-PORT filing)", or a filing problem.

**Source footer.** "Source: SEC EDGAR, Form N-PORT (public quarter-end reports)." and a line naming the third-party service that maps securities to tickers.

**Loading.** The shared dataset skeleton, which does not match this layout.

**Tablet and phone.** The holdings card and the two breakdown cards stack below about 990px. Under 640px padding drops to 16px and fields go full width. Tables scroll inside their wrapper.

## 3. What the user can do

- Choose an ETF and read its top 25 holdings, asset mix and country mix
- Look up which tracked ETFs hold a ticker, and at what weight
- Compare two ETFs' overlap and see the shared holdings
- See which universe ETFs are not covered and why
- Share the page, open EzanaQL
- Not available: sorting, the full holdings list beyond 25, export, opening a holding, and any URL state. The chosen fund, the lookup and the comparison cannot be shared.
- Stored but not shown: each holding's CUSIP, ISIN and security title, and the previous report's holdings (two report dates are kept per fund).

## 4. Data we have

| Field | What it means | Public source | Freshness | Missing for |
| --- | --- | --- | --- | --- |
| Fund ticker, name | Identity | SEC fund records | Daily | Funds outside the 50-fund universe |
| Report date | Quarter end the holdings describe | Form N-PORT | Public about 60 days after quarter end | None |
| Net assets | Fund size on the report date | Form N-PORT | Same | Rare |
| Holdings count | Lines in the report | Form N-PORT | Same | None |
| Holding name, title | Issuer and security description | Form N-PORT | Same | None |
| Holding ticker | Mapped from the security identifier | Identifier mapping | Fills in over days | Bonds, cash, derivatives, many foreign lines |
| CUSIP, ISIN | Security identifiers | Form N-PORT | Same | Some lines; not shown today |
| Weight | Percent of net assets | Form N-PORT | Same | Rare |
| Value | Dollar value of the line | Form N-PORT | Same | Rare |
| Asset category | Equity, debt, derivative and so on | Form N-PORT | Same | Some lines |
| Country | Issuer country code | Form N-PORT | Same | Some lines |
| Previous report | The prior quarter's holdings | Form N-PORT | Same | Not shown today; available |
| Holders of a ticker | Tracked ETFs holding it, weight, value | Calculated | Page cache | Untracked funds |
| Overlap | Sum of the smaller weight per shared security | Calculated | Page cache | None |
| Not covered list | Universe tickers with no N-PORT and why | Universe plus filings | Daily | None |

## 5. Data we do not have

Do not design around these.

- Fund prices, returns or expense ratios.
- Fund flows, creations and redemptions, or net assets over time.
- Daily or intraday holdings: only quarter-end reports.
- Sector or industry breakdowns (only asset category and country).
- Bond detail such as coupon, maturity, duration or credit rating.
- Funds outside the curated universe of about 50, and any mutual fund.
- Holdings for commodity, spot crypto or unit trusts.
- Fund logos, ratings or scores.
- Wireframe figures are sample content with invented names; only admin and demo accounts will see sample data live, labelled "Sample content".

## 6. Must keep working

- Fund picker, top holdings, asset category and country breakdowns.
- The "which ETFs hold this stock" lookup, latest report only, with its ticker check.
- The overlap rule (smaller weight per shared security, summed) and the shared-holdings list.
- Report date shown with every fund, so nobody reads holdings as current.
- Unmapped holdings show the issuer name, never a blank.
- The not covered list with reasons.
- The ticker strip, the EzanaQL row and Share.
- The Institutional Holdings Security X-ray links here; that link must keep landing here.
- Sample data rule: admin and demo accounts may see sample content labelled "Sample content", never saved; everyone else sees real data or "This dataset's source is not connected yet." Known change: a parallel commit applies this rule to every dataset page.

## 7. Problems with the current page

### Design problems

- A centred title and intro paragraph instead of the compact identity row.
- Bordered, filled, rounded cards; bordered drop-downs, field and outlined button; ticker chips as bordered pills.
- Choosing a fund from a long drop-down is slow; there is no overview of all 50 funds side by side.
- The three tools are stacked sections with no shared entity: a fund cannot be opened from the lookup results or the overlap table.
- The overlap picker shows only tickers, not names.
- No ranked hero: nothing answers "which stocks are most held across these ETFs".

### Bugs and gaps

- Nothing is in the URL; a fund, lookup or comparison cannot be shared.
- With no mapped ticker, the Holding and Name columns repeat the same name.
- Countries show as raw codes.
- The footer names a third-party data service, which breaks the no-vendor-names rule.
- Links from Institutional Holdings drop the ticker; the page has no parameter to receive one.
- The stored previous report is never used, so quarter-on-quarter changes are not shown.
- The placeholder uses a real ticker.

## 8. Design rules the mock must follow

Family look first, then the corrections outside tools get wrong most often.

1. Draw the frame as it is: the 64px Ezana navigation bar; the full-bleed green band (emerald gradient, white labels) with the dataset category bar, Titans Shadow active; under it the ticker strip of tracked ETFs by net assets (small caps mono lead, white name, mint mono value); the shared light grey dataset footer. Do not redesign them.
2. Light mode as rendered on the live site: white ground, dark ink, only colours that exist in both themes.
3. Compact identity row on the left line: small caps mono eyebrow "DATASETS · TITANS SHADOW" (11px, muted) above "ETF holdings" (22px, weight 700, sentence case); on the right a mono freshness line and at most one primary action. No centred title or intro paragraph; one sentence may go in a bi-info-circle tooltip.
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

1. How should a fund be chosen? Default: a ranked list of all tracked funds by net assets as the hero; a row opens the fund in a side panel with its own URL parameter.
2. Show the full holdings list? Default: yes, in the side panel, 25 per page, sortable.
3. Show changes since the previous report? Default: yes, as a "backend extension" feature using the stored prior report.
4. Should a holding open anything? Default: a holding with a ticker opens the "which ETFs hold it" view for that ticker.
5. Countries as codes or names? Default: names, with the code as mono meta.
6. Keep the not covered list visible? Default: yes, as one quiet line under the fund list.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this dataset page. Follow the Ezana dataset page redesign master prompt (DATASET_MASTER_PROMPT.md) and the Ezana Branding and UI Guide, both pasted earlier in this chat. Page: ETF holdings. Route: /datasets/etf-holdings. Version: retail, public dataset page. Data connected today: yes, live. The attached screenshots show the existing page. Everything above this section describes the page's existing functionality and data. Design one full-page desktop mock at 1440px wide in light mode, as rendered on the live site, and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5 except as clearly marked future features. Keep everything in section 6 working and solve the problems in section 7. Use the defaults in section 9. Propose and draw 4 to 8 new features and functions that would be genuinely useful for this specific dataset, such as a ranked list of the most widely held stocks across tracked ETFs, a fund side panel with full holdings, changes since the prior report, a multi-fund overlap matrix, a "my funds" exposure view that adds up one stock across several ETFs, and a CSV export with a report citation. Use invented sample names only and label all numbers, names and tickers as sample content. Show the key loading, empty and error states. Finish with the written outputs listed in section 10 of the master prompt.
