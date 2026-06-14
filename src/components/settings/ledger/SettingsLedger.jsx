'use client';

import { SettingsLedgerShell } from './SettingsLedgerShell';
import { LEDGER_PANEL_MAP, LEDGER_PAGE_META } from './ledger-panels';
import '@/app/settings/settings-ledger.css';

export function SettingsLedger({
  panelProps,
  activeTab,
  setActiveTab,
  saveStatus,
  partnersTabAllowed,
  orgTabAllowed,
  isOrgUser,
  backLabel,
  backHref,
  error,
  onSave,
  saving,
  hideGlobalSave,
}) {
  const meta = LEDGER_PAGE_META[activeTab] || {
    eyebrow: '— Settings',
    title: activeTab,
    helper: '',
  };
  const Panel = LEDGER_PANEL_MAP[activeTab];

  return (
    <SettingsLedgerShell
      activeKey={activeTab}
      onSelect={setActiveTab}
      partnersTabAllowed={partnersTabAllowed}
      orgTabAllowed={orgTabAllowed}
      isOrgUser={isOrgUser}
      pageTitle={meta.title}
      pageEyebrow={meta.eyebrow}
      pageHelper={meta.helper}
      saveStatus={saveStatus}
      backLabel={backLabel}
      backHref={backHref}
    >
      {Panel ? <Panel {...panelProps} /> : <div className="sl-helper">Section not available.</div>}

      {!hideGlobalSave && activeTab !== 'privacy-data' ? (
        <div className="sl-savebar" style={{ marginTop: 32 }}>
          {error ? (
            <p style={{ color: 'var(--red)', fontSize: 13, margin: 0, flex: 1 }}>{error}</p>
          ) : null}
          <button
            type="button"
            className="sl-btn sl-btn-pri"
            onClick={onSave}
            disabled={saving}
            style={{ marginLeft: error ? 12 : 0 }}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      ) : null}
    </SettingsLedgerShell>
  );
}
