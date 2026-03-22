/**
 * Centralized API Configuration for Ezana Finance
 * Uses environment variables for keys (NEXT_PUBLIC_* for client-side)
 */

export const API_CONFIG = Object.freeze({
  alphaVantage: {
    key: process.env.NEXT_PUBLIC_ALPHA_VANTAGE_KEY || '',
    base: 'https://www.alphavantage.co/query',
  },
  fmp: {
    key: process.env.NEXT_PUBLIC_FMP_API_KEY || '',
    base: 'https://financialmodelingprep.com/api',
  },
  newsApi: {
    key: process.env.NEXT_PUBLIC_NEWS_API_KEY || '',
    base: 'https://newsapi.org/v2',
  },
  backend: {
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api',
  },
});
