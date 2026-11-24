// src/lib/ezana-echo-article-datacenter-power-crunch-2026.js
// Ezana Echo article: AI datacenter power demand vs. grid capacity, the
// nuclear-adjacent trade, and the utility capex supercycle.
//
// Revision Nov 24 2026: inline markers removed from the reader text and the
// stale figures refreshed against primary sources: PJM 2027/28 and 2028/29 BRA results
// (Dec 17 2025, Jul 14 2026), LBNL Queued Up 2026 edition (queues at end-2025), FT tally
// of 2026 hyperscaler capex guidance, GE Vernova Q3 2026 results (Oct 28 2026), Vertiv
// Q3 2026 results, Constellation Q2 2026 call (Crane restart 2H 2027), Cameco/TradeTech
// uranium prices (Nov 2026). New closing section: who is paid for the shortfall (FIG. 4)
// and a platform CTA. The manifest below is the original fact-check list, kept for the
// record; items it names that this revision did not re-check stay attributed in text.
//
// ============================================================
// FACT CHECK MANIFEST (original draft list; see the revision note above)
// 1. US datacenters consumed ~176 TWh in 2023 -> [VERIFY: LBNL 2024 United States Data Center Energy Usage Report]
// 2. 176 TWh equalled ~4.4% of total US electricity consumption in 2023 -> [VERIFY: LBNL 2024 report]
// 3. LBNL projects US datacenter demand of 325-580 TWh by 2028 -> [VERIFY: LBNL 2024 report]
// 4. 325-580 TWh would be ~6.7%-12% of US electricity by 2028 -> [VERIFY: LBNL 2024 report]
// 5. Global datacenter consumption ~415 TWh in 2024 (~1.5% of world electricity) -> [VERIFY: IEA Energy and AI report, April 2025]
// 6. IEA base case: global datacenter demand roughly doubles to ~945 TWh by 2030 -> [VERIFY: IEA Energy and AI report, April 2025]
// 7. AI-accelerated servers drive the majority of projected datacenter demand growth -> [VERIFY: IEA Energy and AI report; LBNL 2024 report]
// 8. GPU rack densities run 80-130+ kW vs ~8-17 kW for legacy CPU racks -> [VERIFY: NVIDIA GB200 NVL72 spec sheets; Uptime Institute density surveys]
// 9. Combined 2025 capex guidance of Microsoft, Alphabet, Amazon, Meta exceeded $300B, most of it AI datacenters -> [VERIFY: company Q4 2024/Q1 2025 earnings calls]
// 10. US utility-scale generating capacity additions ~49 GW in 2024 -> [VERIFY: EIA Electric Power Monthly / Preliminary Monthly Electric Generator Inventory]
// 11. EIA-planned utility-scale additions ~63 GW for 2025 -> [VERIFF -> [VERIFY: EIA Preliminary Monthly Electric Generator Inventory, planned additions]
// 12. FIG. 1 bar series (US datacenter demand TWh): 2022 ~126, 2023 ~176, 2024 ~224 (est), 2025 ~290 (est), 2026E ~355, 2027E ~420, 2028E ~480 (midpoint-path of LBNL 325-580 range) -> [VERIFY: LBNL 2024 report + IEA Energy and AI interpolation]
// 13. FIG. 1 line series (US utility-scale capacity additions GW): 2022 ~29, 2023 ~34, 2024 ~49, 2025 ~63, 2026E ~68, 2027E ~71, 2028E ~74 -> [VERIFY: EIA generator inventory actuals + planned additions]
// 14. Active US interconnection queues held ~2,600 GW of generation + storage at end-2023 -> [VERIFY: LBNL Queued Up 2024 edition]
// 15. ~95% of queued capacity is solar, wind, and battery storage -> [VERIFY: LBNL Queued Up 2024]
// 16. Median time from interconnection request to commercial operation ~5 years for recent projects, vs <2 years for projects built in 2008 -> [VERIFY: LBNL Queued Up]
// 17. Only ~13-14% of projects entering queues 2000-2018 reached commercial operation -> [VERIFY: LBNL Queued Up completion-rate analysis]
// 18. Installed US utility-scale generating capacity ~1,300 GW -> [VERIFY: EIA electricity data, existing capacity]
// 19. Queue (~2,600 GW) is roughly double the installed US fleet -> [VERIFY: LBNL Queued Up vs EIA installed capacity]
// 20. FERC Order 2023 moved interconnection to first-ready-first-served cluster studies with readiness deposits -> [VERIFY: FERC Order 2023, July 2023]
// 21. Microsoft signed a 20-year PPA with Constellation for the 835 MW Three Mile Island Unit 1 restart (Crane Clean Energy Center) -> [VERIFY: Constellation-Microsoft announcement, Sept 2024]
// 22. Crane restart target moved up to 2027 from an original 2028 target -> [VERIFY: Constellation earnings calls 2025]
// 23. Amazon/AWS agreed to buy up to 960 MW co-located at Talen's Susquehanna nuclear plant, restructured after FERC rejected the original ISA amendment in Nov 2024 -> [VERIFY: Talen-AWS announcements 2024-2025; FERC docket]
// 24. Meta signed a 20-year PPA with Constellation for the 1,121 MW Clinton Clean Energy Center starting 2027 -> [VERIFY: Constellation-Meta announcement, June 2025]
// 25. Quote: Dominguez, on the TMI restart, framing US energy as an AI-race input -> [VERIFY: Joe Dominguez remarks at Crane/Microsoft announcement, Sept 2024, as reported]
// 26. PJM 2025/26 capacity auction cleared at $269.92/MW-day vs $28.92 prior year (~9x) -> [VERIFY: PJM 2025/2026 Base Residual Auction results, July 2024]
// 27. PJM 2026/27 auction cleared at $329.17/MW-day, at/near the price cap -> [VERIFY: PJM 2026/2027 Base Residual Auction results, July 2025]
// 28. Uranium spot rose from ~$30/lb in early 2021 to a ~$106/lb peak in Jan-Feb 2024, then settled into a ~$65-80/lb band through 2025-26 -> [VERIFY: UxC / Cameco spot price history]
// 29. Cameco restarted McArthur River/Key Lake in 2022 after a four-year suspension -> [VERIFY: Cameco announcements]
// 30. US banned imports of Russian enriched uranium (Prohibiting Russian Uranium Imports Act, signed May 2024, waivers through 2027) -> [VERIFY: Public Law 118-62]
// 31. Russia supplied roughly 20-25% of enrichment services to US reactors before the ban -> [VERIFY: EIA uranium marketing annual report]
// 32. Centrus is the only US-licensed HALEU producer, first deliveries to DOE Nov 2023 -> [VERIFY: Centrus/DOE announcements]
// 33. NuScale holds the first (and so far only) NRC-certified US SMR design; certified module 50 MWe with 77 MWe uprate under review/approved 2025 -> [VERIFY: NRC certification records]
// 34. Oklo's original Aurora combined license application was denied by the NRC in 2022; the company re-engaged the pre-application process with a new filing targeted for full review -> [VERIFY: NRC docket, Oklo filings]
// 35. Sam Altman chaired Oklo's board and stepped down in April 2025 as OpenAI explored energy partnerships -> [VERIFY: Oklo 8-K / press, April 2025]
// 36. EEI-tracked investor-owned utility capex ran ~$185-200B in 2025, with 5-year plans totaling roughly $1.1-1.3T -> [VERIFY: Edison Electric Institute capex surveys; company capital plans]
// 37. NextEra CEO Ketchum has said US power demand will grow ~55% over the next 20 years / ~6x the prior decade's growth rate -> [VERIFY: NextEra earnings calls / Ketchum public remarks 2024-2025]
// 38. GE Vernova heavy-duty gas turbine slots effectively sold out into 2028 -> [VERIFY: GE Vernova earnings calls 2025]
// 39. Large power transformer lead times stretched to 2-3+ years, roughly double pre-2020 -> [VERIFY: Wood Mackenzie / NREL supply-chain assessments]
// 40. Regulated-utility rate-base growth guidance of 8-10%/yr at growth utilities -> [VERIFY: NEE / Southern / Dominion investor materials]
// 41. Stat grid values: 176 TWh (2023), 325-580 TWh (2028 range), ~2,600 GW queue, PJM $28.92 -> $269.92/MW-day -> [VERIFY: LBNL 2024 report; LBNL Queued Up 2024; PJM auction results]
// 42. FIG. 2 scenario values: ~70 GW/yr additions (base), 30+ GW behind-the-meter/co-located pipeline (alt), capacity prices ~2x / at cap (bear) -> [VERIFY: EIA planned additions; hyperscaler co-location announcements tally; PJM auction results]
// 43. FIG. 3 point estimates (fleet capacity factor %, capacity GW, market cap $B): CEG ~94% / ~32 GW / ~$95B; VST ~60% / ~41 GW / ~$60B; NEE ~47% / ~74 GW / ~$155B; TLN ~63% / ~10.7 GW / ~$15B; D ~52% / ~30 GW / ~$50B; PEG ~58% / ~13 GW / ~$42B -> [VERIFY: company 10-Ks (fleet capacity, generation output for capacity factor); market caps as of Aug 2026]
// 44. US nuclear fleet average capacity factor ~93% -> [VERIFY: EIA / NEI capacity factor data]
// 45. Virginia's "Data Center Alley" (Loudoun County) is the largest datacenter market in the world; Dominion reported datacenter contracted capacity in the tens of GW -> [VERIFY: Dominion earnings materials; JLARC 2024 Virginia datacenter study]
// 46. Stargate's first campus in Abilene, Texas is planned to scale to ~1.2 GW -> [VERIFY: OpenAI/Oracle/Crusoe Stargate announcements 2025]
// 47. Ezana Echo cross-reference: "They're Not Buying the Model" consolidation article covers $100B+ 2026 tech M&A as a land-grab for data pipelines -> [INTERNAL: src/lib/ezana-echo-article-data-consolidation-2026.js]
// 48. Globe-rail metric series mirrors FIG. 1 bar values -> [VERIFY: same as items 1, 3, 12]
// ============================================================

export const datacenterPowerCrunch2026 = {
  id: 'datacenter-power-crunch-2026',
  title: 'The Datacenter Power Bill: AI Compute Is Growing at 25% a Year and the Grid Is Not',
  excerpt:
    'US datacenters drew roughly 176 TWh in 2023 and could need 325-580 TWh by 2028, while about 2,060 GW of proposed supply sits in interconnection queues. PJM capacity has now cleared at its price cap three auctions running, and the shortfall is paying nuclear fleets, turbine makers and on-site power.',
  heroImage: {
    src: '/images/ezana-echo/datacenter-power-crunch-2026-hero-v2.webp',
    alt: 'At dusk, a high-voltage substation and transmission towers glow on the left while streams of orange and blue light run into rows of server racks on the right, above a control screen showing a Northern Virginia grid map.',
    caption:
      'The AI build-out has turned electricity into the scarce input: every gigawatt of compute now needs a gigawatt of firm supply, and the queue for it is years long.',
    position: '50% 50%',
  },
  category: 'commodities-energy',
  subcategory: 'Renewables',
  globeRail: {
    metric: {
      title: 'US DATACENTER POWER DEMAND (TWh)',
      data: [
        { x: 2022, y: 126 },
        { x: 2023, y: 176 },
        { x: 2024, y: 224 },
        { x: 2025, y: 290 },
        { x: 2026, y: 355 },
        { x: 2027, y: 420 },
        { x: 2028, y: 480 },
      ],
      startLabel: '2022 · ~126 TWh',
      endLabel: '2028E · ~480 TWh',
      note: 'US datacenter electricity demand: actuals through 2023, then an Ezana midpoint path of the LBNL 325-580 TWh 2028 scenario range (estimates). Source: LBNL 2024 United States Data Center Energy Usage Report.',
    },
    cities: [
      {
        name: 'Ashburn',
        country: 'US',
        lat: 39.04,
        lng: -77.49,
        impact:
          'Loudoun County, Virginia, is "Data Center Alley," the largest datacenter market in the world. Dominion, its utility, reports contracted datacenter capacity in the tens of gigawatts, and nearly all of the rise in PJM\'s 2027/28 peak-load forecast came from datacenters: the clearest local expression of the national demand shock.',
      },
      {
        name: 'Middletown',
        country: 'US',
        lat: 40.15,
        lng: -76.72,
        impact:
          'Three Mile Island Unit 1, shut in 2019 for economics, is being restarted as the Crane Clean Energy Center under a 20-year, 835 MW PPA with Microsoft, backed by a $1 billion DOE loan. Constellation now targets the second half of 2027. A retired reactor coming back for a single corporate buyer is the era in one datapoint.',
      },
      {
        name: 'Abilene',
        country: 'US',
        lat: 32.45,
        lng: -99.73,
        impact:
          'The first Stargate campus in ERCOT territory is planned to scale toward ~1.2 GW of load, a single site drawing more power than some utility service territories. Texas interconnects load faster than any other US market and permits on-site gas more easily, which is why the AI build-out, and its behind-the-meter power, keeps landing there.',
      },
      {
        name: 'Saskatoon',
        country: 'CA',
        lat: 52.13,
        lng: -106.67,
        impact:
          'Cameco, headquartered here, restarted McArthur River in 2022 after a four-year suspension and now sits at the head of the Western uranium supply chain just as the US ban on Russian enriched uranium forces the fuel cycle to re-shore. Long-term uranium contract prices hit a record $99/lb at the end of October 2026.',
      },
    ],
  },
  author: 'Ezana Finance Editorial',
  meta: {
    sectors: ['Utilities', 'Energy', 'Industrials', 'Information Technology'],
    industries: [
      'Electric Utilities',
      'Independent Power Producers',
      'Uranium & Nuclear Fuel',
      'Electrical Equipment',
    ],
    // Investors dim honestly empty: the piece discusses corporate power buyers and
    // operators, not named investment firms or individual investors.
    investors: [],
    institutions: [
      'Constellation Energy',
      'Vistra',
      'Talen Energy',
      'NextEra Energy',
      'Microsoft',
      'Amazon Web Services',
      'Meta',
      'Cameco',
      'Centrus Energy',
      'NuScale Power',
      'Oklo',
      'GE Vernova',
      'Vertiv',
      'Bloom Energy',
      'Quanta Services',
      'PJM Interconnection',
      'Lawrence Berkeley National Laboratory',
    ],
    government: [
      'US Energy Information Administration',
      'Federal Energy Regulatory Commission',
      'Nuclear Regulatory Commission',
      'US Department of Energy',
      'International Energy Agency',
    ],
    geos: ['United States', 'Canada'],
    assetClasses: ['Equities', 'Commodities'],
    themes: ['AI Infrastructure', 'Energy Transition', 'Nuclear Renaissance', 'Capex Supercycle'],
    datasets: [
      'EIA electricity data',
      'LBNL interconnection queue data (Queued Up)',
      'PJM capacity auction results',
      'IEA datacenter energy reports',
    ],
    markets: ['PJM', 'ERCOT'],
  },
  tickers: ['CEG', 'VST', 'TLN', 'GEV', 'VRT', 'BE', 'PWR', 'NEE', 'CCJ', 'LEU'],
  entities: {
    people: [
      {
        id: 'joe-dominguez',
        label: 'Joe Dominguez',
        role: 'CEO, Constellation Energy; architect of the hyperscaler nuclear PPAs',
      },
      {
        id: 'john-ketchum',
        label: 'John Ketchum',
        role: 'CEO, NextEra Energy',
      },
      {
        id: 'jacob-dewitte',
        label: 'Jacob DeWitte',
        role: 'Co-founder and CEO, Oklo',
      },
    ],
    terms: [
      { id: 'hyperscalers', label: 'Hyperscalers' },
      { id: 'ai-supercluster', label: 'AI Supercluster' },
      { id: 'nameplate-capacity', label: 'Nameplate Capacity' },
      { id: 'infrastructure-lock-in', label: 'Infrastructure Lock-In' },
      { id: 'regulatory-catalyst', label: 'Regulatory Catalyst' },
      { id: 'commodity-supercycle', label: 'Commodity Supercycle' },
      { id: 'capex-cycle', label: 'Capex Cycle' },
      { id: 'supply-chain-chokepoint', label: 'Supply-Chain Chokepoint' },
    ],
  },
  readTime: 11,
  publishedAt: '2026-09-03',
  listMeta: '3 Sep 2026',
  featured: false,
  likes: 0,
  comments: 0,
  reads: 0,
  status: 'published',
  contentBlocks: [
    {
      type: 'paragraph',
      text: 'The binding constraint on artificial intelligence is no longer chips, capital, or talent. It is electricity. US datacenters consumed roughly 176 terawatt-hours in 2023, about 4.4% of national electricity demand, and Lawrence Berkeley National Laboratory projects that figure reaching 325 to 580 TWh by 2028, as much as 12% of US consumption. The grid supplying that load is adding capacity at a fraction of the required pace: about 2,060 gigawatts of proposed generation and storage were still waiting in interconnection queues at the end of 2025, and PJM, the largest US grid, has cleared its capacity auction at the price cap three times running while falling short of its own reliability requirement. That mismatch, demand compounding at datacenter speed against supply moving at utility speed, is the most investable imbalance in the market today.',
    },
    {
      type: 'stat-grid',
      stats: [
        {
          label: 'US datacenter demand (2023)',
          value: '176 TWh',
          change: '~4.4% of US electricity (LBNL)',
        },
        {
          label: 'Projected demand by 2028',
          value: '325-580 TWh',
          change: 'LBNL scenario range',
        },
        {
          label: 'Waiting in interconnection queues',
          value: '~2,060 GW',
          change: 'Active requests, end-2025 (LBNL Queued Up 2026)',
        },
        {
          label: 'PJM capacity price',
          value: '$28.92 to $333.44',
          change: 'Per MW-day, 2024/25 to 2027/28; three auctions at the cap',
        },
      ],
    },
    {
      type: 'heading',
      text: 'The demand shock, in terawatt-hours',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'The demand side of the ledger is compounding. The International Energy Agency estimates global datacenter consumption at roughly 415 TWh in 2024, about 1.5% of world electricity, and its base case has that doubling to around 945 TWh by 2030, with AI-accelerated servers accounting for the majority of the growth. The physics behind the curve is rack density: a legacy CPU rack draws 8 to 17 kilowatts, while a GB200-class GPU rack draws well over 100 kilowatts. The [[kw:hyperscalers]]hyperscalers[[/kw]] funding this build-out keep raising the bill: after first-quarter 2026 earnings, Microsoft, Alphabet, Amazon, and Meta guided to roughly $725 billion of combined 2026 capital expenditure, about 77% above the 2025 record of roughly $410 billion by the Financial Times tally, and Amazon and Alphabet raised again in July. Most of it is AI datacenters, and every dollar of it eventually needs a connection to a grid.',
    },
    {
      type: 'paragraph',
      text: 'This piece is the physical-world sequel to a thesis Ezana Echo has already mapped: the consolidation analysis "They\'re Not Buying the Model" argued that 2026\'s $100-billion-plus tech M&A wave is a land-grab for proprietary data pipelines and workflow positions rather than for models. Every one of those pipelines terminates in a building that draws megawatts. The same logic that made data the scarce input upstream makes firm power the scarce input downstream, and the scarcity premium is migrating from software multiples to generation assets.',
    },
    {
      type: 'paragraph',
      text: 'Against that demand curve, supply is arithmetic. US utility-scale capacity additions ran about 49 GW in 2024 with roughly 63 GW planned for 2025 in the EIA generator inventory, strong years by historical standards, yet most of it intermittent solar and storage rather than the around-the-clock firm power an [[kw:ai-supercluster]]AI supercluster[[/kw]] requires. A gigawatt-class training campus needs its power at a 99.999% duty cycle; a solar farm delivers a 25% capacity factor. The gap between the bars and the line in the figure below is the whole story: demand measured in terawatt-hours consumed, supply measured in gigawatts that mostly cannot run at night.',
    },
    {
      type: 'multi-axis',
      figureLabel: 'FIG. 1 · DEMAND COMPOUNDS, SUPPLY CRAWLS',
      kicker:
        'US DATACENTER POWER DEMAND (TWh, BARS, LEFT AXIS) VS. US UTILITY-SCALE CAPACITY ADDITIONS (GW, LINE, RIGHT AXIS) · 2024 ONWARD BLENDS ACTUALS, EIA PLANNED ADDITIONS, AND A MIDPOINT PATH OF THE LBNL 2028 SCENARIO RANGE.',
      hint: 'Bar = datacenter demand (TWh, left axis); line = grid capacity additions (GW, right axis).',
      source:
        'LBNL 2024 United States Data Center Energy Usage Report; EIA Preliminary Monthly Electric Generator Inventory; IEA Energy and AI (2025). 2024 onward demand and 2025 onward additions are estimates (midpoint path and EIA planned additions).',
      categories: ['2022', '2023', '2024', '2025', '2026E', '2027E', '2028E'],
      series: [
        {
          label: 'US datacenter demand',
          kind: 'bar',
          unit: 'TWh',
          values: [126, 176, 224, 290, 355, 420, 480],
        },
        {
          label: 'Capacity additions',
          kind: 'line',
          unit: 'GW',
          values: [29, 34, 49, 63, 68, 71, 74],
        },
      ],
    },
    {
      type: 'heading',
      text: 'The interconnection queue is the real bottleneck',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'The US does not lack proposed generation; it lacks the ability to connect it. Lawrence Berkeley National Laboratory\'s "Queued Up" study counted a peak of nearly 2,600 GW of generation and storage in active interconnection queues at the end of 2023; by the end of 2025 the backlog had eased to about 2,060 GW, not because projects got built but because more than 750 GW withdrew in 2025 alone. The typical project built in 2024 took 55 months from interconnection request to commercial operation, and of all capacity that applied between 2000 and 2020 only 13% was operating by the end of 2025 while 75% had withdrawn. The one fuel growing in the queue is the one datacenters can use around the clock: active natural-gas requests rose 86% in 2025. Queue position, not [[kw:nameplate-capacity]]nameplate capacity[[/kw]] on paper, is what determines when electrons actually flow, and the queue has become the single longest lead-time item in the entire AI supply chain.',
    },
    {
      type: 'callout',
      label: 'The queue vs. the grid',
      value: '~2,060 GW waiting',
      context:
        'Active interconnection requests at the end of 2025 still equal roughly 1.6 times the ~1,300 GW of utility-scale capacity installed in the United States (LBNL Queued Up 2026; EIA). Only 13% of capacity that applied from 2000 to 2020 ever came online. The pipeline is enormous; the pipe is not.',
    },
    {
      type: 'heading',
      text: 'The nuclear premium: PPAs, restarts, and co-location',
      level: 2,
    },
    {
      type: 'paragraph',
      text: "Hyperscalers responded by going around the queue and straight to existing firm capacity, and nuclear is the asset they want. Microsoft signed a 20-year power purchase agreement with Constellation to restart the 835 MW Three Mile Island Unit 1 as the Crane Clean Energy Center, backed by a $1 billion Department of Energy loan; after a PJM study suggested grid connection could slip to 2031, FERC granted Constellation a waiver in June 2026 and the company now targets a restart in the second half of 2027. Amazon agreed to take power from Talen's Susquehanna plant, in a structure reworked after FERC rejected the original co-location amendment in November 2024. Meta signed a 20-year deal for the full 1,121 MW output of Constellation's Clinton plant from 2027, and in October 2026 Google and Constellation agreed an 11-unit uprate program. These contracts are [[kw:infrastructure-lock-in]]infrastructure lock-in[[/kw]] running in reverse: instead of the utility locking in the customer, the customer is locking up the plant, for decades, at premium prices.",
    },
    {
      type: 'paragraph',
      text: "The market signal confirming the scarcity is the price of capacity itself. PJM, the grid operator spanning 13 states from Virginia's datacenter corridor to Chicago, saw its 2025/26 capacity auction clear at $269.92 per megawatt-day, up from $28.92 the year before, a roughly ninefold jump. Every auction since has cleared at the negotiated cap: $329.17 for 2026/27, $333.44 for 2027/28, and $325 for 2028/29 in July 2026. The cap is now doing the work the market cannot: PJM's own simulations put the uncapped 2027/28 price near $530, and the last two auctions were the first in PJM history in which the whole region fell short of its reliability requirement, by about 6,500 MW and then 6,831 MW. Nearly 5,100 MW of the 5,250 MW rise in the 2027/28 peak-load forecast was datacenters. [[person:joe-dominguez]]Joe Dominguez[[/person]] has built Constellation's entire equity story on this repricing: the largest US nuclear fleet, running at a 93% capacity factor in the second quarter of 2026, suddenly holds the scarcest commodity in the AI economy, always-on carbon-free power that already exists.",
    },
    {
      type: 'glow-line',
      figureLabel: 'FIG. 2 · CAPPED, NOT CLEARED',
      kicker:
        'PJM BASE RESIDUAL AUCTION CLEARING PRICE, RTO, $/MW-DAY (UCAP), BY DELIVERY YEAR · DASHED = PJM SIMULATION WITHOUT THE PRICE CAP AND FLOOR · HOVER A YEAR FOR BOTH',
      hint: 'Since 2026/27 the cap, not supply and demand, has set the price.',
      source:
        'PJM Base Residual Auction results and reports, 2024/25 to 2028/29 (2028/29 published July 14, 2026). Uncapped values are PJM clearing simulations as reported by NRG and Modo Energy; they are estimates, not prices paid.',
      yLabel: '$/MW-day',
      unit: '',
      categories: ['2024/25', '2025/26', '2026/27', '2027/28', '2028/29'],
      series: [
        {
          key: 'cleared',
          label: 'Cleared price',
          color: 'var(--echo-chart-blue)',
          values: [28.92, 269.92, 329.17, 333.44, 325],
        },
        {
          key: 'uncapped',
          label: 'Without the cap (simulated)',
          color: 'var(--echo-chart-orange)',
          dash: true,
          values: [null, null, null, 529.8, 555],
        },
      ],
      annotations: [
        { x: '2025/26', y: 269.92, label: '~9x in one auction', sub: '$28.92 to $269.92' },
        { x: '2027/28', y: 333.44, label: 'First regional shortfall', sub: '~6,500 MW short' },
        { x: '2028/29', y: 325, label: 'Third straight cap', sub: '6,831 MW short' },
      ],
    },
    {
      type: 'quote',
      text: 'The energy industry cannot be the reason that America loses the AI race. Restarting a retired reactor for a single buyer would have been unthinkable five years ago; today it is the market clearing.',
      source:
        'Paraphrase of remarks by Joe Dominguez, Constellation CEO, at the Crane announcement, September 2024 (not a verbatim quote)',
    },
    {
      type: 'paragraph',
      text: 'What cleared tells the same story from the supply side. Of the 138,318 MW PJM procured for 2028/29, 46% was natural gas, 20% nuclear and 18% coal; wind and solar together were 3%, because capacity accreditation pays for megawatts that show up on the coldest and hottest hours. Only 525 MW of new generation and uprates cleared in that auction, against a peak-load forecast that rose another 2,000 MW. The grid is being held up by the fleet it already has.',
    },
    {
      type: 'donut',
      figureLabel: 'FIG. 3 · WHAT ACTUALLY CLEARED',
      kicker:
        'PJM 2028/2029 BASE RESIDUAL AUCTION, CLEARED CAPACITY BY RESOURCE TYPE, % OF 138,318 MW UCAP · HOVER A SLICE FOR ITS SHARE',
      hint: 'Firm, dispatchable fleets carried 84% of the capacity PJM could buy.',
      source:
        'PJM 2028/2029 Base Residual Auction results (July 14, 2026), resource mix as reported by OPIS. "Wind, oil and solar" groups the three smallest categories (2%, 2%, 1%). Reported shares sum to 98% after rounding.',
      unit: '%',
      totalLabel: '2028/29 cleared, %',
      slices: [
        { label: 'Natural gas', value: 46, color: 'var(--echo-chart-orange)' },
        { label: 'Nuclear', value: 20, color: 'var(--echo-chart-blue)' },
        { label: 'Coal', value: 18, color: 'var(--text-muted)' },
        { label: 'Demand response', value: 5, color: 'var(--echo-chart-purple)' },
        { label: 'Hydro', value: 4, color: 'var(--echo-chart-green)' },
        {
          label: 'Wind, oil and solar',
          value: 5,
          color: 'var(--echo-chart-red)',
          detail: 'Wind 2%, oil 2%, solar 1%',
        },
      ],
    },
    {
      type: 'heading',
      text: 'Three ways the build-out resolves',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'How the crunch resolves depends on two clocks: how fast reform accelerates the queue, and how fast hyperscalers route around it. FERC Order 2023 moved interconnection to first-ready-first-served cluster studies with real deposits, and the ADVANCE Act plus a string of pro-nuclear executive actions have compressed NRC licensing timelines, a genuine [[kw:regulatory-catalyst]]regulatory catalyst[[/kw]] for both the queue and the reactor pipeline. The scenarios below trace the three paths the next four years can take, and what each one does to power prices and the trade.',
    },
    {
      type: 'scenario-chain',
      figureLabel: 'FIG. 4 · THREE PATHS FOR THE POWER CRUNCH',
      kicker:
        'BASE · ALT · BEAR: HOW GRID SUPPLY AND AI DEMAND RECONCILE THROUGH 2030, AND THE PRICE SIGNAL EACH PATH SENDS.',
      hint: 'Three build-out scenarios; the kill switch is the indicator that flips the base case.',
      source:
        'Ezana scenarios built on EIA planned-additions data, FERC Order 2023, PJM Base Residual Auction results (2025/26 to 2028/29) and hyperscaler co-location announcements. Scenario values are estimates.',
      scenarios: [
        {
          id: 'grid-keeps-pace',
          label: 'Grid keeps pace',
          tone: 'base',
          range: '2026-2030',
          steps: [
            {
              label: 'Queue reform bites',
              sub: 'FERC Order 2023 cluster studies clear backlog',
            },
            {
              label: 'Additions hold ~70 GW/yr',
              sub: 'solar + storage + new gas',
            },
            {
              label: 'Restarts and uprates add firm supply',
              sub: 'Crane 2027, Clinton extension',
            },
          ],
          result: { value: '~480 TWh', sub: 'demand met, capacity prices plateau' },
        },
        {
          id: 'behind-the-meter',
          label: 'Behind-the-meter workaround',
          tone: 'alt',
          range: '2026-2029',
          steps: [
            {
              label: 'Hyperscalers co-locate at plants',
              sub: 'Susquehanna model spreads',
            },
            {
              label: 'On-site gas and SMR orders ramp',
              sub: 'turbine slots sold out into 2028',
            },
            {
              label: 'Cost-shift fights escalate at FERC',
              sub: 'who pays for the grid the load left behind',
            },
          ],
          result: {
            value: '30+ GW',
            sub: 'of AI load bypasses the queue',
          },
        },
        {
          id: 'power-constrained-ai',
          label: 'Power-constrained AI',
          tone: 'bear',
          range: '2027-2030',
          steps: [
            {
              label: 'Queues stay 5+ years',
              sub: 'reform lags, transformer lead times bind',
            },
            {
              label: 'Capacity auctions clear at caps',
              sub: 'PJM repeats $329/MW-day prints',
            },
            {
              label: 'Moratoria and rate revolts spread',
              sub: 'datacenter connection pauses in stressed territories',
            },
          ],
          result: { value: '~2x', sub: 'capacity prices; build-outs slip right' },
        },
      ],
      killSwitch:
        'Triggered: PJM has now cleared at its cap three times running (2026/27 to 2028/29) and missed its reliability requirement twice. The next test is the 2029/30 auction in December 2026: a fourth cap print with a shortfall above ~6.8 GW keeps the power-constrained path in charge; a clear below the cap that meets the requirement is the first sign of the base case.',
    },
    {
      type: 'heading',
      text: 'The uranium leg of the trade',
      level: 2,
    },
    {
      type: 'paragraph',
      text: "If existing reactors are the scarce asset, their fuel is the scarce input behind it. Uranium spot prices rose from roughly $30 per pound in early 2021 to a peak near $106 in early 2024, dipped as low as about $64 in March 2025, and have climbed back to around $90-91 in November 2026, while the long-term contract price that utilities actually sign at reached $99 at the end of October 2026, the highest in TradeTech's series since 1996. It is a repricing with the classic anatomy of a [[kw:commodity-supercycle]]commodity supercycle[[/kw]]: a decade of underinvestment after Fukushima, inventories drawn down, then a structural demand shock arriving faster than mines can respond. Cameco, which restarted McArthur River in 2022 after a four-year suspension, is the Western fuel cycle's anchor asset, and the US ban on Russian enriched uranium, signed in May 2024 with waivers running only through 2027, forces the re-shoring of a fuel chain in which Russia had supplied roughly a fifth to a quarter of US enrichment.",
    },
    {
      type: 'paragraph',
      text: "The small modular reactor names are the venture tranche of the same thesis. NuScale holds the first NRC-certified US SMR design, and Oklo, led by co-founder [[person:jacob-dewitte]]Jacob DeWitte[[/person]], is pursuing a combined license for its Aurora fast reactor after an initial application was denied in 2022; Sam Altman chaired Oklo's board until stepping down in April 2025 as OpenAI began exploring energy deals directly. Centrus, the only US-licensed producer of the high-assay fuel most SMR designs need, delivered its first HALEU to the Department of Energy in late 2023. None of these companies has meaningful revenue from operating reactors yet; they trade on licensing milestones and letters of intent, which makes them optionality, not cash flow.",
    },
    {
      type: 'glow-line',
      figureLabel: 'FIG. 5 · THE TERM PRICE LEADS',
      kicker:
        'URANIUM U3O8, $/LB · SOLID = SPOT (CAMECO MONTH-END; NOV 2026 = MID-MONTH) · DASHED = LONG-TERM CONTRACT PRICE · MARCH 2025 TO NOVEMBER 2026 · HOVER A MONTH FOR BOTH',
      hint: 'Utilities are paying more for decades of fuel than the spot market charges today.',
      source:
        'Spot: Cameco month-end prices as reported by the American Nuclear Society; November 2026 is the November 16 spot. Long-term: Cameco month-end (Nov 2025, Sep 2026) and TradeTech Long-Term Price Indicator (Oct 31 2026, a series high). Gaps are months without a sourced print.',
      yLabel: '$/lb U3O8',
      categories: [
        'Mar 25',
        'Sep 25',
        'Nov 25',
        'Dec 25',
        'Jan 26',
        'Mar 26',
        'Apr 26',
        'Jul 26',
        'Sep 26',
        'Oct 26',
        'Nov 26',
      ],
      series: [
        {
          key: 'spot',
          label: 'Spot',
          color: 'var(--echo-chart-blue)',
          values: [64.23, 82.63, 75.8, 81.55, 94.28, 84.25, 86.35, 86.36, null, null, 91.5],
        },
        {
          key: 'term',
          label: 'Long-term contract',
          color: 'var(--echo-chart-orange)',
          dash: true,
          values: [null, null, 86, null, null, null, null, null, 96.5, 99, null],
        },
      ],
      annotations: [
        { x: 'Mar 25', y: 64.23, label: '2025 low', sub: '$64.23' },
        { x: 'Oct 26', y: 99, label: 'Term record', sub: '$99, highest since 1996' },
      ],
    },
    {
      type: 'heading',
      text: 'The utility capex supercycle',
      level: 2,
    },
    {
      type: 'paragraph',
      text: "For regulated utilities, the crunch is not a crisis but an order book. Investor-owned utility capital spending tracked by the Edison Electric Institute ran near $185-200 billion in 2025, with five-year plans totaling well over a trillion dollars, the largest peacetime infrastructure program in the sector's history. [[person:john-ketchum]]John Ketchum[[/person]], NextEra's CEO, frames the demand backdrop as US power consumption growing roughly 55% over the next two decades, about six times the prior decade's pace. Every dollar of that spend earns a regulated return, which is why growth utilities now guide to 8-10% annual rate-base growth, bond-like businesses compounding at tech-adjacent rates because the [[kw:capex-cycle]]capex cycle[[/kw]] runs through their balance sheets.",
    },
    {
      type: 'paragraph',
      text: 'The physical constraints are where the cycle bites. GE Vernova ended the third quarter of 2026 with 122 GW of gas turbines in backlog or under slot-reservation agreements, expects at least 130 GW by year-end, and booked $29.3 billion of orders in the quarter, up 96% organically; its total backlog of $197 billion is on track to pass $200 billion. Large power transformer lead times, meanwhile, have stretched to two to three years, roughly double pre-2020 norms, by industry estimates. Scarcity along the equipment chain means the companies that already own capacity, or already hold delivery slots, capture the pricing; latecomers pay up or wait. That is the same dynamic playing out at every layer of this story, from queue positions to reactor fuel to transformer steel.',
    },
    {
      type: 'callout',
      label: 'The equipment wall',
      value: '2-3 year lead times',
      context:
        'Large power transformers quote lead times of two to three years, roughly double pre-2020 norms, and GE Vernova alone holds 122 GW of gas turbines in backlog or reserved slots (Q3 2026). The build-out is rationed by hardware, not intent.',
    },
    {
      type: 'heading',
      text: 'How to frame the trade',
      level: 2,
    },
    {
      type: 'paragraph',
      text: "The investable map sorts into four baskets. Unregulated nuclear-heavy generators (CEG, VST, TLN) sell existing firm power into a market that suddenly wants decades of it. Regulated growth utilities (NEE, D) convert the same demand into rate-base compounding. The fuel cycle (CCJ, LEU, and the URA ETF as the basket expression) is a play on the enrichment [[kw:supply-chain-chokepoint]]supply-chain chokepoint[[/kw]] the Russian import ban created. And the SMR tranche (SMR, OKLO, with GE Vernova's turbine franchise as the picks-and-shovels adjacency) is licensing-milestone optionality. The figure below plots the generator set on the axes that matter: how hard the fleet already runs, how big it is, and what the market pays for it.",
    },
    {
      type: 'bubble-field',
      figureLabel: 'FIG. 6 · WHO OWNS THE FIRM POWER',
      kicker:
        'US POWER PRODUCERS · X = FLEET CAPACITY FACTOR (%) · Y = GENERATING CAPACITY (GW) · BUBBLE = MARKET CAP ($B) · SHADED ZONE = NUCLEAR-CLASS UTILIZATION AT SCALE, WHERE THE HYPERSCALER PPAS ARE BEING SIGNED. URANIUM AND SMR NAMES ARE EXCLUDED: CAPACITY-FACTOR AXES DO NOT APPLY TO MINERS OR PRE-REVENUE DEVELOPERS.',
      hint: 'Up and to the right at size = always-on fleets the AI buyers want under contract.',
      source:
        'Company 10-K fleet and generation disclosures; capacity factors, capacities and market capitalizations are approximate, as of August 2026 (estimates).',
      points: [
        { label: 'CEG', x: 94, y: 32, z: 95 },
        { label: 'NEE', x: 47, y: 74, z: 155 },
        { label: 'VST', x: 60, y: 41, z: 60 },
        { label: 'D', x: 52, y: 30, z: 50 },
        { label: 'PEG', x: 58, y: 13, z: 42 },
        { label: 'TLN', x: 63, y: 10.7, z: 15 },
      ],
      xLabel: 'Fleet capacity factor (%)',
      yLabel: 'Generating capacity (GW)',
      zLabel: 'Market cap ($B)',
      xThreshold: 85,
      yThreshold: 25,
      zoneLabel: 'NUCLEAR-CLASS, AT SCALE',
    },
    {
      type: 'paragraph',
      text: "The base case is that the crunch persists through the decade: LBNL's midpoint path implies US datacenter demand near 480 TWh by 2028, queue reform helps at the margin, and firm-power owners keep pricing power while the capex supercycle compounds through regulated rate bases. The power-constrained path is no longer hypothetical: the kill switch in FIG. 4 has already tripped in PJM. The bear case for the trade is a demand air-pocket: if AI training spend consolidates the way the M&A wave suggests capital already is, some announced gigawatts never get built, and the names priced for scarcity, particularly the pre-revenue SMR tranche, reprice hardest. The honest posture is to own the assets that exist (fleets, fuel, delivery slots) and treat the futures (SMRs, announced campuses) as options. The question that matters now is narrower than whether there is a shortage. It is who gets paid for it.",
    },
    {
      type: 'heading',
      text: 'Who gets paid while the grid falls behind',
      level: 2,
    },
    {
      type: 'paragraph',
      text: "A shortfall is a transfer. When a 1.2 GW campus cannot get a grid connection for five years, the value of speed moves to whoever can deliver megawatts sooner, and the bill lands on whoever cannot avoid paying for scarcity. The clearest winners are the owners of firm power that already exists. PJM's capacity price has risen more than elevenfold, from $28.92 to $333.44 per megawatt-day in three auctions, and the uncapped clears near $530 to $555 show how much headroom the cap is holding back. Constellation, Vistra and Talen sell into that market and into 20-year contracts with buyers who will pay a premium for certainty, so their earnings now track the length of the queue, not the price of gas.",
    },
    {
      type: 'paragraph',
      text: "The second winner is whoever sells the way around the queue. SemiAnalysis tracks about 75 GW of firm, binding behind-the-meter orders for AI datacenters, roughly 20 GW of them placed in the second quarter of 2026 alone, and Microsoft has signed more than 5 GW of on-site capacity this year, 2.7 GW with Chevron. That spending lands with turbine makers (GE Vernova, Siemens Energy, Mitsubishi Heavy), with fuel-cell suppliers that can switch a site on in months rather than years (Bloom Energy's Oracle agreement covers up to 2.8 GW, and NTT DATA committed to 900 MW in November 2026), and with gas producers and pipelines feeding Texas campuses where on-site generation is easiest to permit.",
    },
    {
      type: 'paragraph',
      text: "The third winner is the equipment chain inside and around the building, which gets paid whichever power source wins. Vertiv's organic orders more than doubled year over year in the third quarter of 2026, with sales up 61% to $4.31 billion, on demand for power distribution and liquid cooling at GB200-class densities. Quanta Services, the largest US transmission builder, and transformer and switchgear makers (Eaton, Hitachi Energy, and GE Vernova, which agreed a $9 billion purchase of Trench Group in October) sell into the same scarcity from the grid side. Regulated utilities such as NextEra convert the load into rate base. The fuel cycle (Cameco, Centrus) collects the slower, longer premium as term uranium contracts reprice.",
    },
    {
      type: 'dossier-table',
      figureLabel: 'FIG. 7 · WHO GETS PAID FOR THE SHORTFALL',
      kicker:
        'SIX GROUPS THAT EARN FROM AI DEMAND OUTRUNNING GRID SUPPLY · ANCHOR = THE MOST RECENT REPORTED DATAPOINT FOR EACH · TAP A ROW FOR THE DOSSIER',
      hint: 'Each row: how the group earns from the gap, its anchor datapoint, and what would end the trade.',
      source:
        'PJM BRA results (Dec 2025, Jul 2026); GE Vernova and Vertiv Q3 2026 results (Oct 28 2026); SemiAnalysis behind-the-meter tracker (Sep 2026); Bloom Energy, Oracle and NTT DATA announcements; TradeTech long-term uranium indicator (Oct 31 2026).',
      headers: ['Group', 'How it earns from the gap', 'Anchor', 'What ends the trade', 'Dossier'],
      rows: [
        {
          name: 'Firm-power owners',
          tag: 'CEG · VST · TLN',
          role: 'Sell existing always-on capacity into capped-out auctions and long PPAs',
          anchor: '$333.44/MW-day',
          keyRisk: 'A PJM redesign toward lower, cost-based capacity prices',
          dossier: [
            {
              label: 'Why now',
              text: 'Three straight PJM auctions at the cap; uncapped simulations near $530 (2027/28) and $555 (2028/29).',
            },
            {
              label: 'Watch',
              text: 'The 2029/30 auction in December 2026, and any extension or removal of the price collar.',
            },
          ],
        },
        {
          name: 'Turbine makers',
          tag: 'GEV · Siemens Energy · MHI',
          role: 'Gas turbines for utilities and on-site datacenter plants',
          anchor: '122 GW backlog + slots',
          keyRisk: 'Orders peak while deliveries catch up; slot reservations convert slower',
          dossier: [
            {
              label: 'Datapoint',
              text: 'GE Vernova: 122 GW of gas equipment in backlog or slot reservations at Q3 2026, at least 130 GW expected by year-end; total backlog $197 billion.',
            },
            {
              label: 'Watch',
              text: 'Quarterly slot-reservation additions: Q3 added 6 GW net against double-digit quarters earlier in 2026.',
            },
          ],
        },
        {
          name: 'On-site power',
          tag: 'BE · gas producers',
          role: 'Behind-the-meter generation that skips the interconnection queue',
          anchor: '~75 GW BTM orders',
          keyRisk: 'Faster queue reform makes grid power cheaper than islanded power',
          dossier: [
            {
              label: 'Datapoint',
              text: 'About 75 GW of firm behind-the-meter orders tracked by SemiAnalysis, ~20 GW of them in Q2 2026; Bloom-Oracle up to 2.8 GW; NTT DATA 900 MW.',
            },
            {
              label: 'Watch',
              text: 'Texas permitting for on-site gas, and FERC rules on who pays for the grid that co-located load leaves behind.',
            },
          ],
        },
        {
          name: 'Datacenter power and cooling',
          tag: 'VRT · ETN',
          role: 'Power distribution, UPS and liquid cooling inside every new hall',
          anchor: 'Orders +100% y/y',
          keyRisk: 'A capex pause at the four hyperscalers',
          dossier: [
            {
              label: 'Datapoint',
              text: 'Vertiv Q3 2026: sales up 61% to $4.31 billion, organic orders more than doubled, 2026 sales guidance raised to $14.45-14.85 billion.',
            },
            {
              label: 'Watch',
              text: 'Hyperscaler 2027 capex guidance in the January-February 2027 earnings season.',
            },
          ],
        },
        {
          name: 'Grid builders',
          tag: 'PWR · transformer makers',
          role: 'Transmission, substations and the transformers they wait on',
          anchor: '2-3 yr transformer lead times',
          keyRisk: 'Labor and steel costs outrun fixed-price contracts',
          dossier: [
            {
              label: 'Why now',
              text: 'Every interconnection that does clear needs new wires and transformers; lead times roughly doubled from pre-2020 norms.',
            },
            {
              label: 'Watch',
              text: 'Utility capital plans and transmission approvals in PJM, ERCOT and MISO.',
            },
          ],
        },
        {
          name: 'Nuclear fuel cycle',
          tag: 'CCJ · LEU',
          role: 'Uranium and enrichment for a fleet that now runs for decades longer',
          anchor: '$99/lb term price',
          keyRisk: 'Restarts and new reactors slip, so fuel demand arrives later',
          dossier: [
            {
              label: 'Datapoint',
              text: 'TradeTech long-term price $99/lb at Oct 31 2026, a series high; spot about $90-91 in November 2026.',
            },
            {
              label: 'Watch',
              text: 'Crane restart (targeted 2H 2027) and the end of Russian enrichment waivers in 2027.',
            },
          ],
        },
      ],
    },
    {
      type: 'paragraph',
      text: 'The other side of the ledger is just as concrete. Households and industrial customers in PJM pay capacity charges set by those auctions, about $16.4 billion of cleared capacity in the 2028/29 auction alone, which is why governors forced the price cap and why rate cases are turning political. Developers who bought land and chips before securing power hold stranded optionality, and grid-dependent campuses in Northern Virginia wait behind faster markets such as Texas. The posture that follows is to own the assets that already exist or that sell the bypass (fleets, turbines, on-site power, cooling, fuel), treat the futures (SMRs, announced campuses) as options, and use the December 2026 PJM auction as the next mark of whether scarcity is still setting the price.',
    },
    {
      type: 'cta-callout',
      headline: 'Track the companies paid by the power gap',
      body: "Every name in FIG. 7, from Constellation and GE Vernova to Vertiv, Bloom Energy and Cameco, has a live page in Ezana's US Equities research with price, fundamentals, institutional ownership and filings. Put them side by side and watch how each trades into the December PJM auction.",
      ctaLabel: 'Open US Equities research',
      ctaHref: '/company-research',
      ctaAuthGate: false,
    },
  ],
};

export default datacenterPowerCrunch2026;
