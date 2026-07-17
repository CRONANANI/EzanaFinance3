/**
 * Long-form Ezana Echo article: how reserve concentration in critical minerals
 * turns a handful of countries into chokepoints for the energy transition.
 *
 * Editorial / analytical content for the in-app mock catalog + curated DB seed.
 * Every reserve-share figure is read from the USGS Mineral Commodity Summaries
 * 2026 (published Feb 2026; the authoritative free U.S. government dataset for
 * world reserves of 90+ nonfuel commodities), except uranium, which is from the
 * World Nuclear Association. Where a widely-shared infographic disagreed with
 * USGS (notably rare earths, quoted at 52% vs. the current USGS ~48%), the USGS
 * figure is used. Section 5 is analytical exposure-mapping only — not advice.
 */

/* ── Chart 1: reserve concentration by mineral (top-holder share of world
   reserves, %). Sorted descending so the horizontal-bar renderer's rank order
   reads correctly. Source: USGS MCS 2026; uranium from the World Nuclear
   Association. ── */
export const MINERAL_CONCENTRATION_DATA = [
  { label: 'PGMs — South Africa', value: 83 },
  { label: 'Phosphate — Morocco', value: 69 },
  { label: 'Cobalt — DR Congo', value: 50 },
  { label: 'Rare earths — China', value: 48 },
  { label: 'Potash — Canada', value: 45 },
  { label: 'Diamond — Russia', value: 44 },
  { label: 'Nickel — Indonesia', value: 44 },
  { label: 'Manganese — Australia', value: 32 },
  { label: 'Graphite — China', value: 32 },
  { label: 'Iron ore — Australia', value: 31 },
  { label: 'Uranium — Australia', value: 28 },
  { label: 'Zinc — Australia', value: 27 },
  { label: 'Bauxite — Guinea', value: 26 },
  { label: 'Lithium — Chile', value: 25 },
  { label: 'Coal — United States', value: 23 },
  { label: 'Copper — Chile', value: 21 },
  { label: 'Gold — Australia', value: 20 },
  { label: 'Silver — Peru', value: 18 },
];

/* ── Chart 2: the four battery-metal bottlenecks (top-holder reserve share, %),
   sorted descending. Source: USGS MCS 2026. ── */
export const BATTERY_METALS_DATA = [
  { label: 'Cobalt — DR Congo', value: 50 },
  { label: 'Nickel — Indonesia', value: 44 },
  { label: 'Graphite — China', value: 32 },
  { label: 'Lithium — Chile', value: 25 },
];

/* ── Chart 3: rare-earth reserves by holder (share of the 91.9 Mt world total,
   %). China 44.0 Mt, Brazil 21.0 Mt, United States 1.9 Mt are read from USGS
   MCS 2026; "Rest of world" is the residual (25.0 Mt ≈ 27%). Sorted desc. ── */
export const RARE_EARTH_RESERVES_DATA = [
  { label: 'China', value: 48 },
  { label: 'Rest of world', value: 27 },
  { label: 'Brazil', value: 23 },
  { label: 'United States', value: 2 },
];

export const criticalMineralsArticle2026 = {
  id: 'critical-minerals-reserve-concentration-2026',
  title:
    'Who Controls the World’s Critical Minerals: The Reserve Chokepoints Behind the Energy Transition',
  excerpt:
    'A handful of countries hold decisive shares of the minerals the energy transition runs on — South Africa 83% of platinum-group metals, Morocco 69% of phosphate, the DRC roughly half of cobalt, and China about 48% of rare earths. USGS reserve data turns the map of the future economy into a short list of single-country chokepoints.',
  heroImage: {
    src: '/echo/critical-minerals-hero.jpg',
    alt: 'Gloved hands cupping several pieces of raw, silver-grey critical-mineral ore against a snowy mountain backdrop.',
    caption:
      'The minerals behind batteries, chips, and defense hardware come out of the ground in a handful of countries — and the reserve map is far more concentrated than the finished-goods economy it feeds. (Theme image)',
  },
  contentBlocks: [
    {
      type: 'paragraph',
      text: 'The energy transition is usually told as a story about technology — batteries, solar cells, electric motors — but the harder story is about geology, and geology is not evenly distributed. According to the U.S. Geological Survey’s Mineral Commodity Summaries 2026, a single country holds 83% of the world’s reserves of [[kw:platinum-group-metals]]platinum-group metals[[/kw]]: South Africa. Morocco sits on 69% of global phosphate, the backbone of the world’s fertilizer supply. The Democratic Republic of the Congo holds roughly 50% of cobalt reserves, and China about 48% of rare earths. The minerals that underpin decarbonization, semiconductors, and modern defense are not scarce so much as concentrated — and concentration, not scarcity, is what creates leverage.',
    },
    {
      type: 'stat-grid',
      stats: [
        { label: 'PGMs — South Africa', value: '83%', change: 'Share of world reserves (USGS)' },
        { label: 'Phosphate — Morocco', value: '69%', change: 'Fertilizer’s single chokepoint' },
        { label: 'Cobalt — DR Congo', value: '~50%', change: 'Half of the world’s reserves' },
        { label: 'Rare earths — China', value: '~48%', change: '44.0 Mt of 91.9 Mt (USGS)' },
        { label: 'Nickel — Indonesia', value: '44%', change: 'The battery-metal anchor' },
      ],
    },
    { type: 'heading', text: 'The concentration map', level: 2 },
    {
      type: 'paragraph',
      text: 'Start with a definition, because it decides what the numbers mean. [[kw:mineral-reserves]]Reserves[[/kw]] are the portion of a mineral deposit that is economically extractable at the time of the assessment — not the total amount in the earth’s crust (that broader figure is a “resource”). Reserves move as prices and technology change: a deposit uneconomic at $10,000 a tonne can become a reserve at $20,000. That distinction matters because reserve shares, not resource shares, are what constrain the next decade of supply. The USGS 2026 dataset covers more than 90 nonfuel commodities, and read as a ranked list it shows just how lopsided the map is.',
    },
    {
      type: 'paragraph',
      text: 'The top of that list is dominated by single-country majorities. South Africa’s 83% of platinum-group-metal reserves is the most concentrated position of any major mineral on earth; combined with Russia, the two countries control the overwhelming share of the palladium and platinum that catalytic converters, hydrogen electrolyzers, and chip fabrication depend on. Morocco’s 69% of phosphate reserves gives one kingdom decisive influence over the mineral with no substitute in agriculture — every tonne of food ultimately traces back to phosphate. The DRC’s roughly 50% of cobalt and China’s ~48% of rare earths round out a top tier where a supply shock in one country would ripple through the entire downstream economy.',
    },
    {
      type: 'chart',
      variant: 'horizontal-bar',
      title: 'Reserve concentration: the top holder’s share of world reserves, by mineral',
      caption:
        'Largest single-country share of global reserves for 18 key minerals, ranked. South Africa’s 83% of platinum-group metals and Morocco’s 69% of phosphate are the most concentrated positions; even “diversified” minerals like copper (Chile, 21%) and silver (Peru, 18%) have a clear single leader. Source: USGS Mineral Commodity Summaries 2026; uranium share from the World Nuclear Association.',
      data: MINERAL_CONCENTRATION_DATA,
    },
    {
      type: 'paragraph',
      text: 'What the chart makes visible is that concentration is the rule, not the exception. Even the minerals usually described as broadly available have a decisive leader: Australia holds about 31% of iron-ore reserves, 32% of manganese, and roughly 20% of gold; Chile controls 25% of lithium and 21% of copper; Peru holds 18% of silver. A [[kw:supply-chain-chokepoint]]supply-chain chokepoint[[/kw]] does not require a monopoly — a 25–50% reserve share in a single jurisdiction is enough to let one government’s export policy, one permitting regime, or one bout of political instability move a global price. Australia alone ranks first in world reserves of five major commodities, a concentration of geological luck that has quietly made it one of the most strategically important suppliers in the system.',
    },
    {
      type: 'callout',
      label: 'The most concentrated mineral on earth',
      value: '83%',
      context:
        'South Africa holds 83% of world platinum-group-metal reserves (USGS 2026). No other major mineral is so dependent on a single country — a reserve position that gives one supplier structural leverage over autocatalysts, hydrogen electrolyzers, and chip fabrication.',
    },
    { type: 'heading', text: 'The battery-metals axis', level: 2 },
    {
      type: 'paragraph',
      text: 'Nowhere is concentration more consequential than in the four metals that make a battery. Chile holds about 25% of world lithium reserves, and lithium is the purest expression of the transition’s demand curve: global mine production jumped roughly 31% in 2025 to around 290,000 tonnes, and about 88% of all lithium end-use now goes into batteries. Indonesia sits on 44% of nickel reserves and has spent the past several years building the processing capacity to match. The DRC’s ~50% of cobalt and China’s ~32% of graphite complete the set. The electric-vehicle and grid-storage supply chain, in other words, runs through four separate single-country bottlenecks, any one of which can throttle the whole.',
    },
    {
      type: 'chart',
      variant: 'horizontal-bar',
      title: 'The four battery-metal bottlenecks',
      caption:
        'Top-holder share of world reserves for the four metals at the heart of lithium-ion batteries. The EV and grid-storage supply chain depends on all four simultaneously — a diversification problem that cannot be solved by substituting one metal for another. Source: USGS Mineral Commodity Summaries 2026.',
      data: BATTERY_METALS_DATA,
    },
    {
      type: 'paragraph',
      text: 'The strategic problem is that these bottlenecks are additive, not interchangeable. A battery manufacturer cannot swap out cobalt for extra lithium to route around a supply disruption; the chemistry requires each metal in its place. That means the effective concentration of the battery supply chain is worse than any single number suggests — it is exposed to the DRC on cobalt, Indonesia on nickel, Chile (and the broader lithium triangle) on lithium, and China on graphite all at once. Lithium production growing 31% in a single year shows the demand side scaling fast; the reserve map shows the supply side sitting in a small number of hands, which is precisely the setup that produces price spikes when any one link tightens. And the demand concentration compounds the supply concentration: with roughly 88% of lithium end-use flowing into batteries, there is no large second market to cushion a shock, so a battery-demand surge transmits almost directly onto a reserve base a quarter of which sits in one country.',
    },
    { type: 'heading', text: 'China’s midstream lever', level: 2 },
    {
      type: 'paragraph',
      text: 'Reserve share, for all its importance, still understates real leverage — and [[kw:rare-earth-elements]]rare-earth elements[[/kw]] are the clearest example. USGS 2026 puts China’s rare-earth reserves at 44.0 million tonnes of a 91.9-million-tonne world total, about 48%, with Brazil second at 21.0 million tonnes (roughly 23%) and the United States holding just 1.9 million tonnes, close to 2%. But the reserve figure is the smaller half of the story: China’s dominance of rare-earth processing — the midstream step that turns mined ore into usable oxides, metals, and magnets — is far higher than its ~48% of reserves. A country can hold a modest share of a mineral in the ground and still control the point in the chain where value and dependency actually concentrate.',
    },
    {
      type: 'chart',
      variant: 'horizontal-bar',
      title: 'Rare-earth reserves: China leads, the U.S. holds about 2%',
      caption:
        'Share of the 91.9-million-tonne world rare-earth reserve base. China (44.0 Mt) and Brazil (21.0 Mt) dominate; the United States holds roughly 1.9 Mt, near 2%. Reserves understate China’s leverage, which rests more on its dominant share of rare-earth processing than on ore in the ground. “Rest of world” is the residual of the USGS total. Source: USGS Mineral Commodity Summaries 2026.',
      data: RARE_EARTH_RESERVES_DATA,
    },
    {
      type: 'paragraph',
      text: 'That asymmetry is driving policy. The United States, holding roughly 2% of rare-earth reserves and a still-smaller share of processing, has moved from rhetoric to inventory: “Project Vault,” the announced U.S. critical-minerals stockpile, targets rare earths, lithium, and nickel — precisely the metals where import dependence meets strategic use. The value of U.S. nonfuel mineral production reached about $112 billion in 2025, up from roughly $106 billion in 2024, but production value is not the same as supply security; a country can mine and process more in dollar terms while remaining dependent on imports for the specific minerals that matter most. The policy response — stockpiling, faster permitting, and allied supply pacts — is an attempt to buy resilience that the reserve map does not provide on its own.',
    },
    {
      type: 'callout',
      label: 'U.S. rare-earth reserves',
      value: '~2%',
      context:
        'The United States holds about 1.9 million tonnes of a 91.9-million-tonne world rare-earth reserve base — roughly 2% — against China’s ~48%. The processing gap is wider still, which is why the U.S. response centers on stockpiling (“Project Vault”) rather than mining alone.',
    },
    { type: 'heading', text: 'Downstream implications', level: 2 },
    {
      type: 'paragraph',
      text: 'Follow the concentrated minerals downstream and they land on the most strategically sensitive industries. Platinum-group metals and rare earths are defense inputs as much as green-tech ones: PGMs go into jet-engine coatings and sensors, and rare-earth magnets are essential to guided munitions, radar, and electric drivetrains — which is why an 83% PGM position in South Africa and a ~48% rare-earth reserve position (with far higher processing share) in China register as national-security concerns, not just commodity-market ones. The same metals that decarbonize the civilian economy also arm the military one, and both draw from the same short list of suppliers.',
    },
    {
      type: 'paragraph',
      text: 'Fertilizer is the quieter but arguably larger exposure. Morocco’s 69% of phosphate reserves and Canada’s roughly 45% of potash mean that two countries anchor the two minerals with no substitute in modern agriculture. A disruption there does not show up as a battery shortage; it shows up as food-price inflation, which is why phosphate and potash concentration is a food-security question in every importing nation. The geopolitics sharpen where concentration meets fragility: Guinea holds about 26% of bauxite reserves — the feedstock for aluminum — and the DRC’s ~50% of cobalt sits in a country with a long history of instability. When a critical mineral is both concentrated and located in a fragile state, the supply risk is not hypothetical; it is a standing feature of the market.',
    },
    { type: 'heading', text: 'Market positioning', level: 2 },
    {
      type: 'paragraph',
      text: 'For investors mapping this theme, the cleanest exposure runs through the miners and processors with direct reserve or production positions in the concentrated minerals — framed as exposure, not endorsement. In rare earths, MP Materials (MP) is the primary U.S.-listed name with a domestic mine-to-magnet strategy against China’s ~48% reserve and dominant processing share. In lithium, Albemarle (ALB) and SQM (SQM) carry direct exposure to Chile’s ~25% reserve base and the 31% production growth of 2025. Freeport-McMoRan (FCX) is levered to copper, where Chile’s 21% leads; the diversified majors — Vale (VALE), BHP (BHP), and Rio Tinto (RIO) — span iron ore, nickel, and copper across multiple concentrated jurisdictions. Uranium exposure, tied to Australia’s ~28% reserve share, runs through Cameco (CCJ). For basket exposure, thematic funds such as REMX (rare earths and strategic metals) and LIT (lithium and battery tech) hold the names collectively rather than singly.',
    },
    {
      type: 'paragraph',
      text: 'None of that is a recommendation to buy any of it. Reserve concentration explains where the structural leverage sits; it does not tell an investor what is already priced in, and mining equities carry operational, jurisdictional, and commodity-cycle risk that a reserve statistic says nothing about. A single permitting delay, a tailings failure, or a change of government in a 25%-share jurisdiction can swamp the reserve thesis in the short run, and thematic ETFs like REMX and LIT bundle exactly those idiosyncratic risks alongside the structural exposure. The analytical point is narrower: the companies and ETFs above are the listed instruments with the most direct link to the specific chokepoints USGS data identifies, which makes them the natural watchlist for anyone tracking how mineral concentration translates into market outcomes.',
    },
    { type: 'heading', text: 'The base case and the bear case', level: 2 },
    {
      type: 'paragraph',
      text: 'The base case is that concentration persists and hardens. Reserve maps change on the timescale of decades, not quarters; South Africa’s 83% of PGMs, Morocco’s 69% of phosphate, and China’s ~48% of rare earths are not going to diversify away by 2030. If anything, the policy trend — stockpiling like Project Vault, allied onshoring, and export controls used as leverage — reinforces the map by turning geology into statecraft. In that world, the concentrated suppliers gain pricing power and the import-dependent economies keep paying a security premium. The bear case for the thesis is dilution: new discoveries, faster permitting outside the incumbent leaders, and above all recycling — recovering lithium, cobalt, and rare earths from end-of-life batteries and magnets — could gradually loosen single-country grips, especially in the battery metals where the installed base of recoverable material is growing fast.',
    },
    {
      type: 'paragraph',
      text: 'For investors using Ezana, the tools to track this are the commodities dataset, which follows prices and production across the metals named here, and the Global Empire Lighthouse dimension, which maps national resource leverage — exactly the kind of single-country dominance the USGS reserve data quantifies. The reserve map is one of the few macro variables that is both decisive and slow-moving, which makes it a rare thing in markets: a structural edge that is hiding in a free government dataset. The [[kw:critical-minerals-list]]critical-minerals list[[/kw]] the USGS maintains under the Energy Act of 2020 is the map of where that edge is most concentrated — and it is redrawn only once a year.',
    },
    { type: 'heading', text: 'Sources', level: 2 },
    {
      type: 'paragraph',
      text: '1. U.S. Geological Survey, Mineral Commodity Summaries 2026 (published February 2026; world reserves by commodity; machine-readable release on data.gov) — the source for every reserve-share figure above except uranium. 2. World Nuclear Association — uranium reserve share (Australia ~28%). 3. USGS on the value of U.S. nonfuel mineral production ($112 billion in 2025 vs. $106 billion in 2024) and on lithium production growth (~31% in 2025 to ~290,000 tonnes; ~88% of lithium end-use in batteries). Where a widely-circulated infographic diverged from USGS — notably a 52% rare-earth figure — the current USGS value (~48%) is used.',
    },
  ],
  author: 'Ezana Finance Editorial',
  category: 'commodities',
  tags: ['commodities', 'critical-minerals', 'geopolitics', 'energy-transition', 'analysis'],
  tickers: ['MP', 'ALB', 'SQM', 'FCX', 'VALE', 'BHP', 'RIO', 'CCJ', 'REMX', 'LIT'],
  entities: {
    people: [],
    terms: [
      { id: 'platinum-group-metals', label: 'Platinum-Group Metals' },
      { id: 'mineral-reserves', label: 'Mineral Reserves' },
      { id: 'supply-chain-chokepoint', label: 'Supply-Chain Chokepoint' },
      { id: 'rare-earth-elements', label: 'Rare-Earth Elements' },
      { id: 'critical-minerals-list', label: 'Critical Minerals List' },
    ],
  },
  readTime: 10,
  publishedAt: '2026-07-05',
  featured: true,
  likes: 0,
  comments: 0,
  reads: 0,
  listMeta: '5 Jul 2026',
};
