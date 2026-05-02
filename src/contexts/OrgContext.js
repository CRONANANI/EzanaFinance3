'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { getMemberPermissions } from '@/lib/orgMockData';

const OrgContext = createContext(null);

export function OrgProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [isOrgUser, setIsOrgUser] = useState(false);
  const [orgRole, setOrgRole] = useState(null);
  const [orgData, setOrgData] = useState(null);
  const [permissionOverrides, setPermissionOverrides] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const checkOrgStatus = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setIsOrgUser(false);
      setOrgRole(null);
      setOrgData(null);
      setPermissionOverrides([]);
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
        .limit(1)
        .maybeSingle();

      if (error || !member) {
        setIsOrgUser(false);
        setOrgRole(null);
        setOrgData(null);
        setPermissionOverrides([]);
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
        member: { ...member, email: user.email },
        team,
        teams: teams || [],
      });

      const { data: permRows, error: permErr } = await supabase
        .from('org_member_permissions')
        .select('permission_key')
        .eq('org_member_id', member.id);
      if (permErr) {
        setPermissionOverrides([]);
      } else {
        setPermissionOverrides((permRows || []).map((p) => p.permission_key));
      }
    } catch (err) {
      console.error('[Org] Status check error:', err);
      setIsOrgUser(false);
      setOrgRole(null);
      setOrgData(null);
      setPermissionOverrides([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    checkOrgStatus();
  }, [checkOrgStatus]);

  const effectivePermissions = useMemo(() => {
    if (!orgData?.member) return getMemberPermissions(null, []);
    return getMemberPermissions(orgData.member, permissionOverrides);
  }, [orgData?.member, permissionOverrides]);

  const hasPermission = useCallback(
    (key) => effectivePermissions.includes(key),
    [effectivePermissions]
  );

  const canFlagPositionsBool = useMemo(
    () => effectivePermissions.includes('flag_positions'),
    [effectivePermissions]
  );

  const value = {
    isOrgUser,
    orgRole,
    orgData,
    isLoading,
    isExecutive: orgRole === 'executive',
    isPortfolioManager: orgRole === 'portfolio_manager',
    isAnalyst: orgRole === 'analyst',
    canManage: orgRole === 'executive' || orgRole === 'portfolio_manager',
    permissions: effectivePermissions,
    hasPermission,
    canFlagPositions: canFlagPositionsBool,
    refreshOrg: checkOrgStatus,
  };

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error('useOrg must be used within OrgProvider');
  return ctx;
}
