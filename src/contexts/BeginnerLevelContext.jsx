'use client';

import { createContext, useContext } from 'react';
import { useBeginnerLevel } from '@/hooks/useBeginnerLevel';

const BeginnerLevelContext = createContext(null);

export function BeginnerLevelProvider({ children }) {
  const value = useBeginnerLevel();
  return <BeginnerLevelContext.Provider value={value}>{children}</BeginnerLevelContext.Provider>;
}

export function useBeginnerLevelContext() {
  const ctx = useContext(BeginnerLevelContext);
  if (!ctx) {
    throw new Error('useBeginnerLevelContext must be used within BeginnerLevelProvider');
  }
  return ctx;
}

/** Safe hook when provider may be absent (returns null). */
export function useBeginnerLevelOptional() {
  return useContext(BeginnerLevelContext);
}
