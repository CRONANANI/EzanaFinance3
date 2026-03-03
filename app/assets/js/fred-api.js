/**
 * FRED (Federal Reserve Economic Data) Frontend Service
 * 800,000+ economic time series from the Federal Reserve.
 * FREE with API key from https://fred.stlouisfed.org/docs/api/
 *
 * Popular series: GDP, UNRATE, CPIAUCSL, DFF, DGS10, DGS2, T10Y2Y, VIXCLS, UMCSENT
 */
(function (global) {
  'use strict';

  var FRED_KEY = '';
  var FRED_BASE = 'https://api.stlouisfed.org';

  function getKey() {
    if (FRED_KEY) return FRED_KEY;
    if (global.API_CONFIG && global.API_CONFIG.fred) return global.API_CONFIG.fred.key || '';
    return '';
  }

  async function fetchJson(path, params, cacheKey, ttl) {
    var key = getKey();
    if (!key) return null;
    var qs = new URLSearchParams({ ...params, api_key: key, file_type: 'json' });
    var url = FRED_BASE + path + '?' + qs.toString();
    var fetcher = async function() {
      var res = await fetch(url);
      if (!res.ok) throw new Error('FRED HTTP ' + res.status);
      return res.json();
    };
    if (global.ApiCache) return global.ApiCache.get(cacheKey, fetcher, ttl);
    try { return await fetcher(); }
    catch (e) { console.warn('FRED fetch failed:', e); return null; }
  }

  var FredAPI = {
    async getSeries(seriesId, opts) {
      opts = opts || {};
      var params = { series_id: seriesId, sort_order: opts.sortOrder || 'desc' };
      if (opts.limit) params.limit = opts.limit;
      if (opts.frequency) params.frequency = opts.frequency;
      if (opts.observationStart) params.observation_start = opts.observationStart;
      if (opts.observationEnd) params.observation_end = opts.observationEnd;
      var data = await fetchJson('/fred/series/observations', params, 'fred:' + seriesId, 3600);
      if (!data || !data.observations) return [];
      return data.observations.map(function(o) {
        return { date: o.date, value: o.value === '.' ? null : parseFloat(o.value) };
      });
    },

    async getSeriesInfo(seriesId) {
      var data = await fetchJson('/fred/series', { series_id: seriesId }, 'fred:info:' + seriesId, 86400);
      return data && data.seriess && data.seriess[0] ? data.seriess[0] : null;
    },

    async searchSeries(query, limit) {
      var data = await fetchJson('/fred/series/search', { search_text: query, limit: limit || 10 }, 'fred:search:' + query, 86400);
      if (!data || !data.seriess) return [];
      return data.seriess.map(function(s) {
        return { id: s.id, title: s.title, frequency: s.frequency_short, units: s.units_short };
      });
    },

    async getEconomicDashboard() {
      var ids = ['GDP', 'UNRATE', 'CPIAUCSL', 'DFF', 'DGS10', 'DGS2', 'T10Y2Y', 'VIXCLS', 'UMCSENT'];
      var results = await Promise.allSettled(ids.map(function(id) {
        return FredAPI.getSeries(id, { limit: 1 });
      }));
      var dashboard = {};
      ids.forEach(function(id, i) {
        var r = results[i];
        dashboard[id] = r.status === 'fulfilled' && r.value && r.value.length ? r.value[0] : null;
      });
      return dashboard;
    },

    setApiKey: function(key) { FRED_KEY = key; }
  };

  global.FredAPI = FredAPI;
})(typeof window !== 'undefined' ? window : this);
