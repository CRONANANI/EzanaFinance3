/**
 * Long-form Ezana Echo article: commodity repricing after Feb 28, 2026 scenario.
 * Illustrative / editorial data for in-app mock content — not live market data.
 */
export const iranWarCommoditiesArticle2026 = {
  id: 'best-performing-commodities-iran-war-2026',
  title:
    'Best-Performing Commodities Since the Iran War: Tungsten, Oil, Aluminum, and Fertilizers Lead the Surge',
  excerpt:
    "Since the Iran war began on February 28, 2026, supply disruptions through the Strait of Hormuz have repriced commodities markets globally. Tungsten leads with a 557% gain, oil is up 40-55%, fertilizers are up roughly 75%, and aluminum has climbed 12%. Here's what's driving each move and how to position around it.",
  heroImage: {
    src: '/us-iran-chess.jpg',
    alt: 'US and Iran flags behind chess king pieces on a chessboard — geopolitical standoff',
    caption: 'The US-Iran conflict has repriced global commodity markets since February 28, 2026.',
  },
  contentBlocks: [
    {
      type: 'paragraph',
      text: 'When the United States and Israel launched joint strikes on Iran on February 28, 2026, [[kw:commodity-supercycle]]commodities[[/kw]] markets entered one of the most aggressive repricing cycles in recent years. What was forecast to be a relatively balanced year — modest demand growth, robust supply, and weakening prices — has instead been redefined by a geopolitical shock centered on the [[kw:strait-of-hormuz]]Strait of Hormuz[[/kw]]. The strait carries roughly one-fifth of global oil and LNG trade, and its effective closure has rippled through energy, metals, and agricultural commodities almost simultaneously.',
    },
    {
      type: 'stat-grid',
      stats: [
        { label: 'Tungsten YoY', value: '+557%', change: 'AI + military demand' },
        { label: 'Oil (Brent)', value: '$96.36', change: '+~50% since Feb 28' },
        { label: 'Urea/Fertilizers', value: '+75%', change: 'Hormuz exposure' },
        { label: 'Aluminum', value: '+12%', change: 'Gulf supply + energy costs' },
      ],
    },
    { type: 'heading', text: 'Energy markets at the center of the shock', level: 2 },
    {
      type: 'paragraph',
      text: 'Oil markets reacted first and hardest. The Strait of Hormuz carries roughly 10 million barrels per day of crude exports — most of it from Saudi Arabia, the UAE, Iraq, Kuwait, and Iran itself. Following the joint strikes, the strait closed to commercial transit. Brent crude rallied from roughly $70 per barrel in early February to above $115 at the peak of the supply scare in late March. As of mid-April, Brent has settled around $96.36, with WTI tracking close behind at $92.52. Drawdowns from [[kw:strategic-reserves]]strategic reserves[[/kw]] were too small to fully offset the shock.',
    },
    {
      type: 'wall-timeline',
      figureLabel: 'FIG. 1 · THE SHOCK CHRONOLOGY',
      kicker:
        'THE HORMUZ SHOCK, EARLY FEB – APR 2026 · SHADED WINDOW = FROM THE STRIKES TO THE LATEST SETTLE · CLICK ANY PLAQUE FOR THE RECORD.',
      hint: 'Click a plaque for its record.',
      source: "this article's reporting · Global Petrol Prices · S&P Global.",
      startYear: 2026.05,
      endYear: 2026.35,
      windows: [
        {
          id: 'shock',
          label: 'The shock window',
          from: 2026.16,
          to: 2026.32,
          color: 'var(--echo-chart-red)',
        },
      ],
      plaques: [
        {
          year: 2026.09,
          lane: 0,
          label: 'Early Feb · Brent ~$70',
          detail:
            'Brent trades near $70 per barrel — the pre-shock baseline before the joint strikes.',
        },
        {
          year: 2026.16,
          lane: 1,
          label: 'Feb 28 · US & Israel strike Iran',
          detail:
            'Joint US–Israel strikes on Iran; the Strait of Hormuz — roughly one-fifth of global oil and LNG trade — closes to commercial transit.',
        },
        {
          year: 2026.18,
          lane: 2,
          label: 'Early Mar · pump prices jump',
          detail:
            'At least 85 countries report petrol price increases since Feb 28, per Global Petrol Prices — the biggest in Southeast Asia and Africa.',
        },
        {
          year: 2026.22,
          lane: 3,
          label: 'Mar 20 · S&P Global warning',
          detail:
            'S&P Global warns a two- to three-month Hormuz blockage would likely become a severe supply shock as freight and insurance stay elevated.',
        },
        {
          year: 2026.24,
          lane: 4,
          label: 'Late Mar · Brent peaks >$115',
          detail: 'Brent crude peaks above $115 at the height of the supply scare.',
        },
        {
          year: 2026.32,
          lane: 5,
          label: 'Apr 26 · Brent settles $96.36',
          detail: 'Brent settles around $96.36, with WTI tracking close behind at $92.52.',
        },
      ],
    },
    {
      type: 'multi-axis',
      figureLabel: 'FIG. 2 · OIL REPRICES ~50% AFTER THE STRIKES',
      kicker:
        'BRENT (BARS) & WTI (LINE) CRUDE, JANUARY–APRIL 2026 (USD/BBL) · SHARED CALENDAR-MONTH X-AXIS · EACH BENCHMARK ON ITS OWN SCALE.',
      hint: 'Hover any date for both benchmarks at that point.',
      source: 'Brent and WTI spot prices, January–April 2026.',
      categories: [
        'Jan 1',
        'Jan 15',
        'Feb 1',
        'Feb 15',
        'Feb 28',
        'Mar 7',
        'Mar 14',
        'Mar 21',
        'Mar 28',
        'Apr 4',
        'Apr 11',
        'Apr 18',
        'Apr 26',
      ],
      series: [
        {
          label: 'Brent',
          kind: 'bar',
          unit: 'USD/bbl',
          values: [60, 62, 65, 68, 71, 91, 99, 108, 115, 105, 102, 99, 96.36],
        },
        {
          label: 'WTI',
          kind: 'line',
          unit: 'USD/bbl',
          values: [57, 59, 63, 66, 69, 88, 96, 104, 110, 100, 97, 94, 92.52],
        },
      ],
    },
    {
      type: 'paragraph',
      text: 'Natural gas reacted even more violently. Qatari LNG, which accounts for roughly one-fifth of global gas supply, was effectively shut in. European TTF prices roughly doubled, and Asian JKM benchmark prices followed. US Henry Hub prices rose far more modestly thanks to domestic supply insulation — a divergence that has reshaped competitive dynamics for European and Asian manufacturers reliant on imported LNG.',
    },
    { type: 'heading', text: 'Tungsten: the standout performer', level: 2 },
    {
      type: 'paragraph',
      text: 'But oil is not even the standout performer. That title belongs to [[kw:tungsten]]tungsten[[/kw]], the metal almost as hard as a diamond and with the highest melting point of any element on the periodic table. Tungsten powers electronics, computing, and telecommunications — and increasingly, advanced AI chips, where it manages heat and provides the electrical stability inference workloads demand. Demand was already structurally tight thanks to the AI buildout. The Iran war has now layered military demand on top: tungsten is critical to missiles, ammunition, and aircraft, all of which are being procured at accelerated rates by Western governments.',
    },
    {
      type: 'callout',
      label: 'Tungsten price change since last February',
      value: '+557%',
      context:
        'AI demand stacking on top of accelerated military procurement, with 80% of global supply controlled by China.',
    },
    {
      type: 'paragraph',
      text: "The supply side is what makes tungsten especially exposed. China produces roughly 80% of the world's tungsten and operates [[kw:secondary-sanctions]]sanctions-style export restrictions[[/kw]]-style export restrictions that predate the current conflict. The remaining global supply trickles in from Vietnam, Russia, and North Korea — none of which are politically aligned in a way that lets Western buyers easily diversify. About 27% of US tungsten imports in 2024 came directly from China. Ramping up domestic production would take years even with aggressive policy support. Investors looking for exposure are mostly limited to the small number of listed tungsten miners (Almonty Industries on the TSX) and rare-earth metals ETFs that hold them as a basket position.",
    },
    { type: 'heading', text: 'Industrial metals: divergence within the complex', level: 2 },
    {
      type: 'paragraph',
      text: 'Aluminum is the next major mover within the industrial metals complex, up roughly 12% since the conflict began and approaching $3,450 per tonne — close to record levels. The Gulf region accounts for a meaningful share of global aluminum supply, and the industry is highly energy-intensive, meaning the spike in oil and gas prices is also lifting aluminum production costs globally. Two pressures push the same direction at once: less supply available, and more expensive to produce what does come to market. Further upside is likely capped by demand destruction — at $3,500 per tonne, downstream buyers begin substituting or postponing purchases — but the near-term setup remains tight.',
    },
    {
      type: 'paragraph',
      text: 'The divergence within base metals is now stark. While aluminum benefits from disruption-plus-cost dynamics, copper has weakened on cyclical headwinds: tightening financial conditions, a stronger US dollar, and rising inventories are unwinding the speculative positioning that lifted prices earlier in the year. The takeaway for investors is that the metals complex cannot be treated as one trade right now. The same shock helping aluminum is hurting copper through the dollar channel.',
    },
    { type: 'heading', text: 'Fertilizers and agriculture: the long tail', level: 2 },
    {
      type: 'paragraph',
      text: '[[kw:fertilizer-market]]Fertilizers[[/kw]] are the third major story, and arguably the one with the longest tail. Roughly one-third of global fertilizer production passes through the Strait of Hormuz, and natural gas — a critical feedstock for nitrogen fertilizers like urea — has spiked harder than oil in regional terms. Urea prices are now up roughly 75% year-on-year, with broader fertilizer prices forecast to be 20% higher in Q2 2026 than the prior year.',
    },
    {
      type: 'paragraph',
      text: 'This timing is bad: it lands in the planting season for major Northern Hemisphere crops. Higher input costs will reduce fertilizer use, shift planting decisions toward less fertilizer-intensive crops, and ultimately translate into lower yields. Global food prices are now forecast to rise about 6% in 2026, with the full effect extending into 2027 as the reduced-yield harvests come in. The fertilizer trade has a longer fuse than the oil trade — but it is also harder to unwind, because agricultural cycles take seasons, not weeks, to rebalance.',
    },
    {
      type: 'heading',
      text: 'Sulfuric acid and helium: the AI supply chain in the crosshairs',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'Sulfuric acid sits in a less visible but strategically important position. It is essential for fertilizer production, chemical manufacturing, and petroleum refining, and electronic-grade sulfuric acid is used to clean silicon wafers during semiconductor manufacturing — putting it directly in the AI supply chain. China produces roughly 35% of global sulfuric acid. Sulfur itself is a byproduct of oil refining and natural gas processing, which means refining cuts caused by the conflict are reducing sulfur supply, which then constrains acid output.',
    },
    {
      type: 'quote',
      text: 'A two- to three-month blockage in the Strait of Hormuz would likely become a severe supply shock, especially as freight and insurance stay elevated and Middle East-origin cargoes become harder to execute.',
      source: 'S&P Global Energy, March 20, 2026',
    },
    {
      type: 'paragraph',
      text: "Helium has also doubled since the war began, with Fitch Ratings warning that spot helium prices could spike by 50% to 200% in severe shortage scenarios. Iranian missile strikes damaged an industrial center in Qatar that produces about one-third of the world's helium, and on Earth helium is mostly extracted from natural gas — meaning the same upstream disruption that hit gas prices is hitting helium availability. The metal is critical to medical diagnostic equipment, nuclear reactors, and semiconductor manufacturing. The US once controlled 95% of global helium production and currently controls about 40%, but with fewer than fifteen helium refineries domestically, ramping is structurally slow.",
    },
    { type: 'heading', text: 'Gold: the nuanced safe haven', level: 2 },
    {
      type: 'paragraph',
      text: 'Gold has been a more nuanced story. As a traditional safe haven it has been supported, but the response has not been linear. Liquidity pressures during the initial shock pushed investors to sell gold to raise cash, which suppressed early gains. Sustained upside has tended to materialize when geopolitical stress combines with looser monetary policy and falling real yields. Recent gold movement reflects this interaction — the metal is supported by expectations of Fed easing, but volatile as those expectations shift week to week. Over the medium term, central bank buying and reserve diversification provide structural support, but the path will not be smooth.',
    },
    {
      type: 'dossier-table',
      figureLabel: 'FIG. 3 · THE COMMODITY COMPLEX, COMPARED',
      kicker:
        'FIVE COMMODITY GROUPS SINCE FEB 28 · MOVE · KEY RISK — CLICK A ROW TO EXPAND THE DOSSIER.',
      hint: 'Five commodity dossiers — expand a row for the record.',
      source: "this article's reporting.",
      headers: ['Commodity', 'What it is on the board', 'Move since Feb 28', 'Key risk', ''],
      rows: [
        {
          name: 'Tungsten',
          tag: 'THE STANDOUT',
          role: 'The best performer — AI-chip demand stacking on top of accelerated military procurement.',
          anchor: '+557% YoY',
          keyRisk:
            '80% of global supply is controlled by China; ramping domestic output would take years.',
          dossier: [
            {
              label: 'Why it moved',
              text: 'Highest melting point of any element; critical to AI chips (heat management) and to missiles, ammunition, and aircraft.',
            },
            {
              label: 'Supply',
              text: 'China ~80% of supply; ~27% of US imports came directly from China in 2024. Listed exposure is thin (Almonty on the TSX; REMX as a basket).',
            },
          ],
        },
        {
          name: 'Oil (Brent)',
          tag: 'ENERGY',
          role: 'Reacted first and hardest — Hormuz closure removed roughly 10M bbl/day of crude exports.',
          anchor: '+~50% (Brent ~$96.36)',
          keyRisk:
            'A normalization of Hormuz traffic could drift Brent back toward $80 by year-end.',
          dossier: [
            {
              label: 'Supply exposure',
              text: 'The strait carries ~10M bbl/day of crude, mostly from Saudi Arabia, the UAE, Iraq, Kuwait, and Iran.',
            },
            {
              label: 'The path',
              text: 'Brent rallied from ~$70 in early February to above $115 in late March before settling near $96.36.',
            },
          ],
        },
        {
          name: 'Industrial metals',
          tag: 'DIVERGENCE',
          role: 'Not one trade — aluminum up on disruption-plus-cost; copper weaker on a stronger dollar.',
          anchor: 'Aluminum +12% (~$3,450/t)',
          keyRisk:
            'Aluminum upside capped by demand destruction near $3,500/t; copper pressured through the dollar channel.',
          dossier: [
            {
              label: 'Aluminum',
              text: 'A meaningful share of supply is Gulf-based and production is energy-intensive, so the oil/gas spike lifts costs globally.',
            },
            {
              label: 'Copper',
              text: 'Weakened on tightening financial conditions, a stronger US dollar, and rising inventories.',
            },
          ],
        },
        {
          name: 'Fertilizers',
          tag: 'THE LONG TAIL',
          role: 'The longest fuse — roughly one-third of global fertilizer production passes through Hormuz.',
          anchor: 'Urea +~75% YoY',
          keyRisk:
            'Lands in Northern Hemisphere planting season; global food prices forecast ~+6% in 2026, extending into 2027.',
          dossier: [
            {
              label: 'Feedstock',
              text: 'Natural gas — a critical feedstock for nitrogen fertilizers like urea — spiked harder than oil in regional terms.',
            },
            {
              label: 'Broader move',
              text: 'Fertilizer prices are forecast 20% higher in Q2 2026 than the prior year.',
            },
          ],
        },
        {
          name: 'Gold',
          tag: 'SAFE HAVEN',
          role: 'A nuanced safe haven — supported, but the response has not been linear.',
          anchor: 'Qualitative — supported, non-linear',
          keyRisk:
            'Liquidity pressures during the initial shock pushed investors to sell gold to raise cash.',
          dossier: [
            {
              label: 'Behavior',
              text: 'Sustained upside has tended to need geopolitical stress combined with looser policy and falling real yields.',
            },
            {
              label: 'Structural support',
              text: 'Central-bank buying and reserve diversification provide medium-term support, but the path is volatile.',
            },
          ],
        },
      ],
    },
    { type: 'heading', text: 'Downstream: pump prices and government response', level: 2 },
    {
      type: 'paragraph',
      text: 'The downstream effects of these commodity moves are now visible in retail energy prices. According to data from Global Petrol Prices analyzed in early March, at least 85 countries have reported petrol price increases since February 28. The biggest increases are in Southeast Asia and Africa, where currency depreciation compounds the underlying commodity move.',
    },
    {
      type: 'paragraph',
      text: 'These pump-price shocks are forcing governments to act. Pakistan has moved to a four-day workweek for government employees with half the staff working from home on rotation. The Philippines has done the same. Thailand has made remote work mandatory for civil servants. Energy-importing economies in Asia and Africa are now operating with rolling supply constraints that did not exist eight weeks ago.',
    },
    { type: 'heading', text: 'Equity markets: uneven absorption', level: 2 },
    {
      type: 'paragraph',
      text: "Global equities are down roughly 5.5% since the war began, but the distribution of pain is uneven. Japan's Nikkei 225 has fallen 11%, India's Nifty 50 is off 7%, and Saudi Arabia's Tadawul is down 9.6%. Western markets have held up relatively better — the FTSE 100 is off 5.3%, the STOXX 600 is down 6%, and the NYSE Composite is down 6%. The Nasdaq has been remarkably resilient at -2.4%, a function of large-cap tech being viewed as defensive in the current macro setup.",
    },
    { type: 'heading', text: 'How to position around the move', level: 2 },
    {
      type: 'paragraph',
      text: 'Investors looking to get exposure to the commodity rally have several routes. For broad commodity exposure, S&P GSCI tracking ETFs and DBC capture the basket move. For oil specifically, USO tracks WTI futures — when the curve shows [[kw:backwardation]]backwardation[[/kw]], futures-based ETFs face extra roll dynamics — OIH captures oilfield services, XLE holds the largest US energy companies, and individual names like XOM, CVX, and EOG provide leveraged exposure to crude. Aluminum exposure is harder — the cleanest plays are Alcoa (AA) and Century Aluminum (CENX). Fertilizer exposure runs through CF Industries (CF), Nutrien (NTR), and Mosaic (MOS). For tungsten, the listed pure-play universe is small; rare-earth metals ETFs like REMX provide partial exposure. Gold investors have GLD and IAU.',
    },
    {
      type: 'paragraph',
      text: 'The conventional analytical framework — supply, demand, inventories, seasonality — is not sufficient for the current market. Three forces are now interacting: direct [[kw:force-majeure-cascade]]supply disruption[[/kw]] (especially in energy), cost transmission (energy costs flowing into metals and agriculture), and financial amplification (positioning, dollar dynamics, and policy expectations). Each of these moves on its own timeline, and the cross-market linkages are tighter than they have been in any commodity cycle since 2008. That makes single-commodity bets riskier than they look on paper, and basket exposure — or paired trades that hedge one leg of the disruption — more attractive.',
    },
    {
      type: 'paragraph',
      text: 'The base case for the rest of 2026 assumes a gradual normalization of Hormuz traffic, which would let oil drift back toward $80 per barrel by year-end and aluminum ease from current highs. The bear case is a sustained closure or escalation that locks in current price levels and pushes them higher. Either way, the geopolitical risk premium that has been embedded into commodity prices since February 28 is unlikely to fully dissipate even if the conflict ends quickly. Markets do not forget supply shocks; they reprice the probability of the next one.',
    },
    {
      type: 'paragraph',
      text: "For investors using Ezana, the relevant tools to track this are the Global Market Analysis chain view (which surfaces ISR-flagged events in the Middle East with attached prediction-market odds), Inside the Capitol (where energy committee members' disclosed trades have shifted toward energy producers since February), and the Empire Rankings dimensions covering geology, resource efficiency, and economic output — all of which have reweighted in response to the conflict. The commodity rally is not a trade in isolation; it is a leading indicator of where the rest of the macro setup is heading.",
    },
  ],
  globeRail: {
    metric: {
      title: 'BRENT CRUDE · USD/BBL',
      data: [
        { x: 2026.1, y: 70 },
        { x: 2026.24, y: 115 },
        { x: 2026.32, y: 96.36 },
      ],
      startLabel: 'Early Feb · ~$70',
      endLabel: 'Apr 26 · $96.36',
      note: 'Brent spot · +~50% since the Feb 28 strikes',
    },
    cities: [
      {
        name: 'Tehran',
        country: 'Iran',
        lat: 35.7,
        lng: 51.42,
        impact:
          'The origin of the shock: the Feb 28 joint US–Israel strikes closed the Strait of Hormuz — which carries roughly one-fifth of global oil and LNG trade — to commercial transit, triggering one of the most aggressive commodity repricings in years.',
      },
      {
        name: 'Riyadh',
        country: 'Saudi Arabia',
        lat: 24.71,
        lng: 46.68,
        impact:
          'The Strait carries ~10M bbl/day of crude, most of it from Saudi Arabia, the UAE, Iraq, Kuwait, and Iran — and the Gulf’s energy-intensive aluminum supply feeds a +12% move. The Tadawul absorbed one of the largest equity losses, down 9.6%.',
      },
      {
        name: 'Beijing',
        country: 'China',
        lat: 39.9,
        lng: 116.4,
        impact:
          'China produces roughly 80% of the world’s tungsten — the standout performer, up +557% on AI-plus-military demand — and about 35% of global sulfuric acid, putting it at the center of the metals and AI-supply-chain legs of the move.',
      },
      {
        name: 'London',
        country: 'UK',
        lat: 51.5,
        lng: -0.13,
        impact:
          'Brent, the London benchmark, rallied from ~$70 in early February to above $115 in late March before settling near $96.36; the FTSE 100 held up better than Asia at −5.3%, and S&P Global warned a two- to three-month blockage would be a severe supply shock.',
      },
      {
        name: 'Houston',
        country: 'US',
        lat: 29.76,
        lng: -95.37,
        impact:
          'The US energy complex — WTI tracking Brent at $92.52, and the XLE / XOM / CVX / EOG names offering leveraged crude exposure — sits on the better-insulated side of the shock, with US petrol up a comparatively modest +16.55%.',
      },
    ],
  },
  author: 'Ezana Finance Editorial',
  category: 'commodities-energy',
  subcategory: 'Oil & Gas',
  tags: ['markets', 'policy', 'geopolitics', 'commodities', 'energy', 'macro'],
  meta: {
    sectors: ['Energy', 'Materials'],
    industries: ['Oil & Gas', 'Fertilizers & Agricultural Chemicals'],
    // Named data/ratings institutions cited in the text.
    institutions: ['S&P Global', 'Fitch Ratings'],
    geos: ['Iran', 'Middle East', 'United States'],
    assetClasses: ['Commodities', 'Equities'],
    themes: ['Geopolitical Risk', 'Energy Prices'],
    datasets: [],
    markets: [],
  },
  tickers: ['USO', 'XLE', 'XOM', 'CVX', 'EOG', 'AA', 'CF', 'NTR', 'GLD'],
  entities: {
    people: [],
    terms: [
      { id: 'commodity-supercycle', label: 'Commodity Supercycle' },
      { id: 'strait-of-hormuz', label: 'Strait of Hormuz' },
      { id: 'strategic-reserves', label: 'Strategic Reserves' },
      { id: 'tungsten', label: 'Tungsten' },
      { id: 'secondary-sanctions', label: 'Secondary Sanctions' },
      { id: 'fertilizer-market', label: 'Fertilizer Market' },
      { id: 'backwardation', label: 'Backwardation' },
      { id: 'force-majeure-cascade', label: 'Force Majeure Cascade' },
    ],
  },
  readTime: 11,
  publishedAt: '2026-04-26',
  featured: false,
  likes: 0,
  comments: 0,
  reads: 0,
  listMeta: '26 Apr 2026',
};
