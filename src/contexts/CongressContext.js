'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'followedCongressPeople';

const CongressContext = createContext();

export function CongressProvider({ children }) {
  const [followed, setFollowed] = useState(new Set());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      setFollowed(new Set(stored));
    } catch (_) {
      setFollowed(new Set());
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...followed]));
  }, [followed]);

  const toggleFollow = useCallback((id) => {
    setFollowed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const isFollowing = useCallback(
    (id) => followed.has(id),
    [followed]
  );

  return (
    <CongressContext.Provider value={{ followed, toggleFollow, isFollowing }}>
      {children}
    </CongressContext.Provider>
  );
}

export function useCongress() {
  const ctx = useContext(CongressContext);
  if (!ctx) throw new Error('useCongress must be used within CongressProvider');
  return ctx;
}
