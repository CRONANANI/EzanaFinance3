// src/lib/ezana-echo-article-datacenter-power-crunch-2026.js
// Ezana Echo DRAFT article: AI datacenter power demand vs. grid capacity, the
// nuclear-adjacent trade, and the utility capex supercycle.
// status: 'draft', NOT publicly rendered; every factual claim below is guarded
// with [VERIFY] and listed in the manifest for human fact-check before publish.
//
// ============================================================
// FACT CHECK MANIFEST (status: draft, nothing publishes until cleared)
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
    'US datacenters drew roughly 176 TWh in 2023 [VERIFY: LBNL] and could need 325-580 TWh by 2028, while interconnection queues sit on ~2,600 GW of stalled supply [VERIFY: LBNL Queued Up]. The gap is repricing nuclear fleets, uranium, and a utility capex supercycle.',
  heroImage: {
    src: '/images/ezana-echo/datacenter-power-crunch-2026-hero.png',
    alt: 'High-voltage transmission lines converging on a glowing hyperscale datacenter campus at dusk, cooling towers of a nuclear plant on the horizon.',
    caption:
      'The AI build-out has turned electricity into the scarce input: every gigawatt of compute now needs a gigawatt of firm supply, and the queue for it is years long.',
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
      note: 'US datacenter electricity demand, actuals through 2023 and a midpoint path of the LBNL 325-580 TWh 2028 scenario range thereafter. DRAFT [VERIFY: LBNL 2024 US Data Center Energy Usage Report].',
    },
    cities: [
      {
        name: 'Ashburn',
        country: 'US',
        lat: 39.04,
        lng: -77.49,
        impact:
          'Loudoun County, Virginia, is "Data Center Alley," the largest datacenter market in the world [VERIFY: JLARC 2024 study]. Dominion, its utility, reports contracted datacenter capacity in the tens of gigawatts, the single clearest local expression of the national demand shock [VERIFY: Dominion earnings materials].',
      },
      {
        name: 'Middletown',
        country: 'US',
        lat: 40.15,
        lng: -76.72,
        impact:
          'Three Mile Island Unit 1, shut in 2019 for economics, is being restarted as the Crane Clean Energy Center under a 20-year, 835 MW PPA with Microsoft, with the target date pulled forward to 2027 [VERIFY: Constellation announcements]. A retired reactor coming back for a single corporate buyer is the era in one datapoint.',
      },
      {
        name: 'Abilene',
        country: 'US',
        lat: 32.45,
        lng: -99.73,
        impact:
          'The first Stargate campus in ERCOT territory is planned to scale toward ~1.2 GW of load [VERIFY: OpenAI/Oracle announcements], a single site drawing more power than some utility service territories. Texas interconnects load faster than any other US market, which is exactly why the AI build-out keeps landing there.',
      },
      {
        name: 'Saskatoon',
        country: 'CA',
        lat: 52.13,
        lng: -106.67,
        impact:
          'Cameco, headquartered here, restarted McArthur River in 2022 after a four-year suspension [VERIFY: Cameco] and now sits at the head of the Western uranium supply chain just as the US ban on Russian enriched uranium forces the fuel cycle to re-shore [VERIFY: Public Law 118-62].',
      },
    ],
  },
  author: 'Ezana Finance Editorial',
  meta: {
    sectors: ['Utilities', 'Energy', 'Information Technology'],
    industries: ['Electric Utilities', 'Independent Power Producers', 'Uranium & Nuclear Fuel'],
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
  tickers: ['CEG', 'VST', 'TLN', 'NEE', 'D', 'CCJ', 'LEU', 'SMR', 'OKLO', 'URA'],
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
  readTime: 9,
  publishedAt: '2026-08-11',
  listMeta: '11 Aug 2026',
  featured: false,
  likes: 0,
  comments: 0,
  reads: 0,
  status: 'published',
  contentBlocks: [
    {
      type: 'paragraph',
      text: 'The binding constraint on artificial intelligence is no longer chips, capital, or talent. It is electricity. US datacenters consumed roughly 176 terawatt-hours in 2023, about 4.4% of national electricity demand [VERIFY: LBNL 2024 US Data Center Energy Usage Report], and Lawrence Berkeley National Laboratory projects that figure reaching 325 to 580 TWh by 2028, as much as 12% of US consumption [VERIFY: LBNL 2024 report]. The grid supplying that load is adding capacity at a fraction of the required pace, with roughly 2,600 gigawatts of proposed generation and storage stalled in interconnection queues [VERIFY: LBNL Queued Up 2024]. That mismatch, demand compounding at datacenter speed against supply moving at utility speed, is the most investable imbalance in the market today.',
    },
    {
      type: 'stat-grid',
      stats: [
        {
          label: 'US datacenter demand (2023)',
          value: '176 TWh',
          change: '~4.4% of US electricity [VERIFY: LBNL]',
        },
        {
          label: 'Projected demand by 2028',
          value: '325-580 TWh',
          change: 'LBNL scenario range [VERIFY]',
        },
        {
          label: 'Stuck in interconnection queues',
          value: '~2,600 GW',
          change: 'Active requests, end-2023 [VERIFY: LBNL Queued Up]',
        },
        {
          label: 'PJM capacity price, one auction',
          value: '$28.92 to $269.92',
          change: 'Per MW-day, ~9x jump [VERIFY: PJM 2025/26 BRA]',
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
      text: 'The demand side of the ledger is compounding. The International Energy Agency estimates global datacenter consumption at roughly 415 TWh in 2024, about 1.5% of world electricity, and its base case has that doubling to around 945 TWh by 2030 [VERIFY: IEA Energy and AI report, April 2025], with AI-accelerated servers accounting for the majority of the growth [VERIFY: IEA]. The physics behind the curve is rack density: a legacy CPU rack draws 8 to 17 kilowatts, while a modern GPU training rack draws 80 to 130 kilowatts or more [VERIFY: NVIDIA GB200 spec sheets; Uptime Institute]. The [[kw:hyperscalers]]hyperscalers[[/kw]] funding this build-out, Microsoft, Alphabet, Amazon, and Meta, guided to combined 2025 capital expenditure above $300 billion, most of it aimed at AI datacenters [VERIFY: company earnings calls].',
    },
    {
      type: 'paragraph',
      text: 'This piece is the physical-world sequel to a thesis Ezana Echo has already mapped: the consolidation analysis "They\'re Not Buying the Model" argued that 2026\'s $100-billion-plus tech M&A wave is a land-grab for proprietary data pipelines and workflow positions rather than for models. Every one of those pipelines terminates in a building that draws megawatts. The same logic that made data the scarce input upstream makes firm power the scarce input downstream, and the scarcity premium is migrating from software multiples to generation assets.',
    },
    {
      type: 'paragraph',
      text: 'Against that demand curve, supply is arithmetic. US utility-scale capacity additions ran about 49 GW in 2024 and roughly 63 GW planned for 2025 [VERIFY: EIA generator inventory], strong years by historical standards, yet most of it intermittent solar and storage rather than the around-the-clock firm power an [[kw:ai-supercluster]]AI supercluster[[/kw]] requires. A gigawatt-class training campus needs its power at a 99.999% duty cycle; a solar farm delivers a 25% capacity factor. The gap between the bars and the line in the figure below is the whole story: demand measured in terawatt-hours consumed, supply measured in gigawatts that mostly cannot run at night.',
    },
    {
      type: 'multi-axis',
      figureLabel: 'FIG. 1 · DEMAND COMPOUNDS, SUPPLY CRAWLS',
      kicker:
        'US DATACENTER POWER DEMAND (TWh, BARS, LEFT AXIS) VS. US UTILITY-SCALE CAPACITY ADDITIONS (GW, LINE, RIGHT AXIS) · 2024 ONWARD BLENDS ACTUALS, EIA PLANNED ADDITIONS, AND A MIDPOINT PATH OF THE LBNL 2028 SCENARIO RANGE.',
      hint: 'Bar = datacenter demand (TWh, left axis); line = grid capacity additions (GW, right axis).',
      source:
        'DRAFT [VERIFY: LBNL 2024 US Data Center Energy Usage Report; EIA Preliminary Monthly Electric Generator Inventory; IEA Energy and AI (2025)]',
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
      text: 'The US does not lack proposed generation; it lacks the ability to connect it. Lawrence Berkeley National Laboratory\'s "Queued Up" study counted roughly 2,600 GW of generation and storage in active interconnection queues at the end of 2023, about 95% of it solar, wind, and batteries [VERIFY: LBNL Queued Up 2024]. The median project now waits around five years from interconnection request to commercial operation, versus under two years for projects built in 2008 [VERIFY: LBNL Queued Up], and historically only 13 to 14% of queued projects ever reach commercial operation [VERIFY: LBNL completion-rate analysis]. Queue position, not [[kw:nameplate-capacity]]nameplate capacity[[/kw]] on paper, is what determines when electrons actually flow, and the queue has become the single longest lead-time item in the entire AI supply chain.',
    },
    {
      type: 'callout',
      label: 'The queue vs. the grid',
      value: '~2,600 GW waiting',
      context:
        'Active interconnection requests total roughly twice the ~1,300 GW of utility-scale capacity actually installed in the United States [VERIFY: LBNL Queued Up 2024; EIA existing-capacity data]. The pipeline is enormous; the pipe is not.',
    },
    {
      type: 'heading',
      text: 'The nuclear premium: PPAs, restarts, and co-location',
      level: 2,
    },
    {
      type: 'paragraph',
      text: "Hyperscalers responded by going around the queue and straight to existing firm capacity, and nuclear is the asset they want. Microsoft signed a 20-year power purchase agreement with Constellation to restart the 835 MW Three Mile Island Unit 1 as the Crane Clean Energy Center, with the return-to-service target pulled forward to 2027 [VERIFY: Constellation announcements]. Amazon agreed to take up to 960 MW co-located at Talen's Susquehanna plant, in a structure reworked after FERC rejected the original interconnection amendment [VERIFY: Talen-AWS filings]. Meta signed a 20-year deal for the full 1,121 MW output of Constellation's Clinton plant from 2027 [VERIFY: Constellation-Meta announcement]. These contracts are [[kw:infrastructure-lock-in]]infrastructure lock-in[[/kw]] running in reverse: instead of the utility locking in the customer, the customer is locking up the plant, for decades, at premium prices.",
    },
    {
      type: 'quote',
      text: 'The energy industry cannot be the reason that America loses the AI race. Restarting a retired reactor for a single buyer would have been unthinkable five years ago; today it is the market clearing.',
      source:
        'Paraphrasing Joe Dominguez, Constellation CEO, at the Crane announcement, September 2024 [VERIFY: as-reported remarks]',
    },
    {
      type: 'paragraph',
      text: "The market signal confirming the scarcity is the price of capacity itself. PJM, the grid operator spanning 13 states from Virginia's datacenter corridor to Chicago, saw its 2025/26 capacity auction clear at $269.92 per megawatt-day, up from $28.92 the year before, a roughly ninefold jump [VERIFY: PJM Base Residual Auction results], and the following auction cleared at $329.17, pinned at the price cap [VERIFY: PJM 2026/27 BRA]. [[person:joe-dominguez]]Joe Dominguez[[/person]] has built Constellation's entire equity story on this repricing: the largest US nuclear fleet, roughly 32 GW of capacity running at nuclear-fleet capacity factors near 93% [VERIFY: company filings; EIA fleet data], suddenly holds the scarcest commodity in the AI economy, always-on carbon-free power that already exists.",
    },
    {
      type: 'heading',
      text: 'Three ways the build-out resolves',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'How the crunch resolves depends on two clocks: how fast reform accelerates the queue, and how fast hyperscalers route around it. FERC Order 2023 moved interconnection to first-ready-first-served cluster studies with real deposits [VERIFY: FERC Order 2023], and the ADVANCE Act plus a string of pro-nuclear executive actions have compressed NRC licensing timelines [VERIFY: ADVANCE Act, 2024], a genuine [[kw:regulatory-catalyst]]regulatory catalyst[[/kw]] for both the queue and the reactor pipeline. The scenarios below trace the three paths the next four years can take, and what each one does to power prices and the trade.',
    },
    {
      type: 'scenario-chain',
      figureLabel: 'FIG. 2 · THREE PATHS FOR THE POWER CRUNCH',
      kicker:
        'BASE · ALT · BEAR: HOW GRID SUPPLY AND AI DEMAND RECONCILE THROUGH 2030, AND THE PRICE SIGNAL EACH PATH SENDS.',
      hint: 'Three build-out scenarios; the kill switch is the indicator that flips the base case.',
      source:
        'DRAFT [VERIFY: EIA planned-additions data; FERC Order 2023; PJM auction results; hyperscaler co-location announcements]',
      scenarios: [
        {
          id: 'grid-keeps-pace',
          label: 'Grid keeps pace',
          tone: 'base',
          range: '2026-2030',
          steps: [
            {
              label: 'Queue reform bites',
              sub: 'FERC Order 2023 cluster studies clear backlog [VERIFY]',
            },
            {
              label: 'Additions hold ~70 GW/yr',
              sub: 'solar + storage + new gas [VERIFY: EIA planned]',
            },
            {
              label: 'Restarts and uprates add firm supply',
              sub: 'Crane 2027, Clinton extension [VERIFY]',
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
              sub: 'Susquehanna model spreads [VERIFY: Talen-AWS]',
            },
            {
              label: 'On-site gas and SMR orders ramp',
              sub: 'turbine slots sold out into 2028 [VERIFY: GE Vernova]',
            },
            {
              label: 'Cost-shift fights escalate at FERC',
              sub: 'who pays for the grid the load left behind',
            },
          ],
          result: {
            value: '30+ GW',
            sub: 'of AI load bypasses the queue [VERIFY: announcement tally]',
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
              sub: 'reform lags, transformer lead times bind [VERIFY: LBNL; Wood Mackenzie]',
            },
            {
              label: 'Capacity auctions clear at caps',
              sub: 'PJM repeats $329/MW-day prints [VERIFY: PJM]',
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
        'A second consecutive PJM auction clearing at its price cap: the sign that scarcity, not policy, has become the price-setter for AI compute, and that the bear path is live.',
    },
    {
      type: 'heading',
      text: 'The uranium leg of the trade',
      level: 2,
    },
    {
      type: 'paragraph',
      text: "If existing reactors are the scarce asset, their fuel is the scarce input behind it. Uranium spot prices rose from roughly $30 per pound in early 2021 to a peak near $106 in early 2024 before settling into a $65-80 band through 2025 and 2026 [VERIFY: UxC/Cameco price history], a repricing with the classic anatomy of a [[kw:commodity-supercycle]]commodity supercycle[[/kw]]: a decade of underinvestment after Fukushima, inventories drawn down, then a structural demand shock arriving faster than mines can respond. Cameco, which restarted McArthur River in 2022 after a four-year suspension [VERIFY: Cameco], is the Western fuel cycle's anchor asset, and the US ban on Russian enriched uranium, signed in May 2024 with waivers running only through 2027 [VERIFY: Public Law 118-62], forces the re-shoring of a fuel chain in which Russia had supplied roughly a fifth to a quarter of US enrichment [VERIFY: EIA uranium reports].",
    },
    {
      type: 'paragraph',
      text: "The small modular reactor names are the venture tranche of the same thesis. NuScale holds the first NRC-certified US SMR design [VERIFY: NRC records], and Oklo, led by co-founder [[person:jacob-dewitte]]Jacob DeWitte[[/person]], is pursuing a combined license for its Aurora fast reactor after an initial application was denied in 2022 [VERIFY: NRC docket]; Sam Altman chaired Oklo's board until stepping down in April 2025 as OpenAI began exploring energy deals directly [VERIFY: Oklo filings]. Centrus, the only US-licensed producer of the high-assay fuel most SMR designs need, delivered its first HALEU to the Department of Energy in late 2023 [VERIFY: Centrus/DOE]. None of these companies has meaningful revenue from operating reactors yet; they trade on licensing milestones and letters of intent, which makes them optionality, not cash flow.",
    },
    {
      type: 'heading',
      text: 'The utility capex supercycle',
      level: 2,
    },
    {
      type: 'paragraph',
      text: "For regulated utilities, the crunch is not a crisis but an order book. Investor-owned utility capital spending tracked by the Edison Electric Institute ran near $185-200 billion in 2025, with five-year plans totaling well over a trillion dollars [VERIFY: EEI capex surveys], the largest peacetime infrastructure program in the sector's history. [[person:john-ketchum]]John Ketchum[[/person]], NextEra's CEO, frames the demand backdrop as US power consumption growing roughly 55% over the next two decades, about six times the prior decade's pace [VERIFY: Ketchum public remarks]. Every dollar of that spend earns a regulated return, which is why growth utilities now guide to 8-10% annual rate-base growth [VERIFY: investor materials], bond-like businesses compounding at tech-adjacent rates because the [[kw:capex-cycle]]capex cycle[[/kw]] runs through their balance sheets.",
    },
    {
      type: 'paragraph',
      text: "The physical constraints are where the cycle bites. GE Vernova's heavy-duty gas turbine slots are effectively sold out into 2028 [VERIFY: GE Vernova earnings calls], and large power transformer lead times have stretched to two to three years, roughly double pre-2020 norms [VERIFY: Wood Mackenzie/NREL]. Scarcity along the equipment chain means the companies that already own capacity, or already hold delivery slots, capture the pricing; latecomers pay up or wait. That is the same dynamic playing out at every layer of this story, from queue positions to reactor fuel to transformer steel.",
    },
    {
      type: 'callout',
      label: 'The equipment wall',
      value: '2-3 year lead times',
      context:
        'Large power transformers now quote lead times of two to three years, roughly double pre-2020 norms, and heavy-duty gas turbine slots are sold out into 2028 [VERIFY: Wood Mackenzie; GE Vernova]. The build-out is rationed by hardware, not intent.',
    },
    {
      type: 'heading',
      text: 'How to frame the trade',
      level: 2,
    },
    {
      type: 'paragraph',
      text: "The investable map sorts into four baskets. Unregulated nuclear-heavy generators (CEG, VST, TLN) sell existing firm power into a market that suddenly wants decades of it. Regulated growth utilities (NEE, D) convert the same demand into rate-base compounding. The fuel cycle (CCJ, LEU, and the URA ETF as the basket expression) is a play on the enrichment [[kw:supply-chain-chokepoint]]supply-chain chokepoint[[/kw]] the Russian import ban created [VERIFY: Public Law 118-62]. And the SMR tranche (SMR, OKLO, with GE Vernova's turbine franchise as the picks-and-shovels adjacency) is licensing-milestone optionality. The figure below plots the generator set on the axes that matter: how hard the fleet already runs, how big it is, and what the market pays for it.",
    },
    {
      type: 'bubble-field',
      figureLabel: 'FIG. 3 · WHO OWNS THE FIRM POWER',
      kicker:
        'US POWER PRODUCERS · X = FLEET CAPACITY FACTOR (%) · Y = GENERATING CAPACITY (GW) · BUBBLE = MARKET CAP ($B) · SHADED ZONE = NUCLEAR-CLASS UTILIZATION AT SCALE, WHERE THE HYPERSCALER PPAS ARE BEING SIGNED. URANIUM AND SMR NAMES ARE EXCLUDED: CAPACITY-FACTOR AXES DO NOT APPLY TO MINERS OR PRE-REVENUE DEVELOPERS.',
      hint: 'Up and to the right at size = always-on fleets the AI buyers want under contract.',
      source:
        'DRAFT [VERIFY: company 10-K fleet and generation disclosures for capacity factors; market capitalizations as of August 2026]',
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
      text: "The base case is that the crunch persists through the decade: LBNL's midpoint path implies US datacenter demand near 480 TWh by 2028 [VERIFY: LBNL scenario range], queue reform helps at the margin, and firm-power owners keep pricing power while the capex supercycle compounds through regulated rate bases. The bear case for the trade is a demand air-pocket: if AI training spend consolidates the way the M&A wave suggests capital already is, some announced gigawatts never get built, and the names priced for scarcity, particularly the pre-revenue SMR tranche, reprice hardest. The honest posture is to own the assets that exist (fleets, fuel, delivery slots) and treat the futures (SMRs, announced campuses) as options. Ezana's screening tools can track the whole stack: build the four baskets, watch PJM auction prints and NRC milestones as the catalysts, and let the queue data, not the press releases, mark the pace of the build-out.",
    },
  ],
};

export default datacenterPowerCrunch2026;
