# ChatGPT notes (council Quant Lab, 2026-11-16)

Text ChatGPT wrote with the image (summarised from the chat, worked 3m 4s):

- Title: Ezana Quant Lab, Council Overview Redesign. 1440 x 3656 px, dark mode, full-page organizational wireframe. File name in chat: ezana_quant_lab_council_overview_wireframe_1440.png. The in-chat image is 787 x 1998 px (the slices are upscaled from that, so small text is soft).
- Covers the existing Quant Lab navigation, strategy controls, performance and risk sections, research activity, backtests and quick actions, plus six council features: fund risk and benchmark comparison, sector concentration, pitch model checklists, IPS pre-checks, model assignments, and research handoff status. Loading, empty and error states included.
- Decisions you may want to reverse: the Council tab comes before My research; council information sits above personal strategy performance; the three planned features (factor exposure, paper deploy, Sonar handoff) are folded into one line instead of separate panels.
- Implementation notes: connecting the council's real holdings to the risk engine is new work. Personal strategies and backtests stay private. Sharing to the council and attaching runs to pitches need backend work. Factor attribution, paper deployment and Sonar handoff remain unavailable.
- All council figures, names, dates and holdings are illustrative sample content.

## My reading of the image (mine, not ChatGPT's)

1. Toolbar: Strategy selector "No strategies yet", primary "Create strategy" on the right.
2. KPI strip: Strategies 0, Active research 0, Paper trading N/A (not available yet), Best Sharpe N/A, Max drawdown N/A.
3. Text tabs "Council" (selected, emerald, but drawn with an underline bar) and "My research"; right label "Sample content, Sample council, Demonstration only".
4. Council KPI row: Fund value $240,050.00; Gain on cost +46.73% (not time weighted); Council benchmark SPY +10.08%; Positions 12; Sector teams 4.
5. Left column "Fund risk at today's weights": fund vs SPY line chart Aug to Nov (fund emerald with area fill, SPY grey solid; guide wants dashed grey and no fill), then rows Volatility, 1-day 95% VaR, Concentration all N/A "Illustrative, calculate from current holdings".
6. Right column "Sector sleeve concentration" (cap at 35%): bars Financials 27%, Healthcare 24%, Technology 32%, Industrials 17% with dashed 35% cap line.
7. Right column "My model assignments": table Assignment, Owner, Due, Status: Factor refresh (Selam Haile, Nov 20, In progress), AVGO model update (Chidi Okoye, Nov 21, To do), COST scenario pack (Mikael Bekele, Nov 24, To do), ISRG model review (Elena Rossi, Nov 25, In review). Link "Open assignments". Statuses drawn as filled chips (guide says text only).
8. Left "Pitch evidence and model checklist": Ticker, Owner, Stage, Required models, Reviewed: AVGO Amara Tesfaye Deep dive 3 files v2 reviewed; COST Mikael Bekele Screening 2 files v1; ISRG Elena Rossi Cross-desk review 4 files v3 reviewed; ORCL Jonas Weber Idea 2 files v1. "Open pitch" link per row.
9. Right "Council research handoff": "Personal strategies and runs are private. Sharing to council or attaching to a pitch is not available yet."
10. Left "IPS pre-check for an open pitch": AVGO, proposed size 6.00% of fund. Max single position 25% within recorded limit; Max sector 35% within recorded limit; Max single trade 8% review; Prohibited tickers cannot evaluate; Cash floor 5% recorded (not checked). Note "Informational policy reading only. Does not block trades." Status chips drawn boxed.
11. "My research" heading, then the existing Overview: Strategy performance (empty), My strategies (empty, Create your first strategy), Risk overview (N/A until completed run), Research activity (empty), Recent backtests (table header, No runs yet), Quick actions (New strategy, Run backtest, Factor research, Risk analysis, Paper deploy not available yet), one line "Planned: factor attribution, paper deploy, Sonar handoff".
12. States strip (annotation): Loading skeleton, Empty no backtests, Error could not load research with Retry.

The wireframe draws no strategy leaderboard rows.
