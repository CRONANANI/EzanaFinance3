/**
 * Long-form Ezana Echo article: the FDA PCAC advisory-committee vote to recommend
 * BPC-157 (and other peptides) for the 503A compounding Bulks List, and the ~13%
 * move it produced in Hims & Hers.
 *
 * SOURCING NOTE: Facts verified July 23–24, 2026 against Time, RAPS, CNN, STAT,
 * The Hill, ABC, Benzinga, Reuters (via WHBL), CBS and Seeking Alpha. The PCAC
 * meeting was still in session when this was written (Friday's votes on MOTS-c,
 * emideltide, epitalon and semax were pending). The committee recommendation is
 * ADVISORY AND NON-BINDING; the FDA is not obliged to follow it, and any change
 * would require notice-and-comment rulemaking. Nothing here is investment advice.
 * Re-verify against the primary record before treating any figure as current.
 */
export const fdaPeptidesBpc157Article2026 = {
  id: 'fda-peptides-bpc157-compounding-vote-2026',
  title:
    'An 8–6 Vote on a Peptide Nobody Can Define: Inside the FDA Panel That Moved Hims & Hers 13%',
  excerpt:
    'An FDA advisory committee voted 8–6 to recommend BPC-157 for the 503A compounding list — over the objection of the agency’s own scientists, who said the peptide is not well-characterized and has been tested in roughly 30 humans. The vote is non-binding. Hims & Hers rose as much as 13%.',
  heroImage: {
    src: '/congress-chamber.jpg',
    alt: 'A federal government chamber, standing in for the FDA advisory-committee proceedings',
    caption:
      'An FDA advisory committee voted 8–6, with one abstention, to recommend BPC-157 for the 503A Bulks List. The recommendation is advisory only and binds no one.',
  },
  contentBlocks: [
    {
      type: 'paragraph',
      text: 'On July 23, 2026, a Food and Drug Administration advisory committee voted 8 to 6, with one abstention, to recommend that the peptide BPC-157 be added to the list of bulk substances that compounding pharmacies may use. The reaction was immediate and out of all proportion to what actually happened: Hims & Hers, the telehealth company that has built a peptide manufacturing capability, rose as much as 13% on the day and closed up roughly 10%. What the panel did was narrow, procedural, contested, and non-binding — it recommended a substance for further consideration, over the explicit objection of the FDA’s own scientists. What the market did was price a win. The distance between those two things is the entire story.',
    },
    {
      type: 'stat-grid',
      stats: [
        { label: 'Committee vote', value: '8–6', change: 'One abstention · advisory only' },
        {
          label: 'Humans tested (BPC-157)',
          value: '~30',
          change: 'vs. 100,000s for approved GLP-1s',
        },
        { label: 'HIMS intraday move', value: '+13%', change: 'Closed up ~10%' },
        { label: 'Estimated market', value: '$2.2–3.3B', change: 'Leerink / Needham' },
      ],
    },
    {
      type: 'heading',
      text: 'What the committee actually voted on',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'The vote concerned the [[kw:503a-bulks-list]]503A Bulks List[[/kw]] — the roster of bulk drug substances that a compounding pharmacy is permitted to combine into a patient-specific preparation. Inclusion on that list is not an approval. It does not certify that BPC-157 is safe, that it is effective, or that it works for anything in particular. It permits a compounder, holding a prescription, to make a preparation using the substance. The committee reviewed BPC-157 specifically for ulcerative colitis — an inflammatory bowel condition — not for the general injury-recovery and “healing” uses under which it is marketed to the public. That distinction is doing a great deal of work that the market reaction ignored.',
    },
    {
      type: 'paragraph',
      text: 'It matters because [[kw:compounding-pharmacy]]compounded drugs[[/kw]] occupy a deliberately narrow lane. They exist so a pharmacist can tailor a medication a patient genuinely cannot get in an approved form — a different dose, without an allergen, in a swallowable formulation. They are not reviewed by the FDA for quality, safety, or efficacy the way an approved drug is, and they are not supposed to be a parallel route to market for substances that could not clear the approval bar on their own. The panel’s recommendation would widen that lane for BPC-157; it would not convert the peptide into an approved therapy.',
    },
    {
      type: 'paragraph',
      text: 'And the panel is exactly that — a panel. Its recommendation is advisory. The FDA convenes an [[kw:advisory-committee]]advisory committee[[/kw]] to hear outside expertise, but it is not bound by the result, and here the agency’s own staff had already recommended against every substance on the docket. For the recommendation to change anything, the FDA would have to accept it and then move it through a formal, months-to-years rulemaking process. On July 23 none of that had begun. The committee also recommended KPV (8–6) and TB-500 (8–6), and MOTS-c passed 7–5 with two abstentions; Friday’s votes on emideltide, epitalon and semax were still pending when trading closed.',
    },
    {
      type: 'dossier-table',
      figureLabel: 'FIG. 1 · HOW NARROWLY EACH PEPTIDE CLEARED',
      kicker:
        'FOUR PEPTIDES RECOMMENDED JULY 23 · YES VOTES AS A SHARE OF VOTES CAST, ABSTENTIONS EXCLUDED · CLICK A ROW FOR THE RECORD.',
      hint: 'Four peptides — expand a row for the record.',
      source:
        'Yes votes as a share of votes cast (abstentions excluded), by peptide. Raw tallies: BPC-157, KPV and TB-500 each passed 8–6 with one abstention; MOTS-c passed 7–5 with two abstentions. Friday’s votes on emideltide, epitalon and semax were still pending at publication. Every one cleared by a thin margin. Source: FDA Pharmacy Compounding Advisory Committee meeting, July 23, 2026.',
      headers: ['Peptide', 'What the panel did', 'Clearance margin', 'Key objection', ''],
      rows: [
        {
          name: 'BPC-157',
          tag: 'UC INDICATION',
          role: 'Recommended for the 503A Bulks List specifically for ulcerative colitis, over the explicit objection of the FDA’s own scientists.',
          anchor: '57.1% of votes cast · 8–6, one abstention',
          keyRisk:
            '“Not well-characterized” — multiple molecules are marketed under the same name; tested in roughly 30 humans.',
          dossier: [
            {
              label: 'Evidentiary base',
              text: 'The only ulcerative-colitis trial FDA reviewers could locate was a conference abstract describing 46 people — dosed by enema, not the injection under which BPC-157 is sold.',
            },
            {
              label: 'Safety signal',
              text: 'The agency noted three adverse-event reports following BPC-157 injection; adverse events for compounded and consumer-sold products are heavily under-reported.',
            },
          ],
        },
        {
          name: 'KPV',
          tag: 'RECOMMENDED',
          role: 'Recommended to the 503A Bulks List on the same day, by the same thin margin.',
          anchor: '57.1% of votes cast · 8–6, one abstention',
          keyRisk: 'FDA staff recommended against all seven peptides on the docket.',
          dossier: [
            {
              label: 'Margin',
              text: 'Passed 8–6 with one abstention — 57.1% of votes cast in favor.',
            },
          ],
        },
        {
          name: 'TB-500',
          tag: 'RECOMMENDED',
          role: 'Recommended alongside BPC-157 and KPV, on the identical 8–6 count.',
          anchor: '57.1% of votes cast · 8–6, one abstention',
          keyRisk: 'FDA staff recommended against all seven peptides on the docket.',
          dossier: [
            {
              label: 'Margin',
              text: 'Passed 8–6 with one abstention — 57.1% of votes cast in favor.',
            },
          ],
        },
        {
          name: 'MOTS-c',
          tag: 'NARROWEST BASE',
          role: 'Recommended on the fewest votes cast of the four, with two members abstaining.',
          anchor: '58.3% of votes cast · 7–5, two abstentions',
          keyRisk: 'FDA staff recommended against all seven peptides on the docket.',
          dossier: [
            {
              label: 'Margin',
              text: 'Passed 7–5 with two abstentions — 58.3% of votes cast in favor, the highest share but the smallest vote base.',
            },
          ],
        },
      ],
    },
    {
      type: 'heading',
      text: 'The agency versus its own advisers',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'The most striking feature of the meeting is that the FDA’s scientists lost a vote they had argued to win. Agency staff recommended against all seven peptides. On [[kw:bpc-157]]BPC-157[[/kw]] specifically, the only ulcerative-colitis trial FDA reviewers could locate was a conference meeting abstract describing 46 people — and in that study the substance was administered as an enema, not by the injection under which BPC-157 is actually sold and used. A 46-person abstract for a different route of administration is the evidentiary foundation under an 8–6 recommendation.',
    },
    {
      type: 'paragraph',
      text: 'The deeper objection was that no one could say with confidence what the substance is. FDA’s Russell Wesdyk asked, on the record, “What is BPC-157?” — and FDA’s Mai Tu described it as “not well-characterized.” This is not rhetorical. Multiple different active molecules are marketed under the “BPC-157” name, which means a [[kw:peptide-therapeutics]]peptide therapeutic[[/kw]] approved in one form could differ materially from what a pharmacy compounds or a consumer buys. Characterization — knowing precisely which molecule you have, at what purity — is the floor beneath any safety or efficacy claim, and the FDA’s position was that the floor is missing.',
    },
    {
      type: 'paragraph',
      text: 'On the safety side, the agency noted three [[kw:adverse-event-reporting]]adverse event reports[[/kw]] it had received following BPC-157 injection. Three is a small number, and it should be read carefully in both directions: it is not evidence of a widespread harm, but adverse events for compounded and consumer-sold products are heavily under-reported, so a low count is a weak reassurance rather than a clean bill of health. BPC-157 has been tested in roughly 30 humans, by CBS’s count — against the hundreds of thousands who took the GLP-1 drugs before those reached the market. The panel voted on a substance that is, by the agency’s own account, barely studied and imperfectly defined.',
    },
    {
      type: 'paragraph',
      text: 'The committee’s composition drew its own scrutiny. The FDA seated eight temporary voting members for the session, and of the fourteen voting members, seven operate or work for clinics or businesses that sell peptide treatments. That does not by itself invalidate anyone’s judgment, but it is the kind of arrangement that makes a narrow 8–6 result harder to read as a disinterested scientific consensus. The vote arrived amid intense popular demand — more than 50 million “BPC-157” video views on each of YouTube and TikTok, and peptide subreddits with over 100,000 members — and was widely framed as a political win for Health and Human Services Secretary Robert F. Kennedy Jr.',
    },
    {
      type: 'wall-timeline',
      figureLabel: 'FIG. 2 · THE PROCESS, IN DATES',
      kicker:
        'FDA PCAC PEPTIDE REVIEW · 2025 – JULY 2026 · SAME-DAY JULY 23 VOTES SEPARATED BY LANE, FRACTIONAL-YEAR AXIS. CLICK ANY PLAQUE FOR THE RECORD.',
      hint: 'Click a plaque for its record.',
      source:
        'FDA Pharmacy Compounding Advisory Committee meeting, July 23, 2026; company statements.',
      startYear: 2025,
      endYear: 2027,
      windows: [],
      plaques: [
        {
          year: 2025,
          lane: 0,
          label: 'Hims acquires a CA peptide plant',
          detail:
            'Hims & Hers acquires a California peptide manufacturing facility, adding compounding capacity to an existing prescriber network.',
        },
        {
          year: 2026.56,
          lane: 1,
          label: 'Jul 23 · FDA staff recommend against all seven',
          detail:
            'Agency scientists recommend against every peptide on the docket, citing weak characterization and thin human data.',
        },
        {
          year: 2026.56,
          lane: 2,
          label: 'Jul 23 · BPC-157, KPV, TB-500 each 8–6',
          detail:
            'The panel recommends three peptides for the 503A Bulks List, each 8–6 with one abstention, over staff objection.',
        },
        {
          year: 2026.56,
          lane: 3,
          label: 'Jul 23 · MOTS-c 7–5',
          detail:
            'MOTS-c passes 7–5 with two abstentions — the narrowest vote base of the four recommended.',
        },
        {
          year: 2026.562,
          lane: 4,
          label: 'Jul 24 · emideltide, epitalon, semax pending',
          detail:
            'Friday’s votes on emideltide, epitalon and semax were still pending when trading closed.',
        },
      ],
    },
    {
      type: 'quote',
      text: 'I’m concerned that we’re responding to a market-induced demand rather than a decision based in solid science.',
      source: 'Dr. Elizabeth Rebello, PCAC meeting, July 23, 2026',
    },
    {
      type: 'callout',
      label: 'The evidence gap in one line',
      value: '46 → 30',
      context:
        'A 46-person meeting abstract for enema-administered BPC-157, and roughly 30 humans ever tested with the substance at all, sit beneath an 8–6 recommendation to widen access to the injectable form the abstract did not study.',
    },
    {
      type: 'heading',
      text: 'Who stands to benefit — and the argument against each',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'Exposure to this decision is real but tiered, and every tier carries its own counter-argument. The most direct exposure sits with the telehealth platforms that both prescribe and compound. Hims & Hers (HIMS) is the clearest case: it acquired a California peptide manufacturing facility in 2025, operates an existing prescriber network, and has a subscriber base already conditioned to subscription peptides through GLP-1s. Its chief medical officer, Anant Vinjamoori, testified in support. That is the highest torque to the outcome — and also the most concentrated regulatory risk. The company is already down roughly 44% from a year ago, and its compounded-GLP-1 business was previously curtailed by regulators: the same agency, through the same compounding mechanism now being widened. The bull and bear case run through the identical door.',
    },
    {
      type: 'paragraph',
      text: 'Behind the platforms sits the infrastructure tier — the 503A and 503B compounders, sterile-injectable capacity, peptide API synthesis, and cold-chain fill-finish that any at-scale compounded-peptide market would require. If a category like this becomes legally compoundable in volume, the binding constraint shifts from the prescription to manufacturing capacity and quality control — which is precisely what the FDA’s staff said does not yet exist for these substances. That is less a growth story than a bottleneck: the same missing characterization and quality standards that troubled the agency are what a scaled market would have to build first.',
    },
    {
      type: 'paragraph',
      text: 'Retail pharmacy and pharmacy-benefit adjacency — Walgreens (WBA), CVS — is a further tier out, and the exposure is genuinely diluted. Compounded peptides are largely [[kw:cash-pay-healthcare]]cash-pay[[/kw]], sitting outside the insurance and rebate rails these businesses actually monetize. A cash-pay category can grow briskly without touching the economics that drive a PBM. Treating a WBA or CVS as a clean way to play this vote confuses proximity with participation.',
    },
    {
      type: 'paragraph',
      text: 'Finally there are the incumbents this pressures rather than helps — Eli Lilly (LLY) and Novo Nordisk (NVO). Compounded peptides competing with branded metabolic and recovery franchises is a margin-and-channel question, not an existential one; these companies sell approved, characterized, trial-backed drugs into insured channels that a compounded substitute does not directly threaten. And the relationship is not even cleanly adversarial: Hims already has a Novo Nordisk partnership, which makes “disruptor versus incumbent” too simple a frame for what is really a tangle of overlapping commercial interests.',
    },
    {
      type: 'paragraph',
      text: 'The disconfirming case has to be held alongside all of it. The rulemaking may never complete. The FDA can decline the recommendation outright. A genuine characterization standard could exclude most of what is currently sold as BPC-157, shrinking the addressable product rather than enabling it. And an adverse-event cluster in a compounded peptide would move the politics fast and in the opposite direction. A reader should be able to argue this section from either side; anyone who can only argue one is not yet done reading it.',
    },
    {
      type: 'adjudication-matrix',
      figureLabel: 'FIG. 3 · WHO BENEFITS × WHETHER THE VOTE IS A CLEAN TRADE',
      kicker:
        'FOUR EXPOSURE TIERS · BLUE SAME = DIRECT / CLEAN · HATCHED PART = DILUTED · GREY — = NONE. CLICK ANY CELL FOR THE ARGUMENT AGAINST.',
      hint: 'Click any cell for the argument against.',
      source: 'this article’s reporting.',
      cols: ['Direct exposure to the vote', 'A clean way to play it'],
      rows: [
        {
          label: 'Telehealth (Hims & Hers)',
          cells: [
            {
              value: 'same',
              note: 'The clearest case: a California peptide manufacturing facility acquired in 2025, an existing prescriber network, a subscriber base conditioned to subscription peptides, and a CMO who testified in support — the highest torque to the outcome.',
            },
            {
              value: 'part',
              note: 'Also the most concentrated regulatory risk: already down ~44% over the year, its compounded-GLP-1 business was previously curtailed by the same agency through the same mechanism now being widened. The bull and bear case run through the identical door.',
            },
          ],
        },
        {
          label: '503A / 503B compounders',
          cells: [
            {
              value: 'part',
              note: 'Behind the platforms sits the infrastructure tier — sterile-injectable capacity, peptide API synthesis and cold-chain fill-finish that an at-scale compounded-peptide market would require.',
            },
            {
              value: 'none',
              note: 'Less a growth story than a bottleneck: the same missing characterization and quality standards that troubled the FDA are what a scaled market would have to build first.',
            },
          ],
        },
        {
          label: 'Retail pharmacy / PBM (WBA, CVS)',
          cells: [
            {
              value: 'none',
              note: 'A further tier out and genuinely diluted — compounded peptides are largely cash-pay, sitting outside the insurance and rebate rails these businesses monetize.',
            },
            {
              value: 'none',
              note: 'Treating a WBA or CVS as a clean way to play this vote confuses proximity with participation.',
            },
          ],
        },
        {
          label: 'Incumbents (Eli Lilly, Novo Nordisk)',
          cells: [
            {
              value: 'none',
              note: 'Pressured rather than helped — but they sell approved, characterized, trial-backed drugs into insured channels a compounded substitute does not directly threaten; a margin-and-channel question, not an existential one.',
            },
            {
              value: 'none',
              note: 'Not even cleanly adversarial: Hims already has a Novo Nordisk partnership, making “disruptor versus incumbent” too simple a frame.',
            },
          ],
        },
      ],
    },
    {
      type: 'heading',
      text: 'What the market is actually pricing',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'The sell-side [[kw:total-addressable-market]]total addressable market[[/kw]] estimates give a sense of the ceiling being imagined. Leerink’s Michael Cherny put the peptide market near $2.2 billion, with Hims capturing roughly 20% of it; Needham modeled up to $3.3 billion. That two credentialed firms produced figures more than a billion dollars apart for the same market tells you how much of a TAM estimate is assumption rather than measurement — how large the category becomes depends on the very rulemaking, characterization standards, and reimbursement questions that have not been resolved. These are scenarios, not forecasts.',
    },
    {
      type: 'paragraph',
      text: 'Against that, the price action is best understood as a [[kw:regulatory-catalyst]]regulatory catalyst[[/kw]] being repriced. HIMS rose as much as 13% intraday and closed up around 10%, yet it remains down roughly 44% over the past year, with a market capitalization near $8.1 billion. A non-binding recommendation on the first step of a multi-stage process moved the stock more than a tenth in a session. What the move actually buys is an option on a rulemaking that has not started — and options on procedural events tend to be mispriced precisely because the headline (“FDA panel backs peptide”) compresses a long, uncertain, reversible process into a single bullish word.',
    },
    {
      type: 'revision-ledger',
      figureLabel: 'FIG. 4 · HIMS & HERS: ONE SESSION VS ONE YEAR',
      kicker:
        'HIMS % CHANGE · TRAILING TWELVE MONTHS (HOLLOW MARKER) → JULY 23 SESSION (FILLED) · √-SCALE. CLICK A ROW FOR CONTEXT.',
      hint: 'Hollow marker = trailing-year level; filled marker = the session move.',
      source:
        'The gap the vote produced: HIMS rose as much as 13% intraday on July 23 and closed up roughly 10%, against a decline of about 44% over the prior twelve months. A one-day reaction to a non-binding recommendation, set against the trailing-year trend. Source: intraday and trailing-year price moves as reported July 23, 2026.',
      scale: 'sqrt',
      unit: '%',
      rows: [
        {
          label: 'Intraday high, Jul 23',
          sub: 'vote-day pop vs prior 12 months',
          before: -44,
          beforeDisplay: '−44% / 12 mo',
          after: 13,
          afterDisplay: '+13%',
          favorable: 'up',
          record:
            'HIMS rose as much as 13% intraday on July 23 on a non-binding recommendation, against a decline of about 44% over the prior twelve months.',
        },
        {
          label: 'Close, Jul 23',
          sub: 'vote-day close vs prior 12 months',
          before: -44,
          beforeDisplay: '−44% / 12 mo',
          after: 10,
          afterDisplay: '+10%',
          favorable: 'up',
          record:
            'The stock closed up roughly 10% — a one-day reaction to the first step of a multi-stage, reversible process.',
        },
      ],
      verdict:
        'A one-day reaction to a non-binding recommendation, set against a trailing-year decline of about 44%.',
    },
    {
      type: 'heading',
      text: 'What to watch from here',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'The near-term signal is procedural, not promotional. Watch the remainder of the committee’s votes on emideltide, epitalon and semax; the FDA’s own determination on whether to accept any of the recommendations, which it is under no obligation to do; and — the real gate — whether the agency opens [[kw:notice-and-comment-rulemaking]]notice-and-comment rulemaking[[/kw]] to actually add anything to the 503A list, a process that typically runs many months to years and can end in nothing. Any move toward a formal characterization standard for these peptides matters more than the vote itself, because it would define what can legally be sold under each name.',
    },
    {
      type: 'paragraph',
      text: 'The honest reading is that a barely-studied, poorly-defined substance received a thin, non-binding recommendation from a committee the agency’s own scientists argued against, and a stock moved 13% on it. Both halves of that sentence are true, and the gap between them is where the risk lives — in either direction. This article is for information only and is not investment advice; it does not recommend buying, selling, or holding any security. It describes a contested procedural event and the questions a careful reader should keep asking as it unfolds.',
    },
    {
      type: 'scenario-chain',
      figureLabel: 'FIG. 5 · WHAT TO WATCH FROM HERE',
      kicker:
        'DRIVER × GATE → OUTCOME · THREE PATHS FROM A NON-BINDING RECOMMENDATION · ONE KILL SWITCH.',
      hint: 'Scenarios drawn from the article’s own “what to watch” and disconfirming cases.',
      source: 'this article’s reporting.',
      scenarios: [
        {
          id: 'base',
          label: 'RULEMAKING PROCEEDS',
          tone: 'base',
          range: 'Slow, multi-stage, reversible',
          steps: [
            {
              label: 'FDA accepts',
              sub: 'the agency is under no obligation to, and its staff argued against every substance',
            },
            {
              label: 'Notice-and-comment',
              sub: 'a formal rulemaking that typically runs many months to years',
            },
          ],
          result: {
            value: 'Legally compoundable',
            sub: 'a category widened — but only after a process the vote has not begun',
          },
        },
        {
          id: 'alt',
          label: 'THE STANDARD SHRINKS IT',
          tone: 'alt',
          range: 'Characterization bites',
          steps: [
            {
              label: 'Formal characterization',
              sub: 'a standard defining what can legally be sold under each name',
            },
            {
              label: 'Most of the market excluded',
              sub: 'a real standard could exclude most of what is sold today as BPC-157',
            },
          ],
          result: {
            value: 'Addressable product shrinks',
            sub: 'the standard shrinks the category rather than enabling it',
          },
        },
        {
          id: 'bear',
          label: 'IT ENDS IN NOTHING',
          tone: 'bear',
          range: 'The recommendation reverses',
          steps: [
            {
              label: 'FDA declines',
              sub: 'the agency can decline the recommendation outright; the rulemaking may never complete',
            },
            {
              label: 'Politics turn',
              sub: 'an adverse-event cluster in a compounded peptide would move the politics fast, the other way',
            },
          ],
          result: {
            value: 'No new access',
            sub: 'the process can end in nothing',
          },
        },
      ],
      killSwitch:
        'AN ADVERSE-EVENT CLUSTER IN A COMPOUNDED PEPTIDE — THE POLITICS TURN, AND THE WIDENING REVERSES.',
    },
  ],
  globeRail: {
    metric: {
      title: 'PEPTIDE CLEARANCE MARGIN (% OF VOTES CAST)',
      data: [
        { x: 1, y: 57.1 },
        { x: 2, y: 57.1 },
        { x: 3, y: 57.1 },
        { x: 4, y: 58.3 },
      ],
      startLabel: 'BPC-157 · 57.1%',
      endLabel: 'MOTS-c · 58.3%',
      note: 'BPC-157, KPV and TB-500 each cleared 8–6 with one abstention (57.1% of votes cast); MOTS-c cleared 7–5 with two abstentions (58.3%). Every one passed by a thin margin, over the objection of the FDA’s own scientists, who recommended against all seven.',
    },
    cities: [
      {
        name: 'Washington',
        country: 'US',
        lat: 38.9,
        lng: -77.04,
        impact:
          'The FDA advisory committee voted 8–6 to recommend BPC-157 for the 503A Bulks List, over the agency’s own scientists — who asked "What is BPC-157?", called it "not well-characterized," and recommended against every peptide on the docket. The vote is non-binding.',
      },
      {
        name: 'San Francisco',
        country: 'US',
        lat: 37.77,
        lng: -122.42,
        impact:
          'Hims & Hers, which acquired a California peptide manufacturing facility in 2025 and whose CMO testified in support, rose as much as 13% intraday and closed up roughly 10% — against a decline of about 44% over the prior year.',
      },
      {
        name: 'Indianapolis',
        country: 'US',
        lat: 39.77,
        lng: -86.16,
        impact:
          'Eli Lilly is pressured rather than helped: it sells approved, characterized, trial-backed drugs into insured channels that a compounded substitute does not directly threaten — a margin-and-channel question, not an existential one.',
      },
      {
        name: 'Copenhagen',
        country: 'DK',
        lat: 55.68,
        lng: 12.57,
        impact:
          'Novo Nordisk sits in the same incumbent tier, but the relationship is not cleanly adversarial — Hims already has a Novo Nordisk partnership, making "disruptor versus incumbent" too simple a frame.',
      },
    ],
  },
  author: 'Ezana Finance Editorial',
  category: 'markets-companies',
  subcategory: 'Equities',
  tags: ['markets', 'regulation', 'companies', 'science-health', 'policy'],
  meta: {
    sectors: ['Health Care'],
    industries: ['Pharmaceuticals', 'Health Care Services'],
    institutions: ['Hims & Hers', 'Eli Lilly', 'Novo Nordisk'],
    government: ['FDA'],
    geos: ['United States'],
    assetClasses: ['Equities'],
    themes: ['Regulation', 'Compounding Pharmacy'],
    datasets: [],
    markets: [],
  },
  tickers: ['HIMS', 'LLY', 'NVO', 'WBA', 'CVS', 'AMZN', 'TDOC', 'OSCR'],
  entities: {
    people: [],
    terms: [
      { id: 'advisory-committee', label: 'FDA Advisory Committee' },
      { id: '503a-bulks-list', label: '503A Bulks List' },
      { id: 'compounding-pharmacy', label: 'Compounding Pharmacy' },
      { id: 'bpc-157', label: 'BPC-157' },
      { id: 'peptide-therapeutics', label: 'Peptide Therapeutics' },
      { id: 'adverse-event-reporting', label: 'Adverse Event Reporting' },
      { id: 'cash-pay-healthcare', label: 'Cash-Pay Healthcare' },
      { id: 'total-addressable-market', label: 'Total Addressable Market' },
      { id: 'regulatory-catalyst', label: 'Regulatory Catalyst' },
      { id: 'notice-and-comment-rulemaking', label: 'Notice-and-Comment Rulemaking' },
    ],
  },
  readTime: 9,
  publishedAt: '2026-07-24',
  featured: false,
  likes: 0,
  comments: 0,
  reads: 0,
  listMeta: '24 Jul 2026',
};
