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
      text: "Compress five hundred years into a single wall chart and the structure jumps out: long plateaus punctuated by short, violent handovers. The Iberian century opens the series — Spain running the first globe-spanning empire on Potosí silver after 1545, Portugal stringing a trade network from Lisbon to Macau — and closes when Dutch fleets and the world's first joint-stock corporation, the VOC of 1602, capture the carrying trade. The Dutch interval is brief but foundational: the Bank of Amsterdam (1609) and the guilder give the world its first modern reserve asset. Britain takes the baton across the long eighteenth century, formalizes it at Waterloo in 1815, and holds it until the ledger of two world wars transfers financial primacy to New York. Bretton Woods in 1944 makes the transfer official. The Soviet challenge runs 1947–1991 and ends in dissolution rather than handover. The current window opens with China's WTO accession in 2001 — the fastest output ascent in the series since America's own.",
    },
    {
      type: 'wall-timeline',
      figureLabel: 'FIG. 2 · FIVE CENTURIES ON ONE LINE',
      kicker:
        '1500–2026 WALL CHART · SHADED HEGEMONIC WINDOWS · TWELVE EVENT PLAQUES — CLICK ANY PLAQUE FOR THE RECORD.',
      hint: 'Click a plaque for its record.',
      source: 'Maddison Project convention for output shares · standard diplomatic chronology.',
      startYear: 1500,
      endYear: 2026,
      windows: [
        {
          id: 'w1',
          label: 'The Iberian century',
          from: 1500,
          to: 1610,
          color: 'var(--echo-chart-orange)',
        },
        {
          id: 'w2',
          label: 'The Dutch interval',
          from: 1610,
          to: 1720,
          color: 'var(--echo-chart-blue)',
        },
        {
          id: 'w3',
          label: 'The British system',
          from: 1720,
          to: 1914,
          color: 'var(--echo-chart-purple)',
        },
        {
          id: 'w4',
          label: 'The American century',
          from: 1914,
          to: 2001,
          color: 'var(--echo-chart-green)',
        },
        {
          id: 'w5',
          label: 'The open contest',
          from: 2001,
          to: 2026,
          color: 'var(--echo-chart-red)',
        },
      ],
      plaques: [
        {
          year: 1545,
          lane: 0,
          label: 'Potosí silver strike',
          detail:
            'The Cerro Rico deposit bankrolls Habsburg Spain and triggers the century-long European price revolution — the first global monetary shock.',
        },
        {
          year: 1602,
          lane: 1,
          label: 'VOC founded — first IPO',
          detail:
            'The Dutch East India Company sells shares to the public in Amsterdam, inventing permanent capital and the tradable equity claim.',
        },
        {
          year: 1609,
          lane: 2,
          label: 'Bank of Amsterdam opens',
          detail:
            "The Wisselbank makes the guilder Europe's settlement asset — the first recognizably modern reserve currency.",
        },
        {
          year: 1694,
          lane: 3,
          label: 'Bank of England chartered',
          detail:
            "Sovereign borrowing is institutionalized; British fiscal capacity begins to outrun every rival's.",
        },
        {
          year: 1757,
          lane: 4,
          label: 'Plassey — Bengal falls',
          detail:
            'A trading company acquires the revenues of the richest province in the world; Indian share of world output begins a 200-year decline from ~24% to ~4%.',
        },
        {
          year: 1815,
          lane: 5,
          label: 'Waterloo · Pax Britannica',
          detail:
            'Britain emerges as sole naval hegemon; sterling becomes the default currency of world trade for a century.',
        },
        {
          year: 1839,
          lane: 0,
          label: 'First Opium War',
          detail:
            "The century of humiliation opens; China's ~33% output share in 1820 will fall below 5% by 1950.",
        },
        {
          year: 1913,
          lane: 1,
          label: 'Imperial high-water mark',
          detail:
            'The British Empire governs ~23% of world population and about a quarter of the land surface — while US output has already passed British output.',
        },
        {
          year: 1944,
          lane: 2,
          label: 'Bretton Woods',
          detail:
            "The dollar is formalized as the anchor of the world monetary system — roughly 30 years after US output overtook the incumbent's.",
        },
        {
          year: 1991,
          lane: 3,
          label: 'Soviet dissolution',
          detail:
            'The only bipolar challenge in the series ends in dissolution, not handover — the challenger never captured trade, finance, or reserve status.',
        },
        {
          year: 2001,
          lane: 4,
          label: 'China joins the WTO',
          detail:
            "The fastest output ascent since America's: China's share of world GDP roughly quadruples over the following quarter-century.",
        },
        {
          year: 2026,
          lane: 5,
          label: 'The open contest',
          detail:
            'US and China each hold roughly a sixth to a quarter of world output depending on the measurement basis; the reserve-currency dimension remains one-sided.',
        },
      ],
    },

    { type: 'heading', text: 'Twelve empires, one grammar of decline', level: 2 },
    {
      type: 'paragraph',
      text: "Read the graveyard before reading the ranking. Twelve imperial systems contested the top of the table across the window, and their terminal outcomes sort into a small grammar: dissolution (Ottoman 1922, Mughal 1857, Soviet 1991, Imperial Japan 1945), transformation into a successor state that stayed on the board (Qing into the Republic and then the PRC, Tsarist Russia into the USSR), and the long managed handover — Britain, France, Portugal and the Netherlands unwinding empire over decades and ending as prosperous middle powers, with Portugal's Macau handover in 1999 closing a 584-year run, the longest lifeline on the chart. No hegemon in the series was ever removed primarily by battlefield defeat at its peak; every one was first out-produced, then out-traded, then out-financed.",
    },
    {
      type: 'lifelines',
      figureLabel: 'FIG. 3 · TWELVE EMPIRES, ONE GRAMMAR',
      kicker:
        'IMPERIAL LIFELINES FROM FOUNDATION TO DISSOLUTION, TRANSFORMATION, HANDOVER, OR CONTINUATION · 1500–2026. CLICK ANY LIFELINE FOR THE RECORD.',
      hint: 'Click a lifeline for the record.',
      source: 'standard diplomatic chronology · terminal outcomes as commonly dated.',
      startYear: 1400,
      endYear: 2026,
      groups: [
        {
          label: 'Reference · the pre-1500 incumbents',
          rows: [
            {
              name: 'Ottoman Empire',
              from: 1400,
              to: 1922,
              outcome: { type: 'dissolved', label: 'dissolved · 1922' },
              record:
                'Peak under Suleiman (1520–66); a six-century lifeline ending in dissolution and the Turkish Republic. The slowest decline in the series — financial subordination to European creditors preceded territorial loss by a full century.',
            },
            {
              name: 'Ming / Qing China',
              from: 1400,
              to: 1912,
              outcome: { type: 'transformed', label: 'Republic · 1912' },
              record:
                'Holds the largest single-economy output share for most of the series (~25% in 1500, ~33% in 1820) without ever converting it into global naval or financial power after the treasure voyages end in 1433.',
            },
          ],
        },
        {
          label: 'The maritime founders (1415–1602)',
          rows: [
            {
              name: 'Portuguese Empire',
              from: 1415,
              to: 1999,
              outcome: { type: 'handover', label: 'Macau · 1999' },
              record:
                'The longest lifeline: 584 years from Ceuta to the Macau handover. First to build a global trade network; first to lose it to a better-capitalized rival.',
            },
            {
              name: 'Spanish Empire',
              from: 1492,
              to: 1898,
              outcome: { type: 'dissolved', label: 'ends · 1898' },
              record:
                'Potosí silver funds a century of primacy and two centuries of decline — the canonical case of resource windfall substituting for, rather than building, productive capacity.',
            },
            {
              name: 'Dutch Republic / VOC',
              from: 1581,
              to: 1795,
              outcome: { type: 'transformed', label: 'VOC wound up' },
              record:
                'The smallest hegemon in the series. Invented the joint-stock corporation, the central settlement bank, and the reserve currency — then was out-scaled by Britain, which copied all three.',
            },
          ],
        },
        {
          label: 'The industrial contenders (1534–1945)',
          rows: [
            {
              name: 'French colonial empires',
              from: 1534,
              to: 1962,
              outcome: { type: 'handover', label: 'decolonization' },
              record:
                'Twice a near-hegemon (Louis XIV, Napoleon), never the hegemon — the strongest land power of the series repeatedly beaten at sea and in credit markets.',
            },
            {
              name: 'British Empire',
              from: 1583,
              to: 1997,
              outcome: { type: 'handover', label: 'Hong Kong · 1997' },
              record:
                'The template transition: ~9% of world output at peak (1870) leveraged into ~23% of world population governed by 1913, then a managed 80-year handover to its own former colony.',
            },
            {
              name: 'Russian Empire / USSR',
              from: 1721,
              to: 1991,
              outcome: { type: 'dissolved', label: 'dissolved · 1991' },
              record:
                "The only challenger to contest primacy without market finance. Peak ~9.6% of world output (1950); the challenge ends in dissolution — the series' clearest demonstration that output alone does not convert.",
            },
            {
              name: 'Imperial Japan',
              from: 1868,
              to: 1945,
              outcome: { type: 'dissolved', label: 'dissolved · 1945' },
              record:
                "The fastest full-sequence ascent before China's — education to industry to navy in two generations — terminated at its military peak, the exception that proves the overextension rule.",
            },
          ],
        },
        {
          label: 'The current board (1898– )',
          rows: [
            {
              name: 'United States',
              from: 1898,
              to: null,
              outcome: { type: 'continuing', label: 'incumbent' },
              record:
                'Output leadership from ~1890, financial-center status from 1918, reserve status from 1944 — the fullest stack ever assembled. Holds the reserve-currency dimension at 58% of allocated FX reserves in 2025, down from 71% in 1999.',
            },
            {
              name: "People's Republic of China",
              from: 1949,
              to: null,
              outcome: { type: 'continuing', label: 'challenger' },
              record:
                'From under 5% of world output in 1950 back toward a fifth on a PPP basis — a return, not an arrival. Leads or contests output, trade, and manufacturing dimensions; renminbi reserve share remains near 2%.',
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
    { type: 'heading', text: 'The sequence of power', level: 2 },
    {
      type: 'paragraph',
      text: "Ray Dalio's Big Cycle research — the framework behind Ezana's 18 power dimensions — makes a specific, testable claim: national power is not one thing but a sequence, in which education and innovation lead, output and trade share follow, financial-center status follows that, and reserve-currency status arrives last and decays last. The historical record adjudicates the claim well. The Dutch built the world's best shipyards and the first modern financial institutions before the guilder became the settlement asset; Britain's scientific and industrial lead preceded sterling's primacy by two generations; American output passed Britain's around 1890, New York displaced London as the dominant financial center after 1918, and the dollar's formal anchoring waited until 1944. The one dimension that resists the pattern is the terminal one: reserve status persists decades after every other lead has eroded. Sterling remained a major reserve asset into the 1950s, thirty years after Britain lost the underlying leads. The dollar's 58% share today — against a US share of world output between 15% (PPP) and 26% (nominal) — is the same overhang, live.",
    },
    {
      type: 'adjudication-matrix',
      figureLabel: 'FIG. 4 · FIVE TRANSITIONS × FIVE DIMENSIONS',
      kicker:
        'EACH HEGEMONIC TRANSITION GRADED ON WHETHER THE DALIO SEQUENCE HELD · BLUE SAME · HATCHED PARTIAL · GREY NONE. CLICK ANY CELL FOR THE ADJUDICATION NOTE.',
      hint: 'Click any cell for the adjudication note.',
      source:
        "this report's framework · dimension taxonomy per Ezana Empire Rankings (18 dimensions, Dalio grouping).",
      cols: [
        'Education & innovation lead',
        'Output & trade overtake',
        'Financial-center shift',
        'Reserve-currency lag',
        'Overextension at peak',
      ],
      rows: [
        {
          label: 'Iberian → Dutch · c.1600',
          cells: [
            {
              value: 'same',
              note: "Dutch shipbuilding, cartography, and university culture led Spain's well before the trade overtake; Spain's silver windfall masked a stagnant productive base.",
            },
            {
              value: 'same',
              note: 'The VOC and the herring/carrying trades captured European commerce while Spanish output stagnated under price-revolution inflation.',
            },
            {
              value: 'same',
              note: "Amsterdam displaced Genoa/Seville as the continent's clearing center within a generation of the Wisselbank (1609).",
            },
            {
              value: 'part',
              note: 'The guilder is the first recognizable reserve currency, but pre-modern monetary systems make the lag hard to date precisely.',
            },
            {
              value: 'same',
              note: 'Habsburg Spain fought simultaneous wars in the Netherlands, the Mediterranean, and the Atlantic while defaulting on sovereign debt four times between 1557 and 1607.',
            },
          ],
        },
        {
          label: 'Dutch → British · 1720–1815',
          cells: [
            {
              value: 'same',
              note: 'The British scientific and then industrial revolutions gave Britain the innovation lead a full two generations before naval and commercial primacy were settled.',
            },
            {
              value: 'same',
              note: 'British output and trade share passed the Dutch across the eighteenth century; the Navigation Acts and naval wars accelerated a shift productivity had already decided.',
            },
            {
              value: 'same',
              note: 'London displaced Amsterdam definitively after the fourth Anglo-Dutch war (1784) crippled Dutch finance.',
            },
            {
              value: 'same',
              note: "Sterling's primacy consolidated after 1815 — well after the output, trade, and financial-center leads were established.",
            },
            {
              value: 'part',
              note: 'The Dutch case is less overextension than under-scale: a country of two million could not hold leads a country of ten million wanted.',
            },
          ],
        },
        {
          label: 'British → American · 1890–1944',
          cells: [
            {
              value: 'same',
              note: 'US leadership in mass education, then in industrial R&D (electricity, chemicals, the assembly line), preceded every other overtake.',
            },
            {
              value: 'same',
              note: "US output passed Britain's c.1890 and reached ~19% of world output by 1913 — before either world war.",
            },
            {
              value: 'same',
              note: "New York displaced London as the world's creditor center across 1914–1918 as Britain liquidated overseas assets to fund the war.",
            },
            {
              value: 'same',
              note: "The dollar's formal anchoring waited until Bretton Woods (1944) — roughly half a century after the output overtake. The canonical lag.",
            },
            {
              value: 'same',
              note: 'Two world wars converted British net creditor status (~£4B overseas assets) into net debtor status inside thirty years.',
            },
          ],
        },
        {
          label: 'Soviet challenge · 1947–1991',
          cells: [
            {
              value: 'part',
              note: 'Genuine leads in narrow domains (early spaceflight, mathematics) never diffused into civilian productivity — the education lead existed but did not compound.',
            },
            {
              value: 'none',
              note: "Peak Soviet output share (~9.6%, 1950) never approached the incumbent's and declined relatively from the 1970s.",
            },
            {
              value: 'none',
              note: 'No convertible currency, no open capital market, no financial center. The dimension was never contested.',
            },
            {
              value: 'none',
              note: 'The ruble held zero reserve role outside the bloc — the sequence cannot complete when the middle steps are missing.',
            },
            {
              value: 'same',
              note: 'Defense absorbed an estimated 15–20% of Soviet GDP by the 1980s against ~6% for the US — overextension without the underlying leads.',
            },
          ],
        },
        {
          label: 'American → ? · 2001–2026',
          cells: [
            {
              value: 'part',
              note: 'The US holds the innovation and university lead by most measures; China leads in STEM graduate volume and contests frontier fields. Ezana scores this dimension live.',
            },
            {
              value: 'part',
              note: 'China leads output on a PPP basis and dominates manufacturing value-added and goods trade; the US leads on nominal output and services. Basis choice decides the cell.',
            },
            {
              value: 'none',
              note: 'New York and the dollar system remain uncontested as the global financial center; Shanghai and Hong Kong remain regionally bounded by capital controls.',
            },
            {
              value: 'none',
              note: 'USD ~58% of allocated reserves vs RMB ~2%. The terminal dimension has not begun to move at transition speed.',
            },
            {
              value: 'part',
              note: 'US federal debt held by the public exceeds 100% of GDP and interest costs now rival the defense budget — the fiscal signature of late-cycle incumbents, without (yet) the external creditor squeeze.',
            },
          ],
        },
      ],
    },

    { type: 'heading', text: 'Six powers, one scoreboard', level: 2 },
    {
      type: 'paragraph',
      text: "This is where the historical series hands off to the live one. Ezana's Empire Rankings backbone scores the current board across 18 power dimensions in the Dalio grouping — from Debt Burden and Expected Growth through Military Strength, Trade, Markets & Financial Center, and Reserve Currency Status — normalized in rank-space from World Bank source data, so scores compare countries rather than flatter any one of them. The six rows below summarize what the live scoreboard says about the powers that matter most to the 2026 contest; the full matrix, the per-dimension drill-downs, and the head-to-head radar live on the platform.",
    },
    {
      type: 'dossier-table',
      figureLabel: 'FIG. 5 · SIX POWERS, COMPARED',
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

    {
      type: 'stage-boards',
      figureLabel: 'FIG. 6 · THREE POWERS, ONE CYCLE — CLICK ANY STAGE',
      kicker:
        'THE DALIO SEQUENCE AS A STAGE STRIP · CURRENT STAGE FILLED · ▼ MARKS WHERE EACH POWER SITS NOW · CLICK A STAGE FOR ITS RECORD.',
      hint: 'Click any stage cell for the record.',
      source:
        "Ezana Empire Rankings backbone (World Bank sources, rank-normalized) · IMF COFER · this article's adjudication.",
      boards: [
        {
          id: 'usa',
          title: 'United States',
          color: 'var(--echo-chart-blue)',
          currentIndex: 3,
          stages: [
            {
              label: 'Rise',
              sub: 'c.1870–1890',
              note: 'Mass education and industrial R&D leadership precede every other overtake — the education-and-innovation stage of the sequence.',
            },
            {
              label: 'Overtake',
              sub: '1890–1913',
              note: 'Output passes Britain c.1890 and reaches ~19% of world output by 1913, before either world war.',
            },
            {
              label: 'Full stack',
              sub: '1918–1944',
              note: 'New York displaces London across 1914–1918; Bretton Woods formalizes dollar primacy in 1944 — the canonical ~50-year reserve lag.',
            },
            {
              label: 'Late cycle',
              sub: 'From 2001',
              note: 'The fullest dimension stack ever assembled, carrying the late-cycle fiscal signature: public debt above 100% of GDP with interest costs rivaling defense outlays.',
            },
          ],
          stats: [
            {
              value: '58%',
              label: 'USD share of allocated FX reserves',
              source: 'IMF COFER 2025 · down from 71% in 1999',
            },
            { value: '~26%', label: 'of nominal world GDP', source: 'nominal basis' },
          ],
          summary:
            'Every prior incumbent held reserve status decades past its other leads. The dimension to watch is not output — it is whether financial-center primacy stays uncontested.',
        },
        {
          id: 'chn',
          title: 'China',
          color: 'var(--echo-chart-red)',
          currentIndex: 2,
          stages: [
            {
              label: 'Return begins',
              sub: '1980–2001',
              note: 'From under 5% of world output in 1950, reform-era growth reopens the ascent — a return, not an arrival: China held ~25–33% for most of recorded history.',
            },
            {
              label: 'Output & trade',
              sub: '2001–2015',
              note: "WTO accession opens the fastest ascent since America's; China comes to lead output on a PPP basis and dominate manufacturing value-added and goods trade.",
            },
            {
              label: 'Financial gate',
              sub: 'Now',
              note: 'The unfinished middle of the sequence: capital controls cap financial-center status, and no prior challenger completed the sequence without capital-account convertibility.',
            },
            {
              label: 'Reserve status',
              sub: 'Not begun',
              note: 'RMB reserve share sits near 2% — the terminal dimension has not begun to move at transition speed.',
            },
          ],
          stats: [
            { value: '~19%', label: 'of world GDP, PPP basis', source: 'PPP convention' },
            { value: '~2%', label: 'RMB share of allocated reserves', source: 'IMF COFER' },
          ],
          summary:
            'The only power contesting multiple dimensions simultaneously — with the financial dimensions still gated by convertibility, the single event that historically separates a trade power from a hegemon.',
        },
        {
          id: 'ind',
          title: 'India',
          color: 'var(--echo-chart-orange)',
          currentIndex: 1,
          stages: [
            {
              label: 'Scale',
              sub: 'Held',
              note: "The world's most populous country, with roughly 8% of world GDP on a PPP basis and rising — the demographic mirror image of every other major power.",
            },
            {
              label: 'Education & innovation',
              sub: 'Now',
              note: 'The stage Britain occupied c.1750 and the US c.1870. The historical lag from this stage to financial primacy has never been shorter than two generations.',
            },
            {
              label: 'Output & trade',
              sub: 'Ahead',
              note: 'The 1700 problem in reverse: converting demographic and output scale into per-capita productivity, infrastructure, and financial depth.',
            },
            {
              label: 'Financial depth',
              sub: 'Distant',
              note: 'Markets and financial-center depth remain the weakest dimensions on the live scoreboard.',
            },
          ],
          stats: [
            { value: '#1', label: 'world population', source: 'most populous country' },
            { value: '~8%', label: 'of world GDP, PPP, rising', source: 'PPP convention' },
          ],
          summary:
            'The fastest-growing large economy on the board, sitting exactly where the last two hegemons sat two generations before their financial primacy.',
        },
      ],
    },

    { type: 'heading', text: 'Three scenarios to 2050', level: 2 },
    {
      type: 'paragraph',
      text: "Five hundred years of transitions permit exactly one honest forecast structure: scenarios gated by the sequence, not point predictions. The base case is continuation with erosion — the dollar's reserve share drifting from 58% toward the low-50s by 2035 on the same gradual diversification that took it from 71% since 1999, with no financial-center transition, because no convertible alternative exists at scale. The transition case requires what no challenger has yet attempted: Chinese capital-account convertibility deep enough to make Shanghai a genuine reserve-asset market — the single event that historically separates a trade power from a hegemon. The fragmentation case is the one with the least historical precedent since 1500: no succession at all, with reserve holdings splintering across dollar, euro, gold, and smaller currencies, which central banks' record gold accumulation since 2022 already gestures toward. The kill switch on the base case is explicit and measurable.",
    },
    {
      type: 'scenario-chain',
      figureLabel: 'FIG. 7 · THE SCENARIO CHAIN · 2026 → 2050',
      kicker:
        'SCENARIO · SEQUENCE GATE × MEASURABLE DRIVER → REGIME OUTCOME · THREE SCENARIOS, ONE KILL SWITCH.',
      hint: 'The kill switch is a falsification threshold, not a prediction.',
      source:
        "this report's framework · IMF COFER for reserve shares · Ezana Empire Rankings for dimension scores.",
      scenarios: [
        {
          id: 'base',
          label: 'BASE CASE',
          tone: 'base',
          range: 'Erosion, no transition',
          steps: [
            {
              label: 'Reserve share drift',
              sub: 'USD 58% → low-50s by 2035 · the 1999–2025 slope, extended',
            },
            {
              label: 'No convertible rival',
              sub: 'RMB capital controls persist · euro capped near 20%',
            },
          ],
          result: {
            value: 'Incumbent holds',
            sub: 'dollar system intact through 2050 · slow multipolar drift',
          },
        },
        {
          id: 'alt',
          label: 'TRANSITION CASE',
          tone: 'alt',
          range: 'The sequence completes',
          steps: [
            {
              label: 'Convertibility event',
              sub: 'Chinese capital account opens · Shanghai becomes a reserve-asset market',
            },
            {
              label: 'Financial-center shift',
              sub: 'the 1918 New York pattern · a decade of creditor migration',
            },
          ],
          result: {
            value: 'Handover begins',
            sub: 'first non-Western reserve transition in the 500-year series',
          },
        },
        {
          id: 'bear',
          label: 'FRAGMENTATION',
          tone: 'bear',
          range: 'No succession',
          steps: [
            {
              label: 'Bloc partition',
              sub: 'trade and payments split along sanction lines · gold accumulation continues',
            },
            {
              label: 'Reserve splintering',
              sub: 'USD below 45% with no single successor above 25%',
            },
          ],
          result: {
            value: 'Multipolar drift',
            sub: 'closest precedent: the interwar 1919–1939 non-system',
          },
        },
      ],
      killSwitch:
        'USD SHARE OF ALLOCATED RESERVES CROSSES BELOW 45% (IMF COFER) — BASE CASE IS DEAD; RE-UNDERWRITE THE BOARD.',
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
  category: 'macro',
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
