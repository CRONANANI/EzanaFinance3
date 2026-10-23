/**
 * Seed few-shot exemplars for the eight most-used Sonar templates
 * (sonar-templates-spec.md §4). Exemplars teach STRUCTURE, TONE and CITATION
 * STYLE, never facts: every number is a {{placeholder}}, and the entities
 * deliberately differ from common live queries so the model cannot copy
 * content. These ship in code as the fallback library; rows promoted into
 * public.sonar_exemplars (by an admin, with embeddings) take precedence.
 */

const brief = (sections) => sections.map(([section, text]) => ({ section, text }));

export const EXEMPLAR_SEEDS = [
  /* ── company ── */
  {
    template: 'company',
    query: 'Siemens',
    ideal_output: {
      headline:
        '{{company}} enters the quarter {{direction}} as {{top_driver}} drives the order book, with US federal exposure through {{n}} subsidiaries.',
      brief: brief([
        ['What it is', '{{company}} is a {{sector}} group with a {{size}} market cap [S1].'],
        [
          'Government money',
          'US federal awards to its subsidiaries total {{value}} in FY{{year}}, led by {{agency}} [S2].',
        ],
        [
          'Smart money',
          '{{holder}} holds {{value}} of the stock and {{direction}} its position last quarter [S3].',
        ],
        ['What to watch', '{{next_catalyst}} on {{date}} [S4].'],
      ]),
      followups: [
        { label: 'Who holds {{company}}?', template: 'investor_fund' },
        { label: '{{company}} vs {{peer}}', template: 'comparison' },
      ],
    },
  },
  {
    template: 'company',
    query: 'Mitsubishi Heavy Industries',
    ideal_output: {
      headline:
        '{{company}} is {{direction}} on {{top_driver}}, with {{n}} open filings in Ezana datasets.',
      brief: brief([
        ['What it is', '{{company}} trades on {{exchange}} at a {{value}} market cap [S1].'],
        [
          'Political angle',
          '{{n}} members of Congress disclosed trades in the ticker since {{date}} [S2].',
        ],
        ['What to watch', '{{next_catalyst}} [S3].'],
      ]),
      followups: [{ label: 'Which politicians trade it?', template: 'politician' }],
    },
  },
  /* ── politician ── */
  {
    template: 'politician',
    query: 'Senator Maria Cantwell',
    ideal_output: {
      headline:
        '{{member}} has disclosed {{n}} trades this term, concentrated in {{sector}}, while sitting on {{committee}}.',
      brief: brief([
        ['Who they are', '{{member}} ({{party}}, {{state}}) sits on {{committee}} [S1].'],
        [
          'Trading record',
          '{{n_trades}} disclosed trades in the window, {{buys}} buys against {{sells}} sells, led by {{ticker}} [S2].',
        ],
        ['Committee angle', '{{overlap_note}} [S3].'],
        ['What to watch', '{{next_disclosure_note}} [S4].'],
      ]),
      followups: [
        { label: 'Their biggest trades this year', template: 'ranking' },
        { label: 'Committee conflicts', template: 'politician' },
      ],
    },
  },
  {
    template: 'politician',
    query: 'Representative Ro Khanna',
    ideal_output: {
      headline: '{{member}} discloses {{frequency}} and the book tilts to {{sector}}.',
      brief: brief([
        ['Who they are', '{{member}} represents {{state}} and sits on {{committee}} [S1].'],
        [
          'Trading record',
          'The latest filing covers {{ticker}} on {{date}}, a {{side}} in the {{range}} band [S2].',
        ],
        ['What to watch', '{{next_catalyst}} [S3].'],
      ]),
      followups: [{ label: 'Compare to another member', template: 'comparison' }],
    },
  },
  /* ── investor_fund ── */
  {
    template: 'investor_fund',
    query: 'Baupost Group',
    ideal_output: {
      headline:
        '{{fund}} runs a {{value}} reported book concentrated in {{n}} names, and {{direction}} {{ticker}} last quarter.',
      brief: brief([
        [
          'The book',
          '{{n_positions}} positions, with {{top_holding}} at {{share}} of the book [S1].',
        ],
        [
          'Latest quarter moves',
          'The largest add was {{ticker}} ({{value}}); the largest exit {{ticker2}} [S2].',
        ],
        ['What to watch', '{{next_filing_window}} [S3].'],
      ]),
      followups: [
        { label: 'What did they buy last quarter?', template: 'investor_fund' },
        { label: 'Overlap with {{other_fund}}', template: 'comparison' },
      ],
    },
  },
  {
    template: 'investor_fund',
    query: 'Appaloosa Management',
    ideal_output: {
      headline: '{{fund}} is {{posture}} with {{share}} of the book in {{sector}}.',
      brief: brief([
        ['The book', 'The reported book is {{value}} across {{n}} names [S1].'],
        ['Activist posture', '{{activist_note}} [S2].'],
        ['What to watch', '{{next_catalyst}} [S3].'],
      ]),
      followups: [{ label: 'Top holdings', template: 'ranking' }],
    },
  },
  /* ── industry_country (the hero's template, different entities) ── */
  {
    template: 'industry_country',
    query: 'semiconductor industry in Taiwan',
    ideal_output: {
      headline:
        "{{country}}'s listed {{industry}} names are {{direction}} YTD as {{top_driver}} dominates the agenda, with US exposure concentrated in {{n}} companies.",
      brief: brief([
        [
          'Market structure',
          '{{n_companies}} listed companies form the basket, led by {{top_company}} at {{share}} of combined market cap [S1].',
        ],
        [
          'Policy & trade',
          '{{policy_event}} on {{date}} is the main overhang [S2]; prediction markets price {{odds}} odds of {{outcome}} [S3].',
        ],
        [
          'Government money',
          'US federal awards to basket companies total {{value}} in FY{{year}} [S4].',
        ],
        ['Smart money', '{{top_holder}} {{direction}} its basket holdings last quarter [S5].'],
        ['What to watch', '{{next_catalyst}} [S6].'],
      ]),
      coverage_gaps: ['{{gap_note}}'],
      followups: [
        { label: 'Top 10 {{industry}} companies in {{country}}', template: 'ranking' },
        { label: 'Compare {{country}} vs {{other_country}} {{industry}}', template: 'comparison' },
      ],
    },
  },
  {
    template: 'industry_country',
    query: 'auto industry in Germany',
    ideal_output: {
      headline:
        "Germany's listed automakers are {{direction}} YTD as {{top_driver}} weighs on margins, while US federal contract exposure is concentrated in {{n}} subsidiaries.",
      brief: brief([
        [
          'Market structure',
          '{{n_companies}} listed companies make up the basket, led by {{top_company}} at {{share}} of combined market cap [S1].',
        ],
        [
          'Policy & trade',
          '{{policy_event}} on {{date}} is the main trade overhang [S4]; prediction markets price {{odds}} odds of {{outcome}} [S6].',
        ],
        ['Smart money', '{{top_holder}} added {{pct}} to its basket holdings last quarter [S2].'],
        ['What to watch', '{{next_catalyst}} [S7].'],
      ]),
      followups: [
        { label: 'Top 10 auto companies in Germany', template: 'ranking' },
        { label: 'Compare Germany vs Japan autos', template: 'comparison' },
        { label: 'Who lobbies on EV tariffs?', template: 'lobbying_topic' },
      ],
    },
  },
  /* ── industry ── */
  {
    template: 'industry',
    query: 'shipping industry',
    ideal_output: {
      headline:
        'The listed {{industry}} basket is {{direction}} as {{top_driver}} sets rates, with {{n}} names carrying federal awards.',
      brief: brief([
        ['Market structure', 'The basket spans {{n_companies}} names led by {{top_company}} [S1].'],
        [
          'Government money',
          'Federal awards to the basket total {{value}} in FY{{year}}, led by {{agency}} [S2].',
        ],
        ['Smart money', '{{fund}} is the largest holder of {{ticker}} [S3].'],
        ['What to watch', '{{next_catalyst}} [S4].'],
      ]),
      followups: [{ label: 'Top 10 {{industry}} companies', template: 'ranking' }],
    },
  },
  {
    template: 'industry',
    query: 'railroads',
    ideal_output: {
      headline:
        '{{industry}} trades on {{top_driver}}, and Washington money runs through {{n}} of the listed names.',
      brief: brief([
        [
          'Market structure',
          '{{n_companies}} listed names; {{top_company}} leads at {{value}} [S1].',
        ],
        ['Political angle', '{{n}} members of Congress traded basket tickers since {{date}} [S2].'],
        ['What to watch', '{{next_catalyst}} [S3].'],
      ]),
      followups: [{ label: 'Biggest lobbying spenders', template: 'lobbying_topic' }],
    },
  },
  /* ── ranking ── */
  {
    template: 'ranking',
    query: 'top 10 mining companies in Australia',
    ideal_output: {
      headline:
        'The top {{n}} {{subject}} by {{metric}} run from {{top_company}} ({{value}}) to {{last_company}} ({{value2}}).',
      brief: brief([
        [
          'The ranking',
          '{{top_company}} leads at {{value}}, {{second_company}} follows at {{value2}} [S1].',
        ],
        ['What separates them', '{{separator_note}} [S2].'],
        ['What to watch', '{{next_catalyst}} [S3].'],
      ]),
      followups: [
        { label: 'Rank by government contracts instead', template: 'ranking' },
        { label: 'Compare #1 vs #2', template: 'comparison' },
      ],
    },
  },
  {
    template: 'ranking',
    query: 'biggest pharma companies by market cap',
    ideal_output: {
      headline:
        '{{top_company}} tops the {{subject}} ranking at {{value}}, with the top {{n}} spanning {{range}}.',
      brief: brief([
        [
          'The ranking',
          'The table below ranks by {{metric}}; the gap from #1 to #{{n}} is {{multiple}} [S1].',
        ],
        ['What to watch', '{{next_catalyst}} [S2].'],
      ]),
      followups: [{ label: 'Most-held by funds', template: 'ranking' }],
    },
  },
  /* ── comparison ── */
  {
    template: 'comparison',
    query: 'Airbus vs Embraer',
    ideal_output: {
      headline:
        '{{a}} is the {{size_frame}} and {{b}} the {{other_frame}}: {{a}} at {{value_a}} market cap against {{value_b}}, with {{driver}} the swing factor.',
      brief: brief([
        ['Side by side', '{{a}} trades at {{multiple_a}} against {{b}} at {{multiple_b}} [S1].'],
        [
          'Government exposure',
          '{{a}} carries {{value}} of federal awards against {{value2}} for {{b}} [S2].',
        ],
        ['Smart money', '{{fund}} holds both, weighted {{weight_note}} [S3].'],
        ['The verdict framing', '{{framing_note}}, findings only [S4].'],
      ]),
      followups: [
        { label: 'Which is cheaper?', template: 'comparison' },
        { label: 'Who has more government exposure?', template: 'comparison' },
      ],
    },
  },
  {
    template: 'comparison',
    query: 'Norway vs Denmark offshore wind',
    ideal_output: {
      headline:
        '{{a}} leads on {{metric_a}} and {{b}} on {{metric_b}}; the datasets split {{split_note}}.',
      brief: brief([
        ['Side by side', '{{a}} fields {{n_a}} listed names against {{n_b}} for {{b}} [S1].'],
        ['The verdict framing', '{{framing_note}} [S2].'],
      ]),
      followups: [{ label: 'Top companies in each', template: 'ranking' }],
    },
  },
  /* ── policy ── */
  {
    template: 'policy',
    query: 'Jones Act',
    ideal_output: {
      headline:
        '{{policy}} shapes {{sector}}: {{n}} clients lobbied on it last year and {{value}} of federal awards ride on it.',
      brief: brief([
        ['What it does', '{{policy_summary}} [S1].'],
        [
          'Who lobbied',
          '{{top_client}} led disclosed spend at {{value}} across {{n_filings}} filings [S2].',
        ],
        ['Who benefits', '{{beneficiary_note}} [S3].'],
        ['Trading around it', '{{trading_note}} [S4].'],
        ['What to watch', '{{next_milestone}} on {{date}} [S5].'],
      ]),
      followups: [
        { label: 'Who benefits?', template: 'ranking' },
        { label: 'Who lobbied for it?', template: 'lobbying_topic' },
      ],
    },
  },
  {
    template: 'policy',
    query: 'EU Carbon Border Adjustment Mechanism',
    ideal_output: {
      headline:
        '{{policy}} lands {{date}}, and prediction markets price {{odds}} odds of {{outcome}}.',
      brief: brief([
        ['What it does', '{{policy_summary}} [S1].'],
        ['Who lobbied', '{{n}} clients filed on the issue code, led by {{top_client}} [S2].'],
        ['What to watch', '{{next_milestone}} [S3].'],
      ]),
      followups: [{ label: 'Trades near the vote', template: 'event_catalyst' }],
    },
  },
];
