'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  MyDetailsPanel,
  AppearancePanel,
  ProfilePanel,
  PasswordPanel,
  FamilyPanel,
  PlanPanel,
  BillingPanel,
  EmailPanel,
  NotificationsPanel,
  IntegrationsPanel,
  PlatformChangelogPanel,
  ApiPanel,
  OrgSettingsPanel,
  DataRequestPanel,
} from '@/components/settings';
import { usePartner } from '@/contexts/PartnerContext';
import { useUserSettings } from '@/contexts/SettingsContext';
import { useOrg } from '@/contexts/OrgContext';
import './settings.css';
import './settings-partner.css';

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
  { key: 'platform-changelog', label: 'Platform changelog', icon: 'bi-clock-history', desc: 'Updates & improvements log' },
  { key: 'api', label: 'API', icon: 'bi-code-slash', desc: 'API keys & access' },
  { key: 'privacy-data', label: 'Privacy & data', icon: 'bi-shield-lock', desc: 'Data export, mock portfolio archives' },
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
  'privacy-data': DataRequestPanel,
};

function SettingsInner() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('my-details');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const router = useRouter();
  const { isPartner } = usePartner();
  const { isOrgUser, orgRole } = useOrg();
  const dashboardPath = isPartner ? '/partner-home' : '/home-dashboard';

  const {
    settings,
    loading,
    saving,
    saved,
    error,
    updateSetting,
    saveSettings,
  } = useUserSettings();

  const tabs = useMemo(() => {
    if (isOrgUser && orgRole === 'executive') {
      return [
        ...SETTINGS_TABS,
        { key: 'organization', label: 'Organization', icon: 'bi-building', desc: 'Manage members & permissions' },
      ];
    }
    return SETTINGS_TABS;
  }, [isOrgUser, orgRole]);

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
    return (
      <div className="settings-page">
        <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
          Loading settings…
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <header className="settings-header">
        <Link href={dashboardPath} className="settings-header-back">
          <i className="bi bi-arrow-left" />
          <span>Back to Dashboard</span>
        </Link>
        <h1 className="settings-header-title">Settings</h1>
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
              onClick={() => router.push(dashboardPath)}
              type="button"
            >
              <i className="bi bi-arrow-left" />
              <span>Back to Dashboard</span>
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
          background: 'linear-gradient(180deg, transparent 0%, rgba(15,20,25,0.95) 20%, #0f1419 100%)',
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
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
            Loading settings…
          </div>
        </div>
      }
    >
      <SettingsInner />
    </Suspense>
  );
}
