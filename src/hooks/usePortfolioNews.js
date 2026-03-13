'use client';

import { useState, useEffect, useCallback } from 'react';
import { FinnhubAPI } from '@/lib/finnhub';

/** Fetch news for multiple symbols and build portfolio-relevant insights */
export function usePortfolioNews(holdings = [], summary = null) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const buildInsights = useCallback(async (symbols, portfolioSummary) => {
    if (!symbols?.length && !portfolioSummary) {
      setInsights([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const result = [];
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 14);
    const toStr = to.toISOString().slice(0, 10);
    const fromStr = from.toISOString().slice(0, 10);

    try {
      // Add portfolio stats as first insights
      if (portfolioSummary) {
        const { totalGainLoss, totalGainLossPercent, totalValue } = portfolioSummary;
        if (totalValue > 0) {
          const isPositive = totalGainLoss >= 0;
          result.push({
            id: 'portfolio-summary',
            type: isPositive ? 'positive' : 'warning',
            icon: isPositive ? 'bi-arrow-up-circle' : 'bi-exclamation-triangle',
            text: `Your portfolio is ${isPositive ? 'up' : 'down'} ${Math.abs(totalGainLossPercent).toFixed(2)}% (${totalGainLoss >= 0 ? '+' : ''}$${Math.abs(totalGainLoss).toLocaleString('en-US', { minimumFractionDigits: 2 })}) this period.`,
            time: 'Current',
          });
        }
      }

      // Fetch news for top 5 holdings (limit API calls)
      const symbolsToFetch = [...new Set(symbols)].slice(0, 5);
      const newsBySymbol = {};

      await Promise.all(
        symbolsToFetch.map(async (symbol) => {
          try {
            const news = await FinnhubAPI.getCompanyNews(symbol, fromStr, toStr);
            if (Array.isArray(news) && news.length > 0) {
              newsBySymbol[symbol] = news.slice(0, 2);
            }
          } catch {
            // Skip failed fetches
          }
        })
      );

      // Convert to insights format
      Object.entries(newsBySymbol).forEach(([symbol, articles]) => {
        articles.forEach((article, i) => {
          const d = article.datetime ? new Date(article.datetime * 1000) : new Date();
          const timeStr = d.toLocaleDateString() === new Date().toLocaleDateString()
            ? 'Today'
            : d.getTime() > Date.now() - 86400000
              ? 'Yesterday'
              : `${Math.floor((Date.now() - d.getTime()) / 86400000)} days ago`;
          result.push({
            id: `${symbol}-${i}-${article.id || i}`,
            type: 'info',
            icon: 'bi-newspaper',
            text: article.headline || article.title,
            time: timeStr,
            url: article.url,
            symbol,
          });
        });
      });

      setInsights(result.slice(0, 10));
    } catch (err) {
      setError(err);
      setInsights(result);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const symbols = holdings
      ?.map((h) => h.ticker_symbol)
      ?.filter(Boolean) || [];
    buildInsights(symbols, summary);
  }, [holdings, summary, buildInsights]);

  return { insights, loading, error };
}
