'use client';

/**
 * One snapshot of the selected company for the Company view of
 * /company-research (Nov 2026 redesign). Every card on the page reads from
 * this hook, so the price, the peer set and the metrics agree everywhere.
 *
 * Sources (unchanged, all existing routes and hooks):
 *   profile + quote   GET /api/fmp/stock-stats?symbol=   (name, exchange,
 *                     sector, industry, logo, price, change, as-of, and the
 *                     preformatted market cap / P/E / yield / EPS / cap type)
 *   analyst           useRecommendation + usePriceTarget (Finnhub)
 *   metrics           useStockMetric (Finnhub metric=all)
 *   news              GET /api/alpha/news (sentiment), falling back to
 *                     useCompanyNews (Finnhub, no sentiment)
 *   peers             GET /api/comps/:symbol (target + peer multiples)
 *
 * Each part carries its own status ('idle' | 'loading' | 'ready' | 'error')
 * so a card can show its own loading, empty and error states.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useCompanyNews,
  usePriceTarget,
  useRecommendation,
  useStockMetric,
} from '@/hooks/useFinnhub';
import { getTickerMeta } from '@/lib/tickerSearchData';
import {
  analystCounts,
  median,
  parseNewsDate,
  sentimentBucket,
  toNum,
} from '@/lib/research/company-research';

const DASH = '--';

function useStockStats(symbol) {
  const [state, setState] = useState({ status: 'idle', data: null });
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    if (!symbol) {
      setState({ status: 'idle', data: null });
      return undefined;
    }
    let cancelled = false;
    setState({ status: 'loading', data: null });
    fetch(`/api/fmp/stock-stats?symbol=${encodeURIComponent(symbol)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (!data || data.error) setState({ status: 'error', data: null });
        else setState({ status: 'ready', data });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error', data: null });
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, nonce]);
  const retry = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, retry };
}

function useComps(symbol) {
  const [state, setState] = useState({ status: 'idle', data: null });
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    if (!symbol) {
      setState({ status: 'idle', data: null });
      return undefined;
    }
    let cancelled = false;
    setState({ status: 'loading', data: null });
    fetch(`/api/comps/${encodeURIComponent(symbol)}`, { cache: 'no-store' })
      .then(async (r) => {
        const json = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (!r.ok || json.error) setState({ status: 'error', data: null });
        else setState({ status: 'ready', data: json });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error', data: null });
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, nonce]);
  const retry = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, retry };
}

function useAvNews(symbol) {
  const [state, setState] = useState({ status: 'idle', items: [] });
  useEffect(() => {
    if (!symbol) {
      setState({ status: 'idle', items: [] });
      return undefined;
    }
    let cancelled = false;
    setState({ status: 'loading', items: [] });
    fetch(`/api/alpha/news?tickers=${encodeURIComponent(symbol)}&limit=10`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { articles: [] }))
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data?.articles)
          ? data.articles
          : Array.isArray(data?.news)
            ? data.news
            : [];
        setState({ status: 'ready', items: list });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'ready', items: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [symbol]);
  return state;
}

/** Ticker-level sentiment when Alpha Vantage gives it, else the article's overall label. */
function avSentiment(article, symbol) {
  const row = Array.isArray(article?.ticker_sentiment)
    ? article.ticker_sentiment.find((t) => String(t?.ticker).toUpperCase() === symbol)
    : null;
  return sentimentBucket(row?.ticker_sentiment_label || article?.overall_sentiment_label);
}

export function useCompanyResearch(symbol) {
  const sym = symbol ? String(symbol).toUpperCase() : null;
  const stats = useStockStats(sym);
  const comps = useComps(sym);
  const avNews = useAvNews(sym);
  const { data: finnhubNews, loading: finnhubNewsLoading } = useCompanyNews(sym, 30);
  const { data: recs, loading: recsLoading, error: recsError } = useRecommendation(sym);
  const { data: target, loading: targetLoading, error: targetError } = usePriceTarget(sym);
  const { data: metricData, loading: metricLoading, error: metricError } = useStockMetric(sym);

  return useMemo(() => {
    if (!sym) return null;
    const meta = getTickerMeta(sym);
    const d = stats.data || {};
    const shown = (v) => (v == null || v === '' ? DASH : String(v));

    /* ---- profile + quote: the one price every panel uses ---- */
    const price = toNum(d.price);
    const profile = {
      ticker: sym,
      name: d.name || meta?.name || sym,
      exchange: d.exchange || null,
      sector: d.sector || meta?.sector || null,
      industry: d.industry || null,
      capType: d.capType || null,
      logoUrl: d.logo || null,
    };
    const quote = {
      status: stats.status,
      retry: stats.retry,
      price: price != null && price > 0 ? price : null,
      changeAbs: toNum(d.change),
      changePct: toNum(d.changePct),
      asOf: toNum(d.asOf),
      display: {
        marketCap: shown(d.mcap),
        pe: shown(d.pe),
        dividendYield: shown(d.divYield),
        eps: shown(d.eps),
        capType: shown(d.capType),
      },
    };

    /* ---- analyst ---- */
    const counts = analystCounts(Array.isArray(recs) ? recs[0] : null);
    const avgTarget = toNum(target?.targetMean);
    const analyst = {
      status:
        recsLoading || targetLoading
          ? 'loading'
          : recsError && targetError
            ? 'error'
            : counts || avgTarget != null
              ? 'ready'
              : 'empty',
      counts,
      avgTarget,
      analysts: toNum(target?.numberAnalysts),
      period: Array.isArray(recs) && recs[0]?.period ? recs[0].period : null,
    };

    /* ---- key metrics (Finnhub metric=all, percent units) ---- */
    const m = metricData?.metric || {};
    const pick = (...keys) => {
      for (const k of keys) {
        const v = toNum(m[k]);
        if (v != null) return v;
      }
      return null;
    };
    const pfcf = pick('pfcfShareTTM');
    const metrics = {
      status: metricLoading
        ? 'loading'
        : metricError
          ? 'error'
          : metricData?.metric
            ? 'ready'
            : 'empty',
      grossMargin: pick('grossMarginTTM', 'grossMarginAnnual'),
      opMargin: pick('operatingMarginTTM', 'operatingMarginAnnual'),
      revGrowthYoY: pick('revenueGrowthTTMYoy', 'revenueGrowthQuarterlyYoy'),
      epsGrowthYoY: pick('epsGrowthTTMYoy', 'epsGrowthQuarterlyYoy'),
      eps: pick(
        'epsTTM',
        'epsInclExtraItemsTTM',
        'epsExclExtraItemsTTM',
        'epsBasicExclExtraItemsTTM',
      ),
      /* FCF per share = price / (price to FCF per share). */
      fcfPerShare: price != null && pfcf != null && pfcf > 0 ? price / pfcf : null,
    };

    /* ---- news: newest three, sentiment when Alpha Vantage has it ---- */
    let news = [];
    if (avNews.items.length) {
      news = avNews.items.map((a) => ({
        title: a.title,
        url: a.url,
        source: a.source || null,
        date: parseNewsDate(a.time_published),
        sentiment: avSentiment(a, sym),
      }));
    } else if (Array.isArray(finnhubNews) && finnhubNews.length) {
      news = finnhubNews.map((a) => ({
        title: a.headline,
        url: a.url,
        source: a.source || null,
        date: parseNewsDate(a.datetime),
        sentiment: null,
      }));
    }
    news = news
      .filter((n) => n.title && n.url)
      .sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0))
      .slice(0, 3);
    const newsStatus =
      avNews.status === 'loading' || (avNews.items.length === 0 && finnhubNewsLoading)
        ? 'loading'
        : news.length
          ? 'ready'
          : 'empty';

    /* ---- peers: company row first, then up to four peers ---- */
    const c = comps.data;
    const peerRows = Array.isArray(c?.peers)
      ? c.peers
          .filter((p) => p?.symbol && p.symbol !== sym)
          .sort((a, b) => (toNum(b.marketCap) || 0) - (toNum(a.marketCap) || 0))
          .slice(0, 4)
          .map((p) => ({
            ticker: p.symbol,
            name: p.name || p.symbol,
            pe: toNum(p.pe),
            evEbitda: toNum(p.evEbitda),
            peg5y: toNum(p.peg5y ?? p.peg),
            marketCap: toNum(p.marketCap),
            isSelf: false,
          }))
      : [];
    const selfRow = c?.target
      ? {
          ticker: sym,
          name: c.target.name || profile.name,
          pe: toNum(c.target.pe),
          evEbitda: toNum(c.target.evEbitda),
          peg5y: toNum(c.target.peg5y ?? c.target.peg),
          marketCap: toNum(c.target.marketCap),
          isSelf: true,
        }
      : null;
    const peers = {
      status:
        comps.status === 'ready' ? (selfRow || peerRows.length ? 'ready' : 'empty') : comps.status,
      retry: comps.retry,
      rows: selfRow ? [selfRow, ...peerRows] : peerRows,
      /* The median every panel quotes: the peers in the table, company excluded. */
      medianPe: median(peerRows.map((p) => p.pe)),
    };

    return { profile, quote, analyst, metrics, news: { status: newsStatus, items: news }, peers };
  }, [
    sym,
    stats.status,
    stats.data,
    stats.retry,
    comps.status,
    comps.data,
    comps.retry,
    avNews.status,
    avNews.items,
    finnhubNews,
    finnhubNewsLoading,
    recs,
    recsLoading,
    recsError,
    target,
    targetLoading,
    targetError,
    metricData,
    metricLoading,
    metricError,
  ]);
}

export default useCompanyResearch;
