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
  contentBlocks: [
    {
      type: 'paragraph',
      text: "The composition of the US stock market has never been static. Across 225 years of equity history, four sectors have taken turns as the single largest slice of the market: finance and real estate in the early republic, transport during the railroad century, energy and materials through the industrial era, and information technology in the digital age. The chart below shows the share of the largest sector at every point in time. Each color marks a regime — a stretch of decades when one industry's share towered over everything else. Hover over any point on the timeline to see what was driving that era's dominance.",
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

    /* ─── ERA 1: FINANCE & REAL ESTATE (≈750 words) ─── */
    { type: 'heading', text: '1800–1850: Finance & Real Estate Era', level: 2 },
    {
      type: 'paragraph',
      text: "When the first US stock exchanges began trading in earnest, banks were not just listed alongside other businesses — they were nearly the only businesses listed. In the decades following the founding of the Buttonwood Agreement in 1792, the New York Stock Exchange's predecessor traded a market dominated almost entirely by financial institutions. Bank of New York, the First and Second Bank of the United States, and a small constellation of state-chartered banks accounted for the overwhelming majority of equity capitalization. At its peak in the early 1800s, finance and real estate represented roughly ninety percent of the US stock market — a concentration that no single sector has approached since.",
    },
    {
      type: 'paragraph',
      text: "The reason was structural. The early American economy was overwhelmingly agricultural, and most commercial enterprise was conducted through partnerships and proprietorships rather than publicly traded corporations. Manufacturing was small, local, and family-owned. Transportation infrastructure was limited to what private investors and local governments could finance through bonds and turnpike companies. The stocks that DID trade publicly were almost exclusively bank stocks, marine insurance companies, and a handful of land-development corporations. The market was, in effect, a financial sector ETF — there was nothing else to buy.",
    },
    {
      type: 'paragraph',
      text: "This concentration also reflected the economic theory of the early republic. Alexander Hamilton's vision of national finance — a central bank, federal debt assumption, and a domestic banking system — was the constitutional foundation on which American capital markets were built. The First Bank of the United States, chartered in 1791, was both a public institution and a publicly traded one, and its shares were among the most actively traded securities in the country. When its charter expired in 1811 and the Second Bank took its place in 1816, the pattern repeated. State-chartered banks proliferated in their wake, each issuing tradable shares that found their way onto the rosters of the regional exchanges that emerged in Philadelphia, Boston, and New York.",
    },
    {
      type: 'paragraph',
      text: "Real estate played a smaller but meaningful role. Land companies that pooled investor capital to acquire and subdivide western territories — particularly along the routes of planned canals and turnpikes — issued shares that traded actively. Some of these enterprises generated extraordinary returns; others collapsed in spectacular fraud. The line between legitimate land speculation and outright swindling was blurry, and the period produced some of the earliest American securities scandals.",
    },
    {
      type: 'paragraph',
      text: "The era's dominance began to erode for two reasons. The first was technological: the rise of canal corporations in the 1820s and 1830s introduced large publicly traded enterprises that were not banks. The Erie Canal Company, chartered in 1817, demonstrated that infrastructure-scale capital could be raised from public investors. The second was political: Andrew Jackson's destruction of the Second Bank of the United States in 1836, followed by the wildcat banking era and the panic of 1837, fundamentally reshaped the relationship between government and finance. Bank stocks remained important, but they no longer commanded the field.",
    },
    {
      type: 'paragraph',
      text: "By 1850, finance and real estate had fallen from ninety percent to roughly fifty percent of the market — still the largest sector, but only barely. Within a single generation, the next era was already emerging on the horizon, and it would arrive on iron rails.",
    },

    /* ─── ERA 2: TRANSPORT (≈750 words) ─── */
    { type: 'heading', text: '1850–1910: Transport Era', level: 2 },
    {
      type: 'paragraph',
      text: "The transport century is the most concentrated and most singular regime in American stock market history. Beginning in earnest in the 1840s and accelerating through Reconstruction, railroad companies became the largest, most numerous, and most actively traded equities on the exchanges. By 1880, transport stocks accounted for more than sixty percent of the entire US stock market. New York Central, Pennsylvania Railroad, Erie, Baltimore and Ohio, Union Pacific, and dozens of regional lines collectively represented an unprecedented concentration of capital — and of risk.",
    },
    {
      type: 'paragraph',
      text: "What made railroads different from the banks and canals that preceded them was scale. The capital required to build a transcontinental rail line dwarfed anything previously raised in American [[kw:market-indices]]markets[[/kw]]. The Union Pacific and Central Pacific, racing to meet at Promontory Summit in 1869, together consumed more than $100 million in public and private capital — a sum that would have been unimaginable two decades earlier. The federal government provided massive land grants and bond guarantees, but the operating capital came from public stock and bond issuance. The exchanges existed, in many ways, to serve the railroads.",
    },
    {
      type: 'paragraph',
      text: "This created a market that was both extraordinarily large and extraordinarily volatile. The financial history of the late nineteenth century is, in significant measure, the financial history of railroad booms and busts. The Panic of 1873 began with the failure of Jay Cooke and Company, a banking house overexposed to Northern Pacific Railroad bonds. The Panic of 1893 was triggered by the bankruptcy of the Philadelphia and Reading Railroad, which cascaded through the financial system and produced one of the deepest depressions in American history. The Panic of 1907 had multiple causes, but the collapse of overleveraged rail and trust company stocks was central to it.",
    },
    {
      type: 'paragraph',
      text: "Beyond the railroads themselves, an entire ecosystem of transport-related equities filled out the sector. Steamship companies, telegraph operators (which laid lines along rail rights-of-way and were initially considered transport-adjacent), refrigerated railcar manufacturers, sleeping-car companies like Pullman, and bridge builders all traded actively. Cornelius Vanderbilt, Jay Gould, Edward Harriman, James J. Hill, and J.P. Morgan are remembered today not as merchants or financiers but as railroad operators — because that's where the largest fortunes of the era were made.",
    },
    {
      type: 'paragraph',
      text: "The era's economic logic was straightforward: a continental nation needed transportation infrastructure on a scale no previous economy had ever built, and public equity markets were the only mechanism capable of financing it. By 1900, the United States had over 200,000 miles of operating railroad track — roughly half of all railroad mileage in the world. Every mile required capital, and most of that capital came from publicly traded shares.",
    },
    {
      type: 'paragraph',
      text: "Decline was gradual but unmistakable. The [[kw:antitrust]]Sherman Antitrust Act of 1890[[/kw]] and subsequent rulings broke up the largest combinations. The rise of the automobile after 1900 began to siphon investment toward a new transportation paradigm. The Hepburn Act of 1906 imposed federal rate regulation that capped railroad profitability. By 1910, transport had fallen to about forty-two percent of the market — still the largest sector, but no longer dominant. Standard Oil, US Steel, and a new generation of industrial giants were rising fast. The next regime had already begun.",
    },

    /* ─── ERA 3: ENERGY & MATERIALS (≈750 words) ─── */
    { type: 'heading', text: '1910–1990: Energy & Materials Era', level: 2 },
    {
      type: 'paragraph',
      text: "If the railroads built nineteenth-century America, oil and steel built the twentieth. From roughly 1910 through the late 1980s, energy and materials companies — Standard Oil and its descendants, US Steel, the chemical giants, the industrial conglomerates of the post-war era — collectively held the largest share of the US stock market. The peak came around 1940, when the sector accounted for roughly thirty-eight percent of total market capitalization, but the era's dominance lasted nearly eighty years and produced more than a quarter of the entire history of US equities.",
    },
    {
      type: 'paragraph',
      text: "The transition from transport to energy and materials happened in stages. The first stage was the rise of integrated industrial corporations — Standard Oil, founded in 1870 and broken up by the Supreme Court in 1911, was so large that its dissolution into thirty-four separate companies created an entire sector overnight. Exxon, Chevron, Mobil, Amoco, Atlantic Richfield, and Marathon all trace their lineage to that single 1911 ruling. US Steel, formed in 1901 as the largest corporation in American history at the time of its incorporation, similarly anchored an industrial complex that included Bethlehem, Inland, and dozens of regional steel makers.",
    },
    {
      type: 'paragraph',
      text: "The second stage was the automobile. General Motors, Ford, and Chrysler did not merely create new companies — they created entirely new categories of demand for materials. Steel, aluminum, copper, glass, and rubber all expanded dramatically as auto production scaled from thousands of vehicles per year in 1900 to millions per year by 1929. The chemical industry, led by DuPont, expanded in parallel to supply materials, paint, and synthetic compounds. Each of these industries traded as publicly listed equities, and together they pushed energy and materials past transport in market share by the early 1920s.",
    },
    {
      type: 'paragraph',
      text: "The third stage was the post-war boom. Between 1945 and 1970, American manufacturing operated nearly without international competition. European and Japanese industrial bases had been destroyed during the war and would take decades to rebuild. American oil majors developed reserves across the Middle East, North Africa, and Latin America. American steel producers supplied the Marshall Plan rebuilding of Europe, the Korean War mobilization, the interstate highway construction, and the suburban housing boom. Profits were enormous, [[kw:dividends]]dividends[[/kw]] were generous, and energy and materials stocks were considered the bedrock of any institutional portfolio.",
    },
    {
      type: 'paragraph',
      text: "The peak was perhaps the 1950s and early 1960s — a period sometimes called the golden age of industrial capitalism. The Dow Jones Industrial Average was, almost literally, an index of industrial companies: General Motors, US Steel, Standard Oil of New Jersey, Bethlehem Steel, DuPont, Goodyear, and similar firms made up most of its membership. The fortunes of these companies were the fortunes of the American economy.",
    },
    {
      type: 'paragraph',
      text: "Decline began in the 1970s. The 1973 oil shock, while temporarily inflating energy share prices, also exposed the vulnerability of energy-intensive industries. Foreign competition — particularly Japanese steel and German chemicals — eroded American manufacturers' margins. Environmental regulation raised costs. The 1979 second oil shock and the Volcker recession of 1981-1982 hit the sector especially hard. By 1990, energy and materials had fallen to roughly fourteen percent of the market combined. A new sector was about to take the crown, and it would do so in a way that would have been incomprehensible to a 1960s portfolio manager.",
    },

    /* ─── ERA 4: INFORMATION TECHNOLOGY & COMMUNICATIONS (≈750 words) ─── */
    { type: 'heading', text: '1990–Present: Information Technology & Communications Era', level: 2 },
    {
      type: 'paragraph',
      text: "The current era is the shortest of the four — barely thirty-five years old as of 2025 — but it has already produced the highest single-stock concentrations in American market history. Information technology and communications companies, taken together, now represent roughly forty-five percent of the US stock market. Microsoft, Apple, Nvidia, Alphabet, Meta, and Amazon collectively account for more than a quarter of the S&P 500 by themselves. The largest companies in the largest economy in the world are technology companies, and the gap between them and everything else continues to widen.",
    },
    {
      type: 'paragraph',
      text: "The era can be subdivided into roughly four phases. The first was the personal computer phase, beginning in the early 1980s and accelerating through the 1990s. IBM, Microsoft, Intel, and a wave of hardware and software companies created a new category of equity that did not fit the industrial framework of the previous era. These companies had high gross margins, low capital requirements, and the ability to grow revenues at rates that would have been unthinkable for a steel manufacturer or an oil major. The market gradually learned to value them differently — using metrics like growth rates, recurring revenue, and software [[kw:pe-ratio]]multiples[[/kw]] that had no clear precedent.",
    },
    {
      type: 'paragraph',
      text: "The second phase was the internet boom of the late 1990s. The dot-com bubble produced extraordinary excess — Pets.com, Webvan, eToys, and hundreds of similarly capitalized companies that lost billions before failing — but it also produced enduring infrastructure. Cisco, Oracle, and EMC built the plumbing of the early internet. Amazon, eBay, and Yahoo demonstrated that purely digital businesses could reach mass scale. When the [[kw:growth-vs-value]]bubble[[/kw]] burst in 2000-2002, technology's share of the market temporarily collapsed from over thirty percent back down to the high teens, and many investors concluded that the era was already over.",
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
      text: "What's striking about the current era, viewed in long historical context, is that technology's dominance — at roughly forty-five percent of the [[kw:market-capitalization]]market[[/kw]] — is real but not as overwhelming as the regimes that came before. Finance hit ninety percent in 1800. Transport hit sixty-two percent in 1880. Energy and materials peaked at thirty-eight percent in 1940. Today's technology concentration, while significant, is below the high-water marks of every previous era. The sectors of yore were more dominant. Whether that means technology has further to run, or whether market structure simply prevents any single sector from reaching the heights it once could, is a question only the next chart — drawn fifty or one hundred years from now — will be able to answer.",
    },

    /* ─── CLOSING ─── */
    { type: 'heading', text: 'What The Pattern Reveals', level: 2 },
    {
      type: 'paragraph',
      text: "Two hundred and twenty-five years of US equity history compressed into a single image makes one fact unmissable: [[kw:sector-rotation]]market leadership rotates[[/kw]]. Each era's dominant sector was, in its time, considered the unassailable bedrock of any serious portfolio. Banks in 1820. Railroads in 1870. Standard Oil and US Steel in 1920. The conglomerates of the Nifty Fifty in 1965. Each was eventually displaced — not because investors stopped believing in them, but because the underlying economy moved on to something else. The current technology regime will, in its turn, share that fate. The question for today's investor is not whether the rotation will happen, but what comes next — and what 2050's version of this chart will look like when it is finally drawn.",
    },
  ],
  author: 'Ezana Finance Editorial',
  category: 'markets',
  tickers: ['SPY', 'XLK', 'XLE', 'XLF', 'XLI'],
  readTime: 18,
  publishedAt: '2026-04-30',
  source: 'Datastream, Goldman Sachs Research (October 2025)',
};
