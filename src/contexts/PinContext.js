'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'ezana-pinned-cards';

const defaultPinned = [
  { id: 'portfolio-value', title: 'Portfolio Value', sourcePage: '/home-dashboard', sourceLabel: 'Dashboard', order: 0, w: 2, h: 1, x: 0, y: 0 },
  { id: 'recent-transactions', title: 'Recent Transactions', sourcePage: '/home-dashboard', sourceLabel: 'Dashboard', order: 1, w: 2, h: 2, x: 2, y: 0 },
  { id: 'congressional-trading', title: 'Congressional Trading', sourcePage: '/inside-the-capitol', sourceLabel: 'Inside The Capitol', order: 2, w: 2, h: 1, x: 0, y: 1 },
];

function loadPinned() {
  if (typeof window === 'undefined') return defaultPinned;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPinned;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultPinned;
  } catch {
    return defaultPinned;
  }
}

function savePinned(pinned) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pinned));
  } catch (e) {
    console.warn('Failed to save pinned cards:', e);
  }
}

const PinContext = createContext(null);

export function PinProvider({ children }) {
  const [pinned, setPinned] = useState(defaultPinned);

  useEffect(() => {
    setPinned(loadPinned());
  }, []);

  const addPinned = useCallback((card) => {
    setPinned((prev) => {
      if (prev.some((c) => c.id === card.id)) return prev;
      const maxOrder = Math.max(0, ...prev.map((c) => c.order));
      const maxY = Math.max(0, ...prev.map((c) => c.y + c.h));
      const newCard = {
        ...card,
        order: maxOrder + 1,
        w: card.w ?? 2,
        h: card.h ?? 1,
        x: card.x ?? 0,
        y: card.y ?? maxY,
      };
      const next = [...prev, newCard];
      savePinned(next);
      return next;
    });
  }, []);

  const removePinned = useCallback((id) => {
    setPinned((prev) => {
      const next = prev.filter((c) => c.id !== id);
      savePinned(next);
      return next;
    });
  }, []);

  const isPinned = useCallback(
    (id) => pinned.some((c) => c.id === id),
    [pinned]
  );

  const updateLayout = useCallback((layouts) => {
    setPinned((prev) => {
      const byId = Object.fromEntries(prev.map((c) => [c.id, c]));
      const next = layouts.map((l, i) => {
        const card = byId[l.i];
        if (!card) return null;
        return {
          ...card,
          x: l.x,
          y: l.y,
          w: l.w,
          h: l.h,
          order: i,
        };
      }).filter(Boolean);
      savePinned(next);
      return next;
    });
  }, []);

  return (
    <PinContext.Provider
      value={{
        pinned,
        addPinned,
        removePinned,
        isPinned,
        updateLayout,
      }}
    >
      {children}
    </PinContext.Provider>
  );
}

export function usePin() {
  const ctx = useContext(PinContext);
  if (!ctx) throw new Error('usePin must be used within PinProvider');
  return ctx;
}
