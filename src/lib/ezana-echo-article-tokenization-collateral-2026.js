/**
 * Long-form Ezana Echo article: tokenized real-world assets as COLLATERAL —
 * from ten dairy cows on Brazil's B3 to the largest IPO in history. Editorial /
 * illustrative content for in-app reading; figures attributed to public
 * reporting current as of August 2026. Not live market data, not advice.
 */
export const tokenizationCollateral2026 = {
  id: 'tokenization-collateral-2026',
  title:
    'The Cow Is the Collateral: How Ten Tokenized Cows in Brazil Point at an $8 Trillion Credit Gap',
  excerpt:
    'Farmers in Brazil borrowed nearly $20,000 against ten tokenized dairy cows registered on the B3 exchange. The mechanism they proved points at a $5.7 trillion global small-business credit gap — $8 trillion counting informal enterprises — in countries where only 6% of smallholder farmers can borrow against wealth they already own.',
  heroImage: {
    src: '/echo/tokenizedcows.jpg',
    alt: 'Dairy cows in a pasture — the first livestock tokenized as loan collateral on a national exchange',
    caption:
      'In Paraná, Brazil, ten dairy cows became the first livestock tokenized and registered on the B3 exchange as loan collateral, each wearing an AI-powered collar that streams its health and location to the lender.',
  },
  contentBlocks: [
    {
      type: 'paragraph',
      text: 'In July 2026, farmers in Paraná, Brazil did something no one had done before: they tokenized ten dairy cows, registered the tokens on B3 — the national stock exchange — and borrowed nearly $20,000 against the herd. Each cow carries a unique digital identity tied to an AI-powered collar that streams its health, behavior, and location to the credit agreement in real time, so the lender does not need an inspector, cannot be double-pledged the same animal across two loans, and can even verify a swap if a collateralized cow dies. It is the smallest deal in this article by five orders of magnitude, and it is the most important one, because it demonstrates the part of tokenization the headlines keep missing. The story is not the asset. The story is what an asset can DO once it is tokenized — and the first thing every illiquid asset does when it becomes liquid is get borrowed against.',
    },
    {
      type: 'stat-grid',
      stats: [
        {
          label: 'Cow-backed credit, Paraná pilot',
          value: '~$20K',
          change: '10 tokenized cows on B3 (CoinDesk)',
        },
        {
          label: 'Global MSME finance gap',
          value: '$5.7T',
          change: '$8T incl. informal enterprises',
        },
        {
          label: 'African smallholders with credit access',
          value: '6%',
          change: 'African Development Bank',
        },
        {
          label: 'Stablecoin volume, 2025 (raw)',
          value: '$33T',
          change: 'vs $25.5T Visa+Mastercard combined',
        },
        {
          label: 'Tokenized RWAs today (ex-stablecoins)',
          value: '$30B+',
          change: '~30x since March 2024',
        },
      ],
    },

    { type: 'heading', text: 'Ten cows in Paraná', level: 2 },
    {
      type: 'paragraph',
      text: 'The Brazilian pilot, built by agtech firm Cowmed, exists because banks tightened lending limits on small agricultural businesses. A cow is a real, income-producing asset; what it lacked was a form a lender could trust without driving to the farm. Tokenization supplied the form: a digital record registered with B3 as a movable asset, welded to a sensor feed that makes the collateral continuously observable. Cowmed already tracks roughly 100,000 dairy cows across more than 1,000 farms — a herd worth over $395 million — and expects up to 20% of that network to adopt tokenized financing, which would unlock an estimated $77.6 million in fresh agricultural credit. For scale: total tokenized assets worldwide stood near $25 billion as of March 2026, against McKinsey scenarios of roughly $2–4 trillion by 2030 and a Standard Chartered projection of $30 trillion by 2034. The cows are a rounding error on the market and a controlled experiment on the mechanism.',
    },
    {
      type: 'trajectory',
      figureLabel: 'FIG. 1 · A ROUNDING ERROR, COMPOUNDING',
      kicker:
        'TOKENIZED REAL-WORLD ASSETS EX-STABLECOINS, MARCH 2024 TO MID-2026 ($B) · ROUGHLY 30X IN TWO AND A HALF YEARS.',
      hint: 'Three dated readings of the same total; the projections figure later in this article picks up where this line ends.',
      source:
        'Tokenized US Treasuries crossed $1B in March 2024; total tokenized assets reached ~$25B by March 2026 and sit above $30B ex-stablecoins today (this article’s reporting).',
      yLabel: 'Tokenized RWAs, $B',
      yMax: 36,
      series: [
        {
          key: 'rwa',
          label: 'Tokenized RWAs ex-stablecoins',
          color: 'var(--echo-chart-blue)',
          data: [
            { x: 2024.2, y: 1 },
            { x: 2026.2, y: 25 },
            { x: 2026.5, y: 30 },
          ],
        },
      ],
      annotations: [
        { x: 2024.2, y: 1, label: 'Mar 2024 · $1B in tokenized Treasuries' },
        { x: 2026.2, y: 25, label: 'Mar 2026 · ~$25B total' },
        { x: 2026.5, y: 30, label: 'mid-2026 · $30B+ ex-stablecoins' },
      ],
    },
    {
      type: 'paragraph',
      text: 'The mechanism is [[kw:collateral-utility]]collateral utility[[/kw]]. Roughly $16 trillion of illiquid assets — commercial real estate, private equity stakes, art, farmland, and yes, livestock — sits outside the borrowing system today, per the BCG estimates the industry keeps citing, not because the assets lack value but because verifying, transferring, and seizing them is expensive. Put the same assets on open digital rails and the sequence becomes mechanical: tokenize the building, deposit it into a lending protocol, borrow liquid dollars against it in minutes. Every asset class that crosses that line brings demand to exactly two layers: the infrastructure that secures the record, and the applications that run the lending and trading against it.',
    },

    { type: 'heading', text: 'The $8 trillion gap the cows are pointing at', level: 2 },
    {
      type: 'paragraph',
      text: 'The Paraná pilot reads like a novelty until it is placed against the problem it prototypes. The gap between what the world’s small businesses need to borrow and what they can access runs to [[kw:msme-finance-gap]]$5.7 trillion[[/kw]] — and climbs to roughly $8 trillion once informal enterprises are counted. Sub-Saharan Africa alone accounts for about $331 billion of it, and the African Development Bank puts credit access among African smallholder farmers at just 6%. The cruelty of that number is that the missing collateral often is not missing: farmers across these markets own valuable livestock and simply cannot borrow against it, because banks require the land titles that roughly 80% of rural livestock holders in a province like Pakistan’s Sindh do not have. Livestock is wealth these borrowers already hold. What Paraná demonstrated is the conversion layer — digital identity plus continuous verification plus registry recognition — that turns owned wealth into bankable collateral.',
    },
    {
      type: 'dossier-table',
      figureLabel: 'FIG. 2 · LOCKED OUT WHERE LIVESTOCK WEALTH IS HIGHEST',
      kicker:
        'FORMAL CREDIT ACCESS WHERE THE MISSING COLLATERAL IS LIVESTOCK · LOWEST ACCESS FIRST · CLICK A ROW TO EXPAND THE DOSSIER.',
      hint: 'Four access figures — expand a row for the record.',
      source:
        'Share with formal credit access. African smallholder farmers: African Development Bank. Pakistani SMEs: <200K of 3.2M enterprises. Sindh farmers: provincial data. Mid-herd farmers (7–50 animals) deemed bankable: World Bank. Via CryptoSlate reporting, July 2026.',
      headers: ['Who is locked out', 'What it is', 'Access figure', 'The missing link', ''],
      rows: [
        {
          name: 'African smallholder farmers',
          tag: 'LOWEST ACCESS',
          role: 'The headline of the credit gap — wealth owned, but unbankable.',
          anchor: '6% with credit access',
          keyRisk:
            'The missing collateral often is not missing: farmers own valuable livestock but cannot borrow against it without land titles.',
          dossier: [
            {
              label: 'Source',
              text: 'The African Development Bank puts credit access among African smallholder farmers at just 6%.',
            },
          ],
        },
        {
          name: 'Pakistani SMEs',
          tag: 'FORMAL CREDIT',
          role: 'A country where livestock is 14.6% of GDP and over 62% of agricultural value added.',
          anchor: '~6.3% (fewer than 200K of 3.2M)',
          keyRisk:
            'Fewer than 200,000 of Pakistan’s 3.2 million small enterprises have formal credit — largely because livestock insurance barely exists.',
          dossier: [
            {
              label: 'Why so low',
              text: 'Disease, drought, or theft can erase the collateral and the borrower’s income in the same event, and insurance to cover it barely exists.',
            },
          ],
        },
        {
          name: 'Sindh farmers',
          tag: 'FORMAL LOANS',
          role: 'A provincial snapshot of the land-title barrier.',
          anchor: '~10% with formal loans',
          keyRisk:
            'Roughly 80% of rural livestock holders in Sindh do not have the land titles banks require.',
          dossier: [
            {
              label: 'The barrier',
              text: 'Banks require land titles that roughly 80% of rural livestock holders in the province do not hold, so livestock wealth stays unbankable.',
            },
          ],
        },
        {
          name: 'Mid-herd farmers deemed bankable',
          tag: 'WORLD BANK',
          role: 'The ceiling on who qualifies today — farmers holding seven to fifty animals.',
          anchor: '16% deemed bankable',
          keyRisk:
            'Even among mid-herd farmers, only 16% are judged bankable — largely because livestock insurance to backstop the collateral barely exists.',
          dossier: [
            {
              label: 'Source',
              text: 'The World Bank found only 16% of farmers holding seven to fifty animals bankable.',
            },
          ],
        },
      ],
    },
    {
      type: 'callout',
      label: 'Global small-business credit gap',
      value: '$8T',
      context:
        '$5.7 trillion of unmet formal MSME borrowing demand worldwide, rising to ~$8 trillion including informal enterprises. Sub-Saharan Africa accounts for ~$331 billion; only 6% of African smallholder farmers have access to credit (African Development Bank).',
    },
    { type: 'heading', text: 'Five countries, four missing links', level: 2 },
    {
      type: 'paragraph',
      text: 'The pieces already exist in the markets that need them most — as separate pieces. Ethiopia holds Africa’s largest livestock population, its central bank runs an electronic registry that names cattle, camels, sheep, goats, and poultry as eligible collateral, a national livestock identification and traceability system is being built, and the 2025–2030 agricultural-finance roadmap puts livestock financing demand near ETB 911 billion — yet lenders still lack reliable valuation, insurance, health data, and a recovery path on default. Nigeria carries the group’s biggest near-term gap, about $32.2 billion of unmet small-business credit demand per the IFC, alongside a central-bank registry that can pledge livestock (including unborn offspring) and check double-pledging, an ear-tag and digital-passport identification system, and a $500 million livestock program through 2028 with $70 million earmarked for access to finance — three working systems and no single product connecting them into one loan.',
    },
    {
      type: 'paragraph',
      text: 'Kenya is the control case: its Movable Property Security Rights Registry runs around the clock, its agricultural data systems had registered over 7.2 million farmers by 2025, and lenders registered 34,638 livestock assets as collateral in the year to June 2023 — part of roughly KSh 5.1 trillion in credit supported by movable assets overall, with no blockchain required. Mongolia makes the same point harder: livestock made up about a quarter of the roughly 670,000 pledge notices in its web-based movable-property registry by mid-2023. Ordinary electronic registries already record collateral and set creditor priority. Which means tokenization does not get credit for existing — it has to beat ordinary underwriting on the terms that matter: a bigger loan, a lower rate, a faster approval, a cheaper insurance premium, or a better recovery when the borrower defaults. Pakistan shows what happens when the missing link is insurance: livestock is 14.6% of GDP and over 62% of agricultural value added, yet fewer than 200,000 of the country’s 3.2 million small enterprises have formal credit, and the World Bank found only 16% of farmers holding seven to fifty animals bankable — largely because livestock insurance barely exists, and disease, drought, or theft can erase the collateral and the borrower’s income in the same event.',
    },
    {
      type: 'adjudication-matrix',
      figureLabel: 'FIG. 3 · FIVE COUNTRIES, FOUR MISSING LINKS',
      kicker:
        'LIVESTOCK-COLLATERAL COUNTRIES × THE FOUR LINKS A LOAN NEEDS · SAME = THE ARTICLE CREDITS THIS MARKET WITH THE LINK · PART = IN PROGRESS · — = NOT CREDITED / MISSING. CLICK A CELL FOR THE EVIDENCE.',
      hint: 'Click a cell for the evidence.',
      source: "this article's reporting · IFC · World Bank.",
      cols: [
        'Registry recognizes livestock',
        'Digital ID / traceability',
        'Insurance',
        'Recovery / enforcement',
      ],
      rows: [
        {
          label: 'Ethiopia',
          cells: [
            {
              value: 'same',
              note: 'The central bank runs an electronic registry that names cattle, camels, sheep, goats, and poultry as eligible collateral.',
            },
            {
              value: 'part',
              note: 'A national livestock identification and traceability system is being built.',
            },
            {
              value: 'none',
              note: 'Lenders still lack insurance — one of the four links the 2025–2030 roadmap has not closed.',
            },
            {
              value: 'none',
              note: 'Lenders still lack a recovery path on default, alongside reliable valuation and health data.',
            },
          ],
        },
        {
          label: 'Nigeria',
          cells: [
            {
              value: 'same',
              note: 'A central-bank registry can pledge livestock (including unborn offspring) and check double-pledging.',
            },
            {
              value: 'same',
              note: 'An ear-tag and digital-passport identification system is in place.',
            },
            {
              value: 'none',
              note: 'The IFC puts unmet small-business credit demand at about $32.2 billion; insurance is not among the working systems.',
            },
            {
              value: 'part',
              note: 'The registry can check double-pledging, but no single product connects the three working systems into one loan.',
            },
          ],
        },
        {
          label: 'Kenya',
          cells: [
            {
              value: 'same',
              note: 'The Movable Property Security Rights Registry runs around the clock — the control case.',
            },
            {
              value: 'part',
              note: 'Agricultural data systems had registered over 7.2 million farmers by 2025.',
            },
            { value: 'none' },
            {
              value: 'same',
              note: 'Lenders registered 34,638 livestock assets as collateral in the year to June 2023 — part of ~KSh 5.1 trillion in credit supported by movable assets.',
            },
          ],
        },
        {
          label: 'Mongolia',
          cells: [
            {
              value: 'same',
              note: 'Livestock made up about a quarter of the ~670,000 pledge notices in its web-based movable-property registry by mid-2023.',
            },
            { value: 'none' },
            { value: 'none' },
            {
              value: 'same',
              note: 'Ordinary electronic registries already record collateral and set creditor priority — no blockchain required.',
            },
          ],
        },
        {
          label: 'Pakistan',
          cells: [
            { value: 'none' },
            { value: 'none' },
            {
              value: 'none',
              note: 'Livestock insurance barely exists, so disease, drought, or theft can erase the collateral and the income at once.',
            },
            {
              value: 'none',
              note: 'With no insurance and no recovery path, a lender cannot repossess value a shock has already destroyed.',
            },
          ],
        },
      ],
    },

    { type: 'heading', text: 'The marketplace thesis: watch the venue, not the asset', level: 2 },
    {
      type: 'paragraph',
      text: 'This is why the smart framing inverts the usual [[kw:real-world-assets]]RWA[[/kw]] pitch. Coverage fixates on which assets come on-chain — the tokenized treasuries, the funds, the gold. But tokenized treasuries crossing $1 billion in March 2024 and total tokenized RWAs passing $30 billion by mid-2026 (a ~30x in two and a half years) mostly enriched the entities doing the tokenizing and the venues where the tokens move. The durable economics sit with licensed issuers earning fees at issuance and on assets under administration, and with the trading and lending venues charging basis points on every transaction — a toll structure, not a treasure hunt. The base blockchains matter, but block space behaves like a commodity: when one network overprices it, volume routes to another, which is why the rails can carry 100x more volume without the toll they charge growing much at all. In a consolidation the value accrues to whoever holds the scarce permission — and in tokenization the scarce thing is the regulatory license stack, not the code.',
    },
    {
      type: 'callout',
      label: 'On-chain settlement, 2025',
      value: '$33T',
      context:
        'Raw on-chain stablecoin volume in 2025 — above Visa and Mastercard’s combined $25.5T in processed payments. The honest caveat: raw on-chain volume includes trading and bot churn; Chainalysis’s bot-adjusted 2025 figure is $28T. Either way, the rails are carrying card-network scale.',
    },

    { type: 'heading', text: 'The rails are being rebuilt in plain sight', level: 2 },
    {
      type: 'paragraph',
      text: 'If the volume numbers were theoretical, the incumbents would not be paying real money to stand on the new rails. Stripe bought stablecoin-infrastructure firm Bridge for $1.1 billion and then backed its own blockchain, Tempo, which debuted in early 2026 — and Visa now operates an anchor validator on it. Mastercard signed a definitive agreement in March 2026 to acquire London stablecoin-infrastructure company BVNK for up to $1.8 billion — $1.5 billion fixed plus $300 million contingent, expected to close by year-end — the largest acquisition in stablecoin history. PayPal issues its own dollar token, PYUSD. Circle, the issuer of USDC, trades on the NYSE around a $30 billion valuation. Crypto M&A overall ran about $37 billion in 2025, up more than sevenfold in a year. The pattern rhymes with every plumbing rebuild in payments history: the companies that ended up sitting in the middle of electronic card payments — Visa and Mastercard themselves — were assembled quietly, in the layer almost nobody watched, and they are now the ones buying seats on the replacement.',
    },
    {
      type: 'multi-axis',
      figureLabel: 'FIG. 4 · CARD-NETWORK SCALE, ALREADY',
      kicker:
        '2025 SETTLEMENT VOLUME, $T · STABLECOIN RAILS VS. THE INCUMBENT CARD NETWORKS · RAW AND BOT-ADJUSTED READINGS SHOWN SEPARATELY.',
      hint: 'Hover a column for its reading; the bot-adjusted figure is the more defensible one.',
      source:
        'Raw on-chain stablecoin volume 2025 vs. Visa and Mastercard combined processed payments; Chainalysis bot-adjusted 2025 figure.',
      categories: [
        'Visa + Mastercard combined',
        'Stablecoins, raw on-chain',
        'Stablecoins, bot-adjusted',
      ],
      series: [
        {
          label: 'Settlement volume 2025',
          kind: 'bar',
          unit: '$T',
          values: [25.5, 33, 28],
        },
      ],
    },
    { type: 'heading', text: 'The access problem, sized in one IPO', level: 2 },
    {
      type: 'paragraph',
      text: 'On June 12, 2026, SpaceX ran the largest initial public offering in history: more than 555 million shares at $135, a $75 billion raise — roughly triple the previous record — at a valuation near $1.8 trillion that closed its first day around $2.1 trillion. The book was about five times oversubscribed, institutions led the chase, and retail’s allocation was squeezed into the low-20% range from a targeted 30%. Billions of people who watched the company get built could participate only through one exchange, via one country’s brokerage rails, if they could access them at all. That is the access problem tokenization exists to solve: ownership recorded on open rails instead of national paperwork, trading globally, around the clock, in fractions as small as a buyer wants. Today’s $30-billion-and-change in tokenized assets is a rounding error against what a single name at that scale would represent on-chain.',
    },
    {
      type: 'quote',
      text: 'The totality of people’s assets is going to be represented in these wallets. You’re not even going to notice it. It’s going to be so seamless and smooth.',
      source: 'Sandy Kaul, Franklin Templeton, February 2026',
    },

    { type: 'heading', text: 'The growth arc and the honest projections', level: 2 },
    {
      type: 'paragraph',
      text: 'The trajectory so far is steep but small: tokenized US Treasuries crossed $1 billion for the first time in March 2024; total tokenized assets reached about $25 billion by March 2026 and sit above $30 billion ex-stablecoins today. The 2030 projections from the banks span a telling range — McKinsey’s conservative case around $2 trillion, Citi’s June 2026 base case at $5.5 trillion, BCG’s estimate at $16 trillion, with Standard Chartered stretching to $30 trillion by 2034. Read the low end honestly: the most cautious projection from the most cautious bank still implies roughly 60x growth from today. And the demand side is not waiting for permission — BlackRock’s Larry Fink has publicly framed every stock, bond, and fund as tokenizable, exchanges have moved on tokenized-equity approvals, and the incumbent settlement plumbing is piloting its own tokenization services.',
    },
    {
      type: 'revision-ledger',
      figureLabel: 'FIG. 5 · WHERE THE BANKS SAY THIS GOES BY 2030',
      kicker:
        'TOKENIZED-ASSET TOTAL: ~$30B TODAY → 2030 BANK PROJECTIONS · √-SCALE · GROWTH IS FAVORABLE (GREEN). CLICK A ROW FOR THE RECORD.',
      hint: 'Bar length on a √-scale; each row is today’s base vs. a 2030 projection.',
      source:
        'Projected tokenized-asset totals by 2030, $ trillions. Sources: McKinsey (conservative case), Citi "Tokenization 2030" (June 2026), BCG. Standard Chartered projects $30T by 2034. Current base: ~$30B+ ex-stablecoins (mid-2026).',
      scale: 'sqrt',
      unit: '$T',
      rows: [
        {
          label: 'McKinsey — conservative case',
          before: 0.03,
          after: 2,
          beforeDisplay: '≈$30B',
          afterDisplay: '$2.0T',
          delta: 1.97,
          deltaDisplay: '+$2.0T',
          favorable: 'up',
          record:
            'The most cautious projection from the most cautious bank still implies roughly 60x growth from today’s ~$30B base.',
        },
        {
          label: 'Citi — base case (June 2026)',
          before: 0.03,
          after: 5.5,
          beforeDisplay: '≈$30B',
          afterDisplay: '$5.5T',
          delta: 5.47,
          deltaDisplay: '+$5.5T',
          favorable: 'up',
          record:
            'Citi’s June 2026 "Tokenization 2030" base case puts the total at $5.5 trillion by 2030.',
        },
        {
          label: 'BCG — high case',
          before: 0.03,
          after: 16,
          beforeDisplay: '≈$30B',
          afterDisplay: '$16T',
          delta: 15.97,
          deltaDisplay: '+$16T',
          favorable: 'up',
          record:
            'BCG’s estimate reaches $16 trillion by 2030 — in line with the ~$16 trillion of illiquid assets sitting outside the borrowing system today.',
        },
      ],
      verdict:
        'Even the low end implies ~60x growth from today; Standard Chartered stretches to $30 trillion by 2034.',
    },

    { type: 'heading', text: 'What can go wrong, and how to position', level: 2 },
    {
      type: 'paragraph',
      text: 'The risk is timing, not direction — and collateral itself. Nearly all of this is gated on regulation actually moving, and being early on the trade looks identical to being wrong for exactly as long as patience holds. Collateral utility adds its own failure modes the pitch decks skip: oracles can misprice, custody can fail, and the legal enforceability of an on-chain lien over a physical asset — a building, a painting, a cow — is only as strong as the local courts behind it. The Paraná pilot works because the sensor feed and B3 registration close that gap for livestock; most asset classes have not built their equivalent yet. The Mongolia and Kenya registries deserve the same discipline as a benchmark: a normal database can already record which animal secures which loan, so the burden of proof sits on borrowing terms — a digitally verified animal has to unlock a bigger loan, a lower rate, or a better recovery than the same animal gets today, or tokenization remains a pilot with no measurable effect on who can borrow. And the raw volume statistics get the same treatment: $33 trillion of on-chain movement includes an enormous amount of trading churn, which is why the bot-adjusted $28 trillion is the more defensible number.',
    },
    {
      type: 'scenario-chain',
      figureLabel: 'FIG. 6 · BASE, BEAR, AND THE QUIET BEAR',
      kicker:
        'THREE BRANCHES FOR THE COLLATERAL TRADE · EACH CHAIN MULTIPLIES ITS CONDITIONS INTO AN OUTCOME · THE RISK IS TIMING, NOT DIRECTION.',
      hint: 'Read each chain left to right.',
      source: 'this article’s reporting and framework.',
      scenarios: [
        {
          id: 'base',
          label: 'BASE CASE · THE LOW END PROVES CONSERVATIVE',
          tone: 'base',
          range: '~60x floor',
          steps: [
            {
              label: 'Issuance keeps compounding',
              sub: 'licensed issuers earn at issuance and on AUA',
            },
            {
              label: 'Lending infrastructure builds',
              sub: 'venues charge basis points on tokenized collateral',
            },
          ],
          result: {
            value: 'The venues become the quiet giants of the cycle',
            sub: 'the toll structure, not the treasure hunt',
          },
        },
        {
          id: 'bear',
          label: 'BEAR CASE · THE ADOPTION CLOCK RESETS',
          tone: 'bear',
          range: 'years lost',
          steps: [
            { label: 'Regulatory stall', sub: 'nearly all of this is gated on regulation moving' },
            { label: 'A collateral failure', sub: 'a mispriced oracle, an unenforceable lien' },
          ],
          result: {
            value: 'Being early looks identical to being wrong',
            sub: 'for exactly as long as patience holds',
          },
        },
        {
          id: 'quiet-bear',
          label: 'DEVELOPMENT-FINANCE BEAR · QUIETER AND WORSE',
          tone: 'bear',
          range: 'human cost',
          steps: [
            {
              label: 'Registries never connect',
              sub: 'identity, insurance, and recovery stay separate',
            },
            {
              label: 'Debt against uninsured animals',
              sub: 'a lender cannot repossess destroyed value',
            },
          ],
          result: {
            value: 'A drought erases collateral and income in the same season',
            sub: 'the borrower keeps the debt',
          },
        },
      ],
      killSwitch:
        'A high-profile collateral failure (a mispriced oracle, an unenforceable lien) resets the adoption clock by years.',
    },
    {
      type: 'paragraph',
      text: 'The base case: issuance and lending infrastructure keep compounding, the bank projections’ low end proves conservative, and the venues charging basis points on tokenized collateral become the quiet giants of the cycle. The bear case: a regulatory stall or a high-profile collateral failure — a mispriced oracle, an unenforceable lien — resets the adoption clock by years. The development-finance version of the bear case is quieter and worse: the registries and identity systems never connect, farmers take on debt against uninsured animals a lender cannot repossess, and a drought erases the collateral and the income in the same season. Investors tracking who is actually positioned for either branch can watch it happen in the disclosures: Ezana’s SEC filings, lobbying, and congressional trading datasets show which incumbents are buying, lobbying, and personally trading around tokenization policy, and prediction markets are already pricing the regulatory timelines the whole trade depends on. Ten cows in Paraná will not move any of those numbers. The mechanism they proved will.',
    },
  ],
  globeRail: {
    metric: {
      title: 'TOKENIZED RWAs ($B)',
      data: [
        { x: 2024.2, y: 1 },
        { x: 2026.2, y: 25 },
        { x: 2026.5, y: 30 },
      ],
      startLabel: 'Mar 2024 · $1B',
      endLabel: 'mid-2026 · $30B+',
      note: 'Tokenized RWAs ex-stablecoins — ~30x since March 2024 (this article’s reporting).',
    },
    cities: [
      {
        name: 'São Paulo',
        country: 'Brazil',
        lat: -23.55,
        lng: -46.63,
        impact:
          'In a Paraná pilot, farmers tokenized ten dairy cows, registered them on Brazil’s B3 exchange, and borrowed nearly $20,000 against the herd. Cowmed — which already tracks ~100,000 dairy cows across 1,000+ farms — expects up to 20% of that network to adopt tokenized financing, an estimated $77.6 million in fresh agricultural credit.',
      },
      {
        name: 'Addis Ababa',
        country: 'Ethiopia',
        lat: 9.03,
        lng: 38.74,
        impact:
          'Ethiopia holds Africa’s largest livestock population, and its central bank runs an electronic registry naming cattle, camels, sheep, goats, and poultry as eligible collateral. Its 2025–2030 roadmap puts livestock-financing demand near ETB 911 billion, yet lenders still lack reliable valuation, insurance, health data, and a recovery path on default.',
      },
      {
        name: 'Lagos',
        country: 'Nigeria',
        lat: 6.52,
        lng: 3.38,
        impact:
          'Nigeria carries the group’s biggest near-term gap — about $32.2 billion of unmet small-business credit demand (IFC). It already runs a central-bank registry that can pledge livestock and check double-pledging, an ear-tag and digital-passport system, and a $500 million livestock program, but no single product connects them into one loan.',
      },
      {
        name: 'Nairobi',
        country: 'Kenya',
        lat: -1.29,
        lng: 36.82,
        impact:
          'Kenya is the article’s control case: its Movable Property Security Rights Registry runs around the clock, and lenders registered 34,638 livestock assets as collateral in the year to June 2023 — part of roughly KSh 5.1 trillion in credit supported by movable assets, with no blockchain required.',
      },
      {
        name: 'Ulaanbaatar',
        country: 'Mongolia',
        lat: 47.89,
        lng: 106.91,
        impact:
          'In Mongolia, livestock made up about a quarter of the roughly 670,000 pledge notices in the web-based movable-property registry by mid-2023 — evidence that an ordinary electronic registry can already record collateral and set creditor priority.',
      },
      {
        name: 'Karachi',
        country: 'Pakistan',
        lat: 24.86,
        lng: 67.0,
        impact:
          'In Pakistan, livestock is 14.6% of GDP and over 62% of agricultural value added, yet fewer than 200,000 of 3.2 million small enterprises have formal credit. In Sindh, roughly 80% of rural livestock holders lack the land titles banks require, and livestock insurance barely exists.',
      },
    ],
  },
  author: 'Ezana Finance Editorial',
  category: 'crypto',
  subcategory: 'DeFi',
  meta: {
    sectors: ['Financials'],
    industries: ['Capital Markets', 'Financial Exchanges & Data'],
    investors: ['Larry Fink'],
    institutions: ['BlackRock', 'Circle', 'Mastercard', 'Stripe', 'Franklin Templeton'],
    government: ['B3', 'U.S. Treasury', 'SEC'],
    geos: ['Brazil', 'United States', 'Sub-Saharan Africa', 'Pakistan'],
    assetClasses: ['Real-World Assets', 'Stablecoins', 'Equities'],
    themes: ['Tokenization', 'Collateral Utility', 'Financial Inclusion'],
    datasets: ['SEC filings', 'Prediction markets'],
    markets: [{ label: 'Tokenized RWAs above $50B by mid-2027', source: 'Polymarket' }],
  },
  tickers: ['CRCL', 'COIN', 'MA', 'V', 'PYPL', 'BLK', 'NDAQ', 'SPCX'],
  readTime: 10,
  publishedAt: '2026-08-02',
  featured: false,
  // AOTM fallback flag (see AOTM_HISTORY convention in ezana-echo-mock.js).
  articleOfMonth: true,
  likes: 0,
  comments: 0,
  reads: 0,
  listMeta: '2 Aug 2026',
};
