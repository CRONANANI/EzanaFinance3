'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase-browser';
import { getMemberPermissions } from '@/lib/orgMockData';
import { getExtendedPermissions } from '@/lib/orgPermissionsExtended';

const OrgContext = createContext(null);

/**
 * Race a Supabase query against a hard timeout so a hanging request (network
 * stall, RLS/policy deadlock, or an auth session that never returns) can never
 * freeze the whole app on "Loading Team Hub…". On timeout the rejection lands
 * in checkOrgStatus's catch, `finally` runs, and `isLoading` clears.
 */
const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`OrgContext timeout: ${label}`)), ms),
    ),
  ]);

export function OrgProvider({ children }) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [isOrgUser, setIsOrgUser] = useState(false);
  const [orgRole, setOrgRole] = useState(null);
  const [orgData, setOrgData] = useState(null);
  const [permissionOverrides, setPermissionOverrides] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  // Guards against overlapping/re-entrant runs (auth context can churn
  // `user`/`isAuthenticated` during boot, re-triggering the effect).
  const runningRef = useRef(false);

  const checkOrgStatus = useCallback(async () => {
    // Wait for auth to settle before deciding org status. Running while `user`
    // is transiently null during auth boot would either false-resolve to
    // non-org or fire a query before the session token is attached (RLS stall).
    if (authLoading) return;

    if (!isAuthenticated || !user) {
      setIsOrgUser(false);
      setOrgRole(null);
      setOrgData(null);
      setPermissionOverrides([]);
      setIsLoading(false);
      return;
    }

    // Prevent overlapping runs from leaving state half-written.
    if (runningRef.current) return;
    runningRef.current = true;

    setIsLoading(true);
    try {
      const { data: member, error } = await withTimeout(
        supabase
          .from('org_members')
          .select(
            `
          *,
          organizations (*)
        `,
          )
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle(),
        8000,
        'org_members',
      );

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
        const { data: teamRow } = await withTimeout(
          supabase.from('org_teams').select('*').eq('id', member.team_id).maybeSingle(),
          8000,
          'org_teams:one',
        );
        team = teamRow;
      }

      const { data: teams } = await withTimeout(
        supabase.from('org_teams').select('*').eq('org_id', member.org_id).order('name'),
        8000,
        'org_teams:list',
      );

      setOrgData({
        org: member.organizations,
        member: { ...member, email: user.email },
        team,
        teams: teams || [],
      });

      const { data: permRows, error: permErr } = await withTimeout(
        supabase
          .from('org_member_permissions')
          .select('permission_key')
          .eq('org_member_id', member.id),
        8000,
        'org_member_permissions',
      );
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
      runningRef.current = false;
      setIsLoading(false);
    }
  }, [isAuthenticated, user, authLoading]);

  useEffect(() => {
    checkOrgStatus();
  }, [checkOrgStatus]);

  const effectivePermissions = useMemo(() => {
    if (!orgData?.member) return getMemberPermissions(null, []);
    return getExtendedPermissions(orgData.member, permissionOverrides);
  }, [orgData?.member, permissionOverrides]);

  const hasPermission = useCallback(
    (key) => effectivePermissions.includes(key),
    [effectivePermissions],
  );

  const canFlagPositionsBool = useMemo(
    () => effectivePermissions.includes('flag_positions'),
    [effectivePermissions],
  );

  // Per-university brand theme (data-driven). orgData.org carries the colors via
  // `organizations (*)`. Falls back to Ezana emerald when not set.
  const org = orgData?.org || null;
  const orgTheme = useMemo(
    () =>
      org
        ? {
            primary: org.primary_color || '#10b981',
            secondary: org.secondary_color || '#059669',
            accent: org.accent_color || '#d4a853',
          }
        : null,
    [org],
  );
  const fundName = org?.fund_display_name || null;
  const universityName = org?.university_name || org?.name || null;

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
    canManagePositions: effectivePermissions.includes('manage_positions'),
    orgTheme,
    fundName,
    universityName,
    logoUrl: org?.logo_url || null,
    refreshOrg: checkOrgStatus,
  };

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error('useOrg must be used within OrgProvider');
  return ctx;
}
