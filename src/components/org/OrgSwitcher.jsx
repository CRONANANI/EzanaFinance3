'use client';

import { useState } from 'react';
import { useOrg } from '@/contexts/OrgContext';

/**
 * Team Hub org switcher (QA ORG-9). Renders ONLY when the user holds 2 or more
 * active memberships. Choosing an org POSTs /api/org/switch, which validates
 * the membership and sets the `ez_org` cookie, then the page reloads so every
 * org surface re-resolves against the chosen org.
 */
export function OrgSwitcher({ className = '' }) {
  const { memberships, switchOrg } = useOrg();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (!Array.isArray(memberships) || memberships.length < 2) return null;
  const current = memberships.find((m) => m.current)?.orgId || memberships[0].orgId;

  const onChange = async (e) => {
    const orgId = e.target.value;
    if (!orgId || orgId === current) return;
    setBusy(true);
    setError(null);
    try {
      await switchOrg(orgId);
    } catch {
      setError('Could not switch organization. Try again.');
      setBusy(false);
    }
  };

  return (
    <div className={`thw-org-switch ${className}`.trim()}>
      <label htmlFor="thw-org-switch-select" className="thw-org-switch-label">
        Organization
      </label>
      <select
        id="thw-org-switch-select"
        className="thw-org-switch-select"
        value={current}
        onChange={onChange}
        disabled={busy}
        aria-busy={busy}
      >
        {memberships.map((m) => (
          <option key={m.orgId} value={m.orgId}>
            {m.name}
          </option>
        ))}
      </select>
      {error && (
        <span className="thw-org-switch-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export default OrgSwitcher;
