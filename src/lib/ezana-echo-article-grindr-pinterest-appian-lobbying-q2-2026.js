// src/lib/ezana-echo-article-grindr-pinterest-appian-lobbying-q2-2026.js
// Ezana Echo article. Reads the Q2 2026 Lobbying Disclosure Act filings of
// Grindr, Pinterest and Appian against their Q2 2026 results. Follows
// Ezana_Echo_Skills.md (Research Dossier template); all colors are tokens.
// STATUS: draft until the three owned images land and every [VERIFY] clears.
// ============================================================
// FACT CHECK MANIFEST
// 1. Grindr LLC in-house LD-2, $522,500, posted 2026-09-28, filing_uuid
//    714e278c-d98f-4c0e-bf1d-15d0ba3c3763. The LDA index codes it
//    "3rd Quarter - Report"; LegiList attributes it to Q2 2026; no other
//    Grindr Q2 2026 report appears in the index. This article treats it as
//    Grindr's Q2 report and says so in prose -> [VERIFY: open the LD-2 print
//    page once lda.gov is back and read the period box]
// 2. Grindr quarterly series, LegiList client profile 65807: Q2'25 $372,000,
//    Q3'25 $420,000, Q4'25 $420,000, Q1'26 $432,500, Q2'26 $522,500; six
//    filings total $2,167,000. Q1'26 $432,500 also reported by Quiver
//    Quantitative (22 Apr 2026). Q4'25 $420,000 matches LDA uuid adfc8f3d.
// 3. Grindr registered in-house 2025-04-15 (LDA uuid d2e5e8f2); Brownstein
//    Hyatt Farber Schreck registered for Grindr 2025-08-25 (uuid d479a81a).
// 4. Grindr issues: HIV prevention/PEPFAR (H.R. 4779, H.R. 2534 Protect 340B
//    Act), surrogacy and IVF access for same-sex couples, age assurance
//    (H.R. 3149 App Store Accountability Act, H.R. 6333 and S. 4349 Parents
//    Over Platforms Act). Source: LD-2 specific-issue text via Quiver feed.
// 5. Pinterest Q2 2026, all posted 2026-07-20: Pinterest, Inc. in-house
//    $330,000; CM Strategic $30,000; Economic Policy Strategies $10,000.
//    Total $370,000 -> [VERIFY: period box on each LD-2 reads Q2 2026]
// 6. Pinterest in-house bills: H.R. 6484 and S. 1748 Kids Online Safety Act,
//    H.R. 7757 KIDS Act, S. 1367 NO FAKES Act, S. 1586 App Store
//    Accountability Act, S. 4407 CHATBOT Act, S. 4915 AI Labeling Act of
//    2026, federal age assurance. EPS: corporate tax reform, tariff policy.
//    Kountoupes Denham Carr & Reid $70,000 in each of Q1 and Q3 2026.
// 7. Appian Q2 2026: Appian Corporation in-house $170,000 (posted 07-19;
//    Defense, Budget/Appropriations, Computer Industry; House, Senate, HHS);
//    Hettinger Strategy Group $30,000 (07-13; Defense); 1607 Strategies
//    $30,000 (07-20; registered 2026-05-11; Budget, Defense; DHS).
//    Total $230,000. Q3: Hettinger $30,000 on FY27 NDAA acquisition systems
//    modernization; Continental Strategy registered 2026-08-06 (AI
//    automation, implementation and fraud detection; Intelligence).
// 8. Combined Q2 2026: $1,122,500. In-house $1,022,500 = 91.1%.
// 9. Q2 2026 revenue (8-K exhibits 99.1): Grindr $138.1M (+33%, FY guide
//    raised to ~$540M); Pinterest $1,179.7M (+18%, 640M MAUs, net loss
//    $46.7M); Appian $203.3M (+19%, cloud subscriptions $131.7M +23%).
// 10. Lobbying / revenue, Q2 2026: Grindr 0.378%; Pinterest 0.031%;
//     Appian 0.113%. Grindr / Pinterest intensity ratio ~12x.
// 11. State app-store laws per Loeb & Loeb (June 2026): Texas (Jan 1 2026
//     date enjoined; Fifth Circuit stayed the injunction May 28 pending
//     appeal; petitions at the Supreme Court), Utah (amended to private right
//     of action; bulk effective May 6 2027), Louisiana (delayed to Jul 1
//     2027), Alabama (Jan 1 2027). None in effect at time of writing ->
//     [VERIFY: Texas status after June 2026]
// 12. Appian: one direct federal prime award matched in the trailing two
//     years, $2.86M -> [VERIFY: reseller channel share of Appian federal
//     revenue before citing; prose keeps this as a lower bound only]
// ============================================================

export const grindrPinterestAppianLobbyingQ22026 = {
  id: 'grindr-pinterest-appian-lobbying-q2-2026',
  title:
    'Grindr, Pinterest and Appian Spent $1.12 Million Lobbying in Q2, and Two of Them Lobbied the Same Bill',
  excerpt:
    'Three tech companies filed $1.12 million in second-quarter lobbying, 91% of it through in-house teams. Grindr spent 1.4 times as much as Pinterest on less than one-eighth the revenue, and both apps lobbied the App Store Accountability Act as four states race to put age checks on app stores.',
  // TODO(images): hero and two inline images (owned or cleared) not yet supplied.
  heroImage: {
    src: '/images/ezana-echo/grindr-pinterest-appian-lobbying-q2-2026-hero.png',
    alt: 'The US Capitol dome at dusk, the setting for quarterly lobbying disclosures',
    caption:
      'Lobbying Disclosure Act reports are filed quarterly and list the amount spent, the issues and the chambers contacted. Figures in this article come from those filings.',
  },
  category: 'politics-policy',
  subcategory: 'Lobbying',
  globeRail: {
    metric: {
      title: 'GRINDR QUARTERLY LOBBYING ($K)',
      data: [
        { x: 0, y: 372 },
        { x: 1, y: 420 },
        { x: 2, y: 420 },
        { x: 3, y: 432.5 },
        { x: 4, y: 522.5 },
      ],
      startLabel: 'Q2 2025 · $372K',
      endLabel: 'Q2 2026 · $522.5K',
      note: 'Grindr has filed a larger in-house lobbying report in almost every quarter since it registered in April 2025, rising 40% year over year to $522,500, all of it spent by its own government affairs staff.',
    },
    cities: [
      {
        name: 'Washington',
        country: 'US',
        lat: 38.9072,
        lng: -77.0369,
        impact:
          'Both apps lobbied the federal App Store Accountability Act in 2026, Grindr on H.R. 3149 and Pinterest on S. 1586, a bill that would place age verification with the app stores.',
      },
      {
        name: 'Austin',
        country: 'US',
        lat: 30.2672,
        lng: -97.7431,
        impact:
          'Texas set the first app-store age law date, Jan. 1, 2026. A court enjoined it, and the Fifth Circuit stayed that injunction on May 28 pending appeal.',
      },
      {
        name: 'Salt Lake City',
        country: 'US',
        lat: 40.7608,
        lng: -111.891,
        impact:
          'Utah amended its law to a private right of action only. The bulk of it takes effect May 6, 2027.',
      },
      {
        name: 'Baton Rouge',
        country: 'US',
        lat: 30.4515,
        lng: -91.1871,
        impact:
          'Louisiana pushed its app-store law from July 1, 2026 to July 1, 2027, buying platforms another year.',
      },
      {
        name: 'Montgomery',
        country: 'US',
        lat: 32.3792,
        lng: -86.3077,
        impact:
          'Alabama is next on the calendar, with its app-store accountability law effective Jan. 1, 2027.',
      },
    ],
  },
  author: 'Ezana Finance Editorial',
  tickers: ['GRND', 'PINS', 'APPN', 'AAPL', 'GOOGL', 'META', 'SNAP', 'MTCH'],
  readTime: 9,
  publishedAt: '2026-10-18',
  listMeta: '18 Oct 2026',
  featured: false,
  likes: 0,
  comments: 0,
  reads: 0,
  status: 'draft',
  contentBlocks: [
    {
      type: 'paragraph',
      text: "Grindr, Pinterest and Appian reported a combined $1,122,500 in federal lobbying for the second quarter of 2026, according to their [[kw:lobbying-disclosure-act]]Lobbying Disclosure Act[[/kw]] filings. The total is small by Big Tech standards, but the composition is not. Grindr, a dating app with $138.1 million of quarterly revenue, spent $522,500, more than Pinterest spent on revenue eight and a half times larger. Grindr and Pinterest, two consumer apps with little else in common, both named the App Store Accountability Act in their 2026 reports, the federal bill that would move age verification onto Apple and Google. Appian, an enterprise software company, spent its $230,000 on defense and appropriations. The filings show two companies paying to decide who checks a user's age, and a third paying to stay inside the federal procurement budget.",
    },
    {
      type: 'stat-grid',
      stats: [
        {
          label: 'Combined Q2 2026 lobbying',
          value: '$1.12M',
          change: 'Grindr, Pinterest, Appian',
        },
        { label: 'Spent by in-house teams', value: '91%', change: '$1.02M of $1.12M' },
        { label: 'Grindr, year over year', value: '+40%', change: '$372K to $522.5K' },
        { label: 'Grindr lobbying / revenue', value: '0.38%', change: 'vs 0.03% at Pinterest' },
      ],
    },
    {
      type: 'heading',
      text: 'Where the $1.12 million went',
      level: 2,
    },
    {
      type: 'paragraph',
      text: "Of the $1,122,500, $1,022,500, or 91%, was reported by the companies themselves rather than by hired firms. That distinction matters in the disclosure regime. An in-house report covers the salaries and overhead of a company's own government affairs staff, while an outside firm reports only the fee it billed one client. Grindr ran all $522,500 through its own team. Pinterest paid $330,000 in-house and $40,000 to two firms, CM Strategic ($30,000) and Economic Policy Strategies ($10,000). Appian reported $170,000 in-house and $60,000 split evenly between Hettinger Strategy Group and 1607 Strategies, a firm it registered in May.",
    },
    {
      type: 'paragraph',
      text: 'Outside firms tend to be hired for access to a specific committee or agency. In-house staff tend to be hired when the policy question is permanent. By that reading, all three companies have concluded that Washington is now a standing cost line. For Grindr, which first registered in April 2025, that conclusion arrived quickly: five quarterly reports in, it outspent a company with 640 million monthly users in the second quarter.',
    },
    {
      type: 'paragraph',
      text: "The disclosure regime itself is simple. A company or firm files an LD-1 registration once it crosses the statute's activity thresholds, then an LD-2 activity report every quarter, due 20 days after the quarter closes, listing the amount, the general issue areas, the specific bills and the chambers or agencies contacted. Registrants also file an LD-203 contributions report twice a year. The second-quarter deadline fell on July 20, 2026, which is why Pinterest's three reports and Appian's outside-firm reports all carry dates between July 13 and July 20.",
    },
    {
      type: 'clearing-sankey',
      figureLabel: 'FIG. 1 · WHERE THE $1.12 MILLION WENT',
      kicker:
        'Q2 2026 LDA REPORTS · RIBBON WIDTH = REPORTED AMOUNT ($K) · IN-HOUSE TEAMS CARRIED 91% OF THE TOTAL. CLICK A RIBBON FOR THE FILING.',
      hint: 'Click a ribbon for the filing behind it.',
      source:
        'Senate Lobbying Disclosure Act LD-2 reports, Q2 2026, posted July 13 to Sept. 28, 2026. Grindr period attribution per LegiList; see the note in the text.',
      sourceGroups: [
        {
          label: 'Consumer apps',
          nodes: [
            { id: 'grnd', name: 'Grindr', display: '$522.5K' },
            { id: 'pins', name: 'Pinterest', display: '$370K' },
          ],
        },
        {
          label: 'Enterprise software',
          nodes: [{ id: 'appn', name: 'Appian', display: '$230K' }],
        },
      ],
      destinations: [
        { id: 'inhouse', name: 'In-house government affairs', sub: '$1.02M · 91% of the total' },
        { id: 'firms', name: 'Outside lobbying firms', sub: '$100K · four firms' },
      ],
      flows: [
        {
          from: 'grnd',
          to: 'inhouse',
          value: 522.5,
          tone: 'primary',
          label: '$522.5K',
          record:
            'Grindr LLC, in-house report, $522,500, posted Sept. 28, 2026. Issues: HIV prevention and PEPFAR, the Protect 340B Act, surrogacy and IVF access, and age assurance.',
        },
        {
          from: 'pins',
          to: 'inhouse',
          value: 330,
          tone: 'primary',
          label: '$330K',
          record:
            'Pinterest, Inc., in-house report, $330,000, posted July 20, 2026. Seven bills named, from the Kids Online Safety Act to the App Store Accountability Act and the AI Labeling Act of 2026.',
        },
        {
          from: 'pins',
          to: 'firms',
          value: 40,
          label: '$40K',
          record:
            'CM Strategic, $30,000, on online safety, content moderation, AI and data privacy including KOSA. Economic Policy Strategies, $10,000, on corporate tax reform and tariff policy.',
        },
        {
          from: 'appn',
          to: 'inhouse',
          value: 170,
          tone: 'primary',
          label: '$170K',
          record:
            'Appian Corporation, in-house report, $170,000, posted July 19, 2026. Issues: defense, budget and appropriations, computer industry. Contacts: House, Senate and HHS.',
        },
        {
          from: 'appn',
          to: 'firms',
          value: 60,
          label: '$60K',
          record:
            'Hettinger Strategy Group, $30,000, on defense. 1607 Strategies, $30,000, on budget and defense, with DHS listed as a contacted agency; the firm registered for Appian on May 11, 2026.',
        },
      ],
    },
    {
      type: 'heading',
      text: 'Grindr built a Washington budget in five quarters',
      level: 2,
    },
    {
      type: 'paragraph',
      text: "Grindr's in-house reports read as a straight climb: $372,000 in the second quarter of 2025, $420,000 in each of the next two quarters, $432,500 in the first quarter of 2026 and $522,500 in the latest report. That is a 40% increase in a year and $2,167,000 across six filings, including the original registration. Revenue grew more slowly over the same period, up 33% year over year to $138.1 million in the second quarter, and the company raised its full-year outlook to roughly $540 million. Lobbying is still a rounding error in Grindr's cost base, but it is the line growing fastest.",
    },
    {
      type: 'paragraph',
      text: "One filing detail needs flagging. The federal index codes Grindr's $522,500 report as a third-quarter filing, yet it was posted on Sept. 28, two days before the third quarter ended, and no separate Grindr second-quarter report appears in the index. LegiList, a lobbying data service, attributes the report to the second quarter, and this article follows that attribution. If the report is in fact a third-quarter filing, Grindr's second-quarter number is missing from the public record, and the three-company total would understate the quarter rather than overstate it.",
    },
    {
      type: 'trajectory',
      figureLabel: "FIG. 2 · GRINDR'S IN-HOUSE LOBBYING, QUARTER BY QUARTER",
      kicker:
        'GRINDR LLC LD-2 REPORTS · $ THOUSANDS PER QUARTER · FIVE REPORTS SINCE THE APRIL 2025 REGISTRATION, EACH AT OR ABOVE THE ONE BEFORE.',
      hint: 'Diamonds mark the first report and the latest one.',
      source:
        'Senate LDA reports for Grindr LLC as compiled by LegiList (client 65807); Q1 2026 also reported by Quiver Quantitative. Q2 2026 period attribution per LegiList.',
      series: [
        {
          key: 'grnd',
          label: 'Grindr',
          color: 'var(--echo-chart-blue)',
          data: [
            { x: 1, y: 372 },
            { x: 2, y: 420 },
            { x: 3, y: 420 },
            { x: 4, y: 432.5 },
            { x: 5, y: 522.5 },
          ],
        },
      ],
      annotations: [
        { x: 1, y: 372, label: '$372K', sub: 'first quarterly report' },
        { x: 5, y: 522.5, label: '$522.5K', sub: '+40% year over year' },
      ],
      yLabel: '$K per quarter',
      yMax: 600,
      xMin: 1,
      xMax: 5,
      xTicks: [
        { x: 1, label: 'Q2 2025' },
        { x: 2, label: 'Q3 2025' },
        { x: 3, label: 'Q4 2025' },
        { x: 4, label: 'Q1 2026' },
        { x: 5, label: 'Q2 2026' },
      ],
    },
    {
      type: 'callout',
      label: 'Lobbying intensity, Grindr vs Pinterest',
      value: '12x',
      context:
        "Grindr's Q2 lobbying equaled 0.38% of its quarterly revenue. Pinterest's equaled 0.03%, and Appian's 0.11%. Per dollar of sales, Grindr out-lobbied Pinterest roughly twelve to one.",
    },
    {
      type: 'heading',
      text: 'Two apps, one bill',
      level: 2,
    },
    {
      type: 'paragraph',
      text: "The overlap between Grindr and Pinterest is narrow but exact. Grindr's report names H.R. 3149, the House version of the App Store Accountability Act, along with H.R. 6333 and S. 4349, the Parents Over Platforms Act. Pinterest's in-house report names S. 1586, the Senate version of the same App Store Accountability Act, among seven bills. The bill would make app store operators verify a user's age and pass that signal to developers. For any app with an adult audience or a teenage one, the question of who performs the check, the store or the app, decides who carries the cost, the friction at sign-up and the legal exposure.",
    },
    {
      type: 'paragraph',
      text: "Beyond that shared bill, their agendas diverge. Pinterest also lobbied both chambers' versions of the Kids Online Safety Act (H.R. 6484 and S. 1748), the KIDS Act (H.R. 7757) and three AI bills: the NO FAKES Act, the CHATBOT Act and the AI Labeling Act of 2026. Grindr's other issues are health policy: HIV prevention funding under PEPFAR, the Protect 340B Act on drug discounts, and surrogacy and IVF access for same-sex couples. Appian appears in none of the consumer rows. Its 2026 filings cite defense, appropriations and, in the third quarter, the FY27 National Defense Authorization Act provisions on acquisition systems modernization.",
    },
    {
      type: 'paragraph',
      text: "Pinterest's outside spending is steadier than its in-house line. Kountoupes Denham Carr & Reid reported $70,000 for Pinterest in the first quarter and again in the third, both on online safety, content moderation, AI, age verification and data privacy, with the KIDS Act named in the latest report. Economic Policy Strategies reported $10,000 in the first quarter and $10,000 in the second, on tax and trade. CM Strategic's $30,000 in the second quarter covered the same kids safety territory. Three firms and an in-house team working overlapping bills is the profile of a company treating child safety law as its central policy exposure.",
    },
    {
      type: 'adjudication-matrix',
      figureLabel: 'FIG. 3 · WHO LOBBIED WHICH BILL',
      kicker:
        '2026 LDA REPORTS · ROWS = BILL OR ISSUE · COLUMNS = FILER · SOLID = BILL NAMED IN A 2026 REPORT, HATCHED = ISSUE LOBBIED WITHOUT A BILL NAMED. CLICK ANY CELL FOR THE FILING TEXT.',
      hint: 'Click a cell for the filing language behind the grade.',
      source:
        'Specific-issue text of 2026 LD-2 reports filed by or for Grindr LLC, Pinterest, Inc. and Appian Corporation, January to October 2026.',
      cornerLabel: 'Bill or issue \\ Filer',
      legend: {
        same: 'named: the bill appears in a 2026 report',
        part: 'issue only: lobbied the topic, no bill named',
        none: 'absent: not in 2026 reports',
      },
      cols: ['Grindr', 'Pinterest', 'Appian'],
      rows: [
        {
          label: 'App Store Accountability Act',
          cells: [
            {
              value: 'same',
              note: 'Grindr names H.R. 3149 under age assurance in its Q1 and latest reports.',
            },
            { value: 'same', note: 'Pinterest names S. 1586 in its $330,000 in-house report.' },
            { value: 'none', note: 'Not cited in any 2026 Appian report.' },
          ],
        },
        {
          label: 'Parents Over Platforms Act',
          cells: [
            { value: 'same', note: 'Grindr names H.R. 6333 and S. 4349.' },
            {
              value: 'part',
              note: 'Pinterest lists federal age assurance issues without naming this bill.',
            },
            { value: 'none', note: 'Not cited.' },
          ],
        },
        {
          label: 'Kids Online Safety Act',
          cells: [
            { value: 'none', note: "Not cited in Grindr's 2026 reports." },
            {
              value: 'same',
              note: 'Pinterest names H.R. 6484 and S. 1748; CM Strategic also cites KOSA.',
            },
            { value: 'none', note: 'Not cited.' },
          ],
        },
        {
          label: 'KIDS Act (H.R. 7757)',
          cells: [
            { value: 'none', note: 'Not cited.' },
            {
              value: 'same',
              note: "Named in the in-house report and in Kountoupes Denham Carr & Reid's Q3 report.",
            },
            { value: 'none', note: 'Not cited.' },
          ],
        },
        {
          label: 'AI bills (NO FAKES, CHATBOT, AI Labeling)',
          cells: [
            { value: 'none', note: "No AI legislation in Grindr's 2026 reports." },
            { value: 'same', note: 'Pinterest names S. 1367, S. 4407 and S. 4915.' },
            {
              value: 'part',
              note: 'Continental Strategy registered in August on AI automation, implementation and fraud detection, no bill named.',
            },
          ],
        },
        {
          label: 'HIV prevention and 340B',
          cells: [
            {
              value: 'same',
              note: 'Grindr names H.R. 4779 (State and foreign operations appropriations) and H.R. 2534, the Protect 340B Act.',
            },
            { value: 'none', note: 'Not cited.' },
            { value: 'none', note: 'Not cited.' },
          ],
        },
        {
          label: 'Defense authorization and appropriations',
          cells: [
            { value: 'none', note: 'Not cited.' },
            { value: 'none', note: 'Not cited.' },
            {
              value: 'same',
              note: "Hettinger Strategy Group's Q3 report cites the FY27 NDAA on acquisition systems modernization; Q2 reports list defense and appropriations.",
            },
          ],
        },
        {
          label: 'Corporate tax and tariffs',
          cells: [
            { value: 'none', note: 'Not cited.' },
            {
              value: 'part',
              note: 'Economic Policy Strategies lobbied US and international corporate tax reform and tariff policy, no bill named.',
            },
            { value: 'none', note: 'Not cited.' },
          ],
        },
      ],
    },
    {
      type: 'heading',
      text: 'The state patchwork forcing the issue',
      level: 2,
    },
    {
      type: 'paragraph',
      text: "The federal bill matters because the states are moving first. Four states have passed app store accountability laws, according to a June 2026 survey by the law firm Loeb & Loeb, and none was yet in force when it was written. Texas set the earliest date, Jan. 1, 2026, but a court enjoined the law before it took effect; the Fifth Circuit stayed that injunction on May 28 pending appeal, and emergency petitions reached the Supreme Court. Utah amended its law to leave only a private right of action, with the bulk taking effect May 6, 2027. Louisiana delayed its law a full year, to July 1, 2027, and Alabama's takes effect Jan. 1, 2027.",
    },
    {
      type: 'paragraph',
      text: "Four laws with four dates and four enforcement models are the expensive outcome for an app developer. One federal standard would replace that with a single compliance path, whichever party it assigns the check to, and that is the stake behind two very different apps naming the same bill. LD-2 reports list subjects, not positions, so the filings do not show which side either company argued. The timing is visible, though: Grindr's spending stepped up to $522,500 in the same quarter the Fifth Circuit revived the Texas law, with three more state dates due inside the following twelve months.",
    },
    {
      type: 'paragraph',
      text: 'California took a third route. Its Digital Age Assurance Act, AB 1043, signed in October 2025, places the age signal with operating system providers rather than app stores, according to the same Loeb & Loeb survey. That makes at least three allocation models live in US law at once: the store (Texas, Utah, Louisiana, Alabama), the operating system (California) and, in the federal kids safety bills, the platform itself. Each model sends the compliance bill to a different set of tickers, which is why the question has drawn lobbying from companies as different as a dating app and a visual search engine.',
    },
    {
      type: 'stage-boards',
      figureLabel: 'FIG. 4 · FOUR STATES, FOUR CLOCKS',
      kicker:
        'STATE APP STORE ACCOUNTABILITY LAWS · FILLED CELL = CURRENT STAGE AS OF JUNE 2026 · NONE YET IN FORCE. CLICK A STAGE FOR ITS RECORD.',
      hint: 'Click a stage cell for its record.',
      source:
        "Loeb & Loeb, Children's Online Privacy 2026 alert, June 2026. Status may have changed since publication [VERIFY: Texas appeal status].",
      boards: [
        {
          id: 'tx',
          title: 'Texas',
          color: 'var(--echo-chart-orange)',
          currentIndex: 1,
          stages: [
            {
              label: 'Signed',
              sub: 'first date set',
              note: 'Original effective date of Jan. 1, 2026, the earliest of the four states.',
            },
            {
              label: 'Challenged',
              sub: 'in litigation',
              note: 'A preliminary injunction was entered before the effective date. The Fifth Circuit stayed it on May 28 pending appeal, and emergency petitions to vacate the stay went to the Supreme Court.',
            },
            {
              label: 'Scheduled',
              sub: 'date pending',
              note: 'The effective date depends on the outcome of the appeal.',
            },
            { label: 'In force', sub: 'not yet', note: 'Not in effect as of June 2026.' },
          ],
          stats: [
            { value: 'Jan 1, 2026', label: 'original effective date', source: 'LOEB & LOEB' },
          ],
          summary: 'The earliest law and the only one still in active litigation.',
        },
        {
          id: 'ut',
          title: 'Utah',
          color: 'var(--echo-chart-blue)',
          currentIndex: 2,
          stages: [
            {
              label: 'Signed',
              sub: 'enacted',
              note: 'Enacted with a first effective date of May 6, 2026.',
            },
            {
              label: 'Challenged',
              sub: 'settled',
              note: 'After a challenge, the law was amended to remove state enforcement, leaving a private right of action, and the case was voluntarily dismissed.',
            },
            {
              label: 'Scheduled',
              sub: 'May 6, 2027',
              note: 'The bulk of the law takes effect May 6, 2027.',
            },
            { label: 'In force', sub: 'not yet', note: 'Not in effect as of June 2026.' },
          ],
          stats: [
            { value: 'May 6, 2027', label: 'bulk of the law takes effect', source: 'LOEB & LOEB' },
          ],
          summary: 'Private suits only, no state enforcement.',
        },
        {
          id: 'la',
          title: 'Louisiana',
          color: 'var(--echo-chart-purple)',
          currentIndex: 2,
          stages: [
            {
              label: 'Signed',
              sub: 'enacted',
              note: 'Enacted with an original effective date of July 1, 2026.',
            },
            {
              label: 'Challenged',
              sub: 'none noted',
              note: 'No challenge noted in the June 2026 survey.',
            },
            {
              label: 'Scheduled',
              sub: 'Jul 1, 2027',
              note: 'A bill signed by the governor delayed the effective date to July 1, 2027.',
            },
            { label: 'In force', sub: 'not yet', note: 'Not in effect as of June 2026.' },
          ],
          stats: [{ value: 'Jul 1, 2027', label: 'delayed effective date', source: 'LOEB & LOEB' }],
          summary: 'Pushed back one full year by the legislature.',
        },
        {
          id: 'al',
          title: 'Alabama',
          color: 'var(--echo-chart-blue)',
          currentIndex: 2,
          stages: [
            {
              label: 'Signed',
              sub: 'enacted',
              note: 'Enacted as an app store accountability act.',
            },
            {
              label: 'Challenged',
              sub: 'none noted',
              note: 'No challenge noted in the June 2026 survey.',
            },
            { label: 'Scheduled', sub: 'Jan 1, 2027', note: 'Effective Jan. 1, 2027.' },
            { label: 'In force', sub: 'not yet', note: 'Not in effect as of June 2026.' },
          ],
          stats: [{ value: 'Jan 1, 2027', label: 'effective date', source: 'LOEB & LOEB' }],
          summary: 'Next date on the calendar.',
        },
      ],
    },
    {
      type: 'cta-callout',
      headline: 'Every filing behind this article, searchable',
      body: 'The lobbying tracker on Ezana lists each LD-2 report by company, registrant, amount, issue and chamber contacted, quarter by quarter. Search Grindr, Pinterest or Appian to open the filings cited here and compare them with any other filer.',
      ctaLabel: 'Open the lobbying tracker',
      ctaHref: '/datasets/government/lobbying',
      ctaAuthGate: false,
    },
    {
      type: 'heading',
      text: 'Appian lobbies a different Washington',
      level: 2,
    },
    {
      type: 'paragraph',
      text: "Appian's $230,000 sits in the same headline but answers a different question. The company sells low-code process automation to large enterprises and governments, and its second-quarter revenue rose 19% to $203.3 million, with cloud subscriptions up 23% to $131.7 million. Its in-house report listed the House, the Senate and the Department of Health and Human Services as contacts. 1607 Strategies, registered in May, added the Department of Homeland Security. In August a third outside firm, Continental Strategy, registered on AI automation and fraud detection, with intelligence listed as an issue area.",
    },
    {
      type: 'paragraph',
      text: "The pattern is that of a vendor positioning for budget lines rather than fighting a regulation. Appian's spending equaled 0.11% of quarterly revenue, between Grindr's 0.38% and Pinterest's 0.03%. Ezana's contract-award match finds one direct federal prime award to Appian in the trailing two years, worth $2.86 million, which is a lower bound: much federal software reaches agencies through resellers [VERIFY: Appian reseller share]. The FY27 defense authorization, which carries the acquisition modernization language Appian lobbied in the third quarter, is the bill to watch for that thesis.",
    },
    {
      type: 'heading',
      text: 'Three companies, compared',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'Set side by side, the three filers spend at three very different intensities for three different reasons. Grindr spends 0.38% of revenue on a health-policy and age-assurance agenda, entirely in-house. Pinterest spends 0.03% on the widest bill list of the three, seven bills in a single report. Appian spends 0.11% across one in-house team and three outside firms, aimed at defense, homeland security and health agencies.',
    },
    {
      type: 'dossier-table',
      figureLabel: 'FIG. 5 · THE THREE FILERS',
      kicker:
        'Q2 2026 LOBBYING AGAINST Q2 2026 RESULTS · ANCHOR = REPORTED LOBBYING AND SHARE OF QUARTERLY REVENUE. EXPAND A ROW FOR THE DOSSIER.',
      hint: 'Press DOSSIER + on any row for the filing detail.',
      source:
        'Senate LDA LD-2 reports, Q2 2026; company Q2 2026 earnings releases (Form 8-K exhibit 99.1).',
      rows: [
        {
          name: 'Grindr',
          tag: 'GRND',
          role: 'Dating app, in-house lobbying only',
          anchor: '$522.5K · 0.38% of revenue',
          keyRisk: 'App-level age checks at sign-up',
          dossier: [
            {
              label: 'Q2 2026 revenue',
              text: '$138.1M, up 33% year over year; full-year outlook raised to roughly $540M.',
            },
            {
              label: 'Registrants',
              text: 'Grindr LLC in-house since April 2025; Brownstein Hyatt Farber Schreck registered in August 2025.',
            },
            {
              label: 'Bills named',
              text: 'H.R. 3149 App Store Accountability Act; H.R. 6333 and S. 4349 Parents Over Platforms Act; H.R. 4779; H.R. 2534 Protect 340B Act.',
            },
            {
              label: 'Filing note',
              text: 'The $522,500 report is indexed as Q3 but posted Sept. 28; attributed to Q2 per LegiList.',
            },
          ],
        },
        {
          name: 'Pinterest',
          tag: 'PINS',
          role: 'Social platform, in-house plus two firms',
          anchor: '$370K · 0.03% of revenue',
          keyRisk: 'Kids safety duty of care',
          dossier: [
            {
              label: 'Q2 2026 revenue',
              text: '$1.18B, up 18%; 640M monthly active users; net loss of $46.7M.',
            },
            {
              label: 'Registrants',
              text: 'Pinterest, Inc. $330,000; CM Strategic $30,000; Economic Policy Strategies $10,000. Kountoupes Denham Carr & Reid reported $70,000 in each of Q1 and Q3.',
            },
            {
              label: 'Bills named',
              text: 'KOSA (H.R. 6484, S. 1748), KIDS Act (H.R. 7757), NO FAKES Act (S. 1367), App Store Accountability Act (S. 1586), CHATBOT Act (S. 4407), AI Labeling Act of 2026 (S. 4915).',
            },
          ],
        },
        {
          name: 'Appian',
          tag: 'APPN',
          role: 'Enterprise software, in-house plus three firms',
          anchor: '$230K · 0.11% of revenue',
          keyRisk: 'Federal budget and procurement cycles',
          dossier: [
            {
              label: 'Q2 2026 revenue',
              text: '$203.3M, up 19%; cloud subscriptions $131.7M, up 23%; GAAP net loss of $11.8M.',
            },
            {
              label: 'Registrants',
              text: 'Appian Corporation $170,000; Hettinger Strategy Group $30,000; 1607 Strategies $30,000 (registered May 2026); Continental Strategy registered August 2026.',
            },
            {
              label: 'Agencies contacted',
              text: 'House, Senate, Health and Human Services, Homeland Security.',
            },
          ],
        },
      ],
    },
    {
      type: 'heading',
      text: 'What the filings price in',
      level: 2,
    },
    {
      type: 'paragraph',
      text: "The base case is that the state patchwork persists through 2027. Alabama's law arrives in January, Utah's in May and Louisiana's in July, while the federal App Store Accountability Act stays in committee. In that world, consumer apps keep paying for their position in Washington and in each state capital, and Grindr's quarterly reports stay at or above the $420,000 run rate it set through 2025. The alternative is a federal standard that places verification with the app stores, which would hand the compliance burden to Apple and Google and leave the question of whether state laws are displaced to the courts.",
    },
    {
      type: 'paragraph',
      text: 'The bear case for the apps is the opposite allocation: a duty of care on platforms of the kind KOSA proposes, with each service verifying its own users. For a subscription app like Grindr, where revenue depends on converting free users at sign-up, added friction at that step is the cost that matters. The filings show all three companies paying to be in the room while that allocation is decided: Grindr and Pinterest on the age-check bills, Appian on the budget that funds its federal customers.',
    },
    {
      type: 'scenario-chain',
      figureLabel: 'FIG. 6 · WHO ENDS UP CHECKING THE AGE',
      kicker:
        'THREE PATHS FOR APP AGE VERIFICATION THROUGH 2027 · TWO STEPS LEAD TO EACH OUTCOME FOR CONSUMER APPS · DASHED BAR = THE NUMBER THAT FALSIFIES THE ESCALATION READ.',
      hint: 'Each row is a path, not a forecast probability.',
      source:
        'Ezana Finance Editorial scenarios built on the LDA filings and state-law status cited in this article. Scenarios are judgments, not estimates.',
      scenarios: [
        {
          id: 'base',
          label: 'State patchwork persists',
          tone: 'base',
          range: 'through 2027',
          steps: [
            { label: 'States keep the dates', sub: 'Alabama, Utah, Louisiana in 2027' },
            { label: 'Federal bills stall', sub: 'S. 1586 and H.R. 3149 in committee' },
          ],
          result: { value: 'Spend holds', sub: 'Grindr at or above $420K a quarter' },
        },
        {
          id: 'alt',
          label: 'Federal store standard',
          tone: 'alt',
          range: 'if enacted',
          steps: [
            {
              label: 'App Store Accountability passes',
              sub: 'stores verify, apps receive the signal',
            },
            { label: 'Preemption litigated', sub: 'state laws narrowed or upheld in court' },
          ],
          result: { value: 'Cost moves to stores', sub: 'AAPL and GOOGL carry the check' },
        },
        {
          id: 'bear',
          label: 'Platform duty of care',
          tone: 'bear',
          range: 'if enacted',
          steps: [
            { label: 'KOSA-style duty passes', sub: 'obligations land on each platform' },
            { label: 'Per-app verification', sub: 'friction moves to sign-up' },
          ],
          result: { value: 'Apps carry the check', sub: 'GRND and PINS absorb the cost' },
        },
      ],
      killSwitch:
        "The escalation read is wrong if Grindr's next two quarterly reports each come in below $420,000, its 2025 run rate.",
    },
    {
      type: 'paragraph',
      text: "The next checkpoint is close. Third-quarter reports are due 20 days after the quarter closes, which puts Pinterest's in-house filing and the rest of the outside firms' reports on the record within days of this article. Two numbers will say whether the quarter was a peak or a new floor: whether Grindr files a separate report for the third quarter, and whether Pinterest's in-house figure stays near $330,000. GRND, PINS and APPN carry the direct exposure; AAPL and GOOGL carry the counterweight if the federal store standard wins; META, SNAP and MTCH sit in the same consumer-app line of fire as the kids safety bills move.",
    },
    {
      type: 'cta-callout',
      headline: 'Track the Q3 filings as they post',
      body: 'Capitol Watch joins lobbying reports with congressional trades, federal contracts and committee seats. Follow GRND, PINS and APPN to see each new filing, the amount and the bills named the day it is posted.',
      ctaLabel: 'Open Capitol Watch',
      ctaHref: '/datasets/capitol-watch',
      ctaAuthGate: false,
    },
  ],
};

export default grindrPinterestAppianLobbyingQ22026;
