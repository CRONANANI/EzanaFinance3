# Claude Design audit: council Ezana Echo

Project: https://claude.ai/design/p/696b1cc4-8200-4d21-8dfa-6299e6eee81c
Copied from the audit section of the handoff README (33 changes) plus the chat summary notes.

Data and copy

1. Northfield Capital Society renamed Sample council everywhere.
2. "Peer value" corrected to "Fund value"; SPY comparison corrected to +10.08% and labelled "vs SPY".
3. Holdings list replaced with JPM, SCHW, BAC, LLY, UNH, MRK, NVDA, MSFT, AAPL, CAT, GE, HON.
4. Pipeline CRST and ENCL replaced with COST and ORCL (AVGO, COST, ISRG, ORCL).
5. "Ezana council frames" retitled Echo on our names; MDA row removed; rows now use held and pipeline tickers only (JPM, NVDA, LLY, AVGO) with article titles from Echo.
6. MOM 1M columns removed; "Sample content" placeholder columns replaced with dates or read times.
7. Team notes and Council alerts cards removed (no data source). Research articles card removed; Council reads covers Resource Library research.
8. Sector coverage: Commodities row removed (four sector teams; Selam Haile is a portfolio manager).
9. Required reading: "Due Friday" replaced with mono date "Due Nov 13"; "No due date" replaced with "Due N/A"; placeholder status replaced with "Not started".
10. Council reads now shows type (Published or Exemplar) and author; "GLP" corrected to "GLP-1".
11. Dateline weekday corrected: November 10, 2026 is a Tuesday.
12. Typos fixed: "indeved" to "indexed", "Writer for Ezana" to "Write for Echo", "Our Markets" tab to "Our names".
13. Footer line replaced with "Ezana Echo is published by Ezana Finance. Nothing here is investment advice."
14. Region menu and 24H to ALL time range restored to Latest stories.
15. Evening Brief consent tick box added.

Casing and type

16. Sentence case applied: Article of the month, Latest stories, Chart of the week, eyebrows (were all caps), meta lines ("Aug 26, 2026 · 14 min read"), cover and feature headlines. Proper names keep capitals (Team Hub, The Evening Brief, Resource Library, section names).
17. JetBrains Mono applied to every number, date and ticker in interface text: dateline, KPI values, tickers, dates, read times, read counts, Most read ranks (were serif), chart axes, time range. Serif Echo headlines keep their numerals in Newsreader by brief ("Echo keeps its serif headlines").
18. KPI values set to JetBrains Mono 18px (fund value, performance, holdings, sector teams, pitches).
19. Signed percentages: +46.73%, +10.08%.

Components

20. Council band: wireframe card fills and the Evening Brief box (fill, emerald border, radius) removed; sections are flat and separated by rules.
21. Past picks: outlined pill replaced by a text button.
22. Read article: circular icon plus outlined pill replaced by one solid emerald primary button.
23. Masthead search: circular outlined button replaced by a bare icon button.
24. Subscribe buttons: pill radius changed to `--radius-md` per the design system button spec.
25. Cover and Feature: filled chips replaced by emerald text labels.
26. Latest stories tabs: emerald underline bar under All and the grey underline under Our names removed; selected tab is emerald text only.
27. Email field: outlined pill field replaced by a borderless field.
28. Red "Due Friday" changed to `--warning`; red is reserved for errors and losses.
29. Row hover changes text colour only.

Layout

30. Hero text and all council content moved onto the masthead's left and right lines (wireframe inset the hero text and some rows).
31. Side-by-side sections spaced at 64px, with vertical rules centred (32px clear space each side). Row of three gap raised from about 26px to 64px.
32. Featured council research sub-columns given 24px clear space either side of their rules.

Icons

33. All icons are Bootstrap Icons (wireframe used mixed outline icons).

## Notes Claude Design gave in chat

- The design system holds no separate "Ezana Branding and UI Guide" document; the audit used the brief's rules plus the design system README and tokens.
- Missing token: no primary button text token. It used --bg-primary as a stand-in and noted the codebase uses --btn-primary-fg. White text on the light-mode emerald falls below 4.5:1 contrast, so that token needs a decision.
- Icons: Bootstrap Icons used per brief; the design system recommends Lucide.
- Numbers inside serif Echo headlines stay in Newsreader; every other number, date and ticker is JetBrains Mono.
- Article photos are low-resolution crops from the wireframe; use production images.
