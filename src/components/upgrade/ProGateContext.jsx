'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { ProGateModal } from './ProGateModal';

const ProGateContext = createContext(null);

export function ProGateProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  // Hardcoded for now. When the plan system lands, replace with a real check
  // (e.g. read from useAuth().profile?.subscription_tier === 'pro_advanced').
  const isProUser = false;

  const openProGate = useCallback(() => {
    if (isProUser) return; // pro users never see the gate
    setIsOpen(true);
  }, [isProUser]);

  const closeProGate = useCallback(() => setIsOpen(false), []);

  return (
    <ProGateContext.Provider value={{ openProGate, closeProGate, isProUser }}>
      {children}
      <ProGateModal isOpen={isOpen} onClose={closeProGate} />
    </ProGateContext.Provider>
  );
}

export function useProGate() {
  const ctx = useContext(ProGateContext);
  if (!ctx) {
    // Fail soft: if the provider isn't mounted (e.g. during SSR), return
    // a no-op so consumers don't crash.
    return { openProGate: () => {}, closeProGate: () => {}, isProUser: false };
  }
  return ctx;
}
