/**
 * Sample content for the Research Library (/org-team-hub/research-library).
 *
 * Served ONLY to master admin and demo accounts by
 * GET /api/org/research-notes/sample, so the page can be reviewed and
 * presented from a council with few documents. Real councils never receive
 * it, and the page labels it "Sample content" while it shows. Nothing here is
 * read from or written to the database: a document written, edited,
 * submitted, published, pinned, commented on or deleted while it shows stays
 * on the page and is gone on reload.
 *
 * It is the same sample council as the Command Center, the Trading Desk,
 * Fund Analytics, Assignments and the Org chart: the same nine members, the
 * same four sector teams (Financials, Healthcare, Technology, Industrials)
 * and the same holdings and pitches (NVDA follow-on, CAT, AAPL, LLY). Two
 * former members (alumni) wrote some of the older work and handed coverage
 * over. Every name is invented.
 *
 * The derived payloads have the same shapes as the live routes (library
 * search, document, versions, comments, files, dossier, coverage lineage,
 * Sonar reports), so the page draws them with the same code, and every rule
 * comes from src/lib/org-research-library-model.js.
 *
 * Pure: no React, no fetch, no server imports. Every row carries is_demo.
 */
import { getMemberPermissions } from './org-permissions-config.js';
import {
  KIND_LABEL,
  MAX_FILE_BYTES,
  STALE_DAYS,
  blockersOf,
  countByNote,
  decorate,
  isManagerRole,
  kindOfFile,
  librarySummary,
  lineageOverview,
  missingSections,
  noteRights,
  readiness,
  searchLocal,
  shelves,
  visibleRows,
} from './org-research-library-model.js';

const DAY = 86400000;
const HOUR = 3600000;
const id = (prefix, n) => `sample-${prefix}-${String(n).padStart(3, '0')}`;
const memberOf = (n) => id('member', n);
const userOf = (n) => id('user', n);
const docOf = (n) => id('doc', n);

/* The people the other org samples name, plus two alumni. */
const PEOPLE = {
  tesfaye: { n: 1, name: 'Amara Tesfaye', role: 'analyst', sub: 'Senior Analyst' },
  bekele: { n: 2, name: 'Mikael Bekele', role: 'analyst', sub: 'Analyst' },
  haile: { n: 3, name: 'Selam Haile', role: 'portfolio_manager', sub: 'Senior PM' },
  okoye: { n: 4, name: 'Chidi Okoye', role: 'portfolio_manager', sub: 'PM' },
  lindqvist: { n: 5, name: 'Ingrid Lindqvist', role: 'portfolio_manager', sub: 'PM' },
  park: { n: 6, name: 'Daniel Park', role: 'portfolio_manager', sub: 'PM' },
  rossi: { n: 7, name: 'Elena Rossi', role: 'analyst', sub: 'Senior Analyst' },
  weber: { n: 8, name: 'Jonas Weber', role: 'analyst', sub: 'Analyst' },
  alvarez: { n: 9, name: 'Tomas Alvarez', role: 'analyst', sub: 'Junior Analyst' },
  haddad: { n: 10, name: 'Noor Haddad', role: 'analyst', sub: 'Analyst', alum: true },
  brandt: { n: 11, name: 'Lukas Brandt', role: 'analyst', sub: 'Senior Analyst', alum: true },
};

const PITCH_BODY = (thesis, valuation, catalysts, risks) =>
  [
    '## Thesis',
    '',
    thesis,
    '',
    '## Valuation',
    '',
    valuation,
    '',
    ...(catalysts ? ['## Catalysts', '', catalysts, ''] : []),
    ...(risks ? ['## Risks', '', risks, ''] : []),
  ].join('\n');

/*
 * The documents. by: a person key or 'me' (the viewer). created and updated
 * are days ago. versions: earlier titles (oldest first) when edited.
 * comments: [who, hours ago, text, block?, resolved?]. files: [name, bytes,
 * who, days ago].
 */
const DOCS = [
  {
    n: 1,
    type: 'note',
    title: 'JPM: net interest income after the rate cuts',
    ticker: 'JPM',
    sector: 'Financials',
    term: 'Fall 2026',
    by: 'tesfaye',
    status: 'published',
    created: 14,
    updated: 12,
    exemplar: true,
    pinned: true,
    views: 41,
    downloads: 6,
    tags: ['banks', 'nii', 'jpm'],
    abstract:
      'Net interest income held up better than the council expected after two rate cuts, because deposit costs fell faster than loan yields. Fee income carried the quarter. The position still fits the Financials sleeve.',
    body: '## What changed\n\nTwo rate cuts since the pitch. Deposit costs fell **faster than loan yields**, so the margin compressed less than modelled.\n\n## What it means for the fund\n\n- Net interest income guidance was held.\n- Fee income grew for a third quarter.\n- Credit costs are the open question for the next two quarters.\n\n## Next review\n\nAfter the next quarterly report.',
    citations: 'Quarterly report and earnings call; council model v3.',
    versions: ['JPM: rate cut impact', 'JPM: net interest income after the cuts'],
    comments: [
      ['okoye', 300, 'Clear and short. Marking this as an exemplar for the new class.'],
      ['bekele', 280, 'Useful framing for the healthcare insurers too.'],
      ['tesfaye', 270, 'Thanks. I added the deposit cost table.'],
    ],
    files: [
      ['JPM_nii_bridge.xlsx', 186000, 'tesfaye', 12],
      ['JPM_note_charts.pdf', 942000, 'tesfaye', 12],
    ],
  },
  {
    n: 2,
    type: 'primer',
    title: 'Bank sector primer',
    sector: 'Financials',
    term: 'Fall 2026',
    by: 'okoye',
    status: 'published',
    created: 46,
    updated: 40,
    exemplar: true,
    views: 63,
    downloads: 14,
    tags: ['primer', 'banks', 'onboarding'],
    abstract:
      'How a bank makes money, the five figures to read first in a quarterly report, and how the council values banks. Written for analysts joining the Financials team.',
    body: '## How a bank makes money\n\nNet interest income, fees, and the cost of credit.\n\n## Five figures to read first\n\n1. Net interest margin\n2. Deposit growth and cost\n3. Fee income\n4. Provisions for credit losses\n5. Capital ratio\n\n## How we value banks\n\nPrice to tangible book against return on tangible equity.',
    citations: 'Council training material.',
    files: [['Bank_primer_slides.pptx', 2310000, 'okoye', 40]],
  },
  {
    n: 3,
    type: 'pitch_memo',
    title: 'Investment pitch: NVDA follow-on',
    ticker: 'NVDA',
    sector: 'Information Technology',
    term: 'Fall 2026',
    by: 'me',
    status: 'under_review',
    created: 6,
    updated: 1,
    pitch: 1,
    views: 9,
    tags: ['pitch', 'semis', 'nvda'],
    abstract:
      'Adds to the NVDA position on the view that data center spending holds for two more years. The price is above the range the team underwrote, so the size is small.',
    body: PITCH_BODY(
      'Data center spending keeps growing for at least two more years, and the company keeps most of the margin.',
      'Two methods: a discounted cash flow and a multiple of next year earnings against peers. Both land above the current price, by less than at the first pitch.',
      'Next quarterly report and the product launch in the spring.',
      null,
    ),
    citations: 'Quarterly reports; Technology team model; Sonar fund fit report v3.',
    versions: ['NVDA follow-on: draft'],
    comments: [
      ['haile', 20, 'The memo has no risks section. Add one before this goes to committee.', true],
      ['rossi', 30, 'Valuation section reads well. The peer table is a good addition.'],
    ],
    files: [['NVDA_followon_model.xlsx', 1840000, 'me', 2]],
  },
  {
    n: 4,
    type: 'model',
    title: 'Semiconductor comparables: first pass',
    ticker: 'NVDA',
    sector: 'Information Technology',
    term: 'Fall 2026',
    by: 'me',
    status: 'draft',
    visibility: 'team',
    created: 2,
    updated: 2,
    tags: ['semis', 'comps'],
    abstract: '',
    body: 'Peer set and multiples for the semiconductor names the Technology team covers. Work in progress.',
  },
  {
    n: 5,
    type: 'note',
    title: 'MSFT: cloud margin check',
    ticker: 'MSFT',
    sector: 'Information Technology',
    term: 'Fall 2026',
    by: 'rossi',
    status: 'published',
    created: 21,
    updated: 20,
    views: 22,
    downloads: 2,
    tags: ['cloud', 'msft'],
    abstract:
      'Cloud growth held and margins widened again. Nothing here changes the position; it confirms the original case.',
    body: '## Summary\n\nCloud revenue growth held at the pace in the pitch, and operating margin widened for a second quarter.\n\n## Watch\n\nCapital spending is rising faster than revenue.',
    comments: [['haile', 470, 'Agree. Keep it on the monthly check-in list.']],
  },
  {
    n: 6,
    type: 'pitch_memo',
    title: 'Investment pitch: AAPL',
    ticker: 'AAPL',
    sector: 'Information Technology',
    term: 'Fall 2026',
    by: 'rossi',
    status: 'under_review',
    created: 9,
    updated: 3,
    pitch: 3,
    views: 12,
    tags: ['pitch', 'aapl'],
    abstract:
      'The drawdown put the price back inside the range where the team first bought. Services growth has not slowed.',
    body: PITCH_BODY(
      'Services keep growing faster than hardware, which lifts the margin of the whole company.',
      'Earnings multiple against its own five year range and a discounted cash flow.',
      'Services revenue disclosure at the next report.',
      'A slower upgrade cycle and regulation of the app store.',
    ),
    versions: ['AAPL pitch: outline'],
    comments: [
      ['haile', 50, 'Show the services margin assumption in the valuation table.', true],
      ['okoye', 44, 'The regulation risk needs a size, not just a sentence.', true],
      ['rossi', 40, 'Working on both. Will resubmit this week.'],
    ],
    files: [
      ['AAPL_pitch_deck.pptx', 3120000, 'rossi', 3],
      ['AAPL_model.xlsx', 1280000, 'rossi', 3],
    ],
  },
  {
    n: 7,
    type: 'model',
    title: 'LLY valuation refresh',
    ticker: 'LLY',
    sector: 'Health Care',
    term: 'Fall 2026',
    by: 'bekele',
    status: 'under_review',
    created: 8,
    updated: 2,
    views: 7,
    tags: ['lly', 'valuation'],
    abstract:
      'Model rolled forward one quarter ahead of the trial readout. Base case unchanged; the downside case now carries a larger weight.',
    body: '## Changes\n\n- Rolled forward one quarter and tied to the reported figures.\n- Downside weight raised from 20% to 30% ahead of the readout.\n\n## Result\n\nThe base case is unchanged.',
    comments: [['lindqvist', 30, 'Looks right. I will publish after the team meeting.']],
    files: [['LLY_model_Q3.xlsx', 2040000, 'bekele', 2]],
  },
  {
    n: 8,
    type: 'post_mortem',
    title: 'UNH: guidance cut post-mortem',
    ticker: 'UNH',
    sector: 'Health Care',
    term: 'Spring 2026',
    by: 'alvarez',
    status: 'published',
    created: 104,
    updated: 101,
    views: 30,
    downloads: 3,
    tags: ['post-mortem', 'unh'],
    abstract:
      'Medical cost trend came in above plan for a second quarter and guidance was lowered. The pitch did not size this risk; the note records what the council would check earlier next time.',
    body: '## What we expected\n\nStable medical cost trend and margin recovery.\n\n## What happened\n\nCost trend ran above plan for two quarters and guidance was lowered.\n\n## Lessons\n\nTrack the cost trend monthly from public filings, not only at earnings.',
    comments: [
      ['lindqvist', 2400, 'Good lessons section. Linking this in the Healthcare onboarding.'],
    ],
  },
  {
    n: 9,
    type: 'note',
    title: 'MRK: pricing rule exposure',
    ticker: 'MRK',
    sector: 'Health Care',
    term: 'Fall 2026',
    by: 'alvarez',
    status: 'draft',
    created: 4,
    updated: 4,
    tags: ['mrk', 'policy'],
    abstract: '',
    body: 'Which products the new pricing rule would reach, and when. Draft for the Healthcare team.',
  },
  {
    n: 10,
    type: 'pitch_memo',
    title: 'Investment pitch: CAT',
    ticker: 'CAT',
    sector: 'Industrials',
    term: 'Fall 2026',
    by: 'weber',
    status: 'published',
    created: 33,
    updated: 30,
    pitch: 2,
    views: 26,
    downloads: 4,
    tags: ['pitch', 'cat'],
    abstract:
      'The services share of revenue keeps rising, which supports margins through the cycle. Dealer inventories are normal.',
    body: PITCH_BODY(
      'Aftermarket services make the earnings less cyclical than the market prices in.',
      'Earnings multiple across the cycle and a discounted cash flow.',
      'Services share disclosure and dealer inventory data each quarter.',
      'A lower-cost competitor and a slowdown in mining equipment orders.',
    ),
    versions: ['CAT pitch: outline', 'CAT pitch: committee draft'],
    files: [['CAT_pitch_deck.pdf', 2780000, 'weber', 30]],
    comments: [['park', 740, 'Approved by committee. Published for the record.']],
  },
  {
    n: 11,
    type: 'model',
    title: 'GE segment model',
    ticker: 'GE',
    sector: 'Industrials',
    term: 'Spring 2026',
    by: 'weber',
    status: 'published',
    created: 142,
    updated: 138,
    views: 11,
    tags: ['ge', 'model'],
    abstract: 'Segment model for GE with margins reconciled to the filing after the rework.',
    body: 'Segment revenue and margin by business, reconciled to the annual filing.',
    files: [['GE_segment_model.xlsx', 1520000, 'weber', 138]],
  },
  {
    n: 12,
    type: 'note',
    title: 'BAC: credit cost note',
    ticker: 'BAC',
    sector: 'Financials',
    term: 'Spring 2026',
    by: 'haddad',
    status: 'published',
    created: 124,
    updated: 120,
    views: 17,
    tags: ['bac', 'credit'],
    abstract:
      'Credit costs are normalising from a low base. The note sets the provisions level at which the council would revisit the position.',
    body: 'Provisions rose for a third quarter but stay below the pre-2020 average. Revisit the position if they pass that average.',
  },
  {
    n: 13,
    type: 'note',
    title: 'JPM and BAC coverage handoff',
    ticker: 'JPM',
    sector: 'Financials',
    term: 'Fall 2025',
    by: 'haddad',
    status: 'published',
    created: 203,
    updated: 200,
    views: 19,
    tags: ['handoff', 'jpm', 'bac'],
    abstract:
      'Everything the next analyst needs to pick up JPM and BAC: the theses, the models, the open questions and who to ask.',
    body: '## Positions\n\nJPM and BAC, both in the Financials sleeve.\n\n## Open questions\n\n- Deposit costs after rate cuts\n- Credit costs\n\n## Files\n\nModels are attached to the original pitches.',
  },
  {
    n: 14,
    type: 'note',
    title: 'NVDA: data center demand, spring update',
    ticker: 'NVDA',
    sector: 'Information Technology',
    term: 'Spring 2026',
    by: 'brandt',
    status: 'superseded',
    created: 172,
    updated: 150,
    views: 35,
    tags: ['nvda', 'semis'],
    abstract:
      'Data center orders were ahead of the pitch. Superseded by the fall follow-on work; kept as the council record of the spring view.',
    body: 'Orders and capital spending plans from the largest cloud providers were ahead of the pitch assumptions.',
  },
  {
    n: 15,
    type: 'ic_minutes',
    title: 'IC minutes: October committee',
    term: 'Fall 2026',
    by: 'haile',
    status: 'published',
    created: 26,
    updated: 25,
    views: 28,
    tags: ['ic', 'minutes'],
    abstract:
      'Committee approved the CAT pitch, asked for a risks section on the NVDA follow-on and set the next review of the healthcare sleeve.',
    body: '## Decisions\n\n- CAT pitch approved.\n- NVDA follow-on returned for a risks section.\n\n## Actions\n\n- Healthcare sleeve review at the next meeting.',
  },
  {
    n: 16,
    type: 'reading',
    title: 'Reading: the policy statement and sector caps',
    term: 'Fall 2026',
    by: 'okoye',
    status: 'published',
    created: 52,
    updated: 50,
    views: 44,
    tags: ['ips', 'onboarding'],
    abstract:
      'A guided reading of the investment policy statement, with the limits the fund is closest to.',
    body: 'Read sections two and four of the policy statement first. The sector cap and the single-name cap are the two limits the fund meets most often.',
  },
  {
    n: 17,
    type: 'competition',
    title: 'Stock pitch competition entry: SCHW',
    ticker: 'SCHW',
    sector: 'Financials',
    term: 'Spring 2026',
    by: 'tesfaye',
    status: 'published',
    created: 82,
    updated: 80,
    views: 15,
    tags: ['competition', 'schw'],
    abstract:
      'The council entry for the spring pitch competition: net new assets as the turning point.',
    body: 'Net new assets accelerated for three months and sweep cash balances stopped falling.',
    files: [['SCHW_competition_deck.pdf', 3460000, 'tesfaye', 80]],
  },
  {
    n: 18,
    type: 'note',
    title: 'NVDA: questions for the next earnings call',
    ticker: 'NVDA',
    sector: 'Information Technology',
    term: 'Fall 2026',
    by: 'me',
    status: 'draft',
    visibility: 'private',
    created: 1,
    updated: 1,
    tags: ['nvda'],
    abstract: '',
    body: 'Questions on supply, pricing and the largest customers.',
  },
  {
    n: 19,
    type: 'external',
    title: 'External: healthcare sector outlook summary',
    sector: 'Health Care',
    term: 'Spring 2026',
    by: 'lindqvist',
    status: 'archived',
    created: 64,
    updated: 60,
    views: 9,
    tags: ['external', 'healthcare'],
    abstract:
      'Summary of a public sector outlook, kept for reference. Archived once the team wrote its own view.',
    body: 'Summary of the public outlook and where the team agrees and disagrees.',
  },
  {
    n: 20,
    type: 'note',
    title: 'Industrials: coverage check-in notes',
    sector: 'Industrials',
    term: 'Fall 2026',
    by: 'park',
    status: 'published',
    created: 11,
    updated: 10,
    views: 8,
    tags: ['industrials', 'coverage'],
    abstract: 'Thesis status for each Industrials holding after the coverage check-in.',
    body: '- **CAT**: thesis intact.\n- **GE**: model is out of date; refresh due.',
    comments: [['weber', 230, 'I will refresh the GE model this month.']],
  },
];

/* Coverage handoffs on file. from: a person key or null (first assignment). */
const HOPS = [
  { ticker: 'JPM', from: 'haddad', to: 'tesfaye', term: 'Fall 2025', note: 13, days: 200 },
  { ticker: 'BAC', from: 'haddad', to: 'tesfaye', term: 'Fall 2025', note: 13, days: 199 },
  { ticker: 'NVDA', from: 'brandt', to: 'rossi', term: 'Spring 2026', note: null, days: 150 },
  { ticker: 'GE', from: 'brandt', to: 'weber', term: 'Spring 2026', note: null, days: 148 },
  { ticker: 'LLY', from: null, to: 'bekele', term: 'Spring 2026', note: null, days: 130 },
];

/* Pitches the documents refer to (the same holdings as the other samples). */
const PITCHES = [
  { n: 1, ticker: 'NVDA', title: 'NVDA follow-on', er: 22.0, days: 7, stage: 'pitch_scheduled' },
  { n: 2, ticker: 'CAT', title: 'CAT', er: 14.5, days: 34, stage: 'in_portfolio' },
  { n: 3, ticker: 'AAPL', title: 'AAPL', er: 11.0, days: 10, stage: 'pitch_scheduled' },
  { n: 4, ticker: 'LLY', title: 'LLY', er: 18.0, days: 70, stage: 'in_portfolio' },
  { n: 5, ticker: 'NVDA', title: 'NVDA', er: 31.0, days: 410, stage: 'in_portfolio' },
];

const SONAR = [
  {
    n: 1,
    kind: 'fund_fit',
    ticker: 'NVDA',
    status: 'approved',
    title: 'NVDA fund fit',
    by: 'rossi',
    v: 3,
    rate: 0.94,
    days: 3,
  },
  {
    n: 2,
    kind: 'research',
    ticker: 'JPM',
    status: 'approved',
    title: 'Bank earnings read-through',
    by: 'tesfaye',
    v: 2,
    rate: 0.88,
    days: 9,
  },
  {
    n: 3,
    kind: 'research',
    ticker: 'LLY',
    status: 'under_review',
    title: 'LLY trial readout scenarios',
    by: 'bekele',
    v: 1,
    rate: 0.71,
    days: 12,
  },
  {
    n: 4,
    kind: 'challenge',
    ticker: 'CAT',
    status: 'draft',
    title: 'CAT pricing pressure challenge',
    by: 'weber',
    v: 1,
    rate: null,
    days: 15,
  },
];

const TEMPLATES = [
  {
    n: 1,
    name: 'Pitch memo',
    doc_type: 'pitch_memo',
    required_sections: ['Thesis', 'Valuation', 'Catalysts', 'Risks'],
  },
  {
    n: 2,
    name: 'Post-mortem',
    doc_type: 'post_mortem',
    required_sections: ['What we expected', 'What happened', 'Lessons'],
  },
];

/**
 * @param {{ userId: string, memberId?: string, role: string, displayName?: string,
 *           subRole?: string, tier?: string, now?: number }} viewer the signed-in member
 */
export function buildResearchLibrarySample({
  userId,
  memberId,
  role,
  displayName,
  subRole,
  tier,
  now = Date.now(),
}) {
  const me = userId;
  const myMember = memberId || 'sample-member-me';
  const myName = displayName || 'You';
  const ago = (days) => new Date(now - days * DAY).toISOString();
  const hoursAgo = (h) => new Date(now - h * HOUR).toISOString();
  const person = (key) =>
    key === 'me'
      ? { user_id: me, member_id: myMember, name: myName, role }
      : {
          user_id: userOf(PEOPLE[key].n),
          member_id: memberOf(PEOPLE[key].n),
          name: PEOPLE[key].name,
          role: PEOPLE[key].role,
          alum: Boolean(PEOPLE[key].alum),
        };

  const isManager = isManagerRole(role);
  const canApprove =
    role === 'executive' ||
    getMemberPermissions({ role, sub_role: subRole || null, tier: tier || null }, []).includes(
      'approve_deliverables',
    );

  const members = [
    {
      id: myMember,
      user_id: me,
      display_name: myName,
      role,
      is_active: true,
    },
    ...Object.values(PEOPLE).map((p) => ({
      id: memberOf(p.n),
      user_id: userOf(p.n),
      display_name: p.name,
      role: p.role,
      is_active: !p.alum,
      is_demo: true,
    })),
  ];

  const notes = [];
  const comments = [];
  const attachments = [];
  const versions = [];
  for (const d of DOCS) {
    const author = person(d.by);
    const nid = docOf(d.n);
    const version = (d.versions?.length || 0) + 1;
    notes.push({
      id: nid,
      org_id: 'sample-org',
      author_id: author.user_id,
      author_name: author.name,
      author_role: author.role,
      author_role_at_time: author.role,
      is_alum_authored: Boolean(author.alum),
      title: d.title,
      abstract: d.abstract || null,
      body: d.body,
      ticker: d.ticker || null,
      sector: d.sector || null,
      tags: d.tags || [],
      visibility: d.visibility || 'org',
      team_id: null,
      pinned: Boolean(d.pinned),
      doc_type: d.type,
      status: d.status,
      version,
      superseded_by: null,
      term: d.term || null,
      is_exemplar: Boolean(d.exemplar),
      pitch_id: d.pitch ? id('pitch', d.pitch) : null,
      assignment_id: null,
      position_id: null,
      view_count: d.views || 0,
      download_count: d.downloads || 0,
      citations: d.citations || null,
      created_at: ago(d.created),
      updated_at: ago(d.updated),
      published_at:
        d.status === 'published' || d.status === 'superseded' || d.status === 'archived'
          ? ago(d.updated)
          : null,
      is_demo: true,
    });
    (d.versions || []).forEach((title, i) => {
      const span = Math.max(1, d.created - d.updated);
      versions.push({
        id: `${nid}-v${i + 1}`,
        note_id: nid,
        version: i + 1,
        title,
        abstract: null,
        edited_by: author.user_id,
        editor_name: author.name,
        created_at: ago(d.created - (span * (i + 1)) / (version + 1)),
        is_demo: true,
      });
    });
    (d.comments || []).forEach(([who, h, body, block, resolved], i) => {
      const p = person(who);
      comments.push({
        id: `${nid}-c${i + 1}`,
        note_id: nid,
        org_id: 'sample-org',
        author_id: p.user_id,
        author_name: p.name,
        author_role: p.role,
        body,
        is_review_block: Boolean(block),
        resolved: Boolean(resolved),
        created_at: hoursAgo(h),
        is_demo: true,
      });
    });
    (d.files || []).forEach(([name, bytes, who, days], i) => {
      const p = person(who);
      attachments.push({
        id: `${nid}-f${i + 1}`,
        note_id: nid,
        org_id: 'sample-org',
        file_name: name,
        kind: kindOfFile(name),
        size_bytes: bytes,
        uploaded_by: p.user_id,
        created_at: ago(days),
        signed_url: null,
        is_demo: true,
      });
    });
  }

  const hops = HOPS.map((h, i) => ({
    id: id('hop', i + 1),
    org_id: 'sample-org',
    ticker: h.ticker,
    from_member_id: h.from ? person(h.from).member_id : null,
    to_member_id: person(h.to).member_id,
    handoff_note_id: h.note ? docOf(h.note) : null,
    term: h.term,
    created_at: ago(h.days),
    is_demo: true,
  }));

  const pitches = PITCHES.map((p) => ({
    id: id('pitch', p.n),
    ticker: p.ticker,
    title: p.title,
    expected_return_pct: p.er,
    stage: p.stage,
    status: p.stage === 'in_portfolio' ? 'active' : 'active',
    created_at: ago(p.days),
    is_demo: true,
  }));

  const sonar = SONAR.map((r) => ({
    id: id('sonar', r.n),
    kind: r.kind,
    ticker: r.ticker,
    status: r.status,
    title: r.title,
    author_name: person(r.by).name,
    current_version: r.v,
    visibility: 'org',
    summary: { stats: { claimSupportRate: r.rate } },
    updated_at: ago(r.days),
    is_demo: true,
  }));

  const templates = TEMPLATES.map((t) => ({
    id: id('template', t.n),
    org_id: 'sample-org',
    name: t.name,
    doc_type: t.doc_type,
    required_sections: t.required_sections,
    body_scaffold: t.required_sections.map((s) => `## ${s}\n\n`).join('\n'),
    created_at: ago(300 - t.n),
    is_demo: true,
  }));

  const viewer = {
    userId: me,
    memberId: myMember,
    role,
    displayName: myName,
    canManage: isManager,
    canApprove,
  };

  /* What the viewer may read: private only their own, drafts their own
     unless they manage (the same rules as the live library). */
  const visible = visibleRows(notes, { userId: me, isManager });
  const keep = new Set(visible.map((n) => n.id));

  return {
    now,
    viewer,
    notes: visible,
    comments: comments.filter((c) => keep.has(c.note_id)),
    attachments: attachments.filter((a) => keep.has(a.note_id)),
    versions: versions.filter((v) => keep.has(v.note_id)),
    templates,
    pitches,
    members,
    hops,
    sonar,
    seq: 0,
    is_demo: true,
  };
}

/* ── Derived payloads (the same shapes as the live routes) ───────────────── */

function memberNameOf(bundle) {
  const by = new Map(bundle.members.map((m) => [m.id, m.display_name]));
  return (mid) => (mid && by.get(mid)) || null;
}

/** GET /api/org/research-notes/search */
export function deriveLibrary(bundle, q, filters) {
  const counts = countByNote(bundle.comments, bundle.attachments);
  const all = decorate(bundle.notes, counts);
  const { notes, facets } = searchLocal(all, q, filters);
  const authorNames = {};
  for (const n of all) authorNames[n.author_id] = n.author_name || 'Member';
  return {
    notes,
    facets,
    authorNames,
    /* Sample search is keyword only. */
    semantic: { configured: false, enabled: false },
    viewer: bundle.viewer,
    summary: librarySummary(all, { userId: bundle.viewer.userId }),
    shelves: shelves(all, { userId: bundle.viewer.userId }),
    truncated: false,
    is_demo: true,
  };
}

/** GET /api/org/research-notes/:id with its versions, comments and files. */
export function deriveDetail(bundle, noteId) {
  const note = bundle.notes.find((n) => n.id === noteId);
  if (!note) return null;
  const comments = bundle.comments
    .filter((c) => c.note_id === noteId)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  return {
    note,
    supersededBy: note.superseded_by
      ? bundle.notes.find((n) => n.id === note.superseded_by) || null
      : null,
    versions: bundle.versions
      .filter((v) => v.note_id === noteId)
      .sort((a, b) => b.version - a.version),
    comments,
    openBlocks: comments.filter((c) => c.is_review_block && !c.resolved).length,
    attachments: bundle.attachments
      .filter((a) => a.note_id === noteId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
  };
}

/** GET /api/org/research-notes/coverage-lineage (overview) */
export function deriveLineage(bundle) {
  return {
    tickers: lineageOverview({
      notes: bundle.notes,
      hops: bundle.hops,
      pitches: bundle.pitches,
      memberName: memberNameOf(bundle),
      now: bundle.now,
    }),
    staleDays: STALE_DAYS,
    canManage: bundle.viewer.canManage,
  };
}

/** GET /api/org/research-notes/coverage-lineage?ticker= */
export function deriveChain(bundle, ticker) {
  const t = String(ticker || '').toUpperCase();
  const name = memberNameOf(bundle);
  const docs = bundle.notes.filter((n) => String(n.ticker || '').toUpperCase() === t);
  const lastDocAt = docs.reduce(
    (m, d) => (!m || new Date(d.created_at) > new Date(m) ? d.created_at : m),
    null,
  );
  const latest = bundle.pitches
    .filter((p) => p.ticker === t)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
  return {
    ticker: t,
    hops: bundle.hops
      .filter((h) => h.ticker === t)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map((h) => {
        const doc = h.handoff_note_id ? bundle.notes.find((n) => n.id === h.handoff_note_id) : null;
        return {
          id: h.id,
          term: h.term,
          created_at: h.created_at,
          from: h.from_member_id ? { id: h.from_member_id, name: name(h.from_member_id) } : null,
          to: h.to_member_id ? { id: h.to_member_id, name: name(h.to_member_id) } : null,
          handoff: h.handoff_note_id
            ? { id: h.handoff_note_id, title: doc?.title || null, status: doc?.status || null }
            : null,
        };
      }),
    lastDocAt,
    stale: lastDocAt ? bundle.now - new Date(lastDocAt).getTime() > STALE_DAYS * DAY : true,
    staleDays: STALE_DAYS,
    performance: latest ? { expected_return_pct: latest.expected_return_pct } : null,
    canManage: bundle.viewer.canManage,
  };
}

/** GET /api/org/research-notes/dossier/:symbol (documents newest first) */
export function deriveDossier(bundle, ticker) {
  const t = String(ticker || '').toUpperCase();
  const counts = countByNote(bundle.comments, bundle.attachments);
  const docs = decorate(
    bundle.notes.filter((n) => String(n.ticker || '').toUpperCase() === t),
    counts,
  ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const first = docs[docs.length - 1];
  const pitches = bundle.pitches
    .filter((p) => p.ticker === t)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  return {
    ticker: t,
    sector: docs.find((d) => d.sector)?.sector || null,
    docs,
    stats: {
      docCount: docs.length,
      analystCount: new Set(docs.map((d) => d.author_id)).size,
      coveredSinceYear: first ? new Date(first.created_at).getUTCFullYear() : null,
      pitchCount: pitches.length,
      firstPitch: pitches[0]
        ? {
            id: pitches[0].id,
            at: pitches[0].created_at,
            expected_return_pct: pitches[0].expected_return_pct,
          }
        : null,
    },
  };
}

/* ── Actions on sample rows (applied on the page, never sent) ────────────── */

const fail = (error, extra = {}) => ({ ok: false, error, ...extra });

/* The blocker messages /publish returns, word for word. */
function serverBlockers(note, bundle) {
  const openBlocks = bundle.comments.filter(
    (c) => c.note_id === note.id && c.is_review_block && !c.resolved,
  ).length;
  return blockersOf(readiness(note, { openBlocks, templates: bundle.templates })).map((b) => {
    if (b.code === 'abstract_missing')
      return { code: b.code, message: 'A TL;DR abstract is required before publishing.' };
    if (b.code === 'review_blocks_open')
      return {
        code: b.code,
        message: `${openBlocks} unresolved review block${openBlocks > 1 ? 's' : ''} must be resolved first.`,
        count: openBlocks,
      };
    const { template, missing } = missingSections(note, bundle.templates);
    return {
      code: b.code,
      message: `Template "${template?.name}" requires these sections: ${missing.join(', ')}.`,
      sections: missing,
    };
  });
}

function formFields(form) {
  const tags = Array.isArray(form.tags) ? form.tags.slice(0, 12) : [];
  return {
    title: String(form.title || '')
      .trim()
      .slice(0, 200),
    body: String(form.body || '')
      .trim()
      .slice(0, 20000),
    abstract: form.abstract ? String(form.abstract).trim().slice(0, 800) : null,
    doc_type: form.doc_type || 'note',
    ticker: form.ticker ? String(form.ticker).toUpperCase().slice(0, 12) : null,
    sector: form.sector || null,
    term: form.term ? String(form.term).slice(0, 40) : null,
    tags,
    visibility: ['org', 'team', 'private'].includes(form.visibility) ? form.visibility : 'org',
    citations: form.citations ? String(form.citations).slice(0, 4000) : null,
    pitch_id: form.pitch_id || null,
  };
}

/**
 * Apply one action to a copy of the bundle with the server's rules.
 * Returns { ok, error?, blockers?, bundle?, id? }.
 */
export function applySampleAction(bundle, action, now = Date.now()) {
  const b = structuredClone(bundle);
  const viewer = b.viewer;
  const stamp = new Date(now).toISOString();
  const note = action.id ? b.notes.find((n) => n.id === action.id) : null;
  const rights = noteRights(note, viewer);
  const isManager = isManagerRole(viewer.role);
  const touch = (n) => {
    n.updated_at = stamp;
  };

  switch (action.type) {
    case 'create': {
      const f = formFields(action.form || {});
      if (!f.title || !f.body) return fail('Title and body are required');
      b.seq = (b.seq || 0) + 1;
      const nid = `sample-doc-new-${b.seq}`;
      b.notes.unshift({
        id: nid,
        org_id: 'sample-org',
        author_id: viewer.userId,
        author_name: viewer.displayName,
        author_role: viewer.role,
        author_role_at_time: viewer.role,
        is_alum_authored: false,
        ...f,
        team_id: null,
        pinned: false,
        status: 'draft',
        version: 1,
        superseded_by: null,
        is_exemplar: false,
        assignment_id: null,
        position_id: null,
        view_count: 0,
        download_count: 0,
        created_at: stamp,
        updated_at: stamp,
        published_at: null,
        is_demo: true,
      });
      return { ok: true, bundle: b, id: nid };
    }
    case 'edit': {
      if (!note) return fail('Not found');
      if (!rights.canEdit) return fail('Not allowed');
      const f = formFields(action.form || {});
      if (!f.title || !f.body) return fail('Title and body are required');
      const changed =
        f.title !== note.title ||
        f.body !== note.body ||
        (f.abstract || null) !== (note.abstract || null);
      if (changed) {
        b.versions.push({
          id: `${note.id}-v${note.version}-${now}`,
          note_id: note.id,
          version: note.version || 1,
          title: note.title,
          abstract: note.abstract,
          edited_by: viewer.userId,
          editor_name: viewer.displayName,
          created_at: stamp,
          is_demo: true,
        });
        note.version = (note.version || 1) + 1;
      }
      Object.assign(note, f);
      touch(note);
      return { ok: true, bundle: b, id: note.id };
    }
    case 'status': {
      if (!note) return fail('Not found');
      if (!(rights.isAuthor || isManager)) return fail('Not allowed');
      if (!['draft', 'under_review'].includes(action.status)) return fail('Not allowed');
      note.status = action.status;
      touch(note);
      return { ok: true, bundle: b };
    }
    case 'publish': {
      if (!note) return fail('Not found');
      if (!rights.canPublish) return fail('approve_deliverables permission required');
      const blockers = serverBlockers(note, b);
      if (blockers.length) return fail('Publish blocked', { blockers, status: 409 });
      note.status = 'published';
      note.published_at = note.published_at || stamp;
      touch(note);
      return { ok: true, bundle: b };
    }
    case 'supersede': {
      if (!note) return fail('Not found');
      if (!(rights.isAuthor || isManager)) return fail('Not allowed');
      note.status = 'superseded';
      note.superseded_by = null;
      touch(note);
      return { ok: true, bundle: b };
    }
    case 'pin': {
      if (!note) return fail('Not found');
      if (!rights.canPin) return fail('Not allowed');
      note.pinned = Boolean(action.value);
      touch(note);
      return { ok: true, bundle: b };
    }
    case 'exemplar': {
      if (!note) return fail('Not found');
      if (!rights.canExemplar) return fail('Not allowed');
      note.is_exemplar = Boolean(action.value);
      touch(note);
      return { ok: true, bundle: b };
    }
    case 'delete': {
      if (!note) return fail('Not found');
      if (!(rights.isAuthor || isManager)) return fail('Not allowed');
      if (note.status === 'published' || note.status === 'superseded') {
        note.status = 'archived';
        touch(note);
        return { ok: true, bundle: b, archived: true };
      }
      b.notes = b.notes.filter((n) => n.id !== note.id);
      b.comments = b.comments.filter((c) => c.note_id !== note.id);
      b.attachments = b.attachments.filter((a) => a.note_id !== note.id);
      b.versions = b.versions.filter((v) => v.note_id !== note.id);
      return { ok: true, bundle: b };
    }
    case 'comment': {
      if (!note) return fail('Not found');
      const text = String(action.body || '').trim();
      if (!text) return fail('Comment body required');
      b.seq = (b.seq || 0) + 1;
      b.comments.push({
        id: `${note.id}-cn${b.seq}`,
        note_id: note.id,
        org_id: 'sample-org',
        author_id: viewer.userId,
        author_name: viewer.displayName,
        author_role: viewer.role,
        body: text.slice(0, 4000),
        /* Only managers can raise a publish block (the comments route). */
        is_review_block: Boolean(action.block) && isManager,
        resolved: false,
        created_at: stamp,
        is_demo: true,
      });
      return { ok: true, bundle: b };
    }
    case 'resolve': {
      const c = b.comments.find((x) => x.id === action.commentId);
      if (!c) return fail('Not found');
      if (c.author_id !== viewer.userId && !isManager) return fail('Not allowed');
      c.resolved = Boolean(action.resolved);
      return { ok: true, bundle: b };
    }
    case 'upload': {
      if (!note) return fail('Not found');
      const file = action.file || {};
      const kind = kindOfFile(file.name);
      if (!kind) return fail('File type not allowed');
      if (!(Number(file.size) > 0)) return fail('File is empty');
      if (Number(file.size) > MAX_FILE_BYTES) return fail('File exceeds the 25 MB limit');
      b.seq = (b.seq || 0) + 1;
      b.attachments.unshift({
        id: `${note.id}-fn${b.seq}`,
        note_id: note.id,
        org_id: 'sample-org',
        file_name: String(file.name).slice(0, 180),
        kind,
        size_bytes: Number(file.size),
        uploaded_by: viewer.userId,
        created_at: stamp,
        signed_url: null,
        is_demo: true,
      });
      return { ok: true, bundle: b, kindLabel: KIND_LABEL[kind] };
    }
    case 'deleteFile': {
      const a = b.attachments.find((x) => x.id === action.attachmentId);
      if (!a) return fail('Not found');
      if (a.uploaded_by !== viewer.userId && !isManager) return fail('Not allowed');
      b.attachments = b.attachments.filter((x) => x.id !== a.id);
      return { ok: true, bundle: b };
    }
    case 'handoff': {
      if (!isManager) return fail('Only faculty / PMs can record handoffs');
      const ticker = String(action.ticker || '')
        .toUpperCase()
        .trim();
      if (!ticker) return fail('Ticker required');
      b.seq = (b.seq || 0) + 1;
      b.hops.push({
        id: `sample-hop-new-${b.seq}`,
        org_id: 'sample-org',
        ticker: ticker.slice(0, 12),
        from_member_id: action.from || null,
        to_member_id: action.to || null,
        handoff_note_id: action.noteId || null,
        term: action.term ? String(action.term).slice(0, 40) : null,
        created_at: stamp,
        is_demo: true,
      });
      return { ok: true, bundle: b };
    }
    default:
      return fail('Unknown action');
  }
}
