# Design status: council Ezana Echo (Stage 2)

Stage 2 is done. Claude Design project: https://claude.ai/design/p/696b1cc4-8200-4d21-8dfa-6299e6eee81c (board "Ezana Echo Council.dc.html", page "Echo Page.dc.html", handoff folder "handoff"). Notes on each part:

- **2a:** The live /ezana-echo page loaded in light mode and showed the public front page only. There is no council section today, and the masthead still shows "Login". The Ezana tab never showed a sign-in page. I uploaded three full-scale screenshots (hero, Latest Stories, Most read). No member names were on screen.
- **2b:** I pasted the description as a "Pasted text" chip, with no writing block in the DOM. ChatGPT drew the image in about 3 minutes and wrote no text with it, so chatgpt-notes.md is my own reading of the image. Its problems were an invented council name, garbled tickers, no region menu or time range, and "Team notes" and "Council alerts" cards that have no data behind them.
- **2c:** I uploaded five slices. No usage warning appeared. Generation took about 9 minutes. JavaScript is blocked on claude.ai, so I read the README with get_page_text and PageDown, in full (151 lines). No "Claude Design is moving" dialog appeared, and I did not click the move banner.

Caveats for the Stage 3 build:

- **Region menu and time range:** the design shows Global, North America and similar regions, and 1M and 3M with 1M as the default. These are wrong. Keep the real ones: All regions, N. America, S. America, Europe, Africa, Asia and Oceania, plus 24H, 7D, 30D, 90D, 1Y and ALL, with the current default.
- **Primary button text:** the design system has no token for it, so the design used --bg-primary. Use --btn-primary-fg, because the guide takes precedence. The design also flags that white text on the light-mode emerald fails contrast.
- **Archive dialog:** the design puts the admin archive confirmation on Council reads rows. Echo archiving belongs on story cards (admins only). Do not add archiving of research to this page.
- **Masthead mark:** the design uses a stand-in "pegasus" mark. Keep the real Echo masthead and logo. Navigation back to the Team Hub works like this: a "Team Hub" link replaces "Login" for council members, and an "Open in Team Hub" link sits in the council band header. The design suggests ?from=team-hub, which is optional.
- **Content to drop or leave out:** drop the footer "About Ezana Echo" link. The Sector coverage "In focus" column has no data source, so leave it out or derive it. The design's collapse persistence uses localStorage, and that is optional.
- **Sample data:** the article content in the design is invented. Real stories come from the article library, and council rows use the sample council for demo viewers only.
