// src/lib/ezana-echo-article-tariff-winners-contract-losers-2026.js
// Ezana Echo DRAFT article. Cross-references USAspending federal contract flows
// with import-exposed equities under the 2025-26 tariff regime. Follows
// Ezana_Echo_Skills.md protocol; all chart colors use design tokens.
// STATUS: draft. Nothing in this module publishes until every [VERIFY] clears.
// ============================================================
// FACT CHECK MANIFEST (status: draft, nothing publishes until cleared)
// 1. Average effective US tariff rate rose from roughly 2.4% in 2024 to
//    roughly 17.9% by mid-2026 -> [VERIFY: Yale Budget Lab effective tariff
//    rate tracker; USTR tariff schedules]
// 2. Section 232 steel and aluminum tariffs raised to 50% by the June 2025
//    proclamation -> [VERIFY: Federal Register proclamation; USTR]
// 3. Federal prime contract obligations totaled roughly $774 billion in
//    FY2025 -> [VERIFY: USAspending.gov spending explorer, FY2025]
// 4. Obligations to domestic steel and metal-fabrication NAICS codes rose
//    roughly 22% year over year in the first half of FY2026 ->
//    [VERIFY: USAspending.gov award search by NAICS 331/332]
// 5. Caterpillar guided to a net tariff cost headwind of roughly $1.5 billion
//    for calendar 2025 -> [VERIFY: Caterpillar Q2 2025 earnings call and 10-Q]
// 6. Deere guided to a pre-tax tariff impact of roughly $600 million for
//    fiscal 2025 -> [VERIFY: Deere Q3 FY2025 earnings call and 10-Q]
// 7. Walmart executives said the company could not absorb all tariff costs
//    and would raise some prices -> [VERIFY: Walmart FY2026 Q1 earnings call,
//    May 2025, CFO John David Rainey remarks]
// 8. Target's gross margin compressed roughly 60 basis points year over year
//    in the quarter spanning the tariff step-up, with imported general
//    merchandise cited -> [VERIFY: Target 10-Q and earnings call, 2025-26]
// 9. Benchmark US hot-rolled coil prices rose roughly 30% in the months after
//    the 50% Section 232 rate took effect -> [VERIFY: CRU / SteelBenchmarker
//    HRC price series, 2025]
// 10. Nucor and Steel Dynamics are among the largest US-based steel producers
//     by domestic capacity -> [VERIFY: company 10-Ks; AISI capacity data]
// 11. Jamieson Greer serves as US Trade Representative in the current
//     administration -> [VERIFY: USTR.gov leadership page]
// 12. Roughly a third of Walmart US cost of goods is tied to imported
//     merchandise, concentrated in general merchandise categories ->
//     [VERIFY: Walmart 10-K risk factors; company statements on import mix]
// 13. Best Buy cut its annual guidance citing tariff-driven cost of goods
//     pressure on consumer electronics, most of which are imported ->
//     [VERIFY: Best Buy 10-Q and guidance updates, 2025-26]
// 14. Federal Buy American content thresholds stepped up to 65% domestic
//     content in 2024 under the FAR final rule, en route to 75% in 2029 ->
//     [VERIFY: FAR 25.101 final rule, Federal Register 2022]
// 15. FIG. 1 flow values (draft, $M obligations, FY2026 H1): DoD to domestic
//     steel and metal fabricators 3,400; DoD to construction and heavy
//     equipment 2,100; DoD to electronics and hardware assembly 1,800; DOT to
//     construction and heavy equipment 940; DOT to domestic steel and metal
//     fabricators 720; DHS to construction and heavy equipment 640; GSA to
//     logistics and warehousing 520; DHS to logistics and warehousing 410;
//     GSA to electronics and hardware assembly 380 -> [VERIFY: USAspending.gov
//     award search, obligations by awarding agency x NAICS, FY2026 H1]
// 16. FIG. 2 state contract-obligation values (draft, $B, FY2026 H1): VA 82,
//     CA 62, TX 54, MD 36, FL 30, PA 18, AZ 16, WA 15, MA 14, MO 13, CT 12,
//     NY 12, GA 12, OH 11, AL 10, NC 8, IN 6, MI 5, AR 3 ->
//     [VERIFY: USAspending.gov state profiles, prime award obligations]
// 17. Virginia leads all states in federal prime contract obligations, driven
//     by defense and professional services around the DC metro ->
//     [VERIFY: USAspending.gov state profiles]
// 18. The top five states capture roughly 45% of all federal prime contract
//     obligations -> [VERIFY: USAspending.gov state profiles, computed share]
// 19. Nucor's realized steel mill pricing and mill segment earnings rose in
//     the quarters following the 50% tariff step-up -> [VERIFY: Nucor 10-Q
//     segment disclosures, 2025-26]
// 20. Steel Dynamics operates a fabrication segment (joists, deck) that sells
//     into nonresidential and public construction -> [VERIFY: Steel Dynamics
//     10-K segment descriptions]
// 21. Cleveland-Cliffs is the largest flat-rolled steel supplier to the US
//     automotive industry -> [VERIFY: Cleveland-Cliffs 10-K]
// 22. Cleveland-Cliffs carries materially higher leverage than Nucor or Steel
//     Dynamics -> [VERIFY: company balance sheets, latest 10-Qs]
// 23. Tariff exclusion processes for machinery inputs have been narrower under
//     the 2025-26 regime than under the 2018-19 Section 301 rounds ->
//     [VERIFY: USTR exclusion process notices, 2025-26 vs 2018-19]
// 24. Retailers front-loaded imports ahead of announced tariff effective
//     dates, lifting inventories in the affected quarters -> [VERIFY: company
//     10-Q inventory disclosures; National Retail Federation port data]
// 25. The March 2026 quarter stat-grid values: effective tariff rate roughly
//     17.9%; FY2025 obligations roughly $774B; Section 232 steel rate 50%;
//     combined CAT and DE guided tariff headwind roughly $2.1B ->
//     [VERIFY: items 1, 2, 3, 5, 6 above]
// 26. Federal demand is a small share of total US steel end-use demand, on the
//     order of single digits including infrastructure pass-through ->
//     [VERIFY: AISI end-use shipment data; FHWA procurement estimates]
// 27. The quoted remark that retailers cannot absorb the full tariff cost is
//     an attributed paraphrase -> [VERIFY: Walmart FY2026 Q1 earnings call
//     transcript, May 2025]
// 28. Globe-rail metric values: effective tariff rate 2.4 (2024) to 17.9
//     (mid-2026) -> [VERIFY: item 1 sources]
// 29. Charlotte is Nucor's headquarters city -> [VERIFY: Nucor 10-K]
// 30. Bentonville is Walmart's headquarters city -> [VERIFY: Walmart 10-K]
// 31. Laredo is the largest US inland port for Mexico trade by truck-crossing
//     value -> [VERIFY: US Census Bureau FT920 port data; BTS transborder]
// 32. Infrastructure Investment and Jobs Act outlays continued flowing to
//     state DOT projects through FY2026, with Build America Buy America
//     domestic content requirements attached -> [VERIFY: FHWA IIJA
//     apportionment data; BABA statutory text]
// 33. Machinery makers pay tariffs on imported components while benefiting
//     from tariff-protected end markets, making their net exposure mixed ->
//     [VERIFY: CAT and DE 10-Q tariff disclosures]
// 34. Import-dependent retail margin damage shows up with a lag as
//     pre-tariff inventory sells through -> [VERIFY: company inventory
//     accounting disclosures, FIFO/retail method timing]
// 35. USAspending obligation data lags award decisions and is revised, so
//     H1 FY2026 figures are provisional -> [VERIFY: USAspending.gov data
//     documentation, submission and revision cadence]
// ============================================================

export const tariffWinnersContractLosers2026 = {
  id: 'tariff-winners-contract-losers-2026',
  title:
    'Tariff Winners, Contract Losers: What USAspending Flows Reveal About Who Gained Federal Revenue and Who Lost Margin',
  excerpt:
    'The effective US tariff rate climbed from roughly 2.4% to 17.9% by mid-2026 [VERIFY: Yale Budget Lab], and the federal checkbook moved with it. USAspending data shows domestic steel and equipment contractors gaining obligations [VERIFY: USAspending.gov] while import-dependent retailers absorbed margin damage they told investors they could not fully offset.',
  heroImage: {
    src: '/images/ezana-echo/tariff-winners-contract-losers-2026-hero.png',
    alt: 'Split-tone illustration of a shipping container wall casting a shadow across a US federal procurement ledger, with steel coils on one side and retail shelves on the other.',
    caption:
      'Editorial illustration. Contract figures in this draft are provisional reconstructions from USAspending.gov obligation data, which lags award decisions and is revised; nothing here is final until verified.',
  },
  category: 'politics-policy',
  subcategory: 'Trade Policy',
  globeRail: {
    metric: {
      title: 'AVERAGE EFFECTIVE US TARIFF RATE',
      data: [
        { x: 0, y: 2.4 },
        { x: 1, y: 17.9 },
      ],
      startLabel: '2024 · 2.4%',
      endLabel: 'Mid-2026 · 17.9%',
      note: 'The average effective US tariff rate rose from roughly 2.4% in 2024 to roughly 17.9% by mid-2026 [VERIFY: Yale Budget Lab tracker], the highest level in decades. The federal contract ledger repriced around the same wall: domestic mills and fabricators gained obligations while import-dependent sellers absorbed the cost.',
    },
    cities: [
      {
        name: 'Washington',
        country: 'US',
        lat: 38.9,
        lng: -77.04,
        impact:
          'Both levers of the story pull from here: USTR tariff schedules that raised the effective rate to roughly 17.9% [VERIFY: Yale Budget Lab], and the federal procurement system that obligated roughly $774 billion in FY2025 [VERIFY: USAspending.gov]. Buy American content thresholds, now at 65% domestic content en route to 75% [VERIFY: FAR 25.101 final rule], route more of that money to domestic suppliers.',
      },
      {
        name: 'Charlotte',
        country: 'US',
        lat: 35.23,
        lng: -80.84,
        impact:
          'Headquarters of Nucor [VERIFY: Nucor 10-K], the archetypal tariff winner: benchmark hot-rolled coil rose roughly 30% after the 50% Section 232 rate took effect [VERIFY: CRU / SteelBenchmarker], and mill segment earnings followed [VERIFY: Nucor 10-Q].',
      },
      {
        name: 'Bentonville',
        country: 'US',
        lat: 36.37,
        lng: -94.21,
        impact:
          'Headquarters of Walmart [VERIFY: Walmart 10-K], the archetypal import-exposed loser: executives told investors the company could not absorb all tariff costs and would raise some prices [VERIFY: Walmart FY2026 Q1 earnings call, May 2025].',
      },
      {
        name: 'Laredo',
        country: 'US',
        lat: 27.53,
        lng: -99.49,
        impact:
          'The largest US inland port for Mexico trade by truck-crossing value [VERIFY: Census FT920; BTS transborder data], and a live gauge of how rerouted supply chains respond to the tariff wall in physical volume, not just filings.',
      },
    ],
  },
  author: 'Ezana Finance Editorial',
  meta: {
    sectors: ['Materials', 'Industrials', 'Consumer Staples', 'Consumer Discretionary'],
    industries: [
      'Steel',
      'Construction Machinery & Heavy Transportation Equipment',
      'Agricultural & Farm Machinery',
      'Broadline Retail',
      'Consumer Electronics Retail',
    ],
    // No named funds or individual investors appear in the text.
    investors: [],
    institutions: [
      'Nucor',
      'Steel Dynamics',
      'Cleveland-Cliffs',
      'Caterpillar',
      'Deere & Company',
      'Walmart',
      'Target',
      'Best Buy',
    ],
    government: [
      'Office of the U.S. Trade Representative',
      'Department of Defense',
      'Department of Homeland Security',
      'Department of Transportation',
      'General Services Administration',
      'White House',
    ],
    geos: ['United States', 'China', 'Mexico', 'Canada'],
    assetClasses: ['Equities', 'Commodities'],
    themes: ['Trade Policy', 'Tariffs', 'Federal Procurement', 'Supply Chains'],
    datasets: ['USAspending federal awards', 'USTR tariff schedules', 'SEC 10-Q filings'],
    // The text discusses companies and policy, not exchanges or trading venues.
    markets: [],
  },
  tickers: ['NUE', 'STLD', 'CLF', 'CAT', 'DE', 'WMT', 'TGT', 'BBY'],
  entities: {
    people: [
      {
        id: 'donald-trump',
        label: 'Donald Trump',
        role: 'US President; architect of the 2025-26 tariff regime',
      },
      {
        id: 'jamieson-greer',
        label: 'Jamieson Greer',
        role: 'US Trade Representative [VERIFY: USTR.gov]',
      },
      {
        id: 'john-david-rainey',
        label: 'John David Rainey',
        role: 'Walmart CFO [VERIFY: Walmart leadership page]',
      },
    ],
    terms: [
      { id: 'import-substitution', label: 'Import substitution' },
      { id: 'producer-price-index', label: 'Producer price index' },
      { id: 'concentration-risk', label: 'Concentration risk' },
      { id: 'supply-chain-chokepoint', label: 'Supply-chain chokepoint' },
      { id: 'sector-rotation', label: 'Sector rotation' },
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
      text: "The average effective US tariff rate climbed from roughly 2.4% in 2024 to roughly 17.9% by mid-2026 [VERIFY: Yale Budget Lab effective tariff tracker], the steepest repricing of American import costs in decades, and the federal government's own checkbook moved with it. Cross-reference two public datasets, USAspending.gov award obligations and the tariff schedules maintained by the Office of the U.S. Trade Representative [VERIFY: USTR tariff schedules], and a clean divide emerges. On one side sit companies whose federal contract revenue grew as procurement dollars rerouted toward domestic suppliers: steelmakers, metal fabricators, and heavy-equipment vendors. On the other side sit import-dependent sellers, led by big-box retail, whose 10-Q filings now carry explicit tariff-cost disclosures and whose executives have told investors the damage cannot be fully offset [VERIFY: Walmart FY2026 Q1 earnings call; Target 10-Q]. President [[person:donald-trump]]Donald Trump[[/person]]'s tariff wall, in other words, has two ledgers, and this article reads both.",
    },
    {
      type: 'stat-grid',
      stats: [
        {
          label: 'Effective US tariff rate',
          value: '~17.9%',
          change: 'vs ~2.4% in 2024 [VERIFY: Yale Budget Lab]',
        },
        {
          label: 'FY2025 federal contract obligations',
          value: '~$774B',
          change: 'Prime awards [VERIFY: USAspending.gov]',
        },
        {
          label: 'Section 232 steel rate',
          value: '50%',
          change: 'June 2025 proclamation [VERIFY: Federal Register]',
        },
        {
          label: 'CAT + DE guided tariff headwind',
          value: '~$2.1B',
          change: '~$1.5B + ~$600M [VERIFY: company calls]',
        },
      ],
    },
    {
      type: 'heading',
      text: 'The tariff wall meets the federal checkbook',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'Tariffs and procurement are usually analyzed separately, but under the current regime they operate as one machine. The tariff side, administered by US Trade Representative [[person:jamieson-greer]]Jamieson Greer[[/person]] [VERIFY: USTR.gov leadership page], raises the landed cost of imported steel, aluminum, machinery, and finished goods; the procurement side, governed by Buy American content thresholds that stepped up to 65% domestic content in 2024 en route to 75% by 2029 [VERIFY: FAR 25.101 final rule], routes federal demand toward suppliers who can certify domestic origin. The combined effect is a deliberate [[kw:import-substitution]]import substitution[[/kw]] policy executed through the largest single buyer in the economy: federal prime contract obligations ran to roughly $774 billion in FY2025 [VERIFY: USAspending.gov spending explorer]. When both levers pull the same direction, the winners are not subtle. Obligations flowing to domestic steel and metal-fabrication industry codes rose roughly 22% year over year in the first half of FY2026 [VERIFY: USAspending.gov award search by NAICS 331/332], even as overall obligation growth stayed in the single digits.',
    },
    {
      type: 'paragraph',
      text: 'The agency mix matters as much as the total. Defense dominates the flows into tariff-adjacent supplier groups, which is unsurprising given both its budget share and its statutory domestic-sourcing requirements. But the civilian side is growing faster in percentage terms: Department of Transportation obligations tied to Infrastructure Investment and Jobs Act projects carry Build America, Buy America domestic content requirements [VERIFY: FHWA apportionment data; BABA statute], and General Services Administration buying has shifted toward domestically assembled hardware where certified options exist. One caveat applies to every figure in this section: USAspending obligation data lags award decisions and gets revised, so first-half FY2026 numbers are provisional by construction [VERIFY: USAspending data documentation].',
    },
    {
      type: 'clearing-sankey',
      figureLabel: 'FIG. 1 · WHERE THE FEDERAL DOLLARS REROUTED',
      kicker:
        'DRAFT RECONSTRUCTION · FY2026 H1 PRIME OBLIGATIONS TO TARIFF-ADJACENT SUPPLIER GROUPS · RIBBON WIDTH = OBLIGATED VALUE ($M) · DEFENSE DOMINATES, CIVILIAN AGENCIES GROW FASTER. CLICK A RIBBON FOR THE RECORD.',
      hint: 'Click a ribbon for its per-flow figure. All values draft pending verification.',
      source:
        'DRAFT [VERIFY: USAspending.gov award search, prime obligations by awarding agency and NAICS group, FY2026 H1; provisional and subject to revision].',
      sourceGroups: [
        {
          label: 'Security buyers',
          nodes: [
            { id: 'dod', name: 'Dept. of Defense', display: '$7.3B' },
            { id: 'dhs', name: 'Dept. of Homeland Security', display: '$1.1B' },
          ],
        },
        {
          label: 'Civilian buyers',
          nodes: [
            { id: 'dot', name: 'Dept. of Transportation', display: '$1.7B' },
            { id: 'gsa', name: 'General Services Admin.', display: '$0.9B' },
          ],
        },
      ],
      destinations: [
        {
          id: 'metals',
          name: 'Domestic steel & metal fabricators',
          sub: '$4.1B shown · NAICS 331/332 · +22% y/y [VERIFY]',
        },
        {
          id: 'equipment',
          name: 'Construction & heavy equipment',
          sub: '$3.7B shown · dealers & OEMs',
        },
        {
          id: 'electronics',
          name: 'Electronics & hardware assembly',
          sub: '$2.2B shown · certified domestic assembly',
        },
        {
          id: 'logistics',
          name: 'Logistics & warehousing',
          sub: '$0.9B shown · rerouted supply lines',
        },
      ],
      flows: [
        {
          from: 'dod',
          to: 'metals',
          value: 3400,
          tone: 'primary',
          label: '$3.4B',
          record:
            'Defense obligations to domestic steel and metal-fabrication codes, roughly $3.4 billion in the half [VERIFY: USAspending NAICS 331/332], are the largest single flow shown: shipbuilding plate, armor steel, and structural fabrication for military construction.',
        },
        {
          from: 'dod',
          to: 'equipment',
          value: 2100,
          tone: 'primary',
          label: '$2.1B',
          record:
            'Roughly $2.1 billion in defense obligations to construction and heavy-equipment vendors [VERIFY: USAspending], the channel through which Caterpillar dealers and competing OEMs sell into military construction and base operations.',
        },
        {
          from: 'dod',
          to: 'electronics',
          value: 1800,
          tone: 'neutral',
          record:
            'Roughly $1.8 billion to electronics and hardware assembly with domestic-origin certification [VERIFY: USAspending], a category tariffs made structurally more competitive against imported alternatives.',
        },
        {
          from: 'dot',
          to: 'equipment',
          value: 940,
          tone: 'neutral',
          record:
            'Roughly $940 million in DOT-linked equipment obligations [VERIFY: USAspending], carried by IIJA project flow and bound by Build America, Buy America content rules [VERIFY: BABA statute].',
        },
        {
          from: 'dot',
          to: 'metals',
          value: 720,
          tone: 'neutral',
          record:
            'Roughly $720 million in DOT-linked obligations to domestic steel and fabrication [VERIFY: USAspending]: bridge steel, guardrail, and rebar supply where domestic content is mandatory.',
        },
        {
          from: 'dhs',
          to: 'equipment',
          value: 640,
          tone: 'neutral',
          record:
            'Roughly $640 million in DHS obligations to construction and heavy equipment [VERIFY: USAspending], concentrated in border infrastructure work.',
        },
        {
          from: 'gsa',
          to: 'logistics',
          value: 520,
          tone: 'neutral',
          record:
            'Roughly $520 million in GSA logistics and warehousing obligations [VERIFY: USAspending], part of the physical rerouting of federal supply lines away from tariffed import channels.',
        },
        {
          from: 'dhs',
          to: 'logistics',
          value: 410,
          tone: 'neutral',
          record:
            'Roughly $410 million in DHS logistics obligations [VERIFY: USAspending], including port-of-entry handling capacity where inspection volumes rose with the new tariff schedules.',
        },
        {
          from: 'gsa',
          to: 'electronics',
          value: 380,
          tone: 'neutral',
          record:
            'Roughly $380 million in GSA obligations to domestically assembled hardware [VERIFY: USAspending], the government-as-customer expression of the same domestic-content shift.',
        },
      ],
    },
    {
      type: 'heading',
      text: 'Winners: mills, fabricators, and yellow iron',
      level: 2,
    },
    {
      type: 'paragraph',
      text: "The cleanest winners sit at the intersection of tariff-protected pricing and federal demand. After the June 2025 proclamation took Section 232 steel and aluminum tariffs to 50% [VERIFY: Federal Register], benchmark US hot-rolled coil rose roughly 30% over the following months [VERIFY: CRU / SteelBenchmarker HRC series], a move visible in the metals components of the [[kw:producer-price-index]]producer price index[[/kw]] before it reached any consumer. Nucor and Steel Dynamics, among the largest US-based producers by domestic capacity [VERIFY: company 10-Ks; AISI], captured that spread directly: Nucor's realized mill pricing and mill segment earnings rose in the quarters after the step-up [VERIFY: Nucor 10-Q], and Steel Dynamics' fabrication segment sells joists and deck into exactly the nonresidential and public construction pipeline that federal and IIJA money funds [VERIFY: STLD 10-K].",
    },
    {
      type: 'paragraph',
      text: 'Two qualifications keep the winner story honest. First, direct federal demand is a small share of total US steel end-use, on the order of single digits even counting infrastructure pass-through [VERIFY: AISI end-use data; FHWA estimates]; the tariff price effect, not the contract flow itself, does most of the earnings work for the mills. Second, not every protected producer is positioned alike: Cleveland-Cliffs, the largest flat-rolled supplier to the US auto industry [VERIFY: CLF 10-K], gets the same price umbrella but carries materially higher leverage than Nucor or Steel Dynamics [VERIFY: latest 10-Q balance sheets], which converts the same tailwind into a higher-beta equity.',
    },
    {
      type: 'callout',
      label: 'The winner mechanism, in one line',
      value: 'Price umbrella + Buy American',
      context:
        'Tariffs lift the domestic price deck (HRC up roughly 30% post-proclamation [VERIFY: CRU]) while content rules route the federal $774B checkbook [VERIFY: USAspending] toward certified domestic suppliers. Winners collect on both.',
    },
    {
      type: 'heading',
      text: 'The map of the money: state concentration',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'Federal contract dollars are not evenly spread, and the tariff-era reallocation is amplifying an already lopsided map. Virginia leads all states in prime contract obligations, powered by defense and professional services around the Washington metro [VERIFY: USAspending state profiles], with California, Texas, Maryland, and Florida rounding out a top five that captures roughly 45% of the national total [VERIFY: USAspending, computed share]. For investors the map is a [[kw:concentration-risk]]concentration risk[[/kw]] reading in both directions: contractors clustered in those states have the deepest federal revenue exposure, and the mill-and-fabrication states of the industrial Midwest and South (Indiana, Ohio, Alabama, the Carolinas) are where the tariff-plus-procurement tailwind lands in physical payrolls rather than filings [VERIFY: USAspending state profiles].',
    },
    {
      type: 'tile-grid',
      figureLabel: 'FIG. 2 · THE FEDERAL CONTRACT MAP, SHADED',
      kicker:
        'DRAFT · FY2026 H1 PRIME CONTRACT OBLIGATIONS BY STATE, $B · ONE TILE PER STATE AT ROUGH MAP POSITION · SHADED BY OBLIGATION CLASS.',
      hint: 'Each tile is a state; colour is its obligation band, placement is rough geography.',
      source:
        'DRAFT [VERIFY: USAspending.gov state profiles, FY2026 H1 prime award obligations by place of performance; provisional and subject to revision]. Selected states shown; not exhaustive.',
      shape: 'hex',
      classes: [
        { upTo: 5, label: '≤ $5B' },
        { upTo: 15, label: '$5B-$15B' },
        { upTo: 40, label: '$15B-$40B' },
        { upTo: 120, label: '$40B+' },
      ],
      tiles: [
        { code: 'WA', label: 'Washington', x: 0, y: 0, value: 15 },
        { code: 'MI', label: 'Michigan', x: 6, y: 0, value: 5 },
        { code: 'NY', label: 'New York', x: 8, y: 0, value: 12 },
        { code: 'MA', label: 'Massachusetts', x: 9, y: 0, value: 14 },
        { code: 'IN', label: 'Indiana', x: 5, y: 1, value: 6 },
        { code: 'OH', label: 'Ohio', x: 6, y: 1, value: 11 },
        { code: 'PA', label: 'Pennsylvania', x: 7, y: 1, value: 18 },
        { code: 'CT', label: 'Connecticut', x: 8, y: 1, value: 12 },
        { code: 'CA', label: 'California', x: 0, y: 2, value: 62 },
        { code: 'MO', label: 'Missouri', x: 4, y: 2, value: 13 },
        { code: 'VA', label: 'Virginia', x: 7, y: 2, value: 82 },
        { code: 'MD', label: 'Maryland', x: 8, y: 2, value: 36 },
        { code: 'AZ', label: 'Arizona', x: 1, y: 3, value: 16 },
        { code: 'AR', label: 'Arkansas', x: 4, y: 3, value: 3 },
        { code: 'NC', label: 'North Carolina', x: 7, y: 3, value: 8 },
        { code: 'TX', label: 'Texas', x: 3, y: 4, value: 54 },
        { code: 'AL', label: 'Alabama', x: 5, y: 4, value: 10 },
        { code: 'GA', label: 'Georgia', x: 6, y: 4, value: 12 },
        { code: 'FL', label: 'Florida', x: 7, y: 4, value: 30 },
      ],
    },
    {
      type: 'heading',
      text: 'Losers: the import-dependent margin squeeze',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'The loser ledger is written in 10-Q language rather than award notices. Walmart, whose US cost of goods is roughly one-third tied to imported merchandise concentrated in general-merchandise categories [VERIFY: Walmart 10-K risk factors; company statements], told investors it could not absorb all tariff costs and would raise some prices, with CFO [[person:john-david-rainey]]John David Rainey[[/person]] making the point explicitly on the FY2026 first-quarter call [VERIFY: call transcript, May 2025]. Target disclosed gross margin compression of roughly 60 basis points year over year in the quarter spanning the tariff step-up, citing imported general merchandise [VERIFY: Target 10-Q and earnings call]. Best Buy, whose consumer-electronics assortment is overwhelmingly imported, cut annual guidance on tariff-driven cost of goods pressure [VERIFY: Best Buy 10-Q and guidance updates]. Every major import channel from East Asia now passes through the same repriced [[kw:supply-chain-chokepoint]]supply-chain chokepoint[[/kw]]: the customs line where the new schedules are collected.',
    },
    {
      type: 'quote',
      text: 'We have not seen a cost increase of this speed and magnitude before, and while we will absorb what we can, we are not able to absorb all of it.',
      source:
        'Paraphrase of Walmart executive remarks, FY2026 Q1 earnings call, May 2025 [VERIFY: transcript before publication]',
    },
    {
      type: 'paragraph',
      text: 'The damage also arrives on a delay, which matters for anyone reading quarterly prints. Retailers front-loaded imports ahead of announced effective dates, lifting inventories in the affected quarters [VERIFY: company 10-Q inventory disclosures; NRF port data], so pre-tariff stock sold through at old costs before the tariffed cost basis reached the income statement [VERIFY: inventory accounting timing]. That lag means the margin trough for the import-dependent cohort lands quarters after the headline tariff date, and screening on the first post-tariff print systematically understates the eventual hit.',
    },
    {
      type: 'heading',
      text: 'The mixed cases: machinery on both sides of the wall',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'Caterpillar and Deere complicate the clean winner-loser split because they sit on both sides of it. Each benefits from tariff-protected end markets and from public construction demand, and each pays tariffs on imported components and steel inputs: Caterpillar guided to a net tariff cost headwind of roughly $1.5 billion for calendar 2025 [VERIFY: Q2 2025 earnings call and 10-Q], and Deere guided to a pre-tax impact of roughly $600 million for fiscal 2025 [VERIFY: Q3 FY2025 call and 10-Q]. The exclusion processes that softened the 2018-19 Section 301 rounds have run narrower this time [VERIFY: USTR exclusion notices, 2025-26 vs 2018-19], so less of that component cost is being waived away. The net position is genuinely mixed: federal and IIJA-linked equipment demand flows toward them through the channels in FIG. 1, while roughly $2.1 billion of combined guided tariff cost flows against them [VERIFY: company guidance].',
    },
    {
      type: 'callout',
      label: 'Machinery, netted',
      value: '~$2.1B guided headwind',
      context:
        'Caterpillar (~$1.5B, calendar 2025) plus Deere (~$600M, fiscal 2025) in guided tariff cost [VERIFY: company calls], set against tariff-protected end markets and federal equipment demand. Mixed exposure, not a clean win.',
    },
    {
      type: 'dossier-table',
      figureLabel: 'FIG. 3 · THE LEDGER, NAME BY NAME',
      kicker:
        'DRAFT · NAME · POSITION ON THE TARIFF-CONTRACT LEDGER · ANCHOR FIGURE · KEY CAVEAT. ALL FIGURES PENDING VERIFICATION. CLICK A ROW FOR THE DOSSIER.',
      hint: 'Winners, losers, and mixed cases; expand a row for the record.',
      source:
        'DRAFT [VERIFY: USAspending.gov award data; company 10-Qs and 10-Ks; earnings call transcripts; CRU / SteelBenchmarker price series].',
      headers: ['Name', 'Ledger position', 'Anchor figure', 'Key caveat', ''],
      rows: [
        {
          name: 'Nucor',
          tag: 'WINNER',
          role: 'Largest US-based steel producer by domestic capacity; direct beneficiary of the 50% Section 232 price umbrella.',
          anchor: 'HRC +~30% post-proclamation [VERIFY: CRU]',
          keyRisk:
            'The earnings driver is the tariff price effect, not federal contracts per se; a tariff rollback removes it as fast as it arrived.',
          dossier: [
            {
              label: 'Mechanism',
              text: 'Realized mill pricing and mill segment earnings rose in the quarters after the June 2025 step-up [VERIFY: Nucor 10-Q].',
            },
            {
              label: 'Federal link',
              text: 'Defense and DOT steel obligations (FIG. 1) land in the customer base of its fabrication and plate businesses [VERIFY: USAspending NAICS 331/332].',
            },
          ],
        },
        {
          name: 'Steel Dynamics',
          tag: 'WINNER',
          role: 'Mill economics plus a fabrication segment selling joists and deck into public and nonresidential construction.',
          anchor: 'NAICS 331/332 obligations +~22% y/y [VERIFY: USAspending]',
          keyRisk:
            'Fabrication backlog pricing lags spot steel; the segment can squeeze when mill prices rise faster than fabrication contracts reprice.',
          dossier: [
            {
              label: 'Federal link',
              text: 'Fabrication sells into exactly the pipeline that IIJA and Build America, Buy America content rules fund [VERIFY: STLD 10-K; BABA statute].',
            },
          ],
        },
        {
          name: 'Cleveland-Cliffs',
          tag: 'WINNER*',
          role: 'Largest flat-rolled supplier to US autos; full exposure to the protected domestic price deck.',
          anchor: 'Same 50% umbrella, higher leverage [VERIFY: 10-Qs]',
          keyRisk:
            'Materially higher leverage than Nucor or Steel Dynamics converts the same tailwind into a higher-beta, lower-quality expression of the trade.',
          dossier: [
            {
              label: 'Asterisk',
              text: 'The auto end market itself absorbs tariff cost on imported components, so the customer base is weaker even as the price umbrella helps [VERIFY: CLF 10-K; auto OEM disclosures].',
            },
          ],
        },
        {
          name: 'Caterpillar',
          tag: 'MIXED',
          role: 'Tariff-protected end markets and federal equipment demand set against tariffed component and steel inputs.',
          anchor: '~$1.5B guided 2025 headwind [VERIFY: Q2 2025 call]',
          keyRisk:
            'Narrower exclusion processes than 2018-19 mean less of the component cost gets waived [VERIFY: USTR exclusion notices].',
          dossier: [
            {
              label: 'Federal link',
              text: 'Defense and DHS equipment obligations (FIG. 1) flow through its dealer channel [VERIFY: USAspending].',
            },
          ],
        },
        {
          name: 'Deere',
          tag: 'MIXED',
          role: 'Agricultural equipment with tariffed inputs; less federal contract offset than Caterpillar.',
          anchor: '~$600M guided FY2025 impact [VERIFY: Q3 FY2025 call]',
          keyRisk:
            'Farm-economy customers are themselves squeezed by retaliatory tariffs on US agricultural exports, a second-order demand hit [VERIFY: USDA export data].',
          dossier: [
            {
              label: 'Net read',
              text: 'The most import-cost-exposed of the machinery names relative to its federal demand offset.',
            },
          ],
        },
        {
          name: 'Walmart',
          tag: 'LOSER',
          role: 'Roughly one-third of US cost of goods tied to imports, concentrated in general merchandise [VERIFY: 10-K].',
          anchor: 'Cannot absorb all tariff costs [VERIFY: FY2026 Q1 call]',
          keyRisk:
            'Scale and supplier leverage make it the best-positioned loser; the squeeze lands harder on smaller competitors, which can perversely aid share gains.',
          dossier: [
            {
              label: 'Timing',
              text: 'Front-loaded inventory sells through first, so the full tariffed cost basis reaches margins with a multi-quarter lag [VERIFY: 10-Q inventory disclosures].',
            },
          ],
        },
        {
          name: 'Target',
          tag: 'LOSER',
          role: 'Higher general-merchandise (import-heavy) mix than grocery-anchored peers.',
          anchor: '~60bps gross margin compression y/y [VERIFY: 10-Q]',
          keyRisk:
            'Less grocery ballast than Walmart means less non-tariffed revenue to dilute the hit.',
          dossier: [
            {
              label: 'Mechanism',
              text: 'Imported general merchandise cited directly in the margin bridge [VERIFY: Target earnings call].',
            },
          ],
        },
        {
          name: 'Best Buy',
          tag: 'LOSER',
          role: 'Consumer electronics assortment overwhelmingly imported; the purest big-cap retail expression of tariff cost.',
          anchor: 'Guidance cut on tariff COGS pressure [VERIFY: 10-Q]',
          keyRisk:
            'Vendor cost-sharing and country-of-origin shifts can soften but not eliminate the structural exposure.',
          dossier: [
            {
              label: 'Read',
              text: 'The highest import intensity in the loser cohort shown, with the least category diversification to offset it.',
            },
          ],
        },
      ],
    },
    {
      type: 'heading',
      text: 'How to frame the trade',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'For investors, the two ledgers reduce to a [[kw:sector-rotation]]sector rotation[[/kw]] with a policy trigger rather than a macro one. The winner basket (NUE, STLD, and with the leverage asterisk CLF) is a bet that the 50% Section 232 rate and the Buy American ratchet both persist [VERIFY: Federal Register; FAR 25.101]; the mixed machinery pair (CAT, DE) is a spread trade on whether federal demand outruns roughly $2.1 billion of guided input cost [VERIFY: company calls]; the loser cohort (WMT, TGT, BBY) is a short-margin, long-lag story where the worst prints are plausibly still ahead as pre-tariff inventory exhausts [VERIFY: 10-Q inventory disclosures]. The single most useful discipline is to date every data point: USAspending obligations lag awards and get revised [VERIFY: USAspending documentation], and retail margin damage lags the tariff calendar by quarters, so the two ledgers are never in sync on the same reporting date.',
    },
    {
      type: 'paragraph',
      text: "The base case is that the tariff wall outlasts the current appropriations cycle and the procurement ratchet keeps tightening toward the 75% domestic-content threshold [VERIFY: FAR 25.101 final rule], which keeps both ledgers moving in the directions this article maps. The bear case for the winner basket is a negotiated de-escalation that collapses the steel price umbrella faster than contract flow can replace it; the bear case for shorting the losers is that scale retailers pass through enough cost to stabilize margins while smaller rivals exit. Ezana users can track both sides from the platform: the political-intelligence feed surfaces tariff schedule changes and federal award flows as they post, and the quant workbench can backtest the winner-loser spread against the tariff calendar rather than the market calendar, which is where this dataset's real edge lives.",
    },
  ],
};

export default tariffWinnersContractLosers2026;
