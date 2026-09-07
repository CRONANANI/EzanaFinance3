'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';
import './payouts-panel.css';

const PLAID_LINK_SCRIPT = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';

function fmtUsd(cents) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function fmtDate(v) {
  if (!v) return '';
  return new Date(v).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function PayoutsPanel() {
  const [account, setAccount] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [pendingCents, setPendingCents] = useState(0);
  const [lifetimeCents, setLifetimeCents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('view'); // view | manual
  const [manual, setManual] = useState({
    institutionName: '',
    accountName: '',
    routingNumber: '',
    accountNumber: '',
  });

  const getToken = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  }, []);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };
      const [aRes, pRes] = await Promise.all([
        fetch('/api/partner/payout-account', { headers }),
        fetch('/api/partner/payouts', { headers }),
      ]);
      const a = await aRes.json();
      const p = await pRes.json();
      setAccount(a.account || null);
      setPayouts(p.payouts || []);
      setPendingCents(p.pendingCents || 0);
      setLifetimeCents(p.lifetimeCents || 0);
    } catch {
      setError('Failed to load payout data.');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    load();
  }, [load]);

  const ensurePlaidScript = () =>
    new Promise((resolve, reject) => {
      if (typeof window.Plaid !== 'undefined') return resolve();
      const existing = document.querySelector(`script[src="${PLAID_LINK_SCRIPT}"]`);
      if (existing) {
        existing.addEventListener('load', resolve);
        existing.addEventListener('error', reject);
        return;
      }
      const s = document.createElement('script');
      s.src = PLAID_LINK_SCRIPT;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });

  const connectPlaid = async () => {
    setError('');
    setBusy(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/partner/payout-account/link-token', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const { link_token, error: ltErr } = await res.json();
      if (!link_token) throw new Error(ltErr || 'No link token');
      await ensurePlaidScript();
      const handler = window.Plaid.create({
        token: link_token,
        onSuccess: async (public_token, metadata) => {
          try {
            const accountId = metadata?.accounts?.[0]?.id || metadata?.account_id;
            const linkRes = await fetch('/api/partner/payout-account', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                method: 'plaid_ach',
                public_token,
                plaid_account_id: accountId,
              }),
            });
            const data = await linkRes.json();
            if (!linkRes.ok) throw new Error(data.error || 'Link failed');
            setAccount(data.account);
          } catch (e) {
            setError(e.message || 'Failed to link account.');
          } finally {
            setBusy(false);
          }
        },
        onExit: () => setBusy(false),
      });
      handler.open();
    } catch (e) {
      setError(e.message || 'Failed to start bank connection.');
      setBusy(false);
    }
  };

  const submitManual = async () => {
    setError('');
    setBusy(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/partner/payout-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ method: 'manual_ach', ...manual }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save account');
      setAccount(data.account);
      setMode('view');
      setManual({ institutionName: '', accountName: '', routingNumber: '', accountNumber: '' });
    } catch (e) {
      setError(e.message || 'Failed to save account.');
    } finally {
      setBusy(false);
    }
  };

  const removeAccount = async () => {
    if (!window.confirm('Remove this payout account?')) return;
    setBusy(true);
    try {
      const token = await getToken();
      await fetch('/api/partner/payout-account', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setAccount(null);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div aria-hidden className="ppo-skeleton" />;

  return (
    <div className="settings-panel ppo-panel">
      <div className="settings-panel-header">
        <h2 className="settings-panel-title">Payouts</h2>
        <p className="settings-panel-desc">
          Where your partner earnings are deposited, and your payout history.
        </p>
      </div>

      {error ? (
        <p className="ppo-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="ppo-stats">
        <div className="ppo-stat">
          <span className="ppo-stat-label">Pending</span>
          <span className="ppo-stat-value">{fmtUsd(pendingCents)}</span>
        </div>
        <div className="ppo-stat">
          <span className="ppo-stat-label">Lifetime paid</span>
          <span className="ppo-stat-value">{fmtUsd(lifetimeCents)}</span>
        </div>
        <div className="ppo-stat">
          <span className="ppo-stat-label">Schedule</span>
          <span className="ppo-stat-value ppo-stat-text">Monthly, 1st business day</span>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">
          <i className="bi bi-bank" /> Payout account
        </h3>

        {account ? (
          <div className="ppo-account-card">
            <div className="ppo-account-icon">
              <i className="bi bi-bank2" />
            </div>
            <div className="ppo-account-info">
              <span className="ppo-account-name">{account.account_name}</span>
              <span className="ppo-account-meta">
                {account.institution_name ? `${account.institution_name} · ` : ''}
                Account ending {account.account_last4}
                {account.routing_last4 ? ` · Routing ending ${account.routing_last4}` : ''}
              </span>
              <span className={`ppo-account-status ppo-status-${account.status}`}>
                {account.status === 'active' ? 'Active' : 'Pending verification'}
              </span>
            </div>
            <button
              type="button"
              className="settings-btn-secondary"
              onClick={removeAccount}
              disabled={busy}
            >
              Remove
            </button>
          </div>
        ) : mode === 'manual' ? (
          <div className="ppo-manual-form">
            <div className="settings-row">
              <div className="settings-field">
                <label className="settings-label">Bank name</label>
                <input
                  className="settings-input"
                  value={manual.institutionName}
                  onChange={(e) => setManual({ ...manual, institutionName: e.target.value })}
                />
              </div>
              <div className="settings-field">
                <label className="settings-label">Account holder name</label>
                <input
                  className="settings-input"
                  value={manual.accountName}
                  onChange={(e) => setManual({ ...manual, accountName: e.target.value })}
                />
              </div>
            </div>
            <div className="settings-row">
              <div className="settings-field">
                <label className="settings-label">Routing number</label>
                <input
                  className="settings-input"
                  inputMode="numeric"
                  maxLength={9}
                  value={manual.routingNumber}
                  onChange={(e) =>
                    setManual({ ...manual, routingNumber: e.target.value.replace(/\D/g, '') })
                  }
                />
                <span className="settings-field-hint">9 digits, ABA routing number.</span>
              </div>
              <div className="settings-field">
                <label className="settings-label">Account number</label>
                <input
                  className="settings-input"
                  inputMode="numeric"
                  maxLength={17}
                  value={manual.accountNumber}
                  onChange={(e) =>
                    setManual({ ...manual, accountNumber: e.target.value.replace(/\D/g, '') })
                  }
                />
                <span className="settings-field-hint">We store only the last 4 digits.</span>
              </div>
            </div>
            <div className="settings-btn-row">
              <button
                type="button"
                className="settings-btn-primary"
                onClick={submitManual}
                disabled={busy}
              >
                {busy ? 'Saving…' : 'Save account'}
              </button>
              <button
                type="button"
                className="settings-btn-secondary"
                onClick={() => setMode('view')}
                disabled={busy}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="ppo-connect">
            <p className="ppo-connect-copy">
              Connect a bank account to receive payouts. Instant verification through Plaid, or
              enter your details manually.
            </p>
            <div className="settings-btn-row">
              <button
                type="button"
                className="settings-btn-primary"
                onClick={connectPlaid}
                disabled={busy}
              >
                <i className="bi bi-lightning-charge" /> {busy ? 'Opening…' : 'Connect with Plaid'}
              </button>
              <button
                type="button"
                className="settings-btn-secondary"
                onClick={() => setMode('manual')}
                disabled={busy}
              >
                Enter details manually
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">
          <i className="bi bi-clock-history" /> Payout history
        </h3>
        {payouts.length === 0 ? (
          <p className="ppo-empty">
            No payouts yet. Your first payout appears here after your first earning period closes.
          </p>
        ) : (
          <table className="settings-table ppo-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Period</th>
                <th>Status</th>
                <th className="ppo-th-amt">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id}>
                  <td>{fmtDate(p.paid_at || p.created_at)}</td>
                  <td>
                    {p.period_start
                      ? `${fmtDate(p.period_start)} to ${fmtDate(p.period_end)}`
                      : p.memo || ''}
                  </td>
                  <td>
                    <span className={`ppo-badge ppo-badge-${p.status}`}>{p.status}</span>
                  </td>
                  <td className="ppo-td-amt">{fmtUsd(p.amount_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
