'use client';

import { usePinnedCardsContext } from '@/contexts/PinnedCardsContext';

export function usePinnedCards() {
  return usePinnedCardsContext();
}
