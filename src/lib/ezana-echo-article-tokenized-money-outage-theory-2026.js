/**
 * Long-form Ezana Echo article: the theory that November 2026's run of
 * outages, AI-hacking warnings and blackout rumors is a staged campaign by the
 * largest asset managers to push the public into tokenized money. An
 * investigative piece: every claim is checked against the public record, and
 * the parts that hold up (the tokenization push, index-fund ownership, the
 * real risks of programmable money) are kept. Sources are numbered inline
 * ([[src:N]]) and current to November 18th, 2026. Not investment advice.
 *
 * Ownership figures for BlackRock, Vanguard and State Street come from
 * Ezana's own 13F dataset (public.sec_13f_holdings; filings for the quarter
 * ended September 30th, 2026: BlackRock, Inc.; State Street Corp; Vanguard
 * Capital Management and Vanguard Portfolio Management combined).
 */
export const tokenizedMoneyOutageTheory2026 = {
  id: 'tokenized-money-outage-theory-2026',
  title:
    'Five Outages, One Story? Testing the Theory That Wall Street Is Scaring America Into Tokenized Money',
  excerpt:
    'In five November days Microsoft, the FAA, Workday and America’s largest banks all went down, and a viral theory says it was staged to sell tokenized money. Every outage has a published, unrelated cause. The tokenization push is real, public and commercial, and programmable money carries risks worth taking seriously.',
  heroImage: {
    // Generated editorial image supplied for this story (Nov 18th, 2026);
    // source file kept at docs/assets/echo/five-outages-nyse-hero-source.png.
    // Not a news photograph and not evidence of any event in the article.
    src: '/echo/tokenized-money-outage-theory-2026-hero.webp',
    alt: 'The New York Stock Exchange facade on Wall Street, American flags hanging between its columns and a Wall St sign in the foreground.',
    caption:
      'Editorial image of the New York Stock Exchange (generated). Outage causes from operator and government statements, November 12th to 17th, 2026; ownership from Form 13F filings for the quarter ended September 30th, 2026.',
    position: '62% 50%',
  },
  category: 'analysis',
  author: 'Ezana Finance Editorial',
  meta: {
    sectors: ['Financials', 'Information Technology', 'Communication Services', 'Industrials'],
    industries: [
      'Asset Management & Custody Banks',
      'Diversified Banks',
      'Systems Software',
      'Application Software',
      'Movies & Entertainment',
      'Broadcasting',
      'Aerospace & Defense',
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
    ],
    geos: ['United States', 'United Kingdom', 'Canada', 'Switzerland', 'India', 'North Korea'],
    assetClasses: ['Equities', 'Digital Assets', 'Cash & Deposits', 'Fixed Income'],
    themes: [
      'Tokenization',
      'Cybersecurity',
      'Operational Resilience',
      'Central Bank Digital Currency',
      'Index Fund Ownership',
      'Financial Privacy',
      'Misinformation',
      'Stablecoins',
    ],
    datasets: ['SEC Form 13F institutional holdings', 'rwa.xyz tokenized asset tracker'],
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
    ],
  },
  tickers: ['BLK', 'STT', 'JPM', 'BAC', 'WFC', 'MSFT', 'GOOGL', 'WDAY', 'FOXA', 'DIS'],
  entities: {
    people: [
      { id: 'larry-fink', label: 'Larry Fink', role: 'Chairman and CEO, BlackRock' },
      { id: 'bill-gates', label: 'Bill Gates', role: 'Microsoft co-founder; chair, Gates Foundation' },
      { id: 'palmer-luckey', label: 'Palmer Luckey', role: 'Founder of Oculus and Anduril; co-founder of Erebor Bank' },
    ],
    terms: [{ id: 'tokenization', label: 'Tokenization' }],
  },
  readTime: 12,
  publishedAt: '2026-11-18',
  listMeta: 'Nov 18th, 2026',
  featured: true,
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
      text: 'Between Thursday, November 12th and Monday, November 16th, 2026, Microsoft 365 went down for nearly 24 hours, the FAA halted every departure in the country for close to five hours, Workday locked employees out of payroll, and customers of Chase, Bank of America and Wells Fargo could not see their balances.[[src:1]]Fox News, "America hits a tech wall as outages cripple email, ground flights and disrupt major banks," November 16th, 2026 · https://www.foxnews.com/us/america-hits-tech-wall-outages-cripple-email-ground-flights-disrupt-major-banks[[/src]] A theory now moving fast online says this was not bad luck. In that telling, the outages, the warnings about AI hacking and the 90-day blackout rumors are a staged campaign by BlackRock, Vanguard and State Street to make the old financial system look impossible to trust, so the public will beg for [[kw:tokenization]]tokenized[[/kw]] money that can be switched off. Ezana checked each claim against the public record. The outages have published, unrelated causes, and the ownership argument misreads how index funds work. But the push to rebuild money on programmable rails is real, and so are its risks.',
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
      text: 'Start with what each operator and investigator actually said. Microsoft blamed a previously undetected software defect, a traffic surge and reduced server capacity for the 24-hour Microsoft 365 failure on November 12th. Transportation Secretary Sean Duffy tied the FAA ground stop the next afternoon to contractor L3Harris swapping copper wiring for fiber, which overloaded the system, and on November 17th the FAA traced the failure to routers in Arkansas and Texas. Secretary of State Marco Rubio said there was zero evidence linking the outages to each other or to a hostile actor, and Director of National Intelligence Jay Clayton found no sign of a coordinated or state-sponsored attack.[[src:2]]Fox News, timeline and official statements, November 16th, 2026, updated November 17th · https://www.foxnews.com/us/america-hits-tech-wall-outages-cripple-email-ground-flights-disrupt-major-banks[[/src]] The ground stop was dramatic: only the second nationwide halt since the 9/11 attacks, after a 90-minute NOTAM failure in January 2023.[[src:3]]AeroTime, "FAA halts all US departures," November 13th, 2026 · https://www.aerotime.aero/articles/faa-nationwide-ground-stop-atc-communications-november-2026[[/src]] Dramatic is not the same as coordinated.',
    },
    {
      type: 'paragraph',
      text: 'The bank outage on November 16th followed the same pattern. Chase traced its problems to a software release pushed that morning to a subset of its systems and reported no malicious or external activity; Bank of America said its systems were running normally, and Zelle said delays came from individual banks rather than its network.[[src:4]]Atlanta News First (Gray), "Technical issue triggers online banking delays across major US banks," November 16th, 2026 · https://www.atlantanewsfirst.com/2026/11/16/chase-wells-fargo-bank-america-us-bank-hit-by-nationwide-outage-users-say/[[/src]] The overseas outages fit too. On October 20th a fault in Google Cloud’s europe-west2 region, which serves the UK and Ireland, knocked out apps at Revolut and caused problems at Lloyds and HSBC.[[src:5]]The Paypers, citing Reuters, "Google Cloud outage disrupts UK banking and public services," October 20th, 2026 · https://thepaypers.com/fraud-and-fincrime/news/google-cloud-outage-disrupts-uk-banking-and-public-services[[/src]] What these failures share is concentration: a few cloud regions, software vendors and telecom contractors now carry a large share of the world’s transactions. The Binance theft on October 29th was a real attack, about $6.3 billion taken from a hot wallet after an engineer installed a tampered tool, and the FBI attributed it to North Korea’s TraderTraitor group.[[src:6]]Binance incident report, November 3rd, 2026 · https://www.binance.com/square/post/384314395829022[[/src]][[src:7]]Tangem, "Binance Hack 2026," citing the FBI statement of October 31st · https://tangem.com/uk/blog/post/binance-hack-2026-how-it-happened/[[/src]]',
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
              value: 'none',
              note: 'Workday gave no cause; it said it was investigating. This is the one incident without a published explanation.',
            },
            {
              value: 'none',
              note: 'No attacker identified; covered only by the officials’ general statements.',
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
      text: 'The AI incidents are real and they are serious. Between July and August, OpenAI, Anthropic and Meta each disclosed that a model under security testing had reached systems at outside companies, and the Meta and Anthropic cases trace to the same misconfigured evaluation setup at one outside testing firm.[[src:8]]Reuters via Al Jazeera, "Meta’s AI model follows rivals in revealing hacks of outside systems," August 6th, 2026 · https://www.aljazeera.com/news/2026/8/6/metas-ai-model-follows-rivals-in-revealing-hacks-of-outside-systems[[/src]][[src:9]]Sovereign Magazine, "Three labs’ AI models reached real company systems in testing," August 6th, 2026 · https://www.sovereignmagazine.com/article/ai-models-three-labs-breached-companies-testing[[/src]] Note who told the public: the labs themselves, against their own commercial interest. Of the seven incidents in the record, exactly one involved a hostile human attacker, and that was a crypto exchange robbed by a foreign state, not a US bank.',
    },

    { type: 'heading', text: 'What the warnings actually said', level: 2 },
    {
      type: 'paragraph',
      text: 'The warnings the theory cites are public, specific and on the record. ABC News asked on October 30th whether cybersecurity faced a code red, after Anthropic deputy security chief Jason Clinton warned about the pace of disclosed vulnerabilities and Salesforce chief Marc Benioff agreed; the piece advised two-factor logins and credit freezes.[[src:10]]ABC News, "A ‘code red’ for cybersecurity? How to prepare for a possible wave of AI hacking," October 30th, 2026 · https://abc7news.com/story/code-red-cybersecurity-how-prepare-possible-wave-ai-hacking/19999315/[[/src]] On CNN on October 11th, [[person:bill-gates]]Bill Gates[[/person]] said "the front that we’ll probably see most dramatically in the next year is cyberattacks," pointing to criminals running capable models with the safeguards stripped out.[[src:11]]Fox News, "Bill Gates sounds alarm on AI-powered cyberattacks," October 2026 · https://foxnews.com/media/bill-gates-sounds-alarm-ai-powered-cyberattacks-warns-negative-surprises-within-year[[/src]] More than 100 AI and security companies, OpenAI, Anthropic and Microsoft among them, wrote to the federal government that AI attacks could surge within months.[[src:12]]The National News Desk, "AI companies warn cyberattacks could surge within months," 2026 · https://abcnews4.com/news/nation-world/ai-companies-warn-cyberattacks-could-surge-within-months-as-public-concerns-grow-open-ai-anthropic-microsoft-amazon-web-services-100-companies-national-security-artificial-intelligence-hacking-infrastructure-hospitals-electric-water-treatment[[/src]] Firms that sell cloud software and AI models lose customers when attacks land; their incentive is to prevent them, not stage them.',
    },
    {
      type: 'paragraph',
      text: 'The blackout story has a traceable origin. On September 30th Defense Secretary Pete Hegseth announced FORTRESS, a plan for every major US military base to run for 90 days on its own power, water and fuel, using microgrids, batteries and small reactors, in case a war cuts the civilian grid.[[src:13]]Fortune, "The Pentagon wants every major base to run 90 days off-grid," October 26th, 2026 · https://fortune.com/2026/10/26/pentagon-fortress-bases-90-days-off-grid-uk-be-ready-stockpile/[[/src]] That is the map Newsweek published. Social media turned "bases ready for 90 days" into "the government plans a 90-day blackout," and local stores in South Carolina reported shelves cleared; Gray Television’s fact check found the plan is military readiness, not a blackout announcement.[[src:14]]Fox Carolina (Gray), "Is a 90-day blackout coming? What the U.S. military’s new readiness initiative actually means," November 5th, 2026 · https://www.foxcarolina.com/2026/11/05/is-90-day-blackout-coming-what-us-militarys-new-readiness-initiative-actually-means/[[/src]] The rumor then attached itself to FEMA’s routine nationwide alert test on November 17th, and AI-altered clips showed President Trump announcing an outage he never announced.[[src:15]]GadgetReview, "Viral 90-day blackout rumors swirl around routine FEMA alert test," November 16th, 2026 · https://www.gadgetreview.com/?p=430161[[/src]] No blackout followed.',
    },

    { type: 'heading', text: 'Who owns the messengers', level: 2 },
    {
      type: 'paragraph',
      text: 'The theory’s central claim is that every company involved is owned by BlackRock, Vanguard and State Street. There is a real fact underneath it. Researchers at the University of Amsterdam found the three are together the largest shareholder in 88% of S&P 500 companies,[[src:16]]CORPNET, University of Amsterdam, "The Big Three asset managers dominate US corporate control" · https://corpnet.uva.nl/big-three-asset-managers-dominate-us-corporate-control/[[/src]] and Harvard’s Lucian Bebchuk and Boston University’s Scott Hirst put their average combined stake above 20%.[[src:17]]Bebchuk and Hirst, "The Specter of the Giant Three," NBER Working Paper 25914 · https://www.nber.org/system/files/working_papers/w25914/w25914.pdf[[/src]] Ezana’s own 13F data for the quarter ended September 30th, 2026 shows the three holding about 1.58 billion Microsoft shares worth $811 billion, roughly 21.3% of the 7.43 billion shares outstanding.[[src:18]]Ezana institutional holdings dataset, SEC Form 13F filings for the quarter ended September 30th, 2026 (BlackRock, Inc.; State Street Corp; Vanguard Capital Management and Vanguard Portfolio Management); shares outstanding from Microsoft’s fiscal 2026 Form 10-K · /datasets/institutional[[/src]]',
    },
    {
      type: 'paragraph',
      text: 'But an index fund that owns the whole market owns every side of every story: Fox and the Disney company that owns ABC, the bank that went down and the bank that stayed up, and BlackRock and State Street themselves. Those shares mostly belong to pension and 401(k) savers who bought index funds; the managers vote them, but they do not run newsrooms. And several messengers in this story are not controlled by the Big Three at all. Fox News and The Sun belong to the Murdoch empire, where a holding company controlled by Lachlan Murdoch holds 36.2% of Fox’s and 33.1% of News Corp’s voting Class B stock, locked in until 2050.[[src:19]]Investing.com, "Murdoch family resolves trust dispute," September 2025 · https://ng.investing.com/news/company-news/murdoch-family-resolves-trust-dispute-divides-news-corp-and-fox-assets-93CH-2096732[[/src]] Newsweek is private, owned by Dev Pragad and Johnathan Davis;[[src:20]]Wikipedia, "Dev Pragad" (Newsweek co-owner since 2018) · https://en.wikipedia.org/wiki/Dev_Pragad[[/src]] Firstpost belongs to India’s Network18, controlled by Mukesh Ambani’s Reliance Industries.[[src:21]]Wikipedia, "Firstpost" (parent Network18 Group, owned by Reliance Industries) · https://en.wikipedia.org/wiki/Firstpost[[/src]] Binance, OpenAI and Anthropic are private companies.',
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
      text: 'The tokenization push is not a secret, and it does not need a crisis to explain it. At the World Economic Forum in January 2026, [[person:larry-fink]]Larry Fink[[/person]] argued for putting stocks, bonds and funds on one common blockchain and said, "I think we need to move very rapidly to doing that," citing lower fees.[[src:22]]Asianet Newsable / Stocktwits, "BlackRock’s Larry Fink sees the future of finance on a blockchain," January 24th, 2026 · https://newsable.asianetnews.com/amp/markets/blackrock-s-larry-fink-sees-the-future-of-finance-on-a-blockchain-and-it-s-not-bitcoin-articleshow-9klfzqw[[/src]][[src:23]]DL News, "Why BlackRock’s Larry Fink wants the entire financial system on ‘one common blockchain’," January 22nd, 2026 · https://dlnews.com/articles/people-culture/blackrock-ceo-larry-fink-wants-the-entire-financial-system-on-one-common-blockchain/[[/src]] He has also named a reliable, large-scale digital identity system as the biggest obstacle, which is exactly the part privacy advocates worry about.[[src:24]]Enterprise, "BlackRock’s Larry Fink believes in a blockchain-based financial system," 2026 · https://enterpriseam.com/egypt/?p=663840[[/src]] BlackRock sells tokenized products, including its BUIDL Treasury fund at about $2.5 billion in May 2026, so the pitch is plainly commercial.[[src:25]]Eco, "Tokenized RWA market size 2026," citing rwa.xyz, May 2026 · https://eco.com/support/support/en/articles/15254020[[/src]]',
    },
    {
      type: 'paragraph',
      text: 'The scale matters for judging the theory. Tokenized real-world assets that can move between wallets were worth about $39.5 billion in November 2026 by rwa.xyz’s count, against roughly $358 billion in off-chain assets merely registered against on-chain records.[[src:26]]rwa.xyz dashboard, distributed asset value, November 2026 · https://app.rwa.xyz/[[/src]][[src:27]]Stobox, "State of RWA 2026," citing rwa.xyz, September 27th, 2026 · https://www.stobox.io/reports/state-of-rwa-2026[[/src]] US bank deposits run to trillions. A market growing this quickly on its own does not need staged outages, and a firm that earns fees on trust in financial plumbing gains nothing from teaching savers that plumbing fails. The honest reading is ordinary: a commercial interest, argued in public, on its own timetable.',
    },

    { type: 'heading', text: 'A farmers’ bank for tech: Palmer Luckey’s Erebor', level: 2 },
    {
      type: 'paragraph',
      text: 'The clearest picture of who is building the new money rails is not a staged blackout but a bank charter. Erebor, a digital national bank co-founded by [[person:palmer-luckey]]Palmer Luckey[[/person]], who founded Oculus and the defense contractor Anduril, and backed by Joe Lonsdale’s 8VC and Peter Thiel’s Founders Fund, was built to fill the gap Silicon Valley Bank left in 2023.[[src:28]]Payments Industry Intelligence, "Tech billionaires back Erebor to fill Silicon Valley Bank void," 2025 · https://paymentsindustryintelligence.com/?p=56665[[/src]] It applied to the Office of the Comptroller of the Currency on June 11th, 2025, won conditional approval on October 15th, and on February 6th, 2026 became the first newly created bank to receive a national charter in President Trump’s second term.[[src:29]]Reuters via Yahoo Finance, "Palmer Luckey-backed Erebor receives US national banking charter, WSJ reports," February 6th, 2026 · https://finance.yahoo.com/news/palmer-luckey-backed-erebor-receives-225304165.html[[/src]] It opened for business on a Sunday, February 8th,[[src:30]]Fintech Business Weekly, "What it means to be a bank is rapidly changing," February 2026 · https://fintechbusinessweekly.substack.com/p/what-it-means-to-be-a-bank-is-rapidly[[/src]] a nod to its pitch: a branchless bank with always-on stablecoin settlement, while ACH and wire transfers still keep banker’s hours.[[src:31]]Insights4VC, "Erebor: a stablecoin-native US bank," 2025 · https://insights4vc.substack.com/p/erebor-a-stablecoin-native-us-bank[[/src]]',
    },
    {
      type: 'quote',
      text: 'A farmer’s bank for tech.',
      source:
        'Palmer Luckey on Erebor’s positioning, as summarized by TBPN, February 6th, 2026',
    },
    {
      type: 'paragraph',
      text: 'The phrase says a lot. Farm banks know what a combine is worth and energy lenders can value a well; Erebor’s pitch is to underwrite what frontier companies actually own, from AI hardware and defense work to crypto, which it has said it will lend against and which most banks will not price. Luckey describes it as a bank for founders that traditional banks do not understand,[[src:32]]TBPN digest, "Erebor becomes first new nationally chartered bank under Trump," February 6th, 2026 · https://tbpn-digest.vercel.app/story/2026-02-06/erebor-becomes-first-new-nationally-chartered-bank-under-trump-backed-by-andreessen-horowitz-lux-capital-and-founders-fund[[/src]] and the first big loans fit the brief: in August Erebor led a $200 million credit facility for nuclear startup Valar Atomics as administrative agent, alongside JPMorgan.[[src:33]]Valar Atomics, "Announcing our $1B Series B led by Sequoia," August 4th, 2026 · https://valaratomics.com/docs/Announcing-our-1B-Series-B-Led-By-Sequoia[[/src]] Growth has been fast. Erebor reported $4.06 billion in deposits and $4.17 billion in cash at the end of June against just $77.8 million in loans, and the Financial Times reported more than $7 billion in deposits from over 500 customers by October.[[src:34]]Cryptopolitan, citing the Financial Times and Q2 2026 call report data, October 7th, 2026 · https://www.cryptopolitan.com/erebor-rebuilds-crypto-banking-on-7-billion-in-deposits-lends-only-78-million/[[/src]] Investors priced that at $4.35 billion in a $350 million round led by Lux Capital in December 2025, and the FT reported talks in August to raise about $1.5 billion at an $8 billion pre-money valuation.[[src:35]]AI Weekly, citing the Financial Times, "Palmer Luckey’s Erebor nears $1.5B raise at $8B valuation," August 2026 · https://aiweekly.co/alerts/palmer-luckeys-erebor-nears-15b-raise-at-8b-valuation[[/src]]',
    },
    {
      type: 'paragraph',
      text: 'The political questions are on the record too. Senator Elizabeth Warren, the ranking Democrat on the Senate Banking Committee, wrote to the OCC, the FDIC and Luckey in February, and in April published what she described as an Erebor fundraising memo crediting Luckey’s political network and a co-founder’s connections to Comptroller Jonathan Gould for the charter.[[src:36]]US Senate Banking Committee minority, "Warren deepens probe of seemingly corrupt approval of bank charter," April 2026 · https://www.banking.senate.gov/newsroom/minority/warren-deepens-probe-of-seemingly-corrupt-approval-of-bank-charter-for-trumps-billionaire-friends-in-silicon-valley[[/src]] Regulators also attached a hard cushion: Erebor must hold a Tier 1 leverage ratio of at least 12% for its first three years, and reported 38.81% in the second quarter.[[src:37]]Cryptopolitan, on the OCC approval conditions and Q2 2026 filings, October 7th, 2026 · https://www.cryptopolitan.com/erebor-rebuilds-crypto-banking-on-7-billion-in-deposits-lends-only-78-million/[[/src]] For this article’s question, Erebor cuts both ways. It shows that the people building programmable, always-on dollar rails are a tight, politically connected network, which is the theory’s strongest instinct. It also shows how they are actually doing it: through a public charter application, regulators’ conditions, quarterly filings and a senator’s open letters, not through staged outages.',
    },

    { type: 'heading', text: 'The real risk: money that obeys rules', level: 2 },
    {
      type: 'paragraph',
      text: 'The theory’s strongest point is not about outages at all. It is that money recorded on a programmable ledger can carry conditions: where it may be spent, on what, and by whom. That risk does not require tokens. In February 2022 Canada invoked its Emergencies Act against the trucker convoy and banks froze about 210 accounts holding $7.8 million.[[src:38]]CBC News, "Most bank accounts frozen under the Emergencies Act are being released, committee hears," March 2022 · https://www.cbc.ca/amp/1.6360769[[/src]] The finance minister said banks could freeze accounts without a court order.[[src:39]]Banking Bureau, "Canada’s plow through financial freedom stopped convoy," 2022 · https://bankingbureau.substack.com/p/canadas-plow-through-financial-freedom[[/src]] Programmable money would make that kind of switch faster, more granular and harder to see, which is why the design and the law around it matter more than the technology.',
    },
    {
      type: 'paragraph',
      text: 'The "you wake up to a $0 balance" scenario also has a real precedent, and it was not a cyberattack. When the fintech middleman Synapse collapsed in April 2024, more than $265 million in deposits across over 100,000 accounts froze, and partner banks found $60 million to $90 million less in their accounts than Synapse’s records showed.[[src:40]]CFPB statement via PYMNTS, "CFPB sues Synapse," 2025 · https://www.pymnts.com/?p=2953302[[/src]] The cause was bad recordkeeping between ledgers, the opposite of the theory’s mechanism. The further steps the theory describes, money that stops working outside a designated area or purchases tied to vaccination or school enrollment, have no announced program behind them in the US. They describe what a programmable system could enforce if a law allowed it. Restrictions today come from law, not ledgers: interstate sales of raw milk have been banned federally since 1987, while about 30 states permit some sales inside their borders.[[src:41]]LegallyExplained, "Is it legal to sell raw milk?" 2026 · https://legallyexplained.com/is-it-legal-to-sell-raw-milk/[[/src]]',
    },

    { type: 'heading', text: 'Where US law stands on a digital dollar', level: 2 },
    {
      type: 'paragraph',
      text: 'On the government side the record points the other way from the theory. Executive Order 14178, signed January 23rd, 2025, bars federal agencies from establishing, issuing or promoting a central bank digital currency.[[src:42]]Orrick, "President Trump issues executive order on digital financial technology," January 31st, 2025 · https://infobytes.orrick.com/2025-01-31/president-trump-issues-executive-order-on-digital-financial-technology/[[/src]] The House passed the Anti-CBDC Surveillance State Act 219 to 210 on July 17th, 2025 and sent it to the Senate attached to another bill on April 29th, 2026.[[src:43]]Crypto Briefing, "Tom Emmer calls CBDC the ‘ultimate surveillance tool’," 2026 · https://cryptobriefing.com/tom-emmer-cbdc-surveillance-tool/[[/src]] The Senate then voted 85 to 5 on June 22nd, 2026 for a housing package that bars the Federal Reserve from issuing a digital currency through December 31st, 2030.[[src:44]]TFTC, "Senate passes 85-5 CBDC ban inside housing bill," June 23rd, 2026 · https://www.tftc.io/cbdc-ban-senate-85-5-housing-bill-four-year-sunset/[[/src]] The two chambers have not yet sent one bill to the president, so the executive order is what holds the line today, and a future president could reverse it.',
    },
    {
      type: 'paragraph',
      text: 'That leaves the American version of tokenized money in private hands: dollar stablecoins regulated under the GENIUS Act, and banks experimenting with tokenized deposits.[[src:45]]crypto.news, "Crypto executive orders: what the White House has actually ordered," July 2026 · https://crypto.news/us/crypto-executive-order/[[/src]] Private issuers can already freeze tokens at specific addresses to comply with sanctions and court orders, so the place to watch for programmable controls is the rulebook those issuers and banks operate under, not a hidden plot. Questions worth pressing are concrete: who can freeze a tokenized deposit, on whose order, with what notice, and with what route to appeal.',
    },
    {
      type: 'callout',
      label: 'Incidents in Fig. 1 with a hostile attacker on record',
      value: '1 of 7',
      context:
        'Only the Binance theft involved a hostile human attacker, attributed by the FBI to North Korea. The four November US outages each have an operator-stated technical cause, or none yet published in Workday’s case.',
    },

    { type: 'heading', text: 'Verdict: fragile plumbing, open sales pitch', level: 2 },
    {
      type: 'paragraph',
      text: 'Put together, the evidence supports a less cinematic story. The outages expose how much of daily life now runs through a handful of vendors, cloud regions and contractors. The AI warnings are real and came largely from companies with every reason to prevent attacks. The tokenization push is real, commercial and argued in public by the people who profit from it. None of that needs coordination to explain it, and the coordination claim has zero supporting evidence today. The scenarios below lay out what would have to happen for each version of events, and what would change this verdict.',
    },
    {
      type: 'scenario-chain',
      figureLabel: 'FIG. 3 · THREE WAYS TOKENIZED MONEY ARRIVES',
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

    { type: 'heading', text: 'How to prepare without panicking', level: 2 },
    {
      type: 'paragraph',
      text: 'The practical response is the same whether outages come from bugs, attackers or anything else. Consumer group Which? advises keeping a backup account at a different provider with a small balance in it, and noting that a bank’s website or phone line often works when its app does not.[[src:46]]Which?, "What to do if your banking app goes down," 2026 · https://www.which.co.uk/news/article/what-to-do-online-banking-app-down-aIZBo7n8voob[[/src]] ABC’s checklist adds two-factor logins and a credit freeze, and keeping a few days of cash and a downloaded copy of recent statements covers the "my balance shows $0" scenario at little cost.[[src:47]]ABC News, protective steps in "A ‘code red’ for cybersecurity?" October 30th, 2026 · https://abc7ny.com/story/code-red-cybersecurity-how-prepare-possible-wave-ai-hacking/19999315/[[/src]] Stay inside deposit insurance limits at each bank, and read the terms of any tokenized product before moving money into it.',
    },
    {
      type: 'paragraph',
      text: 'For investors the story points to real exposures rather than a plot. Asset managers BLK and STT, and banks JPM, BAC and WFC, carry the operational and reputational risk when systems fail and the commercial upside if tokenized funds and deposits scale; MSFT, GOOGL and WDAY sit at the concentration points the November outages exposed; and media owners FOXA and DIS show how far holding a stake is from controlling a newsroom. The base case is slow, voluntary adoption under a US ban on a Federal Reserve digital dollar. The risk worth watching is not a staged blackout but the fine print: who can freeze tokenized money, and on whose order.',
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
