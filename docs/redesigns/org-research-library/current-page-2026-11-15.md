# Ezana Research Library page (organizational): how it works today

Page: Research Library. Version: organizational (university student-managed investment funds). Route: /org-team-hub/research-library (no sub-routes; documents and the editor open as overlays). Brief: open brief.
Written from the code at commit 8ffb5a2 (main, November 15, 2026). The page was not run while writing this; screenshots of the live page are supplied separately.

## 1. Summary

The Research Library is the council's written memory: every note, pitch memo, model, primer and post-mortem its members have filed, kept across cohorts.

- Who uses it: analysts (write, attach files, read past coverage), portfolio managers and executives (review, block or publish, pin, mark exemplars). A faculty advisor is an executive with that title. "Managers" means executives and portfolio managers.
- Decision it supports: for an analyst, "what has the council already written on this name, and is my document ready to publish"; for a manager, "what waits on my review, and which coverage has gone stale".
- How they get to it: the sidebar link (with the count of published documents) and the weekly digest.
- What they do after: open Pitch Pipeline or a Sonar research report.
- The shell: the page sits inside the shared Team Hub shell, a 200px sidebar of 17 icon and text links beside one hairline, already redesigned and live. This redesign covers only the page body.

## 2. What is on the page today

Desktop, top to bottom.

**A. Sonar research reports strip.** A bordered box with the four latest Sonar reports the viewer may read (kind, ticker, status, title, author, version, share of claims verified, date) and "All reports", which opens Sonar Research.

**B. Header block.** Eyebrow "Team Hub", title "Research Library", an intro sentence. On the right a pill-track switch with icons (Library, Ticker, Lineage) and a filled "New note" button.

**C. Library view (default).**

- A bordered search bar. Active filters sit inside it as removable chips. At its right end a label: "Semantic + AI" when meaning-based ranking is switched on for the deployment, otherwise "Keyword".
- Six filter dropdowns (Type, Sector, Publish status, Term, Author, Ticker), each listing the values present with a count; several can be ticked.
- Results line: "N documents, sorted by recency" (or "relevance" while searching) and "Summarize this set" (an AI synthesis of up to 40 listed documents in a dismissible box).
- A four-column grid of bordered cards: type, status (unless published) and "Exemplar" pills, a gold star when pinned, title, two-line abstract, ticker, sector, "Alum" pill, author and role when written, views, relative date. Pinned documents come first. Superseded cards are dimmed. A card opens the document overlay.
- Loading: eight grey blocks. Empty: "The library is empty" and "New note". No match: "No documents match". Error: one red line, no Retry. Non-members see a members-only line.

**D. Document overlay** (centred panel up to 860px wide; closes on X, Escape or a click outside). In order: pills and title; a notice when superseded; AI summary ("Generate summary", then bullets); a details grid (author and role, published date, ticker as a button to the Ticker view, sector, term, version, views, downloads, and "View pitch" when a pitch link is stored, which opens Pitch Pipeline rather than that pitch); abstract; body as plain text; sources; attachments (name, size, download, delete, "Attach file"); a row of outlined buttons (Open, Export PDF, Edit, Submit for review, Back to draft, Publish, Supersede, Mark exemplar, Pin) with a "Publish blocked" box listing each reason; version history (number, title, editor, when; old text cannot be opened); the review thread (comments with "Block" and "Resolved" pills, Resolve or Reopen, a comment box, and for managers a tick box "Blocks publish until resolved").

**E. Editor dialog.** Type, template (optional; fills an empty body with its section headings), title, abstract, body (plain text box), ticker with suggestions, sector (eleven standard sectors), term (free text), visibility (Whole org, My team, Private), tags, sources, attachments (after the first save). Buttons: Cancel, Save draft, Save and publish.

**F. Ticker view.** A ticker box with "Open dossier", then sector, "Summarize all", a stat row (documents, analysts, covered since, pitches, first pitch's expected return) and a dated list of every document on that ticker.

**G. Lineage view.** One row per ticker: current analyst or "Unassigned", document and handoff counts, last document date, latest pitch's expected return, "Stale" after 90 days without a document. A row opens the handoff chain: from member, to member, term, handoff document.

**Tablet and phone.** The grid drops to three columns under 1200px, two under 860px, one under 560px. Everything else simply wraps.

## 3. What the user can do

| Action                                                                                               | Who                                                                    | Notes                                                                             |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Read                                                                                                 | Every member                                                           | Private: author only. Drafts: author and managers                                 |
| Create a document                                                                                    | Every member                                                           | Saved as a draft, or published at once                                            |
| Edit                                                                                                 | Author, managers                                                       | Each edit stores the old version. Not offered once superseded                     |
| Submit for review, back to draft                                                                     | Author, managers                                                       |                                                                                   |
| Publish                                                                                              | Author (own work); managers with the approval right; executives always | Blocked by a missing abstract, a missing template section or an open review block |
| Supersede                                                                                            | Author, managers                                                       | One click, no successor choice, no undo                                           |
| Pin, unpin                                                                                           | Managers                                                               | The server also accepts the author; no button                                     |
| Mark exemplar                                                                                        | Managers                                                               |                                                                                   |
| Comment                                                                                              | Every member                                                           | Managers may mark a comment as a publish block                                    |
| Resolve or reopen a comment                                                                          | Its author, managers                                                   |                                                                                   |
| Attach a file                                                                                        | Author, managers (needs the upload right, held by every default role)  | One at a time, after the first save                                               |
| Download a file                                                                                      | Any reader                                                             | The link lasts five minutes                                                       |
| Delete a file                                                                                        | The uploader, managers                                                 | Immediate, no confirmation                                                        |
| Search, filter, summarize (document, set, ticker), open, export PDF, open a dossier or handoff chain | Every member                                                           |                                                                                   |

In the code with no button: delete a document (author or manager; drafts are removed, published work is archived); sort by views or title; pinned-only and tag filters; create a template and record a coverage handoff (managers); saved searches and collections; choosing a successor when superseding.

## 4. Data we have

| Field                                                       | Meaning and source                                                                                                           | Missing when                                |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Title, abstract, body, sources                              | The document, typed by its author                                                                                            | Abstract and sources optional until publish |
| Type                                                        | Note, pitch memo, model, primer, post-mortem, IC minutes, reading, competition, external                                     |                                             |
| Status                                                      | Draft, under review, published, archived, superseded                                                                         |                                             |
| Ticker, sector, term, tags                                  | Classification by the author                                                                                                 | All optional                                |
| Visibility                                                  | Whole org, my team, private                                                                                                  |                                             |
| Author, role when written, alum flag                        | From the membership record                                                                                                   | Role blank on old rows                      |
| Version number; past versions (number, title, editor, date) | Recorded on each edit                                                                                                        | No history before the first edit            |
| Pinned, exemplar                                            | Set by managers                                                                                                              |                                             |
| Views, downloads                                            | Opens by others, PDF exports                                                                                                 | Not unique people                           |
| Created, updated, published dates                           | System                                                                                                                       |                                             |
| Linked pitch, assignment, position                          | Set only by seeded data today                                                                                                | Almost always blank                         |
| Superseded by                                               | Successor title                                                                                                              | Never set from the page                     |
| Comments                                                    | Text, author, time, block flag, resolved flag, open block count                                                              |                                             |
| Attachments                                                 | File name, size, kind (PDF, sheet, document, deck, image), uploader, upload date                                             | Kind, uploader and date are not shown       |
| Templates                                                   | Name, type, required sections, starter text                                                                                  | None unless seeded                          |
| Filter counts, search mode                                  | Documents per filter value; keyword or meaning-based                                                                         |                                             |
| AI summaries                                                | Bullets for a document, a set or a ticker, written on request by Ezana's assistant, not stored                               | Assistant unavailable                       |
| Ticker dossier                                              | Document count, distinct authors, first year, pitch count, first pitch's expected return, target and status                  | Pitch fields blank without a pitch          |
| Coverage lineage                                            | Current analyst, handoffs (from, to, term, handoff document), last document date, stale flag, latest pitch's expected return | No chain until a handoff is recorded        |
| Sonar reports                                               | Latest four: kind, ticker, status, title, author, version, share of claims verified, date                                    |                                             |

All of it is read live from the council's records.

## 5. Data we do not have

Do not design around these.

- Any link between a library document and a flag. The Trading Desk flag dialog's "pinned research" evidence lists the member's own pinned cards from the market research pages. Pinning a library document does not put it there.
- A working link to a position or an assignment, or a link that opens the specific pitch.
- File previews, thumbnails, search inside files, folders, several files at once.
- Formatted text: the body is plain. No headings, tables, images or charts.
- Who viewed a document, unique readers, ratings, likes, bookmarks, mentions.
- Comparing or restoring versions.
- Realised returns, price charts, news, an assigned reviewer or review due dates.
- Collections, saved searches, or grades for a document.

## 6. Must keep working

- Members only. Access rules are enforced by the server and must not be loosened: private means author only; drafts show to the author and managers.
- The document lifecycle: create, save draft, edit with version history, submit for review, back to draft, publish with its three blockers and their reasons, supersede (old work stays readable), exemplar, pin with pinned first.
- Publishing another member's document needs a manager with the approval right.
- Review thread, manager-only publish blocks, resolve and reopen.
- Attachments: PDF, Word, Excel, CSV, PowerPoint, PNG, JPG up to 25 MB, upload after first save, short-lived download links, delete by uploader or manager.
- Search across title, abstract, body, ticker and tags; six filters with live counts; recency and relevance order; the honest Keyword or Semantic label.
- Ticker view and the jump to it from a document; Lineage view with the 90 day stale rule.
- AI summaries for a document, a set and a ticker. Open and Export PDF. View counts that ignore the author's own opens.
- The Sonar reports entry and its link.
- Other readers of the library: the sidebar count, the weekly digest, member ratings and participation scores, the assistant's retrieval, and the graduation check for a published document tagged "handoff".
- First paint from the server, with the client fetch as fallback.

## 7. Problems with the current page

**Design problems**

- Breaks the house rules throughout: title block, bordered boxes and cards, filled pills, a pill-track switch, outlined buttons, a bordered search bar.
- A card grid is slow to scan. Tags, visibility, version, file and comment counts are not on the card.
- Nothing shows what waits on a manager: no review queue, open block count or "my drafts".
- The overlay has nine equal buttons in a row and buries the body under the summary and details.
- Lineage says a manager records handoffs, yet offers no control.
- No way to tie a document to a pitch, position or assignment when writing it.
- No sample content mode.

**Bugs and gaps**

- The editor says drafts stay private to the author; managers see them too.
- "My team" visibility is not enforced by the access rule as written: the whole council can read those documents.
- The body invites Markdown but shows it as raw text.
- Supersede, pin, exemplar and status changes fail silently, as does a failed set summary. No Retry anywhere.
- Lineage shows its empty state when loading fails.
- Deleting a file and superseding are not confirmed. A document cannot be deleted or archived here.
- Download links expire after five minutes, so an open document gives dead links.
- The dossier lists newest first yet says "chronologically". Expected return is unsigned. Missing values show a dash.
- The Sonar report page offers filing in a library collection, but collections cannot be created or seen anywhere.
- The graduation check looks for a "handoff" type that does not exist; only the tag works.
- View, filters, search and the open document are not in the page address.
- At most 1,000 documents load; no paging.

## 8. Design rules the mock must follow

The page must match the rebuilt org pages (Command Center, Trading Desk, Fund Analytics, Assignments): a compact KPI strip with page actions on its right, flat sections, text tabs, and a "Sample content" label with a "Show council data" switch. Most broken rules first.

1. Sections are flat: no fill, border, shadow, glow or rounded panel, in either mode. Rows are flat too. No cards.
2. The navigation bar runs from the logo's left edge (x = 32 at 1440px) to the logout icon's right edge (x = 1408). Page content sits right of the sidebar's hairline and ends exactly on the right line.
3. Tabs, the view switch, filters and toggles are text only: no track, pill, fill or border. Selected is emerald text, the rest grey.
4. No outlined buttons. Primary: solid emerald, 8px radius, one per group. Secondary: plain text. Destructive: plain red text, confirmed in a dialog.
5. Search has no border, fill or focus ring: an icon and grey placeholder.
6. No page title, eyebrow or intro sentence.
7. Bootstrap Icons only. No emoji, logos, file-type artwork or illustrations.
8. Plus Jakarta Sans for text. JetBrains Mono for every number, date, version, file size and ticker.
9. Sentence case. No em dashes. Describe, never advise.
10. Dark mode first; light mode must work.
11. Nothing drawn touches text. Vertical rules keep 24px from text, horizontal rules 12px.
12. Side-by-side sections 64px apart; stacked 20px. A side column is split off by one full-height hairline.
13. KPI strip: about 48px tall, only as wide as its content, 28px icon tile, 12px grey label, 18px mono value, hairlines between cells.
14. Lists: 11px grey caps header over a hairline, hairlines between rows, numbers right-aligned. Hover changes text colour only.
15. Type, status, exemplar, alum, pinned and stale are text with an optional icon, never a filled chip, never colour alone.
16. Draw the real navigation bar and sidebar; redesign neither.
17. Missing values read N/A. Percentages are signed. No figure without data from section 4.
18. Only overlays (document panel, editor, menus, confirmations) have a surface, border, shadow and radius.
19. Every section has a skeleton in its final layout, a one-line empty state with one action, and an inline error with Retry.

| Colour                   | Dark             | Light            |
| ------------------------ | ---------------- | ---------------- |
| Page ground              | #0a0e13          | #ffffff          |
| Primary text             | #f0f6fc          | #0f172a          |
| Secondary text           | #e2e8f0          | #1e293b          |
| Muted text               | #8b949e          | #64748b          |
| Emerald, emerald as text | #10b981, #34d399 | #059669, #047857 |
| Negative, blocked        | #ef4444          | #dc2626          |
| Warning, stale           | #fbbf24          | #d97706          |
| Gold (exemplar, pinned)  | #d4a853          | #b8922f          |

## 9. Open questions for me

Each carries the default that will be used.

1. Replace the card grid with a list? Default: yes, one row per document, pinned first.
2. KPI strip contents? Default: Published, Under review, My drafts, Open review blocks, Stale tickers.
3. Keep Library, Ticker and Lineage? Default: yes, as text tabs, with view, filters and open document in the page address.
4. Add delete and archive? Default: yes for author and managers, confirmed; published work is archived, never removed.
5. Link a document to a pitch, position or assignment when writing? Default: pitch only; the other two left out and listed.
6. Offer library documents as flag evidence on the Trading Desk? Default: out of scope, flagged.
7. Fix the "My team" access gap? Default: needs a database change, written up for the owner.
8. Collections and saved searches? Default: left out, flagged.
9. Where does the Sonar strip go? Default: a side column, latest four with "All reports".
10. Sample content for master admin and demo accounts? Default: yes, labelled "Sample content", never saved.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this page. Execute the Ezana Autonomous Page Redesign workflow using the master prompt you wrote in this chat (ezana_autonomous_page_redesign_master_prompt.md) and the EZANA_BRANDING_AND_UI_GUIDE.md attached earlier in this chat. Page: Research Library. Route: /org-team-hub/research-library. Version: organizational. The attached screenshots show the existing page. Everything above this section is the description of the page's existing functionality. Design one full-page desktop mock at 1440px wide in dark mode and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5. Keep everything in section 6 working, and solve the problems in section 7. Use the defaults in section 9. Keep the existing Team Hub sidebar as it is and design only the content to its right, matching the rebuilt org pages: a compact KPI strip with the page actions on its right, flat sections, text tabs and a Sample content label. Show how the page differs for an analyst and for a portfolio manager or faculty advisor, respecting the table in section 3, and draw the document panel with its files and review thread, and the editor. Include 4 to 8 features tailored to university investment councils (analysts, portfolio managers, executives, faculty advisors), built only on data in section 4: for example a review queue with open publish blocks, my drafts, a publish readiness checklist, stale coverage by ticker, coverage handoffs across cohorts, an exemplar shelf for new members. Label all numbers, names and tickers as sample content. Show the key loading and empty states. Finish with a written list of: every section you drew, every design decision I may want to reverse, and anything you drew that is not in section 4.
