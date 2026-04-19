'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useMockPortfolio } from '@/hooks/useMockPortfolio';
import { usePortfolio } from '@/hooks/usePortfolio';
import { useWatchlists } from '@/hooks/useWatchlists';
import { supabase } from '@/lib/supabase';

/**
 * Aggregates every identifier the user cares about across data sources:
 *   - mock portfolio holdings           (tickers)
 *   - connected brokerage holdings      (tickers via /api/portfolio)
 *   - watchlist items                   (polymorphic — stock | politician |
 *                                        crypto | commodity)
 *   - profile.country                   (for the economic calendar)
 *
 * The return shape is consumed by `useUpcomingEvents` and encoded into
 * query params so the server route can filter each FMP feed down to only
 * the events that matter to this user.
 *
 * All sets return uppercased identifiers except `politicians`, whose
 * values are human-readable full names (matched case-insensitively by the
 * server via `canonicalPoliticianKey`).
 */
export function useUserRelevanceSet() {
  const { user, isAuthenticated } = useAuth();
  const { enrichedPositions } = useMockPortfolio();
  const { portfolio: plaidPortfolio } = usePortfolio();
  const { watchlists } = useWatchlists();

  const [country, setCountry] = useState('US');

  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated || !user?.id) {
      setCountry('US');
      return () => {
        cancelled = true;
      };
    }
    (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('country')
          .eq('id', user.id)
          .maybeSingle();
        if (cancelled) return;
        const c = data?.country ? String(data.country).trim() : '';
        if (c) setCountry(c.toUpperCase().slice(0, 8));
      } catch {
        /* keep default 'US' */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  return useMemo(() => {
    const tickers = new Set();
    const politicians = new Set();
    const cryptos = new Set();
    const commodities = new Set();

    // Mock portfolio — each enriched position carries `.symbol`.
    for (const pos of enrichedPositions || []) {
      const sym = pos?.symbol;
      if (sym) tickers.add(String(sym).toUpperCase());
    }

    // Connected brokerage — `/api/portfolio` returns holdings with
    // `ticker_symbol`; PlaidContext uses `ticker`. Tolerate both shapes.
    const plaidHoldings = [
      ...(plaidPortfolio?.holdings || []),
      ...(plaidPortfolio?.aggregated || []),
    ];
    for (const h of plaidHoldings) {
      const sym = h?.ticker_symbol || h?.ticker || h?.symbol;
      if (sym) tickers.add(String(sym).toUpperCase());
    }

    // Watchlist items — polymorphic by `type`. The API flattens every item
    // into the `stocks` array regardless of type; each row still carries
    // its own `type`, which is what drives partitioning here.
    for (const wl of watchlists || []) {
      for (const item of wl?.stocks || []) {
        const ident = item?.ticker;
        if (!ident) continue;
        const kind = String(item.type || 'stock').toLowerCase();
        if (kind === 'stock') {
          tickers.add(String(ident).toUpperCase());
        } else if (kind === 'politician') {
          // Prefer the human-readable name so it can be matched against
          // FMP's firstName+lastName; fall back to the raw identifier.
          const label = String(item.name || ident).trim();
          if (label) politicians.add(label);
        } else if (kind === 'crypto') {
          cryptos.add(String(ident).toUpperCase());
        } else if (kind === 'commodity') {
          commodities.add(String(ident).toUpperCase());
        }
      }
    }

    return {
      tickers,
      politicians,
      cryptos,
      commodities,
      country: country || 'US',
      isEmpty:
        tickers.size === 0 &&
        politicians.size === 0 &&
        cryptos.size === 0 &&
        commodities.size === 0,
    };
  }, [enrichedPositions, plaidPortfolio, watchlists, country]);
}
