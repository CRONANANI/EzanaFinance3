# ChatGPT notes: Compliance (organizational)

ChatGPT returned the image only ("Worked for 1m 50s", thinking label "Planned the council wireframe") and wrote no text with it: no list of sections, reversible decisions or items outside section 4. Everything below is the stage 2 agent's own reading of the image, not ChatGPT's words.

Image: 971 x 1619 px as served in the chat, read in five overlapping slices (wireframe-part1.jpg to wireframe-part5.jpg).

## Sections drawn, top to bottom

1. Real navigation bar and the Team Hub sidebar (Compliance selected in emerald; member shown as the invented "Maya Okafor, Executive").
2. Top row: "Sample content" label and a "Show council data" switch on the left; on the right a role preview switch as text (Executive selected in emerald, Portfolio manager, Analyst), then the solid emerald "Add rule" button, then "View resolved" and "Refresh" as plain text.
3. KPI strip, four cells with hairlines: Open breaches 2, Hard breaches 1, Rules in force 7, Sectors over cap 1. Below it one muted line: "Personal trading and attestations are not yet available in this workspace."
4. Main column: breach list with text tabs Open (emerald) and Resolved, a line "2 open breaches logged.", table columns Status, Logged, Source, Ticker, Rule, Detail, Action. Rows: hard, Nov 14, 2026, pitch, HLTX, Max sector exposure 35%, "Proposed Healthcare idea would place sector above the 35% cap based on supplied sector and size", Resolve (emerald text). soft, Nov 12, 2026, pitch, TERA, Min market cap, "Proposed market cap is below the recorded minimum", Resolve. Then "Resolved history (recent)": resolved, Nov 8, 2026, pitch, KLYN, Max single trade 8%, "Resolved by Chidi Okoye. Reason: updated proposed size."
5. Right column beside it (vertical hairline): "Policy summary" bullets (hard rules log a hard breach; soft rules log a soft breach; cash floor is recorded only, not checked; idea checks are for policy fit before pitching) and the italic line "A council policy record. Not legal or regulatory advice."
6. "Rules in force (7)" table: Rule, Severity, Current reading, Status, Controls. Max single position 12% soft, MedCore 11.4% / 12%, within. Max sector exposure 35% hard, Healthcare 36.2% / 35%, over (red). Max positions 20 soft, 16 / 20, within. Min positions 8 soft, 16 / 8, within. Min market cap $5B soft, "Checked only in idea check", N/A. Cash floor 5% soft, "Recorded only, not checked", recorded only. Prohibited sector Tobacco hard, "No holdings in prohibited sector", within. Controls Disable (plain) and Delete (red). Sub-group "Disabled rules (2)": Prohibited ticker XYZQ hard, Max single trade 8% soft, dimmed, with Enable and Delete.
7. Right column beside the rules: "Sector headroom (based on holdings)": Financials 24.1% / 35% (10.9% headroom), Healthcare 36.2% / 35% (1.2% over cap, red bar), Technology 22.8% / 35% (12.2% headroom), Industrials 16.4% / 35% (18.6% headroom), each with a thin bar.
8. "Idea check": four borderless fields in a row (Ticker HLTX, Sector Healthcare, Proposed size 4.0, Market cap 3.2B), solid "Run check" and plain "Reset". Result line, then grouped per-rule results: Hard (x Max sector exposure 35%, check Prohibited sector Tobacco), Soft (x Min market cap $5B, check Max positions 20 "Position count would be 17 / 20"), Portfolio-level (not evaluated pre-trade): dash Min positions 8, dash Cash floor 5% "Recorded only, not checked."
9. Overlay dialogs drawn beside the idea check: "Add rule" (Rule type select, Value, Severity "Soft: log a soft breach", note "Rules feed idea checks and pitch review.", Save rule solid, Cancel) and "Resolve breach" (Ticker, Logged, Source, Rule, Detail in mono, required "Reason *" field, note "Resolved is the only other state.", Resolve breach solid, Cancel).
10. "Council activity log" (executives): text filter tabs All, Rules, Breaches, Other; table When, Actor, Action, Target, Detail with plain action names (Rule added, Breach resolved, Rule disabled); "Load more".
11. "Role differences (permissions for student funds)": three columns Executive (set rules, resolve, read log), Portfolio manager (resolve, read rules, run idea check), Analyst (read rules, run idea check).
12. "Key states" strip: loading (spinner plus skeleton bars, "Loading compliance data ..."), empty ("No open breaches logged."), error ("Could not load compliance data." with Retry).
13. Footer line: "Sample content only. Names, tickers, figures and dates shown here are fictional."

## Council-specific features in the drawing

Policy summary for new members; each rule's current reading against holdings with within / over / recorded only; sector headroom per team sector; idea check before pitching with grouped per-rule results; breach list with logged date, source, ticker and rule; resolved history tab; role preview switch; council activity log with plain action names.

## Things the build must not copy (contradict the description)

- Resolved history shows "Resolved by Chidi Okoye. Reason: ...": who resolved and why are not stored (section 5). The resolve reason field is the section 9 default 1, so it needs the schema change in sql.md before it can be stored.
- The activity log shows "Rule added", "Breach resolved", "Rule disabled": section 4 says rule changes and resolutions are not recorded in the audit log today.
- The activity log filter tabs (Rules, Breaches, Other) are invented groupings over action codes.
- Idea check result says "1 hard breach and 1 soft breach logged in this preview" although the run saves nothing; wording should not say "logged".
- "Min positions 8 within" and the other readings depend on running the holdings check on load (section 9 default 3); fine if built that way, otherwise they must read N/A.
- The role preview switch (Executive, Portfolio manager, Analyst) is not in the description; it may be a presentation device only for sample content.
- "Role differences" and "Key states" are annotations, not page sections.
- No page-level "Hard: block the trade" wording appears; good.

## Design decisions the owner may want to reverse

- One long page instead of tabs: breaches, rules, idea check and activity log are stacked sections; Personal trading and Attestations tabs removed (one muted line).
- "Add rule" is the page's single solid button in the top row; Resolve is emerald text, Delete red text.
- The idea check moved below the rules (it was the first thing on the old page).
- Sector headroom replaces the "Sector capacity planner" and sits beside the rules table.
