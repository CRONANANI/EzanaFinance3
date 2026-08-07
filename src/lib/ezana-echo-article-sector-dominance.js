/**
 * Ezana Echo long-form article: 225 years of dominating US stock market sectors.
 * Editorial / illustrative — historical sector-share data is approximated to
 * match Goldman Sachs Research's October 2025 published visualization.
 *
 * Source attribution: Datastream, Goldman Sachs Research (October 2025)
 */

/* ════════════════════════════════════════════════════════════════════════════
   Year-by-year market share data for the four dominant sectors
   Each row: { year, finance, transport, energy, tech }
   Values are share of US stock market (0–100). Always sums to ≤100; the
   remainder is "other sectors not depicted" (consumer, healthcare, etc.).
   ════════════════════════════════════════════════════════════════════════════ */

export const SECTOR_DOMINANCE_DATA = [
  /* 1800-1850: Finance & Real Estate dominant (banks were the early stock market) */
  { year: 1800, finance: 90, transport: 0, energy: 0, tech: 0 },
  { year: 1810, finance: 85, transport: 0, energy: 0, tech: 0 },
  { year: 1820, finance: 78, transport: 5, energy: 0, tech: 0 },
  { year: 1830, finance: 72, transport: 12, energy: 2, tech: 0 },
  { year: 1840, finance: 65, transport: 22, energy: 3, tech: 0 },
  { year: 1850, finance: 50, transport: 38, energy: 5, tech: 0 },

  /* 1850-1910: Transport era — canals, railroads, then early autos */
  { year: 1860, finance: 35, transport: 52, energy: 7, tech: 0 },
  { year: 1870, finance: 25, transport: 60, energy: 10, tech: 0 },
  { year: 1880, finance: 20, transport: 62, energy: 13, tech: 0 },
  { year: 1890, finance: 18, transport: 60, energy: 17, tech: 0 },
  { year: 1900, finance: 17, transport: 52, energy: 22, tech: 1 },
  { year: 1910, finance: 18, transport: 42, energy: 28, tech: 2 },

  /* 1910-1980: Energy & Materials dominant — Standard Oil, US Steel, GM, etc. */
  { year: 1920, finance: 16, transport: 30, energy: 36, tech: 4 },
  { year: 1930, finance: 14, transport: 22, energy: 38, tech: 6 },
  { year: 1940, finance: 12, transport: 18, energy: 36, tech: 8 },
  { year: 1950, finance: 10, transport: 14, energy: 35, tech: 10 },
  { year: 1960, finance: 12, transport: 10, energy: 30, tech: 13 },
  { year: 1970, finance: 14, transport: 8, energy: 28, tech: 15 },
  { year: 1980, finance: 13, transport: 6, energy: 28, tech: 18 },

  /* 1980-2025: Information Technology & Communications takes over */
  { year: 1990, finance: 14, transport: 5, energy: 14, tech: 20 },
  { year: 2000, finance: 18, transport: 4, energy: 7, tech: 32 },
  { year: 2005, finance: 22, transport: 4, energy: 10, tech: 18 },
  { year: 2010, finance: 16, transport: 4, energy: 12, tech: 22 },
  { year: 2015, finance: 16, transport: 5, energy: 8, tech: 28 },
  { year: 2020, finance: 13, transport: 5, energy: 4, tech: 38 },
  { year: 2025, finance: 13, transport: 5, energy: 5, tech: 45 },
];

/**
 * Per-era hover details — when a user hovers a year, we show the era's stats.
 * Each era covers a year range and surfaces what was actually happening.
 */
export const SECTOR_ERAS = [
  {
    yearStart: 1800,
    yearEnd: 1849,
    sector: 'finance',
    sectorLabel: 'Finance & Real Estate',
    color: '#5d8a3a',
    peakShare: '~90%',
    notable: 'Bank of New York, Bank of the United States, City Bank',
    driver: 'Banks WERE the early stock market — limited industrial issuance',
  },
  {
    yearStart: 1850,
    yearEnd: 1909,
    sector: 'transport',
    sectorLabel: 'Transport',
    color: '#c9a047',
    peakShare: '~62%',
    notable: 'New York Central, Pennsylvania Railroad, Union Pacific',
    driver: 'Railroad construction boom; canal companies; later early autos',
  },
  {
    yearStart: 1910,
    yearEnd: 1989,
    sector: 'energy',
    sectorLabel: 'Energy & Materials',
    color: '#a83838',
    peakShare: '~38%',
    notable: 'Standard Oil, US Steel, General Motors, Exxon, DuPont',
    driver: 'Industrialization, automobiles, post-war manufacturing peak',
  },
  {
    yearStart: 1990,
    yearEnd: 2025,
    sector: 'tech',
    sectorLabel: 'Information Technology & Communications',
    color: '#3b78d1',
    peakShare: '~45%',
    notable: 'Microsoft, Apple, Nvidia, Alphabet, Meta, Amazon',
    driver: 'PC era → internet → mobile → cloud → AI compute',
  },
];

/* ════════════════════════════════════════════════════════════════════════════
   Article body
   ════════════════════════════════════════════════════════════════════════════ */

export const sectorDominanceArticle = {
  id: 'dominating-us-stock-market-sectors-through-the-times',
  title: "Tech Reigns, But Falls Short of History's Heavyweights",
  excerpt:
    "Two centuries of US equity history compressed into one chart: how Finance, Transport, Energy, and now Technology each held the largest sector crown — and what each era's dominance reveals about the economy that produced it.",
  heroImage: {
    src: '/tech-reigns-wall-street-panic.jpg',
    alt: 'Engraving of a 19th-century Wall Street crowd packed in front of stock broker offices during a market panic, with Drake Brothers and Hodgkin Randall & Hudson signage visible',
    caption:
      'Wall Street in panic, c. 1880s — a moment from one of the recurring market dislocations that punctuated the 225-year arc of US equity history.',
  },
  contentBlocks: [
    {
      type: 'paragraph',
      text: "Across 225 years of equity history, four sectors have taken turns as the single largest slice of the market: finance and real estate in the early republic, transport during the railroad century, energy and materials through the industrial era, and information technology in the digital age. The chart below shows the share of the largest sector at every point in time. Each color marks a regime — a stretch of decades when one industry's share towered over everything else. Hover over any point on the timeline to see what was driving that era's dominance.",
    },

    {
      type: 'chart',
      variant: 'interactive-stacked-area',
      title: 'Share of the Largest US Stock Market Sector, 1800–2025',
      caption:
        'Share of the largest sector in the US stock market, 1800–2025. Hover the chart for era-specific stats. Source: Datastream, Goldman Sachs Research (October 2025).',
      dataKey: 'sectorDominance',
      yLabel: 'Share of largest sector',
    },

    {
      type: 'wall-timeline',
      figureLabel: 'FIG. 1 · 225 YEARS, FOUR REGIMES',
      kicker:
        '1800–2025 WALL CHART · SHADED SECTOR REGIMES · TWELVE DATED TRANSITIONS — CLICK ANY PLAQUE FOR THE RECORD.',
      hint: 'Click a plaque for its record.',
      source: 'Datastream, Goldman Sachs Research (October 2025); standard financial chronology.',
      startYear: 1800,
      endYear: 2025,
      windows: [
        {
          id: 'fin',
          label: 'Finance & Real Estate',
          from: 1800,
          to: 1850,
          color: 'var(--echo-chart-green)',
        },
        {
          id: 'trans',
          label: 'Transport',
          from: 1850,
          to: 1910,
          color: 'var(--echo-chart-orange)',
        },
        {
          id: 'energy',
          label: 'Energy & Materials',
          from: 1910,
          to: 1990,
          color: 'var(--echo-chart-red)',
        },
        {
          id: 'tech',
          label: 'Information Technology',
          from: 1990,
          to: 2025,
          color: 'var(--echo-chart-blue)',
        },
      ],
      plaques: [
        {
          year: 1792,
          lane: 0,
          label: 'Buttonwood Agreement',
          detail:
            "The NYSE's predecessor begins trading a market dominated almost entirely by bank stocks.",
        },
        {
          year: 1816,
          lane: 1,
          label: 'Second Bank of the US',
          detail:
            'The Second Bank takes the place of the First (whose charter expired in 1811); state-chartered banks proliferate around it.',
        },
        {
          year: 1836,
          lane: 2,
          label: 'Jackson kills the Second Bank',
          detail:
            'Andrew Jackson destroys the Second Bank of the United States; the wildcat banking era and the Panic of 1837 follow.',
        },
        {
          year: 1869,
          lane: 3,
          label: 'Promontory Summit',
          detail:
            'The Union Pacific and Central Pacific meet — the transcontinental line consumed more than $100 million in public and private capital.',
        },
        {
          year: 1873,
          lane: 0,
          label: 'Panic of 1873',
          detail:
            'Begins with the failure of Jay Cooke and Company, overexposed to Northern Pacific Railroad bonds.',
        },
        {
          year: 1893,
          lane: 1,
          label: 'Panic of 1893',
          detail:
            'Triggered by the bankruptcy of the Philadelphia and Reading Railroad, producing one of the deepest depressions in American history.',
        },
        {
          year: 1901,
          lane: 2,
          label: 'US Steel formed',
          detail:
            'Formed as the largest corporation in American history at the time, anchoring an industrial complex of steel makers.',
        },
        {
          year: 1911,
          lane: 3,
          label: 'Standard Oil broken up',
          detail:
            'The Supreme Court dissolves Standard Oil into 34 companies — Exxon, Chevron, Mobil, Amoco and others trace to this ruling.',
        },
        {
          year: 1973,
          lane: 4,
          label: 'First oil shock',
          detail:
            'The 1973 oil shock inflates energy prices but exposes the vulnerability of energy-intensive industry; decline begins.',
        },
        {
          year: 2000,
          lane: 0,
          label: 'Dot-com peak, then bust',
          detail:
            "Technology's share collapsed from over thirty percent back to the high teens in the 2000–2002 bust.",
        },
        {
          year: 2007,
          lane: 1,
          label: 'iPhone launches',
          detail:
            'Mobile computing produces the largest companies in human history; Apple later passes $1T (2018), $2T (2020), $3T (2022).',
        },
        {
          year: 2022,
          lane: 2,
          label: 'AI compute era',
          detail:
            'The public release of ChatGPT in late 2022 opens the AI phase; Nvidia becomes, by some measures, the most valuable company in the world.',
        },
      ],
    },

    /* ─── ERA 1: FINANCE & REAL ESTATE (≈750 words) ─── */
    { type: 'heading', text: '1800–1850: Finance & Real Estate Era', level: 2 },
    {
      type: 'paragraph',
      text: "When the first US stock exchanges began trading in earnest, banks were not just listed alongside other businesses — they were nearly the only businesses listed. In the decades following the founding of the Buttonwood Agreement in 1792, the New York Stock Exchange's predecessor traded a market dominated almost entirely by financial institutions. Bank of New York, the First and Second Bank of the United States, and a small constellation of state-chartered banks accounted for the overwhelming majority of equity capitalization. At its peak in the early 1800s, finance and real estate represented roughly ninety percent of the US stock market — a concentration that no single sector has approached since.",
    },
    {
      type: 'paragraph',
      text: 'The reason was structural. The early American economy was overwhelmingly agricultural, and most commercial enterprise was conducted through partnerships and proprietorships rather than [[kw:buttonwood-agreement]]publicly traded corporations[[/kw]]. Manufacturing was small, local, and family-owned. Transportation infrastructure was limited to what private investors and local governments could finance through bonds and turnpike companies. The stocks that DID trade publicly were almost exclusively bank stocks, marine insurance companies, and a handful of land-development corporations. The market was, in effect, a financial sector ETF — there was nothing else to buy.',
    },
    {
      type: 'paragraph',
      text: "This concentration also reflected the economic theory of the early republic. [[person:alexander-hamilton]]Alexander Hamilton[[/person]]'s vision of national finance — a [[kw:hamiltonian-finance]]Hamiltonian vision of national finance[[/kw]], federal debt assumption, and a domestic banking system — was the constitutional foundation on which American capital markets were built. The First Bank of the United States, chartered in 1791, was both a public institution and a publicly traded one, and its shares were among the most actively traded securities in the country. When its charter expired in 1811 and the Second Bank took its place in 1816, the pattern repeated. State-chartered banks proliferated in their wake, each issuing tradable shares that found their way onto the rosters of the regional exchanges that emerged in Philadelphia, Boston, and New York.",
    },
    {
      type: 'paragraph',
      text: 'Real estate played a smaller but meaningful role. Land companies that pooled investor capital to acquire and subdivide western territories — particularly along the routes of planned canals and turnpikes — issued shares that traded actively. Some of these enterprises generated extraordinary returns; others collapsed in spectacular fraud. The line between legitimate land speculation and outright swindling was blurry, and the period produced some of the earliest American securities scandals.',
    },
    {
      type: 'paragraph',
      text: "The era's dominance began to erode for two reasons. The first was technological: the rise of canal corporations in the 1820s and 1830s introduced large publicly traded enterprises that were not banks. The Erie Canal Company, chartered in 1817, demonstrated that infrastructure-scale capital could be raised from public investors. The second was political: [[person:andrew-jackson]]Andrew Jackson[[/person]]'s destruction of the Second Bank of the United States in 1836, followed by the wildcat banking era and the panic of 1837, fundamentally reshaped the relationship between government and finance. Bank stocks remained important, but they no longer commanded the field.",
    },
    {
      type: 'paragraph',
      text: 'By 1850, finance and real estate had fallen from ninety percent to roughly fifty percent of the market — still the largest sector, but only barely. Within a single generation, the next era was already emerging on the horizon, and it would arrive on iron rails.',
    },

    /* ─── ERA 2: TRANSPORT (≈750 words) ─── */
    { type: 'heading', text: '1850–1910: Transport Era', level: 2 },
    {
      type: 'paragraph',
      text: 'The transport century is the most concentrated and most singular regime in American stock market history. Beginning in earnest in the 1840s and accelerating through Reconstruction, railroad companies became the largest, most numerous, and most actively traded equities on the exchanges. By 1880, transport stocks accounted for more than sixty percent of the entire US stock market. New York Central, Pennsylvania Railroad, Erie, Baltimore and Ohio, Union Pacific, and dozens of regional lines collectively represented an unprecedented concentration of capital — and of risk.',
    },
    {
      type: 'paragraph',
      text: 'What made railroads different from the banks and canals that preceded them was scale. The capital required to build a transcontinental rail line dwarfed anything previously raised in American [[kw:buttonwood-agreement]]capital markets[[/kw]]. The Union Pacific and Central Pacific, racing to meet at Promontory Summit in 1869, together consumed more than $100 million in public and private capital — a sum that would have been unimaginable two decades earlier. The federal government provided massive land grants and bond guarantees, but the operating capital came from public stock and bond issuance. The exchanges existed, in many ways, to serve the railroads.',
    },
    {
      type: 'paragraph',
      text: 'This created a market that was both extraordinarily large and extraordinarily volatile. The financial history of the late nineteenth century is, in significant measure, the financial history of railroad booms and busts. The Panic of 1873 began with the failure of Jay Cooke and Company, a banking house overexposed to Northern Pacific Railroad bonds. The Panic of 1893 was triggered by the bankruptcy of the Philadelphia and Reading Railroad, which cascaded through the financial system and produced one of the deepest depressions in American history. The Panic of 1907 had multiple causes, but the collapse of overleveraged rail and trust company stocks was central to it.',
    },
    {
      type: 'paragraph',
      text: "Beyond the railroads themselves, an entire ecosystem of transport-related equities filled out the sector. Steamship companies, telegraph operators (which laid lines along rail rights-of-way and were initially considered transport-adjacent), refrigerated railcar manufacturers, sleeping-car companies like Pullman, and bridge builders all traded actively. [[person:cornelius-vanderbilt]]Cornelius Vanderbilt[[/person]], [[person:jay-gould]]Jay Gould[[/person]], [[person:edward-harriman]]Edward Harriman[[/person]], [[person:james-j-hill]]James J. Hill[[/person]], and [[person:jp-morgan]]J.P. Morgan[[/person]] are remembered today not as merchants or financiers but as railroad operators — because that's where the largest fortunes of the era were made.",
    },
    {
      type: 'paragraph',
      text: "The era's economic logic was straightforward: a continental nation needed transportation infrastructure on a scale no previous economy had ever built, and public equity markets were the only mechanism capable of financing it. By 1900, the United States had over 200,000 miles of operating railroad track — roughly half of all railroad mileage in the world. Every mile required capital, and most of that capital came from publicly traded shares.",
    },
    {
      type: 'paragraph',
      text: 'Decline was gradual but unmistakable. The [[kw:antitrust]]Sherman Antitrust Act of 1890[[/kw]] and subsequent rulings broke up the largest combinations. The rise of the automobile after 1900 began to siphon investment toward a new transportation paradigm. The Hepburn Act of 1906 imposed federal rate regulation that capped railroad profitability. By 1910, transport had fallen to about forty-two percent of the market — still the largest sector, but no longer dominant. Standard Oil, US Steel, and a new generation of industrial giants were rising fast. The next regime had already begun.',
    },

    /* ─── ERA 3: ENERGY & MATERIALS (≈750 words) ─── */
    { type: 'heading', text: '1910–1990: Energy & Materials Era', level: 2 },
    {
      type: 'paragraph',
      text: "If the railroads built nineteenth-century America, oil and steel built the twentieth. From roughly 1910 through the late 1980s, energy and materials companies — Standard Oil and its descendants, US Steel, the chemical giants, the industrial conglomerates of the post-war era — collectively held the largest share of the US stock market. The peak came around 1940, when the sector accounted for roughly thirty-eight percent of total market capitalization, but the era's dominance lasted nearly eighty years and produced more than a quarter of the entire history of US equities.",
    },
    {
      type: 'paragraph',
      text: 'The transition from transport to energy and materials happened in stages. The first stage was the rise of integrated industrial corporations — Standard Oil, founded in 1870 and broken up by the Supreme Court in 1911, was so large that its dissolution into thirty-four separate companies created an entire sector overnight. Exxon, Chevron, Mobil, Amoco, Atlantic Richfield, and Marathon all trace their lineage to that single 1911 ruling. US Steel, formed in 1901 as the largest corporation in American history at the time of its incorporation, similarly anchored an industrial complex that included Bethlehem, Inland, and dozens of regional steel makers.',
    },
    {
      type: 'paragraph',
      text: 'The second stage was the automobile. General Motors, Ford, and Chrysler did not merely create new companies — they created entirely new categories of demand for materials. Steel, aluminum, copper, glass, and rubber all expanded dramatically as auto production scaled from thousands of vehicles per year in 1900 to millions per year by 1929. The chemical industry, led by DuPont, expanded in parallel to supply materials, paint, and synthetic compounds. Each of these industries traded as publicly listed equities, and together they pushed energy and materials past transport in market share by the early 1920s.',
    },
    {
      type: 'paragraph',
      text: 'The third stage was the post-war boom. Between 1945 and 1970, American manufacturing operated nearly without international competition. European and Japanese industrial bases had been destroyed during the war and would take decades to rebuild. American oil majors developed reserves across the Middle East, North Africa, and Latin America. American steel producers supplied the [[kw:marshall-plan-capital-formation]]Marshall Plan rebuilding[[/kw]] of Europe, the Korean War mobilization, the interstate highway construction, and the suburban housing boom. Profits were enormous, [[kw:coupon-clipping-era]]dividends[[/kw]] were generous, and energy and materials stocks were considered the bedrock of any [[kw:sector-rotation]]institutional portfolio[[/kw]].',
    },
    {
      type: 'paragraph',
      text: 'The peak was perhaps the 1950s and early 1960s — a period sometimes called the golden age of industrial capitalism. The Dow Jones Industrial Average was, almost literally, an index of industrial companies: General Motors, US Steel, Standard Oil of New Jersey, Bethlehem Steel, DuPont, Goodyear, and similar firms made up most of its membership. The fortunes of these companies were the fortunes of the American economy.',
    },
    {
      type: 'paragraph',
      text: "Decline began in the 1970s. The 1973 oil shock, while temporarily inflating energy share prices, also exposed the vulnerability of energy-intensive industries. Foreign competition — particularly Japanese steel and German chemicals — eroded American manufacturers' margins. Environmental regulation raised costs. The 1979 second oil shock and the Volcker recession of 1981-1982 hit the sector especially hard. By 1990, energy and materials had fallen to roughly fourteen percent of the market combined. A new sector was about to take the crown, and it would do so in a way that would have been incomprehensible to a 1960s portfolio manager.",
    },

    {
      type: 'lifelines',
      figureLabel: 'FIG. 2 · THE HANDOVER CHAIN',
      kicker:
        'EACH SECTOR REGIME FROM RISE TO HANDOVER · 1800–2025 · PEAK SHARE IN THE RECORD. CLICK ANY LIFELINE FOR THE RECORD.',
      hint: 'Click a lifeline for its record.',
      source: 'Datastream, Goldman Sachs Research (October 2025).',
      startYear: 1800,
      endYear: 2025,
      groups: [
        {
          label: 'Displaced · the handover chain',
          rows: [
            {
              name: 'Finance & Real Estate',
              from: 1800,
              to: 1850,
              outcome: { type: 'handover', label: 'handover · 1850' },
              record:
                'Peaked at roughly ninety percent of the market in the early 1800s — a concentration no single sector has approached since — then fell to about fifty percent by 1850 as canal corporations and Jackson-era upheaval eroded the banks.',
            },
            {
              name: 'Transport',
              from: 1850,
              to: 1910,
              outcome: { type: 'handover', label: 'handover · 1910' },
              record:
                'Railroads pushed transport past sixty percent of the market by 1880 — a peak of ~62% — before antitrust, the Hepburn Act, and the rise of the automobile cut the sector to about forty-two percent by 1910.',
            },
            {
              name: 'Energy & Materials',
              from: 1910,
              to: 1990,
              outcome: { type: 'handover', label: 'handover · 1990' },
              record:
                'Oil, steel, autos and chemicals peaked around 1940 at roughly thirty-eight percent and reigned nearly eighty years, before oil shocks, foreign competition and the Volcker recession cut the sector to about fourteen percent combined by 1990.',
            },
          ],
        },
        {
          label: 'Incumbent',
          rows: [
            {
              name: 'Information Technology',
              from: 1990,
              to: null,
              outcome: { type: 'continuing', label: 'reigning · ~45%' },
              record:
                'The shortest regime — barely thirty-five years — now roughly forty-five percent of the market, yet still below the high-water marks of every previous era. Microsoft, Apple, Nvidia, Alphabet, Meta and Amazon account for more than a quarter of the S&P 500 by themselves.',
            },
          ],
        },
      ],
    },

    /* ─── ERA 4: INFORMATION TECHNOLOGY & COMMUNICATIONS (≈750 words) ─── */
    {
      type: 'heading',
      text: '1990–Present: Information Technology & Communications Era',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'The current era is the shortest of the four — barely thirty-five years old as of 2025 — but it has already produced the highest single-stock concentrations in American market history. Information technology and communications companies, taken together, now represent roughly forty-five percent of the US stock market. Microsoft, Apple, Nvidia, Alphabet, Meta, and Amazon collectively account for more than a quarter of the S&P 500 by themselves. The largest companies in the largest economy in the world are technology companies, and the gap between them and everything else continues to widen.',
    },
    {
      type: 'paragraph',
      text: 'The era can be subdivided into roughly four phases. The first was the personal computer phase, beginning in the early 1980s and accelerating through the 1990s. IBM, Microsoft, Intel, and a wave of hardware and software companies created a new category of equity that did not fit the industrial framework of the previous era. These companies had high gross margins, low capital requirements, and the ability to grow revenues at rates that would have been unthinkable for a steel manufacturer or an oil major. The market gradually learned to value them differently — using metrics like growth rates, recurring revenue, and software [[kw:revenue-multiple-valuation]]revenue multiples[[/kw]] that had no clear precedent.',
    },
    {
      type: 'paragraph',
      text: "The second phase was the internet boom of the late 1990s. The dot-com bubble produced extraordinary excess — Pets.com, Webvan, eToys, and hundreds of similarly capitalized companies that lost billions before failing — but it also produced enduring infrastructure. Cisco, Oracle, and EMC built the plumbing of the early internet. Amazon, eBay, and Yahoo demonstrated that purely digital businesses could reach mass scale. When the [[kw:speculative-mania]]bubble[[/kw]] burst in 2000-2002, technology's share of the market temporarily collapsed from over thirty percent back down to the high teens, and many investors concluded that the era was already over.",
    },
    {
      type: 'paragraph',
      text: "The third phase began with the iPhone in 2007 and ran through roughly 2020. Mobile computing produced the largest companies in human history. Apple's market capitalization passed $1 trillion in 2018, $2 trillion in 2020, and $3 trillion in 2022 — milestones that would have seemed absurd a generation earlier. Google reorganized as Alphabet and entered the trillion-dollar club. Amazon, having survived the dot-com crash, reinvented itself as a cloud computing company through Amazon Web Services and joined the megacap tier. Facebook, renamed Meta, monetized social networking at scale that exceeded the entire global advertising industry's pre-internet revenue base.",
    },
    {
      type: 'paragraph',
      text: "The fourth phase is the artificial intelligence era, beginning roughly in late 2022 with the public release of ChatGPT. Nvidia, which spent most of its history as a moderately sized graphics chip company, has become — by some measures — the most valuable company in the world, driven by demand for the GPUs that train large language models. Microsoft's investment in OpenAI and integration of generative AI across its product line has reaccelerated its growth at a scale most analysts considered impossible for a company of its size. The AI compute build-out is the largest concentrated capital deployment in technology history, and it has further concentrated the market in a small number of names.",
    },
    {
      type: 'paragraph',
      text: "What's striking about the current era, viewed in long historical context, is that technology's dominance — at roughly forty-five percent of the [[kw:buttonwood-agreement]]market[[/kw]] — is real but not as overwhelming as the regimes that came before. Finance hit ninety percent in 1800. Transport hit sixty-two percent in 1880. Energy and materials peaked at thirty-eight percent in 1940. Today's technology concentration, while significant, is below the high-water marks of every previous era. The sectors of yore were more dominant. Whether that means technology has further to run, or whether market structure simply prevents any single sector from reaching the heights it once could, is a question only the next chart — drawn fifty or one hundred years from now — will be able to answer.",
    },
    {
      type: 'cta-callout',
      variant: 'sub-industry-teaser',
      headline: 'What comes next within technology?',
      body: "Technology as a sector contains dozens of sub-industries — AI infrastructure, cloud-native software, advanced semiconductors, fiber optics, cybersecurity, edge compute. Some will define the next phase of the cycle. Others will be displaced before the decade ends. Ezana surfaces the specific companies positioned for each sub-industry's next move and tracks the rotation in real time.",
      ctaLabel: 'See the sector analysis →',
      ctaHref: '/market-analysis?sector=technology',
      ctaAuthGate: true,
    },

    /* ─── CLOSING ─── */
    { type: 'heading', text: 'What The Pattern Reveals', level: 2 },
    {
      type: 'paragraph',
      text: "Two hundred and twenty-five years of US equity history compressed into a single image makes one fact unmissable: [[kw:sector-rotation]]market leadership rotates[[/kw]]. Each era's dominant sector was, in its time, considered the unassailable bedrock of any serious portfolio. Banks in 1820. Railroads in 1870. Standard Oil and US Steel in 1920. The conglomerates of the Nifty Fifty in 1965. Each was eventually displaced — not because investors stopped believing in them, but because the underlying economy moved on to something else. The current technology regime will, in its turn, share that fate. The question for today's investor is not whether the rotation will happen, but what comes next — and what 2050's version of this chart will look like when it is finally drawn.",
    },
    {
      type: 'adjudication-matrix',
      figureLabel: 'FIG. 3 · THE FORCES THAT ENDED EACH REGIME',
      kicker:
        'FOUR REGIMES × THE RECURRING FORCES THE ARTICLE NAMES · SAME = THE FORCE WAS PRESENT · PART = PRESENT WITH AN ASTERISK · — = ABSENT (OR NOT YET). CLICK ANY CELL FOR THE RECORD.',
      hint: 'Click any cell for the record.',
      source: "this article's synthesis · Datastream, Goldman Sachs Research (October 2025).",
      cols: [
        'New enterprise form',
        'Regulation / antitrust',
        'Financial panic at the turn',
        'Peak, then decline',
      ],
      rows: [
        {
          label: 'Finance & Real Estate',
          cells: [
            {
              value: 'same',
              note: 'Canal corporations — the first large non-bank public enterprises — introduced a rival to the banks in the 1820s and 1830s.',
            },
            {
              value: 'same',
              note: "Jackson's destruction of the Second Bank of the United States in 1836 reshaped the relationship between government and finance.",
            },
            { value: 'same', note: 'The Panic of 1837 followed the wildcat banking era.' },
            {
              value: 'same',
              note: 'Finance fell from roughly ninety percent in 1800 to about fifty percent by 1850.',
            },
          ],
        },
        {
          label: 'Transport',
          cells: [
            {
              value: 'same',
              note: 'Railroads brought unprecedented scale; the automobile after 1900 siphoned investment toward a new paradigm.',
            },
            {
              value: 'same',
              note: 'The Sherman Antitrust Act of 1890 and the Hepburn Act of 1906 broke up combinations and capped railroad profitability.',
            },
            {
              value: 'same',
              note: 'The Panics of 1873, 1893 and 1907 were each driven by overleveraged rail stocks.',
            },
            {
              value: 'same',
              note: 'Transport peaked above sixty percent (~62% in 1880) and fell to about forty-two percent by 1910.',
            },
          ],
        },
        {
          label: 'Energy & Materials',
          cells: [
            {
              value: 'same',
              note: 'Integrated industrial corporations, automobiles, and the chemical industry created entirely new categories of demand.',
            },
            {
              value: 'same',
              note: 'The 1911 break-up of Standard Oil into thirty-four companies created an entire sector overnight.',
            },
            {
              value: 'part',
              note: 'Decline came through the 1973 and 1979 oil shocks and the 1981–1982 Volcker recession rather than a single classic market panic.',
            },
            {
              value: 'same',
              note: 'The sector peaked around thirty-eight percent in 1940 and fell to roughly fourteen percent combined by 1990.',
            },
          ],
        },
        {
          label: 'Information Technology',
          cells: [
            {
              value: 'same',
              note: 'High-margin software and hardware forced the market to learn new valuation metrics — growth rates, recurring revenue, revenue multiples.',
            },
            {
              value: 'none',
              note: 'The article names no antitrust break-up of the technology megacaps — this force has not yet appeared.',
            },
            {
              value: 'part',
              note: "The 2000–2002 dot-com bust collapsed technology's share to the high teens, but the sector recovered rather than being displaced.",
            },
            {
              value: 'none',
              note: 'At roughly forty-five percent and still rising, the decline has not happened — only the next chart can answer it.',
            },
          ],
        },
      ],
    },
    {
      type: 'scenario-chain',
      figureLabel: 'FIG. 4 · THE PATTERN, PROJECTED FORWARD',
      kicker:
        'THE ROTATION EXTENDED PAST 2025, PER THE ARTICLE’S OWN CLAIMS · DRIVER × DRIVER → OUTCOME · ONE KILL SWITCH.',
      hint: 'Only the next chart can settle which path holds.',
      source: "this article's closing framing · Datastream, Goldman Sachs Research (October 2025).",
      scenarios: [
        {
          id: 'base',
          label: 'ROTATION CONTINUES',
          tone: 'base',
          range: 'Tech is displaced',
          steps: [
            { label: 'The economy moves on', sub: 'as it did from banks, rails, and oil' },
            { label: 'A new enterprise form rises', sub: "the next chart's leading sector" },
          ],
          result: {
            value: 'A fifth regime takes the crown',
            sub: 'the pendulum swings again by ~2050',
          },
        },
        {
          id: 'alt',
          label: 'TECH RUNS FURTHER',
          tone: 'alt',
          range: 'Below prior peaks',
          steps: [
            { label: '45% is short of history', sub: 'finance hit 90%, transport 62%, energy 38%' },
            {
              label: 'AI compute concentrates further',
              sub: 'the largest capital deployment in tech history',
            },
          ],
          result: {
            value: 'Tech pushes toward old high-water marks',
            sub: 'the regime extends, not ends',
          },
        },
        {
          id: 'bear',
          label: 'NO SECTOR DOMINATES',
          tone: 'bear',
          range: 'Structural cap',
          steps: [
            {
              label: 'Market structure caps any one sector',
              sub: 'no single slice towers as before',
            },
            { label: 'Leadership fragments', sub: 'the >50% regimes of history do not return' },
          ],
          result: {
            value: 'The era of overwhelming regimes is over',
            sub: 'the chart flattens permanently',
          },
        },
      ],
      killSwitch:
        'ONLY THE NEXT CHART — DRAWN FIFTY OR ONE HUNDRED YEARS FROM NOW — CAN SETTLE WHETHER TECH HAD FURTHER TO RUN OR SIMPLY COULD NOT REACH THE OLD HEIGHTS.',
    },
  ],
  globeRail: {
    metric: {
      title: 'PEAK SHARE OF THE DOMINANT SECTOR (%)',
      data: [
        { x: 1800, y: 90 },
        { x: 1880, y: 62 },
        { x: 1940, y: 38 },
        { x: 2025, y: 45 },
      ],
      startLabel: 'Finance 1800 · ~90%',
      endLabel: 'Tech 2025 · ~45%',
      note: 'Finance peaked near 90% in 1800, transport at ~62% in 1880, energy and materials at ~38% in 1940. Technology’s ~45% today is real but below the high-water mark of every previous era.',
    },
    cities: [
      {
        name: 'New York',
        country: 'US',
        lat: 40.71,
        lng: -74.01,
        impact:
          'The finance era: the New York Stock Exchange’s Buttonwood predecessor traded a market dominated almost entirely by banks — Bank of New York, the First and Second Bank of the United States — roughly 90% finance in 1800.',
      },
      {
        name: 'Pittsburgh',
        country: 'US',
        lat: 40.44,
        lng: -79.99,
        impact:
          'The energy and materials era: US Steel, formed in 1901 as the largest corporation in American history at the time, anchored an industrial complex of steel makers that helped the sector peak near 38% around 1940.',
      },
      {
        name: 'San Francisco',
        country: 'US',
        lat: 37.77,
        lng: -122.42,
        impact:
          'The technology era: Microsoft, Apple, Nvidia, Alphabet, Meta and Amazon now account for more than a quarter of the S&P 500 by themselves, driving tech to roughly 45% of the market.',
      },
      {
        name: 'Washington',
        country: 'US',
        lat: 38.9,
        lng: -77.04,
        impact:
          'Regulation and antitrust recur as regime-enders: Jackson’s destruction of the Second Bank, the Sherman Antitrust Act of 1890, the Hepburn Act of 1906, and the Supreme Court’s 1911 dissolution of Standard Oil into 34 companies.',
      },
    ],
  },
  author: 'Ezana Finance Editorial',
  category: 'markets-companies',
  subcategory: 'Equities',
  tags: ['markets', 'history', 'sector-rotation', 'technology', 'energy', 'macro'],
  meta: {
    sectors: ['Information Technology', 'Financials', 'Energy'],
    // Sub-industries that led each dominance era discussed in the piece.
    industries: ['Banks', 'Automobile Manufacturers', 'Steel', 'Semiconductors'],
    // Named corporates-as-actors across the eras in the text.
    institutions: ['Bank of New York', 'Standard Oil', 'General Motors', 'DuPont', 'Nvidia'],
    geos: ['United States'],
    assetClasses: ['Equities'],
    themes: ['Market History', 'Sector Rotation'],
    datasets: [],
    markets: [],
  },
  tickers: ['SPY', 'XLK', 'XLE', 'XLF', 'XLI'],
  entities: {
    people: [
      {
        id: 'alexander-hamilton',
        label: 'Alexander Hamilton',
        role: 'First US Treasury Secretary and architect of national finance',
      },
      {
        id: 'andrew-jackson',
        label: 'Andrew Jackson',
        role: 'Seventh US President who dismantled the Second Bank of the United States',
      },
      {
        id: 'cornelius-vanderbilt',
        label: 'Cornelius Vanderbilt',
        role: 'Railroad and shipping magnate of the transport era',
      },
      {
        id: 'jay-gould',
        label: 'Jay Gould',
        role: 'Railroad financier and speculator of the Gilded Age',
      },
      {
        id: 'edward-harriman',
        label: 'Edward Harriman',
        role: 'Railroad executive who controlled Union Pacific',
      },
      {
        id: 'james-j-hill',
        label: 'James J. Hill',
        role: 'Railroad builder behind the Great Northern Railway',
      },
      {
        id: 'jp-morgan',
        label: 'J.P. Morgan',
        role: 'Banker and railroad financier of the late 19th century',
      },
    ],
    terms: [
      { id: 'buttonwood-agreement', label: 'Buttonwood Agreement' },
      { id: 'hamiltonian-finance', label: 'Hamiltonian Finance' },
      { id: 'antitrust', label: 'Antitrust' },
      { id: 'marshall-plan-capital-formation', label: 'Marshall Plan Capital Formation' },
      { id: 'coupon-clipping-era', label: 'Coupon-Clipping Era' },
      { id: 'sector-rotation', label: 'Sector Rotation' },
      { id: 'revenue-multiple-valuation', label: 'Revenue Multiple Valuation' },
      { id: 'speculative-mania', label: 'Speculative Mania' },
    ],
  },
  readTime: 18,
  publishedAt: '2026-04-30',
  featured: false,
  source: 'Datastream, Goldman Sachs Research (October 2025)',
};
