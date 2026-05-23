'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

const LightningContext = createContext({
  strike: () => {},
  intensity: 0,
  scrollDepth: 0,
});

export function LightningProvider({ children, intervalMs = 3300 }) {
  const [intensity, setIntensity] = useState(0);
  const [scrollDepth, setScrollDepth] = useState(0);
  const decayTimeoutRef = useRef(null);

  useEffect(() => {
    const handler = () => {
      const scrollY = window.scrollY || 0;
      const vh = window.innerHeight;
      const depth = Math.min(1, Math.max(0, scrollY / (vh * 2.5)));
      setScrollDepth(depth);
    };
    handler();
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const strike = useCallback(() => {
    setIntensity(1);
    if (decayTimeoutRef.current) clearTimeout(decayTimeoutRef.current);
    decayTimeoutRef.current = setTimeout(() => {
      setIntensity(0.4);
      decayTimeoutRef.current = setTimeout(() => setIntensity(0), 300);
    }, 100);
  }, []);

  useEffect(() => {
    if (!intervalMs) return;
    const id = setInterval(strike, intervalMs);
    const initial = setTimeout(strike, 1500);
    return () => {
      clearInterval(id);
      clearTimeout(initial);
    };
  }, [intervalMs, strike]);

  useEffect(() => {
    const effective = intensity * (0.2 + 0.8 * scrollDepth);
    document.body.style.setProperty('--lightning-flash', String(effective));
  }, [intensity, scrollDepth]);

  return (
    <LightningContext.Provider value={{ strike, intensity, scrollDepth }}>
      {children}
    </LightningContext.Provider>
  );
}

export function useLightning() {
  return useContext(LightningContext);
}
