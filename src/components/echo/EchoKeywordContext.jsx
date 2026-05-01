'use client';

import { createContext, useContext, useState, useCallback } from 'react';

const Ctx = createContext(null);

export function EchoKeywordProvider({ children }) {
  const [activeKeywordId, setActiveKeywordId] = useState(null);
  const [anchorElement, setAnchorElement] = useState(null);

  const openKeyword = useCallback((keywordId, element) => {
    setActiveKeywordId(keywordId);
    setAnchorElement(element);
  }, []);

  const closeKeyword = useCallback(() => {
    setActiveKeywordId(null);
    setAnchorElement(null);
  }, []);

  return (
    <Ctx.Provider value={{ activeKeywordId, anchorElement, openKeyword, closeKeyword }}>
      {children}
    </Ctx.Provider>
  );
}

export function useKeywordPopup() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useKeywordPopup must be used inside EchoKeywordProvider');
  return ctx;
}
