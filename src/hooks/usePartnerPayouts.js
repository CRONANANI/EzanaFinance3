'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';

/**
 * The signed-in partner's payouts from GET /api/partner/payouts
 * ({ payouts, pendingCents, lifetimeCents }). Real data only: on any failure
 * `error` is set and the numbers stay null, so callers show an empty state
 * rather than a made-up figure (QA PAR-5 / PAR-7).
 */
export function usePartnerPayouts() {
  const [state, setState] = useState({
    loading: true,
    error: null,
    payouts: [],
    pendingCents: null,
    lifetimeCents: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error('Not signed in');
        const res = await fetch('/api/partner/payouts', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Could not load payouts');
        if (cancelled) return;
        setState({
          loading: false,
          error: null,
          payouts: data.payouts || [],
          pendingCents: data.pendingCents ?? 0,
          lifetimeCents: data.lifetimeCents ?? 0,
        });
      } catch (e) {
        if (!cancelled) {
          setState({
            loading: false,
            error: e.message || 'Could not load payouts',
            payouts: [],
            pendingCents: null,
            lifetimeCents: null,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

export function fmtUsdCents(cents) {
  if (cents == null) return '';
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function fmtPayoutDate(v) {
  if (!v) return '';
  return new Date(v).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
