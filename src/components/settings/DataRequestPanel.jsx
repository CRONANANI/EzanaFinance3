'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { usePartner } from '@/contexts/PartnerContext';
import { useOrg } from '@/contexts/OrgContext';

const REQUEST_OPTIONS = [
  {
    value: 'access_copy',
    label: 'View or receive a copy',
    desc: 'See what personal data we hold about you, or get a portable copy.',
  },
  {
    value: 'rectification',
    label: 'Correct or update',
    desc: 'Request changes if something is inaccurate or incomplete.',
  },
  {
    value: 'erasure',
    label: 'Delete my data',
    desc: 'Ask us to delete personal information, subject to legal retention needs.',
  },
  {
    value: 'restrict_processing',
    label: 'Restrict processing',
    desc: 'Limit how we use your data in certain situations.',
  },
  {
    value: 'portability',
    label: 'Data portability',
    desc: 'Receive your data in a structured, machine-readable format where applicable.',
  },
  {
    value: 'other',
    label: 'Other privacy request',
    desc: 'Describe what you need in the details box below.',
  },
];

function statusLabel(status) {
  switch (status) {
    case 'pending':
      return 'Received';
    case 'in_progress':
      return 'In progress';
    case 'completed':
      return 'Completed';
    case 'rejected':
      return 'Closed';
    default:
      return status;
  }
}

export function DataRequestPanel() {
  const { user } = useAuth();
  const { isPartner, partnerRole } = usePartner();
  const { isOrgUser, orgRole } = useOrg();

  const [requestType, setRequestType] = useState('access_copy');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const accountSummary = [
    isPartner && `Partner account${partnerRole ? ` (${partnerRole})` : ''}`,
    isOrgUser && orgRole && `Organization member (${orgRole})`,
    !isPartner && !isOrgUser && 'Standard user account',
  ]
    .filter(Boolean)
    .join(' · ');

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const r = await fetch('/api/data-request', { method: 'GET', credentials: 'include' });
      const data = await r.json().catch(() => ({}));
      if (r.ok && Array.isArray(data.requests)) {
        setHistory(data.requests);
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const r = await fetch('/api/data-request', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType,
          details,
          accountContext: {
            is_partner: !!isPartner,
            partner_role: partnerRole || null,
            is_org_user: !!isOrgUser,
            org_role: orgRole || null,
          },
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }
      setMessage(data.message || 'Request submitted.');
      setDetails('');
      await loadHistory();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h2 className="settings-panel-title">Privacy &amp; personal data</h2>
        <p className="settings-panel-desc">
          Submit a request to access, correct, delete, or otherwise manage personal information we store in
          connection with your Ezana Finance account. Available for all subscribers, partners, and
          organization members.
        </p>
      </div>

      <div className="settings-section">
        <p className="settings-data-request-hint">
          Signed in as <strong>{user?.email || 'your account'}</strong>
          {accountSummary ? (
            <>
              <br />
              <span className="settings-data-request-account-line">{accountSummary}</span>
            </>
          ) : null}
        </p>

        <form onSubmit={handleSubmit} className="settings-data-request-form">
          <h3 className="settings-section-title">
            <i className="bi bi-file-earmark-text" /> What would you like to request?
          </h3>
          <div className="settings-data-request-options" role="radiogroup" aria-label="Request type">
            {REQUEST_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`settings-data-request-option ${requestType === opt.value ? 'is-selected' : ''}`}
              >
                <input
                  type="radio"
                  name="requestType"
                  value={opt.value}
                  checked={requestType === opt.value}
                  onChange={() => setRequestType(opt.value)}
                />
                <span className="settings-data-request-option-body">
                  <span className="settings-data-request-option-label">{opt.label}</span>
                  <span className="settings-data-request-option-desc">{opt.desc}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="settings-field" style={{ marginTop: '1.25rem' }}>
            <label className="settings-label" htmlFor="data-request-details">
              Additional details (optional)
            </label>
            <textarea
              id="data-request-details"
              className="settings-input"
              rows={5}
              maxLength={8000}
              placeholder="e.g. specific products or time ranges, or any context that helps us fulfill your request."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          </div>

          {error ? (
            <p className="settings-data-request-alert settings-data-request-alert--error" role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="settings-data-request-alert settings-data-request-alert--ok" role="status">
              <i className="bi bi-check-circle-fill" /> {message}
            </p>
          ) : null}

          <div className="settings-btn-row">
            <button type="submit" className="settings-btn-primary" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit request'}
            </button>
          </div>
        </form>

        <div className="settings-data-request-history">
          <h3 className="settings-section-title settings-section-title--spaced">
            <i className="bi bi-clock-history" /> Your recent requests
          </h3>
          {loadingHistory ? (
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem' }}>Loading…</p>
          ) : history.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem' }}>
              No requests yet. Submissions appear here after you send one.
            </p>
          ) : (
            <ul className="settings-data-request-list">
              {history.map((row) => (
                <li key={row.id} className="settings-data-request-list-item">
                  <div className="settings-data-request-list-main">
                    <span className="settings-data-request-list-type">
                      {REQUEST_OPTIONS.find((o) => o.value === row.request_type)?.label || row.request_type}
                    </span>
                    <span className={`settings-data-request-status settings-data-request-status--${row.status}`}>
                      {statusLabel(row.status)}
                    </span>
                  </div>
                  {row.details ? (
                    <p className="settings-data-request-list-details">{row.details}</p>
                  ) : null}
                  <time className="settings-data-request-list-time" dateTime={row.created_at}>
                    {row.created_at
                      ? new Date(row.created_at).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })
                      : ''}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="settings-data-request-footnote" style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '1.5rem', lineHeight: 1.5 }}>
          We may need to verify your identity before fulfilling certain requests. Some legal obligations may
          require us to retain certain records even after a deletion request. You will be contacted at your
          account email if we need more information.
        </p>
      </div>
    </div>
  );
}
