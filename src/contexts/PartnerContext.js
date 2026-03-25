'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';

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

      const { data: partner, error: partnerErr } = await supabase
        .from('partners')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (!partnerErr && partner) {
        setIsPartner(true);
        setPartnerRole(partner.partner_role || partner.role || 'both');
        setVerified(partner.verified ?? true);
        setPartnerData(partner);
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

  return (
    <PartnerContext.Provider value={value}>
      {children}
    </PartnerContext.Provider>
  );
}

export function usePartner() {
  const ctx = useContext(PartnerContext);
  if (!ctx) {
    throw new Error('usePartner must be used within a PartnerProvider');
  }
  return ctx;
}
