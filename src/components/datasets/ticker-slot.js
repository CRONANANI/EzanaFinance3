'use client';

/**
 * Lets a dataset PAGE supply the ticker that the layout-level chrome DRAWS.
 *
 * The bar and the ticker have to be one green block with one set of rounded
 * corners, and the page cannot draw its own half of it: page content renders
 * inside a centred, max-width, overflow-clipping container, which is exactly
 * why the ticker used to reach the viewport edge with a 100vw + translateX
 * breakout instead of simply being full width. The chrome already lives above
 * those containers (see DatasetChrome), so the fix is for the page to hand its
 * items up rather than to paint them itself.
 */
import { createContext, useContext, useEffect, useState } from 'react';

const TickerSlotContext = createContext({ ticker: null, setTicker: () => {} });

export function TickerSlotProvider({ children }) {
  const [ticker, setTicker] = useState(null);
  return (
    <TickerSlotContext.Provider value={{ ticker, setTicker }}>
      {children}
    </TickerSlotContext.Provider>
  );
}

export function useTickerSlot() {
  return useContext(TickerSlotContext);
}

/**
 * Pages publish { items, onSelect, ariaLabel } into the chrome; cleared on
 * unmount, so a page without a ticker leaves the bar alone.
 *
 * Every argument must be referentially stable — useMemo the items, useCallback
 * the handler — or the effect republishes on each render and the chrome
 * re-renders forever. The default context value is a no-op setter, so calling
 * this outside a provider is harmless rather than a crash.
 */
export function usePublishTicker({ items, onSelect, ariaLabel } = {}) {
  const { setTicker } = useContext(TickerSlotContext);
  useEffect(() => {
    setTicker(items && items.length ? { items, onSelect, ariaLabel } : null);
    return () => setTicker(null);
  }, [items, onSelect, ariaLabel, setTicker]);
}
