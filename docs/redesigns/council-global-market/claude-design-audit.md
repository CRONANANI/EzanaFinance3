# Claude Design audit: council Global Market Analysis

Project: https://claude.ai/design/p/d2cce7e8-0826-44c1-804f-a3ed5ec32624 (file "Council Market Analysis.dc.html", 2 pages; first draft file CouncilPage.dc.html)

Boards: 1a dark page, 1b light page, 1c states board (loading skeleton, one-line empty state with one action, inline error with Retry for all 10 cards), 1d to 1g dialogs (Event analysis, Add to agenda, Send to team, New note), 1h audit list.

## Three items Claude Design flagged for input (as reported)

- No guide in the design system: there is no document named "Ezana Branding and UI Guide" in the Ezana Finance Design System. It audited against the rules in the brief plus the design system README and tokens.
- No primary button text token: the design system has no token for text on the emerald primary button. It used --bg-primary instead. In light mode that gives white on emerald at about 3.8:1, below 4.5:1 for 14px text. It suggests a new token such as --text-on-emerald. (Build note: the repo guide says --btn-primary-fg; use that.)
- Placeholder logo: the Walia ibex logo is not in the design system; a pegasus mark stands in at x=32. (Build note: never copy Claude Design's navigation bar; the real shell nav is untouched.)

## Every change the audit made (as reported, lightly condensed)

1. Every card is flat: no fill, border, shadow or radius; sections separated by thin hairlines.
2. All content runs from x=32 to x=1408.
3. Main and side columns 64px apart with the vertical line centred between them; KPI strip and fund metrics keep 24px clear on each side of their dividers.
4. View toggle is text only, Council in emerald; box, fill, uppercase and mono letter-spacing removed.
5. Range selector lost the underline under ALL; selected range is emerald text.
6. New note and Send to meetings are the only solid emerald buttons; every other action is plain emerald text with no underline.
7. Dialog text fields have no border.
8. Statuses, ratings and "Sample content" labels have no boxes.
9. KPI strip is 48px tall, 28px icon tiles, 12px grey labels, 18px JetBrains Mono values.
10. Table headers changed from uppercase mono to 12px sentence case; "#" column is now "Rank".
11. People and council names moved to Plus Jakarta Sans; every number, ticker, time and date uses JetBrains Mono.
12. Row hover changes only the text colour.
13. All icons are Bootstrap Icons.
14. Real navigation bar in place, filled Sonar pill and red logout icon.
15. Index strip has no LIVE label; a muted "Delayed quotes" note added at the right end.
16. Technology sleeve now reads as a warning in both the policy check and the sleeve table.
17. Ratings were gold and are now plain text (gold is reserved for the Partner app). The "Global empire rankings" link stays gold, which it notes breaks the rule against mixing gold and emerald on one surface.
18. All dates in November 2026; next meeting Thu, Nov 19; chart runs Nov 2024 to Nov 2026.
19. The two debrief items that copied real headlines now use invented ones.
20. States column removed from the side column; states live on board 1c.
21. Nothing shows a country, region, currency, asset-class figure or listing exchange for holdings.
22. Sentence case, no em dashes, signed percentages; missing values should show N/A (none missing in the sample).
23. Dialogs use the page colour with a thin border for readability (overlay exception to the flat-card rule).
24. Loading bars use the light emerald tint token.
25. Only design system tokens used; light mode reuses the same layout with the design system's light colours.
