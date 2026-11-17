/**
 * Sonar adaptive research: measuring a price move (Nov 2026).
 *
 * Pure arithmetic on daily bars. It answers what can be computed: how large the move was,
 * how it compares with the security's own ordinary range, how much of it the benchmark
 * shared, and whether volume was unusual. It does not say why. Causes come from dated,
 * cited reporting and are presented beside these numbers, never derived from them.
 */

const DOWN =
  /\b(down|fall(ing|s|en)?|fell|drop(ping|s|ped)?|declin(e|es|ed|ing)|crash(ing|ed)?|sell(ing)?[- ]?off|sold off|tank(ing|ed)?|plung(e|ed|ing)|slump(ed|ing)?|sink(ing)?|sank|los(e|ing|t))\b/i;
const UP =
  /\b(up|ris(e|es|ing)|rose|surg(e|es|ed|ing)|rall(y|ies|ied|ying)|jump(s|ed|ing)?|soar(s|ed|ing)?|spik(e|ed|ing)|climb(s|ed|ing)?|gain(s|ed|ing)?|pop(ped|ping)?)\b/i;

/** The window a question asks about, in trading sessions. */
export function moveWindowOf(question) {
  const q = String(question || '');
  if (/\b(this|past|last) (month|30 days|four weeks)\b|\bmonth to date\b/i.test(q))
    return { sessions: 21, label: 'the past month', range: '3M' };
  if (
    /\b(this|past|last) (week|5 days|five days|few days)\b|\bweek to date\b|\brecent(ly)?\b/i.test(
      q,
    )
  )
    return { sessions: 5, label: 'the past five sessions', range: '1M' };
  return { sessions: 1, label: 'the latest session', range: '1M' };
}

/** The direction the question assumes: 'down', 'up' or null. */
export function assumedDirection(question) {
  const q = String(question || '');
  const d = DOWN.test(q);
  const u = UP.test(q);
  if (d === u) return null;
  return d ? 'down' : 'up';
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
function stdev(xs) {
  if (xs.length < 2) return null;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
}
const round = (v, d = 2) => (v == null || !Number.isFinite(v) ? null : Number(v.toFixed(d)));

/**
 * @param {{ date: string, close: number, volume?: number }[]} bars  oldest first
 * @param {{ date: string, close: number }[]} [benchBars]
 * @param {{ sessions?: number }} [opts]
 * @returns {null | object} null when there are too few bars to say anything
 */
export function attributeMove(bars, benchBars = [], { sessions = 1 } = {}) {
  const clean = (bars || []).filter((b) => b?.date && Number.isFinite(b.close) && b.close > 0);
  const n = Math.max(1, Math.min(63, Math.round(sessions)));
  /* The window, plus at least 30 earlier sessions to know what ordinary looks like. */
  if (clean.length < n + 31) return null;
  const last = clean[clean.length - 1];
  const base = clean[clean.length - 1 - n];
  const movePct = (last.close / base.close - 1) * 100;

  const rets = [];
  for (let i = 1; i < clean.length; i += 1)
    rets.push({ date: clean[i].date, pct: (clean[i].close / clean[i - 1].close - 1) * 100 });
  const prior = rets.slice(0, rets.length - n).slice(-60);
  const sigma = stdev(prior.map((r) => r.pct));
  const typical = sigma != null ? sigma * Math.sqrt(n) : null;
  const multiple = typical ? Math.abs(movePct) / typical : null;

  const benchByDate = new Map(
    (benchBars || [])
      .filter((b) => b?.date && Number.isFinite(b.close) && b.close > 0)
      .map((b) => [b.date, b.close]),
  );
  const b0 = benchByDate.get(base.date);
  const b1 = benchByDate.get(last.date);
  const benchPct = b0 && b1 ? (b1 / b0 - 1) * 100 : null;
  const relPct = benchPct != null ? movePct - benchPct : null;

  const vols = clean.map((b) => (Number.isFinite(b.volume) && b.volume > 0 ? b.volume : null));
  const windowVols = vols.slice(-n).filter((v) => v != null);
  const priorVols = vols
    .slice(0, vols.length - n)
    .slice(-20)
    .filter((v) => v != null);
  const volumeRatio =
    windowVols.length === n && priorVols.length >= 10 ? mean(windowVols) / mean(priorVols) : null;

  const days = rets.slice(-Math.max(n, 5)).map((r) => {
    const i = clean.findIndex((b) => b.date === r.date);
    const pb = benchByDate.get(clean[i - 1].date);
    const cb = benchByDate.get(r.date);
    return {
      date: r.date,
      pct: round(r.pct),
      benchPct: pb && cb ? round((cb / pb - 1) * 100) : null,
      close: clean[i].close,
    };
  });
  const inWindow = days.slice(-n);
  const biggest = inWindow.reduce(
    (a, d) => (!a || Math.abs(d.pct) > Math.abs(a.pct) ? d : a),
    null,
  );

  /* How much of the move the benchmark shared. Only read when the move is big enough to
     split: a 0.2% move has no meaningful shares. */
  let scope = 'unclear';
  if (benchPct != null && Math.abs(movePct) >= 0.5) {
    const sameSign = Math.sign(benchPct) === Math.sign(movePct);
    const shared = sameSign ? Math.min(1, Math.abs(benchPct) / Math.abs(movePct)) : 0;
    scope = shared >= 0.6 ? 'broad' : shared <= 0.3 ? 'specific' : 'mixed';
  }
  const size =
    multiple == null ? 'unknown' : multiple < 1 ? 'ordinary' : multiple < 2 ? 'notable' : 'unusual';

  return {
    sessions: n,
    asOf: last.date,
    from: base.date,
    lastClose: last.close,
    baseClose: base.close,
    movePct: round(movePct),
    direction: movePct > 0 ? 'up' : movePct < 0 ? 'down' : 'flat',
    benchPct: round(benchPct),
    relPct: round(relPct),
    sigmaDaily: round(sigma),
    typicalPct: round(typical),
    multiple: round(multiple, 1),
    volumeRatio: round(volumeRatio, 1),
    biggestDay: n > 1 ? biggest : null,
    days,
    scope,
    size,
  };
}

/** Return from the last close before `eventDate` to the latest close, for two series. */
export function sinceEvent(bars, benchBars, eventDate) {
  const clean = (bars || []).filter((b) => b?.date && Number.isFinite(b.close) && b.close > 0);
  const at = clean.findIndex((b) => b.date >= eventDate);
  if (at < 1 || at > clean.length - 1) return null;
  const base = clean[at - 1];
  const last = clean[clean.length - 1];
  const bench = new Map((benchBars || []).map((b) => [b.date, b.close]));
  const b0 = bench.get(base.date);
  const b1 = bench.get(last.date);
  const movePct = (last.close / base.close - 1) * 100;
  const benchPct = b0 > 0 && b1 > 0 ? (b1 / b0 - 1) * 100 : null;
  const first = clean[at];
  return {
    from: base.date,
    asOf: last.date,
    sessions: clean.length - at,
    movePct: round(movePct),
    benchPct: round(benchPct),
    relPct: benchPct != null ? round(movePct - benchPct) : null,
    firstDay: { date: first.date, pct: round((first.close / base.close - 1) * 100) },
  };
}
