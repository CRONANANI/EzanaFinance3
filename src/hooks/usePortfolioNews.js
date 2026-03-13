'use client';

import { useState, useEffect, useCallback } from 'react';
import { FinnhubAPI } from '@/lib/finnhub';

/** Fetch news and stats for portfolio holdings - real data from connected accounts */
export function usePortfolioNews(holdings = [], summary = null) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const buildInsights = useCallback(async (symbols, portfolioSummary) => {
    setLoading(true);
    setError(null);
    const result = [];

    try {
      // Portfolio statistics from connected accounts (always show when we have data)
      if (portfolioSummary && portfolioSummary.totalValue > 0) {
        const { totalGainLoss, totalGainLossPercent, totalValue, holdingsCount } = portfolioSummary;
        const isPositive = totalGainLoss >= 0;
        result.push({
          id: 'portfolio-summary',
          type: isPositive ? 'positive' : 'warning',
          icon: isPositive ? 'bi-arrow-up-circle' : 'bi-exclamation-triangle',
          text: `Portfolio ${isPositive ? 'up' : 'down'} ${Math.abs(totalGainLossPercent).toFixed(2)}% (${totalGainLoss >= 0 ? '+' : ''}$${Math.abs(totalGainLoss).toLocaleString('en-US', { minimumFractionDigits: 2 })}) • ${holdingsCount || 0} holdings`,
          time: 'Live',
        });
      }

      // Fetch market news for holdings - affects user positions
      const symbolsToFetch = [...new Set(symbols)].filter(Boolean).slice(0, 5);
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 14);
      const toStr = to.toISOString().slice(0, 10);
      const fromStr = from.toISOString().slice(0, 10);

      for (const symbol of symbolsToFetch) {
        try {
          const news = await FinnhubAPI.getCompanyNews(symbol, fromStr, toStr);
          if (Array.isArray(news) && news.length > 0) {
            news.slice(0, 2).forEach((article, i) => {
              const d = article.datetime ? new Date(article.datetime * 1000) : new Date();
              const timeStr = d.toLocaleDateString() === new Date().toLocaleDateString()
                ? 'Today'
                : d.getTime() > Date.now() - 86400000
                  ? 'Yesterday'
                  : `${Math.floor((Date.now() - d.getTime()) / 86400000)}d ago`;
              result.push({
                id: `${symbol}-${i}-${article.id || i}`,
                type: 'info',
                icon: 'bi-newspaper',
                text: `[${symbol}] ${article.headline || article.title}`,
                time: timeStr,
                url: article.url,
                symbol,
              });
            });
          }
        } catch {
          // Skip failed fetches
        }
      }

      setInsights(result.slice(0, 12));
    } catch (err) {
      setError(err);
      if (result.length > 0) setInsights(result);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const symbols = holdings
      ?.map((h) => h.ticker_symbol || h.ticker)
      ?.filter(Boolean) || [];
    buildInsights(symbols, summary);
  }, [holdings, summary, buildInsights]);

  return { insights, loading, error };
}
