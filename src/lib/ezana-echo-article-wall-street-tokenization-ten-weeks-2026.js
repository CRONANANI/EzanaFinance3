/**
 * Long-form Ezana Echo article: the ten weeks between the SEC's Innovation
 * Exemption (September 17th, 2026) and the opening of the OKXICE Tokenized
 * Securities Venue (November 23rd, 2026), set against Jamie Dimon's April 2026
 * warning that blockchain-based competitors are coming. Tests the popular
 * reading that blockchain "replaces the middlemen" against the record: the
 * depository (DTCC) and the owner of the NYSE (ICE) are the ones switching the
 * technology on, under tight caps. Sources are numbered inline ([[src:N]]) and
 * current to November 26th, 2026. Ezana arithmetic (shares of custody value,
 * day counts) is derived only from figures cited here. Not investment advice.
 */
export const wallStreetTokenizationTenWeeks2026 = {
  id: 'wall-street-tokenization-ten-weeks-2026',
  title:
    'Ten Weeks That Put Wall Street On-Chain: The Middlemen Dimon Warned About Are Tokenizing Themselves',
  excerpt:
    'Between September 17th and November 23rd, the SEC opened a five-year path for tokenized stock trading, the DTCC switched on tokenization for a depository holding more than $114 trillion, and the NYSE’s owner opened 24/7 trading with OKX. The incumbents built the new rails themselves, and the caps keep them small for now.',
  category: 'crypto',
  author: 'Ezana Finance Editorial',
  meta: {
    sectors: ['Financials'],
    industries: [
      'Financial Exchanges & Data',
      'Diversified Banks',
      'Investment Banking & Brokerage',
      'Asset Management & Custody Banks',
    ],
    institutions: [
      'JPMorgan Chase',
      'Depository Trust & Clearing Corporation',
      'Intercontinental Exchange',
      'New York Stock Exchange',
      'OKX',
      'OKXICE',
      'Citigroup',
      'Bank of America',
      'Morgan Stanley',
      'Fidelity Investments',
      'Citadel Securities',
      'State Street',
      'Securitize',
      'Direxion',
      'Coinbase',
      'Circle',
      'Robinhood',
      'Dinari',
    ],
    government: ['US Securities and Exchange Commission', 'US Senate'],
    geos: ['United States'],
    assetClasses: ['Equities', 'Digital Assets', 'Fixed Income'],
    themes: [
      'Tokenization',
      'Market Structure',
      'Settlement',
      'Disintermediation',
      '24/7 Trading',
      'Regulation',
    ],
    datasets: ['SEC Innovation Exemption order (Release No. 34-106402)', 'DTCC press releases'],
    markets: ['NYSE'],
    investors: [],
  },
  tickers: ['JPM', 'ICE', 'C', 'BAC', 'MS', 'COIN', 'CRCL', 'HOOD', 'META', 'TSLA', 'NFLX'],
  entities: {
    people: [
      { id: 'jamie-dimon', label: 'Jamie Dimon', role: 'Chairman and CEO, JPMorgan Chase' },
      { id: 'paul-atkins', label: 'Paul Atkins', role: 'Chairman, US SEC' },
    ],
    terms: [
      { id: 'tokenization', label: 'Tokenization' },
      { id: 'tokenized-securities-venue', label: 'Tokenized Securities Venue' },
      { id: 'settlement-cycle', label: 'Settlement cycle' },
    ],
  },
  readTime: 9,
  publishedAt: '2026-11-26',
  listMeta: 'Nov 26th, 2026',
  featured: false,
  likes: 0,
  comments: 0,
  reads: 0,
  status: 'published',
  contentBlocks: [
    {
      type: 'paragraph',
      text: 'In his annual letter in April, [[person:jamie-dimon]]Jamie Dimon[[/person]] told JPMorgan’s shareholders that “a whole new set of competitors is emerging based on blockchain,” naming stablecoins, smart contracts and other forms of [[kw:tokenization]]tokenization[[/kw]], and wrote that the bank needs to roll out its own blockchain technology.[[src:1]]Fortune, "Jamie Dimon warns of growing crypto competition in annual letter," April 7th, 2026 · https://fortune.com/2026/04/07/jamie-dimon-warns-growing-crypto-competition-jpmorgan-shareholder-letter-we-need-to-roll-out-blockchain-technology/[[/src]] Six months later the plumbing he described went live in a run of under ten weeks: an SEC exemption on September 17th, the DTCC’s Tokenization Service on October 28th and 24/7 trading of tokenized US securities at OKXICE, the venture between OKX and the owner of the New York Stock Exchange, on November 23rd. The popular reading is that blockchain is replacing Wall Street’s middlemen. The record says something more specific: the biggest middlemen are the ones switching it on, and the rules cap how far it can go for now.',
    },
    {
      type: 'stat-grid',
      stats: [
        {
          label: 'Securities in DTC custody',
          value: '$114T+',
          change: 'the depository now minting tokens',
        },
        {
          label: 'Eligible to tokenize at DTCC launch',
          value: '34',
          change: 'about $30T of market value',
        },
        {
          label: 'Issuers that objected to OKXICE',
          value: '67',
          change: 'as of Nov 5th, incl. Meta, Tesla, Netflix',
        },
        {
          label: 'Volume cap, large-cap tokens',
          value: '0.25%',
          change: 'of average daily share volume',
        },
      ],
    },
    { type: 'heading', text: 'Sixty-seven days, three switches', level: 2 },
    {
      type: 'paragraph',
      text: 'The first switch was regulatory. On September 17th the SEC issued what it calls the Innovation Exemption: two conditional exemptions, effective immediately and expiring on September 17th, 2031, that let a qualifying [[kw:tokenized-securities-venue]]Tokenized Securities Venue[[/kw]] trade tokenized versions of exchange-listed stocks without registering as an exchange, and let the firms supplying liquidity to it operate without registering as dealers.[[src:2]]White & Case, "SEC creates five-year conditional innovation exemption for onchain trading of tokenized U.S. exchange-listed stocks," September 2026 · https://www.whitecase.com/insight-alert/sec-creates-five-year-conditional-innovation-exemption-onchain-trading-tokenized-us[[/src]] It came two days after the Digital Asset Market Clarity Act failed to advance in the Senate, so the agency moved by order rather than waiting for Congress.[[src:3]]King & Spalding, "SEC Issues Innovation Exemption for Trading Tokenized Securities," September 23rd, 2026 · https://www.kslaw.com/Insights/Articles/SEC-Issues-Innovation-Exemption%E2%80%9D-for-Trading-Tokenized-Securities[[/src]] SEC Chairman [[person:paul-atkins]]Paul Atkins[[/person]] said the Commission was not cementing today’s technology as the standard and that the interim exemption must be followed by durable rulemaking.',
    },
    {
      type: 'wall-timeline',
      figureLabel: 'FIG. 1 · FROM WARNING TO SWITCH-ON',
      kicker:
        'THE STEPS FROM DIMON’S LETTER TO 24/7 TOKENIZED STOCK TRADING, APRIL TO NOVEMBER 2026 · CLICK A PLAQUE FOR THE RECORD',
      hint: 'Every live step after September 17th ran through an incumbent.',
      source:
        'JPMorgan shareholder letter via Fortune; Benzinga; DTCC press releases of July 15th and October 28th, 2026; SEC Release No. 34-106402; King & Spalding; OKX; Crypto Economy; TechFlow. Day count is Ezana arithmetic.',
      startYear: 2026,
      endYear: 2027,
      windows: [
        {
          id: 'warning',
          label: 'The warning',
          from: 2026.26,
          to: 2026.7,
          color: 'var(--text-muted)',
        },
        {
          id: 'switch',
          label: 'The ten weeks',
          from: 2026.71,
          to: 2026.9,
          color: 'var(--echo-chart-green)',
        },
      ],
      plaques: [
        {
          year: 2026.26,
          lane: 0,
          label: 'Apr 6',
          title: 'Dimon’s letter',
          detail:
            'Dimon tells shareholders a whole new set of blockchain-based competitors is emerging and that JPMorgan must roll out its own blockchain technology.',
        },
        {
          year: 2026.405,
          lane: 1,
          label: 'May 29',
          title: 'Dimon: it will replace infrastructure',
          detail:
            'At the Reagan National Economic Forum, Dimon says blockchain will replace financial market infrastructure and points to JPMorgan’s deposit coin, which moves money around the clock.',
        },
        {
          year: 2026.534,
          lane: 2,
          label: 'Jul 15',
          title: 'DTCC’s live pilot',
          detail:
            'More than 30 firms run limited production trades using DTC-tokenized assets, on DTCC’s private Besu network and on the public Canton network.',
        },
        {
          year: 2026.704,
          lane: 0,
          label: 'Sep 15',
          title: 'Clarity Act stalls',
          detail: 'The Digital Asset Market Clarity Act fails to advance in the Senate.',
        },
        {
          year: 2026.71,
          lane: 1,
          label: 'Sep 17',
          title: 'Innovation Exemption',
          detail:
            'The SEC exempts qualifying Tokenized Securities Venues from the definition of “exchange” for five years, to September 17th, 2031.',
        },
        {
          year: 2026.756,
          lane: 2,
          label: 'Oct 4',
          title: 'OKXICE files notice',
          detail:
            'OKXICE files its initial notice with the SEC, starting a 30-day window in which issuers can object to having their shares listed.',
        },
        {
          year: 2026.822,
          lane: 0,
          label: 'Oct 28',
          title: 'DTCC goes live',
          detail:
            'The DTCC Tokenization Service opens with 34 eligible securities worth about $30 trillion and about 20 signed participants.',
        },
        {
          year: 2026.844,
          lane: 1,
          label: 'Nov 5',
          title: '67 issuers object',
          detail:
            'By November 5th, 67 companies, including Meta, Tesla and Netflix, have chosen not to have their stock tokenized on the venue.',
        },
        {
          year: 2026.893,
          lane: 2,
          label: 'Nov 23',
          title: 'OKXICE opens',
          detail:
            'Eligible US OKX customers can trade more than 70 tokenized securities around the clock, held in their own wallets.',
        },
      ],
    },
    {
      type: 'paragraph',
      text: 'The second switch was the plumbing itself. On October 28th the Depository Trust Company, the DTCC subsidiary that holds the vast majority of US securities, launched the DTCC Tokenization Service. Participants can mint tokenized versions of securities held at DTC, convert them between traditional and tokenized form and deliver them to digital wallets of their choice.[[src:4]]DTCC, "DTCC Tokenization Service Goes Live, Marking Major Milestone in the Adoption of Digital Assets," October 28th, 2026 · https://www.dtcc.com/press-releases/2026/dtcc-tokenization-service-goes-live[[/src]] DTC holds more than $114 trillion of securities; 34 of them, select Russell 1000 stocks, large ETFs and US Treasuries worth about $30 trillion, were eligible at launch, on the Canton Network and on DTCC’s own private Besu blockchain.[[src:5]]Northeast Times, citing CoinDesk and Business Wire, "DTCC Tokenization Service Opens With 34 Securities and 20 Participating Firms," October 28th, 2026 · https://northeasttimes.com/2026/10/28/dtcc-tokenization-service-opens-with-34-securities-and-20-participating-firms/[[/src]] The third switch was the market. On November 23rd OKXICE, a 50/50 venture between OKX and Intercontinental Exchange, opened its venue to eligible US customers inside the OKX app, with tokens held in self-custodial wallets; the venue holds neither the assets nor the private keys.[[src:6]]OKX, "Digital Securities are Coming to OKXICE TSV, with 70+ Assets to be Listed," November 2026 · https://www.okx.com/learn/okxice-tsv-launch[[/src]]',
    },
    { type: 'heading', text: 'Who is actually being replaced', level: 2 },
    {
      type: 'paragraph',
      text: 'A US stock trade today still passes through a broker, a clearinghouse and a depository, and it settles one business day after the trade, the T+1 [[kw:settlement-cycle]]settlement cycle[[/kw]] the US adopted on May 28th, 2024.[[src:7]]US SEC, "SEC Chair Gensler Statement on Upcoming Implementation of T+1 Settlement Cycle," press release 2024-62, May 21st, 2024 · https://www.sec.gov/news/press-release/2024-62[[/src]] The clearinghouse and the depository in that chain are both DTCC subsidiaries. So when Dimon said in May that blockchain will replace financial market infrastructure, the first institution to put a tokenized version of US securities into production was the infrastructure itself.[[src:8]]Benzinga, "Jamie Dimon Says Blockchain Will ‘Replace Financial Market Infrastructure’," June 2026 · https://www.benzinga.com/crypto/cryptocurrency/26/06/52931557/jamie-dimon-says-blockchain-will-replace-financial-market-infrastructure[[/src]] DTCC’s tokens are digital twins of securities that stay in DTC custody: they carry the same legal and economic rights, move only between registered wallets, and can be converted back.[[src:9]]Ledger Insights, "Alpaca, Citi, JP Morgan among early adopters as DTCC Tokenization Service goes live," October 28th, 2026 · https://www.ledgerinsights.com/alpaca-citi-jp-morgan-among-early-adopters-as-dtcc-tokenization-service-goes-live/[[/src]] The OKXICE venue sits on top of real shares as well: Securitize does the tokenizing, and each token is backed one to one by an underlying US share.[[src:10]]Grafa, "OKXICE brings tokenised securities trading to US investors," November 2026 · https://grafa.com/en/news/crypto/okxice-brings-tokenised-securities-trading-to-us-investors[[/src]]',
    },
    {
      type: 'stage-boards',
      figureLabel: 'FIG. 2 · THREE PATHS FOR ONE SHARE',
      kicker:
        'HOW A US SHARE MOVES TODAY, AS A DTCC TOKEN AND ON A TOKENIZED SECURITIES VENUE · FILLED CELL = WHERE THE INCUMBENT STILL SITS · CLICK A STAGE FOR ITS RECORD',
      hint: 'In all three paths, the share itself stays in DTC custody or backs the token one to one.',
      source:
        'US SEC (T+1); DTCC press release, October 28th, 2026; Ledger Insights; SEC fact sheet for Release No. 34-106402; OKX; Grafa. Path structure is an Ezana schematic.',
      boards: [
        {
          id: 'today',
          title: 'Today: the T+1 chain',
          color: 'var(--text-muted)',
          currentIndex: 3,
          stages: [
            {
              label: 'Broker',
              sub: 'market hours',
              note: 'The investor’s order goes to a registered broker-dealer.',
            },
            {
              label: 'Exchange',
              sub: 'matched',
              note: 'The order is executed on an exchange or another trading center.',
            },
            {
              label: 'Clearinghouse',
              sub: 'netted',
              note: 'Trades are netted and guaranteed by DTCC’s clearing arm.',
            },
            {
              label: 'Depository',
              sub: 'T+1',
              note: 'Ownership changes on DTC’s books one business day after the trade.',
            },
          ],
          stats: [
            { value: 'T+1', label: 'standard settlement', source: 'SEC' },
            { value: '$114T+', label: 'held at DTC', source: 'DTCC' },
          ],
          summary: 'Four hand-offs, two of them inside DTCC.',
        },
        {
          id: 'dtcc',
          title: 'A DTCC digital twin',
          color: 'var(--echo-chart-blue)',
          currentIndex: 0,
          stages: [
            {
              label: 'DTC custody',
              sub: 'unchanged',
              note: 'The security stays at DTC; the token is a tokenized securities entitlement to it.',
            },
            {
              label: 'Mint',
              sub: 'Canton or Besu',
              note: 'A participant converts a position into tokens on the public Canton network or DTCC’s private Besu ledger.',
            },
            {
              label: 'Wallet transfer',
              sub: '24/7',
              note: 'Tokens move around the clock, but only between registered wallets.',
            },
            {
              label: 'Convert back',
              sub: 'on demand',
              note: 'Tokens can be converted back into the traditional form.',
            },
          ],
          stats: [
            { value: '34', label: 'eligible securities', source: 'DTCC' },
            { value: '≈$30T', label: 'their market value', source: 'DTCC VIA COINDESK' },
          ],
          summary: 'The depository keeps the asset and issues the token.',
        },
        {
          id: 'tsv',
          title: 'A tokenized securities venue',
          color: 'var(--echo-chart-green)',
          currentIndex: 0,
          stages: [
            {
              label: 'Real share',
              sub: '1:1 backing',
              note: 'At OKXICE, Securitize tokenizes and each token is backed one to one by a US share.',
            },
            {
              label: 'Permissioned access',
              sub: 'eligible users',
              note: 'Only screened, eligible participants can trade, even though the chain is public.',
            },
            {
              label: 'AMM pool',
              sub: 'public smart contract',
              note: 'Trades run through automated market makers whose smart contracts must be public, auditable and on a public, permissionless ledger.',
            },
            {
              label: 'Own wallet',
              sub: '24/7',
              note: 'Tokens settle to the customer’s self-custodial wallet; the venue holds neither assets nor keys.',
            },
          ],
          stats: [
            { value: '70+', label: 'assets at launch', source: 'OKX' },
            { value: '2031', label: 'exemption expiry', source: 'SEC' },
          ],
          summary: 'New front end, same share underneath.',
        },
      ],
    },
    {
      type: 'paragraph',
      text: 'The sign-up list confirms who is building. DTCC’s release named 19 participants at launch, including J.P. Morgan, Citi, Bank of America, Morgan Stanley, State Street, Fidelity Investments and Citadel Securities; most coverage the same day counted 20.[[src:11]]Tradeweb, reproducing the DTCC release, October 28th, 2026 · https://www.tradeweb.com/newsroom/media-center/in-the-news/dtcc-tokenization-service-goes-live-marking-major-milestone-in-the-adoption-of-digital-assets/[[/src]][[src:12]]Unchained, "DTCC turns on its tokenized securities service for 20 clients," October 28th, 2026 · https://unchainedcrypto.com/dtcc-turns-on-its-tokenized-securities-service-for-20-clients-meeting-its-october-target/[[/src]] Either way, it reads like the membership of the system it is supposed to disrupt. On the venue side, the newcomers are partners rather than rivals: OKX brings the app, the wallets and the around-the-clock market, and ICE brings the NYSE’s operator to the cap table. The companies that are genuinely new are narrower than the post implies, a tokenization agent, a handful of issuers that wanted continuous trading and fintechs such as Dinari, which opened 24-hour trading in some tokenized US stocks in May.[[src:13]]iThome, "OKX to launch tokenized securities trading with ICE," November 11th, 2026 · https://www.ithome.com.tw/news/180440[[/src]]',
    },
    {
      type: 'dossier-table',
      figureLabel: 'FIG. 3 · WHO BUILT THE NEW RAILS',
      kicker:
        'THE ORGANIZATIONS BEHIND THE TEN WEEKS · ROLE · WHERE THEY SIT TODAY · KEY RISK · CLICK DOSSIER FOR THE RECORD',
      hint: 'Five of the six are incumbents or partners of incumbents.',
      source:
        'DTCC; Tradeweb; Ledger Insights; OKX; Grafa; Crypto Economy; Fortune; Cointelegraph; Crypto Briefing.',
      headers: ['Organization', 'Role in the ten weeks', 'Today', 'Key risk', ''],
      rows: [
        {
          name: 'DTCC',
          tag: 'DEPOSITORY',
          role: 'Mints tokenized versions of securities it already holds.',
          anchor: 'Holds $114T+',
          keyRisk:
            'Its tokens only move between registered wallets, which limits who can use them.',
          dossier: [
            {
              label: 'Launch',
              text: '34 eligible securities at launch on Canton and Besu, with more networks planned for 2027 and further participants onboarded on a rolling basis.',
            },
          ],
        },
        {
          name: 'Intercontinental Exchange',
          tag: 'ICE',
          role: 'Owner of the NYSE; half-owner of OKXICE.',
          anchor: '50/50 with OKX',
          keyRisk: 'Its own exchanges compete for the same order flow.',
          dossier: [
            {
              label: 'Venue',
              text: 'OKXICE opened its Tokenized Securities Venue on November 23rd under the Innovation Exemption, not as a registered exchange.',
            },
          ],
        },
        {
          name: 'OKX',
          tag: 'CRYPTO EXCHANGE',
          role: 'App, wallets and the around-the-clock market.',
          anchor: 'Front end',
          keyRisk: 'Access is limited to eligible US customers who complete onboarding.',
          dossier: [
            {
              label: 'Custody',
              text: 'Customers hold tokens in self-custodial wallets; the venue holds neither their assets nor their private keys.',
            },
          ],
        },
        {
          name: 'JPMorgan Chase',
          tag: 'JPM',
          role: 'Signed DTCC participant; runs its own blockchain unit, Kinexys.',
          anchor: 'Bank and builder',
          keyRisk: 'Dimon has also warned that yield-bearing stablecoins could blow up.',
          dossier: [
            {
              label: 'Track record',
              text: 'JPM Coin launched on a permissioned blockchain in 2019; JPMorgan issued a tokenized money market fund on Ethereum in December 2025.',
            },
          ],
        },
        {
          name: 'Securitize',
          tag: 'TOKENIZATION AGENT',
          role: 'Tokenizes the shares listed at OKXICE.',
          anchor: '1:1 share backing',
          keyRisk: 'Every token is only as good as the share and custody behind it.',
          dossier: [
            {
              label: 'Structure',
              text: 'Each digital token represents an entitlement backed one to one by an underlying US share.',
            },
          ],
        },
        {
          name: 'Issuers that objected',
          tag: '67 COMPANIES',
          role: 'Used the exemption’s 30-day window to keep their shares off the venue.',
          anchor: 'By Nov 5th',
          keyRisk: 'If the largest companies keep opting out, the venue stays a niche market.',
          dossier: [
            {
              label: 'Who',
              text: 'Meta, Tesla and Netflix were among the 67 companies that had objected by November 5th, according to The Block as reported by TechFlow.',
            },
          ],
        },
      ],
    },
    {
      type: 'paragraph',
      text: 'The objections are the part of the story the post leaves out. Third-party tokens of a company’s shares can trade on a venue only after the issuer is notified and given 30 days to object, and OKXICE’s preliminary list was revised heavily during that window.[[src:14]]Crypto Economy, "OKXICE Brings Tokenized Stock Trading To Market This November," November 2026 · https://crypto-economy.com/?p=342319[[/src]] By November 5th, 67 companies, among them Meta, Tesla and Netflix, had chosen not to have their stock tokenized there.[[src:15]]TechFlow, citing The Block, November 11th, 2026 · https://techflowpost.com/en-US/newsletter/144166[[/src]] What launched was a list built from issuers that wanted continuous trading: tokenized shares of Coinbase, Circle, Robinhood, BitGo and Strategy alongside 59 Direxion ETFs, with Bloomberg reporting that some assets would not be tradable on the first day.[[src:10]]Grafa, November 2026 · https://grafa.com/en/news/crypto/okxice-brings-tokenised-securities-trading-to-us-investors[[/src]][[src:16]]Coinranking, citing Bloomberg, "OKXICE Tokenized Securities Venue From OKX and ICE Opens November 23," November 2026 · https://coinranking.com/news/okxice-tokenized-securities-venue-okx-ice-opens-november-23[[/src]] The venue also opened over the objections of some large Wall Street firms that had campaigned against it.[[src:17]]CoinStats, "OKXICE plans to debut its tokenized stock trading on November 23," November 11th, 2026 · https://coinstats.app/news/4298d073c355dd5735225b56d02d2837725a38934948dc58347cd41def5d53d4_OKXICE-plans-to-debut-its-tokenized-stock-trading-on-November-23/[[/src]]',
    },
    {
      type: 'cta-callout',
      headline: 'See who owns the incumbents building the rails',
      body: 'Ezana’s US Equities research has ICE, JPMorgan, Citi, Bank of America and Morgan Stanley with live prices, quarterly results and institutional ownership. Compare the exchange operator against the banks that signed up for DTCC’s service.',
      ctaLabel: 'Open US Equities research',
      ctaHref: '/company-research',
      ctaAuthGate: false,
    },
    { type: 'heading', text: 'What the exemption allows, and what it caps', level: 2 },
    {
      type: 'paragraph',
      text: 'The post is right that the exemption demands public code. Every smart contract a venue uses must be auditable, public and deployed on a public, permissionless distributed ledger, and venues must publish dollar-denominated trade data within 10 minutes.[[src:18]]US SEC, fact sheet for Release No. 34-106402, September 17th, 2026 · https://www.sec.gov/files/34-106402-fact-sheet.pdf[[/src]] The blockchain is open, but the market is not: only screened, permissioned participants can trade. The bigger limit is size. For the largest stocks, members of the S&P 500 and Russell 1000, a venue may list at most 75 symbols and trade no more than 0.25% of each stock’s average daily share volume from the prior month; for other eligible stocks the limits are 250 symbols and 2.5%.[[src:19]]Skadden via CLS Blue Sky Blog, "Skadden Discusses New SEC Framework for Trading Tokenized Stocks," September 30th, 2026 · https://clsbluesky.law.columbia.edu/2026/09/30/skadden-discusses-new-sec-framework-for-trading-tokenized-stocks/[[/src]] Breaching a symbol cap takes a venue outside the exemption altogether.',
    },
    {
      type: 'adjudication-matrix',
      figureLabel: 'FIG. 4 · WHAT EACH RAIL ACTUALLY CHANGES',
      kicker:
        'FOUR WAYS TO HOLD OR MOVE A US SECURITY × FOUR THINGS TOKENIZATION PROMISES · SAME = DELIVERED · PART = DELIVERED WITH LIMITS · NONE = NOT DELIVERED · CLICK A CELL FOR THE EVIDENCE',
      hint: 'No rail delivers all four promises without a limit.',
      source:
        'US SEC; DTCC; Ledger Insights; Northeast Times citing CoinDesk; OKX; Coinranking; FindLaw; Benzinga; Fortune; Crypto Briefing. Ratings are Ezana’s reading of those sources.',
      cornerLabel: 'Rail \\ Promise',
      legend: {
        same: 'same: delivered',
        part: 'partial: delivered with limits',
        none: 'none: not delivered',
      },
      cols: ['Moves 24/7', 'Settles faster than T+1', 'Public blockchain', 'Open to retail'],
      rows: [
        {
          label: 'Today’s chain',
          cells: [
            {
              value: 'none',
              note: 'Trading and settlement follow market hours and business days.',
            },
            { value: 'none', note: 'The standard cycle is T+1, since May 28th, 2024.' },
            { value: 'none', note: 'Ownership is recorded on DTC’s books, not on a blockchain.' },
            { value: 'same', note: 'Any investor with a brokerage account can buy listed stocks.' },
          ],
        },
        {
          label: 'DTCC tokens',
          cells: [
            {
              value: 'part',
              note: 'Tokens move between registered wallets around the clock, but moving a token from one blockchain to another goes through DTC’s conversion service on set hours.',
            },
            {
              value: 'part',
              note: 'DTCC says assets can be mobilized within minutes, but settlement arrangements are left to participants for now.',
            },
            {
              value: 'part',
              note: 'One of the two networks, Canton, is public; the other is DTCC’s private Besu ledger.',
            },
            {
              value: 'none',
              note: 'The service is for DTC participants and their registered wallets.',
            },
          ],
        },
        {
          label: 'OKXICE venue',
          cells: [
            { value: 'same', note: 'Trading runs 24/7 for eligible customers.' },
            {
              value: 'part',
              note: 'Tokens move to customers’ own wallets, but trading must halt when the underlying stock stops trading on its exchange.',
            },
            {
              value: 'same',
              note: 'Smart contracts must be public, auditable and on a public, permissionless ledger.',
            },
            {
              value: 'part',
              note: 'Only eligible US OKX customers who activate a wallet and pass identity checks.',
            },
          ],
        },
        {
          label: 'JPMorgan deposit coin',
          cells: [
            {
              value: 'same',
              note: 'Dimon says the deposit coin already moves money around the clock.',
            },
            {
              value: 'part',
              note: 'It moves cash between clients, not securities.',
            },
            {
              value: 'part',
              note: 'JPM Coin began on a permissioned chain in 2019; the bank has since used public chains, including a tokenized money market fund on Ethereum.',
            },
            { value: 'none', note: 'It serves JPMorgan’s institutional clients.' },
          ],
        },
      ],
    },
    {
      type: 'paragraph',
      text: 'The matrix shows why “the middlemen are being replaced” overstates the ten weeks. Each rail improves one or two things the T+1 chain does badly, mostly hours and the speed of moving collateral, and each keeps a gate the old system also had: registered wallets, permissioned access, symbol and volume caps, or an issuer’s right to say no. Analysts at Finimize add a practical limit: because the tokens must carry the same rights as the shares, a 24/7 market in them is only as good as the hedges market makers can place when the underlying exchange is closed.[[src:20]]Finimize, "OKX And ICE Set A Date For 24/7 Tokenized US Stock Trading," November 2026 · https://finimize.com/content/okx-and-ice-set-a-date-for-247-tokenized-us-stock-trading[[/src]]',
    },
    { type: 'heading', text: 'The scale, in one bar', level: 2 },
    {
      type: 'paragraph',
      text: 'Size puts the shift in proportion. On November 11th, the value of all tokenized stocks and ETFs reached $3.88 billion, up 13.4% in 30 days.[[src:21]]Odaily, "OKX and ICE to Launch 24/7 Tokenized Stock Trading on November 23," November 11th, 2026 · https://www.odaily.news/en/newsflash/533430[[/src]] That is fast growth from a very small base. The DTCC launch is the bigger number: the 34 eligible securities represent about $30 trillion of market value, or roughly 26% of what DTC holds. Eligibility is not tokenization, though. Neither DTCC nor its participants have disclosed how much has actually been minted, so the $30 trillion is the ceiling of the first phase, not its size.',
    },
    {
      type: 'sentiment-bar',
      figureLabel: 'FIG. 5 · HOW MUCH OF DTC CAN BE TOKENIZED TODAY',
      kicker:
        'SECURITIES HELD AT THE DEPOSITORY TRUST COMPANY, $ TRILLION · SPLIT BY WHETHER THEY WERE ELIGIBLE FOR THE TOKENIZATION SERVICE AT LAUNCH, OCTOBER 28TH, 2026',
      hint: 'About a quarter of DTC’s holdings by value is eligible; none of it has to be tokenized.',
      source:
        'DTC custody ($114T+) and eligible value (≈$30T, 34 securities) from DTCC via Business Wire and CoinDesk. The split is Ezana arithmetic and approximate.',
      title: 'DTC custody, $114 trillion',
      overall: { label: 'About 26% eligible at launch', tone: 'neu' },
      unit: 'T',
      parts: [
        { label: 'Eligible to tokenize (34 securities)', value: 30, tone: 'pos' },
        { label: 'Not yet eligible', value: 84, tone: 'neg' },
      ],
    },
    {
      type: 'paragraph',
      text: 'The arithmetic also explains why the incumbents moved first. A depository that tokenizes the stocks, ETFs and Treasuries investors already use most, and that keeps the underlying securities in its own custody, captures the collateral and settlement benefits without giving up its position. JPMorgan’s Kinexys unit was already built to mirror core banking functions on new rails.[[src:22]]Cointelegraph, "JPMorgan’s Jamie Dimon sees ‘new competitors’ from blockchain, stablecoins," April 6th, 2026 · https://cointelegraph.com/news/jpmorgan-dimon-blockchain-competitors-kinexys-ai[[/src]] What Dimon’s letter called competitors, the ten weeks turned into suppliers.',
    },
    { type: 'heading', text: 'Verdict: a switch-on, not a takeover', level: 2 },
    {
      type: 'paragraph',
      text: 'The post’s five facts hold up: the dates, the five-year exemption, DTCC’s $114 trillion of custody, the OKXICE launch and the public smart-contract rule all match the record, and only the DTCC participant count is soft, 19 in the release and 20 in most coverage. The conclusion is where it overreaches. Blockchain is not replacing the depository, the NYSE’s owner or the big banks; they are the ones operating it, on terms the SEC can revisit before 2031. The newcomers that matter sit in the gaps: tokenization agents, wallets and the issuers willing to trade around the clock.',
    },
    {
      type: 'scenario-chain',
      figureLabel: 'FIG. 6 · THREE WAYS THE NEXT FIVE YEARS GO',
      kicker:
        'BRANCHES FOR TOKENIZED US SECURITIES TO THE EXEMPTION’S SEPTEMBER 17TH, 2031 EXPIRY · EACH CHAIN READS LEFT TO RIGHT',
      hint: 'The deciding variables are the caps, the objections and the rulemaking.',
      source: 'This article’s reporting and framework. Not a forecast.',
      scenarios: [
        {
          id: 'base',
          label: 'BASE CASE · THE INCUMBENTS’ UPGRADE',
          tone: 'base',
          range: 'caps hold',
          steps: [
            {
              label: 'DTCC adds securities and networks',
              sub: 'more networks are planned for 2027',
            },
            {
              label: 'Venues grow inside the caps',
              sub: '0.25% and 2.5% of daily volume',
            },
          ],
          result: {
            value: 'Faster collateral and longer hours, same gatekeepers',
            sub: 'the middlemen tokenize themselves',
          },
        },
        {
          id: 'bear',
          label: 'BEAR CASE · A NICHE MARKET',
          tone: 'bear',
          range: 'objections win',
          steps: [
            { label: 'Large issuers keep opting out', sub: '67 had objected by November 5th' },
            {
              label: 'Off-hours spreads stay wide',
              sub: 'hedging is hard when the exchange is shut',
            },
          ],
          result: {
            value: 'Venues trade mostly crypto names and ETFs',
            sub: 'a sideshow to the T+1 market',
          },
        },
        {
          id: 'alt',
          label: 'DISRUPTION CASE · RULES CATCH UP',
          tone: 'alt',
          range: 'before 2031',
          steps: [
            {
              label: 'Durable rulemaking replaces the exemption',
              sub: 'Atkins says it must follow',
            },
            {
              label: 'Caps lift and access widens',
              sub: 'retail and institutions on one public ledger',
            },
          ],
          result: {
            value: 'New venues compete for real order flow',
            sub: 'the version of the story the post told',
          },
        },
      ],
    },
    {
      type: 'paragraph',
      text: 'For investors, the ten weeks favor the toll collectors over the disruptors. Intercontinental Exchange (ICE) owns half of the first venue to open under the exemption. JPMorgan (JPM), Citi (C), Bank of America (BAC) and Morgan Stanley (MS) signed up for DTCC’s service. Coinbase (COIN), Circle (CRCL) and Robinhood (HOOD) chose to be listed as tokens, while Meta (META), Tesla (TSLA) and Netflix (NFLX) chose not to be. The kill switch for the takeover thesis is measurable: if the volume caps are still binding and most large issuers are still objecting when the SEC writes its permanent rules, tokenization will have upgraded Wall Street’s plumbing without changing who owns it.',
    },
    {
      type: 'cta-callout',
      headline: 'Ask Sonar where tokenized securities stand',
      body: 'Ezana Sonar answers with sources: which venues operate under the Innovation Exemption, which issuers have objected, what DTCC has made eligible and how the banks involved are positioned. Ask about OKXICE, DTCC or any ticker and get the record, not the hype.',
      ctaLabel: 'Open Ezana Sonar',
      ctaHref: '/sonar',
      ctaAuthGate: false,
    },
  ],
};

export default wallStreetTokenizationTenWeeks2026;
