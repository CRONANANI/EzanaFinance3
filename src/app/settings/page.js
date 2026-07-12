'use client';

import { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
/* Panels that live in their own (small) modules — import directly rather than
   through the barrel so the barrel doesn't drag SettingsPanels.jsx back into
   the initial chunk. */
import { OrgSettingsPanel } from '@/components/settings/OrgSettingsPanel';
import { MyRoleAccessPanel } from '@/components/settings/MyRoleAccessPanel';
import { DataRequestPanel } from '@/components/settings/DataRequestPanel';
import { PlatformChangelogPanel } from '@/components/settings/PlatformChangelogPanel';
import { PartnerManagementPanel } from '@/components/settings/PartnerManagementPanel';
import { usePartner } from '@/contexts/PartnerContext';
import { useUserSettings } from '@/contexts/SettingsContext';
import { useOrg } from '@/contexts/OrgContext';
import { SettingsLedger } from '@/components/settings/ledger/SettingsLedger';
import './settings.css';
import './settings-partner.css';

/* The account settings panels all live in one ~1644-line client module
   (SettingsPanels.jsx). Only the active tab's panel ever renders, so we defer
   the whole module via next/dynamic — it leaves the initial /settings route JS
   and loads a tick after the shell paints. The reserved-height fallback keeps
   CLS≈0 during the tab swap. All are named exports. */
const panelFallback = () => <div aria-hidden style={{ minHeight: 480, width: '100%' }} />;
const dynPanel = (name) =>
  dynamic(
    () => import('@/components/settings/SettingsPanels').then((m) => ({ default: m[name] })),
    { loading: panelFallback },
  );
const MyDetailsPanel = dynPanel('MyDetailsPanel');
const AppearancePanel = dynPanel('AppearancePanel');
const ProfilePanel = dynPanel('ProfilePanel');
const PasswordPanel = dynPanel('PasswordPanel');
const FamilyPanel = dynPanel('FamilyPanel');
const PlanPanel = dynPanel('PlanPanel');
const BillingPanel = dynPanel('BillingPanel');
const EmailPanel = dynPanel('EmailPanel');
const NotificationsPanel = dynPanel('NotificationsPanel');
const IntegrationsPanel = dynPanel('IntegrationsPanel');
const ApiPanel = dynPanel('ApiPanel');

const USE_LEDGER = process.env.NEXT_PUBLIC_SETTINGS_LEDGER !== '0';

const SETTINGS_TABS = [
  { key: 'my-details', label: 'My details', icon: 'bi-person', desc: 'Name, avatar, contact info' },
  { key: 'appearance', label: 'Appearance', icon: 'bi-palette', desc: 'Theme & display' },
  { key: 'profile', label: 'Profile', icon: 'bi-card-heading', desc: 'Public profile & bio' },
  { key: 'password', label: 'Password', icon: 'bi-shield-lock', desc: 'Security & authentication' },
  { key: 'family', label: 'Family', icon: 'bi-people', desc: 'Linked family accounts' },
  { key: 'plan', label: 'Plan', icon: 'bi-gem', desc: 'Subscription & features' },
  { key: 'billing', label: 'Billing', icon: 'bi-credit-card', desc: 'Payment methods & history' },
  { key: 'email', label: 'Email', icon: 'bi-envelope', desc: 'Email preferences' },
  { key: 'notifications', label: 'Notifications', icon: 'bi-bell', desc: 'Alert & push settings' },
  { key: 'integrations', label: 'Integrations', icon: 'bi-plug', desc: 'Connected services' },
  {
    key: 'platform-changelog',
    label: 'Platform changelog',
    icon: 'bi-clock-history',
    desc: 'Updates & improvements log',
  },
  { key: 'api', label: 'API', icon: 'bi-code-slash', desc: 'API keys & access' },
  {
    key: 'privacy-data',
    label: 'Privacy & data',
    icon: 'bi-shield-lock',
    desc: 'Data export, mock portfolio archives',
  },
];

const PANEL_MAP = {
  'my-details': MyDetailsPanel,
  appearance: AppearancePanel,
  profile: ProfilePanel,
  password: PasswordPanel,
  family: FamilyPanel,
  plan: PlanPanel,
  billing: BillingPanel,
  email: EmailPanel,
  notifications: NotificationsPanel,
  integrations: IntegrationsPanel,
  'platform-changelog': PlatformChangelogPanel,
  api: ApiPanel,
  organization: OrgSettingsPanel,
  'my-role': MyRoleAccessPanel,
  'privacy-data': DataRequestPanel,
};

function SettingsInner() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('my-details');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [partnersTabAllowed, setPartnersTabAllowed] = useState(false);
  const router = useRouter();
  const { isPartner } = usePartner();
  const { isOrgUser, orgRole, isExecutive } = useOrg();
  const dashboardPath = isPartner ? '/partner-home' : '/home-dashboard';

  const [backLabel, setBackLabel] = useState('Dashboard');
  const [backPath, setBackPath] = useState(dashboardPath);
  const backFromReferrerRef = useRef(false);

  useEffect(() => {
    const PAGE_NAMES = {
      '/home': 'Home',
      '/home-dashboard': 'Dashboard',
      '/company-research': 'Company Research',
      '/market-analysis': 'Market Analysis',
      '/trading/mock': 'Mock Trading',
      '/ezana-echo': 'Ezana Echo',
      '/community': 'Community',
      '/for-the-quants': 'For The Quants',
      '/centaur-intelligence': 'Centaur Intelligence',
      '/betting-markets': 'Betting Markets',
      '/inside-the-capitol': 'Inside The Capitol',
      '/kairos-signal': 'Kairos Signal',
      '/learning-center': 'Learning Center',
      '/alternative-markets': 'Alternative Markets',
      '/watchlist': 'Watchlist',
      '/changelog': 'Changelog',
      '/partner-home': 'Partner Home',
      '/partner-dashboard': 'Partner Dashboard',
      '/partner-community': 'Partner Community',
      '/partner-learning': 'Creator Studio',
      '/real-estate': 'Real Estate',
      '/empire-ranking': 'Empire Ranking',
      '/financial-analytics': 'Financial Analytics',
      '/badges': 'Badges',
      '/leaderboard/elo': 'ELO Leaderboard',
      '/profile': 'Profile',
      '/org-team-hub': 'Team Hub',
      '/org-trading': 'Council Trading',
      '/org-team-hub/hierarchy': 'Org Hierarchy',
      '/org-trading/inbox': 'Flag Inbox',
      '/user-profile-settings': 'Profile Settings',
    };

    const lookupPageName = (path) => {
      if (!path) return null;
      if (PAGE_NAMES[path]) return PAGE_NAMES[path];
      const entries = Object.entries(PAGE_NAMES).sort((a, b) => b[0].length - a[0].length);
      return entries.find(([p]) => path.startsWith(`${p}/`))?.[1] || null;
    };

    let path = null;
    try {
      path = window.sessionStorage.getItem('previous-route');
    } catch {
      /* sessionStorage unavailable */
    }

    if (!path) {
      try {
        const ref = document.referrer;
        if (ref) {
          const url = new URL(ref);
          if (url.origin === window.location.origin) {
            path = url.pathname;
          }
        }
      } catch {
        /* referrer parsing failed */
      }
    }

    if (path && path !== '/settings' && !path.startsWith('/settings/')) {
      const match = lookupPageName(path);
      if (match) {
        backFromReferrerRef.current = true;
        setBackLabel(match);
        setBackPath(path);
      }
    }
  }, []);

  useEffect(() => {
    if (!backFromReferrerRef.current) {
      setBackPath(dashboardPath);
    }
  }, [dashboardPath]);

  const { settings, loading, saving, saved, error, updateSetting, saveSettings } =
    useUserSettings();

  useEffect(() => {
    fetch('/api/admin/users/list', { method: 'OPTIONS' })
      .then((r) => setPartnersTabAllowed(r.ok))
      .catch(() => setPartnersTabAllowed(false));
  }, []);

  const tabs = useMemo(() => {
    const partnersTab = partnersTabAllowed
      ? [
          {
            key: 'partners',
            label: 'Partners',
            icon: 'bi-shield-check',
            desc: 'Manage partner accounts (admin)',
          },
        ]
      : [];
    // Org members below executive don't own the subscription — hide the
    // consumer billing/plan/family/api tabs for them.
    const hideForOrgNonExec =
      isOrgUser && !isExecutive ? new Set(['plan', 'billing', 'family', 'api']) : null;
    const base = hideForOrgNonExec
      ? SETTINGS_TABS.filter((t) => !hideForOrgNonExec.has(t.key))
      : SETTINGS_TABS;
    const withPartners = base.flatMap((tab) =>
      tab.key === 'integrations' ? [tab, ...partnersTab] : [tab],
    );
    const orgExtras = [];
    if (isOrgUser) {
      orgExtras.push({
        key: 'my-role',
        label: 'My role & access',
        icon: 'bi-person-badge',
        desc: 'Your role, team & permissions',
      });
    }
    if (isOrgUser && orgRole === 'executive') {
      orgExtras.push({
        key: 'organization',
        label: 'Organization',
        icon: 'bi-building',
        desc: 'Manage members & permissions',
      });
    }
    return [...withPartners, ...orgExtras];
  }, [isOrgUser, orgRole, isExecutive, partnersTabAllowed]);

  useEffect(() => {
    if (!tabs.some((t) => t.key === activeTab)) {
      setActiveTab(tabs[0]?.key || 'my-details');
    }
  }, [tabs, activeTab]);

  const tabFromUrl = searchParams.get('tab');
  useEffect(() => {
    if (!tabFromUrl || !PANEL_MAP[tabFromUrl] || !tabs.some((t) => t.key === tabFromUrl)) return;
    setActiveTab(tabFromUrl);
  }, [tabFromUrl, tabs]);

  const ActivePanel = PANEL_MAP[activeTab] || MyDetailsPanel;

  const handleTabChange = (key) => {
    setActiveTab(key);
    setMobileNavOpen(false);
    if (USE_LEDGER) {
      router.push(`/settings?tab=${key}`, { scroll: false });
    }
  };

  const handleSave = async () => {
    await saveSettings();
  };

  const panelProps = {
    onSave: handleSave,
    settings,
    updateSetting,
    saveSettings,
    saving,
  };

  if (loading) {
    const loadingEl = (
      <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--muted, #6b7280)' }}>
        Loading settings…
      </div>
    );
    if (USE_LEDGER) {
      return <div className="settings-ledger">{loadingEl}</div>;
    }
    return <div className="settings-page">{loadingEl}</div>;
  }

  if (USE_LEDGER) {
    const ledgerSavePanels = new Set(['my-details', 'appearance']);
    return (
      <SettingsLedger
        panelProps={panelProps}
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        saveStatus={{
          state: saving ? 'saving' : saved ? 'saved' : 'idle',
          savedAgo: saved ? 'just now' : undefined,
        }}
        partnersTabAllowed={partnersTabAllowed}
        orgTabAllowed={isOrgUser && orgRole === 'executive'}
        isOrgUser={isOrgUser}
        backLabel={backLabel}
        backHref={backPath}
        error={error}
        onSave={handleSave}
        saving={saving}
        hideGlobalSave={ledgerSavePanels.has(activeTab)}
      />
    );
  }

  return (
    <div className="settings-page">
      <header className="settings-header">
        <div className="settings-header-inner">
          <Link href={backPath} className="settings-header-back">
            <i className="bi bi-arrow-left" />
            <span>Back to {backLabel}</span>
          </Link>
        </div>
      </header>

      <div className="settings-mobile-selector">
        <button
          className="settings-mobile-trigger"
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          type="button"
        >
          <i className={`bi ${tabs.find((t) => t.key === activeTab)?.icon}`} />
          <span>{tabs.find((t) => t.key === activeTab)?.label}</span>
          <i className={`bi bi-chevron-${mobileNavOpen ? 'up' : 'down'} settings-mobile-chevron`} />
        </button>
        {mobileNavOpen && (
          <div className="settings-mobile-dropdown">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`settings-mobile-item ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => handleTabChange(tab.key)}
                type="button"
              >
                <i className={`bi ${tab.icon}`} />
                <div>
                  <span className="settings-mobile-item-label">{tab.label}</span>
                  <span className="settings-mobile-item-desc">{tab.desc}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="settings-layout">
        <aside className="settings-sidebar">
          <div className="settings-sidebar-header">
            <h1 className="settings-title">Settings</h1>
            <p className="settings-subtitle">Manage your account and preferences</p>
          </div>
          <nav className="settings-nav">
            {tabs.map((tab, i) => (
              <button
                key={tab.key}
                className={`settings-nav-item ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
                type="button"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="settings-nav-icon">
                  <i className={`bi ${tab.icon}`} />
                </div>
                <div className="settings-nav-text">
                  <span className="settings-nav-label">{tab.label}</span>
                  <span className="settings-nav-desc">{tab.desc}</span>
                </div>
                {activeTab === tab.key && <div className="settings-nav-indicator" />}
              </button>
            ))}
          </nav>
          <div className="settings-sidebar-footer">
            <button
              className="settings-back-btn"
              onClick={() => router.push(backPath)}
              type="button"
            >
              <i className="bi bi-arrow-left" />
              <span>Back to {backLabel}</span>
            </button>
          </div>
        </aside>

        <main className="settings-content">
          <ActivePanel {...panelProps} />
        </main>
      </div>

      <div
        className="settings-global-save"
        hidden={activeTab === 'privacy-data'}
        style={{
          position: 'sticky',
          bottom: 0,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          padding: '1rem 1.25rem',
          marginTop: '1rem',
          background:
            'linear-gradient(180deg, transparent 0%, rgba(15,20,25,0.95) 20%, #0f1419 100%)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div style={{ minHeight: '1.25rem' }}>
          {error ? (
            <p style={{ color: '#f87171', fontSize: '0.85rem', margin: 0 }}>{error}</p>
          ) : saved ? (
            <p className="settings-saved-ok" style={{ fontSize: '0.85rem', margin: 0 }}>
              <i className="bi bi-check-circle-fill" style={{ marginRight: '0.35rem' }} />
              Settings saved
            </p>
          ) : (
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem', margin: 0 }}>
              Changes apply after you save
            </p>
          )}
        </div>
        <button
          type="button"
          className="settings-btn-primary"
          onClick={handleSave}
          disabled={saving}
          style={{ opacity: saving ? 0.7 : 1 }}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="settings-page">
          <div
            style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}
          >
            Loading settings…
          </div>
        </div>
      }
    >
      <SettingsInner />
    </Suspense>
  );
}
