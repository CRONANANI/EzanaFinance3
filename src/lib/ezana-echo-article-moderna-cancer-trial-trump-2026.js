// src/lib/ezana-echo-article-moderna-cancer-trial-trump-2026.js
// Ezana Echo article: the president's disclosed Moderna trades, the FDA's flu-vaccine
// reversal and 9-0 advisory vote that followed them, and the cancer readout that took
// the position past +200%. The id is unchanged from the 10 Oct version so links hold.
// No chart colors are hardcoded; every figure reads --echo-chart-* tokens.
//
// ============================================================
// FACT CHECK MANIFEST (researched 10 Oct 2026, revised the same day)
//  1. Trump account MRNA trades: buy 2 Mar 2026 $15,001-$50,000; buy 17 Mar $1,001-$15,000;
//     partial sale 18 May $1,001-$15,000 -> Quiver Quantitative 2 Jul 2026 ("Trump's Newly
//     Disclosed Moderna Trades Preceded FDA Advisory Panel's Unanimous Backing"). Benzinga lists
//     16 Mar and 1 Jul for the second and third trades. ~49% gain since 2 Mar and ~46% since
//     17 Mar as of 2 Jul (Quiver). 2 Mar intraday high $54.94; 273-910 shares (Benzinga method).
//     2025: four buys $1K-$15K, one $50K-$100K, three sales -> Benzinga 19 Aug 2026
//  2. Refusal-to-file: disclosed by Moderna 10 Feb 2026, letter signed by CBER director Vinay
//     Prasad; Phase 3 not "adequate and well-controlled" because the standard-dose comparator
//     did not reflect "the best-available standard of care in the United States at the time of
//     the study"; no safety or efficacy concerns raised (Bancel) -> WBUR 11 Feb; Zacks 11 Feb.
//     Shares down nearly 9% premarket 11 Feb -> CP24/AP 11 Feb 2026
//  3. Reversal: Moderna 18 Feb 2026 after a Type A meeting; amended BLA, traditional approval
//     50-64, accelerated approval 65+, post-marketing study; PDUFA 5 Aug 2026; shares up more
//     than 6% -> BioPharma Dive 18 Feb; Yahoo Finance 18 Feb. Politico: reversal followed a
//     meeting where Trump "voiced frustration" to Makary; CNN: Trump berated Makary (both
//     anonymous sources); HHS spokesman Andrew Nixon quotes -> Fierce Biotech 19-20 Feb 2026
//  4. Prasad to leave at end of April, announced by Makary 6 Mar 2026 -> AP via National
//     Newswatch 6 Mar. Makary resignation announced 12 May 2026, decision by Kennedy approved by
//     the White House; Kyle Diamantas expected acting commissioner; AP: FDA reversed on the flu
//     shot "after Moderna threatened a formal challenge and sought White House intervention"
//     -> AP via WAVY 12 May 2026
//  5. VRBPAC 18 Jun 2026: 9-0 benefit outweighs risk, ages 50-64; 9-0 ages 65+; Phase 3 40,805
//     adults, 301 sites, 11 countries, 26.6% relative efficacy vs standard dose, 47.9% vs ER /
//     hospital / urgent care; 65+ via immunogenicity vs Fluzone High-Dose (noninferiority and
//     superiority, four strains); staff-flagged gaps -> PharmExec 19 Jun; Contagion Live 22 Jun.
//     Close $63.96 (+3.5%) -> The Pharma Letter 19 Jun. $55 close on 16 Jun after briefing docs
//     -> TIKR 17 Jun 2026
//  6. 2026 high $85.60 on 6 Jul; premarket $58.30 (+3.6%) on 6 Aug after approval; down 31.2%
//     over the prior month -> Schaeffer's 6 Aug 2026. Approval 5 Aug 2026 (Moderna release),
//     traditional 50-64 and accelerated 65+, retail doses for 2026-27 season, EU / Canada /
//     Australia filings -> Stocktwits 6 Aug 2026
//  7. Lobbying: Moderna filing $290,000 Q2 2026, "Vaccine Policy, FDA Vaccine Approvals"
//     -> Quiver 16 Jul 2026; $120,000 Q2 2025 "Vaccine Policy Generally" -> Quiver 17 Jul 2025
//     [VERIFY: registrant on both against lda.senate.gov before calling either in-house].
//     Brownstein Hyatt Farber Schreck for Moderna US Inc.: Q2 2026 report $80,000, health issues,
//     entity contacted "White House Office", posted 16 Jul 2026; no earlier Brownstein-Moderna
//     report in the data. DGSR LLC (William Dolbow, former senior adviser to Eric Cantor) via
//     Stanton Park Group for ModernaTX: registered Feb 2025; Q2 2026 $20,000, HHS / House /
//     Senate -> Ezana lobbying_filings (Senate LDA), queried 10 Oct 2026
//  8. INTerpath-001 readout 19 Aug 2026; 18 Aug close $62.96, 19 Aug $174.38 (+177%), record day;
//     Merck +~13% to record $152.20 -> thetrading.tools; BioPharma Dive; Moneywise
//  9. 9 Oct close $225.00 (+14.21%), Nasdaq-100 re-entry, NYT report on NIH-led cancer vaccine
//     effort -> Yahoo Finance; Stocktwits 9 Oct 2026. Dec 2025 close $29.49; month-end closes
//     -> Digrin
// 10. ESMO 24 Oct 2026, LBA1, Georgina Long; Moderna's 20% benchmark; Evercore 35-40%; Phase 2b
//     49% -> Moderna release 21 Sep; BioPharma Dive 20 Aug; BioSpace
// 11. Statements: White House says blind trust (Benzinga); Trump Organization: "fully
//     discretionary accounts managed by independent third-party financial institutions";
//     CNN July investigation, 20+ companies promoted after purchases -> Moneywise 20 Aug 2026
// 12. Legal frame: STOCK Act 45 days, ranges; 18 U.S.C. 208 exempts president; Canada 120 days
//     -> Money.ca Aug 2026
// 13. Khanna and Salazar trades as in the 10 Oct version (Disclosed Capitol; House Clerk PTR)
//     [VERIFY: Salazar filing date; Khanna rows against House Clerk PTRs]
// Computed: $225.00 / $54.94 = +309.5%; 273 x $225 = $61,425; 910 x $225 = $204,750 (estimates,
// lot assumed fully held); $225.00 / $29.49 = +663% YTD; 18 Feb - 10 Feb = 8 days; 2 Mar -
// 18 Feb = 12 days; $290,000 / $120,000 = 2.4x; $54.94 x 3 = $164.82 (the +200% line).
// ============================================================

export const modernaCancerTrialTrump2026 = {
  id: 'moderna-cancer-trial-trump-2026',
  title: "Up More Than 200%: Trump's March Moderna Buy Rides the mRNA Cancer Vaccine Rally",
  excerpt:
    "Donald Trump's account bought $15,001 to $50,000 of Moderna on 2 March, twelve days after the FDA reversed its refusal to review the company's mRNA flu shot. The FDA's advisers later backed that vaccine 9-0, and a Phase 3 cancer vaccine result in August sent the stock past $225, more than 300% above that day's high.",
  heroImage: {
    src: '/images/ezana-echo/moderna-cancer-trial-trump-2026-hero.webp',
    // Interim: the chart graphic from v1 stays until Noah's Oval Office photo
    // is dropped in at this path. Then restore the photo's alt and caption:
    //   alt: 'President Donald Trump seated at the Resolute Desk in the Oval Office, turning to speak, with officials standing behind him.',
    //   caption: 'President Donald Trump in the Oval Office. Official White House photo.',
    alt: 'Editorial chart graphic: Moderna share prices from 2021 to October 2026, falling from a $484.47 record close to $22.28 before a vertical jump in August 2026 to $225.00.',
    caption:
      'Ezana graphic. Moderna month-end closes, 2021 to 9 October 2026 (Digrin price history; 9 October close per Yahoo Finance). The August 2026 jump is the 19 August melanoma readout.',
  },
  contentBlocks: [
    {
      type: 'paragraph',
      text: "President Donald Trump's investment account bought between $15,001 and $50,000 of Moderna stock on 2 March 2026, according to his disclosures. At that day's high of $54.94, the purchase was worth about 273 to 910 shares. Moderna closed at $225.00 on 9 October, 309.5% above that price, after the company and Merck reported on 19 August that their personalized mRNA cancer vaccine met its primary goal in a Phase 3 melanoma trial. The buy came twelve days after the Food and Drug Administration reversed its refusal to review Moderna's mRNA flu vaccine, and more than three months before the agency's outside advisers voted 9-0 in favor of that shot.",
    },
    {
      type: 'stat-grid',
      stats: [
        {
          label: 'Trump account buy, 2 Mar',
          value: '$15K to $50K',
          change: 'est. 273 to 910 shares',
        },
        {
          label: 'Moderna since that buy',
          value: '+309.5%',
          change: '$54.94 high to $225.00 on 9 Oct',
        },
        {
          label: 'FDA advisory vote, 18 Jun',
          value: '9-0',
          change: 'for the mRNA flu shot, both age groups',
        },
        {
          label: 'That lot at the 9 Oct close',
          value: '$61K to $205K',
          change: 'Ezana estimate, if fully held',
        },
      ],
    },

    { type: 'heading', text: 'What the filings show', level: 2 },
    {
      type: 'paragraph',
      text: "The disclosures list three Moderna trades this year: the 2 March purchase, a second purchase of $1,001 to $15,000 on 17 March and a partial sale of $1,001 to $15,000 on 18 May, according to Quiver Quantitative, which reported them on 2 July. Benzinga dates the second and third trades 16 March and 1 July. Because the forms report only ranges, the position can be bracketed but not measured. By Quiver's 2 July count the stock was up roughly 49% from the first purchase and 46% from the second. The account also held Moderna before 2026: Benzinga's review of 2025 filings found five purchases and three sales.",
    },
    {
      type: 'trajectory',
      figureLabel: 'FIG. 1 · FROM THE MARCH BUY TO $225',
      kicker:
        'MODERNA (MRNA) SHARE PRICE, $ · MONTH-END CLOSES DECEMBER 2025 TO SEPTEMBER 2026 PLUS EVENT-DAY CLOSES · DIAMONDS MARK THE BUY, THE FDA STEPS AND THE CANCER READOUT',
      hint: 'Event-day points (18 June, 18 to 19 August, 8 to 9 October) sit between month-ends.',
      source:
        "Digrin MRNA monthly price history; The Pharma Letter (18 June close); thetrading.tools (18 to 19 August); Schaeffer's (6 August premarket); Yahoo Finance (8 to 9 October); Benzinga (2 March high).",
      yLabel: 'Share price, $',
      yMax: 250,
      xMin: 2026,
      xMax: 2026.8,
      xTicks: [
        { x: 2026, label: 'Jan' },
        { x: 2026.25, label: 'Apr' },
        { x: 2026.5, label: 'Jul' },
        { x: 2026.75, label: 'Oct' },
      ],
      series: [
        {
          key: 'mrna',
          label: 'MRNA close',
          color: 'var(--echo-chart-blue)',
          data: [
            { x: 2026.0, y: 29.49 },
            { x: 2026.08, y: 44.07 },
            { x: 2026.16, y: 53.57 },
            { x: 2026.25, y: 50.8 },
            { x: 2026.33, y: 45.94 },
            { x: 2026.42, y: 47.19 },
            { x: 2026.462, y: 63.96 },
            { x: 2026.5, y: 70.03 },
            { x: 2026.58, y: 54.82 },
            { x: 2026.63, y: 62.96 },
            { x: 2026.633, y: 174.38 },
            { x: 2026.67, y: 140.34 },
            { x: 2026.75, y: 192.57 },
            { x: 2026.767, y: 197.0 },
            { x: 2026.772, y: 225.0 },
          ],
        },
      ],
      annotations: [
        { x: 2026.167, y: 54.94, label: '2 Mar · Trump buy', sub: 'day high $54.94' },
        { x: 2026.462, y: 63.96, label: '18 Jun · 9-0 vote', sub: 'closed $63.96' },
        { x: 2026.595, y: 58.3, label: '5 Aug · approval', sub: '$58.30 premarket next day' },
        { x: 2026.633, y: 174.38, label: '19 Aug · +177%', sub: 'melanoma readout' },
        { x: 2026.772, y: 225.0, label: '9 Oct · $225.00', sub: '+309.5% vs $54.94' },
      ],
    },
    {
      type: 'paragraph',
      text: "The chart shows which event made the trade. The flu vaccine story lifted Moderna into the $60s and $70s, and the stock reached a 2026 high of $85.60 on 6 July, according to Schaeffer's, before giving back about 31% over the following month. When the FDA approved the shot on 5 August, the stock was trading below where it stood after the advisory vote. The move past +200% came on 19 August, when the melanoma readout lifted Moderna 177% in one session, and on 9 October, when it rejoined the Nasdaq-100 and closed at $225.00.",
    },
    {
      type: 'revision-ledger',
      figureLabel: 'FIG. 2 · WHAT A $15,001 TO $50,000 LINE IS WORTH NOW',
      kicker:
        'THE 2 MARCH 2026 MODERNA PURCHASE, BRACKETED · COST AT THE DISCLOSED RANGE VS VALUE AT THE 9 OCTOBER CLOSE · ESTIMATES · CLICK A ROW FOR THE METHOD',
      hint: 'All values are estimates built from a disclosed range, not reported holdings.',
      source:
        'Trump OGE transaction disclosures via Quiver Quantitative and Benzinga; share math per Benzinga at the $54.94 intraday high; 9 October close per Yahoo Finance. Ezana arithmetic.',
      scale: 'linear',
      unit: '$',
      rows: [
        {
          label: 'Low end of the range',
          sub: '273 shares',
          before: 15001,
          after: 61425,
          beforeDisplay: '$15,001',
          afterDisplay: '~$61,425',
          delta: 46424,
          deltaDisplay: '+$46,424',
          favorable: 'up',
          record:
            '$15,001 at $54.94 buys about 273 shares. At the $225.00 close on 9 October those shares are worth about $61,425. Assumes the full lot is still held.',
        },
        {
          label: 'High end of the range',
          sub: '910 shares',
          before: 50000,
          after: 204750,
          beforeDisplay: '$50,000',
          afterDisplay: '~$204,750',
          delta: 154750,
          deltaDisplay: '+$154,750',
          favorable: 'up',
          record:
            '$50,000 at $54.94 buys about 910 shares, worth about $204,750 at $225.00. The partial sale later in the year, at most $15,000, would trim either figure.',
        },
      ],
      verdict:
        'The share price rose 309.5% from the $54.94 high to $225.00. Every dollar figure rests on a range: the gain is real, the amount is an estimate, and the true size is known only to the account manager.',
    },
    {
      type: 'paragraph',
      text: "On any reading the stake is small for an account that logged thousands of transactions; Ezana Echo's review of Trump's first-quarter 2026 filing counted 3,642 of them. The Trump Organization describes the holdings as fully discretionary accounts run by independent third-party financial institutions, with no advance notice of trades and no input into decisions, and the White House has said they sit in a blind trust, according to Benzinga. Nothing in the public record shows that Trump directed the Moderna purchases or knew of them. What the record does show is the sequence around them.",
    },

    { type: 'heading', text: 'The February fight over the flu filing', level: 2 },
    {
      type: 'paragraph',
      text: "Moderna filed for approval of its mRNA flu vaccine, then called mRNA-1010, in January. On 10 February it disclosed a [[kw:refuse-to-file]]refusal-to-file letter[[/kw]] signed by Vinay Prasad, the head of the FDA's vaccine center, which said the Phase 3 trial was not adequate and well controlled because its standard-dose comparator did not reflect the best available standard of care in the United States. Moderna said the letter raised no safety or efficacy concerns and conflicted with the agency's earlier written guidance. The shares fell nearly 9% in premarket trading the next day.",
    },
    {
      type: 'paragraph',
      text: "Eight days later the FDA reversed. After a Type A meeting, Moderna said on 18 February that the agency would review an amended application seeking traditional approval for adults 50 to 64 and [[kw:accelerated-approval]]accelerated approval[[/kw]] for adults 65 and older, with a decision due 5 August. Politico, citing two people familiar with the matter, reported that the reversal followed a meeting at which Trump voiced frustration to FDA Commissioner Marty Makary over how the case had been handled; CNN reported that Trump berated Makary over the decision. The White House did not respond to Fierce Biotech's request for comment.",
    },
    {
      type: 'quote',
      text: 'FDA will maintain its high standards during review and potential licensure stages as it does with all products.',
      source: 'Andrew Nixon, HHS spokesman, via Fierce Biotech, 19 February 2026',
    },
    {
      type: 'wall-timeline',
      figureLabel: 'FIG. 3 · EIGHT MONTHS, ONE FILING, THREE TRADES',
      kicker:
        "FDA, TRADING AND MARKET EVENTS, JANUARY TO OCTOBER 2026 · SHADED WINDOWS MARK THE FDA STANDOFF, THE PRESIDENT'S ACCOUNT TRADES AND THE PANEL-TO-APPROVAL STRETCH · CLICK A PLAQUE FOR THE RECORD",
      hint: 'Click any plaque for the record.',
      source:
        'Moderna releases; WBUR and AP (February); Fierce Biotech citing Politico and CNN; AP (6 March, 12 May); Quiver Quantitative (trades, lobbying); PharmExec (18 June vote); Stocktwits (approval); Ezana lobbying data (Senate LDA).',
      startYear: 2026.0,
      endYear: 2026.82,
      windows: [
        {
          id: 'standoff',
          label: 'FDA standoff',
          from: 2026.11,
          to: 2026.135,
          color: 'var(--echo-chart-red)',
        },
        {
          id: 'trades',
          label: 'Trump account trades',
          from: 2026.165,
          to: 2026.38,
          color: 'var(--echo-chart-orange)',
        },
        {
          id: 'panel',
          label: 'Panel to approval',
          from: 2026.46,
          to: 2026.6,
          color: 'var(--echo-chart-green)',
        },
      ],
      plaques: [
        {
          year: 2026.11,
          lane: 0,
          label: '10 Feb',
          detail:
            'Moderna discloses an FDA refusal-to-file letter for its mRNA flu vaccine, signed by Vinay Prasad. Shares fall nearly 9% premarket the next day.',
        },
        {
          year: 2026.135,
          lane: 1,
          label: '18 Feb',
          detail:
            'After a Type A meeting the FDA agrees to review an amended application; decision due 5 August. Politico and CNN report Trump had confronted Makary over the refusal.',
        },
        {
          year: 2026.167,
          lane: 2,
          label: '2 Mar',
          detail: "Trump's account buys $15,001 to $50,000 of MRNA. The day's high is $54.94.",
        },
        {
          year: 2026.18,
          lane: 3,
          label: '6 Mar',
          detail: 'Makary tells staff that Prasad will leave the FDA at the end of April.',
        },
        {
          year: 2026.21,
          lane: 4,
          label: '17 Mar',
          detail: "Trump's account buys a further $1,001 to $15,000 of MRNA.",
        },
        {
          year: 2026.36,
          lane: 0,
          label: '12 May',
          detail:
            "Makary resigns; AP reports the decision was Health Secretary Robert F. Kennedy Jr.'s, approved by the White House.",
        },
        {
          year: 2026.38,
          lane: 1,
          label: '18 May',
          detail:
            "Trump's account reports a partial sale of $1,001 to $15,000 (1 July per Benzinga).",
        },
        {
          year: 2026.46,
          lane: 2,
          label: '18 Jun',
          detail:
            'VRBPAC votes 9-0 for adults 50 to 64 and 9-0 for adults 65 and older. MRNA closes at $63.96.',
        },
        {
          year: 2026.5,
          lane: 3,
          label: '2 Jul',
          detail: 'Quiver reports the trades; the stock is up about 49% from the 2 March buy.',
        },
        {
          year: 2026.54,
          lane: 4,
          label: '16 Jul',
          detail:
            'Second-quarter lobbying reports: a $290,000 Moderna filing on vaccine policy and FDA vaccine approvals; Brownstein Hyatt Farber Schreck lists the White House Office.',
        },
        {
          year: 2026.595,
          lane: 0,
          label: '5 Aug',
          detail:
            'FDA approves mFLUSIVA: traditional approval for adults 50 to 64, accelerated approval for 65 and older.',
        },
        {
          year: 2026.633,
          lane: 1,
          label: '19 Aug',
          detail: 'INTerpath-001 melanoma readout. MRNA closes up 177% at $174.38.',
        },
        {
          year: 2026.772,
          lane: 2,
          label: '9 Oct',
          detail: 'Moderna rejoins the Nasdaq-100 and closes at $225.00.',
        },
      ],
    },
    {
      type: 'paragraph',
      text: "The agency that heard the case in June was not the one that had refused it. On 6 March Makary told staff that Prasad would leave at the end of April, and on 12 May Makary himself resigned, in a decision AP reported was made by Health Secretary Robert F. Kennedy Jr. and approved by the White House. AP's account of his exit noted that the FDA had reversed course on the flu shot after Moderna threatened a formal challenge and sought White House intervention. The president's account had bought the stock between those events, weeks after the reversal and before any public sign of how the review would end.",
    },

    { type: 'heading', text: 'Nine votes to none', level: 2 },
    {
      type: 'paragraph',
      text: "On 18 June the FDA's Vaccines and Related Biological Products [[kw:advisory-committee]]Advisory Committee[[/kw]] voted 9-0 that the vaccine's benefits outweigh its risks for adults 50 to 64, and 9-0 again for adults 65 and older. The younger group's case rested on a Phase 3 trial of 40,805 adults at 301 sites in 11 countries, in which the shot showed 26.6% [[kw:relative-vaccine-efficacy]]relative efficacy[[/kw]] against a standard-dose vaccine for confirmed influenza-like illness and 47.9% against emergency visits, hospital stays and urgent care. For adults 65 and older, Moderna relied on an immune-response study against Sanofi's Fluzone High-Dose, met its noninferiority and superiority criteria across four strains, and agreed to a confirmatory study after approval.",
    },
    {
      type: 'adjudication-matrix',
      figureLabel: 'FIG. 4 · WHAT THE FDA WEIGHED, BY AGE GROUP',
      kicker:
        'THE EVIDENCE BEHIND EACH 9-0 VOTE · SAME = MET · PART = MET WITH CONDITIONS · NONE = NOT MET · CLICK A CELL FOR THE BASIS',
      hint: 'Click any cell for the basis.',
      source:
        'PharmExec and Contagion Live (18 June VRBPAC); BioPharma Dive (18 February pathway); Stocktwits (5 August approval). Grades are Ezana editorial assessments.',
      cornerLabel: 'Age group \\ Test',
      legend: {
        same: 'same: met',
        part: 'partial: met with conditions',
        none: 'none: not met',
      },
      cols: [
        'Clinical outcome data',
        'Comparator the FDA accepts',
        'Traditional approval',
        'Panel: benefit over risk',
      ],
      rows: [
        {
          label: 'Adults 50 to 64',
          cells: [
            {
              value: 'same',
              note: 'Phase 3, 40,805 adults: 26.6% relative efficacy against a standard-dose shot.',
            },
            {
              value: 'same',
              note: 'A standard-dose comparator was accepted for this group in the amended application.',
            },
            { value: 'same', note: 'Approved on 5 August on the traditional pathway.' },
            { value: 'same', note: 'VRBPAC voted 9-0 on 18 June.' },
          ],
        },
        {
          label: 'Adults 65 and older',
          cells: [
            {
              value: 'part',
              note: 'Approval rests on an immune-response study; clinical benefit must be confirmed after approval.',
            },
            {
              value: 'same',
              note: 'The immune-response study used Fluzone High-Dose, the comparator the refusal letter had pointed to.',
            },
            {
              value: 'none',
              note: 'Accelerated approval, conditional on a post-marketing confirmatory study.',
            },
            { value: 'same', note: 'VRBPAC voted 9-0 on 18 June.' },
          ],
        },
      ],
    },
    {
      type: 'paragraph',
      text: 'FDA staff briefing documents had flagged gaps, including no efficacy data for immunocompromised patients, very frail older adults or people receiving other respiratory vaccines at the same time. The documents still read as supportive: Moderna closed at about $55 on 16 June after their release and at $63.96 on the day of the vote. The FDA approved the vaccine, named mFLUSIVA, on 5 August, the first mRNA flu shot, with doses due at US retailers for the 2026-27 season and filings under way in the European Union, Canada and Australia.',
    },

    { type: 'heading', text: 'The cancer trial that tripled the trade', level: 2 },
    {
      type: 'paragraph',
      text: "The flu approval was the policy story; the cancer readout was the money. On 19 August Moderna and Merck said intismeran autogene, a vaccine built for each patient from the patient's own tumor, met the primary endpoint of [[kw:recurrence-free-survival]]recurrence-free survival[[/kw]] in INTerpath-001, a Phase 3 trial of 1,137 patients with surgically removed high-risk melanoma, given with Merck's Keytruda. It is the first such success for an individualized mRNA cancer therapy. Moderna rose from $62.96 to $174.38, its best day ever, and Merck closed up nearly 13% at a record $152.20.",
    },
    {
      type: 'callout',
      label: 'The 2 March lot, priced at the 9 October close',
      value: '+309.5%',
      context:
        'From the $54.94 high on the day of the purchase to $225.00. A gain of 200% needed a price of $164.82; Moderna first closed above that on 19 August, the day of the readout.',
    },
    {
      type: 'paragraph',
      text: 'The rally kept going. On 9 October Moderna rejoined the Nasdaq-100 and rose 14% after The New York Times reported a public-private cancer vaccine effort led by the National Institutes of Health, closing at $225.00, up 663% for the year. That puts a company with $1.94 billion of 2025 revenue at roughly $90 billion of market value, and analysts are split: Bank of America raised its target to $200 with a Neutral rating, while the average target of $121 sits far below the price.',
    },

    { type: 'heading', text: 'Moderna in Washington', level: 2 },
    {
      type: 'revision-ledger',
      figureLabel: 'FIG. 5 · SECOND QUARTER, YEAR ON YEAR',
      kicker:
        'MODERNA LOBBYING LINES THAT MOVED BETWEEN Q2 2025 AND Q2 2026, $ · AS REPORTED UNDER THE LOBBYING DISCLOSURE ACT · CLICK A ROW FOR THE FILING',
      hint: "Each row is one reported line, not Moderna's total spend.",
      source:
        'Quiver Quantitative (Moderna vaccine-policy filings, 17 July 2025 and 16 July 2026); Ezana lobbying data from Senate LDA filings (Brownstein Hyatt Farber Schreck, posted 16 July 2026).',
      scale: 'linear',
      unit: '$',
      rows: [
        {
          label: 'Moderna vaccine-policy filing',
          sub: 'issue line adds FDA vaccine approvals',
          before: 120000,
          after: 290000,
          beforeDisplay: '$120,000',
          afterDisplay: '$290,000',
          delta: 170000,
          deltaDisplay: '+$170,000',
          favorable: 'up',
          record:
            'Q2 2025: $120,000, "Vaccine Policy Generally". Q2 2026: $290,000, "Vaccine Policy, FDA Vaccine Approvals". The quarter covers April to June, the run-up to the 18 June advisory vote.',
        },
        {
          label: 'Brownstein Hyatt Farber Schreck',
          sub: 'new outside firm',
          before: 0,
          after: 80000,
          beforeDisplay: 'none reported',
          afterDisplay: '$80,000',
          delta: 80000,
          deltaDisplay: '+$80,000',
          favorable: 'up',
          record:
            'Second-quarter 2026 report for Moderna US Inc. on health issues, posted 16 July 2026. Entity contacted: White House Office. No earlier Brownstein report for Moderna appears in the data.',
        },
      ],
      verdict:
        "Moderna's reported lobbying on vaccine policy was roughly 2.4 times its year-earlier level in the quarter of the advisory vote, with a new firm reporting contacts at the White House. Lobbying is legal and disclosed; the filings show where the company put its effort, not what it achieved.",
    },
    {
      type: 'paragraph',
      text: "Moderna spent the year lobbying on the issues the FDA was deciding. A Moderna lobbying filing for the second quarter of 2026 listed $290,000 on vaccine policy and FDA vaccine approvals, up from $120,000 on vaccine policy in the comparable 2025 filing, according to Quiver Quantitative. Ezana's own lobbying data, drawn from Senate disclosures, shows a new outside firm on the account: Brownstein Hyatt Farber Schreck reported $80,000 for Moderna in the second quarter and listed the White House Office among the entities it contacted. DGSR, whose lobbyist William Dolbow was a senior adviser to former House Majority Leader Eric Cantor, reported $20,000 for contacts with HHS and Congress.",
    },
    {
      type: 'cta-callout',
      headline: 'See every Moderna lobbying filing',
      body: "Ezana's Capitol Watch hub joins lobbying reports with congressional trades, federal contracts and committee seats: search Moderna to see each registrant, the amount, the issues and the agencies contacted, quarter by quarter.",
      ctaLabel: 'Open Capitol Watch',
      ctaHref: '/datasets/capitol-watch',
      ctaAuthGate: false,
    },

    { type: 'heading', text: 'The disclosure gap', level: 2 },
    {
      type: 'paragraph',
      text: 'The rules that govern these trades are disclosure rules, not prohibitions. Under the STOCK Act, the president and members of Congress report securities transactions above $1,000 within 45 days, and only in [[kw:periodic-transaction-report]]dollar ranges[[/kw]], so the public learns of a purchase weeks after it settles and never learns its exact size. The main federal conflict-of-interest statute, 18 U.S.C. 208, exempts the president and vice president, and no law requires a president to divest or use a blind trust. Canada takes the opposite approach: cabinet ministers must sell controlled assets or place them in a blind trust within 120 days.',
    },
    {
      type: 'adjudication-matrix',
      figureLabel: 'FIG. 6 · THREE OFFICES, FOUR RULES',
      kicker:
        'WHICH RULES BIND WHICH OFFICE-HOLDER · SAME = THE RULE APPLIES · PART = APPLIES WITH LIMITS · NONE = DOES NOT APPLY · CLICK A CELL FOR THE BASIS',
      hint: 'Click any cell for the legal basis.',
      source:
        'STOCK Act (2012); 18 U.S.C. 208; Conflict of Interest Act (Canada), as summarized by Money.ca, August 2026. Grades are Ezana editorial assessments, not legal advice.',
      cornerLabel: 'Office \\ Rule',
      legend: {
        same: 'same: the rule applies',
        part: 'partial: applies with limits',
        none: 'none: does not apply',
      },
      cols: [
        'Trades reported publicly',
        'Exact amounts disclosed',
        'Must divest or blind-trust',
        'Federal conflict statute applies',
      ],
      rows: [
        {
          label: 'US president',
          cells: [
            {
              value: 'part',
              note: 'Transactions above $1,000 are reported within 45 days on OGE forms, after the trade.',
            },
            {
              value: 'none',
              note: 'Amounts are reported only in ranges such as $15,001 to $50,000.',
            },
            { value: 'none', note: 'No law requires divestment or a blind trust.' },
            {
              value: 'none',
              note: '18 U.S.C. 208 expressly exempts the president and vice president.',
            },
          ],
        },
        {
          label: 'US member of Congress',
          cells: [
            {
              value: 'part',
              note: 'STOCK Act periodic transaction reports are due within 45 days, after the trade.',
            },
            { value: 'none', note: 'Amounts are reported only in ranges.' },
            {
              value: 'none',
              note: 'Members are not required to divest; holdings may sit in family trusts and managed accounts.',
            },
            {
              value: 'none',
              note: 'Section 208 covers executive-branch employees; members answer to House and Senate ethics rules instead.',
            },
          ],
        },
        {
          label: 'Canadian cabinet minister',
          cells: [
            {
              value: 'none',
              note: 'Controlled assets are sold or placed in a blind trust, so there is no trading to report.',
            },
            { value: 'none', note: 'Not applicable once controlled assets are divested.' },
            {
              value: 'same',
              note: 'Required within 120 days of appointment under the Conflict of Interest Act.',
            },
            {
              value: 'same',
              note: 'The Conflict of Interest Act applies to ministers and the prime minister.',
            },
          ],
        },
      ],
    },
    {
      type: 'paragraph',
      text: 'The practical effect is a lag that favors whoever trades first. The March purchases surfaced weeks after they settled, and a range of $15,001 to $50,000 spans a 3.3-times difference in exposure. Critics have alleged conflicts of interest since Trump returned to office, and a July CNN investigation reported that he had promoted more than 20 companies on social media days after buying their stock; the White House told CNN there are no conflicts of interest. For investors, the filings are most useful in aggregate: they show which names official portfolios are leaning into, after the fact.',
    },

    { type: 'heading', text: 'Congress was in the stock too', level: 2 },
    {
      type: 'paragraph',
      text: 'The president is not the only office-holder with Moderna exposure. Rep. Ro Khanna, a California Democrat, holds MRNA through family trusts: Disclosed Capitol lists purchases of $1,001 to $15,000 on 30 January, 24 February, 15 April and 30 June 2026, sales on 26 February and 3 August, and another purchase on 24 August. Khanna says that he and his wife do not trade stocks themselves. Rep. Maria Elvira Salazar, a Florida Republican, reported a purchase and a partial sale of Moderna, each $1,001 to $15,000, on 19 August, the day of the readout; the report surfaced in September.',
    },
    {
      type: 'dossier-table',
      figureLabel: 'FIG. 7 · THREE OFFICE-HOLDERS, ONE TICKER',
      kicker:
        'DISCLOSED 2026 MODERNA TRADES BY OFFICE-HOLDERS NAMED IN THIS ARTICLE · RANGES AS FILED · CLICK DOSSIER + FOR THE TRADE RECORD',
      hint: 'Open a dossier for every disclosed 2026 trade.',
      source:
        'OGE disclosures via Quiver Quantitative and Benzinga (Trump); Disclosed Capitol (Khanna; Salazar 24 Sep); House Clerk periodic transaction report, September 2026 (Salazar, 19 Aug).',
      headers: ['Office-holder', 'How the stake is held', '2026 buys', 'Open question', ''],
      rows: [
        {
          name: 'Donald Trump',
          tag: 'President',
          role: 'Discretionary accounts at third-party institutions; the White House calls it a blind trust',
          anchor: '2 buys, $16,002 to $65,000',
          keyRisk: "Whether a discretionary account is independent of the president's own agencies",
          dossier: [
            { label: '2 Mar 2026', text: 'Purchase, $15,001 to $50,000. Intraday high $54.94.' },
            {
              label: 'Mid-Mar 2026',
              text: 'Purchase, $1,001 to $15,000 (17 March per Quiver, 16 March per Benzinga).',
            },
            {
              label: 'Later in 2026',
              text: 'Partial sale, $1,001 to $15,000 (18 May per Quiver, 1 July per Benzinga).',
            },
            {
              label: 'Estimated value',
              text: '$61,425 to $204,750 for the 2 March lot at $225.00, if fully held.',
            },
          ],
        },
        {
          name: 'Ro Khanna',
          tag: 'D-CA',
          role: 'Family trusts; Khanna says he and his wife do not trade',
          anchor: '5 buys, $5,005 to $75,000',
          keyRisk: 'Trust activity at 5,402 trades a year makes any single trade hard to attribute',
          dossier: [
            {
              label: 'Buys',
              text: '30 Jan, 24 Feb, 15 Apr, 30 Jun and 24 Aug 2026, each $1,001 to $15,000.',
            },
            { label: 'Sales', text: '26 Feb and 3 Aug 2026, each $1,001 to $15,000.' },
            {
              label: 'History',
              text: '72 MRNA transactions listed in total by Disclosed Capitol.',
            },
          ],
        },
        {
          name: 'Maria Elvira Salazar',
          tag: 'R-FL',
          role: 'Reported in her own periodic transaction reports',
          anchor: '1 buy, $1,001 to $15,000',
          keyRisk: 'A buy and a partial sale on readout day',
          dossier: [
            {
              label: '19 Aug 2026',
              text: 'Purchase and partial sale of MRNA, each $1,001 to $15,000, disclosed in September.',
            },
            { label: '24 Sep 2026', text: 'Sale, $1,001 to $15,000.' },
          ],
        },
      ],
    },
    {
      type: 'cta-callout',
      headline: 'Every member trade in Moderna, as filed',
      body: "Ezana's Politician Tracker reads House Clerk and Senate disclosures directly: filter by ticker to see each member's MRNA trades, the disclosed range, the filing lag in days and the member's other open positions.",
      ctaLabel: 'Open the Politician Tracker',
      ctaHref: '/datasets/politician-tracker',
      ctaAuthGate: false,
    },
    { type: 'heading', text: 'Madrid, 24 October: what the price now has to prove', level: 2 },
    {
      type: 'paragraph',
      text: "The next fixed test is the full INTerpath-001 dataset at the ESMO Presidential Symposium in Madrid on 24 October, presented by Georgina Long. The number that matters is the [[kw:hazard-ratio]]hazard ratio[[/kw]] for recurrence-free survival. Moderna's management called a 20% reduction in the risk of recurrence or death the clinical benchmark; Evercore ISI says 35% to 40% would be clearly differentiated but argues the valuation already prices in more than that. The earlier Phase 2b trial showed 49%. For the flu vaccine, the test is uptake in its first season against established high-dose shots.",
    },
    {
      type: 'scenario-chain',
      figureLabel: 'FIG. 8 · THREE READINGS OF 24 OCTOBER',
      kicker:
        "EACH CHAIN RUNS FROM THE ESMO EFFECT SIZE TO A PRICE OUTCOME · BENCHMARKS ARE MODERNA'S AND ANALYSTS' PUBLISHED BARS, NOT EZANA FORECASTS",
      hint: 'Read each chain left to right; the kill switch falsifies the re-rating.',
      source:
        'Moderna clinical benchmark and analyst bars via BioPharma Dive (20 Aug 2026); Phase 2b via BioSpace; analyst targets via Stocktwits and Investing.com (9 Oct 2026).',
      scenarios: [
        {
          id: 'base',
          label: 'BASE CASE · PHASE 2B REPEATS',
          tone: 'base',
          range: '35% to 49% lower risk',
          steps: [
            {
              label: 'Effect in the Phase 2b range',
              sub: 'Evercore\'s "clearly differentiated" bar',
            },
            { label: 'Clean safety, OS trending', sub: 'filing talks proceed' },
          ],
          result: { value: 'Re-rating holds', sub: 'pipeline value carries the stock' },
        },
        {
          id: 'alt',
          label: 'ALTERNATIVE · CLEARS THE BAR, MISSES THE HYPE',
          tone: 'alt',
          range: '20% to 35% lower risk',
          steps: [
            { label: "Meets Moderna's 20% benchmark", sub: 'but below the 35% to 40% band' },
            { label: 'Cost per patient debated', sub: "Leerink's concern" },
          ],
          result: { value: 'Partial give-back', sub: 'toward the $121 average target' },
        },
        {
          id: 'bear',
          label: 'BEAR CASE · BENCHMARK MISSED',
          tone: 'bear',
          range: 'under 20% lower risk',
          steps: [
            { label: 'Hazard ratio above 0.80', sub: 'or a new safety signal' },
            { label: 'Revenue base exposed', sub: '$1.94B in 2025' },
          ],
          result: { value: 'Re-rating unwinds', sub: 'valuation reverts to the business' },
        },
      ],
      killSwitch:
        "If the recurrence-free survival hazard ratio presented on 24 October is above 0.80, a smaller benefit than Moderna's own 20% benchmark, the case for the 2026 re-rating is falsified.",
    },
    {
      type: 'paragraph',
      text: "The base case is that the full data land near the Phase 2b result and the re-rating holds, with Merck (MRK) the steadier way to own the same readout. The bear case is a hazard ratio above 0.80, which would leave a roughly $90 billion valuation resting on about $2 billion of revenue and shrink the president's paper gain with it. Either way, the disclosure question outlasts the trial: an account in the president's name bought Moderna after his FDA reversed course on its flu shot, and the public saw the trades only in ranges, weeks later.",
    },
  ],
  globeRail: {
    metric: {
      title: 'MODERNA MONTH-END CLOSE, 2026 ($)',
      data: [
        { x: 0, y: 29.49 },
        { x: 1, y: 44.07 },
        { x: 2, y: 53.57 },
        { x: 3, y: 50.8 },
        { x: 4, y: 45.94 },
        { x: 5, y: 47.19 },
        { x: 6, y: 70.03 },
        { x: 7, y: 54.82 },
        { x: 8, y: 140.34 },
        { x: 9, y: 192.57 },
        { x: 10, y: 225.0 },
      ],
      startLabel: 'Dec 2025 · $29.49',
      endLabel: '9 Oct 2026 · $225.00',
      note: 'Month-end closes (Digrin); the last point is the 9 October close (Yahoo Finance).',
    },
    cities: [
      {
        name: 'Cambridge',
        country: 'United States',
        lat: 42.37,
        lng: -71.11,
        sectionAnchor: 'what-the-filings-show',
        impact:
          "Moderna's home base. The president's account bought $15,001 to $50,000 of the stock on 2 March at up to $54.94 a share; it closed at $225.00 on 9 October.",
      },
      {
        name: 'Washington',
        country: 'United States',
        lat: 38.9,
        lng: -77.04,
        sectionAnchor: 'the-february-fight-over-the-flu-filing',
        impact:
          "Politico and CNN reported that Trump confronted the FDA commissioner over the refusal to review Moderna's flu shot; the agency reversed on 18 February, twelve days before the purchase.",
      },
      {
        name: 'Silver Spring',
        country: 'United States',
        lat: 39.04,
        lng: -76.98,
        sectionAnchor: 'nine-votes-to-none',
        impact:
          "The FDA's advisers voted 9-0 for the mRNA flu shot on 18 June, and the agency approved it on 5 August: traditional approval for adults 50 to 64, accelerated for 65 and older.",
      },
      {
        name: 'Rahway',
        country: 'United States',
        lat: 40.61,
        lng: -74.28,
        sectionAnchor: 'the-cancer-trial-that-tripled-the-trade',
        impact:
          'Merck, the development partner, closed up nearly 13% at a record $152.20 on 19 August, the day the melanoma readout lifted Moderna 177%.',
      },
      {
        name: 'Fremont',
        country: 'United States',
        lat: 37.55,
        lng: -121.99,
        sectionAnchor: 'congress-was-in-the-stock-too',
        impact:
          "Ro Khanna's family trusts bought MRNA five times in 2026, each $1,001 to $15,000, including on 30 June before the readout and on 24 August after it.",
      },
      {
        name: 'Madrid',
        country: 'Spain',
        lat: 40.42,
        lng: -3.7,
        sectionAnchor: 'madrid-24-october-what-the-price-now-has-to-prove',
        impact:
          "Full INTerpath-001 data are due at ESMO's Presidential Symposium on 24 October. A hazard ratio above 0.80 would miss Moderna's own 20% benchmark.",
      },
    ],
  },
  author: 'Ezana Finance Editorial',
  category: 'politics-policy',
  subcategory: 'Congress',
  meta: {
    sectors: ['Health Care'],
    industries: ['Biotechnology', 'Pharmaceuticals'],
    investors: ['Donald Trump'],
    institutions: [
      'Moderna',
      'Merck',
      'BioNTech',
      'Pfizer',
      'Trump Organization',
      'Brownstein Hyatt Farber Schreck',
      'DGSR',
      'Quiver Quantitative',
      'Disclosed Capitol',
      'RBC Capital Markets',
      'TD Cowen',
      'William Blair',
      'Evercore ISI',
      'Leerink Partners',
      'Bank of America',
      'Morgan Stanley',
      'Nasdaq',
      'European Society for Medical Oncology',
    ],
    government: [
      'White House',
      'Department of Health and Human Services',
      'Food and Drug Administration',
      'Biomedical Advanced Research and Development Authority',
      'National Institutes of Health',
      'Office of Government Ethics',
      'US House of Representatives',
    ],
    geos: ['United States', 'Spain', 'Canada'],
    assetClasses: ['Equities'],
    themes: [
      'Political Trading',
      'Disclosure & Transparency',
      'Biotech Catalysts',
      'FDA Approvals',
      'Lobbying',
      'mRNA Technology',
    ],
    datasets: ['Congressional trading', 'Executive branch disclosures', 'Lobbying disclosures'],
    markets: ['Nasdaq-100'],
  },
  tickers: ['MRNA', 'MRK', 'BNTX', 'PFE', 'WBD'],
  entities: {
    people: [
      {
        id: 'donald-trump',
        label: 'Donald Trump',
        role: 'US President; account bought MRNA in March 2026',
      },
      {
        id: 'ro-khanna',
        label: 'Ro Khanna',
        role: 'US Representative (D-CA); family trusts trade MRNA',
      },
      {
        id: 'maria-elvira-salazar',
        label: 'Maria Elvira Salazar',
        role: 'US Representative (R-FL); reported MRNA trades on 19 August 2026',
      },
      { id: 'marty-makary', label: 'Marty Makary', role: 'FDA Commissioner until May 2026' },
      {
        id: 'vinay-prasad',
        label: 'Vinay Prasad',
        role: 'FDA vaccine center director; signed the refusal-to-file letter',
      },
      { id: 'georgina-long', label: 'Georgina Long', role: 'Presents INTerpath-001 at ESMO 2026' },
    ],
    terms: [
      { id: 'refuse-to-file', label: 'Refusal-to-File Letter' },
      { id: 'accelerated-approval', label: 'Accelerated Approval' },
      { id: 'advisory-committee', label: 'FDA Advisory Committee' },
      { id: 'relative-vaccine-efficacy', label: 'Relative Vaccine Efficacy' },
      { id: 'recurrence-free-survival', label: 'Recurrence-Free Survival' },
      { id: 'periodic-transaction-report', label: 'Periodic Transaction Report' },
      { id: 'hazard-ratio', label: 'Hazard Ratio' },
    ],
  },
  readTime: 11,
  publishedAt: '2026-10-10',
  listMeta: '10 Oct 2026',
  featured: false,
  likes: 0,
  comments: 0,
  reads: 0,
  status: 'published',
};
