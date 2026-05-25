'use client';

import { createContext, useContext, useState, useCallback } from 'react';

const Ctx = createContext(null);

export function TickerPopupProvider({ children }) {
  const [activeTicker, setActiveTicker] = useState(null);
  const [anchorElement, setAnchorElement] = useState(null);

  const openTicker = useCallback((symbol, element) => {
    setActiveTicker(symbol);
    setAnchorElement(element);
  }, []);

  const closeTicker = useCallback(() => {
    setActiveTicker(null);
    setAnchorElement(null);
  }, []);

  return (
    <Ctx.Provider value={{ activeTicker, anchorElement, openTicker, closeTicker }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTickerPopup() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTickerPopup must be used inside TickerPopupProvider');
  return ctx;
}
