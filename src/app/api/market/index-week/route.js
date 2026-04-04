import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB = 'https://finnhub.io/api/v1';

/** ETFs first (reliable on all tiers); index symbols as fallback for plans that expose them. */
const SERIES_CHAINS = {
  spx: ['SPY', '^GSPC'],
  ixic: ['QQQ', '^IXIC'],
  rut: ['IWM', '^RUT'],
  dji: ['DIA', '^DJI'],
  vix: ['VIXY', '^VIX'],
};

function nyDateKeyFromUnix(tSec) {
  return new Date(tSec * 1000).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

function todayNyKey() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

/** Advance calendar days in America/New_York (midnight UTC would shift the NY calendar date). */
function addDaysYmd(ymd, delta) {
  const [Y, M, D] = ymd.split('-').map(Number);
  const ms = Date.UTC(Y, M - 1, D, 12, 0, 0) + delta * 86400000;
  return new Date(ms).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
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

function pickCloseForDay(ymd, todayKey, map, quoteClose) {
  const fromMap = map.get(ymd);
  if (fromMap != null) return fromMap;
  if (ymd === todayKey && quoteClose != null && Number.isFinite(quoteClose)) return quoteClose;
  return null;
}

/** Latest daily close on or before `ymd` (handles holidays / sparse bars). */
function lastCloseOnOrBefore(ymd, map) {
  let bestKey = '';
  let bestVal = null;
  for (const [k, v] of map) {
    if (k > ymd || v == null || !Number.isFinite(Number(v))) continue;
    if (k > bestKey) {
      bestKey = k;
      bestVal = Number(v);
    }
  }
  return bestVal;
}

async function fetchCandle(sym, apiKey, from, to) {
  try {
    const res = await fetch(
      `${FINNHUB}/stock/candle?symbol=${encodeURIComponent(sym)}&resolution=D&from=${from}&to=${to}&token=${apiKey}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** First symbol in chain that returns at least one daily close; else last attempted map (may be empty). */
async function resolveCloseMap(chain, apiKey, from, to) {
  let lastMap = new Map();
  let symbolUsed = chain[0] ?? null;
  for (const sym of chain) {
    symbolUsed = sym;
    const json = await fetchCandle(sym, apiKey, from, to);
    const map = buildCloseMap(json);
    lastMap = map;
    if (map.size > 0) return { symbol: sym, map };
  }
  return { symbol: symbolUsed, map: lastMap };
}

async function fetchQuoteClose(sym, apiKey) {
  if (!sym) return null;
  try {
    const res = await fetch(`${FINNHUB}/quote?symbol=${encodeURIComponent(sym)}&token=${apiKey}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    const c = data?.c;
    const pc = data?.pc;
    if (typeof c === 'number' && Number.isFinite(c) && c > 0) return c;
    if (typeof pc === 'number' && Number.isFinite(pc) && pc > 0) return pc;
    return null;
  } catch {
    return null;
  }
}

function latestCloseFromMap(map) {
  const entries = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const last = entries.pop();
  return last ? last[1] : null;
}

/** Headline numbers from latest quote / candle (partial OK). */
function cardDisplay(latest) {
  const { spx, ixic, rut, dji, vix } = latest;
  if (spx == null && ixic == null && dji == null && rut == null && vix == null) return null;
  const n = (v, fd) =>
    v != null && Number.isFinite(v) ? v.toLocaleString('en-US', { maximumFractionDigits: fd }) : '—';
  return {
    spx: n(spx, 1),
    ixic: n(ixic, 0),
    rut: n(rut, 1),
    dji: n(dji, 0),
    vix: n(vix, 2),
  };
}

export async function GET() {
  const apiKey = process.env.FINNHUB_API_KEY;
  const weekSlots = currentWeekMonFriKeys();
  const todayKey = todayNyKey();

  const emptyRow = (s) => ({
    day: s.label,
    spx: null,
    ixic: null,
    rut: null,
    dji: null,
    vix: null,
  });

  if (!apiKey) {
    const emptySeries = weekSlots.map(emptyRow);
    return NextResponse.json({ ok: false, error: 'no_key', series: emptySeries, week: emptySeries });
  }

  const now = Math.floor(Date.now() / 1000);
  const from = now - 86400 * 35;

  const [spxR, ixicR, rutR, djiR, vixR] = await Promise.all([
    resolveCloseMap(SERIES_CHAINS.spx, apiKey, from, now),
    resolveCloseMap(SERIES_CHAINS.ixic, apiKey, from, now),
    resolveCloseMap(SERIES_CHAINS.rut, apiKey, from, now),
    resolveCloseMap(SERIES_CHAINS.dji, apiKey, from, now),
    resolveCloseMap(SERIES_CHAINS.vix, apiKey, from, now),
  ]);

  const [qSpx, qIxic, qRut, qDji, qVix] = await Promise.all([
    fetchQuoteClose(spxR.symbol, apiKey),
    fetchQuoteClose(ixicR.symbol, apiKey),
    fetchQuoteClose(rutR.symbol, apiKey),
    fetchQuoteClose(djiR.symbol, apiKey),
    fetchQuoteClose(vixR.symbol, apiKey),
  ]);

  let series = weekSlots.map(({ label, ymd }) => ({
    day: label,
    spx: pickCloseForDay(ymd, todayKey, spxR.map, qSpx) ?? (ymd <= todayKey ? lastCloseOnOrBefore(ymd, spxR.map) : null),
    ixic: pickCloseForDay(ymd, todayKey, ixicR.map, qIxic) ?? (ymd <= todayKey ? lastCloseOnOrBefore(ymd, ixicR.map) : null),
    rut: pickCloseForDay(ymd, todayKey, rutR.map, qRut) ?? (ymd <= todayKey ? lastCloseOnOrBefore(ymd, rutR.map) : null),
    dji: pickCloseForDay(ymd, todayKey, djiR.map, qDji) ?? (ymd <= todayKey ? lastCloseOnOrBefore(ymd, djiR.map) : null),
    vix: pickCloseForDay(ymd, todayKey, vixR.map, qVix) ?? (ymd <= todayKey ? lastCloseOnOrBefore(ymd, vixR.map) : null),
  }));

  const KEYS = ['spx', 'ixic', 'rut', 'dji', 'vix'];
  series = series.map((row, i) => {
    const ymd = weekSlots[i].ymd;
    if (ymd > todayKey) return row;
    const out = { ...row };
    for (const k of KEYS) {
      if (out[k] != null) continue;
      let prev = null;
      for (let j = 0; j < i; j++) {
        if (series[j][k] != null) prev = series[j][k];
      }
      if (prev != null) out[k] = prev;
    }
    return out;
  });

  const latest = { spx: null, ixic: null, rut: null, dji: null, vix: null };
  const LATEST_KEYS = ['spx', 'ixic', 'rut', 'dji', 'vix'];
  for (let i = series.length - 1; i >= 0; i--) {
    const row = series[i];
    for (const k of LATEST_KEYS) {
      if (latest[k] == null && row[k] != null) latest[k] = row[k];
    }
  }
  const quoteByKey = { spx: qSpx, ixic: qIxic, rut: qRut, dji: qDji, vix: qVix };
  const mapByKey = { spx: spxR.map, ixic: ixicR.map, rut: rutR.map, dji: djiR.map, vix: vixR.map };
  for (const k of LATEST_KEYS) {
    if (latest[k] == null) latest[k] = quoteByKey[k] ?? latestCloseFromMap(mapByKey[k]);
  }

  const cards = cardDisplay(latest);

  return NextResponse.json({
    ok: true,
    series,
    cards,
    symbolsResolved: {
      spx: spxR.symbol,
      ixic: ixicR.symbol,
      rut: rutR.symbol,
      dji: djiR.symbol,
      vix: vixR.symbol,
    },
    todayKey,
  });
}
