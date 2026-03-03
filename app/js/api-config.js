/**
 * Centralized API Configuration for Ezana Finance
 * All third-party API keys and endpoint base URLs in one place.
 */
(function (global) {
  'use strict';

  const API_CONFIG = {
    alphaVantage: {
      key: 'UM530SUY02FGEJ1G',
      base: 'https://www.alphavantage.co/query'
    },
    fmp: {
      key: 'KtI6Q5fak2JMGRWi0tUK7J8s6ktuDEgd',
      base: 'https://financialmodelingprep.com/api'
    },
    newsApi: {
      key: '3a5e9503ab6849d19c70f4a9aa868587',
      base: 'https://newsapi.org/v2'
    }
  };

  global.API_CONFIG = Object.freeze(API_CONFIG);
})(typeof window !== 'undefined' ? window : this);
