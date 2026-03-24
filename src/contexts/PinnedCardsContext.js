'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { supabase } from '@/lib/supabase';
import { DEFAULT_PINNED_CARDS } from '@/config/cardRegistry';

export const PinnedCardsContext = createContext(null);

export function PinnedCardsProvider({ children }) {
  const [pinnedCards, setPinnedCards] = useState({});
  const [loading, setLoading] = useState(true);

  const loadPinnedCards = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setPinnedCards({});
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('pinned_cards')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Failed to load pinned_cards:', error.message);
        return;
      }

      const raw = profile?.pinned_cards;
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        setPinnedCards(raw);
      } else {
        setPinnedCards({});
      }
    } catch (e) {
      console.error('Failed to load pinned cards:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPinnedCards();
  }, [loadPinnedCards]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      setLoading(true);
      loadPinnedCards();
    });
    return () => subscription.unsubscribe();
  }, [loadPinnedCards]);

  const togglePin = useCallback(async (cardId, section) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setPinnedCards((prev) => {
      const next = { ...prev };
      if (next[section] === cardId) {
        delete next[section];
      } else {
        next[section] = cardId;
      }

      supabase
        .from('profiles')
        .update({ pinned_cards: next, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .then(({ error: upErr }) => {
          if (upErr) console.error('Failed to save pinned cards:', upErr.message);
        });

      return next;
    });
  }, []);

  const isCardPinned = useCallback(
    (cardId, section) => pinnedCards[section] === cardId,
    [pinnedCards]
  );

  const value = useMemo(
    () => ({
      pinnedCards,
      loading,
      togglePin,
      isCardPinned,
      refreshPinnedCards: loadPinnedCards,
    }),
    [pinnedCards, loading, togglePin, isCardPinned, loadPinnedCards]
  );

  return (
    <PinnedCardsContext.Provider value={value}>{children}</PinnedCardsContext.Provider>
  );
}

export function usePinnedCardsContext() {
  const ctx = useContext(PinnedCardsContext);
  if (!ctx) throw new Error('usePinnedCardsContext must be used within PinnedCardsProvider');
  return ctx;
}
