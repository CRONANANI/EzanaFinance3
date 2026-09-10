/**
 * Centralized API Configuration for Ezana Finance (legacy static pages).
 *
 * SECURITY: this file is copied into public/ at build time and served to
 * every browser — it must NEVER contain real API keys. The keys that used
 * to live here were exposed publicly and must be treated as burned
 * (rotate them at Alpha Vantage / FMP / NewsAPI). Live market data for the
 * legacy pages should go through the authenticated server proxies
 * (/api/fmp/*, /api/market-data/*) instead of direct provider calls.
 */
(function (global) {
  'use strict';

  const API_CONFIG = {
    alphaVantage: {
      key: '',
      base: 'https://www.alphavantage.co/query'
    },
    fmp: {
      key: '',
      base: 'https://financialmodelingprep.com/api'
    },
    newsApi: {
      key: '',
      base: 'https://newsapi.org/v2'
    }
  };

  global.API_CONFIG = Object.freeze(API_CONFIG);
})(typeof window !== 'undefined' ? window : this);
