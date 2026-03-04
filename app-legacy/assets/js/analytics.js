/**
 * Analytics Tracking Service
 * Integrates with Mixpanel/Amplitude when configured.
 * Falls back to console logging in development.
 *
 * Mixpanel: Free up to 100K MTU, Growth $20/month
 * Amplitude: Free up to 10M events/month, Plus $49/month
 */
(function (global) {
  'use strict';

  var EzanaAnalytics = {
    _initialized: false,
    _provider: null,

    init: function(provider, token) {
      if (!provider || !token) {
        this._provider = 'console';
        this._initialized = true;
        return;
      }
      this._provider = provider;
      if (provider === 'mixpanel' && global.mixpanel) {
        global.mixpanel.init(token, { track_pageview: true });
      }
      this._initialized = true;
    },

    track: function(eventName, properties) {
      if (!this._initialized) return;
      var props = properties || {};
      props.timestamp = new Date().toISOString();

      if (this._provider === 'mixpanel' && global.mixpanel) {
        global.mixpanel.track(eventName, props);
      } else if (this._provider === 'amplitude' && global.amplitude) {
        global.amplitude.track(eventName, props);
      } else {
        console.debug('[Analytics]', eventName, props);
      }
    },

    identify: function(userId, traits) {
      if (!this._initialized) return;
      if (this._provider === 'mixpanel' && global.mixpanel) {
        global.mixpanel.identify(userId);
        if (traits) global.mixpanel.people.set(traits);
      } else if (this._provider === 'amplitude' && global.amplitude) {
        global.amplitude.setUserId(userId);
      }
    },

    page: function(pageName) {
      this.track('page_view', { page: pageName });
    },

    trackSearch: function(query, resultCount) {
      this.track('search', { query: query, results: resultCount });
    },

    trackModelRun: function(modelType, company) {
      this.track('model_run', { model: modelType, company: company });
    },

    trackTrade: function(action, symbol, shares, amount) {
      this.track('trade', { action: action, symbol: symbol, shares: shares, amount: amount });
    },

    trackFeatureUsage: function(feature) {
      this.track('feature_used', { feature: feature });
    }
  };

  EzanaAnalytics.init('console');

  global.EzanaAnalytics = EzanaAnalytics;
})(typeof window !== 'undefined' ? window : this);
