'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-browser';

/**
 * Two-step flow:
 *  1) If the caller has no unified_accounts yet, point them at the existing
 *     personal-side connect flow (/portfolio).
 *  2) Once accounts exist, pick one and import its latest snapshot into the team.
 */
export function BrokerageConnectForm({ orgId, teamId, onSubmitting, onError, onSuccess }) {
  const [accounts, setAccounts] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('unified_accounts')
          .select('id, institution_name, account_name, account_mask, source_provider, balance_total')
          .in('source_provider', ['plaid', 'snaptrade'])
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (!cancelled) setAccounts(data || []);
      } catch (e) {
        if (!cancelled) {
          onError(e.message);
          setAccounts([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onError]);

  const submit = async () => {
    if (!selectedId) return;
    onError(null);
    onSubmitting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch('/api/org/positions/brokerage-connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ org_id: orgId, team_id: teamId, unified_account_id: selectedId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Import failed');
      onSuccess(json);
    } catch (e) {
      onError(e.message);
    } finally {
      onSubmitting(false);
    }
  };

  if (accounts === null) return <div className="apm-org-empty">Loading your linked accounts…</div>;

  if (accounts.length === 0) {
    return (
      <div className="apm-org-empty">
        You don&apos;t have any brokerage accounts linked yet. Connect one from your personal
        portfolio first (
        <a href="/portfolio" target="_blank" rel="noreferrer">
          open portfolio
        </a>
        ), then come back to import its positions.
      </div>
    );
  }

  return (
    <div className="apm-org-form">
      <div className="apm-org-account-list">
        {accounts.map((a) => (
          <label
            key={a.id}
            className={`apm-org-account-row ${selectedId === a.id ? 'is-selected' : ''}`}
          >
            <input
              type="radio"
              name="brokerage-account"
              checked={selectedId === a.id}
              onChange={() => setSelectedId(a.id)}
            />
            <div className="apm-org-account-info">
              <div className="apm-org-account-name">
                {a.institution_name || 'Brokerage'}
                <span className="apm-org-account-provider">{a.source_provider}</span>
              </div>
              <div className="apm-org-account-meta apm-org-mono">
                {a.account_name || 'Account'} {a.account_mask ? `••${a.account_mask}` : ''}
              </div>
            </div>
            {a.balance_total != null && (
              <div className="apm-org-account-balance apm-org-mono">
                ${Number(a.balance_total).toLocaleString()}
              </div>
            )}
          </label>
        ))}
      </div>
      <div className="apm-org-actions">
        <button className="apm-org-btn apm-org-btn-primary" onClick={submit} disabled={!selectedId}>
          Import positions
        </button>
      </div>
    </div>
  );
}
