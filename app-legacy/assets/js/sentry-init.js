/**
 * Sentry Error Tracking - Frontend initialization
 * Free: 5K errors/month | Team: $26/month
 *
 * To enable: Add Sentry SDK script tag before this file, then set DSN below.
 * <script src="https://browser.sentry-cdn.com/7.x/bundle.min.js" crossorigin="anonymous"></script>
 */
(function (global) {
  'use strict';

  var SENTRY_DSN = '';

  var EzanaSentry = {
    init: function(dsn) {
      SENTRY_DSN = dsn || SENTRY_DSN;
      if (!SENTRY_DSN || !global.Sentry) return;
      global.Sentry.init({
        dsn: SENTRY_DSN,
        environment: global.location.hostname === 'localhost' ? 'development' : 'production',
        release: 'ezana-finance@3.6.0',
        tracesSampleRate: 0.1,
        replaysSessionSampleRate: 0.01,
        replaysOnErrorSampleRate: 1.0,
        integrations: [
          new global.Sentry.BrowserTracing(),
        ],
        beforeSend: function(event) {
          if (event.exception) {
            console.error('[Sentry]', event.exception);
          }
          return event;
        },
      });
    },

    setUser: function(userId, email) {
      if (!global.Sentry) return;
      global.Sentry.setUser({ id: userId, email: email });
    },

    captureException: function(error, context) {
      if (global.Sentry) {
        global.Sentry.captureException(error, { extra: context });
      } else {
        console.error('[Error]', error, context);
      }
    },

    captureMessage: function(message, level) {
      if (global.Sentry) {
        global.Sentry.captureMessage(message, level || 'info');
      }
    },

    addBreadcrumb: function(message, category) {
      if (global.Sentry) {
        global.Sentry.addBreadcrumb({ message: message, category: category || 'custom' });
      }
    }
  };

  global.EzanaSentry = EzanaSentry;
})(typeof window !== 'undefined' ? window : this);
