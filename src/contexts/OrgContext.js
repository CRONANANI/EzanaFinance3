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
import { getMemberPermissions } from '@/lib/orgMockData';
import { getExtendedPermissions } from '@/lib/orgPermissionsExtended';

const OrgContext = createContext(null);

/** Non-org defaults, applied whenever the lookup can't confirm membership. */
function applyNonOrg(set) {
  set.isOrgUser(false);
  set.orgRole(null);
  set.orgData(null);
  set.permissionOverrides([]);
  set.orgRoles([]);
  set.primaryRoleName(null);
}

export function OrgProvider({ children }) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [isOrgUser, setIsOrgUser] = useState(false);
  const [orgRole, setOrgRole] = useState(null);
  const [orgData, setOrgData] = useState(null);
  const [permissionOverrides, setPermissionOverrides] = useState([]);
  // Per-university roles resolved server-side (union-of-permissions model).
  // Additive to orgRole (the tier); the tier still drives all existing gates.
  const [orgRoles, setOrgRoles] = useState([]);
  const [primaryRoleName, setPrimaryRoleName] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // Guards against overlapping/re-entrant runs (auth context can churn
  // `user`/`isAuthenticated` during boot, re-triggering the effect).
  const runningRef = useRef(false);

  const checkOrgStatus = useCallback(async () => {
    const set = {
      isOrgUser: setIsOrgUser,
      orgRole: setOrgRole,
      orgData: setOrgData,
      permissionOverrides: setPermissionOverrides,
      orgRoles: setOrgRoles,
      primaryRoleName: setPrimaryRoleName,
    };

    // Wait for auth to settle before deciding org status. Running while `user`
    // is transiently null during auth boot would false-resolve to non-org.
    if (authLoading) return;

    if (!isAuthenticated || !user) {
      applyNonOrg(set);
      setIsLoading(false);
      return;
    }

    // Prevent overlapping runs from leaving state half-written.
    if (runningRef.current) return;
    runningRef.current = true;

    setIsLoading(true);
    try {
      // Resolve org status via the SERVER route, NOT the browser Supabase
      // client. The browser client's GoTrue Web-Locks/processLock can wedge and
      // hang `supabase.from(...)` forever (documented in supabase-browser.js);
      // a plain fetch + AbortSignal.timeout can't hang unbounded, so `finally`
      // always runs and isLoading always clears. See /api/org/status.
      const res = await fetch('/api/org/status', {
        credentials: 'include',
        signal: AbortSignal.timeout(8000),
      });
      const payload = res.ok ? await res.json() : null;

      if (!payload || !payload.isOrgUser) {
        applyNonOrg(set);
        return;
      }

      setIsOrgUser(true);
      setOrgRole(payload.orgRole ?? null);
      setOrgData(payload.orgData ?? null);
      setPermissionOverrides(
        Array.isArray(payload.permissionOverrides) ? payload.permissionOverrides : [],
      );
      setOrgRoles(Array.isArray(payload.orgRoles) ? payload.orgRoles : []);
      setPrimaryRoleName(payload.primaryRoleName ?? null);
    } catch (err) {
      console.error('[Org] Status check error:', err);
      applyNonOrg(set);
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
    // Per-university roles + display title. Existing keys stay for compatibility;
    // these are additive. Display `primaryRoleName` where a human-readable title
    // is wanted (falls back to null until an org's roles are defined).
    orgRoles,
    primaryRoleName,
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
