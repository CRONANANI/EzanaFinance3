/**
 * Ezana Echo — keyword registry.
 *
 * Keywords are pedagogically-relevant terms surfaced inside articles. When a
 * reader clicks one, a popup opens with a short definition + a visual template
 * (timeline / comparison / formula / schema) + a link to a learning-center course.
 *
 * To add a keyword:
 *   1. Add an entry to KEYWORDS keyed by slug
 *   2. Reference it in article text using [[kw:slug]]display text[[/kw]]
 */

export const KEYWORDS = {
  /* ════════════════════════════════════════════════════════════════════════
     Sector Dominance article keywords
     ════════════════════════════════════════════════════════════════════════ */

  'sector-rotation': {
    id: 'sector-rotation',
    term: 'Sector Rotation',
    definition:
      'The pattern of investors moving capital between different sectors of the economy as economic conditions change. Different sectors tend to outperform at different stages of the business cycle.',
    template: 'schema',
    templateData: {
      title: 'Sectors that lead at each economic stage',
      nodes: [
        {
          label: 'Early recovery',
          sectors: ['Technology', 'Consumer Discretionary'],
          color: '#10b981',
        },
        { label: 'Mid-expansion', sectors: ['Industrials', 'Materials'], color: '#3b82f6' },
        { label: 'Late expansion', sectors: ['Energy', 'Financials'], color: '#f59e0b' },
        {
          label: 'Recession',
          sectors: ['Utilities', 'Consumer Staples', 'Healthcare'],
          color: '#a855f7',
        },
      ],
    },
    realWorld:
      'The article shows sector rotation playing out across CENTURIES instead of business cycles. The same logic applies on shorter timescales: when interest rates fall, defensive sectors lose favor and growth sectors take the lead.',
    courseId: 'stocks-intermediate-4',
    courseTitle: 'Sector Analysis',
  },

  antitrust: {
    id: 'antitrust',
    term: 'Antitrust Law',
    definition:
      'Federal laws designed to prevent monopolies, cartels, and anti-competitive business practices. The Sherman Act (1890) and Clayton Act (1914) are the foundations of US antitrust regulation, used to break up Standard Oil, AT&T, and others.',
    template: 'timeline',
    templateData: {
      title: 'Major US antitrust actions',
      events: [
        { year: '1890', label: 'Sherman Act passed', detail: 'First federal antitrust law' },
        { year: '1911', label: 'Standard Oil broken up', detail: 'Split into 34 companies' },
        { year: '1914', label: 'Clayton Act passed', detail: 'Strengthened Sherman Act' },
        { year: '1982', label: 'AT&T breakup', detail: 'Created the "Baby Bells"' },
        {
          year: '2001',
          label: 'Microsoft case settled',
          detail: 'Avoided breakup, restricted practices',
        },
        {
          year: '2024+',
          label: 'Big Tech scrutiny',
          detail: 'Google, Amazon, Apple, Meta cases ongoing',
        },
      ],
    },
    realWorld:
      "When the article describes Standard Oil being broken up in 1911 into 34 companies — Exxon, Chevron, Mobil, Amoco — that's antitrust law in action. The same legal framework is now being applied to today's tech giants.",
    courseId: 'stocks-advanced-7',
    courseTitle: 'Macroeconomics for Traders',
  },

  /* ════════════════════════════════════════════════════════════════════════
     Fiber Optic Cable article keywords
     ════════════════════════════════════════════════════════════════════════ */

  'producer-price-index': {
    id: 'producer-price-index',
    term: 'Producer Price Index (PPI)',
    definition:
      'The PPI measures the average change over time in selling prices received by domestic producers. Unlike CPI (which tracks consumer prices), PPI captures price movements at the wholesale/factory level — before goods reach retail shelves.',
    template: 'comparison',
    templateData: {
      title: 'PPI vs CPI',
      headers: ['Metric', 'What it measures', 'Who uses it'],
      rows: [
        {
          label: 'PPI',
          cells: ['Prices received by producers', 'Manufacturers, commodity traders'],
        },
        { label: 'CPI', cells: ['Prices paid by consumers', 'Fed policy, wage negotiations'] },
      ],
      footnote:
        'Rising PPI often leads CPI — factory price increases eventually pass through to consumers.',
    },
    realWorld:
      "When the PPI for fiber optic cable rises, it signals that demand is outrunning supply at the factory level. Cable installers and data center operators will soon pay more, which flows into Corning's revenue and margins.",
    courseId: 'macro-indicators-2',
    courseTitle: 'Understanding Economic Indicators',
  },

  'compound-annual-growth-rate': {
    id: 'compound-annual-growth-rate',
    term: 'CAGR (Compound Annual Growth Rate)',
    definition:
      'CAGR measures the mean annual growth rate of an investment or market over a specified time period longer than one year. It smooths out volatility to show a steady trajectory — useful for comparing growth across different time horizons.',
    template: 'formula',
    templateData: {
      formula: 'CAGR = (End Value / Start Value)^(1/n) – 1',
      example: {
        title: 'Fiber optic market example',
        substitution: 'Start (2024): $6.7B · End (2034): $30.6B · Years: 10 · CAGR: ~16.4%',
      },
    },
    realWorld:
      'A 16% CAGR means the fiber optic cable market roughly doubles every 4.5 years. For investors, CAGR is more honest than "total growth" because it accounts for compounding and time.',
    courseId: 'valuation-101-3',
    courseTitle: 'Growth Rate Analysis',
  },

  'multicore-fiber': {
    id: 'multicore-fiber',
    term: 'Multicore Fiber (MCF)',
    definition:
      'An optical fiber strand containing multiple light-carrying cores within a single 125-micron cladding. Traditional fiber has one core; MCF packs 4+ cores in the same diameter, multiplying data density without increasing cable bulk.',
    template: 'comparison',
    templateData: {
      title: 'Single-core vs Multicore fiber',
      headers: ['Type', 'Cores', 'Density', 'Use case'],
      rows: [
        { label: 'Single-core', cells: ['1', '1× baseline', 'Telecom backhaul, submarine cables'] },
        { label: 'MCF (4-core)', cells: ['4', '4× density', 'AI data centers, rack-to-rack'] },
      ],
      footnote: "Corning's MCF reduces cable count by 75% in data center deployments.",
    },
    realWorld:
      "When a data center needs to connect 100,000 GPU racks, the difference between 1-core and 4-core fiber is the difference between 200,000 cable runs and 50,000. That's not just cost savings — it's physical space savings in conduits and trays.",
    courseId: 'tech-fundamentals-6',
    courseTitle: 'Fiber Optic Technology Basics',
  },

  hyperscale: {
    id: 'hyperscale',
    term: 'Hyperscale',
    definition:
      'Refers to the massive scale at which cloud providers (Meta, Amazon, Microsoft, Google) build and operate infrastructure. Hyperscale data centers have 100,000+ servers and are designed for horizontal scaling — adding capacity by adding more identical units.',
    template: 'comparison',
    templateData: {
      title: 'Hyperscale vs enterprise data centers',
      headers: ['Feature', 'Enterprise', 'Hyperscale'],
      rows: [
        { label: 'Servers', cells: ['100–10,000', '100,000–1,000,000+'] },
        { label: 'Capex', cells: ['$5M–$50M', '$500M–$2B+'] },
        { label: 'Operators', cells: ['Company IT teams', 'Big Tech (Meta, AWS, Azure, GCP)'] },
      ],
      footnote: 'Hyperscale operators are the primary buyers of fiber optic cable today.',
    },
    realWorld:
      "When Corning signs a $6B deal with Meta for optical fiber, that's hyperscale purchasing power. A single hyperscale customer can justify building an entire new factory.",
    courseId: 'tech-fundamentals-7',
    courseTitle: 'Cloud Computing Economics',
  },

  'single-mode-vs-multi-mode': {
    id: 'single-mode-vs-multi-mode',
    term: 'Single-Mode vs Multi-Mode Fiber',
    definition:
      'Single-mode fiber has a narrow core (~9 microns) that carries one light mode over long distances with low attenuation. Multi-mode fiber has a wider core (~50 microns) that carries multiple light modes over short distances. Data centers use both: multi-mode for rack-to-rack, single-mode for building-to-building.',
    template: 'comparison',
    templateData: {
      title: 'Single-mode vs multi-mode fiber',
      headers: ['Feature', 'Single-Mode', 'Multi-Mode'],
      rows: [
        { label: 'Core diameter', cells: ['~9 µm', '~50 µm'] },
        { label: 'Distance', cells: ['Up to 100+ km', 'Up to 500 m'] },
        { label: 'Cost', cells: ['Higher (precision laser)', 'Lower (LED source)'] },
        { label: 'Use case', cells: ['Telecom backhaul, submarine', 'Data center, campus'] },
      ],
      footnote: 'AI data centers consume massive quantities of both types.',
    },
    realWorld:
      'Submarine cables spanning oceans use single-mode exclusively. Inside a data center, multi-mode handles the short rack-to-rack connections. Both segments are growing because AI drives demand across the full distance spectrum.',
    courseId: 'tech-fundamentals-6',
    courseTitle: 'Fiber Optic Technology Basics',
  },

  'margin-of-safety': {
    id: 'margin-of-safety',
    term: 'Margin of Safety',
    definition:
      'A principle from Benjamin Graham: only buy a stock when its market price is significantly below your estimate of intrinsic value. The gap between price and value is your "margin of safety" — it protects you if your analysis is wrong.',
    template: 'formula',
    templateData: {
      formula: 'Margin of Safety = (Intrinsic Value – Market Price) / Intrinsic Value',
      example: {
        title: 'Example',
        substitution: 'Intrinsic value: $150 · Market price: $120 · Margin of safety: 20%',
      },
    },
    realWorld:
      "Graham's Golden Fleece — the concept that protects investors from overpaying. If you estimate a stock is worth $150 but only buy at $120, you have a 20% buffer if your valuation is off. Infrastructure companies like Corning often trade with visible margins of safety during cyclical lows.",
    courseId: 'valuation-101-1',
    courseTitle: 'Value Investing Foundations',
  },

  'dot-com-bubble': {
    id: 'dot-com-bubble',
    term: 'Dot-Com Bubble',
    definition:
      'The speculative bubble in internet-related stocks from 1995–2001. The NASDAQ rose 400% before crashing 78%. Many telecom companies overbuilt fiber optic networks during the bubble, creating a supply glut that depressed prices for over a decade.',
    template: 'timeline',
    templateData: {
      events: [
        { year: '1995', label: 'Netscape IPO — internet mania begins' },
        { year: '1999', label: 'NASDAQ peaks above 5,000' },
        { year: '2000', label: 'Bubble bursts — NASDAQ crashes 78%' },
        { year: '2001–2003', label: 'Fiber optic overcapacity, Corning stock drops 99%' },
        { year: '2017–present', label: '5G + AI drive fiber demand recovery' },
      ],
    },
    realWorld:
      'The dot-com bust left millions of miles of unused fiber optic cable buried underground ("dark fiber"). It took nearly two decades for demand to catch up to supply. The AI buildout is the first time since the bubble that demand has genuinely outpaced installed capacity.',
    courseId: 'market-history-2',
    courseTitle: 'Market Bubbles & Crashes',
  },

  /* ════════════════════════════════════════════════════════════════════════
     Iran / Commodities article keywords
     ════════════════════════════════════════════════════════════════════════ */

  'strait-of-hormuz': {
    id: 'strait-of-hormuz',
    term: 'Strait of Hormuz',
    definition:
      "A narrow waterway between Iran and Oman connecting the Persian Gulf to the Gulf of Oman. Roughly 20% of the world's oil supply passes through this chokepoint. Any disruption (military, political, or logistical) can spike global oil prices instantly.",
    template: 'schema',
    templateData: {
      title: 'Strait of Hormuz: key facts',
      nodes: [
        { label: 'Width: ~39 km at narrowest', sectors: [], color: '#ef4444' },
        { label: '~20% of global oil transit', sectors: [], color: '#f59e0b' },
        { label: '~25% of global LNG transit', sectors: [], color: '#10b981' },
        { label: 'Iran controls the northern shore', sectors: [], color: '#64748b' },
        {
          label: 'Key for: Saudi, Iraq, Kuwait, UAE, Qatar exports',
          sectors: [],
          color: '#3b82f6',
        },
      ],
    },
    realWorld:
      'When tensions rise between Iran and the US, oil traders immediately price in "Hormuz risk" — the possibility that Iran could mine, blockade, or disrupt shipping through the strait. Even a partial disruption can add $10–20/barrel to crude prices.',
    courseId: 'geopolitics-101-1',
    courseTitle: 'Geopolitical Risk in Markets',
  },

  'commodity-supercycle': {
    id: 'commodity-supercycle',
    term: 'Commodity Supercycle',
    definition:
      'A prolonged period (10–25 years) of above-trend commodity prices driven by structural demand shifts. Previous supercycles: 1900s (US industrialization), 1950s (post-WWII rebuilding), 1970s (oil shocks), 2000s (China urbanization).',
    template: 'timeline',
    templateData: {
      events: [
        { year: '1900–1920', label: 'US industrialization supercycle' },
        { year: '1945–1965', label: 'Post-WWII reconstruction' },
        { year: '1970–1980', label: 'Oil embargo / stagflation' },
        { year: '2000–2011', label: 'China urbanization demand' },
        { year: '2020–?', label: 'Energy transition + AI infrastructure (ongoing?)' },
      ],
    },
    realWorld:
      'Some analysts argue we are in the early stages of a new commodity supercycle driven by the energy transition (copper, lithium, nickel for EVs), AI infrastructure (power, cooling), and geopolitical supply disruptions (sanctions, reshoring).',
    courseId: 'commodities-101-1',
    courseTitle: 'Understanding Commodity Markets',
  },

  'strategic-reserves': {
    id: 'strategic-reserves',
    term: 'Strategic Petroleum Reserve (SPR)',
    definition:
      "Government-held stockpiles of crude oil maintained for emergency supply disruptions. The US SPR is the world's largest at ~370M barrels (down from 700M+ after drawdowns in 2022). The SPR acts as a buffer — releasing barrels can temporarily moderate price spikes.",
    template: 'timeline',
    templateData: {
      events: [
        { year: '1975', label: 'US SPR created after 1973 oil embargo' },
        { year: '2011', label: '30M barrel release during Libya conflict' },
        { year: '2022', label: '180M barrel release (largest ever) — Ukraine war' },
        { year: '2024–26', label: 'Partial refill at ~$70–80/barrel' },
      ],
    },
    realWorld:
      'After the 2022 drawdown, the US SPR dropped to its lowest level since 1984. With less buffer available, future supply disruptions (like the Iran conflict) have a larger impact on prices because the government has fewer barrels to release.',
    courseId: 'commodities-101-3',
    courseTitle: 'Oil Markets & Government Policy',
  },

  backwardation: {
    id: 'backwardation',
    term: 'Backwardation',
    definition:
      'A futures curve shape where near-term contracts trade at a higher price than longer-dated ones. It signals that the market wants supply NOW — buyers are willing to pay a premium for immediate delivery. Opposite of contango.',
    template: 'comparison',
    templateData: {
      title: 'Backwardation vs Contango',
      headers: ['Curve shape', 'Signal', 'What it means'],
      rows: [
        { label: 'Backwardation', cells: ['Near > Far', 'Current supply shortage, urgency'] },
        { label: 'Contango', cells: ['Near < Far', 'Ample supply, storage costs priced in'] },
      ],
      footnote:
        'Oil markets shifted into steep backwardation during the Iran conflict — a clear supply-fear signal.',
    },
    realWorld:
      'When oil is in backwardation, refiners and airlines are scrambling for barrels today, not next month. For investors, backwardation in commodity futures is one of the strongest signals that a supply disruption is real, not just media noise.',
    courseId: 'commodities-101-4',
    courseTitle: 'Futures Curves & Trading',
  },

  tungsten: {
    id: 'tungsten',
    term: 'Tungsten',
    definition:
      'A rare metal with the highest melting point of any element (3,422°C). Used in ammunition, armor-piercing projectiles, cutting tools, and electronics. China controls ~80% of global tungsten supply, making it a critical strategic mineral during geopolitical conflicts.',
    template: 'schema',
    templateData: {
      title: 'Tungsten supply chain',
      nodes: [
        { label: 'Mining (80% China)', sectors: [], color: '#ef4444' },
        { label: 'Processing (APT conversion)', sectors: [], color: '#f59e0b' },
        { label: 'Alloy manufacturing', sectors: [], color: '#10b981' },
        { label: 'End uses: defense, tooling, electronics', sectors: [], color: '#3b82f6' },
      ],
    },
    realWorld:
      'Tungsten prices surged 557% since the Iran conflict began — the largest gain of any commodity tracked. Military demand for ammunition and armor-piercing rounds, combined with China restricting exports as geopolitical leverage, created a perfect supply squeeze.',
    courseId: 'commodities-101-5',
    courseTitle: 'Strategic Minerals & Defense',
  },

  'fertilizer-market': {
    id: 'fertilizer-market',
    term: 'Fertilizer Markets',
    definition:
      'The global market for nitrogen, phosphorus, and potassium (NPK) compounds used in agriculture. Natural gas is the primary feedstock for nitrogen fertilizers. When energy prices spike (oil, gas), fertilizer costs follow — directly impacting food prices worldwide.',
    template: 'schema',
    templateData: {
      title: 'Energy → fertilizer → food price chain',
      nodes: [
        { label: 'Natural gas price rises', sectors: [], color: '#ef4444' },
        { label: 'Ammonia production costs up', sectors: [], color: '#f59e0b' },
        { label: 'Urea/NPK fertilizer prices up', sectors: [], color: '#eab308' },
        { label: 'Farm input costs up', sectors: [], color: '#10b981' },
        { label: 'Food prices up', sectors: [], color: '#3b82f6' },
        { label: 'Consumer inflation', sectors: [], color: '#64748b' },
      ],
    },
    realWorld:
      'The Iran conflict disrupted Middle East energy flows, pushing natural gas prices higher. Since natural gas is ~70–80% of the cost of producing ammonia (the base for nitrogen fertilizers), fertilizer prices surged ~75% — directly threatening food security in import-dependent nations.',
    courseId: 'commodities-101-6',
    courseTitle: 'Agricultural Commodities',
  },

  /* ════════════════════════════════════════════════════════════════════════
     Hantavirus article keywords
     ════════════════════════════════════════════════════════════════════════ */

  'hantavirus-definition': {
    id: 'hantavirus-definition',
    term: 'Hantavirus',
    definition:
      'A family of viruses carried by rodents that cause two main diseases in humans: Hantavirus Pulmonary Syndrome (HPS) in the Americas and Hemorrhagic Fever with Renal Syndrome (HFRS) in Europe and Asia. HPS has a ~38% case fatality rate. There is no approved vaccine or antiviral treatment.',
    template: 'comparison',
    templateData: {
      title: 'Two forms of hantavirus disease',
      headers: ['Disease', 'Region', 'Fatality rate', 'Primary carrier'],
      rows: [
        { label: 'HPS', cells: ['Americas', '~38%', 'Deer mouse (Peromyscus maniculatus)'] },
        { label: 'HFRS', cells: ['Europe, Asia', '1–15%', 'Bank vole, striped field mouse'] },
      ],
      footnote:
        '~150,000 HFRS cases reported annually worldwide, mainly in China. HPS cases are rarer but far more lethal.',
    },
    realWorld:
      'Hantavirus is named after the Hantan River in South Korea, where it was first isolated in 1978. In the US, it was identified in 1993 after a cluster of mysterious deaths on a Navajo reservation in the Four Corners region.',
    courseId: 'health-101-1',
    courseTitle: 'Infectious Disease & Markets',
  },

  'andes-virus': {
    id: 'andes-virus',
    term: 'Andes Virus',
    definition:
      'A strain of hantavirus endemic to South America, primarily carried by the long-tailed pygmy rice rat. It is the ONLY hantavirus with documented human-to-human transmission — all other strains are "dead-end infections" that pass from rodent to human but not person to person.',
    template: 'schema',
    templateData: {
      title: 'Why Andes virus is unique',
      nodes: [
        { label: 'Carried by rice rats in Argentina/Chile' },
        { label: 'Can spread person-to-person (respiratory droplets)' },
        { label: 'All other hantaviruses: rodent → human only' },
        { label: 'Incubation: 1–8 weeks' },
        { label: 'Cruise ship outbreak: possible first closed-environment cluster' },
      ],
    },
    realWorld:
      'The 2018–2019 Epuyen outbreak in Argentina confirmed person-to-person transmission of Andes virus for the first time. That outbreak infected 34 people and killed 11. The MV Hondius cruise ship outbreak in 2026 may be the second.',
    courseId: 'health-101-2',
    courseTitle: 'Emerging Infectious Disease',
  },

  'who-notification': {
    id: 'who-notification',
    term: 'WHO Outbreak Notification',
    definition:
      'Under the International Health Regulations (IHR), WHO member states must notify the WHO within 24 hours of any event that may constitute a Public Health Emergency of International Concern (PHEIC). The WHO then coordinates global response through its GOARN (Global Outbreak Alert and Response Network).',
    template: 'timeline',
    templateData: {
      events: [
        { year: 'Day 0', label: 'Outbreak detected in a member state' },
        { year: '24 hours', label: 'National IHR Focal Point notifies WHO' },
        { year: '48 hours', label: 'WHO assesses risk, notifies all member states' },
        { year: '72 hours', label: 'GOARN coordination, lab networks activated' },
      ],
    },
    realWorld:
      'The US withdrew from WHO in January 2025. This means the US no longer receives IHR notifications through the formal cascade — it gets outbreak information on the same timeline as anyone reading the news. For the 2026 World Cup across 11 American cities, this gap in early warning capability is a tangible epidemiological risk.',
    courseId: 'geopolitics-101-3',
    courseTitle: 'Global Health Governance',
  },

  nndss: {
    id: 'nndss',
    term: 'NNDSS (National Notifiable Diseases Surveillance System)',
    definition:
      'The CDC system that collects and publishes data on nationally notifiable infectious diseases in the United States. Physicians and labs are required by law to report certain diseases — including hantavirus — to state health departments, which relay the data to the CDC through NNDSS.',
    template: 'schema',
    templateData: {
      title: 'How disease surveillance flows',
      nodes: [
        { label: 'Patient presents symptoms' },
        { label: 'Lab confirms pathogen' },
        { label: 'Physician reports to state' },
        { label: 'State reports to CDC/NNDSS' },
        { label: 'CDC publishes weekly MMWR tables' },
      ],
    },
    realWorld:
      'NNDSS is how we know there have been 864 hantavirus cases in the US since 1993. Without this surveillance system, outbreaks in rural areas would go undetected and uncounted.',
    courseId: 'health-101-3',
    courseTitle: 'Public Health Infrastructure',
  },

  'rodent-population-dynamics': {
    id: 'rodent-population-dynamics',
    term: 'Rodent Population Dynamics',
    definition:
      'The cyclical rise and fall of rodent populations driven by food availability, weather patterns, and predator pressure. Deer mouse populations boom after wet years (El Niño) when vegetation and seed production increase. More mice = more hantavirus exposure for humans.',
    template: 'schema',
    templateData: {
      title: 'El Niño → mice → hantavirus cycle',
      nodes: [
        { label: 'Heavy rains (El Niño)' },
        { label: 'Abundant vegetation/seeds' },
        { label: 'Deer mouse population boom' },
        { label: 'Mice invade human structures' },
        { label: 'Humans inhale aerosolized excreta' },
        { label: 'Hantavirus cases spike' },
      ],
    },
    realWorld:
      'The 1993 hantavirus discovery year — with 48 cases, the highest ever — followed a period of heavy El Niño rains in the Four Corners region. Researchers at UNM have found over 30 small mammal species in New Mexico that carry live hantavirus, beyond just the deer mouse.',
    courseId: 'health-101-4',
    courseTitle: 'Environmental Drivers of Disease',
  },

  'four-corners-region': {
    id: 'four-corners-region',
    term: 'Four Corners Region',
    definition:
      'The geographic area where Utah, Colorado, New Mexico, and Arizona meet — the only place in the US where four states share a single boundary point. This arid, rural region is the epicenter of US hantavirus cases due to the high density of deer mice in proximity to human dwellings.',
    template: 'comparison',
    templateData: {
      title: 'Four Corners states: hantavirus cases (1993–2023)',
      headers: ['State', 'Cases', '% of US total'],
      rows: [
        { label: 'New Mexico', cells: ['129', '14.9%'] },
        { label: 'Colorado', cells: ['121', '14.0%'] },
        { label: 'Arizona', cells: ['92', '10.6%'] },
        { label: 'Utah', cells: ['48', '5.6%'] },
      ],
      footnote: 'Combined: 390 of 864 US cases (45%) from just four states.',
    },
    realWorld:
      'Hantavirus was originally called "Four Corners disease" before it was formally named. The Navajo Nation, which spans parts of all four states, was particularly affected in 1993. Traditional Navajo knowledge already recognized a connection between increased mouse populations and respiratory illness — long before Western medicine identified the virus.',
    courseId: 'health-101-5',
    courseTitle: 'Geography of Disease',
  },

  ecmo: {
    id: 'ecmo',
    term: 'ECMO (Extracorporeal Membrane Oxygenation)',
    definition:
      'A life-support machine that pumps blood outside the body through an artificial lung (oxygenator) and back in. Used when the lungs are too damaged to oxygenate blood on their own. In severe hantavirus cases, ECMO can keep patients alive while their lungs recover — but it requires specialized ICU equipment and trained perfusionists.',
    template: 'schema',
    templateData: {
      title: 'How ECMO works',
      nodes: [
        { label: 'Blood drawn from patient via catheter' },
        { label: 'Pumped through artificial oxygenator' },
        { label: 'CO₂ removed, O₂ added' },
        { label: 'Blood returned to patient' },
        { label: 'Buys time for lung recovery (days to weeks)' },
      ],
    },
    realWorld:
      'ECMO machines cost $100K-$250K each and require 24/7 specialist staffing. Most rural hospitals in the Four Corners region — where hantavirus is most common — do not have ECMO capability. Patients must be airlifted to urban tertiary care centers, adding critical delay.',
    courseId: 'health-101-8',
    courseTitle: 'Critical Care Technology',
  },

  'pandemic-preparedness': {
    id: 'pandemic-preparedness',
    term: 'Pandemic Preparedness',
    definition:
      "Government and institutional programs to develop countermeasures (vaccines, antivirals, diagnostics) for pathogens with pandemic potential BEFORE an outbreak occurs. The NIH's ReVAMPP program and BARDA's medical countermeasure stockpile are the primary US mechanisms.",
    template: 'comparison',
    templateData: {
      title: 'US pandemic preparedness agencies',
      headers: ['Agency', 'Role', 'Budget (est.)'],
      rows: [
        { label: 'BARDA', cells: ['Develop & stockpile countermeasures', '~$8B/year'] },
        { label: 'NIH/NIAID', cells: ['Basic research, grants, clinical trials', '~$6B/year'] },
        { label: 'CDC', cells: ['Surveillance, outbreak response', '~$9B/year'] },
        { label: 'ASPR', cells: ['Strategic National Stockpile', '~$3B/year'] },
      ],
      footnote:
        'Hantavirus is classified by NIH as a Category A priority pathogen for biodefense research.',
    },
    realWorld:
      'In 2024, the NIH identified hantaviruses as one of several pathogen families with no effective vaccines or treatments, making them "of special concern for pandemic potential." The ReVAMPP grants fund structural biology, vaccine candidates, and antibody therapies — but progress is slow without a commercial market to incentivize pharma investment.',
    courseId: 'health-101-9',
    courseTitle: 'Biodefense & Market Implications',
  },

  'pcr-diagnostics': {
    id: 'pcr-diagnostics',
    term: 'PCR Diagnostics',
    definition:
      "Polymerase Chain Reaction (PCR) testing amplifies tiny amounts of viral genetic material to detectable levels. It is the gold standard for confirming hantavirus infection. The MV Hondius outbreak was confirmed when PCR testing at South Africa's National Institute for Communicable Diseases detected hantavirus RNA in a critically ill patient.",
    template: 'schema',
    templateData: {
      title: 'PCR testing process',
      nodes: [
        { label: 'Patient blood/tissue sample' },
        { label: 'RNA extraction' },
        { label: 'Reverse transcription to cDNA' },
        { label: 'PCR amplification (30-40 cycles)' },
        { label: 'Detection: positive if viral RNA present' },
        { label: 'Sequencing to identify strain (Andes, Sin Nombre, etc.)' },
      ],
    },
    realWorld:
      'On the MV Hondius, initial testing for influenza, COVID-19, and legionella all came back negative. It took two rounds of negative results before clinicians in South Africa tested for hantavirus — a rarely considered diagnosis. This diagnostic delay cost critical time. Companies like Cepheid (Danaher) and BioMérieux make multiplexed PCR platforms that could include hantavirus on respiratory panels.',
    courseId: 'health-101-10',
    courseTitle: 'Diagnostic Technology',
  },

  'ihr-notifications': {
    id: 'ihr-notifications',
    term: 'IHR (International Health Regulations)',
    definition:
      'A legally binding framework of 196 countries that requires WHO member states to detect, assess, report, and respond to public health events that may cross borders. The IHR notification cascade compresses the time between outbreak detection and global response from weeks to hours.',
    template: 'timeline',
    templateData: {
      events: [
        { year: '2005', label: 'Current IHR adopted after SARS' },
        { year: '2009', label: 'H1N1 declared PHEIC under IHR' },
        { year: '2020', label: 'COVID-19 PHEIC — IHR stress-tested' },
        { year: '2025', label: 'US withdraws from WHO — exits IHR framework' },
        { year: '2026', label: 'MV Hondius outbreak: US gets no formal IHR notification' },
      ],
    },
    realWorld:
      'The IHR notification cascade is not a diplomatic nicety — it is the system that compresses outbreak detection-to-response timelines. Without it, the US receives the same information as anyone with an internet connection, on the same timeline. During the 2026 FIFA World Cup, this gap means American public health authorities may learn about relevant outbreaks later than countries still in the WHO system.',
    courseId: 'geopolitics-101-3',
    courseTitle: 'Global Health Governance',
  },

  /* ════════════════════════════════════════════════════════════════════════
     Semiconductor / Silicon Shield article keywords
     ════════════════════════════════════════════════════════════════════════ */

  'nanometer-process': {
    id: 'nanometer-process',
    term: 'Nanometer Process Node',
    definition:
      'The "nm" number (e.g., 2nm, 7nm) refers to the size of transistor features on a chip. Smaller nodes pack more transistors per square millimeter, delivering higher performance and lower power consumption. TSMC leads at 2nm; China\'s SMIC targets 7nm domestically.',
    template: 'comparison',
    templateData: {
      title: 'Process node comparison',
      headers: ['Node', 'Transistor density', 'Performance vs 7nm', 'Leading producer'],
      rows: [
        { label: '2nm', cells: ['~490M/mm²', '+45% perf, −75% power', 'TSMC (2025+)'] },
        { label: '3nm', cells: ['~290M/mm²', '+30% perf, −35% power', 'TSMC, Samsung'] },
        { label: '5nm', cells: ['~170M/mm²', '+15% perf, −20% power', 'TSMC, Samsung'] },
        { label: '7nm', cells: ['~96M/mm²', 'Baseline', 'TSMC, Samsung, SMIC (limited)'] },
      ],
      footnote: 'Smaller node = more powerful, more efficient, and much harder to manufacture.',
    },
    realWorld:
      'Each node shrink costs $15-20 billion in fab construction and takes 3-5 years of R&D. This is why only TSMC and Samsung can manufacture at the leading edge — the capital barrier is insurmountable for most companies.',
    courseId: 'tech-fundamentals-8',
    courseTitle: 'Semiconductor Manufacturing',
  },

  chokepoint: {
    id: 'chokepoint',
    term: 'Economic Chokepoint',
    definition:
      "A single point in a supply chain where disruption would cascade through the entire global economy. Taiwan's chip manufacturing is the most consequential chokepoint — more concentrated than oil (multiple producers) or rare earths (substitutes exist).",
    template: 'comparison',
    templateData: {
      title: 'Global economic chokepoints',
      headers: ['Chokepoint', 'Controls', 'Disruption impact'],
      rows: [
        {
          label: 'Taiwan (TSMC)',
          cells: ['90% advanced chips', 'Global tech, AI, military — $600B-$1T GDP hit'],
        },
        {
          label: 'Strait of Hormuz',
          cells: ['20% global oil', 'Energy prices, inflation — $200-400B GDP hit'],
        },
        {
          label: 'ASML (Netherlands)',
          cells: ['100% EUV lithography machines', 'No new advanced fabs without ASML'],
        },
      ],
      footnote:
        'TSMC + ASML together form a two-node chokepoint — you need both to make advanced chips.',
    },
    realWorld:
      'The concentration of advanced chip manufacturing in Taiwan is more extreme than oil in the Middle East. At least 13 countries produce significant oil. Only one company produces 90%+ of advanced chips.',
    courseId: 'geopolitics-101-4',
    courseTitle: 'Supply Chain Geopolitics',
  },

  'pure-play-foundry': {
    id: 'pure-play-foundry',
    term: 'Pure-Play Foundry Model',
    definition:
      'A business model where a company manufactures chips designed by other companies, without designing or selling its own branded chips. Invented by Morris Chang at TSMC in 1987. This eliminated the conflict of interest that prevented chip designers from outsourcing to competitors.',
    template: 'schema',
    templateData: {
      title: 'How the foundry model works',
      nodes: [
        { label: 'Chip designer (Nvidia, Apple, AMD) creates design' },
        { label: 'Sends design files to TSMC' },
        { label: 'TSMC manufactures on its fab lines' },
        { label: 'Ships finished wafers back to designer' },
        { label: 'Designer packages, tests, and sells to end customers' },
      ],
    },
    realWorld:
      'Before TSMC, every major chip company had to build its own fabs ($10B+ each). The foundry model let startups like Nvidia focus entirely on design while TSMC handled the capital-intensive manufacturing. This unlocked the fabless revolution.',
    courseId: 'tech-fundamentals-9',
    courseTitle: 'Semiconductor Business Models',
  },

  'silicon-shield': {
    id: 'silicon-shield',
    term: 'Silicon Shield',
    definition:
      "The geopolitical theory that Taiwan's semiconductor manufacturing dominance deters Chinese invasion — because disrupting TSMC would cause catastrophic global economic damage, compelling Taiwan's allies to intervene militarily.",
    template: 'schema',
    templateData: {
      title: 'Silicon shield deterrence logic',
      nodes: [
        { label: 'China considers invasion' },
        { label: 'TSMC operations disrupted/destroyed' },
        { label: 'Global chip supply collapses' },
        { label: 'Tech, auto, defense industries halt' },
        { label: '$600B-$1T global GDP loss' },
        { label: 'US/Japan/allies compelled to intervene' },
      ],
    },
    realWorld:
      'Former President Tsai Ing-wen explicitly named this strategy in Foreign Affairs in 2021. Critics argue the shield is weakening as the US and China build domestic chip capacity — reducing dependence on Taiwan and potentially reducing the deterrent.',
    courseId: 'geopolitics-101-5',
    courseTitle: 'Taiwan & Semiconductor Geopolitics',
  },

  'chips-act': {
    id: 'chips-act',
    term: 'CHIPS and Science Act',
    definition:
      'A US federal law signed in 2022 providing $52 billion in subsidies and tax credits to incentivize domestic semiconductor manufacturing. The largest recipients include TSMC ($6.6B for Arizona fab), Intel ($8.5B for Ohio/Arizona), and Samsung ($6.4B for Texas).',
    template: 'comparison',
    templateData: {
      title: 'Major CHIPS Act recipients',
      headers: ['Company', 'Award', 'Location', 'Commitment'],
      rows: [
        { label: 'Intel', cells: ['$8.5B', 'Ohio, Arizona, Oregon', '$100B total investment'] },
        { label: 'TSMC', cells: ['$6.6B', 'Phoenix, Arizona', '$165B total investment'] },
        { label: 'Samsung', cells: ['$6.4B', 'Taylor, Texas', '$45B total investment'] },
        { label: 'Micron', cells: ['$6.1B', 'New York, Idaho', '$50B total investment'] },
      ],
      footnote: 'Total CHIPS Act funding: $52.7B in manufacturing incentives + $13.2B in R&D.',
    },
    realWorld:
      'The CHIPS Act is the largest US industrial policy intervention since the Interstate Highway Act. It reflects bipartisan recognition that semiconductor manufacturing is a national security priority, not just an economic one.',
    courseId: 'policy-101-1',
    courseTitle: 'Industrial Policy & Markets',
  },

  'made-in-china-2025': {
    id: 'made-in-china-2025',
    term: 'Made in China 2025',
    definition:
      "A Chinese industrial policy announced in 2015 aiming to transform China into a high-tech manufacturing superpower by 2025. Semiconductors were a key target — China aimed for 70% chip self-sufficiency by 2025 but achieved only ~33%, making it the strategy's biggest shortfall.",
    template: 'timeline',
    templateData: {
      events: [
        { year: '2015', label: 'Made in China 2025 announced — 70% chip self-sufficiency target' },
        { year: '2020', label: 'US export controls block ASML EUV sales to China' },
        { year: '2023', label: "Huawei's Mate 60 Pro uses SMIC 7nm chip — surprise breakthrough" },
        { year: '2025', label: 'China reaches ~33% self-sufficiency — misses 70% target' },
        { year: '2026', label: 'New 80% target set for 2030 by Chinese chip executives' },
      ],
    },
    realWorld:
      "China's chip ambitions are real but constrained. Without access to ASML's EUV lithography machines (blocked by US/Dutch export controls), Chinese fabs cannot manufacture below ~7nm using standard techniques. SMIC's 7nm breakthrough used older DUV equipment in a multi-patterning process that is slower, more expensive, and lower-yield than EUV.",
    courseId: 'geopolitics-101-6',
    courseTitle: "China's Technology Strategy",
  },

  'two-nanometer': {
    id: 'two-nanometer',
    term: '2-Nanometer Chips',
    definition:
      "The current leading edge of semiconductor manufacturing. TSMC's 2nm (N2) process uses Gate-All-Around (GAA) transistor architecture — a fundamental redesign from FinFET transistors used since 2012. 2nm chips deliver 45% more performance at 75% less power vs 7nm.",
    template: 'comparison',
    templateData: {
      title: '2nm vs 7nm chips',
      headers: ['Metric', '7nm', '2nm', 'Improvement'],
      rows: [
        { label: 'Performance', cells: ['Baseline', '+45%', '1.45× faster'] },
        { label: 'Power', cells: ['Baseline', '−75%', '4× more efficient'] },
        { label: 'Density', cells: ['96M/mm²', '~490M/mm²', '5× more transistors'] },
        { label: 'Fab cost', cells: ['~$5B', '~$20B+', '4× more expensive to build'] },
      ],
      footnote:
        'Only TSMC and Samsung are attempting 2nm production. Intel targets 18A (roughly equivalent).',
    },
    realWorld:
      'For AI training, the difference between 7nm and 2nm is roughly the difference between training a model in 6 months versus 6 weeks — same compute, fraction of the power bill. This is why every hyperscaler is competing for TSMC 2nm allocation.',
    courseId: 'tech-fundamentals-8',
    courseTitle: 'Semiconductor Manufacturing',
  },

  'fabless-model': {
    id: 'fabless-model',
    term: 'Fabless Semiconductor Company',
    definition:
      'A company that designs chips but does not own fabrication facilities (fabs). Instead, it outsources manufacturing to foundries like TSMC. Nvidia, AMD, Qualcomm, Apple, and Broadcom are all fabless — they design the chips that TSMC manufactures.',
    template: 'comparison',
    templateData: {
      title: 'Fabless vs IDM vs Foundry',
      headers: ['Model', 'Design?', 'Manufacture?', 'Examples'],
      rows: [
        { label: 'Fabless', cells: ['Yes', 'No (outsource)', 'Nvidia, AMD, Qualcomm, Apple'] },
        { label: 'IDM', cells: ['Yes', 'Yes (own fabs)', 'Intel, Micron, Texas Instruments'] },
        {
          label: 'Foundry',
          cells: ['No', 'Yes (for others)', 'TSMC, Samsung Foundry, GlobalFoundries'],
        },
      ],
      footnote:
        "Fabless companies capture the highest margins — Nvidia's net margin is ~52% vs Intel's negative.",
    },
    realWorld:
      'The fabless model is why Nvidia can be worth $5 trillion without owning a single factory. All the manufacturing risk, capital expenditure, and yield headaches belong to TSMC. Nvidia focuses purely on design, software, and ecosystem — the highest-margin activities.',
    courseId: 'tech-fundamentals-9',
    courseTitle: 'Semiconductor Business Models',
  },

  idm: {
    id: 'idm',
    term: 'Integrated Device Manufacturer (IDM)',
    definition:
      'A semiconductor company that both designs AND manufactures its own chips in its own fabrication facilities. Intel is the most prominent IDM. The model requires massive capital expenditure ($20B+ per fab) but provides full control over the manufacturing process.',
    template: 'schema',
    templateData: {
      title: 'IDM value chain (fully vertical)',
      nodes: [
        { label: 'Chip design (in-house)' },
        { label: 'Wafer fabrication (own fabs)' },
        { label: 'Testing & packaging' },
        { label: 'Sales to OEMs and consumers' },
      ],
    },
    realWorld:
      "Intel's struggle illustrates the IDM challenge: you must be world-class at BOTH design and manufacturing simultaneously. When Intel fell behind TSMC in manufacturing (stuck at 10nm while TSMC shipped 5nm), its entire product line suffered — because unlike Nvidia, Intel couldn't just switch to a better foundry.",
    courseId: 'tech-fundamentals-9',
    courseTitle: 'Semiconductor Business Models',
  },

  'idm-2-0': {
    id: 'idm-2-0',
    term: 'IDM 2.0 Strategy',
    definition:
      "Intel's strategic pivot announced in 2021: splitting into separate design and foundry divisions, and opening Intel's fabs to manufacture chips for external customers (Intel Foundry Services / IFS). The goal is to combine IDM vertical integration with foundry-model revenue.",
    template: 'timeline',
    templateData: {
      events: [
        { year: '2021', label: 'Pat Gelsinger announces IDM 2.0 at Intel' },
        { year: '2022', label: 'IFS launched — Intel accepts external foundry orders' },
        { year: '2024', label: 'Intel 18A process in development (comparable to 2nm)' },
        { year: '2025', label: 'CHIPS Act awards Intel $8.5B for Ohio/Arizona fabs' },
        { year: '2026', label: 'Intel reports -$20.5B net income TTM — turnaround uncertain' },
      ],
    },
    realWorld:
      "IDM 2.0 is Intel's bet-the-company strategy. If it works, Intel becomes both a leading chip designer AND a TSMC competitor. If it fails, Intel may need to split or sell its foundry business. The -$20.5B net income shows the cost of this transition — Intel is spending massively on new fabs while its existing products lose market share to AMD and Nvidia.",
    courseId: 'tech-fundamentals-10',
    courseTitle: "Intel's Transformation",
  },

  terafab: {
    id: 'terafab',
    term: 'Terafab',
    definition:
      "Elon Musk's planned advanced chip fabrication facility in Texas for Tesla and SpaceX. The concept consolidates every stage of semiconductor production — design, fabrication, packaging, testing — under one roof. Estimated cost: $25 billion.",
    template: 'schema',
    templateData: {
      title: 'Terafab concept: vertically integrated chip production',
      nodes: [
        { label: 'Chip design (Tesla AI team)' },
        { label: 'Wafer fabrication (on-site)' },
        { label: 'Advanced packaging' },
        { label: 'Testing & validation' },
        { label: 'Direct integration into Tesla/SpaceX products' },
      ],
    },
    realWorld:
      "Musk's motivation: TSMC cannot produce enough chips for Tesla's Full Self-Driving compute needs and SpaceX's Starlink satellite processors. Building a captive fab eliminates supply chain dependence but requires replicating capabilities that took TSMC 37 years to develop.",
    courseId: 'tech-fundamentals-11',
    courseTitle: 'Vertical Integration in Tech',
  },

  /* Africa $1B+ Companies article keywords */
  'frontier-markets': {
    id: 'frontier-markets',
    term: 'Frontier Markets',
    definition:
      'A classification for countries that are less developed than emerging markets but have functioning capital markets. They offer high growth potential paired with higher political, currency, and liquidity risk. MSCI classifies markets into Developed, Emerging, and Frontier tiers.',
    template: 'comparison',
    templateData: {
      title: 'Market classification tiers',
      headers: ['Tier', 'Examples', 'Risk profile'],
      rows: [
        { label: 'Developed', cells: ['US, UK, Japan, Germany', 'Lowest risk, deep liquidity'] },
        {
          label: 'Emerging',
          cells: ['China, India, Brazil, South Africa', 'Moderate risk, growing liquidity'],
        },
        {
          label: 'Frontier',
          cells: ['Nigeria, Kenya, Vietnam, Morocco', 'High risk, thin liquidity'],
        },
      ],
      footnote:
        'Many African markets sit in the Frontier tier — high potential return, high volatility.',
    },
    realWorld:
      "When the article says Africa's corporate landscape is deeper than investors realize, it's referring to opportunities in frontier markets that don't show up in standard emerging-market indices. Most global portfolios have zero frontier-market exposure.",
    courseId: 'global-1',
    courseTitle: 'Frontier vs Emerging Markets',
  },

  jse: {
    id: 'jse',
    term: 'Johannesburg Stock Exchange (JSE)',
    definition:
      "Africa's largest and oldest stock exchange, founded in 1887 in Johannesburg, South Africa. The JSE hosts most of Africa's largest companies and is the primary capital markets infrastructure for the continent.",
    template: 'comparison',
    templateData: {
      title: 'Major African stock exchanges',
      headers: ['Exchange', 'Country', 'Listed companies'],
      rows: [
        { label: 'JSE', cells: ['South Africa', '~330 companies'] },
        { label: 'EGX', cells: ['Egypt', '~220 companies'] },
        { label: 'NSE', cells: ['Nigeria', '~150 companies'] },
        { label: 'NSE Kenya', cells: ['Kenya', '~60 companies'] },
        { label: 'Casablanca', cells: ['Morocco', '~75 companies'] },
      ],
      footnote: 'The JSE alone accounts for over 80% of African market capitalization.',
    },
    realWorld:
      "South Africa's 147 billion-dollar companies are almost all listed on the JSE. Names like Naspers, FirstRand, Sasol, and MTN Group are JSE primary listings and are how foreign investors get the cleanest exposure to African corporate value.",
    courseId: 'global-2',
    courseTitle: 'African Capital Markets',
  },

  'extractive-industries': {
    id: 'extractive-industries',
    term: 'Extractive Industries',
    definition:
      'Sectors that extract natural resources from the earth — primarily oil & gas, mining (metals and minerals), and forestry. African economies are often heavily exposed to extractives, which creates both opportunity and concentration risk.',
    template: 'schema',
    templateData: {
      title: 'African extractive concentrations',
      nodes: [
        {
          label: 'Oil & Gas',
          sectors: ['Nigeria', 'Angola', 'Algeria', 'Libya'],
          color: '#f59e0b',
        },
        { label: 'Mining (Metals)', sectors: ['South Africa', 'DRC', 'Zambia'], color: '#10b981' },
        { label: 'Phosphates', sectors: ['Morocco'], color: '#3b82f6' },
        { label: 'Diamonds', sectors: ['Botswana', 'Namibia'], color: '#a855f7' },
      ],
    },
    realWorld:
      "Angola's 9 billion-dollar companies are almost entirely petroleum. The DRC's 4 are dominated by copper and cobalt — both critical for EV batteries. Resource concentration means these economies are highly exposed to commodity price cycles.",
    courseId: 'sector-2',
    courseTitle: 'Commodities & Extractives',
  },

  'm-pesa': {
    id: 'm-pesa',
    term: 'M-Pesa & Mobile Money',
    definition:
      'M-Pesa is a mobile-phone-based money transfer service launched by Safaricom in Kenya in 2007. It processes more annual transactions in sub-Saharan Africa than PayPal does globally and is the textbook example of African financial technology leapfrogging traditional banking infrastructure.',
    template: 'timeline',
    templateData: {
      events: [
        { date: '2007', label: 'M-Pesa launches in Kenya' },
        { date: '2010', label: 'Crosses 10M users' },
        { date: '2014', label: 'Expands to Tanzania, India, Romania' },
        { date: '2020', label: '50M active users across 7 countries' },
        { date: '2024', label: 'Processes >$300B annual transaction volume' },
      ],
    },
    realWorld:
      "Safaricom (Kenya's flagship telecom) is one of Eastern Africa's 6 billion-dollar companies almost entirely because of M-Pesa. The platform has more users than the entire Kenyan banking system serves — a perfect example of mobile-first financial leapfrogging.",
    courseId: 'fintech-3',
    courseTitle: 'Mobile Money & Fintech in EM',
  },

  'currency-controls': {
    id: 'currency-controls',
    term: 'Currency Controls / Capital Controls',
    definition:
      'Government restrictions on the movement of money into and out of a country. Common forms include limits on foreign currency purchases, restrictions on repatriating profits, and forced conversion of foreign earnings at official rates rather than market rates.',
    template: 'schema',
    templateData: {
      title: 'Common forms of capital controls',
      nodes: [
        {
          label: 'Inflow controls',
          sectors: ['Limits on foreign equity stakes', 'Reserve requirements on inflows'],
          color: '#f59e0b',
        },
        {
          label: 'Outflow controls',
          sectors: ['Limits on dividend repatriation', 'Forced FX conversion'],
          color: '#ef4444',
        },
        {
          label: 'Exchange rate',
          sectors: ['Multi-tier official rates', 'Black-market premia'],
          color: '#a855f7',
        },
      ],
    },
    realWorld:
      'Capital controls are a major risk for investors in many African markets. Egypt, Nigeria, and Ethiopia have all imposed restrictions on dollar conversion at various points. A 30% return in local currency can become a 0% return after FX conversion — or worse if the official rate diverges from market.',
    courseId: 'risk-3',
    courseTitle: 'EM Capital Controls',
  },

  'leapfrog-development': {
    id: 'leapfrog-development',
    term: 'Leapfrog Development',
    definition:
      'When an economy skips an entire stage of technology development that more advanced economies passed through. African markets famously leapfrogged fixed-line telephones (going straight to mobile) and traditional banking (going straight to mobile money).',
    template: 'comparison',
    templateData: {
      title: 'African technology leapfrog examples',
      headers: ['Technology', 'Skipped stage', 'Adopted stage'],
      rows: [
        { label: 'Telecom', cells: ['Fixed landlines', 'Mobile (1G/2G/3G/4G/5G)'] },
        { label: 'Finance', cells: ['Bank branches & checks', 'Mobile money (M-Pesa)'] },
        { label: 'Internet', cells: ['Dial-up + DSL', 'Mobile data + fiber'] },
        { label: 'Energy', cells: ['Centralized grids', 'Solar microgrids'] },
      ],
      footnote:
        'Leapfrogging means new infrastructure can be deployed without first decommissioning old infrastructure.',
    },
    realWorld:
      "The MTN Group is Africa's largest telecom company precisely because the continent skipped the fixed-line phase. The same dynamic is now playing out with solar microgrids replacing the need to extend centralized national power grids to rural areas.",
    courseId: 'global-4',
    courseTitle: 'Leapfrog Development',
  },

  'demographic-dividend': {
    id: 'demographic-dividend',
    term: 'Demographic Dividend',
    definition:
      "The economic growth that can result from a shift in a country's age structure — specifically when the working-age population grows larger relative to dependents (children + elderly). Africa has the youngest population of any continent, with 60% under age 25.",
    template: 'schema',
    templateData: {
      title: 'Africa demographic profile (2026)',
      nodes: [
        { label: 'Under 15', sectors: ['~40% of population'], color: '#10b981' },
        { label: '15-24', sectors: ['~20% of population'], color: '#3b82f6' },
        { label: '25-64', sectors: ['~37% of population'], color: '#f59e0b' },
        { label: '65+', sectors: ['~3% of population'], color: '#a855f7' },
      ],
    },
    realWorld:
      "Africa's demographic dividend is the structural bull case for the continent. Over the next 30 years, the working-age population is expected to nearly double. If those workers find productive employment, it's the largest growth tailwind in the global economy.",
    courseId: 'macro-4',
    courseTitle: 'Demographic Investing',
  },

  'phosphate-reserves': {
    id: 'phosphate-reserves',
    term: 'Phosphate Reserves',
    definition:
      "Phosphate rock is a non-renewable mineral that is the primary source of phosphorus — a critical input for synthetic fertilizers. Without phosphorus, modern agricultural yields would collapse. Morocco controls roughly 70% of the world's economically extractable phosphate reserves.",
    template: 'comparison',
    templateData: {
      title: 'World phosphate reserves (USGS estimates)',
      headers: ['Country', 'Reserves (Mt)', 'Share'],
      rows: [
        { label: 'Morocco + W. Sahara', cells: ['~50,000', '~70%'] },
        { label: 'China', cells: ['~3,200', '~4.5%'] },
        { label: 'Egypt', cells: ['~2,800', '~4%'] },
        { label: 'Algeria', cells: ['~2,200', '~3%'] },
        { label: 'Others', cells: ['~13,000', '~18%'] },
      ],
      footnote:
        'Phosphate dependence makes OCP Group (state-controlled Moroccan producer) strategically critical to global food security.',
    },
    realWorld:
      "OCP Group is one of Morocco's most valuable companies and a key reason Morocco has 20 billion-dollar firms. As global food demand grows and finite phosphate reserves deplete, Morocco's position is structurally appreciating — similar to OPEC's position in oil.",
    courseId: 'sector-3',
    courseTitle: 'Critical Minerals',
  },

  'imf-program': {
    id: 'imf-program',
    term: 'IMF Structural Adjustment Program',
    definition:
      'A lending arrangement where the International Monetary Fund provides financing to a country experiencing balance-of-payments problems in exchange for the country implementing specific economic reforms — typically including currency devaluation, subsidy reduction, fiscal tightening, and market liberalization.',
    template: 'timeline',
    templateData: {
      events: [
        { date: '1980s', label: 'Original "structural adjustment" era — controversial in Africa' },
        { date: '2016', label: 'Egypt $12B program — floats EGP, reforms subsidies' },
        { date: '2019', label: 'Argentina program collapses, $57B unwinds' },
        { date: '2022', label: 'Egypt + Pakistan + Sri Lanka all back at IMF table' },
        { date: '2024', label: 'Egypt expands program to $8B addition' },
      ],
    },
    realWorld:
      "Egypt's economic reforms since 2016 have been driven by IMF program conditions: floating the pound, slashing subsidies, raising interest rates. The short-term cost was painful for consumers but improved the operating environment for large corporates — which is why Egypt now has 33 billion-dollar companies.",
    courseId: 'macro-5',
    courseTitle: 'IMF & Sovereign Debt',
  },

  /* NVIDIA Most Valuable article keywords */
  cuda: {
    id: 'cuda',
    term: 'CUDA',
    definition:
      "CUDA (Compute Unified Device Architecture) is NVIDIA's proprietary programming platform and API for running general-purpose computation on its GPUs. Released in 2007, CUDA has become the standard for high-performance computing — and the network effect locks in NVIDIA's market position.",
    template: 'schema',
    templateData: {
      title: "CUDA's lock-in effect",
      nodes: [
        {
          label: 'Developers',
          sectors: ['~4 million CUDA developers worldwide'],
          color: '#10b981',
        },
        {
          label: 'Libraries',
          sectors: ['cuDNN, cuBLAS, TensorRT', 'Optimized for NVIDIA only'],
          color: '#3b82f6',
        },
        {
          label: 'Frameworks',
          sectors: ['PyTorch + TensorFlow', 'Default CUDA backend'],
          color: '#f59e0b',
        },
        {
          label: 'Switching cost',
          sectors: ['Port CUDA code to AMD ROCm', 'Months of engineering work'],
          color: '#ef4444',
        },
      ],
    },
    realWorld:
      "AMD's MI300X chip has performance comparable to NVIDIA's H100, but enterprise buyers still choose NVIDIA because their existing code runs on CUDA. Switching to AMD's ROCm framework requires re-engineering software — most teams won't pay that cost even for cheaper hardware.",
    courseId: 'tech-5',
    courseTitle: 'CUDA & AI Software Stacks',
  },

  hyperscalers: {
    id: 'hyperscalers',
    term: 'Hyperscalers',
    definition:
      "The largest cloud computing providers — primarily Amazon AWS, Microsoft Azure, Google Cloud, and Meta. They operate hundreds of data centers globally and represent the bulk of enterprise AI capex. NVIDIA's revenue is concentrated in selling GPUs to this small group of buyers.",
    template: 'comparison',
    templateData: {
      title: 'Hyperscaler AI capex (2025-26 estimates)',
      headers: ['Company', '2025 capex', '2026 estimate'],
      rows: [
        { label: 'Amazon', cells: ['~$83B', '~$110B'] },
        { label: 'Microsoft', cells: ['~$80B', '~$95B'] },
        { label: 'Google', cells: ['~$75B', '~$85B'] },
        { label: 'Meta', cells: ['~$40B', '~$55B'] },
      ],
      footnote:
        'A large share of this capex flows directly into NVIDIA GPUs, networking, and software.',
    },
    realWorld:
      "Roughly 40-50% of NVIDIA's data center revenue comes from just 4-5 hyperscaler customers. That concentration is the bull case (these customers have endless demand) AND the bear case (if any of them slows, NVIDIA revenue decelerates fast).",
    courseId: 'tech-6',
    courseTitle: 'Cloud Hyperscalers',
  },

  'tsmc-foundry': {
    id: 'tsmc-foundry',
    term: 'TSMC & Foundry Model',
    definition:
      "Taiwan Semiconductor Manufacturing Company (TSMC) is the world's largest contract chip manufacturer. Under the 'foundry model', TSMC manufactures chips designed by other companies (NVIDIA, AMD, Apple, Qualcomm) instead of designing its own. TSMC owns ~60% of the global foundry market and 90%+ of the advanced (5nm and below) node market.",
    template: 'schema',
    templateData: {
      title: 'Semiconductor value chain',
      nodes: [
        { label: 'Design', sectors: ['NVIDIA, AMD, Apple, Qualcomm'], color: '#10b981' },
        { label: 'Manufacture', sectors: ['TSMC, Samsung, Intel Foundry'], color: '#3b82f6' },
        { label: 'Equipment', sectors: ['ASML, Applied Materials, LAM'], color: '#f59e0b' },
        { label: 'Packaging', sectors: ['ASE, Amkor, TSMC-CoWoS'], color: '#a855f7' },
      ],
    },
    realWorld:
      "Every NVIDIA H100, B100, and GB200 is physically manufactured at TSMC in Taiwan on 4nm or 3nm process nodes. TSMC's $2.04T market cap reflects its role as the critical-path supplier for the entire AI build-out — without TSMC capacity, NVIDIA can't ship chips no matter how high demand goes.",
    courseId: 'tech-7',
    courseTitle: 'Foundry Model & TSMC',
  },

  'blackwell-architecture': {
    id: 'blackwell-architecture',
    term: 'Blackwell Architecture',
    definition:
      "NVIDIA's chip architecture announced in March 2024, succeeding the Hopper architecture (H100). Blackwell GPUs (B100, B200, GB200) deliver roughly 4x the training throughput and 30x the inference throughput of H100, in a similar power envelope. The Blackwell ramp began at scale in Q1 2026.",
    template: 'timeline',
    templateData: {
      events: [
        { date: '2017', label: 'Volta (V100) — first datacenter Tensor Cores' },
        { date: '2020', label: 'Ampere (A100) — early generative AI training' },
        { date: '2022', label: 'Hopper (H100) — ChatGPT era workhorse' },
        { date: '2024', label: 'Blackwell announced at GTC 2024' },
        { date: '2026', label: 'Blackwell scale ramp + Rubin announced' },
      ],
    },
    realWorld:
      "The Blackwell ramp is the single biggest factor in NVIDIA's $5T+ valuation. Each Blackwell unit ships at higher ASPs (average selling prices) and higher margins than Hopper, AND the performance jump pulls forward hyperscaler capex that would have been spread over 2-3 years.",
    courseId: 'tech-8',
    courseTitle: 'GPU Architecture Generations',
  },

  'mag-7': {
    id: 'mag-7',
    term: 'Magnificent 7',
    definition:
      'Term coined by Bank of America in 2023 to describe the seven largest US technology stocks driving market returns: Apple, Microsoft, Alphabet (Google), Amazon, Meta, NVIDIA, and Tesla. These seven companies have together accounted for the majority of S&P 500 returns since 2023.',
    template: 'comparison',
    templateData: {
      title: 'Magnificent 7 market caps (May 2026)',
      headers: ['Company', 'Market cap', 'Primary business'],
      rows: [
        { label: 'NVIDIA', cells: ['$5.34T', 'AI accelerators'] },
        { label: 'Alphabet', cells: ['$4.66T', 'Search + cloud + AI'] },
        { label: 'Apple', cells: ['$4.39T', 'Consumer hardware + services'] },
        { label: 'Microsoft', cells: ['$3.10T', 'Cloud + enterprise software'] },
        { label: 'Amazon', cells: ['$2.79T', 'E-commerce + AWS cloud'] },
        { label: 'Meta', cells: ['~$1.5T', 'Social + ads + AI infra'] },
        { label: 'Tesla', cells: ['~$1T', 'EVs + energy storage'] },
      ],
      footnote:
        '6 of these 7 are exposed to AI infrastructure either as buyer or seller — NVIDIA sits at the center of the trade.',
    },
    realWorld:
      'When NVIDIA became the #2 most valuable asset behind only gold, it reshuffled the order INSIDE the Magnificent 7. Three years ago, Apple was the clear leader. Now NVIDIA, GOOG, and AAPL all sit above $4T — and NVIDIA is on top.',
    courseId: 'stocks-3',
    courseTitle: 'Magnificent 7 Stocks',
  },

  'inference-vs-training': {
    id: 'inference-vs-training',
    term: 'AI Training vs Inference',
    definition:
      'Two distinct workloads in AI computing. Training is the one-time (or periodic) process of building a model from data — it requires massive compute clusters running for weeks. Inference is running the trained model to answer queries — it requires less compute per request but happens billions of times per day across all users.',
    template: 'comparison',
    templateData: {
      title: 'Training vs inference characteristics',
      headers: ['Property', 'Training', 'Inference'],
      rows: [
        { label: 'Frequency', cells: ['Periodic (weeks-months)', 'Continuous (every user query)'] },
        { label: 'Compute pattern', cells: ['Huge bursts', 'Steady stream'] },
        { label: 'Cost per query', cells: ['N/A (one-time)', 'Pennies to dollars'] },
        {
          label: 'Growth trajectory',
          cells: ['Slowing as models mature', 'Accelerating with adoption'],
        },
        { label: 'Hardware', cells: ['NVIDIA dominant', 'NVIDIA dominant + custom ASICs'] },
      ],
      footnote:
        'The inference workload is becoming the larger market — every enterprise needs continuous inference capacity.',
    },
    realWorld:
      "NVIDIA Blackwell's 30x inference throughput improvement over Hopper is more important than its 4x training improvement, because inference workloads are growing faster than training. Every ChatGPT query is an inference call — and there are billions per day.",
    courseId: 'tech-9',
    courseTitle: 'AI Training & Inference',
  },

  'gold-store-of-value': {
    id: 'gold-store-of-value',
    term: 'Gold as Store of Value',
    definition:
      'Gold has functioned as a monetary asset for ~5,000 years because of its scarcity, durability, and divisibility. Roughly 215,000 tonnes have been mined globally — most of it still exists in jewelry, bullion, and central bank reserves. Gold is the asset most often bought as a hedge against currency debasement, inflation, and crisis.',
    template: 'schema',
    templateData: {
      title: "Where the world's gold sits",
      nodes: [
        { label: 'Jewelry', sectors: ['~46% of stock'], color: '#f59e0b' },
        { label: 'Private investment', sectors: ['~22% (bullion + coins)'], color: '#10b981' },
        { label: 'Central bank reserves', sectors: ['~17% (35,000+ tonnes)'], color: '#3b82f6' },
        { label: 'Industrial / other', sectors: ['~15%'], color: '#a855f7' },
      ],
    },
    realWorld:
      "When the article puts NVIDIA's $5.34T next to gold's $31.19T, the comparison is about durability vs growth. Gold has been accumulating value for millennia and has zero counterparty risk. NVIDIA has been at this scale for 30 months and depends entirely on AI capex continuing.",
    courseId: 'macro-6',
    courseTitle: 'Gold & Monetary Assets',
  },

  'capex-cycle': {
    id: 'capex-cycle',
    term: 'AI Capex Cycle',
    definition:
      'Capital expenditure (capex) cycles are multi-year periods of elevated industry investment that eventually peak and unwind. The current AI capex cycle began in early 2023 with the launch of ChatGPT. The market is pricing in 30%+ annual growth in hyperscaler AI spending continuing for years — any deceleration would reprice the sector aggressively.',
    template: 'timeline',
    templateData: {
      events: [
        { date: 'Nov 2022', label: 'ChatGPT launches — kicks off cycle' },
        { date: '2023', label: 'Hyperscaler AI capex ramps from ~$130B to ~$200B' },
        { date: '2024', label: 'Capex hits ~$220B — NVIDIA data center revenue 3x YoY' },
        { date: '2025', label: 'Capex hits ~$300B — Blackwell ramp begins' },
        { date: '2026 est.', label: 'Capex ~$345B+ — sustained growth or peak?' },
      ],
    },
    realWorld:
      "NVIDIA's $5T+ valuation is fundamentally a bet that hyperscalers will keep growing their AI capex at 30-50% annually. The bear case is that AI model efficiency improves faster than expected — same intelligence, less compute — causing capex growth to stall or reverse.",
    courseId: 'macro-7',
    courseTitle: 'Capex Cycles & Cyclicals',
  },

  'sovereign-ai': {
    id: 'sovereign-ai',
    term: 'Sovereign AI',
    definition:
      'The push by national governments to build their own AI infrastructure — domestic data centers, locally-trained models, and indigenous compute capacity — rather than depending on US-hosted services. Sovereign AI initiatives are now active in the UK, EU, India, Japan, Saudi Arabia, UAE, Singapore, and others.',
    template: 'schema',
    templateData: {
      title: 'Major sovereign AI initiatives (2026)',
      nodes: [
        { label: 'Saudi Arabia', sectors: ['Humain', '$15B+ NVIDIA commitment'], color: '#10b981' },
        { label: 'UAE', sectors: ['G42 + Falcon model', 'TII NVIDIA cluster'], color: '#3b82f6' },
        { label: 'India', sectors: ['IndiaAI Mission', '$1.2B compute fund'], color: '#f59e0b' },
        { label: 'UK', sectors: ['AI Research Resource', '~£900M for GPUs'], color: '#a855f7' },
      ],
    },
    realWorld:
      "Sovereign AI is the underappreciated leg of NVIDIA's bull case. Hyperscaler demand is concentrated in 4-5 customers — but sovereign AI adds new buyers (national governments) whose demand has different drivers and is less correlated with US enterprise capex.",
    courseId: 'tech-10',
    courseTitle: 'Sovereign AI & Geopolitics',
  },

  /* Niche article-specific keywords (replaced general terms) */
  'buttonwood-agreement': {
    id: 'buttonwood-agreement',
    term: 'Buttonwood Agreement',
    definition:
      'A compact signed on May 17, 1792 by 24 stockbrokers under a buttonwood tree at 68 Wall Street, establishing rules for securities trading in New York. It created the precursor to the New York Stock Exchange by setting fixed commission rates and requiring brokers to trade only with each other. Before this, securities changed hands informally in coffeehouses and on street corners.',
    template: 'timeline',
    templateData: {
      events: [
        { year: '1790', label: 'First US government bonds issued — traded informally' },
        { year: '1792', label: 'Buttonwood Agreement signed — 24 brokers formalize trading' },
        { year: '1817', label: 'New York Stock & Exchange Board formed (becomes NYSE)' },
        { year: '1863', label: 'Renamed New York Stock Exchange' },
        { year: '1878', label: 'Telephones installed on NYSE trading floor' },
      ],
    },
    realWorld:
      'The Buttonwood Agreement matters because it established the principle of organized, rule-bound securities trading. Before it, buying shares meant finding a willing seller on the street. After it, there was a centralized marketplace with standardized rules — the seed of everything the modern stock market became.',
    courseId: 'market-history-1',
    courseTitle: 'Origins of US Capital Markets',
  },

  'hamiltonian-finance': {
    id: 'hamiltonian-finance',
    term: 'Hamiltonian Finance',
    definition:
      "Alexander Hamilton's economic program (1790-1791) that created the institutional architecture of American capital markets: federal assumption of state war debts, a national bank (First Bank of the United States), a mint, and customs revenue to service the debt. Hamilton's system made US government bonds the first widely traded securities and established the creditworthiness that attracted foreign capital.",
    template: 'timeline',
    templateData: {
      events: [
        { year: '1789', label: 'Hamilton becomes first Secretary of the Treasury' },
        { year: '1790', label: 'Federal assumption of $25M in state war debts' },
        { year: '1791', label: 'First Bank of the United States chartered (20-year term)' },
        { year: '1792', label: 'Panic of 1792 — first US financial crisis, Hamilton intervenes' },
        { year: '1811', label: 'First Bank charter expires; Second Bank chartered 1816' },
      ],
    },
    realWorld:
      "Hamilton's genius was recognizing that public debt, properly managed, could be a national asset. By making US bonds safe and liquid, he created the first instruments that attracted institutional capital — and the exchanges that emerged to trade them became the foundation of American capitalism.",
    courseId: 'market-history-1',
    courseTitle: 'Origins of US Capital Markets',
  },

  'coupon-clipping-era': {
    id: 'coupon-clipping-era',
    term: 'Coupon-Clipping Era',
    definition:
      'The period from roughly 1945-1980 when equity investing was dominated by income-oriented strategies. Institutional portfolios were constructed primarily around dividend yield and bond coupons rather than capital appreciation. The term "coupon clipper" described investors who literally cut interest coupons from physical bearer bonds to redeem them. During this era, a stock that didn\'t pay a generous dividend was considered speculative.',
    template: 'comparison',
    templateData: {
      title: 'Investment philosophy shift',
      headers: ['Era', 'Primary return source', 'Valuation metric'],
      rows: [
        {
          label: '1945-1980 (Coupon era)',
          cells: ['Dividends & coupons (income)', 'Dividend yield, payout ratio'],
        },
        {
          label: '1980-2000 (Growth era)',
          cells: ['Capital appreciation', 'P/E ratio, revenue growth'],
        },
        {
          label: '2010-present (Tech era)',
          cells: ['Share buybacks + appreciation', 'EV/Revenue, FCF yield'],
        },
      ],
      footnote:
        'The shift from income to growth investing fundamentally changed which sectors dominated the market.',
    },
    realWorld:
      'When the article describes energy and materials stocks paying "generous dividends" in the post-war era, it\'s describing the coupon-clipping mentality: investors held US Steel or Standard Oil for the quarterly checks, not for share price appreciation. That entire investment philosophy had to die for technology stocks — which reinvest everything — to dominate.',
    courseId: 'stocks-intermediate-5',
    courseTitle: 'Dividend Investing',
  },

  'marshall-plan-capital-formation': {
    id: 'marshall-plan-capital-formation',
    term: 'Marshall Plan Capital Formation',
    definition:
      "The European Recovery Program (1948-1952) channeled $13.3 billion ($173 billion in 2024 dollars) from the US to rebuild Western Europe. For American industrial companies, it created a captive export market: US Steel, Caterpillar, and energy majors sold materials and equipment at scale with payment guaranteed by the US government. This demand boom propelled the energy & materials sector's dominance of the US equity market through the 1950s-60s.",
    template: 'schema',
    templateData: {
      title: 'How the Marshall Plan fueled US equity sectors',
      nodes: [
        { label: 'US government funds $13.3B to Europe', sectors: [], color: '#10b981' },
        { label: 'European nations buy US steel, machinery, fuel', sectors: [], color: '#3b82f6' },
        { label: 'US industrials book massive export revenue', sectors: [], color: '#f59e0b' },
        { label: 'Energy & materials stocks dominate S&P', sectors: [], color: '#a855f7' },
      ],
    },
    realWorld:
      'The Marshall Plan was one of the most powerful demand catalysts in market history. American steel, oil, and heavy equipment companies had a government-backed customer (all of Western Europe) for over a decade. The sector dominance chart shows energy & materials peaking during exactly this window.',
    courseId: 'market-history-3',
    courseTitle: 'Post-War Economic Boom',
  },

  'revenue-multiple-valuation': {
    id: 'revenue-multiple-valuation',
    term: 'Revenue Multiple Valuation',
    definition:
      'A valuation method that prices a company as a multiple of its annual revenue (EV/Revenue or Price/Sales), rather than earnings. It emerged in the 1990s because many high-growth technology companies had no earnings — traditional P/E ratios were undefined. Revenue multiples allowed investors to compare and price companies like Amazon, Netscape, and Yahoo that were reinvesting all revenue into growth.',
    template: 'formula',
    templateData: {
      formula: 'EV/Revenue = Enterprise Value ÷ Annual Revenue',
      example: {
        title: 'Early Microsoft (1990)',
        substitution: '$6B market cap ÷ $1.18B revenue = 5.1× revenue',
      },
      tiers: [
        { label: 'Legacy industrial', value: '0.5–2× revenue', color: '#64748b' },
        { label: 'Mature tech', value: '3–8× revenue', color: '#3b82f6' },
        { label: 'High-growth SaaS', value: '10–30× revenue', color: '#f59e0b' },
        { label: 'Dot-com peak', value: '50–200× revenue', color: '#ef4444' },
      ],
    },
    realWorld:
      'When the article says the market "learned to value tech differently," this is what it means. Steel companies were valued on earnings. Software companies were valued on revenue — because earnings were deliberately zero (reinvested into growth). That conceptual leap changed which sectors could command premium valuations.',
    courseId: 'valuation-101-2',
    courseTitle: 'Valuation Methods',
  },

  'speculative-mania': {
    id: 'speculative-mania',
    term: 'Speculative Mania',
    definition:
      'A self-reinforcing cycle where rising asset prices attract more buyers, whose purchases drive prices higher still, detaching valuations from fundamentals. Manias follow a pattern identified by economist Hyman Minsky: displacement (new technology), boom (credit expansion), euphoria (everyone participates), profit-taking (smart money exits), panic (crash). The dot-com bubble of 1999-2000 is a textbook Minsky cycle.',
    template: 'timeline',
    templateData: {
      title: 'Minsky cycle in the dot-com bubble',
      events: [
        { year: '1995', label: 'Displacement — Netscape IPO proves internet is commercial' },
        { year: '1997-98', label: 'Boom — venture capital floods in, IPOs multiply' },
        { year: '1999', label: 'Euphoria — day traders, pets.com, $10T NASDAQ' },
        { year: 'Mar 2000', label: 'Profit-taking — insiders begin selling' },
        { year: '2001-02', label: 'Panic — NASDAQ falls 78%, $5T in value destroyed' },
      ],
    },
    realWorld:
      'The dot-com mania followed Minsky\'s pattern precisely. The "displacement" was real (the internet DID change everything), but the euphoria phase detached stock prices from any rational valuation. The crash destroyed temporary companies but left permanent infrastructure — the fiber, the data centers, the software platforms that the next era was built on.',
    courseId: 'market-history-2',
    courseTitle: 'Market Bubbles & Crashes',
  },

  'glass-preform-oligopoly': {
    id: 'glass-preform-oligopoly',
    term: 'Glass Preform Oligopoly',
    definition:
      "The fiber optic industry's critical bottleneck: glass preforms — cylindrical rods of ultra-pure silica from which optical fiber is drawn. Only three companies (Corning, Prysmian, YOFC) control ~60% of global preform manufacturing capacity. Preform production requires proprietary vapor deposition techniques (OVD, VAD, MCVD) and 18-24 months of lead time to add capacity. This concentration gives manufacturers pricing power during demand surges.",
    template: 'schema',
    templateData: {
      title: 'Fiber optic preform manufacturing process',
      nodes: [
        {
          label: 'Vapor deposition of SiO₂ onto a mandrel (OVD/VAD/MCVD)',
          sectors: [],
          color: '#10b981',
        },
        {
          label: 'Consolidation at 1,500°C into solid glass preform',
          sectors: [],
          color: '#3b82f6',
        },
        {
          label: 'Fiber drawing at 2,000°C — 1 preform = 8,000 km of fiber',
          sectors: [],
          color: '#f59e0b',
        },
        { label: 'Coating, testing, spooling into cable', sectors: [], color: '#a855f7' },
      ],
    },
    realWorld:
      'A single glass preform — about 1 meter long and 20 cm in diameter — yields up to 8,000 kilometers of optical fiber when drawn. The manufacturing process requires ultra-pure synthetic silica with impurities below 1 part per billion. This extreme precision is why only three companies dominate global production, and why expanding capacity takes years, not months.',
    courseId: 'tech-fundamentals-6',
    courseTitle: 'Fiber Optic Technology Basics',
  },

  'hyperscaler-pull-through': {
    id: 'hyperscaler-pull-through',
    term: 'Hyperscaler Pull-Through Demand',
    definition:
      'The cascading demand effect when a hyperscale cloud provider (Meta, Amazon, Microsoft, Google) commits capital expenditure to a data center buildout. A single $1 billion data center order "pulls through" demand across dozens of suppliers: GPUs (NVIDIA), networking (Arista), fiber optic cable (Corning), power equipment (Eaton), cooling systems (Vertiv), and construction services. The pull-through multiplier from hyperscaler capex to total supply chain revenue is estimated at 3-5×.',
    template: 'formula',
    templateData: {
      formula: 'Pull-Through Revenue = Hyperscaler CapEx × Supply Chain Multiplier',
      example: {
        title: "Meta's $6B Corning order",
        substitution:
          'Meta $40B data center capex → $6B Corning fiber alone → total pull-through ~$120-200B across supply chain',
      },
    },
    realWorld:
      "When Meta commits $6 billion to Corning for fiber optic cable, that's just the networking layer. The same data center buildout also requires GPUs, cooling, power infrastructure, steel, concrete, and land. Corning's order signals the scale of the entire AI infrastructure spend, not just the fiber market.",
    courseId: 'tech-fundamentals-7',
    courseTitle: 'Cloud Computing Economics',
  },

  'ai-supercluster': {
    id: 'ai-supercluster',
    term: 'AI Supercluster',
    definition:
      'A purpose-built data center facility designed specifically for training and running large AI models, distinct from traditional cloud or enterprise data centers. AI superclusters concentrate 50,000-100,000+ GPUs in a single facility with specialized power (100+ MW), liquid cooling, and ultra-low-latency fiber optic interconnects between GPU racks. The networking requirements per rack are 10-100× greater than a traditional cloud data center.',
    template: 'comparison',
    templateData: {
      title: 'AI supercluster vs traditional data center',
      headers: ['Feature', 'Traditional cloud DC', 'AI supercluster'],
      rows: [
        { label: 'Power per rack', cells: ['5-15 kW', '40-120 kW'] },
        { label: 'Cooling', cells: ['Air cooling', 'Liquid/immersion cooling'] },
        { label: 'Network per rack', cells: ['10-25 Gbps', '400 Gbps - 1.6 Tbps'] },
        { label: 'Fiber density', cells: ['Moderate', '10-100× more fiber per rack'] },
        { label: 'Cost per MW', cells: ['$8-12M', '$15-25M'] },
      ],
      footnote:
        'AI superclusters consume 10-100× more fiber optic cable per square foot than traditional data centers.',
    },
    realWorld:
      "The reason Corning's demand outlook is transformational — not incremental — is that AI superclusters consume fiber at 10-100× the density of traditional data centers. Every GPU rack needs multiple high-bandwidth fiber connections to every other rack. The networking bill for a single AI supercluster can exceed $500 million in fiber alone.",
    courseId: 'tech-fundamentals-5',
    courseTitle: 'Understanding Cloud Infrastructure',
  },

  'secondary-sanctions': {
    id: 'secondary-sanctions',
    term: 'Secondary Sanctions',
    definition:
      'Penalties imposed not on the sanctioned country directly, but on third-party companies and countries that do business with the sanctioned entity. Secondary sanctions are the enforcement mechanism that makes US sanctions extraterritorial — a Chinese bank that processes Iranian oil payments can itself be cut off from the US dollar system. This "long arm" reach is why US sanctions are far more effective than those of other nations.',
    template: 'schema',
    templateData: {
      title: 'How secondary sanctions work',
      nodes: [
        { label: "US sanctions Iran's oil exports", sectors: [], color: '#ef4444' },
        { label: 'Chinese refiner wants to buy Iranian crude', sectors: [], color: '#f59e0b' },
        { label: 'Chinese bank processes the payment', sectors: [], color: '#eab308' },
        {
          label: 'US threatens to cut Chinese bank off from USD/SWIFT',
          sectors: [],
          color: '#3b82f6',
        },
        {
          label: 'Chinese bank refuses the transaction (compliance)',
          sectors: [],
          color: '#10b981',
        },
      ],
    },
    realWorld:
      'Secondary sanctions are why Iranian oil exports dropped from 2.5 million barrels/day to under 500,000 even though China and India wanted to keep buying. The threat of losing access to the US dollar clearing system forces foreign banks to comply with American sanctions, even against their own commercial interests.',
    courseId: 'geopolitics-101-2',
    courseTitle: 'Sanctions & Market Impact',
  },

  'force-majeure-cascade': {
    id: 'force-majeure-cascade',
    term: 'Force Majeure Cascade',
    definition:
      'A chain reaction in commodity markets triggered when a major producer declares force majeure — a legal clause excusing non-delivery due to extraordinary circumstances (war, natural disaster, embargo). When one supplier invokes force majeure, buyers scramble to replace contracted volumes on the spot market, spiking prices. This forces downstream buyers (refiners, manufacturers) to invoke their own force majeure clauses, cascading disruption through the entire supply chain.',
    template: 'schema',
    templateData: {
      title: 'Force majeure cascade in commodity markets',
      nodes: [
        { label: "Producer declares force majeure (can't deliver)", sectors: [], color: '#ef4444' },
        { label: 'Buyer seeks replacement on spot market', sectors: [], color: '#f59e0b' },
        { label: 'Spot prices spike on sudden demand', sectors: [], color: '#eab308' },
        { label: 'Refiner/manufacturer passes cost through', sectors: [], color: '#10b981' },
        { label: 'End consumer prices rise (food, fuel, goods)', sectors: [], color: '#3b82f6' },
        { label: 'Insurance markets reprice country risk', sectors: [], color: '#64748b' },
      ],
    },
    realWorld:
      'The Iran conflict triggered force majeure declarations across Middle Eastern oil and gas contracts. When a single LNG producer in Qatar declares force majeure on a 20-year supply contract, the buyer (often a Japanese or Korean utility) must immediately source replacement cargoes on the spot market — at 2-4× the contracted price.',
    courseId: 'commodities-101-2',
    courseTitle: 'Commodity Price Dynamics',
  },

  'enterprise-value-decomposition': {
    id: 'enterprise-value-decomposition',
    term: 'Enterprise Value Decomposition',
    definition:
      "Breaking a company's total valuation into the implicit assumptions the market is pricing in. For a $5 trillion company like NVIDIA, decomposition asks: what revenue growth rate, margin profile, and terminal multiple does the stock price require to be justified? If NVIDIA needs to sustain 40% revenue growth for 5+ years to justify its valuation, any deceleration reprices the entire company.",
    template: 'formula',
    templateData: {
      formula: 'EV = Σ [FCF_t / (1 + WACC)^t] + Terminal Value',
      example: {
        title: 'NVIDIA implied assumptions (May 2026)',
        substitution:
          '$5.34T EV implies: ~$200B revenue by 2028, ~55% FCF margins, 30× terminal multiple — or ~40% annual revenue CAGR for 5 years',
      },
    },
    realWorld:
      "At $5.34 trillion, NVIDIA's stock price embeds an extraordinary set of assumptions. Decomposing the enterprise value reveals that the market is pricing in AI infrastructure spending roughly doubling every 2-3 years through 2030. If hyperscaler capex merely grows at 20% instead of 40%, NVIDIA's valuation could compress by 40-50%.",
    courseId: 'valuation-101-4',
    courseTitle: 'DCF & Reverse Engineering Valuations',
  },

  'tensor-core-parallelism': {
    id: 'tensor-core-parallelism',
    term: 'Tensor Core Parallelism',
    definition:
      "The architectural innovation that makes NVIDIA GPUs dominant in AI: specialized processing units called Tensor Cores that perform matrix multiplication — the core mathematical operation in neural networks — in a single clock cycle. A single H100 GPU contains 528 Tensor Cores, each capable of performing 256 FP16 multiply-accumulate operations per clock. This massive parallelism (vs. a CPU's 8-64 cores) is why GPUs train AI models 100-1,000× faster than CPUs.",
    template: 'comparison',
    templateData: {
      title: 'Why GPUs dominate AI workloads',
      headers: ['Architecture', 'Cores', 'Matrix ops/second', 'AI training speed'],
      rows: [
        { label: 'CPU (Intel Xeon)', cells: ['32-64 cores', '~1 TFLOPS', 'Baseline (1×)'] },
        {
          label: 'GPU H100',
          cells: ['16,896 CUDA + 528 Tensor', '~990 TFLOPS', '~100-500× faster'],
        },
        {
          label: 'GPU B200 (Blackwell)',
          cells: ['~21,000 CUDA + Tensor', '~4,500 TFLOPS', '~400-2,000× faster'],
        },
      ],
      footnote:
        "Tensor Cores are NVIDIA's key differentiator — they're purpose-built for the linear algebra that AI requires.",
    },
    realWorld:
      'When NVIDIA sells a $30,000+ H100 GPU to a hyperscaler, the buyer is paying for Tensor Core parallelism — the ability to perform trillions of matrix multiplications per second. This is why NVIDIA commands 80-90% market share: their Tensor Cores, combined with the CUDA software ecosystem, deliver AI training performance that no competitor matches at scale.',
    courseId: 'tech-4',
    courseTitle: 'AI Hardware Basics',
  },

  'maritime-epidemiological-investigation': {
    id: 'maritime-epidemiological-investigation',
    term: 'Maritime Epidemiological Investigation',
    definition:
      "The specialized process of investigating disease outbreaks aboard ships, which presents unique challenges: a closed population in a confined space, multiple port exposures across jurisdictions, passengers dispersing globally upon disembarkation, and limited onboard diagnostic capabilities. Maritime outbreaks fall under International Health Regulations and require coordination between the flag state (ship's registry), port states (where it docked), and the WHO.",
    template: 'schema',
    templateData: {
      title: 'MV Hondius investigation complexity',
      nodes: [
        { label: '147 passengers from 23 countries', sectors: [], color: '#ef4444' },
        { label: 'Multiple port stops across 4 countries', sectors: [], color: '#f59e0b' },
        { label: 'Medical evacuations to South Africa', sectors: [], color: '#10b981' },
        { label: 'Flag state: Netherlands', sectors: [], color: '#3b82f6' },
        { label: '5+ national health authorities coordinating', sectors: [], color: '#a855f7' },
      ],
    },
    realWorld:
      "The MV Hondius outbreak is a worst-case scenario for maritime epidemiology: a novel pathogen on an expedition vessel visiting remote locations with no hospital infrastructure. Passengers scattered to 23 countries before the pathogen was even identified. Each country's health surveillance system must independently trace and monitor its returning nationals.",
    courseId: 'health-101-7',
    courseTitle: 'Outbreak Response Methods',
  },

  'prodromal-phase': {
    id: 'prodromal-phase',
    term: 'Prodromal Phase',
    definition:
      'The early symptomatic period of hantavirus infection (3-5 days) characterized by nonspecific symptoms — fever, myalgia, fatigue, nausea — that mimic influenza or altitude sickness. The prodromal phase is diagnostically treacherous because patients appear to have a common illness. By the time HPS-specific symptoms appear (sudden respiratory distress, pulmonary edema), the disease has progressed to the cardiopulmonary phase where the fatality rate exceeds 38%.',
    template: 'timeline',
    templateData: {
      title: 'Hantavirus disease progression',
      events: [
        { year: 'Day 0-14', label: 'Incubation — no symptoms, virus replicating' },
        {
          year: 'Day 14-19',
          label: 'Prodromal phase — fever, muscle aches, fatigue (looks like flu)',
        },
        {
          year: 'Day 19-24',
          label: 'Cardiopulmonary phase — sudden respiratory failure, pulmonary edema',
        },
        { year: 'Day 24+', label: 'Recovery or death — ~38% case fatality rate' },
      ],
    },
    realWorld:
      'On the MV Hondius, the first patient developed what appeared to be flu symptoms — fever and muscle aches. During the prodromal phase, hantavirus is clinically indistinguishable from influenza, altitude sickness, or seasickness. This is why initial testing focused on common pathogens (COVID, influenza, legionella), all of which came back negative, delaying the correct diagnosis by critical days.',
    courseId: 'health-101-6',
    courseTitle: 'Epidemiology Basics',
  },

  'yield-ramp-parity': {
    id: 'yield-ramp-parity',
    term: 'Yield Ramp Parity',
    definition:
      'The critical milestone where a new semiconductor fab achieves manufacturing yields (percentage of usable chips per wafer) comparable to established fabs. TSMC\'s Taiwan fabs typically achieve 90%+ yields within 6-12 months of production start. New overseas fabs (Arizona, Japan, Germany) face a "yield gap" — they may take 18-36 months to match Taiwan yields due to workforce inexperience, equipment calibration differences, and supply chain immaturity.',
    template: 'comparison',
    templateData: {
      title: 'Yield ramp timelines',
      headers: ['Fab location', 'Process', 'Yield target', 'Timeline to 90%+ yield'],
      rows: [
        { label: 'TSMC Taiwan (mature)', cells: ['N3/N2', '90%+', '6-12 months (benchmark)'] },
        {
          label: 'TSMC Arizona Fab 1',
          cells: ['N4', '~80-85% (current)', '24-36 months (ongoing)'],
        },
        { label: 'Intel Ohio', cells: ['Intel 18A', 'Unknown', '2026+ (not yet producing)'] },
        {
          label: 'Samsung Taylor TX',
          cells: ['4nm', 'Below target', 'Delayed — workforce issues'],
        },
      ],
      footnote:
        'Until overseas fabs achieve yield parity, they cannot compete on cost with Taiwan production.',
    },
    realWorld:
      "Yield ramp parity is the real test of semiconductor reshoring — not whether you can build a $20 billion fab, but whether it can produce chips as efficiently as Taiwan. If TSMC Arizona achieves only 80% yield vs Taiwan's 95%, every chip costs 19% more to produce. That cost gap determines whether reshoring is viable or just expensive symbolism.",
    courseId: 'tech-fundamentals-8',
    courseTitle: 'Semiconductor Manufacturing',
  },

  'profit-repatriation-leakage': {
    id: 'profit-repatriation-leakage',
    term: 'Profit Repatriation Leakage',
    definition:
      'The economic phenomenon where multinational corporations generate revenue in African markets but book profits, pay taxes, and distribute dividends in their home jurisdiction (typically London, Paris, or Zurich). This "leakage" means that African GDP benefits from employment and local spending, but the equity value creation — share price appreciation and dividends — accrues to foreign shareholders. An estimated 60-70% of corporate profits generated in sub-Saharan Africa are repatriated to headquarters outside the continent.',
    template: 'schema',
    templateData: {
      title: 'How profit repatriation leakage works',
      nodes: [
        {
          label: 'Multinational operates in Nigeria, Kenya, South Africa',
          sectors: [],
          color: '#f59e0b',
        },
        {
          label: 'Revenue generated locally — wages, taxes paid locally',
          sectors: [],
          color: '#10b981',
        },
        {
          label: 'Profits transferred to HQ (London, Paris, Zurich)',
          sectors: [],
          color: '#3b82f6',
        },
        { label: 'Dividends paid to foreign shareholders', sectors: [], color: '#a855f7' },
        {
          label: 'Equity value listed on LSE/Euronext, not JSE/NSE',
          sectors: [],
          color: '#ef4444',
        },
      ],
    },
    realWorld:
      'The 54 companies headquartered outside Africa but generating $1B+ from African operations represent the scale of profit repatriation leakage. Unilever sells soap in Lagos, Total pumps oil in Luanda, Vodafone runs cell towers in Accra — but the share price appreciation and dividends flow to shareholders in London, Paris, and Amsterdam.',
    courseId: 'global-3',
    courseTitle: 'Foreign Direct Investment',
  },
};

export function getKeywordById(id) {
  return KEYWORDS[id] || null;
}

/** @param {string} [_articleId] Reserved for per-article filtering (sprint 2). */
export function getKeywordsForArticle(_articleId) {
  return Object.values(KEYWORDS);
}
