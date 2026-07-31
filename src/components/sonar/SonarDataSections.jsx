'use client';

import { useEffect, useState } from 'react';

/**
 * Sonar dashboard modules backed by live external sources (the Phase-2 fan-out).
 * Each fetches independently from the app's existing market-data endpoints, is
 * cited, and unmounts (returns null) when it has no data — so the grid never holds
 * a hole. Tickers are derived from what the query surfaced.
 */

function Sparkline({ closes }) {
  if (!closes || closes.length < 3) return null;
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const pts = closes
    .map((c, i) => {
      const x = (i / (closes.length - 1)) * 100;
      const y = 32 - ((c - min) / range) * 30 - 1;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
  return (
    <svg className="sonar-spark" viewBox="0 0 100 34" preserveAspectRatio="none" aria-hidden>
      <polyline points={pts} />
    </svg>
  );
}

/** Markets Snapshot — real quotes (+ a sparkline on the lead) from Finnhub/FMP. */
export function MarketsSnapshot({ tickers }) {
  const [quotes, setQuotes] = useState(null);
  const [spark, setSpark] = useState(null);
  const syms = (tickers || []).slice(0, 3);

  useEffect(() => {
    if (!syms.length) {
      setQuotes({});
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/market-data/quotes?symbols=${encodeURIComponent(syms.join(','))}`,
          { cache: 'no-store' },
        );
        const data = await res.json();
        if (!cancelled) setQuotes(data || {});
      } catch {
        if (!cancelled) setQuotes({});
      }
      try {
        const r = await fetch(
          `/api/market-data/stock-candles?symbol=${encodeURIComponent(syms[0])}&range=1M`,
          { cache: 'no-store' },
        );
        const d = await r.json();
        const closes = (d?.candles || [])
          .map((k) => (typeof k === 'number' ? k : (k?.c ?? k?.close ?? k?.price)))
          .filter((n) => typeof n === 'number');
        if (!cancelled && closes.length > 2) setSpark(closes);
      } catch {
        /* no sparkline — non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syms.join(',')]);

  if (quotes === null) return null;
  const list = syms.map((t) => ({ sym: t, q: quotes[t] })).filter((x) => x.q);
  if (!list.length) return null;

  const tone = ['emerald', 'blue', 'grey'];
  return (
    <div className="sonar-module">
      <div className="sonar-mod-head">
        <span className="sonar-mod-title">Markets Snapshot</span>
        <span className="sonar-mod-source">Finnhub · FMP</span>
      </div>
      <div className="sonar-metrics">
        {list.map((m, i) => {
          const chg = Number(m.q.change) || 0;
          return (
            <div
              key={m.sym}
              className={`sonar-metric sonar-metric--${tone[i] || 'grey'}${i > 0 ? ' sonar-metric--sec' : ''}`}
            >
              <div className="sonar-metric-top">
                <span className="sonar-metric-ticker">{m.sym}</span>
                <span className={`sonar-metric-chg sonar-metric-chg--${chg >= 0 ? 'pos' : 'neg'}`}>
                  {chg >= 0 ? '+' : ''}
                  {chg.toFixed(2)}%
                </span>
              </div>
              <div className="sonar-metric-price">${m.q.price}</div>
              {i === 0 && spark && <Sparkline closes={spark} />}
              {i > 0 && <div className="sonar-metric-label">Last price</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Relevant News — headlines from the app's news API for the surfaced tickers/query. */
export function RelevantNews({ tickers, query }) {
  const [news, setNews] = useState(null);
  const syms = (tickers || []).slice(0, 3);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const qs = syms.length
          ? `tickers=${encodeURIComponent(syms.join(','))}&limit=8`
          : 'category=general&limit=30';
        const res = await fetch(`/api/market-data/news?${qs}`, { cache: 'no-store' });
        const data = await res.json();
        let items = data?.news || [];
        if (!syms.length && query) {
          const terms = query
            .toLowerCase()
            .split(/\s+/)
            .filter((w) => w.length > 3);
          if (terms.length) {
            items = items.filter((n) =>
              terms.some((t) => String(n.headline || '').toLowerCase().includes(t)),
            );
          }
        }
        if (!cancelled) setNews(items.slice(0, 5));
      } catch {
        if (!cancelled) setNews([]);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syms.join(','), query]);

  if (!news || !news.length) return null;
  return (
    <div className="sonar-module">
      <div className="sonar-mod-head">
        <span className="sonar-mod-title">Relevant News</span>
        <span className="sonar-mod-source">News APIs</span>
      </div>
      <div className="sonar-news">
        {news.map((n, i) => (
          <a
            className="sonar-news-row"
            key={n.url || i}
            href={n.url || undefined}
            target="_blank"
            rel="noreferrer"
          >
            <span className="sonar-news-thumb" aria-hidden />
            <span style={{ minWidth: 0 }}>
              <span className="sonar-news-head">{n.headline}</span>
              <span className="sonar-news-meta">
                {n.source || 'News'}
                {n.datetime ? ` · ${String(n.datetime).slice(0, 10)}` : ''}
              </span>
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

/** Upcoming Catalysts — earnings/dividends/econ events; soonest highlighted emerald. */
export function UpcomingCatalysts({ tickers }) {
  const [events, setEvents] = useState(null);
  const syms = (tickers || []).map((t) => String(t).toUpperCase());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/market-data/upcoming-events', { cache: 'no-store' });
        const data = await res.json();
        let evs = data?.events || [];
        if (syms.length) {
          const set = new Set(syms);
          const matched = evs.filter((e) => e.symbol && set.has(String(e.symbol).toUpperCase()));
          if (matched.length) evs = matched;
        }
        if (!cancelled) setEvents(evs.slice(0, 6));
      } catch {
        if (!cancelled) setEvents([]);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syms.join(',')]);

  if (!events || !events.length) return null;
  return (
    <div className="sonar-module">
      <div className="sonar-mod-head">
        <span className="sonar-mod-title">Upcoming Catalysts</span>
        <span className="sonar-mod-source">FMP calendars</span>
      </div>
      {events.map((e, i) => (
        <div className="sonar-cat-row" key={e.id || i}>
          <span className={`sonar-cat-date${i === 0 ? ' sonar-cat-date--soon' : ''}`}>
            {e.fullDate || ''}
          </span>
          <span className="sonar-cat-desc">
            {e.title}
            {e.subtitle ? ` · ${e.subtitle}` : ''}
          </span>
        </div>
      ))}
    </div>
  );
}
