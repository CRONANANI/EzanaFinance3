'use client';

/**
 * The home hero's 1W, 1M, YTD and Beta (Nov 18 2026), read from the member's
 * own portfolio history instead of fixed sample figures.
 *
 * Source follows the hero figure: the paper portfolio when the hero shows it,
 * otherwise the linked brokerage.
 *   - paper:  /api/portfolio/mock-value-series?range=1Y&benchmark=1, which
 *             carries the S&P 500 over the same window.
 *   - linked: /api/portfolio/value-series?range=1Y, counted only when the
 *             series is the member's own record (balance snapshots or daily
 *             returns), never the synthetic fill; the S&P 500 comes from
 *             /api/market/index-history?period=1Y&granularity=daily.
 * The live total replaces the series' last value, so the returns end where the
 * hero figure does. A figure whose window the history does not reach is null
 * and shows as n/a; nothing is estimated.
 *
 * Beta is the slope of the portfolio's returns on the S&P 500's between the
 * days both have a value, over the last year: cov(p, m) / var(m). It needs at
 * least 20 paired returns, else null.
 */
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';

const OWN_SOURCES = new Set(['db', 'snaptrade_snapshots']);
const MIN_PAIRS = 20;
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const dayKey = (at) => String(at).slice(0, 10);

async function getJson(url, token) {
  try {
    const res = await fetch(url, {
      credentials: 'include',
      cache: 'no-store',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** [{ day, value }] sorted, one value per day (the last one seen). */
function byDay(points, atKey, valueKey) {
  const m = new Map();
  for (const p of points || []) {
    const v = Number(p?.[valueKey]);
    const at = p?.[atKey];
    if (!at || !isNum(v) || v <= 0) continue;
    m.set(dayKey(at), v);
  }
  return [...m.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([day, value]) => ({ day, value }));
}

async function load(mode) {
  if (mode === 'mock') {
    const d = await getJson('/api/portfolio/mock-value-series?range=1Y&benchmark=1');
    return {
      series: byDay(d?.points, 'at', 'value'),
      bench: byDay(d?.benchmark, 't', 'v'),
    };
  }
  if (mode === 'linked') {
    let token = null;
    try {
      token = (await supabase.auth.getSession())?.data?.session?.access_token || null;
    } catch {
      token = null;
    }
    const [own, idx] = await Promise.all([
      getJson('/api/portfolio/value-series?range=1Y', token),
      getJson('/api/market/index-history?period=1Y&granularity=daily'),
    ]);
    if (!own || !OWN_SOURCES.has(own.source)) return { series: [], bench: [] };
    return {
      series: byDay(own.points, 'at', 'value'),
      bench: byDay(idx?.indices?.spx?.series, 'ymd', 'close'),
    };
  }
  return { series: [], bench: [] };
}

/** Return from the last value on or before `fromDay` to `end`, in percent.
    A portfolio younger than the window has no value before it: its return
    over the window is its return since its first value. */
function returnSince(series, fromDay, end) {
  let base = null;
  for (const p of series) {
    if (p.day <= fromDay) base = p.value;
    else break;
  }
  if (!isNum(base) && series.length >= 2) base = series[0].value;
  if (!isNum(base) || !isNum(end)) return null;
  return (end / base - 1) * 100;
}

function betaOf(series, bench) {
  const b = new Map(bench.map((p) => [p.day, p.value]));
  const common = series.filter((p) => b.has(p.day));
  const pr = [];
  const mr = [];
  for (let i = 1; i < common.length; i += 1) {
    const p0 = common[i - 1].value;
    const p1 = common[i].value;
    const m0 = b.get(common[i - 1].day);
    const m1 = b.get(common[i].day);
    if (p0 > 0 && m0 > 0) {
      pr.push(p1 / p0 - 1);
      mr.push(m1 / m0 - 1);
    }
  }
  if (mr.length < MIN_PAIRS) return null;
  const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  const pm = mean(pr);
  const mm = mean(mr);
  let cov = 0;
  let varM = 0;
  for (let i = 0; i < mr.length; i += 1) {
    cov += (pr[i] - pm) * (mr[i] - mm);
    varM += (mr[i] - mm) ** 2;
  }
  return varM > 0 ? cov / varM : null;
}

/**
 * @param {'mock'|'linked'|null} mode   which portfolio the hero shows
 * @param {number|null} liveValue       the hero's live total
 * @returns {{ loading: boolean, w1: number|null, m1: number|null, ytd: number|null, beta: number|null }}
 */
export function useHeroReturns(mode, liveValue) {
  const [data, setData] = useState({ loading: Boolean(mode), series: [], bench: [] });

  useEffect(() => {
    if (!mode) {
      setData({ loading: false, series: [], bench: [] });
      return undefined;
    }
    let cancelled = false;
    setData((d) => ({ ...d, loading: true }));
    load(mode).then((r) => {
      if (!cancelled) setData({ loading: false, ...r });
    });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  return useMemo(() => {
    const { series, bench, loading } = data;
    if (!series.length) return { loading, w1: null, m1: null, ytd: null, beta: null };
    const last = series[series.length - 1].value;
    const end = isNum(liveValue) && liveValue > 0 ? liveValue : last;
    const now = new Date();
    const ago = (days) => {
      const t = new Date(now);
      t.setDate(t.getDate() - days);
      return t.toISOString().slice(0, 10);
    };
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const lastYearEnd = `${now.getFullYear() - 1}-12-31`;
    return {
      loading,
      w1: returnSince(series, ago(7), end),
      m1: returnSince(series, monthAgo.toISOString().slice(0, 10), end),
      ytd: returnSince(series, lastYearEnd, end),
      beta: betaOf(series, bench),
    };
  }, [data, liveValue]);
}
