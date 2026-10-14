// src/lib/ezana-echo-article-ai-stack-upside-down-2026.js
// Ezana Echo article: the circulating five-layer "AI Stack" slide (~$1T, ~$5T,
// ~$10T, ~$10T, ~$2T) re-weighed against public market caps and last primary
// private rounds as of 12 to 13 October 2026. Every figure's numbers come from
// the article's own text; no chart colour is hardcoded (figures read the
// --echo-chart-* tokens). Findings only, not advice.
//
// Companion illustration: public/echo/ai-stack-illustration.svg (the chart
// supplied with the piece; the PNG beside it is the hero and social card).
export const aiStackUpsideDown2026 = {
  id: 'the-ai-stack-is-upside-down-what-market-caps-say',
  title: 'The AI Stack Is Upside Down: What the Market Caps Actually Say',
  excerpt:
    'A popular slide pegs the AI stack at roughly $28 trillion across five layers. We re-weighed every layer against live market caps and last-round private marks. The bottom two layers are worth more than the slide says. The top three are worth a lot less.',
  heroImage: {
    src: '/echo/ai-stack-illustration.png',
    alt: 'Editorial chart: the AI stack re-weighed. Five horizontal bars, one per layer, show verified market value against the dashed outline of the figure on the circulating AI Stack slide. Silicon and hyperscale cloud are far larger than the slide says; models, applications and power are far smaller.',
    caption:
      'Ezana graphic. Market value by layer, verified against public market caps and last primary private rounds, 13 October 2026. Dashed outlines are the figures on the circulating slide.',
  },
  contentBlocks: [
    {
      type: 'paragraph',
      text: 'A slide has been making the rounds in pitch decks and investor newsletters this fall. It draws the AI industry as a five-layer pyramid, Application, LLMs, "Cloud," Chips, Power, and attaches a rough dollar figure to each: ~$1T, ~$5T, ~$10T, ~$10T, ~$2T. Read top to bottom, it tells a comfortable story: value is spread across the stack, every layer is a multi-trillion-dollar opportunity, and the picks-and-shovels trade and the application trade are both alive.',
    },
    {
      type: 'paragraph',
      text: "We checked. Three of the five numbers don't survive contact with a quote screen.",
    },
    {
      type: 'paragraph',
      text: 'This is a findings piece, not advice. We are re-weighing a diagram, not recommending a position.',
    },
    {
      type: 'revision-ledger',
      figureLabel: 'FIG. 1 · THE SLIDE VS THE QUOTE SCREEN',
      kicker:
        'EACH LAYER OF THE AI STACK, $ TRILLION · THE FIGURE ON THE CIRCULATING SLIDE VS THE VALUE VERIFIED AGAINST MARKET CAPS AND LAST PRIMARY ROUNDS · CLICK A ROW FOR WHAT WAS COUNTED',
      hint: 'Cloud and silicon are whole-company market caps, not AI revenue.',
      source:
        'Public market caps from companiesmarketcap, stockanalysis and Yahoo Finance as of 12 to 13 October 2026; private marks from company announcements as reported by CNBC, TechCrunch and Tracxn. Ezana arithmetic.',
      scale: 'linear',
      unit: '$T',
      rows: [
        {
          label: 'Silicon',
          sub: 'Nvidia, TSMC, Broadcom, Micron, AMD and peers',
          before: 10,
          after: 12.5,
          beforeDisplay: '~$10T',
          afterDisplay: '~$12.5T',
          delta: 2.5,
          deltaDisplay: '+$2.5T',
          favorable: 'up',
          record:
            'Nvidia about $5.5 trillion, TSMC roughly $2.3 trillion, Broadcom near $1.7 trillion, Micron around $1.2 trillion, AMD just above $1 trillion; ASML, SK Hynix, Samsung semiconductors, Marvell and Intel take the layer past $12 trillion.',
        },
        {
          label: 'Hyperscale cloud',
          sub: 'Alphabet, Microsoft, Amazon, Oracle',
          before: 10,
          after: 11.5,
          beforeDisplay: '~$10T',
          afterDisplay: '~$11.5T',
          delta: 1.5,
          deltaDisplay: '+$1.5T',
          favorable: 'up',
          record:
            'Alphabet $4.27 trillion, Microsoft $4.0 trillion, Amazon $2.83 trillion and Oracle $0.43 trillion total about $11.5 trillion. Counting Meta at $1.85 trillion as a hyperscaler takes it near $13.4 trillion.',
        },
        {
          label: 'Frontier models',
          sub: 'Anthropic, OpenAI, xAI and the tail',
          before: 5,
          after: 2.2,
          beforeDisplay: '~$5T',
          afterDisplay: '~$2.2T',
          delta: -2.8,
          deltaDisplay: '-$2.8T',
          favorable: 'down',
          record:
            'Last primary marks: Anthropic $965 billion (Series H, May 2026), OpenAI $852 billion (March 2026), xAI roughly $250 billion before it folded into SpaceX, and perhaps $150 billion across DeepSeek, Mistral, Thinking Machines and Safe Superintelligence.',
        },
        {
          label: 'Application layer',
          sub: 'Cursor, Cognition, Perplexity, Harvey and peers',
          before: 1,
          after: 0.4,
          beforeDisplay: '~$1T',
          afterDisplay: '~$0.3 to 0.5T',
          delta: -0.6,
          deltaDisplay: '-$0.6T',
          favorable: 'down',
          record:
            'Every application-layer name with a public mark, Cursor $60 billion through Lovable, reaches $300 to 400 billion; a generous unlisted tail might touch $500 billion. A trillion requires counting Palantir, Salesforce and ServiceNow as AI applications.',
        },
        {
          label: 'Power (named IPPs)',
          sub: 'Constellation, Vistra, PSEG, Talen',
          before: 2,
          after: 0.2,
          beforeDisplay: '~$2T',
          afterDisplay: '~$0.2T',
          delta: -1.8,
          deltaDisplay: '-$1.8T',
          favorable: 'down',
          record:
            'The four logos on the slide are worth about $200 billion combined: Constellation roughly $95 to 105 billion, Vistra $54 billion, PSEG around $40 billion, Talen $15 billion. The $2 trillion holds only for the whole US utility and independent-power sector.',
        },
      ],
    },

    { type: 'heading', text: 'How we re-weighed it', level: 2 },
    {
      type: 'paragraph',
      text: 'Public companies get their market cap as of October 12 to 13, 2026, from companiesmarketcap, stockanalysis and Yahoo Finance. Private companies get their last primary round, the post-money valuation at which new shares were actually sold, not a secondary print or a reported IPO target. Where a company plausibly sits in two layers (Alphabet is a cloud, a model lab and a chip designer), we assign it once, to the layer where most of its enterprise value lives, and say so.',
    },
    {
      type: 'paragraph',
      text: 'That method is conservative on purpose. Anyone can inflate a layer by counting Microsoft three times.',
    },
    {
      type: 'image',
      src: '/echo/ai-stack-illustration.svg',
      alt: 'The AI stack, re-weighed: five horizontal bars, one per layer, showing verified market value in emerald against the dashed outline of the figure on the circulating AI Stack slide. Silicon about $12.5 trillion against a $10 trillion slide figure; hyperscale cloud about $11.5 trillion against $10 trillion; frontier models about $2.2 trillion against $5 trillion; the application layer about $0.4 trillion against $1 trillion; named power producers about $0.2 trillion against $2 trillion.',
      caption:
        'Verified market value by layer vs. the figure on the circulating "AI Stack" slide. October 13, 2026.',
      plate: true,
    },

    { type: 'heading', text: 'Silicon: ~$12.5 trillion, not ~$10T', level: 2 },
    {
      type: 'paragraph',
      text: "The bottom of the pyramid is heavier than the slide admits. Nvidia alone is about $5.5 trillion, having flirted with $6 trillion the week of October 6 after announcing the largest buyback in corporate history. TSMC is roughly $2.3 trillion ahead of its October 15 earnings. Broadcom sits near $1.7 trillion, Micron around $1.2 trillion and AMD just above $1 trillion. Add ASML, SK Hynix, Samsung's semiconductor business, Marvell and Intel and the layer clears $12 trillion comfortably.",
    },
    {
      type: 'market-treemap',
      figureLabel: 'FIG. 2 · THE TWO BLOCKS AT THE BOTTOM',
      kicker:
        'SILICON AND HYPERSCALE CLOUD BY MARKET CAP, $ TRILLION · LEAF AREA IS MARKET CAP · FILL IS YEAR-TO-DATE DIRECTION WHERE THE TEXT GIVES ONE (ORACLE, DOWN ABOUT 30%); THE REST ARE LEFT NEUTRAL',
      hint: 'Area only for most leaves: the piece reports caps, not returns.',
      source:
        'companiesmarketcap, stockanalysis and Yahoo Finance, 12 to 13 October 2026. Oracle year-to-date move per the text.',
      groups: [
        {
          label: 'Silicon',
          leaves: [
            { label: 'Nvidia', size: 5.5, perf: 0 },
            { label: 'TSMC', size: 2.3, perf: 0 },
            { label: 'Broadcom', size: 1.7, perf: 0 },
            { label: 'Micron', size: 1.2, perf: 0 },
            { label: 'AMD', size: 1.0, perf: 0 },
          ],
        },
        {
          label: 'Hyperscale cloud',
          leaves: [
            { label: 'Alphabet', size: 4.27, perf: 0 },
            { label: 'Microsoft', size: 4.0, perf: 0 },
            { label: 'Amazon', size: 2.83, perf: 0 },
            { label: 'Meta', size: 1.85, perf: 0 },
            { label: 'Oracle', size: 0.43, perf: -10 },
          ],
        },
      ],
    },
    {
      type: 'paragraph',
      text: 'One caveat the slide skips: these are whole-company caps. TSMC fabs iPhone chips; Micron sells consumer DRAM. But for the three largest names, the market is pricing AI data-center demand as the dominant driver, and that is the number investors are actually trading.',
    },

    {
      type: 'heading',
      text: 'Hyperscale cloud: ~$11.5 trillion, but "cloud" is doing a lot of work',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'Alphabet ($4.27T), Microsoft ($4.0T), Amazon ($2.83T) and Oracle ($0.43T) total about $11.5 trillion. Count Meta ($1.85T) as a hyperscaler, it builds data centers at the same scale, and you are near $13.4 trillion.',
    },
    {
      type: 'paragraph',
      text: "So the slide's ~$10T is defensible. The label is not. Most of Alphabet's value is search advertising. Most of Amazon's is retail and logistics. Azure crossed $100 billion in annual revenue this year, which is enormous, but Microsoft is a $280 billion-revenue company. Calling this layer \"cloud\" quietly attributes trillions of ad, retail and Office revenue to AI infrastructure. Oracle, the purest AI-infrastructure bet of the four, is the smallest and is down roughly 30% year to date on exactly that concentration.",
    },

    { type: 'heading', text: 'Frontier models: ~$2.2 trillion, not ~$5T', level: 2 },
    {
      type: 'paragraph',
      text: 'This is where the slide starts to drift. On last primary marks: Anthropic $965 billion (Series H, May 2026), OpenAI $852 billion (March 2026), xAI roughly $250 billion before it folded into SpaceX, and a long tail, DeepSeek, Mistral, Thinking Machines, Safe Superintelligence, that together adds perhaps $150 billion. Call it $2.2 trillion.',
    },
    {
      type: 'dossier-table',
      figureLabel: 'FIG. 3 · PRINTS VS INTENTIONS',
      kicker:
        'FRONTIER LABS · THE LAST PRIMARY ROUND AGAINST THE LISTING OR TALKS REPORTED SINCE · CLICK DOSSIER + FOR THE RECORD',
      hint: 'Only the primary round is a price; the rest are reports of intent.',
      source:
        'Company announcements as reported by CNBC, TechCrunch and Tracxn; listing and talks figures as reported in October 2026.',
      headers: ['Lab', 'Last primary round', 'Reported since', 'What it would mean', ''],
      rows: [
        {
          name: 'Anthropic',
          tag: 'Series H, May 2026',
          role: '$965 billion post-money',
          anchor: 'Reported to be targeting an October Nasdaq listing at up to $2 trillion',
          keyRisk: 'The gap between the primary and the listing is itself a $1 trillion opinion',
          dossier: [
            { label: 'Primary', text: '$965 billion, Series H, May 2026.' },
            { label: 'Reported', text: 'October Nasdaq listing targeted at up to $2 trillion.' },
            {
              label: 'Status',
              text: 'An intention, not a print. Counted at the primary mark here.',
            },
          ],
        },
        {
          name: 'OpenAI',
          tag: 'March 2026',
          role: '$852 billion post-money',
          anchor: 'Reported to be in talks around $1.4 trillion',
          keyRisk: 'Talks are not a round',
          dossier: [
            { label: 'Primary', text: '$852 billion, March 2026.' },
            { label: 'Reported', text: 'Talks around $1.4 trillion.' },
            { label: 'Status', text: 'Counted at the primary mark here.' },
          ],
        },
        {
          name: 'xAI',
          tag: 'Before the SpaceX fold',
          role: 'Roughly $250 billion',
          anchor: 'Now inside SpaceX',
          keyRisk: 'Its value lives in another company',
          dossier: [
            { label: 'Primary', text: 'Roughly $250 billion before it folded into SpaceX.' },
            { label: 'Status', text: 'Counted once, at the pre-fold mark.' },
          ],
        },
        {
          name: 'The long tail',
          tag: 'DeepSeek, Mistral, Thinking Machines, SSI',
          role: 'Perhaps $150 billion together',
          anchor: 'No single mark above the labs',
          keyRisk: 'Google DeepMind and Meta FAIR are real but already counted in the cloud layer',
          dossier: [
            {
              label: 'Together',
              text: 'DeepSeek, Mistral, Thinking Machines and Safe Superintelligence add perhaps $150 billion.',
            },
            {
              label: 'Not counted',
              text: 'Google DeepMind and the Meta labs: their value is inside the cloud layer; counting them here would double-count.',
            },
          ],
        },
      ],
    },
    {
      type: 'paragraph',
      text: "You can get to $5 trillion, but only by counting things that have not happened or that already live in another layer. Anthropic is reported to be targeting an October Nasdaq listing at up to $2 trillion; OpenAI is reported to be in talks around $1.4 trillion. Those are intentions, not prints. Google DeepMind and Meta's model labs are real frontier efforts, but their value is already inside the cloud layer above. Count them again here and the pyramid double-counts.",
    },
    {
      type: 'paragraph',
      text: 'The honest read: the model layer is worth less than half the chip layer, and the gap between the top two labs and everyone else is wider than the gap between the labs and the hyperscalers.',
    },

    { type: 'heading', text: 'Application layer: ~$0.3 to 0.5 trillion, not ~$1T', level: 2 },
    {
      type: 'paragraph',
      text: "The slide's headline example is Harvey, which raised $550 million at $15.5 billion in September on revenue that crossed $400 million in ARR. It is the best-known vertical AI company in the world, and it is 0.3% of Nvidia.",
    },
    {
      type: 'paragraph',
      text: 'Stack up every application-layer name with a public mark, Cursor ($60B, acquired by SpaceX in June), Cognition ($48B), Perplexity (~$30B), Scale AI (~$29B), Sierra ($15.8B), Harvey ($15.5B), ElevenLabs ($11B), Legora ($5.6B), Glean, Decagon, OpenEvidence, Lovable, and you reach $300 to 400 billion. Be generous with the unlisted tail and you might touch $500 billion. A trillion requires counting Palantir, Salesforce and ServiceNow as "AI applications," which stretches the word past usefulness.',
    },
    {
      type: 'multi-axis',
      figureLabel: 'FIG. 4 · THE APPLICATION LAYER, NAME BY NAME',
      kicker:
        'APPLICATION-LAYER COMPANIES WITH A PUBLIC MARK, $ BILLION · LAST PRIMARY ROUND OR ACQUISITION PRICE · THE EIGHT NAMED WITH A FIGURE IN THE TEXT',
      hint: 'Together these eight are about $215 billion; the layer as a whole is $300 to 400 billion.',
      source: 'Company announcements as reported by CNBC, TechCrunch and Tracxn, October 2026.',
      categories: [
        'Cursor',
        'Cognition',
        'Perplexity',
        'Scale AI',
        'Sierra',
        'Harvey',
        'ElevenLabs',
        'Legora',
      ],
      series: [
        {
          label: 'Valuation',
          kind: 'bar',
          unit: '$B',
          values: [60, 48, 30, 29, 15.8, 15.5, 11, 5.6],
        },
      ],
    },
    {
      type: 'paragraph',
      text: 'That is not a knock on the layer. Cursor went from $1 million to $2 billion in ARR in about three years, the fastest B2B ramp on record. ElevenLabs reportedly passed $500 million ARR. The application layer is where revenue multiples are most defensible; Harvey at roughly 40x ARR looks cheap next to some labs. It is simply much smaller than the slide implies, and most of it is private.',
    },

    { type: 'heading', text: 'Power: ~$0.2 trillion for the companies on the slide', level: 2 },
    {
      type: 'paragraph',
      text: 'The slide lists four logos, Constellation, Vistra, PSEG, Talen, next to "~$2T mkt cap." Those four companies are worth about $200 billion combined: Constellation roughly $95 to 105 billion, Vistra $54 billion, PSEG around $40 billion, Talen $15 billion. All four are off their 2025 highs; Vistra is down about 17% over the past year as PJM regulatory friction and battery-storage setbacks eroded the "AI premium."',
    },
    {
      type: 'multi-axis',
      figureLabel: 'FIG. 5 · FOUR LOGOS, $200 BILLION',
      kicker:
        'THE INDEPENDENT POWER PRODUCERS NAMED ON THE SLIDE, MARKET CAP $ BILLION · CONSTELLATION AT THE MIDPOINT OF ITS $95 TO 105 BILLION RANGE',
      hint: "The slide's $2 trillion is the whole US utility and independent-power sector.",
      source: 'companiesmarketcap, stockanalysis and Yahoo Finance, 12 to 13 October 2026.',
      categories: ['Constellation', 'Vistra', 'PSEG', 'Talen'],
      series: [
        {
          label: 'Market cap',
          kind: 'bar',
          unit: '$B',
          values: [100, 54, 40, 15],
        },
      ],
    },
    {
      type: 'paragraph',
      text: 'The $2 trillion figure only holds if you mean the entire US utility and independent-power sector, most of which has nothing to do with data centers. The AI-power trade, as the market actually prices it, is a $200 billion trade.',
    },

    { type: 'heading', text: 'The shape that emerges', level: 2 },
    {
      type: 'paragraph',
      text: 'Lay the verified numbers out and the pyramid flips. The slide shows a stack that narrows gracefully toward the top. The market shows two enormous blocks at the bottom, silicon and hyperscale cloud, roughly $24 trillion together, and then a cliff. Models are a tenth of that. Applications are a fiftieth. The power layer the slide draws as a $2 trillion foundation is, for the named companies, smaller than the application layer.',
    },
    {
      type: 'radial-stack',
      figureLabel: 'FIG. 6 · THE PYRAMID, FLIPPED',
      kicker:
        "VERIFIED VALUE BY LAYER, $ TRILLION · EACH BAR SWEEPS WITH ITS LAYER'S TOTAL · SEGMENTS ARE THE NAMED COMPANIES WITH A FIGURE IN THE TEXT, PLUS THE REMAINDER",
      hint: 'Silicon and cloud together are about $24 trillion; models, applications and power about $2.8 trillion.',
      source:
        'Public market caps from companiesmarketcap, stockanalysis and Yahoo Finance as of 12 to 13 October 2026; private marks as reported by CNBC, TechCrunch and Tracxn. Ezana arithmetic.',
      maxAngle: 270,
      categories: [
        {
          label: 'Silicon',
          segments: [
            { label: 'Nvidia', value: 5.5 },
            { label: 'TSMC', value: 2.3 },
            { label: 'Broadcom', value: 1.7 },
            { label: 'Micron', value: 1.2 },
            { label: 'AMD and others', value: 1.8 },
          ],
        },
        {
          label: 'Hyperscale cloud',
          segments: [
            { label: 'Alphabet', value: 4.27 },
            { label: 'Microsoft', value: 4.0 },
            { label: 'Amazon', value: 2.83 },
            { label: 'Oracle', value: 0.43 },
          ],
        },
        {
          label: 'Frontier models',
          segments: [
            { label: 'Anthropic', value: 0.965 },
            { label: 'OpenAI', value: 0.852 },
            { label: 'xAI', value: 0.25 },
            { label: 'Long tail', value: 0.15 },
          ],
        },
        {
          label: 'Application layer',
          segments: [
            { label: 'Cursor', value: 0.06 },
            { label: 'Cognition', value: 0.048 },
            { label: 'Perplexity', value: 0.03 },
            { label: 'Scale AI', value: 0.029 },
            { label: 'Others named', value: 0.233 },
          ],
        },
        {
          label: 'Power (named IPPs)',
          segments: [
            { label: 'Constellation', value: 0.1 },
            { label: 'Vistra', value: 0.054 },
            { label: 'PSEG', value: 0.04 },
            { label: 'Talen', value: 0.015 },
          ],
        },
      ],
    },
    {
      type: 'paragraph',
      text: 'Three observations follow, none of them a trade.',
    },
    {
      type: 'paragraph',
      text: "Value is pooling where capital intensity is highest. The two layers that require tens of billions in annual capex are worth ten times the three layers that don't. That is the opposite of what software investors spent twenty years learning.",
    },
    {
      type: 'paragraph',
      text: 'Private marks are doing the heavy lifting at the top. Nearly every dollar in the model and application layers is a VC post-money, not a public price. The first real test comes if Anthropic prices its listing this month; the gap between a $965 billion primary and a $2 trillion IPO is itself a $1 trillion opinion.',
    },
    {
      type: 'paragraph',
      text: '"Cloud" is the most mislabeled box on the slide. It is the only layer where the verified number is roughly right and the interpretation is roughly wrong. Investors who buy hyperscalers as an AI-infrastructure play are mostly buying advertising and e-commerce with an AI option attached.',
    },
    {
      type: 'paragraph',
      text: "The slide is not dishonest. It is a sketch, and sketches round. But rounding $0.4 trillion up to $1 trillion and $2.2 trillion up to $5 trillion is not rounding; it is a thesis. The thesis is that value will flow up the stack. The quote screen, for now, says it hasn't.",
    },
    {
      type: 'callout',
      variant: 'disclaimer',
      text: 'Figures as of October 12 to 13, 2026. Public market caps from companiesmarketcap, stockanalysis and Yahoo Finance; private valuations from company announcements as reported by CNBC, TechCrunch and Tracxn. Ezana Finance publishes findings, not investment advice. Nothing here is a recommendation to buy or sell any security.',
    },
  ],
  author: 'Ezana Finance Editorial',
  category: 'tech-founders',
  subcategory: 'AI',
  meta: {
    sectors: [
      'Information Technology',
      'Communication Services',
      'Consumer Discretionary',
      'Utilities',
    ],
    industries: [
      'Semiconductors',
      'Semiconductor Materials & Equipment',
      'Interactive Media & Services',
      'Systems Software',
      'Application Software',
      'Internet & Direct Marketing Retail',
      'Independent Power Producers & Energy Traders',
    ],
    investors: [],
    institutions: [
      'Nvidia',
      'TSMC',
      'Broadcom',
      'Micron',
      'AMD',
      'Alphabet',
      'Microsoft',
      'Amazon',
      'Oracle',
      'Meta',
      'Anthropic',
      'OpenAI',
      'xAI',
      'SpaceX',
      'Harvey',
      'Cursor',
      'Cognition',
      'Perplexity',
      'Constellation Energy',
      'Vistra',
      'PSEG',
      'Talen Energy',
    ],
    government: ['PJM Interconnection'],
    geos: ['United States', 'Taiwan', 'China', 'France'],
    assetClasses: ['Equities', 'Private Markets'],
    themes: ['AI Infrastructure', 'Valuation', 'Private Marks', 'Capital Intensity'],
    datasets: ['Institutional holdings', 'Insider trading'],
    markets: [],
  },
  tickers: [
    'NVDA',
    'TSM',
    'AVGO',
    'MU',
    'AMD',
    'GOOGL',
    'MSFT',
    'AMZN',
    'ORCL',
    'CEG',
    'VST',
    'PEG',
    'TLN',
  ],
  readTime: 9,
  publishedAt: '2026-10-13',
  featured: true,
  articleOfMonth: false,
  likes: 0,
  comments: 0,
  reads: 0,
  listMeta: '13 Oct 2026',
};
