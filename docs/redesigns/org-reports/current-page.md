# Ezana Reports page (organizational): how it works today

Page: Reports. Version: organizational (university student-managed investment funds). Route: /org-team-hub/reports, plus the printable report view that opens in a new browser tab. Brief: open brief.
Written from the code at commit 8ffb5a2 (main, November 15, 2026). The page was not run while writing this; screenshots of the live page are supplied separately. Where the brief and the code disagree, this file follows the code.

## 1. Summary

Reports is the council's shelf of stakeholder reports. A stakeholder report is a frozen, one-document summary of the fund (value, return against a benchmark, sector attribution, pitch outcomes, roster) laid out for printing or saving as a PDF, meant for a dean, a donor or an advisory board. The page today is a short list of saved reports with one form to make a new one.

- Who uses it: executives and portfolio managers. A faculty advisor is an executive with the title Faculty Advisor, so advisors are included. Analysts have no sidebar link to it.
- Decision it supports: what do we hand to people outside the council this term, and is it accurate enough to hand over.
- How they get to it: the Reports item in the Team Hub sidebar (executives and portfolio managers only), or the "Open reports" link that appears on Fund Analytics after "Save and open report".
- What they do after it: open the printable version in a new tab, use the browser's print dialog to print or save a PDF, then send that file by their own means. Ezana sends nothing.

The page sits inside the shared Team Hub shell: a 200px sidebar of 17 icon-and-text links beside one full-height hairline, already redesigned and live. This redesign covers only the page body to the right of that hairline, and the printable report.

Other reports live elsewhere and are not listed here: the Council pitch report (Pitch Archive, every member) and Sonar research reports (Sonar pages).

## 2. What is on the page today

Desktop, top to bottom:

1. Title block: a small "Analytics" eyebrow, the heading "Stakeholder Reports", and the line "Branded fund reports for deans, donors, and advisory boards."
2. Generate row (executives and portfolio managers only): a bordered text field with the placeholder "Period label, e.g. Fall 2026" and a filled button "Generate Stakeholder Report" with a chart-file icon. Pressing it builds a report from the fund as it stands at that moment, saves it, reloads the list and opens the printable version in a new tab. While it works the button reads "Generating..." and is disabled. An empty field saves the label "Current Term". A failure shows one red line under the row.
3. Report list: one bordered, rounded row per saved report, newest first, up to 100. Left: the title in bold ("University name, Fund Report (period label)") and under it the period label and the date it was made. Right: an outlined button "Open printable report" with a download icon, which opens the printable version in a new tab.

States: "Loading reports..." centred; empty "No reports generated yet."; errors replace the page with one red line ("Failed to load reports.", "Could not connect.") and no retry. No dialogs, menus, tabs, filters, search, toasts or sample content.

Tablet and phone: nothing changes by design. The generate row wraps; a list row keeps title and button side by side, which will crowd on a phone with a long title.

### The printable report (new tab)

A white, light-only document about 820px wide, in the two Ezana typefaces. It is built from the saved copy, so reopening an old report shows the old figures. The print dialog opens by itself shortly after the page loads.

1. Screen-only dark bar: "Stakeholder report ready," and a filled "Download / Print PDF" button.
2. Cover: "Confidential" in gold caps, university name, "Student-Managed Investment Fund", period label, cohort; Ezana logo right; emerald to gold rule.
3. Executive summary: four bordered tiles: Fund Value, Return, Benchmark, Alpha.
4. Performance vs. Benchmark table: cost basis, current value, fund return, benchmark return, "Alpha (excess return)", positions held.
5. Attribution by Sector: sector, weight, contribution.
6. Top Contributing Pitches: ticker, analyst, return, alpha, state; up to 10.
7. Roster: name, title or role, designation of every active member.
8. Footer: "Prepared via Ezana Finance, Confidential" and the date.

Empty tables show one grey line. Gains green, losses red, missing figures a dash. No charts, method notes, disclaimer or page numbers.

## 3. What the user can do

- See the list of saved stakeholder reports (any member who reaches the page).
- Type a period label and generate a report (executives and portfolio managers).
- Open the printable version of any saved report (executives and portfolio managers).
- Print it or save it as a PDF through the browser.
- From Fund Analytics: "Save and open report" does the same generate step, with the label filled in for them as "Fund Analytics," plus the period selected there and its date range.

Nobody can rename, delete, compare, pick sections or dates, add commentary, preview, schedule, email or share a link. Managers hold the database right to delete and edit reports, but there is no button and no working path for either.

## 4. Data we have

All of it is captured once, when the report is generated, and stored with the report.

| Field                        | What it means                                                                                                                     | Source                              | Gaps                                                                              |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------- |
| Title                        | University name, "Fund Report", period label                                                                                      | Settings plus typed label           | Cannot be edited                                                                  |
| Period label                 | Free text; changes no figure                                                                                                      | Typed, or filled by Fund Analytics  | Not a date range                                                                  |
| Date generated, generated by | When and by which member                                                                                                          | System                              | Author stored, never shown                                                        |
| Cohort                       | Current cohort name                                                                                                               | Council records                     | Blank with none                                                                   |
| Fund value                   | Shares times latest stored price over open holdings; unpriced holdings at cost                                                    | Recorded holdings and market prices | No cash                                                                           |
| Total cost                   | Shares times average cost                                                                                                         | Recorded holdings                   |                                                                                   |
| Fund return                  | Gain on cost of holdings open now                                                                                                 | Calculated                          | Not time-weighted; ignores sales, deposits, dividends. N/A when nothing is priced |
| Benchmark return             | Price change of the council's index fund (SPY unless changed) from the first daily record, or earliest holding, to generation day | Market price history                | Falls back to an average stored on pitches                                        |
| Benchmark symbol and source  | Which fund, index or fallback                                                                                                     | Settings                            | Stored, never printed                                                             |
| Alpha                        | Fund return minus benchmark, in points                                                                                            | Calculated                          | Not risk-adjusted                                                                 |
| Positions held               | Count of open holdings                                                                                                            | Recorded holdings                   |                                                                                   |
| Sector weight, contribution  | Sector value over fund value; sector gain over fund cost                                                                          | Calculated                          | "Unclassified" when no sector                                                     |
| Pitch rows                   | Ticker, analyst, return, alpha, state (outperforming, underperforming, roughly in line)                                           | Pitches and follow-up outcomes      | Only pitches with an outcome; not size-weighted                                   |
| Analyst attribution          | Per analyst: pitches, average return, average and total alpha                                                                     | Pitches                             | Stored, never printed                                                             |
| Roster                       | Name, role, title, designation of active members                                                                                  | Roster                              |                                                                                   |
| Can generate                 | Viewer is executive or portfolio manager                                                                                          | Membership                          | Live                                                                              |

Everything except the last row is frozen at generation. Also live elsewhere and usable here: daily fund records (Fund Analytics period return), sector cap and breaches, competition standing.

## 5. Data we do not have

Do not design around these.

- Share links, guest or donor logins, passwords, expiry, view counts or an open log.
- Email delivery, recipients, or a record of who a report went to.
- Scheduled or recurring reports. Nothing runs on a timer.
- A stored PDF. It exists only when someone prints from the browser.
- Approval or sign-off, drafts, versions, comments, or editable commentary.
- Time-weighted or money-weighted return, risk figures, cash, income, fees, realized gains, transactions.
- A university logo on the report (settings store one; only the Ezana logo prints).
- Templates, section choices, or any second report layout. Sample reports.

## 6. Must keep working

- The route, and the Reports sidebar item for executives and portfolio managers.
- Fund Analytics "Save and open report" and its "Open reports" link: a report saved there must appear here.
- Generating with an empty label still saves "Current Term".
- The printable version opens in a new tab and reprints later with the same frozen figures. Old reports, including ones with missing fields, still open.
- Server checks: only members of the same council list reports; only executives and portfolio managers generate or open one; another council's report is "not found". Non-members are sent home first.
- The printable page stays standalone and loads nothing from third parties.

## 7. Problems with the current page

### Content that could mislead an outside reader

1. Return is not time-weighted and the report does not say so. "Return" and "Fund return" are the gain on cost of the holdings open today. Sold positions, cash, deposits and dividends are left out. A donor will read it as the fund's performance for the period.
2. The period label changes nothing. A report titled "Fall 2026", or "Fund Analytics, YTD" with a date range, carries the same since-purchase figures as any other. The label reads as the measurement window and is not.
3. A report saved from Fund Analytics can disagree with the page it was saved from. Fund Analytics shows a period return from daily records; the report recalculates gain on cost.
4. Fund and benchmark are measured over different windows (each holding since its purchase, the benchmark from the first daily record or earliest holding), yet they are subtracted and printed as "Alpha".
5. The benchmark is not named, and its dates are not shown. When price history is missing, a fallback average taken from pitch records is printed under the same word with no note.
6. "Alpha" is a plain difference, not risk-adjusted.
7. "Top Contributing Pitches" is sorted by alpha, not contribution, is not weighted by position size, and with fewer than ten outcomes it lists losing pitches under that heading.
8. An unpriced holding is valued at cost, with no count of unpriced holdings and no "prices as of" date.
9. Fund value has no cash, so it can sit below the fund's true size without saying so.
10. No statement that figures are unaudited, student prepared, descriptive only, and that past results do not predict future ones.
11. Every active student's full name and role is printed in a document made for outsiders, and analysts are named against winning and losing pitches, with no choice to leave either out.
12. "Confidential" is printed, but nothing controls the file once it is saved as a PDF.

### Sharing and access

- There is no share link of any kind, so there is no uncontrolled link today. The only way out of the council is a printed or saved PDF sent by hand, which Ezana cannot track, expire or recall.
- Bug: the advisor setting "Who can export stakeholder reports" (executives, portfolio managers and advisors, or executives and advisors only) is saved but never checked. Portfolio managers can always generate and open.
- Bug: an analyst who types the address sees the list and the "Open printable report" buttons; pressing one opens a tab of raw error text.
- Bug: settings promise the university logo on stakeholder reports; it is not printed.

### Design problems

- Title block, bordered rounded rows, bordered input, outlined button, title case: against the rules and unlike the rebuilt Team Hub pages. No KPI strip, skeletons, retry or sample content.
- The list shows nothing from inside a report (value, return, author, cohort), although all are stored.
- No delete, so a mistaken report stays forever. No preview: seeing a report means saving one.
- A download icon and "Download / Print PDF" for a print dialog, which also opens by itself on every visit. The file name ends in .html.
- The printable page is light only with bordered rounded tiles; as a print document that may stay.

## 8. Design rules the mock must follow

The page must match the four rebuilt Team Hub pages (Command Center, Trading Desk, Fund Analytics, Assignments): a KPI strip with page actions on its right, flat sections, text tabs, a "Sample content" label with a "Show council data" switch, and the same sample council (the same nine invented members, four sector teams, the "2026 analyst class" cohort, and "Sample council fund" at 240,050.00 dollars, up 46.73 percent against SPY up 10.08 percent). The most often broken rules come first.

1. Sections are flat: no fill, border, shadow, glow or rounded panel, in either mode. Rows and tiles are flat too.
2. The navigation bar runs from the logo's left edge (x = 32 at 1440px) to the logout icon's right edge (x = 1408). The sidebar starts on the left line. Page content sits right of the sidebar and ends exactly on the right line. No inner width.
3. Tabs and toggles are text only: no track, pill, fill or border. Selected is emerald text, the rest grey.
4. No outlined buttons. Primary: solid emerald, white text, 8px radius, 30 to 36px tall, one per group. Secondary: plain text. Destructive: plain red text, confirmed in a dialog.
5. Search and text fields have no border, fill or focus ring: an icon and grey placeholder.
6. No page title, eyebrow or intro sentence.
7. Bootstrap Icons only. No emoji, logos or illustrations.
8. Plus Jakarta Sans for interface text. JetBrains Mono for every number, date, count and ticker.
9. Sentence case. No em dashes. Describe, never advise. Never say "real-time".
10. Dark mode first; light mode must work.
11. Nothing touches text. Vertical rules keep 24px from text, horizontal 12px. Hairlines (1px) divide, never enclose.
12. Side-by-side sections 64px apart, stacked 20px. A side column is split off by one full-height hairline.
13. KPI strip: about 48px tall, 28px icon tile, 12px grey label, 18px mono value, hairlines between cells.
14. Tables: 11px grey caps header, hairlines between rows, numbers right-aligned in mono.
15. Status is text with an optional icon, never a chip or colour alone. Missing values read N/A. Changes are signed.
16. Only overlays have a surface, border, shadow and radius. Draw the real navigation bar and sidebar unchanged.
17. Every return states its method and dates beside it.

| Colour                   | Dark             | Light            |
| ------------------------ | ---------------- | ---------------- |
| Page ground              | #0a0e13          | #ffffff          |
| Primary text             | #f0f6fc          | #0f172a          |
| Secondary text           | #e2e8f0          | #1e293b          |
| Muted text               | #8b949e          | #64748b          |
| Emerald, emerald as text | #10b981, #34d399 | #059669, #047857 |
| Negative                 | #ef4444          | #dc2626          |
| Warning                  | #fbbf24          | #d97706          |
| Gold                     | #d4a853          | #b8922f          |

## 9. Open questions for me

Each carries the default that will be used.

1. Print a method and disclosure block on every report (return method, benchmark name and dates, unpriced count, unaudited)? Default: yes, always, not optional.
2. Rename "Return" to "Gain on cost of current holdings" and "Alpha" to "Difference to benchmark"? Default: yes, on the report and the list.
3. Let the author leave the roster and analyst names out of a report? Default: yes, two switches at generation, both on by default.
4. Honour the advisor's export setting? Default: yes, a bug fix.
5. Hide the page body from analysts with a plain "managers only" line? Default: yes.
6. Add delete? Default: yes for executives, confirmed in a dialog, only if the existing rights allow it without a database change; otherwise left out and listed.
7. Add share links or email? Default: no. No access control exists for them; the page says reports leave Ezana only as a printed or saved PDF.
8. Add scheduled reports? Default: no; not drawn.
9. Stop the print dialog opening by itself? Default: yes; the button opens it.
10. Show the university logo on the report? Default: yes when one is saved.
11. Sample content for master admin and demo accounts? Default: yes, three sample reports for the sample council, labelled, never saved.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this page. Execute the Ezana Autonomous Page Redesign workflow using the master prompt you wrote in this chat (ezana_autonomous_page_redesign_master_prompt.md) and the EZANA_BRANDING_AND_UI_GUIDE.md attached earlier in this chat. Page: Reports. Route: /org-team-hub/reports. Version: organizational. The attached screenshots show the existing page. Everything above this section is the description of the page's existing functionality. Design one full-page desktop mock at 1440px wide in dark mode and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5. Keep everything in section 6 working, and solve the problems in section 7. Use the defaults in section 9. Keep the existing Team Hub sidebar as it is and design only the content to its right. Draw the report list, the generate step with a preview of what will be saved, and, beside or below the page, the printable report as a light document with its method and disclosure block. Include 4 to 8 features tailored to university investment councils (analysts, portfolio managers, executives, faculty advisors), built only on data in section 4: for example a KPI strip from the latest report, list rows with each report's saved figures, cohort and author, two saved reports side by side, a check before saving (unpriced holdings, benchmark source, missing sectors), switches to leave out roster or analyst names for donor copies, and a statement of who can open a report. Do not draw share links, email, scheduling or approval. Label all numbers, names and tickers as sample content. Show the key loading and empty states. Finish with a written list of: every section you drew, every design decision I may want to reverse, and anything you drew that is not in section 4.
