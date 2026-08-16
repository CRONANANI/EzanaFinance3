/**
 * Long-form Ezana Echo article: five centuries of empire rankings, 1500–2026.
 * First article on the Research Dossier signature template (six signature
 * figures). Historical GDP shares follow the Maddison Project convention
 * (PPP-based); modern scores reference Ezana's Empire Rankings backbone
 * (18 Dalio-style power dimensions, World Bank sources) and the OECD
 * Economic Outlook explorer. Editorial content, not investment advice.
 *
 * TODO: hero image pending — reusing /echo/critical-minerals-hero.jpg (a
 * cleared, owned geopolitical/macro image) as a placeholder until the bespoke
 * empire-rankings hero art is produced. Do not pull a replacement from the web.
 */
export const empireRankings2026 = {
  id: 'empire-rankings-1500-2026',
  title:
    'Five Centuries of Empire Rankings: Who Ran the World From 1500 to 2026 — and What the Scoreboard Says Now',
  excerpt:
    'In 1500, China and India produced roughly half of world output; in 1950 the United States alone produced about 27%. Across five hundred years, eight powers have held the top of the global rankings, and every transition followed the same measurable sequence. Ezana now scores that sequence live across 18 power dimensions.',
  heroImage: {
    src: '/echo/critical-minerals-hero.jpg',
    alt: 'A world map rendered as a dotted globe with historical trade routes traced between former imperial capitals',
    caption:
      'Five centuries of hegemony compress into a handful of measurable transitions — output, trade, financial centers, and finally the reserve currency. The order never changes; only the names do.',
  },
  contentBlocks: [
    {
      type: 'paragraph',
      text: 'Every ranking of national power published today is a snapshot of a series that has been running for at least five hundred years. In 1500, Ming China and the Indian subcontinent together produced roughly half of world output by the [[kw:maddison-project]]Maddison Project[[/kw]] convention — China near 25%, India near 24.5% — while all of Western Europe combined mustered under 18%. By 1950, the United States alone produced about 27% of world GDP, Britain had slipped below 7%, and China had collapsed to under 5%. The names at the top of the table changed eight times across those centuries; the mechanics of how they changed did not. Power arrived in a sequence — education, innovation, competitiveness, trade share, financial-center status, and last of all [[kw:reserve-currency-status]]reserve currency[[/kw]] — and it left in roughly the reverse order. That sequence is the spine of this report, and it is the same 18-dimension framework Ezana scores live for 30+ countries today.',
    },
    {
      type: 'stat-grid',
      stats: [
        {
          label: 'China + India share of world GDP, 1500',
          value: '~49%',
          change: 'Maddison Project convention, PPP basis',
        },
        {
          label: 'China share at its pre-modern peak, 1820',
          value: '~33%',
          change: 'Largest single-economy share on record',
        },
        {
          label: 'US share of world GDP, 1950',
          value: '~27%',
          change: 'Post-war peak of American output dominance',
        },
        {
          label: 'British Empire, 1913',
          value: '~23%',
          change: 'of world population under one flag',
        },
        {
          label: 'USD share of global FX reserves',
          value: '58%',
          change: 'IMF COFER 2025 · down from 71% in 1999',
        },
      ],
    },

    {
      type: 'scrolly-spotlight',
      figureLabel: 'FIG. 1 · FIVE CENTURIES, SEVEN TURNS',
      kicker:
        'SHARE OF WORLD GDP, 1500–2026 · PINNED CHART, SCROLLING ERA CARDS · EACH CARD LIGHTS ITS ERA.',
      hint: 'Scroll to walk the sequence.',
      source:
        'Maddison Project Database convention; 2026 figures blend IMF WEO shares on a PPP basis. Values are scholarly estimates, not measurements.',
      yLabel: '% of world GDP',
      yMax: 40,
      series: [
        {
          key: 'chn',
          label: 'China',
          color: 'var(--echo-chart-red)',
          fill: true,
          data: [
            { x: 1500, y: 25 },
            { x: 1600, y: 29 },
            { x: 1700, y: 22 },
            { x: 1820, y: 33 },
            { x: 1870, y: 17 },
            { x: 1913, y: 9 },
            { x: 1950, y: 4.5 },
            { x: 1980, y: 5 },
            { x: 2000, y: 11 },
            { x: 2026, y: 19 },
          ],
        },
        {
          key: 'ind',
          label: 'India',
          color: 'var(--echo-chart-orange)',
          data: [
            { x: 1500, y: 24.5 },
            { x: 1600, y: 22 },
            { x: 1700, y: 24 },
            { x: 1820, y: 16 },
            { x: 1870, y: 12 },
            { x: 1913, y: 7.5 },
            { x: 1950, y: 4.2 },
            { x: 1980, y: 3 },
            { x: 2000, y: 5 },
            { x: 2026, y: 8 },
          ],
        },
        {
          key: 'gbr',
          label: 'UK',
          color: 'var(--echo-chart-purple)',
          data: [
            { x: 1500, y: 1.1 },
            { x: 1600, y: 1.8 },
            { x: 1700, y: 2.9 },
            { x: 1820, y: 5.2 },
            { x: 1870, y: 9.1 },
            { x: 1913, y: 8.2 },
            { x: 1950, y: 6.5 },
            { x: 1980, y: 3.6 },
            { x: 2000, y: 3.2 },
            { x: 2026, y: 2.2 },
          ],
        },
        {
          key: 'usa',
          label: 'US',
          color: 'var(--echo-chart-blue)',
          fill: true,
          data: [
            { x: 1700, y: 0.1 },
            { x: 1820, y: 1.8 },
            { x: 1870, y: 8.9 },
            { x: 1913, y: 18.9 },
            { x: 1950, y: 27.3 },
            { x: 1980, y: 21 },
            { x: 2000, y: 21 },
            { x: 2026, y: 15 },
          ],
        },
      ],
      annotations: [
        { x: 1820, y: 33, label: '1820 · China peaks' },
        { x: 1913, y: 18.9, label: '1913 · US passes all rivals' },
        { x: 1950, y: 27.3, label: '1950 · American maximum' },
      ],
      steps: [
        {
          title: 'Five centuries in one line',
          body: 'Share of world output, 1500 to 2026, on the Maddison convention. Every hegemonic transition in the modern era is visible on this single chart: long plateaus, short violent handovers, and one great pendulum swing away from Asia and partway back. Nothing here is smoothed away.',
        },
        {
          title: '1500 — the Asian equilibrium',
          emphasis: ['chn', 'ind'],
          highlight: { from: 1500, to: 1600 },
          body: 'Ming China near 25% of world output, the Indian subcontinent near 24.5% — together roughly half of world production, while all of Western Europe combined musters under 18%. The board opens with the top two positions settled for centuries.',
        },
        {
          title: '1545–1700 — silver, then settlement',
          highlight: { from: 1545, to: 1700 },
          body: 'Potosí silver bankrolls the Iberian century; the Dutch answer with institutions — the VOC of 1602, the Bank of Amsterdam of 1609 — and capture the carrying trade. The first modern reserve asset, the guilder, is born in a country of two million people.',
        },
        {
          title: '1700–1870 — the British ascent',
          emphasis: ['gbr'],
          highlight: { from: 1700, to: 1870 },
          body: "The scientific and industrial revolutions triple Britain's share to roughly 9% by 1870 — and Waterloo in 1815 converts productivity into naval hegemony and sterling primacy. Small share, total system: the leverage of finance over output, demonstrated for the first time.",
        },
        {
          title: '1820–1913 — the great divergence',
          emphasis: ['chn', 'usa'],
          highlight: { from: 1820, to: 1913 },
          activeAnnotations: ['1820 · China peaks', '1913 · US passes all rivals'],
          body: 'China peaks at ~33% in 1820 — the largest single-economy share on record — then loses it across the century of humiliation. Meanwhile the United States runs from about 2% of world output in 1820 to almost 19% by 1913, passing every rival before either world war.',
        },
        {
          title: '1913–1991 — the American century',
          emphasis: ['usa'],
          highlight: { from: 1913, to: 1991 },
          activeAnnotations: ['1950 · American maximum'],
          body: 'Two world wars transfer financial primacy from London to New York; Bretton Woods in 1944 makes the dollar official — roughly half a century after the output overtake. The American maximum arrives in 1950 at ~27% of world output. The Soviet challenge ends in dissolution, not handover.',
        },
        {
          title: '2001–2026 — the open contest',
          emphasis: ['chn', 'usa'],
          highlight: { from: 2001, to: 2026 },
          body: "China's WTO accession opens the fastest output ascent since America's own — back toward a fifth of world output on a PPP basis. But the terminal dimension has not moved: the dollar still holds 58% of allocated reserves against the renminbi's ~2%. The sequence is unfinished, and that is the whole story of the current board.",
        },
      ],
    },

    { type: 'heading', text: 'Five centuries on one line', level: 2 },
    {
      type: 'paragraph',
      text: "Compress five hundred years into a single sweep and the structure jumps out: long plateaus punctuated by short, violent handovers. The Iberian century opens the series — Spain running the first globe-spanning empire on Potosí silver after 1545, Portugal stringing a trade network from Lisbon to Macau — and closes when Dutch fleets and the world's first joint-stock corporation, the VOC of 1602, capture the carrying trade. The Dutch interval is brief but foundational: the Bank of Amsterdam (1609) and the guilder give the world its first modern reserve asset. Britain takes the baton across the long eighteenth century, formalizes it at Waterloo in 1815, and holds it until the ledger of two world wars transfers financial primacy to New York. Bretton Woods in 1944 makes the transfer official. The Soviet challenge runs 1947–1991 and ends in dissolution rather than handover. The current window opens with China's WTO accession in 2001 — the fastest output ascent in the series since America's own.",
    },
    {
      type: 'wall-timeline',
      figureLabel: 'FIG. 2 · THE HANDOVER CHRONOLOGY',
      kicker:
        'THE INSTITUTIONAL EVENTS THAT MOVED THE TOP OF THE TABLE, 1500–2026 · ONE PLAQUE PER DATED EVENT · CLICK ANY PLAQUE FOR THE RECORD.',
      hint: 'Click a plaque for its record.',
      source: 'as dated in this article (public record).',
      startYear: 1500,
      endYear: 2026,
      windows: [],
      plaques: [
        {
          year: 1545,
          lane: 0,
          label: '1545 · Potosí silver',
          detail:
            'Potosí silver bankrolls the Iberian century: Spain runs the first globe-spanning empire on it after 1545.',
        },
        {
          year: 1602,
          lane: 1,
          label: '1602 · The VOC',
          detail:
            'The Dutch answer with institutions: the VOC of 1602, the world’s first joint-stock corporation, captures the carrying trade.',
        },
        {
          year: 1609,
          lane: 2,
          label: '1609 · Bank of Amsterdam',
          detail:
            'The Bank of Amsterdam and the guilder give the world its first modern reserve asset, born in a country of two million people.',
        },
        {
          year: 1815,
          lane: 3,
          label: '1815 · Waterloo',
          detail:
            'Waterloo converts British productivity into naval hegemony and sterling primacy: small share, total system.',
        },
        {
          year: 1944,
          lane: 4,
          label: '1944 · Bretton Woods',
          detail:
            'Two world wars transfer financial primacy from London to New York; Bretton Woods makes the dollar official, roughly half a century after the output overtake.',
        },
        {
          year: 2001,
          lane: 5,
          label: '2001 · China joins the WTO',
          detail:
            'China’s WTO accession opens the fastest output ascent since America’s own, and with it the current contest window.',
        },
      ],
    },
    { type: 'heading', text: 'Twelve empires, one grammar of decline', level: 2 },
    {
      type: 'paragraph',
      text: "Read the graveyard before reading the ranking. Twelve imperial systems contested the top of the table across the window, and their terminal outcomes sort into a small grammar: dissolution (Ottoman 1922, Mughal 1857, Soviet 1991, Imperial Japan 1945), transformation into a successor state that stayed on the board (Qing into the Republic and then the PRC, Tsarist Russia into the USSR), and the long managed handover — Britain, France, Portugal and the Netherlands unwinding empire over decades and ending as prosperous middle powers, with Portugal's Macau handover in 1999 closing a 584-year run, the longest single imperial run in the series. No hegemon in the series was ever removed primarily by battlefield defeat at its peak; every one was first out-produced, then out-traded, then out-financed.",
    },
    {
      type: 'adjudication-matrix',
      figureLabel: 'FIG. 3 · THE GRAMMAR OF DECLINE',
      kicker:
        'EIGHT IMPERIAL SYSTEMS × THREE TERMINAL OUTCOMES · SAME = THE RECORD ASSIGNS THIS EXIT · CLICK A CELL FOR THE EVIDENCE.',
      hint: 'Click a cell for the evidence.',
      source: 'as dated in this article (public record).',
      cols: ['Dissolution', 'Transformation', 'Managed handover'],
      rows: [
        {
          label: 'Ottoman Empire',
          cells: [
            {
              value: 'same',
              note: 'Dissolved in 1922: the caliphate’s imperial system ends outright.',
            },
            { value: 'none' },
            { value: 'none' },
          ],
        },
        {
          label: 'Mughal Empire',
          cells: [
            {
              value: 'same',
              note: 'Dissolved in 1857, after holding nearly a quarter of world output at Aurangzeb’s accession.',
            },
            { value: 'none' },
            { value: 'none' },
          ],
        },
        {
          label: 'Soviet Union',
          cells: [
            {
              value: 'same',
              note: 'The Soviet challenge runs 1947–1991 and ends in dissolution rather than handover.',
            },
            { value: 'none' },
            { value: 'none' },
          ],
        },
        {
          label: 'Imperial Japan',
          cells: [
            {
              value: 'same',
              note: 'Dissolved in 1945 with battlefield defeat, the exception that ends a challenger rather than a hegemon.',
            },
            { value: 'none' },
            { value: 'none' },
          ],
        },
        {
          label: 'Qing China',
          cells: [
            { value: 'none' },
            {
              value: 'same',
              note: 'Transformed into a successor state that stayed on the board: the Qing into the Republic and then the PRC.',
            },
            { value: 'none' },
          ],
        },
        {
          label: 'Tsarist Russia',
          cells: [
            { value: 'none' },
            {
              value: 'same',
              note: 'Transformed rather than removed: Tsarist Russia into the USSR.',
            },
            { value: 'none' },
          ],
        },
        {
          label: 'Britain',
          cells: [
            { value: 'none' },
            { value: 'none' },
            {
              value: 'same',
              note: 'The long managed handover: unwinding empire over decades and ending as a prosperous middle power, with financial primacy crossing to New York.',
            },
          ],
        },
        {
          label: 'Portugal',
          cells: [
            { value: 'none' },
            { value: 'none' },
            {
              value: 'same',
              note: 'The Macau handover in 1999 closes a 584-year run, the longest single imperial run in the series.',
            },
          ],
        },
      ],
    },
    { type: 'heading', text: 'The output pendulum', level: 2 },
    {
      type: 'paragraph',
      text: "The single most important line in the series is share of world output, and it describes a pendulum, not a staircase. Asia's two giants held roughly half of world production in 1500 and still held it in 1700 — Mughal India near 24% at Aurangzeb's accession, Qing China above 22%. Industrialization broke the pattern: Britain's share tripled to roughly 9% by 1870 while commanding a far larger imperial system, and the United States ran from about 2% of world output in 1820 to almost 19% by 1913 and ~27% by 1950. The last seventy-five years have partially unwound the anomaly. On the OECD-style nominal basis Ezana's macro explorer uses, the US still produces roughly a quarter of world output today; on the PPP basis that historical comparisons require, China regained the top output slot in the mid-2010s. The pendulum is the reason the current contest reads differently depending on which measurement basis you pick — a choice the next section formalizes.",
    },
    {
      type: 'radial-stack',
      figureLabel: 'FIG. 4 · THE 2026 OUTPUT BOARD',
      kicker:
        'SHARE OF WORLD GDP IN 2026, PER POWER · PPP BASIS · ONE ARC PER POWER, LONGEST ARC LEADS THE BOARD.',
      hint: 'Each arc scales to that power’s 2026 share of world output.',
      source:
        'The 2026 endpoints of FIG. 1 — Maddison Project convention extended with IMF WEO 2026 shares on a PPP basis. Scholarly estimates, not measurements.',
      maxAngle: 270,
      segmentPalette: [
        'var(--echo-chart-red)',
        'var(--echo-chart-blue)',
        'var(--echo-chart-orange)',
        'var(--echo-chart-purple)',
      ],
      categories: [
        { label: 'China', segments: [{ label: 'China', value: 19 }] },
        { label: 'US', segments: [{ label: 'US', value: 15 }] },
        { label: 'India', segments: [{ label: 'India', value: 8 }] },
        { label: 'UK', segments: [{ label: 'UK', value: 2.2 }] },
      ],
    },
    { type: 'heading', text: 'The sequence of power', level: 2 },
    {
      type: 'paragraph',
      text: "Ray Dalio's Big Cycle research — the framework behind Ezana's 18 power dimensions — makes a specific, testable claim: national power is not one thing but a sequence, in which education and innovation lead, output and trade share follow, financial-center status follows that, and reserve-currency status arrives last and decays last. The historical record adjudicates the claim well. The Dutch built the world's best shipyards and the first modern financial institutions before the guilder became the settlement asset; Britain's scientific and industrial lead preceded sterling's primacy by two generations; American output passed Britain's around 1890, New York displaced London as the dominant financial center after 1918, and the dollar's formal anchoring waited until 1944. The one dimension that resists the pattern is the terminal one: reserve status persists decades after every other lead has eroded. Sterling remained a major reserve asset into the 1950s, thirty years after Britain lost the underlying leads. The dollar's 58% share today — against a US share of world output between 15% (PPP) and 26% (nominal) — is the same overhang, live.",
    },
    {
      type: 'radial-stack',
      figureLabel: 'FIG. 5 · THE 2026 RESERVE BOARD',
      kicker:
        'SHARE OF ALLOCATED FX RESERVES, PER CURRENCY · ONE ARC PER CURRENCY · SET AGAINST FIG. 4, THE MISMATCH WITH OUTPUT IS THE WHOLE CONTEST.',
      hint: 'Each arc scales to that currency’s share of allocated reserves; compare the arcs with FIG. 4.',
      source:
        'IMF COFER shares cited in this article: USD 58%, EUR ~20%, JPY ~5–6% (charted at the range midpoint), RMB ~2%.',
      maxAngle: 270,
      segmentPalette: [
        'var(--echo-chart-blue)',
        'var(--echo-chart-purple)',
        'var(--echo-chart-orange)',
        'var(--echo-chart-red)',
      ],
      categories: [
        { label: 'US dollar', segments: [{ label: 'US dollar', value: 58 }] },
        { label: 'Euro', segments: [{ label: 'Euro', value: 20 }] },
        { label: 'Japanese yen', segments: [{ label: 'Japanese yen', value: 5.5 }] },
        { label: 'Renminbi', segments: [{ label: 'Renminbi', value: 2 }] },
      ],
    },
    { type: 'heading', text: 'Six powers, one scoreboard', level: 2 },
    {
      type: 'paragraph',
      text: "This is where the historical series hands off to the live one. Ezana's Empire Rankings backbone scores the current board across 18 power dimensions in the Dalio grouping — from Debt Burden and Expected Growth through Military Strength, Trade, Markets & Financial Center, and Reserve Currency Status — normalized in rank-space from World Bank source data, so scores compare countries rather than flatter any one of them. The six rows below summarize what the live scoreboard says about the powers that matter most to the 2026 contest; the full matrix, the per-dimension drill-downs, and the head-to-head radar live on the platform.",
    },
    {
      type: 'dossier-table',
      figureLabel: 'FIG. 6 · SIX POWERS, COMPARED',
      kicker:
        'POWER · ROLE ON THE BOARD · ANCHOR METRIC · KEY RISK — CLICK A ROW TO EXPAND THE FULL DOSSIER.',
      hint: 'Six live dossiers — expand a row for the record.',
      source:
        'Ezana Empire Rankings backbone (World Bank sources, rank-normalized) · IMF COFER · OECD Economic Outlook.',
      rows: [
        {
          name: 'United States',
          tag: 'INCUMBENT',
          role: 'Holds the fullest dimension stack ever assembled: financial center, reserve currency, military reach, and the innovation frontier.',
          anchor: 'USD = 58% of allocated FX reserves; ~26% of nominal world GDP.',
          keyRisk:
            'The late-cycle fiscal signature: public debt above 100% of GDP with interest costs rivaling defense outlays.',
          dossier: [
            {
              label: 'Sequence position',
              text: 'Every prior incumbent held reserve status decades past its other leads. The dimension to watch is not output — it is whether financial-center primacy stays uncontested.',
            },
            {
              label: 'Strongest dimensions',
              text: 'Markets & Financial Center, Reserve Currency Status, Military Strength, Innovation & Technology.',
            },
            {
              label: 'Weakest dimensions',
              text: 'Debt Burden, Wealth Gaps, Internal Conflict — the classic internal-order stress cluster of late-cycle incumbents.',
            },
          ],
        },
        {
          name: 'China',
          tag: 'CHALLENGER',
          role: 'The only power contesting multiple dimensions simultaneously — output (PPP basis), manufacturing, trade, and increasingly the innovation frontier.',
          anchor: '~19% of world GDP on a PPP basis; ~30% of global manufacturing value-added.',
          keyRisk:
            'The unfinished middle of the sequence: capital controls cap financial-center status, and RMB reserve share sits near 2%.',
          dossier: [
            {
              label: 'Sequence position',
              text: 'A return, not an arrival — China held ~25–33% of world output for most of recorded history. The open question is whether the financial dimensions can be captured without capital-account convertibility, something no prior challenger achieved.',
            },
            {
              label: 'Strongest dimensions',
              text: 'Trade, Economic Output, Infrastructure, Cost Competitiveness.',
            },
            {
              label: 'Weakest dimensions',
              text: 'Reserve Currency Status, Markets & Financial Center, demographics embedded in Expected Growth.',
            },
          ],
        },
        {
          name: 'European Union',
          tag: 'AGGREGATE',
          role: 'A first-rank economic aggregate (~17% of nominal world GDP) that scores as a great power on trade and regulation and as a middle power on strategy.',
          anchor: 'EUR = ~20% of allocated FX reserves — a distant, stable second.',
          keyRisk:
            'The aggregation problem itself: 27 fiscal policies, one currency, no unified strategic actor to convert scale into leverage.',
          dossier: [
            {
              label: 'Sequence position',
              text: "The euro is the series' only case of a reserve currency without a unified sovereign behind it — durable at 20%, structurally capped there.",
            },
            {
              label: 'Strongest dimensions',
              text: 'Trade, Rule of Law, Education, Character & Civility.',
            },
            {
              label: 'Weakest dimensions',
              text: 'Military Strength (as an aggregate), Expected Growth, energy-linked Cost Competitiveness.',
            },
          ],
        },
        {
          name: 'India',
          tag: 'ASCENDANT',
          role: 'The fastest-growing large economy on the board and the demographic mirror image of every other major power.',
          anchor: "World's most populous country; ~8% of world GDP (PPP) and rising.",
          keyRisk:
            'The 1700 problem in reverse: converting demographic and output scale into per-capita productivity, infrastructure, and financial depth.',
          dossier: [
            {
              label: 'Sequence position',
              text: 'At the education-and-innovation stage of the sequence — the stage Britain occupied c.1750 and the US c.1870. The historical lag from this stage to financial primacy has never been shorter than two generations.',
            },
            {
              label: 'Strongest dimensions',
              text: 'Expected Growth, Cost Competitiveness, demographic tailwinds.',
            },
            {
              label: 'Weakest dimensions',
              text: 'Infrastructure, Wealth Gaps, Markets & Financial Center depth.',
            },
          ],
        },
        {
          name: 'Japan',
          tag: 'FORMER CHALLENGER',
          role: 'The cautionary dossier: the 1980s challenger whose asset bubble, demographics, and debt stalled the ascent at the financial-center stage.',
          anchor: 'JPY = ~5–6% of allocated reserves; public debt >200% of GDP.',
          keyRisk:
            "Demographic contraction compounding against the world's heaviest sovereign debt load.",
          dossier: [
            {
              label: 'Sequence position',
              text: 'Proof that the sequence can stall: Japan captured innovation, output-per-capita, and trade leads by 1990 and never converted them into financial or reserve primacy.',
            },
            {
              label: 'Strongest dimensions',
              text: 'Education, Innovation & Technology, Character & Civility, Rule of Law.',
            },
            { label: 'Weakest dimensions', text: 'Debt Burden, Expected Growth.' },
          ],
        },
        {
          name: 'Russia',
          tag: 'RESOURCE POWER',
          role: 'The Spanish dossier of the current board: military reach and resource leverage substituting for a shrinking economic base (~2% of nominal world GDP).',
          anchor: 'Top-three producer across oil, gas, wheat, and enriched uranium.',
          keyRisk:
            'The Potosí trap — resource rents masking, and financing, structural economic decline.',
          dossier: [
            {
              label: 'Sequence position',
              text: "Runs the sequence backwards: military and resource dimensions first, education and financial dimensions decaying. The 1991 dissolution is the series' reminder of where that ordering leads.",
            },
            {
              label: 'Strongest dimensions',
              text: 'Geology, Resource Efficiency leverage, Military Strength.',
            },
            {
              label: 'Weakest dimensions',
              text: 'Markets & Financial Center, Expected Growth, Rule of Law.',
            },
          ],
        },
      ],
    },
    {
      type: 'cta-callout',
      headline: 'The live version of this table has 18 columns',
      body: "Ezana's Empire Rankings score 30+ countries across all 18 Dalio power dimensions — Debt Burden to Reserve Currency Status — rank-normalized from World Bank source data, with per-metric drill-downs and head-to-head radar comparisons.",
      ctaLabel: 'Open the Empire Rankings',
      ctaHref: '/empire-ranking',
      ctaAuthGate: true,
    },

    { type: 'heading', text: 'Three scenarios to 2050', level: 2 },
    {
      type: 'paragraph',
      text: "Five hundred years of transitions permit exactly one honest forecast structure: scenarios gated by the sequence, not point predictions. The base case is continuation with erosion — the dollar's reserve share drifting from 58% toward the low-50s by 2035 on the same gradual diversification that took it from 71% since 1999, with no financial-center transition, because no convertible alternative exists at scale. The transition case requires what no challenger has yet attempted: Chinese capital-account convertibility deep enough to make Shanghai a genuine reserve-asset market — the single event that historically separates a trade power from a hegemon. The fragmentation case is the one with the least historical precedent since 1500: no succession at all, with reserve holdings splintering across dollar, euro, gold, and smaller currencies, which central banks' record gold accumulation since 2022 already gestures toward. The kill switch on the base case is explicit and measurable: the dollar's COFER reserve share.",
    },
    {
      type: 'scenario-chain',
      figureLabel: 'FIG. 7 · THREE SCENARIOS TO 2050',
      kicker:
        'CONTINUATION, TRANSITION, FRAGMENTATION · EACH CHAIN MULTIPLIES ITS GATES INTO AN END STATE · SCENARIOS ARE GATED BY THE SEQUENCE, NOT POINT PREDICTIONS.',
      hint: 'Read each chain left to right.',
      source: 'IMF COFER · central-bank gold accumulation since 2022 · this article’s framework.',
      scenarios: [
        {
          id: 'continuation',
          label: 'BASE CASE · CONTINUATION WITH EROSION',
          tone: 'base',
          range: 'low-50s by 2035',
          steps: [
            {
              label: 'Gradual diversification',
              sub: 'the same drift that took USD from 71% since 1999',
            },
            { label: 'No convertible alternative', sub: 'at scale, none exists' },
          ],
          result: {
            value: 'USD reserve share drifts from 58% toward the low-50s',
            sub: 'no financial-center transition',
          },
        },
        {
          id: 'transition',
          label: 'TRANSITION CASE · A GENUINE HANDOVER',
          tone: 'transition',
          range: 'unprecedented',
          steps: [
            {
              label: 'Chinese capital-account convertibility',
              sub: 'what no challenger has yet attempted',
            },
            {
              label: 'Shanghai becomes a reserve-asset market',
              sub: 'deep enough to hold reserves',
            },
          ],
          result: {
            value: 'A trade power becomes a hegemon',
            sub: 'the single event that historically separates the two',
          },
        },
        {
          id: 'fragmentation',
          label: 'FRAGMENTATION CASE · NO SUCCESSION AT ALL',
          tone: 'bear',
          range: 'least precedent',
          steps: [
            {
              label: 'Reserve holdings splinter',
              sub: 'across dollar, euro, gold, and smaller currencies',
            },
            {
              label: 'Record central-bank gold buying',
              sub: 'the accumulation since 2022 already gestures toward it',
            },
          ],
          result: {
            value: 'The interwar non-system, replayed',
            sub: 'the outcome with the least historical precedent since 1500',
          },
        },
      ],
      killSwitch: 'The dollar’s COFER reserve share: quarterly, public, and free.',
    },
    { type: 'heading', text: 'How to read the board from here', level: 2 },
    {
      type: 'paragraph',
      text: "For a portfolio, the five-century series compresses into three working rules. First, output overtakes are slow and tradable for decades — the US passed Britain in 1890 and the dollar's formal primacy arrived in 1944, an entire investing lifetime of transition. Broad exposure to the ascendant side of the pendulum (MCHI, INDA for the Asian re-weighting; SPY for the incumbent's stack) is a position on the sequence, not a bet on any single year. Second, the terminal dimension moves last: reserve-currency erosion shows up in UUP, TLT, and above all GLD, which is the asset every fragmentation scenario in the series eventually bid — central banks have been net gold buyers at record pace since 2022 for exactly this reason. Third, watch the gates, not the headlines: the only two numbers that can change the regime are the USD COFER share and a Chinese capital-account opening, and both are quarterly, public, and free.",
    },
    {
      type: 'callout',
      label: 'The lag that pays',
      value: '54 yrs',
      context:
        'Years between the US output overtake (c.1890) and formal dollar primacy at Bretton Woods (1944). Hegemonic transitions are the slowest trades in markets — and the most fully telegraphed.',
    },
    {
      type: 'paragraph',
      text: "The base case for 2026–2035 is the boring one: erosion without transition, an incumbent with the strongest financial stack in the series' history and the fiscal signature of every late-cycle predecessor, a challenger with the strongest output stack since 1820 and an unfinished financial sequence. The bear case is not a Chinese handover but a fragmentation with no successor at all — the interwar non-system, replayed with sanctions instead of reparations. Every dimension in that judgment is a number Ezana tracks: the 18-dimension Empire Rankings score the powers, and the OECD macro explorer's empire mode lets you run the head-to-head radar, the dimension matrix, and the composite ranking yourself — the same scoreboard this article was written from.",
    },
    {
      type: 'cta-callout',
      headline: 'Run the 500-year scoreboard yourself',
      body: "The OECD macro explorer's EMPIRE mode puts the full apparatus in your hands: 60+ years of OECD Economic Outlook series with era annotations, the 18-dimension empire matrix, head-to-head radar comparisons, and composite rankings — actuals solid, projections dashed, nothing interpolated.",
      ctaLabel: 'Open the OECD Macro Explorer',
      ctaHref: '/datasets/oecd-macro',
      ctaAuthGate: false,
    },
  ],
  globeRail: {
    metric: {
      title: 'USD SHARE OF ALLOCATED RESERVES',
      data: [
        { x: 1999, y: 71 },
        { x: 2025, y: 58 },
      ],
      startLabel: '1999 · 71%',
      endLabel: '2025 · 58%',
      note: 'IMF COFER · the last power dimension to move',
    },
    cities: [
      {
        name: 'Washington',
        country: 'US',
        lat: 38.9,
        lng: -77.04,
        impact:
          'The incumbent, holding the fullest dimension stack ever assembled — the dollar at 58% of allocated reserves and ~26% of nominal world GDP — while carrying the late-cycle fiscal signature: public debt above 100% of GDP with interest costs rivaling defense outlays.',
      },
      {
        name: 'Beijing',
        country: 'China',
        lat: 39.9,
        lng: 116.4,
        impact:
          'The challenger, back toward ~19% of world output on a PPP basis and dominating manufacturing and goods trade — but stalled at the financial gate: capital controls cap financial-center status and the renminbi holds ~2% of reserves.',
      },
      {
        name: 'New Delhi',
        country: 'India',
        lat: 28.6,
        lng: 77.2,
        impact:
          'The ascendant power at the education-and-innovation stage of the sequence — the stage Britain occupied c.1750 and the US c.1870 — with ~8% of world GDP (PPP) and rising, and the demographic tailwind every other major power lacks.',
      },
      {
        name: 'London',
        country: 'UK',
        lat: 51.5,
        lng: -0.13,
        impact:
          'The template transition: ~9% of world output at its 1870 peak leveraged into ~23% of world population governed by 1913, then a managed handover as financial primacy crossed to New York — down to ~2.2% of world output today.',
      },
      {
        name: 'Tokyo',
        country: 'Japan',
        lat: 35.68,
        lng: 139.69,
        impact:
          'The cautionary dossier: the 1980s challenger that captured innovation, output-per-capita, and trade leads but never converted them into financial or reserve primacy — the yen at ~5–6% of reserves against public debt above 200% of GDP.',
      },
      {
        name: 'Moscow',
        country: 'Russia',
        lat: 55.75,
        lng: 37.62,
        impact:
          'The resource power running the sequence backwards — military reach and top-three production across oil, gas, wheat, and enriched uranium substituting for a shrinking ~2% of nominal world GDP. The 1991 dissolution is the reminder of where that ordering leads.',
      },
    ],
  },
  author: 'Ezana Finance Editorial',
  // 'macro' matched none of the six homepage CATEGORIES ids, so the piece was
  // orphaned from every column; it belongs on the Global & Emerging board.
  category: 'global-emerging',
  // Seven core metadata dimensions (docs/ECHO_ARTICLE_AUTHORING.md) — every value
  // justified by the article's own text. Government/intergovernmental bodies
  // (IMF, World Bank, WTO, OECD) live in `government`, not `institutions`.
  meta: {
    sectors: ['Financials', 'Materials', 'Energy'],
    industries: ['Diversified Banks', 'Gold', 'Integrated Oil & Gas'],
    institutions: [
      'Dutch East India Company (VOC)',
      'Bank of Amsterdam',
      'Bank of England',
      'Maddison Project',
    ],
    government: [
      'International Monetary Fund',
      'World Bank',
      'World Trade Organization',
      'OECD',
      'Bretton Woods',
    ],
    geos: [
      'China',
      'India',
      'United States',
      'United Kingdom',
      'Netherlands',
      'Spain',
      'Portugal',
      'France',
      'Russia',
      'Japan',
      'European Union',
    ],
    assetClasses: ['Equities', 'Commodities', 'Fixed Income', 'Currencies'],
    themes: ['Geopolitics', 'Reserve Currency', 'Great Power Competition', 'Empire Rankings'],
    datasets: ['IMF COFER', 'Maddison Project Database', 'OECD Economic Outlook'],
    markets: [],
    investors: [],
  },
  entities: {
    people: [],
    terms: [
      { id: 'reserve-currency-status', label: 'Reserve Currency Status' },
      { id: 'maddison-project', label: 'Maddison Project' },
    ],
  },
  tickers: ['SPY', 'MCHI', 'INDA', 'EWU', 'EWJ', 'GLD', 'UUP', 'TLT'],
  readTime: 12,
  publishedAt: '2026-08-05',
  // Only one article may hold the home-page featured hero at a time; the current
  // hero (johnny-mnemonic) keeps it. This article ships un-featured — it still
  // renders in the grid and is fully readable.
  featured: false,
  likes: 0,
  comments: 0,
  reads: 0,
  listMeta: '5 Aug 2026',
};
