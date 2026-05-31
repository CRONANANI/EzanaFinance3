'use client';

import Link from 'next/link';
import {
  User,
  Palette,
  Contact,
  Lock,
  Users,
  Gem,
  CreditCard,
  ShieldCheck,
  Mail,
  Bell,
  Plug,
  Code,
  Database,
  Clock,
  ArrowLeft,
} from 'lucide-react';

const NAV_GROUPS = [
  {
    label: 'Account',
    items: [
      { key: 'my-details', icon: User, label: 'My details', sub: 'Identity & contact' },
      { key: 'appearance', icon: Palette, label: 'Appearance', sub: 'Theme & language' },
      { key: 'profile', icon: Contact, label: 'Profile', sub: 'Public bio & links' },
      { key: 'password', icon: Lock, label: 'Password', sub: 'Security & 2FA' },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { key: 'family', icon: Users, label: 'Family', sub: 'Members & sharing' },
      { key: 'plan', icon: Gem, label: 'Plan', sub: 'Subscription' },
      { key: 'billing', icon: CreditCard, label: 'Billing', sub: 'Methods & history' },
      { key: 'partners', icon: ShieldCheck, label: 'Partners', sub: 'Admin', adminOnly: true },
    ],
  },
  {
    label: 'Preferences',
    items: [
      { key: 'email', icon: Mail, label: 'Email', sub: 'Transactional & marketing' },
      { key: 'notifications', icon: Bell, label: 'Notifications', sub: 'Push & in-app' },
      { key: 'integrations', icon: Plug, label: 'Integrations', sub: 'Connected services' },
    ],
  },
  {
    label: 'Developer',
    items: [
      { key: 'api', icon: Code, label: 'API', sub: 'Keys & usage' },
      { key: 'privacy-data', icon: Database, label: 'Privacy & data', sub: 'Export & GDPR' },
      { key: 'platform-changelog', icon: Clock, label: 'Platform changelog', sub: 'Updates' },
    ],
  },
];

export function SettingsLedgerShell({
  activeKey,
  onSelect,
  partnersTabAllowed,
  orgTabAllowed,
  pageTitle,
  pageEyebrow,
  pageHelper,
  saveStatus,
  backLabel = 'Dashboard',
  backHref = '/home',
  children,
}) {
  const orgItems = orgTabAllowed
    ? [
        {
          key: 'organization',
          icon: Users,
          label: 'Organization',
          sub: 'Members & permissions',
        },
      ]
    : [];

  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: [
      ...g.items.filter((it) => !it.adminOnly || partnersTabAllowed),
      ...(g.label === 'Workspace' ? orgItems : []),
    ],
  })).filter((g) => g.items.length > 0);

  return (
    <div className="settings-ledger">
      <div className="sl-app">
        <aside className="sl-rail">
          <div className="sl-rail-top">
            <div className="sl-brand">
              <img src="/ezana-nav-logo.png" alt="" className="sl-brand-mark" />
              <span className="sl-brand-wm">Ezana</span>
              <span className="sl-brand-chip">SETTINGS</span>
            </div>
            <div className="sl-rail-title">Settings</div>
            <div className="sl-rail-sub">Manage your account &amp; preferences</div>
          </div>

          <nav className="sl-nav" aria-label="Settings sections">
            {groups.map((g) => (
              <div key={g.label} className="sl-nav-group">
                <div className="sl-nav-glabel">{g.label}</div>
                {g.items.map((it) => {
                  const Icon = it.icon;
                  const active = activeKey === it.key;
                  return (
                    <button
                      key={it.key}
                      type="button"
                      className={`sl-nav-item ${active ? 'is-active' : ''}`}
                      onClick={() => onSelect(it.key)}
                    >
                      <Icon className="sl-nav-ico" strokeWidth={1.8} />
                      <span className="sl-nav-txt">
                        <span className="sl-nav-lab">{it.label}</span>
                        <span className="sl-nav-sub">{it.sub}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </aside>

        <div className="sl-main">
          <div className="sl-topbar">
            <Link href={backHref} className="sl-crumb">
              <ArrowLeft className="sl-crumb-ico" strokeWidth={1.8} />
              <span>{backLabel}</span>
              <span className="sl-crumb-sep">/</span>
              <span>Settings</span>
              <span className="sl-crumb-sep">/</span>
              <span className="sl-crumb-here">{pageTitle}</span>
            </Link>
            <div className="sl-status">
              <span className={`sl-dot ${statusDotClass(saveStatus?.state)}`} />
              {statusLabel(saveStatus)}
            </div>
          </div>

          <div className="sl-content">
            <div className="sl-phead">
              {pageEyebrow ? <div className="eyebrow sl-phead-eye">{pageEyebrow}</div> : null}
              <h1 className="sl-h1">{pageTitle}</h1>
              {pageHelper ? <p className="sl-helper">{pageHelper}</p> : null}
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function statusDotClass(state) {
  if (state === 'dirty' || state === 'saving') return 'sl-dot--amber';
  return 'sl-dot--em';
}

function statusLabel(s) {
  if (!s) return 'READY';
  if (s.state === 'saving') return 'SAVING…';
  if (s.state === 'dirty') return 'UNSAVED CHANGES';
  if (s.state === 'saved' && s.savedAgo) return `SAVED ${s.savedAgo.toUpperCase()}`;
  if (s.state === 'saved') return 'SAVED';
  return 'READY';
}
