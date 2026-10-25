'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase-browser';

const PartnerContext = createContext(null);

export function PartnerProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [isPartner, setIsPartner] = useState(false);
  const [partnerRole, setPartnerRole] = useState(null);
  const [verified, setVerified] = useState(false);
  const [partnerData, setPartnerData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkPartnerStatus = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setIsPartner(false);
      setPartnerRole(null);
      setVerified(false);
      setPartnerData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      setIsPartner(false);
      setPartnerRole(null);
      setVerified(false);
      setPartnerData(null);

      // One definition of "partner" (QA PAR-3): the server decides via
      // isActivePartner in src/lib/partner-access.js.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      const res = await fetch('/api/partner/status', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!res.ok) return;
      const status = await res.json();
      if (status.isPartner) {
        setIsPartner(true);
        setPartnerRole(status.partnerRole || 'both');
        setVerified(status.verified === true);
        setPartnerData(status.partner || null);
      }
    } catch (err) {
      console.error('[Partner] Status check error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    checkPartnerStatus();
  }, [checkPartnerStatus]);

  const value = {
    isPartner,
    partnerRole,
    verified,
    partnerData,
    isLoading,
    refreshPartnerStatus: checkPartnerStatus,
  };

  return <PartnerContext.Provider value={value}>{children}</PartnerContext.Provider>;
}

export function usePartner() {
  const ctx = useContext(PartnerContext);
  if (!ctx) {
    throw new Error('usePartner must be used within a PartnerProvider');
  }
  return ctx;
}
