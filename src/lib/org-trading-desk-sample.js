/**
 * Sample content for the Trading Desk (/org-trading).
 *
 * Served ONLY to master admin and demo accounts who are council members, by
 * GET /api/org-trading/sample, so the page can be reviewed and presented from
 * a council with little activity. Real councils never receive it, and the
 * page labels it "Sample content" while it shows. Nothing here is read from
 * or written to the database: while it shows, a flag raised, an answer, a
 * comment or a removed position stays on the page and is gone on reload.
 *
 * The fund is the same sample fund the Command Center shows: the summary
 * (fund value, benchmark, sector sleeves, daily records) is taken from that
 * bundle, and the twelve positions below add up to its sleeves to the cent.
 * The accuracy table is computed from the sample flags. Nothing is typed in
 * twice.
 *
 * Pure: no React, no fetch, no server imports. Every row carries is_demo.
 */
import { buildCommandCenterSample } from './org-command-center-sample.js';
import { aggregateFlagAccuracy } from './org-trading-desk.js';

const HOUR = 3600000;
const DAY = 24 * HOUR;
const id = (prefix, n) => `sample-${prefix}-${String(n).padStart(3, '0')}`;
const teamOf = (n) => id('team', n);
const memberOf = (n) => id('member', n);
const userOf = (n) => id('user', n);

/* The same people the Command Center sample names, plus two more analysts. */
const PEOPLE = {
  tesfaye: { n: 1, name: 'Amara Tesfaye', role: 'analyst', sub: 'Senior Analyst', team: 1 },
  bekele: { n: 2, name: 'Mikael Bekele', role: 'analyst', sub: 'Analyst', team: 2 },
  haile: { n: 3, name: 'Selam Haile', role: 'portfolio_manager', sub: 'Senior PM', team: 3 },
  okoye: { n: 4, name: 'Chidi Okoye', role: 'portfolio_manager', sub: 'PM', team: 1 },
  lindqvist: { n: 5, name: 'Ingrid Lindqvist', role: 'portfolio_manager', sub: 'PM', team: 2 },
  park: { n: 6, name: 'Daniel Park', role: 'portfolio_manager', sub: 'PM', team: 4 },
  rossi: { n: 7, name: 'Elena Rossi', role: 'analyst', sub: 'Senior Analyst', team: 3 },
  weber: { n: 8, name: 'Jonas Weber', role: 'analyst', sub: 'Analyst', team: 4 },
  alvarez: { n: 9, name: 'Tomas Alvarez', role: 'analyst', sub: 'Junior Analyst', team: 2 },
};

/*
 * The book. [ticker, name, team, sector, shares, average cost, last close or
 * null when not priced yet, covering analyst or null, thesis or null].
 * HON is a fresh import: not priced yet (carried at cost), no coverage and
 * no pitch on file.
 */
const BOOK = [
  [
    'JPM',
    'JPMorgan Chase & Co.',
    1,
    'Banks',
    150,
    198.0,
    346.19,
    'tesfaye',
    'Fortress balance sheet and rising fee income support returns through the rate cycle.',
  ],
  [
    'SCHW',
    'The Charles Schwab Corporation',
    1,
    'Brokerage',
    360,
    64.0,
    92.98,
    'tesfaye',
    'Net new assets and expense discipline rebuild earnings as cash sorting fades.',
  ],
  [
    'BAC',
    'Bank of America Corporation',
    1,
    'Banks',
    210,
    34.3,
    51.47,
    'tesfaye',
    'Deposit franchise reprices slowly, so net interest income keeps compounding.',
  ],
  [
    'LLY',
    'Eli Lilly and Company',
    2,
    'Pharmaceuticals',
    40,
    520.0,
    1012.89,
    'bekele',
    'Incretin demand outruns supply and the pipeline extends the growth runway.',
  ],
  [
    'UNH',
    'UnitedHealth Group Incorporated',
    2,
    'Managed care',
    40,
    500.0,
    459.86,
    'alvarez',
    'Scale in care delivery offsets medical cost pressure over a full cycle.',
  ],
  [
    'MRK',
    'Merck & Co., Inc.',
    2,
    'Pharmaceuticals',
    100,
    80.26,
    134.5,
    'bekele',
    'Oncology cash flows fund a pipeline that covers the patent cliff.',
  ],
  [
    'NVDA',
    'NVIDIA Corporation',
    3,
    'Semiconductors',
    160,
    90.0,
    131.83,
    'rossi',
    'Accelerated computing demand and platform leadership justify a long-term overweight.',
  ],
  [
    'MSFT',
    'Microsoft Corporation',
    3,
    'Software',
    30,
    415.0,
    559.34,
    'rossi',
    'Cloud and productivity attach rates keep widening the margin base.',
  ],
  ['AAPL', 'Apple Inc.', 3, 'Consumer technology', 50, 228.86, 278.74, 'rossi', null],
  [
    'CAT',
    'Caterpillar Inc.',
    4,
    'Machinery',
    20,
    280.0,
    408.14,
    'weber',
    'Services revenue smooths the equipment cycle and supports the dividend.',
  ],
  [
    'GE',
    'GE Aerospace',
    4,
    'Aerospace',
    31,
    208.0,
    226.2,
    'weber',
    'Engine aftermarket backlog gives multi-year visibility on cash flow.',
  ],
  ['HON', 'Honeywell International Inc.', 4, 'Conglomerates', 20, 224.75, null, null, null],
];

const cents = (v) => Math.round(v * 100) / 100;

/**
 * @param {{ userId: string, memberId: string, role: string, displayName?: string,
 *           title?: string, subRole?: string, now?: number }} viewer
 */
export function buildTradingDeskSample({
  userId,
  memberId,
  role,
  displayName,
  title,
  subRole,
  now = Date.now(),
}) {
  const iso = (hours) => new Date(now + hours * HOUR).toISOString();
  const me = memberId || 'sample-member-me';
  const myName = displayName || 'You';
  /* The viewer sits on the Technology team in the sample, so every role has
     a team and, for an analyst, a covered sector. */
  const myTeam = teamOf(3);

  const base = buildCommandCenterSample({ userId, role, displayName, title, now });
  const summary = base.summary;

  /* ── Roster ── */
  const person = (key) => {
    const p = PEOPLE[key];
    return {
      id: memberOf(p.n),
      user_id: userOf(p.n),
      display_name: p.name,
      role: p.role,
      sub_role: p.sub,
      team_id: teamOf(p.team),
      is_active: true,
      is_demo: true,
    };
  };
  const members = [
    {
      id: me,
      user_id: userId,
      display_name: myName,
      role,
      sub_role: subRole || null,
      team_id: role === 'executive' ? null : myTeam,
      is_active: true,
      is_demo: true,
    },
    ...Object.keys(PEOPLE).map(person),
  ];
  const teams = summary.sectors
    .map((s) => ({ id: s.teamId, name: s.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const ref = (key) => {
    const p = key === 'me' ? { name: myName, role, sub: subRole || null } : PEOPLE[key];
    return { display_name: p.name, role: p.role, sub_role: p.sub || null };
  };
  const mid = (key) => (key === 'me' ? me : memberOf(PEOPLE[key].n));
  const pmOfTeam = (n) =>
    Object.keys(PEOPLE).find((k) => PEOPLE[k].team === n && PEOPLE[k].role === 'portfolio_manager');

  /* ── Positions (the book's own shape) ── */
  const positions = BOOK.map(([ticker, name, team, sector, shares, avgCost, price], i) => {
    const cost = cents(shares * avgCost);
    const value = cents(shares * (price ?? avgCost));
    return {
      id: id('position', i + 1),
      org_id: 'sample',
      team_id: teamOf(team),
      ticker,
      ticker_symbol: ticker,
      name,
      shares,
      avg_cost: avgCost,
      current_price: price,
      sector,
      source: price == null ? 'csv' : 'manual',
      priced: price != null,
      value,
      cost,
      pl: cents(value - cost),
      current_value: value,
      added_at: iso(-24 * (140 - i * 9)),
      last_priced_at: price == null ? null : iso(-19),
      is_demo: true,
    };
  });
  const totalValue = cents(positions.reduce((s, p) => s + p.value, 0));

  /* Sector coverage. An analyst viewing the sample covers semiconductors. */
  const coverage = [];
  const seen = new Set();
  for (const [, , , sector, , , , analyst] of BOOK) {
    if (!analyst || seen.has(`${analyst}_${sector}`)) continue;
    seen.add(`${analyst}_${sector}`);
    coverage.push({ member_id: mid(analyst), sector, is_primary: true, is_demo: true });
  }
  if (role === 'analyst') {
    coverage.push({ member_id: me, sector: 'Semiconductors', is_primary: false, is_demo: true });
  }

  /* The flaggable book: who is accountable for each holding, and its thesis. */
  const dossier = BOOK.map(([ticker, , team, sector, , , , analyst, thesis], i) => {
    const p = positions[i];
    const pm = pmOfTeam(team);
    return {
      ticker,
      teamDbId: teamOf(team),
      sector,
      analyst: analyst ? PEOPLE[analyst].name : null,
      analyst_member_id: analyst ? mid(analyst) : null,
      sector_head: pm ? PEOPLE[pm].name : null,
      sector_head_member_id: pm ? mid(pm) : null,
      thesis,
      plPct: p.priced && p.cost > 0 ? (p.pl / p.cost) * 100 : null,
      pct_aum: totalValue > 0 ? (p.value / totalValue) * 100 : null,
      position: p,
    };
  });
  const dossierOf = (ticker) => dossier.find((d) => d.ticker === ticker);

  /* ── Flags ── */
  let flagN = 0;
  const flag = (o) => {
    flagN += 1;
    const d = dossierOf(o.ticker);
    const fid = id('flag', flagN);
    const recipient = o.to || 'me';
    const head = o.head === undefined ? pmOfTeam(BOOK.find((b) => b[0] === o.ticker)[2]) : o.head;
    const answered = o.status && o.status !== 'open';
    return {
      id: fid,
      org_id: 'sample',
      team_id: d.teamDbId,
      ticker: o.ticker,
      flag_color: o.color,
      subject: `Position review: ${o.ticker}`,
      body: o.body,
      reason: o.reason,
      conviction: o.conviction,
      suggested_action: o.action,
      escalated_to_ic: Boolean(o.ic) || o.status === 'escalated',
      conflict_disclosed: Boolean(o.conflict),
      response_due_at: iso(o.due ?? 72),
      thesis_snapshot: d.thesis,
      benchmark_symbol: o.bench || null,
      status: o.status || 'open',
      created_at: iso(o.created ?? -6),
      resolved_at: answered ? iso(o.resolved ?? -24) : null,
      resolved_by: answered ? mid(o.answeredBy || recipient) : null,
      resolution_note: o.rebuttal || null,
      raiser_member_id: mid(o.by),
      recipient_member_id: mid(recipient),
      sector_head_member_id: head ? mid(head) : null,
      raiser: ref(o.by),
      recipient: ref(recipient),
      sector_head: head ? ref(head) : null,
      position_shares: d.position.shares,
      position_avg_cost: d.position.avg_cost,
      position_current_price: d.position.current_price,
      attachments: (o.pinned || []).map((label, i) => ({
        id: `${fid}-a${i}`,
        attachment_kind: 'pinned_card',
        attachment_label: label,
      })),
      evidence: o.chart
        ? [{ id: `${fid}-e0`, type: 'chart', caption: `${o.ticker} price chart` }]
        : [],
      responses: answered
        ? [
            {
              id: `${fid}-r0`,
              response: o.status,
              rebuttal_text: o.rebuttal || null,
              responder_member_id: mid(o.answeredBy || recipient),
            },
          ]
        : [],
      messages: (o.messages || []).map(([who, hours, body], i) => ({
        id: `${fid}-m${i}`,
        body,
        created_at: iso(hours),
        author: ref(who),
        is_demo: true,
      })),
      outcome: o.outcome == null ? null : { was_correct: o.outcome },
      is_demo: true,
    };
  };

  const flags = [
    /* Waiting on the viewer. */
    flag({
      ticker: 'NVDA',
      color: 'red',
      by: 'tesfaye',
      head: 'haile',
      reason: 'valuation_stretched',
      conviction: 'high',
      action: 'trim',
      due: 4,
      created: -20,
      bench: 'SMH',
      chart: true,
      pinned: ['Data center capital spending tracker'],
      body: 'The price now sits above the top of the range the team underwrote after guidance. The upside case needs data center spending to hold at this pace for two more years.',
      messages: [
        ['rossi', -9, 'The long-term thesis is intact, but near-term expectations look full.'],
        ['haile', -3, 'Bring the downside case to the next technology team meeting.'],
      ],
    }),
    flag({
      ticker: 'UNH',
      color: 'red',
      by: 'bekele',
      head: 'lindqvist',
      reason: 'guidance_cut',
      conviction: 'med',
      action: 'reunderwrite',
      due: -5,
      created: -77,
      bench: 'XLV',
      conflict: true,
      body: 'Medical cost trend came in above plan for a second quarter and guidance was lowered. The margin path in the pitch no longer matches what management is saying.',
    }),
    flag({
      ticker: 'JPM',
      color: 'green',
      by: 'tesfaye',
      head: 'okoye',
      reason: 'earnings_beat',
      conviction: 'med',
      action: 'size_up',
      due: 50,
      created: -22,
      bench: 'XLF',
      body: 'Fee income and credit quality both beat this quarter and the capital return plan was raised. The thesis is ahead of schedule.',
    }),
    flag({
      ticker: 'MSFT',
      color: 'green',
      by: 'rossi',
      head: 'haile',
      reason: 'thesis_confirmed',
      conviction: 'low',
      action: 'monitor',
      due: 112,
      created: -56,
      bench: 'IGV',
      body: 'Cloud growth held and margins widened again. Nothing here changes the position, it only confirms the original case.',
    }),
    /* Raised by the viewer. */
    flag({
      ticker: 'LLY',
      color: 'red',
      by: 'me',
      to: 'bekele',
      head: 'lindqvist',
      reason: 'risk_identified',
      conviction: 'med',
      action: 'monitor',
      due: 44,
      created: -28,
      bench: 'XLV',
      body: 'The next trial readout is a binary event the pitch named as its main risk. The position is now the largest in the healthcare sleeve going into it.',
      messages: [
        ['bekele', -5, 'Agreed on the risk. I will size the downside before the readout.'],
      ],
    }),
    flag({
      ticker: 'SCHW',
      color: 'green',
      by: 'me',
      to: 'tesfaye',
      head: 'okoye',
      reason: 'new_positive_info',
      conviction: 'med',
      action: 'size_up',
      status: 'accepted',
      created: -24 * 12,
      resolved: -24 * 10,
      bench: 'XLF',
      body: 'Net new assets accelerated for a third month and sweep cash balances have stopped falling. That was the turning point the pitch was waiting for.',
    }),
    /* Open on the fund, routed to other members: the viewer can read and
       comment, and cannot answer. */
    flag({
      ticker: 'LLY',
      color: 'green',
      by: 'alvarez',
      to: 'bekele',
      head: 'lindqvist',
      reason: 'catalyst_hit',
      conviction: 'low',
      action: 'monitor',
      due: 130,
      created: -30,
      bench: 'XLV',
      body: 'Capacity additions were confirmed ahead of the timeline in the pitch, which removes the supply constraint named as a catalyst.',
    }),
    /* Answered, with the viewer routed. */
    flag({
      ticker: 'CAT',
      color: 'red',
      by: 'weber',
      head: 'park',
      reason: 'competitive_threat',
      conviction: 'high',
      action: 'exit',
      status: 'rejected',
      created: -24 * 118,
      resolved: -24 * 116,
      bench: 'XLI',
      outcome: true,
      rebuttal:
        'Dealer inventories are normal and the services share of revenue keeps rising. One quarter of pricing pressure does not break a thesis built on the aftermarket.',
      body: 'A lower-cost competitor took share in two regions this quarter and dealers reported discounting. The pricing power the thesis depends on looks weaker.',
    }),
    flag({
      ticker: 'MRK',
      color: 'red',
      by: 'alvarez',
      head: 'lindqvist',
      reason: 'risk_missed',
      conviction: 'high',
      action: 'reunderwrite',
      status: 'escalated',
      ic: true,
      created: -24 * 20,
      resolved: -24 * 19,
      bench: 'XLV',
      body: 'A pricing rule not covered in the pitch could bring forward the revenue decline on the lead product by two years. This needs the full committee.',
    }),
    flag({
      ticker: 'AAPL',
      color: 'green',
      by: 'rossi',
      head: 'haile',
      reason: 'valuation_attractive',
      conviction: 'med',
      action: 'size_up',
      status: 'acknowledged',
      created: -24 * 104,
      resolved: -24 * 103,
      bench: 'XLK',
      outcome: true,
      body: 'The drawdown put the price back inside the range where the team first bought. Services growth has not slowed.',
    }),
  ];

  /* Older, scored flags that only feed the accuracy table. */
  const history = [
    ['tesfaye', 'green', 'med', true],
    ['tesfaye', 'red', 'high', true],
    ['tesfaye', 'green', 'low', false],
    ['bekele', 'red', 'med', true],
    ['bekele', 'green', 'med', false],
    ['rossi', 'green', 'high', true],
    ['rossi', 'red', 'med', true],
    ['weber', 'green', 'low', false],
    ['alvarez', 'green', 'med', true],
    ['me', 'red', 'med', true],
    ['me', 'green', 'low', false],
  ].map(([by, color, conviction, correct], i) => ({
    id: id('flag-history', i + 1),
    raiser_member_id: mid(by),
    raiser: ref(by),
    flag_color: color,
    conviction,
    outcome: { was_correct: correct },
  }));
  const rejections = flags
    .filter((f) => f.status === 'rejected')
    .map((f) => ({
      flag_id: f.id,
      responder_member_id: f.resolved_by,
      responder: members.find((m) => m.id === f.resolved_by),
    }));
  const accuracy = aggregateFlagAccuracy([...flags, ...history], rejections);

  /* ── Position discussion ── */
  let commentN = 0;
  const comment = (ticker, who, hours, body, parent = null, likes = 0) => {
    commentN += 1;
    const m = who === 'me' ? members[0] : person(who);
    return {
      id: id('comment', commentN),
      ticker,
      author_id: m.user_id,
      author_name: m.display_name,
      author_role: m.role,
      body,
      parent_id: parent,
      created_at: iso(hours),
      likes,
      liked: false,
      is_demo: true,
    };
  };
  const nvda1 = comment(
    'NVDA',
    'tesfaye',
    -19,
    'Flagging NVDA. The price is above our team range after guidance. I would like the upside case and the data center assumptions looked at again.',
    null,
    5,
  );
  const threads = {
    NVDA: [
      nvda1,
      comment(
        'NVDA',
        'rossi',
        -9,
        '@Amara Tesfaye agreed on a second look. The long-term thesis is intact, so I will update the model and test a slower growth case.',
        nvda1.id,
        3,
      ),
      comment(
        'NVDA',
        'haile',
        -3,
        'Bring the downside case and an update to the next technology team meeting.',
        null,
        2,
      ),
    ],
    UNH: [
      comment(
        'UNH',
        'bekele',
        -70,
        'Cost trend is the whole debate here. I am rebuilding the margin bridge from the last two quarters.',
        null,
        1,
      ),
    ],
  };

  return {
    is_demo: true,
    viewer: {
      memberId: me,
      userId,
      role,
      teamId: role === 'executive' ? null : myTeam,
    },
    summary,
    book: { positions, coverage },
    roster: { members, teams },
    dossier: { positions: dossier, total_value: totalValue, can_flag_positions: true },
    flags,
    accuracy: { members: accuracy },
    threads,
    mentionable: members.map((m) => ({
      user_id: m.user_id,
      display_name: m.display_name,
      role: m.role,
    })),
  };
}
