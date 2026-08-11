// src/lib/ezana-echo-article-stablecoin-settlement-layer-2026.js
// Ezana Echo DRAFT article: stablecoins as a de facto settlement layer at
// card-network scale. Expands the verified $33T raw-volume stat from
// ezana-echo-article-tokenization-collateral-2026.js and reuses its framing
// (raw $33T 2025 volume vs $25.5T Visa+Mastercard combined; Chainalysis
// bot-adjusted $28T caveat). status: 'draft', nothing publishes until cleared.
//
// ============================================================
// FACT CHECK MANIFEST (status: draft, nothing publishes until cleared)
// 1. Raw on-chain stablecoin volume in 2025 was $33 trillion -> [VERIFY: Ezana Echo, tokenization-collateral-2026; Artemis/Allium raw volume data]
// 2. Visa and Mastercard combined processed $25.5 trillion in payments in 2025 -> [VERIFY: Visa and Mastercard annual reports, FY2025]
// 3. Chainalysis's bot-adjusted 2025 stablecoin volume figure is $28 trillion -> [VERIFY: Chainalysis, 2025 adjusted-volume methodology]
// 4. Artemis/Allium adjusted-volume metrics filter exchange and bot churn further and put the organic-payments slice far below the raw total -> [VERIFY: Artemis/Allium adjusted stablecoin volume dashboards]
// 5. Total stablecoin supply outstanding is roughly $280 billion as of mid-2026 -> [VERIFY: DeFiLlama / Artemis stablecoin supply data]
// 6. Tether's USDT supply is roughly $155 billion as of mid-2026 -> [VERIFY: Tether attestations; DeFiLlama]
// 7. Circle's USDC supply is roughly $60 billion as of mid-2026 -> [VERIFY: Circle attestations; DeFiLlama]
// 8. Tether reported roughly $13 billion in 2024 profit -> [VERIFY: Tether Q4 2024 attestation / company statements]
// 9. Tether's direct and indirect US Treasury exposure exceeds $120 billion, which would rank it among the top-20 holders of US Treasuries, sovereign nations included -> [VERIFY: Tether attestations; US Treasury TIC data]
// 10. Monthly raw settlement volume rose from roughly $2.1 trillion in January 2025 to roughly $3.4 trillion in December 2025 (FIG. 1 bar series, sums to $33T) -> [VERIFY: Artemis/Allium monthly volume data]
// 11. Monthly stablecoin transaction counts rose from roughly 950 million to roughly 1.5 billion across 2025, about 14.7 billion transactions for the year (FIG. 1 line series) -> [VERIFY: Artemis/Allium transaction count data]
// 12. Average transaction size declined across 2025 as the payments share of volume grew -> [VERIFY: Artemis/Allium adjusted volume data]
// 13. Tether launched in October 2014 under the name Realcoin -> [VERIFY: company history; contemporaneous coverage]
// 14. USDC launched in 2018 as a Circle and Coinbase joint venture (the Centre consortium) -> [VERIFY: Circle/Coinbase announcements, 2018]
// 15. TerraUSD collapsed in May 2022, erasing roughly $40 billion across UST and LUNA -> [VERIFY: contemporaneous market coverage, May 2022]
// 16. USDC broke its peg to roughly $0.87 in March 2023 after Circle disclosed $3.3 billion of reserves at Silicon Valley Bank -> [VERIFY: Circle disclosures; March 2023 coverage]
// 17. PayPal launched PYUSD in August 2023, the first stablecoin issued by a major US financial company -> [VERIFY: PayPal announcement, August 2023]
// 18. Circle listed on the NYSE in June 2025 and trades around a $30 billion valuation -> [VERIFY: NYSE listing data; Ezana Echo, tokenization-collateral-2026]
// 19. The GENIUS Act, the first US federal stablecoin framework, was signed in July 2025 -> [VERIFY: Public Law record, July 2025]
// 20. The GENIUS Act requires 1:1 reserves in cash and short-dated US Treasuries with monthly disclosure -> [VERIFY: GENIUS Act statutory text]
// 21. Mastercard signed a definitive agreement in March 2026 to acquire BVNK for up to $1.8 billion ($1.5 billion fixed plus $300 million contingent), the largest acquisition in stablecoin history -> [VERIFY: Mastercard announcement, March 2026; Ezana Echo, tokenization-collateral-2026]
// 22. Stripe acquired Bridge for $1.1 billion and backed its own blockchain, Tempo, which debuted in early 2026 -> [VERIFY: Stripe announcements; Ezana Echo, tokenization-collateral-2026]
// 23. Visa operates an anchor validator on Tempo -> [VERIFY: Visa/Tempo announcements, 2026]
// 24. Visa has settled card obligations in USDC with selected partners since pilots that began in 2021 and expanded in 2023 -> [VERIFY: Visa stablecoin settlement announcements]
// 25. Coinbase receives roughly half of the reserve income on USDC under its agreement with Circle -> [VERIFY: Circle S-1 / Coinbase disclosures]
// 26. USDT turned over roughly 140x its average supply in 2025 (about $19.8T of volume on roughly $140B average supply) (FIG. 3) -> [VERIFY: Artemis/Allium volume data; Tether attestations]
// 27. USDC turned over roughly 210x its average supply in 2025 (about $9.4T of volume on roughly $45B average supply) (FIG. 3) -> [VERIFY: Artemis/Allium volume data; Circle attestations]
// 28. Sky's USDS/DAI settled roughly $1.3T in 2025 on roughly $5B average supply (velocity ~260x) (FIG. 3) -> [VERIFY: Artemis/Allium volume data]
// 29. First Digital's FDUSD settled roughly $1.2T in 2025 on roughly $2.5B average supply (velocity ~480x), inflated by zero-fee exchange trading promotions (FIG. 3) -> [VERIFY: Artemis/Allium volume data; exchange fee-promotion coverage]
// 30. PayPal's PYUSD settled roughly $0.3T in 2025 on roughly $1B average supply (velocity ~300x) (FIG. 3) -> [VERIFY: Artemis/Allium volume data; PayPal disclosures]
// 31. All other stablecoins combined settled roughly $1.0T in 2025 on roughly $40B average supply (velocity ~25x), with yield-bearing designs largely parked (FIG. 3) -> [VERIFY: Artemis/Allium volume data]
// 32. Exchange settlement, market-maker rebalancing, and DeFi collateral flows make up the large majority of raw volume; organic payments are the smallest but fastest-growing slice -> [VERIFY: Artemis/Allium flow-classification data]
// 33. The global average cost of sending a $200 remittance through conventional channels is roughly 6.4%, versus under 1% on stablecoin rails -> [VERIFY: World Bank Remittance Prices Worldwide; corridor pricing data]
// 34. In Nigeria and Argentina, dollar stablecoins trade at persistent premiums to official exchange rates and function as household dollarization -> [VERIFY: P2P exchange pricing data; Chainalysis geography reports]
// 35. Crypto M&A overall ran about $37 billion in 2025, up more than sevenfold in a year -> [VERIFY: Ezana Echo, tokenization-collateral-2026; deal-tracking data]
// 36. Combined stablecoin issuer holdings of US Treasuries are roughly $180 billion -> [VERIFY: issuer attestations (Tether, Circle) aggregated]
// 37. Treasury Secretary Scott Bessent has projected stablecoin-driven demand for US Treasuries exceeding $2 trillion by 2028 -> [VERIFY: Bessent public remarks, 2025]
// 38. Quote: 'We are going to keep the US the dominant reserve currency in the world, and we are going to use stablecoins to do that' -> [VERIFY: Scott Bessent public remarks, 2025; confirm exact wording]
// 39. The EU's MiCA framework caps large-stablecoin transaction activity and has kept USDT delisted from EU-regulated venues -> [VERIFY: MiCA text; EU exchange delisting notices]
// 40. Circle's reserve income is rate-sensitive: most revenue derives from short-dated Treasury yields, so Fed cuts compress it -> [VERIFY: Circle public filings]
// 41. Tether relocated its headquarters to El Salvador in January 2025 -> [VERIFY: Tether announcement, January 2025]
// 42. Western Union's core consumer money-transfer business is concentrated in the high-fee corridors stablecoin rails price against -> [VERIFY: Western Union annual report segment data]
// 43. Annual raw stablecoin settlement volume grew from roughly $7T (2022) to $10T (2023) to $19T (2024) to $33T (2025) (globe rail metric) -> [VERIFY: Artemis/Allium historical volume data]
// 44. Visa processed roughly $13.2 trillion and Mastercard roughly $12.3 trillion in total volume in their 2025 fiscal years (the $25.5T combined figure) -> [VERIFY: Visa FY2025 10-K; Mastercard FY2025 10-K]
// 45. Stablecoins operate 24/7 with final settlement in minutes, versus next-business-day batch settlement on card networks -> [VERIFY: network settlement documentation]
// ============================================================

export const stablecoinSettlementLayer2026 = {
  id: 'stablecoin-settlement-layer-2026',
  title:
    'The Settlement Layer Nobody Voted On: Stablecoins Moved $33 Trillion in 2025, More Than Visa and Mastercard Combined',
  excerpt:
    'Raw on-chain stablecoin volume reached $33 trillion in 2025 [VERIFY: Artemis/Allium data], above the $25.5 trillion Visa and Mastercard processed combined [VERIFY: annual reports]. Two private issuers mint most of the dollars, exchange churn drives most of the flow, and the card networks are paying billions to stand on rails they do not control.',
  heroImage: {
    src: '/images/ezana-echo/stablecoin-settlement-layer-2026-hero.png',
    alt: 'A stylized global payments map rendered as blockchain rails, with dollar-token flows overtaking card-network arcs',
    caption:
      'In 2025 the raw dollar volume settling over stablecoin rails passed the combined processed volume of Visa and Mastercard. No legislature designed the network; two private issuers mint most of it.',
  },
  contentBlocks: [
    {
      type: 'paragraph',
      text: 'In 2025, dollar stablecoins settled $33 trillion of raw on-chain volume [VERIFY: Artemis/Allium raw volume data], more than the $25.5 trillion Visa and Mastercard processed combined across their fiscal years [VERIFY: Visa and Mastercard annual reports]. That sentence describes a payments network at global-incumbent scale, and it describes a network no legislature designed, no central bank operates, and no user ever voted on. The dollars are minted by private companies, the largest of them headquartered in El Salvador [VERIFY: Tether relocation announcement, January 2025], the ledger is public infrastructure nobody owns, and the settlement is final in minutes, around the clock, while the card networks still batch to next business day [VERIFY: network settlement documentation]. The honest version of the story requires deflating the raw number, naming who actually issues the dollars, and separating trading churn from the payments volume that is quietly becoming the point.',
    },
    {
      type: 'stat-grid',
      stats: [
        {
          label: 'Raw stablecoin volume, 2025',
          value: '$33T',
          change: 'vs $25.5T Visa+Mastercard combined',
        },
        {
          label: 'Bot-adjusted volume (Chainalysis)',
          value: '$28T',
          change: 'Strips wash and bot churn',
        },
        {
          label: 'Stablecoin supply outstanding',
          value: '~$280B',
          change: 'Mid-2026, all issuers',
        },
        {
          label: 'Tether US Treasury exposure',
          value: '$120B+',
          change: 'Top-20 holder, sovereigns included',
        },
        {
          label: 'Largest stablecoin acquisition',
          value: '$1.8B',
          change: 'Mastercard-BVNK, March 2026',
        },
      ],
    },

    { type: 'heading', text: 'Card-network scale, measured honestly', level: 2 },
    {
      type: 'paragraph',
      text: 'Start with the caveat, because the caveat is where the credibility lives. Raw on-chain volume counts every transfer: exchange deposits, market-maker rebalancing, bot loops that move the same dollar fifty times a day. Chainalysis strips the identifiable bot churn and still arrives at $28 trillion for 2025 [VERIFY: Chainalysis adjusted-volume methodology], and the stricter adjusted-volume metrics published by Artemis and Allium filter further, putting the organic-payments slice far below the raw total [VERIFY: Artemis/Allium adjusted dashboards]. This article inherits its headline framing from a prior Ezana Echo piece, The Cow Is the Collateral, which used the same pair of numbers with the same caveat: raw $33 trillion, bot-adjusted $28 trillion, either way a rail carrying card-network scale [VERIFY: Ezana Echo, tokenization-collateral-2026]. The deflated number is the one worth arguing from, and the deflated number still clears the card networks.',
    },
    {
      type: 'paragraph',
      text: 'The cadence of the volume matters as much as the total. Monthly raw settlement climbed from roughly $2.1 trillion in January 2025 to roughly $3.4 trillion in December [VERIFY: Artemis/Allium monthly data], while monthly transaction counts rose from about 950 million to about 1.5 billion, roughly 14.7 billion transfers on the year [VERIFY: Artemis/Allium transaction counts]. Volume growing 60% while counts grow at a similar clip means average ticket size held while the mix shifted: the payments share of activity grew all year, pulling average transaction size down within the organic slice even as institutional settlement blocks got larger [VERIFY: Artemis/Allium adjusted volume data]. A network whose transaction count compounds alongside its dollar volume is behaving like payments infrastructure, not like a casino chip.',
    },
    {
      type: 'multi-axis',
      figureLabel: 'FIG. 1 · CARD SCALE, MONTH BY MONTH',
      kicker:
        'MONTHLY RAW STABLECOIN SETTLEMENT (BARS, $B) VS TRANSACTION COUNT (LINE, MILLIONS) · 2025 · EACH SERIES ON ITS OWN SCALE · BARS SUM TO THE $33T YEAR.',
      hint: 'Hover any month for both series at that point.',
      source:
        'DRAFT [VERIFY: Artemis/Allium monthly stablecoin volume and transaction count data, 2025]',
      categories: [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ],
      series: [
        {
          label: 'Settlement volume',
          kind: 'bar',
          unit: '$B',
          values: [2100, 2200, 2400, 2500, 2600, 2700, 2800, 2900, 3000, 3100, 3300, 3400],
        },
        {
          label: 'Transactions',
          kind: 'line',
          unit: 'M tx',
          values: [950, 980, 1050, 1100, 1150, 1200, 1250, 1300, 1350, 1400, 1450, 1500],
        },
      ],
    },

    { type: 'heading', text: 'Twelve years from a Bitfinex side project', level: 2 },
    {
      type: 'paragraph',
      text: 'No committee planned this. Tether launched in October 2014 under the name Realcoin [VERIFY: company history], a convenience token for exchanges that could not get bank accounts. USDC followed in 2018 as a Circle and Coinbase joint venture built to be the audited alternative [VERIFY: 2018 announcements]. The category then survived, in sequence, the failures that were supposed to end it: TerraUSD, an algorithmic design with no full reserve, collapsed in May 2022 and erased roughly $40 billion [VERIFY: May 2022 coverage]; USDC itself broke to roughly $0.87 in March 2023 when Circle disclosed $3.3 billion stranded at Silicon Valley Bank [VERIFY: Circle disclosures], and repegged within days when the deposits were guaranteed. Each failure culled a design, not the category, and the survivors absorbed the volume. By August 2023 PayPal was issuing its own token [VERIFY: PayPal announcement], by June 2025 Circle was a NYSE-listed company [VERIFY: NYSE listing data], and in July 2025 the GENIUS Act gave the category its first US federal framework [VERIFY: Public Law record, July 2025].',
    },
    {
      type: 'wall-timeline',
      figureLabel: 'FIG. 2 · TWELVE YEARS TO A SETTLEMENT LAYER',
      kicker:
        'STABLECOIN MILESTONES · 2014-2026 · FRACTIONAL-YEAR MARKERS · THE LEGITIMATION WINDOW SHADED. CLICK ANY PLAQUE FOR THE RECORD.',
      hint: 'Click a plaque for its record.',
      source:
        'DRAFT [VERIFY: company announcements, Public Law record, NYSE listing data, contemporaneous coverage 2014-2026]',
      startYear: 2014,
      endYear: 2027,
      windows: [
        {
          id: 'legitimation',
          label: 'The legitimation window',
          from: 2025.4,
          to: 2026.3,
          color: 'var(--echo-chart-green)',
        },
      ],
      plaques: [
        {
          year: 2014.75,
          lane: 0,
          label: 'Oct 2014',
          detail:
            'Tether launches under the name Realcoin: a dollar token for exchanges that could not get bank accounts.',
        },
        {
          year: 2018.7,
          lane: 1,
          label: '2018',
          detail:
            'USDC launches as a Circle and Coinbase joint venture (the Centre consortium), positioned as the audited, regulated alternative.',
        },
        {
          year: 2022.35,
          lane: 2,
          label: 'May 2022',
          detail:
            'TerraUSD, an algorithmic stablecoin with no full reserve, collapses and erases roughly $40 billion across UST and LUNA.',
        },
        {
          year: 2023.2,
          lane: 0,
          label: 'Mar 2023',
          detail:
            'USDC breaks its peg to roughly $0.87 after Circle discloses $3.3 billion of reserves at Silicon Valley Bank; it repegs within days when deposits are guaranteed.',
        },
        {
          year: 2023.6,
          lane: 1,
          label: 'Aug 2023',
          detail:
            'PayPal launches PYUSD, the first stablecoin issued by a major US financial company.',
        },
        {
          year: 2025.45,
          lane: 2,
          label: 'Jun 2025',
          detail:
            'Circle lists on the NYSE; the issuer of USDC becomes a public company trading around a $30 billion valuation.',
        },
        {
          year: 2025.55,
          lane: 0,
          label: 'Jul 2025',
          detail:
            'The GENIUS Act is signed: the first US federal stablecoin framework, requiring 1:1 reserves in cash and short-dated Treasuries with monthly disclosure.',
        },
        {
          year: 2025.95,
          lane: 1,
          label: 'FY 2025',
          detail:
            'Raw on-chain stablecoin volume reaches $33 trillion for the year, passing the $25.5 trillion Visa and Mastercard processed combined.',
        },
        {
          year: 2026.1,
          lane: 2,
          label: 'Early 2026',
          detail:
            'Stripe-backed blockchain Tempo debuts with Visa operating an anchor validator; Stripe had bought stablecoin-infrastructure firm Bridge for $1.1 billion.',
        },
        {
          year: 2026.2,
          lane: 0,
          label: 'Mar 2026',
          detail:
            'Mastercard signs a definitive agreement to acquire BVNK for up to $1.8 billion, the largest acquisition in stablecoin history.',
        },
      ],
    },

    { type: 'heading', text: 'Who issues the dollars', level: 2 },
    {
      type: 'paragraph',
      text: 'The supply side is a duopoly with a long tail. Of roughly $280 billion in stablecoins outstanding as of mid-2026 [VERIFY: DeFiLlama/Artemis supply data], Tether’s USDT accounts for about $155 billion and Circle’s USDC about $60 billion [VERIFY: issuer attestations], leaving every other issuer to split the remainder. That is [[kw:concentration-risk]]concentration risk[[/kw]] of a kind no card network exhibits: Visa and Mastercard route payments but do not issue the money moving over them, while Tether both operates nothing and issues everything, collecting the float. The float is the business. Tether reported roughly $13 billion in profit for 2024 [VERIFY: Tether attestations], and CEO [[person:paolo-ardoino]]Paolo Ardoino[[/person]] has put its direct and indirect US Treasury exposure above $120 billion [VERIFY: Tether attestations; TIC data], a book that would rank among the top-20 holders of US government debt, sovereign nations included.',
    },
    {
      type: 'callout',
      label: 'The float, monetized',
      value: '~$13B',
      context:
        'Tether’s reported 2024 profit [VERIFY: Tether attestations], earned largely as yield on a reserve book with more than $120 billion of US Treasury exposure [VERIFY]. The token holders get the stability; the issuer keeps the interest.',
    },
    {
      type: 'paragraph',
      text: 'Share of supply and share of settlement are different leaderboards, and the difference is velocity. USDT turned over roughly 140 times its average supply in 2025; USDC, with a third of Tether’s float, spun at roughly 210 times, reflecting its role as the settlement asset of regulated venues and DeFi [VERIFY: Artemis/Allium volume data]. The extremes tell the sharpest stories: First Digital’s FDUSD turned over roughly 480 times its small base, a velocity inflated by zero-fee exchange trading promotions rather than organic payments [VERIFY: exchange fee-promotion coverage], while the long tail of yield-bearing designs barely moves at all, parked at a velocity near 25 because holders treat the token as a deposit, not a payment instrument [VERIFY: Artemis/Allium data]. A dollar of supply is not a dollar of settlement; the pie below sizes issuers by the volume they actually carry.',
    },
    {
      type: 'variable-pie',
      figureLabel: 'FIG. 3 · WHO MINTS, HOW FAST IT SPINS',
      kicker:
        '2025 SETTLEMENT VOLUME BY ISSUER · SLICE ANGLE = SHARE OF THE $33T RAW VOLUME · SLICE RADIUS = VELOCITY (VOLUME ÷ AVERAGE SUPPLY, TURNS/YR).',
      hint: 'Angle is volume share; radius is how many times the float turned over.',
      source:
        'DRAFT [VERIFY: Artemis/Allium 2025 volume by asset; issuer attestations (Tether, Circle, First Digital, PayPal, Sky) for average supply]',
      slices: [
        { label: 'USDT (Tether)', y: 19.8, z: 140 },
        { label: 'USDC (Circle)', y: 9.4, z: 210 },
        { label: 'USDS/DAI (Sky)', y: 1.3, z: 260 },
        { label: 'FDUSD (First Digital)', y: 1.2, z: 480 },
        { label: 'PYUSD (PayPal)', y: 0.3, z: 300 },
        { label: 'All others', y: 1.0, z: 25 },
      ],
      yLabel: '2025 settlement volume ($T)',
      zLabel: 'velocity (turns per year)',
    },

    { type: 'heading', text: 'What actually runs on the rails', level: 2 },
    {
      type: 'paragraph',
      text: 'Decompose the flow and the network looks like three networks stacked. The large majority of raw volume is professional plumbing: exchange settlement, market-maker rebalancing, and DeFi flows where stablecoins serve as the [[kw:collateral-utility]]collateral[[/kw]] leg of lending and derivatives positions [VERIFY: Artemis/Allium flow-classification data]. The organic-payments slice is the smallest, and it is the one growing fastest, because the price gap it attacks is enormous: the global average cost of sending a $200 remittance through conventional channels is roughly 6.4%, versus under 1% on stablecoin rails [VERIFY: World Bank Remittance Prices Worldwide]. In Lagos and Buenos Aires the use case is blunter than remittances: dollar stablecoins trade at persistent premiums to official exchange rates and function as household dollarization, a savings account denominated in someone else’s currency that no local bank can freeze into a devaluation [VERIFY: P2P pricing data; Chainalysis geography reports].',
    },
    {
      type: 'paragraph',
      text: 'That corridor economics is why the ticker list for this story extends past crypto. Western Union’s core consumer money-transfer business is concentrated in exactly the high-fee corridors stablecoin rails price against [VERIFY: Western Union segment disclosures], which makes WU the clearest structural short-side exposure to the payments slice compounding. On the other side, Stripe now runs stablecoin payouts as a product line on rails it paid $1.1 billion to own [VERIFY: Stripe/Bridge deal terms], and PayPal’s PYUSD, still small at roughly $300 billion of 2025 volume, exists so that the distribution giant is holding its own token when the corridor flips [VERIFY: PayPal disclosures].',
    },

    { type: 'heading', text: 'The incumbents pay to stand on the rails', level: 2 },
    {
      type: 'paragraph',
      text: 'The named threat is behaving like an acquirer, not a victim. Mastercard’s agreement to buy London-based BVNK for up to $1.8 billion ($1.5 billion fixed plus $300 million contingent, signed March 2026) is the largest acquisition in stablecoin history [VERIFY: Mastercard announcement]. Visa has settled card obligations in USDC with selected partners since pilots beginning in 2021 [VERIFY: Visa announcements] and now operates an anchor validator on Tempo, the Stripe-backed chain that debuted in early 2026 [VERIFY: Visa/Tempo announcements]. Crypto M&A overall ran about $37 billion in 2025, up more than sevenfold in a year [VERIFY: deal-tracking data]. Coinbase, meanwhile, collects roughly half the reserve income on USDC under its agreement with Circle [VERIFY: Circle filings], making COIN a stablecoin-float stock wearing an exchange’s clothes. The pattern is [[kw:infrastructure-lock-in]]infrastructure lock-in[[/kw]] pursued from the outside in: the card networks are buying seats on a settlement layer they did not build, precisely the dynamic the Ezana Echo tokenization piece, The Cow Is the Collateral, documented from the asset side when it traced [[kw:real-world-assets]]real-world assets[[/kw]] migrating onto the same rails [VERIFY: Ezana Echo, tokenization-collateral-2026].',
    },

    { type: 'heading', text: 'The Treasury bid and the policy loop', level: 2 },
    {
      type: 'paragraph',
      text: 'Washington did eventually vote on something: the GENIUS Act, signed July 2025, requires issuers to hold 1:1 reserves in cash and short-dated Treasuries with monthly disclosure [VERIFY: statutory text]. Read cynically, the law conscripts the settlement layer into the Treasury market. Combined issuer holdings of US government debt already sit near $180 billion [VERIFY: aggregated attestations], and Treasury Secretary [[person:scott-bessent]]Scott Bessent[[/person]] has projected stablecoin-driven demand for Treasuries exceeding $2 trillion by 2028 [VERIFY: Bessent remarks, 2025]. Every offshore household that dollarizes through USDT extends [[kw:reserve-currency-status]]reserve currency status[[/kw]] one wallet at a time, at zero cost to the US government and considerable profit to a company in El Salvador. The friction runs the other way in Europe: MiCA’s caps on large-stablecoin activity have kept USDT delisted from EU-regulated venues [VERIFY: MiCA text; delisting notices], the first sustained attempt by a major bloc to vote against the settlement layer after the fact.',
    },
    {
      type: 'quote',
      text: 'We are going to keep the US the dominant reserve currency in the world, and we are going to use stablecoins to do that.',
      source:
        'Scott Bessent, US Treasury Secretary, 2025 [VERIFY: confirm exact wording and venue]',
    },
    {
      type: 'callout',
      label: 'Raw 2025 settlement vs the card networks',
      value: '$33T vs $25.5T',
      context:
        'Raw on-chain stablecoin volume in 2025 against Visa and Mastercard’s combined processed payments (roughly $13.2T and $12.3T respectively) [VERIFY: FY2025 10-Ks]. The bot-adjusted figure, $28T, still clears the combined card networks.',
    },

    { type: 'heading', text: 'How to position', level: 2 },
    {
      type: 'paragraph',
      text: 'The equity map is short and legible. Circle (CRCL) is the pure play and a rate trade in disguise: most of its revenue is yield on short-dated Treasuries, so Fed cuts compress the model regardless of volume growth [VERIFY: Circle filings]. Coinbase (COIN) carries the same float economics through its USDC revenue share with more diversified volume exposure. Visa (V) and Mastercard (MA) are paying billions to convert an existential threat into an acquired capability, which is what the BVNK and Tempo moves are; the position is a hedge purchased with shareholder money, and it is rational. PayPal (PYPL) owns distribution and a small token waiting on the corridor flip, and Western Union (WU) is the structural short-side read on the payments slice. [[person:jeremy-allaire]]Jeremy Allaire[[/person]]’s Circle and Ardoino’s Tether split the issuance duopoly between a filer and an attestation publisher, and that disclosure gap is itself a position: the regulated issuer trades at a multiple, the offshore one keeps the margin.',
    },
    {
      type: 'paragraph',
      text: 'The base case: adjusted volume keeps compounding, the payments slice grows into the churn, and the settlement layer gets formalized by acquisition and statute until the distinction between card rails and stablecoin rails stops mattering to the end user. The bear case is a run: a reserve failure or a frozen banking partner at a major issuer, a depeg that does not repeg, and the $180 billion Treasury bid unwinding into a risk-off market. The history in FIG. 2 cuts both ways, evidence the category survives failures and evidence the failures keep coming. Investors can track the formalization in the disclosures themselves: Ezana’s SEC filings and lobbying datasets show the card networks and issuers spending on exactly the policy loop this article describes. Nobody voted on the settlement layer. The vote happening now is whether it gets absorbed or replaced, and the incumbents have already cast theirs in cash.',
    },
  ],
  entities: {
    people: [
      {
        id: 'paolo-ardoino',
        label: 'Paolo Ardoino',
        role: 'CEO of Tether, issuer of USDT',
      },
      {
        id: 'scott-bessent',
        label: 'Scott Bessent',
        role: 'US Treasury Secretary',
      },
      {
        id: 'jeremy-allaire',
        label: 'Jeremy Allaire',
        role: 'Co-founder and CEO of Circle, issuer of USDC',
      },
    ],
    terms: [
      { id: 'concentration-risk', label: 'Concentration risk' },
      { id: 'collateral-utility', label: 'Collateral utility' },
      { id: 'infrastructure-lock-in', label: 'Infrastructure lock-in' },
      { id: 'real-world-assets', label: 'Real-world assets' },
      { id: 'reserve-currency-status', label: 'Reserve currency status' },
    ],
  },
  globeRail: {
    metric: {
      title: 'RAW STABLECOIN SETTLEMENT ($T/YR)',
      data: [
        { x: 2022, y: 7 },
        { x: 2023, y: 10 },
        { x: 2024, y: 19 },
        { x: 2025, y: 33 },
      ],
      startLabel: '2022 · $7T',
      endLabel: '2025 · $33T',
      note: 'Raw on-chain stablecoin settlement volume by year; the bot-adjusted 2025 figure is $28T (DRAFT [VERIFY: Artemis/Allium historical data; Chainalysis]).',
    },
    cities: [
      {
        name: 'Washington',
        country: 'US',
        lat: 38.9,
        lng: -77.04,
        impact:
          'The GENIUS Act, signed July 2025, gave stablecoins their first US federal framework: 1:1 reserves in cash and short-dated Treasuries with monthly disclosure, conscripting the settlement layer into the Treasury market. Treasury Secretary Scott Bessent projects stablecoin-driven Treasury demand above $2 trillion by 2028.',
      },
      {
        name: 'New York',
        country: 'US',
        lat: 40.71,
        lng: -74.01,
        impact:
          'Circle listed on the NYSE in June 2025 and trades around a $30 billion valuation, the first stablecoin issuer priced daily by public markets. Its revenue is mostly yield on short-dated Treasuries, making CRCL a rate trade in disguise.',
      },
      {
        name: 'San Salvador',
        country: 'El Salvador',
        lat: 13.69,
        lng: -89.19,
        impact:
          'Tether relocated its headquarters to El Salvador in January 2025. From there it issues roughly $155 billion of USDT, reported roughly $13 billion of 2024 profit, and holds a US Treasury book above $120 billion, which would rank among the top-20 holders, sovereigns included.',
      },
      {
        name: 'London',
        country: 'UK',
        lat: 51.51,
        lng: -0.13,
        impact:
          'Mastercard signed a definitive agreement in March 2026 to acquire London stablecoin-infrastructure firm BVNK for up to $1.8 billion, the largest acquisition in stablecoin history and the clearest signal that the card networks are buying seats on the new rails.',
      },
      {
        name: 'Lagos',
        country: 'Nigeria',
        lat: 6.52,
        lng: 3.38,
        impact:
          'In Nigeria, dollar stablecoins trade at persistent premiums to the official exchange rate and function as household dollarization. The corridor economics are stark: roughly 6.4% average cost to send $200 through conventional remittance channels versus under 1% on stablecoin rails.',
      },
      {
        name: 'Buenos Aires',
        country: 'Argentina',
        lat: -34.6,
        lng: -58.38,
        impact:
          'Argentine households use USDT as a savings account denominated in someone else’s currency, one no local bank can freeze into a devaluation. Every wallet that dollarizes this way extends US reserve-currency reach at zero cost to the US government.',
      },
    ],
  },
  author: 'Ezana Finance Editorial',
  category: 'crypto',
  subcategory: 'Stablecoins',
  meta: {
    sectors: ['Financials', 'Information Technology'],
    industries: ['Transaction & Payment Processing Services', 'Capital Markets'],
    // No individual investors are discussed; the named people are issuer executives and a government official.
    investors: [],
    institutions: [
      'Tether',
      'Circle',
      'Visa',
      'Mastercard',
      'PayPal',
      'Stripe',
      'Coinbase',
      'Western Union',
      'BVNK',
    ],
    government: ['U.S. Treasury', 'U.S. Congress', 'European Union (MiCA)'],
    geos: [
      'United States',
      'El Salvador',
      'Nigeria',
      'Argentina',
      'European Union',
      'United Kingdom',
    ],
    assetClasses: ['Stablecoins', 'Equities', 'Fixed Income'],
    themes: ['Payments Infrastructure', 'Dollarization', 'Stablecoin Regulation'],
    datasets: ['SEC filings', 'Lobbying'],
    // No prediction-market contract is cited in the text.
    markets: [],
  },
  tickers: ['V', 'MA', 'CRCL', 'COIN', 'PYPL', 'WU'],
  readTime: 9,
  publishedAt: '2026-08-11',
  listMeta: '11 Aug 2026',
  featured: false,
  likes: 0,
  comments: 0,
  reads: 0,
  status: 'draft',
};

export default stablecoinSettlementLayer2026;
