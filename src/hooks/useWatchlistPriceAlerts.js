'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useWatchlists } from '@/hooks/useWatchlists';
import { supabase } from '@/lib/supabase';

/**
 * Monitor every watchlist whose user has "Notify me on major price moves"
 * enabled, poll quotes on an interval, and drop a row into
 * `user_notifications` (type: 'watchlist') when a ticker moves ±5% or
 * more from its previous close.
 *
 * Data flow:
 *   1. Read watchlists from `useWatchlists()`.
 *   2. Read per-list `alertsEnabled` flag from localStorage
 *      (`ezana.watchlistPrefs`) — written by NewWatchlistDialog on save.
 *   3. Collect the union of tickers across alert-enabled lists.
 *   4. Hit `/api/market/batch-quotes` (same endpoint used elsewhere).
 *   5. For each ticker with |changePercent| >= 5, emit one notification
 *      (deduplicated per day + direction via localStorage).
 *
 * TODO: move to a server-side job / websocket push once the backend
 * supports it so alerts fire even when no tab is open.
 */

const PREFS_KEY = 'ezana.watchlistPrefs';
const FIRED_KEY = 'ezana.watchlistAlerts.fired';
const ALERT_THRESHOLD = 5; // percent
const POLL_MS = 60_000;
const MAX_SYMBOLS_PER_REQ = 50;

function readLocal(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or disabled — ignore */
  }
}

function firedKeyFor(symbol, direction) {
  return `${new Date().toISOString().slice(0, 10)}:${symbol}:${direction}`;
}

/** Prune dedupe entries older than 2 days so the object stays small. */
function pruneFired(fired) {
  const cutoff = Date.now() - 2 * 86_400_000;
  const out = { ...fired };
  for (const k of Object.keys(out)) {
    const ts = Number(new Date(out[k]));
    if (!Number.isFinite(ts) || ts < cutoff) delete out[k];
  }
  return out;
}

async function fetchQuotes(symbols) {
  if (!symbols.length) return {};
  const out = {};
  for (let i = 0; i < symbols.length; i += MAX_SYMBOLS_PER_REQ) {
    const chunk = symbols.slice(i, i + MAX_SYMBOLS_PER_REQ);
    const res = await fetch(
      `/api/market/batch-quotes?symbols=${encodeURIComponent(chunk.join(','))}`,
    );
    if (!res.ok) continue;
    const data = await res.json();
    if (data?.quotes && typeof data.quotes === 'object') {
      Object.assign(out, data.quotes);
    }
  }
  return out;
}

/**
 * Build {symbol: [listName, ...]} so a single notification can mention
 * every watchlist that owns the ticker.
 */
function groupSymbolsByWatchlist(watchlists, prefs) {
  const out = new Map();
  for (const wl of watchlists) {
    const enabled = prefs[wl.id]?.alertsEnabled;
    if (!enabled) continue;
    const label = wl.label || 'Watchlist';
    for (const s of wl.stocks || []) {
      const sym = (s.ticker || s.symbol || '').toUpperCase();
      if (!sym) continue;
      if (!out.has(sym)) out.set(sym, []);
      out.get(sym).push(label);
    }
  }
  return out;
}

export function useWatchlistPriceAlerts() {
  const { user, isAuthenticated } = useAuth();
  const { watchlists } = useWatchlists();
  const timerRef = useRef(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return undefined;

    let cancelled = false;

    async function tick() {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const prefs = readLocal(PREFS_KEY, {});
        const symbolToLists = groupSymbolsByWatchlist(watchlists, prefs);
        if (symbolToLists.size === 0) return;

        const symbols = [...symbolToLists.keys()];
        const quotes = await fetchQuotes(symbols);
        if (cancelled) return;

        const fired = pruneFired(readLocal(FIRED_KEY, {}));
        const toInsert = [];

        for (const [sym, lists] of symbolToLists.entries()) {
          const q = quotes[sym];
          if (!q) continue;
          const change = Number(q.changePercent);
          if (!Number.isFinite(change) || Math.abs(change) < ALERT_THRESHOLD) continue;
          const direction = change >= 0 ? 'up' : 'down';
          const key = firedKeyFor(sym, direction);
          if (fired[key]) continue;

          const price = Number(q.price || q.lastRegularSessionPrice || 0);
          const lists0 = [...new Set(lists)];
          const plural = lists0.length > 1 ? 's' : '';
          const listPart = lists0.slice(0, 3).join(', ') + (lists0.length > 3 ? '…' : '');
          const titleDir = direction === 'up' ? 'up' : 'down';
          toInsert.push({
            user_id: user.id,
            type: 'watchlist',
            title: `${sym} ${titleDir} ${Math.abs(change).toFixed(2)}%`,
            content: `On your watchlist${plural}: ${listPart}.${price > 0 ? ` Currently $${price.toFixed(2)}.` : ''}`,
          });
          fired[key] = new Date().toISOString();
        }

        if (toInsert.length > 0) {
          try {
            await supabase.from('user_notifications').insert(toInsert);
          } catch (err) {
            console.warn('[watchlist-alerts] insert failed', err?.message || err);
          }
          writeLocal(FIRED_KEY, fired);
        } else {
          writeLocal(FIRED_KEY, fired);
        }
      } catch (err) {
        console.warn('[watchlist-alerts] poll failed', err?.message || err);
      } finally {
        inFlightRef.current = false;
      }
    }

    tick();
    timerRef.current = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isAuthenticated, user?.id, watchlists]);
}
