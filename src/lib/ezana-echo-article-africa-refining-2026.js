/**
 * Long-form Ezana Echo article: Africa's refining buildout and the Dangote
 * inflection (2026). Editorial / illustrative data for in-app content — figures
 * are attributed to public reporting (Energy News Africa, Nairametrics, Africap
 * Research, S&P Global) and were current as of July 2026. Not live market data.
 */
export const africaRefiningArticle2026 = {
  id: 'africa-refining-capacity-dangote-inflection-2026',
  title:
    'Africa Stops Exporting Its Crude Raw: Inside the 3.5-Million-Barrel Refining Buildout Dangote Now Leads',
  excerpt:
    "Africa's top 20 refineries now process over 3.5 million barrels a day — and a single Nigerian facility at 650,000 bpd has rewritten the continent's downstream map, cutting an estimated $10 billion a year in fuel-import costs and drawing supply requests from South Africa to Kenya.",
  heroImage: {
    src: '/africa-billion-companies-map.png',
    alt: 'Stylized map of the African continent used to illustrate a continent-wide industrial story',
    caption:
      "Africa's top 20 refineries now clear roughly 3.5 million barrels a day — and one Nigerian facility reset the map.",
  },
  contentBlocks: [
    {
      type: 'paragraph',
      text: "For decades the paradox of African oil was that the continent pumped crude by the millions of barrels and then bought its own fuel back, refined, at a premium. That is changing fast. Africa's top 20 refineries now process more than 3.5 million barrels per day combined, and a single Nigerian facility reaching 650,000 bpd — since pushed to 700,000 — has flipped the economics of the entire [[kw:downstream-sector]]downstream sector[[/kw]]. The ranking of refineries is the setup; the real story is a continent that is finally refining its own crude instead of shipping it raw and importing the finished product.",
    },
    {
      type: 'paragraph',
      text: "The scale of that reversal is easy to understate. Nigeria, the continent's largest crude producer at roughly 1.4 million barrels per day of output, spent years importing more than 80% of the gasoline and diesel its own citizens burned — a self-inflicted drain on hard currency that no amount of upstream production could offset. West Africa as a region shipped the bulk of its crude to refiners in Europe, India, and North America, then re-imported the finished fuel at a markup that included freight, insurance, and someone else's refining margin. The buildout now under way is an attempt to capture that margin at home, and the numbers behind it are large enough to move a national balance sheet.",
    },
    {
      type: 'stat-grid',
      stats: [
        {
          label: 'Dangote nameplate',
          value: '650,000 bpd',
          change: 'Full rate reached Feb 11, 2026',
        },
        { label: 'Est. Nigeria FX savings', value: '$10B/yr', change: 'From cutting fuel imports' },
        { label: 'Former import reliance', value: '>80%', change: 'Refined product, historically' },
        { label: 'Africa top-20 total', value: '3.5M bpd', change: 'Combined refining capacity' },
        { label: 'Planned Dangote scale', value: '1.4M bpd', change: 'Would be world’s largest' },
      ],
    },

    { type: 'heading', text: 'The Dangote inflection', level: 2 },
    {
      type: 'paragraph',
      text: "The facility that changed the math sits in the Lekki Free Zone outside Lagos. Built by [[person:aliko-dangote]]Aliko Dangote[[/person]], Africa's wealthiest industrialist, the refinery reached its full 650,000 barrels-per-day nameplate on February 11, 2026 — making it the first [[kw:single-train-refinery]]single-train refinery[[/kw]] anywhere in the world to operate at that scale. Single-train means one continuous, integrated processing line rather than several smaller units bolted together; it is far cheaper to run per barrel but far harder to engineer, which is why nothing else on the planet had reached 650,000 bpd on a single line. By June 2026 the plant was running at roughly 700,000 bpd in performance testing, exceeding its own design rate.",
    },
    {
      type: 'paragraph',
      text: 'Single-train scale is not a vanity metric. A refinery built as one integrated line shares utilities, hydrogen, and heat across the whole plant, so its cost per processed barrel falls well below that of a facility assembled from several smaller units — the reason the design is coveted and the reason it is so rarely attempted at 650,000 bpd. The tradeoff is fragility: when one train carries the entire load, an unplanned outage takes the whole plant offline rather than a fraction of it. That the Dangote line ramped to full rate and then pushed 8% beyond nameplate, to 700,000 bpd, in performance testing is the engineering signal that matters more than the ribbon-cutting.',
    },
    {
      type: 'paragraph',
      text: "The trajectory from here is what unsettles the global rankings. In October 2025 Dangote announced an expansion to 1.4 million bpd — a figure that, if achieved, would surpass Reliance's Jamnagar complex in India (about 1.36 million bpd) as the largest [[kw:refining-capacity]]refining capacity[[/kw]] at a single site in the world. That would move the title of the planet's biggest refinery from Gujarat to Lagos. It also concentrates an outsized share of Africa's downstream future in one company's hands: a private firm would then anchor more than a million barrels a day of processing, more capacity than most African states operate in total, and enough to supply several neighboring markets on its own.",
    },
    {
      type: 'wall-timeline',
      figureLabel: 'FIG. 1 · THE DANGOTE INFLECTION',
      kicker:
        'DANGOTE REFINERY MILESTONES · OCT 2025 – JUN 2026 · FRACTIONAL-YEAR MARKERS. CLICK ANY PLAQUE FOR THE RECORD.',
      hint: 'Click a plaque for its record.',
      source: 'Nairametrics, Energy News Africa, company statements (2025–2026).',
      startYear: 2025,
      endYear: 2027,
      windows: [
        {
          id: 'inflection',
          label: 'The inflection window',
          from: 2025.8,
          to: 2026.45,
          color: 'var(--echo-chart-green)',
        },
      ],
      plaques: [
        {
          year: 2025.8,
          lane: 0,
          label: 'Oct 2025',
          detail:
            'Dangote announces an expansion to 1.4 million bpd — a target that, if reached, would be the largest single-site refining capacity in the world.',
        },
        {
          year: 2026.12,
          lane: 1,
          label: 'Feb 11, 2026',
          detail:
            'The refinery reaches its full 650,000 bpd nameplate — the first single-train refinery anywhere to operate at that scale.',
        },
        {
          year: 2026.45,
          lane: 2,
          label: 'Jun 2026',
          detail:
            'The plant runs at roughly 700,000 bpd in performance testing, about 8% beyond its own design rate.',
        },
      ],
    },
    {
      type: 'paragraph',
      text: "The macro prize is bigger than fuel logistics. Nigeria historically imported more than 80% of its refined products despite being one of the world's larger crude producers, spending scarce hard currency on gasoline and diesel it could have made at home. Analysts estimate that domestic refining could save Nigeria up to $10 billion a year in [[kw:foreign-exchange-reserves]]foreign-exchange reserves[[/kw]], easing chronic pressure on the naira and narrowing a trade balance long distorted by fuel imports. Replacing imported product with domestic output is a structural change to the country's external accounts, not a one-off saving.",
    },
    {
      type: 'callout',
      label: 'Estimated annual Nigerian FX savings',
      value: '$10B/yr',
      context:
        'Cutting refined-product imports frees hard currency that Nigeria previously spent buying back fuel made from its own crude — direct relief for the naira and the trade balance.',
    },
    {
      type: 'paragraph',
      text: "There is a second-order currency effect that compounds the first. When a country imports fuel, it must sell local currency to buy dollars every time a cargo lands, a recurring demand for hard currency that weighed on the naira for years and fed the gap between Nigeria's official and parallel exchange rates. Refining at home removes a large slice of that structural dollar demand and, at the margin, lets the country sell refined product abroad for dollars instead. The refinery does not fix Nigeria's monetary problems on its own, but at 650,000 bpd it changes the direction of one of the largest single line items in the country's import bill — and it is the first Nigerian megaproject in a generation delivering at that scale.",
    },

    { type: 'heading', text: 'The rest of the continental map', level: 2 },
    {
      type: 'paragraph',
      text: "Dangote dominates, but it does not stand alone. Algeria's Sonatrach-operated Skikda refinery is the continent's number two at roughly 350,000 bpd, and Libya's Ras Lanuf ranks third at around 220,000 bpd. North Africa's plants were built to feed export markets across the Mediterranean, so their output moves largely Europe-ward — a different orientation from West Africa's new domestic pivot. Their crude slates are priced off global [[kw:crude-oil-benchmark]]crude-oil benchmarks[[/kw]] like Brent and Nigeria's own Bonny Light, which set the reference for African barrels sold into world markets.",
    },
    {
      type: 'tile-grid',
      figureLabel: "FIG. 2 · AFRICA'S LARGEST REFINERIES",
      kicker:
        'NAMEPLATE REFINING CAPACITY, 000 BPD · ONE TILE PER FACILITY, PLACED ROUGHLY BY REGION · SHADED BY CAPACITY CLASS.',
      hint: 'Each tile is a refinery; colour is its capacity band, placement is geographic.',
      source:
        'Nameplate refining capacity for leading African facilities. South Africa shown as combined Sasol/Secunda output. Sources: Energy News Africa, Nairametrics, Africap Research (2026); nameplate figures, not achieved output.',
      classes: [
        { upTo: 150, label: '≤ 150k bpd' },
        { upTo: 250, label: '151–250k bpd' },
        { upTo: 400, label: '251–400k bpd' },
        { upTo: 700, label: '400k+ bpd' },
      ],
      tiles: [
        { code: 'DZ', label: 'Skikda (Algeria)', x: 1, y: 0, value: 350 },
        { code: 'LY', label: 'Ras Lanuf (Libya)', x: 2, y: 0, value: 220 },
        { code: 'EG1', label: 'Mostorod (Egypt)', x: 4, y: 0, value: 161 },
        { code: 'EG2', label: 'MIDOR (Egypt)', x: 5, y: 0, value: 160 },
        { code: 'EG3', label: 'El Nasr (Egypt)', x: 5, y: 1, value: 131 },
        { code: 'NG3', label: 'Kaduna (Nigeria)', x: 1, y: 2, value: 110 },
        { code: 'NG1', label: 'Dangote (Nigeria)', x: 1, y: 3, value: 650 },
        { code: 'NG2', label: 'Port Harcourt (Nigeria)', x: 2, y: 3, value: 210 },
        { code: 'ZA', label: 'Sasol/Secunda (S. Africa)', x: 2, y: 5, value: 300 },
      ],
    },
    {
      type: 'paragraph',
      text: "Egypt punches above its weight with a cluster of mid-sized plants: Mostorod at 161,000 bpd (recently the target of a $4.3 billion upgrade), MIDOR at 160,000 bpd, and El Nasr at 131,000 bpd. Together they make Egypt the continent's most refinery-dense country by facility count, positioning it as a processing hub for both domestic demand and regional [[kw:refined-product-exports]]refined-product exports[[/kw]]. The spread of Egyptian capacity across several sites is the opposite model to Dangote's single-mega-plant bet.",
    },
    {
      type: 'paragraph',
      text: "South Africa is the outlier in method. Alongside the Sasol/Natref crude refinery, the country runs the Secunda complex — the world's largest commercial [[kw:coal-to-liquids]]coal-to-liquids[[/kw]] operation, which synthesizes fuels from coal rather than crude, a legacy of the apartheid-era sanctions that forced domestic fuel production. Astron Energy's Cape Town refinery also sits inside Africa's top 20. South Africa therefore blends conventional refining with a coal-based process found almost nowhere else at scale, giving it an unusual and carbon-heavy fuel mix.",
    },

    { type: 'heading', text: 'Nameplate versus output: the old-plant problem', level: 2 },
    {
      type: 'paragraph',
      text: "The honest counter to the 3.5-million-barrel headline is that capacity on paper is not capacity in practice. Nigeria's state-owned Port Harcourt refinery (210,000 bpd) and Kaduna refinery (110,000 bpd) have for years run far below their [[kw:nameplate-capacity]]nameplate capacity[[/kw]] — and often not at all — hobbled by aging infrastructure, deferred maintenance, and turnaround projects that repeatedly slip. Nameplate is the rate a plant is designed to hit; achieved output is what it actually delivers, and for the older state assets the gap is enormous.",
    },
    {
      type: 'paragraph',
      text: "That distinction reframes the continental total. Nigeria alone shows roughly 1.1 million bpd of capacity across its four refineries, but for much of the past decade the three state plants contributed a small fraction of that in real barrels, which is precisely why the country kept importing more than 80% of its fuel. A meaningful chunk of Africa's 3.5-million-barrel figure is aspirational — designed capacity waiting on rehabilitation that may take years. The buildout is real, but the number that matters is throughput, not the plate on the gate.",
    },
    {
      type: 'quote',
      text: 'Nameplate capacity across much of the continent overstates deliverable supply; the operative question for the aging state assets is not what they were designed to process but what they will reliably run, month after month.',
      source: 'Africap Research, refining outlook, 2026',
    },
    {
      type: 'paragraph',
      text: "Policy is the other variable that decides whether capacity becomes output. Nigeria's removal of its long-standing fuel subsidy — a reform that had capped pump prices for decades — reshaped domestic economics almost overnight, lifting retail fuel prices several-fold and making commercial refining viable in a way it never was under subsidized imports. But the transition is politically fraught, and disputes over crude-supply pricing to the new plant, foreign-exchange access, and the naira-versus-dollar terms of domestic crude sales all still sit between designed capacity and delivered barrels. The plants are being built; the rules that let them run at full utilization are still being negotiated.",
    },

    { type: 'heading', text: 'Downstream effects and the regional pull', level: 2 },
    {
      type: 'paragraph',
      text: 'A surplus in Lagos is already reshaping trade across the continent. South Africa has sought a 12-month supply contract for Dangote product, and Ghana and Kenya are exploring purchases as a nearby, hard-currency-light source of fuel. For importing nations this is [[kw:import-substitution]]import substitution[[/kw]] at a regional scale: buying refined product from within Africa instead of shipping it in from European and Middle Eastern refiners, shortening supply lines and keeping more spending on the continent.',
    },
    {
      type: 'adjudication-matrix',
      figureLabel: 'FIG. 3 · WHO THE SURPLUS PULLS',
      kicker:
        'EACH REGION × DANGOTE DOWNSTREAM EFFECT · SAME = ALREADY MATERIALIZING · PART = EMERGING OR PROPOSED · — = NOT IN PLAY. CLICK ANY CELL FOR THE NOTE.',
      hint: 'Click any cell for the note.',
      source:
        "this article's synthesis of the downstream-effects reporting (Energy News Africa, Nairametrics, S&P Global, 2026).",
      cols: [
        'Buys Dangote product',
        'Crude flows redirected',
        'New refinery proposed',
        'Existing trade displaced',
      ],
      rows: [
        {
          label: 'Nigeria (the source)',
          cells: [
            {
              value: 'same',
              note: 'Import substitution at home — Nigeria refines its own crude instead of importing more than 80% of its fuel.',
            },
            {
              value: 'same',
              note: 'Crude that once shipped raw to foreign refiners is now processed domestically.',
            },
            {
              value: 'same',
              note: 'The Lekki plant is here; a second 650,000 bpd refinery is floated for East Africa.',
            },
            {
              value: 'none',
              note: 'Nigeria is the winner of the shift, not a party losing existing trade.',
            },
          ],
        },
        {
          label: 'Southern Africa',
          cells: [
            {
              value: 'same',
              note: 'South Africa has sought a 12-month supply contract for Dangote product.',
            },
            { value: 'none', note: 'Not a crude exporter into the Dangote model.' },
            { value: 'none', note: 'No new-build proposed for the region.' },
            { value: 'none', note: 'No existing trade leg displaced by the surplus.' },
          ],
        },
        {
          label: 'East Africa',
          cells: [
            {
              value: 'part',
              note: 'Ghana and Kenya are exploring purchases as a nearby, hard-currency-light source of fuel.',
            },
            { value: 'none', note: 'Not part of the crude-redirection story.' },
            {
              value: 'part',
              note: 'Dangote has floated a second 650,000 bpd refinery to serve Kenya, Uganda, Tanzania, and the DRC.',
            },
            { value: 'none', note: 'No existing trade leg displaced.' },
          ],
        },
        {
          label: 'North Africa',
          cells: [
            {
              value: 'none',
              note: "Skikda, Ras Lanuf and Egypt's plants are export-oriented toward the Mediterranean.",
            },
            { value: 'none', note: 'A different orientation from West Africa’s domestic pivot.' },
            { value: 'none', note: 'No new-build tied to the Dangote surplus.' },
            { value: 'none', note: 'Largely outside the intra-Africa product shift.' },
          ],
        },
        {
          label: 'European refiners',
          cells: [
            { value: 'none', note: 'Not buyers of Dangote product.' },
            {
              value: 'same',
              note: 'Less West African crude shipped raw to refiners in Rotterdam and the Atlantic basin.',
            },
            { value: 'none', note: 'No new-build involved.' },
            {
              value: 'same',
              note: 'A Nigeria that refines its own barrels removes both legs at once — the crude supply and the gasoline sold back into Africa.',
            },
          ],
        },
        {
          label: 'Indian refiners',
          cells: [
            { value: 'none', note: 'Not buyers of Dangote product.' },
            { value: 'same', note: 'Less discounted African crude flowing to Jamnagar.' },
            { value: 'none', note: 'No new-build involved.' },
            {
              value: 'part',
              note: 'Indian refiners that re-exported product now face a competitor closer to the source.',
            },
          ],
        },
      ],
    },
    {
      type: 'paragraph',
      text: "Dangote has floated building a second 650,000 bpd refinery to serve East Africa — a market spanning Kenya, Uganda, Tanzania, and the Democratic Republic of Congo — which would extend the model across the continent's other coast. The second-order effect is a redirection of crude flows: less African crude shipped raw to refiners in Rotterdam and Jamnagar, and more finished product moving intra-Africa. If it holds, that reverses a century-old pattern in which the continent exported barrels and imported value.",
    },
    {
      type: 'paragraph',
      text: 'For the global refining industry the shift is subtractive. European refiners have leaned on West African crude and on selling gasoline back into Africa for decades; a Nigeria that refines its own barrels removes both legs of that trade at once, tightening product demand for Atlantic-basin refiners while loosening it for the light, sweet crude grades those plants prefer. Indian refiners that bought discounted African crude to re-export product now face a competitor closer to the source. The tonnage involved — a plant clearing 650,000 bpd displaces on the order of 15 to 20 large product cargoes a month — is enough to register in freight rates and regional crack spreads, not just in Nigerian statistics.',
    },

    { type: 'heading', text: 'How to trade an untradeable story', level: 2 },
    {
      type: 'paragraph',
      text: 'The structural catch for investors is that the marquee asset is private. Dangote Industries is not listed as a refining pure-play, so there is no clean ticker for the single most important facility in the story — the absence of a pure-play is itself the point. The tradeable exposure is indirect: the energy majors with African upstream and crude-flow footprints — Shell (SHEL), TotalEnergies (TTE), ExxonMobil (XOM), and Chevron (CVX) — plus independent refiners such as Valero (VLO) whose margins track the global [[kw:crack-spread]]crack spread[[/kw]], the gap between crude cost and refined-product value. BP (BP), Occidental (OXY), and Suncor (SU) round out the crude-and-refining complex. This is a thesis-by-proxy, not a direct play, and none of it is investment advice.',
    },
    {
      type: 'paragraph',
      text: "The base case is that Dangote reaches its 1.4 million bpd expansion, anchors a genuine African refining corridor, and Nigeria's fuel-import bill keeps falling toward that $10-billion-a-year saving. The bear case is that aging state plants stay offline, policy and pricing misalignments cap utilization, and the continental total settles well below the 3.5-million-barrel headline as paper capacity fails to convert to throughput. Either way, tracking it is a cross-dataset problem — crude flows, FX, and frontier-market equity exposure moving together — the kind of story Ezana's commodity and global datasets are built to follow as it develops.",
    },
  ],
  globeRail: {
    metric: {
      title: 'AFRICA TOP REFINERIES · NAMEPLATE (000 BPD)',
      data: [
        { x: 1, y: 650 },
        { x: 2, y: 350 },
        { x: 3, y: 300 },
        { x: 4, y: 220 },
        { x: 5, y: 210 },
      ],
      startLabel: 'Dangote · 650k bpd',
      endLabel: 'Port Harcourt · 210k bpd',
      note: 'Africa’s top 20 refineries now clear more than 3.5 million bpd combined; Dangote’s single-train 650,000 bpd (pushed to ~700,000 in testing) reset the map, with an announced 1.4M bpd expansion that would pass India’s Jamnagar as the world’s largest single site.',
    },
    cities: [
      {
        name: 'Lagos',
        country: 'NG',
        lat: 6.45,
        lng: 3.4,
        impact:
          'The Dangote refinery in the Lekki Free Zone reached its full 650,000 bpd nameplate on Feb 11, 2026 — the first single-train refinery anywhere to run at that scale — cutting an estimated $10 billion a year from Nigeria’s fuel-import bill.',
      },
      {
        name: 'Port Harcourt',
        country: 'NG',
        lat: 4.82,
        lng: 7.03,
        impact:
          'The state-owned 210,000 bpd plant has for years run far below nameplate — and often not at all — the nameplate-versus-output gap that is precisely why Nigeria kept importing more than 80% of its fuel.',
      },
      {
        name: 'Cairo',
        country: 'EG',
        lat: 30.04,
        lng: 31.24,
        impact:
          'Egypt’s cluster of mid-sized plants — Mostorod (161k, recently a $4.3B upgrade), MIDOR (160k) and El Nasr (131k) — makes it the continent’s most refinery-dense country, the opposite model to Dangote’s single-mega-plant bet.',
      },
      {
        name: 'Skikda',
        country: 'DZ',
        lat: 36.88,
        lng: 6.91,
        impact:
          'Algeria’s Sonatrach-operated Skikda is the continent’s number two at roughly 350,000 bpd, built to feed export markets across the Mediterranean — oriented Europe-ward, not toward West Africa’s new domestic pivot.',
      },
      {
        name: 'Cape Town',
        country: 'ZA',
        lat: -33.92,
        lng: 18.42,
        impact:
          'Astron Energy’s Cape Town refinery sits inside Africa’s top 20; South Africa has sought a 12-month supply contract for Dangote product, an early sign of the surplus reshaping intra-Africa trade.',
      },
    ],
  },
  author: 'Ezana Finance Editorial',
  category: 'commodities-energy',
  subcategory: 'Oil & Gas',
  tags: ['markets', 'commodities', 'energy', 'macro', 'geopolitics'],
  meta: {
    sectors: ['Energy'],
    industries: ['Oil & Gas Refining & Marketing'],
    investors: ['Aliko Dangote'],
    institutions: ['Dangote Group'],
    geos: ['Africa', 'Nigeria'],
    assetClasses: ['Equities', 'Commodities'],
    themes: ['Energy Independence', 'Refining Capacity'],
    datasets: [],
    markets: [],
  },
  tickers: ['XOM', 'CVX', 'SHEL', 'TTE', 'BP', 'SU', 'VLO', 'OXY'],
  entities: {
    people: [{ id: 'aliko-dangote', label: 'Aliko Dangote', role: 'Founder, Dangote Industries' }],
    terms: [
      { id: 'downstream-sector', label: 'Downstream Sector' },
      { id: 'single-train-refinery', label: 'Single-Train Refinery' },
      { id: 'refining-capacity', label: 'Refining Capacity' },
      { id: 'foreign-exchange-reserves', label: 'Foreign-Exchange Reserves' },
      { id: 'crude-oil-benchmark', label: 'Crude-Oil Benchmark' },
      { id: 'refined-product-exports', label: 'Refined-Product Exports' },
      { id: 'coal-to-liquids', label: 'Coal-to-Liquids' },
      { id: 'nameplate-capacity', label: 'Nameplate Capacity' },
      { id: 'import-substitution', label: 'Import Substitution' },
      { id: 'crack-spread', label: 'Crack Spread' },
    ],
  },
  readTime: 8,
  publishedAt: '2026-07-27',
  featured: false,
  likes: 0,
  comments: 0,
  reads: 0,
  listMeta: '27 Jul 2026',
};
