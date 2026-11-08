/**
 * Pitch Circuit: curated directory of external inter-university stock pitch
 * competitions (and one adjacent award) that council members can enter.
 *
 * DATA DISCIPLINE
 * - Every field is taken from the organizer's latest PUBLISHED edition and the
 *   URL in `sources`. Nothing is estimated. A field the organizer has not
 *   published is `null` and the UI renders "Not published".
 * - `edition` names the cycle the dates belong to. When an organizer has not
 *   yet published the next cycle, the UI shows the last edition's dates as
 *   "Last edition" and the status reads "Dates TBA".
 * - Re-verify every entry each term and bump VERIFIED_ON.
 *
 * Pure module: no React, no I/O. Status helpers take an explicit `todayIso`
 * so server and client render identically.
 */

export const VERIFIED_ON = '2026-11-08';

export const REGION_LABEL = { us: 'United States', ca: 'Canada' };
export const MODE_LABEL = { in_person: 'In-person finals', virtual: 'Virtual finals' };
export const KIND_LABEL = { competition: 'Stock pitch', award: 'Scholarship award' };

export const PITCH_CIRCUIT = [
  {
    slug: 'point72-academy-case-competition',
    kind: 'competition',
    name: 'Point72 Academy Case Competition',
    shortName: 'Point72',
    alsoKnownAs: 'Point72 National Stock Pitch Competition',
    host: 'Point72 Academy',
    partner: null,
    region: 'us',
    location: 'New York, NY (Point72 office)',
    finalsMode: 'in_person',
    edition: '2026 US edition',
    summary:
      'Point72 assigns every team the same public company. Teams build an investment thesis from public sources only and pitch it to Point72 investment professionals in New York.',
    eligibility:
      'First and second year undergraduates at the same accredited US institution, expected to graduate between December 2028 and July 2030. Earlier editions admitted teams from outside the US.',
    teamSize: '2 to 4 students',
    ideaRules: 'Company assigned by Point72. Public information only.',
    prizes:
      'Scholarships and an accelerated interview process. Point72 covers reasonable finalist travel and lodging.',
    entryFee: null,
    rounds: [
      {
        name: 'Initial round',
        detail: 'Teams research the assigned company and submit a stock pitch presentation.',
      },
      {
        name: 'Finalist round',
        detail:
          'Each finalist team gets a Point72 mentor for a 60 minute feedback session, then presents in person. Every member must attend and speak.',
      },
    ],
    keyDates: [
      { label: 'Registration deadline', date: '2026-10-01' },
      { label: 'Case assigned', date: '2026-10-02' },
      { label: 'Presentation due', date: '2026-10-12' },
      { label: 'Finalists announced', date: '2026-10-26' },
      { label: 'Final presentation due', date: '2026-11-09' },
      { label: 'Finals in New York', date: '2026-11-12', endDate: '2026-11-13' },
    ],
    officialUrl: 'https://job-boards.greenhouse.io/point72/jobs/8726366002',
    sources: [
      {
        label: 'Point72 Academy, 2026 case competition posting',
        url: 'https://job-boards.greenhouse.io/point72/jobs/8726366002',
      },
      {
        label: 'University of Alabama Culverhouse, 2022 edition recap',
        url: 'https://culverhouse.ua.edu/?p=14675',
      },
    ],
  },
  {
    slug: 'hfac-intercollegiate-stock-pitch',
    kind: 'competition',
    name: 'HFAC Intercollegiate Stock Pitch Competition',
    shortName: 'Harvard FAC',
    alsoKnownAs: 'Harvard Financial Analysts Club Stock Pitch',
    host: 'Harvard Financial Analysts Club',
    partner: 'Citadel (latest published edition)',
    region: 'us',
    location: 'Harvard University, Cambridge, MA',
    finalsMode: 'in_person',
    edition: 'Fall 2025 edition',
    summary:
      'A memo-first competition. Teams submit a two page investment memo and model; finalists present a full deck and valuation at Harvard to a panel of Citadel investment professionals.',
    eligibility: 'Undergraduate teams. No school restriction is published.',
    teamSize: '2 to 4 students',
    ideaRules: 'Long or short, US listed, market cap of $1B or more, 3 to 12 month horizon.',
    prizes:
      '$6,000 prize pool, travel subsidies for finalists, and a first round Citadel Associate Program interview for Class of 2028 finalists.',
    entryFee: null,
    rounds: [
      { name: 'Memo round', detail: 'Two page investment memo, financial model and team resumes.' },
      {
        name: 'Finals',
        detail:
          'Finalists deliver a full deck and valuation in advance, then pitch live at Harvard.',
      },
    ],
    keyDates: [
      { label: 'Memo deadline', date: '2025-11-19' },
      { label: 'Finalists notified', date: '2025-11-24' },
      { label: 'Welcome reception', date: '2025-12-04' },
      { label: 'Finals at Harvard', date: '2025-12-05' },
    ],
    officialUrl: 'https://www.harvardfac.org/pitch-competition',
    sources: [
      { label: 'HFAC competition page', url: 'https://www.harvardfac.org/pitch-competition' },
    ],
  },
  {
    slug: 'alta-fox-small-cap-stock-pitch',
    kind: 'competition',
    name: 'Alta Fox Undergraduate Small-Cap Stock Pitch Competition',
    shortName: 'Alta Fox',
    alsoKnownAs: 'Harvard x Alta Fox Stock Pitch',
    host: 'Alta Fox Capital Management',
    partner: 'Harvard Financial Analysts Club (co-host of the 2023 edition)',
    region: 'us',
    location: 'Fort Worth, TX (2025 finals). The 2023 finals were held at Harvard.',
    finalsMode: 'in_person',
    edition: '2025 edition',
    summary:
      'A small-cap only competition run by Alta Fox Capital. Teams pitch a fundamental idea; the top teams present live to a panel of judges.',
    eligibility: 'Current undergraduate students from any school.',
    teamSize: '1 to 5 students (2023 rules)',
    ideaRules: 'Small-cap buy recommendation, market cap of $300M to $5B (2025 edition).',
    prizes: '$5,000 cash prize (2023 edition). Later prize amounts are not published.',
    entryFee: null,
    rounds: [
      { name: 'Pitch submission', detail: 'PowerPoint or PDF pitch submitted to Alta Fox.' },
      {
        name: 'Finals',
        detail:
          'In 2025, 10 teams presented to the judges. Each finalist gives a 10 minute pitch and 5 minutes of Q&A.',
      },
    ],
    keyDates: [{ label: 'Finals in Fort Worth', date: '2025-03-01' }],
    officialUrl: 'https://www.altafoxcapital.com/event/2025/4/11/epl4qz1bznv252frczg8ieaijshcni',
    sources: [
      {
        label: 'Alta Fox, 2023 competition brief',
        url: 'https://static1.squarespace.com/static/64b2ef00bccc06664e2de54a/t/65009f381ceab67f647548f0/1694539576882/Alta+Fox+Capital+2023+Stock+Pitch+Competition+(1).pdf',
      },
      {
        label: 'Alta Fox, 2025 competition recap',
        url: 'https://www.altafoxcapital.com/event/2025/4/11/epl4qz1bznv252frczg8ieaijshcni',
      },
      {
        label: 'Auburn Harbert College, 2025 finals report',
        url: 'https://harbert.auburn.edu/news/2025/04/auburn-fma-brings-home-another-win-in-national-student-competition.html',
      },
    ],
  },
  {
    slug: 'dartmouth-stock-pitch',
    kind: 'competition',
    name: 'Dartmouth Stock Pitch Competition',
    shortName: 'Dartmouth DIPP',
    alsoKnownAs: null,
    host: 'Dartmouth Investment and Philanthropy Program (DIPP)',
    partner: '11 sponsor firms offering coffee chats',
    region: 'us',
    location: 'Fully virtual',
    finalsMode: 'virtual',
    edition: 'January 2025 edition',
    summary:
      'A three round virtual competition. The DIPP investment committee screens decks down to 16 semifinalists, then four teams pitch to senior investment professionals in a public final. A parallel Freshman Showcase is judged by recruiting sponsors.',
    eligibility: 'Undergraduates. Teams may combine students from different colleges.',
    teamSize: '3 to 4 students',
    ideaRules:
      'Long only, NASDAQ or NYSE listed, public information only. Deck capped at 15 slides plus a model.',
    prizes:
      '$6,000 in cash across finalist and Freshman Showcase teams. Finalists are guaranteed a sponsor coffee chat.',
    entryFee: null,
    rounds: [
      {
        name: 'Round 1, screening',
        detail: 'Deck and model reviewed by the DIPP Investment Committee. Top 16 advance.',
      },
      {
        name: 'Round 2, semifinals',
        detail:
          '15 minute pitch and 10 minutes of Q&A with sponsor professionals. Four teams advance.',
      },
      {
        name: 'Finals and Freshman Showcase',
        detail:
          'Public virtual final judged by senior investment professionals; all-freshman teams pitch in a concurrent showcase.',
      },
    ],
    keyDates: [
      { label: 'Registration closes', date: '2025-01-05' },
      { label: 'Round 1 deck and model due', date: '2025-01-11' },
      { label: 'Semifinal pitches', date: '2025-01-19' },
      { label: 'Finals and Freshman Showcase', date: '2025-01-25' },
    ],
    officialUrl: 'https://dipp-ic.squarespace.com/competition',
    sources: [
      { label: 'DIPP competition page', url: 'https://dipp-ic.squarespace.com/competition' },
    ],
  },
  {
    slug: 'asu-avic-fundamental-edge',
    kind: 'competition',
    name: 'ASU AVIC x Fundamental Edge Stock Pitch Competition',
    shortName: 'Arizona State',
    alsoKnownAs: 'Arizona State x Fundamental Edge Stock Pitch',
    host: 'Applied Value Investing Club, Arizona State University',
    partner: 'Fundamental Edge',
    region: 'us',
    location: 'Remote',
    finalsMode: 'virtual',
    edition: 'Spring 2026 edition',
    summary:
      'A one page executive summary decides the field. Five finalist teams then pitch remotely to the judging panel.',
    eligibility:
      'Undergraduates in the US and internationally. Teams may combine students from any school.',
    teamSize: '1 to 4 students',
    ideaRules: 'Long or short, any exchange, market cap of $500M USD or more.',
    prizes: '1st: $1,500 and a Fundamental Edge Analyst Academy seat. 2nd: $1,000. 3rd: $500.',
    entryFee: null,
    rounds: [
      {
        name: 'First round',
        detail:
          'One page executive summary covering the company, thesis, analysis, risks and catalysts.',
      },
      {
        name: 'Final round',
        detail: 'Five finalists present remotely: 12 minute pitch and 5 minutes of Q&A.',
      },
    ],
    keyDates: [
      { label: 'Submissions open', date: '2026-02-11' },
      { label: 'Submissions close', date: '2026-02-18' },
      { label: 'Finalists announced', date: '2026-02-23' },
      { label: 'Final deck due', date: '2026-02-26' },
      { label: 'Final round', date: '2026-02-27' },
    ],
    officialUrl: 'https://www.avicasu.com/stock-pitch-competition',
    sources: [
      { label: 'AVIC competition page', url: 'https://www.avicasu.com/stock-pitch-competition' },
    ],
  },
  {
    slug: 'wharton-witg-fundamental-edge',
    kind: 'competition',
    name: 'WITG x Fundamental Edge International Stock Pitch Competition',
    shortName: 'Wharton WITG',
    alsoKnownAs: 'UPenn Wharton Investment Group Stock Pitch',
    host: 'Wharton Investment & Trading Group, University of Pennsylvania',
    partner: 'Fundamental Edge',
    region: 'us',
    location: 'University of Pennsylvania, Philadelphia, PA',
    finalsMode: 'in_person',
    edition: 'Fall 2025 edition (third annual)',
    summary:
      'An international undergraduate stock pitch competition held each fall at Wharton, run with Fundamental Edge.',
    eligibility: 'International undergraduate competition.',
    teamSize: null,
    ideaRules: null,
    prizes: null,
    entryFee: null,
    rounds: [],
    keyDates: [{ label: 'Competition day at Wharton', date: '2025-09-30' }],
    officialUrl: 'http://www.pennwitg.com/competition',
    sources: [
      { label: 'WITG competition page', url: 'http://www.pennwitg.com/competition' },
      {
        label: 'Fundamental Edge announcement',
        url: 'https://x.com/FundamentEdge/status/1966556347887218751',
      },
    ],
  },
  {
    slug: 'cfac-canadian-undergraduate-stock-pitch',
    kind: 'competition',
    name: 'CFAC Canadian Undergraduate Stock Pitch Competition',
    shortName: 'UBC CFAC',
    alsoKnownAs: 'UBC | CFAC Stock Pitch Competition',
    host: 'CFAC Portfolio Management (Compounding for a Cure), UBC',
    partner: null,
    region: 'ca',
    location: 'UBC Sauder School of Business, Vancouver, BC',
    finalsMode: 'in_person',
    edition: 'Fall 2025 edition',
    summary:
      'A national Canadian competition run by a UBC student-managed fund that invests to raise money for ALS research. Two remote rounds lead to a live final at Sauder.',
    eligibility: 'All Canadian undergraduate students.',
    teamSize: '1 to 4 students',
    ideaRules: null,
    prizes: 'Prize pool of up to $2,000 for selected teams.',
    entryFee: '$50 per team (includes admission to the live final)',
    rounds: [
      {
        name: 'Round 1',
        detail: 'Equity research submission on the released competition materials.',
      },
      { name: 'Semifinal round', detail: 'Selected teams advance to a second judged round.' },
      {
        name: 'Live final',
        detail: 'Finalists pitch at UBC Sauder; the final is open to attendees for networking.',
      },
    ],
    keyDates: [
      { label: 'Materials released, registration opens', date: '2025-08-10' },
      { label: 'Registration closes', date: '2025-08-31' },
      { label: 'Round 1', date: '2025-09-01', endDate: '2025-09-15' },
      { label: 'Semifinal round', date: '2025-09-18', endDate: '2025-09-23' },
      { label: 'Live final at UBC Sauder', date: '2025-09-28' },
    ],
    officialUrl: 'https://www.cfacubc.com/events',
    sources: [
      { label: 'CFAC events', url: 'https://www.cfacubc.com/events' },
      {
        label: '2025 event listing',
        url: 'https://stayhappening.com/e/cfac-portfolio-management-canadian-undergraduate-stock-pitch-competition-E118S4IXIMDD4',
      },
    ],
  },
  {
    slug: 'cfa-society-toronto-undergraduate-awards',
    kind: 'award',
    name: 'CFA Society Toronto Undergraduate Finance & Economics Awards',
    shortName: 'CFA Toronto',
    alsoKnownAs: 'CFA Society Toronto Undergraduate Scholarship',
    host: 'CFA Society Toronto',
    partner: null,
    region: 'ca',
    location: 'Ontario',
    finalsMode: null,
    edition: '2026 to 2027 cycle',
    summary:
      'Not a pitch competition: an application based award that recognizes upper-year finance and economics students, judged by a panel of industry professionals.',
    eligibility:
      'Third or fourth year students in a finance or economics program at an Ontario university or college, minimum 3.0 GPA. Past winners are excluded.',
    teamSize: 'Individual',
    ideaRules: 'Essay (500 words) or a 3 minute video, plus resume and unofficial transcript.',
    prizes: 'Up to $6,000 in prizes each year.',
    entryFee: null,
    rounds: [
      {
        name: 'Panel review',
        detail:
          'Weighted scoring: essay and motivation 30%, work and volunteer experience 20%, communication 20%, academics 15%, interest in the CFA Program 15%.',
      },
    ],
    keyDates: [{ label: 'Application deadline', date: '2026-11-18' }],
    officialUrl: 'https://cfatoronto.ca/undergradawards',
    sources: [
      {
        label: 'CFA Society Toronto, undergraduate awards',
        url: 'https://cfatoronto.ca/undergradawards',
      },
    ],
  },
];

/* ── helpers ─────────────────────────────────────────────────────────────── */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 'YYYY-MM-DD' -> 'Nov 12, 2026'. Parsed by regex so no timezone drift. */
export function fmtDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  if (!m) return '';
  return `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

export function fmtRange(start, end) {
  if (!end) return fmtDate(start);
  const a = /^(\d{4})-(\d{2})-(\d{2})$/.exec(start);
  const b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(end);
  if (a && b && a[1] === b[1] && a[2] === b[2])
    return `${MONTHS[Number(a[2]) - 1]} ${Number(a[3])} to ${Number(b[3])}, ${a[1]}`;
  return `${fmtDate(start)} to ${fmtDate(end)}`;
}

/** Whole days from todayIso to iso (UTC midnight to UTC midnight). */
export function daysBetween(todayIso, iso) {
  const t = Date.UTC(...todayIso.split('-').map((n, i) => (i === 1 ? Number(n) - 1 : Number(n))));
  const d = Date.UTC(...iso.split('-').map((n, i) => (i === 1 ? Number(n) - 1 : Number(n))));
  return Math.round((d - t) / 86400000);
}

/**
 * Status for an entry on a given day.
 * - live:     today falls inside the published edition (between first and last date)
 * - upcoming: the published edition starts after today
 * - tba:      the last published edition is over; next cycle not published yet
 * `next` is the next key date on or after today (end date counts for ranges).
 */
export function circuitStatus(entry, todayIso) {
  const dates = entry.keyDates;
  if (!dates.length) return { state: 'tba', next: null };
  const first = dates[0].date;
  const last = dates[dates.length - 1].endDate || dates[dates.length - 1].date;
  const next = dates.find((d) => (d.endDate || d.date) >= todayIso) || null;
  if (todayIso > last) return { state: 'tba', next: null };
  if (todayIso < first) return { state: 'upcoming', next };
  return { state: 'live', next };
}

export const STATUS_META = {
  live: { label: 'In season', tone: 'positive' },
  upcoming: { label: 'Upcoming', tone: 'info' },
  tba: { label: 'Dates TBA', tone: 'neutral' },
};

/** Label + tone for a status. An award before its deadline is accepting applications. */
export function statusMeta(entry, status) {
  if (entry.kind === 'award' && status.state === 'upcoming')
    return { label: 'Applications open', tone: 'positive' };
  return STATUS_META[status.state];
}

/** Months (0-11) the latest published edition spans, from its own key dates. */
export function seasonMonths(entry) {
  const ms = new Set();
  entry.keyDates.forEach((d) => {
    const s = Number(d.date.slice(5, 7)) - 1;
    const e = Number((d.endDate || d.date).slice(5, 7)) - 1;
    for (let m = s; ; m = (m + 1) % 12) {
      ms.add(m);
      if (m === e) break;
    }
  });
  return ms;
}

export function getCircuitEntry(slug) {
  return PITCH_CIRCUIT.find((c) => c.slug === slug) || null;
}

/** Sort: in season first, then upcoming, then TBA; inside a group by next date. */
export function sortCircuit(entries, todayIso) {
  const rank = { live: 0, upcoming: 1, tba: 2 };
  return [...entries].sort((a, b) => {
    const sa = circuitStatus(a, todayIso);
    const sb = circuitStatus(b, todayIso);
    if (rank[sa.state] !== rank[sb.state]) return rank[sa.state] - rank[sb.state];
    const na = sa.next?.date || a.keyDates[0]?.date || '';
    const nb = sb.next?.date || b.keyDates[0]?.date || '';
    return sa.state === 'tba' ? seasonOrder(a) - seasonOrder(b) : na.localeCompare(nb);
  });
}

/* Academic-year ordering for TBA entries: Aug is month 0. */
function seasonOrder(entry) {
  const m = Number(entry.keyDates[0]?.date.slice(5, 7) || 1) - 1;
  return (m - 7 + 12) % 12;
}

export const ACADEMIC_MONTHS = [7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6].map((m) => ({
  index: m,
  label: MONTHS[m],
}));
