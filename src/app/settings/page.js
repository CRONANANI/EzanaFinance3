'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  ApiPanel,
} from '@/components/settings';
import { PartnerProvider, usePartner } from '@/contexts/PartnerContext';
import './settings.css';

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
  { key: 'api', label: 'API', icon: 'bi-code-slash', desc: 'API keys & access' },
];

const PANEL_MAP = {
  'my-details': MyDetailsPanel,
  appearance: AppearancePanel,
  'profile': ProfilePanel,
  'password': PasswordPanel,
  'family': FamilyPanel,
  'plan': PlanPanel,
  'billing': BillingPanel,
  'email': EmailPanel,
  'notifications': NotificationsPanel,
  'integrations': IntegrationsPanel,
  'api': ApiPanel,
};

function SettingsInner() {
  const [activeTab, setActiveTab] = useState('my-details');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [saveToast, setSaveToast] = useState(false);
  const router = useRouter();
  const { isPartner } = usePartner();
  const dashboardPath = isPartner ? '/partner-home' : '/home-dashboard';

  const ActivePanel = PANEL_MAP[activeTab];

  const handleTabChange = (key) => {
    setActiveTab(key);
    setMobileNavOpen(false);
  };

  const handleSave = () => {
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  return (
    <div className="settings-page">
      {/* Settings header (navbar returns null on /settings) */}
      <header className="settings-header">
        <Link href={dashboardPath} className="settings-header-back">
          <i className="bi bi-arrow-left" />
          <span>Back to Dashboard</span>
        </Link>
        <h1 className="settings-header-title">Settings</h1>
      </header>

      {/* Mobile tab selector */}
      <div className="settings-mobile-selector">
        <button
          className="settings-mobile-trigger"
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          type="button"
        >
          <i className={`bi ${SETTINGS_TABS.find(t => t.key === activeTab)?.icon}`} />
          <span>{SETTINGS_TABS.find(t => t.key === activeTab)?.label}</span>
          <i className={`bi bi-chevron-${mobileNavOpen ? 'up' : 'down'} settings-mobile-chevron`} />
        </button>
        {mobileNavOpen && (
          <div className="settings-mobile-dropdown">
            {SETTINGS_TABS.map((tab) => (
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
        {/* Left sidebar nav (desktop) */}
        <aside className="settings-sidebar">
          <div className="settings-sidebar-header">
            <h1 className="settings-title">Settings</h1>
            <p className="settings-subtitle">Manage your account and preferences</p>
          </div>
          <nav className="settings-nav">
            {SETTINGS_TABS.map((tab, i) => (
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

        {/* Right content area */}
        <main className="settings-content">
          <ActivePanel onSave={handleSave} />
        </main>
      </div>

      {/* Save toast */}
      {saveToast && (
        <div className="settings-toast">
          <i className="bi bi-check-circle-fill" />
          <span>Changes saved successfully</span>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <PartnerProvider>
      <SettingsInner />
    </PartnerProvider>
  );
}
