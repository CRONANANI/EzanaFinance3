/**
 * Sonar insider buying: the time window a ping asks about (Nov 9, 2026). Pure, no imports,
 * so scripts/check-sonar-insider-windows.mjs runs it directly.
 *
 * Before this the ping understood four windows (this week, last week, this month, last month)
 * and answered every other question with this week: "Who was buying their own shares in
 * 2025?" played November 2026 buys under a 2025 question, and "in October" meant this year's
 * October whatever the year said. Now:
 *
 *   windowSpec(text)        the window the text names, as a spec string (default 'week')
 *   resolveWindow(spec, now) the dates and the words for that spec, in New York days
 *
 * Specs:
 *   week | last_week | month | last_month    as before (week and month fall back to the
 *                                            previous one when little is filed yet)
 *   ytd | last_year | year:2025              calendar years ("in 2025", "this year")
 *   qtd | last_quarter | quarter:2025-3      calendar quarters ("Q3 2025", "third quarter")
 *   month:2025-10                            a named month ("October 2025", "in October")
 *   rolling:90                               "last 90 days", "past 6 months", "past year"
 *   range:2025-01-01:today                   "since 2025", "since March", "from 2024 to 2025"
 *
 * A window that ends in the future is clipped to today; one that has not started is flagged
 * (`future`) so the answer says so instead of showing other dates.
 */

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];
const MONTH_RE =
  'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?';
const ORD = { first: 1, '1st': 1, second: 2, '2nd': 2, third: 3, '3rd': 3, fourth: 4, '4th': 4 };
const YEAR = '((?:19|20)\\d{2})';

const monthIndex = (word) => {
  const w = String(word || '')
    .toLowerCase()
    .slice(0, 3);
  return MONTHS.findIndex((m) => m.startsWith(w)) + 1; // 1..12, 0 if none
};
const pad = (n) => String(n).padStart(2, '0');

/* ── Parsing ──────────────────────────────────────────────────────── */

/**
 * The window a ping names. `now` decides "the most recent October" and similar.
 * -> spec string (see the header)
 */
export function windowSpec(text, now = new Date()) {
  const t = String(text || '').toLowerCase();
  const today = nyDate(now);
  const curY = Number(today.slice(0, 4));
  const curM = Number(today.slice(5, 7));
  const curQ = Math.floor((curM - 1) / 3) + 1;

  /* Ranges of years: "from 2024 to 2025", "between 2024 and 2025", "2024-2025". */
  let m =
    new RegExp(`\\b(?:from|between)\\s+${YEAR}\\s+(?:to|and|through|until)\\s+${YEAR}\\b`).exec(
      t,
    ) || new RegExp(`\\b${YEAR}\\s*(?:-|\\u2013|to)\\s*${YEAR}\\b`).exec(t);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])].sort((x, y) => x - y);
    return `range:${a}-01-01:${b}-12-31`;
  }

  /* "since 2025", "since March", "since March 2025". */
  m = new RegExp(`\\bsince\\s+(?:(${MONTH_RE})\\.?\\s*,?\\s*)?${YEAR}?\\b`).exec(t);
  if (m && (m[1] || m[2])) {
    const mi = m[1] ? monthIndex(m[1]) : 1;
    let y = m[2] ? Number(m[2]) : curY;
    if (!m[2] && mi > curM) y -= 1;
    return `range:${y}-${pad(mi)}-01:today`;
  }

  /* Quarters with or without a year: "Q3 2025", "2025 Q3", "third quarter of 2025", "Q3". */
  m = new RegExp(`\\b${YEAR}\\s*q([1-4])\\b`).exec(t);
  if (m) {
    const [y, q] = [Number(m[1]), Number(m[2])];
    return y === curY && q === curQ ? 'qtd' : `quarter:${y}-${q}`;
  }
  m =
    new RegExp(`\\bq([1-4])\\s*(?:of\\s+)?'?${YEAR}?\\b`).exec(t) ||
    new RegExp(
      `\\b(first|second|third|fourth|1st|2nd|3rd|4th)\\s+quarter(?:\\s+(?:of\\s+)?${YEAR})?\\b`,
    ).exec(t);
  if (m) {
    const q = ORD[m[1]] || Number(m[1]);
    let y = m[2] ? Number(m[2]) : curY;
    if (!m[2] && q > curQ) y -= 1;
    return y === curY && q === curQ ? 'qtd' : `quarter:${y}-${q}`;
  }
  if (/\b(this|current)\s+quarter\b|\bquarter[\s-]+to[\s-]+date\b|\bqtd\b/.test(t)) return 'qtd';
  if (/\b(last|previous|prior)\s+quarter\b/.test(t)) return 'last_quarter';

  /* Rolling windows: "last 90 days", "past 6 months", "past 2 weeks", "past year", "ttm". */
  m =
    /\b(?:last|past|previous|trailing|over\s+the\s+(?:last|past))\s+(\d{1,3})\s+(days?|weeks?|months?|years?)\b/.exec(
      t,
    );
  if (m) {
    const n = Number(m[1]);
    const per = m[2].startsWith('day')
      ? 1
      : m[2].startsWith('week')
        ? 7
        : m[2].startsWith('month')
          ? 30
          : 365;
    return `rolling:${Math.min(Math.max(n * per, 1), 3650)}`;
  }
  if (
    /\b(?:past|trailing)\s+(?:12|twelve)\s+months\b|\bpast\s+year\b|\bttm\b|\blast\s+12\s+months\b/.test(
      t,
    )
  )
    return 'rolling:365';

  /* A named month, with a year ("October 2025", "Oct. 2025") or after a preposition ("in
     October"). A bare month name needs the preposition, so "who may be buying" is not May. */
  m =
    new RegExp(`\\b(${MONTH_RE})\\.?\\s*,?\\s*(?:of\\s+)?${YEAR}\\b`).exec(t) ||
    new RegExp(
      `\\b(?:in|during|for|throughout|over|through|across)\\s+(${MONTH_RE})\\b(?!\\s*\\d{1,2}\\b)`,
    ).exec(t);
  if (m) {
    const mi = monthIndex(m[1]);
    let y = m[2] ? Number(m[2]) : curY;
    if (!m[2] && mi > curM) y -= 1;
    if (y === curY && mi === curM) return 'month';
    return `month:${y}-${pad(mi)}`;
  }

  /* Calendar years. */
  if (
    /\b(this|current)\s+year\b|\byear[\s-]+to[\s-]+date\b|\bytd\b|\bso\s+far\s+this\s+year\b/.test(
      t,
    )
  )
    return 'ytd';
  if (/\b(last|previous|prior)\s+year\b/.test(t)) return 'last_year';
  /* A bare year, but not an amount ("over $2000", "2000 shares"). */
  m = new RegExp(
    `(?<![$\\d.,])\\b${YEAR}\\b(?![.,]\\d)(?!\\s*(?:k|m|bn|b|million|billion|shares?|dollars?|usd)\\b)`,
  ).exec(t);
  if (m) {
    const y = Number(m[1]);
    return y === curY ? 'ytd' : `year:${y}`;
  }

  /* The original four. */
  if (/\b(last|previous)\s+month\b/.test(t)) return 'last_month';
  if (/\b(this|past|the\s+last)\s+month\b|\bmonth[\s-]+to[\s-]+date\b|\bmtd\b/.test(t))
    return 'month';
  if (/\b(last|previous)\s+week\b/.test(t)) return 'last_week';
  if (/\b(last|past)\s+30\s+days\b/.test(t)) return 'rolling:30';
  return 'week';
}

/* ── Resolving ────────────────────────────────────────────────────── */

export const nyDate = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

export const addDays = (iso, n) =>
  new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

const lastDayOfMonth = (y, m) => new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
const monthName = (m) => MONTHS[m - 1].replace(/^./, (c) => c.toUpperCase());
const shortDay = (iso) => {
  const d = new Date(`${iso}T12:00:00Z`);
  return `${d.getUTCDate()} ${monthName(d.getUTCMonth() + 1).slice(0, 3)} ${d.getUTCFullYear()}`;
};
const cap = (s) => String(s).replace(/^./, (c) => c.toUpperCase());

/**
 * spec -> { spec, kind, from, to, word, noun, unit, label, prev?, future, today }
 *   word   the phrase in a sentence: "Insiders bought $X of their own stock {word}"
 *   noun   the phrase after "for": "No purchases are on file for {noun}"
 *   unit   week | month | quarter | year | period ("The {unit} in one frame")
 */
export function resolveWindow(spec = 'week', now = new Date()) {
  const today = nyDate(now);
  const curY = Number(today.slice(0, 4));
  const curM = Number(today.slice(5, 7));
  const curQ = Math.floor((curM - 1) / 3) + 1;
  const dow = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
  const monday = addDays(today, -dow);
  const monthStart = `${today.slice(0, 8)}01`;
  const prevMonthEnd = addDays(monthStart, -1);
  const prevMonthStart = `${prevMonthEnd.slice(0, 8)}01`;

  const mk = (o) => {
    const future = o.from > today;
    return { spec, today, future, ...o, to: o.to > today ? today : o.to };
  };
  const yearW = (y, extra = {}) =>
    mk({
      kind: 'year',
      from: `${y}-01-01`,
      to: `${y}-12-31`,
      word: `in ${y}`,
      noun: String(y),
      unit: 'year',
      label: String(y),
      ...extra,
    });
  const quarterW = (y, q, extra = {}) =>
    mk({
      kind: 'quarter',
      from: `${y}-${pad((q - 1) * 3 + 1)}-01`,
      to: lastDayOfMonth(y, q * 3),
      word: `in Q${q} ${y}`,
      noun: `Q${q} ${y}`,
      unit: 'quarter',
      label: `Q${q} ${y}`,
      ...extra,
    });
  const lastWeek = {
    kind: 'week',
    from: addDays(monday, -7),
    to: addDays(monday, -1),
    word: 'last week',
    noun: 'last week',
    unit: 'week',
    label: 'Last week',
  };
  const lastMonth = {
    kind: 'month',
    from: prevMonthStart,
    to: prevMonthEnd,
    word: 'last month',
    noun: 'last month',
    unit: 'month',
    label: 'Last month',
  };

  const s = String(spec || 'week');
  let m;
  if (s === 'last_week') return mk(lastWeek);
  if (s === 'last_month') return mk(lastMonth);
  if (s === 'month')
    return mk({
      kind: 'month',
      from: monthStart,
      to: today,
      word: 'this month',
      noun: 'this month',
      unit: 'month',
      label: 'This month',
      prev: { ...lastMonth, spec: 'last_month', today },
    });
  if (s === 'ytd')
    return yearW(curY, {
      to: today,
      word: 'so far this year',
      noun: `${curY} to date`,
      label: 'This year',
    });
  if (s === 'last_year')
    return yearW(curY - 1, { word: `last year (${curY - 1})`, label: 'Last year' });
  if ((m = /^year:(\d{4})$/.exec(s))) return yearW(Number(m[1]));
  if (s === 'qtd')
    return quarterW(curY, curQ, {
      to: today,
      word: 'this quarter',
      noun: `Q${curQ} ${curY} to date`,
      label: 'This quarter',
    });
  if (s === 'last_quarter') {
    const [y, q] = curQ === 1 ? [curY - 1, 4] : [curY, curQ - 1];
    return quarterW(y, q, { word: `last quarter (Q${q} ${y})`, label: 'Last quarter' });
  }
  if ((m = /^quarter:(\d{4})-([1-4])$/.exec(s))) return quarterW(Number(m[1]), Number(m[2]));
  if ((m = /^month:(\d{4})-(\d{2})$/.exec(s))) {
    const [y, mo] = [Number(m[1]), Number(m[2])];
    const name = `${monthName(mo)} ${y}`;
    return mk({
      kind: 'month',
      from: `${y}-${pad(mo)}-01`,
      to: lastDayOfMonth(y, mo),
      word: `in ${name}`,
      noun: name,
      unit: 'month',
      label: name,
    });
  }
  if ((m = /^rolling:(\d+)$/.exec(s))) {
    const n = Number(m[1]);
    const phrase =
      n === 365
        ? 'the last 12 months'
        : n % 30 === 0 && n >= 60
          ? `the last ${n / 30} months`
          : n % 7 === 0 && n >= 14 && n < 60
            ? `the last ${n / 7} weeks`
            : `the last ${n} days`;
    return mk({
      kind: 'rolling',
      from: addDays(today, -(n - 1)),
      to: today,
      word: `over ${phrase}`,
      noun: phrase,
      unit: 'period',
      label: cap(phrase.replace(/^the\s+/, '')),
    });
  }
  if ((m = /^range:(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2}|today)$/.exec(s))) {
    const from = m[1];
    const to = m[2] === 'today' ? today : m[2];
    const whole = /-01-01$/.test(from) && /-12-31$/.test(to);
    const phrase =
      m[2] === 'today'
        ? `since ${/-01-01$/.test(from) ? from.slice(0, 4) : /-01$/.test(from) ? monthYear(from) : shortDay(from)}`
        : whole
          ? `from ${from.slice(0, 4)} to ${to.slice(0, 4)}`
          : `from ${shortDay(from)} to ${shortDay(to)}`;
    return mk({
      kind: 'range',
      from,
      to,
      word: phrase,
      noun: phrase.replace(/^since /, 'the period since ').replace(/^from /, 'the period from '),
      unit: 'period',
      label: cap(phrase),
    });
  }
  /* 'week' and anything unknown. */
  return mk({
    kind: 'week',
    from: monday,
    to: today,
    word: 'this week',
    noun: 'this week',
    unit: 'week',
    label: 'This week',
    prev: { ...lastWeek, spec: 'last_week', today },
  });
}

/** Days in a resolved window, inclusive. */
export const windowDays = (w) =>
  Math.round((Date.parse(`${w.to}T12:00:00Z`) - Date.parse(`${w.from}T12:00:00Z`)) / 86_400_000) +
  1;

/** "September 2026" for a coverage start date. */
export const monthYear = (iso) =>
  iso ? `${monthName(Number(iso.slice(5, 7)))} ${iso.slice(0, 4)}` : '';
