import {
  ProfilePanel,
  PasswordPanel,
  FamilyPanel,
  PlanPanel,
  BillingPanel,
  EmailPanel,
  NotificationsPanel,
  IntegrationsPanel,
  ApiPanel,
} from '@/components/settings/SettingsPanels';
import { OrgSettingsPanel } from '@/components/settings/OrgSettingsPanel';
import { MyRoleAccessPanel } from '@/components/settings/MyRoleAccessPanel';
import { DataRequestPanel } from '@/components/settings/DataRequestPanel';
import { PlatformChangelogPanel } from '@/components/settings/PlatformChangelogPanel';
import { PartnerManagementPanel } from '@/components/settings/PartnerManagementPanel';
import { MyDetailsLedger } from './panels/MyDetailsLedger';
import { AppearanceLedger } from './panels/AppearanceLedger';
import { wrapLegacyPanel } from './legacy-bridge';

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
    helper: 'Members, hierarchy, and permissions.',
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
  notifications: wrapLegacyPanel(NotificationsPanel),
  integrations: wrapLegacyPanel(IntegrationsPanel),
  api: wrapLegacyPanel(ApiPanel),
  'privacy-data': wrapLegacyPanel(DataRequestPanel),
  'platform-changelog': wrapLegacyPanel(PlatformChangelogPanel),
  partners: wrapLegacyPanel(PartnerManagementPanel),
  organization: wrapLegacyPanel(OrgSettingsPanel),
  'my-role': wrapLegacyPanel(MyRoleAccessPanel),
};
