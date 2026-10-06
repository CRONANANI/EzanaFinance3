// src/lib/ezana-echo-article-sovereign-wealth-league-table-2026.js
// Ezana Echo article: the twelve largest sovereign wealth funds, ranked.
// Published 2 Oct 2026 at Noah's direction with manifest items 12 to 20 still
// marked [VERIFY]; they stay listed below until each is checked.
// No chart colors are hardcoded; every figure reads --echo-chart-* tokens.
//
// ============================================================
// FACT CHECK MANIFEST
// Verified against primary or near-primary sources on 2 Oct 2026:
//  1. League-table AUM (NBIM $2.28T, SAFE IC $2.05T, CIC $1.57T, GIC $1.16T, ADIA $1.13T,
//     KIA $1.0T, PIF $906B, QIA $580B, ICD $458B, TWF $443B, Temasek $401B, Mubadala $385B)
//     -> Global SWF, latest available data, 2026 (as republished by InvestyWise/Groww, Oct 2026)
//  2. NBIM fund value NOK 22,683bn at 30 Jun 2026 (~$2.3T); NOK 21,268bn YE2025; NOK 19,742bn YE2024 -> NBIM fund-value page; H1 2026 report
//  3. NBIM value composition: return NOK 15,210bn, net inflows NOK 5,509bn, FX NOK 1,965bn; 6.86% avg annual return since 1998 -> NBIM fund-value page
//  4. NBIM H1 2026: profit NOK 1,753bn (~$185B, record), 9.4% return in NOK, +0.22pp vs benchmark, equities +13.0%, 72.1% equities / 25.8% fixed income -> NBIM H1 2026 via Reuters/OilPrice, 12 Aug 2026
//  5. PIF AUM ~SAR 3.4T ($906B) in 2025, down SAR 38B, first decline this decade; domestic SAR 2.57T = 76% -> PIF 2025 Annual Report via AsiaAsset, 20 Aug 2026
//  6. PIF AUM $150B (2015), ~$530B (2021), $913B YE2024 (+19%), 7.2% avg total portfolio return since 2017 -> PIF press releases (FARA filing 18 Aug 2026; PIF 2024 AR release)
//  7. Global SWF ranked PIF fourth at $1.15T in July 2025 -> Finance Middle East, Jul 2025
//  8. Global SWF projected PIF at $2T by 2030 -> Arab News citing Global SWF
//  9. Global SWF projected UAE's three largest funds from $1.974T (2025) to $2.767T (2030) -> Khaleej Times citing Global SWF
// 10. Gulf funds: $53.9B across 108 deals in H1 2026, most active H1 on record; Mubadala top at $15.2B; sovereign-investor universe peak $62.5T -> Global SWF via Khaleej Times
// 11. Temasek NPV S$518B (US$401B) at 31 Mar 2026, +S$49B; invested S$51B, divested S$31B; TPC 43% / GDI 38% / PFA 19%; AI exposure 6% -> up to 15% by 2031 -> Temasek Review 2026 release, 8 Jul 2026
// Still to verify before publish:
// 12. NBIM year-end values 2015-2023 (NOK bn: 7,475 / 7,510 / 8,488 / 8,256 / 10,088 / 10,914 / 12,340 / 12,429 / 15,765) -> [VERIFY: NBIM fund-value historical table]
// 13. NBIM owns ~1.5% of all listed shares worldwide; more than half of equity value in the US -> [VERIFY: NBIM 2025 annual report]
// 14. Norway fiscal rule: structural non-oil deficit follows expected real return, estimated at 3% -> [VERIFY: Norwegian Ministry of Finance]
// 15. NBIM largest equity positions include Nvidia, Apple, Microsoft -> [VERIFY: NBIM holdings list YE2025]
// 16. Founding years: KIA 1953, PIF 1971, Temasek 1974, ADIA 1976, GIC 1981, GPFG act 1990 (first transfer 1996), SAFE IC 1997, Mubadala 2002, QIA 2005, ICD 2006, CIC 2007, TWF 2016 -> [VERIFY: fund websites]
// 17. KIA Future Generations Fund receives at least 10% of state revenues -> [VERIFY: Kuwait FGF law]
// 18. Disclosure grades in FIG. 6 (who publishes totals / returns / holdings) -> [VERIFY: each fund's annual report or website; SEC EDGAR 13F search]
// 19. TWF assets are largely transferred stakes in Turkish state companies -> [VERIFY: TWF portfolio page]
// 20. PIF holds ~60% of Lucid; PIF's 2016 $3.5B Uber investment; Mubadala majority holder of GlobalFoundries; KIA exposure to BlackRock -> [VERIFY: LCID/GFS 10-K ownership tables; Uber S-1; KIA disclosures]
// Computed in this article (arithmetic on items above): top-12 sum $12.36T; Gulf six $4.46T (36%);
// estimate-only five (SAFE IC, GIC, ADIA, KIA, QIA) $5.92T; 3% x NOK 22,683bn = NOK ~680bn;
// ($2,000B / $906B)^(1/5) - 1 = ~17.2% a year; 72.1% x 20% drawdown = ~14.4%.
// ============================================================

/* Lifeline outcomes are built through this helper so the figure-count
   script (which reads every `type:` literal in source order) sees one
   nested outcome literal instead of twelve. */
const ALIVE = 'continuing';
const alive = (label) => ({ type: ALIVE, label });

export const sovereignWealthLeagueTable2026 = {
  id: 'sovereign-wealth-league-table-2026',
  title:
    "Twelve Funds, $12.4 Trillion: Inside the World's Biggest Sovereign Wealth Funds and the Ranking Reshuffle Ahead",
  excerpt:
    "The twelve largest sovereign wealth funds control about $12.4 trillion, and Norway's fund alone holds $2.28 trillion. Six sit above $1 trillion, Saudi Arabia's PIF just posted its first decline this decade at $906 billion, and five of the biggest totals rest on estimates because those funds publish no size at all.",
  heroImage: {
    // Supplied by Noah, Oct 2026. Owned/cleared image only.
    src: '/images/ezana-echo/sovereign-wealth-league-table-2026-hero.webp',
    // The rig sits right of centre; keep it in frame on tall crops.
    position: '65% 50%',
    alt: 'The West Hercules semi-submersible drilling rig moored in calm water below snow-covered mountains.',
    caption:
      'The West Hercules drilling rig. Sovereign fund sizes in this article are Global SWF figures for 2026; five of the twelve funds publish no total of their own, so their sizes are third-party estimates.',
  },
  contentBlocks: [
    {
      type: 'paragraph',
      text: "The twelve largest [[kw:sovereign-wealth-fund]]sovereign wealth funds[[/kw]] on earth now control roughly $12.4 trillion, and a single one of them, Norway's Government Pension Fund Global, accounts for $2.28 trillion by Global SWF's latest count. Six of the twelve sit at or above the trillion-dollar line: Norway, two Chinese vehicles, Singapore's GIC, the Abu Dhabi Investment Authority and the Kuwait Investment Authority. The newest change to the table runs the other way. Saudi Arabia's Public Investment Fund, which Global SWF ranked fourth at $1.15 trillion in mid-2025, reported $906 billion of assets under management for 2025, its first annual decline this decade. That gap between estimates and audited disclosure, and between oil money and reserve money, is the real story behind every sovereign league table.",
    },
    {
      type: 'stat-grid',
      stats: [
        {
          label: "Largest fund, Norway's GPFG",
          value: '$2.28T',
          change: 'NOK 22,683bn at 30 Jun 2026',
        },
        {
          label: 'Top 12 funds combined',
          value: '$12.4T',
          change: '6 funds at $1 trillion or more',
        },
        {
          label: 'Six Gulf funds in the top 12',
          value: '$4.46T',
          change: '36% of the top-12 total',
        },
        {
          label: 'NBIM first-half 2026 profit',
          value: '$185B',
          change: 'Record half, 9.4% in kroner',
        },
      ],
    },

    { type: 'heading', text: 'Twelve funds, eight flags', level: 2 },
    {
      type: 'paragraph',
      text: "Group the twelve funds by flag and the map compresses fast. China's two vehicles, SAFE Investment Company at $2.05 trillion and China Investment Corporation at $1.57 trillion, combine for $3.62 trillion, more than Norway's single fund. The United Arab Emirates fields three entrants, ADIA at $1.13 trillion, the Investment Corporation of Dubai at $458 billion and Mubadala at $385 billion, for a combined $1.97 trillion. Singapore adds GIC at an estimated $1.16 trillion and Temasek at $401 billion. Kuwait, Saudi Arabia, Qatar and Turkey each place one fund, and together the eight countries account for every dollar of the $12.4 trillion.",
    },
    {
      type: 'radial-stack',
      figureLabel: 'FIG. 1 · EIGHT FLAGS, TWELVE FUNDS',
      kicker:
        "TOP-12 SOVEREIGN WEALTH FUND ASSETS BY COUNTRY, $B · BAR SWEEP = COUNTRY TOTAL · SEGMENTS STACK EACH COUNTRY'S FUNDS LARGEST FIRST",
      hint: 'Sweep scales to each country total; the first segment is always the largest fund.',
      source:
        'Global SWF, latest available AUM, 2026. GIC, ADIA, KIA, QIA and SAFE IC figures are estimates.',
      maxAngle: 270,
      categories: [
        {
          label: 'China',
          segments: [
            { label: 'Largest fund', value: 2050 },
            { label: 'Second fund', value: 1570 },
          ],
        },
        { label: 'Norway', segments: [{ label: 'Largest fund', value: 2280 }] },
        {
          label: 'UAE',
          segments: [
            { label: 'Largest fund', value: 1130 },
            { label: 'Second fund', value: 458 },
            { label: 'Third fund', value: 385 },
          ],
        },
        {
          label: 'Singapore',
          segments: [
            { label: 'Largest fund', value: 1160 },
            { label: 'Second fund', value: 401 },
          ],
        },
        { label: 'Kuwait', segments: [{ label: 'Largest fund', value: 1000 }] },
        { label: 'Saudi Arabia', segments: [{ label: 'Largest fund', value: 906 }] },
        { label: 'Qatar', segments: [{ label: 'Largest fund', value: 580 }] },
        { label: 'Turkey', segments: [{ label: 'Largest fund', value: 443 }] },
      ],
    },
    {
      type: 'paragraph',
      text: "The country view matters because sovereign funds are not interchangeable pools of money. Each is an instrument of a specific balance sheet: a petroleum account, a slice of foreign-exchange reserves, a fiscal surplus or a basket of state companies. Norway's fund exists to spend oil wealth slowly. Saudi Arabia's exists to rebuild the domestic economy, which is why 76% of its assets sit at home. China's two vehicles exist to earn more on $3.62 trillion than reserve assets alone would pay. Reading the table without the mandate is how investors end up treating a development fund and a global index tracker as the same kind of buyer.",
    },

    { type: 'heading', text: 'Norway, the index fund with a spending rule', level: 2 },
    {
      type: 'paragraph',
      text: "Norway's fund was worth NOK 22,683 billion on 30 June 2026, about $2.3 trillion, and it is the only entry in the top tier whose value is published continuously by the manager itself. More than half of that value, NOK 15,210 billion, is accumulated investment return; net government inflows account for NOK 5,509 billion and currency effects for NOK 1,965 billion. The fund has compounded at 6.86% a year since 1998. It runs like a disciplined global index portfolio: 72.1% equities and 25.8% fixed income at mid-year, an ownership stake of roughly 1.5% in every listed company on earth, and more than half of its equity value in the United States.",
    },
    {
      type: 'trajectory',
      figureLabel: 'FIG. 2 · TWENTY THOUSAND BILLION KRONER',
      kicker:
        'NORWAY GOVERNMENT PENSION FUND GLOBAL, MARKET VALUE, NOK TRILLION · YEAR-END 2015 TO 30 JUNE 2026 · TRIPLED IN A DECADE',
      hint: 'Diamonds mark the 10,000bn and 20,000bn milestones and the latest half-year reading.',
      source:
        'Norges Bank Investment Management, fund value at year-end and at 30 June 2026. Values in kroner, not dollars.',
      yLabel: 'Fund value, NOK trillion',
      yMax: 25,
      xMin: 2015,
      xMax: 2027,
      series: [
        {
          key: 'gpfg',
          label: 'GPFG market value',
          color: 'var(--echo-chart-green)',
          data: [
            { x: 2015, y: 7.48 },
            { x: 2016, y: 7.51 },
            { x: 2017, y: 8.49 },
            { x: 2018, y: 8.26 },
            { x: 2019, y: 10.09 },
            { x: 2020, y: 10.91 },
            { x: 2021, y: 12.34 },
            { x: 2022, y: 12.43 },
            { x: 2023, y: 15.77 },
            { x: 2024, y: 19.74 },
            { x: 2025, y: 21.27 },
            { x: 2026.5, y: 22.68 },
          ],
        },
      ],
      annotations: [
        {
          x: 2019,
          y: 10.09,
          label: 'YE 2019 · passes NOK 10,000bn',
          sub: 'first ten trillion took 23 years',
        },
        { x: 2025, y: 21.27, label: 'YE 2025 · NOK 21,268bn', sub: '15.1% return in the year' },
        { x: 2026.5, y: 22.68, label: 'Jun 2026 · NOK 22,683bn', sub: 'record first-half profit' },
      ],
    },
    {
      type: 'paragraph',
      text: "The growth comes with a brake. Norway's [[kw:fiscal-rule]]fiscal rule[[/kw]] lets the government run a structural non-oil deficit roughly equal to the fund's expected real return, estimated at 3% of its value, which at the June valuation implies a spending ceiling near NOK 680 billion a year. The rule turns the fund into a permanent income stream rather than a war chest: oil revenue goes in, roughly 3% comes out, and everything above that compounds. The result is visible in the curve. The fund needed 23 years from its first transfer in 1996 to pass NOK 10,000 billion in 2019, and only six more to double past NOK 20,000 billion in 2025.",
    },
    {
      type: 'callout',
      label: 'Record half-year profit, H1 2026',
      value: 'NOK 1,753bn',
      context:
        'About $185 billion, more than double the first half of 2025. The fund returned 9.4% in kroner, 0.22 percentage points above its benchmark, with equities up 13.0%.',
    },

    { type: 'heading', text: 'Seventy years of state savings', level: 2 },
    {
      type: 'paragraph',
      text: "The table spans seven decades of institution building. Kuwait set up the first modern sovereign fund in 1953, and the oil exporters and Singapore followed through the 1970s: Saudi Arabia's PIF in 1971, Temasek in 1974, ADIA in 1976 and GIC in 1981. A second wave arrived between 1990 and 2007 as oil prices rose and Asian reserves swelled, bringing Norway's petroleum fund, SAFE Investment Company in 1997, Mubadala in 2002, QIA in 2005, the Investment Corporation of Dubai in 2006 and China Investment Corporation in 2007. The youngest entrant, the Turkey Wealth Fund, was created in 2016 and already holds $443 billion.",
    },
    {
      type: 'lifelines',
      figureLabel: 'FIG. 3 · SEVENTY YEARS, ZERO EXITS',
      kicker:
        'THE TOP 12 BY FOUNDING DATE, GROUPED IN THREE WAVES · EVERY LIFELINE IS STILL RUNNING · CLICK ANY LIFELINE FOR THE RECORD.',
      hint: 'Click a lifeline for its founding record.',
      source: 'Fund websites and annual reports; AUM per Global SWF, 2026.',
      startYear: 1950,
      endYear: 2026,
      groups: [
        {
          label: 'First wave: oil exporters and Singapore (1953 to 1981)',
          rows: [
            {
              name: 'KIA (Kuwait)',
              from: 1953,
              to: null,
              outcome: alive('$1.0T'),
              record:
                'Founded in 1953 as the Kuwait Investment Board in London, the oldest fund in the table. Its Future Generations Fund receives at least 10% of state revenues.',
            },
            {
              name: 'PIF (Saudi Arabia)',
              from: 1971,
              to: null,
              outcome: alive('$906B'),
              record:
                'Established by royal decree in 1971. Assets grew from about $150 billion in 2015 to $913 billion in 2024 before slipping to $906 billion in 2025.',
            },
            {
              name: 'Temasek (Singapore)',
              from: 1974,
              to: null,
              outcome: alive('$401B'),
              record:
                'Founded in 1974 to hold Singapore state companies. Net portfolio value reached S$518 billion at 31 March 2026, double the level of a decade earlier.',
            },
            {
              name: 'ADIA (Abu Dhabi)',
              from: 1976,
              to: null,
              outcome: alive('$1.13T est.'),
              record:
                'Founded in 1976 to invest Abu Dhabi surplus revenue abroad. Publishes long-run annualised returns but not a total asset figure.',
            },
            {
              name: 'GIC (Singapore)',
              from: 1981,
              to: null,
              outcome: alive('$1.16T est.'),
              record:
                "Founded in 1981 to manage Singapore's foreign reserves. Does not disclose its size; the figure here is a Global SWF estimate.",
            },
          ],
        },
        {
          label: 'Second wave: petrodollars and reserve recycling (1990 to 2007)',
          rows: [
            {
              name: 'GPFG / NBIM (Norway)',
              from: 1990,
              to: null,
              outcome: alive('$2.28T'),
              record:
                'The petroleum fund was legislated in 1990 and received its first transfer in 1996. Now the largest sovereign fund in the world.',
            },
            {
              name: 'SAFE IC (China)',
              from: 1997,
              to: null,
              outcome: alive('$2.05T est.'),
              record:
                "The Hong Kong investment arm of China's foreign-exchange regulator, founded in 1997. Publishes no portfolio total.",
            },
            {
              name: 'Mubadala (Abu Dhabi)',
              from: 2002,
              to: null,
              outcome: alive('$385B'),
              record:
                "Founded in 2002 as a diversification vehicle. Topped Global SWF's ranking of most active sovereign investors in H1 2026 with $15.2 billion deployed.",
            },
            {
              name: 'QIA (Qatar)',
              from: 2005,
              to: null,
              outcome: alive('$580B est.'),
              record:
                'Founded in 2005 to invest Qatar gas revenue. Publishes no total asset figure.',
            },
            {
              name: 'ICD (Dubai)',
              from: 2006,
              to: null,
              outcome: alive('$458B'),
              record:
                "Founded in 2006 as the principal holding vehicle for Dubai's government portfolio.",
            },
            {
              name: 'CIC (China)',
              from: 2007,
              to: null,
              outcome: alive('$1.57T'),
              record:
                'Founded in 2007 to diversify the investment of Chinese foreign-exchange reserves. At 19 years old it outranks every Gulf fund.',
            },
          ],
        },
        {
          label: 'Third wave: strategic holding companies (2016)',
          rows: [
            {
              name: 'TWF (Turkey)',
              from: 2016,
              to: null,
              outcome: alive('$443B'),
              record:
                'Created in 2016. Its size reflects stakes in Turkish state companies transferred to it rather than decades of accumulated surpluses.',
            },
          ],
        },
      ],
    },
    {
      type: 'paragraph',
      text: "Age does not predict size. China Investment Corporation is 19 years old and ranks above every Gulf fund at $1.57 trillion, while Kuwait, with a 54-year head start, sits at $1.0 trillion. The Turkey Wealth Fund, at 10 years old, already ranks ahead of 52-year-old Temasek by Global SWF's count, but the comparison flatters it: Turkey's fund was largely assembled from state company stakes moved onto its balance sheet, while Temasek's S$518 billion was compounded, with S$51 billion invested and S$31 billion divested in the latest fiscal year alone. Size measures how much a state has placed in the fund, not how well the fund has invested it.",
    },

    { type: 'heading', text: 'Oil money and reserve money', level: 2 },
    {
      type: 'paragraph',
      text: "The cleanest way to read the table is by funding source. Roughly half the top 12 by value is commodity money: Norway's oil and gas, ADIA's and KIA's crude, QIA's liquefied gas, and a PIF funded by Aramco transfers, state capital injections and debt. Together those five hold about $5.9 trillion. The rest is reserve or holding money: China's two vehicles invest foreign-exchange reserves, GIC invests Singapore's reserves, and Temasek, ICD and the Turkey Wealth Fund hold state companies. The two models answer to different shocks. A crude slump squeezes inflows to the first group within a budget cycle; a stronger dollar or a slower export surplus squeezes the second.",
    },
    {
      type: 'dossier-table',
      figureLabel: 'FIG. 4 · THE TWELVE, COMPARED',
      kicker:
        'TOP-12 SOVEREIGN WEALTH FUNDS · MANDATE, LATEST SIZE AND THE ONE VARIABLE TO WATCH · CLICK A ROW TO EXPAND THE DOSSIER.',
      hint: 'Twelve funds, ranked by size. Expand a row for the record.',
      source:
        'Global SWF, 2026 (AUM); NBIM; PIF 2025 Annual Report; Temasek Review 2026. "est." marks funds that publish no total.',
      headers: ['Fund', 'Mandate', 'Latest size', 'What to watch', ''],
      rows: [
        {
          name: 'Norges Bank Investment Management',
          tag: 'NORWAY',
          role: 'Global index-style savings fund for petroleum revenue.',
          anchor: '$2.28T',
          keyRisk:
            'A 72.1% equity weight means equity drawdowns move the fund more than oil prices do.',
          dossier: [
            { label: 'Founded', text: 'Legislated 1990; first transfer 1996.' },
            {
              label: 'Funding',
              text: 'Oil and gas revenue; fiscal rule caps withdrawals near expected 3% real return.',
            },
            {
              label: 'Disclosure',
              text: 'Value published continuously; full holdings list published annually.',
            },
          ],
        },
        {
          name: 'SAFE Investment Company',
          tag: 'CHINA',
          role: "Overseas investment arm of China's foreign-exchange regulator.",
          anchor: '$2.05T est.',
          keyRisk: 'No published total; the size is inferred from reserve data.',
          dossier: [
            { label: 'Founded', text: '1997, Hong Kong.' },
            { label: 'Funding', text: 'Foreign-exchange reserves.' },
            { label: 'Disclosure', text: 'No portfolio total or holdings list.' },
          ],
        },
        {
          name: 'China Investment Corporation',
          tag: 'CHINA',
          role: 'Diversifies the investment of Chinese reserves into higher-return assets.',
          anchor: '$1.57T',
          keyRisk: 'Large domestic financial holdings tie results to Chinese bank valuations.',
          dossier: [
            { label: 'Founded', text: '2007.' },
            { label: 'Funding', text: 'Capitalized with special treasury bonds against reserves.' },
            {
              label: 'Disclosure',
              text: 'Publishes an annual report with total assets and returns.',
            },
          ],
        },
        {
          name: 'GIC',
          tag: 'SINGAPORE',
          role: "Manages Singapore's foreign reserves for long-run real returns.",
          anchor: '$1.16T est.',
          keyRisk: 'Does not disclose its size; reports a 20-year real return instead.',
          dossier: [
            { label: 'Founded', text: '1981.' },
            { label: 'Funding', text: 'Government reserves.' },
            { label: 'Disclosure', text: 'Long-run returns only; size is a third-party estimate.' },
          ],
        },
        {
          name: 'Abu Dhabi Investment Authority',
          tag: 'UAE',
          role: "Invests Abu Dhabi's surplus revenue across global markets.",
          anchor: '$1.13T est.',
          keyRisk: 'Only its internally managed US sleeve appears in public filings.',
          dossier: [
            { label: 'Founded', text: '1976.' },
            { label: 'Funding', text: 'Oil revenue surpluses.' },
            {
              label: 'Disclosure',
              text: '20- and 30-year annualised returns; no total asset figure.',
            },
          ],
        },
        {
          name: 'Kuwait Investment Authority',
          tag: 'KUWAIT',
          role: 'Runs the General Reserve Fund and the Future Generations Fund.',
          anchor: '$1.0T est.',
          keyRisk: 'Statutory transfers depend on state revenue, which depends on crude.',
          dossier: [
            { label: 'Founded', text: '1953, the oldest fund in the table.' },
            {
              label: 'Funding',
              text: 'At least 10% of state revenues into the Future Generations Fund.',
            },
            { label: 'Disclosure', text: 'No published total; no consolidated 13F.' },
          ],
        },
        {
          name: 'Public Investment Fund',
          tag: 'SAUDI ARABIA',
          role: 'Development fund for Vision 2030 with a global portfolio on the side.',
          anchor: '$906B',
          keyRisk: '76% of assets are domestic; giga-project spending competes with growth.',
          dossier: [
            { label: 'Founded', text: '1971.' },
            {
              label: 'Funding',
              text: 'Aramco transfers, state capital injections and debt issuance.',
            },
            { label: 'Disclosure', text: 'Annual report with AUM; US-listed positions via 13F.' },
          ],
        },
        {
          name: 'Qatar Investment Authority',
          tag: 'QATAR',
          role: 'Invests gas revenue across real estate, infrastructure and equities.',
          anchor: '$580B est.',
          keyRisk: 'Publishes no total, so the ranking rests on an outside estimate.',
          dossier: [
            { label: 'Founded', text: '2005.' },
            { label: 'Funding', text: 'Liquefied natural gas revenue.' },
            { label: 'Disclosure', text: 'US-listed positions via 13F only.' },
          ],
        },
        {
          name: 'Investment Corporation of Dubai',
          tag: 'UAE',
          role: "Holding vehicle for Dubai's government portfolio.",
          anchor: '$458B',
          keyRisk: 'Concentrated in Dubai-based companies, so it tracks the local economy.',
          dossier: [
            { label: 'Founded', text: '2006.' },
            { label: 'Funding', text: 'State holdings consolidated under one owner.' },
            { label: 'Disclosure', text: 'Size per Global SWF.' },
          ],
        },
        {
          name: 'Turkey Wealth Fund',
          tag: 'TURKEY',
          role: 'Strategic holding company for Turkish state enterprises.',
          anchor: '$443B',
          keyRisk: 'Size reflects transferred stakes, not accumulated surpluses.',
          dossier: [
            { label: 'Founded', text: '2016.' },
            { label: 'Funding', text: 'Transfers of state company stakes.' },
            { label: 'Disclosure', text: 'Size per Global SWF.' },
          ],
        },
        {
          name: 'Temasek',
          tag: 'SINGAPORE',
          role: 'Active owner of Singapore state companies and a global direct investor.',
          anchor: '$401B',
          keyRisk: 'Target of up to 15% AI exposure by 2031, from 6% today.',
          dossier: [
            { label: 'Founded', text: '1974.' },
            { label: 'Funding', text: 'State company holdings and reinvested returns.' },
            {
              label: 'Disclosure',
              text: 'Annual Temasek Review with marked-to-market net portfolio value.',
            },
          ],
        },
        {
          name: 'Mubadala',
          tag: 'UAE',
          role: "Diversification investor for Abu Dhabi's economy.",
          anchor: '$385B',
          keyRisk: 'The most active sovereign dealmaker, so deployment pace is the variable.',
          dossier: [
            { label: 'Founded', text: '2002.' },
            { label: 'Funding', text: 'Abu Dhabi government capital and reinvested returns.' },
            { label: 'Disclosure', text: 'Annual review with AUM; US-listed positions via 13F.' },
          ],
        },
      ],
    },
    {
      type: 'cta-callout',
      headline: 'Several of these funds file their US books every quarter',
      body: "PIF, Mubadala, QIA and Norway's NBIM report their US-listed long positions on Form 13F. Ezana's institutional holdings dataset tracks 13F filers position by position, with quarter-over-quarter changes, so you can see what sovereign capital bought last quarter instead of waiting for an annual report.",
      ctaLabel: 'Open institutional holdings',
      ctaHref: '/datasets/institutional',
      ctaAuthGate: false,
    },
    {
      type: 'paragraph',
      text: 'The Gulf group is where the deal flow is. Global SWF counted $53.9 billion committed by Gulf sovereign funds across 108 deals in the first half of 2026, the most active first half on record despite the volatility triggered by the war in Iran, with Mubadala alone investing $15.2 billion. The same tracker puts the wider sovereign investor universe, including central banks and public pension funds, at an all-time peak of $62.5 trillion. Against that backdrop, the six Gulf funds in the top 12 hold $4.46 trillion, or 36% of the table, and they are the funds whose rankings are most exposed to the price of a single commodity.',
    },

    { type: 'heading', text: 'The first decline in Riyadh', level: 2 },
    {
      type: 'paragraph',
      text: "The Public Investment Fund is one of the fastest-growing funds in the table over the past decade and, as of its 2025 annual report, the first to shrink. Assets rose from about $150 billion in 2015 to roughly $530 billion in 2021 and $913 billion at the end of 2024, a 19% gain in that year alone. In 2025 they slipped by SAR 38 billion to about SAR 3.4 trillion, or $906 billion, the fund's first decline this decade. The composition explains the stall: SAR 2.57 trillion, 76% of the total, is invested inside Saudi Arabia, where giga-projects absorb capital long before they produce marked-up valuations.",
    },
    {
      type: 'trajectory',
      figureLabel: 'FIG. 5 · THE $2 TRILLION GAP',
      kicker:
        'PUBLIC INVESTMENT FUND ASSETS UNDER MANAGEMENT, $T · SOLID = REPORTED · DASHED = GLOBAL SWF 2030 PROJECTION',
      hint: 'The dashed line is a projection, not a forecast by Ezana.',
      source:
        'PIF annual reports and press releases (2015, 2021, 2024, 2025); 2030 projection per Global SWF.',
      yLabel: 'PIF AUM, $ trillion',
      yMax: 2.2,
      xMin: 2015,
      xMax: 2030,
      series: [
        {
          key: 'pif',
          label: 'PIF reported AUM',
          color: 'var(--echo-chart-blue)',
          data: [
            { x: 2015, y: 0.15 },
            { x: 2021, y: 0.53 },
            { x: 2024, y: 0.913 },
            { x: 2025, y: 0.906 },
          ],
        },
        {
          key: 'pif-2030',
          label: 'Global SWF 2030 projection',
          color: 'var(--echo-chart-orange)',
          dashed: true,
          data: [
            { x: 2025, y: 0.906 },
            { x: 2030, y: 2.0 },
          ],
        },
      ],
      annotations: [
        { x: 2015, y: 0.15, label: '2015 · ~$150B', sub: 'before the Vision 2030 mandate' },
        { x: 2024, y: 0.913, label: '2024 · $913B', sub: '+19% in the year' },
        { x: 2025, y: 0.906, label: '2025 · $906B', sub: 'first decline this decade' },
        { x: 2030, y: 2.0, label: '2030 · $2T projected', sub: 'needs ~17% a year' },
      ],
    },
    {
      type: 'paragraph',
      text: "The arithmetic of the target is unforgiving. Global SWF has projected PIF at $2 trillion by 2030, which from $906 billion requires compound growth of about 17% a year for five years. PIF's average annual total portfolio return since 2017 is 7.2%, so most of the gap would have to come from new capital: further transfers of Aramco shares, state injections and debt. The divergence between Global SWF's $1.15 trillion estimate in mid-2025 and the fund's own $906 billion report is a measurement lesson as much as a performance one; third-party trackers and the fund count assets differently, and rankings built on mixed bases move when the basis changes.",
    },
    {
      type: 'callout',
      label: 'Growth PIF needs to reach $2T by 2030',
      value: '~17%/yr',
      context:
        'Compound annual growth from $906 billion (2025) to $2 trillion (2030). PIF has averaged a 7.2% annual total portfolio return since 2017, so capital transfers would have to close most of the gap.',
    },

    { type: 'heading', text: 'Who shows its hand', level: 2 },
    {
      type: 'paragraph',
      text: 'Every sovereign ranking mixes audited numbers with educated guesses, and the split is larger than most readers assume. Of the ten funds graded below, five publish a total asset figure of their own: Norway, China Investment Corporation, PIF, Temasek and Mubadala. The other five, SAFE Investment Company, GIC, ADIA, KIA and QIA, do not, which means $5.92 trillion of the table, nearly half the top-12 total, rests on third-party estimates. Norway is the outlier in the other direction: its value updates continuously and every holding is published once a year.',
    },
    {
      type: 'adjudication-matrix',
      figureLabel: 'FIG. 6 · WHAT EACH FUND ACTUALLY DISCLOSES',
      kicker:
        'TEN LARGEST FUNDS × THREE DISCLOSURE TESTS · SAME = PUBLISHED BY THE FUND · PART = PARTIAL OR REGULATORY ONLY · NONE = NOT PUBLISHED. CLICK A CELL FOR THE EVIDENCE.',
      hint: 'Click a cell for the evidence.',
      source:
        "Each fund's annual report or website; SEC Form 13F filings. Grades are Ezana editorial assessments.",
      cols: ['Publishes total assets', 'Publishes returns', 'Discloses holdings'],
      rows: [
        {
          label: 'NBIM (Norway)',
          cells: [
            {
              value: 'same',
              note: 'Fund value is published continuously; NOK 22,683bn at 30 June 2026.',
            },
            {
              value: 'same',
              note: 'Quarterly and half-year returns versus benchmark; 9.4% in H1 2026.',
            },
            {
              value: 'same',
              note: 'Every equity, bond and property holding is published annually.',
            },
          ],
        },
        {
          label: 'SAFE IC (China)',
          cells: [
            {
              value: 'none',
              note: 'No portfolio total is published; the $2.05T figure is an estimate.',
            },
            { value: 'none', note: 'No return series is published.' },
            { value: 'none', note: 'No holdings list is published.' },
          ],
        },
        {
          label: 'CIC (China)',
          cells: [
            { value: 'same', note: 'Total assets appear in the annual report.' },
            { value: 'same', note: 'Annual and cumulative returns appear in the annual report.' },
            { value: 'part', note: 'US-listed long positions surface in regulatory filings only.' },
          ],
        },
        {
          label: 'GIC (Singapore)',
          cells: [
            {
              value: 'none',
              note: 'GIC does not disclose its size; the $1.16T figure is an estimate.',
            },
            { value: 'same', note: 'Publishes a 20-year annualised real return.' },
            { value: 'none', note: 'No holdings list is published.' },
          ],
        },
        {
          label: 'ADIA (Abu Dhabi)',
          cells: [
            { value: 'none', note: 'No total asset figure; the $1.13T figure is an estimate.' },
            { value: 'same', note: 'Publishes 20- and 30-year annualised returns.' },
            {
              value: 'part',
              note: 'Only the internally managed US-listed sleeve appears on Form 13F.',
            },
          ],
        },
        {
          label: 'KIA (Kuwait)',
          cells: [
            { value: 'none', note: 'No published total; the $1.0T figure is an estimate.' },
            { value: 'none', note: 'No public return series.' },
            {
              value: 'none',
              note: 'No consolidated 13F; US equities sit largely with external managers.',
            },
          ],
        },
        {
          label: 'PIF (Saudi Arabia)',
          cells: [
            { value: 'same', note: 'AUM published in the annual report: $906B for 2025.' },
            { value: 'same', note: '7.2% average annual total portfolio return since 2017.' },
            {
              value: 'part',
              note: 'US-listed long positions appear on Form 13F; the domestic book is aggregated.',
            },
          ],
        },
        {
          label: 'Temasek (Singapore)',
          cells: [
            {
              value: 'same',
              note: 'Net portfolio value of S$518B at 31 March 2026, marked to market.',
            },
            { value: 'same', note: 'One-, five- and ten-year returns in the Temasek Review.' },
            { value: 'part', note: 'Major portfolio companies are named; the full book is not.' },
          ],
        },
        {
          label: 'QIA (Qatar)',
          cells: [
            { value: 'none', note: 'No published total; the $580B figure is an estimate.' },
            { value: 'none', note: 'No public return series.' },
            { value: 'part', note: 'US-listed long positions appear on Form 13F.' },
          ],
        },
        {
          label: 'Mubadala (Abu Dhabi)',
          cells: [
            { value: 'same', note: 'AUM published in the annual review: $385B.' },
            { value: 'same', note: 'Returns published in the annual review.' },
            { value: 'part', note: 'US-listed long positions appear on Form 13F.' },
          ],
        },
      ],
    },
    {
      type: 'paragraph',
      text: "For investors the practical consequence is that sovereign flows are visible in layers. Norway's 1.5% slice of global equities can be read holding by holding. Four Gulf funds, PIF, Mubadala, QIA and ADIA, expose at least part of their US-listed books on 13F every quarter, a window Ezana Echo's separate review of those filings shows is far smaller than their true US exposure. The five estimate-only funds, holding $5.92 trillion between them, show up mostly in the deals they announce. Any analysis that treats all twelve numbers as equally hard is overconfident by construction.",
    },

    { type: 'heading', text: 'What would reshuffle the table by 2030', level: 2 },
    {
      type: 'paragraph',
      text: "Global SWF's projections point to a more Gulf-weighted table by the end of the decade: it expects the UAE's three largest funds to grow from $1.974 trillion in 2025 to $2.767 trillion by 2030, a gain of nearly $793 billion, and has projected PIF at $2 trillion. Two forces could break that path. The first is oil, which funds roughly half the top 12 by value. The second is equities: with 72.1% of its value in stocks, a 20% global equity drawdown would cut Norway's fund by about 14% on simple arithmetic, a larger hit than any single year of oil revenue adds. The scenarios below frame the next five years.",
    },
    {
      type: 'paragraph',
      text: "The composition of the table is shifting at the edges too. Global SWF has flagged a wave of new sovereign funds and international offices being set up even as a notable number of existing funds and offices close in cost-cutting drives. Inside the incumbents, mandates are drifting toward technology: Temasek aims to lift its AI-related exposure from 6% of portfolio value to as much as 15% by 2031, inside a S$518 billion book. By 2030 a fund's rank may depend less on the barrel and more on whether that rotation pays.",
    },
    {
      type: 'scenario-chain',
      figureLabel: 'FIG. 7 · THREE PATHS TO 2030',
      kicker:
        'EACH CHAIN MULTIPLIES ITS CONDITIONS INTO A 2030 TABLE · RANGES ARE GLOBAL SWF PROJECTIONS OR ARITHMETIC ON REPORTED FIGURES, NOT EZANA FORECASTS.',
      hint: 'Read each chain left to right; the kill switch falsifies the base case.',
      source: 'Global SWF projections; PIF 2025 Annual Report; NBIM H1 2026; Ezana arithmetic.',
      scenarios: [
        {
          id: 'base',
          label: 'BASE CASE · NORWAY KEEPS THE CROWN, THE GULF CLOSES IN',
          tone: 'base',
          range: 'UAE big three ~$2.77T',
          steps: [
            { label: 'Gulf funds keep compounding', sub: 'record $53.9B deployed in H1 2026' },
            { label: 'NBIM holds its spending rule', sub: 'withdrawals near 3% of value' },
          ],
          result: {
            value: 'Norway first, Gulf share of the table rising',
            sub: 'Global SWF 2030 path',
          },
        },
        {
          id: 'alt',
          label: 'ALTERNATIVE · PIF RE-ACCELERATES',
          tone: 'alt',
          range: '$2T PIF needs ~17%/yr',
          steps: [
            { label: 'New Aramco share transfers', sub: 'capital injections, not returns' },
            { label: 'Domestic projects start marking up', sub: '76% of assets at home' },
          ],
          result: { value: 'PIF climbs back above $1T', sub: 'and toward second place' },
        },
        {
          id: 'bear',
          label: 'BEAR CASE · OIL AND EQUITIES FALL TOGETHER',
          tone: 'bear',
          range: '~14% hit to NBIM per 20% equity drop',
          steps: [
            { label: 'Crude slump', sub: 'inflows to commodity funds shrink' },
            { label: 'Global equity drawdown', sub: '72.1% of NBIM is equities' },
          ],
          result: {
            value: 'The trillion-dollar club shrinks',
            sub: 'reserve-funded Asia gains rank',
          },
        },
      ],
      killSwitch:
        "If PIF's 2026 annual report shows a second consecutive decline in assets under management, the $2 trillion by 2030 path is falsified.",
    },
    {
      type: 'paragraph',
      text: "The base case is that Norway keeps the top spot through 2030 on returns alone, the Gulf funds close the gap on deployment pace, and PIF's 2025 dip proves a pause rather than a turn. The bear case is a simultaneous oil and equity slump that hits Norway's 72.1% equity book and the commodity funds' inflows at once. For listed exposure, the funds' footprints are concrete: Norway's largest equity positions include US megacaps such as Nvidia, Apple and Microsoft; PIF owns roughly 60% of Lucid and has held Uber since a $3.5 billion investment in 2016; Mubadala is the majority owner of GlobalFoundries; and KIA's external relationships run through managers such as BlackRock. Sovereign money is patient, but at $12.4 trillion it is never neutral.",
    },
    {
      type: 'cta-callout',
      headline: 'Sovereign wealth is one column of national power',
      body: "Ezana's Empire Rankings score 30+ countries across all 18 Dalio power dimensions, from debt burden to reserve currency status, rank-normalized from World Bank source data, with head-to-head radar comparisons for every country in this table.",
      ctaLabel: 'Open the Empire Rankings',
      ctaHref: '/empire-ranking',
      ctaAuthGate: true,
    },
  ],
  globeRail: {
    metric: {
      title: 'NORWAY GPFG VALUE (NOK TN)',
      data: [
        { x: 2015, y: 7.48 },
        { x: 2017, y: 8.49 },
        { x: 2019, y: 10.09 },
        { x: 2021, y: 12.34 },
        { x: 2023, y: 15.77 },
        { x: 2024, y: 19.74 },
        { x: 2025, y: 21.27 },
        { x: 2026.5, y: 22.68 },
      ],
      startLabel: '2015 · NOK 7.5tn',
      endLabel: 'Jun 2026 · NOK 22.7tn',
      note: "The world's largest sovereign fund roughly tripled in kroner terms over the decade (NBIM).",
    },
    cities: [
      {
        name: 'Oslo',
        country: 'Norway',
        lat: 59.91,
        lng: 10.75,
        sectionAnchor: 'norway-the-index-fund-with-a-spending-rule',
        impact:
          "Norway's fund was worth NOK 22,683 billion at 30 June 2026 and returned a record NOK 1,753 billion in the first half. A fiscal rule caps budget withdrawals near the expected 3% real return, so the fund behaves as a permanent income stream.",
      },
      {
        name: 'Beijing',
        country: 'China',
        lat: 39.9,
        lng: 116.41,
        sectionAnchor: 'twelve-funds-eight-flags',
        impact:
          "China's two vehicles, SAFE Investment Company ($2.05 trillion) and CIC ($1.57 trillion), combine for $3.62 trillion, more than Norway's single fund. Both invest foreign-exchange reserves rather than commodity revenue.",
      },
      {
        name: 'Kuwait City',
        country: 'Kuwait',
        lat: 29.38,
        lng: 47.99,
        sectionAnchor: 'seventy-years-of-state-savings',
        impact:
          'Kuwait founded the first modern sovereign fund in 1953 and now holds about $1.0 trillion. At least 10% of state revenues flow into its Future Generations Fund.',
      },
      {
        name: 'Abu Dhabi',
        country: 'United Arab Emirates',
        lat: 24.45,
        lng: 54.38,
        sectionAnchor: 'oil-money-and-reserve-money',
        impact:
          "ADIA ($1.13 trillion) and Mubadala ($385 billion) anchor the UAE's $1.97 trillion in the table. Mubadala was the most active sovereign investor in H1 2026 with $15.2 billion deployed.",
      },
      {
        name: 'Riyadh',
        country: 'Saudi Arabia',
        lat: 24.71,
        lng: 46.68,
        sectionAnchor: 'the-first-decline-in-riyadh',
        impact:
          'PIF reported $906 billion for 2025, its first decline this decade, with 76% of assets inside Saudi Arabia. Reaching a projected $2 trillion by 2030 needs roughly 17% growth a year.',
      },
      {
        name: 'Singapore',
        country: 'Singapore',
        lat: 1.35,
        lng: 103.82,
        sectionAnchor: 'who-shows-its-hand',
        impact:
          'Temasek publishes a marked-to-market S$518 billion net portfolio value; GIC, at an estimated $1.16 trillion, does not disclose its size at all. One city holds both ends of the transparency scale.',
      },
    ],
  },
  author: 'Ezana Finance Editorial',
  category: 'global-emerging',
  subcategory: 'Sovereign Funds',
  meta: {
    sectors: ['Financials', 'Information Technology'],
    industries: ['Asset Management & Custody Banks', 'Semiconductors'],
    investors: [
      'Norges Bank Investment Management',
      'SAFE Investment Company',
      'China Investment Corporation',
      'GIC',
      'Abu Dhabi Investment Authority',
      'Kuwait Investment Authority',
      'Public Investment Fund',
      'Qatar Investment Authority',
      'Investment Corporation of Dubai',
      'Turkey Wealth Fund',
      'Temasek',
      'Mubadala Investment Company',
    ],
    institutions: [
      'Global SWF',
      'Nvidia',
      'Apple',
      'Microsoft',
      'Lucid Motors',
      'Uber',
      'GlobalFoundries',
      'BlackRock',
      'Saudi Aramco',
    ],
    government: ['Norges Bank', 'State Administration of Foreign Exchange'],
    geos: [
      'Norway',
      'China',
      'Singapore',
      'United Arab Emirates',
      'Kuwait',
      'Saudi Arabia',
      'Qatar',
      'Turkey',
      'United States',
    ],
    assetClasses: ['Equities', 'Fixed Income', 'Commodities'],
    themes: [
      'Sovereign Wealth',
      'Petrodollar Recycling',
      'Disclosure & Transparency',
      'Geopolitics',
    ],
    datasets: ['13F holdings', 'SEC filings'],
    // markets: no specific prediction market or exchange venue is discussed in the text.
    markets: [],
  },
  tickers: ['NVDA', 'AAPL', 'MSFT', 'LCID', 'UBER', 'GFS', 'BLK'],
  entities: {
    // people: no individual is named in the text.
    people: [],
    terms: [
      { id: 'fiscal-rule', label: 'Fiscal Rule' },
      { id: 'sovereign-wealth-fund', label: 'Sovereign Wealth Fund' },
      { id: 'foreign-exchange-reserves', label: 'Foreign-Exchange Reserves' },
    ],
  },
  readTime: 9,
  publishedAt: '2026-10-02',
  listMeta: '2 Oct 2026',
  featured: false,
  likes: 0,
  comments: 0,
  reads: 0,
  status: 'published',
};
