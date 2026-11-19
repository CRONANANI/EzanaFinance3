/**
 * Long-form Ezana Echo article: the nine deals on a widely shared "Biggest
 * M&A Deals of 2026" leaderboard, checked one by one against company
 * announcements, merger filings and the reporting that followed. Values are
 * restated on one basis (the headline value each deal was announced at,
 * enterprise value where debt is assumed), each deal's status is brought up
 * to November 19th, 2026, and the year is set against Mergermarket's
 * nine-month totals. Sources are numbered inline ([[src:N]]). Ezana arithmetic
 * (sums, shares, the $23.2B gap) is derived only from the figures cited here.
 * Not investment advice.
 */
export const biggestMaDeals2026 = {
  id: 'biggest-ma-deals-2026',
  title:
    'The Biggest M&A Deals of 2026, Checked: $852 Billion Across Nine Headlines, and Only Three Have Closed',
  excerpt:
    'Global M&A reached $4.44 trillion in the first nine months of 2026, its second-strongest start on record, and a viral leaderboard ranks nine deals at $875 billion. Checked against filings, the same nine total about $852 billion: three have closed, four are pending, and two were rejected outright.',
  heroImage: {
    // Original Ezana illustration drawn for this article (Nov 19th, 2026);
    // SVG source kept at docs/assets/echo/biggest-ma-deals-2026-hero.svg.
    // Column heights scale to the nine verified headline values.
    src: '/echo/biggest-ma-deals-2026-hero.webp',
    alt: 'Abstract illustration of nine glowing columns of different heights on a dark grid, the tallest on the left; three are solid, four are outlined and two are hatched.',
    caption:
      'Ezana illustration. Column heights scale to the nine deals’ verified headline values: solid columns have closed, outlined columns are pending, hatched columns were rejected bids. Status as of November 19th, 2026.',
  },
  category: 'markets',
  author: 'Ezana Finance Editorial',
  meta: {
    sectors: [
      'Information Technology',
      'Communication Services',
      'Utilities',
      'Industrials',
      'Consumer Staples',
      'Consumer Discretionary',
      'Financials',
    ],
    industries: [
      'Aerospace & Defense',
      'Application Software',
      'Semiconductors',
      'Communications Equipment',
      'Electric Utilities',
      'Independent Power Producers & Energy Traders',
      'Movies & Entertainment',
      'Packaged Foods & Meats',
      'Broadline Retail',
      'Asset Management & Custody Banks',
    ],
    institutions: [
      'SpaceX',
      'xAI',
      'Anysphere (Cursor)',
      'NextEra Energy',
      'Dominion Energy',
      'Marvell Technology',
      'Lumentum',
      'Paramount Skydance',
      'Warner Bros. Discovery',
      'Netflix',
      'Pershing Square Capital Management',
      'Universal Music Group',
      'Bolloré Group',
      'GameStop',
      'eBay',
      'TD Bank',
      'McCormick & Company',
      'Unilever',
      'Global Infrastructure Partners',
      'BlackRock',
      'EQT',
      'AES Corporation',
      'Google',
      'Mergermarket',
      'Bloomberg',
    ],
    government: [
      'US Department of Justice',
      'European Commission',
      'US District Court for the Northern District of California',
      'California Attorney General',
      'Federal Communications Commission',
    ],
    geos: ['United States', 'Netherlands', 'United Kingdom', 'European Union', 'France', 'Qatar'],
    assetClasses: ['Equities', 'Fixed Income', 'Private Markets'],
    themes: [
      'Mergers & Acquisitions',
      'Megadeals',
      'AI Infrastructure',
      'Power Demand',
      'Media Consolidation',
      'Antitrust',
      'Shareholder Activism',
      'Data Integrity',
    ],
    datasets: ['Mergermarket global M&A volumes', 'SEC merger filings (8-K, 425)'],
    markets: ['Nasdaq', 'New York Stock Exchange', 'Euronext Amsterdam'],
    investors: [
      'Pershing Square Capital Management',
      'Bill Ackman',
      'Global Infrastructure Partners',
      'EQT Infrastructure VI',
      'CalPERS',
      'Qatar Investment Authority',
      'Bolloré Group',
    ],
  },
  tickers: ['SPCX', 'NEE', 'D', 'MRVL', 'LITE', 'SKYD', 'MKC', 'UL', 'AES', 'EBAY'],
  entities: {
    people: [
      { id: 'elon-musk', label: 'Elon Musk', role: 'CEO, SpaceX' },
      { id: 'bill-ackman', label: 'Bill Ackman', role: 'Founder and CEO, Pershing Square' },
      { id: 'ryan-cohen', label: 'Ryan Cohen', role: 'CEO, GameStop' },
      { id: 'david-ellison', label: 'David Ellison', role: 'CEO, Skydance (formerly Paramount)' },
      { id: 'matt-murphy', label: 'Matt Murphy', role: 'Chairman and CEO, Marvell Technology' },
    ],
    terms: [
      { id: 'enterprise-vs-equity-value', label: 'Enterprise value vs equity value' },
      { id: 'regulatory-termination-fee', label: 'Regulatory termination fee' },
      { id: 'take-private', label: 'Take-private' },
    ],
  },
  readTime: 9,
  publishedAt: '2026-11-19',
  listMeta: 'Nov 19th, 2026',
  featured: false,
  likes: 0,
  comments: 0,
  reads: 0,
  status: 'published',
  globeRail: {
    metric: {
      title: 'NINE 2026 HEADLINE DEALS, CUMULATIVE VALUE ($B)',
      data: [
        { x: 0, y: 250 },
        { x: 1, y: 360 },
        { x: 2, y: 438.2 },
        { x: 3, y: 502.6 },
        { x: 4, y: 677.1 },
        { x: 5, y: 737.1 },
        { x: 6, y: 852.1 },
      ],
      startLabel: 'Feb 2026 · $250B',
      endLabel: 'Nov 2026 · $852B',
      note: 'Running total of the nine deals in this article by month of announcement, on the verified headline basis: February (xAI, WBD), March (AES, Unilever Foods), April (UMG), May (eBay, Dominion), June (Cursor), November (Lumentum). Ezana arithmetic.',
    },
    cities: [
      {
        name: 'Starbase',
        region: 'Texas',
        country: 'US',
        lat: 25.99,
        lng: -97.18,
        impact:
          'SpaceX was the year’s biggest buyer: $250 billion for xAI in February and $60 billion in stock for Cursor, closed August 14th. Together that is $310 billion, more than a third of the nine deals’ total.',
      },
      {
        name: 'Richmond',
        region: 'Virginia',
        country: 'US',
        lat: 37.54,
        lng: -77.44,
        impact:
          'Home of Dominion Energy, which NextEra agreed to buy in an all-stock deal worth about $119 billion including debt. Dominion serves the world’s largest cluster of data centers; shareholders approved on September 3rd.',
      },
      {
        name: 'Santa Clara',
        region: 'California',
        country: 'US',
        lat: 37.35,
        lng: -121.96,
        impact:
          'Marvell’s $115 billion all-stock deal for Lumentum, signed November 2nd, is the year’s largest by equity value and the newest of the nine. It is not expected to close until the first half of 2028.',
      },
      {
        name: 'Los Angeles',
        region: 'California',
        country: 'US',
        lat: 34.05,
        lng: -118.24,
        impact:
          'Paramount closed its $110 billion takeover of Warner Bros. Discovery on October 6th after settling with 12 states, and the combined company now trades as Skydance under the ticker SKYD.',
      },
      {
        name: 'Hilversum',
        region: 'North Holland',
        country: 'Netherlands',
        lat: 52.22,
        lng: 5.18,
        impact:
          'Universal Music Group’s board rejected Pershing Square’s roughly $64.4 billion proposal on May 29th, saying it undervalued the company. Its largest holder, the Bolloré Group, had urged the rejection.',
      },
      {
        name: 'London',
        region: 'England',
        country: 'UK',
        lat: 51.51,
        lng: -0.13,
        impact:
          'Unilever agreed to combine most of its food business with McCormick at a $44.8 billion enterprise value, taking $15.7 billion in cash as it narrows its focus to beauty and personal care.',
      },
    ],
  },
  contentBlocks: [
    {
      type: 'paragraph',
      text: 'Global M&A reached $4.44 trillion across 32,419 deals in the first nine months of 2026, up 27% on a year earlier and second only to the $4.55 trillion of 2021’s first nine months.[[src:1]]ION Analytics / Mergermarket, "Global M&A momentum slows in 3Q26 after record-chasing first half," October 1st, 2026 · https://ionanalytics.com/insights/mergermarket/global-ma-momentum-slows-in-3q26-after-record-chasing-first-half/[[/src]] A leaderboard of the year’s nine biggest deals, now circulating widely on social media, puts them at $875.3 billion combined. Ezana checked every row against company announcements and merger filings. On one consistent basis the nine come to about $852.1 billion, five of the nine values are overstated, and the ranking hides the most useful fact about them: only three have actually closed, four still need regulators, and two were never deals at all, because the target said no.',
    },
    {
      type: 'stat-grid',
      stats: [
        {
          label: 'Global M&A, first nine months of 2026',
          value: '$4.44T',
          change: '+27% year on year, Mergermarket',
        },
        {
          label: 'Share of volume in $10B+ megadeals',
          value: '35%',
          change: '$1.54T across 60 deals, a record',
        },
        {
          label: 'The nine headline deals, verified',
          value: '$852B',
          change: 'vs $875B on the viral leaderboard',
        },
        {
          label: 'Of that value, already closed',
          value: '$420B',
          change: 'xAI, Cursor and Warner Bros.',
        },
      ],
    },
    { type: 'heading', text: 'Nine headlines on one basis', level: 2 },
    {
      type: 'paragraph',
      text: 'The ranking itself survives the check. [[person:elon-musk]]Elon Musk[[/person]]’s SpaceX absorbed xAI in an all-stock merger in February that valued SpaceX at $1 trillion and xAI at $250 billion, with xAI holders receiving 0.1433 SpaceX shares for each xAI share.[[src:2]]NewsBytes, "Musk merges SpaceX and xAI, creating $1.25 trillion entity," February 3rd, 2026 · https://www.newsbytesapp.com/news/business/musk-merges-spacex-and-xai-creating-1-25-trillion-entity/story[[/src]] At $250 billion it is the largest acquisition on record, ahead of Vodafone’s $203 billion purchase of Mannesmann in 2000.[[src:3]]The Middle Market, "SpaceX acquires xAI in record-breaking $1.25T AI-space tie-up," February 3rd, 2026 · https://www.themiddlemarket.com/tag/rockets[[/src]] Three deals, xAI, Dominion and Lumentum, carry more than half of the nine’s combined value, which is the same concentration AlphaSense found across the year’s ten largest transactions.[[src:4]]AlphaSense, "Mergers and acquisitions 2026," 2026 · https://www.alpha-sense.com/resources/research-articles/mergers-and-acquisitions-2026/[[/src]]',
    },
    {
      type: 'dossier-bars',
      figureLabel: 'FIG. 1 · THE NINE, ON ONE BASIS',
      kicker:
        'HEADLINE VALUE OF EACH DEAL, $ BILLION · ENTERPRISE VALUE WHERE THE BUYER ASSUMES DEBT · CLICK DOSSIER FOR TERMS AND STATUS',
      hint: 'Bars share one scale; the dossier gives the equity value where it differs.',
      source:
        'Company announcements and SEC filings as reported by NewsBytes, S&P Global, Ashurst, Marvell and Lumentum, Reuters, TheWrap, Financier Worldwide, TechCrunch, Unilever and McCormick, and AES. Status as of November 19th, 2026.',
      headers: ['Deal', 'Structure and status', 'Headline value', 'Key risk'],
      rows: [
        {
          name: 'SpaceX ← xAI',
          tag: 'SPCX',
          role: 'All-stock merger · closed February 2026',
          anchor: '$250B',
          anchorValue: 250,
          keyRisk: 'Both sides were controlled by Elon Musk, so no outside party set the price.',
          dossier: [
            {
              label: 'Terms',
              text: 'xAI holders received 0.1433 SpaceX shares per xAI share; some xAI executives could take $75.46 per share in cash. The deal valued SpaceX at $1 trillion and xAI at $250 billion.',
            },
            {
              label: 'Basis',
              text: 'Implied valuation of xAI; neither company disclosed a transaction value.',
            },
          ],
        },
        {
          name: 'NextEra ← Dominion',
          tag: 'NEE',
          role: 'All-stock, 0.8138 NEE per D share plus $360M cash · pending',
          anchor: '≈$119B',
          anchorValue: 119,
          keyRisk: 'State utility commissions in Virginia and the Carolinas.',
          dossier: [
            {
              label: 'Basis',
              text: 'About $66.8 billion of equity; deal tallies that add Dominion’s debt put it at $118.5 billion to $119.5 billion. The combined company would carry an enterprise value of about $420 billion.',
            },
            {
              label: 'Status',
              text: 'Announced May 18th, 2026. Shareholders approved on September 3rd; closing targeted for the second half of 2027.',
            },
          ],
        },
        {
          name: 'Marvell ← Lumentum',
          tag: 'MRVL',
          role: 'All-stock, 4.5 MRVL per LITE share · pending',
          anchor: '$115B',
          anchorValue: 115,
          keyRisk: 'Antitrust review; a $3.2B regulatory termination fee if it fails.',
          dossier: [
            {
              label: 'Terms',
              text: 'About $1,132 per Lumentum share, a 23.9% premium to October 28th prices; about $102.5 billion of equity value. Marvell holders own about 67% of the combined company.',
            },
            {
              label: 'Status',
              text: 'Signed November 2nd, 2026; closing expected in the first half of 2028. Termination fees of $5.8 billion (Marvell) and $2.9 billion (Lumentum) apply in specified cases.',
            },
          ],
        },
        {
          name: 'Paramount ← Warner Bros. Discovery',
          tag: 'SKYD',
          role: '$31 per share in cash · closed October 6th',
          anchor: '$110B',
          anchorValue: 110,
          keyRisk: 'Leverage: the price includes about $29 billion of WBD debt.',
          dossier: [
            {
              label: 'Basis',
              text: 'About $81 billion of equity; about $110 billion including debt. Paramount also paid the $2.8 billion fee WBD owed Netflix.',
            },
            {
              label: 'Path',
              text: 'Signed February 27th. The Justice Department cleared it in June; 12 states sued on July 13th; a judge approved their settlement on September 30th. The company now trades as Skydance.',
            },
          ],
        },
        {
          name: 'Pershing Square → UMG',
          tag: 'UMG',
          role: 'Cash-and-stock proposal · rejected May 29th',
          anchor: '$64.4B',
          anchorValue: 64.4,
          keyRisk: 'Rejected. The Bolloré Group, UMG’s largest holder, opposed it.',
          dossier: [
            {
              label: 'Terms',
              text: 'About €55.8 billion, or €30.40 per share, mixing cash and shares in Pershing Square SPARC Holdings, with the merged company to list in New York.',
            },
            {
              label: 'Status',
              text: 'Proposed April 7th; rejected unanimously by UMG’s board on May 29th.',
            },
          ],
        },
        {
          name: 'SpaceX ← Cursor',
          tag: 'SPCX',
          role: 'All-stock · closed August 14th',
          anchor: '$60B',
          anchorValue: 60,
          keyRisk: 'Paid in SpaceX stock, so the real cost moves with SPCX.',
          dossier: [
            {
              label: 'Terms',
              text: 'Implied Cursor equity value of $60 billion, paid in about 389.3 million SpaceX Class A shares. SpaceX had held an April option to buy Cursor for $60 billion or pay $10 billion for a partnership.',
            },
            {
              label: 'Status',
              text: 'Signed June 16th, days after SpaceX’s June 12th IPO; closed August 14th.',
            },
          ],
        },
        {
          name: 'GameStop → eBay',
          tag: 'EBAY',
          role: '$125 per share, half cash and half stock · rejected May 12th',
          anchor: '$55.5B',
          anchorValue: 55.5,
          keyRisk: 'Financing: a $12 billion bidder with a $20 billion TD Bank commitment.',
          dossier: [
            {
              label: 'Status',
              text: 'eBay’s board called the unsolicited bid neither credible nor attractive, citing financing, leverage and governance.',
            },
          ],
        },
        {
          name: 'McCormick ← Unilever Foods',
          tag: 'MKC',
          role: '$15.7B cash plus $29.1B in shares · pending',
          anchor: '$44.8B',
          anchorValue: 44.8,
          keyRisk: 'Integration of Knorr and Hellmann’s, about 70% of the unit’s sales.',
          dossier: [
            {
              label: 'Terms',
              text: 'Enterprise value of $44.8 billion, about 13.8 times fiscal 2025 EBITDA. Unilever and its shareholders own about 65% of the combined company.',
            },
            { label: 'Status', text: 'Announced March 31st, 2026; closing expected by mid-2027.' },
          ],
        },
        {
          name: 'GIP and EQT ← AES',
          tag: 'AES',
          role: '$15 per share in cash, take-private · pending',
          anchor: '$33.4B',
          anchorValue: 33.4,
          keyRisk: 'State and foreign regulatory approvals for a utility owner.',
          dossier: [
            {
              label: 'Basis',
              text: 'Equity value of $10.7 billion; enterprise value of about $33.4 billion including assumed debt. The price was a 40.3% premium to the 30-day average.',
            },
            {
              label: 'Status',
              text: 'Announced March 2nd, 2026, with CalPERS and the Qatar Investment Authority as co-underwriters. Stockholders approved; closing expected in late 2026 or early 2027.',
            },
          ],
        },
      ],
    },
    {
      type: 'paragraph',
      text: 'Below the top three the list is more mixed than it looks. Two of the nine rows are proposals the target turned down, and one, Cursor, is a private startup bought in stock. On verified values, $119.9 billion of the nine is rejected bids and $732.2 billion is agreed deals, so about 14% of the leaderboard’s value sits in transactions that will not happen.',
    },
    {
      type: 'paragraph',
      text: 'SpaceX’s two deals bracket the event that made the second one cheap. Between xAI in February and Cursor in June, SpaceX completed the largest initial public offering on record, raising $75 billion at $135 a share and listing on Nasdaq as SPCX on June 12th.[[src:25]]Anadolu Agency, "SpaceX shares jump over 11% in Nasdaq debut after record $75B IPO," June 12th, 2026 · https://aa.com.tr/en/science-technology/spacex-shares-jump-over-11-in-nasdaq-debut-after-record-75b-ipo/3965457[[/src]] Four days later it agreed to pay for Cursor entirely in that stock. At the IPO valuation, the $60 billion price worked out to roughly 3.4% dilution for existing holders, which is why a startup that had been raising at a $50 billion valuation could be bought for $60 billion without a dollar of cash.[[src:26]]IPO Watch, "SpaceX’s $60 billion Cursor deal changes everything," June 2026 · https://ipowatch.beehiiv.com/p/spacex-s-60-billion-cursor-deal-changes-everything[[/src]]',
    },
    { type: 'heading', text: 'Where the viral numbers drift', level: 2 },
    {
      type: 'paragraph',
      text: 'Most of the gaps come from mixing two ways of pricing a company. [[kw:enterprise-vs-equity-value]]Equity value[[/kw]] is what the buyer pays shareholders; enterprise value adds the debt the buyer takes on. NextEra’s offer valued Dominion’s equity at about $66.8 billion, which is why Reuters-based tallies list it near $67 billion while others put it at about $119 billion.[[src:5]]Delmorgan & Co., "NextEra Energy and Dominion Energy to combine in a $67Bn all-stock merger," May 2026 · https://delmorganco.com/nextera-energy-and-dominion-energy-to-combine-in-a-67bn-all-stock-merger/[[/src]][[src:6]]Ashurst Perkins Coie, "Global M&A review: United States," 2026 · https://www.ashurstperkinscoie.com/en/insights/global-m-and-a-review/united-states/[[/src]] Both are correct; they answer different questions. The leaderboard uses the larger figure for Dominion, and on that basis Ezana keeps it.',
    },
    {
      type: 'revision-ledger',
      figureLabel: 'FIG. 2 · THE LEADERBOARD VS THE FILINGS',
      kicker:
        'EACH DEAL, $ BILLION · HOLLOW = VALUE ON THE VIRAL LEADERBOARD · FILLED = VALUE IN THE DEAL’S OWN ANNOUNCEMENT OR FILING · CLICK A ROW FOR WHAT WAS COUNTED',
      hint: 'Five of nine rows move, and every move is down.',
      source:
        'Leaderboard: social-media graphic "The Biggest M&A Deals of 2026," November 2026. Record: Marvell and Lumentum joint release, eBay and UMG board statements, AES and consortium release, S&P Global and Ashurst deal tallies. Ezana arithmetic.',
      scale: 'linear',
      unit: '$B',
      rows: [
        {
          label: 'SpaceX ← xAI',
          sub: 'implied xAI valuation',
          before: 250,
          after: 250,
          beforeDisplay: '$250B',
          afterDisplay: '$250B',
          delta: 0,
          deltaDisplay: '0',
          favorable: 'up',
          record: 'Matches. The deal valued xAI at $250 billion and SpaceX at $1 trillion.',
        },
        {
          label: 'NextEra ← Dominion',
          sub: 'enterprise value',
          before: 119.5,
          after: 119,
          beforeDisplay: '$119.5B',
          afterDisplay: '≈$119B',
          delta: -0.5,
          deltaDisplay: '-$0.5B',
          favorable: 'up',
          record:
            'Deal tallies that include Dominion’s debt range from $118.5 billion to $119.5 billion; the equity value announced on May 18th was about $66.8 billion.',
        },
        {
          label: 'Marvell ← Lumentum',
          sub: 'enterprise value',
          before: 119,
          after: 115,
          beforeDisplay: '$119B',
          afterDisplay: '$115B',
          delta: -4,
          deltaDisplay: '-$4B',
          favorable: 'up',
          record:
            'The companies’ joint release gives an implied enterprise value of $115 billion, about $1,132 per Lumentum share, and about $102.5 billion of equity value.',
        },
        {
          label: 'Paramount ← WBD',
          sub: 'including debt',
          before: 110,
          after: 110,
          beforeDisplay: '$110B',
          afterDisplay: '$110B',
          delta: 0,
          deltaDisplay: '0',
          favorable: 'up',
          record:
            'Matches on the debt-inclusive basis. The equity paid to WBD holders was about $81 billion.',
        },
        {
          label: 'Pershing Square → UMG',
          sub: 'rejected proposal',
          before: 64.9,
          after: 64.4,
          beforeDisplay: '$64.9B',
          afterDisplay: '$64.4B',
          delta: -0.5,
          deltaDisplay: '-$0.5B',
          favorable: 'up',
          record:
            'About €55.8 billion, reported as $64.3 billion to $65 billion depending on the exchange rate used; $64.4 billion is the most widely cited conversion.',
        },
        {
          label: 'SpaceX ← Cursor',
          sub: 'implied equity value',
          before: 60,
          after: 60,
          beforeDisplay: '$60B',
          afterDisplay: '$60B',
          delta: 0,
          deltaDisplay: '0',
          favorable: 'up',
          record: 'Matches the $60 billion implied equity value in SpaceX’s merger filing.',
        },
        {
          label: 'GameStop → eBay',
          sub: 'rejected proposal',
          before: 64.9,
          after: 55.5,
          beforeDisplay: '$64.9B',
          afterDisplay: '$55.5B',
          delta: -9.4,
          deltaDisplay: '-$9.4B',
          favorable: 'up',
          record:
            'eBay’s rejection and every major report value the bid at $55.5 billion to $56 billion ($125 per share). The leaderboard’s $64.9 billion repeats the UMG row’s figure.',
        },
        {
          label: 'McCormick ← Unilever Foods',
          sub: 'enterprise value',
          before: 44.8,
          after: 44.8,
          beforeDisplay: '$44.8B',
          afterDisplay: '$44.8B',
          delta: 0,
          deltaDisplay: '0',
          favorable: 'up',
          record: 'Matches: $15.7 billion in cash plus $29.1 billion in McCormick shares.',
        },
        {
          label: 'GIP and EQT ← AES',
          sub: 'enterprise value',
          before: 42.2,
          after: 33.4,
          beforeDisplay: '$42.2B',
          afterDisplay: '$33.4B',
          delta: -8.8,
          deltaDisplay: '-$8.8B',
          favorable: 'up',
          record:
            'The signed deal values AES at about $33.4 billion including debt ($10.7 billion of equity). Press reports before the announcement had floated $38 billion to $40 billion.',
        },
      ],
      verdict:
        'Every revision runs downward: the nine total $852.1B on the record against $875.3B on the leaderboard, a $23.2B gap.',
    },
    {
      type: 'paragraph',
      text: 'Two corrections do most of the work. GameStop’s bid for eBay was $125 per share, about $55.5 billion, and eBay rejected it on May 12th; the leaderboard’s $64.9 billion is the same number it gives Pershing Square’s bid for UMG, which suggests a copied cell.[[src:7]]CBS News, "EBay rejects GameStop’s $55.5 billion takeover bid," May 12th, 2026 · https://www.cbsnews.com/news/ebay-rejects-gamestop-55-billion-offer-ryan-cohen/[[/src]] AES is the other: the signed deal values it at about $33.4 billion including debt, not $42.2 billion, a figure closer to the $38 billion to $40 billion that circulated before the deal was announced.[[src:8]]IREI, "AES stockholders approve acquisition by Global Infrastructure Partners and EQT-led consortium," June 29th, 2026 · https://irei.com/news/aes-stockholders-approve-acquisition-by-global-infrastructure-partners-and-eqt-led-consortium/[[/src]][[src:9]]Fintool, "BlackRock’s GIP and EQT team up for $40 billion AES takeover," February 3rd, 2026 · https://fintool.com/news/aes-blackrock-gip-eqt-acquisition[[/src]] Marvell’s own release puts Lumentum at $115 billion of enterprise value, not $119 billion.[[src:10]]Marvell and Lumentum joint announcement, via Benton Institute, November 2nd, 2026 · https://benton.org/node/361537[[/src]]',
    },
    {
      type: 'callout',
      label: 'Overstatement on the viral leaderboard',
      value: '$23.2B',
      context:
        'The sum of five downward corrections, led by eBay ($9.4B) and AES ($8.8B). No row on the leaderboard is understated.',
    },
    {
      type: 'paragraph',
      text: 'The basis question changes the ranking, not just the totals. On equity value, Bloomberg counts Marvell’s purchase of Lumentum, about $102.5 billion, as the largest deal of 2026 and the largest technology deal ever outside SpaceX and xAI.[[src:27]]The Next Web, citing Bloomberg, "Marvell to buy Nvidia-backed Lumentum in a $115bn all-stock deal," November 2026 · https://thenextweb.com/news/marvell-lumentum-acquisition-115bn-all-stock[[/src]] Ranked that way, Warner Bros. Discovery at about $81 billion would sit ahead of Dominion at $66.8 billion, and AES, at $10.7 billion of equity, would fall far down the list. A leaderboard can use either basis; the problem is a leaderboard that uses both without saying so.',
    },
    { type: 'heading', text: 'A year written in twelve dates', level: 2 },
    {
      type: 'paragraph',
      text: 'The nine deals did not arrive evenly. Seven of the nine were announced between February 2nd and May 18th, and the first quarter alone produced xAI, Warner Bros. Discovery, AES and Unilever Foods. That fits the data: Mergermarket reports a record-chasing first half followed by a marked third-quarter slowdown, and the only one of the nine signed after June was Marvell’s bid for Lumentum on November 2nd.[[src:11]]ION Analytics / Mergermarket, "Megadeals propel M&A toward nine-month record despite third-quarter slowdown," October 2026 · https://ionanalytics.com/insights/mergermarket/ma-highlights-9m26/[[/src]]',
    },
    {
      type: 'wall-timeline',
      figureLabel: 'FIG. 3 · 2026 IN TWELVE DEAL DATES',
      kicker:
        'SIGNINGS, REJECTIONS AND CLOSINGS FOR THE NINE DEALS, BY QUARTER · CLICK A PLAQUE FOR THE RECORD',
      hint: 'Nine of twelve dates fall in the first half.',
      source:
        'Company announcements and filings as reported by NewsBytes, TradingView, Simpson Thacher, Financier Worldwide, Nasdaq/RTTNews, CBS News, S&P Global, TechCrunch, Gigazine, AP and Light Reading.',
      startYear: 2026,
      endYear: 2027,
      windows: [
        {
          id: 'q1',
          label: 'Q1 · first-quarter rush',
          from: 2026,
          to: 2026.25,
          color: 'var(--echo-chart-blue)',
        },
        {
          id: 'q2',
          label: 'Q2 · bids and rejections',
          from: 2026.25,
          to: 2026.5,
          color: 'var(--echo-chart-orange)',
        },
        { id: 'q3', label: 'Q3 · slowdown', from: 2026.5, to: 2026.75, color: 'var(--text-muted)' },
        {
          id: 'q4',
          label: 'Q4 · closings',
          from: 2026.75,
          to: 2027,
          color: 'var(--echo-chart-green)',
        },
      ],
      plaques: [
        {
          year: 2026.088,
          lane: 0,
          label: 'Feb 2',
          title: 'SpaceX merges with xAI',
          detail:
            'All-stock merger valuing xAI at $250 billion and SpaceX at $1 trillion; completed in February.',
        },
        {
          year: 2026.16,
          lane: 1,
          label: 'Feb 27',
          title: 'Paramount signs for WBD',
          detail:
            '$31 per share in cash, about $110 billion with debt, after Netflix declined to raise its $27.75 offer.',
        },
        {
          year: 2026.167,
          lane: 2,
          label: 'Mar 2',
          title: 'GIP and EQT agree AES',
          detail:
            '$15 per share; $10.7 billion of equity and about $33.4 billion of enterprise value.',
        },
        {
          year: 2026.247,
          lane: 3,
          label: 'Mar 31',
          title: 'McCormick agrees Unilever Foods',
          detail:
            '$44.8 billion enterprise value: $15.7 billion cash and $29.1 billion of McCormick shares.',
        },
        {
          year: 2026.264,
          lane: 4,
          label: 'Apr 7',
          title: 'Pershing proposes UMG deal',
          detail: 'Unsolicited cash-and-stock proposal worth about €55.8 billion ($64.4 billion).',
        },
        {
          year: 2026.36,
          lane: 0,
          label: 'May 12',
          title: 'eBay rejects GameStop',
          detail:
            'The $55.5 billion bid, made in early May, called neither credible nor attractive.',
        },
        {
          year: 2026.375,
          lane: 1,
          label: 'May 18',
          title: 'NextEra agrees Dominion',
          detail: 'All-stock, 0.8138 NextEra shares per Dominion share plus $360 million in cash.',
        },
        {
          year: 2026.405,
          lane: 2,
          label: 'May 29',
          title: 'UMG rejects Pershing',
          detail: 'Board says the proposal fundamentally and materially undervalues UMG.',
        },
        {
          year: 2026.455,
          lane: 3,
          label: 'Jun 16',
          title: 'SpaceX signs for Cursor',
          detail: '$60 billion in stock, four days after SpaceX’s record $75 billion IPO.',
        },
        {
          year: 2026.619,
          lane: 0,
          label: 'Aug 14',
          title: 'Cursor deal closes',
          detail: 'Anysphere shares convert into about 389.3 million SpaceX Class A shares.',
        },
        {
          year: 2026.764,
          lane: 1,
          label: 'Oct 6',
          title: 'Paramount closes WBD',
          detail: 'Combined company renamed Skydance; WBD holders receive about $31.02 per share.',
        },
        {
          year: 2026.836,
          lane: 2,
          label: 'Nov 2',
          title: 'Marvell agrees Lumentum',
          detail:
            '$115 billion enterprise value, all stock; closing expected in the first half of 2028.',
        },
      ],
    },
    {
      type: 'paragraph',
      text: 'The calendar also shows how quickly a headline can go stale. The leaderboard still describes Paramount as set "to acquire" Warner Bros. Discovery, but the deal closed on October 6th, about seven months after signing, once a federal judge approved a settlement with 12 states that had sued to block it.[[src:12]]AP via ABC News, "Paramount completes its takeover of Warner Bros to become one Hollywood giant known as Skydance," October 6th, 2026 · https://abcnews.com/Entertainment/wireStory/paramount-completes-takeover-warner-bros-become-hollywood-giant-137031061[[/src]] Cursor moved faster: 59 days from signing on June 16th to closing on August 14th, helped by payment in freshly listed SpaceX stock.[[src:13]]AI Weekly, "SpaceX closes $60B Cursor deal, folds it into SpaceXAI unit," August 2026 · https://aiweekly.co/alerts/spacex-closes-60b-cursor-deal-folds-it-into-spacexai-unit[[/src]]',
    },
    {
      type: 'paragraph',
      text: 'Warner Bros. Discovery was also the one deal of the nine won in an auction. Netflix had agreed in December to buy only the studio and streaming business for $27.75 a share; Paramount answered with a hostile bid for the whole company, including the cable networks, and raised it to $31 in cash before Netflix walked away on February 26th.[[src:28]]NBC News, "Warner Bros. Discovery signs merger agreement with Paramount Skydance," February 27th, 2026 · https://www.nbcnews.com/business/media/warner-bros-discovery-signs-merger-agreement-paramount-skydance-rcna261035?rand=26684[[/src]] The contract added a ticking fee of $0.25 a share for each quarter the deal stayed open after September 30th, which put a price on every month of delay. It closed six days into the fourth quarter.',
    },
    { type: 'heading', text: 'Who bought what: AI, power and media', level: 2 },
    {
      type: 'paragraph',
      text: 'Sort the nine by what was bought and three themes cover almost everything. AI took $425 billion, about half the total: SpaceX’s $310 billion for xAI and Cursor, plus Marvell’s $115 billion for Lumentum’s lasers and optical parts, which [[person:matt-murphy]]Matt Murphy[[/person]] pitches as a bet that AI data centers will shift from copper to light. Marvell says the combination addresses a $550 billion market and expects more than $1 billion a year in cost savings.[[src:14]]NAND Research, "Marvell to acquire Lumentum," November 2026 · https://nand-research.com/?p=6084[[/src]] The deal also gives Google the right to buy a $12.2 billion equity stake.[[src:15]]PYMNTS, citing Reuters, "Marvell to buy Lumentum for $115 billion in major AI infrastructure bet," November 2026 · https://www.pymnts.com/cpi-posts/marvell-to-buy-lumentum-for-115-billion-in-major-ai-infrastructure-bet/[[/src]]',
    },
    {
      type: 'paragraph',
      text: 'Power is the second theme, at $152.4 billion, and it is AI by another route. NextEra wants Dominion because Virginia hosts the world’s largest concentration of data centers, and the merged utility would carry an enterprise value of about $420 billion, behind only ExxonMobil and Chevron among US energy companies.[[src:16]]PYMNTS, "NextEra, Dominion strike $66.8 billion mega-merger to power AI boom," May 19th, 2026 · https://www.pymnts.com/cpi-posts/nextera-dominion-strike-66-8-billion-mega-merger-to-power-ai-boom/[[/src]] The AES buyers make the same argument from the private side: BlackRock’s Global Infrastructure Partners and EQT are paying a 40.3% premium in an all-equity [[kw:take-private]]take-private[[/kw]], betting that electricity demand keeps rising.[[src:17]]Energy Monitor, "GIP and EQT-led consortium agree to acquire AES for $33.4bn," March 2026 · https://www.energymonitor.ai/?p=155776[[/src]]',
    },
    {
      type: 'clearing-sankey',
      figureLabel: 'FIG. 4 · WHERE $852 BILLION WENT',
      kicker:
        'BUYER TO WHAT WAS BOUGHT, $ BILLION · RIBBON WIDTH ∝ HEADLINE VALUE · RED RIBBONS = BIDS THE TARGET REJECTED · CLICK A RIBBON FOR THE DEAL',
      hint: 'AI and AI connectivity take $425B, half the total.',
      source:
        'Verified headline values from Fig. 2. Sector grouping by Ezana. Status as of November 19th, 2026.',
      sourceGroups: [
        {
          label: 'Strategic buyers',
          nodes: [
            { id: 'spacex', name: 'SpaceX', display: '$310B' },
            { id: 'nextera', name: 'NextEra Energy', display: '$119B' },
            { id: 'marvell', name: 'Marvell', display: '$115B' },
            { id: 'paramount', name: 'Paramount', display: '$110B' },
            { id: 'mccormick', name: 'McCormick', display: '$44.8B' },
          ],
        },
        {
          label: 'Infrastructure funds',
          nodes: [{ id: 'gipeqt', name: 'GIP and EQT', display: '$33.4B' }],
        },
        {
          label: 'Rejected bidders',
          nodes: [
            { id: 'pershing', name: 'Pershing Square', display: '$64.4B' },
            { id: 'gamestop', name: 'GameStop', display: '$55.5B' },
          ],
        },
      ],
      destinations: [
        { id: 'ai', name: 'AI models and software', sub: 'xAI, Cursor' },
        { id: 'optics', name: 'AI connectivity', sub: 'Lumentum' },
        { id: 'power', name: 'Power and utilities', sub: 'Dominion, AES' },
        { id: 'media', name: 'Media and music', sub: 'WBD, UMG' },
        { id: 'commerce', name: 'Online marketplace', sub: 'eBay' },
        { id: 'food', name: 'Packaged food', sub: 'Unilever Foods' },
      ],
      flows: [
        {
          from: 'spacex',
          to: 'ai',
          value: 310,
          label: '$310B',
          tone: 'primary',
          record:
            'xAI ($250B, closed February) and Cursor ($60B, closed August 14th), both paid in SpaceX stock.',
        },
        {
          from: 'marvell',
          to: 'optics',
          value: 115,
          label: '$115B',
          tone: 'primary',
          record:
            'Lumentum, signed November 2nd; pending, with closing expected in the first half of 2028.',
        },
        {
          from: 'nextera',
          to: 'power',
          value: 119,
          label: '$119B',
          tone: 'primary',
          record:
            'Dominion Energy, about $119B including debt; pending, targeted for the second half of 2027.',
        },
        {
          from: 'gipeqt',
          to: 'power',
          value: 33.4,
          label: '$33.4B',
          tone: 'primary',
          record: 'AES take-private with CalPERS and the Qatar Investment Authority; pending.',
        },
        {
          from: 'paramount',
          to: 'media',
          value: 110,
          label: '$110B',
          tone: 'primary',
          record:
            'Warner Bros. Discovery, closed October 6th; the combined company trades as Skydance.',
        },
        {
          from: 'pershing',
          to: 'media',
          value: 64.4,
          label: '$64.4B',
          tone: 'dissolved',
          record: 'Universal Music Group proposal, rejected by UMG’s board on May 29th.',
        },
        {
          from: 'gamestop',
          to: 'commerce',
          value: 55.5,
          label: '$55.5B',
          tone: 'dissolved',
          record: 'eBay bid at $125 per share, rejected on May 12th.',
        },
        {
          from: 'mccormick',
          to: 'food',
          value: 44.8,
          label: '$44.8B',
          tone: 'neutral',
          record: 'Unilever Foods, led by Knorr and Hellmann’s; pending, expected by mid-2027.',
        },
      ],
    },
    {
      type: 'paragraph',
      text: 'Media is the third theme, and the most contested: $174.4 billion of bids, of which only Paramount’s $110 billion went through. [[person:david-ellison]]David Ellison[[/person]]’s company paid the $2.8 billion fee Warner Bros. owed Netflix and agreed to a $7 billion fee if regulators blocked the deal.[[src:18]]Financier Worldwide, "Paramount agrees $111bn WB mega deal as Netflix walks away," May 2026 · https://www.financierworldwide.com/paramount-agrees-111bn-wb-mega-deal-as-netflix-walks-away[[/src]] McCormick’s $44.8 billion deal for Unilever Foods is the only consumer staples entry, priced at about 13.8 times fiscal 2025 EBITDA and expected to create a company with about $20 billion of revenue.[[src:19]]Food Digital, "Unilever sells foods division to McCormick for US$44.8bn," April 2026 · https://fooddigital.com/news/unilever-sells-foods-division-to-mccormick-for-us-44-8bn[[/src]]',
    },
    {
      type: 'paragraph',
      text: 'The Unilever deal is a sale dressed as a merger. McCormick buys the business, but Unilever shareholders end up owning 55.1% of the combined company and Unilever itself keeps 9.9%, which it plans to sell down, against 35% for McCormick’s existing holders.[[src:29]]Quartz via Yahoo Finance, "McCormick buying Unilever food business in $45 billion deal," March 31st, 2026 · https://finance.yahoo.com/markets/stocks/articles/mccormick-buying-unilever-food-business-133831583.html[[/src]] Unilever also takes $15.7 billion in cash, funded with McCormick’s cash and new debt, and leaves food behind to concentrate on beauty, personal care and wellbeing. McCormick is targeting about $600 million of annual cost savings within three years.',
    },
    {
      type: 'cta-callout',
      headline: 'Research all ten tickers in one place',
      body: 'Every ticker on this article, from SPCX and NEE to MKC and AES, has a live page in Ezana’s US Equities research with price, fundamentals, ownership and filings. Compare a buyer with its target, or see how Dominion and Lumentum have traded against their deal terms since signing.',
      ctaLabel: 'Open US Equities research',
      ctaHref: '/company-research',
      ctaAuthGate: false,
    },
    { type: 'heading', text: 'Megadeals carry the year', level: 2 },
    {
      type: 'paragraph',
      text: 'The nine are the tip of a market that has become top-heavy. Deals of $10 billion or more made up a record 35% of global volume in the first nine months of 2026, $1.54 trillion across just 60 transactions, while the total number of deals barely moved.[[src:11]]ION Analytics / Mergermarket, "M&A highlights 9M26," October 2026 · https://ionanalytics.com/insights/mergermarket/ma-highlights-9m26/[[/src]] North America accounted for 53% of the volume, $2.37 trillion across 10,230 deals, up 33% and its strongest nine months on record.[[src:1]]ION Analytics / Mergermarket, October 1st, 2026 · https://ionanalytics.com/insights/mergermarket/global-ma-momentum-slows-in-3q26-after-record-chasing-first-half/[[/src]] PwC, measuring deals above $5 billion, puts megadeals at nearly half of 2026’s value and the full year on track for about $4 trillion.[[src:20]]PwC, "Global M&A industry trends: 2026 mid-year outlook," June 23rd, 2026 · https://www.pwc.com/gx/en/services/deals/trends.html[[/src]]',
    },
    {
      type: 'donut',
      figureLabel: 'FIG. 5 · 60 DEALS, 35% OF THE MONEY',
      kicker:
        'GLOBAL M&A VOLUME, FIRST NINE MONTHS OF 2026, $ TRILLION · HOVER A SLICE FOR ITS DEAL COUNT',
      hint: '60 megadeals carried more than a third of the value of 32,419 deals.',
      source:
        'ION Analytics / Mergermarket, 9M26 highlights, October 1st, 2026. The "all other deals" slice and count are Ezana arithmetic from the published totals.',
      unit: ' trillion',
      totalLabel: '9M 2026, $',
      slices: [
        {
          label: 'Megadeals, $10B or more',
          value: 1.54,
          color: 'var(--echo-chart-blue)',
          detail: '60 deals',
        },
        {
          label: 'All other deals',
          value: 2.9,
          color: 'var(--text-muted)',
          detail: '32,359 deals',
        },
      ],
    },
    {
      type: 'paragraph',
      text: 'Scale also produced the year’s strangest bids. [[person:ryan-cohen]]Ryan Cohen[[/person]]’s GameStop, worth about $12 billion, offered $55.5 billion for eBay, a company nearly four times its size, backed by a $20 billion debt commitment from TD Bank.[[src:21]]Al Jazeera, "EBay rejects GameStop’s $56bn bid as ‘neither credible nor attractive’," May 12th, 2026 · https://www.aljazeera.com/amp/economy/2026/5/12/ebay-rejects-gamestops-56bn-bid-as-neither-credible-nor-attractive[[/src]] [[person:bill-ackman]]Bill Ackman[[/person]]’s Pershing Square proposed folding Universal Music into a New York-listed vehicle at about €55.8 billion; UMG’s board rejected it on May 29th after the Bolloré Group, its largest holder with about 18%, urged a no.[[src:22]]BBC via MyJoyOnline, "Universal Music Group rejects billionaire Bill Ackman’s takeover bid," May 29th, 2026 · https://www.myjoyonline.com/universal-music-group-rejects-billionaire-bill-ackmans-takeover-bid/[[/src]]',
    },
    {
      type: 'quote',
      text: 'Neither credible nor attractive.',
      source: 'eBay chairman Paul Pressler, letter to GameStop CEO Ryan Cohen, May 12th, 2026',
    },
    {
      type: 'paragraph',
      text: 'The market had priced the eBay bid as unlikely before the board spoke. eBay traded at about $107 before the open on the day of the rejection, well below GameStop’s $125 offer, and GameStop’s own shares fell 4%.[[src:30]]Reuters via The Star, "EBay rejects GameStop’s $56 billion bid as ‘neither credible nor attractive’," May 12th, 2026 · https://www.thestar.com.my/tech/tech-news/2026/05/12/ebay-rejects-gamestop039s-audacious-56-billion-takeover-bid[[/src]] Cohen, who had built a stake of about 5% in eBay, said he might take the offer directly to shareholders, but any hostile route still ran into the same financing gap that eBay cited.',
    },
    { type: 'heading', text: 'Closed, pending, rejected', level: 2 },
    {
      type: 'paragraph',
      text: 'Weighted by value, the nine split three ways. $420 billion has closed: xAI, Cursor and Warner Bros. Discovery, all three bought by companies with a single controlling founder or family. $312.2 billion is signed but waiting on regulators, shareholders or both. The remaining $119.9 billion was rejected and has no path to completion unless a bidder returns with a better offer. The leaderboard reports all three groups the same way.',
    },
    {
      type: 'sentiment-bar',
      figureLabel: 'FIG. 6 · WHAT IS ACTUALLY DONE',
      kicker:
        'THE NINE DEALS BY STATUS ON NOVEMBER 19TH, 2026, $ BILLION OF VERIFIED HEADLINE VALUE',
      hint: 'Half of the value has closed; a seventh was rejected.',
      source:
        'Status from company announcements and filings; values from Fig. 2. Ezana arithmetic.',
      title: 'Status of the nine, by value',
      overall: { label: '49% closed by value', tone: 'pos' },
      unit: 'B',
      parts: [
        { label: 'Closed (xAI, Cursor, WBD)', value: 420, tone: 'pos' },
        { label: 'Pending (Dominion, Lumentum, Unilever Foods, AES)', value: 312.2, tone: 'neu' },
        { label: 'Rejected (UMG, eBay)', value: 119.9, tone: 'neg' },
      ],
    },
    { type: 'heading', text: 'Verdict: $312 billion still has to clear', level: 2 },
    {
      type: 'paragraph',
      text: 'The four pending deals sit at very different points. AES stockholders have voted, and the take-private is expected to close in late 2026 or early 2027. NextEra and Dominion shareholders approved on September 3rd, leaving state utility commissions before a targeted close in the second half of 2027.[[src:23]]DealRoom, "Recent M&A deals," October 14th, 2026 · https://dealroom.net/blog/recent-m-a-deals[[/src]] McCormick expects to close by mid-2027.[[src:24]]Pulse 2.0, "McCormick & Company: $44.8 billion combination with Unilever Foods business," April 2026 · https://pulse2.com/mccormick-company-44-8-billion-combination-with-unilever-foods-business-to-create-global-flavor-leader[[/src]] Marvell and Lumentum have the longest road, into the first half of 2028, with a [[kw:regulatory-termination-fee]]regulatory termination fee[[/kw]] of $3.2 billion that Marvell pays if approvals fail.[[src:14]]NAND Research, deal terms, November 2026 · https://nand-research.com/?p=6084[[/src]]',
    },
    {
      type: 'stage-boards',
      figureLabel: 'FIG. 7 · FOUR DEALS, FOUR CLOCKS',
      kicker:
        'THE PENDING DEALS BY APPROVAL STAGE · FILLED CELL = CURRENT STAGE AS OF NOVEMBER 19TH, 2026 · CLICK A STAGE FOR ITS RECORD',
      hint: 'Click any stage for what has happened and what is next.',
      source:
        'Company announcements, proxy results and closing guidance as reported by IREI, DealRoom, Pulse 2.0, Light Reading and NAND Research. Expected dates are company guidance, not forecasts.',
      boards: [
        {
          id: 'aes',
          title: 'GIP and EQT ← AES',
          color: 'var(--echo-chart-green)',
          currentIndex: 2,
          stages: [
            {
              label: 'Signed',
              sub: 'Mar 2nd',
              note: '$15 per share in cash; $33.4 billion enterprise value.',
            },
            {
              label: 'Holders vote',
              sub: 'approved',
              note: 'AES stockholders approved the deal, as reported on June 29th, 2026.',
            },
            {
              label: 'Regulators',
              sub: 'in review',
              note: 'US and foreign approvals remain; AES utilities in Indiana and Ohio stay under local regulation.',
            },
            {
              label: 'Closed',
              sub: 'target late 2026 or early 2027',
              note: 'Not yet closed as of November 19th, 2026.',
            },
          ],
          stats: [
            { value: '$33.4B', label: 'enterprise value', source: 'AES' },
            { value: '40.3%', label: 'premium to 30-day average', source: 'AES' },
          ],
          summary: 'The closest of the four to the finish line.',
        },
        {
          id: 'nee',
          title: 'NextEra ← Dominion',
          color: 'var(--echo-chart-blue)',
          currentIndex: 2,
          stages: [
            {
              label: 'Signed',
              sub: 'May 18th',
              note: 'All-stock: 0.8138 NextEra shares per Dominion share plus $360 million in cash.',
            },
            {
              label: 'Holders vote',
              sub: 'Sep 3rd',
              note: 'Shareholders approved on September 3rd, 2026.',
            },
            {
              label: 'Regulators',
              sub: 'in review',
              note: 'State utility approvals in Virginia and the Carolinas, plus federal review.',
            },
            {
              label: 'Closed',
              sub: 'target H2 2027',
              note: 'Guided at 12 to 18 months from announcement.',
            },
          ],
          stats: [
            { value: '≈$119B', label: 'including debt', source: 'DEAL TALLIES' },
            { value: '$66.8B', label: 'equity value', source: 'COMPANIES' },
          ],
          summary: 'Votes done; the slow part is state regulators.',
        },
        {
          id: 'mkc',
          title: 'McCormick ← Unilever Foods',
          color: 'var(--echo-chart-purple)',
          currentIndex: 0,
          stages: [
            {
              label: 'Signed',
              sub: 'Mar 31st',
              note: '$15.7 billion in cash plus $29.1 billion in McCormick shares.',
            },
            {
              label: 'Holders vote',
              sub: 'pending',
              note: 'Shareholder approval is a stated condition; Ezana found no reported result by November 19th.',
            },
            {
              label: 'Regulators',
              sub: 'pending',
              note: 'Regulatory approvals are a stated condition of closing.',
            },
            {
              label: 'Closed',
              sub: 'target mid-2027',
              note: 'Expected by mid-2027, per the announcement.',
            },
          ],
          stats: [
            { value: '$44.8B', label: 'enterprise value', source: 'COMPANIES' },
            { value: '≈65%', label: 'owned by Unilever side', source: 'COMPANIES' },
          ],
          summary: 'Signed, with approvals still to come.',
        },
        {
          id: 'mrvl',
          title: 'Marvell ← Lumentum',
          color: 'var(--echo-chart-orange)',
          currentIndex: 0,
          stages: [
            {
              label: 'Signed',
              sub: 'Nov 2nd',
              note: '4.5 Marvell shares per Lumentum share; $115 billion enterprise value.',
            },
            {
              label: 'Holders vote',
              sub: 'pending',
              note: 'Both companies’ shareholders must approve.',
            },
            {
              label: 'Regulators',
              sub: 'pending',
              note: 'Antitrust review; a $3.2 billion regulatory termination fee applies if it fails.',
            },
            { label: 'Closed', sub: 'target H1 2028', note: 'Expected in the first half of 2028.' },
          ],
          stats: [
            { value: '$115B', label: 'enterprise value', source: 'COMPANIES' },
            { value: '$3.2B', label: 'regulatory break fee', source: 'NAND RESEARCH' },
          ],
          summary: 'The newest and largest pending deal, with the longest road.',
        },
      ],
    },
    {
      type: 'paragraph',
      text: 'The base case is that AES closes first and NextEra-Dominion follows on schedule, which would lift the closed share of the nine from $420 billion to $572.4 billion, about 67%, by the end of 2027. The measurable test is Marvell: if the pair has not cleared antitrust review by June 30th, 2028, or Marvell pays the $3.2 billion fee, the year’s largest deal by equity value will have been a headline rather than a transaction, and the closed share of 2026’s top nine will stall below 80%.',
    },
    {
      type: 'paragraph',
      text: 'Each pending deal also carries a price for approval that never appears on a leaderboard. NextEra and Dominion have committed $2.25 billion of customer bill credits over two years, effectively a payment for state consent.[[src:5]]Delmorgan & Co., deal terms, May 2026 · https://delmorganco.com/nextera-energy-and-dominion-energy-to-combine-in-a-67bn-all-stock-merger/[[/src]] Marvell owes $3.2 billion if regulators block Lumentum, and Paramount had agreed to $7 billion before it won its approvals. Those numbers are the cleanest available read on how much risk each buyer thought it was taking, and they are worth tracking alongside the spread between each target’s share price and its offer.',
    },
    {
      type: 'paragraph',
      text: 'For investors the useful reading of the leaderboard is narrower than the graphic suggests. Pending deals trade on the gap between the target’s price and the offer, so Dominion (D), Lumentum (LITE) and AES carry deal risk that Skydance (SKYD) and SpaceX (SPCX) no longer do. The rejected bids leave eBay (EBAY) and UMG trading on their own plans after offers of $125 per share and €30.40 per share. Before relying on any deal value, check three things: whether it is equity or enterprise value, whether the target agreed, and whether the deal has closed.',
    },
    {
      type: 'cta-callout',
      headline: 'Ask Sonar where any deal stands today',
      body: 'Ezana Sonar answers deal questions with sources: the terms, the vote, the regulators still to clear and how the target trades against the offer. Ask about Dominion, Lumentum, AES or Unilever Foods and get the record, not a screenshot.',
      ctaLabel: 'Open Ezana Sonar',
      ctaHref: '/sonar',
      ctaAuthGate: false,
    },
  ],
};

export default biggestMaDeals2026;
