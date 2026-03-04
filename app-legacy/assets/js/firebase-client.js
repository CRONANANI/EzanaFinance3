/**
 * Firebase Client - Connect Frontend to Ezana Finance Backend
 * Uses Firebase CDN - include firebase-app-compat, firebase-auth-compat, firebase-firestore-compat, firebase-database-compat
 *
 * Usage:
 *   const client = window.firebaseClient;
 *   await client.signInWithEmail(email, password);
 *   const portfolios = await client.getPortfolios();
 */
(function () {
  "use strict";

  function getFirebaseConfig() {
    return window.EZANA_FIREBASE_CONFIG || {
      apiKey: "YOUR_API_KEY",
      authDomain: "ezana-finance.firebaseapp.com",
      projectId: "ezana-finance",
      storageBucket: "ezana-finance.appspot.com",
      messagingSenderId: "123456789",
      appId: "1:123456789:web:abc123",
      databaseURL: "https://ezana-finance-default-rtdb.firebaseio.com"
    };
  }

  const API_BASE = "https://us-central1-ezana-finance.cloudfunctions.net/api";

  class FirebaseClient {
    constructor() {
      this.apiUrl = API_BASE;
      this.user = null;
      this.token = null;
      this._auth = null;
      this._db = null;
      this._realtimeDb = null;
      this._initialized = false;
    }

    init() {
      if (this._initialized || typeof firebase === "undefined") return;
      try {
        firebase.initializeApp(getFirebaseConfig());
        this._auth = firebase.auth();
        this._db = firebase.firestore();
        this._realtimeDb = firebase.database();
        this._initialized = true;

        this._auth.onAuthStateChanged(async (user) => {
          this.user = user;
          if (user) {
            this.token = await user.getIdToken();
            this._subscribeToRealtime();
          }
        });
      } catch (e) {
        console.warn("FirebaseClient init:", e);
      }
    }

    async signInWithEmail(email, password) {
      this._ensureAuth();
      const userCredential = await this._auth.signInWithEmailAndPassword(email, password);
      this.user = userCredential.user;
      this.token = await this.user.getIdToken();
      return this.user;
    }

    async signInWithGoogle() {
      this._ensureAuth();
      const provider = new firebase.auth.GoogleAuthProvider();
      const userCredential = await this._auth.signInWithPopup(provider);
      this.user = userCredential.user;
      this.token = await this.user.getIdToken();
      return this.user;
    }

    async signOut() {
      if (this._auth) await this._auth.signOut();
      this.user = null;
      this.token = null;
    }

    async request(endpoint, options = {}) {
      const headers = { "Content-Type": "application/json", ...options.headers };
      if (this.token) headers["Authorization"] = "Bearer " + this.token;

      const res = await fetch(this.apiUrl + endpoint, {
        ...options,
        headers
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Request failed" }));
        throw new Error(err.message || "Request failed");
      }
      return res.json();
    }

    async getPortfolios() {
      return this.request("/portfolio");
    }

    async syncPortfolio() {
      return this.request("/portfolio/sync", { method: "POST" });
    }

    async createLinkToken() {
      const data = await this.request("/portfolio/link-token", { method: "POST" });
      return data.linkToken;
    }

    async exchangePlaidToken(publicToken) {
      return this.request("/portfolio/exchange-token", {
        method: "POST",
        body: JSON.stringify({ publicToken })
      });
    }

    async getQuote(symbol) {
      return this.request("/market/quote/" + encodeURIComponent(symbol));
    }

    async getQuotes(symbols) {
      return this.request("/market/quotes", {
        method: "POST",
        body: JSON.stringify({ symbols })
      });
    }

    async getHistoricalData(symbol, from, to) {
      return this.request(
        "/market/history/" + encodeURIComponent(symbol) +
        "?from=" + encodeURIComponent(from) + "&to=" + encodeURIComponent(to)
      );
    }

    async getCongressionalTrades(params = {}) {
      const query = new URLSearchParams(params).toString();
      return this.request("/congress/trades" + (query ? "?" + query : ""));
    }

    async getTrendingStocks() {
      return this.request("/congress/trades/trending");
    }

    _ensureAuth() {
      if (!this._auth) this.init();
      if (!this._auth) throw new Error("Firebase Auth not initialized");
    }

    _subscribeToRealtime() {
      if (!this.user || !this._realtimeDb) return;
      const quotesRef = this._realtimeDb.ref("quotes");
      quotesRef.on("value", (snapshot) => {
        const quotes = snapshot.val();
        if (quotes && typeof this.updateStockPrices === "function") {
          this.updateStockPrices(quotes);
        }
      });
    }

    updateStockPrices(quotes) {
      if (!quotes || typeof quotes !== "object") return;
      Object.keys(quotes).forEach((symbol) => {
        const q = quotes[symbol];
        if (!q) return;
        document.querySelectorAll("[data-symbol=\"" + symbol + "\"] .stock-price").forEach(function (el) {
          el.textContent = "$" + (q.price != null ? q.price.toFixed(2) : "—");
        });
        document.querySelectorAll("[data-symbol=\"" + symbol + "\"] .stock-change").forEach(function (el) {
          const pct = q.changePercent != null ? q.changePercent : 0;
          el.textContent = (pct >= 0 ? "+" : "") + pct.toFixed(2) + "%";
          el.className = "stock-change " + (pct >= 0 ? "positive" : "negative");
        });
      });
    }
  }

  const client = new FirebaseClient();
  if (typeof window !== "undefined") {
    window.firebaseClient = client;
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () { client.init(); });
    } else {
      client.init();
    }
  }
})();
