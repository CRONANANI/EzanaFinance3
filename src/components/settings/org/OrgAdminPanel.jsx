'use client';

import { useState } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { OrgSettingsPanel } from '@/components/settings/OrgSettingsPanel';
import { InviteOnboarding } from './InviteOnboarding';
import { TeamsSectors } from './TeamsSectors';
import { FundConfig } from './FundConfig';
import { CohortSettings } from './CohortSettings';
import { OrgBranding } from './OrgBranding';

const SECTIONS = [
  { key: 'members', label: 'Members & Roles', Comp: OrgSettingsPanel },
  { key: 'invite', label: 'Invite & Onboarding', Comp: InviteOnboarding },
  { key: 'teams', label: 'Teams & Sectors', Comp: TeamsSectors },
  { key: 'fund', label: 'Fund Configuration', Comp: FundConfig },
  { key: 'cohorts', label: 'Cohorts', Comp: CohortSettings },
  { key: 'branding', label: 'Branding', Comp: OrgBranding },
];

export function OrgAdminPanel() {
  const { isExecutive } = useOrg();
  const [section, setSection] = useState('members');

  if (!isExecutive) {
    return (
      <div className="settings-panel">
        <div className="settings-panel-header">
          <h2 className="settings-panel-title">Organization</h2>
          <p className="settings-panel-desc">Executive access is required to manage the organization.</p>
        </div>
      </div>
    );
  }

  const Active = SECTIONS.find((s) => s.key === section)?.Comp || OrgSettingsPanel;

  return (
    <div>
      <div
        role="tablist"
        aria-label="Organization sections"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          marginBottom: 18,
          paddingBottom: 14,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {SECTIONS.map((s) => {
          const active = section === s.key;
          return (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSection(s.key)}
              style={{
                cursor: 'pointer',
                fontSize: '0.78rem',
                fontWeight: 600,
                padding: '7px 13px',
                borderRadius: 8,
                border: active ? '1px solid rgba(99,102,241,0.45)' : '1px solid rgba(255,255,255,0.08)',
                background: active ? 'rgba(99,102,241,0.12)' : 'transparent',
                color: active ? '#c7d2fe' : '#9ca3af',
                transition: 'all 0.12s ease',
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>
      <Active />
    </div>
  );
}
