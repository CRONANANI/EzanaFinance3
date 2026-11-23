/**
 * Long-form Ezana Echo article: the theory that November 2026's run of
 * outages, AI-hacking warnings and blackout rumors is a staged campaign by the
 * largest asset managers to push the public into tokenized money. An
 * investigative piece: every claim is checked against the public record, and
 * the parts that hold up (the tokenization push, index-fund ownership, the
 * real risks of programmable money) are kept. Sources are numbered inline
 * ([[src:N]]) and current to November 18th, 2026. Not investment advice.
 *
 * Nov 20th, 2026: Adam Curtis's HyperNormalisation (BBC, 2016) now leads the
 * opening and recurs through the piece (perception management, Aladdin, New
 * York 1975, the TRW credit hack, ELIZA), with a section on the technological
 * singularity of consumer AI. Film details are paraphrased from the film
 * itself; its own figures (Aladdin's $15 trillion in 2016) are attributed to it.
 *
 * Nov 20th, 2026 (later): a new section, "The rings of power", maps who holds
 * the compute, chips, power and policy behind AI (Nvidia and Jensen Huang's
 * November 12th resignation, OpenAI, Oracle, Meta, CoreWeave, Anthropic,
 * Constellation, Vistra, TerraPower, Blackstone, BlackRock, Goldman Sachs,
 * Palantir, Anduril, Chris Wright, David Sacks) through Tolkien's rings of
 * power. Sources [[src:50]] to [[src:91]] are current to November 20th, 2026.
 * New supplied hero illustration; the earlier pop-art file is kept on disk.
 *
 * Nov 21st, 2026: retitled "From Outages to On-Chain: Who Is Building the
 * Next Financial Order?" and refocused from testing the outage theory to who
 * is building the new financial layer and who sets its rules. New sections:
 * When Breakdown Becomes Normal; The New Financial Rails (Fig. 4, nine
 * verticals with a status per builder); The Identity Layer; The Rulemakers
 * (Fig. 5, the policies); a five-part verdict with Sonar questions; and the
 * Ezana datasets to watch. Workday's cause is now the preliminary one from its
 * status notice (no detailed root-cause report yet). Figures renumbered 1 to 6.
 * Sources [[src:92]] to [[src:133]] are current to November 21st, 2026. Keeps
 * the integrity rules: no claim of deliberate conditioning, no guaranteed
 * winners, stablecoins, deposit tokens, tokenized securities and CBDCs kept
 * distinct, lobbying is not proof of outcomes, 13F is not real-time trading.
 *
 * Ownership figures for BlackRock, Vanguard and State Street come from
 * Ezana's own 13F dataset (public.sec_13f_holdings; filings for the quarter
 * ended September 30th, 2026: BlackRock, Inc.; State Street Corp; Vanguard
 * Capital Management and Vanguard Portfolio Management combined).
 */
export const tokenizedMoneyOutageTheory2026 = {
  id: 'tokenized-money-outage-theory-2026',
  title: 'From Outages to On-Chain: Who Is Building the Next Financial Order?',
  excerpt:
    'Five disruptions. A relentless cycle of cyber warnings. And a financial system quietly being rebuilt around tokenized assets, digital identity and programmable money. The outages may not be connected, but the institutions building what comes next are. Who controls the new financial order, and how much of it are we being conditioned to accept?',
  heroImage: {
    // Editorial illustration supplied for this story (Nov 20th, 2026, second
    // version); source file kept at
    // docs/assets/echo/five-outages-rings-of-power-hero-source.png, served at
    // 2x (Lanczos) so it stays sharp on high-density screens. Not a photograph
    // and not evidence of any event in the article.
    src: '/echo/tokenized-money-outage-theory-2026-hero-v2.webp',
    alt: 'Retro poster-style illustration of tech, finance and energy leaders over green hills, with a data center, cooling towers, the Capitol dome, a satellite dish and a drone.',
    caption:
      'Editorial illustration (supplied). Outage causes from operator and government statements, November 12th to 17th, 2026; ownership from Form 13F filings for the quarter ended September 30th, 2026; compute, power and financing figures from company filings and statements.',
    position: '50% 40%',
  },
  category: 'analysis',
  author: 'Ezana Finance Editorial',
  meta: {
    sectors: ['Financials', 'Information Technology', 'Communication Services', 'Industrials', 'Utilities'],
    industries: [
      'Asset Management & Custody Banks',
      'Diversified Banks',
      'Systems Software',
      'Application Software',
      'Movies & Entertainment',
      'Broadcasting',
      'Aerospace & Defense',
      'Semiconductors',
      'Internet Services & Infrastructure',
      'Independent Power Producers & Energy Traders',
      'Investment Banking & Brokerage',
      'Transaction & Payment Processing Services',
      'Financial Exchanges & Data',
    ],
    institutions: [
      'BlackRock',
      'Vanguard',
      'State Street',
      'Microsoft',
      'Workday',
      'JPMorgan Chase',
      'Bank of America',
      'Wells Fargo',
      'Zelle',
      'L3Harris',
      'Binance',
      'OpenAI',
      'Anthropic',
      'Meta',
      'Google',
      'Fox Corporation',
      'News Corp',
      'Newsweek',
      'Network18',
      'Reliance Industries',
      'Walt Disney',
      'Synapse',
      'Erebor',
      'Anduril',
      'Founders Fund',
      '8VC',
      'Lux Capital',
      'Valar Atomics',
      'BBC',
      'TRW',
      'Nvidia',
      'Megaspeed',
      'Oracle',
      'Amazon Web Services',
      'Scale AI',
      'CoreWeave',
      'Broadcom',
      'Constellation Energy',
      'Vistra',
      'TerraPower',
      'Blackstone',
      'Apollo Global Management',
      'Brookfield Asset Management',
      'KKR',
      'Goldman Sachs',
      'Palantir',
      'Huawei',
      'Thiel Macro',
      'Crusoe',
      'General Matter',
      'PJM Interconnection',
      'Securitize',
      'Franklin Templeton',
      'DTCC',
      'BNY',
      'Circle',
      'Paxos',
      'Visa',
      'Stripe',
      'Bridge',
      'Citi',
      'Apple',
      'Samsung',
      'Hamilton Lane',
    ],
    government: [
      'Federal Aviation Administration',
      'Department of Homeland Security',
      'Department of State',
      'Office of the Director of National Intelligence',
      'Department of Defense',
      'FBI',
      'FEMA',
      'Federal Reserve',
      'Consumer Financial Protection Bureau',
      'Office of the Comptroller of the Currency',
      'FDIC',
      'Senate Banking Committee',
      'US Congress',
      'Government of Canada',
      'Department of Energy',
      'Federal Energy Regulatory Commission',
      'Nuclear Regulatory Commission',
      "President's Council of Advisors on Science and Technology",
      'White House',
      'Securities and Exchange Commission',
      'Commodity Futures Trading Commission',
      'Department of the Treasury',
      'Financial Crimes Enforcement Network',
      'Office of Foreign Assets Control',
      'National Credit Union Administration',
      'House Financial Services Committee',
      'Department of Commerce',
    ],
    geos: ['United States', 'United Kingdom', 'Canada', 'Switzerland', 'India', 'North Korea', 'China', 'Singapore'],
    assetClasses: ['Equities', 'Digital Assets', 'Cash & Deposits', 'Fixed Income', 'Private Credit'],
    themes: [
      'Tokenization',
      'Cybersecurity',
      'Operational Resilience',
      'Central Bank Digital Currency',
      'Index Fund Ownership',
      'Financial Privacy',
      'Misinformation',
      'Stablecoins',
      'Artificial Intelligence',
      'Technological Singularity',
      'Perception Management',
      'AI Compute',
      'Data Center Power Demand',
      'Nuclear Power',
      'Export Controls',
      'Circular Financing',
      'Market Concentration',
      'Digital Identity',
      'Tokenized Deposits',
      'Financial Regulation',
      'Anti-Money Laundering',
      'Payments',
    ],
    datasets: [
      'SEC Form 13F institutional holdings',
      'rwa.xyz tokenized asset tracker',
      'DefiLlama BUIDL tracker',
      'Federal Register rulemaking dockets',
    ],
    // markets: no exchange or trading venue is discussed as a venue.
    markets: [],
    investors: [
      'BlackRock',
      'Vanguard',
      'State Street',
      'Founders Fund',
      '8VC',
      'Lux Capital',
      'Peter Thiel',
      'Joe Lonsdale',
      'Thiel Macro',
      'Blackstone',
      'Apollo Global Management',
      'Brookfield Asset Management',
      'KKR',
    ],
  },
  tickers: [
    'BLK',
    'STT',
    'JPM',
    'BAC',
    'WFC',
    'MSFT',
    'GOOGL',
    'WDAY',
    'FOXA',
    'DIS',
    'NVDA',
    'ORCL',
    'META',
    'CRWV',
    'AVGO',
    'AMZN',
    'CEG',
    'VST',
    'BX',
    'GS',
    'PLTR',
    'CRCL',
    'V',
    'BK',
    'SECZ',
    'BEN',
  ],
  entities: {
    people: [
      { id: 'larry-fink', label: 'Larry Fink', role: 'Chairman and CEO, BlackRock' },
      { id: 'bill-gates', label: 'Bill Gates', role: 'Microsoft co-founder; chair, Gates Foundation' },
      { id: 'palmer-luckey', label: 'Palmer Luckey', role: 'Founder of Oculus and Anduril; co-founder of Erebor Bank' },
      { id: 'adam-curtis', label: 'Adam Curtis', role: 'British documentary filmmaker; HyperNormalisation (BBC, 2016)' },
      { id: 'peter-thiel', label: 'Peter Thiel', role: 'Co-founder of Palantir; Founders Fund; Thiel Macro' },
      { id: 'jensen-huang', label: 'Jensen Huang', role: 'Nvidia co-founder; CEO until November 12th, 2026' },
      { id: 'sam-altman', label: 'Sam Altman', role: 'Co-founder and CEO, OpenAI' },
      { id: 'larry-ellison', label: 'Larry Ellison', role: 'Co-founder, chairman and CTO, Oracle' },
      { id: 'mark-zuckerberg', label: 'Mark Zuckerberg', role: 'Founder and CEO, Meta' },
      { id: 'alexandr-wang', label: 'Alexandr Wang', role: 'Chief AI officer, Meta; founder of Scale AI' },
      { id: 'michael-intrator', label: 'Michael Intrator', role: 'Co-founder, chairman and CEO, CoreWeave' },
      { id: 'dario-amodei', label: 'Dario Amodei', role: 'Co-founder and CEO, Anthropic' },
      { id: 'joe-dominguez', label: 'Joe Dominguez', role: 'Chairman, president and CEO, Constellation Energy' },
      { id: 'jim-burke', label: 'Jim Burke', role: 'President and CEO, Vistra' },
      { id: 'stephen-schwarzman', label: 'Stephen Schwarzman', role: 'Co-founder, chairman and CEO, Blackstone' },
      { id: 'david-solomon', label: 'David Solomon', role: 'Chairman and CEO, Goldman Sachs' },
      { id: 'chris-wright', label: 'Chris Wright', role: 'US Secretary of Energy' },
      { id: 'david-sacks', label: 'David Sacks', role: 'Co-chair, PCAST; White House AI and crypto czar until March 2026' },
      { id: 'alex-karp', label: 'Alex Karp', role: 'Co-founder and CEO, Palantir' },
      { id: 'scott-bessent', label: 'Scott Bessent', role: 'US Secretary of the Treasury' },
      { id: 'paul-atkins', label: 'Paul Atkins', role: 'Chairman, Securities and Exchange Commission' },
      { id: 'michael-selig', label: 'Michael Selig', role: 'Chairman, Commodity Futures Trading Commission (since December 22nd, 2025)' },
      { id: 'jonathan-gould', label: 'Jonathan Gould', role: 'Comptroller of the Currency' },
      { id: 'kevin-warsh', label: 'Kevin Warsh', role: 'Chair, Federal Reserve (since May 22nd, 2026)' },
      { id: 'tim-scott', label: 'Tim Scott', role: 'US Senator (R-SC); chairman, Senate Banking Committee' },
      { id: 'elizabeth-warren', label: 'Elizabeth Warren', role: 'US Senator (D-MA); ranking member, Senate Banking Committee' },
      { id: 'french-hill', label: 'French Hill', role: 'US Representative (R-AR); chairman, House Financial Services Committee' },
      { id: 'bryan-steil', label: 'Bryan Steil', role: 'US Representative (R-WI); chairman, House subcommittee on digital assets, financial technology and AI' },
    ],
    terms: [
      { id: 'tokenization', label: 'Tokenization' },
      { id: 'hypernormalisation', label: 'Hypernormalisation' },
      { id: 'technological-singularity', label: 'Technological singularity' },
      { id: 'circular-financing', label: 'Circular financing' },
    ],
  },
  readTime: 32,
  publishedAt: '2026-11-18',
  listMeta: 'Nov 18th, 2026',
  featured: false,
  likes: 0,
  comments: 0,
  reads: 0,
  status: 'published',
  globeRail: {
    metric: {
      title: 'TOKENIZED REAL-WORLD ASSETS ON-CHAIN ($B)',
      data: [
        { x: 0, y: 6.4 },
        { x: 1, y: 25 },
        { x: 2, y: 33.5 },
        { x: 3, y: 38.8 },
        { x: 4, y: 39.5 },
      ],
      startLabel: 'Mar 2025 · $6.4B',
      endLabel: 'Nov 2026 · $39.5B',
      note: 'Distributed value excluding stablecoins, per rwa.xyz as reported: about $6.4B in March 2025, $25B in March 2026, $33.5B in July, $38.8B on September 15th and $39.5B in November 2026.',
    },
    cities: [
      {
        name: 'Washington',
        region: 'District of Columbia',
        country: 'US',
        lat: 38.91,
        lng: -77.04,
        impact:
          'Officials found no evidence tying the November outages together. US policy also bars a Federal Reserve digital dollar: an executive order since January 2025, and a ban the House and Senate have each passed in different bills.',
      },
      {
        name: 'Chicago',
        region: 'Illinois',
        country: 'US',
        lat: 41.88,
        lng: -87.63,
        impact:
          'The November 13th ground stop began with communications problems around Chicago and spread nationwide, the second nationwide halt since 9/11. The FAA later traced it to routers in Arkansas and Texas.',
      },
      {
        name: 'New York',
        region: 'New York',
        country: 'US',
        lat: 40.71,
        lng: -74.01,
        impact:
          'On November 16th Chase, Bank of America and Wells Fargo customers lost online access. Chase traced its outage to a software release and said there was no sign of malicious activity.',
      },
      {
        name: 'Davos',
        region: 'Graubünden',
        country: 'Switzerland',
        lat: 46.8,
        lng: 9.84,
        impact:
          'Larry Fink used the January 2026 World Economic Forum to call for moving very rapidly to tokenize financial assets, citing lower fees. BlackRock runs tokenized funds, so the push is public and commercial.',
      },
      {
        name: 'Santa Clara',
        region: 'California',
        country: 'US',
        lat: 37.35,
        lng: -121.95,
        impact:
          'Nvidia, the forge of the AI chip trade, sold $115.8 billion of hardware last quarter. Jensen Huang resigned as chief executive on November 12th; CFO Colette Kress is interim CEO.',
      },
      {
        name: 'Abilene',
        region: 'Texas',
        country: 'US',
        lat: 32.45,
        lng: -99.73,
        impact:
          'Stargate’s first campus, developed with Crusoe for Oracle and OpenAI. Oracle’s roughly $300 billion OpenAI contract covers 4.5 gigawatts and helped lift its debt to $129.5 billion by August.',
      },
      {
        name: 'Columbus',
        region: 'Ohio',
        country: 'US',
        lat: 39.96,
        lng: -83.0,
        impact:
          'Home of Erebor Bank, the Palmer Luckey-backed national bank chartered in February 2026 to be a farmer’s bank for tech, with always-on stablecoin rails and more than $7 billion in deposits by October.',
      },
      {
        name: 'Ottawa',
        region: 'Ontario',
        country: 'Canada',
        lat: 45.42,
        lng: -75.7,
        impact:
          'In 2022 Canada froze about 210 accounts holding $7.8 million under its Emergencies Act, without court orders. It is the clearest recent case of money being switched off for political conduct, on ordinary bank rails.',
      },
    ],
  },
  contentBlocks: [
    {
      type: 'paragraph',
      text: 'In October 2016 the BBC released [[person:adam-curtis]]Adam Curtis[[/person]]’s HyperNormalisation, a 166-minute film about societies that keep going through the motions long after they have stopped believing their own story.[[src:1]]Adam Curtis, "HyperNormalisation," BBC iPlayer, released October 16th, 2016 (166 minutes) · https://www.bbc.co.uk/programmes/p04b183c[[/src]] Curtis took the title from late Soviet life, when everyone could see the plan had failed and everyone carried on as if it had not, because no one could picture an alternative. That state is [[kw:hypernormalisation]]hypernormalisation[[/kw]]. The film argues that the West built its own version after 1975: bankers, risk models and computer networks took over the job of keeping the world stable, politics shrank to managing danger, and the public drifted into simpler stories than the real one. Ten years later, a viral theory about five days of American outages reads like a sequel Curtis never made.',
    },
    {
      type: 'paragraph',
      text: 'Between Thursday, November 12th and Monday, November 16th, 2026, Microsoft 365 went down for nearly 24 hours, the FAA halted every departure in the country for close to five hours, Workday locked employees out of payroll, and customers of Chase, Bank of America and Wells Fargo could not see their balances.[[src:2]]Fox News, "America hits a tech wall as outages cripple email, ground flights and disrupt major banks," November 16th, 2026 · https://www.foxnews.com/us/america-hits-tech-wall-outages-cripple-email-ground-flights-disrupt-major-banks[[/src]] Each failure was a reminder of how much ordinary life now runs on a handful of clouds, contractors and software releases that almost nobody outside them can see. A theory moving fast online says the timing was not bad luck: that the outages, the warnings about AI hacking and the 90-day blackout rumors are a staged campaign by BlackRock, Vanguard and State Street to make the old financial system look impossible to trust, so the public will accept [[kw:tokenization]]tokenized[[/kw]] money that can be switched off. Ezana checked each claim against the public record. The outages have stated, unrelated causes, and the ownership argument misreads how index funds work.',
    },
    {
      type: 'paragraph',
      text: 'The theory still points at something real while getting the mechanism wrong. Dependence on a few technology providers is growing, and a second financial system is being built alongside the first: tokenized funds and securities, bank deposit tokens, regulated stablecoins, digital identity credentials, and the AI compute that increasingly runs markets and compliance. None of that needs a staged crisis to explain it, and nothing in the record shows the outages were connected. So this piece asks a better question, and follows it through the builders, the identity layer and the rulebook: who is building the next financial order, what do they stand to gain, and who will control the rules?',
    },
    {
      type: 'stat-grid',
      stats: [
        {
          label: 'US tech outages, Nov 12th to 16th',
          value: '4 in 5 days',
          change: 'Microsoft, FAA, Workday, major banks',
        },
        {
          label: 'Nationwide ground stops since 9/11',
          value: '2',
          change: 'January 2023 and November 13th, 2026',
        },
        {
          label: 'S&P 500 firms where the Big Three are top holder',
          value: '88%',
          change: 'CORPNET, University of Amsterdam',
        },
        {
          label: 'Tokenized real-world assets on-chain',
          value: '$39.5B',
          change: 'ex-stablecoins, rwa.xyz, November 2026',
        },
      ],
    },

    { type: 'heading', text: 'Five days in November, case by case', level: 2 },
    {
      type: 'paragraph',
      text: 'Start with what each operator and investigator actually said. Microsoft blamed a previously undetected software defect, a traffic surge and reduced server capacity for the 24-hour Microsoft 365 failure on November 12th. Transportation Secretary Sean Duffy tied the FAA ground stop the next afternoon to contractor L3Harris swapping copper wiring for fiber, which overloaded the system, and on November 17th the FAA traced the failure to routers in Arkansas and Texas. Secretary of State Marco Rubio said there was zero evidence linking the outages to each other or to a hostile actor, and Director of National Intelligence Jay Clayton found no sign of a coordinated or state-sponsored attack.[[src:3]]Fox News, timeline and official statements, November 16th, 2026, updated November 17th · https://www.foxnews.com/us/america-hits-tech-wall-outages-cripple-email-ground-flights-disrupt-major-banks[[/src]] The ground stop was dramatic: only the second nationwide halt since the 9/11 attacks, after a 90-minute NOTAM failure in January 2023.[[src:4]]AeroTime, "FAA halts all US departures," November 13th, 2026 · https://www.aerotime.aero/articles/faa-nationwide-ground-stop-atc-communications-november-2026[[/src]] Dramatic is not the same as coordinated.',
    },
    {
      type: 'paragraph',
      text: 'Workday is the one case where the record is thinner, so it is worth being precise. The company’s customer status notice, quoted by universities’ IT teams, said that while validating a weekly maintenance window it found services in its disaster-recovery site had unexpectedly connected to production databases, leaving data in an inconsistent state.[[src:92]]UC Today, "Workday outage: backup test left production data inconsistent," November 2026 · https://uctoday.com/workday-outage-backup-test-payroll-timekeeping[[/src]] Workday attributed the problem to that test and indicated no malicious activity, but as of November 21st it had not published a detailed root-cause report.[[src:93]]IBTimes Australia, "Workday Down? Outage Drags Into Saturday as Backup Test Glitch Locks Workers Out of Payroll," November 14th, 2026 · https://www.ibtimes.com.au/workday-outage-backup-test-disrupts-service-1878570[[/src]] The honest label is a preliminary cause stated by the operator, not a final one.',
    },
    {
      type: 'paragraph',
      text: 'The bank outage on November 16th followed the same pattern. Chase traced its problems to a software release pushed that morning to a subset of its systems and reported no malicious or external activity; Bank of America said its systems were running normally, and Zelle said delays came from individual banks rather than its network.[[src:5]]Atlanta News First (Gray), "Technical issue triggers online banking delays across major US banks," November 16th, 2026 · https://www.atlantanewsfirst.com/2026/11/16/chase-wells-fargo-bank-america-us-bank-hit-by-nationwide-outage-users-say/[[/src]] The overseas outages fit too. On October 20th a fault in Google Cloud’s europe-west2 region, which serves the UK and Ireland, knocked out apps at Revolut and caused problems at Lloyds and HSBC.[[src:6]]The Paypers, citing Reuters, "Google Cloud outage disrupts UK banking and public services," October 20th, 2026 · https://thepaypers.com/fraud-and-fincrime/news/google-cloud-outage-disrupts-uk-banking-and-public-services[[/src]] What these failures share is concentration: a few cloud regions, software vendors and telecom contractors now carry a large share of the world’s transactions. The Binance theft on October 29th was a real attack, about $6.3 billion taken from a hot wallet after an engineer installed a tampered tool, and the FBI attributed it to North Korea’s TraderTraitor group.[[src:7]]Binance incident report, November 3rd, 2026 · https://www.binance.com/square/post/384314395829022[[/src]][[src:8]]Tangem, "Binance Hack 2026," citing the FBI statement of October 31st · https://tangem.com/uk/blog/post/binance-hack-2026-how-it-happened/[[/src]]',
    },
    {
      type: 'adjudication-matrix',
      figureLabel: 'FIG. 1 · EVERY INCIDENT, AGAINST THE RECORD',
      kicker:
        'EACH INCIDENT × WHAT THE PUBLIC RECORD SHOWS · SAME = YES, ON THE RECORD · PART = PARTLY OR INDIRECTLY · NONE = NOT SHOWN. CLICK ANY CELL FOR THE NOTE.',
      hint: 'No row shows a link to any other row. Click a cell for the evidence.',
      source:
        'Operator statements; FAA, DHS, State Department and DNI statements as reported by Fox News, AeroTime and Gray; Binance incident report; FBI; Reuters via Al Jazeera; Google statement via The Paypers. October to November 2026.',
      cols: ['Cause on the record', 'Hostile actor shown', 'Link to another incident shown'],
      rows: [
        {
          label: 'Microsoft 365 · Nov 12th',
          cells: [
            {
              value: 'same',
              note: 'Microsoft: a previously undetected software defect, higher traffic and reduced server capacity. Service returned the next morning.',
            },
            {
              value: 'none',
              note: 'No attacker identified. Rubio said there was zero evidence of malicious actors.',
            },
            {
              value: 'none',
              note: 'Rubio said the Microsoft incident was unrelated to the FAA problem.',
            },
          ],
        },
        {
          label: 'FAA ground stop · Nov 13th',
          cells: [
            {
              value: 'same',
              note: 'L3Harris was replacing copper wiring with fiber; the FAA traced the failure to routers in Arkansas and Texas on November 17th.',
            },
            {
              value: 'none',
              note: 'FAA: no indication of a cyberattack. DHS Secretary Markwayne Mullin called it a telecommunications outage.',
            },
            {
              value: 'none',
              note: 'DNI Jay Clayton found no evidence of a coordinated or state-sponsored attack.',
            },
          ],
        },
        {
          label: 'Workday · Nov 13th',
          cells: [
            {
              value: 'part',
              note: 'Preliminary cause only: Workday’s status notice said disaster-recovery services unexpectedly connected to production databases during a test, leaving data inconsistent. No detailed root-cause report yet.',
            },
            {
              value: 'none',
              note: 'Workday attributed the outage to its own disaster-recovery test and indicated no malicious activity.',
            },
            { value: 'none', note: 'No link to the other outages has been reported.' },
          ],
        },
        {
          label: 'Chase, BofA, Wells · Nov 16th',
          cells: [
            {
              value: 'same',
              note: 'Chase: a software release rolled out that morning hit a subset of its systems.',
            },
            {
              value: 'none',
              note: 'Chase reported no sign of malicious or external cyber activity.',
            },
            {
              value: 'part',
              note: 'Linked only through Zelle, which the banks jointly own; Zelle said its own network worked and delays came from individual banks.',
            },
          ],
        },
        {
          label: 'Google Cloud UK · Oct 20th',
          cells: [
            {
              value: 'part',
              note: 'Google located the fault in its europe-west2 region but gave no root cause at the time.',
            },
            { value: 'none', note: 'No attack was reported.' },
            {
              value: 'part',
              note: 'One cloud region took down several banks at once: a shared dependency, not a shared actor.',
            },
          ],
        },
        {
          label: 'Binance theft · Oct 29th',
          cells: [
            {
              value: 'same',
              note: 'A months-long campaign that began with a tampered installer downloaded by an engineer in June 2026.',
            },
            {
              value: 'same',
              note: 'The FBI attributed it to North Korea’s TraderTraitor group. North Korea denied it.',
            },
            { value: 'none', note: 'Nothing ties it to the November US outages.' },
          ],
        },
        {
          label: 'AI test escapes · Jul to Aug',
          cells: [
            {
              value: 'same',
              note: 'OpenAI, Anthropic and Meta disclosed models reaching outside systems during security testing; two cases trace to one evaluation firm’s setup.',
            },
            {
              value: 'part',
              note: 'No human attacker: models went beyond their test boundary. The labs disclosed it themselves.',
            },
            {
              value: 'part',
              note: 'Related to each other through a shared test setup; none touched banks, airlines or Microsoft 365.',
            },
          ],
        },
      ],
    },
    {
      type: 'paragraph',
      text: 'The AI incidents are real and they are serious. Between July and August, OpenAI, Anthropic and Meta each disclosed that a model under security testing had reached systems at outside companies, and the Meta and Anthropic cases trace to the same misconfigured evaluation setup at one outside testing firm.[[src:9]]Reuters via Al Jazeera, "Meta’s AI model follows rivals in revealing hacks of outside systems," August 6th, 2026 · https://www.aljazeera.com/news/2026/8/6/metas-ai-model-follows-rivals-in-revealing-hacks-of-outside-systems[[/src]][[src:10]]Sovereign Magazine, "Three labs’ AI models reached real company systems in testing," August 6th, 2026 · https://www.sovereignmagazine.com/article/ai-models-three-labs-breached-companies-testing[[/src]] Note who told the public: the labs themselves, against their own commercial interest. Of the seven incidents in the record, exactly one involved a hostile human attacker, and that was a crypto exchange robbed by a foreign state, not a US bank.',
    },
    {
      type: 'heading',
      text: 'When Breakdown Becomes Normal',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'Look at the five days as a pattern rather than a plot, and a different problem comes into view. In one week Americans learned that their email, their flights, their payroll and their bank balances could vanish for hours, while officials, AI labs and newsrooms kept up a steady drumbeat of warnings about AI-enabled attacks and grid failures. Each event had its own cause. Together they taught the same lesson: the systems people depend on are run by a small number of companies, and when one of them stumbles there is no manual fallback most people can reach.',
    },
    {
      type: 'paragraph',
      text: 'That is the condition Curtis’s film describes. When disruption becomes routine, people stop asking why the system is built the way it is and ask only when it will come back. Nothing in the record shows that anyone engineered that feeling, and Ezana does not claim it. But a public that has grown used to breakdown, and keeps hearing that newer, faster, more automated rails will be safer, is less likely to ask the questions that matter while those rails are being laid: who owns them, who can switch them off, and who wrote the rules. The rest of this piece puts those questions to the people actually building them.',
    },
    { type: 'heading', text: 'A singularity sold by subscription', level: 2 },
    {
      type: 'paragraph',
      text: 'Those test escapes land at an unusual moment. In 1993 the mathematician and novelist Vernor Vinge described a coming [[kw:technological-singularity]]technological singularity[[/kw]], the point at which machine intelligence improves faster than people can forecast what follows.[[src:11]]Vernor Vinge, "The Coming Technological Singularity," VISION-21 Symposium, NASA Lewis Research Center, March 1993 · https://edoras.sdsu.edu/~vinge/misc/singularity.html[[/src]] For thirty years the idea lived in labs and science fiction. What changed in the last three is access: models that can read a codebase, find weaknesses in it, write convincing messages in dozens of languages and imitate a voice are now sold as consumer subscriptions to anyone with a credit card and a phone or a computer. The singularity that matters for this story is not a machine waking up. It is the cost of capable automation falling close to zero for defenders and attackers alike, which is why three labs disclosing contained escapes in two months alarmed the people who built the systems.',
    },
    {
      type: 'paragraph',
      text: 'HyperNormalisation saw the first version of this coming. Curtis tells the story of ELIZA, a program written at MIT in the 1960s by Joseph Weizenbaum as a parody of a therapist: it simply turned whatever a user typed back into a question. Weizenbaum was startled when people, his own secretary included, confided in it for hours while knowing it understood nothing. The film’s reading is that people felt safest when a machine reflected them back to themselves, and that the recommendation systems built since then scaled that mirror to billions of users. In 2026 the mirror talks back fluently, writes code and costs a few dollars a month, which makes it both more useful and more persuasive than anything Weizenbaum imagined, including as a carrier for exactly the kind of fear the outage theory spreads.',
    },

    { type: 'heading', text: 'What the warnings actually said', level: 2 },
    {
      type: 'paragraph',
      text: 'The warnings the theory cites are public, specific and on the record. ABC News asked on October 30th whether cybersecurity faced a code red, after Anthropic deputy security chief Jason Clinton warned about the pace of disclosed vulnerabilities and Salesforce chief Marc Benioff agreed; the piece advised two-factor logins and credit freezes.[[src:12]]ABC News, "A ‘code red’ for cybersecurity? How to prepare for a possible wave of AI hacking," October 30th, 2026 · https://abc7news.com/story/code-red-cybersecurity-how-prepare-possible-wave-ai-hacking/19999315/[[/src]] On CNN on October 11th, [[person:bill-gates]]Bill Gates[[/person]] said "the front that we’ll probably see most dramatically in the next year is cyberattacks," pointing to criminals running capable models with the safeguards stripped out.[[src:13]]Fox News, "Bill Gates sounds alarm on AI-powered cyberattacks," October 2026 · https://foxnews.com/media/bill-gates-sounds-alarm-ai-powered-cyberattacks-warns-negative-surprises-within-year[[/src]] More than 100 AI and security companies, OpenAI, Anthropic and Microsoft among them, wrote to the federal government that AI attacks could surge within months.[[src:14]]The National News Desk, "AI companies warn cyberattacks could surge within months," 2026 · https://abcnews4.com/news/nation-world/ai-companies-warn-cyberattacks-could-surge-within-months-as-public-concerns-grow-open-ai-anthropic-microsoft-amazon-web-services-100-companies-national-security-artificial-intelligence-hacking-infrastructure-hospitals-electric-water-treatment[[/src]] Firms that sell cloud software and AI models lose customers when attacks land; their incentive is to prevent them, not stage them.',
    },
    {
      type: 'paragraph',
      text: 'The blackout story has a traceable origin. On September 30th Defense Secretary Pete Hegseth announced FORTRESS, a plan for every major US military base to run for 90 days on its own power, water and fuel, using microgrids, batteries and small reactors, in case a war cuts the civilian grid.[[src:15]]Fortune, "The Pentagon wants every major base to run 90 days off-grid," October 26th, 2026 · https://fortune.com/2026/10/26/pentagon-fortress-bases-90-days-off-grid-uk-be-ready-stockpile/[[/src]] That is the map Newsweek published. Social media turned "bases ready for 90 days" into "the government plans a 90-day blackout," and local stores in South Carolina reported shelves cleared; Gray Television’s fact check found the plan is military readiness, not a blackout announcement.[[src:16]]Fox Carolina (Gray), "Is a 90-day blackout coming? What the U.S. military’s new readiness initiative actually means," November 5th, 2026 · https://www.foxcarolina.com/2026/11/05/is-90-day-blackout-coming-what-us-militarys-new-readiness-initiative-actually-means/[[/src]] The rumor then attached itself to FEMA’s routine nationwide alert test on November 17th, and AI-altered clips showed President Trump announcing an outage he never announced.[[src:17]]GadgetReview, "Viral 90-day blackout rumors swirl around routine FEMA alert test," November 16th, 2026 · https://www.gadgetreview.com/?p=430161[[/src]] No blackout followed.',
    },
    {
      type: 'paragraph',
      text: 'HyperNormalisation offers one reason stories like this travel so fast. Curtis spends a long stretch on what officials in the 1980s Reagan administration called perception management, the practice of telling dramatic stories to the public whether or not they were true, and on accounts that US counterintelligence officers fed forged UFO documents to a man living near an air base in New Mexico to hide what was being tested there. His argument is that a public which catches its government inventing stories stops trusting all of them, true and false alike. That is the soil the November theory grows in. The difference in 2026 is that the outage causes come from operators, airlines and regulators in writing, and each one can be checked against the next incident report.',
    },
    {
      type: 'paragraph',
      text: 'The film’s last act explains the delivery system. Curtis argues that after the 2008 crash, when governments rescued the banks on the grounds that anything else might destabilise the system, public anger moved online, where recommendation feeds sorted people into bubbles of the already convinced. Outrage spread fast but changed little, and every angry click earned money for the platforms carrying it. He sets that beside the Kremlin strategist Vladislav Surkov, who by the film’s account funded rival movements at once and let it be known, so that no one could tell what was staged. A theory that treats five unrelated outages as one production borrows that mood: if everything might be theatre, nothing has to be checked. Ezana checked anyway, which is what the 7 incidents in Fig. 1 record.',
    },

    { type: 'heading', text: 'Who owns the messengers', level: 2 },
    {
      type: 'paragraph',
      text: 'The theory’s central claim is that every company involved is owned by BlackRock, Vanguard and State Street. There is a real fact underneath it. Researchers at the University of Amsterdam found the three are together the largest shareholder in 88% of S&P 500 companies,[[src:18]]CORPNET, University of Amsterdam, "The Big Three asset managers dominate US corporate control" · https://corpnet.uva.nl/big-three-asset-managers-dominate-us-corporate-control/[[/src]] and Harvard’s Lucian Bebchuk and Boston University’s Scott Hirst put their average combined stake above 20%.[[src:19]]Bebchuk and Hirst, "The Specter of the Giant Three," NBER Working Paper 25914 · https://www.nber.org/system/files/working_papers/w25914/w25914.pdf[[/src]] Ezana’s own 13F data for the quarter ended September 30th, 2026 shows the three holding about 1.58 billion Microsoft shares worth $811 billion, roughly 21.3% of the 7.43 billion shares outstanding.[[src:20]]Ezana institutional holdings dataset, SEC Form 13F filings for the quarter ended September 30th, 2026 (BlackRock, Inc.; State Street Corp; Vanguard Capital Management and Vanguard Portfolio Management); shares outstanding from Microsoft’s fiscal 2026 Form 10-K · /datasets/institutional[[/src]]',
    },
    {
      type: 'paragraph',
      text: 'But an index fund that owns the whole market owns every side of every story: Fox and the Disney company that owns ABC, the bank that went down and the bank that stayed up, and BlackRock and State Street themselves. Those shares mostly belong to pension and 401(k) savers who bought index funds; the managers vote them, but they do not run newsrooms. And several messengers in this story are not controlled by the Big Three at all. Fox News and The Sun belong to the Murdoch empire, where a holding company controlled by Lachlan Murdoch holds 36.2% of Fox’s and 33.1% of News Corp’s voting Class B stock, locked in until 2050.[[src:21]]Investing.com, "Murdoch family resolves trust dispute," September 2025 · https://ng.investing.com/news/company-news/murdoch-family-resolves-trust-dispute-divides-news-corp-and-fox-assets-93CH-2096732[[/src]] Newsweek is private, owned by Dev Pragad and Johnathan Davis;[[src:22]]Wikipedia, "Dev Pragad" (Newsweek co-owner since 2018) · https://en.wikipedia.org/wiki/Dev_Pragad[[/src]] Firstpost belongs to India’s Network18, controlled by Mukesh Ambani’s Reliance Industries.[[src:23]]Wikipedia, "Firstpost" (parent Network18 Group, owned by Reliance Industries) · https://en.wikipedia.org/wiki/Firstpost[[/src]] Binance, OpenAI and Anthropic are private companies.',
    },
    {
      type: 'paragraph',
      text: 'Curtis’s film has a direct line to this section. It tells how [[person:larry-fink]]Larry Fink[[/person]], after losing about $100 million on a single position in 1986 and being pushed out of his firm, founded BlackRock and built Aladdin, a risk system run from data centres in East Wenatchee, Washington, that compares live market events against decades of history, flags dangers ahead and moves money away from them. In 2016 the film put the assets steered by Aladdin at about $15 trillion, which it called roughly 7% of the world’s wealth. For Curtis that machine is the purest form of the new power, a system whose job is to keep the world stable rather than to change it. That is close to the opposite of the theory’s picture of BlackRock as an engine of manufactured chaos: a business built on predicting and damping risk would be among the first casualties of a genuine run on the banks.',
    },
    {
      type: 'dossier-table',
      figureLabel: 'FIG. 2 · WHO HOLDS, AND WHO CONTROLS',
      kicker:
        'EACH COMPANY OR OUTLET IN THE THEORY · ROLE IN THE STORY · BIG THREE 13F HOLDING (BLACKROCK + STATE STREET + VANGUARD, $, SEPT 30TH, 2026) · WHO ACTUALLY CONTROLS IT. CLICK A ROW FOR THE RECORD.',
      hint: 'Holding is not control: check the right-hand column.',
      source:
        'Ezana 13F dataset, quarter ended September 30th, 2026; Microsoft FY2026 10-K; Murdoch family trust settlement (2025); Newsweek, Network18 and Reliance ownership records. Dollar values are reported 13F market values.',
      headers: ['Company or outlet', 'Role in the story', 'Big Three holding', 'Who controls it', ''],
      rows: [
        {
          name: 'Microsoft',
          tag: 'OUTAGE',
          role: 'Microsoft 365 failed for nearly 24 hours on November 12th.',
          anchor: '$811B · 21.3%',
          keyRisk: 'Widely held; no controlling owner. The Big Three are the largest holders.',
          dossier: [
            {
              label: 'Shares',
              text: 'About 1.58 billion of 7.43 billion shares outstanding across BlackRock, State Street and Vanguard filings.',
            },
            {
              label: 'Stated cause',
              text: 'A previously undetected software defect, increased traffic and reduced server capacity.',
            },
          ],
        },
        {
          name: 'Alphabet (Google)',
          tag: 'OUTAGE',
          role: 'Its UK cloud region failed on October 20th, hitting several banks.',
          anchor: '$729B',
          keyRisk:
            'Founders Larry Page and Sergey Brin hold supervoting Class B shares that the funds do not.',
          dossier: [
            {
              label: 'Holding',
              text: 'Class A (GOOGL) and Class C (GOOG) combined, both non-voting or one-vote classes.',
            },
          ],
        },
        {
          name: 'JPMorgan Chase',
          tag: 'OUTAGE',
          role: 'Online banking failed on November 16th after a software release.',
          anchor: '$189B',
          keyRisk: 'Widely held; the bank itself is also one of the largest US asset managers.',
          dossier: [
            {
              label: 'Peers the same day',
              text: 'Bank of America ($78B held) and Wells Fargo ($52B held) reported problems; Bank of America said its systems ran normally.',
            },
          ],
        },
        {
          name: 'Workday',
          tag: 'OUTAGE',
          role: 'Locked employees out on November 13th; no cause published.',
          anchor: '$10.4B',
          keyRisk: 'Co-founders retain Class B voting control.',
          dossier: [
            {
              label: 'Status',
              text: 'The one November incident without a published explanation.',
            },
          ],
        },
        {
          name: 'Walt Disney (ABC News)',
          tag: 'MESSENGER',
          role: 'ABC ran the "code red for cybersecurity" piece on October 30th.',
          anchor: '$39B',
          keyRisk: 'Widely held, one share one vote; no controlling owner.',
          dossier: [
            {
              label: 'What it reported',
              text: 'Warnings from security executives and a list of protective steps: two-factor logins and credit freezes.',
            },
          ],
        },
        {
          name: 'Fox Corp and News Corp',
          tag: 'MESSENGER',
          role: 'Fox outlets covered the outages; News Corp owns The Sun, also cited by the theory.',
          anchor: '$5.6B and $3.7B',
          keyRisk:
            'Controlled by the Murdoch family: 36.2% of Fox and 33.1% of News Corp voting Class B stock, voted by Lachlan Murdoch until 2050.',
          dossier: [
            {
              label: 'Reading',
              text: 'The funds hold small economic stakes; voting control sits with the family holding company.',
            },
          ],
        },
        {
          name: 'Newsweek',
          tag: 'MESSENGER',
          role: 'Published the map of bases preparing for outages.',
          anchor: 'None (private)',
          keyRisk: 'Owned 50/50 by Dev Pragad and Johnathan Davis.',
          dossier: [
            {
              label: 'Underlying story',
              text: 'The Pentagon’s FORTRESS plan for 90 days of base self-sufficiency, announced September 30th.',
            },
          ],
        },
        {
          name: 'Firstpost',
          tag: 'MESSENGER',
          role: 'Cited by the theory for asking whether the bank outages were a coordinated attack.',
          anchor: 'None (Indian parent)',
          keyRisk: 'Part of Network18, controlled by Reliance Industries and Mukesh Ambani.',
          dossier: [
            {
              label: 'Reading',
              text: 'An Indian outlet controlled by an Indian conglomerate; outside US index-fund control entirely.',
            },
          ],
        },
        {
          name: 'Erebor',
          tag: 'NEW BANK',
          role: 'Stablecoin-ready national bank for tech, chartered February 6th, 2026.',
          anchor: 'None (private)',
          keyRisk:
            'Private; backed by Founders Fund, 8VC and Lux Capital, with co-founder Palmer Luckey on the board.',
          dossier: [
            {
              label: 'Scale',
              text: '$4.06 billion in deposits at June 30th, 2026 and more than $7 billion by October, per the Financial Times.',
            },
            {
              label: 'Scrutiny',
              text: 'Senator Elizabeth Warren is probing how quickly the OCC and FDIC approved its charter and deposit insurance.',
            },
          ],
        },
        {
          name: 'Binance',
          tag: 'ATTACK',
          role: 'Lost about $6.3 billion on October 29th, the largest crypto theft on record.',
          anchor: 'None (private)',
          keyRisk: 'Private company; attributed by the FBI to North Korea’s TraderTraitor group.',
          dossier: [
            {
              label: 'Recovery',
              text: 'Binance said it would cover user losses from its own funds and restored withdrawals in phases from November 1st.',
            },
          ],
        },
      ],
    },
    {
      type: 'cta-callout',
      headline: 'Check who holds any company yourself',
      body: 'Every holding in Figure 2 comes from Form 13F filings in Ezana’s institutional dataset. Look up BlackRock, Vanguard or State Street, see position-by-position what they held last quarter and what changed, and compare it with who actually controls the votes.',
      ctaLabel: 'Open institutional holdings',
      ctaHref: '/datasets/institutional',
      ctaAuthGate: false,
    },

    { type: 'heading', text: 'What Larry Fink actually wants', level: 2 },
    {
      type: 'paragraph',
      text: 'The tokenization push is not a secret, and it does not need a crisis to explain it. At the World Economic Forum in January 2026, [[person:larry-fink]]Larry Fink[[/person]] argued for putting stocks, bonds and funds on one common blockchain and said, "I think we need to move very rapidly to doing that," citing lower fees.[[src:24]]Asianet Newsable / Stocktwits, "BlackRock’s Larry Fink sees the future of finance on a blockchain," January 24th, 2026 · https://newsable.asianetnews.com/amp/markets/blackrock-s-larry-fink-sees-the-future-of-finance-on-a-blockchain-and-it-s-not-bitcoin-articleshow-9klfzqw[[/src]][[src:25]]DL News, "Why BlackRock’s Larry Fink wants the entire financial system on ‘one common blockchain’," January 22nd, 2026 · https://dlnews.com/articles/people-culture/blackrock-ceo-larry-fink-wants-the-entire-financial-system-on-one-common-blockchain/[[/src]] He has also named a reliable, large-scale digital identity system as the biggest obstacle, which is exactly the part privacy advocates worry about.[[src:26]]Enterprise, "BlackRock’s Larry Fink believes in a blockchain-based financial system," 2026 · https://enterpriseam.com/egypt/?p=663840[[/src]] BlackRock sells tokenized products, including its BUIDL Treasury fund at about $2.5 billion in May 2026, so the pitch is plainly commercial.[[src:27]]Eco, "Tokenized RWA market size 2026," citing rwa.xyz, May 2026 · https://eco.com/support/support/en/articles/15254020[[/src]]',
    },
    {
      type: 'paragraph',
      text: 'The scale matters for judging the theory. Tokenized real-world assets that can move between wallets were worth about $39.5 billion in November 2026 by rwa.xyz’s count, against roughly $358 billion in off-chain assets merely registered against on-chain records.[[src:28]]rwa.xyz dashboard, distributed asset value, November 2026 · https://app.rwa.xyz/[[/src]][[src:29]]Stobox, "State of RWA 2026," citing rwa.xyz, September 27th, 2026 · https://www.stobox.io/reports/state-of-rwa-2026[[/src]] US bank deposits run to trillions. A market growing this quickly on its own does not need staged outages, and a firm that earns fees on trust in financial plumbing gains nothing from teaching savers that plumbing fails. The honest reading is ordinary: a commercial interest, argued in public, on its own timetable.',
    },
    {
      type: 'paragraph',
      text: 'HyperNormalisation opens in New York in 1975, when the banks stopped buying the city’s short-term notes and, by the film’s account, eight of the nine members of the board set up to run its finances were bankers. Curtis treats that as the moment financial institutions began running parts of public life directly, with austerity presented as the only logic available. Tokenization is a quieter, voluntary cousin of that shift: it moves settlement, custody and collateral onto rails that private firms design and operate. Nothing about it requires staged outages, but the 1975 story is a reminder that who writes the rules of the plumbing ends up with real power over what flows through it.',
    },
    {
      type: 'wall-timeline',
      figureLabel: 'FIG. 3 · THE MANAGED SYSTEM, 1966 TO 2026',
      kicker:
        'HYPERNORMALISATION’S CHRONOLOGY SET AGAINST THIS STORY · ONE PLAQUE PER EVENT NAMED IN THIS ARTICLE · CLICK ANY PLAQUE FOR THE RECORD.',
      hint: 'Click a plaque for its record.',
      source:
        'Adam Curtis, HyperNormalisation (BBC, 2016) for the film’s events and its 2016 Aladdin figure; Vinge (1993); Executive Order 14178; operator statements, November 2026.',
      startYear: 1960,
      endYear: 2030,
      windows: [
        {
          id: 'managed',
          label: 'The managed system, per the film',
          from: 1975,
          to: 2008,
          color: 'var(--echo-chart-blue)',
        },
        {
          id: 'feeds',
          label: 'Bailouts, feeds, the film',
          from: 2008,
          to: 2016.8,
          color: 'var(--echo-chart-orange)',
        },
        {
          id: 'after',
          label: 'Consumer AI and tokenized money',
          from: 2016.8,
          to: 2026.9,
          color: 'var(--echo-chart-purple)',
        },
      ],
      plaques: [
        {
          year: 1966,
          lane: 0,
          label: '1966 · ELIZA',
          detail:
            'Joseph Weizenbaum’s scripted therapist at MIT turns users’ words back into questions; people confide in it for hours, knowing it understands nothing.',
        },
        {
          year: 1975,
          lane: 1,
          label: '1975 · New York',
          detail:
            'Banks stop buying the city’s notes; by the film’s account eight of the nine members of the new finance board are bankers.',
        },
        {
          year: 1986,
          lane: 0,
          label: '1986 · Fink’s loss',
          detail:
            'Larry Fink loses about $100 million on one position and later builds BlackRock’s Aladdin risk system; the same decade brings Reagan-era perception management.',
        },
        {
          year: 1993,
          lane: 2,
          label: '1993 · Singularity',
          detail:
            'Vernor Vinge’s essay names the technological singularity, the point where machine progress outruns forecasting.',
        },
        {
          year: 2008,
          lane: 1,
          label: '2008 · Bailouts',
          detail:
            'Governments rescue the banks on the grounds that anything else might destabilise the system; in the film, anger moves online into feeds.',
        },
        {
          year: 2016.8,
          lane: 2,
          label: 'Oct 2016 · The film',
          detail:
            'HyperNormalisation is released on BBC iPlayer and puts the assets steered by Aladdin at about $15 trillion, roughly 7% of world wealth.',
        },
        {
          year: 2025.06,
          lane: 0,
          label: 'Jan 2025 · CBDC ban',
          detail:
            'Executive Order 14178 bars federal agencies from establishing, issuing or promoting a central bank digital currency.',
        },
        {
          year: 2026.87,
          lane: 1,
          label: 'Nov 2026 · Outages',
          detail:
            'Microsoft 365, the FAA, Workday and large banks go down in five days; every stated cause is unrelated, and Workday’s is still preliminary.',
        },
      ],
    },

    {
      type: 'heading',
      text: 'The New Financial Rails: Follow the Money, the Infrastructure and the Incentives',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'Start by separating four things the theory runs together, because they have different owners, different rules and different risks. A stablecoin is a token issued by a private company and backed by reserves, now regulated under the GENIUS Act. A tokenized deposit is an ordinary bank deposit recorded on a blockchain, a direct claim on the bank. A tokenized security or fund is a share, bond or fund unit whose ownership record lives on a ledger. A central bank digital currency would be a liability of the Federal Reserve itself, and US policy currently bars one. Almost everything being built in 2026 falls into the first three categories, and most of it is being built by firms that already sit at the center of the old system.',
    },
    {
      type: 'paragraph',
      text: 'The asset managers moved first. BlackRock, which managed $15.3 trillion at the end of June,[[src:94]]BlackRock, Form 10-Q for the quarter ended June 30th, 2026 · https://www.sec.gov/Archives/edgar/data/0002012383/000119312526337177/blk-20260630.htm[[/src]] launched its tokenized money market fund BUIDL in March 2024, and DefiLlama’s tracker put it at about $2.1 billion across nine blockchains in November.[[src:95]]DefiLlama, "BlackRock BUIDL," accessed November 2026 · https://defillama.com/protocol/blackrock-buidl[[/src]] Franklin Templeton has run BENJI, the first US-registered money market fund to use a public blockchain as its official record, for five years,[[src:96]]Franklin Templeton, "Franklin Templeton, Stellar Development Foundation mark five years of BENJI," 2026 · https://www.franklintempleton.com/press-releases/news-room/2026/franklin-templeton-stellar-development-foundation-mark-five-years-of-benji-the-first-u.s.-registered-tokenized-money-market-fund[[/src]] and in August said it plans to use the fund inside ETFs and mutual funds as a holding or as collateral.[[src:97]]WealthManagement.com, "Franklin Plans to Push Tokenized Assets Into Traditional Funds," August 20th, 2026 · https://wealthmanagement.com/crypto/franklin-plans-to-push-tokenized-assets-into-traditional-funds[[/src]] Securitize, which tokenizes funds in partnership with Apollo, BlackRock, BNY, Hamilton Lane and KKR, listed on the NYSE as SECZ on July 2nd,[[src:98]]Securitize via PR Newswire, "Tokenizing SECZ: Securitize brings its own public stock onchain at listing day," July 2nd, 2026 · https://www.barchart.com/story/news/3100504/tokenizing-secz-securitize-brings-its-own-public-stock-onchain-at-listing-day[[/src]] and said in August that it managed about $5 billion of onchain assets, out of roughly $38 billion tokenized on public blockchains excluding stablecoins.[[src:99]]Markets Media, "Securitize Manages $5bn in Onchain Assets," August 13th, 2026 · https://www.marketsmedia.com/securitize-manages-5bn-in-onchain-assets/[[/src]] The incentive is plain: a fund that settles around the clock and can be posted as collateral is a fund that earns fees in places the old plumbing could not reach.',
    },
    {
      type: 'paragraph',
      text: 'The plumbing followed. On October 28th the Depository Trust Company, the settlement utility at the center of US securities markets, switched on the DTCC Tokenization Service, letting eligible participants convert securities it holds in custody into tokenized entitlements delivered to their digital wallets.[[src:100]]DTCC via Tradeweb, "DTCC Tokenization Service Goes Live, Marking Major Milestone in the Adoption of Digital Assets," October 28th, 2026 · https://www.tradeweb.com/newsroom/media-center/in-the-news/dtcc-tokenization-service-goes-live-marking-major-milestone-in-the-adoption-of-digital-assets/[[/src]] It launched with 34 securities worth about $30 trillion, including Russell 1000 stocks, major ETFs and Treasuries, and 20 participants signed on, among them J.P. Morgan, Citi and Bank of America, after the SEC issued a no-action letter in December 2025.[[src:101]]Crypto Briefing, "DTCC launches tokenization service with input from 150 firms," October 2026 · https://cryptobriefing.com/dtcc-launches-tokenization-service-150-firms/[[/src]] When the utility that already holds the securities builds the bridge itself, tokenization stops being a fringe experiment and becomes a question of who controls the gateway.',
    },
    {
      type: 'paragraph',
      text: 'Banks are building their own version, partly so that deposits do not leak out to stablecoins. J.P. Morgan’s Kinexys unit launched JPM Coin (JPMD), a deposit token for institutional clients, on Base in November 2025 and extended it to Ethereum on October 19th.[[src:102]]The Block, "JPMorgan expands \'JPM Coin\' deposit token to Ethereum for institutional clients," October 19th, 2026 · https://theblock.co/news/business/2026-10-19-jpmorgan-jpm-coin-deposit-token-ethereum-418874[[/src]] BNY, the largest custody bank, activated tokenized deposits in January for payments and collateral,[[src:103]]The Block, "BNY activates tokenized deposit service for payments and collateral," January 9th, 2026 · https://www.theblock.co/news/business/2026-01-09-bny-activates-tokenized-deposit-service-payments-collateral-384930[[/src]] running on its own private, permissioned blockchain.[[src:104]]Banking Exchange, "BNY Launches Tokenized Deposits," January 2026 · https://m.bankingexchange.com/news-feed/item/10510-bny-launches-tokenized-deposits[[/src]] These are permissioned products. The bank knows every holder, because every token is a claim on an account it already supervises.',
    },
    {
      type: 'paragraph',
      text: 'The stablecoin side is consolidating around a few licensed names. Circle averaged $73.3 billion of USDC in circulation in the third quarter, and most of its revenue still comes from interest on reserves, which fell 8% as rates dropped.[[src:105]]Blockonomi, "Circle (CRCL) Stock Rises as Q3 Revenue Hits $865M and USDC Circulation Reaches $73.3B," November 4th, 2026 · https://blockonomi.com/circle-crcl-stock-rises-as-q3-revenue-hits-865m-and-usdc-circulation-reaches-73-3b/[[/src]] It launched its own blockchain, Arc, on September 16th with more than 100 partners including BlackRock, the DTCC and Visa.[[src:106]]Crypto Briefing, "Circle beats Q3 earnings estimates as Arc mainnet goes live with 100+ partners," November 2026 · https://cryptobriefing.com/circle-q3-earnings-arc-mainnet-launch/[[/src]] Paxos, which issues dollar stablecoins for itself and for partners, converted to an OCC-supervised national trust bank on December 12th, 2025.[[src:107]]Paxos, "What an OCC charter means for stablecoins," 2026 · https://www.paxos.com/blog/occ-charter-stablecoins[[/src]] Visa said in April that its stablecoin settlement pilot had reached a $7 billion annualized run rate across nine blockchains,[[src:108]]Visa, "Visa Accelerates Stablecoin Momentum: Adding Five Blockchains for Settlement," April 29th, 2026 · https://corporate.visa.com/en/sites/visa-perspectives/newsroom/visa-expands-stablecoin-settlement-adds-five-blockchains.html[[/src]] and Stripe’s stablecoin unit Bridge won preliminary conditional approval for a national trust bank in February[[src:109]]Office of the Comptroller of the Currency, Corporate Decision #1365, Bridge National Trust Bank, February 12th, 2026 · https://www.occ.treas.gov/topics/charters-and-licensing/interpretations-and-actions/2026/cd1365.pdf[[/src]] while Stripe builds a payments blockchain, Tempo, with the crypto investor Paradigm.[[src:110]]eMarketer, "Stripe joins a crowded field of crypto firms gaining trust bank charters," February 2026 · https://www.emarketer.com/content/stripe-joins-crowded-field-of-crypto-firms-gaining-trust-bank-charters-1[[/src]] Figure 4 sets each builder against its evidence, its dependencies and the rules it answers to.',
    },
    {
      type: 'dossier-table',
      figureLabel: 'FIG. 4 · WHO IS BUILDING THE NEXT FINANCIAL ORDER?',
      kicker: 'NINE VERTICALS × THE BUILDERS ON THE RECORD · STATUS IS OPERATING, SCALING, PILOT, ANNOUNCED OR POSSIBILITY · OPEN A DOSSIER FOR ACTIVITY, EVIDENCE, ADVANTAGE, DEPENDENCY, RISK, REGULATORY EXPOSURE AND SOURCE.',
      hint: 'Status describes what the public record shows today, not a forecast. No builder here is a guaranteed winner.',
      source: 'Company filings and releases; OCC charter decisions; DTCC; DefiLlama; Route Fifty; reporting by The Block, Markets Media, Crypto Briefing and Blockonomi. Current to November 21st, 2026.',
      headers: [
        'Builder',
        'Vertical · status',
        'Evidence on the record',
        'Key risk',
        '',
      ],
      rows: [
        {
          name: 'BlackRock',
          tag: 'BLK',
          role: 'Tokenized funds · Operating',
          anchor: '$15.3T managed (June 2026); BUIDL about $2.1B on nine chains (November 2026)',
          keyRisk: 'Tokenized funds are tiny next to the core business',
          dossier: [
            {
              label: 'Status',
              text: 'Operating.',
            },
            {
              label: 'What it is doing',
              text: 'Runs BUIDL, a tokenized money market fund for qualified investors, launched in March 2024.',
            },
            {
              label: 'Evidence',
              text: 'BlackRock 10-Q for the quarter ended June 30th, 2026; DefiLlama BUIDL tracker, November 2026.',
            },
            {
              label: 'Advantage',
              text: 'The largest client base and distribution of any asset manager.',
            },
            {
              label: 'Depends on',
              text: 'Securitize for tokenization; public blockchains and stablecoins for subscriptions and redemptions.',
            },
            {
              label: 'Risk',
              text: 'Growth depends on exchanges and brokers accepting tokenized fund shares as collateral.',
            },
            {
              label: 'Regulatory exposure',
              text: 'SEC fund rules; how regulators treat tokenized shares as collateral.',
            },
            {
              label: 'Source and date',
              text: 'BlackRock Form 10-Q (2026); DefiLlama (accessed November 2026).',
            },
          ],
        },
        {
          name: 'Franklin Templeton',
          tag: 'BEN',
          role: 'Tokenized funds · Scaling',
          anchor: 'BENJI: first US-registered fund with a public blockchain as its record, five years running',
          keyRisk: 'Small scale next to the largest money funds',
          dossier: [
            {
              label: 'Status',
              text: 'Scaling.',
            },
            {
              label: 'What it is doing',
              text: 'Runs the Franklin OnChain U.S. Government Money Fund (BENJI), whose shareholder record lives on a public blockchain.',
            },
            {
              label: 'Evidence',
              text: 'Five-year anniversary release (2026); August 2026 plan to hold BENJI inside ETFs and mutual funds, per a letter posted by the SEC.',
            },
            {
              label: 'Advantage',
              text: 'The longest operating record of any registered tokenized fund.',
            },
            {
              label: 'Depends on',
              text: 'SEC staff positions; public chains such as Stellar.',
            },
            {
              label: 'Risk',
              text: 'Competition from BlackRock and from bank deposit tokens for the same cash.',
            },
            {
              label: 'Regulatory exposure',
              text: 'SEC Investment Company Act rules.',
            },
            {
              label: 'Source and date',
              text: 'Franklin Templeton (2026); WealthManagement.com, August 20th, 2026.',
            },
          ],
        },
        {
          name: 'Securitize',
          tag: 'SECZ',
          role: 'Tokenization platform · Scaling',
          anchor: 'About $5B of onchain assets (August 2026); NYSE-listed since July 2nd, 2026',
          keyRisk: 'Few large clients; rival platforms',
          dossier: [
            {
              label: 'Status',
              text: 'Scaling.',
            },
            {
              label: 'What it is doing',
              text: 'Issues and administers tokenized funds with Apollo, BlackRock, BNY, Hamilton Lane and KKR, and put its own shares onchain at listing.',
            },
            {
              label: 'Evidence',
              text: 'Listing release, July 2nd, 2026; second-quarter results call, August 13th, 2026.',
            },
            {
              label: 'Advantage',
              text: 'First mover with the largest asset managers as partners.',
            },
            {
              label: 'Depends on',
              text: 'A handful of large asset-manager clients.',
            },
            {
              label: 'Risk',
              text: 'A rival platform, or a client building in-house, could take share.',
            },
            {
              label: 'Regulatory exposure',
              text: 'SEC broker-dealer and transfer-agent rules; the September 2026 Innovation Exemption.',
            },
            {
              label: 'Source and date',
              text: 'Securitize via PR Newswire, July 2nd, 2026; Markets Media, August 13th, 2026.',
            },
          ],
        },
        {
          name: 'DTCC',
          tag: 'Utility',
          role: 'Market infrastructure · Operating (early)',
          anchor: '34 securities worth about $30T and 20 participants at launch, October 28th, 2026',
          keyRisk: 'One utility controls the bridge',
          dossier: [
            {
              label: 'Status',
              text: 'Operating, at an early scale.',
            },
            {
              label: 'What it is doing',
              text: 'Converts selected DTC-held stocks, ETFs and Treasuries into tokenized entitlements delivered to participants’ wallets.',
            },
            {
              label: 'Evidence',
              text: 'DTCC launch release, October 28th, 2026; SEC no-action letter, December 11th, 2025.',
            },
            {
              label: 'Advantage',
              text: 'Already holds the securities, so tokens stay inside the regulated system.',
            },
            {
              label: 'Depends on',
              text: 'SEC no-action relief; the blockchains it connects to.',
            },
            {
              label: 'Risk',
              text: 'Concentrates the gateway to tokenized US securities in a single utility.',
            },
            {
              label: 'Regulatory exposure',
              text: 'SEC oversight of clearing agencies.',
            },
            {
              label: 'Source and date',
              text: 'DTCC via Tradeweb, October 28th, 2026; Crypto Briefing, October 2026.',
            },
          ],
        },
        {
          name: 'JPMorgan Chase',
          tag: 'JPM',
          role: 'Bank deposit tokens · Scaling',
          anchor: 'JPMD live on Base (November 2025) and Ethereum (October 19th, 2026)',
          keyRisk: 'Institutional only; competes with stablecoins for the same flows',
          dossier: [
            {
              label: 'Status',
              text: 'Scaling.',
            },
            {
              label: 'What it is doing',
              text: 'Kinexys issues JPM Coin (JPMD), a permissioned US dollar deposit token for institutional clients.',
            },
            {
              label: 'Evidence',
              text: 'The Block, October 19th, 2026.',
            },
            {
              label: 'Advantage',
              text: 'A direct claim on the largest US bank, inside bank supervision.',
            },
            {
              label: 'Depends on',
              text: 'Public blockchains and client wallets.',
            },
            {
              label: 'Risk',
              text: 'Operational: a software release caused the November 16th Chase outage.',
            },
            {
              label: 'Regulatory exposure',
              text: 'Bank supervisors (OCC, Fed, FDIC). A deposit token is a deposit, not a payment stablecoin under GENIUS.',
            },
            {
              label: 'Source and date',
              text: 'The Block, October 19th, 2026.',
            },
          ],
        },
        {
          name: 'BNY',
          tag: 'BK',
          role: 'Bank deposit tokens · Operating (early)',
          anchor: 'Tokenized deposits live since January 9th, 2026, on a private chain',
          keyRisk: 'Value depends on other institutions joining',
          dossier: [
            {
              label: 'Status',
              text: 'Operating, at an early scale.',
            },
            {
              label: 'What it is doing',
              text: 'Onchain book entries that mirror clients’ demand deposits, starting with collateral and margin.',
            },
            {
              label: 'Evidence',
              text: 'The Block, January 9th, 2026; Banking Exchange, January 2026.',
            },
            {
              label: 'Advantage',
              text: 'The world’s largest custody bank, with nearly $58 trillion under custody.',
            },
            {
              label: 'Depends on',
              text: 'Its own permissioned blockchain and client adoption.',
            },
            {
              label: 'Risk',
              text: 'A private network reaches only the institutions that join it.',
            },
            {
              label: 'Regulatory exposure',
              text: 'Bank supervisors. A deposit token is a deposit, not a payment stablecoin under GENIUS.',
            },
            {
              label: 'Source and date',
              text: 'The Block, January 9th, 2026; Banking Exchange, January 2026.',
            },
          ],
        },
        {
          name: 'Circle',
          tag: 'CRCL',
          role: 'Stablecoin issuer · Operating',
          anchor: '$73.3B average USDC in Q3 2026; Arc blockchain live September 16th',
          keyRisk: 'Revenue tied to interest rates',
          dossier: [
            {
              label: 'Status',
              text: 'Operating.',
            },
            {
              label: 'What it is doing',
              text: 'Issues USDC and runs Arc, a blockchain where USDC pays the fees.',
            },
            {
              label: 'Evidence',
              text: 'Third-quarter results, November 4th, 2026; Arc launch, September 16th, 2026.',
            },
            {
              label: 'Advantage',
              text: 'The largest US-regulated dollar stablecoin, with BlackRock, the DTCC and Visa as Arc partners.',
            },
            {
              label: 'Depends on',
              text: 'Reserve income, which fell 8% in the third quarter; distribution partners.',
            },
            {
              label: 'Risk',
              text: 'GENIUS bars issuers from paying yield, so falling rates squeeze the core business.',
            },
            {
              label: 'Regulatory exposure',
              text: 'GENIUS Act from January 18th, 2027; OCC trust charter (conditional); FinCEN and OFAC rules.',
            },
            {
              label: 'Source and date',
              text: 'Blockonomi, November 4th, 2026; Crypto Briefing, November 2026; eMarketer, February 2026.',
            },
          ],
        },
        {
          name: 'Paxos',
          tag: 'Private',
          role: 'Stablecoin issuer · Operating',
          anchor: 'OCC-supervised national trust bank since December 12th, 2025',
          keyRisk: 'Depends on partner brands for distribution',
          dossier: [
            {
              label: 'Status',
              text: 'Operating.',
            },
            {
              label: 'What it is doing',
              text: 'Issues dollar stablecoins, including for partners, from a federally chartered trust bank.',
            },
            {
              label: 'Evidence',
              text: 'Paxos charter disclosure, 2026.',
            },
            {
              label: 'Advantage',
              text: 'Federally chartered before the GENIUS Act takes effect.',
            },
            {
              label: 'Depends on',
              text: 'Partners that put their names on its coins.',
            },
            {
              label: 'Risk',
              text: 'Rivals with their own charters and networks.',
            },
            {
              label: 'Regulatory exposure',
              text: 'OCC supervision; GENIUS implementing rules; FinCEN and OFAC rules.',
            },
            {
              label: 'Source and date',
              text: 'Paxos, 2026.',
            },
          ],
        },
        {
          name: 'Visa',
          tag: 'V',
          role: 'Payment network · Pilot, scaling',
          anchor: '$7B annualized stablecoin settlement across nine chains (April 2026)',
          keyRisk: 'Stablecoins could route around card networks',
          dossier: [
            {
              label: 'Status',
              text: 'Pilot, scaling.',
            },
            {
              label: 'What it is doing',
              text: 'Lets card issuers and acquirers settle with Visa in stablecoins; a partner on Circle’s Arc.',
            },
            {
              label: 'Evidence',
              text: 'Visa release, April 29th, 2026.',
            },
            {
              label: 'Advantage',
              text: 'Owns the merchant and bank network a stablecoin needs to reach shoppers.',
            },
            {
              label: 'Depends on',
              text: 'Issuers and blockchains it does not control.',
            },
            {
              label: 'Risk',
              text: 'If payments settle directly in stablecoins, network fees shrink.',
            },
            {
              label: 'Regulatory exposure',
              text: 'GENIUS rules for the coins it settles; payment network oversight.',
            },
            {
              label: 'Source and date',
              text: 'Visa, April 29th, 2026.',
            },
          ],
        },
        {
          name: 'Stripe and Bridge',
          tag: 'Private',
          role: 'Stablecoin infrastructure · Announced',
          anchor: 'Preliminary conditional OCC trust bank approval, February 12th, 2026',
          keyRisk: 'Final charter approval not yet granted',
          dossier: [
            {
              label: 'Status',
              text: 'Announced: the charter is conditional, and the Tempo chain is in development.',
            },
            {
              label: 'What it is doing',
              text: 'Bridge issues and moves stablecoins for businesses; Stripe is building the Tempo payments blockchain with Paradigm.',
            },
            {
              label: 'Evidence',
              text: 'OCC Corporate Decision #1365, February 12th, 2026.',
            },
            {
              label: 'Advantage',
              text: 'Stripe’s merchant base and checkout software.',
            },
            {
              label: 'Depends on',
              text: 'Final OCC approval.',
            },
            {
              label: 'Risk',
              text: 'Bank trade groups opposed the application; approval could slow or come with tighter conditions.',
            },
            {
              label: 'Regulatory exposure',
              text: 'OCC chartering; GENIUS rules.',
            },
            {
              label: 'Source and date',
              text: 'OCC, February 12th, 2026; eMarketer, February 2026.',
            },
          ],
        },
        {
          name: 'Erebor',
          tag: 'Private',
          role: 'New bank charter · Operating',
          anchor: 'National charter February 6th, 2026; more than $7B of deposits by October',
          keyRisk: 'A small, politically connected network',
          dossier: [
            {
              label: 'Status',
              text: 'Operating.',
            },
            {
              label: 'What it is doing',
              text: 'A branchless national bank for technology companies with always-on stablecoin settlement.',
            },
            {
              label: 'Evidence',
              text: 'OCC charter (February 2026); quarterly filings; Senator Warren’s letters.',
            },
            {
              label: 'Advantage',
              text: 'A full national charter and backing from Founders Fund and 8VC.',
            },
            {
              label: 'Depends on',
              text: 'Its tech-sector depositors, and a 12% leverage floor for its first three years.',
            },
            {
              label: 'Risk',
              text: 'Concentrated deposits in one industry, the risk that sank Silicon Valley Bank.',
            },
            {
              label: 'Regulatory exposure',
              text: 'OCC conditions; congressional scrutiny.',
            },
            {
              label: 'Source and date',
              text: 'Reuters via Yahoo Finance, February 6th, 2026, and the sources in the Erebor section.',
            },
          ],
        },
        {
          name: 'State mobile IDs and phone wallets',
          tag: 'Identity',
          role: 'Digital identity · Scaling',
          anchor: 'Mobile licenses accepted in 21 states and Puerto Rico; federal ID guidance September 8th, 2026',
          keyRisk: 'Low uptake; wallets become gatekeepers',
          dossier: [
            {
              label: 'Status',
              text: 'Scaling.',
            },
            {
              label: 'What it is doing',
              text: 'States issue mobile driver’s licenses; Apple, Google and Samsung wallets store them; banks may now use them to verify customers.',
            },
            {
              label: 'Evidence',
              text: 'FinCEN and bank regulators’ FAQs, September 8th, 2026; Route Fifty, September 2026.',
            },
            {
              label: 'Advantage',
              text: 'Faster remote onboarding and fewer fake documents.',
            },
            {
              label: 'Depends on',
              text: 'State DMVs, the wallet platforms and each bank’s choice to accept them.',
            },
            {
              label: 'Risk',
              text: 'If credentials, money and compliance converge on one phone, a few platforms decide who can participate.',
            },
            {
              label: 'Regulatory exposure',
              text: 'Customer identification rules; state law; wallet terms of service.',
            },
            {
              label: 'Source and date',
              text: 'OCC Bulletin 2026-44, September 8th, 2026; Route Fifty, September 2026.',
            },
          ],
        },
        {
          name: 'Nvidia, Constellation and Vistra',
          tag: 'NVDA · CEG · VST',
          role: 'AI compute and power · Operating',
          anchor: '$115.8B Nvidia quarterly revenue; 20-year nuclear contracts with Microsoft, Meta, Google and Amazon',
          keyRisk: 'Export controls; grid cost fights',
          dossier: [
            {
              label: 'Status',
              text: 'Operating.',
            },
            {
              label: 'What it is doing',
              text: 'Supply the chips and the electricity that AI-driven markets, compliance and customer service run on.',
            },
            {
              label: 'Evidence',
              text: 'Company results and power contracts, cited in the rings of power section.',
            },
            {
              label: 'Advantage',
              text: 'Scarce supply: leading chips and firm nuclear power.',
            },
            {
              label: 'Depends on',
              text: 'Export licenses, grid interconnection and a few very large buyers.',
            },
            {
              label: 'Risk',
              text: 'If AI demand forecasts prove wrong, the buyers’ debt and the contracts are exposed.',
            },
            {
              label: 'Regulatory exposure',
              text: 'Commerce Department export controls; FERC, the NRC and state utility commissions.',
            },
            {
              label: 'Source and date',
              text: 'Sources cited in the rings of power section, October and November 2026.',
            },
          ],
        },
      ],
    },
    { type: 'heading', text: 'A farmers’ bank for tech: Palmer Luckey’s Erebor', level: 2 },
    {
      type: 'paragraph',
      text: 'The clearest picture of who is building the new money rails is not a staged blackout but a bank charter. Erebor, a digital national bank co-founded by [[person:palmer-luckey]]Palmer Luckey[[/person]], who founded Oculus and the defense contractor Anduril, and backed by Joe Lonsdale’s 8VC and Peter Thiel’s Founders Fund, was built to fill the gap Silicon Valley Bank left in 2023.[[src:30]]Payments Industry Intelligence, "Tech billionaires back Erebor to fill Silicon Valley Bank void," 2025 · https://paymentsindustryintelligence.com/?p=56665[[/src]] It applied to the Office of the Comptroller of the Currency on June 11th, 2025, won conditional approval on October 15th, and on February 6th, 2026 became the first newly created bank to receive a national charter in President Trump’s second term.[[src:31]]Reuters via Yahoo Finance, "Palmer Luckey-backed Erebor receives US national banking charter, WSJ reports," February 6th, 2026 · https://finance.yahoo.com/news/palmer-luckey-backed-erebor-receives-225304165.html[[/src]] It opened for business on a Sunday, February 8th,[[src:32]]Fintech Business Weekly, "What it means to be a bank is rapidly changing," February 2026 · https://fintechbusinessweekly.substack.com/p/what-it-means-to-be-a-bank-is-rapidly[[/src]] a nod to its pitch: a branchless bank with always-on stablecoin settlement, while ACH and wire transfers still keep banker’s hours.[[src:33]]Insights4VC, "Erebor: a stablecoin-native US bank," 2025 · https://insights4vc.substack.com/p/erebor-a-stablecoin-native-us-bank[[/src]]',
    },
    {
      type: 'quote',
      text: 'A farmer’s bank for tech.',
      source:
        'Palmer Luckey on Erebor’s positioning, as summarized by TBPN, February 6th, 2026',
    },
    {
      type: 'paragraph',
      text: 'The phrase says a lot. Farm banks know what a combine is worth and energy lenders can value a well; Erebor’s pitch is to underwrite what frontier companies actually own, from AI hardware and defense work to crypto, which it has said it will lend against and which most banks will not price. Luckey describes it as a bank for founders that traditional banks do not understand,[[src:34]]TBPN digest, "Erebor becomes first new nationally chartered bank under Trump," February 6th, 2026 · https://tbpn-digest.vercel.app/story/2026-02-06/erebor-becomes-first-new-nationally-chartered-bank-under-trump-backed-by-andreessen-horowitz-lux-capital-and-founders-fund[[/src]] and the first big loans fit the brief: in August Erebor led a $200 million credit facility for nuclear startup Valar Atomics as administrative agent, alongside JPMorgan.[[src:35]]Valar Atomics, "Announcing our $1B Series B led by Sequoia," August 4th, 2026 · https://valaratomics.com/docs/Announcing-our-1B-Series-B-Led-By-Sequoia[[/src]] Growth has been fast. Erebor reported $4.06 billion in deposits and $4.17 billion in cash at the end of June against just $77.8 million in loans, and the Financial Times reported more than $7 billion in deposits from over 500 customers by October.[[src:36]]Cryptopolitan, citing the Financial Times and Q2 2026 call report data, October 7th, 2026 · https://www.cryptopolitan.com/erebor-rebuilds-crypto-banking-on-7-billion-in-deposits-lends-only-78-million/[[/src]] Investors priced that at $4.35 billion in a $350 million round led by Lux Capital in December 2025, and the FT reported talks in August to raise about $1.5 billion at an $8 billion pre-money valuation.[[src:37]]AI Weekly, citing the Financial Times, "Palmer Luckey’s Erebor nears $1.5B raise at $8B valuation," August 2026 · https://aiweekly.co/alerts/palmer-luckeys-erebor-nears-15b-raise-at-8b-valuation[[/src]]',
    },
    {
      type: 'paragraph',
      text: 'The political questions are on the record too. Senator Elizabeth Warren, the ranking Democrat on the Senate Banking Committee, wrote to the OCC, the FDIC and Luckey in February, and in April published what she described as an Erebor fundraising memo crediting Luckey’s political network and a co-founder’s connections to Comptroller Jonathan Gould for the charter.[[src:38]]US Senate Banking Committee minority, "Warren deepens probe of seemingly corrupt approval of bank charter," April 2026 · https://www.banking.senate.gov/newsroom/minority/warren-deepens-probe-of-seemingly-corrupt-approval-of-bank-charter-for-trumps-billionaire-friends-in-silicon-valley[[/src]] Regulators also attached a hard cushion: Erebor must hold a Tier 1 leverage ratio of at least 12% for its first three years, and reported 38.81% in the second quarter.[[src:39]]Cryptopolitan, on the OCC approval conditions and Q2 2026 filings, October 7th, 2026 · https://www.cryptopolitan.com/erebor-rebuilds-crypto-banking-on-7-billion-in-deposits-lends-only-78-million/[[/src]] For this article’s question, Erebor cuts both ways. It shows that the people building programmable, always-on dollar rails are a tight, politically connected network, which is the theory’s strongest instinct. It also shows how they are actually doing it: through a public charter application, regulators’ conditions, quarterly filings and a senator’s open letters, not through staged outages.',
    },

    {
      type: 'heading',
      text: 'The Identity Layer: Who Gets Permission to Participate?',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'Every one of these rails has to know who is on it. That is where the next financial order is being decided most quietly, and it is the part of the theory’s fear with the most substance. In March, Treasury sent Congress the report the GENIUS Act required on new tools against illicit finance in digital assets, built around artificial intelligence, digital identity, blockchain analytics and application programming interfaces.[[src:111]]US Department of the Treasury, "Innovative Technologies to Counter Illicit Finance Involving Digital Assets," report to Congress, March 2026 · https://home.treasury.gov/system/files/246/GENIUS-Act-Illicit-Finance-Innovation-Congressional-Report-March-2026.pdf[[/src]] The report moved digital identity from the edge of Washington’s crypto policy to its center,[[src:112]]Biometric Update, "US Treasury’s crypto playbook puts digital identity at the center," March 2026 · https://www.biometricupdate.com/202603/us-treasurys-crypto-playbook-puts-digital-identity-at-the-center[[/src]] covering digital identity wallets, remote onboarding, biometric verification and defenses against deepfakes and synthetic identities.[[src:113]]Perkins Coie, "Treasury Releases 2026 Report on Technologies Countering Illicit Finance Involving Digital Assets," March 2026 · https://perkinscoie.com/insights/article/treasury-releases-2026-report-technologies-countering-illicit-finance-involving[[/src]]',
    },
    {
      type: 'paragraph',
      text: 'The rules for stablecoin issuers follow the same logic. A joint FinCEN and OFAC proposal from April would require every permitted issuer to run a full anti-money-laundering program and, for the first time in OFAC’s regulations, a formal sanctions compliance program.[[src:114]]Federal Register, "Permitted Payment Stablecoin Issuer Anti-Money Laundering/Countering the Financing of Terrorism Program and Sanctions Compliance Program Requirements," proposed rule, April 10th, 2026 · https://www.govinfo.gov/content/pkg/FR-2026-04-10/html/2026-06963.htm[[/src]] The agencies describe an issuer’s duty to block, freeze and reject transactions as applying mainly to sanctions.[[src:115]]Sullivan & Cromwell via CLS Blue Sky Blog, "FinCEN, OFAC Proposed Rule on Anti-Money Laundering and Sanctions-Compliance Requirements," May 7th, 2026 · https://clsbluesky.law.columbia.edu/2026/05/07/sullivan-cromwell-discusses-fincen-ofac-proposed-rule-on-anti-money-laundering-and-sanctions-compliance-requirements/[[/src]] Customer identification rules for issuers are left to a separate rulemaking, and Treasury proposed that the final rule take effect 12 months after it is issued.[[src:116]]Morrison Foerster, "Treasury Proposes New AML/CFT and Sanctions Obligations for Payment Stablecoin Issuers Under the GENIUS Act," May 2026 · https://www.mofo.com/resources/insights/260507-treasury-proposes-new-aml-cft-and-sanctions-obligations[[/src]] In plain terms, a regulated dollar stablecoin will be a dollar whose issuer can be required to stop it moving.',
    },
    {
      type: 'paragraph',
      text: 'On September 8th FinCEN and the bank regulators answered the identity question from the other side. Their joint FAQs say banks and credit unions may use state-issued mobile driver’s licenses and other government-issued verifiable digital credentials to verify customers under the Customer Identification Program rule,[[src:117]]Office of the Comptroller of the Currency, Bulletin 2026-44, "Frequently Asked Questions Regarding Treatment of Verifiable Digital Credentials Under the Customer Identification Program Rule," September 8th, 2026 · https://occ.gov/news-issuances/bulletins/2026/bulletin-2026-44.html[[/src]] the first time federal regulators have expressly confirmed that properly authenticated digital credentials can meet those requirements.[[src:118]]McDermott Will & Schulte, "Regulators clear path for verifiable digital credentials in customer identification," September 15th, 2026 · https://www.mcdermottlaw.com/insights/regulators-clear-path-for-verifiable-digital-credentials-in-customer-identification/[[/src]] The guidance does not require any bank to accept a digital ID and does not change existing obligations.[[src:119]]FinTech Global, "FinCEN clarifies use of mobile driver’s licences in bank onboarding," September 2026 · https://fintech.global/?p=260233[[/src]] Mobile licenses are now accepted in 21 states and Puerto Rico, but uptake among residents is low, and state officials say a key challenge is getting the wallet companies, Apple, Google and Samsung among them, to let the credentials be stored and used for verification.[[src:120]]Route Fifty, "Mobile IDs are an \'easy sell,\' but state leaders urge more education," September 2026 · https://www.route-fifty.com/emerging-tech/2026/09/mobile-ids-are-easy-sell-state-leaders-urge-more-education/415833/[[/src]]',
    },
    {
      type: 'paragraph',
      text: 'This is where the conditioning question has real teeth, with no need for a plot. If identity, money and compliance converge on a phone wallet, the gatekeepers to participation become the state that issues the credential, the platform that stores it, the bank or issuer that checks it and the agency that can order a freeze. None of those choices is hidden. They sit in Federal Register dockets, comment letters and wallet terms of service. The risk is that they are settled while public attention is on whether last week’s outage was staged. Who can be refused an account, on what evidence, and with what route to appeal are the questions that decide whether the new rails widen access or narrow it.',
    },
    { type: 'heading', text: 'The rings of power: the compute under AI-run finance', level: 2 },
    {
      type: 'paragraph',
      text: 'The identity and compliance layer will not run on paper. Treasury’s report expects banks and issuers to lean on artificial intelligence to screen customers and trace transactions, and HyperNormalisation’s account of Aladdin is a reminder that finance has long run on the biggest computers it can buy. As trading, compliance and customer service move onto AI systems, whoever controls the compute controls part of the financial system’s nervous system. That is why the people who forge and hold the chips belong in a story about money.',
    },
    {
      type: 'paragraph',
      text: 'Erebor is not the only name in this story borrowed from Tolkien. Erebor is the Lonely Mountain, the dwarves’ treasure-hall; Anduril is Aragorn’s sword; and [[person:peter-thiel]]Peter Thiel[[/person]], who co-founded Palantir, named it after the seeing-stones that let their holders watch distant events, then added Mithril Capital and Valar Ventures to the same map.[[src:50]]Business Insider, "Palmer Luckey named his latest company Erebor, a reference to The Lord of the Rings," 2025 · https://www.businessinsider.nl/palmer-luckey-named-his-latest-company-erebor-a-reference-to-the-lord-of-the-rings-here-are-the-other-tech-companies-inspired-by-the-fantasy-series/[[/src]][[src:51]]Newsweek, "Why tech billionaires love Middle-earth," February 2023 · https://www.newsweek.com/2023/02/10/why-tech-billionaires-love-middle-earth-1778694.html[[/src]] The book they keep returning to is about rings of power: gifts handed to the rulers of elves, dwarves and men that quietly bound every wearer to whoever forged the master ring. That is a better model for 2026 than a staged blackout. The theory is right that power is concentrating. It is looking at the wrong ring. The scarce, rationed, fought-over thing this year is not a token. It is compute: the chips, the data centers and the electricity that every frontier AI system needs, and the short list of people who decide who gets them.',
    },
    {
      type: 'paragraph',
      text: 'The forge is Nvidia. In the quarter ended October 25th it sold $115.8 billion of hardware, more than double a year earlier, $107.6 billion of it data center systems, and it had committed about $390 billion to suppliers for the years ahead.[[src:52]]StockAnalysis, "Nvidia’s Q3 revenue grows 103% to $115.8B," November 2026 · https://stockanalysis.com/news/nvda-q3-fy2027-earnings-beat/[[/src]][[src:53]]Inc., "Jensen Huang left Nvidia a $390 billion bet," November 2026 · https://www.inc.com/phil-rosen/jensen-huang-nvidia-390-billion-payoff/91438830[[/src]] For 33 years the forger was [[person:jensen-huang]]Jensen Huang[[/person]]. On November 12th, the first day of the outage run this article tests, he resigned as president, chief executive and director. Nvidia’s board had opened an independent investigation four days earlier after reports that he had an affair with an executive at Megaspeed, a Singapore company that bought billions of dollars of Nvidia chips and that US intelligence agencies reportedly concluded had passed information to China. The board said it had no reason to believe national security or Nvidia’s secrets had been compromised; chief financial officer Colette Kress is interim chief executive.[[src:54]]The San Francisco Standard, "Nvidia CEO Jensen Huang resigns," November 12th, 2026 · https://sfstandard.com/2026/11/12/nvidia-ceo-jensen-huang-resigns/[[/src]] Nothing ties his exit to the outages. It does show what the theory misses: the real single point of failure in American power is not a bank app, it is how much of the AI economy runs through one company and, until last week, one man.',
    },
    {
      type: 'paragraph',
      text: 'The rings also loop back to their maker, which is where the analogy bites. In September 2025 Nvidia signed a letter of intent to invest up to $100 billion in OpenAI as OpenAI deployed 10 gigawatts of Nvidia systems. It never became a contract. In February 2026 the two replaced it with a $30 billion equity stake in an OpenAI round priced at $730 billion before the new money, which drew open questions about [[kw:circular-financing]]circular financing[[/kw]], a supplier funding the customer that buys its product.[[src:55]]Finviz, "Nvidia pivots to $30 billion direct stake in OpenAI," February 19th, 2026 · https://finviz.com/news/316796/nvidia-pivots-to-30-billion-direct-stake-in-openai-decoupling-from-100b-milestone-plan-as-sam-altman-hopes-to-remain-gigantic-customer[[/src]] On August 10th Nvidia went further, signing memorandums with Apollo, BlackRock, Blackstone, Brookfield, Goldman Sachs and KKR to build platforms that would raise more than $500 billion of outside capital for its customers, with an option for Nvidia to backstop up to $125 billion of the deals.[[src:56]]Reuters via Investing.com, "Nvidia partners with Wall Street giants to raise $500 billion for AI buildout," August 10th, 2026 · https://www.investing.com/news/stock-market-news/wall-street-giants-partner-with-nvidia-on-500-billion-ai-financing-deal-ft-reports-4849929[[/src]] Critics read that as fencing buyers into one ecosystem, since the money stays tied to Nvidia hardware rather than rivals’.[[src:57]]Semafor, "Nvidia partners with lenders to finance AI infrastructure," August 10th, 2026 · https://www.semafor.com/article/08/10/2026/nvidia-partners-with-lenders-to-finance-ai-infrastructure[[/src]] Note who is on that list: the same BlackRock the theory casts as the villain, here acting in public as a lender to the chip trade.',
    },
    {
      type: 'callout',
      label: 'Outside capital Nvidia is lining up for its own customers',
      value: '$500B+',
      context:
        'Memorandums signed August 10th, 2026 with Apollo, BlackRock, Blackstone, Brookfield, Goldman Sachs and KKR, with an option for Nvidia to backstop up to $125 billion. The forger now helps finance the buyers of the rings.',
    },

    { type: 'heading', text: 'The ring-bearers: who rents, buys and builds', level: 3 },
    {
      type: 'paragraph',
      text: '[[person:sam-altman]]Sam Altman[[/person]] has said it plainly: "Everything starts with compute."[[src:58]]Axios, "Nvidia to invest up to $100B in ChatGPT creator OpenAI," September 22nd, 2025 · https://www.axios.com/2025/09/22/nvidia-openai-chatgpt-jensen-huang[[/src]] A year ago he put OpenAI’s infrastructure commitments at about $1.4 trillion over eight years, against annualized revenue of just over $20 billion, while saying OpenAI did not want government guarantees for its data centers.[[src:59]]Malay Mail, "OpenAI faces scrutiny as Sam Altman defends $1.4 trillion AI spending plans," November 7th, 2025 · https://www.malaymail.com/news/tech-gadgets/2025/11/07/openai-faces-scrutiny-as-sam-altman-defends-14-trillion-ai-spending-plans/197450[[/src]] The biggest single piece is a roughly $300 billion, five-year contract with Oracle for 4.5 gigawatts under the Stargate banner.[[src:60]]SiliconANGLE, "OpenAI confirms $300B Oracle compute deal," September 10th, 2025 · https://siliconangle.com/?p=710837[[/src]] That turned [[person:larry-ellison]]Larry Ellison[[/person]]’s Oracle into the most indebted of the builders: Reuters put its debt at $129.5 billion in August, with about $260 billion more promised in future data center leases.[[src:61]]International Business Times, citing Reuters, "Larry Ellison’s AI bet made him richer than Musk: then came Oracle’s $129.5B debt problem," August 2026 · https://www.ibtimes.co.uk/oracle-ai-expansion-high-stakes-gamble-1814508[[/src]] Oracle has said it will raise $45 billion to $50 billion this year, half of it through new shares.[[src:62]]Constellation Research, "Oracle to raise $45 billion to $50 billion in debt, equity for data center buildout," February 2026 · https://www.constellationr.com/insights/news/oracle-raise-45-billion-50-billion-debt-equity-data-center-buildout[[/src]]',
    },
    {
      type: 'paragraph',
      text: '[[person:mark-zuckerberg]]Mark Zuckerberg[[/person]] bought his way back to the table. Meta paid $14.3 billion for a stake in Scale AI in June 2025 and made its founder, [[person:alexandr-wang]]Alexandr Wang[[/person]], the company’s first chief AI officer, running Meta Superintelligence Labs.[[src:63]]Oman Observer, citing The New York Times, "Meta forecasts spending of $115 billion this year," January 2026 · https://www.omanobserver.om/ampArticle/1183509[[/src]] Meta now expects to spend $130 billion to $145 billion on capital projects in 2026,[[src:64]]Fortune, "How Alexandr Wang won Mark Zuckerberg’s trust, and a $100 billion-plus AI bet," October 17th, 2026 · https://fortune.com/2026/10/17/alexandr-wang-mark-zuckerberg-meta-superintelligence-labs-muse-wonder-ai-bet/[[/src]] much of it on clusters sized like power stations: Prometheus at about a gigawatt and Hyperion, planned to scale to five.[[src:65]]The Stack, "Meta’s AI bet," July 2025 · https://www.thestack.technology/meta-ai-bet-smallest-team-for-research/[[/src]] [[person:michael-intrator]]Michael Intrator[[/person]]’s CoreWeave is the landlord for everyone who cannot build fast enough. On November 10th it reported third-quarter revenue of $3.66 billion, up 168%, and a contracted backlog of about $132.5 billion, up from $104.2 billion three months earlier, while rising interest costs pushed it to a $709 million quarterly loss.[[src:66]]The Tech Capital, "CoreWeave revenue surges 168%; interest bill drives $709M loss," November 12th, 2026 · https://thetechcapital.com/coreweave-revenue-surges-168-interest-bill-709m-loss/[[/src]] Renting compute out by the gigawatt is a business only because the rings are rationed.',
    },
    {
      type: 'paragraph',
      text: '[[person:dario-amodei]]Dario Amodei[[/person]]’s Anthropic shows the other strategy: refuse to depend on a single forge. It trains and runs its Claude models on Amazon’s Trainium, Google’s TPUs and Nvidia GPUs, and in April it signed for about 3.5 gigawatts of Google TPU capacity through Broadcom from 2027, on top of the gigawatt it already had, as its run-rate revenue passed $30 billion.[[src:67]]Anthropic, "Anthropic expands partnership with Google and Broadcom for multiple gigawatts of next-generation compute," April 6th, 2026 · https://anthropic.com/news/google-broadcom-partnership-compute[[/src]][[src:68]]The Next Web, "Anthropic signs biggest compute deal yet with Google and Broadcom," April 7th, 2026 · https://thenextweb.com/news/anthropic-google-broadcom-compute-deal[[/src]] It is also the clearest case of what happens when a ring-bearer says no to the council. In March the Pentagon designated Anthropic a supply-chain risk, a label normally used for foreign adversaries, after Amodei refused contract terms over mass domestic surveillance and fully autonomous weapons; Anthropic said it would fight the designation in court.[[src:69]]The Washington Times, "Pentagon officially labels Anthropic, maker of Claude AI, a supply chain risk," March 5th, 2026 · https://m.washingtontimes.com/news/2026/mar/5/pentagon-officially-labels-anthropic-maker-claude-ai-supply-chain/[[/src]][[src:70]]Axios, "Pentagon blacklists Anthropic, labels AI company supply chain risk," March 2026 · https://www.axios.com/2026/03/04/anthropic-pentagon-supply-chain-risk-claude[[/src]]',
    },

    { type: 'heading', text: 'The forges: who owns the power', level: 3 },
    {
      type: 'paragraph',
      text: 'Chips are useless without electricity, and that is where the blackout rumors brush against something real. Data center demand has pushed capacity prices on PJM, the 13-state grid that runs from New Jersey to Chicago, up more than elevenfold since 2024, and PJM’s management has proposed that data centers either bring their own power or accept being remotely cut off at peak demand.[[src:71]]The Daily Record, "MD-based Constellation enters massive power deal with Google," October 6th, 2026 · https://thedailyrecord.com/2026/10/06/md-based-constellation-power-deal-google/[[/src]] The scarce electrons have owners. [[person:joe-dominguez]]Joe Dominguez[[/person]]’s Constellation is restarting Three Mile Island for Microsoft, sold Meta the entire output of its Clinton reactor for 20 years from June 2027,[[src:72]]Data Center Dynamics, "Meta signs 20-year PPA with Constellation for entire output of Illinois nuclear power plant," 2025 · https://www.datacenterdynamics.com/en/news/meta-signs-20-year-ppa-with-constellation-for-entire-output-of-illinois-nuclear-power-plant/[[/src]] and in October contracted 3,590 megawatts to Google, backed by $4.3 billion of reactor upgrades.[[src:73]]The Motley Fool, "Why Constellation Energy rallied today," October 6th, 2026 · https://www.fool.com/investing/2026/10/06/why-constellation-energy-rallied-today/[[/src]] [[person:jim-burke]]Jim Burke[[/person]]’s Vistra has 20-year nuclear contracts with Amazon for 1,200 megawatts at Comanche Peak in Texas and with Meta for 2,176 megawatts plus 433 megawatts of upgrades in Ohio and Pennsylvania.[[src:74]]Vistra Q4 2025 earnings call, via AOL, February 26th, 2026 · https://www.aol.com/articles/vistra-vst-q4-2025-earnings-170542621.html[[/src]]',
    },
    {
      type: 'paragraph',
      text: '[[person:bill-gates]]Bill Gates[[/person]] is building the next forge rather than renting an old one. His TerraPower won the first US construction permit for a new kind of commercial reactor in nearly a decade in March,[[src:75]]TechRepublic, "Bill Gates-backed TerraPower wins first US reactor construction permit in nearly a decade," March 6th, 2026 · https://www.techrepublic.com/article/news-bill-gates-terrapower-nuclear-reactor/[[/src]] and in January agreed with Meta to develop up to eight Natrium plants, about 2.8 gigawatts with storage that can push output to 4, the first as early as 2032.[[src:76]]GeekWire, "TerraPower signs deal with Meta for up to 8 reactors," January 9th, 2026 · https://www.geekwire.com/2026/seattle-area-nuclear-company-terrapower-signs-deal-with-meta-for-up-to-8-reactors/[[/src]] Then there is the money behind the forges. [[person:stephen-schwarzman]]Stephen Schwarzman[[/person]] told analysts in April that Blackstone had become the largest investor in AI-related infrastructure in the world, and by July its data center business carried a $185 billion value.[[src:77]]CoStar News, "Blackstone’s AI bets drive profit as investors weigh private-credit risks," April 23rd, 2026 · https://www.costar.com/article/939009075[[/src]][[src:78]]Commercial Observer, "Blackstone reports record AUM, strong earnings powered by data centers, AI," July 2026 · https://commercialobserver.com/2026/07/blackstone-reports-second-quarter-earnings-data-centers-ai/[[/src]] [[person:larry-fink]]Larry Fink[[/person]] said the Nvidia financing pact deepens BlackRock’s existing AI Infrastructure Partnership with the chipmaker.[[src:79]]HotHardware, "Nvidia rallies $500 billion Wall Street alliance to fuel AI expansion," August 11th, 2026 · https://hothardware.com/news/nvidia-rallies-500-billion-wall-street-alliance-fuel-ai-expansion[[/src]] And [[person:david-solomon]]David Solomon[[/person]]’s Goldman Sachs landed the lead role in placing Nvidia’s financing with investors after, by Solomon’s account, Huang brought the idea to the bank.[[src:80]]Benzinga via Webull, "Goldman Sachs courts investors to join Nvidia’s $500 billion AI financing initiative," August 14th, 2026 · https://www.webull.ca/news-detail/15400566844695552[[/src]] Solomon told analysts in October that studies put the US data center buildout above $10 trillion through 2032, about 3.6% of the economy every year.[[src:81]]PYMNTS, "Goldman Sachs CEO flags financing risk in AI buildout," October 13th, 2026 · https://www.pymnts.com/?p=4308296[[/src]]',
    },

    { type: 'heading', text: 'The council: who writes the rules for the rings', level: 3 },
    {
      type: 'paragraph',
      text: 'Washington decides where the rings may go and who pays for the forges. Energy Secretary [[person:chris-wright]]Chris Wright[[/person]] has put it bluntly: without enough energy, "there is no AI."[[src:82]]HPCwire, "‘Massively more energy’ needed to unleash AI, Energy Secretary Wright says," April 8th, 2026 · https://www.hpcwire.com/?p=190062[[/src]] He directed federal grid regulators to write a rule to connect large new loads faster,[[src:83]]Columbia University Center on Global Energy Policy, "How DOE’s announcement on data centers could impact the grid," 2025 · https://www.energypolicy.columbia.edu/?p=26930[[/src]] and argues that data centers are not what is driving up household bills and that tech companies want to pay for the new plants themselves.[[src:84]]Finviz, "Energy Secretary Wright defends data centers," January 20th, 2026 · https://finviz.com/news/280627/energy-secretary-wright-defends-data-centers-microsoft-google-want-to-pay-to-fix-grid-not-the-cause-of-rising-prices[[/src]] [[person:david-sacks]]David Sacks[[/person]] was the White House AI and crypto czar until March 26th, when he used up the 130 days a special government employee may serve; he now co-chairs the President’s Council of Advisors on Science and Technology, a body whose members include Huang and Zuckerberg.[[src:85]]Cointelegraph, "David Sacks’ 130-day term as Trump’s crypto and AI czar has ended," March 2026 · https://cointelegraph.com/news/david-sacks-crypto-ai-czar-job-ends-takes-on-new-role[[/src]] Sacks backed letting Nvidia sell its older H200 chips to China, then said in December that China was rejecting them in favor of its own semiconductors.[[src:86]]Business Standard, citing Bloomberg, "China rejecting Nvidia’s H200 chips, pushing for self-reliance: Sacks," December 2025 · https://www.business-standard.com/world-news/china-rejecting-nvidia-s-h200-chips-pushing-for-self-reliance-sacks-125121300101_1.html[[/src]] A second forge is now lit: Nvidia’s outlook assumes no data center sales in China at all, while Huawei expects about $12 billion of AI chip revenue this year.[[src:87]]Tom’s Hardware, "Huawei expects $12 billion in AI chip revenue this year as Nvidia’s China market share hits zero," 2026 · https://www.tomshardware.com/tech-industry/huawei-expects-12-billion-in-ai-chip-revenue-this-year-as-nvidias-china-market-share-hits-zero[[/src]]',
    },
    {
      type: 'paragraph',
      text: 'The Tolkien network sits at the edge of the council. [[person:alex-karp]]Alex Karp[[/person]]’s Palantir reported third-quarter revenue of $2.31 billion, up 96%, as its US commercial sales passed its US government sales for the first time, and Karp now sells what he calls sovereign AI to governments and companies that want models under their own control.[[src:88]]Palantir via Business Wire, third-quarter 2026 results, November 2nd, 2026 · https://finviz.com/news/413533/palantir-reports-q3-2026-us-comm-revenue-growth-of-148-yy-and-revenue-growth-of-96-yy-raises-fy-2026-revenue-guidance-to-91-yy-growth-and-us-comm-revenue-guidance-to-143-yy-crushing-consensus-expectations[[/src]] [[person:palmer-luckey]]Palmer Luckey[[/person]]’s Anduril closed a $5 billion round at a $61 billion valuation in May to fund Arsenal-1, its weapons factory in Ohio.[[src:89]]The Next Web, "Anduril raises $5bn at $61bn valuation," May 2026 · https://thenextweb.com/news/anduril-5bn-raise-61bn-valuation[[/src]] Thiel himself has played both sides of the forge: his hedge fund sold all 537,742 of its Nvidia shares in the third quarter of 2025,[[src:90]]Fortune, "Peter Thiel dumped Nvidia and invested $45 million into Microsoft and Apple," March 10th, 2026 · https://fortune.com/2026/03/10/peter-thiel-nvidia-shares-sold-apple-microsoft-ai-bubble/[[/src]] while Founders Fund concentrated its bets on OpenAI, the data center builder Crusoe and the nuclear fuel startup General Matter.[[src:91]]The Information, "Founders Fund shifts from caution to concentrated bets on AI," 2025 · https://feature.theinformation.com/articles/founders-fund-shifts-caution-concentrated-bets-ai[[/src]]',
    },
    {
      type: 'paragraph',
      text: 'Read as a map rather than a plot, the rings of power explain more than the outage theory does. Every ring here was handed out in the open: in earnings calls, contracts filed with the SEC, power purchase agreements and press releases. What the map shows is concentration. One company forges most of the chips, a handful of labs and clouds hold most of them, a few utilities own the reactors they plug into, the same handful of financiers keep turning up in the deals, and a small council of officials and advisers, some of them chip and platform chiefs themselves, decides where the rings may travel. Tolkien’s warning was never that the rings were secret. It was that accepting one bound the wearer to the forger. The questions worth pressing in 2026 follow from that: who gets compute when there is not enough, who carries the debt if the demand forecasts are wrong, and who pays for the power plants when a data center and a household want the same electrons.',
    },

    { type: 'heading', text: 'The real risk: money that obeys rules', level: 2 },
    {
      type: 'paragraph',
      text: 'The theory’s strongest point is not about outages at all. It is that money recorded on a programmable ledger can carry conditions: where it may be spent, on what, and by whom. That risk does not require tokens. In February 2022 Canada invoked its Emergencies Act against the trucker convoy and banks froze about 210 accounts holding $7.8 million.[[src:40]]CBC News, "Most bank accounts frozen under the Emergencies Act are being released, committee hears," March 2022 · https://www.cbc.ca/amp/1.6360769[[/src]] The finance minister said banks could freeze accounts without a court order.[[src:41]]Banking Bureau, "Canada’s plow through financial freedom stopped convoy," 2022 · https://bankingbureau.substack.com/p/canadas-plow-through-financial-freedom[[/src]] Programmable money would make that kind of switch faster, more granular and harder to see, which is why the design and the law around it matter more than the technology.',
    },
    {
      type: 'paragraph',
      text: 'The "you wake up to a $0 balance" scenario also has a real precedent, and it was not a cyberattack. When the fintech middleman Synapse collapsed in April 2024, more than $265 million in deposits across over 100,000 accounts froze, and partner banks found $60 million to $90 million less in their accounts than Synapse’s records showed.[[src:42]]CFPB statement via PYMNTS, "CFPB sues Synapse," 2025 · https://www.pymnts.com/?p=2953302[[/src]] The cause was bad recordkeeping between ledgers, the opposite of the theory’s mechanism. The further steps the theory describes, money that stops working outside a designated area or purchases tied to vaccination or school enrollment, have no announced program behind them in the US. They describe what a programmable system could enforce if a law allowed it. Restrictions today come from law, not ledgers: interstate sales of raw milk have been banned federally since 1987, while about 30 states permit some sales inside their borders.[[src:43]]LegallyExplained, "Is it legal to sell raw milk?" 2026 · https://legallyexplained.com/is-it-legal-to-sell-raw-milk/[[/src]]',
    },
    {
      type: 'paragraph',
      text: 'Curtis came at this risk from another angle. In the early 1990s, the film recounts, two New York hackers broke into the credit database of TRW, a company that had built Cold War military systems and then turned its computers to tracking consumer debt, and published the credit file of the internet utopian John Perry Barlow to show how much the new financial networks already knew about ordinary people. Programmable money would extend that knowledge from what a person owes to what a person is allowed to spend. The safeguards that matter are unglamorous: who may attach a rule to a balance, who audits those rules, and how a customer appeals one within hours rather than through a bankruptcy court, which is where Synapse’s 100,000-plus account holders ended up.',
    },

    { type: 'heading', text: 'Where US law stands on a digital dollar', level: 2 },
    {
      type: 'paragraph',
      text: 'On the government side the record points the other way from the theory. Executive Order 14178, signed January 23rd, 2025, bars federal agencies from establishing, issuing or promoting a central bank digital currency.[[src:44]]Orrick, "President Trump issues executive order on digital financial technology," January 31st, 2025 · https://infobytes.orrick.com/2025-01-31/president-trump-issues-executive-order-on-digital-financial-technology/[[/src]] The House passed the Anti-CBDC Surveillance State Act 219 to 210 on July 17th, 2025 and sent it to the Senate attached to another bill on April 29th, 2026.[[src:45]]Crypto Briefing, "Tom Emmer calls CBDC the ‘ultimate surveillance tool’," 2026 · https://cryptobriefing.com/tom-emmer-cbdc-surveillance-tool/[[/src]] The Senate then voted 85 to 5 on June 22nd, 2026 for a housing package that bars the Federal Reserve from issuing a digital currency through December 31st, 2030.[[src:46]]TFTC, "Senate passes 85-5 CBDC ban inside housing bill," June 23rd, 2026 · https://www.tftc.io/cbdc-ban-senate-85-5-housing-bill-four-year-sunset/[[/src]] The two chambers have not yet sent one bill to the president, so the executive order is what holds the line today, and a future president could reverse it.',
    },
    {
      type: 'paragraph',
      text: 'That leaves the American version of tokenized money in private hands: dollar stablecoins regulated under the GENIUS Act, and banks experimenting with tokenized deposits.[[src:47]]crypto.news, "Crypto executive orders: what the White House has actually ordered," July 2026 · https://crypto.news/us/crypto-executive-order/[[/src]] Private issuers can already freeze tokens at specific addresses to comply with sanctions and court orders, so the place to watch for programmable controls is the rulebook those issuers and banks operate under, not a hidden plot. Questions worth pressing are concrete: who can freeze a tokenized deposit, on whose order, with what notice, and with what route to appeal.',
    },
    {
      type: 'callout',
      label: 'Incidents in Fig. 1 with a hostile attacker on record',
      value: '1 of 7',
      context:
        'Only the Binance theft involved a hostile human attacker, attributed by the FBI to North Korea. The four November US outages each have an operator-stated technical cause, with Workday’s still preliminary.',
    },

    {
      type: 'heading',
      text: 'The Rulemakers: Who Decides What the New Financial System Can Become?',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'If the builders decide what is possible, a short list of officials decides what is allowed. At the SEC, Chairman [[person:paul-atkins]]Paul Atkins[[/person]] proposed Regulation Crypto Assets on August 18th, a tailored offering regime for crypto investment contracts, with comments due October 20th.[[src:121]]KPMG, "SEC proposal: Regulation Crypto Assets," August 2026 · https://kpmg.com/us/en/frv/reference-library/2026/sec-proposal-regulation-crypto-assets.html[[/src]] On September 17th the SEC issued its "Innovation Exemption," five years of conditional relief for permissioned onchain trading of tokenized stocks, which Atkins called a bridge toward durable rulemaking after market-structure legislation stalled in the Senate.[[src:122]]Cooley, "Permission to Innovate: SEC Carves Out Path for On-Chain Stock Trading," September 22nd, 2026 · https://www.cooley.com/news/insight/2026/2026-09-22-permission-to-innovate-sec-carves-out-path-for-on-chain-stock-trading[[/src]] At the CFTC, Chairman [[person:michael-selig]]Michael Selig[[/person]], sworn in on December 22nd, 2025, came from the SEC, where he was chief counsel of its crypto task force.[[src:123]]Commodity Futures Trading Commission, "Michael Selig Sworn In as 16th CFTC Chairman," December 22nd, 2025 · https://www.cftc.gov/PressRoom/PressReleases/9164-25[[/src]]',
    },
    {
      type: 'paragraph',
      text: 'The money rules run through the banking agencies and Treasury. Comptroller [[person:jonathan-gould]]Jonathan Gould[[/person]]’s OCC became the first agency to finalize its GENIUS Act rule on October 21st, and the rule and the law take effect on January 18th, 2027.[[src:124]]Office of the Comptroller of the Currency, "OCC Advances U.S. Digital Asset Leadership with Final Rule to Implement GENIUS Act," News Release 2026-92, October 21st, 2026 · https://occ.gov/news-issuances/news-releases/2026/nr-occ-2026-92.html[[/src]] Treasury Secretary [[person:scott-bessent]]Scott Bessent[[/person]] praised it. The final version left room for third parties to offer yield-like rewards on stablecoins, judged case by case, which is the change banks fear will pull deposits away from them.[[src:125]]American Banker, "OCC leaves room for stablecoin yield maneuvers in final rule," October 2026 · https://www.americanbanker.com/news/occ-leaves-room-for-stablecoin-yield-maneuvers-in-final-rule[[/src]] The Federal Reserve, chaired since May 22nd by [[person:kevin-warsh]]Kevin Warsh[[/person]],[[src:126]]Brookings, "Who has to leave the Federal Reserve next?" 2026 · https://www.brookings.edu/opinions/who-has-to-leave-the-federal-reserve-next/[[/src]] proposed its own GENIUS framework on September 24th, and Treasury issued an interim final rule for the committee that certifies state stablecoin regimes on September 30th.[[src:127]]Willkie Farr & Gallagher, "Final Pieces to the Stablecoin Puzzle? Federal Reserve and Treasury Propose GENIUS Act Framework," October 5th, 2026 · https://www.willkie.com/publications/2026/10/final-pieces-to-the-stablecoin-puzzle-federal-reserve-and-treasury-propose-genius-act[[/src]] The FDIC proposed standards in April for stablecoin issuers owned by the banks it supervises.[[src:128]]Federal Deposit Insurance Corporation, "FDIC Approves Proposal to Implement GENIUS Act Requirements and Standards," April 7th, 2026 · https://www.fdic.gov/news/press-releases/2026/fdic-approves-proposal-implement-genius-act-requirements-and-standards[[/src]] FinCEN and OFAC, both inside Treasury, write the anti-money-laundering and sanctions rules described in the identity section.',
    },
    {
      type: 'paragraph',
      text: 'Congress holds the bigger levers. In the Senate, Banking Committee Chairman [[person:tim-scott]]Tim Scott[[/person]] championed the GENIUS Act,[[src:129]]House Committee on Financial Services, "Crypto Week" announcement with statement from Senate Banking Chairman Tim Scott, July 2025 · https://financialservices.house.gov/news/documentsingle.aspx?DocumentID=410793[[/src]] and ranking Democrat [[person:elizabeth-warren]]Elizabeth Warren[[/person]] has pressed regulators over Erebor’s charter, as described above. In the House, Financial Services Chairman [[person:french-hill]]French Hill[[/person]] and [[person:bryan-steil]]Bryan Steil[[/person]], who chairs its subcommittee on digital assets, financial technology and artificial intelligence,[[src:130]]House Committee on Financial Services, "Subcommittee on Digital Assets, Financial Technology, and Artificial Intelligence," 119th Congress · https://financialservices.house.gov/119th-congress-subcommittees/subcommittee-on-digital-assets-financial-technology-and-artificial-intelligence.htm[[/src]] drove the market-structure bill. That bill, the CLARITY Act, passed the House in July 2025 but failed a Senate procedural vote 49 to 50 on September 15th, 2026; passage in this Congress is now widely seen as unlikely, and CFTC staff have kept issuing their own crypto guidance in the meantime.[[src:131]]Orrick, "The CLARITY Act Stalls in the Senate: What’s Next for Digital Asset Regulation," October 2nd, 2026 · https://www.orrick.com/en/Insights/2026/10/The-CLARITY-Act-Stalls-in-the-Senate-Whats-Next-for-Digital-Asset-Regulation[[/src]] The GENIUS Act, signed on July 18th, 2025, is unaffected.[[src:132]]FinTech Weekly, "What Is the CLARITY Act? Digital Asset Market Structure Explained," updated September 26th, 2026 · https://www.fintechweekly.com/news/what-is-the-clarity-act-digital-asset-market-structure-explained-2026[[/src]]',
    },
    {
      type: 'paragraph',
      text: 'The compute and power behind AI-run finance answer to a different council. Energy Secretary Chris Wright asked federal grid regulators to take up large-load interconnection, and on June 18th FERC ordered the six regional grid operators it oversees to improve and speed up how data centers and other large users connect.[[src:133]]Linklaters, "FERC orders data center integration reforms," June 2026 · https://www.linklaters.com/insights/publications/2026/june/ferc-orders-data-center-integration-reforms[[/src]] The Nuclear Regulatory Commission licenses the reactors the AI companies are contracting for, state public utility commissions decide who pays for new plants and wires on household bills, and the Commerce Department’s export controls decide where the most advanced chips may go. [[person:david-sacks]]David Sacks[[/person]] appears often in this story, but his current role is advisory: he co-chairs the President’s Council of Advisors on Science and Technology, which advises the president and has no power to write binding rules. Figure 5 maps the policies that matter, who holds the pen and what each could change for the builders in Figure 4.',
    },
    {
      type: 'dossier-table',
      figureLabel: 'FIG. 5 · THE POLICIES THAT COULD RESHAPE THE NEXT FINANCIAL ORDER',
      kicker: 'EACH POLICY × ITS STATUS, WHO HOLDS THE PEN AND WHAT COMES NEXT · OPEN A DOSSIER FOR THE MECHANISM, THE VERTICALS AND COMPANIES EXPOSED, THE UPSIDE, THE DOWNSIDE AND THE SOURCE.',
      hint: 'Proposed rules can change before they are final. Upside and downside describe mechanisms, not predictions.',
      source: 'OCC, FDIC, Federal Reserve, FinCEN, OFAC, SEC, CFTC and FERC releases; Federal Register; law-firm analyses (Orrick, Cooley, Willkie, Morrison Foerster, Linklaters); FinTech Weekly. Current to November 21st, 2026.',
      headers: [
        'Policy',
        'Status',
        'Who holds the pen',
        'Next milestone',
        '',
      ],
      rows: [
        {
          name: 'GENIUS Act',
          tag: 'Law',
          role: 'Signed July 18th, 2025',
          anchor: 'Congress; carried out by the OCC, Fed, FDIC, NCUA and Treasury',
          keyRisk: 'Takes effect January 18th, 2027',
          dossier: [
            {
              label: 'Status',
              text: 'Law, with implementing rules being finalized.',
            },
            {
              label: 'Authority',
              text: 'Federal statute.',
            },
            {
              label: 'Policymakers',
              text: 'Senate Banking (Tim Scott), House Financial Services (French Hill); Treasury (Scott Bessent).',
            },
            {
              label: 'How it reaches companies',
              text: 'Only permitted issuers may offer payment stablecoins to Americans; reserve, redemption and capital rules apply; issuers may not pay yield.',
            },
            {
              label: 'Verticals',
              text: 'Stablecoin issuers; payment networks; banks.',
            },
            {
              label: 'Companies exposed',
              text: 'Circle, Paxos, Bridge and banks with issuing subsidiaries; Visa as a settler.',
            },
            {
              label: 'Upside',
              text: 'Legal certainty draws banks, card networks and corporates in.',
            },
            {
              label: 'Downside',
              text: 'The yield ban squeezes issuers when rates fall, and compliance costs favor large incumbents.',
            },
            {
              label: 'Next milestone',
              text: 'Effective January 18th, 2027; issuer applications follow.',
            },
            {
              label: 'Source',
              text: 'FinTech Weekly, September 26th, 2026; OCC, October 21st, 2026.',
            },
          ],
        },
        {
          name: 'OCC GENIUS rule',
          tag: 'Final',
          role: 'Final, October 21st, 2026',
          anchor: 'OCC (Jonathan Gould)',
          keyRisk: 'Effective January 18th, 2027; first charter decisions',
          dossier: [
            {
              label: 'Status',
              text: 'Final, the first agency rule completed.',
            },
            {
              label: 'Authority',
              text: 'OCC rulemaking under the GENIUS Act.',
            },
            {
              label: 'Policymakers',
              text: 'Comptroller Jonathan Gould.',
            },
            {
              label: 'How it reaches companies',
              text: 'Sets reserve, redemption, capital and custody standards for issuers under the OCC, and reviews third-party yield-like rewards case by case.',
            },
            {
              label: 'Verticals',
              text: 'Stablecoin issuers; national banks and trust banks.',
            },
            {
              label: 'Companies exposed',
              text: 'Paxos, Circle, Bridge, national banks.',
            },
            {
              label: 'Upside',
              text: 'A working framework before the law takes effect, likely to guide the other agencies.',
            },
            {
              label: 'Downside',
              text: 'Banks object that rewards paid through third parties could pull deposits away.',
            },
            {
              label: 'Next milestone',
              text: 'Applications processed from 2027.',
            },
            {
              label: 'Source',
              text: 'OCC News Release 2026-92, October 21st, 2026; American Banker, October 2026.',
            },
          ],
        },
        {
          name: 'Fed and FDIC GENIUS proposals',
          tag: 'Proposed',
          role: 'FDIC April 7th, 2026; Fed September 24th, 2026',
          anchor: 'Federal Reserve (Kevin Warsh); FDIC board',
          keyRisk: 'Final rules',
          dossier: [
            {
              label: 'Status',
              text: 'Proposed.',
            },
            {
              label: 'Authority',
              text: 'Fed and FDIC rulemaking under the GENIUS Act.',
            },
            {
              label: 'Policymakers',
              text: 'Fed Chair Kevin Warsh; the FDIC board.',
            },
            {
              label: 'How it reaches companies',
              text: 'Standards and application procedures for stablecoin issuers owned by state member banks and FDIC-supervised banks.',
            },
            {
              label: 'Verticals',
              text: 'Banks; stablecoin issuers.',
            },
            {
              label: 'Companies exposed',
              text: 'Bank holding companies weighing their own coins.',
            },
            {
              label: 'Upside',
              text: 'Opens a bank-owned stablecoin path.',
            },
            {
              label: 'Downside',
              text: 'Differences between agencies could favor one type of charter over another.',
            },
            {
              label: 'Next milestone',
              text: 'Final rules from each agency.',
            },
            {
              label: 'Source',
              text: 'FDIC, April 7th, 2026; Willkie Farr & Gallagher, October 5th, 2026.',
            },
          ],
        },
        {
          name: 'FinCEN and OFAC stablecoin rule',
          tag: 'Proposed',
          role: 'Proposed April 8th, 2026; comments closed June 9th',
          anchor: 'Treasury: FinCEN and OFAC',
          keyRisk: 'Final rule, effective 12 months after issuance',
          dossier: [
            {
              label: 'Status',
              text: 'Proposed.',
            },
            {
              label: 'Authority',
              text: 'Bank Secrecy Act and sanctions authorities, as directed by the GENIUS Act.',
            },
            {
              label: 'Policymakers',
              text: 'Treasury Secretary Scott Bessent’s department: FinCEN and OFAC.',
            },
            {
              label: 'How it reaches companies',
              text: 'A full anti-money-laundering program and a formal sanctions program for every permitted issuer, including the ability to block, freeze and reject transactions, mainly for sanctions.',
            },
            {
              label: 'Verticals',
              text: 'Stablecoin issuers; identity and compliance vendors.',
            },
            {
              label: 'Companies exposed',
              text: 'Circle, Paxos, Bridge; blockchain analytics and identity firms.',
            },
            {
              label: 'Upside',
              text: 'A clear compliance bar, and demand for analytics and identity tools.',
            },
            {
              label: 'Downside',
              text: 'Higher fixed costs; freeze powers raise privacy and due-process questions.',
            },
            {
              label: 'Next milestone',
              text: 'Final rule; customer identification rules in a separate rulemaking.',
            },
            {
              label: 'Source',
              text: 'Federal Register, April 10th, 2026; Morrison Foerster, May 2026.',
            },
          ],
        },
        {
          name: 'Digital ID guidance for banks',
          tag: 'Guidance',
          role: 'Issued September 8th, 2026',
          anchor: 'FinCEN with the Fed, FDIC, OCC and NCUA',
          keyRisk: 'Bank adoption; issuer customer ID rules',
          dossier: [
            {
              label: 'Status',
              text: 'Guidance in force.',
            },
            {
              label: 'Authority',
              text: 'Interpretation of the Customer Identification Program rule; no new obligations.',
            },
            {
              label: 'Policymakers',
              text: 'FinCEN and the staffs of the bank regulators.',
            },
            {
              label: 'How it reaches companies',
              text: 'Confirms banks may verify customers with state mobile licenses and other government digital credentials.',
            },
            {
              label: 'Verticals',
              text: 'Digital identity; banks; phone wallets.',
            },
            {
              label: 'Companies exposed',
              text: 'Apple, Google and Samsung wallets; state DMVs; banks.',
            },
            {
              label: 'Upside',
              text: 'Faster, cheaper remote onboarding and fewer fake IDs.',
            },
            {
              label: 'Downside',
              text: 'Concentrates gatekeeping in wallet platforms; public uptake is still low.',
            },
            {
              label: 'Next milestone',
              text: 'How many banks accept digital credentials, and on what terms.',
            },
            {
              label: 'Source',
              text: 'OCC Bulletin 2026-44, September 8th, 2026; FinTech Global, September 2026.',
            },
          ],
        },
        {
          name: 'CLARITY Act',
          tag: 'Stalled',
          role: 'Passed House July 2025; failed Senate cloture 49 to 50, September 15th, 2026',
          anchor: 'Congress (French Hill, Bryan Steil; Senate Banking and Agriculture)',
          keyRisk: 'Lame-duck session or a new Congress',
          dossier: [
            {
              label: 'Status',
              text: 'Stalled in the Senate; not formally dead.',
            },
            {
              label: 'Authority',
              text: 'Federal legislation.',
            },
            {
              label: 'Policymakers',
              text: 'French Hill and Bryan Steil in the House; Senate Banking and Agriculture committees.',
            },
            {
              label: 'How it reaches companies',
              text: 'Would split crypto oversight between the CFTC for digital commodities and the SEC for securities.',
            },
            {
              label: 'Verticals',
              text: 'Tokenization platforms; exchanges; token issuers.',
            },
            {
              label: 'Companies exposed',
              text: 'Securitize and crypto exchanges; stablecoin issuers indirectly.',
            },
            {
              label: 'Upside',
              text: 'Statutory certainty for tokens that are not securities.',
            },
            {
              label: 'Downside',
              text: 'Without it, agency policy can be reversed by a future commission.',
            },
            {
              label: 'Next milestone',
              text: 'Depends on the post-midterm calendar.',
            },
            {
              label: 'Source',
              text: 'Orrick, October 2nd, 2026; FinTech Weekly, September 26th, 2026.',
            },
          ],
        },
        {
          name: 'SEC Innovation Exemption',
          tag: 'In force',
          role: 'Issued September 17th, 2026; expires September 17th, 2031',
          anchor: 'SEC (Paul Atkins)',
          keyRisk: 'Comment review; permanent tokenized-trading rules',
          dossier: [
            {
              label: 'Status',
              text: 'In force, temporary and conditional.',
            },
            {
              label: 'Authority',
              text: 'SEC exemptive authority under the Exchange Act.',
            },
            {
              label: 'Policymakers',
              text: 'Chairman Paul Atkins.',
            },
            {
              label: 'How it reaches companies',
              text: 'Lets qualifying tokenized securities venues run permissioned onchain trading of tokenized stocks through automated market makers, under conditions.',
            },
            {
              label: 'Verticals',
              text: 'Tokenization platforms; market infrastructure; broker-dealers.',
            },
            {
              label: 'Companies exposed',
              text: 'Securitize; DTCC participants; broker-dealers.',
            },
            {
              label: 'Upside',
              text: 'Legal room to trade tokenized shares onchain.',
            },
            {
              label: 'Downside',
              text: 'Temporary, and limited to automated market makers rather than order books.',
            },
            {
              label: 'Next milestone',
              text: 'Possible permanent rules.',
            },
            {
              label: 'Source',
              text: 'Cooley, September 22nd, 2026.',
            },
          ],
        },
        {
          name: 'Regulation Crypto Assets',
          tag: 'Proposed',
          role: 'Proposed August 18th, 2026; comments closed October 20th',
          anchor: 'SEC (Paul Atkins)',
          keyRisk: 'Final rule',
          dossier: [
            {
              label: 'Status',
              text: 'Proposed.',
            },
            {
              label: 'Authority',
              text: 'SEC rulemaking under the Securities Act.',
            },
            {
              label: 'Policymakers',
              text: 'Chairman Paul Atkins.',
            },
            {
              label: 'How it reaches companies',
              text: 'Creates tailored offering exemptions and disclosure rules for crypto investment contracts.',
            },
            {
              label: 'Verticals',
              text: 'Token issuers; tokenization platforms.',
            },
            {
              label: 'Companies exposed',
              text: 'Crypto projects raising capital; platforms that list them.',
            },
            {
              label: 'Upside',
              text: 'A defined path to raise money without a full registration.',
            },
            {
              label: 'Downside',
              text: 'Agency rules can be rewritten by a future commission.',
            },
            {
              label: 'Next milestone',
              text: 'Final rule.',
            },
            {
              label: 'Source',
              text: 'KPMG, August 2026.',
            },
          ],
        },
        {
          name: 'Limits on a Fed digital dollar',
          tag: 'Executive order',
          role: 'Executive Order 14178 in force; House and Senate bans passed separately',
          anchor: 'The president; Congress',
          keyRisk: 'One bill sent to the president',
          dossier: [
            {
              label: 'Status',
              text: 'The executive order holds; the bills are not reconciled.',
            },
            {
              label: 'Authority',
              text: 'Executive order; pending legislation.',
            },
            {
              label: 'Policymakers',
              text: 'The president; House and Senate leaders.',
            },
            {
              label: 'How it reaches companies',
              text: 'Bars federal agencies from issuing or promoting a central bank digital currency, which leaves tokenized dollars to private issuers and banks.',
            },
            {
              label: 'Verticals',
              text: 'Stablecoins; bank deposit tokens.',
            },
            {
              label: 'Companies exposed',
              text: 'Circle, Paxos, JPMorgan, BNY.',
            },
            {
              label: 'Upside',
              text: 'Removes a public competitor to private tokens.',
            },
            {
              label: 'Downside',
              text: 'A future president could reverse the order.',
            },
            {
              label: 'Next milestone',
              text: 'Whether Congress sends one bill to the president.',
            },
            {
              label: 'Source',
              text: 'Sources cited in "Where US law stands on a digital dollar."',
            },
          ],
        },
        {
          name: 'FERC large-load orders',
          tag: 'Orders issued',
          role: 'Show-cause orders June 18th, 2026',
          anchor: 'FERC; requested by the Department of Energy (Chris Wright)',
          keyRisk: 'Tariff changes at each grid operator',
          dossier: [
            {
              label: 'Status',
              text: 'Orders issued; grid operators responded in August.',
            },
            {
              label: 'Authority',
              text: 'Federal Power Act.',
            },
            {
              label: 'Policymakers',
              text: 'FERC commissioners; Energy Secretary Chris Wright.',
            },
            {
              label: 'How it reaches companies',
              text: 'Pushes the six regional grid operators to speed up and standardize how data centers connect, while protecting other customers from the costs.',
            },
            {
              label: 'Verticals',
              text: 'AI compute and power.',
            },
            {
              label: 'Companies exposed',
              text: 'Constellation, Vistra and data center developers and their tenants.',
            },
            {
              label: 'Upside',
              text: 'Faster grid hookups for AI campuses.',
            },
            {
              label: 'Downside',
              text: 'Fights over who pays, households or data centers.',
            },
            {
              label: 'Next milestone',
              text: 'FERC rulings on each operator’s response.',
            },
            {
              label: 'Source',
              text: 'Linklaters, June 2026.',
            },
          ],
        },
        {
          name: 'AI chip export controls',
          tag: 'In force',
          role: 'Licensing of advanced chips to China, shifting since 2025',
          anchor: 'Commerce Department; the White House',
          keyRisk: 'License decisions; China demand',
          dossier: [
            {
              label: 'Status',
              text: 'In force, and changing.',
            },
            {
              label: 'Authority',
              text: 'Export Administration Regulations.',
            },
            {
              label: 'Policymakers',
              text: 'The Commerce Department and the White House; advisers such as David Sacks have argued positions but do not write the rules.',
            },
            {
              label: 'How it reaches companies',
              text: 'Decides where the most advanced chips may be sold, shaping who can build AI capacity.',
            },
            {
              label: 'Verticals',
              text: 'AI compute.',
            },
            {
              label: 'Companies exposed',
              text: 'Nvidia; Chinese rivals such as Huawei.',
            },
            {
              label: 'Upside',
              text: 'Licenses can reopen a large market.',
            },
            {
              label: 'Downside',
              text: 'Nvidia’s outlook assumes no data center sales in China, and Huawei is filling the gap.',
            },
            {
              label: 'Next milestone',
              text: 'License decisions.',
            },
            {
              label: 'Source',
              text: 'Sources cited in the rings of power section.',
            },
          ],
        },
      ],
    },
    {
      type: 'paragraph',
      text: 'Two cautions apply to everything in this section. Lobbying spending, campaign donations and meetings show access, not outcomes: a rule can match an industry’s wishes because its arguments were good, because the politics shifted or because of influence, and the record rarely proves which. And none of these officials controls the others. The SEC, the CFTC, the Fed, the OCC, the FDIC, Treasury, Congress and the states pull in different directions, which is one reason the new rails are arriving piecemeal rather than by design.',
    },
    { type: 'heading', text: 'The Verdict: Who Builds the Next Financial Order, and Who Sets Its Rules?', level: 2 },
    {
      type: 'heading',
      text: 'A. The conclusion',
      level: 3,
    },
    {
      type: 'paragraph',
      text: 'Put together, the evidence supports a less cinematic story. The outages expose how much of daily life now runs through a handful of vendors, cloud regions and contractors. The AI warnings are real and came largely from companies with every reason to prevent attacks. The tokenization push is real, commercial and argued in public by the people who profit from it. None of that needs coordination to explain it, and the coordination claim has no supporting evidence today. What is not in doubt is that a new financial layer is being built quickly, mostly by incumbents rather than insurgents, under rules that are still being written. The scenarios below lay out how tokenized money could arrive, and the rest of this verdict names who is building it and who decides.',
    },
    {
      type: 'paragraph',
      text: 'This is where HyperNormalisation is most useful, and where it misleads if it is read as a script. Curtis’s case is that the systems built since 1975 hold their power in plain sight, in risk models, credit files and recommendation feeds, while public attention goes to cartoon villains. The November theory does the reverse of what it believes it is doing: it takes a real, documented and slow shift toward programmable finance and turns it into a cinematic plot with three named villains, exactly the kind of simple story the film warns against. The more useful habit is the dull one: read the incident reports, follow the charters and the 13F filings, and judge the 2026 to 2030 rollout on the record rather than on the mood.',
    },
    {
      type: 'scenario-chain',
      figureLabel: 'FIG. 6 · THREE WAYS TOKENIZED MONEY ARRIVES',
      kicker:
        'BASE VS. ACCELERATED VS. THE THEORY AS STATED · EACH ROW IS A CHAIN OF CONDITIONS THAT MUST ALL HOLD · NO PROBABILITIES ASSIGNED; WATCH THE KILL SWITCH.',
      hint: 'Each step is a condition; the bottom row needs evidence that does not exist yet.',
      source:
        'Ezana analysis of the public record in this article: operator and government statements, US CBDC law, rwa.xyz market data. November 18th, 2026.',
      scenarios: [
        {
          id: 'base',
          label: 'Slow, voluntary, law-bound',
          tone: 'base',
          range: '2026 to 2030',
          steps: [
            { label: 'Outages keep coming from concentration', sub: 'few vendors, few cloud regions' },
            { label: 'Tokenized funds and deposits grow on their merits', sub: 'about $39.5B today' },
            { label: 'The CBDC ban holds', sub: 'executive order, then a law' },
          ],
          result: { value: 'Opt-in', sub: 'private stablecoins and tokenized deposits alongside cash and accounts' },
        },
        {
          id: 'accelerated',
          label: 'A real attack speeds it up',
          tone: 'alt',
          range: 'Any time',
          steps: [
            { label: 'A confirmed cyberattack hits a major bank', sub: 'not a software release' },
            { label: 'Restoration takes days, not hours', sub: 'records rebuilt from backups' },
            { label: 'Regulators fast-track tokenized deposits', sub: 'framed as resilience' },
          ],
          result: { value: 'Faster', sub: 'migration speeds up but stays voluntary at first; rules on freezing decide the risk' },
        },
        {
          id: 'theory',
          label: 'The theory as stated',
          tone: 'bear',
          range: 'Evidence: none today',
          steps: [
            { label: 'Outages staged by a common actor', sub: 'officials found zero evidence' },
            { label: 'Balances zeroed, blamed on AI hackers', sub: 'no case on record' },
            { label: 'Balances restored only on new rails', sub: 'no bank has proposed this' },
          ],
          result: { value: 'Forced', sub: 'conditional money imposed through panic rather than law' },
        },
      ],
      killSwitch:
        'This verdict flips if any official investigation attributes two or more of the November outages to a common actor, or if any US bank makes restoring a customer’s balance conditional on moving to a new tokenized account.',
    },

    {
      type: 'heading',
      text: 'B. The leaders by vertical',
      level: 3,
    },
    {
      type: 'paragraph',
      text: 'On the record today the leaders look like this, and none is a guaranteed winner. In tokenized funds, BlackRock and Franklin Templeton have operating products, with Securitize as the main independent platform. In market plumbing, the DTCC owns the most important bridge. In bank money, J.P. Morgan and BNY have live deposit tokens. In stablecoins, Circle has the scale and Paxos the federal charter, with Stripe’s Bridge waiting on final approval, and Visa is positioning to settle whatever wins. In identity, the states issue the credentials but Apple, Google and Samsung hold the wallets. Underneath it all, Nvidia supplies the compute and utilities such as Constellation and Vistra own the power. Every one of those positions depends on a rule that is not final, a partner it does not control or a technology not yet tested at full scale.',
    },
    {
      type: 'heading',
      text: 'C. The decision-makers',
      level: 3,
    },
    {
      type: 'paragraph',
      text: 'The rules are being set by a small group with real authority: Atkins at the SEC, Selig at the CFTC, Gould at the OCC, Warsh at the Fed, the FDIC’s board, and Bessent at Treasury, which also houses FinCEN and OFAC. Congress, where Tim Scott and Elizabeth Warren lead on these issues in the Senate and French Hill and Bryan Steil in the House, decides whether market structure becomes law or stays agency policy that a future commission can undo. Wright, FERC, the NRC and state utility commissions decide how fast the power arrives. Advisers such as Sacks shape the agenda but do not write the rules. It is a concentrated group, but a public one, and every decision it makes leaves a docket.',
    },
    {
      type: 'heading',
      text: 'D. What Changes the Verdict?',
      level: 3,
    },
    {
      type: 'paragraph',
      text: 'Evidence could move this verdict in either direction. A published root-cause report linking two of the November outages, or any finding of a common actor, would reopen the coordination question; so far every stated cause points elsewhere. On the building side, the concern would harden if the remaining GENIUS and anti-money-laundering rules are finalized with broad freeze powers and weak appeal rights, if a digital ID becomes a condition of opening an ordinary account rather than an option, or if a few platforms end up holding both the money and the credentials. It would ease if the new rails stay voluntary, interoperable and open to competition, if courts and Congress set clear limits on who can freeze funds and how, and if adoption is driven by price and convenience rather than by the old system being left to decay.',
    },
    {
      type: 'heading',
      text: 'E. Questions to put to Sonar',
      level: 3,
    },
    {
      type: 'link-list',
      title: 'Research questions for Ezana Sonar',
      intro: 'Each link opens Sonar with the question filled in, answered from filings and datasets with sources.',
      items: [
        {
          label: 'Which institutions added to or cut BlackRock, BNY, Circle and Visa in the latest 13F filings?',
          href: '/sonar/research?q=Which%20institutions%20added%20to%20or%20cut%20BlackRock%2C%20BNY%2C%20Circle%20and%20Visa%20in%20the%20latest%2013F%20filings%3F',
          note: 'Quarterly holdings, not real-time trading.',
        },
        {
          label: 'Which public companies mention tokenized deposits or stablecoin settlement in their latest filings?',
          href: '/sonar/research?q=Which%20public%20companies%20mention%20tokenized%20deposits%20or%20stablecoin%20settlement%20in%20their%20latest%20filings%3F',
          note: 'A mention is a disclosure, not proof of revenue.',
        },
        {
          label: 'How exposed is Circle’s revenue to falling interest rates under the GENIUS Act yield ban?',
          href: '/sonar/research?q=How%20exposed%20is%20Circle%E2%80%99s%20revenue%20to%20falling%20interest%20rates%20under%20the%20GENIUS%20Act%20yield%20ban%3F',
          note: 'Reserve income versus other revenue, quarter by quarter.',
        },
        {
          label: 'Which agencies have open rulemakings on stablecoins, digital identity or tokenized securities, and what are the next deadlines?',
          href: '/sonar/research?q=Which%20agencies%20have%20open%20rulemakings%20on%20stablecoins%2C%20digital%20identity%20or%20tokenized%20securities%2C%20and%20what%20are%20the%20next%20deadlines%3F',
          note: 'Proposed rules can change before they are final.',
        },
        {
          label: 'Who lobbied on the GENIUS Act and the CLARITY Act, and how do the final rules compare with their positions?',
          href: '/sonar/research?q=Who%20lobbied%20on%20the%20GENIUS%20Act%20and%20the%20CLARITY%20Act%2C%20and%20how%20do%20the%20final%20rules%20compare%20with%20their%20positions%3F',
          note: 'Lobbying shows access, not outcomes.',
        },
        {
          label: 'Which data center campuses depend on nuclear power contracts, and who are the buyers?',
          href: '/sonar/research?q=Which%20data%20center%20campuses%20depend%20on%20nuclear%20power%20contracts%2C%20and%20who%20are%20the%20buyers%3F',
          note: 'Contract terms are often only partly disclosed.',
        },
      ],
    },
    { type: 'heading', text: 'How to prepare without panicking', level: 2 },
    {
      type: 'paragraph',
      text: 'The practical response is the same whether outages come from bugs, attackers or anything else. Consumer group Which? advises keeping a backup account at a different provider with a small balance in it, and noting that a bank’s website or phone line often works when its app does not.[[src:48]]Which?, "What to do if your banking app goes down," 2026 · https://www.which.co.uk/news/article/what-to-do-online-banking-app-down-aIZBo7n8voob[[/src]] ABC’s checklist adds two-factor logins and a credit freeze, and keeping a few days of cash and a downloaded copy of recent statements covers the "my balance shows $0" scenario at little cost.[[src:49]]ABC News, protective steps in "A ‘code red’ for cybersecurity?" October 30th, 2026 · https://abc7ny.com/story/code-red-cybersecurity-how-prepare-possible-wave-ai-hacking/19999315/[[/src]] Stay inside deposit insurance limits at each bank, and read the terms of any tokenized product before moving money into it.',
    },
    {
      type: 'paragraph',
      text: 'For investors the story points to real exposures rather than a plot. Asset managers BLK and STT, and banks JPM, BAC and WFC, carry the operational and reputational risk when systems fail and the commercial upside if tokenized funds and deposits scale; MSFT, GOOGL and WDAY sit at the concentration points the November outages exposed; and media owners FOXA and DIS show how far holding a stake is from controlling a newsroom. The base case is slow, voluntary adoption under a US ban on a Federal Reserve digital dollar. The risk worth watching is not a staged blackout but the fine print: who can freeze tokenized money, and on whose order. The new builders bring their own exposures: CRCL to interest rates and the GENIUS yield ban, V to whether stablecoins route around card networks, and BK and SECZ to how fast institutions adopt tokenized cash and funds.',
    },
    {
      type: 'heading',
      text: 'The Ezana Datasets to Watch',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'Most of the claims in this piece can be checked against public records Ezana already tracks. Each dataset below answers part of the question of who is building the next financial order and who sets its rules, and each comes with a limit worth keeping in mind.',
    },
    {
      type: 'link-list',
      items: [
        {
          label: 'Institutional holdings (13F)',
          href: '/datasets/institutional',
          note: 'Who owns the builders. Quarterly snapshots filed up to 45 days after quarter-end, covering long US equity positions; not real-time trading, and not control.',
        },
        {
          label: 'ETF holdings (N-PORT)',
          href: '/datasets/etf-holdings',
          note: 'What funds actually hold. Monthly portfolio reports released with a lag; they show positions, not intentions.',
        },
        {
          label: 'New laws and policy legislation',
          href: '/datasets/legislation',
          note: 'Bills such as the CLARITY Act. Progress through committee is not a prediction of passage.',
        },
        {
          label: 'Government agency rulings',
          href: '/datasets/agency-rulings',
          note: 'Agency decisions as published. Proposed rules can change before they are final.',
        },
        {
          label: 'Regulatory investigations and enforcement',
          href: '/datasets/enforcement',
          note: 'Actions as announced. An investigation is not a finding of wrongdoing.',
        },
        {
          label: 'US sanctions list tracker',
          href: '/datasets/sanctions',
          note: 'OFAC designations. The list shows who is named, not the freezes individual stablecoin issuers carry out.',
        },
        {
          label: 'Politician tracker',
          href: '/datasets/politician-tracker',
          note: 'Disclosed trades by members of Congress, filed with delays. A trade is not evidence of how a vote was decided.',
        },
        {
          label: 'Campaign finance',
          href: '/datasets/campaignfinancerecords',
          note: 'Contributions as reported. Donations show access, not outcomes.',
        },
        {
          label: 'Prediction markets',
          href: '/datasets/prediction-markets',
          note: 'Prices on questions the markets themselves list. A price is a crowd estimate, not a forecast Ezana endorses.',
        },
      ],
    },
    {
      type: 'cta-callout',
      headline: 'Ask Sonar who holds what, and what changed',
      body: 'Ezana Sonar answers research questions from filings, not rumor: ask which institutions added to bank stocks last quarter, how a company’s ownership is split between index funds and controlling holders, or which disclosures mention tokenized deposits, with sources on every answer.',
      ctaLabel: 'Open Ezana Sonar',
      ctaHref: '/sonar',
      ctaAuthGate: true,
    },
  ],
};

export default tokenizedMoneyOutageTheory2026;
