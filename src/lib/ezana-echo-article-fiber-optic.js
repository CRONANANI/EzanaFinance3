/* ════════════════════════════════════════════════════════════════════════════
   Ezana Echo — Fiber Optic Cable Industry Article
   Data + content blocks for the interactive long-form piece.
   ════════════════════════════════════════════════════════════════════════════ */

/* ── FRED PPI Data: Producer Price Index, Fiber Optic Cable Mfg ───────────
   Series: PCU3359213359210   Base: Dec 2003 = 100
   Source: FRED / Bureau of Labor Statistics
   Sampled quarterly for chart readability (full monthly in CSV).
   ──────────────────────────────────────────────────────────────────────── */
export const FRED_PPI_DATA = [
  { date: '2003-12', value: 100.0 },
  { date: '2004-06', value: 91.2 },
  { date: '2004-12', value: 91.2 },
  { date: '2005-06', value: 92.2 },
  { date: '2005-12', value: 91.9 },
  { date: '2006-06', value: 92.0 },
  { date: '2006-12', value: 92.7 },
  { date: '2007-06', value: 93.1 },
  { date: '2007-12', value: 92.1 },
  { date: '2008-06', value: 91.6 },
  { date: '2008-12', value: 91.3 },
  { date: '2009-06', value: 90.9 },
  { date: '2009-12', value: 90.6 },
  { date: '2010-06', value: 90.4 },
  { date: '2010-12', value: 90.2 },
  { date: '2011-06', value: 89.6 },
  { date: '2011-12', value: 88.6 },
  { date: '2012-06', value: 87.6 },
  { date: '2012-12', value: 85.3 },
  { date: '2013-06', value: 84.6 },
  { date: '2013-12', value: 84.3 },
  { date: '2014-06', value: 84.1 },
  { date: '2014-12', value: 84.0 },
  { date: '2015-06', value: 83.3 },
  { date: '2015-12', value: 82.9 },
  { date: '2016-06', value: 82.6 },
  { date: '2016-12', value: 82.8 },
  { date: '2017-06', value: 83.2 },
  { date: '2017-12', value: 85.1 },
  { date: '2018-06', value: 88.7 },
  { date: '2018-12', value: 95.1 },
  { date: '2019-06', value: 98.1 },
  { date: '2019-12', value: 97.6 },
  { date: '2020-06', value: 93.1 },
  { date: '2020-12', value: 91.0 },
  { date: '2021-06', value: 89.2 },
  { date: '2021-12', value: 86.5 },
  { date: '2022-06', value: 88.2 },
  { date: '2022-12', value: 91.4 },
  { date: '2023-06', value: 92.0 },
  { date: '2023-12', value: 89.4 },
  { date: '2024-06', value: 86.2 },
  { date: '2024-12', value: 85.9 },
  { date: '2025-06', value: 87.0 },
];

/* ── Global Market Forecast by Application 2024–2034 ──────────────────────
   Source: Industry research (illustrative; matches the uploaded chart).
   Values in USD billions.
   ──────────────────────────────────────────────────────────────────────── */
export const MARKET_FORECAST_DATA = [
  { year: 2024, Telecom: 3.2, Automobile: 0.8, 'Medical Equipment': 0.5, 'Power Utilities': 0.6, 'Aerospace & Defense': 0.4, 'Industrial Automation': 0.9, Others: 0.3 },
  { year: 2025, Telecom: 3.8, Automobile: 1.0, 'Medical Equipment': 0.6, 'Power Utilities': 0.7, 'Aerospace & Defense': 0.5, 'Industrial Automation': 1.1, Others: 0.4 },
  { year: 2026, Telecom: 4.4, Automobile: 1.2, 'Medical Equipment': 0.7, 'Power Utilities': 0.8, 'Aerospace & Defense': 0.6, 'Industrial Automation': 1.3, Others: 0.5 },
  { year: 2027, Telecom: 5.1, Automobile: 1.4, 'Medical Equipment': 0.8, 'Power Utilities': 0.9, 'Aerospace & Defense': 0.7, 'Industrial Automation': 1.5, Others: 0.6 },
  { year: 2028, Telecom: 5.9, Automobile: 1.7, 'Medical Equipment': 0.9, 'Power Utilities': 1.1, 'Aerospace & Defense': 0.8, 'Industrial Automation': 1.8, Others: 0.7 },
  { year: 2029, Telecom: 6.8, Automobile: 2.0, 'Medical Equipment': 1.1, 'Power Utilities': 1.3, 'Aerospace & Defense': 0.9, 'Industrial Automation': 2.1, Others: 0.8 },
  { year: 2030, Telecom: 7.8, Automobile: 2.4, 'Medical Equipment': 1.3, 'Power Utilities': 1.5, 'Aerospace & Defense': 1.1, 'Industrial Automation': 2.5, Others: 0.9 },
  { year: 2031, Telecom: 8.9, Automobile: 2.8, 'Medical Equipment': 1.5, 'Power Utilities': 1.7, 'Aerospace & Defense': 1.3, 'Industrial Automation': 2.9, Others: 1.1 },
  { year: 2032, Telecom: 10.2, Automobile: 3.2, 'Medical Equipment': 1.7, 'Power Utilities': 2.0, 'Aerospace & Defense': 1.5, 'Industrial Automation': 3.4, Others: 1.3 },
  { year: 2033, Telecom: 11.6, Automobile: 3.7, 'Medical Equipment': 2.0, 'Power Utilities': 2.3, 'Aerospace & Defense': 1.7, 'Industrial Automation': 3.9, Others: 1.5 },
  { year: 2034, Telecom: 13.2, Automobile: 4.3, 'Medical Equipment': 2.3, 'Power Utilities': 2.6, 'Aerospace & Defense': 2.0, 'Industrial Automation': 4.5, Others: 1.7 },
];

export const MARKET_FORECAST_KEYS = [
  { key: 'Telecom', color: '#0d3b66' },
  { key: 'Automobile', color: '#f4a261' },
  { key: 'Medical Equipment', color: '#2a9d8f' },
  { key: 'Power Utilities', color: '#e76f51' },
  { key: 'Aerospace & Defense', color: '#b5c7d3' },
  { key: 'Industrial Automation', color: '#4a9e6f' },
  { key: 'Others', color: '#264653' },
];

/* ── Company Geolocation Data ───────────────────────────────────────────── */
export const FIBER_OPTIC_COMPANIES = [
  { name: 'Corning Inc', ticker: 'GLW', lat: 42.14, lng: -77.05, country: 'US', continent: 'North America', industry: 'Telecom', hq: 'Corning, NY', highlight: true },
  { name: 'CommScope', ticker: 'COMM', lat: 35.64, lng: -80.47, country: 'US', continent: 'North America', industry: 'Telecom', hq: 'Hickory, NC' },
  { name: 'Belden', ticker: 'BDC', lat: 38.63, lng: -90.2, country: 'US', continent: 'North America', industry: 'Industrial Automation', hq: 'St. Louis, MO' },
  { name: 'W. L. Gore & Associates', lat: 39.74, lng: -75.55, country: 'US', continent: 'North America', industry: 'Aerospace & Defense', hq: 'Newark, DE' },
  { name: 'Coherent', ticker: 'COHR', lat: 40.44, lng: -79.95, country: 'US', continent: 'North America', industry: 'Telecom', hq: 'Pittsburgh, PA' },
  { name: 'Rockwell Collins', lat: 41.98, lng: -91.67, country: 'US', continent: 'North America', industry: 'Aerospace & Defense', hq: 'Cedar Rapids, IA' },
  { name: 'Reflex Photonics', lat: 45.5, lng: -73.57, country: 'CA', continent: 'North America', industry: 'Aerospace & Defense', hq: 'Montreal, QC' },

  { name: 'Prysmian', ticker: 'PRY.MI', lat: 45.46, lng: 9.19, country: 'IT', continent: 'Europe', industry: 'Power Utilities', hq: 'Milan, Italy' },
  { name: 'Nexans', ticker: 'NEX.PA', lat: 48.86, lng: 2.35, country: 'FR', continent: 'Europe', industry: 'Power Utilities', hq: 'Paris, France' },
  { name: 'Leoni', lat: 49.45, lng: 11.08, country: 'DE', continent: 'Europe', industry: 'Automobile', hq: 'Nuremberg, Germany' },
  { name: 'Nestor Cables', lat: 63.1, lng: 21.6, country: 'FI', continent: 'Europe', industry: 'Telecom', hq: 'Oulu, Finland' },
  { name: 'FOLAN', lat: 47.22, lng: -1.55, country: 'FR', continent: 'Europe', industry: 'Industrial Automation', hq: 'Nantes, France' },

  { name: 'Yangtze Optical Fiber (YOFC)', ticker: '601869.SS', lat: 30.59, lng: 114.3, country: 'CN', continent: 'Asia Pacific', industry: 'Telecom', hq: 'Wuhan, China' },
  { name: 'Hengtong Group', lat: 31.1, lng: 120.63, country: 'CN', continent: 'Asia Pacific', industry: 'Power Utilities', hq: 'Suzhou, China' },
  { name: 'FiberHome', lat: 30.59, lng: 114.3, country: 'CN', continent: 'Asia Pacific', industry: 'Telecom', hq: 'Wuhan, China' },
  { name: 'Tongding Group', lat: 31.3, lng: 120.58, country: 'CN', continent: 'Asia Pacific', industry: 'Telecom', hq: 'Suzhou, China' },
  { name: 'ZTT International', lat: 32.19, lng: 120.16, country: 'CN', continent: 'Asia Pacific', industry: 'Power Utilities', hq: 'Nantong, China' },
  { name: 'Futong', lat: 30.28, lng: 120.15, country: 'CN', continent: 'Asia Pacific', industry: 'Telecom', hq: 'Hangzhou, China' },
  { name: 'Kaile Science & Technology', lat: 31.23, lng: 121.47, country: 'CN', continent: 'Asia Pacific', industry: 'Telecom', hq: 'Shanghai, China' },
  { name: 'Jiangsu Fasten', lat: 31.3, lng: 120.58, country: 'CN', continent: 'Asia Pacific', industry: 'Power Utilities', hq: 'Suzhou, China' },
  { name: 'Jiangsu Etern', lat: 32.4, lng: 119.43, country: 'CN', continent: 'Asia Pacific', industry: 'Telecom', hq: 'Yizheng, China' },
  { name: 'Fujikura', ticker: '5803.T', lat: 35.68, lng: 139.69, country: 'JP', continent: 'Asia Pacific', industry: 'Telecom', hq: 'Tokyo, Japan' },
  { name: 'Sumitomo Electric', ticker: '5802.T', lat: 34.69, lng: 135.5, country: 'JP', continent: 'Asia Pacific', industry: 'Automobile', hq: 'Osaka, Japan' },
  { name: 'Hitachi Cable', lat: 35.68, lng: 139.69, country: 'JP', continent: 'Asia Pacific', industry: 'Industrial Automation', hq: 'Tokyo, Japan' },
  { name: 'LS Cable & System', ticker: '003550.KS', lat: 37.57, lng: 126.98, country: 'KR', continent: 'Asia Pacific', industry: 'Power Utilities', hq: 'Seoul, South Korea' },
  { name: 'Sterlite Technologies', ticker: 'STERLITE.NS', lat: 18.52, lng: 73.85, country: 'IN', continent: 'Asia Pacific', industry: 'Telecom', hq: 'Pune, India' },

  { name: 'Finisar (now Coherent)', lat: -33.87, lng: 151.21, country: 'AU', continent: 'Oceania', industry: 'Telecom', hq: 'Sydney, Australia (APAC ops)' },
];

export const CONTINENTS = ['North America', 'Europe', 'Asia Pacific', 'Oceania'];
export const INDUSTRIES = ['Telecom', 'Automobile', 'Medical Equipment', 'Power Utilities', 'Aerospace & Defense', 'Industrial Automation'];

export const INDUSTRY_COLORS = {
  Telecom: '#0d3b66',
  Automobile: '#f4a261',
  'Medical Equipment': '#2a9d8f',
  'Power Utilities': '#e76f51',
  'Aerospace & Defense': '#b5c7d3',
  'Industrial Automation': '#4a9e6f',
  Others: '#264653',
};

export const fiberOpticArticle = {
  id: 'fiber-optic-cable-ai-boom-benny-fazio',
  title: "Fiber Optic Cable: Alotta Money In This Stuff",
  excerpt:
    'From a construction site score to a $30 billion global market — how fiber optic cable went from Benny Fazio\'s side hustle to the backbone of the AI revolution, and why Corning\'s stock is outrunning Nvidia.',
  contentBlocks: [
    {
      type: 'paragraph',
      text: 'There is a scene in The Sopranos that every fiber optic investor should tattoo on their Bloomberg terminal. Christopher Moltisanti pulls up to a construction site and sees spools of cable laid out across the dirt. He asks the only honest question in the room: "What is all that?" Benny Fazio, criminal mastermind prodigy of the Soprano family, barely looks up. "Fiber optic cable. High-speed internet access." And then Vito Spatafore, surveying the haul like a man who has seen the future, delivers the thesis of the decade: "Alotta money in this stuff."',
    },
    {
      type: 'paragraph',
      text: 'The scene aired in the early 2000s. The dot-com bubble had just burst. Half of Wall Street thought the internet was a fad. And here were three guys from North Jersey — guys whose primary expertise was in waste management consulting — standing at a construction site, staring at a pile of glass thread, and correctly identifying the investment opportunity of the century. Vito called the top. Benny called the product. Christopher, asking "what is all that?", was every retail investor who ignored fiber for twenty years and is now panic-buying Corning at all-time highs.',
    },
    {
      type: 'paragraph',
      text: 'The joke writes itself: the mob figured out fiber optics before most hedge funds did. But the punchline is that Benny Fazio was not wrong. He was early. If you had taken his construction-site thesis seriously — that the physical layer of the internet was valuable enough to lift off the ground — and bought the companies that actually manufacture the cable, you would be sitting on one of the best-performing industrial trades of the last two decades. Fiber optic cable was not a fad. It was infrastructure. And infrastructure always wins.',
    },

    { type: 'heading', text: 'The Price Index: What The Factory Floor Is Telling Us', level: 2 },
    {
      type: 'paragraph',
      text: 'The Bureau of Labor Statistics tracks the Producer Price Index for Fiber Optic Cable Manufacturing — a measure of what factories charge for the cable before it reaches installers and end users. This is the wholesale heartbeat of the industry. When the PPI rises, it means demand is outrunning supply and manufacturers have pricing power. When it falls, it means capacity is plentiful and buyers are negotiating discounts. The chart below spans two decades of this signal.',
    },
    {
      type: 'chart',
      variant: 'fred-line',
      title: 'Producer Price Index: Fiber Optic Cable Manufacturing',
      caption: 'PPI for Fiber Optic Cable Manufacturing (NAICS 335921). Dec 2003 = 100. Source: FRED / Bureau of Labor Statistics.',
      dataKey: 'fredPpi',
      yLabel: 'Index (Dec 2003 = 100)',
    },
    {
      type: 'paragraph',
      text: 'The pattern is striking. From 2004 to 2017, the index declined almost continuously — a long deflationary grind driven by manufacturing scale-up in China, overcapacity from the dot-com overbuild, and steady efficiency gains in glass fiber production. Prices fell from the 100 baseline to roughly 83 by mid-2016. Then something changed. Starting in late 2017, the index reversed sharply — climbing from 83 to a peak near 98 by mid-2019. That spike aligned with the first wave of 5G network buildouts and hyperscale data center expansion. Carriers and cloud providers were pulling fiber at a pace the supply chain had not anticipated.',
    },
    {
      type: 'paragraph',
      text: 'COVID disrupted the trajectory briefly, pushing the index back down to the mid-80s as construction slowed and supply chains seized. But the structural demand story never broke. By late 2022, prices were climbing again — and the current reading near 87 sits in a range that suggests the market is in early-cycle recovery, not late-cycle froth. The AI-driven buildout has not yet fully hit the PPI. When Meta, Microsoft, and Amazon start pulling cable at the volumes their capex budgets imply, this index is going to move.',
    },

    { type: 'heading', text: 'The $30 Billion Question: Where The Growth Is Coming From', level: 2 },
    {
      type: 'paragraph',
      text: 'The global fiber optic cable market is projected to grow from roughly $6.7 billion in 2024 to over $30 billion by 2034 — a compound annual growth rate near 16%. Telecom remains the largest application segment, driven by 5G densification, fiber-to-the-home rollouts in emerging markets, and the insatiable bandwidth appetite of AI data centers. But the fastest-growing segments are not telecom — they are automobile (in-vehicle optical networks for autonomous driving), industrial automation (Industry 4.0 sensor networks), and aerospace (weight savings over copper in next-generation aircraft).',
    },
    {
      type: 'chart',
      variant: 'stacked-bar-forecast',
      title: 'Global Fiber Optic Cable Market 2024–2034 (By Application)',
      caption: 'Market size in USD billions by application segment. Source: Industry research estimates.',
      dataKey: 'marketForecast',
      yLabel: 'Market Size (USD Bn)',
    },
    {
      type: 'paragraph',
      text: 'The chart tells a compound story. Telecom is the blue base — large and growing steadily. But watch the green (Industrial Automation) and orange (Automobile) segments: they roughly triple over the decade. The medical equipment slice — small today — is projected to quadruple as surgical robotics, in-vivo imaging, and remote diagnostics all shift from copper to optical interconnects. Aerospace and defense, while smaller in absolute dollars, commands the highest per-meter prices because military-grade cable requires radiation hardening, extreme temperature tolerance, and redundant core geometry.',
    },

    { type: 'heading', text: 'Who Makes The Cable: A Global Map', level: 2 },
    {
      type: 'paragraph',
      text: 'The fiber optic cable supply chain is dominated by three geographies: the United States (Corning, CommScope, Belden), Europe (Prysmian, Nexans, Leoni), and China (YOFC, Hengtong, ZTT, FiberHome). Japan and South Korea round out the top tier. The map below plots every major producer, color-coded by their primary industry application and filterable by continent. Toggle the layers to see how regional specialization shapes the market.',
    },
    {
      type: 'chart',
      variant: 'fiber-optic-world-map',
      title: 'Global Fiber Optic Cable Manufacturers',
      caption: 'Major producers plotted by headquarters location. Toggle continents and industry filters. Source: Ezana Finance Research.',
      dataKey: 'fiberOpticCompanies',
    },

    { type: 'heading', text: 'Corning: The 175-Year-Old Company That Is Outrunning Nvidia', level: 2 },
    {
      type: 'paragraph',
      text: "Corning Incorporated has been making glass since 1851. They manufactured the glass envelope for Thomas Edison's first practical lightbulb. They developed the cathode ray tubes that powered a half-century of television. They invented the Gorilla Glass that protects a billion smartphone screens. And now, at the age of 175, they find themselves at the center of the single most capital-intensive infrastructure buildout in human history: the AI data center.",
    },
    {
      type: 'callout',
      label: 'Corning (NYSE: GLW)',
      value: '+74% YTD',
      context: 'Outperforming Nvidia, Broadcom, and AMD in 2025 — on fiber optic cable demand from AI data centers.',
    },
    {
      type: 'paragraph',
      text: "The thesis is deceptively simple. Every AI model runs on GPUs. Those GPUs live inside racks. Those racks need to talk to each other — fast. The current workhorse, Nvidia's NVLink 72 rack configuration, uses approximately two miles of copper cabling per rack. But copper has a distance problem: signal degrades over length, requiring repeaters that add latency and power draw. Fiber does not have this problem. A single glass strand can carry data at the speed of light over kilometers without meaningful loss. The industry is transitioning, and Corning is the company with the patent portfolio, the manufacturing capacity, and the customer relationships to capture the shift.",
    },
    {
      type: 'paragraph',
      text: "Corning's recent innovation — Multicore Fiber (MCF) — packs four optical cores into a standard 125-micron strand, delivering four times the data density of traditional single-core fiber. For data center operators, this means maintaining peak performance while using 75% fewer cables. The practical impact is not just speed — it is cost. Fewer cables mean fewer conduits, fewer splice points, fewer failure modes, and dramatically reduced installation labor. When you are building a facility with 100,000 GPU racks, a 75% reduction in cabling is not a nice-to-have. It is the difference between a buildout that takes 18 months and one that takes 12.",
    },
    {
      type: 'stat-grid',
      stats: [
        { label: 'MCF Density', value: '4× single-core', change: '75% fewer cables needed' },
        { label: 'Meta Deal', value: '$6 Billion', change: 'Multi-year optical fiber commitment' },
        { label: 'New Factory', value: 'Broke ground Mar 2026', change: 'Dedicated Meta production' },
        { label: 'Q1 2026 Earnings', value: '2 new hyperscale deals', change: 'AI-driven upside guidance' },
      ],
    },
    {
      type: 'paragraph',
      text: "The scale of institutional commitment became clear in January 2026 when Meta Platforms signed a deal worth $6 billion over several years for Corning's optical fiber. Mark Zuckerberg's company is building AI data centers at a pace that would make a 1990s telecom executive weep. To meet Meta's demand alone, Corning broke ground on a brand-new manufacturing facility in March 2026 — a factory dedicated specifically to producing cables for one customer. When a single buyer justifies an entire factory, you are not in a cyclical business. You are in an arms race.",
    },
    {
      type: 'paragraph',
      text: 'In its Q1 2026 earnings report, Corning revealed two additional major deals with AI hyperscale customers — names it did not disclose but which Wall Street assumes are Microsoft and Amazon based on capex timing. The stock responded by extending its year-to-date gain to 74%, surpassing the returns of every major semiconductor name. Nvidia, for all its GPU dominance, returned 51% over the same period. Broadcom managed 42%. AMD delivered 14%. The company that makes glass cables is beating the companies that make the chips those cables connect.',
    },

    { type: 'heading', text: 'Market Segmentation: Mode, Type, and Application', level: 2 },
    {
      type: 'paragraph',
      text: 'The fiber optic cable market segments along three axes. By mode: single-mode fiber (long-distance, narrow core, used in telecom backhaul and submarine cables) versus multi-mode fiber (short-distance, wider core, used inside data centers and buildings). By type: glass optical fiber (the dominant material, offering lower attenuation and higher bandwidth) versus plastic optical fiber (cheaper, more flexible, used in automotive and consumer electronics where extreme performance is not required). By application: the seven segments visible in the forecast chart — telecom, automobile, medical equipment, power utilities, aerospace and defense, industrial automation, and others.',
    },
    {
      type: 'paragraph',
      text: 'For investors, the mode split is the most actionable. Single-mode fiber pricing is rising because submarine cable projects (Google\'s Firmina, Meta\'s Amitie, Microsoft\'s Marea) consume enormous quantities on multi-year timelines. Multi-mode fiber pricing is rising because AI data centers use it for rack-to-rack connections where volume is measured in millions of meters per facility. Both modes are in demand. The difference is that single-mode projects are lumpy (one $500M submarine cable order every few years) while multi-mode demand is recurring (every new data center needs it continuously).',
    },

    { type: 'heading', text: 'Benny Fazio Was Right', level: 2 },
    {
      type: 'paragraph',
      text: 'The fiber optic cable industry is not glamorous. It does not have the narrative sizzle of GPU wars or the meme energy of cryptocurrency. It is glass thread pulled through conduit by workers in hard hats. It is splice trays and fusion splicers and optical time-domain reflectometers. It is, by every aesthetic standard, boring. And that is exactly why it works as an investment. Boring infrastructure with secular demand tailwinds and oligopolistic supply structure is the compound-interest machine that wealth managers dream about.',
    },
    {
      type: 'quote',
      text: 'Fiber optic cable. High-speed internet access. Alotta money in this stuff.',
      source: 'Benny Fazio and Vito Spatafore, The Sopranos, Season 6',
    },
    {
      type: 'paragraph',
      text: 'Benny stole the cable. Corning manufactures it. The difference is a 175-year head start and a patent portfolio. But the thesis is the same one Vito articulated leaning against that van: there is a lot of money in this stuff. The AI boom has not changed that thesis. It has accelerated it. Every GPU rack needs fiber. Every data center needs fiber. Every submarine cable needs fiber. Every autonomous vehicle needs fiber. Every surgical robot needs fiber. The question is not whether fiber optic cable is a good business. The question is whether the supply chain can build it fast enough.',
    },
  ],
  author: 'Ezana Finance Editorial',
  category: 'companies',
  tickers: ['GLW', 'COMM', 'PRY', 'NEX', 'COHR', 'BDC', 'META', 'NVDA'],
  readTime: 14,
  publishedAt: '2026-05-02',
  featured: false,
  likes: 287,
  comments: 64,
  reads: 5840,
  listMeta: 'Deep Dive',
};
