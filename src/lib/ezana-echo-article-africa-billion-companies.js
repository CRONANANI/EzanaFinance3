/**
 * Ezana Echo long-form article: Africa's $1B+ revenue companies.
 * Based on McKinsey Global Institute / African Development Bank data.
 */
export const africaBillionCompaniesArticle = {
  id: 'africa-billion-dollar-companies-2026',
  title: 'Africa Has at Least 345 Companies with Revenues of $1 Billion or More',
  excerpt:
    "Africa's corporate landscape is larger than most global investors realize. At least 345 companies on the continent generate over $1 billion in annual revenue, concentrated in Southern Africa (160), Northern Africa (73), and an emerging West African bloc led by Nigeria's 23. Here's where the money is and what it means for frontier investors.",
  heroImage: {
    src: '/africa-billion-companies-map.png',
    alt: 'Map of Africa showing the distribution of companies with revenues of $1 billion or more across the continent, color-coded by region',
    caption:
      'Africa is home to at least 345 companies generating over $1B in annual revenue — more than most investors assume.',
    kind: 'infographic',
  },
  contentBlocks: [
    {
      type: 'paragraph',
      text: "Africa is home to at least 345 companies with annual revenues exceeding $1 billion — a figure that challenges the persistent narrative of the continent as an investment [[kw:frontier-markets]]frontier market[[/kw]] defined primarily by aid flows and extractive industries. The data, mapped by region, reveals a corporate landscape that is structurally deeper and more diversified than global investors typically credit. Southern Africa dominates with 160 companies, driven overwhelmingly by South Africa's mature financial and mining sectors. Northern Africa contributes 73, anchored by Egypt's 33 and Morocco's 20. Western Africa adds 35, with Nigeria's 23 accounting for two-thirds of the region's total. Eastern Africa registers 16, and Central Africa — the least penetrated region — has 7.",
    },
    {
      type: 'stat-grid',
      stats: [
        { label: 'Total $1B+ Companies', value: '345', change: 'Across the continent' },
        { label: 'Southern Africa', value: '160', change: 'South Africa: 147' },
        { label: 'Northern Africa', value: '73', change: 'Egypt: 33, Morocco: 20' },
        { label: 'Western Africa', value: '35', change: 'Nigeria: 23' },
        { label: 'Foreign-HQ (no local)', value: '54', change: 'Operating but not domiciled' },
      ],
    },
    {
      type: 'africa-map',
      title: 'Companies with $1B+ Revenue by Country',
      subtitle:
        'Hover any country to see how many billion-dollar companies are headquartered there',
    },
    { type: 'heading', text: 'Southern Africa: the continental heavyweight', level: 2 },
    {
      type: 'paragraph',
      text: "South Africa alone accounts for 147 of the continent's 345 billion-dollar companies — 43% of the total. This concentration reflects the country's uniquely developed capital markets, [[kw:jse]]Johannesburg Stock Exchange (JSE)[[/kw]] infrastructure that dates to 1887, and deep integration into global supply chains through mining, financial services, and telecommunications. Companies like Naspers, Sasol, FirstRand, and MTN Group are not just African champions — they are global operators with market capitalizations and revenue footprints that rival their developed-market peers.",
    },
    {
      type: 'paragraph',
      text: "Beyond South Africa, the Southern African region includes Botswana (1), Zambia (2), Zimbabwe (1), Angola (9), and the DRC (4). Angola's count is almost entirely petroleum-driven — Sonangol and associated joint ventures account for the bulk of its $1B+ revenue companies. The DRC's four are dominated by mining — copper and cobalt extraction that feeds directly into the global EV battery supply chain. Zambia's two are similarly mining-dependent. The concentration in [[kw:extractive-industries]]extractives[[/kw]] across the region outside South Africa highlights both the opportunity (resource demand is structurally growing) and the risk (revenue diversity is thin).",
    },
    {
      type: 'dossier-table',
      figureLabel: 'FIG. 1',
      kicker: 'TOP-10 BY $1B+ COMPANY COUNT · TAP A ROW',
      hint: 'The country dossiers behind the headline count — what drives each base, and the risk in it.',
      source: 'McKinsey Global Institute / African Development Bank estimates.',
      headers: ['Country', 'Corporate drivers', '$1B+ companies', 'Key risk', 'Dossier'],
      rows: [
        {
          name: 'South Africa',
          tag: 'Southern',
          role: 'Mature JSE; mining, financial services, telecom',
          anchor: '147',
          keyRisk: 'Single-market concentration — 43% of the continent',
          dossier: [
            {
              label: 'Depth',
              text: '147 of the 345 companies; JSE infrastructure dating to 1887.',
            },
            {
              label: 'Champions',
              text: 'Naspers, Sasol, FirstRand, MTN Group — global operators.',
            },
          ],
        },
        {
          name: 'Egypt',
          tag: 'Northern',
          role: 'Financial services, real estate, telecom, construction',
          anchor: '33',
          keyRisk: 'Currency float and reform-execution risk',
          dossier: [
            { label: 'Access', text: "EGX is among Africa's oldest and most liquid exchanges." },
            { label: 'Reform', text: 'IMF-backed structural adjustments since 2016.' },
          ],
        },
        {
          name: 'Nigeria',
          tag: 'Western',
          role: 'Oil & gas, banking, telecom, cement',
          anchor: '23',
          keyRisk: 'Refined-fuel import dependence',
          dossier: [
            {
              label: 'Anchor',
              text: 'Dangote Refinery — largest single-train refinery, operational early 2025.',
            },
          ],
        },
        {
          name: 'Morocco',
          tag: 'Northern',
          role: 'Manufacturing/logistics hub; OCP phosphate; automotive',
          anchor: '20',
          keyRisk: 'Phosphate and export concentration',
          dossier: [
            { label: 'Resource', text: "Controls roughly 70% of the world's phosphate reserves." },
          ],
        },
        {
          name: 'Algeria',
          tag: 'Northern',
          role: 'Hydrocarbons',
          anchor: '12',
          keyRisk: 'Extractive concentration',
        },
        {
          name: 'Angola',
          tag: 'Southern',
          role: 'Petroleum (Sonangol and joint ventures)',
          anchor: '9',
          keyRisk: 'Thin revenue diversity',
        },
        {
          name: 'Kenya',
          tag: 'Eastern',
          role: 'Financial hub; Safaricom/M-Pesa, Equity Group, EABL',
          anchor: '6',
          keyRisk: 'Frontier liquidity',
          dossier: [
            {
              label: 'Fintech',
              text: 'M-Pesa processes more transactions annually than PayPal does across sub-Saharan Africa.',
            },
          ],
        },
        {
          name: 'Ethiopia',
          tag: 'Eastern',
          role: 'State-owned; Ethiopian Airlines',
          anchor: '4',
          keyRisk: 'FX constraints; Tigray conflict (2020–2022)',
        },
        {
          name: 'Tunisia',
          tag: 'Northern',
          role: 'North African cohort',
          anchor: '4',
          keyRisk: 'Smaller cohort',
        },
        {
          name: 'DRC',
          tag: 'Southern',
          role: 'Mining — copper & cobalt',
          anchor: '4',
          keyRisk: 'Extractive concentration',
          dossier: [
            {
              label: 'Supply chain',
              text: 'Feeds directly into the global EV battery supply chain.',
            },
          ],
        },
      ],
    },
    { type: 'heading', text: 'Northern Africa: diversified and capital-markets ready', level: 2 },
    {
      type: 'paragraph',
      text: "Egypt's 33 billion-dollar companies span financial services (Commercial International Bank, EFG Hermes), real estate (Orascom), telecommunications (Vodafone Egypt), and construction. The Egyptian Exchange (EGX) is one of Africa's oldest and most liquid, making Egyptian corporates more accessible to foreign portfolio investors than peers in less-developed capital markets. Egypt's economic reform program since 2016 — including the float of the Egyptian pound, subsidy rationalization, and [[kw:imf-program]]IMF-backed structural adjustments[[/kw]] — has improved the operating environment for large corporates even as it imposed short-term pain on consumers.",
    },
    {
      type: 'paragraph',
      text: "Morocco's 20 billion-dollar companies reflect a different economic model: the country has positioned itself as a manufacturing and logistics hub serving both European and sub-Saharan African markets. OCP Group, the state-controlled phosphate producer, is the standout — Morocco controls roughly 70% of the world's [[kw:phosphate-reserves]]phosphate reserves[[/kw]], a critical input for fertilizers. Morocco's automotive sector has also scaled rapidly, with Renault and PSA operating assembly plants that export to Europe. The combination of proximity to the EU, stable governance, and strategic resource positions makes Morocco one of the most investable markets on the continent.",
    },
    { type: 'heading', text: 'Western Africa: Nigeria leads, but depth is shallow', level: 2 },
    {
      type: 'paragraph',
      text: "Nigeria's 23 billion-dollar companies are concentrated in oil and gas (Nigerian National Petroleum Corporation, Dangote Refinery), banking (Zenith Bank, GTBank, First Bank), telecommunications (MTN Nigeria), and cement (Dangote Cement). [[person:aliko-dangote]]Aliko Dangote[[/person]]'s conglomerate is the single most important corporate entity in West Africa — the Dangote Refinery, which began operations in early 2025, is the largest single-train refinery in the world and is designed to eliminate Nigeria's paradoxical dependence on imported refined petroleum despite being a major crude producer.",
    },
    {
      type: 'paragraph',
      text: "The rest of Western Africa is thinly represented: Ghana (2), Côte d'Ivoire (2), Senegal (3), Cameroon (2), and Togo, Liberia, Gabon, and Burkina Faso with 1 each. Most of these are either extractive (gold, cocoa, oil) or telecom operators (Orange, MTN subsidiaries). The gap between Nigeria and the rest of the region highlights a structural challenge: outside of Nigeria and, to a lesser extent, Ghana, West African economies lack the depth of domestic markets and capital infrastructure to grow companies to billion-dollar scale organically. Many of the region's largest employers are subsidiaries of foreign multinationals — 54 of the continent's $1B+ revenue companies have no local headquarters.",
    },
    { type: 'heading', text: 'Eastern Africa: the fastest-growing frontier', level: 2 },
    {
      type: 'paragraph',
      text: "Eastern Africa's 16 billion-dollar companies are distributed across Kenya (6), Ethiopia (4), Tanzania (1), Sudan (1), Madagascar (1), and Mauritius (3). Kenya is the region's corporate and financial hub — Safaricom (the company behind [[kw:m-pesa]]M-Pesa[[/kw]], the mobile money platform that processes more transactions annually than PayPal does in all of sub-Saharan Africa), Equity Group Holdings, and East African Breweries are among its marquee names. Nairobi's stock exchange is the gateway for portfolio investors targeting East Africa.",
    },
    {
      type: 'paragraph',
      text: "Ethiopia's four billion-dollar companies are largely state-owned — Ethiopian Airlines is the standout, operating the largest airline network in Africa and serving as a critical logistics hub connecting the continent to Asia and Europe. Ethiopia's economy has grown at roughly 8–10% annually over the past decade, but the Tigray conflict (2020–2022) and foreign exchange constraints have complicated the investment case. The government's plan to open the telecom sector and partially privatize state enterprises could unlock significant corporate value if executed.",
    },
    {
      type: 'callout',
      label: 'Mauritius punches above its weight',
      value: '3 companies',
      context:
        'With a population of just 1.3 million, Mauritius has 3 billion-dollar companies — giving it the highest density of $1B+ firms per capita on the continent. Its role as a financial hub and treaty network node explains the outsized presence.',
    },
    { type: 'heading', text: 'The 54 without a local headquarters', level: 2 },
    {
      type: 'paragraph',
      text: "Perhaps the most revealing number in the dataset is 54 — the count of companies generating over $1 billion in revenue from African operations but headquartered outside the continent. These are the Unilevers, Totals, Glencores, and Vodafones that operate as [[kw:profit-repatriation-leakage]]foreign direct investment[[/kw]] across multiple African markets but domicile their corporate entities — and book their profits — in London, Paris, Zurich, or The Hague. This dynamic has significant implications: it means a substantial share of Africa's corporate value creation is captured in foreign equity markets, not African ones.",
    },
    {
      type: 'paragraph',
      text: 'For investors, this creates a dual-access framework. You can gain exposure to African consumer growth and resource extraction either through locally listed companies (JSE, EGX, NSE) or through multinationals that derive significant revenue from African operations. The locally listed route offers purer exposure but lower liquidity and higher political risk. The multinational route is more liquid and familiar but dilutes African exposure with global operations.',
    },
    { type: 'heading', text: 'Sector composition: beyond extractives', level: 2 },
    {
      type: 'paragraph',
      text: "The common assumption that Africa's billion-dollar companies are primarily extractive — oil, gas, mining — is only partially correct. While extractives dominate in Angola, the DRC, Algeria, and much of Central Africa, the largest economies (South Africa, Egypt, Nigeria, Morocco, Kenya) have diversified corporate sectors. Financial services is the single largest sector by company count across the continent. Telecommunications is second — driven by the mobile revolution that [[kw:leapfrog-development]]leapfrogged fixed-line infrastructure[[/kw]] entirely. Consumer goods, construction, and agriculture round out the top five.",
    },
    {
      type: 'clearing-sankey',
      figureLabel: 'FIG. 2',
      kicker: 'THE 345 SPLIT BY SECTOR · RIBBON WIDTH ∝ COMPANIES',
      hint: 'Financial services and telecom together (117) outweigh extractives (68).',
      source: 'Estimates based on JSE, EGX, and NSE listed company profiles.',
      sourceGroups: [
        {
          label: 'Continental base',
          nodes: [{ id: 'base', name: "Africa's 345 $1B+ companies", display: '345' }],
        },
      ],
      destinations: [
        { id: 'fin', name: 'Financial Services' },
        { id: 'extr', name: 'Oil & Gas / Mining' },
        { id: 'tel', name: 'Telecom' },
        { id: 'con', name: 'Consumer / Retail' },
        { id: 'cre', name: 'Construction / RE' },
        { id: 'agr', name: 'Agriculture / Food' },
        { id: 'man', name: 'Manufacturing' },
        { id: 'trn', name: 'Transport / Logistics' },
        { id: 'oth', name: 'Other' },
      ],
      flows: [
        { from: 'base', to: 'fin', value: 72, tone: 'primary' },
        { from: 'base', to: 'extr', value: 68, tone: 'primary' },
        { from: 'base', to: 'tel', value: 45, tone: 'neutral' },
        { from: 'base', to: 'con', value: 38, tone: 'neutral' },
        { from: 'base', to: 'cre', value: 32, tone: 'neutral' },
        { from: 'base', to: 'agr', value: 28, tone: 'neutral' },
        { from: 'base', to: 'man', value: 22, tone: 'neutral' },
        { from: 'base', to: 'trn', value: 20, tone: 'neutral' },
        { from: 'base', to: 'oth', value: 20, tone: 'neutral' },
      ],
    },
    { type: 'heading', text: 'Investment implications: how to access the opportunity', level: 2 },
    {
      type: 'paragraph',
      text: "Investors seeking exposure to Africa's corporate growth have several routes. For broad-based exposure, the iShares MSCI South Africa ETF (EZA) and the VanEck Africa Index ETF (AFK) provide liquid access. For frontier markets beyond South Africa, the iShares MSCI Frontier and Select EM ETF (FM) includes Kenya, Nigeria, and Morocco. Individual ADRs and GDRs are available for some of the largest names: Naspers/Prosus (PROSY), MTN Group (MTNOY), Sasol (SSL), Gold Fields (GFI), and Harmony Gold (HMY) trade on US exchanges. In the UK, Airtel Africa (AAF.L) and British American Tobacco (BTI) provide indirect African exposure.",
    },
    {
      type: 'paragraph',
      text: 'The structural case for African corporate growth rests on three pillars: [[kw:demographic-dividend]]demographics (the youngest population of any continent, with 60% under age 25)[[/kw]], urbanization (the fastest rate globally, creating concentrated consumer markets), and digital infrastructure (mobile penetration and fintech adoption that are leapfrogging developed-market models). The risks are equally structural: political instability, currency volatility, [[kw:currency-controls]]capital controls[[/kw]], and governance gaps that make company-level due diligence essential. 345 billion-dollar companies is the starting point, not the ceiling — the question is how fast the next 345 emerge.',
    },
    {
      type: 'scenario-chain',
      figureLabel: 'FIG. 3',
      kicker: '345 IS A FLOOR, NOT A CEILING · TWO PATHS',
      hint: 'The closing thesis mapped — the structural pillars against the structural risks.',
      source: 'McKinsey Global Institute, Lions on the Move III, 2025.',
      scenarios: [
        {
          id: 'base',
          label: 'Compounding',
          tone: 'base',
          range: '2026 →',
          steps: [
            { label: 'Demographics', sub: 'youngest continent; 60% under 25' },
            { label: 'Urbanization', sub: 'fastest rate globally' },
            { label: 'Digital leapfrog', sub: 'mobile & fintech adoption' },
          ],
          result: { value: '+345', sub: 'the next cohort emerges' },
        },
        {
          id: 'bear',
          label: 'Stalled',
          tone: 'bear',
          range: '2026 →',
          steps: [
            { label: 'Political instability', sub: 'country-level governance gaps' },
            { label: 'Currency volatility', sub: 'and capital controls' },
            { label: 'Governance gaps', sub: 'company-level diligence essential' },
          ],
          result: { value: '345', sub: 'the landscape stays put' },
        },
      ],
    },
    {
      type: 'quote',
      text: 'Africa has more billion-dollar companies than most investors realize. The challenge is not finding them — it is accessing them through capital markets that are still developing.',
      source: 'McKinsey Global Institute, Lions on the Move III, 2025',
    },
    {
      type: 'paragraph',
      text: "For investors using Ezana, the Empire Rankings geopolitics layer surfaces country-level governance, resource, and economic metrics that contextualize these corporate numbers. The Global Market Analysis chain view tracks ISR-flagged events across African markets. And the community feed increasingly features African-market-focused contributors whose coverage of JSE, EGX, and NSE moves complements the platform's US-centric data infrastructure. The 345 is not a static number — it is a snapshot of a corporate landscape that is scaling faster than most global portfolios reflect.",
    },
  ],
  globeRail: {
    metric: {
      title: '$1B+ COMPANIES BY COUNTRY',
      data: [
        { x: 1, y: 147 },
        { x: 2, y: 33 },
        { x: 3, y: 23 },
        { x: 4, y: 20 },
        { x: 5, y: 6 },
      ],
      startLabel: 'South Africa · 147',
      endLabel: 'Kenya · 6',
      note: 'Companies with $1B+ revenue by HQ country (McKinsey Global Institute / African Development Bank).',
    },
    cities: [
      {
        name: 'Johannesburg',
        country: 'South Africa',
        lat: -26.2,
        lng: 28.05,
        impact:
          'South Africa alone accounts for 147 of the continent’s 345 billion-dollar companies — 43% of the total — on the back of JSE infrastructure dating to 1887 and global operators like Naspers, Sasol, FirstRand, and MTN Group.',
      },
      {
        name: 'Cairo',
        country: 'Egypt',
        lat: 30.04,
        lng: 31.24,
        impact:
          'Egypt’s 33 billion-dollar companies span financial services, real estate, telecom, and construction. The EGX is among Africa’s oldest and most liquid exchanges, and IMF-backed reforms since 2016 have improved the operating environment for large corporates.',
      },
      {
        name: 'Lagos',
        country: 'Nigeria',
        lat: 6.52,
        lng: 3.38,
        impact:
          'Nigeria’s 23 billion-dollar companies concentrate in oil and gas, banking, telecom, and cement. Aliko Dangote’s conglomerate is West Africa’s most important corporate entity — the Dangote Refinery, operational early 2025, is the world’s largest single-train refinery.',
      },
      {
        name: 'Nairobi',
        country: 'Kenya',
        lat: -1.29,
        lng: 36.82,
        impact:
          'Kenya is East Africa’s corporate and financial hub, home to Safaricom’s M-Pesa — which processes more transactions annually than PayPal does across sub-Saharan Africa — plus Equity Group and East African Breweries. Nairobi’s exchange is the regional gateway.',
      },
      {
        name: 'Casablanca',
        country: 'Morocco',
        lat: 33.57,
        lng: -7.59,
        impact:
          'Morocco’s 20 billion-dollar companies reflect a manufacturing-and-logistics-hub model serving Europe and sub-Saharan Africa. OCP Group anchors it — Morocco controls roughly 70% of the world’s phosphate reserves — alongside a rapidly scaled automotive export sector.',
      },
    ],
  },
  author: 'Ezana Finance Editorial',
  category: 'global-emerging',
  subcategory: 'Africa',
  tags: ['markets', 'emerging-markets', 'africa', 'companies'],
  meta: {
    sectors: ['Financials', 'Materials', 'Communication Services'],
    industries: ['Diversified Banks', 'Metals & Mining', 'Wireless Telecommunication Services'],
    institutions: ['MTN Group', 'Sasol', 'Gold Fields', 'Prosus'],
    geos: ['Africa', 'Nigeria', 'South Africa'],
    assetClasses: ['Equities'],
    themes: ['Emerging Markets', 'Corporate Scale'],
    datasets: [],
    markets: [],
  },
  tickers: ['EZA', 'AFK', 'FM', 'PROSY', 'MTNOY', 'SSL', 'GFI', 'HMY', 'BTI'],
  entities: {
    people: [
      {
        id: 'aliko-dangote',
        label: 'Aliko Dangote',
        role: 'Nigerian industrialist behind the Dangote conglomerate and refinery',
      },
    ],
    terms: [
      { id: 'frontier-markets', label: 'Frontier Market' },
      { id: 'jse', label: 'Johannesburg Stock Exchange (JSE)' },
      { id: 'extractive-industries', label: 'Extractive Industries' },
      { id: 'imf-program', label: 'IMF Program' },
      { id: 'phosphate-reserves', label: 'Phosphate Reserves' },
      { id: 'm-pesa', label: 'M-Pesa' },
      { id: 'profit-repatriation-leakage', label: 'Profit Repatriation Leakage' },
      { id: 'leapfrog-development', label: 'Leapfrog Development' },
      { id: 'demographic-dividend', label: 'Demographic Dividend' },
      { id: 'currency-controls', label: 'Capital Controls' },
    ],
  },
  readTime: 10,
  publishedAt: '2026-05-19',
  featured: false,
  likes: 0,
  comments: 0,
  reads: 0,
  listMeta: '19 May 2026',
};
