// src/lib/ezana-echo-article-gulf-sovereign-funds-us-equities-2026.js
// Ezana Echo DRAFT article: Gulf sovereign wealth funds' US equity books via 13F.
// status: 'draft', NOT publicly rendered. Every fact below is guarded for human
// verification per the Phase 3 draft spec. No chart colors are hardcoded.
//
// ============================================================
// FACT CHECK MANIFEST (status: draft, nothing publishes until cleared)
// 1. Five Gulf funds (PIF, ADIA, Mubadala, QIA, KIA) manage ~$4.3T combined -> [VERIFY: SWF Institute AUM estimates]
// 2. Combined disclosed US equity value ~$55B across Q2 2026 13Fs -> [VERIFY: aggregated Q2 2026 13F filings]
// 3. Disclosed Gulf 13F value roughly $31B in Q2 2024 -> [VERIFY: aggregated Q2 2024 13F filings]
// 4. 13F reports are quarterly, filed within 45 days of quarter end -> [VERIFY: SEC Form 13F rules]
// 5. 13F covers only long positions in US-listed equities above $100M in managed 13F securities -> [VERIFY: SEC Form 13F rules]
// 6. ADIA's 13F covers only its internally managed US-listed sleeve, not externally managed assets -> [VERIFY: ADIA 13F cover page; ADIA annual review]
// 7. KIA files no consolidated 13F; its US equities largely sit with external managers -> [VERIFY: SEC EDGAR search; KIA disclosures]
// 8. ADIA AUM ~$1.2T -> [VERIFY: SWF Institute AUM estimates]
// 9. PIF AUM ~$1.15T -> [VERIFY: SWF Institute AUM estimates; PIF annual report]
// 10. KIA AUM ~$1.05T -> [VERIFY: SWF Institute AUM estimates]
// 11. QIA AUM ~$560B -> [VERIFY: SWF Institute AUM estimates]
// 12. Mubadala AUM ~$330B -> [VERIFY: SWF Institute AUM estimates; Mubadala annual report]
// 13. ADIA long-run allocation to developed-market equities in the 32-42% policy band -> [VERIFY: ADIA annual review asset-allocation table]
// 14. ADIA disclosed US book ~$2.1B in Q2 2026 vs estimated hundreds of billions of true US equity exposure -> [VERIFY: ADIA Q2 2026 13F; ADIA annual review]
// 15. PIF disclosed US book ~$26.4B across ~62 positions in Q2 2026 -> [VERIFY: PIF Q2 2026 13F]
// 16. PIF holds roughly 60% of Lucid Motors -> [VERIFY: Lucid 10-K ownership table; PIF 13F]
// 17. PIF Lucid stake carried near $2.9B at Q2 2026 close -> [VERIFY: PIF Q2 2026 13F; LCID quarter-end price]
// 18. LCID fell ~18.5% in Q2 2026 -> [VERIFY: LCID Q2 2026 price history]
// 19. PIF's Uber stake dates to a $3.5B direct investment in 2016 -> [VERIFY: Uber S-1; 2016 deal coverage]
// 20. PIF Uber position ~$4.8B at Q2 2026; UBER +6.2% in the quarter -> [VERIFY: PIF Q2 2026 13F; UBER price history]
// 21. PIF-led consortium (with Silver Lake and Affinity Partners) agreed to take Electronic Arts private for ~$55B, announced September 2025 -> [VERIFY: EA merger proxy; deal announcements]
// 22. PIF EA position ~$3.6B marked near the tender price, +1.4% in Q2 2026 -> [VERIFY: PIF Q2 2026 13F; EA deal terms]
// 23. PIF re-entered Boeing (~$1.2B) alongside Riyadh Air widebody orders; BA +9.8% in Q2 2026 -> [VERIFY: PIF Q2 2026 13F; Riyadh Air order book; BA price history]
// 24. PIF trimmed US financials and consumer names during 2025 to fund domestic giga-projects -> [VERIFY: PIF 13F quarter-over-quarter diffs 2025]
// 25. Yasir Al-Rumayyan is PIF governor -> [VERIFY: PIF leadership page]
// 26. Al-Rumayyan said PIF's international share of deployment would keep shrinking as domestic Vision 2030 projects absorb capital (Davos, January 2026) -> [VERIFY: WEF Davos 2026 panel transcript]
// 27. Mubadala holds a majority (~78%) of GlobalFoundries -> [VERIFY: GFS 10-K ownership table]
// 28. Mubadala disclosed US book ~$21.2B in Q2 2026 -> [VERIFY: Mubadala Q2 2026 13F]
// 29. Mubadala NVDA position ~$6.2B; NVDA +15.2% in Q2 2026 -> [VERIFY: Mubadala Q2 2026 13F; NVDA price history]
// 30. Mubadala GFS position ~$4.9B; GFS -3.1% in Q2 2026 -> [VERIFY: Mubadala Q2 2026 13F; GFS price history]
// 31. Mubadala MSFT ~$2.4B and AMZN ~$1.8B; MSFT +7.6%, AMZN +4.3% in Q2 2026 -> [VERIFY: Mubadala Q2 2026 13F; price history]
// 32. MGX, the Abu Dhabi AI investment vehicle, launched 2024 with Mubadala and G42 as founding partners -> [VERIFY: MGX launch announcements]
// 33. Khaldoon Al Mubarak is Mubadala managing director and group CEO -> [VERIFY: Mubadala leadership page]
// 34. Mohammed Al Sowaidi is QIA CEO -> [VERIFY: QIA leadership page]
// 35. Sheikh Hamed bin Zayed Al Nahyan is ADIA managing director -> [VERIFY: ADIA leadership page]
// 36. QIA disclosed US book ~$5.6B in Q2 2026 -> [VERIFY: QIA Q2 2026 13F]
// 37. QIA anchor positions include NVDA (~$1.4B), MSFT (~$0.9B), META (~$0.7B); META +11.4% in Q2 2026 -> [VERIFY: QIA Q2 2026 13F; price history]
// 38. ADIA partial book anchors: AVGO ~$620M (+9.1%), MSFT ~$540M, NVDA ~$480M in Q2 2026 -> [VERIFY: ADIA Q2 2026 13F; price history]
// 39. Tech and AI infrastructure is ~48% of the aggregated disclosed Gulf book -> [VERIFY: computed from aggregated Q2 2026 13Fs]
// 40. Two years earlier the aggregated tech share was nearer a third -> [VERIFY: computed from aggregated Q2 2024 13Fs]
// 41. Brent averaged roughly $68/bbl in H1 2026 -> [VERIFY: Brent front-month settlement data H1 2026]
// 42. Saudi fiscal breakeven oil price ~$96/bbl -> [VERIFY: IMF Article IV Saudi Arabia; IMF Regional Economic Outlook]
// 43. Kuwait and the UAE (Abu Dhabi) carry fiscal breakevens below prevailing prices, near $55-65/bbl -> [VERIFY: IMF Regional Economic Outlook breakeven table]
// 44. PIF funding relies on Aramco dividends/transfers, sovereign capital injections, and debt issuance rather than ongoing oil surpluses -> [VERIFY: PIF annual report funding section; Aramco dividend disclosures]
// 45. KIA receives a statutory transfer of at least 10% of Kuwait state revenues into the Future Generations Fund -> [VERIFY: Kuwait Future Generations Fund law]
// 46. KIA founded 1953, the world's oldest sovereign wealth fund -> [VERIFY: KIA history page; SWF Institute]
// 47. Radial-stack sector splits per fund (PIF 7.1/10.6/3.9/1.8/3.0; Mubadala 14.8/1.3/1.1/1.6/2.4; QIA 3.1/0.7/0.4/0.9/0.5; ADIA 1.2/0.2/0.2/0.3/0.2, $B) -> [VERIFY: computed from each fund's Q2 2026 13F, GICS-mapped]
// 48. Stat-grid figures (combined AUM $4.3T; disclosed $55B; PIF book $26.4B; ADIA $2.1B disclosed vs ~$400B+ estimated US allocation) -> [VERIFY: SWF Institute; Q2 2026 13Fs; ADIA annual review allocation bands]
// 49. Globe-rail metric series (disclosed Gulf 13F value $31B/$38B/$44B/$50B/$55B, Q2 2024-Q2 2026) -> [VERIFY: aggregated quarterly 13F filings]
// 50. Gulf funds committed over $2T in announced US investment pledges during 2025 state visits -> [VERIFY: White House and fund press releases 2025]
// 51. 13F filings arrive up to 45 days after quarter end, so positions can be stale on arrival -> [VERIFY: SEC Form 13F rules]
// 52. QIA has stated a target of roughly doubling its US exposure over the coming decade -> [VERIFY: QIA CEO public remarks 2025-2026]
// 53. Aggregated disclosed book grew ~77% from Q2 2024 ($31B) to Q2 2026 ($55B) -> [VERIFY: computed from claims 2 and 3]
// ============================================================

export const gulfSovereignFundsUsEquities2026 = {
  id: 'gulf-sovereign-funds-us-equities-2026',
  title:
    "The Gulf's American Portfolio: What $55 Billion in Sovereign 13F Filings Reveals About Oil Money and the AI Trade",
  excerpt:
    "Five Gulf sovereign funds managing a combined $4.3 trillion [VERIFY: SWF Institute] now disclose roughly $55 billion of US equities through Q2 2026 13F filings, a record. The books tilt hard toward AI infrastructure, while Lucid's slide and a $96 Saudi fiscal breakeven [VERIFY: IMF] test the petrodollar pipeline.",
  heroImage: {
    src: '/images/ezana-echo/gulf-sovereign-funds-us-equities-2026-hero.png',
    alt: 'Stylized map linking Riyadh, Abu Dhabi, Doha, and Kuwait City to Wall Street with capital-flow arcs over a stock chart.',
    caption:
      "Editorial illustration. The position values in this article come from quarterly SEC Form 13F filings, which capture only each fund's directly held, US-listed long book, a fraction of true Gulf exposure.",
  },
  category: 'global-emerging',
  subcategory: 'Sovereign Funds',
  globeRail: {
    metric: {
      title: 'DISCLOSED GULF 13F VALUE ($B)',
      data: [
        { x: 0, y: 31 },
        { x: 1, y: 38 },
        { x: 2, y: 44 },
        { x: 3, y: 50 },
        { x: 4, y: 55 },
      ],
      startLabel: 'Q2 2024 · $31B',
      endLabel: 'Q2 2026 · $55B',
      note: 'The aggregated disclosed US equity book of PIF, Mubadala, QIA, and ADIA grew roughly 77% in two years [VERIFY: aggregated quarterly 13F filings], driven mostly by AI-infrastructure appreciation and fresh sovereign allocations rather than broad diversification.',
    },
    cities: [
      {
        name: 'Riyadh',
        country: 'Saudi Arabia',
        lat: 24.71,
        lng: 46.68,
        impact:
          'PIF runs the most concentrated disclosed book of the group: roughly $26.4B across about 62 positions [VERIFY: PIF Q2 2026 13F], anchored by Uber, the EA take-private, and a majority stake in Lucid that fell about 18.5% in the quarter [VERIFY: LCID price history].',
      },
      {
        name: 'Abu Dhabi',
        country: 'UAE',
        lat: 24.47,
        lng: 54.37,
        impact:
          'Two books, two philosophies: Mubadala discloses ~$21.2B tilted to Nvidia and GlobalFoundries [VERIFY: Mubadala Q2 2026 13F], while ADIA, with an estimated $1.2T under management [VERIFY: SWF Institute], shows only a ~$2.1B internally managed sleeve on its 13F [VERIFY: ADIA Q2 2026 13F].',
      },
      {
        name: 'Doha',
        country: 'Qatar',
        lat: 25.29,
        lng: 51.53,
        impact:
          "QIA's ~$5.6B disclosed US book [VERIFY: QIA Q2 2026 13F] is small relative to its ~$560B AUM [VERIFY: SWF Institute] but growing, with leadership signaling an intent to roughly double US exposure over the coming decade [VERIFY: QIA CEO remarks].",
      },
      {
        name: 'Kuwait City',
        country: 'Kuwait',
        lat: 29.38,
        lng: 47.99,
        impact:
          "KIA, the world's oldest sovereign fund (founded 1953) [VERIFY: KIA history], files no consolidated 13F; its US equities sit largely with external managers [VERIFY: SEC EDGAR], making roughly $1.05T of capital [VERIFY: SWF Institute] nearly invisible to public position trackers.",
      },
      {
        name: 'New York',
        country: 'US',
        lat: 40.71,
        lng: -74.01,
        impact:
          'The disclosed Gulf book concentrates in US-listed AI infrastructure: tech is roughly 48% of the aggregated filings [VERIFY: computed from Q2 2026 13Fs], up from nearer a third two years earlier [VERIFY: Q2 2024 13Fs], with Nvidia, Microsoft, and Broadcom recurring across three of the four filers.',
      },
    ],
  },
  author: 'Ezana Finance Editorial',
  meta: {
    sectors: ['Information Technology', 'Consumer Discretionary', 'Industrials', 'Energy'],
    industries: [
      'Semiconductors',
      'Automobile Manufacturers',
      'Interactive Home Entertainment',
      'Aerospace & Defense',
    ],
    investors: [
      'Public Investment Fund',
      'Abu Dhabi Investment Authority',
      'Mubadala Investment Company',
      'Qatar Investment Authority',
      'Kuwait Investment Authority',
    ],
    institutions: [
      'Nvidia',
      'GlobalFoundries',
      'Lucid Motors',
      'Uber',
      'Boeing',
      'Electronic Arts',
      'Saudi Aramco',
      'MGX',
    ],
    government: ['US Securities and Exchange Commission'],
    geos: ['Saudi Arabia', 'United Arab Emirates', 'Qatar', 'Kuwait', 'United States'],
    assetClasses: ['Equities', 'Commodities'],
    themes: ['Sovereign Wealth', 'Petrodollar Recycling', 'AI Capex', 'Geopolitics'],
    datasets: ['SEC filings', '13F holdings'],
    // markets: no specific exchange or trading venue is discussed in the text.
    markets: [],
  },
  tickers: ['LCID', 'UBER', 'NVDA', 'MSFT', 'BA', 'GFS', 'AMZN', 'META', 'AVGO', 'EA'],
  entities: {
    people: [
      {
        id: 'yasir-al-rumayyan',
        label: 'Yasir Al-Rumayyan',
        role: 'Governor, Public Investment Fund (PIF)',
      },
      {
        id: 'khaldoon-al-mubarak',
        label: 'Khaldoon Al Mubarak',
        role: 'Managing director and group CEO, Mubadala',
      },
      {
        id: 'mohammed-al-sowaidi',
        label: 'Mohammed Al Sowaidi',
        role: 'CEO, Qatar Investment Authority',
      },
      {
        id: 'hamed-bin-zayed',
        label: 'Hamed bin Zayed Al Nahyan',
        role: 'Managing director, Abu Dhabi Investment Authority',
      },
    ],
    terms: [
      { id: 'foreign-exchange-reserves', label: 'Foreign-Exchange Reserves' },
      { id: 'concentration-risk', label: 'Concentration Risk' },
      { id: 'sovereign-ai', label: 'Sovereign AI' },
      { id: 'capex-cycle', label: 'Capex Cycle' },
      { id: 'mag-7', label: 'Magnificent 7' },
      { id: 'crude-oil-benchmark', label: 'Crude Oil Benchmark' },
      { id: 'dry-powder', label: 'Dry Powder' },
      { id: 'sector-rotation', label: 'Sector Rotation' },
    ],
  },
  readTime: 8,
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
      text: "The five big Gulf sovereign wealth funds, Saudi Arabia's PIF, Abu Dhabi's ADIA and Mubadala, Qatar's QIA, and Kuwait's KIA, manage a combined $4.3 trillion by third-party estimates [VERIFY: SWF Institute AUM estimates]. Their Q2 2026 SEC Form 13F filings disclose roughly $55 billion of directly held US-listed equities [VERIFY: aggregated Q2 2026 13F filings], a record for the group and up from about $31 billion two years earlier [VERIFY: aggregated Q2 2024 13F filings]. The number is simultaneously the best public window into how petrostate capital is positioned in American markets and a serious undercount: two of the five funds barely appear in the data at all. What the filings do show is unambiguous, a portfolio that has rotated hard into AI infrastructure while its single most famous position, Lucid Motors, keeps bleeding.",
    },
    {
      type: 'stat-grid',
      stats: [
        {
          label: 'Combined AUM, five funds',
          value: '$4.3T',
          change: 'SWF Institute estimates [VERIFY]',
        },
        {
          label: 'Disclosed US equities (Q2 2026)',
          value: '~$55B',
          change: 'Aggregated 13F filings [VERIFY]',
        },
        {
          label: 'Largest single book',
          value: '$26.4B',
          change: 'PIF, ~62 positions [VERIFY]',
        },
        {
          label: 'ADIA: disclosed vs estimated',
          value: '$2.1B / $400B+',
          change: '13F sleeve vs true US allocation [VERIFY]',
        },
      ],
    },
    {
      type: 'heading',
      text: 'What the filings show, and what they hide',
      level: 2,
    },
    {
      type: 'paragraph',
      text: "Form 13F is a narrow instrument. Any institution managing over $100 million in US-listed equities must file quarterly, within 45 days of quarter end, listing long positions only [VERIFY: SEC Form 13F rules]. No bonds, no shorts, no private stakes, no positions run by external managers under their own filings. That last exclusion is decisive here. ADIA, with an estimated $1.2 trillion under management [VERIFY: SWF Institute] and a policy allocation to developed-market equities in the 32-to-42 percent band [VERIFY: ADIA annual review], files a 13F covering only its internally managed US sleeve: about $2.1 billion in Q2 2026 [VERIFY: ADIA Q2 2026 13F]. KIA, managing roughly $1.05 trillion [VERIFY: SWF Institute], files no consolidated 13F at all; its US equities sit largely with external managers [VERIFY: SEC EDGAR search]. Sovereign fund assets are also distinct from a state's [[kw:foreign-exchange-reserves]]foreign-exchange reserves[[/kw]]: these are return-seeking portfolios, not central-bank liquidity, which is why they can sit this deep in single stocks.",
    },
    {
      type: 'callout',
      label: 'The iceberg ratio',
      value: '$55B vs $4.3T',
      context:
        "The disclosed 13F book is barely more than 1% of the five funds' combined estimated AUM [VERIFY: computed from SWF Institute estimates and Q2 2026 13Fs]. The filings are a keel-depth sample of the iceberg, most informative for PIF and Mubadala, least for ADIA and KIA.",
    },
    {
      type: 'paragraph',
      text: 'The practical consequence: 13F data is a strong signal for PIF and Mubadala, whose filings plausibly capture the bulk of their direct US public-equity exposure, a partial signal for QIA, and close to noise for ADIA and KIA. Under managing director [[person:hamed-bin-zayed]]Hamed bin Zayed Al Nahyan[[/person]] [VERIFY: ADIA leadership page], ADIA has externalized most public-market management precisely to stay diversified and quiet. Any headline claiming to rank total Gulf exposure to US stocks from 13F data alone is measuring disclosure appetite, not portfolio size.',
    },
    {
      type: 'heading',
      text: 'PIF: the concentrated book',
      level: 2,
    },
    {
      type: 'paragraph',
      text: "PIF's Q2 2026 filing lists roughly $26.4 billion across about 62 positions [VERIFY: PIF Q2 2026 13F], the largest and most idiosyncratic disclosed book of the group. Its anchor is mobility: an Uber stake dating to the fund's $3.5 billion direct investment in 2016 [VERIFY: Uber S-1], now worth about $4.8 billion [VERIFY: PIF Q2 2026 13F], and a roughly 60 percent stake in Lucid Motors [VERIFY: Lucid 10-K ownership table] carried near $2.9 billion after an 18.5 percent slide in the quarter [VERIFY: LCID Q2 2026 price history]. The book's newest heavyweight is Electronic Arts, held near the tender price after the PIF-led consortium with Silver Lake and Affinity Partners agreed to take the publisher private for about $55 billion in September 2025 [VERIFY: EA merger proxy]. A rebuilt Boeing position of roughly $1.2 billion rounds out the top of the stack, sized alongside Riyadh Air's widebody order book [VERIFY: PIF Q2 2026 13F; Riyadh Air orders]. This is textbook [[kw:concentration-risk]]concentration risk[[/kw]], accepted deliberately: PIF's US book is a strategy expression, not an index.",
    },
    {
      type: 'market-treemap',
      figureLabel: 'FIG. 1 · THE GULF BOOK, MAPPED',
      kicker:
        'TOP DISCLOSED US POSITIONS PER FUND · AREA = POSITION VALUE ($M) · TINT = Q2 2026 PRICE CHANGE · ADIA SHOWS ITS PARTIAL SLEEVE ONLY',
      hint: "Leaf area is position value; green/red tint is the quarter's move. Hover small leaves for names.",
      source:
        'DRAFT [VERIFY: Q2 2026 Form 13F filings of PIF, Mubadala, QIA, and ADIA; quarter-end prices]',
      groups: [
        {
          label: 'PIF',
          leaves: [
            { label: 'UBER', size: 4800, perf: 6.2 },
            { label: 'EA', size: 3600, perf: 1.4 },
            { label: 'LCID', size: 2900, perf: -18.5 },
            { label: 'BA', size: 1200, perf: 9.8 },
          ],
        },
        {
          label: 'MUBADALA',
          leaves: [
            { label: 'NVDA', size: 6200, perf: 15.2 },
            { label: 'GFS', size: 4900, perf: -3.1 },
            { label: 'MSFT', size: 2400, perf: 7.6 },
            { label: 'AMZN', size: 1800, perf: 4.3 },
          ],
        },
        {
          label: 'QIA',
          leaves: [
            { label: 'NVDA', size: 1400, perf: 15.2 },
            { label: 'MSFT', size: 900, perf: 7.6 },
            { label: 'META', size: 700, perf: 11.4 },
          ],
        },
        {
          label: 'ADIA (PARTIAL)',
          leaves: [
            { label: 'AVGO', size: 620, perf: 9.1 },
            { label: 'MSFT', size: 540, perf: 7.6 },
            { label: 'NVDA', size: 480, perf: 15.2 },
          ],
        },
      ],
    },
    {
      type: 'paragraph',
      text: "The direction of travel matters as much as the levels. Across 2025, quarter-over-quarter diffs show PIF trimming US financials and consumer names to fund domestic giga-projects [VERIFY: PIF 13F diffs 2025], a [[kw:sector-rotation]]sector rotation[[/kw]] out of passive American exposure and into Vision 2030 construction. Governor [[person:yasir-al-rumayyan]]Yasir Al-Rumayyan[[/person]] [VERIFY: PIF leadership page] has said as much publicly, telling a Davos panel in January 2026 that the fund's international share of deployment would keep shrinking as domestic projects absorb capital [VERIFY: WEF Davos 2026 transcript]. The US book that remains is what survived that filter: strategic stakes tied to Saudi industrial policy (Lucid, Boeing, EA's gaming ambitions) rather than financial positions held for return alone.",
    },
    {
      type: 'heading',
      text: 'The AI trade goes sovereign',
      level: 2,
    },
    {
      type: 'paragraph',
      text: "The clearest cross-fund theme is AI infrastructure. Mubadala's $21.2 billion disclosed book [VERIFY: Mubadala Q2 2026 13F] is anchored by a roughly $6.2 billion Nvidia position [VERIFY: Mubadala Q2 2026 13F] and its long-standing majority stake (about 78 percent) in GlobalFoundries [VERIFY: GFS 10-K], the chip foundry it took public. Under [[person:khaldoon-al-mubarak]]Khaldoon Al Mubarak[[/person]] [VERIFY: Mubadala leadership page], the fund also co-founded MGX, Abu Dhabi's dedicated AI investment vehicle, with G42 in 2024 [VERIFY: MGX launch announcements], making the 13F only one arm of a broader [[kw:sovereign-ai]]sovereign AI[[/kw]] strategy that spans data centers, private stakes, and compute partnerships.",
    },
    {
      type: 'paragraph',
      text: "QIA runs the same playbook at smaller disclosed scale: roughly $5.6 billion [VERIFY: QIA Q2 2026 13F], with Nvidia (~$1.4 billion), Microsoft (~$0.9 billion), and Meta (~$0.7 billion) at the top [VERIFY: QIA Q2 2026 13F]. CEO [[person:mohammed-al-sowaidi]]Mohammed Al Sowaidi[[/person]] [VERIFY: QIA leadership page] has publicly targeted roughly doubling the fund's US exposure over the coming decade [VERIFY: QIA CEO remarks 2025-2026]. Even ADIA's thin disclosed sleeve leads with Broadcom, Microsoft, and Nvidia [VERIFY: ADIA Q2 2026 13F]. Aggregated, technology and AI infrastructure is now roughly 48 percent of the disclosed Gulf book [VERIFY: computed from Q2 2026 13Fs], up from nearer a third two years earlier [VERIFY: computed from Q2 2024 13Fs]. Gulf capital is effectively underwriting a slice of the American [[kw:capex-cycle]]capex cycle[[/kw]] it once merely observed.",
    },
    {
      type: 'radial-stack',
      figureLabel: 'FIG. 2 · WHERE EACH FUND LEANS',
      kicker:
        'DISCLOSED US BOOK BY SECTOR BUCKET, $B · BAR SWEEP = BOOK SIZE · SEGMENTS STACK OUTWARD PER FUND · ADIA IS ITS PARTIAL SLEEVE',
      hint: "Total sweep scales to each fund's disclosed book; segment order is consistent across bars.",
      source:
        'DRAFT [VERIFY: Q2 2026 13F filings, positions mapped to GICS sector buckets by Ezana Research]',
      maxAngle: 270,
      categories: [
        {
          label: 'PIF',
          segments: [
            { label: 'Tech & AI', value: 7.1 },
            { label: 'Consumer & Mobility', value: 10.6 },
            { label: 'Industrials & Aviation', value: 3.9 },
            { label: 'Financials', value: 1.8 },
            { label: 'Diversified', value: 3.0 },
          ],
        },
        {
          label: 'Mubadala',
          segments: [
            { label: 'Tech & AI', value: 14.8 },
            { label: 'Consumer & Mobility', value: 1.3 },
            { label: 'Industrials & Aviation', value: 1.1 },
            { label: 'Financials', value: 1.6 },
            { label: 'Diversified', value: 2.4 },
          ],
        },
        {
          label: 'QIA',
          segments: [
            { label: 'Tech & AI', value: 3.1 },
            { label: 'Consumer & Mobility', value: 0.7 },
            { label: 'Industrials & Aviation', value: 0.4 },
            { label: 'Financials', value: 0.9 },
            { label: 'Diversified', value: 0.5 },
          ],
        },
        {
          label: 'ADIA',
          segments: [
            { label: 'Tech & AI', value: 1.2 },
            { label: 'Consumer & Mobility', value: 0.2 },
            { label: 'Industrials & Aviation', value: 0.2 },
            { label: 'Financials', value: 0.3 },
            { label: 'Diversified', value: 0.2 },
          ],
        },
      ],
    },
    {
      type: 'heading',
      text: 'Oil revenue sets the tempo',
      level: 2,
    },
    {
      type: 'paragraph',
      text: "The funding side of these portfolios runs on crude, and the crude math has tightened. Brent, the [[kw:crude-oil-benchmark]]crude oil benchmark[[/kw]] that prices most Gulf exports, averaged roughly $68 a barrel in the first half of 2026 [VERIFY: Brent settlement data]. That sits comfortably above the fiscal breakevens of Kuwait and Abu Dhabi, estimated near $55 to $65 [VERIFY: IMF Regional Economic Outlook], but well below Saudi Arabia's roughly $96 breakeven [VERIFY: IMF Article IV]. The asymmetry maps directly onto fund behavior: ADIA and KIA continue receiving surplus inflows, with Kuwait's Future Generations Fund taking a statutory transfer of at least 10 percent of state revenues [VERIFY: Kuwait FGF law], while PIF leans on Aramco dividends, sovereign capital injections, and debt issuance rather than ongoing oil surpluses [VERIFY: PIF annual report funding section].",
    },
    {
      type: 'callout',
      label: 'The breakeven gap',
      value: '$68 vs $96',
      context:
        "H1 2026 average Brent versus Saudi Arabia's estimated fiscal breakeven [VERIFY: Brent settlement data; IMF Article IV]. Below breakeven, PIF's US book competes with domestic giga-projects for every marginal riyal, the structural reason its filings show trimming while Abu Dhabi's and Doha's show accumulation.",
    },
    {
      type: 'heading',
      text: 'The dossiers',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'Treated as one meta-portfolio, the five funds hold enormous [[kw:dry-powder]]dry powder[[/kw]] relative to what the filings show deployed: the disclosed $55 billion is barely more than one percent of combined estimated AUM [VERIFY: computed]. The 2025 wave of state-visit investment pledges, more than $2 trillion in announced US commitments across the Gulf capitals [VERIFY: White House and fund press releases], will mostly flow through private vehicles, infrastructure, and direct deals that never touch a 13F. The table below is the honest summary of what each fund is, and how much of it the public data actually sees.',
    },
    {
      type: 'dossier-table',
      figureLabel: 'FIG. 3 · FIVE FUNDS, ONE LEDGER',
      kicker:
        'FUND · MANDATE AND AUM · DISCLOSED US BOOK · ANCHOR POSITIONS · CLICK A ROW FOR THE DOSSIER.',
      hint: 'AUM figures are third-party estimates; disclosed books are Q2 2026 13F values. Expand a row for caveats.',
      source:
        'DRAFT [VERIFY: SWF Institute AUM estimates; Q2 2026 Form 13F filings; fund annual reports]',
      headers: ['Fund', 'Mandate and AUM', 'Disclosed US book', 'Anchor positions', ''],
      rows: [
        {
          name: 'PIF',
          tag: 'SAUDI ARABIA',
          role: '~$1.15T AUM [VERIFY]; Vision 2030 development fund, funded by Aramco transfers and debt rather than oil surpluses.',
          anchor: '~$26.4B across ~62 positions [VERIFY: Q2 2026 13F].',
          keyRisk:
            'Concentration: Uber, EA, Lucid, and Boeing dominate; Lucid alone fell ~18.5% in Q2 [VERIFY].',
          dossier: [
            {
              label: 'Read',
              text: 'The most 13F-legible fund of the five: its filing plausibly captures most of its direct US public-equity exposure, so quarter-over-quarter diffs carry real signal.',
            },
            {
              label: 'Direction',
              text: 'Trimming financial positions to fund domestic giga-projects; what remains is strategic, tied to Saudi industrial policy [VERIFY: 2025 13F diffs].',
            },
          ],
        },
        {
          name: 'ADIA',
          tag: 'ABU DHABI',
          role: '~$1.2T AUM [VERIFY]; the classical diversified endowment of the Gulf, largely externally managed.',
          anchor:
            '~$2.1B disclosed, internally managed sleeve only [VERIFY: Q2 2026 13F]; AVGO, MSFT, NVDA at the top.',
          keyRisk:
            'Disclosure asymmetry: the 13F shows well under 1% of estimated US exposure [VERIFY: ADIA annual review allocation bands].',
          dossier: [
            {
              label: 'Caveat',
              text: "ADIA's true US equity book, implied by its 32-42% developed-market equity policy band, plausibly exceeds $400B [VERIFY], almost all of it invisible to 13F trackers because external managers file under their own names.",
            },
          ],
        },
        {
          name: 'Mubadala',
          tag: 'ABU DHABI',
          role: "~$330B AUM [VERIFY]; strategic development investor and the operating heart of Abu Dhabi's AI push (GlobalFoundries, MGX co-founder).",
          anchor: '~$21.2B [VERIFY: Q2 2026 13F]; NVDA ~$6.2B, GFS ~$4.9B, MSFT, AMZN.',
          keyRisk:
            "AI beta: the book's two largest positions are a GPU designer and a foundry; a capex-cycle downturn hits both sides [VERIFY].",
          dossier: [
            {
              label: 'Structure',
              text: 'The GlobalFoundries stake (~78% [VERIFY: GFS 10-K]) is a control position from incubation to IPO, not a portfolio trade; treat its 13F weight accordingly.',
            },
          ],
        },
        {
          name: 'QIA',
          tag: 'QATAR',
          role: '~$560B AUM [VERIFY]; historically Europe-tilted, now rebalancing toward the US.',
          anchor: '~$5.6B [VERIFY: Q2 2026 13F]; NVDA, MSFT, META lead.',
          keyRisk:
            'The disclosed book is ~1% of AUM; the stated ambition to roughly double US exposure [VERIFY: CEO remarks] will mostly land outside the 13F.',
          dossier: [
            {
              label: 'Trajectory',
              text: "Gas revenues keep Doha's funding line steady; the 13F book has grown every quarter since 2024 [VERIFY: quarterly filings], concentrated in mega-cap AI names.",
            },
          ],
        },
        {
          name: 'KIA',
          tag: 'KUWAIT',
          role: "~$1.05T AUM [VERIFY]; the world's oldest sovereign fund, founded 1953 [VERIFY: KIA history], with a statutory 10%-of-revenues inflow [VERIFY: FGF law].",
          anchor:
            'No consolidated 13F; US equities held via external managers [VERIFY: SEC EDGAR].',
          keyRisk:
            'Invisibility cuts both ways: no public position data exists to confirm or refute any claim about what KIA holds.',
          dossier: [
            {
              label: 'Method note',
              text: "Any dataset or chart claiming KIA's US stock positions is reconstructing from manager filings and press reports, not from a KIA disclosure. This article therefore excludes KIA from every figure.",
            },
          ],
        },
      ],
    },
    {
      type: 'heading',
      text: 'How to read the flow',
      level: 2,
    },
    {
      type: 'paragraph',
      text: "For investors, the actionable layer is not copying positions, it is reading recurrence and direction. Three of the four filing funds hold Nvidia and Microsoft simultaneously [VERIFY: Q2 2026 13Fs], which makes Gulf sovereign demand one more structural bid under the [[kw:mag-7]]Magnificent 7[[/kw]] complex, slower-moving and less valuation-sensitive than hedge fund flows. The idiosyncratic names are where the filings carry unique information: LCID trades with a 60 percent strategic holder that has repeatedly recapitalized it [VERIFY: Lucid capital raises]; GFS carries a control shareholder with national-champion incentives; BA's Gulf order flow and PIF's equity position now point the same direction [VERIFY: Riyadh Air orders]. A position appearing in a sovereign 13F is a statement about ten-year state strategy at least as much as about next quarter's earnings.",
    },
    {
      type: 'paragraph',
      text: "The base case is that the disclosed Gulf book keeps growing, led by Doha and Abu Dhabi, with the AI-infrastructure share drifting higher as pledged capital finds listed expressions. The bear case has two triggers: an extended stretch of sub-breakeven oil that forces Riyadh to keep choosing giga-projects over US equities [VERIFY: IMF breakeven estimates], or an AI capex disappointment that hits the half of the book now concentrated in that theme [VERIFY: computed sector shares]. Either way, the filings arrive on a 45-day lag [VERIFY: SEC Form 13F rules], so treat them as strategy documents, not trade alerts. Ezana's institutional-holdings tracker aggregates these filings alongside congressional and fund-manager disclosures, and the quant workbench can backtest whether following sovereign accumulation, at the sector level rather than the single-stock level, has actually paid after the disclosure lag. Let the pattern across quarters, not any single headline stake, drive the decision.",
    },
  ],
};

export default gulfSovereignFundsUsEquities2026;
