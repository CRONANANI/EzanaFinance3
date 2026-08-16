/**
 * Long-form Ezana Echo article: the four-phase tech consolidation cycle read
 * through William Gibson's "Johnny Mnemonic" (1981). Editorial / illustrative
 * content for in-app reading — figures attributed to public reporting current
 * as of August 2026. Not live market data, not investment advice.
 *
 * Companion piece to ezana-echo-article-data-consolidation-2026.js ("They're
 * Not Buying the Model"): that article maps WHAT acquirers buy (data +
 * workflow position); this one maps the CYCLE that decides who buys and who
 * sells.
 */
export const johnnyMnemonicConsolidation2026 = {
  id: 'johnny-mnemonic-tech-consolidation-2026',
  title:
    "What Johnny Mnemonic Saw Coming: Tech's $649 Billion Consolidation Wave and the Four-Phase Cycle That Decides Who Survives",
  excerpt:
    'Global M&A hit a record $2.8 trillion in the first half of 2026 and technology led every sector at $649 billion. A 1981 William Gibson short story about a courier with corporate data locked in his skull mapped the endgame: the cargo is proprietary data, and the market consolidates around whoever controls it.',
  heroImage: {
    src: '/echo/dolphin-in-johnny-mnemonic.jpg',
    alt: 'Jones, the cybernetically enhanced dolphin from the 1995 film Johnny Mnemonic, observed through aquarium glass',
    caption:
      'Jones, the ex-military decryption dolphin of Johnny Mnemonic — a purpose-built point solution decommissioned when its platform moved on. The 1995 film adapted William Gibson’s 1981 short story. (Still: TriStar Pictures.)',
  },
  contentBlocks: [
    {
      type: 'paragraph',
      text: 'Global mergers and acquisitions reached a record $2.8 trillion in the first half of 2026 — up 48% year over year and the highest first-half total since LSEG began tracking deals in 1980 — and technology led every sector at $649 billion in announced value. Underneath the headline number sits a pattern that repeats across every maturing technology market: pioneers proliferate, competitors scale, platforms absorb, and a handful of names end up owning the board. The cycle is old enough that a 26-page short story published in Omni magazine in May 1981 described its endgame with uncomfortable precision. William Gibson’s "Johnny Mnemonic" is about a courier who carries corporate data in a storage implant because the information is too valuable to move on a network — and about what the entities that control such data will do to keep it consolidated.',
    },
    {
      type: 'stat-grid',
      stats: [
        { label: 'Global M&A, H1 2026', value: '$2.8T', change: '+48% YoY — record (LSEG)' },
        { label: 'Tech deal value, H1 2026', value: '$649B', change: 'Led all sectors' },
        { label: 'Deals above $10B closed, H1', value: '47', change: '$1.3T+ combined' },
        { label: 'Tech deals with an AI component', value: '~50%', change: 'Up from ~25% in 2024' },
        {
          label: 'Orgs consolidating security vendors',
          value: '~75%',
          change: 'Up from <33% in 2020 (Gartner)',
        },
      ],
    },

    { type: 'heading', text: 'The four-phase cycle: open, scale, consolidate, dominate', level: 2 },
    {
      type: 'paragraph',
      text: 'Every technology market that reaches maturity moves through the same four phases. In the opening phase, pioneers multiply — barriers are low, categories are new, and being first matters more than being big. In the scaling phase, capital decides: the companies that raise, partner, and win share pull away from the ones that merely invented something. In the consolidation phase, large companies buy medium ones, and every founder faces the same binary — survive independently or sell. In the final phase, a few names dominate, and the rest either disappear or persist at the margins. The framing circulates widely among security operators, and analyst Ross Haleliuk’s research on two decades of cybersecurity consolidation documents the same arc empirically: point-solution booms followed by platform absorption, category after category.',
    },
    {
      type: 'mechanism-wave',
      figureLabel: 'FIG. 1 · THE FOUR-PHASE CYCLE',
      kicker:
        'OPEN → SCALE → CONSOLIDATE → DOMINATE · AMPLITUDE GROWS INTO THE CONSOLIDATION PHASE AND DAMPS AS A FEW NAMES TAKE THE BOARD · THE LOOP RESTARTS EACH NEW CATEGORY.',
      hint: 'Schematic — the shape of the cycle, not a data series.',
      source: "this article's framework.",
      loopCaption:
        'PIONEERS PROLIFERATE → COMPETITORS SCALE → PLATFORMS ABSORB → A FEW OWN THE BOARD',
      envelopeLabel: 'amplification →',
      phases: [
        { n: 1, label: 'Open', color: 'var(--echo-chart-blue)' },
        { n: 2, label: 'Scale', color: 'var(--echo-chart-green)' },
        { n: 3, label: 'Consolidate', color: 'var(--echo-chart-orange)' },
        { n: 4, label: 'Dominate', color: 'var(--echo-chart-red)' },
      ],
    },
    {
      type: 'paragraph',
      text: 'Cloud infrastructure shows what the final phase looks like. Roughly a decade and a half after the opening phase, Amazon Web Services holds about 30% of global cloud infrastructure spend, Microsoft Azure about 23%, and Google Cloud about 13% — two thirds of a market measured in hundreds of billions of dollars, held by three companies, per Synergy Research Group estimates. Nobody meaningfully enters that market anymore; the phase transition is complete. The question that matters for investors is not whether consolidation happens — it is which markets are entering the consolidation phase now, because that is where acquisition premiums get paid and where independent mid-size vendors quietly lose relevance.',
    },
    {
      type: 'dossier-table',
      figureLabel: 'FIG. 2 · THE END STATE — GLOBAL CLOUD, 2026',
      kicker:
        'GLOBAL CLOUD INFRASTRUCTURE SPEND SHARE, 2026 · TWO-THIRDS HELD BY THREE FIRMS · CLICK A ROW TO EXPAND THE DOSSIER.',
      hint: 'Four shares — expand a row for the record.',
      source: 'Synergy Research Group estimates, 2026 · article positioning.',
      headers: ['Platform', 'What it is on the board', 'Share of spend', 'Key risk', ''],
      rows: [
        {
          name: 'AWS',
          tag: 'CLOUD #1',
          role: "The clearest picture of the cycle's final “dominate” phase — the largest single cloud platform.",
          anchor: '~30% of global cloud spend',
          keyRisk:
            'Market entry has effectively stopped; growth now comes from absorbing adjacent categories, not new customers.',
          dossier: [
            {
              label: 'Position on the cycle',
              text: 'Final “dominate” phase — two-thirds of the market is held by three companies and nobody meaningfully enters anymore.',
            },
          ],
        },
        {
          name: 'Microsoft Azure',
          tag: 'CONSOLIDATOR',
          role: 'A proven consolidator (MSFT) whose platform compounds with every absorbed category.',
          anchor: '~23% of global cloud spend',
          keyRisk:
            'The conglomerate discount — integration complexity destroying the synergies an acquirer paid for.',
          dossier: [
            {
              label: 'Why it is a consolidator',
              text: 'Named among the proven consolidators whose scale funds the next deal.',
            },
          ],
        },
        {
          name: 'Google Cloud',
          tag: 'CONSOLIDATOR',
          role: 'Alphabet (GOOGL) — closed the largest pure-cybersecurity deal ever, bolting Wiz onto cloud security.',
          anchor: '~13% of global cloud spend',
          keyRisk: 'Antitrust scrutiny of large platform acquisitions (FTC / DOJ).',
          dossier: [
            {
              label: 'Latest absorption',
              text: "Google's $32B Wiz acquisition closed March 11, 2026 — Alphabet's largest ever.",
            },
          ],
        },
        {
          name: 'All others',
          tag: 'THE LONG TAIL',
          role: 'The fragmented remainder outside the top three.',
          anchor: '~34% of global cloud spend',
          keyRisk:
            'The losing middle — sub-scale vendors with neither platform gravity nor acquisition scarcity.',
          dossier: [
            {
              label: 'Where value leaks',
              text: 'Independent mid-size vendors quietly lose relevance as the market concentrates.',
            },
          ],
        },
      ],
    },

    { type: 'heading', text: 'A 1981 short story called the endgame', level: 2 },
    {
      type: 'paragraph',
      text: 'Gibson’s courier makes his living because the most sensitive corporate data cannot risk network transmission — it travels physically, locked behind a password its carrier cannot read, in hardware the carrier cannot access. Strip the chrome and that is a thesis about where value concentrates: not in compute, which commoditizes, but in proprietary data and in control over how it moves. Forty-five years later that is precisely what acquirers are paying for. As Ezana’s companion analysis of 2026’s deal map argued, the buyers of this cycle are not purchasing algorithms — models reset every few months — they are purchasing [[kw:workflow-lock-in]]workflow positions[[/kw]] and the proprietary data flowing through them. The cargo, not the courier, is the asset.',
    },
    {
      type: 'paragraph',
      text: 'The story’s power structure maps just as cleanly. Its dominant organization enforces a data monopoly with vertically integrated ruthlessness — the consolidated incumbent for whom any leaked dataset is an existential threat. Its most memorable character, Jones, is a cybernetically enhanced ex-Navy dolphin built for one job — cracking encrypted systems — then discarded when his platform moved on, kept compliant by an addiction his handlers engineered. Jones is the fate of the point solution: purpose-built, best-in-class at a single task, and decommissioned the moment the platform that funded him consolidated its stack. And the Lo Teks — the story’s off-grid resisters who opt out of the dominant infrastructure entirely — are the permanent minority who keep running fragmented stacks after the market has moved. Gibson’s ending is the sharpest signal of all: the courier’s durable business, once free, is built on the accumulated residue of every dataset he ever carried. The data exhaust outlives every deal.',
    },
    {
      type: 'adjudication-matrix',
      figureLabel: 'FIG. 3 · THE 1981 CAST, ADJUDICATED',
      kicker:
        'GIBSON’S CAST × THE THREE FATES OF A CONSOLIDATING MARKET · SAME = THE STORY ASSIGNS THIS FATE · PART = PARTIALLY · CLICK A CELL FOR THE EVIDENCE.',
      hint: 'Click a cell for the evidence.',
      source: 'William Gibson, "Johnny Mnemonic" (Omni, May 1981) · this article’s reading.',
      cols: ['Consolidates the board', 'Absorbed by a platform', 'Persists at the margins'],
      rows: [
        {
          label: 'The dominant organization',
          cells: [
            {
              value: 'same',
              note: 'Enforces a data monopoly with vertically integrated ruthlessness: the consolidated incumbent for whom any leaked dataset is an existential threat.',
            },
            { value: 'none' },
            { value: 'none' },
          ],
        },
        {
          label: 'Jones, the dolphin',
          cells: [
            { value: 'none' },
            {
              value: 'same',
              note: 'Purpose-built, best-in-class at a single task, and decommissioned the moment the platform that funded him consolidated its stack: the fate of the point solution.',
            },
            { value: 'none' },
          ],
        },
        {
          label: 'The Lo Teks',
          cells: [
            { value: 'none' },
            { value: 'none' },
            {
              value: 'same',
              note: 'The off-grid resisters who opt out of the dominant infrastructure entirely: the permanent minority who keep running fragmented stacks after the market has moved.',
            },
          ],
        },
        {
          label: 'The courier',
          cells: [
            {
              value: 'part',
              note: 'His durable business, once free, is built on the accumulated residue of every dataset he ever carried: the data exhaust outlives every deal.',
            },
            { value: 'none' },
            {
              value: 'same',
              note: 'Ends the story independent, monetizing accumulated data rather than being absorbed by the incumbent that hunts him.',
            },
          ],
        },
      ],
    },
    {
      type: 'callout',
      label: 'Security vendor consolidation',
      value: '~75%',
      context:
        'Share of organizations actively pursuing security vendor consolidation in 2026, up from under a third in 2020 — the fastest phase transition in enterprise software. Source: Gartner.',
    },

    {
      type: 'heading',
      text: 'Security is the template: from 45 tools to three platforms',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'No sector demonstrates the cycle more completely than cybersecurity. Every new threat class of the 2010s spawned a product category — firewalls, EDR, SIEM, CASB, DLP — and every category spawned dozens of vendors. A Gartner survey of 162 large enterprises found an average of roughly 45 security tools per organization, with practitioner estimates running to 76 or more at large enterprises, and 52% of executives cite complexity — not budget — as the biggest barrier to effective security operations. Customers stopped wanting more consoles, and the platforms responded the way consolidators always do: by acquiring the categories they lacked, integrating what used to be separate products, and stripping the redundancy out.',
    },
    {
      type: 'paragraph',
      text: 'The receipts are on the tape. Google closed its $32 billion acquisition of Wiz on March 11, 2026 — the largest pure-cybersecurity deal ever and Alphabet’s largest acquisition, after Wiz rejected a $23 billion offer in 2024. Palo Alto Networks closed its $25 billion purchase of identity leader CyberArk on February 11, 2026, bolting privileged access onto a platform that already spanned network and cloud security. Cisco’s $28 billion Splunk deal (2024) folded the SIEM category into a networking incumbent. Four of the twenty largest tech acquisitions of the past decade are now cybersecurity deals, and [[kw:platformization]]platformization[[/kw]] — the strategy of collapsing point categories into one integrated platform — has become the sector’s organizing logic. For the mid-size vendor, the four-phase cycle has reached its binary: survive or sell.',
    },
    {
      type: 'wall-timeline',
      figureLabel: 'FIG. 4 · THE CONSOLIDATION CHRONOLOGY',
      kicker:
        'SECURITY & DATA-INFRASTRUCTURE DEALS, 2024–2026 · ONE PLAQUE PER DATED DEAL — CLICK ANY PLAQUE FOR THE RECORD.',
      hint: 'Click a plaque for its record.',
      source: 'company statements, SEC filings, public reporting, 2024–2026.',
      startYear: 2024,
      endYear: 2026,
      windows: [],
      plaques: [
        {
          year: 2024,
          lane: 0,
          label: 'Cisco → Splunk · $28B',
          detail: "Cisco's $28B Splunk deal folds the SIEM category into a networking incumbent.",
        },
        {
          year: 2024,
          lane: 1,
          label: 'Wiz rejects $23B',
          detail:
            "Wiz rejects Google's $23B offer — a year before accepting $32B, a 39% premium for waiting.",
        },
        {
          year: 2025,
          lane: 2,
          label: 'Nvidia → Groq assets · $20B',
          detail:
            "Nvidia pays a reported $20B for a license to Groq's inference technology and assets while hiring away its leadership — a disguised-merger structure.",
        },
        {
          year: 2026,
          lane: 3,
          label: 'Palo Alto → CyberArk · $25B',
          detail:
            'Palo Alto Networks closes its $25B purchase of CyberArk on Feb 11, bolting privileged access onto the platform.',
        },
        {
          year: 2026,
          lane: 4,
          label: 'Google → Wiz · $32B',
          detail:
            'Google closes its $32B Wiz acquisition on Mar 11 — the largest pure-cybersecurity deal ever and Alphabet’s largest.',
        },
        {
          year: 2026,
          lane: 5,
          label: 'IBM → Confluent · $11B',
          detail:
            'IBM completes its $11B all-cash Confluent acquisition on Mar 17 — real-time data movement for enterprise AI.',
        },
      ],
    },
    { type: 'heading', text: 'Buying the pipeline: data is the cargo', level: 2 },
    {
      type: 'paragraph',
      text: 'The same logic is consolidating the data layer itself. IBM completed its $11 billion all-cash acquisition of Confluent on March 17, 2026 — $31 per share for the data-streaming platform built on Apache Kafka, used by more than 6,500 enterprises including 40% of the Fortune 500. IBM’s stated rationale was not Confluent’s revenue; it was real-time data movement for enterprise AI — models and agents acting on live operational data rather than stale extracts. That is the Gibson thesis stated as a press release: the value is in controlling how proprietary data moves. On the demand side, enterprises are consolidating their own stacks in parallel — average SaaS portfolios have contracted from roughly 130 applications toward about 106, per SaaS-management vendor data, compressing hundreds of point vendors into a shrinking set of platform relationships.',
    },
    {
      type: 'revision-ledger',
      figureLabel: 'FIG. 5 · THE PHASE TRANSITION, MEASURED',
      kicker:
        'THREE CONSOLIDATION DIALS, EARLIER READING VS. LATEST · SHARED LINEAR SCALE · CLICK A ROW FOR THE RECORD.',
      hint: 'Each row pairs the earlier reading with the 2025-26 reading.',
      source:
        'Gartner (security consolidation) · deal data cited in this article (AI share) · SaaS-management vendor data (portfolio size).',
      scale: 'linear',
      unit: '',
      rows: [
        {
          label: 'Orgs consolidating security vendors',
          before: 33,
          after: 75,
          beforeDisplay: '<33% (2020)',
          afterDisplay: '~75% (2026)',
          delta: 42,
          deltaDisplay: '+42 pts',
          favorable: 'up',
          record:
            'Roughly 75% of organizations are actively pursuing security vendor consolidation in 2026, up from under a third in 2020 (Gartner): the fastest phase transition in enterprise software.',
        },
        {
          label: 'Tech deals with an AI component',
          before: 25,
          after: 50,
          beforeDisplay: '~25% (2024)',
          afterDisplay: '~50% (2025)',
          delta: 25,
          deltaDisplay: '+25 pts',
          favorable: 'up',
          record:
            'Nearly half of 2025’s technology deals carried an explicit AI component, roughly double the 2024 share. AI is the accelerant of the consolidation phase.',
        },
        {
          label: 'Average enterprise SaaS portfolio',
          before: 130,
          after: 106,
          beforeDisplay: '~130 apps',
          afterDisplay: '~106 apps',
          delta: -24,
          deltaDisplay: '-24 apps',
          favorable: 'up',
          record:
            'Average SaaS portfolios have contracted from roughly 130 applications toward about 106, per SaaS-management vendor data: hundreds of point vendors compressing into a shrinking set of platform relationships.',
        },
      ],
      verdict:
        'Every dial points the same direction: the demand side and the deal tape are consolidating at once.',
    },
    {
      type: 'paragraph',
      text: 'AI is the accelerant. Nearly half of 2025’s technology deals carried an explicit AI component, roughly double the 2024 share, and 2025 tech M&A jumped 77% year over year to approximately $1.08 trillion. Forty-seven transactions above $10 billion closed in the first half of 2026 alone, totaling more than $1.3 trillion — nearly half of all global deal value concentrated in mega-deals. Boards are not buying experiments; they are buying the infrastructure positions the AI era makes scarce, at exactly the moment an easier US regulatory posture makes long-deferred deals executable.',
    },
    { type: 'heading', text: 'Mergers in disguise: consolidation without acquisition', level: 2 },
    {
      type: 'paragraph',
      text: 'The cycle’s newest adaptation is consolidation structured to avoid the word "merger." In December 2025, Nvidia paid a reported $20 billion for a license to Groq’s inference technology and assets while hiring away senior leadership — Groq nominally remains independent and has since sought new funding, but the inference-chip challenger’s crown jewels now sit inside the incumbent. Senators Elizabeth Warren and Richard Blumenthal characterized the structure as a potential reverse acquihire warranting DOJ and FTC review, and the FTC said in January 2026 it would examine a wider pattern of such arrangements across the industry. Whatever regulators conclude, the market lesson stands: when a sector reaches its consolidation phase, the consolidation finds a structure — [[kw:reverse-acquihire]]reverse acquihires[[/kw]], asset licenses, take-privates — even where a conventional acquisition would be blocked.',
    },
    {
      type: 'stage-boards',
      figureLabel: 'FIG. 6 · FOUR MARKETS, ONE CYCLE',
      kicker:
        'WHERE EACH MARKET SITS ON THE FOUR-PHASE CYCLE · FILLED CELL = CURRENT PHASE · CLICK A STAGE FOR ITS RECORD.',
      hint: 'Click a stage cell for its record.',
      source:
        'Synergy Research Group · Gartner · company statements and public reporting cited in this article.',
      boards: [
        {
          id: 'cloud',
          title: 'Cloud infrastructure',
          color: 'var(--echo-chart-red)',
          currentIndex: 3,
          stages: [
            {
              label: 'Open',
              sub: 'pioneers multiply',
              note: 'Barriers are low, categories are new, and being first matters more than being big. Cloud passed through this phase more than a decade ago.',
            },
            {
              label: 'Scale',
              sub: 'capital decides',
              note: 'The companies that raise, partner, and win share pull away from the ones that merely invented something.',
            },
            {
              label: 'Consolidate',
              sub: 'platforms absorb',
              note: 'Large companies buy medium ones, and every founder faces the same binary: survive independently or sell.',
            },
            {
              label: 'Dominate',
              sub: 'a few own the board',
              note: 'AWS ~30%, Azure ~23%, Google Cloud ~13%: two thirds of the market held by three companies, and nobody meaningfully enters anymore (Synergy Research Group).',
            },
          ],
          stats: [
            {
              value: '~66%',
              label: 'held by the top three platforms',
              source: 'SYNERGY RESEARCH GROUP',
            },
          ],
          summary:
            'The phase transition is complete: growth now comes from absorbing adjacent categories, not new entrants.',
        },
        {
          id: 'security',
          title: 'Cybersecurity',
          color: 'var(--echo-chart-orange)',
          currentIndex: 2,
          stages: [
            {
              label: 'Open',
              sub: 'a category per threat',
              note: 'Every new threat class of the 2010s spawned a product category: firewalls, EDR, SIEM, CASB, DLP.',
            },
            {
              label: 'Scale',
              sub: 'dozens of vendors',
              note: 'Every category spawned dozens of vendors, stacking to an average of roughly 45 security tools per organization (Gartner).',
            },
            {
              label: 'Consolidate',
              sub: 'platformization',
              note: 'Google closes Wiz at $32B, Palo Alto closes CyberArk at $25B, Cisco folds in Splunk at $28B: platformization is now the sector’s organizing logic.',
            },
            {
              label: 'Dominate',
              sub: 'not yet',
              note: 'Not reached yet: four of the twenty largest tech acquisitions of the past decade are now cybersecurity deals, and the board is still consolidating.',
            },
          ],
          stats: [{ value: '~75%', label: 'orgs consolidating vendors', source: 'GARTNER' }],
          summary: 'For the mid-size vendor the cycle has reached its binary: survive or sell.',
        },
        {
          id: 'data',
          title: 'Data infrastructure',
          color: 'var(--echo-chart-blue)',
          currentIndex: 2,
          stages: [
            {
              label: 'Open',
              sub: 'point tools multiply',
              note: 'The 2010s data stack multiplied point tools the same way security did, category by category.',
            },
            {
              label: 'Scale',
              sub: 'platforms emerge',
              note: 'Confluent scaled Apache Kafka into a platform used by more than 6,500 enterprises, including 40% of the Fortune 500.',
            },
            {
              label: 'Consolidate',
              sub: 'incumbents buy in',
              note: 'IBM completes its $11B all-cash Confluent acquisition on March 17, 2026: real-time data movement for enterprise AI.',
            },
            {
              label: 'Dominate',
              sub: 'not yet',
              note: 'Not reached yet: enterprises are still compressing hundreds of point vendors into a shrinking set of platform relationships.',
            },
          ],
          stats: [
            {
              value: '130 → 106',
              label: 'avg SaaS apps per enterprise',
              source: 'SAAS-MANAGEMENT VENDOR DATA',
            },
          ],
          summary:
            'The demand side is consolidating in parallel: average SaaS portfolios have contracted from roughly 130 applications toward about 106.',
        },
        {
          id: 'inference',
          title: 'AI inference chips',
          color: 'var(--echo-chart-purple)',
          currentIndex: 2,
          stages: [
            {
              label: 'Open',
              sub: 'challengers appear',
              note: 'Challengers like Groq built purpose-built inference silicon against the incumbent GPU stack.',
            },
            {
              label: 'Scale',
              sub: 'AI funds the field',
              note: 'The AI buildout funded the challengers: nearly half of 2025’s technology deals carried an explicit AI component.',
            },
            {
              label: 'Consolidate',
              sub: 'disguised structures',
              note: 'Nvidia pays a reported $20B for a license to Groq’s inference technology and assets while hiring away senior leadership: consolidation structured to avoid the word merger.',
            },
            {
              label: 'Dominate',
              sub: 'contested',
              note: 'Not reached yet, and contested: the FTC said in January 2026 it would examine the wider pattern of such arrangements across the industry.',
            },
          ],
          stats: [
            {
              value: '$20B',
              label: 'reported Groq license + assets',
              source: 'PUBLIC REPORTING, DEC 2025',
            },
          ],
          summary:
            'When a sector reaches its consolidation phase, the consolidation finds a structure: reverse acquihires, asset licenses, take-privates.',
        },
      ],
    },
    {
      type: 'quote',
      text: 'We plan to integrate Groq’s low-latency processors into the NVIDIA AI factory architecture.',
      source: 'Jensen Huang, Nvidia, December 2025',
    },

    { type: 'heading', text: 'Positioning: own the consolidators, price the targets', level: 2 },
    {
      type: 'paragraph',
      text: 'The cycle implies a two-sided trade. On one side sit the proven consolidators — Microsoft (MSFT), Alphabet (GOOGL), Nvidia (NVDA), Palo Alto Networks (PANW), Cisco (CSCO), IBM (IBM), Broadcom (AVGO) — companies whose platforms compound with every absorbed category and whose scale funds the next deal. On the other side sit the remaining independent leaders in consolidating categories — names like CrowdStrike (CRWD) in endpoint — where the question is whether standalone execution or an acquisition premium delivers the return. The Wiz precedent is instructive: rejecting $23 billion and accepting $32 billion a year later was a 39% premium for waiting. The losing position is the middle: sub-scale vendors in consolidating categories with neither platform gravity nor acquisition scarcity.',
    },
    {
      type: 'scenario-chain',
      figureLabel: 'FIG. 7 · BASE CASE AND BEAR TRIGGERS',
      kicker:
        'ONE BASE CASE, TWO BEAR TRIGGERS · EACH CHAIN MULTIPLIES ITS CONDITIONS INTO AN OUTCOME.',
      hint: 'Read each chain left to right.',
      source: 'Bain full-year 2026 projection · FTC statements · this article’s reporting.',
      scenarios: [
        {
          id: 'base',
          label: 'BASE CASE · THE WAVE RUNS THROUGH 2027',
          tone: 'base',
          range: '>$5.3T',
          steps: [
            { label: 'AI capability gaps', sub: 'cannot be built organically fast enough' },
            { label: 'Easier US regulatory posture', sub: 'long-deferred deals become executable' },
            { label: 'Platforms keep absorbing', sub: 'each deal funds the next' },
          ],
          result: {
            value: 'Full-year 2026 global M&A above $5.3 trillion',
            sub: 'Bain projection, just shy of the all-time record',
          },
        },
        {
          id: 'bear-enforcement',
          label: 'BEAR TRIGGER 1 · ENFORCEMENT REVERSAL',
          tone: 'bear',
          range: 'binary',
          steps: [
            { label: 'FTC pattern review', sub: 'announced January 2026' },
            { label: 'Reaches disguised structures', sub: 'reverse acquihires, asset licenses' },
          ],
          result: {
            value: 'The consolidation phase stalls',
            sub: 'license-and-hire structures stop clearing',
          },
        },
        {
          id: 'bear-conglomerate',
          label: 'BEAR TRIGGER 2 · THE CONGLOMERATE DISCOUNT',
          tone: 'bear',
          range: 'per-acquirer',
          steps: [
            { label: 'Integration complexity', sub: 'absorbed categories fail to mesh' },
            { label: 'Synergies destroyed', sub: 'the acquirer paid for value it cannot realize' },
          ],
          result: {
            value: 'Consolidators reprice',
            sub: 'the two-sided trade loses its long side',
          },
        },
      ],
      killSwitch:
        'An enforcement reversal that reaches disguised-merger structures: the FTC said in January 2026 it would examine the wider pattern.',
    },
    {
      type: 'paragraph',
      text: 'The base case is that the wave runs through 2027: Bain projects full-year 2026 global M&A above $5.3 trillion, just shy of the all-time record, and the strategic pressure driving it — AI capability gaps that cannot be built organically fast enough — is intensifying, not fading. The bear case has two triggers: an enforcement reversal that reaches disguised-merger structures, and the conglomerate discount — acquirers whose integration complexity destroys the synergies they paid for. Gibson’s closing image is the tiebreaker worth remembering. After every courier run, what endured was the accumulated data. Investors can track the acquirers’ accumulation in the open: Ezana’s government-contracts, congressional-trading, and 13F datasets show who is buying, who is lobbying, and who is positioning around every deal on this page — the cross-dataset joins are where the next consolidation target shows up first.',
    },
  ],
  globeRail: {
    metric: {
      title: 'ORGS CONSOLIDATING SECURITY VENDORS',
      data: [
        { x: 2020, y: 33 },
        { x: 2026, y: 75 },
      ],
      startLabel: '2020 · <33%',
      endLabel: '2026 · ~75%',
      note: 'Gartner · the fastest phase transition in enterprise software',
    },
    cities: [
      {
        name: 'San Francisco',
        country: 'US',
        lat: 37.77,
        lng: -122.42,
        impact:
          'The Bay Area platform consolidators drive the wave — Google closing its $32B Wiz deal, Nvidia paying a reported $20B for Groq’s inference assets, Palo Alto Networks buying CyberArk for $25B. These are the proven consolidators whose scale funds the next deal.',
      },
      {
        name: 'Seattle',
        country: 'US',
        lat: 47.61,
        lng: -122.33,
        impact:
          'The cloud endgame is anchored here: Amazon Web Services (~30% of global cloud spend) and Microsoft Azure (~23%) hold two-thirds of the market with Google — the clearest picture of what the cycle’s final "dominate" phase looks like.',
      },
      {
        name: 'New York',
        country: 'US',
        lat: 40.71,
        lng: -74.0,
        impact:
          'IBM’s $11B all-cash Confluent acquisition — $31 per share for the Kafka-based platform used by 6,500+ enterprises — extends the same logic to the data layer: the value is in controlling how proprietary data moves.',
      },
      {
        name: 'Tel Aviv',
        country: 'Israel',
        lat: 32.08,
        lng: 34.78,
        impact:
          'Home to the cycle’s two largest cybersecurity targets — Wiz, bought by Google for $32B (the largest pure-cyber deal ever), and CyberArk, taken by Palo Alto for $25B — the sharp end of security’s "from 45 tools to three platforms" consolidation.',
      },
    ],
  },
  author: 'Ezana Finance Editorial',
  category: 'tech-founders',
  subcategory: 'AI',
  meta: {
    sectors: ['Information Technology'],
    industries: ['Software', 'Semiconductors', 'Cybersecurity'],
    investors: ['Elon Musk'],
    institutions: ['Nvidia', 'Alphabet', 'Palo Alto Networks', 'IBM', 'Broadcom'],
    government: ['FTC', 'DOJ'],
    geos: ['United States'],
    assetClasses: ['Equities'],
    themes: ['Consolidation', 'Platformization', 'Reverse Acquihire'],
    datasets: ['SEC filings', 'Lobbying'],
    markets: [{ label: 'FTC challenges a reverse-acquihire in 2026', source: 'Kalshi' }],
  },
  tickers: ['NVDA', 'GOOGL', 'MSFT', 'IBM', 'PANW', 'CSCO', 'CRWD', 'AVGO'],
  readTime: 10,
  publishedAt: '2026-08-02',
  featured: true,
  likes: 0,
  comments: 0,
  reads: 0,
  listMeta: '2 Aug 2026',
};
