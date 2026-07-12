import dynamic from 'next/dynamic';
import { MyRoleAccessPanel } from '@/components/settings/MyRoleAccessPanel';
import { OrgAdminPanel } from '@/components/settings/org/OrgAdminPanel';
import { NotificationsWithOrg } from '@/components/settings/org/NotificationsWithOrg';
import { DataRequestPanel } from '@/components/settings/DataRequestPanel';
import { PlatformChangelogPanel } from '@/components/settings/PlatformChangelogPanel';
import { PartnerManagementPanel } from '@/components/settings/PartnerManagementPanel';
import { MyDetailsLedger } from './panels/MyDetailsLedger';
import { AppearanceLedger } from './panels/AppearanceLedger';
import { wrapLegacyPanel } from './legacy-bridge';

/* SettingsPanels.jsx is one ~1644-line client module. The Ledger only ever
   renders the active tab's panel, so each panel is deferred via next/dynamic —
   keeping that module out of the initial /settings chunk (it must be dynamic
   here AND in every other importer, or the module gets pulled back in). The
   reserved-height fallback keeps the tab swap CLS≈0. All are named exports. */
const ledgerPanelFallback = () => <div aria-hidden style={{ minHeight: 480, width: '100%' }} />;
const dynLedgerPanel = (name) =>
  dynamic(
    () => import('@/components/settings/SettingsPanels').then((m) => ({ default: m[name] })),
    { loading: ledgerPanelFallback },
  );
const ProfilePanel = dynLedgerPanel('ProfilePanel');
const PasswordPanel = dynLedgerPanel('PasswordPanel');
const FamilyPanel = dynLedgerPanel('FamilyPanel');
const PlanPanel = dynLedgerPanel('PlanPanel');
const BillingPanel = dynLedgerPanel('BillingPanel');
const EmailPanel = dynLedgerPanel('EmailPanel');
const IntegrationsPanel = dynLedgerPanel('IntegrationsPanel');
const ApiPanel = dynLedgerPanel('ApiPanel');

export const LEDGER_PAGE_META = {
  'my-details': {
    eyebrow: '01 — Account',
    title: 'My details',
    helper:
      'Update your personal information and contact details. Changes sync across every device on your account.',
  },
  appearance: {
    eyebrow: '02 — Account',
    title: 'Appearance',
    helper: 'Theme, language, and regional formatting.',
  },
  profile: {
    eyebrow: '03 — Account',
    title: 'Profile',
    helper: 'Your public profile, social links, and trading defaults.',
  },
  password: {
    eyebrow: '04 — Account',
    title: 'Password & security',
    helper: 'Manage credentials, two-factor authentication, and active sessions.',
  },
  family: {
    eyebrow: '05 — Workspace',
    title: 'Family',
    helper: 'Share your Ezana plan with family members.',
  },
  plan: {
    eyebrow: '06 — Workspace',
    title: 'Plan',
    helper: 'Your subscription, usage, and available upgrades.',
  },
  billing: {
    eyebrow: '07 — Workspace',
    title: 'Billing',
    helper: 'Payment methods, billing address, and invoice history.',
  },
  partners: {
    eyebrow: '08 — Workspace',
    title: 'Partners',
    helper: 'Manage partner accounts and roles.',
  },
  email: {
    eyebrow: '09 — Preferences',
    title: 'Email',
    helper: 'Transactional notices and marketing updates.',
  },
  notifications: {
    eyebrow: '10 — Preferences',
    title: 'Notifications',
    helper: 'Desktop, email, and in-app alerts.',
  },
  integrations: {
    eyebrow: '11 — Preferences',
    title: 'Integrations',
    helper: 'Connected services and brokerages.',
  },
  api: {
    eyebrow: '12 — Developer',
    title: 'API',
    helper: 'API keys, usage limits, and webhooks.',
  },
  'privacy-data': {
    eyebrow: '13 — Developer',
    title: 'Privacy & data',
    helper: 'Export your data and submit data subject requests.',
  },
  'platform-changelog': {
    eyebrow: '14 — Developer',
    title: 'Platform changelog',
    helper: 'Recent updates, improvements, and fixes.',
  },
  organization: {
    eyebrow: '— Workspace',
    title: 'Organization',
    helper: 'Members, invites, teams, fund configuration, cohorts, and branding.',
  },
  'my-role': {
    eyebrow: '— Organization',
    title: 'My role & access',
    helper: 'Your role, team, and exactly what your council seat lets you do.',
  },
};

export const LEDGER_PANEL_MAP = {
  'my-details': MyDetailsLedger,
  appearance: AppearanceLedger,
  profile: wrapLegacyPanel(ProfilePanel),
  password: wrapLegacyPanel(PasswordPanel),
  family: wrapLegacyPanel(FamilyPanel),
  plan: wrapLegacyPanel(PlanPanel),
  billing: wrapLegacyPanel(BillingPanel),
  email: wrapLegacyPanel(EmailPanel),
  notifications: wrapLegacyPanel(NotificationsWithOrg),
  integrations: wrapLegacyPanel(IntegrationsPanel),
  api: wrapLegacyPanel(ApiPanel),
  'privacy-data': wrapLegacyPanel(DataRequestPanel),
  'platform-changelog': wrapLegacyPanel(PlatformChangelogPanel),
  partners: wrapLegacyPanel(PartnerManagementPanel),
  organization: wrapLegacyPanel(OrgAdminPanel),
  'my-role': wrapLegacyPanel(MyRoleAccessPanel),
};
