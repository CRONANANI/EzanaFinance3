'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';

const OrgContext = createContext(null);

export function OrgProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [isOrgUser, setIsOrgUser] = useState(false);
  const [orgRole, setOrgRole] = useState(null);
  const [orgData, setOrgData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkOrgStatus = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setIsOrgUser(false);
      setOrgRole(null);
      setOrgData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data: member, error } = await supabase
        .from('org_members')
        .select(`
          *,
          organizations (*)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !member) {
        setIsOrgUser(false);
        setOrgRole(null);
        setOrgData(null);
        return;
      }

      setIsOrgUser(true);
      setOrgRole(member.role);

      let team = null;
      if (member.team_id) {
        const { data: teamRow } = await supabase
          .from('org_teams')
          .select('*')
          .eq('id', member.team_id)
          .maybeSingle();
        team = teamRow;
      }

      const { data: teams } = await supabase
        .from('org_teams')
        .select('*')
        .eq('org_id', member.org_id)
        .order('name');

      setOrgData({
        org: member.organizations,
        member,
        team,
        teams: teams || [],
      });
    } catch (err) {
      console.error('[Org] Status check error:', err);
      setIsOrgUser(false);
      setOrgRole(null);
      setOrgData(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    checkOrgStatus();
  }, [checkOrgStatus]);

  const value = {
    isOrgUser,
    orgRole,
    orgData,
    isLoading,
    isExecutive: orgRole === 'executive',
    isPortfolioManager: orgRole === 'portfolio_manager',
    isAnalyst: orgRole === 'analyst',
    canManage: orgRole === 'executive' || orgRole === 'portfolio_manager',
    refreshOrg: checkOrgStatus,
  };

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error('useOrg must be used within OrgProvider');
  return ctx;
}
