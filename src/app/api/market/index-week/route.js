import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB = 'https://finnhub.io/api/v1';

/** ETFs that reliably return candle data on Finnhub free tier */
const SERIES_CHAINS = {
  spx: ['SPY'],
  ixic: ['QQQ'],
  rut: ['IWM'],
  dji: ['DIA'],
  vix: ['VIXY'],
};

function nyDateKeyFromUnix(tSec) {
  return new Date(tSec * 1000).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

function todayNyKey() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

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
  if (!candleJson || candleJson.s !== 'ok' || !Array.isArray(candleJson.t) || !Array.isArray(candleJson.c)) return map;
  for (let i = 0; i < candleJson.t.length; i++) {
    const ts = candleJson.t[i];
    const tSec = typeof ts === 'number' ? ts : parseInt(String(ts), 10);
    if (!Number.isFinite(tSec)) continue;
    const key = nyDateKeyFromUnix(tSec);
    const c = candleJson.c[i];
    const n = typeof c === 'number' ? c : parseFloat(c);
    if (Number.isFinite(n)) map.set(key, n);
  }
  return map;
}

function pickCloseForDay(ymd, todayKey, map, quoteClose) {
  const fromMap = map.get(ymd);
  if (fromMap != null) return fromMap;
  if (ymd === todayKey && quoteClose != null && Number.isFinite(quoteClose)) return quoteClose;
  return null;
}

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

/** Fetch candle with retry on 429 and logging */
async function fetchCandle(sym, apiKey, from, to) {
  const url = `${FINNHUB}/stock/candle?symbol=${encodeURIComponent(sym)}&resolution=D&from=${from}&to=${to}&token=${apiKey}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.status === 429) {
        console.warn(`[index-week] Finnhub 429 rate limit for candle ${sym}, attempt ${attempt + 1}`);
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      if (!res.ok) {
        console.warn(`[index-week] Finnhub candle ${sym} returned ${res.status}`);
        return null;
      }
      const data = await res.json();
      if (!data || data.error) {
        console.warn(`[index-week] Finnhub candle ${sym} error:`, data?.error || 'unknown');
        return null;
      }
      if (data.s === 'no_data') {
        console.log(`[index-week] Finnhub candle ${sym}: no_data (normal outside market hours or for this symbol)`);
        return data;
      }
      console.log(`[index-week] Finnhub candle ${sym}: OK, ${data.t?.length || 0} bars`);
      return data;
    } catch (err) {
      console.error(`[index-week] Finnhub candle ${sym} fetch error:`, err?.message || err);
      return null;
    }
  }
  return null;
}

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
    if (res.status === 429) {
      console.warn(`[index-week] Finnhub 429 rate limit for quote ${sym}`);
      return null;
    }
    if (!res.ok) {
      console.warn(`[index-week] Finnhub quote ${sym} returned ${res.status}`);
      return null;
    }
    const data = await res.json();
    if (!data || data.error) {
      console.warn(`[index-week] Finnhub quote ${sym} error:`, data?.error);
      return null;
    }
    const c = data?.c;
    const pc = data?.pc;
    if (typeof c === 'number' && Number.isFinite(c) && c > 0) return c;
    if (typeof pc === 'number' && Number.isFinite(pc) && pc > 0) return pc;
    console.warn(`[index-week] Finnhub quote ${sym}: no valid close`, { c, pc });
    return null;
  } catch (err) {
    console.error(`[index-week] Finnhub quote ${sym} fetch error:`, err?.message || err);
    return null;
  }
}

function latestCloseFromMap(map) {
  const entries = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const last = entries.pop();
  return last ? last[1] : null;
}

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

const SERIES_KEYS = ['spx', 'ixic', 'rut', 'dji', 'vix'];

function buildEnrichedFiveSeries(weekSlots, todayKey, resolved, quoteValues) {
  const maps = resolved.map((r) => r.map);
  const raw = weekSlots.map(({ label, ymd }) => {
    const row = { day: label };
    for (let i = 0; i < 5; i++) {
      const k = SERIES_KEYS[i];
      row[k] =
        pickCloseForDay(ymd, todayKey, maps[i], quoteValues[i]) ??
        (ymd <= todayKey ? lastCloseOnOrBefore(ymd, maps[i]) : null);
    }
    return row;
  });

  return raw.map((row, i) => {
    const ymd = weekSlots[i].ymd;
    if (ymd > todayKey) return row;
    const out = { ...row };
    for (const k of SERIES_KEYS) {
      if (out[k] != null) continue;
      let prev = null;
      for (let j = 0; j < i; j++) {
        if (raw[j][k] != null) prev = raw[j][k];
      }
      if (prev != null) out[k] = prev;
    }
    return out;
  });
}

function applyQuoteGapFill(series, weekSlots, todayKey, quoteValues) {
  return series.map((row, idx) => {
    const ymd = weekSlots[idx].ymd;
    if (ymd > todayKey) return row;
    const out = { ...row };
    for (let i = 0; i < SERIES_KEYS.length; i++) {
      const k = SERIES_KEYS[i];
      if (out[k] == null && quoteValues[i] != null) out[k] = quoteValues[i];
    }
    return out;
  });
}

function readFinnhubKey() {
  const raw = process.env.FINNHUB_API_KEY || process.env.FINNHUB_KEY;
  return typeof raw === 'string' ? raw.trim() : '';
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export async function GET() {
  const apiKey = readFinnhubKey();
  const weekSlots = currentWeekMonFriKeys();
  const todayKey = todayNyKey();

  console.log(
    `[index-week] Starting fetch. Today=${todayKey}, Week=${weekSlots[0].ymd} to ${weekSlots[4].ymd}, API key present=${!!apiKey}`,
  );

  const emptyRow = (s) => ({
    day: s.label,
    spx: null,
    ixic: null,
    rut: null,
    dji: null,
    vix: null,
  });

  if (!apiKey) {
    console.warn('[index-week] No FINNHUB_API_KEY or FINNHUB_KEY found in environment');
    const emptySeries = weekSlots.map(emptyRow);
    return NextResponse.json({ ok: false, error: 'no_key', series: emptySeries, week: emptySeries });
  }

  const now = Math.floor(Date.now() / 1000);
  const from = now - 86400 * 120;

  const resolved = [];
  for (const key of SERIES_KEYS) {
    const result = await resolveCloseMap(SERIES_CHAINS[key], apiKey, from, now);
    resolved.push(result);
    await delay(200);
  }

  const [spxR, ixicR, rutR, djiR, vixR] = resolved;

  const quoteValues = [];
  for (const r of resolved) {
    const q = await fetchQuoteClose(r.symbol, apiKey);
    quoteValues.push(q);
    await delay(200);
  }

  const [q0, q1, q2, q3, q4] = quoteValues;

  console.log('[index-week] Candle map sizes:', {
    spx: spxR.map.size,
    ixic: ixicR.map.size,
    rut: rutR.map.size,
    dji: djiR.map.size,
    vix: vixR.map.size,
  });
  console.log('[index-week] Quote values:', { spx: q0, ixic: q1, rut: q2, dji: q3, vix: q4 });

  let series = buildEnrichedFiveSeries(weekSlots, todayKey, resolved, quoteValues);
  series = applyQuoteGapFill(series, weekSlots, todayKey, quoteValues);

  const latest = { spx: null, ixic: null, rut: null, dji: null, vix: null };
  for (let i = series.length - 1; i >= 0; i--) {
    const row = series[i];
    for (const k of SERIES_KEYS) {
      if (latest[k] == null && row[k] != null) latest[k] = row[k];
    }
  }
  const quoteByKey = { spx: q0, ixic: q1, rut: q2, dji: q3, vix: q4 };
  const mapByKey = { spx: spxR.map, ixic: ixicR.map, rut: rutR.map, dji: djiR.map, vix: vixR.map };
  for (const k of SERIES_KEYS) {
    if (latest[k] == null) latest[k] = quoteByKey[k] ?? latestCloseFromMap(mapByKey[k]);
  }

  const cards = cardDisplay(latest);

  const hasAnyData = series.some((row) => SERIES_KEYS.some((k) => row[k] != null));
  console.log(`[index-week] Result: hasAnyData=${hasAnyData}, cards=${!!cards}`);

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
    _debug: {
      candleMapSizes: {
        spx: spxR.map.size,
        ixic: ixicR.map.size,
        rut: rutR.map.size,
        dji: djiR.map.size,
        vix: vixR.map.size,
      },
      quotesPresent: {
        spx: q0 != null,
        ixic: q1 != null,
        rut: q2 != null,
        dji: q3 != null,
        vix: q4 != null,
      },
      hasAnyData,
    },
  });
}
