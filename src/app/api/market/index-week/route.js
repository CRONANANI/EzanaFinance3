import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB = 'https://finnhub.io/api/v1';

function nyDateKeyFromUnix(tSec) {
  return new Date(tSec * 1000).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

function todayNyKey() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

function addDaysYmd(ymd, delta) {
  const [Y, M, D] = ymd.split('-').map(Number);
  const t = Date.UTC(Y, M - 1, D) + delta * 86400000;
  return new Date(t).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

function weekdayLongNy(ymd) {
  const [Y, M, D] = ymd.split('-').map(Number);
  return new Date(Date.UTC(Y, M - 1, D, 12, 0, 0)).toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'long',
  });
}

/** Monday–Friday calendar dates (YYYY-MM-DD) for the current week in America/New_York */
function currentWeekMonFriKeys() {
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  let cur = todayNyKey();
  for (let i = 0; i < 10; i++) {
    if (weekdayLongNy(cur) === 'Monday') break;
    cur = addDaysYmd(cur, -1);
  }
  const keys = [];
  for (let i = 0; i < 5; i++) {
    keys.push({ label: labels[i], ymd: addDaysYmd(cur, i) });
  }
  return keys;
}

function buildCloseMap(candleJson) {
  const map = new Map();
  if (!candleJson || candleJson.s !== 'ok' || !Array.isArray(candleJson.t)) return map;
  for (let i = 0; i < candleJson.t.length; i++) {
    const key = nyDateKeyFromUnix(candleJson.t[i]);
    map.set(key, candleJson.c[i]);
  }
  return map;
}

/** Scale ETF closes to rough “index” style headline numbers for UI cards */
function cardDisplay(spyClose, qqqClose, diaClose) {
  if (spyClose == null || qqqClose == null || diaClose == null) return null;
  const sp = spyClose * 10.11;
  const nq = qqqClose * 35.8;
  const dj = diaClose * 173.2;
  return {
    sp500: sp.toLocaleString('en-US', { maximumFractionDigits: 1 }),
    nasdaq: nq.toLocaleString('en-US', { maximumFractionDigits: 0 }),
    scop1: dj.toLocaleString('en-US', { maximumFractionDigits: 0 }),
  };
}

export async function GET() {
  const apiKey = process.env.FINNHUB_API_KEY;
  const weekSlots = currentWeekMonFriKeys();
  const todayKey = todayNyKey();

  if (!apiKey) {
    const emptySeries = weekSlots.map((s) => ({ day: s.label, sp500: null, nasdaq: null, dow: null }));
    return NextResponse.json({ ok: false, error: 'no_key', series: emptySeries, week: emptySeries });
  }

  const now = Math.floor(Date.now() / 1000);
  const from = now - 86400 * 21;

  async function candle(sym) {
    try {
      const res = await fetch(
        `${FINNHUB}/stock/candle?symbol=${sym}&resolution=D&from=${from}&to=${now}&token=${apiKey}`,
        { next: { revalidate: 120 } },
      );
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }

  const [spyC, qqqC, diaC] = await Promise.all([candle('SPY'), candle('QQQ'), candle('DIA')]);
  const spyMap = buildCloseMap(spyC);
  const qqqMap = buildCloseMap(qqqC);
  const diaMap = buildCloseMap(diaC);

  const series = weekSlots.map(({ label, ymd }) => {
    const sessionCompleteForChart = ymd < todayKey;
    const sp = spyMap.get(ymd);
    const nq = qqqMap.get(ymd);
    const dj = diaMap.get(ymd);
    const has = sp != null && nq != null && dj != null;
    return {
      day: label,
      sp500: sessionCompleteForChart && has ? sp : null,
      nasdaq: sessionCompleteForChart && has ? nq : null,
      dow: sessionCompleteForChart && has ? dj : null,
    };
  });

  let latestSpy;
  let latestQqq;
  let latestDia;
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].sp500 != null) {
      latestSpy = series[i].sp500;
      latestQqq = series[i].nasdaq;
      latestDia = series[i].dow;
      break;
    }
  }
  if (latestSpy == null) {
    const lastSpy = [...spyMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).pop();
    if (lastSpy) latestSpy = lastSpy[1];
  }
  if (latestQqq == null) {
    const lastQ = [...qqqMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).pop();
    if (lastQ) latestQqq = lastQ[1];
  }
  if (latestDia == null) {
    const lastD = [...diaMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).pop();
    if (lastD) latestDia = lastD[1];
  }

  const cards = cardDisplay(latestSpy, latestQqq, latestDia);

  return NextResponse.json({
    ok: true,
    series,
    cards,
    todayKey,
  });
}
