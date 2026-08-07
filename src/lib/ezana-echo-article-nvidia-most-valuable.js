/**
 * Ezana Echo long-form article: Nvidia surpasses Apple as the world's
 * second most valuable asset behind gold.
 * Data snapshot as of May 2026.
 */
export const nvidiaSecondMostValuableArticle = {
  id: 'nvidia-worlds-second-most-valuable-asset-2026',
  title: "Nvidia Is the World's Second Most Valuable Asset",
  excerpt:
    "At $5.34 trillion, Nvidia has overtaken Apple, Google, and Silver to become the second most valuable asset on Earth — behind only gold's $31.19 trillion. The ranking reshuffles a leaderboard that has been dominated by consumer tech for a decade, and signals a structural repricing of AI infrastructure as an asset class.",
  heroImage: {
    src: '/nvidia-most-valuable-asset.png',
    alt: 'Bar chart showing the top 10 largest assets by market cap with Gold at $31.19T and Nvidia at $5.34T in second place',
    caption:
      'Nvidia at $5.34T has overtaken Apple, Google, and Silver to claim the #2 spot behind gold — a ranking that did not exist 18 months ago.',
  },
  contentBlocks: [
    {
      type: 'paragraph',
      text: "Nvidia is now the second most valuable asset on Earth. At a [[kw:enterprise-value-decomposition]]market capitalization[[/kw]] of $5.34 trillion, the chipmaker has surpassed not only every publicly traded company except — briefly and intermittently — Apple, but also silver as a global store of value. Only gold, at $31.19 trillion, sits above it. The ranking is remarkable not just for the number but for the speed: Nvidia's market cap was below $1 trillion as recently as May 2023. In three years, the company has added more value than the entire GDP of Japan.",
    },
    {
      type: 'stat-grid',
      stats: [
        { label: 'Nvidia (NVDA)', value: '$5.34T', change: '#2 globally' },
        { label: 'Gold', value: '$31.19T', change: '#1 — 5.8x larger' },
        { label: 'Apple (AAPL)', value: '$4.39T', change: 'Overtaken — now #4' },
        { label: 'Silver', value: '$4.16T', change: 'Overtaken — now #5' },
        { label: 'NVDA 3-Year Gain', value: '~5x', change: 'From <$1T to $5.34T' },
      ],
    },
    { type: 'heading', text: 'The new leaderboard: AI displaces consumer tech', level: 2 },
    {
      type: 'paragraph',
      text: 'The top 10 most valuable assets now reads: Gold ($31.19T), Nvidia ($5.34T), Alphabet ($4.66T), Apple ($4.39T), Silver ($4.16T), Microsoft ($3.10T), Amazon ($2.79T), TSMC ($2.04T), Broadcom ($1.95T), and Saudi Aramco ($1.80T). The composition tells a story: six of the ten are technology companies, two are precious metals, one is a semiconductor foundry, and one is a national oil company. The era of consumer hardware (Apple) and consumer software (Microsoft) at the top is giving way to AI infrastructure — the picks-and-shovels layer of the intelligence buildout.',
    },
    {
      type: 'dossier-table',
      figureLabel: 'FIG. 1 · THE TOP 10 LARGEST ASSETS ON EARTH',
      kicker:
        'GLOBAL ASSET RANKING BY MARKET CAP / TOTAL VALUE, MAY 2026 ($T) · RANKED · CLICK A ROW TO EXPAND THE DOSSIER.',
      hint: 'Ten assets, ranked — expand a row for the record.',
      source:
        'Global asset ranking by market capitalization / total market value. Gold remains dominant at $31.19T. Nvidia has overtaken Apple and Silver for the #2 position. Source: market data as of May 2026.',
      headers: ['Asset', 'What it is on the board', 'Market cap', 'Key risk', ''],
      rows: [
        {
          name: 'Gold',
          tag: '#1 · STORE OF VALUE',
          role: 'The 5,000-year store of value — 5.8x larger than Nvidia and unlikely to be dislodged.',
          anchor: '$31.19T',
          keyRisk:
            'Value is distributed across millions of holders with heterogeneous motives — its position on the leaderboard will not change.',
          dossier: [
            {
              label: 'What it is',
              text: 'A monetary reserve held by central banks (35,000+ tonnes globally), a jewelry input (50% of annual demand), and a crisis hedge with no counterparty risk.',
            },
          ],
        },
        {
          name: 'Nvidia (NVDA)',
          tag: '#2 · GPU MONOPOLY',
          role: 'The picks-and-shovels layer of the AI buildout — overtook Apple and Silver in 12 months.',
          anchor: '$5.34T',
          keyRisk:
            'Revenue concentration in a handful of hyperscaler customers; a 40x+ multiple leaves no margin for error.',
          dossier: [
            {
              label: 'The moat',
              text: 'Nvidia controls an estimated 80–90% of the data-center AI accelerator market via CUDA, its networking stack, and a Hopper → Blackwell → Rubin cadence. Its $26B fiscal-2026 R&D spend exceeds AMD’s entire revenue.',
            },
          ],
        },
        {
          name: 'Alphabet (GOOG)',
          tag: '#3 · HYPERSCALER',
          role: 'A hyperscaler and custom-silicon buyer whose capex is part of Nvidia’s revenue.',
          anchor: '$4.66T',
          keyRisk:
            'Its own AI capex is the demand line under Nvidia — a slowdown would ripple back through the complex.',
          dossier: [
            {
              label: 'On the board',
              text: 'One of six technology names in the top 10, and a Broadcom custom-silicon (TPU) customer in the same supply chain.',
            },
          ],
        },
        {
          name: 'Apple (AAPL)',
          tag: '#4 · OVERTAKEN',
          role: 'The consumer-hardware era at the top, now displaced by AI infrastructure.',
          anchor: '$4.39T',
          keyRisk:
            'Overtaken by Nvidia; the era of consumer hardware and software at the top is giving way to AI infrastructure.',
          dossier: [
            {
              label: 'The shift',
              text: 'Prior reshuffles were consumer-facing (Apple over Exxon, 2012; Microsoft over Apple, 2021); this one is not.',
            },
          ],
        },
        {
          name: 'Silver',
          tag: '#5 · PASSED',
          role: 'The dual monetary/industrial metal that got passed — #2 as recently as early 2025.',
          anchor: '$4.16T',
          keyRisk:
            'Nvidia, Alphabet, and Apple all surpassed it in 12 months — the market preferring cash-flow assets over stores of value.',
          dossier: [
            {
              label: 'Dual identity',
              text: 'Both a monetary metal (like gold) and an industrial metal critical for solar panels, electronics, and EVs; total above-ground stock valued at ~$4.16 trillion.',
            },
          ],
        },
        {
          name: 'Microsoft (MSFT)',
          tag: '#6 · HYPERSCALER',
          role: 'Consumer software plus Azure — a hyperscaler whose capex feeds GPU demand.',
          anchor: '$3.10T',
          keyRisk:
            'A slowdown in AI capex among Microsoft, Google, or Amazon could decelerate Nvidia’s revenue sharply.',
          dossier: [
            {
              label: 'On the board',
              text: 'One of six technology names in the top 10; Azure is a core hyperscaler buyer of Nvidia GPUs.',
            },
          ],
        },
        {
          name: 'Amazon (AMZN)',
          tag: '#7 · HYPERSCALER',
          role: 'AWS anchors the hyperscaler complex whose ~$300B/yr spend drives GPU demand.',
          anchor: '$2.79T',
          keyRisk:
            'Binary demand risk — a pullback in AWS capex flows straight through to Nvidia’s revenue.',
          dossier: [
            {
              label: 'On the board',
              text: 'A hyperscaler and Broadcom custom-silicon (Trainium) customer inside the same AI supply chain.',
            },
          ],
        },
        {
          name: 'TSMC (TSM)',
          tag: '#8 · FOUNDRY',
          role: 'The foundry that fabricates the physical chips Nvidia designs — its own asset-class tier.',
          anchor: '$2.04T',
          keyRisk:
            'The critical path for every AI workload runs through its 4nm and 3nm process nodes.',
          dossier: [
            {
              label: 'Why it is here',
              text: 'Every H100, B100, and GB200 runs on TSMC’s 4nm and 3nm nodes; with Nvidia and Broadcom it represents over $9 trillion in market value.',
            },
          ],
        },
        {
          name: 'Broadcom (AVGO)',
          tag: '#9 · NETWORKING',
          role: 'Custom silicon and networking ASICs that connect GPU clusters — the third supply-chain name.',
          anchor: '$1.95T',
          keyRisk: 'Its value is tethered to the same AI-capex cycle as Nvidia and TSMC.',
          dossier: [
            {
              label: 'Why it is here',
              text: 'Provides custom silicon (TPUs for Google, Trainium for Amazon) and the networking ASICs connecting GPU clusters.',
            },
          ],
        },
        {
          name: 'Saudi Aramco (2222.SR)',
          tag: '#10 · HYDROCARBON',
          role: 'The lone hydrocarbon name — the world’s most valuable company in 2020, now displaced by six tech firms.',
          anchor: '$1.80T',
          keyRisk:
            'Its slide from #1 to #10 in five years is the clearest single summary of the shift from energy to intelligence.',
          dossier: [
            {
              label: 'The old economy',
              text: 'In 2020, Aramco was the world’s most valuable company; the world still runs on oil, but capital increasingly flows to AI infrastructure.',
            },
          ],
        },
      ],
    },
    {
      type: 'paragraph',
      text: "What makes this ranking structurally different from prior reshuffles — Apple overtaking Exxon in 2012, Microsoft overtaking Apple in 2021 — is that Nvidia is not a consumer-facing company. Its revenue comes almost entirely from selling [[kw:tensor-core-parallelism]]GPUs[[/kw]] to [[kw:hyperscalers]]hyperscalers[[/kw]] (Microsoft Azure, Google Cloud, Amazon AWS, Meta) and [[kw:sovereign-ai]]sovereign AI programs[[/kw]]. The end customers are data centers, not individuals. This means Nvidia's valuation is a direct market bet on enterprise AI infrastructure spend sustaining its current trajectory — roughly $300 billion per year across the hyperscaler complex, growing at 40–60% annually.",
    },
    {
      type: 'wall-timeline',
      figureLabel: 'FIG. 2 · A LEADERBOARD RESHUFFLED',
      kicker:
        'WHO SAT AT THE TOP, 2012–2026 · YEAR MARKERS APPROXIMATE WHERE INTRA-YEAR · CLICK ANY PLAQUE FOR THE RECORD.',
      hint: 'Click a plaque for its record.',
      source: 'market data as of May 2026 · this article’s reporting.',
      startYear: 2011,
      endYear: 2026.6,
      windows: [
        {
          id: 'climb',
          label: 'Nvidia’s three-year climb',
          from: 2023.38,
          to: 2026.38,
          color: 'var(--echo-chart-green)',
        },
      ],
      plaques: [
        {
          year: 2012,
          lane: 0,
          label: '2012 · Apple overtakes Exxon',
          detail:
            'A prior reshuffle: Apple passes Exxon at the top — a consumer-facing company displacing an energy giant.',
        },
        {
          year: 2020,
          lane: 1,
          label: '2020 · Aramco is #1',
          detail:
            'Saudi Aramco is the world’s most valuable company — the high-water mark of the hydrocarbon economy.',
        },
        {
          year: 2021,
          lane: 2,
          label: '2021 · Microsoft overtakes Apple',
          detail:
            'Microsoft passes Apple — a consumer-software company at the top, still one reshuffle before the AI era.',
        },
        {
          year: 2023.38,
          lane: 3,
          label: 'May 2023 · Nvidia under $1T',
          detail:
            'Nvidia’s market cap is still below $1 trillion — the starting line for the fastest wealth creation in market history.',
        },
        {
          year: 2025.0,
          lane: 4,
          label: 'Early 2025 · Silver still #2',
          detail:
            'Silver is the world’s second most valuable asset class as recently as early 2025, before Nvidia, Alphabet, and Apple all pass it.',
        },
        {
          year: 2026.38,
          lane: 5,
          label: 'May 2026 · Nvidia hits $5.34T',
          detail:
            'Nvidia reaches $5.34 trillion — the #2 asset on Earth behind only gold’s $31.19 trillion, having added more value in three years than Japan’s entire GDP.',
        },
      ],
    },
    { type: 'heading', text: 'The GPU monopoly: why Nvidia and not AMD', level: 2 },
    {
      type: 'paragraph',
      text: "Nvidia controls an estimated 80–90% of the data center AI accelerator market. Its dominance rests on three compounding advantages: [[kw:cuda]]CUDA (the software ecosystem that 4 million developers are locked into)[[/kw]], the networking stack (NVLink, InfiniBand via the Mellanox acquisition), and the cadence of hardware releases (Hopper → Blackwell → Rubin, each delivering roughly 2x inference throughput per generation). AMD's MI300X is the closest competitor, but it lacks the software ecosystem depth — porting CUDA workloads to ROCm remains a friction that most enterprise buyers choose not to endure.",
    },
    {
      type: 'paragraph',
      text: "The moat is deepening, not narrowing. Nvidia's $26 billion R&D spend in fiscal 2026 exceeds AMD's entire revenue. The [[kw:blackwell-architecture]]Blackwell architecture[[/kw]], which began shipping at scale in Q1 2026, delivers 4x the training throughput of Hopper at comparable power — a step-function improvement that is pulling hyperscaler capex forward. When [[person:jensen-huang]]Jensen Huang[[/person]] says \"the more you buy, the more you save,\" the math actually works: Blackwell's performance-per-dollar improvement is large enough that customers save on electricity and cooling even after paying the premium.",
    },
    {
      type: 'callout',
      label: 'NVDA market cap growth since May 2023',
      value: '~5x',
      context:
        'From under $1 trillion to $5.34 trillion in three years — the fastest wealth creation for a single company in market history.',
    },
    { type: 'heading', text: 'Gold at $31T: the gap that matters', level: 2 },
    {
      type: 'paragraph',
      text: "[[kw:gold-store-of-value]]Gold's $31.19 trillion total market value[[/kw]] dwarfs Nvidia by nearly 6x. This gap is itself informative: gold has been accumulating value for 5,000 years; Nvidia has been accumulating it for 30 months. Gold is a monetary reserve held by central banks (35,000+ tonnes globally), a jewelry input (50% of annual demand), and a crisis hedge with no counterparty risk. Nvidia is an operating company with ~$130 billion in annual revenue, ~60% gross margins, and a single customer segment (AI compute) that did not exist at meaningful scale four years ago.",
    },
    {
      type: 'paragraph',
      text: "The comparison highlights the asymmetry: gold's value is distributed across millions of holders with heterogeneous motivations and time horizons. Nvidia's value is concentrated in a shareholder register dominated by index funds, sovereign wealth funds, and a handful of active managers making a directional bet on AI infrastructure. If the AI capex cycle slows — whether due to model efficiency gains, regulatory constraints, or a macro recession — Nvidia's position on this leaderboard could change rapidly. Gold's position will not.",
    },
    { type: 'heading', text: 'Silver at #5: the commodity that got passed', level: 2 },
    {
      type: 'paragraph',
      text: "Silver's displacement from #2 to #5 is quietly significant. Silver has a dual identity: it is both a monetary metal (like gold) and an industrial metal (critical for solar panels, electronics, and EVs). The total above-ground silver stock is valued at approximately $4.16 trillion. It was the world's second most valuable asset class as recently as early 2025. Nvidia, Alphabet, and Apple have all surpassed it in the past 12 months — a reshuffling that reflects the market's preference for cash-flow-generating assets over stores of value in the current rate environment.",
    },
    {
      type: 'adjudication-matrix',
      figureLabel: 'FIG. 3 · WHAT EACH ASSET ACTUALLY IS',
      kicker:
        'TOP-10 ASSETS × THE RANKING’S THREE THESES · SAME = THE ASSET EMBODIES THIS THESIS · PART = PARTIALLY · — = NOT AT ALL. CLICK A CELL FOR THE EVIDENCE.',
      hint: 'Click a cell for the evidence.',
      source: 'market data as of May 2026 · this article’s reporting.',
      cols: ['AI infrastructure', 'Store of value', 'Semiconductor supply chain'],
      rows: [
        {
          label: 'Gold',
          cells: [
            { value: 'none' },
            {
              value: 'same',
              note: 'A monetary reserve, jewelry input, and crisis hedge with no counterparty risk — the archetypal store of value.',
            },
            { value: 'none' },
          ],
        },
        {
          label: 'Nvidia (NVDA)',
          cells: [
            {
              value: 'same',
              note: 'The picks-and-shovels layer of the intelligence buildout; ~80–90% of the data-center AI accelerator market.',
            },
            {
              value: 'none',
              note: 'An operating company with a single customer segment (AI compute), not a store of value.',
            },
            {
              value: 'same',
              note: 'With TSMC and Broadcom, Nvidia forms the critical path for every AI workload running in the cloud.',
            },
          ],
        },
        {
          label: 'Silver',
          cells: [
            {
              value: 'part',
              note: 'An industrial metal critical for solar panels, electronics, and EVs — adjacent to, not core to, AI compute.',
            },
            {
              value: 'same',
              note: 'A monetary metal like gold; total above-ground stock valued at ~$4.16 trillion.',
            },
            { value: 'none' },
          ],
        },
        {
          label: 'TSMC (TSM)',
          cells: [
            {
              value: 'same',
              note: 'Fabricates the physical chips Nvidia designs — every H100, B100, and GB200 on its 4nm and 3nm nodes.',
            },
            { value: 'none' },
            {
              value: 'same',
              note: 'One of the three names — Nvidia, TSMC, Broadcom — that form the AI supply chain’s critical path.',
            },
          ],
        },
        {
          label: 'Broadcom (AVGO)',
          cells: [
            {
              value: 'same',
              note: 'Custom silicon (TPUs, Trainium) and the networking ASICs that connect GPU clusters.',
            },
            { value: 'none' },
            {
              value: 'same',
              note: 'The third member of the semiconductor supply-chain tier alongside Nvidia and TSMC.',
            },
          ],
        },
        {
          label: 'Saudi Aramco (2222.SR)',
          cells: [{ value: 'none' }, { value: 'none' }, { value: 'none' }],
        },
      ],
    },
    { type: 'heading', text: 'The semiconductor supply chain gets its own tier', level: 2 },
    {
      type: 'paragraph',
      text: "[[kw:tsmc-foundry]]TSMC ($2.04T)[[/kw]] and Broadcom ($1.95T) rounding out the top 10 signals that the semiconductor supply chain is now an asset class in its own right. TSMC fabricates the physical chips that Nvidia designs — every H100, B100, and GB200 runs on TSMC's 4nm and 3nm process nodes. Broadcom provides the custom silicon (TPUs for Google, Trainium for Amazon) and the networking ASICs that connect GPU clusters. Together, these three companies — Nvidia, TSMC, Broadcom — represent over $9 trillion in market value and form the critical path for every AI workload running in the cloud today.",
    },
    {
      type: 'paragraph',
      text: "Saudi Aramco at #10 ($1.80T) is the lone representative of the hydrocarbon economy on the list. In 2020, Aramco was the world's most valuable company. Its displacement by six tech firms in five years is the clearest single-chart summary of the structural shift from energy dominance to intelligence dominance in global capital markets. The world still runs on oil — but the world's capital increasingly flows toward the companies building the infrastructure for artificial intelligence.",
    },
    {
      type: 'quote',
      text: 'We are at the beginning of a new industrial revolution. Every data center in the world is being retrofitted. Every new one being built is an AI factory.',
      source: 'Jensen Huang, Nvidia GTC 2026 keynote, March 2026',
    },
    { type: 'heading', text: 'Valuation: is $5.34 trillion justified?', level: 2 },
    {
      type: 'paragraph',
      text: 'At $5.34 trillion, Nvidia trades at approximately 40–45x forward earnings and 35–40x EV/EBITDA. These multiples are high by any historical standard for a hardware company, but the bull case rests on three arguments: (1) data center GPU revenue is still growing at 50%+ year-over-year, (2) the Blackwell product cycle is pulling forward demand that would otherwise have been spread over 2–3 years, and (3) the total addressable market for AI compute is expanding — [[kw:inference-vs-training]]inference workloads are growing faster than training[[/kw]], and every enterprise deploying AI models needs GPU capacity.',
    },
    {
      type: 'paragraph',
      text: "The bear case is equally clear: Nvidia's revenue concentration in a handful of hyperscaler customers creates binary risk. If Google, Microsoft, or Amazon slow their [[kw:capex-cycle]]AI capex[[/kw]] — which could happen in a recession, a regulatory crackdown, or simply because model efficiency improves faster than expected — Nvidia's revenue could decelerate sharply. The stock's 40x+ multiple leaves no margin for error. At $5.34 trillion, the market is pricing in sustained 30%+ revenue growth for years. Any wobble in that trajectory would reprice the stock aggressively.",
    },
    { type: 'heading', text: 'How to position around this ranking', level: 2 },
    {
      type: 'paragraph',
      text: "Direct Nvidia exposure is straightforward: NVDA on any US exchange. For leveraged upside without single-stock risk, the semiconductor ETFs provide diversified exposure: SMH (VanEck Semiconductor ETF) has ~20% NVDA weight, SOXX (iShares Semiconductor ETF) is similarly weighted. For the AI infrastructure thesis more broadly, exposure to the hyperscalers themselves (GOOG, MSFT, AMZN) provides indirect GPU demand exposure, since their capex is Nvidia's revenue. TSMC (TSM) and Broadcom (AVGO) — both in the top 10 — capture the foundry and networking layers of the same supply chain.",
    },
    {
      type: 'paragraph',
      text: "For investors who view $5.34 trillion as stretched, the ranking itself suggests a hedged approach: pair long NVDA with long GLD (gold). The market's positioning is part of the broader [[kw:mag-7]]Magnificent 7[[/kw]] dynamic where these few companies drive most index returns. The infographic shows gold at 5.8x Nvidia's market cap — if AI capex disappoints and risk assets sell off, gold historically benefits from the flight to safety. The NVDA/GLD ratio is a clean expression of the market's confidence in AI infrastructure versus traditional stores of value. As of May 2026, the market has never been more tilted toward intelligence over inertia.",
    },
    {
      type: 'trajectory',
      figureLabel: 'FIG. 4 · FROM UNDER $1T TO $5.34T IN THREE YEARS',
      kicker:
        'NVIDIA MARKET CAP, JAN 2023 – MAY 2026 ($T) · X-AXIS IN CALENDAR YEARS · DIAMONDS MARK THE $1T, $2T, AND $5T CROSSINGS.',
      hint: 'Diamond markers flag the trillion-dollar crossings.',
      source:
        'Nvidia market capitalization from January 2023 to May 2026. The company crossed $1T in mid-2023, $2T in early 2024, and $5T in early 2026. Source: market data.',
      yLabel: 'Market cap ($T)',
      yMax: 6,
      xMin: 2023,
      xMax: 2026.4,
      series: [
        {
          key: 'mcap',
          label: 'Market cap ($T)',
          color: 'var(--echo-chart-green)',
          data: [
            { x: 2023.0, y: 0.36 },
            { x: 2023.25, y: 0.64 },
            { x: 2023.42, y: 1.0 },
            { x: 2023.67, y: 1.1 },
            { x: 2024.0, y: 1.4 },
            { x: 2024.17, y: 2.0 },
            { x: 2024.42, y: 3.0 },
            { x: 2024.67, y: 2.8 },
            { x: 2025.0, y: 3.3 },
            { x: 2025.25, y: 2.6 },
            { x: 2025.5, y: 3.5 },
            { x: 2025.75, y: 3.8 },
            { x: 2026.0, y: 4.5 },
            { x: 2026.17, y: 5.0 },
            { x: 2026.375, y: 5.34 },
          ],
        },
      ],
      annotations: [
        { x: 2023.42, y: 1.0, label: 'Jun 2023', sub: 'Crosses $1T' },
        { x: 2024.17, y: 2.0, label: 'Mar 2024', sub: 'Crosses $2T' },
        { x: 2026.17, y: 5.0, label: 'Mar 2026', sub: 'Crosses $5T' },
      ],
    },
    {
      type: 'paragraph',
      text: "For investors using Ezana, the Company Research page provides real-time Nvidia fundamentals via Alpha Vantage — P/E, EPS, revenue growth, and margins update live. The Comparable Company Analysis model benchmarks NVDA against semiconductor peers (AMD, AVGO, QCOM, TXN, INTC) with peer-median multiples and an implied valuation range. The Earnings Call Analyzer surfaces sentiment and forward guidance from Jensen Huang's quarterly commentary. And the For the Quants page offers a live Technical Scanner with RSI, MACD, and Bollinger Band signals on NVDA in real time. The #2 ranking is a snapshot — the tools to monitor whether it persists or reverses are already on the platform.",
    },
    {
      type: 'scenario-chain',
      figureLabel: 'FIG. 5 · IS $5.34 TRILLION JUSTIFIED?',
      kicker: 'VALUATION CASE · DRIVER × GATE → OUTCOME · THREE BRANCHES FROM THE ARTICLE.',
      hint: "Scenarios drawn from the article's valuation and positioning sections.",
      source: "this article's reporting.",
      scenarios: [
        {
          id: 'base',
          label: 'BULL CASE',
          tone: 'base',
          range: 'The multiple holds',
          steps: [
            { label: 'GPU revenue +50%+ YoY', sub: 'data-center revenue still compounding' },
            { label: 'Blackwell pulls demand forward', sub: '4x training throughput of Hopper' },
          ],
          result: {
            value: 'Sustained 30%+ growth',
            sub: 'the trajectory the $5.34T price is already paying for',
          },
        },
        {
          id: 'alt',
          label: 'HEDGED / PAIRED',
          tone: 'alt',
          range: 'Long NVDA + long GLD',
          steps: [
            { label: 'Pair the bet', sub: 'the NVDA/GLD ratio expresses AI vs. store-of-value' },
            { label: 'AI capex disappoints', sub: 'risk assets sell off' },
          ],
          result: {
            value: 'Gold benefits',
            sub: 'the flight to safety cushions the AI-infrastructure bet',
          },
        },
        {
          id: 'bear',
          label: 'BEAR CASE',
          tone: 'bear',
          range: 'No margin for error',
          steps: [
            {
              label: 'Hyperscaler capex slows',
              sub: 'a recession, a crackdown, or faster model efficiency',
            },
            { label: 'A 40x+ multiple', sub: 'revenue concentration becomes binary risk' },
          ],
          result: {
            value: 'Sharp repricing',
            sub: 'any wobble reprices the stock aggressively',
          },
        },
      ],
      killSwitch:
        'If data-center GPU revenue growth slips below the sustained 30%+ the $5.34T price implies, the 40x+ multiple reprices aggressively.',
    },
  ],
  globeRail: {
    metric: {
      title: 'NVDA MARKET CAP ($T)',
      data: [
        { x: 2023.0, y: 0.36 },
        { x: 2023.42, y: 1.0 },
        { x: 2024.17, y: 2.0 },
        { x: 2026.17, y: 5.0 },
        { x: 2026.375, y: 5.34 },
      ],
      startLabel: 'Jan 2023 · $0.36T',
      endLabel: 'May 2026 · $5.34T',
      note: 'Nvidia market cap, Jan 2023 – May 2026 (market data).',
    },
    cities: [
      {
        name: 'Santa Clara',
        country: 'US',
        lat: 37.35,
        lng: -121.97,
        impact:
          'Nvidia, headquartered here, is now the world’s second most valuable asset at $5.34 trillion — up roughly 5x from under $1 trillion in May 2023, having overtaken Apple and silver and trailing only gold’s $31.19 trillion. Its CUDA ecosystem and Hopper → Blackwell → Rubin cadence give it an estimated 80–90% of the data-center AI accelerator market.',
      },
      {
        name: 'Hsinchu',
        country: 'Taiwan',
        lat: 24.81,
        lng: 120.97,
        impact:
          'TSMC ($2.04T) fabricates the physical chips Nvidia designs — every H100, B100, and GB200 runs on its 4nm and 3nm nodes. With Nvidia and Broadcom it forms the semiconductor supply chain’s critical path, together worth over $9 trillion.',
      },
      {
        name: 'Dhahran',
        country: 'Saudi Arabia',
        lat: 26.29,
        lng: 50.11,
        impact:
          'Saudi Aramco ($1.80T) is the lone hydrocarbon name in the top 10. Its slide from the world’s most valuable company in 2020 to #10 in five years is the clearest single summary of capital’s shift from energy dominance to AI infrastructure.',
      },
      {
        name: 'New York',
        country: 'US',
        lat: 40.71,
        lng: -74.01,
        impact:
          'The global asset leaderboard is priced in the markets here: gold’s $31.19 trillion still sits 5.8x above Nvidia, and the article’s clean hedge — long NVDA paired with long GLD — expresses confidence in AI infrastructure against the traditional store of value.',
      },
    ],
  },
  author: 'Ezana Finance Editorial',
  category: 'markets-companies',
  subcategory: 'Equities',
  tags: ['companies', 'technology', 'ai', 'semiconductors', 'markets'],
  meta: {
    sectors: ['Information Technology'],
    industries: ['Semiconductors'],
    institutions: ['Nvidia', 'Apple', 'Microsoft', 'TSMC'],
    geos: ['United States', 'Taiwan'],
    assetClasses: ['Equities'],
    themes: ['AI Boom', 'Market Concentration'],
    datasets: [],
    markets: [],
  },
  tickers: ['NVDA', 'GOOG', 'AAPL', 'MSFT', 'AMZN', 'TSM', 'AVGO', 'GLD', 'SMH', 'SOXX'],
  entities: {
    people: [{ id: 'jensen-huang', label: 'Jensen Huang', role: 'Co-founder and CEO of Nvidia' }],
    terms: [
      { id: 'enterprise-value-decomposition', label: 'Enterprise Value Decomposition' },
      { id: 'tensor-core-parallelism', label: 'Tensor Core Parallelism' },
      { id: 'hyperscalers', label: 'Hyperscalers' },
      { id: 'sovereign-ai', label: 'Sovereign AI' },
      { id: 'cuda', label: 'CUDA' },
      { id: 'blackwell-architecture', label: 'Blackwell Architecture' },
      { id: 'gold-store-of-value', label: 'Gold as a Store of Value' },
      { id: 'tsmc-foundry', label: 'TSMC Foundry Model' },
      { id: 'inference-vs-training', label: 'Inference vs. Training' },
      { id: 'capex-cycle', label: 'AI Capex Cycle' },
      { id: 'mag-7', label: 'Magnificent 7' },
    ],
  },
  readTime: 11,
  publishedAt: '2026-05-19',
  featured: false,
  likes: 0,
  comments: 0,
  reads: 0,
  listMeta: '19 May 2026',
};
